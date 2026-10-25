import "server-only";
import { setActiveBusiness } from "@saturoom/core/auth";
import { redirect } from "next/navigation";
import { listMyAcademies } from "./academy";
import { academyContext, currentSession, type AcademyContext } from "./context";
import { db } from "./db";
import { AppError } from "./errors";

/**
 * Dipakai layout halaman aplikasi: memastikan ada sesi dan akademi aktif yang sah.
 * Belum login: ke /masuk. Belum punya akademi: ke /mulai. Punya beberapa tapi belum memilih:
 * ke /pilih-akademi. Tepat satu: langsung dipilih.
 */
export async function requireAcademyPage(): Promise<AcademyContext> {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  try {
    return await academyContext();
  } catch (error) {
    if (!(error instanceof AppError && error.code === "no_academy")) throw error;
  }
  const mine = await listMyAcademies(session.userId);
  if (mine.length === 0) redirect("/mulai");
  if (mine.length > 1) redirect("/pilih-akademi");
  await setActiveBusiness(db(), session.sessionId, mine[0]!.id);
  redirect("/");
}
