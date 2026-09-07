# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.spec.ts >> reset through Settings rebuilds a fresh playable session
- Location: e2e/game.spec.ts:355:5

# Error details

```
Error: page.evaluate: TypeError: Cannot read properties of null (reading 'puzzlesSolved')
    at eval (eval at evaluate (:311:30), <anonymous>:1:66)
    at UtilityScript.evaluate (<anonymous>:313:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- generic [ref=f1e7]:
  - generic [ref=f1e49]:
    - heading "WordShift" [level=1] [ref=f1e51]
    - button "How to play" [ref=f1e54] [cursor=pointer]
  - generic [ref=f1e58]:
    - alert:
      - generic: ✻ Oh, you're here! Tap a letter in the top word to pick it up, then tap a spot in the word below to drop it in. The green checks will show you the spots that make real words.
  - list "Puzzle with 3 word rows" [ref=f1e60]:
    - generic [ref=f1e62]:
      - generic [ref=f1e64]:
        - generic "Pick a letter from this row" [ref=f1e65]: PICK
        - generic [ref=f1e73]:
          - generic [ref=f1e75]:
            - button "Letter P" [ref=f1e76]:
              - generic "Letter P" [ref=f1e77]: P
            - generic:
              - generic "Letter P": P
          - generic [ref=f1e86]:
            - button "Letter L" [ref=f1e87]:
              - generic "Letter L" [ref=f1e88]: L
            - generic:
              - generic "Letter L": L
          - generic [ref=f1e97]:
            - button "Letter A" [ref=f1e98]:
              - generic "Letter A" [ref=f1e99]: A
            - generic:
              - generic "Letter A": A
          - generic [ref=f1e108]:
            - button "Letter Y" [ref=f1e109]:
              - generic "Letter Y" [ref=f1e110]: "Y"
            - generic:
              - generic "Letter Y": "Y"
      - generic [ref=f1e122]:
        - generic "Letter P" [ref=f1e124] [cursor=pointer]: P
        - generic "Letter A" [ref=f1e132] [cursor=pointer]: A
        - generic "Letter N" [ref=f1e140] [cursor=pointer]: "N"
        - generic "Letter T" [ref=f1e148] [cursor=pointer]: T
      - generic [ref=f1e159]:
        - generic "Letter H" [ref=f1e161] [cursor=pointer]: H
        - generic "Letter E" [ref=f1e169] [cursor=pointer]: E
        - generic "Letter A" [ref=f1e177] [cursor=pointer]: A
        - generic "Letter R" [ref=f1e185] [cursor=pointer]: R
  - generic [ref=f1e192]:
    - button "UNDO" [ref=f1e193] [cursor=pointer]
    - button "Hint, 0 remaining" [ref=f1e199] [cursor=pointer]:
      - generic [ref=f1e200]: HINT · 0
    - button "Skip the welcome and go home" [ref=f1e208] [cursor=pointer]:
      - generic [ref=f1e209]: SKIP
```
