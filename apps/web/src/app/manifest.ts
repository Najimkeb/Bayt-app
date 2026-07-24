import type { MetadataRoute } from 'next';

/**
 * Manifest PWA — permet « Ajouter à l'écran d'accueil » (iOS/Android) et
 * l'ouverture **plein écran** (`display: standalone`, sans barre de navigateur).
 *
 * Icônes à **fond plein** (générées sur le vert de la charte) : iOS rend la
 * transparence en noir, donc aucun PNG transparent ici.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BAYT',
    short_name: 'BAYT',
    description: 'Apprendre pour de bon — rappel actif, répétition espacée et un mentor bienveillant.',
    start_url: '/',
    display: 'standalone',
    // Aligné sur le crème de l'icône → écran de lancement cohérent (pas de flash blanc).
    background_color: '#faf5ec',
    theme_color: '#58cc02',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
