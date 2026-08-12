// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

library HushFlowResultVerifier {
    uint256 internal constant RESULT_DATA_V1_LENGTH = 9 * 32;

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
}
