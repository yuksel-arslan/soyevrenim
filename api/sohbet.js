// Vercel Serverless Function — SOHBET (genel + kişi yorumları)
// /api/sohbet?adim=oku&kapsam=genel        (POST) → mesajları getir (herkes okur)
// /api/sohbet?adim=yeni&kapsam=genel       (POST) → {son} id'sinden sonraki mesaj sayısı + yazanlar (rozet)
// /api/sohbet?adim=vapid                    (POST) → {acik} — tarayıcının abone olması için açık VAPID anahtarı
// /api/sohbet?adim=abone                    (POST) → {jeton, kisi_id, abonelik} — push aboneliği kaydet (giriş gerekir)
// /api/sohbet?adim=birak                    (POST) → {endpoint} — aboneliği kaldır
// /api/sohbet?adim=yaz                       (POST) → mesaj yaz (aile şifresiyle giren)
// /api/sohbet?adim=sil                       (POST) → mesaj sil (admin ya da yazan kişi)
// /api/sohbet?adim=tanis-gonder              (POST) → {jeton, alici, mesaj} — tanışma daveti (alıcıya push)
// /api/sohbet?adim=tanis-liste               (POST) → {jeton} — gelen bekleyen, giden ve tanıştıklarım
// /api/sohbet?adim=tanis-yanit               (POST) → {jeton, id, kabul} — kabul: özel sohbet açılır (gönderene push)
// Özel sohbet kapsamı: ozel:<kisiA>:<kisiB> (id'ler sıralı) — yalnız o iki kişi okur/yazar, tanışma kabul edilmiş olmalı.
//
// Ortam değişkenleri: DATABASE_URL, OTURUM_GIZLI (jeton doğrulaması giris.js üzerinden)

import { jetonDogrula } from './giris.js';
import { db } from './_lib/db.js';   // ortak bağlantı (testte yerel PostgreSQL)
import { SOHBET, TANISMA } from './_lib/ayar.js';
import { vapidAnahtar, aileyeBildir, kisiyeBildir } from './_lib/push.js';

function oturumRol(body){ const o=jetonDogrula(body.jeton); return o?o.rol:null; }
function adminMi(body){ return oturumRol(body)==='admin'; }
function temizKapsam(k){
  k = String(k||'genel');
  if(k==='genel') return 'genel';
  if(/^kisi:[\w]+$/.test(k)) return k;   // kisi:pXXXX
  if(/^ozel:[\w-]{1,40}:[\w-]{1,40}$/.test(k)) return k;   // ozel:pA:pB (tanışma sonrası iki kişilik)
  if(/^hafta:\d{4}-\d{2}$/.test(k)) return k;   // hafta:2026-42 — Aile Meydanı "Haftanın sorusu" yanıtları
  return 'genel';
}
const kisiGecerli = (k) => /^[\w-]{1,40}$/.test(String(k || ''));
const ozelKapsam = (a, b) => 'ozel:' + [a, b].sort().join(':');
// Özel sohbete erişim: oturumdaki kişi kapsamın iki tarafından biri VE aralarında kabul edilmiş tanışma var
async function ozelErisim(sql, kapsam, body){
  if(!kapsam.startsWith('ozel:')) return true;
  const ben = jetonDogrula(body.jeton)?.kisi;
  const [, a, b] = kapsam.split(':');
  if(!ben || (ben !== a && ben !== b)) return false;
  const r = await sql`select 1 from tanisma where durum='kabul' and ((gonderen=${a} and alici=${b}) or (gonderen=${b} and alici=${a})) limit 1`;
  return r.length > 0;
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
      if(!(await ozelErisim(sql, kapsam, body))) return res.status(403).json({ok:false, hata:'Bu sohbet iki kişiye özel'});
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
      if(!(await ozelErisim(sql, kapsam, body))) return res.status(403).json({ok:false, hata:'Bu sohbet iki kişiye özel'});
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

    // — push bildirimi: açık anahtar / abone ol / bırak (ayrıntı docs/sohbet.md) —
    if(adim==='vapid'){
      const a = await vapidAnahtar();
      return res.status(200).json({ ok:true, acik: a.acik });
    }
    if(adim==='abone'){
      if(!oturumRol(body)) return res.status(401).json({ok:false, hata:'Bildirim için aile şifresiyle giriş yap'});
      const ab = body.abonelik || {}, k = ab.keys || {};
      const endpoint = String(ab.endpoint || '');
      if(!/^https:\/\//.test(endpoint) || !k.p256dh || !k.auth) return res.status(400).json({ok:false, hata:'Geçersiz abonelik'});
      const kid = String(jetonDogrula(body.jeton)?.kisi || body.kisi_id || '').trim();   // kimlik önce oturumdan
      const kisi = /^[\w-]{1,40}$/.test(kid) ? kid : null;
      await sql`
        insert into bildirim_abonelik (kisi_id, endpoint, p256dh, auth)
        values (${kisi}, ${endpoint}, ${String(k.p256dh)}, ${String(k.auth)})
        on conflict (endpoint) do update set kisi_id = excluded.kisi_id, p256dh = excluded.p256dh, auth = excluded.auth
      `;
      return res.status(200).json({ok:true});
    }
    if(adim==='birak'){
      await sql`delete from bildirim_abonelik where endpoint = ${String(body.endpoint || '')}`;
      return res.status(200).json({ok:true});
    }

    // — mesaj yaz (aile şifresiyle giren) —
    if(adim==='yaz'){
      const rol = oturumRol(body);
      if(!rol) return res.status(401).json({ok:false, hata:'Yazmak için aile şifresiyle giriş yap'});
      const kapsam = temizKapsam(body.kapsam);
      if(!(await ozelErisim(sql, kapsam, body))) return res.status(403).json({ok:false, hata:'Bu sohbet iki kişiye özel'});
      const mesaj = String(body.mesaj||'').trim().slice(0, 2000);
      if(!mesaj) return res.status(400).json({ok:false, hata:'Boş mesaj'});
      const ad = String(body.yazan_ad||'').slice(0,80);
      // yazan_id: yazanın ağaçtaki kişi id'si (seçtiği kişi). Kişi seçilmemişse rol
      // ('aile' / 'admin'). Eskiden hep rol yazılıyordu; kimin yazdığı ve "benim
      // mesajım" ayırt edilemiyordu.
      const kid = String(jetonDogrula(body.jeton)?.kisi || body.kisi_id || '').trim();   // kimlik önce oturumdan
      const yid = /^[\w-]{1,40}$/.test(kid) ? kid : rol;
      const rows = await sql`
        insert into sohbet (kapsam, yazan_id, yazan_ad, mesaj)
        values (${kapsam}, ${yid}, ${ad}, ${mesaj})
        returning id, yazan_id, yazan_ad, mesaj, zaman
      `;
      // Aileye bildirim (genel sohbet): yazan hariç tüm abonelere. Hata yazmayı bozmasın.
      let bildirim = null;
      if(kapsam.startsWith('ozel:')){
        const karsi = kapsam.split(':').slice(1).find((x) => x !== yid);
        try{ bildirim = await kisiyeBildir(karsi, { baslik: `💬 ${ad || 'Aileden biri'}`, metin: mesaj, url: '/?tanis=1', etiket: 'ozel-' + kapsam }); }
        catch(e){ bildirim = { hata: String(e.message || e) }; }
      } else if(kapsam==='genel'){
        try{
          bildirim = await aileyeBildir({ haricKisi: /^[\w-]{1,40}$/.test(kid) ? kid : null,
            baslik: `💬 ${ad || 'Aileden biri'} · Aile Sohbeti`, metin: mesaj, url: '/?sohbet=1', etiket: 'sohbet' });
        }catch(e){ bildirim = { hata: String(e.message || e) }; }
      }
      return res.status(200).json({ok:true, mesaj: rows[0], bildirim});
    }

    // — TANIŞMA DAVETİ —
    if(adim==='tanis-gonder' || adim==='tanis-liste' || adim==='tanis-yanit'){
      const o = jetonDogrula(body.jeton);
      if(!o) return res.status(401).json({ok:false, hata:'Aile şifresiyle giriş yap'});
      const ben = o.kisi;
      if(!kisiGecerli(ben)) return res.status(400).json({ok:false, hata:'Önce kim olduğunu seç (“Bu benim”)'});
      if(adim==='tanis-gonder'){
        const alici = String(body.alici||'');
        if(!kisiGecerli(alici) || alici===ben) return res.status(400).json({ok:false, hata:'Geçersiz kişi'});
        const mesaj = String(body.mesaj||'').trim().slice(0, TANISMA.mesajMax);
        const ad = String(body.gonderen_ad||'').slice(0, 80);
        const zaten = await sql`select id, durum from tanisma where ((gonderen=${ben} and alici=${alici}) or (gonderen=${alici} and alici=${ben})) and durum in ('bekliyor','kabul') limit 1`;
        if(zaten[0] && zaten[0].durum==='kabul') return res.status(200).json({ok:true, durum:'kabul', kapsam: ozelKapsam(ben, alici)});
        let id;
        if(zaten[0]){ id = Number(zaten[0].id); await sql`update tanisma set mesaj=${mesaj}, gonderen_ad=${ad}, olusma=now() where id=${id}`; }
        else id = Number((await sql`insert into tanisma (gonderen, gonderen_ad, alici, mesaj) values (${ben}, ${ad}, ${alici}, ${mesaj}) returning id`)[0].id);
        let bildirim=null;
        try{ bildirim = await kisiyeBildir(alici, { baslik: `🤝 ${ad || 'Aileden biri'} seninle tanışmak istiyor`, metin: mesaj || 'Tanışma daveti — açıp bakar mısın?', url: '/?tanis=1', etiket: 'tanis' }); }catch(e){}
        return res.status(200).json({ok:true, id, durum:'bekliyor', bildirim});
      }
      if(adim==='tanis-liste'){
        const gelen = await sql`select id, gonderen, gonderen_ad, mesaj, olusma from tanisma where alici=${ben} and durum='bekliyor' order by olusma desc limit ${TANISMA.listeMax}`;
        const giden = await sql`select id, alici, durum, olusma from tanisma where gonderen=${ben} order by olusma desc limit ${TANISMA.listeMax}`;
        const tanistik = await sql`select id, gonderen, alici, yanit_zaman from tanisma where durum='kabul' and (gonderen=${ben} or alici=${ben}) order by yanit_zaman desc limit ${TANISMA.listeMax}`;
        return res.status(200).json({ok:true, gelen, giden,
          tanistik: tanistik.map((t) => { const k = t.gonderen===ben ? t.alici : t.gonderen; return { kisi: k, kapsam: ozelKapsam(ben, k), zaman: t.yanit_zaman }; })});
      }
      // tanis-yanit
      const id = parseInt(body.id, 10);
      const [t] = await sql`select * from tanisma where id=${id}`;
      if(!t) return res.status(404).json({ok:false, hata:'Davet yok'});
      if(t.alici !== ben) return res.status(403).json({ok:false, hata:'Bu davet sana değil'});
      if(t.durum !== 'bekliyor') return res.status(400).json({ok:false, hata:'Bu davet zaten yanıtlanmış'});
      const kabul = !!body.kabul;
      await sql`update tanisma set durum=${kabul?'kabul':'red'}, yanit_zaman=now() where id=${id}`;
      const kapsam = ozelKapsam(t.gonderen, t.alici);
      if(kabul){
        // davet notu özel sohbetin ilk mesajı olur
        if(t.mesaj) await sql`insert into sohbet (kapsam, yazan_id, yazan_ad, mesaj, zaman) values (${kapsam}, ${t.gonderen}, ${t.gonderen_ad||''}, ${t.mesaj}, ${t.olusma})`;
        const ad = String(body.yanitlayan_ad||'').slice(0, 80);
        try{ await kisiyeBildir(t.gonderen, { baslik: `🤝 ${ad || 'Davet ettiğin kişi'} tanışma davetini kabul etti`, metin: 'Özel sohbetiniz açıldı — ilk selamı ver!', url: '/?tanis=1', etiket: 'tanis' }); }catch(e){}
      }
      return res.status(200).json({ok:true, durum: kabul?'kabul':'red', kapsam: kabul ? kapsam : null});
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
