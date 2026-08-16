# Grindmates

Minimalist social fitness, athletic dark mode. Built from the Claude Design handoff
`Vitals - Design System & Feed.dc.html` (the app's working title during design) and
the project's app instructions.

Ground is near-black so photo check-ins carry all the light; lime is reserved for a
single live action per screen.

---

## Setup

```bash
npm install
npx expo start
```

That runs immediately, with no backend: when `EXPO_PUBLIC_SUPABASE_URL` is unset the
app runs in local mode (`lib/demo.ts`). There is no fake cast and no seeded feed — a
visitor walks the same path a real user does: create an account, start a crew, post
the first check-in. Everything persists on the device (AsyncStorage; localStorage on
web): reload and you are still signed in with your crew, streak, and check-ins
intact. Signing out keeps the data, so signing back in retrieves all of it. The
honest limit of local mode is that it is one device — another person cannot join
your crew until the app points at a real Supabase project.

To point it at a real project:

```bash
cp .env.example .env          # fill in your Supabase URL + publishable/anon key
npx expo start --clear
```

The moment that URL is real, every `if (DEMO)` branch switches off and the app talks
only to Supabase. Apply the migrations first — either paste each file from
`supabase/migrations/` (in order) into the dashboard SQL editor, or from a machine
with Postgres access:

```bash
cat supabase/migrations/*.sql | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1
```

Two dashboard settings matter for a hosted build: **Authentication → URL
Configuration → Site URL** should be the deployed URL (else email-confirmation
links redirect to localhost), and if you want zero-friction sign-in, disable
**Confirm email** under Authentication → Sign In / Providers, or enable
**Anonymous sign-ins**. The Pages workflow bakes the project URL and publishable
key into the deployed bundle — that key is public by design; RLS is the boundary.

Then run the migrations in order against your Supabase project:

```bash
supabase db push
# or: paste supabase/migrations/0001_init.sql into the SQL editor
```

That single file creates every table, index, RLS policy, trigger, the
`checkin-photos` storage bucket and its policies, the `post_check_in` transaction
function, and the realtime publication. It has been verified to run top-to-bottom
on a clean Postgres 16 with a Supabase-shaped prelude.

Email confirmation is on by default in new Supabase projects. Either turn it off
under **Authentication → Providers → Email**, or use the anonymous sign-in path
(**Authentication → Providers → Anonymous** must be enabled).

---

## Structure

```
app/                        Expo Router
  _layout.tsx               AppProvider + safe area + stack
  index.tsx                 launch gate — straight to the feed if a session exists
  (auth)/sign-in.tsx        email/password + anonymous
  (app)/_layout.tsx         auth guard
  (app)/feed.tsx            Screen 1 — the social feed
  (app)/camera.tsx          BeReal-style capture
  (app)/log.tsx             Screen 2 — muscle picker + effort tiers
  (app)/timer.tsx           Screen 3 — rest timer, set type, strain (modal)

components/
  ui/                       Pill · Sheet · Avatar · TierDot · icons · AmbientGlow · Eyebrow
  feed/                     GroupSwitcher · StreakBadge · FeedCard tree · CheckInFab · ComposerSheet · NudgeCard
  log/                      BodyMap (+MuscleRegion) · MuscleChip · EffortSheet (+EffortTierButton) · SelectionSummary · StickyCta
  timer/                    CountdownDial · TransportRow (+NudgePill) · SetTypeSelector (+ToggleChip) · StrainCard (+StrainRing)

hooks/
  useApp.tsx                session, profile, groups, active group, draft, optimistic posts
  useFeed.ts                feed query, realtime, optimistic reactions
  useRestTimer.ts           interval state + haptics

lib/
  theme.ts                  design tokens — the only file with hex values
  types.ts                  single source of truth, mirrors the SQL
  supabase.ts               client + photo upload
  api.ts                    every query, one place
  muscles.ts                the 10 groups + body-map geometry
  time.ts                   "2h ago", initials

supabase/migrations/0001_init.sql
```

---

## Data model

| table | notes |
| --- | --- |
| `profiles` | `id`, `username`, `avatar_url`, `streak_count` — created automatically for every auth user, including anonymous |
| `groups` / `group_members` | small closed crews (4–12); the design's group switcher needs them |
| `check_ins` | `photo_url` nullable ("log without a photo"), one per person per group per day |
| `muscle_logs` | `muscle_group` + `effort_level` (1 Light · 2 Moderate · 3 Heavy) |
| `reactions` | `fire` / `five`, unique per user per check-in |

RLS everywhere. You can read a check-in if you wrote it or you're in its group;
`is_group_member()` and `can_see_check_in()` are `SECURITY DEFINER` so the policies
don't recurse. Storage objects live at `checkin-photos/<user_id>/<uuid>.jpg` and the
insert policy checks the first path segment against `auth.uid()`.

---

## Speed-first behaviours

- **Launch** goes straight to the feed; the gate renders a ground-coloured frame for
  the one tick it takes to read the persisted session — no spinner, no splash flash.
- **Reactions** flip instantly and reconcile after the write. The next state is
  computed from committed state before `setItems`, not inside the updater, because
  React only runs an updater synchronously on its eager path.
- **Posting** puts the card in the feed before the photo has uploaded. The log screen
  unmounts on navigation, so a failure reports through app state and the feed renders
  the reason — a failed post is never mistaken for a successful one.
- **The check-in and its muscle logs are one transaction** (`post_check_in`). Two
  round trips would let the realtime listener fetch the row before the tags exist and
  paint a card with an empty muscle strip.

---

## Design fidelity

`lib/theme.ts` is the only file containing hex values; every component reads from it.
Colours, the 4/8/12/16/24/32 spacing scale, radii (12 chip · 20 card · 26 sheet · full
pill), the type ramp, and the Screen 1 measurements — 34pt avatar, 342pt photo, 118pt
photo scrim, 150pt FAB scrim, 44pt FAB offset, 236×110 group menu, 38×4 grabber — are
transcribed from the prototype. CSS `letter-spacing` in `em` is converted to points
(em × font size).

Two things are adapted rather than copied: `backdrop-filter` has no RN equivalent, so
blurred surfaces use their solid-alpha fill; and the top-left lime bloom is drawn as an
SVG radial gradient since RN has no `radial-gradient`.

Screens 2 and 3 are built from the design's component tree and token set — the
prototype specified their structure but only rendered Screen 1.

---

## Open question, answered

The design doc asks whether effort tier drives a numeric strain score. It does:
`strainFrom()` sums the tiers, scales by 1.4, and caps at 21. Change that one function
to change the whole scale — the ring, the summary, and the `PR` badge threshold all
read from it.

---

## Web demo and CI

`.github/workflows/ci.yml` runs on every push and pull request: `npm ci`, a
typecheck, and a full `expo export --platform web`. The export is the cheap
end-to-end proof that every import resolves and Metro can bundle the app.

**Both workflows pin Node 22, and the web export needs it.** Static rendering
evaluates every module in Node, and `@supabase/supabase-js` requires a global
`WebSocket`, which Node did not ship until 22. On Node 20 the export dies with
"Node.js detected but native WebSocket not found" — the demo build no longer
constructs a client at all (see `lib/supabase.ts`), but a build configured with
real credentials still would.

If a rebuild ignores a changed `EXPO_PUBLIC_*` value, clear Metro's transform
cache — `npx expo start --clear`, or delete `/tmp/metro-cache` before exporting.
It caches transformed modules with those values already inlined.

`.github/workflows/pages.yml` publishes that same web build to GitHub Pages, at
<https://traxicon.github.io/grindmates/>. Its `configure-pages` step passes
`enablement: true`, so the first run provisions the Pages site through the API — there
is nothing to switch on by hand. On a free plan Pages publishes from public
repositories only. No Supabase secrets are supplied to the workflow, so the deployed
page runs in demo mode.

Two details in that setup are load-bearing:

- The workflow touches `dist/.nojekyll`. Without it, Pages runs the output through
  Jekyll, which strips every path starting with an underscore — including Expo's
  entire `_expo/static` bundle directory. The site deploys and then 404s on its own
  JavaScript.
- `app.json` sets `experiments.baseUrl` to `/grindmates` so assets resolve under the
  repository sub-path. **If the repository is renamed, that value has to change with
  it**, or every asset 404s.

---

## In-workout flow

- **Body map zoom.** Tapping a region zooms the figure toward it (one 220ms ease-out,
  no spring) and opens an inline panel: effort tiers for that muscle, then exercise
  suggestions from `lib/exercises.ts`. Tapping an exercise tags it into the note —
  tap again to remove — so the note stays the single record of what was done.
- **Set logging on the rest timer.** Reps are an option, not a demand: preset chips
  (4–15) with ±1 fine adjust, and one accent CTA that logs the set and starts the
  rest together. The presets cover the real pattern of an opener at 10–15 reps
  followed by heavy sets around 4. Logged sets show as session tiles (long-press to
  remove one); the strain card totals sets, reps, and time under rest. The play
  button alone is still a plain rest timer.
- **Crews.** A new account lands on an empty feed whose single lime action starts a
  crew (name + emblem); the switcher menu carries a "New or join crew" row after that.
  Every crew has an **8-digit join code**: it is shown the moment a crew is created
  (with a share/copy action), lives on the switcher menu afterwards, and anyone
  signed in can enter it under "Join with code". On Supabase this runs through the
  `join_group_with_code` SECURITY DEFINER function (migration `0002_join_codes.sql`),
  because under RLS a non-member can neither look up the group nor insert their own
  membership.

## Not built

- Comment threads. Counts render on the reaction bar; there is no `comments` table.
- The nudge action is inert — it dismisses, it does not notify.
- No join-by-invite flow — crews can be created, but adding members still means
  inserting `group_members` rows directly.
