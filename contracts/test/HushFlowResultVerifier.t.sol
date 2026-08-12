// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {HushFlowResultVerifier} from "../src/HushFlowResultVerifier.sol";

contract HushFlowResultVerifierTest {
    bytes32 internal constant ACTION_ID = 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;
    bytes32 internal constant EXPECTED_PAYLOAD_HASH =
        0x3a85654eec5b68ed9a62197be23be551e83a75854089ee273c6c546f6074f8eb;
    address internal constant TEE_SIGNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    bytes internal constant TEE_SIGNATURE =
        hex"6715d3ebdb495f60b2fe159f3f3c892caf3b78ede913b05122f9e2859bae20800d41c5a58866a3c0f3e9690d3736add2ff0acdd31c0ec06439dbe3c5e858e6fb1c";
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

    function testRejectsEveryResultDataBindingAndOutcomeViolation() public {
        HushFlowResultVerifier.ResultDataV1 memory result = HushFlowResultVerifier.decodeResultDataV1(TRADE_RESULT);

        result.schemaVersion = 2;
        _expectValidationFailure(result, 114, result.contractAddress, 42, 1_900_000_000, HushFlowResultVerifier.InvalidSchemaVersion.selector);
        result.schemaVersion = 1;

        _expectValidationFailure(
            result,
            114,
            address(0x2222222222222222222222222222222222222222),
            42,
            1_900_000_000,
            HushFlowResultVerifier.ResultContractMismatch.selector
        );
        _expectValidationFailure(
            result, 114, result.contractAddress, 43, 1_900_000_000, HushFlowResultVerifier.ResultRfqMismatch.selector
        );

        result.resultNonce = bytes32(0);
        _expectValidationFailure(
            result, 114, result.contractAddress, 42, 1_900_000_000, HushFlowResultVerifier.ResultNonceZero.selector
        );
        result.resultNonce = bytes32(uint256(1));

        result.winningProvider = address(0);
        _expectValidationFailure(
            result, 114, result.contractAddress, 42, 1_900_000_000, HushFlowResultVerifier.ResultOutcomeInconsistent.selector
        );
        result.winningProvider = address(0x4444444444444444444444444444444444444444);
        result.winningQuote = 0;
        _expectValidationFailure(
            result, 114, result.contractAddress, 42, 1_900_000_000, HushFlowResultVerifier.ResultOutcomeInconsistent.selector
        );
        result.winningQuote = 97_000_000;
        result.resultType = HushFlowResultVerifier.ResultType.NO_VALID_QUOTE;
        _expectValidationFailure(
            result, 114, result.contractAddress, 42, 1_900_000_000, HushFlowResultVerifier.ResultOutcomeInconsistent.selector
        );
    }

    function testAcceptsCanonicalNoTradeOutcomeAtExactExpiry() public pure {
        HushFlowResultVerifier.ResultDataV1 memory result = HushFlowResultVerifier.decodeResultDataV1(TRADE_RESULT);
        result.resultType = HushFlowResultVerifier.ResultType.NO_VALID_QUOTE;
        result.winningProvider = address(0);
        result.winningQuote = 0;

        HushFlowResultVerifier.validateResultDataV1(
            result, result.chainId, result.contractAddress, result.rfqId, result.resultExpiry
        );
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

    function testVerifiesOfficialActionResultSignatureDomain() public pure {
        bytes32 payloadHash = HushFlowResultVerifier.verifyActionResult(
            TRADE_RESULT, ACTION_ID, ACTION_ID, "submit", keccak256("submit"), 1, TEE_SIGNATURE, TEE_SIGNER, 114
        );

        require(payloadHash == EXPECTED_PAYLOAD_HASH, "payload hash mismatch");
    }

    function testRejectsActionResultFieldSubstitution() public {
        _expectActionResultFailure(
            bytes32(uint256(ACTION_ID) + 1),
            "submit",
            1,
            TEE_SIGNER,
            114,
            HushFlowResultVerifier.ActionIdMismatch.selector
        );
        _expectActionResultFailure(
            ACTION_ID, "other", 1, TEE_SIGNER, 114, HushFlowResultVerifier.SubmissionTagMismatch.selector
        );
        _expectActionResultFailure(
            ACTION_ID, "submit", 0, TEE_SIGNER, 114, HushFlowResultVerifier.ActionResultNotSuccessful.selector
        );
        _expectActionResultFailure(
            ACTION_ID, "submit", 1, address(0x1234), 114, HushFlowResultVerifier.InvalidTeeSignature.selector
        );
        _expectActionResultFailure(
            ACTION_ID, "submit", 1, TEE_SIGNER, 115, HushFlowResultVerifier.InvalidTeeSignature.selector
        );
        _expectActionResultFailure(
            ACTION_ID, "submit", 1, address(0), 114, HushFlowResultVerifier.InvalidTeeSigner.selector
        );
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

    function verifyActionResult(
        bytes memory resultData,
        bytes32 actionId,
        string memory submissionTag,
        uint8 status,
        address teeSigner,
        uint256 chainId
    ) external pure returns (bytes32) {
        return HushFlowResultVerifier.verifyActionResult(
            resultData,
            actionId,
            ACTION_ID,
            submissionTag,
            keccak256("submit"),
            status,
            TEE_SIGNATURE,
            teeSigner,
            chainId
        );
    }

    function _expectActionResultFailure(
        bytes32 actionId,
        string memory submissionTag,
        uint8 status,
        address teeSigner,
        uint256 chainId,
        bytes4 expectedError
    ) private {
        (bool success, bytes memory returned) = address(this)
            .call(
                abi.encodeCall(
                    this.verifyActionResult, (TRADE_RESULT, actionId, submissionTag, status, teeSigner, chainId)
                )
            );

        require(!success, "invalid action result accepted");
        require(_selector(returned) == expectedError, "wrong action result error");
    }

    function _expectValidationFailure(
        HushFlowResultVerifier.ResultDataV1 memory result,
        uint256 expectedChainId,
        address expectedContract,
        uint256 expectedRfqId,
        uint256 currentTimestamp,
        bytes4 expectedError
    ) private {
        (bool success, bytes memory returned) = address(this)
            .call(
                abi.encodeCall(
                    this.validate, (result, expectedChainId, expectedContract, expectedRfqId, currentTimestamp)
                )
            );

        require(!success, "invalid result data accepted");
        require(_selector(returned) == expectedError, "wrong validation error");
    }

    function _selector(bytes memory returned) private pure returns (bytes4 selector) {
        if (returned.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            selector := mload(add(returned, 0x20))
        }
    }
}
