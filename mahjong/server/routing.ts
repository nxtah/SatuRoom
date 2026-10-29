import "server-only";
import { setActiveBusiness } from "@saturoom/core/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { currentSession, loadVenueContext, venueContext, type VenueContext } from "./context";
import { db } from "./db";
import { AppError } from "./errors";
import { myInvitations } from "./staff";
import { listMyVenues } from "./venue";

/**
 * Dipakai layout halaman aplikasi: memastikan ada sesi dan tempat aktif yang sah.
 * Belum login: ke /masuk. Belum jadi staf: ke /undangan bila ada undangan, selain itu ke /mulai.
 * Punya beberapa tempat tapi belum memilih: ke /pilih-tempat. Tepat satu: langsung dipilih.
 */
export const requireVenuePage = cache(async (): Promise<VenueContext> => {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  try {
    return await venueContext();
  } catch (error) {
    if (!(error instanceof AppError && error.code === "no_venue")) throw error;
  }
  const mine = await listMyVenues(session.userId);
  if (mine.length === 0) {
    if ((await myInvitations(session.userId)).length) redirect("/undangan");
    redirect("/mulai");
  }
  if (mine.length > 1) redirect("/pilih-tempat");
  await setActiveBusiness(db(), session.sessionId, mine[0]!.id);
  return loadVenueContext({ ...session, activeBusinessId: mine[0]!.id });
});

/** Halaman yang butuh izin tertentu; tanpa izin dikembalikan ke Beranda. */
export async function requirePage(permission: Parameters<VenueContext["can"]>[0]): Promise<VenueContext> {
  const ctx = await requireVenuePage();
  if (!ctx.can(permission)) redirect("/");
  return ctx;
}
