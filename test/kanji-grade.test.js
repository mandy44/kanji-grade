import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  checkText,
  getGrade,
  getKanjiForGrade,
  getKanjiThroughGrade,
} from '../src/index.js';

const gradeCounts = [80, 160, 200, 202, 193, 191];
const officialReference = JSON.parse(
  await readFile(new URL('./fixtures/mext-2017-allocation.json', import.meta.url), 'utf8'),
);

test('all grade allocations match the independent MEXT table transcription', () => {
  assert.equal(officialReference.grades.length, 6);
  for (let grade = 1; grade <= 6; grade += 1) {
    const expected = Array.from(officialReference.grades[grade - 1].replace(/\s/gu, ''));
    const actual = getKanjiForGrade(grade);
    assert.equal(expected.length, gradeCounts[grade - 1], `reference grade ${grade} count`);
    assert.equal(new Set(expected).size, expected.length, `reference grade ${grade} has no duplicates`);
    assert.deepEqual(actual, expected, `grade ${grade} characters and official order`);
  }
});

test('published grade lists have the official sizes and through-grade order', () => {
  const all = [];
  const seen = new Set();

  for (let grade = 1; grade <= 6; grade += 1) {
    const list = getKanjiForGrade(grade);
    assert.equal(list.length, gradeCounts[grade - 1], `grade ${grade} count`);
    assert.equal(new Set(list).size, list.length, `grade ${grade} has no duplicates`);
    assert.ok(list.every((character) => Array.from(character).length === 1));
    for (const character of list) {
      assert.ok(!seen.has(character), `duplicate across grades: ${character}`);
      seen.add(character);
      assert.equal(getGrade(character), grade, `${character} reverse lookup`);
    }
    all.push(...list);
    assert.deepEqual(getKanjiThroughGrade(grade), all);
  }

  assert.equal(seen.size, 1026);
  assert.deepEqual(getKanjiThroughGrade(0), []);
});

test('representative allocations include the 2020 grade moves', () => {
  const expected = new Map([
    ['一', 1], ['林', 1], ['引', 2], ['曜', 2], ['医', 3], ['練', 3],
    ['愛', 4], ['茨', 4], ['賀', 4], ['群', 4], ['徳', 4], ['富', 4], ['城', 4],
    ['囲', 5], ['紀', 5], ['喜', 5], ['救', 5], ['型', 5], ['航', 5], ['告', 5],
    ['殺', 5], ['士', 5], ['史', 5], ['象', 5], ['賞', 5], ['貯', 5], ['停', 5],
    ['堂', 5], ['得', 5], ['毒', 5], ['費', 5], ['粉', 5], ['脈', 5], ['歴', 5],
    ['胃', 6], ['腸', 6], ['恩', 6], ['券', 6], ['承', 6], ['舌', 6], ['銭', 6],
    ['退', 6], ['敵', 6], ['俵', 6], ['預', 6],
  ]);
  for (const [character, grade] of expected) assert.equal(getGrade(character), grade, character);
});

test('lookup returns null for non-kanji and kanji outside the allocation table', () => {
  for (const character of ['あ', 'ア', 'A', '。', '🙂', '龘', '𠮷', '﨑']) {
    assert.equal(getGrade(character), null, character);
  }
});

test('checkText uses Unicode 18.0.0 Han assignment boundaries', () => {
  // Boundary points cross-checked against Unicode 18.0.0 PropList.txt, Unified_Ideograph.
  const assignedButUnlisted = [
    0x3400, 0x4dbf, 0x9fff,
    0x20000, 0x2a6df, 0x2a700, 0x2b81e, 0x2b820, 0x2cead,
    0x2ceb0, 0x2ebe0, 0x2ebf0, 0x2ee5d, 0x2f800, 0x2fa1d,
    0x30000, 0x3134a, 0x31350, 0x323b0, 0x33479,
  ];
  for (const point of assignedButUnlisted) {
    const character = String.fromCodePoint(point);
    assert.deepEqual(checkText(character, { maxGrade: 6 }), {
      valid: false,
      violations: [{ character, grade: null, index: 0, reason: 'unlisted-kanji' }],
    }, `U+${point.toString(16).toUpperCase()}`);
  }

  const unassignedOrOutside = [0xfa6e, 0xfa6f, 0xfada, 0xfaff, 0x2fa1e, 0x2b81f, 0x3347a];
  for (const point of unassignedOrOutside) {
    const character = String.fromCodePoint(point);
    assert.deepEqual(checkText(character, { maxGrade: 6 }), { valid: true, violations: [] },
      `U+${point.toString(16).toUpperCase()} is not an assigned Han ideograph`);
  }
});

test('checkText reports every occurrence, preserves UTF-16 offsets, and ignores non-kanji', () => {
  const text = '🙂月\nあ胃胃をあ。𠮷﨑';
  const result = checkText(text, { maxGrade: 4 });

  assert.equal(result.valid, false);
  assert.deepEqual(result.violations, [
    { character: '胃', grade: 6, index: 5, reason: 'above-grade' },
    { character: '胃', grade: 6, index: 6, reason: 'above-grade' },
    { character: '𠮷', grade: null, index: 10, reason: 'unlisted-kanji' },
    { character: '﨑', grade: null, index: 12, reason: 'unlisted-kanji' },
  ]);
});

test('grade zero flags all listed kanji while empty and punctuation-only text is valid', () => {
  assert.deepEqual(checkText('', { maxGrade: 0 }), { valid: true, violations: [] });
  assert.deepEqual(checkText('🙂、。\n', { maxGrade: 0 }), { valid: true, violations: [] });
  assert.deepEqual(checkText('一あ𠮷', { maxGrade: 0 }), {
    valid: false,
    violations: [
      { character: '一', grade: 1, index: 0, reason: 'above-grade' },
      { character: '𠮷', grade: null, index: 2, reason: 'unlisted-kanji' },
    ],
  });
});

test('returned grade arrays are defensive copies', () => {
  const first = getKanjiForGrade(1);
  first.push('龘');
  first[0] = '改';
  assert.equal(getKanjiForGrade(1).length, 80);
  assert.equal(getKanjiForGrade(1)[0], '一');
  assert.equal(getGrade('龘'), null);

  const cumulative = getKanjiThroughGrade(2);
  cumulative.splice(0, cumulative.length);
  assert.equal(getKanjiThroughGrade(2).length, 240);
});

test('invalid values fail with the documented error classes', () => {
  for (const value of [null, undefined, 1, NaN, Infinity, {}, ['一'], '']) {
    assert.throws(() => getGrade(value), TypeError);
  }
  for (const value of ['一二', '🙂🙂']) assert.throws(() => getGrade(value), TypeError);

  for (const value of [7, -1, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => getKanjiForGrade(value), RangeError);
    assert.throws(() => checkText('一', { maxGrade: value }), RangeError);
  }
  assert.throws(() => getKanjiThroughGrade(-1), RangeError);
  assert.throws(() => getKanjiThroughGrade(7), RangeError);
  assert.throws(() => getKanjiThroughGrade(1.5), RangeError);
  assert.throws(() => getKanjiThroughGrade(NaN), RangeError);
  assert.throws(() => getKanjiThroughGrade(Infinity), RangeError);
  assert.throws(() => getKanjiThroughGrade(-Infinity), RangeError);
  assert.throws(() => getKanjiForGrade(0), RangeError);
  for (const value of [null, undefined, '4', {}]) {
    assert.throws(() => getKanjiForGrade(value), TypeError);
    assert.throws(() => getKanjiThroughGrade(value), TypeError);
    assert.throws(() => checkText('一', { maxGrade: value }), TypeError);
  }
  for (const value of [null, undefined, 1, {}, ['一']]) {
    assert.throws(() => checkText(value, { maxGrade: 4 }), TypeError);
  }
  assert.throws(() => checkText('一'), TypeError, 'maxGrade is required');
  assert.throws(() => checkText('一', null), TypeError);
  assert.throws(() => checkText('一', {}), TypeError);
});

test('Japanese newspaper fields can be checked using a standalone fixture', async () => {
  const sample = JSON.parse(
    await readFile(new URL('./fixtures/newspaper-ja.json', import.meta.url), 'utf8'),
  );
  const ja = sample.editions.find((edition) => edition.language === 'ja');
  assert.ok(ja, 'Japanese edition exists');

  const strings = [];
  const visit = (value) => {
    if (typeof value === 'string') strings.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(ja);
  assert.ok(strings.length > 0);
  for (const text of strings) {
    const result = checkText(text, { maxGrade: 4 });
    assert.equal(typeof result.valid, 'boolean');
    assert.ok(Array.isArray(result.violations));
  }
});
