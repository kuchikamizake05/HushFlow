# Protocol Fixture Contract

These fixtures freeze the first HushFlow envelope and FCC result interfaces before production implementation.

Rules:

- schemaVersion is uint16 and currently equals 1.
- chainId, rfqId, value, winningQuote, and resultExpiry are unsigned integers.
- JSON represents uint256 values as base-10 strings to avoid floating-point conversion.
- contractAddress, sender, and winningProvider are 20-byte EVM addresses.
- payloadNonce and resultNonce are unique bytes32 values.
- payloadKind is SELLER_MINIMUM or PROVIDER_QUOTE.
- resultType is TRADE, NO_VALID_QUOTE, or INVALID_RFQ.
- TRADE requires a participating nonzero winner and a positive winning quote.
- NO_VALID_QUOTE and INVALID_RFQ require the zero address and zero quote.
- The FCC framework separately binds the exact result bytes to actionId, submissionTag, status, and the registered TEE signature.

The fixtures contain no production address, secret, ciphertext, or private user value.
