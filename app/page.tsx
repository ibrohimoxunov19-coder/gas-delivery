import Link from 'next/link';
import {
  Flame,
  Truck,
  Shield,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  Volume2,
  ShoppingCart,
  Phone,
  Mail,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ===== HEADER ===== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-2 rounded-xl shadow-md">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold">
              Gaz<span className="text-blue-600">Express</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#xizmatlar" className="hover:text-blue-600 transition">Xizmatlar</a>
            <a href="#qanday" className="hover:text-blue-600 transition">Qanday ishlaydi</a>
            <a href="#aloqa" className="hover:text-blue-600 transition">Aloqa</a>
          </nav>
          <Link
            href="/auth"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-md"
          >
            Kirish
          </Link>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="pt-32 pb-24 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 text-white">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <span className="inline-block bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              ⚡ O'zbekiston bo'ylab ishonchli xizmat
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              Gaz ballonlarini{' '}
              <span className="text-cyan-300">uyingizgacha</span> yetkazib beramiz
            </h1>
            <p className="text-blue-100 text-lg mb-8 max-w-lg">
              Buyurtma bering — haydovchini xaritada real vaqtda kuzating.
              Tezkor, xavfsiz va to'liq shaffof xizmat.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth"
                className="bg-white text-blue-700 px-8 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg flex items-center gap-2"
              >
                Buyurtma berish <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#qanday"
                className="border border-white/30 bg-white/10 px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition"
              >
                Batafsil
              </a>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-12 max-w-md">
              <div>
                <p className="text-3xl font-extrabold">24/7</p>
                <p className="text-blue-200 text-sm">Xizmat vaqti</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">&lt;2 soat</p>
                <p className="text-blue-200 text-sm">Yetkazib berish</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">100%</p>
                <p className="text-blue-200 text-sm">Xavfsizlik</p>
              </div>
            </div>
          </div>

          {/* Mock kuzatuv kartochkasi */}
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <p className="font-bold text-lg">Buyurtma #128</p>
                <span className="bg-green-400/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                  Yo'lda
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-green-300" />
                  </div>
                  <p className="text-blue-100">Buyurtma tasdiqlandi</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Truck className="w-5 h-5 text-cyan-300" />
                  </div>
                  <p className="text-blue-100">Haydovchi yo'lda — xaritada kuzating</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Volume2 className="w-5 h-5 text-blue-200" />
                  </div>
                  <p className="text-blue-100">Ovozli bildirishnoma yuborildi</p>
                </div>
              </div>
              <div className="mt-6 bg-white/10 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-blue-100">12 kg ballon × 1</span>
                <span className="font-bold">120 000 so'm</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== XIZMATLAR ===== */}
      <section id="xizmatlar" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Nega aynan GazExpress?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Zamonaviy texnologiyalar asosida qurilgan tizim — har bir buyurtma nazorat ostida
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition border border-gray-100">
              <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
                <Clock className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Tezkor yetkazib berish</h3>
              <p className="text-gray-600 text-sm">2 soat ichida eshigingizgacha yetkazib beramiz</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition border border-gray-100">
              <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
                <MapPin className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Xaritada kuzatish</h3>
              <p className="text-gray-600 text-sm">Haydovchi joylashuvini real vaqtda ko'rasiz</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition border border-gray-100">
              <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Xavfsiz va ishonchli</h3>
              <p className="text-gray-600 text-sm">Sertifikatlangan ballonlar va himoyalangan ma'lumotlar</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition border border-gray-100">
              <div className="bg-orange-100 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
                <Volume2 className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Ovozli bildirishnoma</h3>
              <p className="text-gray-600 text-sm">Har bir holat o'z vaqtida ovozli xabar qilinadi</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== QANDAY ISHLAYDI ===== */}
      <section id="qanday" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Qanday ishlaydi?</h2>
            <p className="text-gray-600">Atigi 3 qadam — va gaz uyingizda</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-bold text-blue-600 mb-1">1-QADAM</p>
              <h3 className="text-lg font-bold mb-2">Buyurtma bering</h3>
              <p className="text-gray-600 text-sm">Ballon turini tanlang va manzilni xaritada belgilang</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-bold text-blue-600 mb-1">2-QADAM</p>
              <h3 className="text-lg font-bold mb-2">Kuzatib boring</h3>
              <p className="text-gray-600 text-sm">Haydovchini xaritada real vaqtda kuzating</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-bold text-blue-600 mb-1">3-QADAM</p>
              <h3 className="text-lg font-bold mb-2">Qabul qiling</h3>
              <p className="text-gray-600 text-sm">Ballonni qabul qilib, xizmatni baholang</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 bg-gradient-to-r from-blue-700 to-cyan-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Hoziroq boshlaymizmi?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Birinchi buyurtmangizni bering va zamonaviy xizmatdan bahramand bo'ling
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-white text-blue-700 px-10 py-4 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg"
          >
            Ro'yxatdan o'tish <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer id="aloqa" className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-2 rounded-xl">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-white">
                Gaz<span className="text-cyan-400">Express</span>
              </span>
            </div>
            <p className="text-sm">
              Propan gaz ballonlarini uyma-uy yetkazib berish va boshqarish axborot tizimi
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Aloqa</h4>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> +998 90 123 45 67
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> info@gazexpress.uz
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Loyiha haqida</h4>
            <p className="text-sm">
              WEB TIZIMLAR fani doirasidagi kurs loyihasi. Next.js, Supabase va Leaflet
              texnologiyalari asosida qurilgan.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 mt-10 pt-6 border-t border-gray-800 text-center text-sm">
          © 2026 GazExpress. Barcha huquqlar himoyalangan.
        </div>
      </footer>
    </main>
  );
}