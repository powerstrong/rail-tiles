import { describe, expect, it } from 'vitest';
import { withObject, withTo } from './korean';

describe('Korean particles', () => {
  it('picks 을/를 by the last sound, digits as read aloud', () => {
    expect(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((n) => withObject(`챕터 ${n}`))).toEqual([
      '챕터 1을',
      '챕터 2를',
      '챕터 3을',
      '챕터 4를',
      '챕터 5를',
      '챕터 6을',
      '챕터 7을',
      '챕터 8을',
      '챕터 9를',
      '챕터 10을',
    ]);
    expect(withObject('1-4')).toBe('1-4를');
    expect(withObject('3-1')).toBe('3-1을');
    expect(withObject('기차')).toBe('기차를');
    expect(withObject('정거장')).toBe('정거장을');
  });

  it('picks 으로/로, with 로 after a final ㄹ', () => {
    expect(['위', '오른쪽', '아래', '왼쪽'].map(withTo)).toEqual(['위로', '오른쪽으로', '아래로', '왼쪽으로']);
    expect(withTo('서울')).toBe('서울로');
  });
});
