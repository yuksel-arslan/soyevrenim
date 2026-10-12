-- Tanışma davetleri (Neon'da bir kez çalıştır). Aynısı schema.sql'de.
-- Tanışma daveti: birbirini tanımayan aile üyeleri (api/sohbet.js → tanis-*). Kabul edilince
-- iki kişiye özel sohbet (sohbet.kapsam = 'ozel:<a>:<b>') açılır. Tek başına: sql/tanisma.sql
create table if not exists tanisma (
  id           bigserial primary key,
  gonderen     text not null,          -- ağaçtaki kişi id'si
  gonderen_ad  text,
  alici        text not null,
  mesaj        text,
  durum        text not null default 'bekliyor',   -- bekliyor | kabul | red
  olusma       timestamptz not null default now(),
  yanit_zaman  timestamptz
);
create index if not exists tanisma_alici on tanisma (alici, durum);
create index if not exists tanisma_gonderen on tanisma (gonderen, durum);
