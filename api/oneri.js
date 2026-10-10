// Vercel Serverless Function — ÖNERİLER (onay kuyruğu)
// /api/oneri?adim=gonder    (POST) → aile şifresiyle giren değişiklik önerir
// /api/oneri?adim=liste     (POST) → admin bekleyen önerileri görür
// /api/oneri?adim=karar     (POST) → admin onaylar/reddeder
//
// Ortam değişkenleri: DATABASE_URL, (giriş jetonu /api/giris'ten)

import { jetonDogrula } from './giris.js';
import { db } from './_lib/db.js';
import { farkCikar, ozetle, yamaUygula, yamaHatasiMi } from './_lib/oneri.js';

// giriş jetonundan rol çıkar (aile / admin / null)
function oturumRol(body){
  const o = jetonDogrula(body.jeton);
  return o ? o.rol : null;
}
function adminMi(body){
  return oturumRol(body) === 'admin';
}

// farkCikar / ozetle → api/_lib/oneri.js (asistan ve hikâye akışlarıyla ortak)

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({ok:false});

  const adim=(req.query.adim||'').toString();
  const body=req.body||{};

  const sql = db();
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
        insert into oneri (durum, gonderen_id, gonderen_ad, telefon, ozet, veri, fark, kaynak, kisi_id)
        values ('bekliyor', ${rol}, ${ad}, ${null},
                ${ozet}, ${JSON.stringify(yeni)}::jsonb, ${JSON.stringify(fark)}::jsonb,
                'elle', ${/^[\w-]{1,40}$/.test(String(body.kisi_id||'')) ? String(body.kisi_id) : null})
      `;
      return res.status(200).json({ok:true, ozet});
    }

    // — admin: bekleyen önerileri listele —
    if(adim==='liste'){
      if(!adminMi(body)) return res.status(401).json({ok:false, hata:'Yönetici gerekli'});
      const durum = (body.durum||'bekliyor').toString();
      const rows = await sql`
        select id, durum, gonderen_ad, telefon, ozet, fark, olusma, kaynak
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
      const rows = await sql`select veri, durum, islem from oneri where id=${id}`;
      if(!rows[0]) return res.status(404).json({ok:false, hata:'Öneri yok'});
      if(rows[0].durum!=='bekliyor') return res.status(400).json({ok:false, hata:'Zaten karara bağlanmış'});

      if(karar==='onayla'){
        // Yamalı öneri (asistan / sesli hikâye): yama GÜNCEL ağaca uygulanır — bu arada
        // onaylanmış başka önerileri ezmez. Tam-ağaç önerisi (elle düzenleme) eskisi gibi yazılır.
        let yeniVeri = rows[0].veri;
        if(rows[0].islem){
          const cur = (await sql`select veri from agac where id=1`)[0]?.veri || {nodes:[]};
          try{ yeniVeri = yamaUygula(cur, rows[0].islem); }
          catch(e){
            if(yamaHatasiMi(e)) return res.status(409).json({ok:false, hata:'Öneri artık uygulanamıyor: '+e.message});
            throw e;
          }
        }
        await sql`update agac set veri = ${JSON.stringify(yeniVeri)}::jsonb, guncelleme=now() where id=1`;
        await sql`insert into gunluk (veri, guncelleyen) values (${JSON.stringify(yeniVeri)}::jsonb, ${'onay #'+id})`;
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
