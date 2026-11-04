// GazExpress — SMS servis (demo + Eskiz.uz)
// Hozir: SMS_PROVIDER='demo' -> konsolga yozadi, hech qanday kalit shart emas.
// Keyin: .env da SMS_PROVIDER='eskiz', ESKIZ_LOGIN, ESKIZ_PASSWORD qo'ying -> real ketadi.

const PROVIDER = process.env.SMS_PROVIDER || 'demo';
const ESKIZ_LOGIN = process.env.ESKIZ_LOGIN || '';
const ESKIZ_PASSWORD = process.env.ESKIZ_PASSWORD || '';

async function sendRaw(phone: string, message: string): Promise<boolean> {
  const clean = (phone || '').replace(/\D/g, '');
  if (!clean) return false;

  if (PROVIDER === 'demo') {
    console.log(`[SMS-DEMO] -> ${clean}: ${message}`);
    return true;
  }

  // Eskiz.uz API (https://doc.eskiz.uz)
  try {
    const url = `https://api.eskiz.uz/message/send?login=${encodeURIComponent(ESKIZ_LOGIN)}&password=${encodeURIComponent(ESKIZ_PASSWORD)}&mobile_phone=${clean}&message=${encodeURIComponent(message)}`;
    const r = await fetch(url, { method: 'GET' });
    const ok = r.ok;
    if (!ok) console.error('[SMS] Eskiz xato:', r.status, await r.text());
    return ok;
  } catch (e) {
    console.error('[SMS] xato:', e);
    return false;
  }
}

// Haydovchi "yo'lga chiqdi" deganda mijozga
export async function notifyOutForDelivery(customerPhone: string | null | undefined, orderId: number) {
  if (!customerPhone) return;
  const msg = `GazExpress: Buyurtma #${orderId} yo'lga chiqdi. Tez orada yetib boramiz.`;
  await sendRaw(customerPhone, msg);
}

// Yetkazishdan 1 kun oldin (scheduler orqali chaqiriladi)
export async function notifyDayBefore(customerPhone: string | null | undefined, orderId: number) {
  if (!customerPhone) return;
  const msg = `GazExpress: Buyurtma #${orderId} ertaga yetkaziladi. Uyda bo'lishingizni so'raymiz.`;
  await sendRaw(customerPhone, msg);
}