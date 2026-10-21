import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'new'; customerId?: number }
  | { name: 'contracts' }
  | { name: 'customers' }
  | { name: 'contract'; id: number }
  | { name: 'editContract'; id: number }
  | { name: 'customer'; id: number }
  | { name: 'sent' }
  | { name: 'settings' };

export type TabName = 'today' | 'new' | 'contracts' | 'customers' | 'settings';

interface ConfirmOptions { title: string; body?: string; yes: string; no?: string }

interface AppCtx {
  route: Route;
  tab: TabName;
  canGoBack: boolean;
  go(route: Route): void;
  tabTo(route: Route & { name: TabName }): void;
  back(): void;
  toast(message: string, kind?: 'ok' | 'error'): void;
  fail(e: unknown): void;
  confirm(o: ConfirmOptions): Promise<boolean>;
}

const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(Ctx);

/** 화면 이동은 '쌓기' 방식: 탭을 누르면 처음부터, 상세 화면은 위에 쌓고 '돌아가기'로 하나씩 뺀다. */
export function AppProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'today' }]);
  const [toastMsg, setToast] = useState<{ message: string; kind: 'ok' | 'error' } | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<number>(undefined);

  const toast = useCallback((message: string, kind: 'ok' | 'error' = 'ok') => {
    setToast({ message, kind });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 5000 : 2500);
  }, []);

  const fail = useCallback((e: unknown) => toast(String((e as Error)?.message ?? e), 'error'), [toast]);
  const go = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const tabTo = useCallback((r: Route) => setStack([r]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);

  const value = useMemo<AppCtx>(() => ({
    route: stack[stack.length - 1],
    tab: stack[0].name as TabName,
    canGoBack: stack.length > 1,
    go, tabTo, back, toast, fail, confirm
  }), [stack, go, tabTo, back, toast, fail, confirm]);

  useEffect(() => { window.scrollTo(0, 0); }, [stack]);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {dialog && (
        <div className="overlay" onClick={() => close(false)}>
          <div className="dialog" role="alertdialog" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
            <div id="dlg-title" className="dialog-title">{dialog.title}</div>
            {dialog.body && <div style={{ color: 'var(--ink-2)' }}>{dialog.body}</div>}
            <div className="row">
              <button type="button" className="btn warn" autoFocus onClick={() => close(true)}>{dialog.yes}</button>
              <button type="button" className="btn plain" onClick={() => close(false)}>{dialog.no ?? '아니요'}</button>
            </div>
          </div>
        </div>
      )}
      {toastMsg && <div role="status" className={`toast ${toastMsg.kind}`}>{toastMsg.message}</div>}
    </Ctx.Provider>
  );
}

/** 불러오기 + 다시 불러오기 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; reload: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const { fail } = useApp();
  const reload = useCallback(async () => {
    try {
      setData(await load());
    } catch (e) {
      fail(e);
    }
  }, deps);
  useEffect(() => { void reload(); }, [reload]);
  return { data, reload };
}
