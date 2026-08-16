// Vercel Serverless Function — SOHBET (genel + kişi yorumları)
// /api/sohbet?adim=oku&kapsam=genel        (POST) → mesajları getir (herkes okur)
// /api/sohbet?adim=yaz                       (POST) → mesaj yaz (SMS ile giren)
// /api/sohbet?adim=sil                       (POST) → mesaj sil (admin ya da yazan kişi)
//
// Ortam değişkenleri: DATABASE_URL, ADMIN_CODE

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function oturumKisi(token){
  if(!token) return null;
  const r = await sql`select kisi_id, telefon from oturum where token = ${token}`;
  return r[0] || null;
}
function adminMi(body){ return !!process.env.ADMIN_CODE && body.admin === process.env.ADMIN_CODE; }
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

    // — mesaj yaz (SMS ile giren kişi) —
    if(adim==='yaz'){
      const kisi = await oturumKisi((body.token||'').toString());
      if(!kisi && !adminMi(body)) return res.status(401).json({ok:false, hata:'Yazmak için telefonla giriş yap'});
      const kapsam = temizKapsam(body.kapsam);
      const mesaj = String(body.mesaj||'').trim().slice(0, 2000);
      if(!mesaj) return res.status(400).json({ok:false, hata:'Boş mesaj'});
      const ad = String(body.yazan_ad||'').slice(0,80);
      const yid = kisi ? kisi.kisi_id : 'admin';
      const rows = await sql`
        insert into sohbet (kapsam, yazan_id, yazan_ad, mesaj)
        values (${kapsam}, ${yid}, ${ad}, ${mesaj})
        returning id, yazan_id, yazan_ad, mesaj, zaman
      `;
      return res.status(200).json({ok:true, mesaj: rows[0]});
    }

    // — mesaj sil (admin ya da mesajı yazan kişi) —
    if(adim==='sil'){
      const id = parseInt(body.id,10);
      const kisi = await oturumKisi((body.token||'').toString());
      const rows = await sql`select yazan_id from sohbet where id=${id}`;
      if(!rows[0]) return res.status(404).json({ok:false});
      const sahip = kisi && kisi.kisi_id===rows[0].yazan_id;
      if(!(adminMi(body) || sahip)) return res.status(403).json({ok:false, hata:'Yetki yok'});
      await sql`delete from sohbet where id=${id}`;
      return res.status(200).json({ok:true});
    }

    return res.status(400).json({ok:false, hata:'Bilinmeyen adım'});
  }catch(e){
    return res.status(500).json({ok:false, hata:String(e.message||e)});
  }
}
