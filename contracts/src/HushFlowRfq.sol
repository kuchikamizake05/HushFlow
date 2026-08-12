// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {HushFlowResultVerifier} from "./HushFlowResultVerifier.sol";
import {ITeeExtensionRegistry} from "./interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "./interfaces/ITeeMachineRegistry.sol";

contract HushFlowRfq is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PROVIDERS = 20;
    uint256 public constant MAX_CIPHERTEXT_BYTES = 4_096;
    uint256 public constant MIN_QUOTE_DURATION = 1 minutes;
    uint256 public constant MAX_QUOTE_DURATION = 24 hours;
    uint256 public constant RESOLUTION_DURATION = 30 minutes;
    uint256 private constant FIRST_PUBLIC_EXTENSION_ID = 0x10000;
    bytes32 public constant OP_TYPE_HUSHFLOW = bytes32("HUSHFLOW");
    bytes32 public constant OP_COMMAND_RESOLVE_RFQ = bytes32("RESOLVE_RFQ");
    bytes32 public constant SUBMISSION_TAG_HASH = keccak256("submit");

    enum Status {
        OPEN,
        SETTLED,
        NO_VALID_QUOTE,
        INVALID_RFQ,
        CANCELLED,
        TIMED_OUT
    }

    struct Rfq {
        address seller;
        uint256 lotAmount;
        uint256 quoteCap;
        uint64 quoteDeadline;
        uint64 resolutionDeadline;
        Status status;
        address winningProvider;
        uint256 winningQuote;
        bytes32 actionId;
    }

    IERC20 public immutable FXRP;
    IERC20 public immutable USDT0;
    ITeeExtensionRegistry public immutable TEE_EXTENSION_REGISTRY;
    ITeeMachineRegistry public immutable TEE_MACHINE_REGISTRY;
    address public immutable TEE_SIGNER_INITIALIZER;
    address public teeSigner;

    uint256 public nextRfqId = 1;
    uint256 private _extensionId;
    mapping(uint256 => Rfq) public rfqs;
    mapping(uint256 => bytes) private _sellerCiphertexts;
    mapping(uint256 => address[]) private _providers;
    mapping(uint256 => mapping(address => bool)) public participated;
    mapping(uint256 => mapping(address => bytes)) private _quoteCiphertexts;
    mapping(uint256 => mapping(address => bool)) public claimed;
    mapping(bytes32 => bool) public consumedActionIds;
    mapping(bytes32 => bool) public consumedResultNonces;

    error ZeroAddress();
    error AddressHasNoCode(address account);
    error ExtensionIdAlreadySet();
    error ExtensionIdNotFound();
    error ExtensionNotInitialized();
    error TeeSignerNotInitialized();
    error TeeSignerAlreadyInitialized();
    error UnauthorizedTeeSignerInitializer(address caller);
    error InvalidAmount();
    error InvalidDeadlines();
    error InvalidCiphertextLength(uint256 actualLength);
    error RfqNotOpen(uint256 rfqId);
    error QuoteWindowClosed(uint256 deadline, uint256 currentTimestamp);
    error QuoteWindowStillOpen(uint256 deadline, uint256 currentTimestamp);
    error ResolutionWindowClosed(uint256 deadline, uint256 currentTimestamp);
    error ResolutionWindowStillOpen(uint256 deadline, uint256 currentTimestamp);
    error SellerCannotQuote();
    error UnauthorizedCancellation(address caller);
    error QuotesAlreadySubmitted();
    error DuplicateQuote();
    error ProviderLimitReached();
    error ResolutionAlreadyRequested();
    error InvalidInstructionId();
    error ResultNotRequested();
    error ActionAlreadyConsumed(bytes32 actionId);
    error ResultNonceAlreadyConsumed(bytes32 resultNonce);
    error WinningProviderDidNotParticipate(address provider);
    error WinningQuoteExceedsCap(uint256 quote, uint256 cap);
    error NothingToClaim();
    error AlreadyClaimed();
    error UnsupportedTokenBehavior(address token);

    event ExtensionIdInitialized(uint256 indexed extensionId);
    event TeeSignerInitialized(address indexed teeSigner);
    event RfqCreated(
        uint256 indexed rfqId,
        address indexed seller,
        uint256 lotAmount,
        uint256 quoteCap,
        uint64 quoteDeadline,
        uint64 resolutionDeadline,
        bytes sellerCiphertext
    );
    event QuoteSubmitted(uint256 indexed rfqId, address indexed provider, bytes ciphertext);
    event RfqCancelled(uint256 indexed rfqId);
    event ResolutionRequested(uint256 indexed rfqId, bytes32 indexed actionId);
    event RfqFinalized(
        uint256 indexed rfqId,
        Status status,
        address indexed winningProvider,
        uint256 winningQuote,
        bytes32 indexed resultNonce
    );
    event RfqTimedOut(uint256 indexed rfqId);
    event Claimed(uint256 indexed rfqId, address indexed account, uint256 fxrpAmount, uint256 usdt0Amount);

    constructor(
        address fxrp,
        address usdt0,
        ITeeExtensionRegistry teeExtensionRegistry,
        ITeeMachineRegistry teeMachineRegistry,
        address initialTeeSigner
    ) {
        if (
            fxrp == address(0) || usdt0 == address(0) || address(teeExtensionRegistry) == address(0)
                || address(teeMachineRegistry) == address(0)
        ) revert ZeroAddress();
        _requireCode(fxrp);
        _requireCode(usdt0);
        _requireCode(address(teeExtensionRegistry));
        _requireCode(address(teeMachineRegistry));

        FXRP = IERC20(fxrp);
        USDT0 = IERC20(usdt0);
        TEE_EXTENSION_REGISTRY = teeExtensionRegistry;
        TEE_MACHINE_REGISTRY = teeMachineRegistry;
        TEE_SIGNER_INITIALIZER = msg.sender;
        if (initialTeeSigner != address(0)) {
            teeSigner = initialTeeSigner;
            emit TeeSignerInitialized(initialTeeSigner);
        }
    }

    function setExtensionId() external {
        if (_extensionId != 0) revert ExtensionIdAlreadySet();
        uint256 nextId = TEE_EXTENSION_REGISTRY.nextPublicExtensionId();
        for (uint256 candidateId = FIRST_PUBLIC_EXTENSION_ID; candidateId < nextId; ++candidateId) {
            if (TEE_EXTENSION_REGISTRY.getTeeExtensionInstructionsSender(candidateId) == address(this)) {
                _extensionId = candidateId;
                emit ExtensionIdInitialized(candidateId);
                return;
            }
        }
        revert ExtensionIdNotFound();
    }

    function extensionId() external view returns (uint256) {
        return _extensionId;
    }

    function initializeTeeSigner(address signer) external {
        if (msg.sender != TEE_SIGNER_INITIALIZER) revert UnauthorizedTeeSignerInitializer(msg.sender);
        if (teeSigner != address(0)) revert TeeSignerAlreadyInitialized();
        if (signer == address(0)) revert ZeroAddress();
        teeSigner = signer;
        emit TeeSignerInitialized(signer);
    }

    function createRfq(
        uint256 lotAmount,
        uint256 quoteCap,
        uint64 quoteDeadline,
        uint64 resolutionDeadline,
        bytes calldata encryptedSellerMinimum
    ) external nonReentrant returns (uint256 rfqId) {
        if (_extensionId == 0) revert ExtensionNotInitialized();
        if (teeSigner == address(0)) revert TeeSignerNotInitialized();
        if (lotAmount == 0 || quoteCap == 0) revert InvalidAmount();
        if (quoteDeadline <= block.timestamp) revert InvalidDeadlines();
        uint256 quoteDuration = uint256(quoteDeadline) - block.timestamp;
        if (
            quoteDuration < MIN_QUOTE_DURATION || quoteDuration > MAX_QUOTE_DURATION
                || uint256(resolutionDeadline) != uint256(quoteDeadline) + RESOLUTION_DURATION
        ) revert InvalidDeadlines();
        _validateCiphertext(encryptedSellerMinimum);

        rfqId = nextRfqId++;
        rfqs[rfqId] = Rfq({
            seller: msg.sender,
            lotAmount: lotAmount,
            quoteCap: quoteCap,
            quoteDeadline: quoteDeadline,
            resolutionDeadline: resolutionDeadline,
            status: Status.OPEN,
            winningProvider: address(0),
            winningQuote: 0,
            actionId: bytes32(0)
        });
        _sellerCiphertexts[rfqId] = encryptedSellerMinimum;
        _pullExact(FXRP, msg.sender, lotAmount);

        emit RfqCreated(
            rfqId, msg.sender, lotAmount, quoteCap, quoteDeadline, resolutionDeadline, encryptedSellerMinimum
        );
    }

    function submitQuote(uint256 rfqId, bytes calldata ciphertext) external nonReentrant {
        Rfq storage rfq = _openRfq(rfqId);
        if (block.timestamp >= rfq.quoteDeadline) revert QuoteWindowClosed(rfq.quoteDeadline, block.timestamp);
        if (msg.sender == rfq.seller) revert SellerCannotQuote();
        if (participated[rfqId][msg.sender]) revert DuplicateQuote();
        if (_providers[rfqId].length >= MAX_PROVIDERS) revert ProviderLimitReached();
        _validateCiphertext(ciphertext);

        participated[rfqId][msg.sender] = true;
        _providers[rfqId].push(msg.sender);
        _quoteCiphertexts[rfqId][msg.sender] = ciphertext;
        _pullExact(USDT0, msg.sender, rfq.quoteCap);

        emit QuoteSubmitted(rfqId, msg.sender, ciphertext);
    }

    function cancelRfq(uint256 rfqId) external {
        Rfq storage rfq = _openRfq(rfqId);
        if (msg.sender != rfq.seller) revert UnauthorizedCancellation(msg.sender);
        if (_providers[rfqId].length != 0) revert QuotesAlreadySubmitted();

        rfq.status = Status.CANCELLED;
        emit RfqCancelled(rfqId);
    }

    function requestResolution(uint256 rfqId) external payable nonReentrant returns (bytes32 actionId) {
        Rfq storage rfq = _openRfq(rfqId);
        if (block.timestamp < rfq.quoteDeadline) revert QuoteWindowStillOpen(rfq.quoteDeadline, block.timestamp);
        if (block.timestamp > rfq.resolutionDeadline) {
            revert ResolutionWindowClosed(rfq.resolutionDeadline, block.timestamp);
        }
        if (rfq.actionId != bytes32(0)) revert ResolutionAlreadyRequested();

        address[] memory teeIds = TEE_MACHINE_REGISTRY.getRandomTeeIds(_getExtensionId(), 1);
        address[] memory cosigners = new address[](0);
        bytes memory message = _resolutionMessage(rfqId, rfq);
        ITeeExtensionRegistry.TeeInstructionParams memory params = ITeeExtensionRegistry.TeeInstructionParams({
            opType: OP_TYPE_HUSHFLOW,
            opCommand: OP_COMMAND_RESOLVE_RFQ,
            message: message,
            cosigners: cosigners,
            cosignersThreshold: 0,
            claimBackAddress: msg.sender
        });
        actionId = TEE_EXTENSION_REGISTRY.sendInstructions{value: msg.value}(teeIds, params);
        if (actionId == bytes32(0)) revert InvalidInstructionId();
        rfq.actionId = actionId;

        emit ResolutionRequested(rfqId, actionId);
    }

    function submitResult(
        bytes calldata resultData,
        bytes32 actionId,
        string calldata submissionTag,
        uint8 actionStatus,
        bytes calldata signature
    ) external {
        HushFlowResultVerifier.ResultDataV1 memory result = HushFlowResultVerifier.decodeResultDataV1(resultData);
        Rfq storage rfq = _openRfq(result.rfqId);
        if (block.timestamp < rfq.quoteDeadline) revert QuoteWindowStillOpen(rfq.quoteDeadline, block.timestamp);
        if (block.timestamp > rfq.resolutionDeadline) {
            revert ResolutionWindowClosed(rfq.resolutionDeadline, block.timestamp);
        }
        if (rfq.actionId == bytes32(0)) revert ResultNotRequested();
        if (consumedActionIds[actionId]) revert ActionAlreadyConsumed(actionId);

        HushFlowResultVerifier.verifyActionResult(
            resultData,
            actionId,
            rfq.actionId,
            submissionTag,
            SUBMISSION_TAG_HASH,
            actionStatus,
            signature,
            teeSigner,
            block.chainid
        );
        HushFlowResultVerifier.validateResultDataV1(result, block.chainid, address(this), result.rfqId, block.timestamp);
        if (consumedResultNonces[result.resultNonce]) revert ResultNonceAlreadyConsumed(result.resultNonce);

        if (result.resultType == HushFlowResultVerifier.ResultType.TRADE) {
            if (!participated[result.rfqId][result.winningProvider]) {
                revert WinningProviderDidNotParticipate(result.winningProvider);
            }
            if (result.winningQuote > rfq.quoteCap) {
                revert WinningQuoteExceedsCap(result.winningQuote, rfq.quoteCap);
            }
            rfq.status = Status.SETTLED;
        } else if (result.resultType == HushFlowResultVerifier.ResultType.NO_VALID_QUOTE) {
            rfq.status = Status.NO_VALID_QUOTE;
        } else {
            rfq.status = Status.INVALID_RFQ;
        }

        consumedActionIds[actionId] = true;
        consumedResultNonces[result.resultNonce] = true;
        rfq.winningProvider = result.winningProvider;
        rfq.winningQuote = result.winningQuote;

        emit RfqFinalized(result.rfqId, rfq.status, result.winningProvider, result.winningQuote, result.resultNonce);
    }

    function timeoutRfq(uint256 rfqId) external {
        Rfq storage rfq = _openRfq(rfqId);
        if (block.timestamp <= rfq.resolutionDeadline) {
            revert ResolutionWindowStillOpen(rfq.resolutionDeadline, block.timestamp);
        }
        rfq.status = Status.TIMED_OUT;
        emit RfqTimedOut(rfqId);
    }

    function claim(uint256 rfqId) external nonReentrant {
        if (claimed[rfqId][msg.sender]) revert AlreadyClaimed();
        (address fxrpToken, uint256 fxrpAmount, address usdtToken, uint256 usdtAmount) = claimable(rfqId, msg.sender);
        if (fxrpAmount == 0 && usdtAmount == 0) revert NothingToClaim();

        claimed[rfqId][msg.sender] = true;
        if (fxrpAmount != 0) IERC20(fxrpToken).safeTransfer(msg.sender, fxrpAmount);
        if (usdtAmount != 0) IERC20(usdtToken).safeTransfer(msg.sender, usdtAmount);
        emit Claimed(rfqId, msg.sender, fxrpAmount, usdtAmount);
    }

    function claimable(uint256 rfqId, address account)
        public
        view
        returns (address fxrpToken, uint256 fxrpAmount, address usdtToken, uint256 usdtAmount)
    {
        fxrpToken = address(FXRP);
        usdtToken = address(USDT0);
        Rfq storage rfq = rfqs[rfqId];
        if (claimed[rfqId][account] || rfq.status == Status.OPEN) return (fxrpToken, 0, usdtToken, 0);

        bool isSeller = account == rfq.seller;
        bool isProvider = participated[rfqId][account];
        if (!isSeller && !isProvider) return (fxrpToken, 0, usdtToken, 0);

        if (rfq.status == Status.SETTLED) {
            if (isSeller) usdtAmount = rfq.winningQuote;
            if (isProvider) {
                usdtAmount = account == rfq.winningProvider ? rfq.quoteCap - rfq.winningQuote : rfq.quoteCap;
                if (account == rfq.winningProvider) fxrpAmount = rfq.lotAmount;
            }
        } else {
            if (isSeller) fxrpAmount = rfq.lotAmount;
            if (isProvider) usdtAmount = rfq.quoteCap;
        }
    }

    function sellerCiphertext(uint256 rfqId) external view returns (bytes memory) {
        return _sellerCiphertexts[rfqId];
    }

    function providers(uint256 rfqId) external view returns (address[] memory) {
        return _providers[rfqId];
    }

    function quoteCiphertext(uint256 rfqId, address provider) external view returns (bytes memory) {
        return _quoteCiphertexts[rfqId][provider];
    }

    function _openRfq(uint256 rfqId) private view returns (Rfq storage rfq) {
        rfq = rfqs[rfqId];
        if (rfq.seller == address(0) || rfq.status != Status.OPEN) revert RfqNotOpen(rfqId);
    }

    function _getExtensionId() private view returns (uint256) {
        if (_extensionId == 0) revert ExtensionNotInitialized();
        return _extensionId;
    }

    function _resolutionMessage(uint256 rfqId, Rfq storage rfq) private view returns (bytes memory) {
        address[] memory providerAddresses = _providers[rfqId];
        bytes[] memory ciphertexts = new bytes[](providerAddresses.length);
        for (uint256 i = 0; i < providerAddresses.length; ++i) {
            ciphertexts[i] = _quoteCiphertexts[rfqId][providerAddresses[i]];
        }
        return abi.encode(
            uint16(1),
            block.chainid,
            address(this),
            rfqId,
            rfq.seller,
            _sellerCiphertexts[rfqId],
            rfq.quoteCap,
            providerAddresses,
            ciphertexts,
            rfq.resolutionDeadline
        );
    }

    function _pullExact(IERC20 token, address from, uint256 amount) private {
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        if (token.balanceOf(address(this)) - beforeBalance != amount) {
            revert UnsupportedTokenBehavior(address(token));
        }
    }

    function _validateCiphertext(bytes calldata ciphertext) private pure {
        if (ciphertext.length == 0 || ciphertext.length > MAX_CIPHERTEXT_BYTES) {
            revert InvalidCiphertextLength(ciphertext.length);
        }
    }

    function _requireCode(address account) private view {
        if (account.code.length == 0) revert AddressHasNoCode(account);
    }
}
