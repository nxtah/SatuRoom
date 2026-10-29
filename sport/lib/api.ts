/** Pemanggil API dari browser. Selalu same-origin, dengan header klien untuk lolos cek CSRF. */
export interface ApiFailure {
  code: string;
  message: string;
  fields?: Record<string, string>;
  status: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export async function api<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: { "content-type": "application/json", "x-saturoom-client": "web" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      error: { status: 0, code: "offline", message: "Koneksi terputus. Periksa internet lalu coba lagi." },
    };
  }
  if (res.status === 204) return { ok: true, data: undefined as T };
  const json = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: json as T };
  const err = json?.error;
  return {
    ok: false,
    error: {
      status: res.status,
      code: err?.code ?? "unknown",
      message: err?.message ?? "Terjadi gangguan. Coba lagi.",
      fields: err?.fields,
    },
  };
}
