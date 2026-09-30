import { gradeData } from '../data/grades.js';

const gradeByKanji = new Map();
for (let i = 0; i < gradeData.length; i += 1) {
  for (const character of gradeData[i]) gradeByKanji.set(character, i + 1);
}

// Fixed to Unicode 18.0.0 assigned CJK unified and compatibility ideographs.
// Explicit ranges keep classification independent of the runtime's UCD.
const kanjiPattern = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFA6D\uFA70-\uFAD9\u{20000}-\u{2A6DF}\u{2A700}-\u{2B81E}\u{2B820}-\u{2CEAD}\u{2CEB0}-\u{2EBE0}\u{2EBF0}-\u{2EE5D}\u{2F800}-\u{2FA1D}\u{30000}-\u{3134A}\u{31350}-\u{33479}]/u;

function assertGrade(grade, { allowZero = false } = {}) {
  const min = allowZero ? 0 : 1;
  if (typeof grade !== 'number') throw new TypeError('grade must be a number');
  if (!Number.isInteger(grade) || grade < min || grade > 6) {
    throw new RangeError(`grade must be an integer from ${min} to 6`);
  }
}

function isKanji(character) {
  // Iteration marks and the ideographic zero are symbols, not assigned kanji here.
  if (character === '々' || character === '〇') return false;
  return kanjiPattern.test(character);
}

/** Return the assigned elementary-school grade, or null when unlisted/non-kanji. */
export function getGrade(character) {
  if (typeof character !== 'string') throw new TypeError('character must be a string');
  const points = Array.from(character);
  if (points.length !== 1) throw new TypeError('character must contain exactly one Unicode code point');
  return gradeByKanji.get(character) ?? null;
}

/** Return a fresh array of kanji assigned to one grade. */
export function getKanjiForGrade(grade) {
  assertGrade(grade);
  return [...gradeData[grade - 1]];
}

/** Return a fresh array of kanji assigned through maxGrade; 0 returns an empty array. */
export function getKanjiThroughGrade(maxGrade) {
  assertGrade(maxGrade, { allowZero: true });
  return gradeData.slice(0, maxGrade).flatMap((grade) => [...grade]);
}

/** Find every above-grade or unlisted Han ideograph occurrence in text. */
export function checkText(text, options) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object with maxGrade');
  }
  const { maxGrade } = options;
  assertGrade(maxGrade, { allowZero: true });

  const violations = [];
  let index = 0;
  for (const character of text) {
    if (isKanji(character)) {
      const grade = gradeByKanji.get(character) ?? null;
      if (grade === null) {
        violations.push({ character, grade: null, index, reason: 'unlisted-kanji' });
      } else if (grade > maxGrade) {
        violations.push({ character, grade, index, reason: 'above-grade' });
      }
    }
    index += character.length;
  }

  return { valid: violations.length === 0, violations };
}
