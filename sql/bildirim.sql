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
