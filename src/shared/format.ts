import { parseISO } from './schedule';
import type { DueItem, ISODate, RateType, Settings } from './types';

export function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function digitsOnly(s: string): string {
  return s.replace(/[^0-9]/g, '');
}

/** 숫자만 받아서 010-1234-5678 모양으로 */
export function formatPhone(input: string): string {
  const d = digitsOnly(input).slice(0, 11);
  if (d.startsWith('02')) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function isValidPhone(input: string): boolean {
  const d = digitsOnly(input);
  return d.length >= 9 && d.length <= 11;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 2026년 10월 21일 */
export function longDate(iso: ISODate): string {
  const { y, m, d } = parseISO(iso);
  return `${y}년 ${m}월 ${d}일`;
}

/** 2026년 10월 21일 수요일 */
export function longDateWithWeekday(iso: ISODate): string {
  const { y, m, d } = parseISO(iso);
  return `${longDate(iso)} ${WEEKDAYS[new Date(y, m - 1, d).getDay()]}요일`;
}

/** 10월 21일 */
export function monthDay(iso: ISODate): string {
  const { m, d } = parseISO(iso);
  return `${m}월 ${d}일`;
}

export function rateText(rateType: RateType, rate: number): string {
  return `${rateType === 'month' ? '월' : '연'} ${rate}%`;
}

export const DEFAULT_TEMPLATE =
  '[{상호}] {이름}님, {월}월 이자 {이자} 납부일({납부일})입니다. 입금 계좌: {계좌}. 감사합니다.';

/** 문자 문구 만들기. 템플릿의 {이름} {이자} {월} {납부일} {회차} {상호} {계좌} 를 채운다 ({가게이름} 은 예전 이름). */
export function renderMessage(settings: Settings, item: DueItem): string {
  const { m } = parseISO(item.dueDate);
  const values: Record<string, string> = {
    상호: settings.shopName || '상호',
    가게이름: settings.shopName || '상호',
    계좌: settings.account || '[계좌번호]',
    이름: item.name,
    이자: won(item.amount),
    월: String(m),
    납부일: monthDay(item.dueDate),
    회차: `${item.period}회차`
  };
  return (settings.template || DEFAULT_TEMPLATE).replace(/\{([^}]+)\}/g, (all, k: string) => values[k] ?? all);
}
