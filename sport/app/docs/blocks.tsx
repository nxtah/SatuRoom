import type { Block } from "@/lib/docs-content";

/** **tebal** dan `kode` di dalam teks. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <b key={i} className="text-ink">{p.slice(2, -2)}</b>
        ) : p.startsWith("`") ? (
          <code key={i} className="rounded-md bg-mist px-1.5 py-0.5 text-[0.92em] font-semibold">{p.slice(1, -1)}</code>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="grid gap-4">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return <h2 key={i} className="mt-4 text-2xl font-extrabold tracking-tight">{b.text}</h2>;
          case "p":
            return <p key={i} className="leading-relaxed text-ink-soft"><Rich text={b.text} /></p>;
          case "steps":
            return (
              <ol key={i} className="grid gap-2.5">
                {b.items.map((s, j) => (
                  <li key={j} className="flex gap-3 rounded-[1.25rem] bg-chalk p-4">
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-pitch text-sm font-extrabold text-white">{j + 1}</span>
                    <span className="min-w-0 leading-relaxed text-ink-soft"><Rich text={s} /></span>
                  </li>
                ))}
              </ol>
            );
          case "list":
            return (
              <ul key={i} className="grid gap-2 pl-1">
                {b.items.map((s, j) => (
                  <li key={j} className="flex gap-3 leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-turf" />
                    <span className="min-w-0"><Rich text={s} /></span>
                  </li>
                ))}
              </ul>
            );
          case "tip":
            return <p key={i} className="rounded-[1.25rem] bg-turf-soft p-4 leading-relaxed text-ink"><b className="text-turf">Tips: </b><Rich text={b.text} /></p>;
          case "warn":
            return <p key={i} className="rounded-[1.25rem] bg-ember-soft p-4 leading-relaxed text-ink"><b className="text-ember-deep">Perlu diketahui: </b><Rich text={b.text} /></p>;
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-[1.25rem] bg-chalk">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead><tr className="border-b border-line">{b.head.map((h) => <th key={h} className="p-3 font-extrabold">{h}</th>)}</tr></thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-b border-line/60 align-top last:border-0">
                        {r.map((c, k) => <td key={k} className={`p-3 leading-relaxed ${k === 0 ? "font-bold" : "text-ink-soft"}`}><Rich text={c} /></td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "fix":
            return (
              <div key={i} className="grid gap-3">
                {b.items.map((f, j) => (
                  <details key={j} className="group rounded-[1.25rem] bg-chalk p-4 open:ring-2 open:ring-pitch">
                    <summary className="cursor-pointer list-none font-extrabold marker:hidden">
                      <span aria-hidden className="mr-2 text-flame">●</span>
                      <Rich text={f.problem} />
                    </summary>
                    <div className="mt-3 grid gap-2 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
                      <p><b className="text-ink">Kenapa: </b><Rich text={f.cause} /></p>
                      <p><b className="text-turf">Solusi: </b><Rich text={f.fix} /></p>
                    </div>
                  </details>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}
