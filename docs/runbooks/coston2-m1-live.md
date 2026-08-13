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
| Chain ID | `114` |
| Contract address | TBD setelah deployment yang disetujui |
| Deployment tx | TBD |
| Seller address | TBD |
| Provider A address | TBD |
| Provider B address | TBD |
| Create RFQ tx / RFQ ID | TBD |
| Provider A submit tx | TBD |
| Provider B submit tx | TBD |
| Resolution request tx | TBD |
| FCC action ID | TBD |
| Result submission tx | TBD |
| Seller claim tx | TBD |
| Provider A claim tx | TBD |
| Provider B claim tx | TBD |
| Contract final status | TBD |

Tambahkan screenshot explorer dan log yang sudah disanitasi. Jangan sertakan
plaintext minimum proceeds, plaintext losing quote, database credentials, tunnel
token, private key, atau full environment dump.

## Penutupan

Matikan tunnel setelah test, pastikan tidak ada secret di history/evidence, dan
jalankan verification suite kembali. Laporkan hasil sebagai controlled Coston2
test dengan jumlah wallet dan transaksi yang sebenarnya—bukan real users.
