// Vercel Serverless Function — SMS ile giriş
// /api/giris?adim=kod-iste   → telefona SMS kodu gönderir
// /api/giris?adim=dogrula    → kodu kontrol eder, oturum jetonu verir
//
// Gerekli ortam değişkenleri (Vercel → Settings → Environment Variables):
//   DATABASE_URL          → Neon bağlantısı
//   TWILIO_SID            → Twilio Account SID
//   TWILIO_TOKEN          → Twilio Auth Token
//   TWILIO_FROM           → Twilio telefon numaran (+1...) veya Messaging Service SID
//
// Twilio hesabı: twilio.com (deneme kredisi verir). Türkiye'ye SMS ~$0.02-0.04/adet.

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// telefonu normalize et: sadece rakam, +90 ile başlat
function normTel(raw){
  let s = String(raw||'').replace(/[^\d+]/g,'');
  if(s.startsWith('00')) s = '+' + s.slice(2);
  if(s.startsWith('0'))  s = '+90' + s.slice(1);      // TR yerel → +90
  if(!s.startsWith('+')) s = '+90' + s;               // baştan + yoksa TR varsay
  return s;
}
function altTels(t){
  // kayıtta farklı biçim olabilir; birkaç varyant üret (eşleşme için)
  const digits = t.replace(/\D/g,'');
  const last10 = digits.slice(-10);
  return new Set([t, '+'+digits, digits, '0'+last10, last10, '+90'+last10, '90'+last10]);
}
function kodUret(){ return String(Math.floor(100000 + Math.random()*900000)); }
function tokenUret(){ return [...crypto.getRandomValues(new Uint8Array(24))].map(b=>b.toString(16).padStart(2,'0')).join(''); }

async function twilioGonder(to, body){
  const sid=process.env.TWILIO_SID, token=process.env.TWILIO_TOKEN, from=process.env.TWILIO_FROM;
  if(!sid||!token||!from) throw new Error('Twilio ayarları eksik');
  const params = new URLSearchParams();
  params.append('To', to);
  if(from.startsWith('MG')) params.append('MessagingServiceSid', from);
  else params.append('From', from);
  params.append('Body', body);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:'POST',
    headers:{ 'Authorization':'Basic '+btoa(`${sid}:${token}`), 'Content-Type':'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  if(!r.ok){ const t=await r.text(); throw new Error('SMS gönderilemedi: '+t.slice(0,120)); }
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({ok:false});

  const adim = (req.query.adim||'').toString();
  const body = req.body||{};

  try{
    if(adim==='kod-iste'){
      const tel = normTel(body.telefon);
      if(tel.replace(/\D/g,'').length < 11) return res.status(400).json({ok:false, hata:'Geçersiz numara'});

      // bu numara ağaçta bir kişiye ait mi? (kişilerin telefonu ağaç JSON'unda)
      const rows = await sql`select veri from agac where id=1`;
      const veri = rows[0]?.veri || {nodes:[]};
      const variants = altTels(tel);
      const kisi = (veri.nodes||[]).find(n=>{
        const t = n.tel || (n.contact && n.contact.phone) || '';
        if(!t) return false;
        const tv = altTels(normTel(t));
        for(const x of tv){ if(variants.has(x)) return true; }
        return false;
      });
      if(!kisi) return res.status(404).json({ok:false, hata:'Bu numara ağaçta kayıtlı değil. Yöneticiden eklenmesini iste.'});

      const kod = kodUret();
      await sql`
        insert into sms_kod (telefon, kod, kisi_id, deneme, olusma)
        values (${tel}, ${kod}, ${kisi.id}, 0, now())
        on conflict (telefon) do update set kod=${kod}, kisi_id=${kisi.id}, deneme=0, olusma=now()
      `;
      await twilioGonder(tel, `KÖK Soy Ağacı giriş kodun: ${kod} (10 dk geçerli)`);
      return res.status(200).json({ok:true, kisi_adi: kisi.name });
    }

    if(adim==='dogrula'){
      const tel = normTel(body.telefon);
      const kod = String(body.kod||'').trim();
      const rows = await sql`select kod, kisi_id, deneme, olusma from sms_kod where telefon=${tel}`;
      const rec = rows[0];
      if(!rec) return res.status(400).json({ok:false, hata:'Önce kod iste'});
      // 10 dk geçerlilik
      if((Date.now() - new Date(rec.olusma).getTime()) > 10*60*1000){
        await sql`delete from sms_kod where telefon=${tel}`;
        return res.status(400).json({ok:false, hata:'Kodun süresi doldu, yeniden iste'});
      }
      if(rec.deneme >= 5){
        await sql`delete from sms_kod where telefon=${tel}`;
        return res.status(429).json({ok:false, hata:'Çok fazla deneme, yeniden kod iste'});
      }
      if(kod !== rec.kod){
        await sql`update sms_kod set deneme=deneme+1 where telefon=${tel}`;
        return res.status(401).json({ok:false, hata:'Kod yanlış'});
      }
      // başarılı → oturum jetonu ver
      const token = tokenUret();
      await sql`insert into oturum (token, kisi_id, telefon) values (${token}, ${rec.kisi_id}, ${tel})`;
      await sql`delete from sms_kod where telefon=${tel}`;
      return res.status(200).json({ok:true, token, kisi_id: rec.kisi_id});
    }

    return res.status(400).json({ok:false, hata:'Bilinmeyen adım'});
  }catch(e){
    return res.status(500).json({ok:false, hata:String(e.message||e)});
  }
}
