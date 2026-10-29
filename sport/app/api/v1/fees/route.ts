import { TeamFeeInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { listTeamFees, setTeamFee } from "@/server/fees";
import { body, noContent, ok, route } from "@/server/http";

export const GET = route(async () => ok({ fees: await listTeamFees(await academyContext()) }));

/** Mengatur tarif iuran bulanan satu tim. */
export const PUT = route(async (req) => {
  const { teamId, amount } = await body(req, TeamFeeInput);
  await setTeamFee(await academyContext(), teamId, amount);
  return noContent();
});
