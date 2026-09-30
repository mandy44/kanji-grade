export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type MaxGrade = 0 | Grade;

export type TextViolation = {
  character: string;
  grade: Grade | null;
  /** Zero-based UTF-16 offset in the original string. */
  index: number;
  reason: 'above-grade' | 'unlisted-kanji';
};

export type CheckTextResult = {
  valid: boolean;
  violations: TextViolation[];
};

export function getGrade(character: string): Grade | null;
export function getKanjiForGrade(grade: Grade): string[];
export function getKanjiThroughGrade(maxGrade: MaxGrade): string[];
export function checkText(text: string, options: { maxGrade: MaxGrade }): CheckTextResult;
