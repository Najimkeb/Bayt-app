import { normalizeText } from '../exercises/validation.js';

import type {
  BuildQuizOptions,
  QuizQuestion,
  QuizSourceItem,
  QuizType,
} from './types.js';

/**
 * Construit un quiz à partir des cartes EXISTANTES d'un domaine — **jamais de
 * génération IA**, jamais d'écriture FSRS.
 *
 * ## Cohérence FSRS (décision d'architecture)
 * Le quiz est **read-only** vis-à-vis de la mémoire long terme : il LIT les
 * `learning_items` (source unique de contenu, aucun système parallèle) mais
 * n'écrit **ni `scheduling_state` ni `review_log`**. Un quiz est à la demande et
 * illimité : le laisser piloter FSRS permettrait de « bachoter » et fausserait
 * l'espacement calibré. Le pont vers la mémoire reste **explicite** (bouton
 * « réviser » qui entre dans la vraie boucle de révision). Cf. lessons.md L021/L024.
 *
 * Fonction **pure** : le hasard est injecté (`rng`), donc déterministe et testable.
 */

/** Nombre d'options d'un QCM (1 bonne + 3 distracteurs). */
const MCQ_OPTIONS = 4;

/** Mélange (Fisher-Yates) piloté par le générateur injecté. */
function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }

  return out;
}

/** Distracteurs : réponses d'AUTRES cartes, distinctes de la bonne (comparaison normalisée). */
function distractorsFor(
  correct: string,
  pool: readonly QuizSourceItem[],
  rng: () => number,
  n: number,
): string[] {
  const seen = new Set([normalizeText(correct)]);
  const out: string[] = [];
  for (const item of shuffle(pool, rng)) {
    const key = normalizeText(item.back);
    if (key === '' || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item.back);
    if (out.length >= n) {
      break;
    }
  }

  return out;
}

/** Construit une question d'un type donné pour une carte, ou `null` si impossible. */
function buildQuestion(
  item: QuizSourceItem,
  others: readonly QuizSourceItem[],
  type: QuizType,
  rng: () => number,
): QuizQuestion | null {
  if (type === 'mcq') {
    const distractors = distractorsFor(item.back, others, rng, MCQ_OPTIONS - 1);
    // Sans assez de distracteurs distincts, le QCM n'a pas de sens → on renonce.
    if (distractors.length < MCQ_OPTIONS - 1) {
      return null;
    }
    const options = shuffle([item.back, ...distractors], rng);

    return {
      id: item.id,
      itemId: item.id,
      kind: 'mcq',
      prompt: item.front,
      options,
      answerIndex: options.findIndex((o) => o === item.back),
      correctAnswer: item.back,
    };
  }

  if (type === 'true_false') {
    // 50/50 : soit la vraie réponse, soit celle d'une autre carte (fausse).
    const wrong = distractorsFor(item.back, others, rng, 1)[0];
    const showTrue = wrong === undefined || rng() < 0.5;

    return {
      id: item.id,
      itemId: item.id,
      kind: 'true_false',
      prompt: item.front,
      statement: showTrue ? item.back : wrong,
      isTrue: showTrue,
      correctAnswer: item.back,
    };
  }

  return {
    id: item.id,
    itemId: item.id,
    kind: 'fill_blank',
    prompt: item.front,
    answer: item.back,
    correctAnswer: item.back,
  };
}

/** Ordre de repli quand un type demandé n'est pas réalisable pour une carte. */
const FALLBACK_ORDER: readonly QuizType[] = ['true_false', 'fill_blank', 'mcq'];

/**
 * Construit jusqu'à `count` questions à partir des cartes fournies.
 *
 * Chaque carte donne au plus une question ; le type est tiré parmi ceux
 * autorisés, avec repli si un type n'est pas réalisable (ex. QCM sans assez de
 * distracteurs). Le nombre de questions est borné par le nombre de cartes.
 */
export function buildQuiz(
  items: readonly QuizSourceItem[],
  options: BuildQuizOptions,
  rng: () => number,
): QuizQuestion[] {
  const usable = items.filter(
    (i) => normalizeText(i.front) !== '' && normalizeText(i.back) !== '',
  );
  const allowed = options.types.length > 0 ? options.types : (['mcq', 'true_false', 'fill_blank'] as const);
  const chosen = shuffle(usable, rng).slice(0, Math.max(0, options.count));

  const questions: QuizQuestion[] = [];
  for (const item of chosen) {
    const others = usable.filter((i) => i.id !== item.id);
    // Type préféré (tiré au sort parmi les autorisés), puis replis. `fill_blank`
    // (toujours réalisable) est en dernier recours pour ne jamais perdre une carte,
    // même si le type demandé est impossible (petit domaine → QCM sans distracteurs).
    const preferred = shuffle(allowed, rng)[0] as QuizType;
    const order = [...new Set<QuizType>([preferred, ...allowed, ...FALLBACK_ORDER])];

    for (const type of order) {
      const question = buildQuestion(item, others, type, rng);
      if (question !== null) {
        questions.push(question);
        break;
      }
    }
  }

  return questions;
}
