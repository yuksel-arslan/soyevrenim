-- ÖNİZLEME (hiçbir şeyi değiştirmez): "anne bağı" bir ERKEĞİ gösteren ve aynı kişiye
-- zaten baba bağı olan kayıtlar. Bunlar baba bağının yanlışlıkla anne olarak da yazılmış hâli.
with a as (select veri from agac where id = 1),
kisi as (select n->>'id' as id, n->>'name' as ad, n->>'sex' as cins
         from a, jsonb_array_elements(a.veri->'nodes') n),
baba as (select e->>'from' as f, e->>'to' as t from a, jsonb_array_elements(a.veri->'edges') e)
select ebeveyn.ad as "anne olarak kayıtlı (erkek)", cocuk.ad as "çocuk",
       m->>'from' as ebeveyn_id, m->>'to' as cocuk_id
from a, jsonb_array_elements(a.veri->'motherEdges') m
join kisi ebeveyn on ebeveyn.id = m->>'from'
join kisi cocuk   on cocuk.id   = m->>'to'
where ebeveyn.cins <> 'K'
  and exists (select 1 from baba b where b.f = m->>'from' and b.t = m->>'to')
order by 1, 2;
