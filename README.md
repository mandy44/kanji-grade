# kanji-grade

A small, dependency-free ESM library for checking Japanese text against the
elementary-school kanji allocation in Japan's 2017 Course of Study. It runs on
Node.js 18+ and modern browsers. The package ships JavaScript source directly;
there is no build step.

```js
import { checkText, getGrade, getKanjiForGrade, getKanjiThroughGrade } from 'kanji-grade';

getGrade('学'); // 1
getKanjiForGrade(1); // a new array of first-grade kanji
getKanjiThroughGrade(2); // a new array of first- and second-grade kanji
checkText('学校で本を読む。', { maxGrade: 2 });
// { valid: true, violations: [] }
```

In a browser, import the source module by URL (or map `kanji-grade` to that URL
with an import map), for example:

```js
import { getGrade } from '/node_modules/kanji-grade/src/index.js';
```

## API

- `getGrade(character)` accepts exactly one Unicode code point and returns its
  assigned grade (`1`–`6`), or `null` when it is not in the allocation table.
- `getKanjiForGrade(grade)` returns a new array for one grade (`1`–`6`).
- `getKanjiThroughGrade(maxGrade)` returns a new array through grade `0`–`6`;
  grade `0` returns an empty array.
- `checkText(text, { maxGrade })` returns `{ valid, violations }`. Each
  occurrence above the chosen grade has reason `above-grade`; each detected
  Han ideograph absent from the allocation table has reason `unlisted-kanji`.
  Violations retain text order and repeated occurrences. `index` is a
  zero-based UTF-16 offset in the original, unnormalized string.

Invalid argument types throw `TypeError`; invalid grade values throw
`RangeError`. Returned arrays are copies, so callers cannot alter internal data.

## Character handling

The package does not normalize text. It checks the exact code points supplied:
full-width forms, compatibility ideographs, and variant glyphs are not mapped
to their lookalikes. Han detection uses the explicitly listed assigned CJK
unified and compatibility ideograph ranges from Unicode 18.0.0, so Node.js and
browsers produce the same result regardless of their built-in Unicode version.
Detected characters missing from the school table are reported as
`unlisted-kanji`; other scripts and punctuation are ignored. This Unicode
version is fixed; detecting characters added in a later Unicode release
requires updating the range data.

The iteration mark `々` and ideographic zero `〇` are treated as symbols and
ignored. Unicode variation selectors are also ignored as separate non-kanji
code points; the base ideograph is checked as written. The library does not
interpret HTML or ruby markup and does not convert readings.

## Data and license

The fixed grade data comes directly from MEXT's 2017 notification table; the
six grade counts are 80, 160, 200, 202, 193, and 191 (1,026 total). See
[NOTICE](./NOTICE) for source attribution, adaptation details, and data terms.
The software code is MIT licensed; the data retains the MEXT website terms,
which are compatible with CC BY 4.0.

## Local development

Clone the repository and run the tests; no dependency installation or build
step is required:

```sh
git clone https://github.com/mandy44/kanji-grade.git
cd kanji-grade
npm test
```

To check and create the npm tarball from the package directory:

```sh
npm pack --dry-run
npm pack --pack-destination /tmp
```

Install the local tarball from a separate application directory:

```sh
npm install /tmp/kanji-grade-0.1.0.tgz
```

The package can be used through that local installation without publishing
it to npm.
