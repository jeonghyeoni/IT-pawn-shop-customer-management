import ExcelJS from 'exceljs';
import { dueDate } from '../shared/schedule';
import type { ContractRow, ContractStatus } from '../shared/types';
import type { ScheduleData } from '../shared/schedule';

const STATUS: Record<ContractStatus, string> = { active: '진행 중', repaid: '상환 완료', forfeited: '유질' };
const MONEY = '#,##0"원"';

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number; money?: boolean }[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.money ? { numFmt: MONEY } : {} }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  return ws;
}

function contractSheet(wb: ExcelJS.Workbook, rows: ContractRow[]) {
  const ws = sheet(wb, '계약', [
    { header: '계약번호', key: 'id', width: 10 },
    { header: '계약일', key: 'contractDate', width: 13 },
    { header: '채무자', key: 'name', width: 12 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '담보물', key: 'collateral', width: 32 },
    { header: '대부금액', key: 'principal', width: 14, money: true },
    { header: '이자율', key: 'rate', width: 10 },
    { header: '월 이자', key: 'monthlyInterest', width: 13, money: true },
    { header: '만기일', key: 'maturityDate', width: 13 },
    { header: '상태', key: 'status', width: 12 },
    { header: '다음 고지일', key: 'next', width: 16 }
  ]);
  for (const r of rows) {
    ws.addRow({
      ...r, rate: `${r.rateType === 'month' ? '월' : '연'} ${r.rate}%`, maturityDate: r.maturityDate ?? '',
      status: STATUS[r.status], next: r.next.label
    });
  }
}

/** 계약 목록 화면에서 보이는 그대로 */
export async function writeContracts(file: string, rows: ContractRow[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  contractSheet(wb, rows);
  await wb.xlsx.writeFile(file);
}

/** 전체 자료 (회원 / 계약 / 이자 받은 기록 / 문자 보낸 기록) */
export async function writeAll(file: string, data: ScheduleData & { rows: ContractRow[] }): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const customers = new Map(data.customers.map((c) => [c.id, c]));
  const contracts = new Map(data.contracts.map((c) => [c.id, c]));

  const cs = sheet(wb, '채무자', [
    { header: '채무자번호', key: 'id', width: 10 },
    { header: '이름', key: 'name', width: 12 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '비고', key: 'memo', width: 40 },
    { header: '등록일', key: 'createdAt', width: 20 }
  ]);
  for (const c of data.customers) cs.addRow(c);

  contractSheet(wb, data.rows);

  const ps = sheet(wb, '이자 수납 내역', [
    { header: '계약번호', key: 'contractId', width: 10 },
    { header: '채무자', key: 'name', width: 12 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '회차', key: 'period', width: 8 },
    { header: '납부일', key: 'due', width: 13 },
    { header: '수납일', key: 'paidDate', width: 13 },
    { header: '금액', key: 'amount', width: 13, money: true }
  ]);
  for (const p of [...data.payments].sort((a, b) => a.paidDate.localeCompare(b.paidDate))) {
    const c = contracts.get(p.contractId);
    const cust = c && customers.get(c.customerId);
    ps.addRow({ ...p, name: cust?.name ?? '', phone: cust?.phone ?? '', due: c ? dueDate(c.contractDate, p.period) : '' });
  }

  const ns = sheet(wb, '이자 고지 발송 내역', [
    { header: '계약번호', key: 'contractId', width: 10 },
    { header: '채무자', key: 'name', width: 12 },
    { header: '전화번호', key: 'phone', width: 16 },
    { header: '회차', key: 'period', width: 8 },
    { header: '발송일시', key: 'sentAt', width: 20 }
  ]);
  for (const n of [...data.notices].sort((a, b) => a.sentAt.localeCompare(b.sentAt))) {
    const c = contracts.get(n.contractId);
    const cust = c && customers.get(c.customerId);
    ns.addRow({ ...n, name: cust?.name ?? '', phone: cust?.phone ?? '', sentAt: n.auto ? '이관 처리' : n.sentAt });
  }

  await wb.xlsx.writeFile(file);
}
