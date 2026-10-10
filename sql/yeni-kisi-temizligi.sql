-- 2) YEDEK + TEMİZLİK: bağsız "Yeni kişi" düğümlerini kaldır
insert into gunluk (veri, guncelleyen)
select veri, 'yedek: Yeni kişi temizliği öncesi' from agac where id=1;

with bag as (
  select coalesce(veri->'edges','[]'::jsonb) || coalesce(veri->'motherEdges','[]'::jsonb) || coalesce(veri->'marriages','[]'::jsonb) as l
  from agac where id=1
),
bagli as (
  select e->>'from' as id from bag, jsonb_array_elements(bag.l) e
  union select e->>'to' from bag, jsonb_array_elements(bag.l) e
)
update agac
set veri = jsonb_set(veri, '{nodes}', (
      select coalesce(jsonb_agg(n), '[]'::jsonb)
      from jsonb_array_elements(agac.veri->'nodes') n
      where not (n->>'name' ilike 'yeni ki%'
                 and not exists (select 1 from bagli b where b.id = n->>'id')))),
    guncelleyen = 'temizlik: bağsız Yeni kişi',
    guncelleme = now()
where id = 1;
