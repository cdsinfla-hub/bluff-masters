# Bluff Masters

An original, phone-friendly multiplayer trivia bluffing game built with Node.js, Express, and Socket.IO. No accounts, database, API keys, or external trivia service required. Includes **2,060 bundled questions** and house decoys. All 1,030 existing questions were retained and categorized, and 1,000 more were added with priority given to the smallest topic pools. See [question sources and licensing](QUESTION_SOURCES.md). All questions are bundled locally; no runtime trivia API calls are required.

## Play

1. One player creates a room and shares its six-character code or invite link.
2. Join with 2–8 players using unique nicknames. The host chooses 3, 5, or 10 rounds and one or more categories, or selects **Potluck** for all topics.
3. Everyone has 60 seconds to invent a believable fake answer to the same trivia question. Submitting the exact truth is rejected; invent a bluff instead.
4. Vote for the truth within 60 seconds. Your own bluff is hidden. Missing submissions get no bluff; missing votes earn no truth points.
5. Earn **1,000 points** for choosing the truth and **500 points per player fooled** by your bluff. Authors of identical bluffs each receive the full fooling points. House decoys earn nobody points.
6. Results identify the truth, bluff authors, votes, and points. The host advances to the next round. The highest total wins; ties share victory.

The host can close submissions/voting early, remove players, or reset everyone to the lobby. Removing players does not retract already locked-in actions. New players can join only in the lobby. Players reconnect automatically with a private session token held in that browser tab's session storage; seats are reserved for 90 seconds. If the host disconnects, controls and the room's saved category/round settings pass to a connected player. Reopening a closed tab or switching devices may require joining again after a lobby reset.

## Categories

In the lobby, the host can select any combination of ten categories. **Potluck** is the last option and uses about 75% Weird & Wacky; selecting it clears individual selections, and selecting a topic clears Potluck. At least one choice is required. Everyone sees the chosen settings, and each round displays its topic. Settings are preserved when returning to the lobby and can be changed before the next game.

| Topic | Questions |
| --- | ---: |
| Animals & Nature | 216 |
| Science & Technology | 232 |
| History & Mythology | 235 |
| World & Geography | 216 |
| Movies & TV | 230 |
| Music | 225 |
| Books & Arts | 228 |
| Games & Sports | 228 |
| Food & Everyday Life | 220 |
| Weird & Wacky | 30 |
| **Potluck — all topics** | **2,060** |

Potluck targets 75% Weird & Wacky, rounded to 2 of 3, 4 of 5, or 8 of 10 questions. The same quota applies when Weird & Wacky is mixed with selected topics; the rest are distributed evenly across those selected topics. Choosing Weird & Wacky alone gives 100%. Excluding it respects the host's choices and balances only those topics. The completed deck is shuffled and never repeats a question within a game. All 2,030 previous entries are retained; 30 newly researched, originally worded oddities have per-question source URLs in the bank. This changes the proportion drawn during play, rather than claiming that 75% of all stored entries are oddities. `categories.json` defines the ten categories and keeps Potluck last.

## Run locally

Install Node.js 22 LTS, then:

```sh
npm ci
npm test
npm start
```

Open `http://localhost:3000`. For phones on the same Wi-Fi, use the computer's LAN IP with port 3000 and allow the port through its firewall. Use separate browser tabs for separate players. `PORT` is read from the environment (default 3000); the server binds to `0.0.0.0`. `/health` returns JSON with status `ok`.

## Deploy on Render (Free)

### Blueprint

1. Sign in to [Render](https://dashboard.render.com/) and select **New → Blueprint**.
2. Connect GitHub and authorize access to `cdsinfla-hub/bluff-masters` when prompted.
3. Select this repository and its `main` branch. Render reads the root `render.yaml`.
4. Confirm the `bluff-masters` web service uses **Free**, then create/deploy the Blueprint.
5. Wait for a successful deploy. Open the exact HTTPS URL Render assigns; verify `/health`, create a room, and have a second device join and complete a round.

### Manual Web Service alternative

Select **New → Web Service**, connect this repository, choose branch `main`, runtime **Node**, build command `npm ci --omit=dev`, start command `npm start`, health check `/health`, and instance type **Free**. Set `NODE_ENV=production`. Leave the root directory blank. Render supplies `PORT`. No secrets are required.

This must be a **Web Service**, because multiplayer needs the Node server and WebSockets. Locked dependencies support reproducible builds. No frontend compilation is needed. A live URL is only confirmed after the deployed service is checked.

### Free-tier limitations

Rooms and scores live only in process memory. Restarts, redeploys, and idle spin-down erase all games. Run a single instance; multiple instances would require shared state and a Socket.IO adapter. Render's free services can spin down after 15 minutes without inbound traffic, and waking may take about a minute. Review [Render's current free limits](https://render.com/docs/free) for usage caps. This configuration is intended for small private party games.

## Implementation and checks

- Server-generated room codes and reconnect tokens; maximum 8 seats per room.
- Server-owned phases, timers, ballots, and score calculations. Correct answers/authors are withheld until reveal. Self-votes and repeated submissions/votes are rejected.
- Player content renders as text, not HTML; bounded inputs, Socket.IO payload limit, and per-socket action throttling.
- Integration tests use real Socket.IO clients to cover full games, capacity, host permissions, hidden ballots, self-votes, scoring, timers, duplicates, reconnects, removal, HTTP, cleanup, and synchronized category settings. Category tests cover all 511 nonempty topic combinations, balanced draws, Potluck, invalid inputs, and question-bank integrity.
- `questions.json` is a server-side bank. Add entries with `prompt`, `answer`, and at least three distinct `decoys`; keep at least 10 questions for marathon games. It is not exposed as a static asset, but is public in this repository.

## Project layout

Verification includes Node.js 22.23.4 integration and category tests and two-browser Chromium checks. The 390px host layout is checked for horizontal overflow, category switching and guest synchronization. GitHub Actions repeats the Node 22 tests on pushes and pull requests. A successful local check alone does not establish that a Render deployment is live.

`server.js` owns the game and HTTP service; `game-categories.js` validates selections and builds balanced decks; `categories.json` defines the picker; `public/` contains the responsive HTML/CSS/JS client; `questions.json` contains the bank; `test/` contains integration and bank-validation tests; `render.yaml` configures hosting. `package-lock.json` locks dependencies. `/health` reports `questionCount` and per-topic counts so a deployment can be checked without exposing answers. `QUESTION_SOURCES.md` and `LICENSE-QUESTIONS.md` document attribution and licensing. No affiliation with other commercial trivia games is implied.

## Shared game log and end-of-game email

The unlinked `/game-log.html` page shows the most recent 200 games from all rooms, with start time, completed/planned question counts, players and scores. Anyone knowing the address can view it. History is held in server memory and resets on restart/redeploy/free-service sleep; download CSV for a backup. No email is sent at game start.

Optional summaries use Resend over HTTPS. In Render Environment, set `RESEND_API_KEY`, `GAME_ALERT_TO` (recipient email), and `GAME_ALERT_FROM` (authorized sender). Optional `GAME_ALERT_TIMEZONE` defaults to America/New_York. Keep credentials and recipients out of Git. All three required settings must be present to enable sending. The Free plan currently allows 3,000 emails/month, at most 100/day; check https://resend.com/pricing before signup. The onboarding@resend.dev test sender only sends to the Resend account's own email; production sending requires a verified domain you control. Yahoo cannot be used as a verified sending domain.

A summary is attempted once after the final question, an early reset, abandonment after reconnect expiry, or orderly shutdown, with final scores and actual completed questions. Abrupt server termination cannot send an email. Failures do not interrupt games and are not automatically retried. Log email status `accepted` means accepted by the provider, not confirmed inbox delivery. Without provider setup it reads `disabled`. Configure and verify an actual completed game's email before treating this as a lasting archive. No live email is enabled by source code alone.
