# UX Flows (initial, hypotheses)

Everything here is **RECOMMENDED / hypothesis**. No interviews or usability tests exist (Verified by absence; see `09_RESEARCH_AND_VALIDATION.md`). Routes named below are the ones that exist in `apps/web/app` today; "exists" means the page is in the repo, not that I used it in a browser.

## Primary users (provisional)
Owner of a small academy; Manager/admin; Coach (a `staff` member today); read-only viewer. Parent/guardian: not in the app (question Q6).

## Journey 1: Owner first run
1. Lands on `/daftar` (sign up), verifies email (`/verifikasi-email`), signs in (`/masuk`).
2. No business yet: `/bisnis/baru` creates the academy and picks category. Today the category list includes F&B and mahjong; recommend showing only academy until Q1 is answered.
3. `/setup` onboarding wizard (exists): academy details, enable modules, first data (group, player, first session). Hypothesis: skippable and resumable. Needs check.
4. Lands on dashboard `/` with next best action.

Risks (hypothesis): jargon in category/module step; owner unsure what to do after setup; email verification friction if mail delivery is poor (no real SMTP provider yet).

## Journey 2: Invite staff
Owner or manager opens `/tim`, invites by email with role and branch scope. Invitee opens `/undangan`, signs in or registers with that same email, accepts. Token is single-use, bound to email, 7 days (DEC-013). Same generic error for every failure so status cannot be guessed. Open UX question: what does the invitee see when the email differs from their account (hypothesis: confusing).

## Journey 3: Several businesses
After login: one active membership goes straight in; several shows `/pilih-bisnis`; none shows create-or-accept-invite. A switcher is navigation only; the API re-derives tenant from the session each request (DEC-011). Needs usability test: can a manager with two academies tell which one they are in?

## Journey 4: Daily academy work
- Players: `/akademi/pemain` (add, edit, group assignment; guardian contact visible only with `academy.guardians.read`).
- Schedule + attendance: `/akademi/absensi` and `/akademi/absensi/[id]`; coach marks hadir/izin/sakit/alpa, ideally from a phone (design doc says so; narrow-screen behavior not verified by me).
- Report: `/akademi/absensi/laporan`.
- Fees: `/akademi/iuran`, `/akademi/iuran/tunggakan` (owner/manager only).

Hypotheses to test: attendance for a 20-player session takes under a few minutes on a phone; coaches understand the four statuses; managers can find who owes fees without help. Do not set numeric targets until a baseline exists.

## Journey 5: Permission denied
User without permission or with module disabled should see a plain Indonesian explanation and a way back, not a blank page or raw 403. Needs checking per page.

## Navigation (current, from `apps/web/app/(app)`)
Beranda, Akademi (Pemain, Absensi, Iuran), Tim, Cabang, Riwayat (audit), Pengaturan, plus F&B and Mahjong sections. Recommendation: nav built from role + enabled module, one primary action per page, F&B and mahjong hidden for academy tenants (the registry already ties modules to category; verify in a browser).

## State inventory to verify per screen
Loading, empty with next step, populated, validation error, server error, success feedback, permission denied, module disabled, narrow screen (≤ 390 px), keyboard-only, visible focus, contrast, status not by color alone.

## Language
Initial copy in natural Indonesian (pack rule; the repo already does this). Review wording with real academy staff.

## Open UX questions
Which dashboard widgets does an owner actually use; is branch scope needed for a pilot academy (DEC-008 built it from v1, pack Q8 asks if needed); should coaches see only their own groups; do parents want to see anything at all.
