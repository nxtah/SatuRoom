import { UploadSignInput } from "@/lib/schemas";
import { signUpload } from "@/server/cloudinary";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok(signUpload(ctx, (await body(req, UploadSignInput)).kind));
});
