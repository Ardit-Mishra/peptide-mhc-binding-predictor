import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { localBackend } from "./local-backend";

/**
 * There is no server. `/api/...` requests are resolved in the browser by
 * `localBackend`, which returns real `Response` objects — so callers, error
 * handling and react-query all behave exactly as they did over the network.
 * Any non-`/api` URL still goes out over `fetch` as normal.
 */
async function request(method: string, url: string, data?: unknown): Promise<Response> {
  if (url.startsWith("/api/") || url === "/health") {
    return localBackend(method, url, data);
  }
  return fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await request(method, url, data);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await request("GET", queryKey.join("/") as string);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
