-- KÖK · Ortak Soy Ağacı — Neon (PostgreSQL) şeması
-- Neon panelinde "SQL Editor" bölümüne yapıştırıp çalıştır (bir kez).

-- Tüm ağaç tek bir JSON kaydında tutulur (250 kişi için en basit ve hızlı yol).
create table if not exists agac (
  id          int primary key default 1,      -- her zaman tek satır (id=1)
  veri        jsonb not null,                  -- {nodes, edges, marriages, motherEdges}
  guncelleyen text,                            -- son düzenleyenin adı (opsiyonel)
  guncelleme  timestamptz not null default now()
);

-- Tek satırı garanti et (yoksa boş ağaçla oluştur)
insert into agac (id, veri)
values (1, '{"nodes":[],"edges":[],"marriages":[],"motherEdges":[]}'::jsonb)
on conflict (id) do nothing;

-- Basit bir "değişiklik günlüğü" (kim ne zaman kaydetti — geri almak istersen işine yarar)
create table if not exists gunluk (
  id          bigserial primary key,
  veri        jsonb not null,
  guncelleyen text,
  zaman       timestamptz not null default now()
);

-- SMS doğrulama kodları (geçici; kod girilince silinir, 10 dk sonra geçersiz)
create table if not exists sms_kod (
  telefon     text primary key,          -- normalize edilmiş numara (+90...)
  kod         text not null,             -- 6 haneli kod (hash'lenmiş tutmak daha iyi ama basit tutuyoruz)
  kisi_id     text,                      -- eşleşen kişinin ağaç id'si
  deneme      int not null default 0,    -- yanlış deneme sayacı (brute-force önlemi)
  olusma      timestamptz not null default now()
);

-- Oturum jetonları (doğrulanmış girişler — 30 gün geçerli)
create table if not exists oturum (
  token       text primary key,
  kisi_id     text not null,
  telefon     text,
  olusma      timestamptz not null default now()
);

-- ÖNERİLER (onay kuyruğu): kimse ana ağacı doğrudan değiştiremez.
-- Herkes değişiklik önerir; admin onaylayınca 'agac' güncellenir.
create table if not exists oneri (
  id          bigserial primary key,
  durum       text not null default 'bekliyor',   -- bekliyor | onaylandi | reddedildi
  gonderen_id text,                                -- öneriyi yapan kişinin ağaç id'si
  gonderen_ad text,                                -- adı (gösterim için)
  telefon     text,                                -- doğrulanmış telefonu
  ozet        text,                                -- kısa açıklama ("Ali'nin telefonu eklendi")
  veri        jsonb not null,                      -- önerilen TAM ağaç durumu (onaylanınca bu yazılır)
  fark        jsonb,                               -- {eklenen:[], silinen:[], degisen:[]} — ne değişti
  olusma      timestamptz not null default now(),
  karar_zaman timestamptz
);
create index if not exists oneri_durum_idx on oneri(durum, olusma desc);

