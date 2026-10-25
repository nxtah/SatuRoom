"use client";

import { useState } from "react";
import type { z } from "zod";
import { api, type ApiFailure } from "./api";

/**
 * Status form standar: validasi di browser dengan aturan yang sama seperti server, lalu kirim.
 * Error per kolom dari server ditampilkan di kolom yang sama.
 */
export function useForm<S extends z.ZodType>(schema: S) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<ApiFailure>();
  const [pending, setPending] = useState(false);

  async function submit<T>(
    raw: unknown,
    request: (input: z.infer<S>) => ReturnType<typeof api<T>>,
  ): Promise<{ data: T } | undefined> {
    setError(undefined);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message;
      setFields(next);
      return undefined;
    }
    setFields({});
    setPending(true);
    const result = await request(parsed.data);
    setPending(false);
    if (!result.ok) {
      setFields(result.error.fields ?? {});
      setError(result.error);
      return undefined;
    }
    return { data: result.data };
  }

  return { fields, error, pending, submit, setError };
}

export const formValues = (form: HTMLFormElement) => Object.fromEntries(new FormData(form));
