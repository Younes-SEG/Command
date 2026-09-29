'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EditorKind, EditorState, EntityKind, Workspace } from '@/lib/types';
interface WorkspaceContextValue {
  data: Workspace;
  now: Date;
  editor: EditorState | null;
  save: (kind: EntityKind, input: Record<string, unknown>, id?: string) => Promise<void>;
  remove: (kind: EntityKind, id: string) => Promise<void>;
  refresh: () => Promise<void>;
  openEditor: (kind: EditorKind, id?: string, defaults?: Record<string, unknown>) => void;
  closeEditor: () => void;
}
const Context = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({
  initialData,
  initialNow,
  children,
}: {
  initialData: Workspace;
  initialNow: number;
  children: ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(() => new Date(initialNow));
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState('');
  const requestNumber = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark =
        data.settings.theme === 'DARK' || (data.settings.theme === 'SYSTEM' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [data.settings.theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const refresh = useCallback(async () => {
    const number = ++requestNumber.current;
    const response = await fetch('/api/workspace', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to refresh your workspace. Please retry.');
    const value: Workspace = await response.json();
    if (number === requestNumber.current) {
      setData(value);
      setNow(new Date());
    }
  }, []);
  const mutate = useCallback(
    async (kind: EntityKind, method: string, input?: Record<string, unknown>, id?: string) => {
      const response = await fetch(`/api/${kind}${id ? `/${encodeURIComponent(id)}` : ''}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: input ? JSON.stringify(input) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || 'This change could not be saved. Please try again.');
      try {
        await refresh();
      } catch {
        window.location.reload();
        return;
      }
      setNotice(method === 'DELETE' ? 'Deleted from your workspace' : 'Saved to your workspace');
    },
    [refresh],
  );
  const save = useCallback(
    (kind: EntityKind, input: Record<string, unknown>, id?: string) =>
      mutate(kind, id ? 'PATCH' : 'POST', input, id),
    [mutate],
  );
  const remove = useCallback(
    (kind: EntityKind, id: string) => mutate(kind, 'DELETE', undefined, id),
    [mutate],
  );
  const openEditor = useCallback(
    (kind: EditorKind, id?: string, defaults?: Record<string, unknown>) =>
      setEditor({ kind, id, defaults }),
    [],
  );
  const closeEditor = useCallback(() => setEditor(null), []);
  return (
    <Context.Provider value={{ data, now, editor, save, remove, refresh, openEditor, closeEditor }}>
      {children}
      <div role="status" aria-live="polite" className={notice ? 'toast visible' : 'toast'}>
        {notice && (
          <>
            <span className="toast-check">✓</span>
            {notice}
          </>
        )}
      </div>
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkspaceProvider is required');
  return value;
}
