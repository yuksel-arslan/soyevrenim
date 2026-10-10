// KOTA — Groq ücretsiz günlük sınırları (sistem geneli) + kişi başı adil pay.
// Sayaçlar kullanim tablosundan okunur; ayrı sayaç tutulmaz. Gün = UTC günü.
import { db, sayi, gunBasi } from './db.js';
import { GUNLUK_SISTEM, GUNLUK_KISI, MESAJ_MAX_TOKEN, STT } from './ayar.js';

const SOHBET_ISLEMLERI = ['soru', 'ekleme', 'duzenle'];

export async function kotaDurumu(kisiId) {
  const sql = db();
  const bas = gunBasi();
  const [s] = await sql`
    select coalesce(sum(girdi_tok + cikti_tok),0) as token,
           coalesce(sum(istek),0) as istek,
           coalesce(sum(case when tur='stt' then saniye else 0 end),0) as ses_sn
    from kullanim where olusturma >= ${bas}`;
  let kisi = { mesaj: 0, sesSn: 0 };
  if (kisiId) {
    const [k] = await sql`
      select count(*) filter (where islem = any(${SOHBET_ISLEMLERI})) as mesaj,
             coalesce(sum(case when tur='stt' then saniye else 0 end),0) as ses_sn
      from kullanim where olusturma >= ${bas} and kisi_id = ${kisiId}`;
    kisi = { mesaj: sayi(k.mesaj), sesSn: sayi(k.ses_sn) };
  }
  const sistem = { token: sayi(s.token), istek: sayi(s.istek), sesSn: sayi(s.ses_sn) };
  return {
    sistem, kisi,
    limit: { sistem: GUNLUK_SISTEM, kisi: GUNLUK_KISI },
    yenilenme: yarinUtc(),
  };
}

function yarinUtc() {
  const d = new Date(gunBasi());
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

// Asistan mesajı başlatılabilir mi? (bir mesaj en kötü durumda MESAJ_MAX_TOKEN × tur harcayabilir;
// en az bir tam istemlik pay kalmalı)
export function llmIzin(d) {
  if (d.sistem.token + MESAJ_MAX_TOKEN > d.limit.sistem.token) return { ok: false, sebep: 'sistem' };
  if (d.sistem.istek + 1 > d.limit.sistem.istek) return { ok: false, sebep: 'sistem' };
  if (d.kisi.mesaj >= d.limit.kisi.mesaj) return { ok: false, sebep: 'kisi' };
  return { ok: true };
}

export function sttIzin(d, saniye) {
  if (d.sistem.sesSn + saniye > d.limit.sistem.sesSn) return { ok: false, sebep: 'sistem' };
  if (d.kisi.sesSn + saniye > d.limit.kisi.sesDk * 60) return { ok: false, sebep: 'kisi' };
  return { ok: true };
}

export async function kullanimKaydet({ kisiId, tur, model, girdi = 0, cikti = 0, istek = 1, saniye = 0, islem }) {
  await db()`
    insert into kullanim (kisi_id, tur, model, girdi_tok, cikti_tok, istek, saniye, islem)
    values (${kisiId}, ${tur}, ${model}, ${girdi}, ${cikti}, ${istek}, ${saniye}, ${islem})`;
}

export const KOTA_MESAJI = {
  sistem: 'Bugünkü ücretsiz asistan kotası doldu, yarın 03:00\'te yenilenir.',
  kisi: `Bugünkü asistan hakkın doldu (${GUNLUK_KISI.mesaj} mesaj), yarın 03:00'te yenilenir.`,
  saglayici: 'Şu an çok yoğunum; hazır bilgilerimle yanıtladım.',
};
export const STT_MODEL = STT.model;
