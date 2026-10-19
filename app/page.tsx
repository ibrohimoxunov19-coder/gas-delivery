'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame, Menu, X, ArrowRight, MapPin, ShieldCheck, Zap,
  CheckCircle2, Volume2, Truck, Phone, Mail, Star,
} from 'lucide-react';

const NAV = [
  { label: 'Xizmatlar', href: '#services' },
  { label: 'Qanday ishlaydi', href: '#how' },
  { label: 'Aloqa', href: '#contact' },
];

const SERVICES = [
  {
    icon: Zap,
    title: 'Tezkor yetkazish',
    text: "O'rtacha 2 soat ichida gazingiz uyingizda. 24/7 ishlaymiz.",
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: MapPin,
    title: 'Jonli kuzatuv',
    text: 'Haydovchini xaritada real vaqtda kuzating, manzilni GPS bilan belgilang.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: ShieldCheck,
    title: 'Xavfsiz to\'lov',
    text: 'Naqd, Payme, Click. Ma\'lumotlaringiz RLS bilan himoyalangan.',
    color: 'from-emerald-500 to-teal-500',
  },
];

const STEPS = [
  { n: '01', title: 'Buyurtma bering', text: 'Tuman va mahallani tanlang, xaritada aniq manzilni belgilang, ballon turini tanlang.' },
  { n: '02', title: 'Haydovchi yo\'lga chiqadi', text: 'Buyurtmangiz bir zumda haydovchiga yetib boradi, holatini real vaqtda kuzatasiz.' },
  { n: '03', title: 'Yetkazildi — chek tayyor', text: 'Ballonni tasdiqlaganingizdan so\'ng to\'liq kvitansiya shakllanadi va chop etiladi.' },
];

const STACK = ['Next.js', 'Supabase', 'Leaflet', 'TypeScript', 'Tailwind CSS'];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ================= NAVBAR ================= */}
      <header
        className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md transition-all duration-300 ${
          scrolled ? 'shadow-md border-b border-slate-200/70' : 'border-b border-transparent'
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-white" />
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              <span className="text-slate-900">Gaz</span>
              <span className="text-blue-600">Express</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-blue-600 after:transition-all hover:after:w-full"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/auth"
              className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all"
            >
              Kirish
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
              aria-label="Menyu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobil menyu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="mt-1 text-center bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
              >
                Kirish
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600">
        {/* Qatlamli glow langarlar — "tekis ko'k"ni buzadi, chuqurlik beradi */}
        <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-amber-400/25 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-24 w-[32rem] h-[32rem] rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl" />
        {/* Nozik to'r naqshi */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />

        <div className="relative container mx-auto px-4 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          {/* Chap matn */}
          <div>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-amber-300" />
              O'zbekiston bo'ylab ishonchli xizmat
            </span>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] text-white tracking-tight">
              Gaz ballonlarini{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-amber-300">uyingizgacha</span>
                <span className="absolute left-0 bottom-1.5 h-3 w-full bg-amber-400/25 rounded-full -rotate-1" />
              </span>{' '}
              yetkazib beramiz
            </h1>

            <p className="mt-6 text-lg text-blue-50/90 max-w-xl leading-relaxed">
              Buyurtma bering — haydovchini xaritada real vaqtda kuzating.
              Tezkor, xavfsiz va to'liq shaffof xizmat.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 px-7 py-3.5 rounded-xl font-bold shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all"
              >
                Buyurtma berish
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 border border-white/30 bg-white/5 backdrop-blur-sm text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-white/15 transition-all"
              >
                Batafsil
              </a>
            </div>

            {/* Statistika */}
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {[
                { v: '24/7', l: 'Xizmat vaqti' },
                { v: '<2 soat', l: 'Yetkazib berish' },
                { v: '100%', l: 'Xavfsizlik' },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-300">{s.v}</p>
                  <p className="text-sm text-blue-100/80 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* O'ng glass karta */}
          <div className="relative lg:justify-self-end w-full max-w-md">
            <div className="absolute -inset-4 bg-gradient-to-tr from-amber-400/30 to-cyan-400/30 rounded-[2rem] blur-2xl opacity-60 animate-pulse" />
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/25 rounded-3xl shadow-2xl p-6 transition-transform duration-500 hover:-translate-y-2">
              <div className="flex items-center justify-between">
                <p className="text-white font-bold text-lg">Buyurtma #128</p>
                <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-xs font-semibold px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Yo'lda
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {[
                  { icon: CheckCircle2, t: 'Buyurtma tasdiqlandi', c: 'text-emerald-300' },
                  { icon: Truck, t: "Haydovchi yo'lda — xaritada kuzating", c: 'text-cyan-300' },
                  { icon: Volume2, t: 'Ovozli bildirishnoma yuborildi', c: 'text-amber-300' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center ${row.c}`}>
                      <row.icon className="w-4.5 h-4.5" />
                    </span>
                    <span className="text-white/90 text-sm">{row.t}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between">
                <span className="text-white/80 text-sm">12 kg ballon × 1</span>
                <span className="text-white font-extrabold text-lg">120 000 so'm</span>
              </div>
            </div>

            {/* Suzuvchi mini-badge */}
            <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2 hover:scale-105 transition-transform">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800 leading-none">4.9 / 5.0</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Mijoz bahosi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pastki yumaloq chekka */}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-white rounded-t-[2rem]" />
      </section>

      {/* ================= XIZMATLAR (oq fon) ================= */}
      <section id="services" className="bg-white py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-widest text-blue-600">Xizmatlar</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Nega aynan GazExpress?
            </h2>
            <p className="mt-4 text-slate-500 text-lg">
              Gaz yetkazib berishni to'liq raqamlashtiramiz — buyurtmadan to hujjatgacha.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="group relative bg-white border border-slate-200 rounded-3xl p-7 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 hover:border-transparent transition-all duration-300"
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-[0.06] transition-opacity`} />
                <span className={`relative inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-7 h-7 text-white" />
                </span>
                <h3 className="relative mt-5 text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="relative mt-2 text-slate-500 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= QANDAY ISHLAYDI (kulrang fon) ================= */}
      <section id="how" className="bg-slate-50 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-bold uppercase tracking-widest text-blue-600">Jarayon</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Uch qadamda gazingiz uyingizda
            </h2>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-8 relative">
            {/* Ulovchi chiziq (desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-cyan-200 to-amber-200" />
            {STEPS.map((st) => (
              <div key={st.n} className="relative text-center">
                <span className="relative z-10 inline-flex w-24 h-24 rounded-full bg-white border border-slate-200 shadow-xl items-center justify-center text-3xl font-extrabold text-transparent bg-clip-text">
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 opacity-10" />
                  <span className="bg-gradient-to-br from-blue-600 to-cyan-500 bg-clip-text text-transparent">{st.n}</span>
                </span>
                <h3 className="mt-6 text-xl font-bold text-slate-900">{st.title}</h3>
                <p className="mt-2 text-slate-500 leading-relaxed max-w-xs mx-auto">{st.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA (gradient) ================= */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 py-20">
        <div className="pointer-events-none absolute -top-20 right-10 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 w-80 h-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Hoziroq boshlaymizmi?
          </h2>
          <p className="mt-4 text-blue-50/90 text-lg max-w-xl mx-auto">
            Birinchi buyurtmangizni bering va zamonaviy xizmatdan bahramand bo'ling
          </p>
          <Link
            href="/auth"
            className="mt-8 inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold shadow-2xl hover:-translate-y-0.5 hover:shadow-white/30 transition-all"
          >
            Ro'yxatdan o'tish
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ================= FOOTER (qora) ================= */}
      <footer id="contact" className="bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4 py-14 grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </span>
              <span className="text-xl font-extrabold">
                <span className="text-white">Gaz</span>
                <span className="text-cyan-400">Express</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              Suyuq gaz ballonlarini uyma-uy yetkazib berish va boshqarish platformasi.
              Real vaqt, shaffof va xavfsiz.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Aloqa</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-cyan-400" />
                <a href="tel:+998901234567">+998 90 123 45 67</a>
              </li>
              <li className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-cyan-400" />
                <a href="mailto:info@gazexpress.uz">info@gazexpress.uz</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Texnologiyalar</h4>
            <div className="flex flex-wrap gap-2">
              {STACK.map((t) => (
                <span
                  key={t}
                  className="text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-500">
            © 2026 GazExpress. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
}