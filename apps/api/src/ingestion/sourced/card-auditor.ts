import { z } from 'zod';

import { extractJson } from '../card-schema.js';
import type { LLMProvider } from '../llm/provider.js';
import type { SourcedCard } from './sourced-card-schema.js';

/**
 * Agent « Auditeur critique » — **double passe** anti-hallucination.
 *
 * Relit chaque carte en vérifiant qu'elle est bien **soutenue par son extrait
 * source**, et l'annote : `ok` / `to_verify` / `unsupported`, avec une
 * justification courte. C'est un second regard indépendant de la génération.
 */

/** Verdict d'audit d'une carte. */
export type AuditVerdict = 'ok' | 'to_verify' | 'unsupported';

/** Annotation d'audit pour une carte. */
export interface CardAudit {
  readonly verdict: AuditVerdict;
  readonly reason: string;
}

const auditSchema = z.object({
  audits: z.array(
    z.object({
      index: z.number().int().min(0),
      verdict: z.enum(['ok', 'to_verify', 'unsupported']),
      reason: z.string().trim().max(300),
    }),
  ),
});

const AUDIT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    audits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          verdict: { type: 'string', enum: ['ok', 'to_verify', 'unsupported'] },
          reason: { type: 'string' },
        },
        required: ['index', 'verdict', 'reason'],
      },
    },
  },
  required: ['audits'],
};

const SYSTEM_PROMPT = [
  "Tu es un auditeur critique. Pour chaque carte (question/réponse) et l'extrait",
  'source associé, juge si la réponse est RÉELLEMENT soutenue par cet extrait :',
  '- "ok" : la réponse est directement soutenue par l\'extrait ;',
  '- "to_verify" : plausible mais l\'extrait ne suffit pas à la confirmer ;',
  '- "unsupported" : la réponse contredit l\'extrait ou n\'en découle pas.',
  'Donne une justification courte. Sois sévère : dans le doute, "to_verify".',
  'Réponds UNIQUEMENT en JSON : {"audits":[{"index":0,"verdict":"ok","reason":"..."}]}',
].join('\n');

function buildUser(cards: readonly SourcedCard[]): string {
  const blocks = cards
    .map((card, i) =>
      [
        `CARTE ${String(i)} (index ${String(i)})`,
        `Q: ${card.front}`,
        `R: ${card.back}`,
        `Extrait source: """${card.sourceExtract}"""`,
      ].join('\n'),
    )
    .join('\n\n');

  return ['Audite chaque carte ci-dessous.', blocks].join('\n');
}

/** Audit par défaut si l'auditeur échoue : prudence (« à vérifier »). */
const FALLBACK: CardAudit = { verdict: 'to_verify', reason: 'Audit automatique indisponible' };

export class CardAuditor {
  public constructor(private readonly provider: LLMProvider) {}

  /**
   * Annote chaque carte (même ordre que l'entrée). Ne lève jamais : un audit
   * illisible retombe sur « à vérifier » pour toutes les cartes — on n'accorde
   * jamais « ok » par défaut.
   */
  public async audit(cards: readonly SourcedCard[]): Promise<CardAudit[]> {
    if (cards.length === 0) {
      return [];
    }

    let byIndex = new Map<number, CardAudit>();
    try {
      const raw = await this.provider.complete({
        system: SYSTEM_PROMPT,
        user: buildUser(cards),
        schema: AUDIT_JSON_SCHEMA,
      });
      const parsed = auditSchema.safeParse(JSON.parse(extractJson(raw)));
      if (parsed.success) {
        byIndex = new Map(
          parsed.data.audits.map((a) => [a.index, { verdict: a.verdict, reason: a.reason }]),
        );
      }
    } catch {
      // On garde le repli prudent ci-dessous.
    }

    return cards.map((_card, i) => byIndex.get(i) ?? FALLBACK);
  }
}
