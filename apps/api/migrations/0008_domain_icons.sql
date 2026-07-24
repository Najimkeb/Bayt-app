-- Le catalogue passe de l'emoji à une icône vectorielle (lucide-react) : on
-- stocke désormais le NOM de l'icône, pas un emoji. Rename in place (préserve la
-- colonne), puis on renseigne le nom lucide de chaque domaine.
ALTER TABLE `domains` RENAME COLUMN `emoji` TO `icon`;--> statement-breakpoint
UPDATE `domains` SET `icon` = 'Brain' WHERE `id` = 'dom_apprendre';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'Megaphone' WHERE `id` = 'dom_comm';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'Rocket' WHERE `id` = 'dom_business';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'BarChart3' WHERE `id` = 'dom_analyst';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'TrendingUp' WHERE `id` = 'dom_economie';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'Sigma' WHERE `id` = 'dom_maths';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'Accessibility' WHERE `id` = 'dom_a11y';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'ShieldCheck' WHERE `id` = 'dom_rgpd';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'BookOpen' WHERE `id` = 'dom_francais';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'Globe' WHERE `id` = 'dom_anglais';--> statement-breakpoint
UPDATE `domains` SET `icon` = 'Languages' WHERE `id` = 'dom_arabe';
