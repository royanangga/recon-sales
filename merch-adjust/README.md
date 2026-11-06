# Adjustment Sales & Purchase Merchandise

Next.js 14 + PostgreSQL, siap deploy ke Vercel.

## Deploy ke Vercel
1. Push folder ini ke GitHub, lalu *Import Project* di Vercel.
2. Buat database Postgres (Vercel → Storage → Neon, atau Supabase). Pastikan env `DATABASE_URL` terisi.
3. Tambahkan env `BASIC_AUTH_USER` dan `BASIC_AUTH_PASS` (login). **Wajib**, karena ini data keuangan.
4. Deploy. Tabel dibuat otomatis saat request pertama.

Lokal: `cp .env.example .env.local`, isi, lalu `npm install && npm run dev`.

## Alur bulanan
1. **Import File** → pilih periode, upload workbook (boleh seluruh workbook; sheet & kolom dikenali otomatis dari nama).
   - SL AR, GL SALES, PO PROGRESS COIL: menggantikan data periode yang sama.
   - PO Impor: hanya menambah (baris duplikat dilewati) dan otomatis menambah daftar **Part Impor**.
   - Price Master: menggantikan semua; hanya Start_Date terbaru per Item_Code yang disimpan.
2. **Part Impor** → isi kolom Rate (YEN→IDR), per baris atau massal.
3. **Dashboard** → rekonsiliasi, Jurnal Adjustment Purchase, analisis GL Sales + Jurnal Adjustment Sales, Export Excel.
4. **Detail SL AR** → cek kelompok & harga tiap baris, pilih manual HANWA/USC untuk item yang ada di keduanya.

## Aturan klasifikasi (urutan)
Kode item SL AR dibuang huruf "S" di belakang, lalu dicari di:
1. harga PO Progress HANWA atau UNITED STEEL → **HANWA/USC** (jika ada di keduanya, dipilih lewat supplier S.J. No. = Customer DN No, bisa di-override manual)
2. Part Impor → **IMPOR** (Qty × harga YEN × rate)
3. Price Master → **OTHER**
4. tidak ketemu → UNMATCHED (tidak masuk jurnal, muncul peringatan)

Baris PO dengan remarks "inhouse" dipisahkan dari rekonsiliasi.

`npx tsx scripts/test-core.ts file.xlsx` menjalankan logika terhadap workbook tanpa database.
