import { useEffect, useState } from 'react';
import { monthDay, won } from '../../shared/format';
import type { DueItem } from '../../shared/types';
import { api } from '../api';
import { useApp } from '../app-context';
import { BackButton, PaidCheck, SentCheck } from '../components/ui';

/** 보낸 이자 문자 전체. 보냄을 취소해도 이 화면에서는 줄이 그대로 남아 다시 누를 수 있다. */
export function SentHistory({ today }: { today: string }) {
  const { go, fail } = useApp();
  const [rows, setRows] = useState<(DueItem & { sent: boolean })[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unpaid'>('all');

  useEffect(() => {
    api.listSent().then((r) => setRows(r.map((i) => ({ ...i, sent: true })))).catch(fail);
  }, [fail]);

  const update = (i: DueItem, patch: Partial<DueItem & { sent: boolean }>) =>
    setRows((rs) => rs?.map((r) => (r.contractId === i.contractId && r.period === i.period ? { ...r, ...patch } : r)) ?? rs);

  const toggleSent = (i: DueItem & { sent: boolean }) =>
    api.markSent(i.contractId, i.period, !i.sent).then(() => update(i, { sent: !i.sent })).catch(fail);
  const togglePaid = (i: DueItem) => {
    const paidDate = i.paid ? null : today;
    api.setPaid(i.contractId, i.period, paidDate).then(() => update(i, { paid: !i.paid, paidDate })).catch(fail);
  };

  const shown = (rows ?? []).filter((r) => filter === 'all' || !r.paid);

  return (
    <main className="main" style={{ gap: 20 }}>
      <BackButton />
      <h1 className="page-title">이자 고지 발송 내역</h1>
      <div className="row between">
        <div role="group" aria-label="보기 선택" className="row" style={{ gap: 8 }}>
          <button type="button" className="pill" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>전체</button>
          <button type="button" className="pill" aria-pressed={filter === 'unpaid'} onClick={() => setFilter('unpaid')}>미수납만</button>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{shown.length}건</div>
      </div>
      <div style={{ fontSize: 18, color: 'var(--ink-2)' }}>칸을 눌러 <b>체크</b>하고, 잘못 체크했으면 한 번 더 눌러 <b>해제</b>하세요.</div>
      <section aria-label="발송 내역" className="card" style={{ padding: 16, gap: 10 }}>
        {shown.map((r) => (
          <div key={`${r.contractId}:${r.period}`} className={`list-row ${r.sent ? '' : 'unsent'}`} style={{ background: r.sent ? '#fff' : undefined }}>
            <div className="row" style={{ gap: 20 }}>
              <div style={{ minWidth: 110, fontSize: 21, fontWeight: 900 }}>{r.sentAt ? monthDay(r.sentAt.slice(0, 10)) : ''}</div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontSize: 23, fontWeight: 900 }}>{r.name} <span style={{ fontWeight: 700 }}>{r.phone}</span></span>
                <span style={{ fontSize: 19, color: 'var(--ink-2)' }}>
                  {r.period}회차 이자 {won(r.amount)} ·{' '}
                  <button type="button" className="name-link" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 19 }}
                    onClick={() => go({ name: 'contract', id: r.contractId })}>계약 상세</button>
                </span>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <SentCheck compact sent={r.sent} when={r.sentAt ? monthDay(r.sentAt.slice(0, 10)) : ''} onClick={() => toggleSent(r)} />
              <PaidCheck compact paidDate={r.paidDate} onClick={() => togglePaid(r)} />
            </div>
          </div>
        ))}
        {rows && shown.length === 0 && <div className="empty">내역이 없습니다.</div>}
      </section>
    </main>
  );
}
