// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {HushFlowRfq} from "../src/HushFlowRfq.sol";
import {ITeeExtensionRegistry} from "../src/interfaces/ITeeExtensionRegistry.sol";
import {ITeeMachineRegistry} from "../src/interfaces/ITeeMachineRegistry.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address value);
}

/// @notice Dry-run-only Coston2 deployment script. It deliberately never starts a broadcast.
contract DeployHushFlow {
    uint256 public constant COSTON2_CHAIN_ID = 114;
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    error Coston2Only(uint256 actualChainId);

    event DeploymentSimulated(
        address indexed hushFlowRfq,
        address indexed fxrp,
        address indexed usdt0,
        address teeExtensionRegistry,
        address teeMachineRegistry,
        address teeSigner
    );

    function validateChainId(uint256 actualChainId) public pure {
        if (actualChainId != COSTON2_CHAIN_ID) revert Coston2Only(actualChainId);
    }

    function run() external returns (HushFlowRfq deployment) {
        validateChainId(block.chainid);

        address fxrp = VM.envAddress("COSTON2_EXPECTED_FXRP");
        address usdt0 = VM.envAddress("COSTON2_EXPECTED_USDT0");
        address teeExtensionRegistry = VM.envAddress("FCC_TEE_EXTENSION_REGISTRY");
        address teeMachineRegistry = VM.envAddress("FCC_TEE_MACHINE_REGISTRY");
        address teeSigner = VM.envAddress("FCC_TEE_SIGNER");

        deployment = new HushFlowRfq(
            fxrp,
            usdt0,
            ITeeExtensionRegistry(teeExtensionRegistry),
            ITeeMachineRegistry(teeMachineRegistry),
            teeSigner
        );

        emit DeploymentSimulated(
            address(deployment), fxrp, usdt0, teeExtensionRegistry, teeMachineRegistry, teeSigner
        );
    }
}
