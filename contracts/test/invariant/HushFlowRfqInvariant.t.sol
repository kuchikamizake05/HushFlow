// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {HushFlowRfq} from "../../src/HushFlowRfq.sol";
import {HushFlowRfqHandler, InvariantToken} from "./HushFlowRfqHandler.sol";

contract HushFlowRfqInvariantTest {
    HushFlowRfqHandler private handler;
    HushFlowRfq private rfq;
    InvariantToken private fxrp;
    InvariantToken private usdt0;
    address[] private targets;

    function setUp() public {
        handler = new HushFlowRfqHandler();
        rfq = handler.rfq();
        fxrp = handler.fxrp();
        usdt0 = handler.usdt0();
        targets.push(address(handler));
    }

    function targetContracts() public view returns (address[] memory) {
        return targets;
    }

    function invariantClaimedAndClaimableNeverExceedDeposits() public view {
        uint256 nextRfqId = rfq.nextRfqId();
        for (uint256 rfqId = 1; rfqId < nextRfqId; ++rfqId) {
            (
                uint256 depositedFxrp,
                uint256 depositedUsdt0,
                uint256 claimableFxrp,
                uint256 claimableUsdt0,
                uint256 claimedFxrp,
                uint256 claimedUsdt0
            ) = rfq.accounting(rfqId);
            require(claimedFxrp + claimableFxrp <= depositedFxrp, "FXRP entitlement exceeds deposit");
            require(claimedUsdt0 + claimableUsdt0 <= depositedUsdt0, "USDT0 entitlement exceeds deposit");
        }
    }

    function invariantTerminalEntitlementsEqualDeposits() public view {
        uint256 nextRfqId = rfq.nextRfqId();
        for (uint256 rfqId = 1; rfqId < nextRfqId; ++rfqId) {
            (,,,,, HushFlowRfq.Status status,,,) = rfq.rfqs(rfqId);
            if (status == HushFlowRfq.Status.OPEN) continue;

            (
                uint256 depositedFxrp,
                uint256 depositedUsdt0,
                uint256 claimableFxrp,
                uint256 claimableUsdt0,
                uint256 claimedFxrp,
                uint256 claimedUsdt0
            ) = rfq.accounting(rfqId);
            require(claimedFxrp + claimableFxrp == depositedFxrp, "terminal FXRP not conserved");
            require(claimedUsdt0 + claimableUsdt0 == depositedUsdt0, "terminal USDT0 not conserved");
        }
    }

    function invariantEscrowBalancesCoverAllUnclaimedDeposits() public view {
        uint256 nextRfqId = rfq.nextRfqId();
        uint256 unclaimedFxrp;
        uint256 unclaimedUsdt0;
        for (uint256 rfqId = 1; rfqId < nextRfqId; ++rfqId) {
            (uint256 depositedFxrp, uint256 depositedUsdt0,,, uint256 claimedFxrp, uint256 claimedUsdt0) =
                rfq.accounting(rfqId);
            unclaimedFxrp += depositedFxrp - claimedFxrp;
            unclaimedUsdt0 += depositedUsdt0 - claimedUsdt0;
        }

        require(fxrp.balanceOf(address(rfq)) == unclaimedFxrp, "FXRP escrow mismatch");
        require(usdt0.balanceOf(address(rfq)) == unclaimedUsdt0, "USDT0 escrow mismatch");
    }
}
