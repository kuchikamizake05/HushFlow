// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {HushFlowRfq} from "../src/HushFlowRfq.sol";
import {HushFlowResultVerifier} from "../src/HushFlowResultVerifier.sol";
import {ITeeExtensionRegistry} from "../src/interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "../src/interfaces/ITeeMachineRegistry.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function prank(address sender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256 timestamp) external;
}

contract MockToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 approved = allowance[from][msg.sender];
        if (approved != type(uint256).max) allowance[from][msg.sender] = approved - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockTeeRegistry is ITeeExtensionRegistry {
    uint256 public constant EXTENSION_ID = 0x10000;
    address public instructionSender;
    uint256 public receivedFee;
    bytes32 public nextInstructionId = bytes32(uint256(0xA11CE));

    function setInstructionSender(address sender) external {
        instructionSender = sender;
    }

    function nextPublicExtensionId() external pure returns (uint256) {
        return EXTENSION_ID + 1;
    }

    function getTeeExtensionInstructionsSender(uint256 extensionId) external view returns (address) {
        return extensionId == EXTENSION_ID ? instructionSender : address(0);
    }

    function sendInstructions(address[] calldata, TeeInstructionParams calldata params)
        external
        payable
        returns (bytes32)
    {
        require(params.opType == bytes32("HUSHFLOW"), "op type");
        require(params.opCommand == bytes32("RESOLVE_RFQ"), "op command");
        receivedFee += msg.value;
        return nextInstructionId;
    }
}

contract MockTeeMachineRegistry is ITeeMachineRegistry {
    address internal immutable teeId;

    constructor(address teeId_) {
        teeId = teeId_;
    }

    function getRandomTeeIds(uint256 extensionId, uint256 count) external view returns (address[] memory ids) {
        require(extensionId == 0x10000, "extension");
        require(count == 1, "count");
        ids = new address[](1);
        ids[0] = teeId;
    }
}

contract HushFlowRfqTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 internal constant TEE_PRIVATE_KEY = 0xA11CE;
    address internal constant SELLER = address(0xBEEF);
    address internal constant PROVIDER_A = address(0xCAFE);
    address internal constant PROVIDER_B = address(0xD00D);
    uint256 internal constant LOT = 10_000_000;
    uint256 internal constant QUOTE_CAP = 120_000_000;
    uint256 internal constant WINNING_QUOTE = 97_000_000;
    uint64 internal constant QUOTE_DEADLINE = 2_000;
    uint64 internal constant RESOLUTION_DEADLINE = 3_000;

    MockToken internal fxrp;
    MockToken internal usdt0;
    MockTeeRegistry internal teeRegistry;
    HushFlowRfq internal rfq;
    address internal teeSigner;

    function setUp() public {
        vm.warp(1_000);
        teeSigner = vm.addr(TEE_PRIVATE_KEY);
        fxrp = new MockToken("FXRP", "FXRP");
        usdt0 = new MockToken("USDT0", "USDT0");
        teeRegistry = new MockTeeRegistry();
        MockTeeMachineRegistry machineRegistry = new MockTeeMachineRegistry(teeSigner);
        rfq = new HushFlowRfq(address(fxrp), address(usdt0), teeRegistry, machineRegistry, teeSigner);
        teeRegistry.setInstructionSender(address(rfq));
        rfq.setExtensionId();

        fxrp.mint(SELLER, LOT);
        usdt0.mint(PROVIDER_A, QUOTE_CAP);
        usdt0.mint(PROVIDER_B, QUOTE_CAP);
        vm.prank(SELLER);
        fxrp.approve(address(rfq), type(uint256).max);
        vm.prank(PROVIDER_A);
        usdt0.approve(address(rfq), type(uint256).max);
        vm.prank(PROVIDER_B);
        usdt0.approve(address(rfq), type(uint256).max);
    }

    function testTradeLifecycleSettlesWithPullClaims() public {
        uint256 rfqId = _createAndQuote();
        bytes32 actionId = _requestResolution(rfqId);
        _submitSignedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.TRADE, PROVIDER_B, WINNING_QUOTE);

        (address sellerFxrpToken, uint256 sellerFxrpAmount, address sellerUsdtToken, uint256 sellerUsdtAmount) =
            rfq.claimable(rfqId, SELLER);
        require(sellerFxrpToken == address(fxrp) && sellerFxrpAmount == 0, "seller FXRP");
        require(sellerUsdtToken == address(usdt0) && sellerUsdtAmount == WINNING_QUOTE, "seller USDT0");

        vm.prank(SELLER);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_A);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_B);
        rfq.claim(rfqId);

        require(usdt0.balanceOf(SELLER) == WINNING_QUOTE, "seller proceeds");
        require(usdt0.balanceOf(PROVIDER_A) == QUOTE_CAP, "loser refund");
        require(fxrp.balanceOf(PROVIDER_B) == LOT, "winner FXRP");
        require(usdt0.balanceOf(PROVIDER_B) == QUOTE_CAP - WINNING_QUOTE, "winner refund");
        require(fxrp.balanceOf(address(rfq)) == 0 && usdt0.balanceOf(address(rfq)) == 0, "dust");
    }

    function testTeeSignerInitializesOnceBeforeRfqCreation() public {
        MockTeeMachineRegistry machineRegistry = new MockTeeMachineRegistry(teeSigner);
        HushFlowRfq uninitialized = new HushFlowRfq(
            address(fxrp), address(usdt0), teeRegistry, machineRegistry, address(0)
        );
        teeRegistry.setInstructionSender(address(uninitialized));
        uninitialized.setExtensionId();

        (bool createdBeforeSigner,) = address(uninitialized).call(
            abi.encodeCall(
                uninitialized.createRfq, (LOT, QUOTE_CAP, QUOTE_DEADLINE, RESOLUTION_DEADLINE, hex"01")
            )
        );
        require(!createdBeforeSigner, "RFQ created without signer");

        uninitialized.initializeTeeSigner(teeSigner);
        require(uninitialized.teeSigner() == teeSigner, "signer was not initialized");
        (bool replaced,) = address(uninitialized).call(
            abi.encodeCall(uninitialized.initializeTeeSigner, (address(0xBADD)))
        );
        require(!replaced, "signer replaced");
    }

    function testNoValidQuoteRefundsEveryDeposit() public {
        uint256 rfqId = _createAndQuote();
        bytes32 actionId = _requestResolution(rfqId);
        _submitSignedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.NO_VALID_QUOTE, address(0), 0);

        vm.prank(SELLER);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_A);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_B);
        rfq.claim(rfqId);

        require(fxrp.balanceOf(SELLER) == LOT, "seller refund");
        require(usdt0.balanceOf(PROVIDER_A) == QUOTE_CAP, "provider A refund");
        require(usdt0.balanceOf(PROVIDER_B) == QUOTE_CAP, "provider B refund");
    }

    function testInvalidRfqRefundsEveryDeposit() public {
        uint256 rfqId = _createAndQuote();
        bytes32 actionId = _requestResolution(rfqId);
        _submitSignedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.INVALID_RFQ, address(0), 0);

        vm.prank(SELLER);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_A);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_B);
        rfq.claim(rfqId);

        require(fxrp.balanceOf(SELLER) == LOT, "seller invalid RFQ refund");
        require(usdt0.balanceOf(PROVIDER_A) == QUOTE_CAP, "provider A invalid RFQ refund");
        require(usdt0.balanceOf(PROVIDER_B) == QUOTE_CAP, "provider B invalid RFQ refund");
    }

    function testTimeoutRefundsEveryDeposit() public {
        uint256 rfqId = _createAndQuote();
        vm.warp(RESOLUTION_DEADLINE + 1);
        rfq.timeoutRfq(rfqId);

        vm.prank(SELLER);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_A);
        rfq.claim(rfqId);
        require(fxrp.balanceOf(SELLER) == LOT, "seller timeout refund");
        require(usdt0.balanceOf(PROVIDER_A) == QUOTE_CAP, "provider timeout refund");
    }

    function testRejectsDuplicateQuoteAndOverTwentyProviders() public {
        uint256 rfqId = _createRfq();
        _submitQuote(rfqId, PROVIDER_A, hex"02");

        vm.prank(PROVIDER_A);
        (bool duplicate,) = address(rfq).call(abi.encodeCall(rfq.submitQuote, (rfqId, hex"03")));
        require(!duplicate, "duplicate quote accepted");

        for (uint256 i = 0; i < 19; ++i) {
            address provider = address(uint160(0x1000 + i));
            usdt0.mint(provider, QUOTE_CAP);
            vm.prank(provider);
            usdt0.approve(address(rfq), type(uint256).max);
            _submitQuote(rfqId, provider, abi.encodePacked(bytes1(uint8(i + 3))));
        }

        address twentyFirst = address(0x9999);
        usdt0.mint(twentyFirst, QUOTE_CAP);
        vm.prank(twentyFirst);
        usdt0.approve(address(rfq), type(uint256).max);
        vm.prank(twentyFirst);
        (bool overflow,) = address(rfq).call(abi.encodeCall(rfq.submitQuote, (rfqId, hex"ff")));
        require(!overflow, "provider cap exceeded");
    }

    function testRejectsResultReplayAndWrongWinner() public {
        uint256 rfqId = _createAndQuote();
        bytes32 actionId = _requestResolution(rfqId);

        (bytes memory resultData, bytes memory signature) =
            _signedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.TRADE, address(0xBAD), WINNING_QUOTE);
        (bool wrongWinner,) =
            address(rfq).call(abi.encodeCall(rfq.submitResult, (resultData, actionId, "submit", 1, signature)));
        require(!wrongWinner, "non-provider winner accepted");

        (resultData, signature) =
            _signedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.TRADE, PROVIDER_B, WINNING_QUOTE);
        rfq.submitResult(resultData, actionId, "submit", 1, signature);
        (bool replay,) =
            address(rfq).call(abi.encodeCall(rfq.submitResult, (resultData, actionId, "submit", 1, signature)));
        require(!replay, "result replay accepted");
    }

    function _createAndQuote() internal returns (uint256 rfqId) {
        rfqId = _createRfq();
        _submitQuote(rfqId, PROVIDER_A, hex"02");
        _submitQuote(rfqId, PROVIDER_B, hex"03");
    }

    function _createRfq() internal returns (uint256 rfqId) {
        vm.prank(SELLER);
        rfqId = rfq.createRfq(LOT, QUOTE_CAP, QUOTE_DEADLINE, RESOLUTION_DEADLINE, hex"01");
    }

    function _submitQuote(uint256 rfqId, address provider, bytes memory ciphertext) internal {
        vm.prank(provider);
        rfq.submitQuote(rfqId, ciphertext);
    }

    function _requestResolution(uint256 rfqId) internal returns (bytes32 actionId) {
        vm.warp(QUOTE_DEADLINE);
        actionId = rfq.requestResolution{value: 1 ether}(rfqId);
        require(actionId == teeRegistry.nextInstructionId(), "action id");
        require(teeRegistry.receivedFee() == 1 ether, "fee forwarding");
        require(address(rfq).balance == 0, "fee retained");
    }

    function _submitSignedResult(
        uint256 rfqId,
        bytes32 actionId,
        HushFlowResultVerifier.ResultType resultType,
        address winner,
        uint256 quote
    ) internal {
        (bytes memory resultData, bytes memory signature) = _signedResult(rfqId, actionId, resultType, winner, quote);
        rfq.submitResult(resultData, actionId, "submit", 1, signature);
    }

    function _signedResult(
        uint256 rfqId,
        bytes32 actionId,
        HushFlowResultVerifier.ResultType resultType,
        address winner,
        uint256 quote
    ) internal returns (bytes memory resultData, bytes memory signature) {
        resultData = abi.encode(
            HushFlowResultVerifier.ResultDataV1({
                schemaVersion: 1,
                chainId: block.chainid,
                contractAddress: address(rfq),
                rfqId: rfqId,
                resultType: resultType,
                winningProvider: winner,
                winningQuote: quote,
                resultExpiry: RESOLUTION_DEADLINE,
                resultNonce: keccak256(abi.encode(rfqId, actionId))
            })
        );
        bytes32 tagHash = keccak256("submit");
        bytes32 resultHash = keccak256(abi.encodePacked(keccak256(resultData), actionId, tagHash, uint8(1)));
        bytes32 payloadHash = keccak256(abi.encode(bytes32("TEE_ACTION_RESULT"), block.chainid, resultHash));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(TEE_PRIVATE_KEY, digest);
        signature = abi.encodePacked(r, s, v);
    }
}
