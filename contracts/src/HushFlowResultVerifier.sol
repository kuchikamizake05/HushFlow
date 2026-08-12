// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

library HushFlowResultVerifier {
    using MessageHashUtils for bytes32;

    uint256 internal constant RESULT_DATA_V1_LENGTH = 9 * 32;
    bytes32 internal constant TEE_ACTION_RESULT_PREFIX = bytes32("TEE_ACTION_RESULT");

    enum ResultType {
        TRADE,
        NO_VALID_QUOTE,
        INVALID_RFQ
    }

    struct ResultDataV1 {
        uint16 schemaVersion;
        uint256 chainId;
        address contractAddress;
        uint256 rfqId;
        ResultType resultType;
        address winningProvider;
        uint256 winningQuote;
        uint256 resultExpiry;
        bytes32 resultNonce;
    }

    error InvalidResultDataLength(uint256 actualLength);
    error InvalidSchemaVersion(uint16 actualVersion);
    error ResultChainMismatch(uint256 actualChainId, uint256 expectedChainId);
    error ResultContractMismatch(address actualContract, address expectedContract);
    error ResultRfqMismatch(uint256 actualRfqId, uint256 expectedRfqId);
    error ResultExpired(uint256 resultExpiry, uint256 currentTimestamp);
    error ResultNonceZero();
    error ResultOutcomeInconsistent();
    error ActionIdMismatch(bytes32 actualActionId, bytes32 expectedActionId);
    error SubmissionTagMismatch(bytes32 actualTagHash, bytes32 expectedTagHash);
    error ActionResultNotSuccessful(uint8 status);
    error InvalidTeeSigner();
    error InvalidTeeSignature(address recoveredSigner, address expectedSigner);

    function decodeResultDataV1(bytes memory encoded) internal pure returns (ResultDataV1 memory result) {
        if (encoded.length != RESULT_DATA_V1_LENGTH) {
            revert InvalidResultDataLength(encoded.length);
        }

        result = abi.decode(encoded, (ResultDataV1));
    }

    function validateResultDataV1(
        ResultDataV1 memory result,
        uint256 expectedChainId,
        address expectedContract,
        uint256 expectedRfqId,
        uint256 currentTimestamp
    ) internal pure {
        if (result.schemaVersion != 1) {
            revert InvalidSchemaVersion(result.schemaVersion);
        }
        if (result.chainId != expectedChainId) {
            revert ResultChainMismatch(result.chainId, expectedChainId);
        }
        if (result.contractAddress != expectedContract) {
            revert ResultContractMismatch(result.contractAddress, expectedContract);
        }
        if (result.rfqId != expectedRfqId) {
            revert ResultRfqMismatch(result.rfqId, expectedRfqId);
        }
        if (result.resultExpiry < currentTimestamp) {
            revert ResultExpired(result.resultExpiry, currentTimestamp);
        }
        if (result.resultNonce == bytes32(0)) {
            revert ResultNonceZero();
        }

        bool isTrade = result.resultType == ResultType.TRADE;
        bool hasWinner = result.winningProvider != address(0);
        bool hasQuote = result.winningQuote != 0;

        if (isTrade != hasWinner || isTrade != hasQuote) {
            revert ResultOutcomeInconsistent();
        }
    }

    function verifyActionResult(
        bytes memory resultData,
        bytes32 actionId,
        bytes32 expectedActionId,
        string memory submissionTag,
        bytes32 expectedSubmissionTagHash,
        uint8 status,
        bytes memory signature,
        address expectedTeeSigner,
        uint256 chainId
    ) internal pure returns (bytes32 payloadHash) {
        if (actionId != expectedActionId || expectedActionId == bytes32(0)) {
            revert ActionIdMismatch(actionId, expectedActionId);
        }

        bytes32 submissionTagHash = keccak256(bytes(submissionTag));
        if (submissionTagHash != expectedSubmissionTagHash) {
            revert SubmissionTagMismatch(submissionTagHash, expectedSubmissionTagHash);
        }
        if (status != 1) {
            revert ActionResultNotSuccessful(status);
        }
        if (expectedTeeSigner == address(0)) {
            revert InvalidTeeSigner();
        }

        bytes32 resultHash = keccak256(abi.encodePacked(keccak256(resultData), actionId, submissionTagHash, status));
        payloadHash = keccak256(abi.encode(TEE_ACTION_RESULT_PREFIX, chainId, resultHash));
        address recoveredSigner = ECDSA.recover(payloadHash.toEthSignedMessageHash(), signature);

        if (recoveredSigner != expectedTeeSigner) {
            revert InvalidTeeSignature(recoveredSigner, expectedTeeSigner);
        }
    }
}
