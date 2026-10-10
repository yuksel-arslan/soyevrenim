-- 1) ÖNİZLEME: bağsız düğümler (hiçbir ebeveyn/anne/eş bağı yok)
with a as (select veri from agac where id=1),
bag as (
  select coalesce(a.veri->'edges','[]'::jsonb) || coalesce(a.veri->'motherEdges','[]'::jsonb) || coalesce(a.veri->'marriages','[]'::jsonb) as l from a
),
bagli as (
  select e->>'from' as id from bag, jsonb_array_elements(bag.l) e
  union select e->>'to' from bag, jsonb_array_elements(bag.l) e
)
select n->>'id' as id, n->>'name' as ad
from a, jsonb_array_elements(a.veri->'nodes') n
where not exists (select 1 from bagli b where b.id = n->>'id')
order by 2;
