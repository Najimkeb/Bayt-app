CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`emoji` text NOT NULL,
	`color` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `domains` (`id`,`name`,`description`,`emoji`,`color`,`position`,`created_at`) VALUES
  ('dom_apprendre','Apprendre à apprendre','Mémoire, méthodes de travail et concentration.','🧠','green',0,1767225600000),
  ('dom_comm','Communication & marketing digital','Contenus, réseaux sociaux et audience.','📣','blue',1,1767225600000),
  ('dom_business','Business & entrepreneuriat','Lancer, piloter et faire grandir un projet.','🚀','purple',2,1767225600000),
  ('dom_analyst','Business analyst','Besoins, données et aide à la décision.','📊','teal',3,1767225600000),
  ('dom_economie','Économie','Marchés, monnaie et politiques économiques.','💶','yellow',4,1767225600000),
  ('dom_maths','Mathématiques','Logique, calcul et raisonnement.','➗','red',5,1767225600000),
  ('dom_a11y','Accessibilité numérique','Des produits utilisables par toutes et tous.','♿','indigo',6,1767225600000),
  ('dom_rgpd','RGPD & protection des données','Vie privée, consentement et conformité.','🔒','orange',7,1767225600000),
  ('dom_francais','Français','Langue, expression et style.','📚','pink',8,1767225600000),
  ('dom_anglais','Anglais','Comprendre et se faire comprendre.','🇬🇧','blue',9,1767225600000),
  ('dom_arabe','Arabe','Lire, écrire et parler.','🇸🇦','green',10,1767225600000);
--> statement-breakpoint
ALTER TABLE `units` ADD `domain_id` text;--> statement-breakpoint
UPDATE `units` SET `domain_id` = 'dom_apprendre' WHERE `domain_id` IS NULL;--> statement-breakpoint
ALTER TABLE `units` DROP COLUMN `color`;--> statement-breakpoint
ALTER TABLE `learning_items` ADD `domain_id` text;--> statement-breakpoint
UPDATE `learning_items` SET `domain_id` = 'dom_apprendre' WHERE `domain_id` IS NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `domain_id` text;
