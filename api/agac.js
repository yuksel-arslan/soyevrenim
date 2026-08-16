// Vercel Serverless Function — ağacı OKU (GET) ve KAYDET (POST)
// Konum: /api/agac  →  Vercel otomatik olarak bu yolu oluşturur.
//
// Ortam değişkeni gerekir: DATABASE_URL  (Neon bağlantı dizesi)
// Vercel panel → Project → Settings → Environment Variables → DATABASE_URL ekle.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // CORS (aynı site zaten sorunsuz; yine de açık tutuyoruz)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
      // DOĞRUDAN kaydetme yalnızca admin'e açık. Normal kullanıcılar /api/oneri kullanır.
      const adminOk = body.admin === process.env.ADMIN_CODE && !!process.env.ADMIN_CODE;
      if (!adminOk) {
        return res.status(403).json({ ok: false, hata: 'Doğrudan kayıt sadece yöneticiye açık. Değişikliğini "Onaya gönder" ile ilet.' });
      }
      // ana kaydı güncelle
      await sql`
        update agac
        set veri = ${JSON.stringify(veri)}::jsonb,
            guncelleyen = ${kim},
            guncelleme = now()
        where id = 1
      `;
      // günlüğe de yaz (geri alma imkânı için)
      await sql`
        insert into gunluk (veri, guncelleyen)
        values (${JSON.stringify(veri)}::jsonb, ${kim})
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, hata: 'Yöntem desteklenmiyor' });
  } catch (e) {
    return res.status(500).json({ ok: false, hata: String(e.message || e) });
  }
}
