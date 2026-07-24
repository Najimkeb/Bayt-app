import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Proxy « même origine » vers le Worker API, via **Service Binding**.
 *
 * Le front et l'API sont deux Workers du même `*.workers.dev` : ils ne peuvent
 * pas se joindre par leur URL publique (erreur 1042). On passe donc par le
 * binding `API` (worker-to-worker, cf. `wrangler.jsonc`).
 *
 * Le navigateur ne parle qu'au front : ce handler relaie tout `/api/*` vers
 * l'API et **renvoie la réponse telle quelle** — `Set-Cookie` compris, que le
 * navigateur attribue alors à l'hôte du front (cookie **first-party**).
 *
 * Mapping :
 * - **auth** — `/api/auth/*` est **conservé** (→ `<API>/api/auth/*`), car Better
 *   Auth est monté à `/api/auth` sur le Worker API. Le client Better Auth appelle
 *   des chemins **absolus** (`/api/auth/…`) : le suffixe `/api` de sa `baseURL` est
 *   ignoré par la résolution d'URL. Sans ce cas, on retirerait `/api` → `<API>/auth/*`
 *   → la garde d'auth répond 401 « unauthorized » (sans `code`) → message générique.
 * - **app** — tout le reste retire le préfixe : `/api/reviews` → `<API>/reviews`.
 */

/** Chemin à joindre côté Worker API. Conserve `/api/auth/*`, retire `/api` ailleurs. */
function toApiPath(pathname: string): string {
  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
    return pathname; // route d'auth : conservée telle quelle
  }

  return pathname.replace(/^\/api/, ''); // route app : préfixe retiré
}

/** En-têtes à ne pas retransmettre tels quels vers l'amont. */
const STRIPPED_REQUEST_HEADERS = new Set(['host', 'content-length', 'connection']);

/** Le binding de service exposé par Cloudflare (sous-ensemble utilisé). */
interface ServiceBinding {
  fetch(request: Request): Promise<Response>;
}

async function proxy(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const api = (env as unknown as { API?: ServiceBinding }).API;
  if (api === undefined) {
    return new Response('Service API indisponible', { status: 502 });
  }

  const incoming = new URL(request.url);
  const path = toApiPath(incoming.pathname);
  // L'hôte est ignoré par le Service Binding : seul le chemin compte pour l'API.
  const target = `https://api.internal${path}${incoming.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = await api.fetch(
    new Request(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
      ...(hasBody ? { duplex: 'half' } : {}),
    } as RequestInit & { duplex?: 'half' }),
  );

  // Réponse de l'amont sans réécriture : `Set-Cookie` inclus.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;

/** Le proxy dépend de la requête entrante : jamais de mise en cache statique. */
export const dynamic = 'force-dynamic';
