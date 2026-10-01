import Link from 'next/link';
import { Flame, ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="text-center max-w-md animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-4 rounded-2xl shadow-lg">
            <SearchX className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-7xl font-extrabold text-blue-600 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Sahifa topilmadi</h2>
        <p className="text-gray-600 mb-8">
          Kechirasiz, siz qidirgan sahifa mavjud emas yoki ko'chirilgan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
          Bosh sahifaga qaytish
        </Link>

        <div className="mt-10 flex items-center justify-center gap-2 text-gray-400">
          <Flame className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold">GazExpress</span>
        </div>
      </div>
    </div>
  );
}