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

    function testRejectsWrongBinding() public {
        HushFlowResultVerifier.ResultDataV1 memory result = HushFlowResultVerifier.decodeResultDataV1(TRADE_RESULT);

        (bool success, bytes memory returned) = address(this)
            .call(abi.encodeCall(this.validate, (result, 115, result.contractAddress, result.rfqId, 1_900_000_000)));

        require(!success, "wrong chain accepted");
        require(_selector(returned) == HushFlowResultVerifier.ResultChainMismatch.selector, "wrong error");
    }

    function testRejectsExpiredResult() public {
        HushFlowResultVerifier.ResultDataV1 memory result = HushFlowResultVerifier.decodeResultDataV1(TRADE_RESULT);

        (bool success, bytes memory returned) = address(this)
            .call(
                abi.encodeCall(
                    this.validate,
                    (result, result.chainId, result.contractAddress, result.rfqId, result.resultExpiry + 1)
                )
            );

        require(!success, "expired result accepted");
        require(_selector(returned) == HushFlowResultVerifier.ResultExpired.selector, "wrong error");
    }

    function testRejectsNonCanonicalLength() public {
        bytes memory resultWithTrailingByte = bytes.concat(TRADE_RESULT, hex"00");

        (bool success, bytes memory returned) =
            address(this).call(abi.encodeCall(this.decode, (resultWithTrailingByte)));

        require(!success, "trailing byte accepted");
        require(_selector(returned) == HushFlowResultVerifier.InvalidResultDataLength.selector, "wrong error");
    }

    function validate(
        HushFlowResultVerifier.ResultDataV1 memory result,
        uint256 expectedChainId,
        address expectedContract,
        uint256 expectedRfqId,
        uint256 currentTimestamp
    ) external pure {
        HushFlowResultVerifier.validateResultDataV1(
            result, expectedChainId, expectedContract, expectedRfqId, currentTimestamp
        );
    }

    function decode(bytes memory encoded) external pure returns (HushFlowResultVerifier.ResultDataV1 memory) {
        return HushFlowResultVerifier.decodeResultDataV1(encoded);
    }

    function _selector(bytes memory returned) private pure returns (bytes4 selector) {
        if (returned.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            selector := mload(add(returned, 0x20))
        }
    }
}
