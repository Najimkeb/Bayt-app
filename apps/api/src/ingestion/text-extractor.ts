import type { DocumentFormat } from './format.js';

/**
 * Extraction du texte d'un document.
 *
 * - texte / Markdown : décodage UTF-8 direct ;
 * - PDF : extraction best-effort (inflate des flux FlateDecode via
 *   `DecompressionStream`, puis lecture des opérateurs de texte). Convient aux
 *   PDF textuels simples ; les PDF scannés ne donnent rien.
 *
 * Point d'extension : Word / PowerPoint viendront s'ajouter dans le `switch`.
 */

/** Erreur : extraction impossible (format non géré, ou aucun texte). */
export class ExtractionError extends Error {
  public override readonly name = 'ExtractionError';
}

export async function extractText(bytes: Uint8Array, format: DocumentFormat): Promise<string> {
  switch (format) {
    case 'text':
    case 'markdown':
      return new TextDecoder('utf-8').decode(bytes);

    case 'pdf':
      return extractPdfText(bytes);

    case 'word':
    case 'powerpoint':
      throw new ExtractionError(`Extraction ${format} pas encore implémentée`);
  }
}

/** Décompresse un flux zlib (FlateDecode), puis raw deflate en secours. */
async function inflate(data: Uint8Array): Promise<Uint8Array | null> {
  for (const fmt of ['deflate', 'deflate-raw'] as const) {
    try {
      const source = new Response(copyToArrayBuffer(data)).body;
      if (source === null) {
        continue;
      }

      const decompressed = source.pipeThrough(new DecompressionStream(fmt));

      return new Uint8Array(await new Response(decompressed).arrayBuffer());
    } catch {
      // Format suivant.
    }
  }

  return null;
}

/** Copie les octets dans un ArrayBuffer net (évite les vues partielles). */
function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return buffer;
}

/** Décode les chaînes des opérateurs de texte d'un flux de contenu PDF. */
function decodeContentStreams(content: string): string {
  const out: string[] = [];

  // Chaînes littérales `( … )` — présentes dans Tj / TJ / ' / ".
  const literal = /\(((?:\\.|[^\\()])*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = literal.exec(content)) !== null) {
    const raw = match[1] ?? '';
    const text = raw
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      .replace(/\\([()\\])/g, '$1');

    if (text.trim() !== '') {
      out.push(text);
    }
  }

  return out.join(' ');
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // On parcourt les octets en latin1 pour repérer la structure sans casser le binaire.
  const latin1 = new TextDecoder('latin1').decode(bytes);
  const pieces: string[] = [];

  const streamRe = /stream\r?\n/g;
  let start: RegExpExecArray | null;

  while ((start = streamRe.exec(latin1)) !== null) {
    const from = start.index + start[0].length;
    const end = latin1.indexOf('endstream', from);
    if (end === -1) {
      break;
    }

    const header = latin1.slice(Math.max(0, start.index - 400), start.index);
    const rawSlice = bytes.subarray(from, end);

    if (/FlateDecode/.test(header)) {
      const inflated = await inflate(rawSlice);
      if (inflated !== null) {
        pieces.push(decodeContentStreams(new TextDecoder('latin1').decode(inflated)));
      }
    } else {
      pieces.push(decodeContentStreams(latin1.slice(from, end)));
    }

    streamRe.lastIndex = end;
  }

  const text = pieces.join('\n').replace(/[ \t]{2,}/g, ' ').trim();

  if (text.length < 20) {
    throw new ExtractionError('Aucun texte exploitable extrait du PDF');
  }

  return text;
}
