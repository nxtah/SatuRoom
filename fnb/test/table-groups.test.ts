import { describe, expect, it } from "vitest";
import { archiveTableGroup, listTableGroups, saveTableGroup } from "@/server/table-groups";
import { createTable, listTables } from "@/server/tables";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

describe("grup meja", () => {
  it("mengelompokkan meja, menolak nama ganda, dan melepas meja saat grup dihapus", async () => {
    const biz = await businessOf(`Kafe Grup ${Math.random()}`);
    const { id: indoor } = await saveTableGroup(biz.ctx, { name: "Indoor", sortOrder: 1 });
    await rejects(saveTableGroup(biz.ctx, { name: "indoor", sortOrder: 2 }), "duplicate");
    await createTable(biz.ctx, { name: "A1", capacity: 4, groupId: indoor });
    await createTable(biz.ctx, { name: "B1", capacity: 2 });
    const tables = await listTables(biz.ctx);
    expect(tables.find((t) => t.name === "A1")).toMatchObject({ groupName: "Indoor" });
    expect((await listTableGroups(biz.ctx))[0]).toMatchObject({ name: "Indoor", tableCount: 1 });
    await archiveTableGroup(biz.ctx, indoor);
    expect((await listTables(biz.ctx)).every((t) => t.groupId === null)).toBe(true);
  });

  it("menolak grup milik bisnis lain dan peran tanpa izin", async () => {
    const a = await businessOf(`Kafe A ${Math.random()}`);
    const b = await businessOf(`Kafe B ${Math.random()}`);
    const { id } = await saveTableGroup(a.ctx, { name: "VIP", sortOrder: 0 });
    await rejects(createTable(b.ctx, { name: "X1", groupId: id }), "invalid");
    const cashier = await staffOf(a, ["cashier"]);
    await rejects(saveTableGroup(cashier, { name: "Curang", sortOrder: 0 }), "forbidden");
  });
});
