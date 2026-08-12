// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {HushFlowRfq} from "../src/HushFlowRfq.sol";
import {HushFlowResultVerifier} from "../src/HushFlowResultVerifier.sol";
import {ITeeExtensionRegistry} from "../src/interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "../src/interfaces/ITeeMachineRegistry.sol";
import {AdversarialToken} from "./harness/AdversarialToken.sol";

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

contract ReentrantTeeRegistry is ITeeExtensionRegistry {
    address public instructionSender;
    uint256 public rfqId;
    uint256 public sendCount;
    bool public reentrySucceeded;
    bool private entered;

    function configure(address sender, uint256 targetRfqId) external {
        instructionSender = sender;
        rfqId = targetRfqId;
    }

    function nextPublicExtensionId() external pure returns (uint256) {
        return 0x10001;
    }

    function getTeeExtensionInstructionsSender(uint256 extensionId) external view returns (address) {
        return extensionId == 0x10000 ? instructionSender : address(0);
    }

    function sendInstructions(address[] calldata, TeeInstructionParams calldata) external payable returns (bytes32) {
        ++sendCount;
        if (!entered) {
            entered = true;
            (reentrySucceeded,) = instructionSender.call(abi.encodeCall(HushFlowRfq.requestResolution, (rfqId)));
        }
        return bytes32(uint256(0xA11CE));
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
    uint64 internal constant RESOLUTION_DEADLINE = 3_800;

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

    function testAccountingTracksDepositsBeforeFinalization() public {
        uint256 rfqId = _createAndQuote();

        (
            uint256 depositedFxrp,
            uint256 depositedUsdt0,
            uint256 claimableFxrp,
            uint256 claimableUsdt0,
            uint256 claimedFxrp,
            uint256 claimedUsdt0
        ) = rfq.accounting(rfqId);

        require(depositedFxrp == LOT, "deposited FXRP");
        require(depositedUsdt0 == 2 * QUOTE_CAP, "deposited USDT0");
        require(claimableFxrp == 0 && claimableUsdt0 == 0, "open RFQ became claimable");
        require(claimedFxrp == 0 && claimedUsdt0 == 0, "open RFQ marked claimed");
    }

    function testAccountingConservesTerminalEntitlementsAcrossClaims() public {
        uint256 rfqId = _createAndQuote();
        bytes32 actionId = _requestResolution(rfqId);
        _submitSignedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.TRADE, PROVIDER_B, WINNING_QUOTE);

        (, , uint256 claimableFxrp, uint256 claimableUsdt0, uint256 claimedFxrp, uint256 claimedUsdt0) =
            rfq.accounting(rfqId);
        require(claimableFxrp == LOT, "terminal FXRP entitlement");
        require(claimableUsdt0 == 2 * QUOTE_CAP, "terminal USDT0 entitlement");
        require(claimedFxrp == 0 && claimedUsdt0 == 0, "premature claimed totals");

        vm.prank(SELLER);
        rfq.claim(rfqId);
        (, , claimableFxrp, claimableUsdt0, claimedFxrp, claimedUsdt0) = rfq.accounting(rfqId);
        require(claimableFxrp == LOT, "seller consumed FXRP entitlement");
        require(claimableUsdt0 == 2 * QUOTE_CAP - WINNING_QUOTE, "seller USDT0 entitlement remains");
        require(claimedFxrp == 0 && claimedUsdt0 == WINNING_QUOTE, "seller claimed totals");

        vm.prank(PROVIDER_B);
        rfq.claim(rfqId);
        vm.prank(PROVIDER_A);
        rfq.claim(rfqId);
        (, , claimableFxrp, claimableUsdt0, claimedFxrp, claimedUsdt0) = rfq.accounting(rfqId);
        require(claimableFxrp == 0 && claimableUsdt0 == 0, "entitlements remain after all claims");
        require(claimedFxrp == LOT, "claimed FXRP conservation");
        require(claimedUsdt0 == 2 * QUOTE_CAP, "claimed USDT0 conservation");
    }

    function testRejectsFalseReturnDepositWithoutRecordingRfq() public {
        (AdversarialToken adversarial,, HushFlowRfq target) = _adversarialRfq();
        adversarial.setTransferFromMode(AdversarialToken.Mode.FALSE_RETURN);

        bool created = _tryCreateOn(target);

        require(!created, "false-return deposit accepted");
        require(target.nextRfqId() == 1, "failed deposit recorded RFQ");
        require(adversarial.balanceOf(address(target)) == 0, "failed deposit retained tokens");
    }

    function testRejectsRevertingDepositWithoutRecordingRfq() public {
        (AdversarialToken adversarial,, HushFlowRfq target) = _adversarialRfq();
        adversarial.setTransferFromMode(AdversarialToken.Mode.REVERT_CALL);

        bool created = _tryCreateOn(target);

        require(!created, "reverting deposit accepted");
        require(target.nextRfqId() == 1, "reverting deposit recorded RFQ");
        require(adversarial.balanceOf(address(target)) == 0, "reverting deposit retained tokens");
    }

    function testRejectsShortDepositWithoutRecordingRfq() public {
        (AdversarialToken adversarial,, HushFlowRfq target) = _adversarialRfq();
        adversarial.setTransferFromMode(AdversarialToken.Mode.SHORT_TRANSFER);

        bool created = _tryCreateOn(target);

        require(!created, "short deposit accepted");
        require(target.nextRfqId() == 1, "short deposit recorded RFQ");
        require(adversarial.balanceOf(address(target)) == 0, "short deposit state did not roll back");
    }

    function testRejectsBalanceIncreasingDepositWithoutRecordingRfq() public {
        (AdversarialToken adversarial,, HushFlowRfq target) = _adversarialRfq();
        adversarial.setTransferFromMode(AdversarialToken.Mode.BONUS_TRANSFER);

        bool created = _tryCreateOn(target);

        require(!created, "balance-increasing deposit accepted");
        require(target.nextRfqId() == 1, "balance-increasing deposit recorded RFQ");
        require(adversarial.balanceOf(address(target)) == 0, "inflated deposit state did not roll back");
    }

    function testOutgoingFalseReturnPreservesCancellationEntitlement() public {
        (AdversarialToken adversarial,, HushFlowRfq target) = _adversarialRfq();
        require(_tryCreateOn(target), "standard deposit failed");
        vm.prank(SELLER);
        target.cancelRfq(1);
        adversarial.setTransferMode(AdversarialToken.Mode.FALSE_RETURN);

        vm.prank(SELLER);
        (bool claimedSuccessfully,) = address(target).call(abi.encodeCall(target.claim, (1)));

        require(!claimedSuccessfully, "false-return claim succeeded");
        require(!target.claimed(1, SELLER), "failed claim consumed entitlement");
        (, , uint256 claimableFxrp,, uint256 claimedFxrp,) = target.accounting(1);
        require(claimableFxrp == LOT && claimedFxrp == 0, "failed claim changed accounting");

        adversarial.setTransferMode(AdversarialToken.Mode.STANDARD);
        vm.prank(SELLER);
        target.claim(1);
        require(adversarial.balanceOf(SELLER) == LOT, "restored claim failed");
    }

    function testRevertingOutgoingTransferPreservesCancellationEntitlement() public {
        (AdversarialToken adversarial,, HushFlowRfq target) = _adversarialRfq();
        require(_tryCreateOn(target), "standard deposit failed");
        vm.prank(SELLER);
        target.cancelRfq(1);
        adversarial.setTransferMode(AdversarialToken.Mode.REVERT_CALL);

        vm.prank(SELLER);
        (bool claimedSuccessfully,) = address(target).call(abi.encodeCall(target.claim, (1)));

        require(!claimedSuccessfully, "reverting claim succeeded");
        require(!target.claimed(1, SELLER), "reverting claim consumed entitlement");
        (, , uint256 claimableFxrp,, uint256 claimedFxrp,) = target.accounting(1);
        require(claimableFxrp == LOT && claimedFxrp == 0, "reverting claim changed accounting");
    }

    function testFuzzAcceptsEveryBoundedQuoteWindow(uint64 seed) public {
        uint64 duration = uint64(60 + uint256(seed) % (86_400 - 60 + 1));
        uint64 quoteDeadline = uint64(block.timestamp) + duration;
        uint64 resolutionDeadline = quoteDeadline + 1_800;

        require(_tryCreateRfq(quoteDeadline, resolutionDeadline), "bounded quote window rejected");
    }

    function testFuzzRejectsEveryTradeQuoteAboveCap(uint96 excessSeed) public {
        uint256 rfqId = _createAndQuote();
        bytes32 actionId = _requestResolution(rfqId);
        uint256 excessiveQuote = QUOTE_CAP + 1 + uint256(excessSeed);
        (bytes memory resultData, bytes memory signature) =
            _signedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.TRADE, PROVIDER_B, excessiveQuote);

        (bool accepted,) =
            address(rfq).call(abi.encodeCall(rfq.submitResult, (resultData, actionId, "submit", 1, signature)));

        require(!accepted, "over-cap trade accepted");
        require(!rfq.consumedActionIds(actionId), "rejected action consumed");
    }

    function testFuzzEveryTradeClaimOrderConservesDeposits(uint8 orderSeed) public {
        uint256 rfqId = _createAndQuote();
        bytes32 actionId = _requestResolution(rfqId);
        _submitSignedResult(rfqId, actionId, HushFlowResultVerifier.ResultType.TRADE, PROVIDER_B, WINNING_QUOTE);

        address[3] memory actors = _claimPermutation(orderSeed % 6);
        for (uint256 i = 0; i < actors.length; ++i) {
            vm.prank(actors[i]);
            rfq.claim(rfqId);
        }

        (, , uint256 claimableFxrp, uint256 claimableUsdt0, uint256 claimedFxrp, uint256 claimedUsdt0) =
            rfq.accounting(rfqId);
        require(claimableFxrp == 0 && claimableUsdt0 == 0, "claim order left entitlements");
        require(claimedFxrp == LOT, "claim order lost FXRP");
        require(claimedUsdt0 == 2 * QUOTE_CAP, "claim order lost USDT0");
    }

    function testTeeSignerInitializesOnceBeforeRfqCreation() public {
        MockTeeMachineRegistry machineRegistry = new MockTeeMachineRegistry(teeSigner);
        HushFlowRfq uninitialized =
            new HushFlowRfq(address(fxrp), address(usdt0), teeRegistry, machineRegistry, address(0));
        teeRegistry.setInstructionSender(address(uninitialized));
        uninitialized.setExtensionId();

        (bool createdBeforeSigner,) = address(uninitialized)
            .call(
                abi.encodeCall(uninitialized.createRfq, (LOT, QUOTE_CAP, QUOTE_DEADLINE, RESOLUTION_DEADLINE, hex"01"))
            );
        require(!createdBeforeSigner, "RFQ created without signer");

        vm.prank(address(0xBAD));
        (bool initializedByOther,) =
            address(uninitialized).call(abi.encodeCall(uninitialized.initializeTeeSigner, (teeSigner)));
        require(!initializedByOther, "unauthorized signer initialization");

        uninitialized.initializeTeeSigner(teeSigner);
        require(uninitialized.teeSigner() == teeSigner, "signer was not initialized");
        (bool replaced,) =
            address(uninitialized).call(abi.encodeCall(uninitialized.initializeTeeSigner, (address(0xBADD))));
        require(!replaced, "signer replaced");
    }

    function testSellerCancelsBeforeQuotesAndClaimsFullLot() public {
        uint256 rfqId = _createRfq();

        vm.prank(SELLER);
        rfq.cancelRfq(rfqId);

        vm.prank(SELLER);
        rfq.claim(rfqId);

        require(fxrp.balanceOf(SELLER) == LOT, "seller cancellation refund");
        require(fxrp.balanceOf(address(rfq)) == 0, "cancelled lot remains escrowed");
    }

    function testOnlySellerCanCancel() public {
        uint256 rfqId = _createRfq();

        vm.prank(PROVIDER_A);
        (bool cancelled,) = address(rfq).call(abi.encodeWithSignature("cancelRfq(uint256)", rfqId));

        require(!cancelled, "non-seller cancelled RFQ");
    }

    function testSellerCannotCancelAfterFirstQuote() public {
        uint256 rfqId = _createRfq();
        _submitQuote(rfqId, PROVIDER_A, hex"02");

        vm.prank(SELLER);
        (bool cancelled,) = address(rfq).call(abi.encodeWithSignature("cancelRfq(uint256)", rfqId));

        require(!cancelled, "RFQ cancelled after quote");
    }

    function testCancellationIsTerminal() public {
        uint256 rfqId = _createRfq();

        vm.prank(SELLER);
        rfq.cancelRfq(rfqId);
        vm.prank(SELLER);
        (bool cancelledAgain,) = address(rfq).call(abi.encodeWithSignature("cancelRfq(uint256)", rfqId));

        require(!cancelledAgain, "RFQ cancelled twice");
    }

    function testRejectsQuoteWindowBelowOneMinute() public {
        bool created = _tryCreateRfq(1_059, 2_859);
        require(!created, "sub-minute quote window accepted");
    }

    function testAcceptsQuoteWindowAtOneMinuteBoundary() public {
        bool created = _tryCreateRfq(1_060, 2_860);
        require(created, "one-minute quote window rejected");
    }

    function testAcceptsQuoteWindowAtTwentyFourHourBoundary() public {
        bool created = _tryCreateRfq(87_400, 89_200);
        require(created, "24-hour quote window rejected");
    }

    function testRejectsQuoteWindowAboveTwentyFourHours() public {
        bool created = _tryCreateRfq(87_401, 89_201);
        require(!created, "quote window above 24 hours accepted");
    }

    function testRejectsNonCanonicalResolutionDeadline() public {
        bool created = _tryCreateRfq(QUOTE_DEADLINE, RESOLUTION_DEADLINE - 1);
        require(!created, "noncanonical resolution deadline accepted");
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

    function testResolutionRequestCannotBeReentered() public {
        ReentrantTeeRegistry reentrantRegistry = new ReentrantTeeRegistry();
        MockTeeMachineRegistry machineRegistry = new MockTeeMachineRegistry(teeSigner);
        HushFlowRfq target =
            new HushFlowRfq(address(fxrp), address(usdt0), reentrantRegistry, machineRegistry, teeSigner);
        reentrantRegistry.configure(address(target), 0);
        target.setExtensionId();

        vm.prank(SELLER);
        fxrp.approve(address(target), type(uint256).max);
        vm.prank(SELLER);
        uint256 targetRfqId = target.createRfq(LOT, QUOTE_CAP, QUOTE_DEADLINE, RESOLUTION_DEADLINE, hex"01");
        reentrantRegistry.configure(address(target), targetRfqId);

        vm.warp(QUOTE_DEADLINE);
        target.requestResolution{value: 1 ether}(targetRfqId);

        require(reentrantRegistry.sendCount() == 1, "duplicate FCC instruction created");
        require(!reentrantRegistry.reentrySucceeded(), "reentrant call succeeded");
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

    function _tryCreateRfq(uint64 quoteDeadline, uint64 resolutionDeadline) internal returns (bool created) {
        vm.prank(SELLER);
        (created,) = address(rfq).call(
            abi.encodeCall(rfq.createRfq, (LOT, QUOTE_CAP, quoteDeadline, resolutionDeadline, hex"01"))
        );
    }

    function _adversarialRfq()
        internal
        returns (AdversarialToken adversarial, MockToken quoteToken, HushFlowRfq target)
    {
        adversarial = new AdversarialToken();
        quoteToken = new MockToken("USDT0", "USDT0");
        MockTeeMachineRegistry machineRegistry = new MockTeeMachineRegistry(teeSigner);
        target = new HushFlowRfq(address(adversarial), address(quoteToken), teeRegistry, machineRegistry, teeSigner);
        teeRegistry.setInstructionSender(address(target));
        target.setExtensionId();

        adversarial.mint(SELLER, LOT);
        vm.prank(SELLER);
        adversarial.approve(address(target), type(uint256).max);
    }

    function _tryCreateOn(HushFlowRfq target) internal returns (bool created) {
        vm.prank(SELLER);
        (created,) = address(target).call(
            abi.encodeCall(target.createRfq, (LOT, QUOTE_CAP, QUOTE_DEADLINE, RESOLUTION_DEADLINE, hex"01"))
        );
    }

    function _claimPermutation(uint8 permutation) internal pure returns (address[3] memory actors) {
        if (permutation == 0) return [SELLER, PROVIDER_A, PROVIDER_B];
        if (permutation == 1) return [SELLER, PROVIDER_B, PROVIDER_A];
        if (permutation == 2) return [PROVIDER_A, SELLER, PROVIDER_B];
        if (permutation == 3) return [PROVIDER_A, PROVIDER_B, SELLER];
        if (permutation == 4) return [PROVIDER_B, SELLER, PROVIDER_A];
        return [PROVIDER_B, PROVIDER_A, SELLER];
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
