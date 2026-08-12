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

    function decodeResultDataV1(bytes memory encoded) internal pure returns (ResultDataV1 memory result) {
        if (encoded.length != RESULT_DATA_V1_LENGTH) {
            revert InvalidResultDataLength(encoded.length);
        }

        result = abi.decode(encoded, (ResultDataV1));
    }
}
