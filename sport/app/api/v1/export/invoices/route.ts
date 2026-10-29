import { AppError } from "@/server/errors";
import { academyContext } from "@/server/context";
import { csvResponse } from "@/server/csv";
import { monthSummary } from "@/server/fees";
import { route } from "@/server/http";

const STATUS = { unpaid: "Belum bayar", paid: "Lunas", waived: "Dibebaskan" } as const;
const METHOD = { cash: "Tunai", transfer: "Transfer", other: "Lainnya" } as const;

export const GET = route(async (req) => {
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AppError(422, "validation", "Pilih bulan.");
  const s = await monthSummary(await academyContext(), month);
  return csvResponse(
    `iuran-${month}.csv`,
    ["Nama", "Tim", "Nominal", "Status", "Cara bayar", "Tanggal bayar", "Wali", "HP wali"],
    s.invoices.map((i) => [
      i.fullName, i.teamNames, i.amount, STATUS[i.status], i.method ? METHOD[i.method] : null, i.paidOn, i.guardianName, i.guardianPhone,
    ]),
  );
});
