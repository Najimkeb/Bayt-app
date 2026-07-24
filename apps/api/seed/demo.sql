-- Jeu de démonstration pour le développement local.
-- Appliqué avec : pnpm db:seed:local
-- Idempotent : rejouable sans erreur.

INSERT OR REPLACE INTO learning_items (id, type, front, back, source_ref, domain_id, created_at) VALUES
  ('itm_fsrs',       'flashcard', 'Que modélise FSRS pour chaque carte ?',            'La stabilité (durée avant oubli) et la difficulté.', 'seed:demo', 'dom_apprendre', 1767225600000),
  ('itm_retrieval',  'flashcard', 'Qu''est-ce que l''active recall ?',                 'Se forcer à retrouver l''information de mémoire, plutôt que la relire.', 'seed:demo', 'dom_apprendre', 1767225600000),
  ('itm_d1',         'flashcard', 'Quel service Cloudflare sert de base SQL ?',        'D1.', 'seed:demo', 'dom_apprendre', 1767225600000),
  ('itm_interleave', 'flashcard', 'En quoi consiste l''interleaving ?',                'Alterner les sujets pendant une session plutôt que les traiter en blocs.', 'seed:demo', 'dom_apprendre', 1767225600000),
  ('itm_cloze',      'cloze',     'La courbe de l''oubli a été décrite par {{c1::Ebbinghaus}}.', 'Ebbinghaus', 'seed:demo', 'dom_apprendre', 1767225600000);

-- ============================================================================
-- Leçon de démonstration : 6 exercices mêlant QCM, texte à trous et association.
-- Chaque exercice révise un learning_item dédié (la réponse devient une note FSRS).
-- ============================================================================

INSERT OR REPLACE INTO learning_items (id, type, front, back, source_ref, domain_id, created_at) VALUES
  ('lx_item_1', 'flashcard', 'Active recall ?',        'Se tester de mémoire.',                'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_2', 'flashcard', 'Base SQL de Cloudflare ?','D1.',                                  'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_3', 'flashcard', 'Auteur de la courbe de l''oubli ?', 'Ebbinghaus.',                'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_4', 'flashcard', 'Alterner les sujets ?',  'Interleaving.',                        'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_5', 'flashcard', 'Termes FSRS ?',          'Stabilité, difficulté, rétrievabilité.','seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_6', 'flashcard', 'Services Cloudflare ?',  'D1, R2, KV.',                          'seed:lesson', 'dom_apprendre', 1767225600000);

-- Unité du chemin de progression (accueil).
INSERT OR REPLACE INTO units (id, title, domain_id, position, created_at) VALUES
  ('unit_fondamentaux', 'Fondamentaux de la mémorisation', 'dom_apprendre', 0, 1767225600000);

INSERT OR REPLACE INTO lessons (id, title, unit_id, position, created_at) VALUES
  ('lesson_demo', 'Les bases', 'unit_fondamentaux', 0, 1767225600000);

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

-- ============================================================================
-- Leçons supplémentaires de l'unité (verrouillées au départ, débloquées à la suite).
-- ============================================================================

INSERT OR REPLACE INTO learning_items (id, type, front, back, source_ref, domain_id, created_at) VALUES
  ('lx_item_7',  'flashcard', 'Répétition espacée ?',   'Revoir à intervalles croissants.',     'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_8',  'flashcard', 'Feynman ?',              'Expliquer simplement pour comprendre.', 'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_9',  'flashcard', 'Interrogation de rappel ?','Se tester plutôt que relire.',       'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_10', 'flashcard', 'Taxonomie de Bloom ?',   'Niveaux de maîtrise cognitive.',       'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_11', 'flashcard', 'Surapprentissage ?',     'Continuer après la première réussite.', 'seed:lesson', 'dom_apprendre', 1767225600000),
  ('lx_item_12', 'flashcard', 'Effet de test ?',        'Se tester renforce la mémoire.',        'seed:lesson', 'dom_apprendre', 1767225600000);

INSERT OR REPLACE INTO lessons (id, title, unit_id, position, created_at) VALUES
  ('lesson_srs',      'Répétition espacée', 'unit_fondamentaux', 1, 1767225600000),
  ('lesson_pratique', 'Pratique de rappel', 'unit_fondamentaux', 2, 1767225600000),
  ('lesson_maitrise', 'Vers la maîtrise',   'unit_fondamentaux', 3, 1767225600000);

INSERT OR REPLACE INTO exercises (id, lesson_id, item_id, position, type, prompt, payload) VALUES
  -- Leçon 2 : Répétition espacée
  ('sr_1', 'lesson_srs', 'lx_item_7', 0, 'mcq',
   'Qu''est-ce que la répétition espacée ?',
   '{"options":["Tout revoir chaque jour","Revoir à intervalles croissants","Ne jamais revoir","Revoir au hasard"],"answerIndex":1}'),
  ('sr_2', 'lesson_srs', 'lx_item_1', 1, 'fill_blank',
   'Se tester de mémoire plutôt que relire s''appelle l''active ______.',
   '{"answer":"recall","accept":["rappel"]}'),
  ('sr_3', 'lesson_srs', 'lx_item_9', 2, 'matching',
   'Associe chaque principe à sa description.',
   '{"pairs":[{"left":"Répétition espacée","right":"Intervalles croissants"},{"left":"Effet de test","right":"Se tester renforce la mémoire"}]}'),

  -- Leçon 3 : Pratique de rappel
  ('pr_1', 'lesson_pratique', 'lx_item_8', 0, 'mcq',
   'Que propose la technique de Feynman ?',
   '{"options":["Mémoriser par cœur","Expliquer simplement pour comprendre","Lire vite","Copier ses notes"],"answerIndex":1}'),
  ('pr_2', 'lesson_pratique', 'lx_item_12', 1, 'fill_blank',
   'Le fait que se tester renforce la mémoire s''appelle l''effet de ______.',
   '{"answer":"test","accept":["testing"]}'),
  ('pr_3', 'lesson_pratique', 'lx_item_9', 2, 'mcq',
   'L''interrogation de rappel consiste à…',
   '{"options":["Relire ses notes","Se tester de mémoire","Écouter un podcast","Surligner"],"answerIndex":1}'),

  -- Leçon 4 : Vers la maîtrise
  ('ma_1', 'lesson_maitrise', 'lx_item_10', 0, 'mcq',
   'À quoi sert la taxonomie de Bloom ?',
   '{"options":["Classer les niveaux de maîtrise","Ranger des livres","Mesurer le temps","Noter la vitesse"],"answerIndex":0}'),
  ('ma_2', 'lesson_maitrise', 'lx_item_11', 1, 'fill_blank',
   'Continuer à réviser après la première réussite s''appelle le sur______.',
   '{"answer":"apprentissage","accept":["surapprentissage"]}'),
  ('ma_3', 'lesson_maitrise', 'lx_item_5', 2, 'matching',
   'Associe chaque terme FSRS à sa définition.',
   '{"pairs":[{"left":"Stabilité","right":"Durée avant oubli"},{"left":"Difficulté","right":"Résistance à la mémorisation"},{"left":"Rétrievabilité","right":"Probabilité de rappel"}]}');
