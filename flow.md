# Bigram Analysis & Prompt Generation Flow

## First Cycle (No Data Yet)
- 50 random words are fetched from the API
- 5 phrases are generated, each with 10 random words
- user types through all 5 phrases
- every keystroke is recorded with the expected char, actual char, and timestamp

## After Each 5-Phrase Cycle
- all keystrokes from the last 5 phrases are analyzed
- for each pair of consecutive characters, a bigram is created (e.g., "th", "he", "e ")
- each bigram's total attempts and error count are stored in a map
- error is counted when the second character of the bigram was mistyped

## Finding Weak Bigrams
- only bigrams with at least 3 attempts are considered
- error rate is calculated for each (errors / attempts)
- bigrams are sorted by error rate, highest first
- top 10 bigrams with errors become the "weak bigrams" array

## Generating New Prompts
- 50 new random words are fetched from the API
- each word is scored by counting how many weak bigrams it contains
- for each of the 5 new phrases:
  - 10 words are picked using weighted random selection
  - words with more weak bigrams have higher chance of being picked
  - a word with 0 weak bigrams still has a small chance (weight of 1)
  - a word with 2 weak bigrams has 3x the chance (weight of 3)
  - once a word is picked for a phrase, it can't repeat in that same phrase
  - but the same word can appear in different phrases

## Cycle Repeats
- user types the new 5 phrases
- keystrokes are recorded again
- after 5 phrases, weak bigrams are recalculated from the most recent cycle
- new prompts are generated targeting the updated weaknesses

## Krish Understanding
There is a map with all the bigrams and their score
after the first generated 5 phrases to type, each phrase being typed, the total and then error rate of each bigram is put into a map
at the end, the top 10 bigrams with the worst accuracy are put into a new array
this new array is used to generate the next 50 words where the words are ranked based on how many weak bigrams they have
then each new phrase is generated with no repeating words each phrase but higher chance of words with more weak bigrams being included
