import { Brand } from "./brand";
import { RuruMark } from "./ruru";
import { AppHeader } from "./app-header";
import { BottomNav, SideNav } from "./nav";

interface Props {
  academyName: string;
  academies: { id: string; name: string }[];
  activeAcademyId: string;
  user: { name: string; email: string };
  roleLabel: string;
  allowed: string[];
  children: React.ReactNode;
}

export function AppShell({ academyName, academies, activeAcademyId, user, roleLabel, allowed, children }: Props) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[92px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-pitch focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke isi
      </a>
      {/* Tablet: rel ikon ringkas. Desktop: sidebar penuh. HP: menu bawah. */}
      <aside className="hidden md:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 overflow-y-auto p-3 lg:p-5">
          <div className="hidden px-2 pt-1 lg:block">
            <Brand />
          </div>
          <div className="mx-auto pt-3 lg:hidden">
            <RuruMark className="size-10" />
          </div>
          <SideNav allowed={allowed} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-col pb-24 md:pb-0">
        <AppHeader
          academyName={academyName}
          academies={academies}
          activeAcademyId={activeAcademyId}
          user={user}
          roleLabel={roleLabel}
        />
        <main id="isi" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-2 pb-10 sm:px-8">
          {children}
        </main>
      </div>
      <BottomNav allowed={allowed} />
    </div>
  );
}
