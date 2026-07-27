import {
  Accessibility,
  BarChart3,
  BookOpen,
  Brain,
  Globe,
  Languages,
  Layers,
  Library,
  MessageCircle,
  Megaphone,
  Rocket,
  Shapes,
  ShieldCheck,
  Sigma,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Mapping **nom d'icône → composant lucide-react**.
 *
 * La base ne stocke qu'un nom (colonne `domains.icon`) ; le front le résout ici.
 * Ajouter une icône = déposer une ligne, sans toucher au reste. `Shapes` sert de
 * repli pour tout nom inconnu (jamais d'écran vide).
 */
const ICONS: Record<string, LucideIcon> = {
  // Domaines du catalogue.
  Brain,
  Megaphone,
  Rocket,
  BarChart3,
  TrendingUp,
  Sigma,
  Accessibility,
  ShieldCheck,
  BookOpen,
  Globe,
  Languages,
  // Cartes de l'accueil (révision, bibliothèque, explique, quiz).
  Layers,
  Library,
  MessageCircle,
  Zap,
};

/** Composant d'icône pour un nom donné (repli `Shapes` si inconnu). */
export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Shapes;
}
