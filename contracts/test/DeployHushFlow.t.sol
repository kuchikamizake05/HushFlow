// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {DeployHushFlow} from "../script/DeployHushFlow.s.sol";

contract DeployHushFlowTest {
    function testAcceptsOnlyCoston2ChainId() public {
        DeployHushFlow deployment = new DeployHushFlow();

        deployment.validateChainId(114);

        (bool success, bytes memory returned) =
            address(deployment).call(abi.encodeCall(deployment.validateChainId, (115)));
        require(!success, "wrong chain accepted");
        require(_selector(returned) == DeployHushFlow.Coston2Only.selector, "wrong error");
    }

    function _selector(bytes memory returned) private pure returns (bytes4 selector) {
        if (returned.length < 4) return bytes4(0);
        assembly {
            selector := mload(add(returned, 0x20))
        }
    }
}
