import { NextResponse, type NextRequest } from "next/server";

/** Pengunjung tanpa sesi yang membuka "/" melihat halaman perkenalan, bukan formulir masuk. */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has("__Host-sr_fnb") || request.cookies.has("sr_fnb");
  if (signedIn) return NextResponse.next();
  return NextResponse.rewrite(new URL("/selamat-datang", request.url));
}

export const config = { matcher: "/" };
