# Coston2 M1 Live Validation Runbook

Status aktivitas dalam runbook ini adalah **controlled testnet activity**, bukan
pengguna nyata, traction, volume organik, atau bukti product-market fit.

## Tujuan dan batas aman

Runbook memverifikasi satu vertical slice: seller mengunci fixed amount FXRP,
dua provider mengirim quote terenkripsi dan collateral USDT0, FCC memilih quote
valid tertinggi, kontrak memverifikasi hasil bertanda tangan, lalu ketiga wallet
melakukan claim. Losing quote tidak dimasukkan ke evidence publik.

- Network wajib Coston2 dengan chain ID `114`.
- Gunakan tiga wallet testnet berbeda: seller, provider A, provider B.
- Jangan masukkan seed phrase atau private key ke terminal history, chat, screenshot,
  log, atau evidence bundle.
- Script deployment saat ini hanya simulasi. Tidak ada broadcast sampai ada
  persetujuan eksplisit terpisah.
- Kontrak adalah source of truth; indexer hanya read model.

## Gate A — prasyarat lokal

1. Salin `.env.example` menjadi `.env.local`, lalu isi secara lokal.
2. Isi kredensial FCC indexer read-only dan tiga alamat wallet publik.
3. Isi registry FCC dan TEE signer hanya dari jawaban resmi organizer/Flare.
4. Pastikan wallet memiliki C2FLR untuk gas serta token test FXRP/USDT0 yang cukup.
5. Pilih salah satu pin mode tee-node:

   - biarkan `FCC_TEE_NODE_IMAGE` dan `FCC_TEE_NODE_PIN_SOURCE` kosong untuk
     source resmi Flare `v0.0.24` pada commit
     `adc67a29eb7162f6f1b5dabcbca320009480695e`; atau
   - isi keduanya untuk image resmi dengan referensi immutable `@sha256` dan
     sumber publikasi digest.

6. Jalankan pemeriksaan Coston2 dan FCC:

   ```bash
   pnpm preflight:coston2
   pnpm preflight:fcc-container
   pnpm preflight:fcc
   ```

7. Render template yang sesuai tanpa pull, build, atau run:

   ```bash
   # Default official-source mode
   docker compose -f infra/fcc/docker-compose.template.yml config --quiet

   # Immutable-image override mode
   FCC_TEE_NODE_IMAGE="$FCC_TEE_NODE_IMAGE" \
     docker compose -f infra/fcc/docker-compose.image.template.yml config --quiet
   ```

   Perintah `config` dan preflight tidak menarik image/source, membangun image,
   menjalankan container, mendaftarkan extension, membuka tunnel, atau
   mengirim transaksi. `docker compose build` adalah aksi operator terpisah
   yang dapat mengakses network untuk mengambil source resmi.

8. Jalankan `pnpm plan:coston2`. Output wajib bertanda `DRY_RUN_ONLY`, hanya
   berisi data publik, dan urutan aksi harus berjumlah sebelas.

Jika satu gate gagal, hentikan proses. Jangan mengganti address dengan tebakan.

## Gate B — simulasi deployment

Muat `.env.local` tanpa mencetak nilainya, lalu jalankan simulasi:

```bash
set -a
source .env.local
set +a
forge script contracts/script/DeployHushFlow.s.sol:DeployHushFlow \
  --rpc-url "$COSTON2_RPC_URL"
```

Perintah di atas tidak memakai `--broadcast`, dan kontrak script sendiri tidak
memanggil `startBroadcast`. Catat hasil simulasi/gas, tetapi jangan menganggap
alamat kontrak simulasi sebagai deployment live.

## Gate C — persetujuan deployment live

Sebelum deploy sebenarnya, wajib ada persetujuan eksplisit baru yang menyebut:

- network Coston2;
- address FXRP, USDT0, kedua registry FCC, dan TEE signer;
- wallet deployer publik;
- bahwa transaksi on-chain testnet boleh dikirim.

Setelah approval, buat perubahan terpisah yang mengaktifkan broadcast dengan
guard `HUSHFLOW_BROADCAST_APPROVED=true`, review diff, lalu jalankan ulang semua
verification. Jangan mengubah script dry-run diam-diam.

## Gate D — controlled three-wallet scenario

Setelah deployment live dan verifikasi bytecode/config:

1. Seller approve FXRP lalu create RFQ dengan encrypted minimum proceeds.
2. Provider A approve USDT0 lalu submit encrypted quote.
3. Provider B approve USDT0 lalu submit encrypted quote.
4. Setelah quote deadline, request resolution.
5. FCC extension memproses input, memilih highest valid quote, lalu menghasilkan
   signed result.
6. Submit signed result ke kontrak sebelum resolution deadline.
7. Seller, provider A, dan provider B melakukan claim masing-masing.

Automation harus berjalan berurutan dan berhenti pada kegagalan pertama. Jangan
retry transaksi tanpa memeriksa receipt dan state kontrak agar tidak menghasilkan
aksi ganda atau bukti yang menyesatkan.

## Evidence bundle

Simpan hanya artefak publik berikut:

| Evidence | Nilai |
| --- | --- |
| Chain ID | `114` (Coston2 Testnet) |
| Contract address | [`0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab`](https://coston2-explorer.flare.network/address/0x5bdfb417953fd1f87383dc07b8677a5b9cc880ab) |
| Extension ID | `66273` (`0x00000000000000000000000000000000000000000000000000000000000102e1`) |
| Extension Reg Tx | [`0xeafa6b03a6587f04b982a1dcc302fbd8c6ddf6f5eafcca5b4c3fd00b7b6338c4`](https://coston2-explorer.flare.network/tx/0xeafa6b03a6587f04b982a1dcc302fbd8c6ddf6f5eafcca5b4c3fd00b7b6338c4) |
| Deployment tx | [`0xe9249d36f44a5c242defd678404ef78b83d38bee23c8f196afd6d41ab09750aa`](https://coston2-explorer.flare.network/tx/0xe9249d36f44a5c242defd678404ef78b83d38bee23c8f196afd6d41ab09750aa) |
| Operator / Deployer | [`0xf4373959d6fa7d24906CB3010ac90306E532EAAB`](https://coston2-explorer.flare.network/address/0xf4373959d6fa7d24906CB3010ac90306E532EAAB) |
| Seller address | [`0x55e45ab0Fce664D94717aF94F0a2B14c2627A217`](https://coston2-explorer.flare.network/address/0x55e45ab0Fce664D94717aF94F0a2B14c2627A217) |
| Provider A address | [`0xDEeF3Ff07cC7650ecba862FB366021CA0DBBEc7F`](https://coston2-explorer.flare.network/address/0xDEeF3Ff07cC7650ecba862FB366021CA0DBBEc7F) |
| Provider B address | [`0x923B8EC7ae61Ef4cbFd9A55508aAcad397C2C81d`](https://coston2-explorer.flare.network/address/0x923B8EC7ae61Ef4cbFd9A55508aAcad397C2C81d) |
| Step 1: Seller Approve FXRP | [`0xca5e49546434b5b42ca4a8474a6538be030f8d1daff9be38ef63684166de0e3d`](https://coston2-explorer.flare.network/tx/0xca5e49546434b5b42ca4a8474a6538be030f8d1daff9be38ef63684166de0e3d) |
| Step 2: Create RFQ (RFQ #1) | [`0xce351a60d64096fc823426175104a6abb46b8fb14e1ab18a91297ba015738fab`](https://coston2-explorer.flare.network/tx/0xce351a60d64096fc823426175104a6abb46b8fb14e1ab18a91297ba015738fab) |
| Step 3: Provider A Approve USDT0 | [`0xc75fb5149f7c6c9e0bc8a25e5de6062d76c12ed9f7f9fad5d65a828cf953dc3c`](https://coston2-explorer.flare.network/tx/0xc75fb5149f7c6c9e0bc8a25e5de6062d76c12ed9f7f9fad5d65a828cf953dc3c) |
| Step 4: Provider A Submit Quote | [`0x3ce10ebfab1e447343e52ba2c19fa8d6173a10cb7563a26168a102a1a8b8c80f`](https://coston2-explorer.flare.network/tx/0x3ce10ebfab1e447343e52ba2c19fa8d6173a10cb7563a26168a102a1a8b8c80f) |
| Step 5: Provider B Approve USDT0 | [`0xeaa520db815ef0b7e7f21181af6c8d676c26a2187393a89e63d2f4d5b055f30d`](https://coston2-explorer.flare.network/tx/0xeaa520db815ef0b7e7f21181af6c8d676c26a2187393a89e63d2f4d5b055f30d) |
| Step 6: Provider B Submit Quote | [`0xb6448e17d8706b7c1034aec7a5a3739144ae1a1072720a01e4441d7b762241bc`](https://coston2-explorer.flare.network/tx/0xb6448e17d8706b7c1034aec7a5a3739144ae1a1072720a01e4441d7b762241bc) |
| Step 7: Request Resolution | [`0x0a2317c4d9bf28a3df529ef99447b46600f50d25264825e84922624426da5970`](https://coston2-explorer.flare.network/tx/0x0a2317c4d9bf28a3df529ef99447b46600f50d25264825e84922624426da5970) |
| FCC action ID | `0xdc2245bc3bceee153de88f9a90008e3a63c1913a91b7723d08fccc3cac8d7c37` |
| Step 8: FCC Result Submission | [`0xcbdda0ae9448030632138a382556e4aae4198eb59c3b72df4fb3dc8e9f250ef2`](https://coston2-explorer.flare.network/tx/0xcbdda0ae9448030632138a382556e4aae4198eb59c3b72df4fb3dc8e9f250ef2) |
| Step 9: Seller Claim Proceeds (4 USDT0) | [`0xc6dcf96550f5d3ac4bccee57ba5d5eea60a6f85968655748f79c6cc204537458`](https://coston2-explorer.flare.network/tx/0xc6dcf96550f5d3ac4bccee57ba5d5eea60a6f85968655748f79c6cc204537458) |
| Step 10: Provider B Claim Lot (1 FXRP) | [`0xfd72d6d4083500bb5a47acae0619da8fc75276c57ee1a59b1fe2aef1ded2e884`](https://coston2-explorer.flare.network/tx/0xfd72d6d4083500bb5a47acae0619da8fc75276c57ee1a59b1fe2aef1ded2e884) |
| Step 11: Provider A Claim Refund (5 USDT0) | [`0xc20885ec1b5e3effaaa92330523366f15b243e66111d1cea91927a7eba5a533e`](https://coston2-explorer.flare.network/tx/0xc20885ec1b5e3effaaa92330523366f15b243e66111d1cea91927a7eba5a533e) |
| Contract final status | **SETTLED** (TRADE with Provider B winning @ 4 USDT0) |

Tambahkan screenshot explorer dan log yang sudah disanitasi. Jangan sertakan
plaintext minimum proceeds, plaintext losing quote, database credentials, tunnel
token, private key, atau full environment dump.

## Penutupan

Matikan tunnel setelah test, pastikan tidak ada secret di history/evidence, dan
jalankan verification suite kembali. Laporkan hasil sebagai controlled Coston2
test dengan jumlah wallet dan transaksi yang sebenarnya—bukan real users.
