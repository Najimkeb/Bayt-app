import { Suspense, type ReactElement } from 'react';

import { ExplainScreen } from '@/components/explain/explain-screen';

/**
 * Mode « Explique à BAYT » — l'apprenant explique, BAYT évalue.
 *
 * `Suspense` borne `useSearchParams` (sujet/carte reliée passés en query).
 */
export default function ExpliquePage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <ExplainScreen />
    </Suspense>
  );
}
