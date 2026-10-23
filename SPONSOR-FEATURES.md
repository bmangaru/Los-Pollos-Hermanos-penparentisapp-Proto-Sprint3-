# Sponsor feature round — what changed and where

| Sponsor ask | Where it lives | How it works |
|---|---|---|
| Remove "Something came up", combine with None | `writingLogic.js` → `OUTCOMES` | Four outcomes. "None of it" carries the subtitle "Something came up — that still counts as showing up". |
| 3 professional writers, 9 times a year | `screens/SalonsScreen.js`, `HomeScreen.js` | Copy updated. |
| Update salons: Eventbrite | `SalonsScreen.js`, `links.js` → `salonsEventbrite` | Gold "Register on Eventbrite" button at the top. **Swap in the real salon event URL** in `links.js`. |
| "What's your goal today" + resets at 12am | `BrainstormHomeScreen.js`, `writingStore.js` → `useToday()` | Asked the first time Brainstorm opens each day. Goals are stored per date, so a new day means a new question. `useToday()` re-renders at midnight and when the app returns to the foreground. Options: words or minutes, presets, "your usual" suggestion, custom, or "No goal today". |
| Weekly goal, 7 days | `BrainstormHomeScreen.js` | Weekly goal runs Mon–Sun. Types: words, time, both, or **sessions** (previously "coming soon"). |
| Sessions logged and saved | `BrainstormWriterScreen.js`, `writingStore.js` → `saveSession` | Every visit to the typer is one session, saved with its text, words, minutes, start time, goal, % and rating. Saved on "Finish", on ×, and on Android back (`beforeRemove`). |
| Keep track of goals and writing / access saved writing | `screens/MyWritingScreen.js` | All sessions grouped by day, with that day's goal and %. Tap to read in full. |
| Writing can be sent to themselves | `writingStore.js` → `shareWriting` | Opens the phone's share sheet (Mail, Messages, Notes, Drive…). No account or email server needed. Available after every session, per session, and "this week's writing". |
| Chart: did it exceed? | `components/WeekChart.js` | Seven bars, each day vs. that day's goal, with a dashed 100% line. Gold = exceeded (≥110%), blue = met, light blue = some, grey = none. Weekly card says "Exceeded — X% over" or "X% of the way there". |
| ≥50% → rate yourself, otherwise the app rates | `writingLogic.js` → `canSelfRate`, `appRatingFor` | At ≥50% of today's goal the writer picks their own rating (the app's suggestion is tagged "App's read"). Below 50% the app records its rating. Both are saved; the writer's wins when present. |
| Disable copy/paste | `BrainstormWriterScreen.js` | `contextMenuHidden` removes the Copy/Paste menu. Any single change that adds >30 characters (`PASTE_CHAR_LIMIT`) is treated as a paste, reverted, and never counted. |
| After 10 / 100 sessions, a smarter Home screen | `writingLogic.js` → `buildInsights`, `HomeScreen.js` | **<10:** welcome + "N more sessions until this screen learns your rhythm". **10+:** streak, usual writing time and words per session, plus a message that depends on *when you open the app* (on time / later than usual / early / already wrote today). **100+:** adds lifetime words, strongest weekday, week-over-week trend and longest streak. |

## Notes for the team

- `writingLogic.js` has no React Native imports, so it can be unit-tested with plain Node or Jest.
- Old storage keys (`pp.progress.v2`, `pp.time.v1`, `pp.checkins.v1`) are no longer read. Stats now come from `pp.sessions.v1`, so test devices start fresh.
- `screens/BrainstormScreen.js` was removed. Nothing imported it, and it was an older copy of the Brainstorm screens.
- The paste check also catches iOS dictation when it drops in a long sentence at once. Raise `PASTE_CHAR_LIMIT` if that's a problem.
- Everything is stored on the phone (AsyncStorage). If the sponsor later wants writing to survive a lost phone, sessions can be synced to the same Supabase project described in `BACKEND-NOTES.md`.
