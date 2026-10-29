import { ageOf } from "@/lib/age";
import { academyContext } from "@/server/context";
import { csvResponse } from "@/server/csv";
import { route } from "@/server/http";
import { listPlayers } from "@/server/players";

export const GET = route(async () => {
  const rows = await listPlayers(await academyContext(), { status: "active" });
  return csvResponse(
    "pemain.csv",
    ["Nama", "Tanggal lahir", "Usia", "Posisi", "No. punggung", "Tim"],
    rows.map((p) => [p.fullName, p.birthDate, ageOf(p.birthDate), p.position, p.shirtNumber, p.teams.map((t) => t.name).join("; ")]),
  );
});
