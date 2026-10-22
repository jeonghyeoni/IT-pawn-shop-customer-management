/** 날짜는 모두 로컬 기준 'YYYY-MM-DD' 문자열로 다룬다. */
export type ISODate = string;

export type RateType = 'month' | 'year';
export type ContractStatus = 'active' | 'repaid' | 'forfeited';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  memo: string;
  createdAt: string;
}

export interface CustomerSummary extends Customer {
  activeCount: number;
  closedCount: number;
  sameNameCount: number;
}

export interface Contract {
  id: number;
  customerId: number;
  contractDate: ISODate;
  principal: number;
  rateType: RateType;
  rate: number;
  monthlyInterest: number;
  collateral: string;
  maturityDate: ISODate | null;
  /** 만기 자동 연장 횟수 */
  renewCount: number;
  status: ContractStatus;
  closedDate: ISODate | null;
  memo: string;
  createdAt: string;
}

export interface ContractInput {
  customerId: number;
  contractDate: ISODate;
  principal: number;
  rateType: RateType;
  rate: number;
  collateral: string;
  maturityDate: ISODate | null;
  memo: string;
}

export interface Notice {
  contractId: number;
  period: number;
  sentAt: string;
  auto: boolean;
}

export interface Payment {
  contractId: number;
  period: number;
  paidDate: ISODate;
  amount: number;
}

export interface Settings {
  shopName: string;
  account: string;
  template: string;
  /** 화면 배율 (1 = 100%) */
  zoom: number;
}

/** 이자 문자 한 건 (오늘 보낼 것 / 못 보낸 것 / 보낸 것 모두 같은 모양). */
export interface DueItem {
  contractId: number;
  customerId: number;
  name: string;
  phone: string;
  sameName: boolean;
  period: number;
  dueDate: ISODate;
  amount: number;
  principal: number;
  rateType: RateType;
  rate: number;
  contractDate: ISODate;
  collateral: string;
  paid: boolean;
  paidDate: ISODate | null;
  daysLate: number;
  sentAt: string | null;
}

export interface MaturityItem {
  contractId: number;
  name: string;
  phone: string;
  collateral: string;
  maturityDate: ISODate;
  daysLeft: number;
}

export interface Dashboard {
  today: ISODate;
  /** 오늘이 납부일인 회차 전부 (발송한 것 포함, sentAt 으로 구분) */
  dueToday: DueItem[];
  late: DueItem[];
  unpaid: DueItem[];
  maturity: MaturityItem[];
  recent: DueItem[];
  recentTotal: number;
}

export interface ContractRow {
  id: number;
  customerId: number;
  contractDate: ISODate;
  name: string;
  phone: string;
  collateral: string;
  principal: number;
  monthlyInterest: number;
  rateType: RateType;
  rate: number;
  status: ContractStatus;
  maturityDate: ISODate | null;
  next: { label: string; kind: 'today' | 'late' | 'normal' | 'none' };
}

export interface ContractFilter {
  query: string;
  from: ISODate | null;
  to: ISODate | null;
  status: 'all' | ContractStatus;
}

export interface PeriodRow {
  period: number;
  dueDate: ISODate;
  future: boolean;
  isToday: boolean;
  sent: boolean;
  sentAt: string | null;
  paidDate: ISODate | null;
  amount: number;
}

export interface ContractDetail {
  contract: Contract;
  customer: Customer;
  periods: PeriodRow[];
  photos: string[];
  totals: { accrued: number; accruedCount: number; paid: number; paidCount: number; due: number; dueCount: number };
}

export interface CustomerDetail {
  customer: Customer;
  contracts: ContractRow[];
  sameName: Customer[];
}

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'ready' }
  | { state: 'error'; message: string };
