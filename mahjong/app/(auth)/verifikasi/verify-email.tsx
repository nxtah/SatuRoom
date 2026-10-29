"use client";

import { useEffect, useRef, useState } from "react";
import { Maskot } from "@/components/maskot";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";

/**
 * Konfirmasi dijalankan oleh JavaScript, bukan saat halaman dimuat di server: pemindai link di
 * layanan email (yang tidak menjalankan JS) tidak ikut "memakai" link sekali-pakai ini.
 */
export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<"working" | "done" | "failed">(token ? "working" : "failed");
  const [message, setMessage] = useState("Link konfirmasi tidak lengkap. Buka lagi link dari email.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void api("/auth/verify-email", { body: { token } }).then((r) => {
      if (r.ok) setState("done");
      else {
        setMessage(r.error.message);
        setState("failed");
      }
    });
  }, [token]);

  if (state === "working") {
    return (
      <p role="status" className="text-center text-ink-soft">
        Mengonfirmasi email…
      </p>
    );
  }
  if (state === "failed") {
    return (
      <div className="rise grid gap-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Link tidak bisa dipakai</h1>
        <Alert tone="error">{message}</Alert>
        <ButtonLink href="/masuk" variant="dark">
          Ke halaman masuk
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="rise text-center">
      <div className="pop mx-auto w-36">
        <Maskot />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Email Anda sudah dikonfirmasi</h1>
      <p className="mt-3 text-ink-soft">Akun siap. Masuk untuk mulai menyiapkan tempat.</p>
      <ButtonLink href="/masuk" className="mt-8">
        Masuk sekarang
      </ButtonLink>
    </div>
  );
}
