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

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, body, params, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };

  let url = `${API_URL}/api${endpoint}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `API Error: ${res.status}`);
  }

  const json = await res.json();

  // Unwrap TransformInterceptor response format: { data, timestamp }
  // If the response has a `data` property and `timestamp`, it's wrapped
  if (json && typeof json === "object" && "data" in json && "timestamp" in json) {
    return (json as ApiResponse<T>).data;
  }

  return json as T;
}