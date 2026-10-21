import type {
  Contract, ContractRow, Customer, Dashboard, DueItem, ISODate, MaturityItem, Notice, Payment, PeriodRow, RateType
} from './types';

/** 만기 며칠 전부터 '만기가 다가오는 계약'에 보여줄지 */
export const MATURITY_WARN_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseISO(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** n개월 뒤 같은 날. 그 달에 그 날이 없으면 말일 (1/31 → 2/28). */
export function addMonths(iso: ISODate, n: number): ISODate {
  const { y, m, d } = parseISO(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toISO(ny, nm, Math.min(d, lastDayOfMonth(ny, nm)));
}

/** b - a (일) */
export function daysBetween(a: ISODate, b: ISODate): number {
  const pa = parseISO(a);
  const pb = parseISO(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

/** n회차 이자 고지일 = 계약일 + n개월 */
export function dueDate(contractDate: ISODate, period: number): ISODate {
  return addMonths(contractDate, period);
}

/** 매달 받을 이자 (원 단위 반올림). 연 이자율은 12로 나눈다. */
export function monthlyInterest(principal: number, rateType: RateType, rate: number): number {
  const monthly = rateType === 'month' ? (principal * rate) / 100 : (principal * rate) / 100 / 12;
  return Math.round(monthly);
}

/** until(포함)까지 고지일이 지난 회차 번호들 */
export function periodsUntil(contractDate: ISODate, until: ISODate): number[] {
  const out: number[] = [];
  for (let n = 1; dueDate(contractDate, n) <= until; n++) out.push(n);
  return out;
}

/** 계약이 이자를 발생시키는 마지막 날 (진행 중이면 오늘, 끝났으면 끝난 날) */
function activeUntil(c: Contract, today: ISODate): ISODate {
  if (c.status === 'active' || !c.closedDate) return today;
  return c.closedDate < today ? c.closedDate : today;
}

const key = (contractId: number, period: number) => `${contractId}:${period}`;

export interface ScheduleData {
  customers: Customer[];
  contracts: Contract[];
  notices: Notice[];
  payments: Payment[];
}

function indexData(data: ScheduleData) {
  const customers = new Map(data.customers.map((c) => [c.id, c]));
  const nameCount = new Map<string, number>();
  for (const c of data.customers) nameCount.set(c.name, (nameCount.get(c.name) ?? 0) + 1);
  const notices = new Map(data.notices.map((n) => [key(n.contractId, n.period), n]));
  const payments = new Map(data.payments.map((p) => [key(p.contractId, p.period), p]));
  return { customers, nameCount, notices, payments };
}

function makeItem(
  c: Contract, period: number, today: ISODate, idx: ReturnType<typeof indexData>
): DueItem {
  const cust = idx.customers.get(c.customerId);
  const due = dueDate(c.contractDate, period);
  const notice = idx.notices.get(key(c.id, period));
  const payment = idx.payments.get(key(c.id, period));
  return {
    contractId: c.id,
    customerId: c.customerId,
    name: cust?.name ?? '',
    phone: cust?.phone ?? '',
    sameName: (idx.nameCount.get(cust?.name ?? '') ?? 0) > 1,
    period,
    dueDate: due,
    amount: c.monthlyInterest,
    principal: c.principal,
    rateType: c.rateType,
    rate: c.rate,
    contractDate: c.contractDate,
    collateral: c.collateral,
    paid: !!payment,
    paidDate: payment?.paidDate ?? null,
    daysLate: Math.max(0, daysBetween(due, today)),
    sentAt: notice?.sentAt ?? null
  };
}

/** 시작 화면에 보여줄 내용 전부 */
export function buildDashboard(data: ScheduleData, today: ISODate, recentLimit = 3): Dashboard {
  const idx = indexData(data);
  const dueToday: DueItem[] = [];
  const late: DueItem[] = [];
  const unpaid: DueItem[] = [];
  const maturity: MaturityItem[] = [];

  for (const c of data.contracts) {
    if (c.status !== 'active') continue;
    for (const n of periodsUntil(c.contractDate, today)) {
      const item = makeItem(c, n, today, idx);
      if (item.dueDate === today) dueToday.push(item);
      else if (!item.sentAt) late.push(item);
      if (!item.paid && item.dueDate < today) unpaid.push(item);
    }
    if (c.maturityDate) {
      const daysLeft = daysBetween(today, c.maturityDate);
      if (daysLeft <= MATURITY_WARN_DAYS) {
        const cust = idx.customers.get(c.customerId);
        maturity.push({
          contractId: c.id, name: cust?.name ?? '', phone: cust?.phone ?? '',
          collateral: c.collateral, maturityDate: c.maturityDate, daysLeft
        });
      }
    }
  }

  const contracts = new Map(data.contracts.map((c) => [c.id, c]));
  const recentAll = data.notices
    .filter((n) => !n.auto && contracts.has(n.contractId))
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : a.sentAt > b.sentAt ? -1 : 0));

  late.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  unpaid.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  maturity.sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));

  return {
    today,
    dueToday,
    late,
    unpaid,
    maturity,
    recent: recentAll.slice(0, recentLimit).map((n) => makeItem(contracts.get(n.contractId)!, n.period, today, idx)),
    recentTotal: recentAll.length
  };
}

/** 보낸 이자 문자 전체 (최근 것부터) */
export function buildSentList(data: ScheduleData, today: ISODate): DueItem[] {
  return buildDashboard(data, today, Number.MAX_SAFE_INTEGER).recent;
}

/** 계약 상세의 회차별 표 (지난 회차 + 다음 예정 1회) */
export function buildPeriods(c: Contract, notices: Notice[], payments: Payment[], today: ISODate): PeriodRow[] {
  const sent = new Map(notices.map((n) => [n.period, n.sentAt]));
  const paid = new Map(payments.map((p) => [p.period, p]));
  const rows: PeriodRow[] = periodsUntil(c.contractDate, activeUntil(c, today)).map((n) => {
    const due = dueDate(c.contractDate, n);
    return {
      period: n, dueDate: due, future: false, isToday: due === today,
      sent: sent.has(n), sentAt: sent.get(n) ?? null, paidDate: paid.get(n)?.paidDate ?? null, amount: paid.get(n)?.amount ?? c.monthlyInterest
    };
  });
  if (c.status === 'active') {
    const n = rows.length + 1;
    rows.push({
      period: n, dueDate: dueDate(c.contractDate, n), future: true, isToday: false,
      sent: false, sentAt: null, paidDate: null, amount: c.monthlyInterest
    });
  }
  return rows;
}

export function periodTotals(rows: PeriodRow[], monthly: number) {
  const past = rows.filter((r) => !r.future);
  const paidRows = past.filter((r) => r.paidDate);
  const accrued = past.length * monthly;
  const paid = paidRows.reduce((s, r) => s + r.amount, 0);
  return {
    accrued, accruedCount: past.length,
    paid, paidCount: paidRows.length,
    due: Math.max(0, accrued - paid), dueCount: past.length - paidRows.length
  };
}

/** 계약 목록의 '다음 문자' 칸 */
export function nextLabel(c: Contract, sentPeriods: Set<number>, today: ISODate): ContractRow['next'] {
  if (c.status !== 'active') return { label: '—', kind: 'none' };
  const missed = periodsUntil(c.contractDate, today).filter((n) => !sentPeriods.has(n) && dueDate(c.contractDate, n) < today);
  const maturity = c.maturityDate && daysBetween(today, c.maturityDate) <= MATURITY_WARN_DAYS ? ' · 만기' : '';
  if (missed.length) return { label: `${shortDate(dueDate(c.contractDate, missed[0]))} 미발송${maturity}`, kind: 'late' };
  let n = 1;
  while (dueDate(c.contractDate, n) < today || (dueDate(c.contractDate, n) === today && sentPeriods.has(n))) n++;
  const due = dueDate(c.contractDate, n);
  if (due === today) return { label: `오늘${maturity}`, kind: 'today' };
  return { label: `${shortDate(due)}${maturity}`, kind: 'normal' };
}

/** 'MM/DD' */
export function shortDate(iso: ISODate): string {
  const { m, d } = parseISO(iso);
  return `${pad(m)}/${pad(d)}`;
}
