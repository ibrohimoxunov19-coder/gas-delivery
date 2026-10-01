'use client';

// Brauzer ruxsatini so'rash
export async function requestNotifPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

// Ruxsat berilganmi?
export function hasNotifPermission(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

// Push bildirishnoma yuborish
export function sendPush(title: string, body: string) {
  if (!hasNotifPermission()) return;
  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'gazexpress',
    });
  } catch {
    // Android'da ba'zi brauzerlar new Notification'ni service worker'siz bloklaydi — demo uchun yutib yuboramiz
  }
}