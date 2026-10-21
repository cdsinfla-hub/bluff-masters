# Question sources and attribution

The question bank contains **2,060 questions**. The bank now includes 30 newly researched Weird & Wacky questions, with the prior 2,030 entries retained. In the earlier expansion, all 1,030 previous prompts, answers, and decoys are preserved; every entry now has one playable category. The latest expansion added exactly 1,000 questions: 547 adapted from Open Trivia Database, 424 adapted from OpenTriviaQA, and 29 newly worded Bluff Masters questions. Across the complete bank, there are 1,547 Open Trivia Database entries, 424 OpenTriviaQA entries, 59 newly worded Bluff Masters entries, and the original 30.

## Expansion

- **Work:** Open Trivia Database question data.
- **Creators:** Open Trivia Database community contributors; API provided by PixelTail Games.
- **Original source:** https://opentdb.com/
- **Published data license:** [Creative Commons Attribution–ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/), as stated in [Open Trivia Database's API documentation](https://opentdb.com/api_config.php/).
- **Retrieved archive:** [leakyhose/open-trivia-script-data](https://github.com/leakyhose/open-trivia-script-data), formerly named `open-trivia-dataset`, commit `77d8e3cb5c8e264d50220eee75cfe08d233b1910`, files `data/difficulty_medium.json`, `data/difficulty_hard.json`, `data/difficulty_easy.json`, and `data/all_questions.json`.
- **Modifications:** Selected questions; decoded HTML entities; normalized spacing; adapted fields to `prompt`, `answer`, and `decoys`; corrected or clarified selected wording, spelling, answers, and decoys; assigned game categories. Retained source category as `sourceCategory` and source difficulty metadata. Removed many ambiguous, stale, duplicate, choice-dependent, or unsuitable candidates.
- **Identification:** Imported entries carry `"source": "Open Trivia Database"`. The imported entries and adaptations are distributed under **CC BY-SA 4.0**. See `LICENSE-QUESTIONS.md` for the license text. This attribution does not assert a license for the application code or change the status of the original 30 questions.

The game bundles the selected data locally. Gameplay does not contact the upstream API. No original contributor endorsement is implied. Source data is community supplied; the editorial review and automated checks do not independently certify every fact. Please report a questionable prompt in a repository issue so it can be corrected or replaced.

## OpenTriviaQA additions

- **Work and creators:** [OpenTriviaQA](https://github.com/uberspot/OpenTriviaQA), collected and maintained by uberspot and project contributors.
- **Source revision:** `dcc1cdf36c2985ed5c849d1f2265c5041ffcdfb9`.
- **Source files:** The `categories/` collections for animals, hobbies, humanities, literature, geography, science-technology, and for-kids.
- **License:** [CC BY-SA 4.0](https://github.com/uberspot/OpenTriviaQA/blob/dcc1cdf36c2985ed5c849d1f2265c5041ffcdfb9/LICENSE).
- **Modifications:** Parsed the question/answer/choice format, selected self-contained questions, decoded mixed text encodings, normalized whitespace, adapted wording and selected answers/decoys, removed unsuitable or repeated questions, and assigned one playable topic per entry. Imported entries carry `"source": "OpenTriviaQA"`. Their adaptations remain under CC BY-SA 4.0, with no endorsement implied.

## Newly worded category questions

The earlier 29 entries carrying `"source": "Bluff Masters"` were written for the category expansion, principally to strengthen Animals & Nature and World & Geography. Their wording is also offered under CC BY-SA 4.0. This does not change the status of the original 30 questions or grant a license for unrelated application code. Category labels and source metadata are editorial assignments, not claims by the upstream creators.

## Distribution

The public game links to `/credits.html` for attribution without showing answers. When redistributing the imported questions or adaptations, preserve attribution and the CC BY-SA 4.0 license notice.

## Weird & Wacky expansion

Thirty original fill-in-the-blank questions were added to the retained 2,030-entry bank. These new question texts and original decoys are offered under CC BY-SA 4.0; factual research links are recorded in each entry's `sourceUrl`. Source publishers retain all rights in their articles; these are newly written questions about facts, not copied trivia prompts. No endorsement is implied. Research includes the Natural History Museum, NASA, Smithsonian, National Geographic, Guinness World Records and the official Ig Nobel winners archive. Potluck draws approximately 75% from this new category; this is a gameplay weighting, not a claim about the raw bank's composition.
