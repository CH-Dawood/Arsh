-- Policies & FAQs edited from Admin → Store Settings. Reuses content_pages and faq_items.
-- Rich text is stored as editor JSON (rendered as plain React elements, never as HTML).

alter table public.content_pages add column is_published boolean not null default true;

-- Formatted content is larger than plain text.
alter table public.content_pages drop constraint content_pages_body_check;
alter table public.content_pages add constraint content_pages_body_check check (char_length(body) <= 200000);
alter table public.faq_items drop constraint faq_items_answer_check;
alter table public.faq_items add constraint faq_items_answer_check check (char_length(answer) between 2 and 20000);

-- Visitors read published pages only; admins read everything (incl. drafts).
drop policy "Read content_pages" on public.content_pages;
create policy "Read content_pages" on public.content_pages
  for select to anon, authenticated using (is_published or (select public.is_admin()));
