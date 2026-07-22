-- Jeu de demonstration pour le developpement local.
-- Applique avec : pnpm db:seed:local
-- Idempotent : rejouable sans erreur.

INSERT OR REPLACE INTO learning_items (id, type, front, back, source_ref, created_at) VALUES
  ('itm_fsrs',       'flashcard', 'Que modelise FSRS pour chaque carte ?',            'La stabilite (duree avant oubli) et la difficulte.', 'seed:demo', 1767225600000),
  ('itm_retrieval',  'flashcard', 'Qu''est-ce que l''active recall ?',                 'Se forcer a retrouver l''information de memoire, plutot que la relire.', 'seed:demo', 1767225600000),
  ('itm_d1',         'flashcard', 'Quel service Cloudflare sert de base SQL ?',        'D1.', 'seed:demo', 1767225600000),
  ('itm_interleave', 'flashcard', 'En quoi consiste l''interleaving ?',                'Alterner les sujets pendant une session plutot que les traiter en blocs.', 'seed:demo', 1767225600000),
  ('itm_cloze',      'cloze',     'La courbe de l''oubli a ete decrite par {{c1::Ebbinghaus}}.', 'Ebbinghaus', 'seed:demo', 1767225600000);
