import type { Abi } from "viem";

export const hushFlowRfqAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "fxrp",
        type: "address",
        internalType: "address",
      },
      {
        name: "usdt0",
        type: "address",
        internalType: "address",
      },
      {
        name: "teeExtensionRegistry",
        type: "address",
        internalType: "contract ITeeExtensionRegistry",
      },
      {
        name: "teeMachineRegistry",
        type: "address",
        internalType: "contract ITeeMachineRegistry",
      },
      {
        name: "initialTeeSigner",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "FXRP",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IERC20",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_CIPHERTEXT_BYTES",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_PROVIDERS",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_QUOTE_DURATION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_QUOTE_DURATION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "OP_COMMAND_RESOLVE_RFQ",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "OP_TYPE_HUSHFLOW",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "RESOLUTION_DURATION",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "SUBMISSION_TAG_HASH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TEE_EXTENSION_REGISTRY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ITeeExtensionRegistry",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TEE_MACHINE_REGISTRY",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ITeeMachineRegistry",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TEE_SIGNER_INITIALIZER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "USDT0",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IERC20",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "accounting",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "depositedFxrp",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "depositedUsdt0",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "claimableFxrp",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "claimableUsdt0",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "claimedFxrp",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "claimedUsdt0",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cancelRfq",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimable",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "fxrpToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "fxrpAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "usdtToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "usdtAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimed",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "consumedActionIds",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "consumedResultNonces",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createRfq",
    inputs: [
      {
        name: "lotAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "quoteCap",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "quoteDeadline",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "resolutionDeadline",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "encryptedSellerMinimum",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "extensionId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initializeTeeSigner",
    inputs: [
      {
        name: "signer",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nextRfqId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "participated",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "providers",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quoteCiphertext",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "provider",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "requestResolution",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "actionId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "rfqs",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "seller",
        type: "address",
        internalType: "address",
      },
      {
        name: "lotAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "quoteCap",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "quoteDeadline",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "resolutionDeadline",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "status",
        type: "uint8",
        internalType: "enum HushFlowRfq.Status",
      },
      {
        name: "winningProvider",
        type: "address",
        internalType: "address",
      },
      {
        name: "winningQuote",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "actionId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sellerCiphertext",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setExtensionId",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitQuote",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "ciphertext",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitResult",
    inputs: [
      {
        name: "resultData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "actionId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "submissionTag",
        type: "string",
        internalType: "string",
      },
      {
        name: "actionStatus",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "teeSigner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "timeoutRfq",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "fxrpAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "usdt0Amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ExtensionIdInitialized",
    inputs: [
      {
        name: "extensionId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "QuoteSubmitted",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "provider",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "ciphertext",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ResolutionRequested",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "actionId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RfqCancelled",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RfqCreated",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "seller",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "lotAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "quoteCap",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "quoteDeadline",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "resolutionDeadline",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "sellerCiphertext",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RfqFinalized",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "status",
        type: "uint8",
        indexed: false,
        internalType: "enum HushFlowRfq.Status",
      },
      {
        name: "winningProvider",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "winningQuote",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "resultNonce",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RfqTimedOut",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TeeSignerInitialized",
    inputs: [
      {
        name: "teeSigner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "ActionAlreadyConsumed",
    inputs: [
      {
        name: "actionId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "ActionIdMismatch",
    inputs: [
      {
        name: "actualActionId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "expectedActionId",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "ActionResultNotSuccessful",
    inputs: [
      {
        name: "status",
        type: "uint8",
        internalType: "uint8",
      },
    ],
  },
  {
    type: "error",
    name: "AddressHasNoCode",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "AlreadyClaimed",
    inputs: [],
  },
  {
    type: "error",
    name: "DuplicateQuote",
    inputs: [],
  },
  {
    type: "error",
    name: "ECDSAInvalidSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "ECDSAInvalidSignatureLength",
    inputs: [
      {
        name: "length",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ECDSAInvalidSignatureS",
    inputs: [
      {
        name: "s",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "ExtensionIdAlreadySet",
    inputs: [],
  },
  {
    type: "error",
    name: "ExtensionIdNotFound",
    inputs: [],
  },
  {
    type: "error",
    name: "ExtensionNotInitialized",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidCiphertextLength",
    inputs: [
      {
        name: "actualLength",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidDeadlines",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidInstructionId",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidResultDataLength",
    inputs: [
      {
        name: "actualLength",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidSchemaVersion",
    inputs: [
      {
        name: "actualVersion",
        type: "uint16",
        internalType: "uint16",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTeeSignature",
    inputs: [
      {
        name: "recoveredSigner",
        type: "address",
        internalType: "address",
      },
      {
        name: "expectedSigner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTeeSigner",
    inputs: [],
  },
  {
    type: "error",
    name: "NothingToClaim",
    inputs: [],
  },
  {
    type: "error",
    name: "ProviderLimitReached",
    inputs: [],
  },
  {
    type: "error",
    name: "QuoteWindowClosed",
    inputs: [
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "QuoteWindowStillOpen",
    inputs: [
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "QuotesAlreadySubmitted",
    inputs: [],
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
  {
    type: "error",
    name: "ResolutionAlreadyRequested",
    inputs: [],
  },
  {
    type: "error",
    name: "ResolutionWindowClosed",
    inputs: [
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ResolutionWindowStillOpen",
    inputs: [
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ResultChainMismatch",
    inputs: [
      {
        name: "actualChainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "expectedChainId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ResultContractMismatch",
    inputs: [
      {
        name: "actualContract",
        type: "address",
        internalType: "address",
      },
      {
        name: "expectedContract",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ResultExpired",
    inputs: [
      {
        name: "resultExpiry",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "currentTimestamp",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ResultNonceAlreadyConsumed",
    inputs: [
      {
        name: "resultNonce",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "ResultNonceZero",
    inputs: [],
  },
  {
    type: "error",
    name: "ResultNotRequested",
    inputs: [],
  },
  {
    type: "error",
    name: "ResultOutcomeInconsistent",
    inputs: [],
  },
  {
    type: "error",
    name: "ResultRfqMismatch",
    inputs: [
      {
        name: "actualRfqId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "expectedRfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "RfqNotOpen",
    inputs: [
      {
        name: "rfqId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "SellerCannotQuote",
    inputs: [],
  },
  {
    type: "error",
    name: "SubmissionTagMismatch",
    inputs: [
      {
        name: "actualTagHash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "expectedTagHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "TeeSignerAlreadyInitialized",
    inputs: [],
  },
  {
    type: "error",
    name: "TeeSignerNotInitialized",
    inputs: [],
  },
  {
    type: "error",
    name: "UnauthorizedCancellation",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "UnauthorizedTeeSignerInitializer",
    inputs: [
      {
        name: "caller",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "UnsupportedTokenBehavior",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "WinningProviderDidNotParticipate",
    inputs: [
      {
        name: "provider",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "WinningQuoteExceedsCap",
    inputs: [
      {
        name: "quote",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "cap",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
] as const satisfies Abi;

export const HUSHFLOW_ABI_HASH =
  "0x57704ed80868d0465424ea69800fc304b9e3c81bbcad2c3535aa9bb1d8c75faf" as const;
