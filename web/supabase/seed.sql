-- Reference data for a new store. Safe to edit or delete from the admin dashboard.
-- Demo products and photos are added separately (supabase/demo/) and are clearly marked as demo.

insert into public.sizes (code, label, sort_order) values
  ('XS', 'Extra Small', 10),
  ('S',  'Small',       20),
  ('M',  'Medium',      30),
  ('L',  'Large',       40),
  ('XL', 'Extra Large', 50),
  ('UNSTITCHED', 'Unstitched', 90)
on conflict (code) do nothing;

insert into public.colors (name, hex) values
  ('Ivory',     '#F4EFE6'),
  ('Champagne', '#E6D5B8'),
  ('Blush',     '#E8C4C0'),
  ('Sage',      '#A9B59A'),
  ('Emerald',   '#2E6B57'),
  ('Navy',      '#25324A'),
  ('Maroon',    '#6B2430'),
  ('Black',     '#1C1A19')
on conflict (name) do nothing;

insert into public.categories (name, slug, description, sort_order) values
  ('Kurta Shalwar',       'kurta-shalwar',       'Classic kurta and shalwar sets.', 10),
  ('2 Piece Suits',       '2-piece-suits',       'Shirt and trouser or shirt and dupatta sets.', 20),
  ('3 Piece Suits',       '3-piece-suits',       'Shirt, trouser and dupatta ensembles.', 30),
  ('Embroidered Suits',   'embroidered-suits',   'Hand and machine embroidered pieces.', 40),
  ('Printed Suits',       'printed-suits',       'Digital and block printed lawn and cambric.', 50),
  ('Ready To Wear',       'ready-to-wear',       'Stitched and ready to wear.', 60),
  ('Designer Collection', 'designer-collection', 'Limited designer pieces.', 70)
on conflict (slug) do nothing;

-- The six home-page categories, in the order the spec requires.
insert into public.home_sections (title, slug, kind, category_id, sort_order) values
  ('New Arrivals',      'new-arrivals',      'new_arrivals', null, 10),
  ('Luxury Collection', 'luxury-collection', 'luxury',       null, 20),
  ('2 Piece Set',       '2-piece-set',       'category', (select id from public.categories where slug = '2-piece-suits'), 30),
  ('Brands',            'brands',            'brands',       null, 40),
  ('Ready To Wear',     'ready-to-wear',     'category', (select id from public.categories where slug = 'ready-to-wear'), 50),
  ('Best Sellers',      'best-sellers',      'best_sellers', null, 60)
on conflict (slug) do nothing;
