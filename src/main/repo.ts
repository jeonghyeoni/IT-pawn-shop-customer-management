import type { CustomerInput, CustomerSaveResult } from '../shared/api';
import { DEFAULT_TEMPLATE, digitsOnly, formatPhone, isValidPhone } from '../shared/format';
import {
  buildDashboard, buildPeriods, buildSentList, dueDate, monthlyInterest, nextLabel, periodTotals, periodsUntil,
  type ScheduleData
} from '../shared/schedule';
import type {
  Contract, ContractDetail, ContractFilter, ContractInput, ContractRow, ContractStatus, Customer, CustomerDetail,
  CustomerSummary, Dashboard, DueItem, ISODate, Notice, Payment, Settings
} from '../shared/types';
import type { Store } from './store';

interface CustomerRecord { id: number; name: string; phone: string; memo: string; created_at: string }
interface ContractRecord {
  id: number; customer_id: number; contract_date: string; principal: number; rate_type: 'month' | 'year';
  rate: number; monthly_interest: number; collateral: string; maturity_date: string | null;
  status: ContractStatus; closed_date: string | null; memo: string; created_at: string;
}

const toCustomer = (r: CustomerRecord): Customer =>
  ({ id: r.id, name: r.name, phone: r.phone, memo: r.memo, createdAt: r.created_at });

const toContract = (r: ContractRecord): Contract => ({
  id: r.id, customerId: r.customer_id, contractDate: r.contract_date, principal: r.principal,
  rateType: r.rate_type, rate: r.rate, monthlyInterest: r.monthly_interest, collateral: r.collateral,
  maturityDate: r.maturity_date, status: r.status, closedDate: r.closed_date, memo: r.memo, createdAt: r.created_at
});

export function nowStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function checkDate(value: string | null, label: string, required: boolean): void {
  if (!value) {
    if (required) throw new Error(`${label}을(를) 입력해 주세요.`);
    return;
  }
  if (!ISO_RE.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`${label}이(가) 올바른 날짜가 아닙니다.`);
}

function checkContract(input: ContractInput): void {
  checkDate(input.contractDate, '계약한 날', true);
  checkDate(input.maturityDate, '만기일', false);
  if (!Number.isInteger(input.principal) || input.principal <= 0) throw new Error('빌려준 돈을 입력해 주세요.');
  if (!(input.rate >= 0) || input.rate > 1000) throw new Error('이자율을 확인해 주세요.');
  if (input.rateType !== 'month' && input.rateType !== 'year') throw new Error('이자 기준을 골라 주세요.');
  if (input.maturityDate && input.maturityDate < input.contractDate) throw new Error('만기일이 계약한 날보다 앞입니다.');
}

export class Repo {
  constructor(private store: Store) {}

  // ---------- 불러오기 ----------

  private customers(): Customer[] {
    return this.store.all<CustomerRecord>('SELECT * FROM customers ORDER BY name, id').map(toCustomer);
  }

  private contracts(where = '', params: (string | number)[] = []): Contract[] {
    return this.store.all<ContractRecord>(`SELECT * FROM contracts ${where} ORDER BY contract_date DESC, id DESC`, params)
      .map(toContract);
  }

  private notices(where = '', params: (string | number)[] = []): Notice[] {
    return this.store.all<{ contract_id: number; period: number; sent_at: string; auto: number }>(
      `SELECT * FROM notices ${where}`, params
    ).map((n) => ({ contractId: n.contract_id, period: n.period, sentAt: n.sent_at, auto: n.auto === 1 }));
  }

  private payments(where = '', params: (string | number)[] = []): Payment[] {
    return this.store.all<{ contract_id: number; period: number; paid_date: string; amount: number }>(
      `SELECT * FROM payments ${where}`, params
    ).map((p) => ({ contractId: p.contract_id, period: p.period, paidDate: p.paid_date, amount: p.amount }));
  }

  private scheduleData(): ScheduleData {
    return { customers: this.customers(), contracts: this.contracts(), notices: this.notices(), payments: this.payments() };
  }

  private contract(id: number): Contract {
    const c = this.contracts('WHERE id = ?', [id])[0];
    if (!c) throw new Error('계약을 찾을 수 없습니다.');
    return c;
  }

  private customer(id: number): Customer {
    const r = this.store.get<CustomerRecord>('SELECT * FROM customers WHERE id = ?', [id]);
    if (!r) throw new Error('회원을 찾을 수 없습니다.');
    return toCustomer(r);
  }

  // ---------- 오늘 할 일 / 문자 ----------

  dashboard(today: ISODate): Dashboard {
    return buildDashboard(this.scheduleData(), today);
  }

  sentList(today: ISODate): DueItem[] {
    return buildSentList(this.scheduleData(), today);
  }

  markSent(contractId: number, period: number, sent: boolean): void {
    this.store.tx(() => {
      if (sent) {
        this.store.run('INSERT OR REPLACE INTO notices (contract_id, period, sent_at, auto) VALUES (?, ?, ?, 0)',
          [contractId, period, nowStamp()]);
      } else {
        this.store.run('DELETE FROM notices WHERE contract_id = ? AND period = ?', [contractId, period]);
      }
    });
  }

  setPaid(contractId: number, period: number, paidDate: ISODate | null): void {
    const c = this.contract(contractId);
    checkDate(paidDate, '받은 날짜', false);
    this.store.tx(() => {
      if (paidDate) {
        const existing = this.payments('WHERE contract_id = ? AND period = ?', [contractId, period])[0];
        this.store.run('INSERT OR REPLACE INTO payments (contract_id, period, paid_date, amount) VALUES (?, ?, ?, ?)',
          [contractId, period, paidDate, existing?.amount ?? c.monthlyInterest]);
      } else {
        this.store.run('DELETE FROM payments WHERE contract_id = ? AND period = ?', [contractId, period]);
      }
    });
  }

  // ---------- 회원 ----------

  findCustomers(query: string): CustomerSummary[] {
    const q = query.replace(/\s/g, '');
    const qd = digitsOnly(q);
    const all = this.customers();
    const nameCount = new Map<string, number>();
    for (const c of all) nameCount.set(c.name, (nameCount.get(c.name) ?? 0) + 1);
    const counts = new Map<number, { active: number; closed: number }>();
    for (const r of this.store.all<{ customer_id: number; status: string; n: number }>(
      'SELECT customer_id, status, COUNT(*) AS n FROM contracts GROUP BY customer_id, status'
    )) {
      const e = counts.get(r.customer_id) ?? { active: 0, closed: 0 };
      if (r.status === 'active') e.active += r.n; else e.closed += r.n;
      counts.set(r.customer_id, e);
    }
    return all
      .filter((c) => !q || c.name.replace(/\s/g, '').includes(q) || (qd.length > 0 && digitsOnly(c.phone).includes(qd)))
      .map((c) => ({
        ...c,
        activeCount: counts.get(c.id)?.active ?? 0,
        closedCount: counts.get(c.id)?.closed ?? 0,
        sameNameCount: (nameCount.get(c.name) ?? 1) - 1
      }));
  }

  customerDetail(id: number, today: ISODate): CustomerDetail {
    const customer = this.customer(id);
    const sameName = this.customers().filter((c) => c.name === customer.name && c.id !== id);
    return { customer, contracts: this.searchContracts({ query: '', from: null, to: null, status: 'all' }, today, id), sameName };
  }

  private validateCustomer(input: CustomerInput, selfId: number | null): CustomerSaveResult | { name: string; phone: string; memo: string } {
    const name = input.name.trim();
    if (!name) return { ok: false, message: '이름을 입력해 주세요.' };
    if (!isValidPhone(input.phone)) return { ok: false, message: '전화번호를 정확히 입력해 주세요.' };
    const phone = formatPhone(input.phone);
    const dup = this.customers().find((c) => c.id !== selfId && c.name === name && digitsOnly(c.phone) === digitsOnly(phone));
    if (dup) return { ok: false, message: '같은 이름과 전화번호의 회원이 이미 있습니다.', existing: dup };
    return { name, phone, memo: input.memo.trim() };
  }

  createCustomer(input: CustomerInput): CustomerSaveResult {
    const v = this.validateCustomer(input, null);
    if ('ok' in v) return v;
    const id = this.store.tx(() => this.store.run(
      'INSERT INTO customers (name, phone, memo, created_at) VALUES (?, ?, ?, ?)', [v.name, v.phone, v.memo, nowStamp()]
    ));
    return { ok: true, customer: this.customer(id) };
  }

  updateCustomer(id: number, input: CustomerInput): CustomerSaveResult {
    this.customer(id);
    const v = this.validateCustomer(input, id);
    if ('ok' in v) return v;
    this.store.tx(() => this.store.run('UPDATE customers SET name = ?, phone = ?, memo = ? WHERE id = ?', [v.name, v.phone, v.memo, id]));
    return { ok: true, customer: this.customer(id) };
  }

  // ---------- 계약 ----------

  searchContracts(filter: ContractFilter, today: ISODate, customerId?: number): ContractRow[] {
    const customers = new Map(this.customers().map((c) => [c.id, c]));
    const sent = new Map<number, Set<number>>();
    for (const n of this.notices()) {
      if (!sent.has(n.contractId)) sent.set(n.contractId, new Set());
      sent.get(n.contractId)!.add(n.period);
    }
    const q = filter.query.replace(/\s/g, '');
    const qd = digitsOnly(q);
    return this.contracts()
      .filter((c) => customerId === undefined || c.customerId === customerId)
      .filter((c) => filter.status === 'all' || c.status === filter.status)
      .filter((c) => (!filter.from || c.contractDate >= filter.from) && (!filter.to || c.contractDate <= filter.to))
      .filter((c) => {
        if (!q) return true;
        const cust = customers.get(c.customerId);
        return (cust?.name.replace(/\s/g, '').includes(q) ?? false)
          || c.collateral.replace(/\s/g, '').toLowerCase().includes(q.toLowerCase())
          || (qd.length > 0 && digitsOnly(cust?.phone ?? '').includes(qd));
      })
      .map((c) => {
        const cust = customers.get(c.customerId);
        return {
          id: c.id, customerId: c.customerId, contractDate: c.contractDate, name: cust?.name ?? '', phone: cust?.phone ?? '',
          collateral: c.collateral, principal: c.principal, monthlyInterest: c.monthlyInterest, rateType: c.rateType,
          rate: c.rate, status: c.status, maturityDate: c.maturityDate,
          next: nextLabel(c, sent.get(c.id) ?? new Set(), today)
        };
      });
  }

  contractDetail(id: number, today: ISODate): ContractDetail {
    const contract = this.contract(id);
    const periods = buildPeriods(contract, this.notices('WHERE contract_id = ?', [id]), this.payments('WHERE contract_id = ?', [id]), today);
    const photos = this.store.all<{ file_name: string }>('SELECT file_name FROM contract_photos WHERE contract_id = ? ORDER BY id', [id])
      .map((p) => p.file_name);
    return { contract, customer: this.customer(contract.customerId), periods, photos, totals: periodTotals(periods, contract.monthlyInterest) };
  }

  /**
   * 새 계약. markPastDone 이면 이미 지난 회차는 문자·이자 모두 처리된 것으로 기록한다
   * (종이 장부에 있던 예전 계약을 옮겨 적을 때 지난 회차가 한꺼번에 '못 보냄'으로 뜨지 않게).
   */
  createContract(input: ContractInput, markPastDone: boolean, today: ISODate): number {
    checkContract(input);
    this.customer(input.customerId);
    const interest = monthlyInterest(input.principal, input.rateType, input.rate);
    return this.store.tx(() => {
      const id = this.store.run(
        `INSERT INTO contracts (customer_id, contract_date, principal, rate_type, rate, monthly_interest, collateral,
          maturity_date, status, closed_date, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, ?, ?)`,
        [input.customerId, input.contractDate, input.principal, input.rateType, input.rate, interest,
          input.collateral.trim(), input.maturityDate, input.memo.trim(), nowStamp()]
      );
      if (markPastDone) {
        for (const n of periodsUntil(input.contractDate, today)) {
          const due = dueDate(input.contractDate, n);
          if (due >= today) continue;
          this.store.run('INSERT INTO notices (contract_id, period, sent_at, auto) VALUES (?, ?, ?, 1)', [id, n, `${due} 00:00:00`]);
          this.store.run('INSERT INTO payments (contract_id, period, paid_date, amount) VALUES (?, ?, ?, ?)', [id, n, due, interest]);
        }
      }
      return id;
    });
  }

  updateContract(id: number, input: ContractInput): void {
    checkContract(input);
    this.contract(id);
    this.customer(input.customerId);
    const interest = monthlyInterest(input.principal, input.rateType, input.rate);
    this.store.tx(() => this.store.run(
      `UPDATE contracts SET customer_id = ?, contract_date = ?, principal = ?, rate_type = ?, rate = ?, monthly_interest = ?,
        collateral = ?, maturity_date = ?, memo = ? WHERE id = ?`,
      [input.customerId, input.contractDate, input.principal, input.rateType, input.rate, interest,
        input.collateral.trim(), input.maturityDate, input.memo.trim(), id]
    ));
  }

  deleteContract(id: number): void {
    this.contract(id);
    this.store.tx(() => {
      for (const t of ['notices', 'payments', 'contract_photos']) this.store.run(`DELETE FROM ${t} WHERE contract_id = ?`, [id]);
      this.store.run('DELETE FROM contracts WHERE id = ?', [id]);
    });
  }

  setContractStatus(id: number, status: ContractStatus, today: ISODate): void {
    this.contract(id);
    this.store.tx(() => this.store.run('UPDATE contracts SET status = ?, closed_date = ? WHERE id = ?',
      [status, status === 'active' ? null : today, id]));
  }

  addPhotoRows(contractId: number, names: string[]): void {
    this.store.tx(() => {
      for (const n of names) this.store.run('INSERT INTO contract_photos (contract_id, file_name) VALUES (?, ?)', [contractId, n]);
    });
  }

  removePhotoRow(contractId: number, name: string): void {
    this.store.tx(() => this.store.run('DELETE FROM contract_photos WHERE contract_id = ? AND file_name = ?', [contractId, name]));
  }

  // ---------- 엑셀 내보내기용 ----------

  exportData(today: ISODate) {
    const data = this.scheduleData();
    return { ...data, rows: this.searchContracts({ query: '', from: null, to: null, status: 'all' }, today) };
  }

  // ---------- 설정 ----------

  settings(): Settings {
    const map = new Map(this.store.all<{ key: string; value: string }>('SELECT * FROM settings').map((r) => [r.key, r.value]));
    return { shopName: map.get('shopName') ?? '', account: map.get('account') ?? '', template: map.get('template') ?? DEFAULT_TEMPLATE };
  }

  saveSettings(s: Settings): void {
    this.store.tx(() => {
      for (const [k, v] of Object.entries(s)) this.store.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, String(v)]);
    });
  }
}
