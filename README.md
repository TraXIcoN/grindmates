# Vitals

Minimalist social fitness, athletic dark mode. Built from the Claude Design handoff
`Vitals - Design System & Feed.dc.html` and the project's app instructions.

Ground is near-black so photo check-ins carry all the light; lime is reserved for a
single live action per screen.

---

## Setup

```bash
npm install
cp .env.example .env          # fill in your Supabase URL + anon key
npx expo start
```

Then run the migration once against your Supabase project:

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
