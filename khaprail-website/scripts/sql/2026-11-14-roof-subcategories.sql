-- Same rows the server creates on start (server/lib/ensure-categories.ts).
-- Run in the Supabase SQL editor if you prefer to create them by hand.
insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, p.id, v.sort_order
from (values
  ('Clay Roof Tiles','clay-roof-tiles',1),
  ('Ceramic Roof Tiles','ceramic-roof-tiles',2),
  ('Brick Roof Tiles','brick-roof-tiles',3)
) as v(name, slug, sort_order)
join categories p on p.slug = 'roof-tiles'
where not exists (select 1 from categories c where c.slug = v.slug);
