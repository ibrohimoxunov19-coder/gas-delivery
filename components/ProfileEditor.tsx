'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { toast } from './Toast';
import { User, Save, Car, Phone, MapPin } from 'lucide-react';

interface Props {
  profile: Profile;
  onSaved?: () => void;
}

export default function ProfileEditor({ profile, onSaved }: Props) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [address, setAddress] = useState(profile.address || '');
  const [carPlate, setCarPlate] = useState(profile.car_plate || '');
  const [carModel, setCarModel] = useState(profile.car_model || '');
  const [driverPhone, setDriverPhone] = useState(profile.driver_phone || '');
  const [saving, setSaving] = useState(false);

  const isDriver = profile.role === 'driver';

  const handleSave = async () => {
    if (!fullName.trim()) { toast('Ismingizni kiriting', 'error'); return; }
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };
      if (isDriver) {
        updates.car_plate = carPlate.trim();
        updates.car_model = carModel.trim();
        updates.driver_phone = driverPhone.trim();
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw error;
      toast('Profil saqlandi ✓', 'success');
      if (onSaved) onSaved();
    } catch (err) {
      toast('Xatolik: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" /> Profil sozlamalari
      </h3>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">To'liq ism</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
          <Phone className="w-4 h-4" /> Telefon
        </label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="+998 90 ..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
          <MapPin className="w-4 h-4" /> Manzil (ixtiyoriy)
        </label>
        <input value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="Viloyat, tuman, MFY..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {isDriver && (
        <>
          <hr className="border-gray-200" />
          <p className="text-sm font-semibold text-gray-600 flex items-center gap-1">
            <Car className="w-4 h-4" /> Mashina ma'lumotlari
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Davlat raqami</label>
              <input value={carPlate} onChange={(e) => setCarPlate(e.target.value)}
                placeholder="01 A 123 BC" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mashina modeli</label>
              <input value={carModel} onChange={(e) => setCarModel(e.target.value)}
                placeholder="Cobalt" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Haydovchi ish telefoni</label>
            <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="+998 90 ..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
        <Save className="w-5 h-5" /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </div>
  );
}