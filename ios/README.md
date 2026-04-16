# ESR — iOS (SwiftUI)

Native SwiftUI client that talks to the same Supabase backend as the web PWA.
Same tables, same auth, same invite tokens, same RLS policies.

## First-time setup

You need **Xcode 15+** and **XcodeGen** (project file is generated, not checked in):

```bash
brew install xcodegen
cd ios
xcodegen generate
open ESR.xcodeproj
```

Then in Xcode:
1. Select the `ESR` target → **Signing & Capabilities** → set your Team.
2. Edit `ESR/Services/AppConfig.swift` and paste your Supabase **anon key** into
   `supabaseAnonKey` (or add `SUPABASE_ANON_KEY` to `Info.plist` / xcconfig for
   release builds — don't commit it).
3. Run on a simulator or your device.

## What's wired up

| Area | File | Status |
| ---- | ---- | ------ |
| Magic-link auth | `Services/AuthStore.swift`, `Views/AuthView.swift` | ✅ |
| Deep-link callback (`esr://auth-callback`) | `ESRApp.swift` | ✅ — tapping the email link returns to the app |
| Onboarding (name + DOB + gender) | `Views/OnboardingView.swift` | ✅ (invite-token redemption is a TODO) |
| Home tile grid with counts | `Views/TileGridView.swift` | ✅ |
| Feed/pump stopwatch on tile | `Services/SessionStore.swift`, `Views/TileGridView.swift` | ✅ |
| Long-session (>20 min) alert | `Views/HomeView.swift` | ✅ |
| Day header navigation | `Views/HomeView.swift` | ✅ |
| Bottom floating day strip | `Views/DayStripView.swift` | ✅ (60 days back, tap to jump) |
| Next-feeding pill | `Views/NextFeedingBar.swift` | ✅ |
| Stats (7-day list) | `Views/StatsView.swift` | ✅ (charts upgrade pending) |
| Add past entry sheet | `Views/AddEntrySheet.swift` | ✅ |
| Generate invite token | `Services/SupabaseService.swift` | ✅ (redeem is TODO) |
| Sign out | `Views/SettingsView.swift` | ✅ |

## What's left to polish

- **Redeem invite token** flow — the web has `/api/invite` PUT; the iOS side
  needs the equivalent (insert a consumption row or an edge function).
- **Push notifications via APNs** — need `@capacitor/push-notifications`
  equivalent. Simplest path: register the device token with Supabase Edge
  Functions and reuse the web's `/api/cron/check-feed` logic.
- **Universal Links** — switch the auth redirect from `esr://` to a real
  `https://eat-shit-sleep.com/auth-callback` once you've set up
  `apple-app-site-association`.
- **App icon** — `Assets.xcassets/AppIcon.appiconset/Contents.json` is a stub.
  Drop in a 1024×1024 PNG.
- **Offline cache** — SwiftData / Core Data layer so logs aren't lost when
  the phone is offline (Supabase doesn't queue writes).
- **Swipe-to-delete** on entries inside StatsView.
- **Widgets + Lock Screen Live Activity** for active sessions.

## Shared schema

This app expects the same schema the web migration installed:

- `public.profiles` — `id` (auth.uid), `household_id`, `baby_name`, etc.
- `public.baby_logs` — `id`, `type`, `timestamp` (bigint ms), `duration`, `client_id`,
  `household_id`, `user_id`
- `public.household_invites` — `token`, `household_id`, `expires_at`, `used_at`

RLS policies defined in `supabase/migrations/20260417000000_hardening.sql`
enforce tenancy. Because the iOS client uses the **anon key** (not the service
key), RLS *does* apply here — make sure the migration is applied before
running against a real Supabase project.

## Running against dev vs prod Supabase

Two options:
1. **Same project**: don't change anything. iOS dev builds hit the same
   Supabase as prod. Fine for day-one.
2. **Isolated dev project**: create a second Supabase project, run the
   migration, set `SUPABASE_URL` / `SUPABASE_ANON_KEY` per build
   configuration in Xcode.

## Running the tests (later)

`node --test test/` still runs the JS tests under the repo root. An XCTest
target will be added later to verify `BabyAge.compute` matches the JS
reference implementation byte-for-byte.
