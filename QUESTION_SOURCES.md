# Question sources and attribution

The question bank contains **1,030 questions**: the original 30 entries, preserved unchanged, followed by **1,000 adapted Open Trivia Database questions**.

## Expansion

- **Work:** Open Trivia Database question data.
- **Creators:** Open Trivia Database community contributors; API provided by PixelTail Games.
- **Original source:** https://opentdb.com/
- **Published data license:** [Creative Commons Attribution–ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/), as stated in [Open Trivia Database's API documentation](https://opentdb.com/api_config.php/).
- **Retrieved archive:** [leakyhose/open-trivia-script-data](https://github.com/leakyhose/open-trivia-script-data), formerly named `open-trivia-dataset`, commit `77d8e3cb5c8e264d50220eee75cfe08d233b1910`, files `data/difficulty_medium.json`, `data/difficulty_hard.json`, and `data/difficulty_easy.json`.
- **Modifications:** Selected 1,000 questions; decoded HTML entities; normalized spacing; adapted fields to `prompt`, `answer`, and `decoys`; corrected or clarified selected wording, spelling, answers, and decoys. Retained category and difficulty metadata. Removed many ambiguous, stale, duplicate, choice-dependent, or unsuitable candidates.
- **Identification:** Imported entries carry `"source": "Open Trivia Database"`. The imported entries and adaptations are distributed under **CC BY-SA 4.0**. See `LICENSE-QUESTIONS.md` for the license text. This attribution does not assert a license for the application code or change the status of the original 30 questions.

The game bundles the selected data locally. Gameplay does not contact the upstream API. No original contributor endorsement is implied. Source data is community supplied; the editorial review and automated checks do not independently certify every fact. Please report a questionable prompt in a repository issue so it can be corrected or replaced.

## Distribution

The public game links to `/credits.html` for attribution without showing answers. When redistributing the imported questions or adaptations, preserve attribution and the CC BY-SA 4.0 license notice.
