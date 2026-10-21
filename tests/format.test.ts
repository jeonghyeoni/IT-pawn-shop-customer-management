import { describe, expect, it } from 'vitest';
import { formatPhone, isValidPhone, longDateWithWeekday, renderMessage, won } from '../src/shared/format';
import type { DueItem } from '../src/shared/types';

describe('표시 형식', () => {
  it('원화', () => {
    expect(won(1000000)).toBe('1,000,000원');
    expect(won(16666.7)).toBe('16,667원');
  });
  it('전화번호', () => {
    expect(formatPhone('01023456789')).toBe('010-2345-6789');
    expect(formatPhone('010-2345-6789')).toBe('010-2345-6789');
    expect(formatPhone('0101234567')).toBe('010-123-4567');
    expect(formatPhone('0212345678')).toBe('02-1234-5678');
    expect(formatPhone('010')).toBe('010');
    expect(isValidPhone('010-2345-6789')).toBe(true);
    expect(isValidPhone('010-23')).toBe(false);
  });
  it('요일', () => {
    expect(longDateWithWeekday('2026-10-21')).toBe('2026년 10월 21일 수요일');
  });
  it('문자 문구', () => {
    const item = { name: '김영수', amount: 30000, dueDate: '2026-10-21', period: 4 } as DueItem;
    expect(renderMessage({ shopName: '행복전당포', account: '농협 123', template: '' }, item))
      .toBe('[행복전당포] 김영수님, 10월 이자 30,000원 납부일(10월 21일)입니다. 입금 계좌: 농협 123. 감사합니다.');
    expect(renderMessage({ shopName: 'A', account: 'B', template: '{이름} {회차} {모름}' }, item)).toBe('김영수 4회차 {모름}');
  });
});
