import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage, isAbortError } from '@/lib/errors';

export type PaginatedFetcher<T> = (offset: number, limit: number) => Promise<T[]>;

type Options<T> = {
  /** Changes to this key reset the list and reload page zero. */
  queryKey: string;
  fetchPage: PaginatedFetcher<T>;
  pageSize?: number;
  enabled?: boolean;
  getId?: (item: T) => string;
  /** External revision bump, e.g. catalogue sync or library mutations. */
  revision?: number;
};

type Result<T> = {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
};

const defaultGetId = <T,>(item: T): string => {
  if (item && typeof item === 'object' && 'id' in item) {
    return String((item as { id: unknown }).id);
  }
  return JSON.stringify(item);
};

export function usePaginatedList<T>(options: Options<T>): Result<T> {
  const {
    queryKey,
    fetchPage,
    pageSize = 24,
    enabled = true,
    getId = defaultGetId,
    revision = 0,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const requestIdRef = useRef(0);
  const itemsRef = useRef<T[]>([]);
  const loadingMoreRef = useRef(false);
  const fetchRef = useRef(fetchPage);
  const getIdRef = useRef(getId);
  const mountedRef = useRef(true);

  useEffect(() => {
    fetchRef.current = fetchPage;
  }, [fetchPage]);

  useEffect(() => {
    getIdRef.current = getId;
  }, [getId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadPage = useCallback(
    async (offset: number, mode: 'initial' | 'refresh' | 'more') => {
      if (!enabled) return;
      if (mode === 'more' && (loadingMoreRef.current || !hasMore)) return;

      const requestId = ++requestIdRef.current;
      if (mode === 'initial') {
        setLoading(true);
        setError(null);
      } else if (mode === 'refresh') {
        setRefreshing(true);
        setError(null);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      try {
        const page = await fetchRef.current(offset, pageSize);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        if (mode === 'more') {
          setItems((previous) => {
            const seen = new Set(previous.map((item) => getIdRef.current(item)));
            const appended = page.filter((item) => !seen.has(getIdRef.current(item)));
            return [...previous, ...appended];
          });
        } else {
          setItems(page);
        }

        setHasMore(page.length === pageSize);
        setError(null);
      } catch (loadError) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        if (!isAbortError(loadError)) {
          setError(getErrorMessage(loadError, 'This list could not be loaded.'));
          if (mode !== 'more') {
            setItems([]);
          }
        }
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
        loadingMoreRef.current = false;
      }
    },
    [enabled, hasMore, pageSize],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setItems([]);
    itemsRef.current = [];
    setHasMore(true);
    void loadPage(0, 'initial');
    // queryKey and revision are intentional reset triggers. loadPage is
    // recreated when hasMore changes, which must not reload the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, enabled, revision]);

  const refresh = useCallback(async () => {
    await loadPage(0, 'refresh');
  }, [loadPage]);

  const reload = useCallback(async () => {
    await loadPage(0, 'initial');
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || refreshing || loadingMoreRef.current || !hasMore) return;
    await loadPage(itemsRef.current.length, 'more');
  }, [hasMore, loadPage, loading, refreshing]);

  return { items, loading, refreshing, loadingMore, error, hasMore, refresh, loadMore, reload };
}
