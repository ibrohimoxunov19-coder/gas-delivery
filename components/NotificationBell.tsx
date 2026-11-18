'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, BellRing, Check } from 'lucide-react';

interface Notif {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

type Role = 'customer' | 'driver' | 'admin';

interface Props {
  role: Role;
  customerId?: string;
  district?: string;
}

// Har rol uchun localStorage kaliti
const keyFor = (role: Role) => `gx_notifs_${role}`;

function load(role: Role): Notif[] {
  try {
    const raw = localStorage.getItem(keyFor(role));
    return raw ? (JSON.parse(raw) as Notif[]) : [];
  } catch {
    return [];
  }
}
function save(role: Role, list: Notif[]) {
  try {
    localStorage.setItem(keyFor(role), JSON.stringify(list.slice(0, 30))); // eng yangi 30 ta
  } catch { /* ignore */ }
}

const custStatusText: Record<string, string> = {
  accepted: 'Buyurtmangiz qabul qilindi 📥',
  confirmed: 'Buyurtmangiz tasdiqlandi ✅',
  on_the_way: "Buyurtmangiz yo'lga chiqdi 🚚",
  delivered: 'Buyurtmangiz yetkazildi 💰',
  completed: 'Buyurtmangiz yakunlandi — chek tayyor 🧾',
  cancelled: 'Buyurtmangiz bekor qilindi ❌',
};

export default function NotificationBell({ role, customerId, district }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [pushOn, setPushOn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(load(role));
    setPushOn(typeof Notification !== 'undefined' && Notification.permission === 'granted');

    // Tashqariga klikda yopish
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [role]);

  // Realtime channel — hodisalarni localStorage'ga yozadi
  useEffect(() => {
    const chName = `notif_${role}_${customerId || district || 'adm'}`;
    let ch = supabase.channel(chName);

    if (role === 'customer' && customerId) {
      ch = ch.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${customerId}` },
        (payload) => {
          const n = payload.new as any;
          const text = custStatusText[n.status] || `Holat: ${n.status}`;
          push(`Buyurtma #${n.id} — ${text}`);
        }
      );
    } else if (role === 'driver') {
      ch = ch.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const n = payload.new as any;
          if (n.status === 'new' && (!district || n.district === district)) {
            push(`Yangi buyurtma #${n.id} · ${n.mfy || n.district || ''}`);
          }
        }
      );
    } else if (role === 'admin') {
      ch = ch.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const n = payload.new as any;
          if (n.status === 'new') push(`Yangi buyurtma #${n.id} · ${n.district || n.region || ''}`);
        }
      );
    }

    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [role, customerId, district]);

  const push = (text: string) => {
    const item: Notif = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      time: new Date().toLocaleTimeString('uz-UZ'),
      read: false,
    };
    setItems((prev) => {
      const next = [item, ...prev];
      save(role, next);
      return next;
    });
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('GazExpress', { body: text }); } catch { /* ignore */ }
    }
  };

  const unread = items.filter((i) => !i.read).length;

  const markAll = () => {
    const next = items.map((i) => ({ ...i, read: true }));
    setItems(next);
    save(role, next);
  };

  const enablePush = async () => {
    if (typeof Notification === 'undefined') return;
    const p = await Notification.requestPermission();
    setPushOn(p === 'granted');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open && unread) markAll(); }}
        className="relative flex items-center gap-1.5 text-blue-600 hover:bg-blue-50 px-2.5 py-2 rounded-lg transition text-sm font-semibold"
        title="Bildirishnomalar"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Bildirishnoma</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9998] overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 flex items-center justify-between">
            <p className="font-bold text-sm">Bildirishnomalar</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-white/90 hover:text-white flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Hammasini o'qilgan
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Hali bildirishnoma yo'q</p>
            ) : (
              items.map((i) => (
                <div key={i.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 ${i.read ? '' : 'bg-blue-50/50'}`}>
                  <p className="text-sm text-gray-800">{i.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{i.time}</p>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            {!pushOn ? (
              <button
                onClick={enablePush}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4" /> Push bildirishnomani yoqish
              </button>
            ) : (
              <p className="text-xs text-green-600 text-center font-semibold flex items-center justify-center gap-1">
                <BellRing className="w-3.5 h-3.5" /> Push yoqilgan
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}