import { useCallback, useEffect, useRef, useState } from "react";
import { getInstanceStatus } from "@/lib/api";

interface UseInstanceStatusReturn {
  status: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useInstanceStatus(
  token: string | null,
  interval = 1000,
): UseInstanceStatusReturn {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const poll = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const result = await getInstanceStatus(token);
      setStatus(result.status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus(null);
      return;
    }

    poll();

    const id = setInterval(() => {
      if (statusRef.current === "connected") return;
      poll();
    }, interval);

    return () => clearInterval(id);
  }, [token, interval, poll]);

  return { status, isLoading, error };
}
