-- Jeu de démonstration pour le développement local.
-- Appliqué avec : pnpm db:seed:local
-- Idempotent : rejouable sans erreur.

INSERT OR REPLACE INTO learning_items (id, type, front, back, source_ref, created_at) VALUES
  ('itm_fsrs',       'flashcard', 'Que modélise FSRS pour chaque carte ?',            'La stabilité (durée avant oubli) et la difficulté.', 'seed:demo', 1767225600000),
  ('itm_retrieval',  'flashcard', 'Qu''est-ce que l''active recall ?',                 'Se forcer à retrouver l''information de mémoire, plutôt que la relire.', 'seed:demo', 1767225600000),
  ('itm_d1',         'flashcard', 'Quel service Cloudflare sert de base SQL ?',        'D1.', 'seed:demo', 1767225600000),
  ('itm_interleave', 'flashcard', 'En quoi consiste l''interleaving ?',                'Alterner les sujets pendant une session plutôt que les traiter en blocs.', 'seed:demo', 1767225600000),
  ('itm_cloze',      'cloze',     'La courbe de l''oubli a été décrite par {{c1::Ebbinghaus}}.', 'Ebbinghaus', 'seed:demo', 1767225600000);

-- ============================================================================
-- Leçon de démonstration : 6 exercices mêlant QCM, texte à trous et association.
-- Chaque exercice révise un learning_item dédié (la réponse devient une note FSRS).
-- ============================================================================

INSERT OR REPLACE INTO learning_items (id, type, front, back, source_ref, created_at) VALUES
  ('lx_item_1', 'flashcard', 'Active recall ?',        'Se tester de mémoire.',                'seed:lesson', 1767225600000),
  ('lx_item_2', 'flashcard', 'Base SQL de Cloudflare ?','D1.',                                  'seed:lesson', 1767225600000),
  ('lx_item_3', 'flashcard', 'Auteur de la courbe de l''oubli ?', 'Ebbinghaus.',                'seed:lesson', 1767225600000),
  ('lx_item_4', 'flashcard', 'Alterner les sujets ?',  'Interleaving.',                        'seed:lesson', 1767225600000),
  ('lx_item_5', 'flashcard', 'Termes FSRS ?',          'Stabilité, difficulté, rétrievabilité.','seed:lesson', 1767225600000),
  ('lx_item_6', 'flashcard', 'Services Cloudflare ?',  'D1, R2, KV.',                          'seed:lesson', 1767225600000);

INSERT OR REPLACE INTO lessons (id, title, created_at) VALUES
  ('lesson_demo', 'Fondamentaux de la mémorisation', 1767225600000);

INSERT OR REPLACE INTO exercises (id, lesson_id, item_id, position, type, prompt, payload) VALUES
  ('lx_1', 'lesson_demo', 'lx_item_1', 0, 'mcq',
   'Qu''est-ce que l''active recall ?',
   '{"options":["Relire ses notes","Se tester de mémoire","Surligner l''essentiel","Réécouter un cours"],"answerIndex":1}'),

  ('lx_2', 'lesson_demo', 'lx_item_3', 1, 'fill_blank',
   'La courbe de l''oubli a été décrite par ______.',
   '{"answer":"Ebbinghaus","accept":["Hermann Ebbinghaus"]}'),

  ('lx_3', 'lesson_demo', 'lx_item_2', 2, 'mcq',
   'Quel service Cloudflare est une base de données SQL ?',
   '{"options":["R2","D1","KV","Vectorize"],"answerIndex":1}'),

  ('lx_4', 'lesson_demo', 'lx_item_5', 3, 'matching',
   'Associe chaque terme FSRS à sa définition.',
   '{"pairs":[{"left":"Stabilité","right":"Durée avant que le rappel faiblisse"},{"left":"Difficulté","right":"Résistance de l''item à la mémorisation"},{"left":"Rétrievabilité","right":"Probabilité de rappel à un instant t"}]}'),

  ('lx_5', 'lesson_demo', 'lx_item_4', 4, 'fill_blank',
   'Alterner plusieurs sujets dans une même session s''appelle l''______.',
   '{"answer":"interleaving","accept":["entrelacement","alternance"]}'),

  ('lx_6', 'lesson_demo', 'lx_item_6', 5, 'matching',
   'Associe chaque service Cloudflare à son rôle.',
   '{"pairs":[{"left":"D1","right":"Base de données SQL"},{"left":"R2","right":"Stockage d''objets"},{"left":"KV","right":"Cache clé-valeur"}]}');
