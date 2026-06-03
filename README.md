# Sales Frontend — Greenpark CEO War-Room

Frontend **React + TypeScript (Vite)** untuk Dashboard Sales Greenpark Group.
Mengonsumsi API Go di `backend/sales` dan menampilkan war-room satu layar
(kanvas 1920×1080 yang otomatis di-scale ke ukuran viewport).

## Struktur

```
src/
  api/client.ts        → klien fetch ke backend
  hooks/               → useDashboard (fetch), useScale (scaling kanvas)
  lib/format.ts        → formatter Rupiah/persen + palet status & konstanta
  components/ui.tsx     → primitives: Card, Ring, Donut, MiniBars, Modal, Pill
  components/panels.tsx → 10 panel bento (Executive, Funnel, Project, dst.)
  components/details.tsx→ tampilan detail (drill-down) per panel
  App.tsx              → shell: header, filter bar, grid bento, modal
  styles.css           → tema light corporate
```

## Menjalankan

Pastikan backend berjalan lebih dulu:

```bash
cd backend/sales && go run ./cmd/server   # http://localhost:8085
```

Lalu frontend:

```bash
cd frontend/sales
npm install
npm run dev        # buka URL yang ditampilkan Vite (default port 5176)
```

### Konfigurasi (`.env`)

| Variabel        | Default                 | Keterangan                              |
| --------------- | ----------------------- | --------------------------------------- |
| `VITE_PORT`     | `5176`                  | Port dev/preview (kosongkan = dinamis)  |
| `VITE_API_BASE` | `http://localhost:8085` | Base URL backend API Go                 |

## Skrip

| Perintah            | Fungsi                          |
| ------------------- | ------------------------------- |
| `npm run dev`       | Server pengembangan (HMR)       |
| `npm run build`     | Type-check + build produksi     |
| `npm run preview`   | Pratinjau hasil build           |
| `npm run typecheck` | `tsc --noEmit`                  |

## Login & Master Data

Aplikasi dibuka dengan layar **login**. Akun default:

- `admin` / `admin123` — bisa membuka **Master Data** (tombol ⚙ di header) untuk
  input/ubah/hapus seluruh data; perubahan langsung tampil di dashboard.
- `viewer` / `viewer123` — hanya melihat dashboard.

Token sesi disimpan di `localStorage`; saat sesi habis (401) aplikasi otomatis
kembali ke layar login.

Master Data mencakup: Executive snapshot, Project, Sales, Channel, Reason Code,
Agent, AI Alert, KPI, Main Funnel, Tren Bulanan, Master Stock, Event, Reason Meta,
serta Periode & Update.

## Fitur

- 10 panel: Executive Snapshot, Main Funnel, Lead Quality, Sales Performance,
  Project Monitoring, Sumber Penjualan, Reason Code (3-layer), Booking→Akad→Cash-In,
  Agent & Event, AI Alert & Action Plan.
- Filter per kategori (Mesin Utama / Pendukung / Pembenahan) & per project —
  snapshot, funnel, dan cash ikut menyesuaikan.
- Drill-down modal pada setiap panel (klik ikon perbesar).
- Login berbasis token + area admin master-data (role admin).
