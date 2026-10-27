import "server-only";
import { createDb, type Db } from "@saturoom/core/db";
import { env } from "./env";
const g=globalThis as unknown as { __fnbDb?: Db };
export const db=()=>g.__fnbDb ??= createDb(env().DATABASE_URL).db;
