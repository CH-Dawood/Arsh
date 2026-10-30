-- Rows the application requires to exist. Business details stay empty until the owner
-- fills them in from Admin → Settings / Content; the UI shows a placeholder notice meanwhile.

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

insert into public.content_pages (slug, title, body) values
  ('about',           'About Us',             ''),
  ('privacy-policy',  'Privacy Policy',       ''),
  ('shipping-policy', 'Shipping Policy',      ''),
  ('refund-policy',   'Refund & Return Policy', ''),
  ('terms',           'Terms & Conditions',   ''),
  ('size-guide',      'Size Guide',           '')
on conflict (slug) do nothing;
