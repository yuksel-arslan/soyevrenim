// Vercel Serverless Function — foto/video YÜKLE (Vercel Blob)
// /api/medya  (POST, multipart yerine doğrudan dosya body'si)
//
// Gerekli: Vercel projesinde "Storage → Blob" oluştur (ücretsiz başlar).
//   Vercel otomatik BLOB_READ_WRITE_TOKEN ekler; ayrıca giriş için oturum jetonu ister.
//
// İstek: POST /api/medya?ad=<dosyaadi>&token=<oturumJetonu>
//        Body: ham dosya (image/* veya video/*)
// Yanıt: { ok:true, url:"https://...blob.vercel-storage.com/..." }

import { put, del } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export const config = { api: { bodyParser: false } };  // ham dosya alacağız

async function readBody(req){
  const chunks=[];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}
async function girisGecerli(token){
  if(!token) return false;
  const r = await sql`select kisi_id from oturum where token = ${token}`;
  return r.length>0;
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  try{
    const token = (req.query.token||'').toString();
    const adminOk = (req.query.admin||'') === process.env.ADMIN_CODE && !!process.env.ADMIN_CODE;
    if(!(adminOk || await girisGecerli(token))){
      return res.status(401).json({ok:false, hata:'Giriş gerekli'});
    }

    if(req.method==='POST'){
      const ad = (req.query.ad||('medya-'+Date.now())).toString().replace(/[^\w.\-]/g,'_').slice(0,80);
      const tip = (req.headers['content-type']||'application/octet-stream');
      // boyut sınırı (video için makul tut): 50 MB
      const data = await readBody(req);
      if(data.length > 50*1024*1024) return res.status(413).json({ok:false, hata:'Dosya çok büyük (max 50 MB)'});
      const blob = await put(`medya/${Date.now()}-${ad}`, data, {
        access:'public', contentType:tip, addRandomSuffix:true
      });
      return res.status(200).json({ok:true, url:blob.url, tip});
    }

    if(req.method==='DELETE'){
      const url = (req.query.url||'').toString();
      if(!url) return res.status(400).json({ok:false, hata:'url gerekli'});
      await del(url);
      return res.status(200).json({ok:true});
    }

    return res.status(405).json({ok:false});
  }catch(e){
    return res.status(500).json({ok:false, hata:String(e.message||e)});
  }
}
