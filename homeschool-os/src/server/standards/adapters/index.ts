import type { SourceAdapter } from '../types';
import { floridaBestMathematicsAdapter } from './florida-best-mathematics';
import { syntheticAdapter } from './synthetic';

/**
 * Two adapters, because two are justified: the one STEP 6 targets and the one
 * that proves the pipeline without an authoritative artifact. Ten empty
 * adapters for frameworks nobody has asked for would be ten files describing
 * document layouts nobody has seen.
 */
export const ADAPTERS: SourceAdapter[] = [floridaBestMathematicsAdapter, syntheticAdapter];

export function adapterByName(name: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.name === name);
}

export { floridaBestMathematicsAdapter, syntheticAdapter };
