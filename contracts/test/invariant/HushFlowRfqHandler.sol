// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {HushFlowRfq} from "../../src/HushFlowRfq.sol";
import {ITeeExtensionRegistry} from "../../src/interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "../../src/interfaces/ITeeMachineRegistry.sol";

interface VmInvariantHandler {
    function warp(uint256 timestamp) external;
}

contract InvariantToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

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

contract InvariantExtensionRegistry is ITeeExtensionRegistry {
    uint256 private constant EXTENSION_ID = 0x10000;
    address private _instructionSender;

    function setInstructionSender(address sender) external {
        _instructionSender = sender;
    }

    function nextPublicExtensionId() external pure returns (uint256) {
        return EXTENSION_ID + 1;
    }

    function getTeeExtensionInstructionsSender(uint256 extensionId) external view returns (address) {
        return extensionId == EXTENSION_ID ? _instructionSender : address(0);
    }

    function sendInstructions(address[] calldata, TeeInstructionParams calldata)
        external
        payable
        returns (bytes32)
    {
        return keccak256(abi.encode(msg.sender, msg.value, block.number));
    }
}

contract InvariantMachineRegistry is ITeeMachineRegistry {
    function getRandomTeeIds(uint256, uint256 count) external pure returns (address[] memory teeIds) {
        teeIds = new address[](count);
        if (count != 0) teeIds[0] = address(0xA11CE);
    }
}

contract InvariantActor {
    function approveToken(InvariantToken token, address spender) external {
        token.approve(spender, type(uint256).max);
    }

    function submitQuote(HushFlowRfq target, uint256 rfqId, bytes calldata ciphertext) external {
        target.submitQuote(rfqId, ciphertext);
    }

    function claim(HushFlowRfq target, uint256 rfqId) external {
        target.claim(rfqId);
    }
}

contract HushFlowRfqHandler {
    VmInvariantHandler private constant vm =
        VmInvariantHandler(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 public constant LOT = 10_000_000;
    uint256 public constant QUOTE_CAP = 120_000_000;

    InvariantToken public immutable fxrp;
    InvariantToken public immutable usdt0;
    HushFlowRfq public immutable rfq;
    InvariantActor public immutable providerA;
    InvariantActor public immutable providerB;

    uint256 public activeRfqId;

    constructor() {
        fxrp = new InvariantToken();
        usdt0 = new InvariantToken();
        InvariantExtensionRegistry extensionRegistry = new InvariantExtensionRegistry();
        InvariantMachineRegistry machineRegistry = new InvariantMachineRegistry();
        rfq = new HushFlowRfq(address(fxrp), address(usdt0), extensionRegistry, machineRegistry, address(0xA11CE));
        extensionRegistry.setInstructionSender(address(rfq));
        rfq.setExtensionId();

        providerA = new InvariantActor();
        providerB = new InvariantActor();
        providerA.approveToken(usdt0, address(rfq));
        providerB.approveToken(usdt0, address(rfq));
    }

    function create(uint64 durationSeed) external {
        if (activeRfqId != 0 && _status(activeRfqId) == HushFlowRfq.Status.OPEN) return;
        if (block.timestamp > type(uint64).max - 90_000) return;

        uint64 duration = uint64(60 + uint256(durationSeed) % (86_400 - 60 + 1));
        uint64 quoteDeadline = uint64(block.timestamp) + duration;
        uint64 resolutionDeadline = quoteDeadline + 1_800;
        fxrp.mint(address(this), LOT);
        fxrp.approve(address(rfq), type(uint256).max);

        (bool created, bytes memory result) = address(rfq).call(
            abi.encodeCall(rfq.createRfq, (LOT, QUOTE_CAP, quoteDeadline, resolutionDeadline, hex"01"))
        );
        if (created) activeRfqId = abi.decode(result, (uint256));
    }

    function submitQuoteA(bytes32 ciphertextSeed) external {
        _submitQuote(providerA, ciphertextSeed);
    }

    function submitQuoteB(bytes32 ciphertextSeed) external {
        _submitQuote(providerB, ciphertextSeed);
    }

    function cancel() external {
        if (activeRfqId == 0) return;
        _attempt(address(rfq), abi.encodeCall(rfq.cancelRfq, (activeRfqId)));
    }

    function timeout() external {
        if (activeRfqId == 0 || _status(activeRfqId) != HushFlowRfq.Status.OPEN) return;
        uint64 resolutionDeadline = _resolutionDeadline(activeRfqId);
        vm.warp(uint256(resolutionDeadline) + 1);
        _attempt(address(rfq), abi.encodeCall(rfq.timeoutRfq, (activeRfqId)));
    }

    function claimSeller() external {
        if (activeRfqId == 0) return;
        _attempt(address(rfq), abi.encodeCall(rfq.claim, (activeRfqId)));
    }

    function claimProviderA() external {
        _claim(providerA);
    }

    function claimProviderB() external {
        _claim(providerB);
    }

    function _submitQuote(InvariantActor provider, bytes32 ciphertextSeed) private {
        if (activeRfqId == 0 || _status(activeRfqId) != HushFlowRfq.Status.OPEN) return;
        usdt0.mint(address(provider), QUOTE_CAP);
        _attempt(
            address(provider), abi.encodeCall(provider.submitQuote, (rfq, activeRfqId, abi.encodePacked(ciphertextSeed)))
        );
    }

    function _claim(InvariantActor provider) private {
        if (activeRfqId == 0) return;
        _attempt(address(provider), abi.encodeCall(provider.claim, (rfq, activeRfqId)));
    }

    function _attempt(address target, bytes memory data) private returns (bool success) {
        (success,) = target.call(data);
    }

    function _status(uint256 rfqId) private view returns (HushFlowRfq.Status status) {
        (, , , , , status, , ,) = rfq.rfqs(rfqId);
    }

    function _resolutionDeadline(uint256 rfqId) private view returns (uint64 resolutionDeadline) {
        (, , , , resolutionDeadline, , , ,) = rfq.rfqs(rfqId);
    }
}
