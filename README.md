# ♠ Vegas Strip Blackjack

A casino-accurate Blackjack simulator with an exact expected-value decision engine, built as a single self-contained web app.

## About

This project is a Vegas Strip-style Blackjack game built to explore probability, card-counting theory (the Hi-Lo system), and exact expected-value computation in a real, playable form. It started as a faithful implementation of standard casino rules and grew into a small research tool: every "best move" recommendation is derived by recursively computing outcome probabilities against the actual remaining shoe composition, rather than looked up from a static chart.

This is a learning and demonstration project. It is not a real-money gambling product, does not connect to any wagering service, and is not intended to generate an edge at an actual casino.

## Features

- **6-deck shoe** with cryptographically-seeded shuffling and realistic penetration (dealing continues until a cut-card depth is reached, then reshuffles)
- **Standard Vegas Strip rules** — dealer stands on soft 17 (S17), double after split (DAS), late surrender, blackjack pays 3:2
- **Exact composition-dependent EV engine** — computes the expected value of hitting, standing, doubling, splitting, and surrendering directly from the cards remaining in the shoe, and recommends the statistically optimal play
- **Live Hi-Lo card counting** — running count and true count, tracked as cards are actually dealt
- **Bet-sizing advisor** — suggests a bet spread based on the current true count, using a simplified advantage-play model
- **Auto-deal** — optionally repeats the previous bet and starts the next hand automatically
- **Progressive Web App** — installable to a phone home screen and fully playable offline after the first load

## How it works

Most Blackjack strategy guides are built from *basic strategy*: a fixed table of "correct" plays computed under the assumption of an infinite, unchanging deck. It's a good baseline, but it ignores the fact that a real shoe depletes as cards are dealt — the composition of what's left shifts hand by hand.

This project's decision engine does not use a lookup table. For any given hand, it recursively enumerates the possible outcomes of each legal action against the *actual* cards remaining in the shoe at that moment, weights them by their true probability, and returns an exact expected value for each option. The recommendation you see is computed live, from the real state of the game, not approximated from a static chart. The Hi-Lo count is displayed alongside it as a reference for how a human player would approximate the same information at the table — the engine itself doesn't need to approximate, since it has exact knowledge of the shoe.

<!-- A screenshot or short GIF of the table in play would go well here once one exists. -->

## Tech stack

- Plain HTML, CSS, and JavaScript — no frameworks, no build step, no external dependencies
- Web Audio API for procedurally generated sound effects
- Service Worker (`sw.js`) + Web App Manifest (`manifest.json`) for offline support and installability

## Running locally

No build step and nothing to install. Either:

- Open `blackjack.html` directly in a browser, or
- Serve the project folder with any static file server, for example:

  ```bash
  npx serve .
  # or
  python -m http.server
  ```

Serving over `http://` (rather than opening the file directly) is required for the service worker to register, which is what enables offline play.

## Installing on mobile

1. Open the GitHub Pages link for this project on your phone.
2. In your browser's menu, choose **Add to Home Screen** (iOS Safari) or accept the **Install app** prompt (Android Chrome).
3. Launch it from the home screen icon — it will continue to work with no internet connection.

## Disclaimer

This project is for educational and entertainment purposes only. It does not involve real money, does not facilitate real gambling in any form, and is not affiliated with any casino. The bet-sizing and advantage-play suggestions are simplified illustrative models, not financial advice, and are not a guarantee of any outcome.

## License

Released under the [MIT License](LICENSE).
