import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const style = {
    error: "bg-[#fdecec] text-[#912018]",
    success: "bg-turf-soft text-pitch",
    info: "bg-ember-soft text-ember-deep",
  }[tone];
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-3 rounded-xl p-4 text-sm font-semibold ${style}`}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
