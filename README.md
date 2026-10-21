# Bluff Masters

An original, phone-friendly multiplayer trivia bluffing game built with Node.js, Express, and Socket.IO. No accounts, database, API keys, or external trivia service required. Includes 30 bundled questions and house decoys.

## Play

1. One player creates a room and shares its six-character code or invite link.
2. Join with 2–8 players using unique nicknames. The host chooses 3, 5, or 10 rounds.
3. Everyone has 60 seconds to invent a believable fake answer to the same trivia question. Submitting the exact truth is rejected; invent a bluff instead.
4. Vote for the truth within 60 seconds. Your own bluff is hidden. Missing submissions get no bluff; missing votes earn no truth points.
5. Earn **1,000 points** for choosing the truth and **500 points per player fooled** by your bluff. Authors of identical bluffs each receive the full fooling points. House decoys earn nobody points.
6. Results identify the truth, bluff authors, votes, and points. The host advances to the next round. The highest total wins; ties share victory.

The host can close submissions/voting early, remove players, or reset everyone to the lobby. Removing players does not retract already locked-in actions. New players can join only in the lobby. Players reconnect automatically with a private session token held in that browser tab's session storage; seats are reserved for 90 seconds. If the host disconnects, controls pass to a connected player. Reopening a closed tab or switching devices may require joining again after a lobby reset.

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
- Integration tests use real Socket.IO clients to cover full games, capacity, host permissions, hidden ballots, self-votes, scoring, timers, duplicates, reconnects, removal, HTTP, and cleanup.
- `questions.json` is a server-side bank. Add entries with `prompt`, `answer`, and at least three distinct `decoys`; keep at least 10 questions for marathon games. It is not exposed as a static asset, but is public in this repository.

## Project layout

Pre-upload verification: all integration tests passed on Node.js 22.23.4. A two-browser round was completed in Chromium with no JavaScript errors; the 390px phone layout had no horizontal overflow. The production dependency audit reported zero known vulnerabilities at verification time. GitHub Actions repeats the Node 22 integration checks on pushes and pull requests. These checks do not establish that a Render deployment is live.

`server.js` owns the game and HTTP service; `public/` contains the responsive HTML/CSS/JS client; `questions.json` contains the bank; `test/` contains integration tests; `render.yaml` configures hosting. `package-lock.json` locks dependencies. No affiliation with other commercial trivia games is implied.
