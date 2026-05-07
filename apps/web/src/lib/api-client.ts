const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
  params?: Record<string, string>;
}

/** API response wrapper from TransformInterceptor */
interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    const token = data?.accessToken ?? null;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
    return token;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, body, params, ...fetchOptions } = options;

  let accessToken = token;
  if (!accessToken) {
    accessToken = (await getAccessToken()) ?? undefined;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };

  let url = `${API_URL}/api${endpoint}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const makeRequest = (authToken?: string) =>
    fetch(url, {
      ...fetchOptions,
      headers: {
        ...headers,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let res = await makeRequest(accessToken);

  if (res.status === 401) {
    // Attempt refresh with promise lock to prevent multiple simultaneous refreshes
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      // Refresh failed — logout and redirect
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `API Error: ${res.status}`);
  }

  const json = await res.json();

  if (json && typeof json === "object" && "data" in json && "timestamp" in json) {
    return (json as ApiResponse<T>).data;
  }

  return json as T;
}
