-- TEMİZLİK: erkek kişiyi gösteren, baba bağının kopyası olan "anne bağları"nı kaldırır ve
-- o çocukların "anne" alanını boşaltır. Baba bağlarına, kişilere ve gerçek anne bağlarına dokunmaz.
-- Önce tüm ağaç gunluk tablosuna yedeklenir (geri almak için bkz. alttaki not).

-- 1) Yedek
insert into gunluk (veri, guncelleyen)
select veri, 'yedek: anne bağı temizliği öncesi' from agac where id = 1;

-- 2) Temizlik
with a as (select veri from agac where id = 1),
erkek as (select n->>'id' as id from a, jsonb_array_elements(a.veri->'nodes') n where n->>'sex' <> 'K'),
baba as (select e->>'from' as f, e->>'to' as t from a, jsonb_array_elements(a.veri->'edges') e),
yeni_anne_baglari as (
  select coalesce(jsonb_agg(m order by sira), '[]'::jsonb) as l
  from a, jsonb_array_elements(a.veri->'motherEdges') with ordinality x(m, sira)
  where not (m->>'from' in (select id from erkek)
             and exists (select 1 from baba b where b.f = m->>'from' and b.t = m->>'to'))
),
yeni_kisiler as (
  select jsonb_agg(
           case when n->>'mother' in (select id from erkek)
                 and exists (select 1 from baba b where b.f = n->>'mother' and b.t = n->>'id')
                then jsonb_set(n, '{mother}', 'null'::jsonb)
                else n end
           order by sira) as l
  from a, jsonb_array_elements(a.veri->'nodes') with ordinality x(n, sira)
)
update agac
set veri = jsonb_set(jsonb_set(veri, '{motherEdges}', (select l from yeni_anne_baglari)),
                     '{nodes}', (select l from yeni_kisiler)),
    guncelleyen = 'temizlik: erkek anne bağları',
    guncelleme = now()
where id = 1;

-- GERİ ALMAK GEREKİRSE:
-- update agac set veri = (select veri from gunluk
--   where guncelleyen = 'yedek: anne bağı temizliği öncesi' order by id desc limit 1),
--   guncelleme = now() where id = 1;
