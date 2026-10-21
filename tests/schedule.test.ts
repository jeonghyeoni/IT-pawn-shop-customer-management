import { describe, expect, it } from 'vitest';
import {
  addMonths, buildDashboard, buildPeriods, buildSentList, daysBetween, dueDate, monthlyInterest, nextLabel,
  periodTotals, periodsUntil
} from '../src/shared/schedule';
import type { Contract, Customer, Notice, Payment } from '../src/shared/types';

function contract(over: Partial<Contract>): Contract {
  return {
    id: 1, customerId: 1, contractDate: '2026-06-21', principal: 1_000_000, rateType: 'month', rate: 3,
    monthlyInterest: 30_000, collateral: '아이폰', maturityDate: null, status: 'active', closedDate: null,
    memo: '', createdAt: '2026-06-21 10:00:00', ...over
  };
}
const customer = (id: number, name: string, phone: string): Customer =>
  ({ id, name, phone, memo: '', createdAt: '2026-01-01 00:00:00' });

describe('날짜 계산', () => {
  it('n개월 뒤 같은 날', () => {
    expect(addMonths('2026-06-21', 1)).toBe('2026-07-21');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
  });
  it('없는 날은 그 달 말일로', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonths('2026-01-31', 3)).toBe('2026-04-30');
  });
  it('고지일은 계약일 기준으로 매번 다시 계산 (말일 보정이 누적되지 않음)', () => {
    expect(dueDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(dueDate('2026-01-31', 2)).toBe('2026-03-31');
  });
  it('날짜 차이', () => {
    expect(daysBetween('2026-10-19', '2026-10-21')).toBe(2);
    expect(daysBetween('2026-10-21', '2026-10-25')).toBe(4);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
  it('계약일 기준 한 달 뒤부터 회차가 생긴다', () => {
    expect(periodsUntil('2026-06-21', '2026-07-20')).toEqual([]);
    expect(periodsUntil('2026-06-21', '2026-07-21')).toEqual([1]);
    expect(periodsUntil('2026-06-21', '2026-10-21')).toEqual([1, 2, 3, 4]);
  });
});

describe('이자 계산', () => {
  it('월 이자율', () => {
    expect(monthlyInterest(1_000_000, 'month', 3)).toBe(30_000);
    expect(monthlyInterest(800_000, 'month', 2.5)).toBe(20_000);
  });
  it('연 이자율은 12로 나누고 원 단위 반올림', () => {
    expect(monthlyInterest(1_000_000, 'year', 20)).toBe(16_667);
    expect(monthlyInterest(450_000, 'year', 40)).toBe(15_000);
  });
});

describe('오늘 할 일', () => {
  const today = '2026-10-21';
  const customers = [
    customer(1, '김영수', '010-2345-6789'),
    customer(2, '김영수', '010-9876-1234'),
    customer(3, '박정숙', '010-5555-1212')
  ];

  it('오늘 / 못 보낸 것 / 미납 / 만기 를 나눈다', () => {
    const contracts = [
      contract({ id: 1, customerId: 1, contractDate: '2026-06-21' }),
      contract({ id: 2, customerId: 2, contractDate: '2026-08-19', maturityDate: '2026-10-25' }),
      contract({ id: 3, customerId: 3, contractDate: '2026-09-21', status: 'repaid', closedDate: '2026-10-01' })
    ];
    const notices: Notice[] = [1, 2, 3].map((p) => ({ contractId: 1, period: p, sentAt: `2026-0${6 + p}-21 10:00:00`, auto: false }));
    const payments: Payment[] = [1, 2].map((p) => ({ contractId: 1, period: p, paidDate: '2026-08-01', amount: 30_000 }));
    const d = buildDashboard({ customers, contracts, notices, payments }, today);

    expect(d.dueToday.map((i) => [i.contractId, i.period])).toEqual([[1, 4]]);
    expect(d.dueToday[0].sameName).toBe(true);
    expect(d.todayTotal).toBe(1);
    // 계약 2: 9/19, 10/19 두 번 못 보냄
    expect(d.late.map((i) => [i.contractId, i.period, i.daysLate])).toEqual([[2, 1, 32], [2, 2, 2]]);
    // 미납: 계약1 3회차(9/21), 계약2 1·2회차. 오늘 회차는 아직 미납 아님. 끝난 계약 제외.
    expect(d.unpaid.map((i) => [i.contractId, i.period])).toEqual([[2, 1], [1, 3], [2, 2]]);
    expect(d.maturity).toEqual([expect.objectContaining({ contractId: 2, daysLeft: 4 })]);
    expect(d.recent.map((i) => i.period)).toEqual([3, 2, 1]);
    expect(d.recentTotal).toBe(3);
  });

  it('보냄 처리하면 오늘 목록에서 빠지고 최근 보낸 목록에 들어간다', () => {
    const contracts = [contract({ id: 1, customerId: 3 })];
    const before = buildDashboard({ customers, contracts, notices: [], payments: [] }, today);
    expect(before.dueToday).toHaveLength(1);
    const notices: Notice[] = [{ contractId: 1, period: 4, sentAt: '2026-10-21 11:00:00', auto: false }];
    const after = buildDashboard({ customers, contracts, notices, payments: [] }, today);
    expect(after.dueToday).toHaveLength(0);
    expect(after.recent[0]).toEqual(expect.objectContaining({ period: 4, sentAt: '2026-10-21 11:00:00', sameName: false }));
  });

  it('자동 처리된 지난 회차는 최근 보낸 목록에 나오지 않는다', () => {
    const contracts = [contract({ id: 1, customerId: 3 })];
    const notices: Notice[] = [{ contractId: 1, period: 1, sentAt: '2026-07-21 00:00:00', auto: true }];
    const d = buildDashboard({ customers, contracts, notices, payments: [] }, today);
    expect(d.recent).toEqual([]);
    expect(buildSentList({ customers, contracts, notices, payments: [] }, today)).toEqual([]);
  });
});

describe('계약 상세', () => {
  it('회차 표와 합계', () => {
    const c = contract({});
    const notices: Notice[] = [1, 2, 3].map((p) => ({ contractId: 1, period: p, sentAt: 'x', auto: false }));
    const payments: Payment[] = [{ contractId: 1, period: 1, paidDate: '2026-07-22', amount: 30_000 }];
    const rows = buildPeriods(c, notices, payments, '2026-10-21');
    expect(rows.map((r) => [r.period, r.dueDate, r.future, r.isToday, r.sent, r.paidDate])).toEqual([
      [1, '2026-07-21', false, false, true, '2026-07-22'],
      [2, '2026-08-21', false, false, true, null],
      [3, '2026-09-21', false, false, true, null],
      [4, '2026-10-21', false, true, false, null],
      [5, '2026-11-21', true, false, false, null]
    ]);
    expect(periodTotals(rows, 30_000)).toEqual({
      accrued: 120_000, accruedCount: 4, paid: 30_000, paidCount: 1, due: 90_000, dueCount: 3
    });
  });

  it('끝난 계약은 끝난 날까지만, 예정 회차 없음', () => {
    const c = contract({ status: 'repaid', closedDate: '2026-09-01' });
    const rows = buildPeriods(c, [], [], '2026-10-21');
    expect(rows.map((r) => r.period)).toEqual([1, 2]);
  });
});

describe('계약 목록의 다음 문자', () => {
  const today = '2026-10-21';
  it('오늘 / 못 보냄 / 다음 날짜 / 만기', () => {
    expect(nextLabel(contract({}), new Set([1, 2, 3]), today)).toEqual({ label: '오늘', kind: 'today' });
    expect(nextLabel(contract({}), new Set([1, 2, 3, 4]), today)).toEqual({ label: '11/21', kind: 'normal' });
    expect(nextLabel(contract({}), new Set([1, 2]), today)).toEqual({ label: '09/21 미발송', kind: 'late' });
    expect(nextLabel(contract({ contractDate: '2026-10-05', maturityDate: '2026-10-25' }), new Set(), today))
      .toEqual({ label: '11/05 · 만기', kind: 'normal' });
    expect(nextLabel(contract({ status: 'forfeited' }), new Set(), today)).toEqual({ label: '—', kind: 'none' });
  });
});
