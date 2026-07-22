// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {HushFlowResultVerifier} from "../src/HushFlowResultVerifier.sol";

contract HushFlowResultVerifierTest {
    bytes internal constant TRADE_RESULT =
        hex"000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000720000000000000000000000001111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044444444444444444444444444444444444444440000000000000000000000000000000000000000000000000000000005c81a4000000000000000000000000000000000000000000000000000000000713fb42c1000000000000000000000000000000000000000000000000000000000000001";

    function testDecodesTypeScriptTradeFixture() public pure {
        HushFlowResultVerifier.ResultDataV1 memory result = HushFlowResultVerifier.decodeResultDataV1(TRADE_RESULT);

        require(result.schemaVersion == 1, "schema version");
        require(result.chainId == 114, "chain id");
        require(result.contractAddress == address(0x1111111111111111111111111111111111111111), "contract");
        require(result.rfqId == 42, "rfq id");
        require(uint8(result.resultType) == 0, "result type");
        require(result.winningProvider == address(0x4444444444444444444444444444444444444444), "winner");
        require(result.winningQuote == 97_000_000, "quote");
        require(result.resultExpiry == 1_900_000_300, "expiry");
        require(result.resultNonce == 0x1000000000000000000000000000000000000000000000000000000000000001, "nonce");
    }
}
