"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Field } from "./ui/field";

export function PasswordField(props: Omit<ComponentProps<typeof Field>, "type" | "trailing">) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={show}
          className="grid size-10 place-items-center rounded-xl text-ink-soft transition hover:bg-mist hover:text-ink"
        >
          {show ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      }
    />
  );
}
