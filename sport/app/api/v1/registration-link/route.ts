import { RegistrationLinkInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { getRegistrationLink, updateRegistrationLink } from "@/server/registrations";

export const GET = route(async () => ok({ link: await getRegistrationLink(await academyContext()) }));

/** Membuat link bila belum ada, menyalakan/mematikan, atau mengganti token. */
export const PUT = route(async (req) => {
  const ctx = await academyContext();
  return ok({ link: await updateRegistrationLink(ctx, await body(req, RegistrationLinkInput)) });
});
