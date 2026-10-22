import { useCallback, useEffect, useState } from "react";
import { api, type CareLine, type Professional } from "@/lib/api";

/** Busca simples com estado de carregamento e erro. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
}

export function useCareLines() {
  return useAsync<CareLine[]>(() => api.listCareLines(), []);
}

export function useProfessionals() {
  return useAsync<Professional[]>(() => api.listProfessionals(), []);
}

/** Menor preço de consulta entre as linhas ativas (para "a partir de"). */
