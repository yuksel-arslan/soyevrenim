// Vercel Serverless Function — AİLE ŞİFRESİ ile giriş (Twilio/SMS YOK)
// /api/giris  (POST, {sifre}) → şifreyi kontrol eder, imzalı oturum jetonu verir
//
// Ortam değişkenleri (Vercel → Settings → Environment Variables):
//   AILE_SIFRESI   → aile üyelerinin ortak şifresi (öneri + sohbet yetkisi)
//   ADMIN_SIFRESI  → senin yönetici şifren (onay + doğrudan düzenleme)
//   OTURUM_GIZLI   → jeton imzalamak için uzun rastgele metin (40+ karakter)
//
// Veritabanı GEREKMEZ. Jeton HMAC ile imzalanır, diğer API'ler jetonDogrula ile kontrol eder.

import crypto from 'crypto';
import { GIRIS } from './_lib/ayar.js';

const GUN = 24 * 3600 * 1000;
function imzala(nesne){
  const gizli = process.env.OTURUM_GIZLI || 'degistir-beni';
  const veri = JSON.stringify(nesne);
  const imza = crypto.createHmac('sha256', gizli).update(veri).digest('hex').slice(0,32);
  return Buffer.from(veri).toString('base64') + '.' + imza;
}
function coz(jeton){
  try{
    const gizli = process.env.OTURUM_GIZLI || 'degistir-beni';
    const [b64, imza] = String(jeton||'').split('.');
    const veri = Buffer.from(b64, 'base64').toString();
    const beklenen = crypto.createHmac('sha256', gizli).update(veri).digest('hex').slice(0,32);
    if(imza !== beklenen) return null;
    return JSON.parse(veri);
  }catch(e){ return null; }
}
const kisiGecerli = (k) => /^[\w-]{1,40}$/.test(String(k || ''));

// Oturum jetonu: {rol, t, kisi?}. kisi = ağaçtaki kişi id'si ("ben kimim") — kimlik
// cihazda değil OTURUMDA durur; sunucu kimliği buradan okur.
export function jetonUret(rol, kisi){
  return imzala(kisiGecerli(kisi) ? { rol, t: Date.now(), kisi } : { rol, t: Date.now() });
}

// Diğer API'ler (agac, oneri, sohbet, asistan…) bunu import edip jetonu doğrular.
// Kişisel giriş bağlantısı (tur:'davet') oturum yerine KULLANILAMAZ.
export function jetonDogrula(jeton){
  const o = coz(jeton);
  if(!o || o.tur) return null;
  if(Date.now() - o.t > GIRIS.oturumGun * GUN) return null;
  return o;   // { rol:'aile'|'admin', t, kisi? }
}

// Kişisel giriş bağlantısı: yönetici üretir, açan kişi doğrudan O KİŞİ olarak girer.
export function davetUret(kisi){ return imzala({ tur: 'davet', rol: 'aile', kisi, t: Date.now() }); }
export function davetDogrula(davet){
  const o = coz(davet);
  if(!o || o.tur !== 'davet' || !kisiGecerli(o.kisi)) return null;
  if(Date.now() - o.t > GIRIS.davetGun * GUN) return null;
  return o;
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ok:false, hata:'POST kullanın'}); return; }
  const body = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{});
  // Oturum doğrula + yenile: istemci açılışta saklı jetonu sorar. Geçerliyse aynı rolle
  // TAZE jeton döner (kullandıkça süresi uzar); geçersizse (süre doldu / OTURUM_GIZLI
  // değişti) 401 → istemci "girişli" görünmeyi bırakır ve yeniden giriş ister.
  if(body.adim === 'dogrula'){
    const o = jetonDogrula(body.jeton);
    if(!o){ res.status(401).json({ ok:false, hata:'Oturum geçersiz' }); return; }
    res.status(200).json({ ok:true, rol:o.rol, kisi:o.kisi || null, jeton: jetonUret(o.rol, o.kisi) }); return;
  }
  // "Ben kimim" seçildi: kişi id'sini oturuma işle (rol aynı kalır)
  if(body.adim === 'ben'){
    const o = jetonDogrula(body.jeton);
    if(!o){ res.status(401).json({ ok:false, hata:'Oturum geçersiz' }); return; }
    const kisi = kisiGecerli(body.kisi) ? String(body.kisi) : null;
    res.status(200).json({ ok:true, rol:o.rol, kisi, jeton: jetonUret(o.rol, kisi) }); return;
  }
  // Kişisel giriş bağlantısıyla gelen: şifresiz, doğrudan o kişi olarak (aile rolü)
  if(body.adim === 'davet'){
    const d = davetDogrula(body.davet);
    if(!d){ res.status(401).json({ ok:false, hata:'Giriş bağlantısı geçersiz ya da süresi dolmuş — yöneticiden yenisini iste' }); return; }
    res.status(200).json({ ok:true, rol:d.rol, kisi:d.kisi, jeton: jetonUret(d.rol, d.kisi) }); return;
  }
  // Yönetici: bir kişiye özel giriş bağlantısı üret
  if(body.adim === 'davet-uret'){
    const o = jetonDogrula(body.jeton);
    if(!o){ res.status(401).json({ ok:false, hata:'Oturum geçersiz' }); return; }
    if(o.rol !== 'admin'){ res.status(403).json({ ok:false, hata:'Bağlantıyı yalnızca yönetici üretebilir' }); return; }
    if(!kisiGecerli(body.kisi)){ res.status(400).json({ ok:false, hata:'Kişi seçilmedi' }); return; }
    res.status(200).json({ ok:true, davet: davetUret(String(body.kisi)), gun: GIRIS.davetGun }); return;
  }
  const girilen = String(body.sifre || '').trim();
  if(!girilen){ res.status(400).json({ok:false, hata:'Şifre gerekli'}); return; }

  const adminSif = process.env.ADMIN_SIFRESI || '';
  const aileSif  = process.env.AILE_SIFRESI  || '';

  const kisi = kisiGecerli(body.kisi) ? String(body.kisi) : null;   // cihazda seçili kişi varsa oturuma işle
  if(adminSif && girilen === adminSif){
    res.status(200).json({ ok:true, rol:'admin', kisi, jeton: jetonUret('admin', kisi) }); return;
  }
  if(aileSif && girilen === aileSif){
    res.status(200).json({ ok:true, rol:'aile', kisi, jeton: jetonUret('aile', kisi) }); return;
  }
  res.status(401).json({ ok:false, hata:'Şifre yanlış' });
}
