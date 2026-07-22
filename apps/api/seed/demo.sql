-- Jeu de démonstration pour le développement local.
-- Appliqué avec : pnpm db:seed:local
-- Idempotent : rejouable sans erreur.

INSERT OR REPLACE INTO learning_items (id, type, front, back, source_ref, created_at) VALUES
  ('itm_fsrs',       'flashcard', 'Que modélise FSRS pour chaque carte ?',            'La stabilité (durée avant oubli) et la difficulté.', 'seed:demo', 1767225600000),
  ('itm_retrieval',  'flashcard', 'Qu''est-ce que l''active recall ?',                 'Se forcer à retrouver l''information de mémoire, plutôt que la relire.', 'seed:demo', 1767225600000),
  ('itm_d1',         'flashcard', 'Quel service Cloudflare sert de base SQL ?',        'D1.', 'seed:demo', 1767225600000),
  ('itm_interleave', 'flashcard', 'En quoi consiste l''interleaving ?',                'Alterner les sujets pendant une session plutôt que les traiter en blocs.', 'seed:demo', 1767225600000),
  ('itm_cloze',      'cloze',     'La courbe de l''oubli a été décrite par {{c1::Ebbinghaus}}.', 'Ebbinghaus', 'seed:demo', 1767225600000);
