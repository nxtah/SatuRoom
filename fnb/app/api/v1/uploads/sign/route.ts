import { NextResponse } from "next/server";
import { UploadSignInput } from "@/lib/schemas";
import { signUpload } from "@/server/cloudinary";
import { body, route } from "@/server/http";

export const POST = route(async (req, ctx) => NextResponse.json(signUpload(ctx, (await body(req, UploadSignInput)).kind)));
