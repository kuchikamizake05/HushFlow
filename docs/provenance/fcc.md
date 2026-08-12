# FCC Provenance Record

Reviewed: 2026-07-22

## Official documentation

- Flare FCC weather insurance extension:
  https://dev.flare.network/fcc/guides/weather-insurance-extension
- Flare FCC private-key extension:
  https://dev.flare.network/fcc/guides/sign-extension
- Flare FCC build-your-first-extension guide:
  https://dev.flare.network/fcc/guides/getting-started
- Normative extension container contract published with the official scaffold:
  https://github.com/flare-foundation/fce-extension-scaffold/blob/main/docs/extension-contract.md
- Flare Coston2 network configuration:
  https://dev.flare.network/network/overview

Documentation is used to understand public interfaces, deployment order, ActionResult signing, and Coston2 requirements.

The HushFlow HTTP and tee-node crypto adapters were independently implemented from the normative wire requirements above. No framework source file from the unlicensed reference repositories was copied or adapted.

## Reference repositories

| Repository | Reviewed commit | License reported by GitHub |
| --- | --- | --- |
| flare-foundation/fce-extension-scaffold | cc6de5f57490d920f296403e590e95601e315024 | none |
| flare-foundation/fce-weather-api | d759e3de258913c51480c8dae485e510da6c5c64 | none |
| flare-foundation/fce-sign | c5bbf11fbcfb786a6b24e335f6e786b1c7f3d8bd | none |

No source from these repositories has been copied or vendored into HushFlow. Copying remains blocked until a compatible license or written permission is documented.

## Published packages

| Package | Version | Registry license |
| --- | --- | --- |
| @flarenetwork/flare-periphery-contracts | 0.1.52 | MIT |
| @flarenetwork/flare-wagmi-periphery-package | 3.6.0 | MIT |

Published packages may be used after their installed license text and package contents are checked into the dependency evidence.
