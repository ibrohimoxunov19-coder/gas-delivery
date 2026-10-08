'use client';

import { useState } from 'react';
import { Profile } from '@/types';
import ProfileEditor from './ProfileEditor';
import {
  X, Edit3, Phone, MapPin, Truck, Car, Hash,
} from 'lucide-react';

interface Props {
  profile: Profile;
  onUpdated: () => void;
}

const roleMeta: Record<string, { label: string; cls: string }> = {
  customer: { label: 'Mijoz', cls: 'bg-blue-100 text-blue-700' },
  driver: { label: 'Haydovchi', cls: 'bg-purple-100 text-purple-700' },
  admin: { label: 'Admin', cls: 'bg-amber-100 text-amber-700' },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ProfileButton({ profile, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const meta = roleMeta[profile.role] || roleMeta.customer;
  const initial = (profile.full_name || '?').trim().charAt(0).toUpperCase();

  const close = () => {
    setOpen(false);
    setEditing(false);
  };

  const handleSaved = () => {
    setEditing(false);
    onUpdated();
  };

  return (
    <>
      {/* 🔘 Navbar'dagi ikonka (bosh harf + ism) */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition"
        title="Profilim"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shadow">
          {initial}
        </span>
        <span className="hidden sm:inline text-gray-700 font-medium text-sm">
          {profile.full_name}
        </span>
      </button>

      {/* 🪟 Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sarlavha + avatar */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-5 relative">
              <button
                onClick={close}
                className="absolute top-3 right-3 text-white/80 hover:text-white transition"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-2xl shrink-0">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{profile.full_name}</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
              </div>
            </div>

            {editing ? (
              /* ✏️ Tahrirlash rejimi (ProfileEditor) */
              <div className="p-5">
                <ProfileEditor profile={profile} onSaved={handleSaved} />
              </div>
            ) : (
              /* 👁️ Ko'rish rejimi */
              <div className="p-5 space-y-1">
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefon" value={profile.phone} />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Manzil" value={profile.address} />

                {profile.role === 'driver' && (
                  <>
                    <div className="pt-3 pb-1">
                      <p className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Haydovchi ma'lumotlari
                      </p>
                    </div>
                    <InfoRow
                      icon={<Car className="w-4 h-4" />}
                      label="Mashina"
                      value={[profile.car_plate, profile.car_model].filter(Boolean).join(' · ')}
                    />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Aloqa telefon" value={profile.driver_phone} />
                    <InfoRow icon={<Hash className="w-4 h-4" />} label="Xizmat tumani" value={profile.home_district} />
                  </>
                )}

                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" /> Profilni tahrirlash
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}