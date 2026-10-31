import { AcademyLogoInput } from "@/lib/schemas";
import { setAcademyLogo } from "@/server/academy";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";

export const PUT = route(async (req) => {
  const ctx = await academyContext();
  await setAcademyLogo(ctx, (await body(req, AcademyLogoInput)).logoUrl);
  return noContent();
});
