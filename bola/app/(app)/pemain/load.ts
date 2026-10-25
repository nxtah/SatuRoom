import "server-only";
import { notFound } from "next/navigation";
import type { AcademyContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { getPlayer } from "@/server/players";

/** Pemain yang tidak ada atau di luar cakupan peminta tampil sebagai 404. */
export function loadPlayer(ctx: AcademyContext, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return getPlayer(ctx, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
}
