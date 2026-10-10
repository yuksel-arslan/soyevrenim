// Vercel Serverless Function — ağacı OKU (GET) ve KAYDET (POST)
// Konum: /api/agac  →  Vercel otomatik olarak bu yolu oluşturur.
//
// Ortam değişkeni gerekir: DATABASE_URL  (Neon bağlantı dizesi)
// Vercel panel → Project → Settings → Environment Variables → DATABASE_URL ekle.

import { jetonDogrula } from './giris.js';
import { db } from './_lib/db.js';

export default async function handler(req, res) {
  // CORS (aynı site zaten sorunsuz; yine de açık tutuyoruz)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = db();
  try {
    if (req.method === 'GET') {
      // ağacı oku
      const rows = await sql`select veri, guncelleme, guncelleyen from agac where id = 1`;
      const row = rows[0] || { veri: { nodes: [], edges: [], marriages: [], motherEdges: [] } };
      return res.status(200).json({
        ok: true,
        veri: row.veri,
        guncelleme: row.guncelleme || null,
        guncelleyen: row.guncelleyen || null,
      });
    }

    if (req.method === 'POST') {
      // ağacı kaydet (tüm ağaç JSON olarak gelir)
      const body = req.body || {};
      const veri = body.veri;
      const token = (body.token || '').toString();
      const kim = (body.guncelleyen || '').toString().slice(0, 80);
      if (!veri || !Array.isArray(veri.nodes)) {
        return res.status(400).json({ ok: false, hata: 'Geçersiz veri' });
      }
      // DOĞRUDAN kaydetme yalnızca admin'e açık. Aile üyeleri /api/oneri kullanır.
      const oturum = jetonDogrula(body.jeton);
      // Oturum geçersiz (süresi dolmuş / OTURUM_GIZLI değişmiş) → 401: istemci şifre sorar ve
      // yeniden dener. Geçerli ama yönetici değil → 403 (öneri yolu).
      if (!oturum) return res.status(401).json({ ok: false, hata: 'Oturumun süresi dolmuş — yeniden giriş yap' });
      const adminOk = oturum.rol === 'admin';
      if (!adminOk) {
        return res.status(403).json({ ok: false, hata: 'Doğrudan kayıt sadece yöneticiye açık. Değişikliğini "Onaya gönder" ile ilet.' });
      }
      // ana kaydı güncelle
      const [kayit] = await sql`
        update agac
        set veri = ${JSON.stringify(veri)}::jsonb,
            guncelleyen = ${kim},
            guncelleme = now()
        where id = 1
        returning guncelleme
      `;
      // günlüğe de yaz (geri alma imkânı için)
      await sql`
        insert into gunluk (veri, guncelleyen)
        values (${JSON.stringify(veri)}::jsonb, ${kim})
      `;
      // güncelleme zamanı: kaydeden cihaz kendi kaydını "başkasından gelen yeni sürüm" sanmasın
      return res.status(200).json({ ok: true, guncelleme: kayit ? kayit.guncelleme : null });
    }

    return res.status(405).json({ ok: false, hata: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ ok: false, hata: String(e.message || e) });
  }
}
