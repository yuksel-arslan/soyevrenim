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
values (1, '{"evren":{"ad":"Abdurrahman Oğulları","slogan":"1615''ten beri"},"nodes":[],"edges":[],"marriages":[],"motherEdges":[]}'::jsonb)
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

-- SOHBET: genel aile sohbeti + kişi yorumları (tek tablo)
-- kapsam='genel' → aile sohbeti; kapsam='kisi:<id>' → o kişinin panelindeki yorumlar
create table if not exists sohbet (
  id          bigserial primary key,
  kapsam      text not null default 'genel',   -- 'genel' | 'kisi:p123...'
  yazan_id    text,                             -- yazan kişinin ağaç id'si
  yazan_ad    text,                             -- adı (gösterim)
  mesaj       text not null,
  zaman       timestamptz not null default now()
);
create index if not exists sohbet_kapsam_idx on sohbet(kapsam, zaman desc);



-- =====================================================================
-- ASİSTAN + SESLİ HİKÂYE — ücretsiz katman (docs/asistan.md · hikaye.md · kullanim.md)
-- Hepsi idempotent: tekrar çalıştırmak güvenli. Kimlik = "adını seç" kişi id'si.
-- =====================================================================

-- KULLANIM: her asistan mesajı / yazıya çevirme işi bir satır (gerçek usage)
create table if not exists kullanim (
  id          bigserial primary key,
  kisi_id     text not null,                      -- "adını seç" kimliği (p123…)
  tur         text not null check (tur in ('llm','stt')),
  model       text not null,
  girdi_tok   int not null default 0,
  cikti_tok   int not null default 0,
  istek       int not null default 1,             -- bu işte sağlayıcıya giden istek sayısı
  saniye      numeric(10,2) not null default 0,   -- stt: faturalanan ses süresi
  islem       text not null check (islem in ('soru','ekleme','hikaye','duzenle')),
  olusturma   timestamptz not null default now()
);
create index if not exists kullanim_zaman_idx on kullanim(olusturma desc);
create index if not exists kullanim_kisi_idx on kullanim(kisi_id, olusturma desc);

-- HİKÂYE KUYRUĞU: ses R2'de saklanır; yazıya çevirme kota varsa hemen, yoksa cron
create table if not exists hikaye_kuyruk (
  id           bigserial primary key,
  kisi_id      text not null,                     -- anlatan
  hedef_kisi_id text not null,                    -- hikâyesi anlatılan (anının ekleneceği kişi)
  ses_anahtar  text not null,                     -- ilk parçanın R2 anahtarı
  parcalar     jsonb not null,                    -- [{anahtar, sn, bayt}] — kayıt sırasında bölünmüş
  saniye       numeric(10,2) not null default 0,
  bayt         bigint not null default 0,
  durum        text not null default 'bekliyor' check (durum in ('bekliyor','islendi','hata')),
  baslik       text,
  transkript   text,
  hata         text,
  oneri_id     bigint,
  olusturma    timestamptz not null default now(),
  islenme      timestamptz
);
create index if not exists hikaye_kuyruk_durum_idx on hikaye_kuyruk(durum, olusturma);
create index if not exists hikaye_kuyruk_hedef_idx on hikaye_kuyruk(hedef_kisi_id, olusturma desc);

-- ÖNERİ: yama (patch) desteği. Yamalı öneri onaylanınca GÜNCEL ağaca uygulanır.
alter table oneri add column if not exists islem jsonb;
alter table oneri add column if not exists kaynak text;     -- 'elle' | 'asistan' | 'hikaye'
alter table oneri add column if not exists kisi_id text;    -- öneren kişinin ağaç id'si

-- BİLDİRİM: Web Push abonelikleri (telefon kilitliyken de "Fahri sohbete yazdı")
-- Bir tarayıcı = bir abonelik (endpoint benzersiz). kisi_id: aboneliği açan kişi (kendi mesajı için bildirim gitmez).
create table if not exists bildirim_abonelik (
  id          bigserial primary key,
  kisi_id     text,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  olusturma   timestamptz not null default now()
);
-- VAPID anahtarı: ortam değişkeni yoksa ilk kullanımda üretilip burada tutulur (tek satır)
create table if not exists bildirim_anahtar (
  id    int primary key default 1 check (id = 1),
  acik  text not null,
  ozel  text not null
);
