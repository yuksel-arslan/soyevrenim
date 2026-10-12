// Vercel Serverless Function — AİLE MEYDANI (sosyalleşme)
// POST /api/meydan?adim=…  — hepsi aile şifresiyle giriş (jeton, kişi seçili) ister.
//
//   kutla           {jeton, kime, mesaj, gonderen_ad, kime_ad} → Aile Sohbeti'ne "🎂 …" mesajı + kutlanana push
//   soru-sor        {jeton, kime, metin, soran_ad}            → büyüğe soru (alıcıya push)
//   soru-liste      {jeton}                                    → bana sorulanlar + benim sorduklarım + son yanıtlananlar
//   soru-yanitla    {jeton, id, yanit, yanitlayan_ad}          → yalnız sorulan kişi; sorana push
//   etkinlik-ekle   {jeton, baslik, tarih, saat, yer, aciklama, olusturan_ad} → aileye push
//   etkinlik-liste  {jeton}                                    → yaklaşan + son MEYDAN.etkinlikGecmisGun gün, katılımcılarla
//   etkinlik-katil  {jeton, id, durum:'evet'|'belki'|'hayir', ad}
//   etkinlik-sil    {jeton, id}                                → oluşturan ya da yönetici
// Haftanın sorusu yanıtları sohbet tablosunda (kapsam hafta:YYYY-WW, api/sohbet.js); sorular ayar.js → MEYDAN.
// Fotoğraf etiketleri ağaç verisinde (galeri öğesi {url, etiket:[id]}). Ayrıntı: docs/meydan.md
import { jetonDogrula } from './giris.js';
import { db, cors, govde } from './_lib/db.js';
import { MEYDAN } from './_lib/ayar.js';
import { aileyeBildir, kisiyeBildir } from './_lib/push.js';
import { ilgiEki } from './_lib/agac.js';

const kisiGecerli = (k) => /^[\w-]{1,40}$/.test(String(k || ''));
const metin = (s) => String(s || '').trim().slice(0, MEYDAN.metinMax);
const ad = (s) => String(s || '').trim().slice(0, 80);
const tarihGecerli = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t || '')) && !Number.isNaN(Date.parse(t));
const bildir = async (f) => { try { return await f(); } catch (e) { return { hata: String(e.message || e) }; } };

export default async function handler(req, res) {
  cors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const adim = String(req.query.adim || '');
  const body = govde(req);
  const o = jetonDogrula(body.jeton);
  if (!o) return res.status(401).json({ ok: false, hata: 'Aile şifresiyle giriş yap' });
  const ben = o.kisi;
  if (!kisiGecerli(ben)) return res.status(400).json({ ok: false, hata: 'Önce kim olduğunu seç (“Bu benim”)' });
  const sql = db();
  try {
    // — KUTLAMA: doğum günü / tebrik → Aile Sohbeti + kutlanana bildirim —
    if (adim === 'kutla') {
      const kime = String(body.kime || ''), m = metin(body.mesaj);
      if (!kisiGecerli(kime) || kime === ben) return res.status(400).json({ ok: false, hata: 'Geçersiz kişi' });
      const g = ad(body.gonderen_ad) || 'Aileden biri', k = ad(body.kime_ad) || 'bir akrabamız';
      const yazi = `🎂 ${ilgiEki(k)} doğum günü kutlu olsun!${m ? ' — ' + m : ''}`;   // Aysel'in, Mustafa'nın
      const [r] = await sql`insert into sohbet (kapsam, yazan_id, yazan_ad, mesaj) values ('genel', ${ben}, ${g}, ${yazi}) returning id`;
      const bildirim = await bildir(() => kisiyeBildir(kime, { baslik: `🎂 ${g} doğum gününü kutladı`, metin: m || 'İyi ki doğdun!', url: '/?sohbet=1', etiket: 'kutla' }));
      return res.status(200).json({ ok: true, mesaj_id: Number(r.id), bildirim });
    }

    // — BÜYÜĞE SOR —
    if (adim === 'soru-sor') {
      const kime = String(body.kime || ''), m = metin(body.metin);
      if (!kisiGecerli(kime) || kime === ben) return res.status(400).json({ ok: false, hata: 'Geçersiz kişi' });
      if (!m) return res.status(400).json({ ok: false, hata: 'Sorunu yaz' });
      const [r] = await sql`insert into soru (soran, soran_ad, kime, metin) values (${ben}, ${ad(body.soran_ad)}, ${kime}, ${m}) returning id`;
      const bildirim = await bildir(() => kisiyeBildir(kime, { baslik: `❓ ${ad(body.soran_ad) || 'Aileden biri'} sana bir soru sordu`, metin: m, url: '/?meydan=sor', etiket: 'soru' }));
      return res.status(200).json({ ok: true, id: Number(r.id), bildirim });
    }
    if (adim === 'soru-liste') {
      const bana = await sql`select id, soran, soran_ad, metin, yanit, olusma, yanit_zaman from soru where kime = ${ben} order by (yanit is null) desc, olusma desc limit ${MEYDAN.listeMax}`;
      const benden = await sql`select id, kime, metin, yanit, olusma, yanit_zaman from soru where soran = ${ben} order by olusma desc limit ${MEYDAN.listeMax}`;
      const son = await sql`select id, soran, soran_ad, kime, metin, yanit, yanit_zaman from soru where yanit is not null order by yanit_zaman desc limit ${MEYDAN.listeMax}`;
      return res.status(200).json({ ok: true, bana, benden, son });
    }
    if (adim === 'soru-yanitla') {
      const id = parseInt(body.id, 10), y = metin(body.yanit);
      const [s] = await sql`select * from soru where id = ${id}`;
      if (!s) return res.status(404).json({ ok: false, hata: 'Soru yok' });
      if (s.kime !== ben) return res.status(403).json({ ok: false, hata: 'Bu soru sana sorulmadı' });
      if (!y) return res.status(400).json({ ok: false, hata: 'Yanıtını yaz' });
      await sql`update soru set yanit = ${y}, yanit_zaman = now() where id = ${id}`;
      const bildirim = await bildir(() => kisiyeBildir(s.soran, { baslik: `💬 ${ad(body.yanitlayan_ad) || 'Sorduğun kişi'} sorunu yanıtladı`, metin: y, url: '/?meydan=sor', etiket: 'soru' }));
      return res.status(200).json({ ok: true, bildirim });
    }

    // — ETKİNLİKLER (buluşma, köy ziyareti, düğün, bayramlaşma…) —
    if (adim === 'etkinlik-ekle') {
      const baslik = ad(body.baslik), tarih = String(body.tarih || '');
      if (!baslik) return res.status(400).json({ ok: false, hata: 'Etkinliğe bir ad ver' });
      if (!tarihGecerli(tarih)) return res.status(400).json({ ok: false, hata: 'Tarihi seç' });
      const [r] = await sql`insert into etkinlik (baslik, tarih, saat, yer, aciklama, olusturan, olusturan_ad)
        values (${baslik}, ${tarih}, ${ad(body.saat) || null}, ${ad(body.yer) || null}, ${metin(body.aciklama) || null}, ${ben}, ${ad(body.olusturan_ad)}) returning id`;
      await sql`insert into etkinlik_katilim (etkinlik_id, kisi, kisi_ad, durum) values (${r.id}, ${ben}, ${ad(body.olusturan_ad)}, 'evet') on conflict do nothing`;
      const gun = new Date(tarih + 'T12:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
      const bildirim = await bildir(() => aileyeBildir({ haricKisi: ben, baslik: `📅 ${baslik}`, metin: `${gun}${body.yer ? ' · ' + ad(body.yer) : ''} — ${ad(body.olusturan_ad) || 'Aileden biri'} duyurdu`, url: '/?meydan=etkinlik', etiket: 'etkinlik' }));
      return res.status(200).json({ ok: true, id: Number(r.id), bildirim });
    }
    if (adim === 'etkinlik-liste') {
      const l = await sql`select e.*, coalesce(json_agg(json_build_object('kisi', k.kisi, 'ad', k.kisi_ad, 'durum', k.durum)) filter (where k.kisi is not null), '[]') as katilim
        from etkinlik e left join etkinlik_katilim k on k.etkinlik_id = e.id
        where e.tarih >= current_date - ${MEYDAN.etkinlikGecmisGun}::int
        group by e.id order by e.tarih asc limit ${MEYDAN.listeMax}`;
      return res.status(200).json({ ok: true, etkinlikler: l });
    }
    if (adim === 'etkinlik-katil') {
      const id = parseInt(body.id, 10), durum = ['evet', 'belki', 'hayir'].includes(body.durum) ? body.durum : null;
      if (!durum) return res.status(400).json({ ok: false, hata: 'Geçersiz yanıt' });
      const [e] = await sql`select id from etkinlik where id = ${id}`;
      if (!e) return res.status(404).json({ ok: false, hata: 'Etkinlik yok' });
      await sql`insert into etkinlik_katilim (etkinlik_id, kisi, kisi_ad, durum) values (${id}, ${ben}, ${ad(body.ad)}, ${durum})
        on conflict (etkinlik_id, kisi) do update set durum = excluded.durum, kisi_ad = excluded.kisi_ad`;
      return res.status(200).json({ ok: true });
    }
    if (adim === 'etkinlik-sil') {
      const id = parseInt(body.id, 10);
      const [e] = await sql`select olusturan from etkinlik where id = ${id}`;
      if (!e) return res.status(404).json({ ok: false, hata: 'Etkinlik yok' });
      if (e.olusturan !== ben && o.rol !== 'admin') return res.status(403).json({ ok: false, hata: 'Yalnız duyuran ya da yönetici silebilir' });
      await sql`delete from etkinlik_katilim where etkinlik_id = ${id}`;
      await sql`delete from etkinlik where id = ${id}`;
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ ok: false, hata: 'Bilinmeyen adım' });
  } catch (e) {
    return res.status(500).json({ ok: false, hata: String(e.message || e) });
  }
}
