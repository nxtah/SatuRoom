import type { AttendanceStatus } from "@/lib/schemas";

/** Warna tetap per status, dipakai di lembar absensi, riwayat, dan rekap. */
export const STATUS_STYLE: Record<AttendanceStatus, { on: string; dot: string }> = {
  present: { on: "bg-turf text-white border-turf", dot: "bg-turf" },
  excused: { on: "bg-sun text-ink border-sun", dot: "bg-sun" },
  sick: { on: "bg-[#7a8cff] text-white border-[#7a8cff]", dot: "bg-[#7a8cff]" },
  absent: { on: "bg-[#d92d20] text-white border-[#d92d20]", dot: "bg-[#d92d20]" },
};
