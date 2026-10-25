import "server-only";
import { cache } from "react";
import { setActiveBusiness } from "@saturoom/core/auth";
import { redirect } from "next/navigation";
import { listMyAcademies } from "./academy";
import { academyContext, currentSession, loadAcademyContext, type AcademyContext } from "./context";
import { db } from "./db";
import { hasChildren, myGuardianInvitations } from "./guardian";
import { myInvitations } from "./staff";
import { AppError } from "./errors";

/**
 * Dipakai layout halaman aplikasi: memastikan ada sesi dan akademi aktif yang sah.
 * Belum login: ke /masuk. Belum punya akademi: ke /undangan bila ada undangan, ke /wali bila
 * terhubung sebagai orang tua, selain itu ke /mulai. Punya beberapa tapi belum memilih:
 * ke /pilih-akademi. Tepat satu: langsung dipilih.
 */
export const requireAcademyPage = cache(async (): Promise<AcademyContext> => {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  try {
    return await academyContext();
  } catch (error) {
    if (!(error instanceof AppError && error.code === "no_academy")) throw error;
  }
  const mine = await listMyAcademies(session.userId);
  if (mine.length === 0) {
    const [staffInvites, guardianInvites, children] = await Promise.all([
      myInvitations(session.userId),
      myGuardianInvitations(session.userId),
      hasChildren(session.userId),
    ]);
    if (staffInvites.length || guardianInvites.length) redirect("/undangan");
    redirect(children ? "/wali" : "/mulai");
  }
  if (mine.length > 1) redirect("/pilih-akademi");
  // Tepat satu akademi: pilih langsung dan lanjut. Tanpa redirect ke halaman yang sama,
  // yang membuat router Next.js memuat ulang tanpa henti.
  await setActiveBusiness(db(), session.sessionId, mine[0]!.id);
  return loadAcademyContext({ ...session, activeBusinessId: mine[0]!.id });
});
