/**
 * Korean particles that change with the sound a word ends in: 을/를 and 으로/로.
 * Digits count as they are read aloud ("1-4" ends in 사, "3-1" in 일).
 */

/** The final consonant (jongseong index) of the last syllable as read aloud: 0 none, 8 ㄹ. */
function lastFinal(word: string): number {
  const ch = word.trim().slice(-1);
  const syllable = ch.charCodeAt(0) - 0xac00;
  if (syllable >= 0 && syllable < 11172) return syllable % 28;
  // 영 일 이 삼 사 오 육 칠 팔 구 (10 is 십, also with a final consonant like 영).
  const digit = '0123456789'.indexOf(ch);
  return digit >= 0 ? [21, 8, 0, 16, 0, 0, 1, 8, 8, 0][digit] : 0;
}

/** "1-4를", "3-1을", "챕터 2를". */
export const withObject = (word: string) => `${word}${lastFinal(word) ? '을' : '를'}`;

/** "위로", "오른쪽으로" (a final ㄹ takes 로, as in "서울로"). */
export const withTo = (word: string) => {
  const f = lastFinal(word);
  return `${word}${f && f !== 8 ? '으로' : '로'}`;
};
