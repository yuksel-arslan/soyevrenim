// Vercel Serverless Function — ÖNERİLER (onay kuyruğu)
// /api/oneri?adim=gonder    (POST) → aile şifresiyle giren değişiklik önerir
// /api/oneri?adim=liste     (POST) → admin bekleyen önerileri görür
// /api/oneri?adim=karar     (POST) → admin onaylar/reddeder
//
// Ortam değişkenleri: DATABASE_URL, (giriş jetonu /api/giris'ten)

import { neon } from '@neondatabase/serverless';
import { jetonDogrula } from './giris.js';
const sql = neon(process.env.DATABASE_URL);

// giriş jetonundan rol çıkar (aile / admin / null)
function oturumRol(body){
  const o = jetonDogrula(body.jeton);
  return o ? o.rol : null;
}
function adminMi(body){
  return oturumRol(body) === 'admin';
}

// iki ağaç arasındaki farkı çıkar (özet + detay)
function farkCikar(eski, yeni){
  const em = new Map((eski.nodes||[]).map(n=>[n.id,n]));
  const ym = new Map((yeni.nodes||[]).map(n=>[n.id,n]));
  const eklenen=[], silinen=[], degisen=[];
  for(const [id,n] of ym){ if(!em.has(id)) eklenen.push(n.name||id); }
  for(const [id,n] of em){ if(!ym.has(id)) silinen.push(n.name||id); }
  for(const [id,n] of ym){ const o=em.get(id); if(o && JSON.stringify(o)!==JSON.stringify(n)) degisen.push(n.name||id); }
  return { eklenen, silinen, degisen };
}
function ozetle(fark){
  const p=[];
  if(fark.eklenen.length) p.push(`${fark.eklenen.length} yeni kişi (${fark.eklenen.slice(0,3).join(", ")}${fark.eklenen.length>3?"…":""})`);
  if(fark.degisen.length) p.push(`${fark.degisen.length} düzenleme (${fark.degisen.slice(0,3).join(", ")}${fark.degisen.length>3?"…":""})`);
  if(fark.silinen.length) p.push(`${fark.silinen.length} silme (${fark.silinen.slice(0,3).join(", ")}${fark.silinen.length>3?"…":""})`);
  return p.join(" · ") || "değişiklik";
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
    // — aile üyesi değişiklik önerir —
    if(adim==='gonder'){
      const rol = oturumRol(body);
      if(!rol) return res.status(401).json({ok:false, hata:'Giriş gerekli. Aile şifresiyle girin.'});
      const yeni = body.veri;
      if(!yeni || !Array.isArray(yeni.nodes)) return res.status(400).json({ok:false, hata:'Geçersiz veri'});
      // admin doğrudan kaydeder (öneri değil) — agac.js üzerinden; burada sadece aile önerisi
      const cur = (await sql`select veri from agac where id=1`)[0]?.veri || {nodes:[]};
      const fark = farkCikar(cur, yeni);
      const ozet = ozetle(fark);
      const ad = (body.gonderen_ad||'').toString().slice(0,80);
      await sql`
        insert into oneri (durum, gonderen_id, gonderen_ad, telefon, ozet, veri, fark)
        values ('bekliyor', ${rol}, ${ad}, ${null},
                ${ozet}, ${JSON.stringify(yeni)}::jsonb, ${JSON.stringify(fark)}::jsonb)
      `;
      return res.status(200).json({ok:true, ozet});
    }

    // — admin: bekleyen önerileri listele —
    if(adim==='liste'){
      if(!adminMi(body)) return res.status(401).json({ok:false, hata:'Yönetici gerekli'});
      const durum = (body.durum||'bekliyor').toString();
      const rows = await sql`
        select id, durum, gonderen_ad, telefon, ozet, fark, olusma
        from oneri where durum = ${durum} order by olusma desc limit 100
      `;
      return res.status(200).json({ok:true, oneriler: rows});
    }

    // — admin: tek bir önerinin tam verisini getir (önizleme için) —
    if(adim==='detay'){
      if(!adminMi(body)) return res.status(401).json({ok:false, hata:'Yönetici gerekli'});
      const id = parseInt(body.id,10);
      const rows = await sql`select id, veri, fark, gonderen_ad, ozet from oneri where id=${id}`;
      if(!rows[0]) return res.status(404).json({ok:false, hata:'Öneri yok'});
      return res.status(200).json({ok:true, oneri: rows[0]});
    }

    // — admin: onayla / reddet —
    if(adim==='karar'){
      if(!adminMi(body)) return res.status(401).json({ok:false, hata:'Yönetici gerekli'});
      const id = parseInt(body.id,10);
      const karar = (body.karar||'').toString();   // 'onayla' | 'reddet'
      const rows = await sql`select veri, durum from oneri where id=${id}`;
      if(!rows[0]) return res.status(404).json({ok:false, hata:'Öneri yok'});
      if(rows[0].durum!=='bekliyor') return res.status(400).json({ok:false, hata:'Zaten karara bağlanmış'});

      if(karar==='onayla'){
        // önerilen veriyi ana ağaca yaz
        await sql`update agac set veri = ${JSON.stringify(rows[0].veri)}::jsonb, guncelleme=now() where id=1`;
        await sql`update oneri set durum='onaylandi', karar_zaman=now() where id=${id}`;
        return res.status(200).json({ok:true, durum:'onaylandi'});
      } else {
        await sql`update oneri set durum='reddedildi', karar_zaman=now() where id=${id}`;
        return res.status(200).json({ok:true, durum:'reddedildi'});
      }
    }

    return res.status(400).json({ok:false, hata:'Bilinmeyen adım'});
  }catch(e){
    return res.status(500).json({ok:false, hata:String(e.message||e)});
  }
}
