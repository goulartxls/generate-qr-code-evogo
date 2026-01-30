import { useCallback, useState } from "react";

const STORAGE_KEY = "instance-token";

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setTokenState(newToken);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
  }, []);

  return {
    token,
    setToken,
    clearToken,
    isAuthenticated: token !== null,
  } as const;
}
