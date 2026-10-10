// Vercel Serverless Function — SOHBET (genel + kişi yorumları)
// /api/sohbet?adim=oku&kapsam=genel        (POST) → mesajları getir (herkes okur)
// /api/sohbet?adim=yeni&kapsam=genel       (POST) → {son} id'sinden sonraki mesaj sayısı + yazanlar (rozet)
// /api/sohbet?adim=yaz                       (POST) → mesaj yaz (aile şifresiyle giren)
// /api/sohbet?adim=sil                       (POST) → mesaj sil (admin ya da yazan kişi)
//
// Ortam değişkenleri: DATABASE_URL, OTURUM_GIZLI (jeton doğrulaması giris.js üzerinden)

import { jetonDogrula } from './giris.js';
import { db } from './_lib/db.js';   // ortak bağlantı (testte yerel PostgreSQL)
import { SOHBET } from './_lib/ayar.js';

function oturumRol(body){ const o=jetonDogrula(body.jeton); return o?o.rol:null; }
function adminMi(body){ return oturumRol(body)==='admin'; }
function temizKapsam(k){
  k = String(k||'genel');
  if(k==='genel') return 'genel';
  if(/^kisi:[\w]+$/.test(k)) return k;   // kisi:pXXXX
  return 'genel';
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({ok:false});

  const adim=(req.query.adim||'').toString();
  const body=req.body||{};

  try{
    const sql = db();
    // — mesajları oku (herkes, giriş gerekmez) —
    if(adim==='oku'){
      const kapsam = temizKapsam(body.kapsam);
      const rows = await sql`
        select id, yazan_id, yazan_ad, mesaj, zaman
        from sohbet where kapsam = ${kapsam}
        order by zaman asc limit 300
      `;
      return res.status(200).json({ok:true, mesajlar: rows});
    }

    // — yeni mesaj var mı? (rozet / bildirim; herkes, giriş gerekmez) —
    if(adim==='yeni'){
      const kapsam = temizKapsam(body.kapsam);
      const son = Math.max(0, parseInt(body.son, 10) || 0);
      const rows = await sql`
        select id, yazan_id, yazan_ad from sohbet
        where kapsam = ${kapsam} and id > ${son}
        order by id desc limit ${SOHBET.yeniMax}
      `;
      return res.status(200).json({ ok:true, sayi: rows.length,
        sonId: rows.length ? Number(rows[0].id) : son,
        yazanlar: rows.map((r) => ({ yazan_id: r.yazan_id, yazan_ad: r.yazan_ad })) });
    }

    // — mesaj yaz (aile şifresiyle giren) —
    if(adim==='yaz'){
      const rol = oturumRol(body);
      if(!rol) return res.status(401).json({ok:false, hata:'Yazmak için aile şifresiyle giriş yap'});
      const kapsam = temizKapsam(body.kapsam);
      const mesaj = String(body.mesaj||'').trim().slice(0, 2000);
      if(!mesaj) return res.status(400).json({ok:false, hata:'Boş mesaj'});
      const ad = String(body.yazan_ad||'').slice(0,80);
      // yazan_id: yazanın ağaçtaki kişi id'si (seçtiği kişi). Kişi seçilmemişse rol
      // ('aile' / 'admin'). Eskiden hep rol yazılıyordu; kimin yazdığı ve "benim
      // mesajım" ayırt edilemiyordu.
      const kid = String(body.kisi_id || '').trim();
      const yid = /^[\w-]{1,40}$/.test(kid) ? kid : rol;
      const rows = await sql`
        insert into sohbet (kapsam, yazan_id, yazan_ad, mesaj)
        values (${kapsam}, ${yid}, ${ad}, ${mesaj})
        returning id, yazan_id, yazan_ad, mesaj, zaman
      `;
      return res.status(200).json({ok:true, mesaj: rows[0]});
    }

    // — mesaj sil (sadece admin) —
    if(adim==='sil'){
      const id = parseInt(body.id,10);
      if(!adminMi(body)) return res.status(403).json({ok:false, hata:'Silme sadece yöneticiye açık'});
      const rows = await sql`select yazan_id from sohbet where id=${id}`;
      if(!rows[0]) return res.status(404).json({ok:false});
      await sql`delete from sohbet where id=${id}`;
      return res.status(200).json({ok:true});
    }

    return res.status(400).json({ok:false, hata:'Bilinmeyen adım'});
  }catch(e){
    return res.status(500).json({ok:false, hata:String(e.message||e)});
  }
}
