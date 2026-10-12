// Vercel Serverless Function — ağacı OKU (GET) ve KAYDET (POST)
// Konum: /api/agac  →  Vercel otomatik olarak bu yolu oluşturur.
//
// Ortam değişkeni gerekir: DATABASE_URL  (Neon bağlantı dizesi)
// Vercel panel → Project → Settings → Environment Variables → DATABASE_URL ekle.

import { jetonDogrula, jetonUret } from './giris.js';
import { db } from './_lib/db.js';
import { KAYIT } from './_lib/ayar.js';
import { kayitEkle, medyaEkle } from './_lib/kayit.js';

// Ağaca KÜÇÜK ve SINIRLI bir değişiklik işler (tam ağaç yazımı yalnız yöneticide).
// Güncel sürüm okunur, `degistir(veri)` uygulanır, koşullu yazılır; arada başka kayıt
// olduysa yeniden denenir (yöneticinin tam kaydıyla aynı çakışma kuralı).
async function agacYamala(sql, kim, degistir) {
  for (let i = 0; i < KAYIT.deneme; i++) {
    const [row] = await sql`select veri, guncelleme from agac where id = 1`;
    if (!row) throw Object.assign(new Error('Ağaç henüz yok'), { kod: 404, hata: 'Ağaç henüz yok' });
    const sonuc = degistir(row.veri);
    const [kayit] = await sql`
      update agac set veri = ${JSON.stringify(sonuc.veri)}::jsonb, guncelleyen = ${kim}, guncelleme = now()
      where id = 1 and date_trunc('milliseconds', guncelleme) = date_trunc('milliseconds', ${row.guncelleme}::timestamptz)
      returning guncelleme`;
    if (kayit) {
      await sql`insert into gunluk (veri, guncelleyen) values (${JSON.stringify(sonuc.veri)}::jsonb, ${kim})`;
      return { ...sonuc, guncelleme: kayit.guncelleme };
    }
  }
  throw Object.assign(new Error('Ağaç şu an çok yoğun'), { kod: 409, hata: 'Ağaç şu an başka biri tarafından değiştiriliyor — tekrar dene' });
}
const yamaHatasi = (res, e) => res.status(e.kod || 500).json({ ok: false, hata: e.hata || String(e.message || e), ...(e.var ? { var: e.var } : {}) });

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

    const adim = String((req.query && req.query.adim) || '');
    // KAYIT: ağaçta olmayan aile üyesi kendini mevcut bir kişiye bağlayarak ekler.
    // Aile/yönetici şifresi (ya da geçerli oturum) şart; bağsız kayıt kayitEkle'de reddedilir.
    if (req.method === 'POST' && adim === 'kayit') {
      const body = req.body || {};
      const oturum = jetonDogrula(body.jeton);
      const sifre = String(body.sifre || '').trim();
      const rol = oturum ? oturum.rol
        : (sifre && sifre === (process.env.ADMIN_SIFRESI || '\0')) ? 'admin'
        : (sifre && sifre === (process.env.AILE_SIFRESI || '\0')) ? 'aile' : null;
      if (!rol) return res.status(401).json({ ok: false, hata: sifre ? 'Aile şifresi yanlış' : 'Kayıt için aile şifresi gerekli' });
      try {
        const ad = String(body.ad || '').slice(0, 80);
        const r = await agacYamala(sql, `${ad} (kayıt)`, (v) => kayitEkle(v, body));
        return res.status(200).json({ ok: true, kisi: r.id, ad: r.kisi.name, rol, jeton: jetonUret(rol, r.id), guncelleme: r.guncelleme });
      } catch (e) { return yamaHatasi(res, e); }
    }
    // FOTOĞRAF / GALERİ: aile üyesinin yüklediği medya ONAYSIZ işlenir (yalnız medya alanı;
    // ağacın geri kalanına dokunulmaz). Bağlantı kendi deposumuzdan olmalı (medyaEkle denetler).
    if (req.method === 'POST' && adim === 'medya') {
      const body = req.body || {};
      const oturum = jetonDogrula(body.jeton);
      if (!oturum) return res.status(401).json({ ok: false, hata: 'Oturumun süresi dolmuş — yeniden giriş yap' });
      try {
        const kim = String(body.guncelleyen || oturum.rol).slice(0, 80);
        const r = await agacYamala(sql, kim, (v) => medyaEkle(v, String(body.kisi_id || ''), body.alan, body.url, !!body.video));
        return res.status(200).json({ ok: true, profil: r.profil, guncelleme: r.guncelleme });
      } catch (e) { return yamaHatasi(res, e); }
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
      // ÇAKIŞMA DENETİMİ: ağaç bütün olarak kaydedilir. İstemci hangi sürümün üstüne yazdığını
      // (`onceki` = elindeki guncelleme) söyler; arada başka cihaz kaydettiyse ÜSTÜNE YAZILMAZ,
      // 409 + güncel veri döner — istemci kendi değişikliklerini güncel sürüme işleyip yeniden
      // kaydeder. (Eskiden son kaydeden kazanıyordu: eski kopyası açık duran cihaz, başka
      // cihazda yüklenen fotoğrafı geri alıyordu.) `onceki` gönderilmezse koşulsuz (eski istemci).
      const kosullu = typeof body.onceki === 'string' && body.onceki;
      const [kayit] = kosullu
        ? await sql`
            update agac
            set veri = ${JSON.stringify(veri)}::jsonb, guncelleyen = ${kim}, guncelleme = now()
            where id = 1
              and date_trunc('milliseconds', guncelleme) = date_trunc('milliseconds', ${body.onceki}::timestamptz)
            returning guncelleme`
        : await sql`
            update agac
            set veri = ${JSON.stringify(veri)}::jsonb, guncelleyen = ${kim}, guncelleme = now()
            where id = 1
            returning guncelleme`;
      if (!kayit) {
        const [simdi] = await sql`select veri, guncelleme, guncelleyen from agac where id = 1`;
        return res.status(409).json({ ok: false, cakisma: true, hata: 'Ağaç başka bir cihazda değişti',
          veri: simdi ? simdi.veri : null, guncelleme: simdi ? simdi.guncelleme : null, guncelleyen: simdi ? simdi.guncelleyen : null });
      }
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
