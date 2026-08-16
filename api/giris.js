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

function jetonUret(rol){
  const gizli = process.env.OTURUM_GIZLI || 'degistir-beni';
  const veri = JSON.stringify({ rol, t: Date.now() });
  const imza = crypto.createHmac('sha256', gizli).update(veri).digest('hex').slice(0,32);
  return Buffer.from(veri).toString('base64') + '.' + imza;
}

// Diğer API'ler (agac, oneri, sohbet) bunu import edip jetonu doğrular.
export function jetonDogrula(jeton){
  try{
    const gizli = process.env.OTURUM_GIZLI || 'degistir-beni';
    const [b64, imza] = String(jeton||'').split('.');
    const veri = Buffer.from(b64, 'base64').toString();
    const beklenen = crypto.createHmac('sha256', gizli).update(veri).digest('hex').slice(0,32);
    if(imza !== beklenen) return null;
    const obj = JSON.parse(veri);
    if(Date.now() - obj.t > 30*24*3600*1000) return null;  // 30 gün geçerli
    return obj;   // { rol:'aile'|'admin', t }
  }catch(e){ return null; }
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ok:false, hata:'POST kullanın'}); return; }
  const body = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{});
  const girilen = String(body.sifre || '').trim();
  if(!girilen){ res.status(400).json({ok:false, hata:'Şifre gerekli'}); return; }

  const adminSif = process.env.ADMIN_SIFRESI || '';
  const aileSif  = process.env.AILE_SIFRESI  || '';

  if(adminSif && girilen === adminSif){
    res.status(200).json({ ok:true, rol:'admin', jeton: jetonUret('admin') }); return;
  }
  if(aileSif && girilen === aileSif){
    res.status(200).json({ ok:true, rol:'aile', jeton: jetonUret('aile') }); return;
  }
  res.status(401).json({ ok:false, hata:'Şifre yanlış' });
}
