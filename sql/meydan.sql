-- Aile Meydanı tabloları (Neon'da bir kez çalıştır). Aynısı schema.sql'de.
-- AİLE MEYDANI (api/meydan.js). Tek başına: sql/meydan.sql
create table if not exists soru (            -- "Büyüğe sor"
  id           bigserial primary key,
  soran        text not null,
  soran_ad     text,
  kime         text not null,
  metin        text not null,
  yanit        text,
  olusma       timestamptz not null default now(),
  yanit_zaman  timestamptz
);
create index if not exists soru_kime on soru (kime, olusma desc);
create index if not exists soru_soran on soru (soran, olusma desc);
create table if not exists etkinlik (        -- buluşma, köy ziyareti, düğün, bayramlaşma…
  id            bigserial primary key,
  baslik        text not null,
  tarih         date not null,
  saat          text,
  yer           text,
  aciklama      text,
  olusturan     text not null,
  olusturan_ad  text,
  olusma        timestamptz not null default now()
);
create index if not exists etkinlik_tarih on etkinlik (tarih);
create table if not exists etkinlik_katilim (
  etkinlik_id  bigint not null,
  kisi         text not null,
  kisi_ad      text,
  durum        text not null,                -- evet | belki | hayir
  primary key (etkinlik_id, kisi)
);
