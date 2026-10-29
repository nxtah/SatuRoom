import { describe, expect, it } from "vitest";
import { csvResponse } from "@/server/csv";

describe("csv", () => {
  it("memberi BOM, mengutip sel berkoma, dan menetralkan rumus", async () => {
    const res = csvResponse("x.csv", ["Nama", "Catatan"], [["Andi, Jr", '=HYPERLINK("x")'], ["Sari", null]]);
    const bytes = new Uint8Array(await res.clone().arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = await res.text();
    expect(text).toContain("Nama,Catatan\r\n");
    expect(text).toContain('"Andi, Jr","\'=HYPERLINK(""x"")"');
    expect(text).toContain("Sari,\r\n");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="x.csv"');
  });
});
