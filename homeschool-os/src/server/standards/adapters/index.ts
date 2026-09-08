import type { SourceAdapter } from '../types';
import { floridaBestMathematicsAdapter } from './florida-best-mathematics';
import { floridaBestStructuredAdapter } from './florida-best-structured';
import { syntheticAdapter } from './synthetic';

/**
 * Three adapters, each because an artifact required it: the state's own
 * structured export (the one that ingested), the delimited-export reader, and
 * the fixture adapter that proves the pipeline without authoritative bytes.
 * Empty adapters for frameworks nobody has asked for would be files describing
 * document layouts nobody has seen.
 *
 * Order matters only in that `supports` is asked in it, and the structured
 * adapter is the one that says yes to the artifact Florida actually publishes.
 */
export const ADAPTERS: SourceAdapter[] = [
  floridaBestStructuredAdapter, floridaBestMathematicsAdapter, syntheticAdapter];

export function adapterByName(name: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.name === name);
}

export { floridaBestStructuredAdapter, floridaBestMathematicsAdapter, syntheticAdapter };
