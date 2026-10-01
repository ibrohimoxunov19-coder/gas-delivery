# ⚡ GazExpress — Propan gaz ballonlarini uyma-uy yetkazib berish tizimi

> «WEB TIZIMLAR» fani doirasidagi kurs loyihasi (74-mavzu)

Zamonaviy, to'liq funksional **3 rolli** axborot tizimi: mijoz buyurtma beradi,
haydovchi jonli kuzatadi, admin boshqaradi. Real vaqt rejimida ishlaydi.

---

## 🛠 Texnologiyalar steki

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Dizayn | Tailwind CSS 4, Lucide Icons |
| Backend / Baza | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Xarita | Leaflet + react-leaflet (OpenStreetMap) |
| PWA | Web App Manifest, Notification API |
| Boshqa | Web Speech API (ovozli bildirishnoma), Geolocation API |

---

## 🚀 O'rnatish va ishga tushirish

```bash
git clone <repo-url>
cd gas-delivery
npm install
cp .env.example .env.local   # Supabase URL va ANON KEY ni kiriting
npm run dev                   # http://localhost:3000