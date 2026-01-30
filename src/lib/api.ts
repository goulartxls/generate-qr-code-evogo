interface ApiFetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    headers,
    ...rest,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error((body as { message?: string }).message ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function createInstance(name: string): Promise<{ token: string; name: string }> {
  return apiFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getInstanceStatus(token: string): Promise<{ status: string }> {
  const result = await apiFetch<{ data: { Connected: boolean; LoggedIn: boolean } }>("/instance/status", { token });
  const connected = result.data?.Connected && result.data?.LoggedIn;
  return { status: connected ? "connected" : "disconnected" };
}

export async function getInstanceQR(token: string): Promise<{ data: { Qrcode: string; Code: string } }> {
  return apiFetch("/instance/qr", { token });
}

export async function pairInstance(token: string, phone: string): Promise<{ data: { PairingCode: string }; message: string }> {
  return apiFetch("/instance/pair", {
    method: "POST",
    token,
    body: JSON.stringify({ phone }),
  });
}

export async function disconnectInstance(token: string): Promise<void> {
  return apiFetch("/instance/disconnect", { method: "POST", token });
}

export async function logoutInstance(token: string): Promise<void> {
  return apiFetch("/instance/logout", { method: "POST", token });
}
