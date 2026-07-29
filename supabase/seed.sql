-- Données de référence de ClicVote.
-- Exécuté par `supabase db reset`, ou manuellement via l'éditeur SQL.

insert into categories (name) values
  ('Beauté & Miss'),
  ('Musique & Télé-crochet'),
  ('Danse'),
  ('Awards'),
  ('Sport'),
  ('Mode'),
  ('Humour'),
  ('Talents & Innovation'),
  ('Autre')
on conflict (name) do nothing;
