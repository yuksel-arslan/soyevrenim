-- Öz-denetim hatırlatmaları (Neon'da bir kez çalıştır). Aynısı schema.sql'de.
create table if not exists uyari (
  id          bigserial primary key,
  kisi_id     text not null,
  mesaj       text not null,
  ids         jsonb not null default '[]'::jsonb,
  kaynak_kisi text,
  kaynak_ad   text,
  olusma      timestamptz not null default now(),
  okundu      boolean not null default false
);
create index if not exists uyari_kisi on uyari (kisi_id, okundu, olusma desc);
