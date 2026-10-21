import type { ApiMethod, PawnApi, PawnBridge } from '../shared/api';

declare global {
  interface Window { pawn: PawnBridge }
}

/** window.pawn.invoke 를 PawnApi 처럼 부를 수 있게 감싼다. 오류 문구에서 Electron 접두어를 떼어 낸다. */
export const api = new Proxy({} as PawnApi, {
  get: (_t, method: ApiMethod) => async (...args: unknown[]) => {
    try {
      return await window.pawn.invoke(method, args);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
      throw new Error(msg);
    }
  }
});

export const photoUrl = (scope: number | 'p', name: string) => `photo://local/${scope}/${encodeURIComponent(name)}`;
