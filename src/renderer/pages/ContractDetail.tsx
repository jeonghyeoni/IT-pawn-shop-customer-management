import { useState } from 'react';
import { longDate, monthDay, rateText, won } from '../../shared/format';
import type { ContractStatus, PeriodRow } from '../../shared/types';
import { api } from '../api';
import { useApp, useLoad } from '../app-context';
import { PencilIcon, UserIcon } from '../components/Icons';
import { BackButton, PaidCheck, PhotoGrid, SentCheck, StatusBadge } from '../components/ui';

export function ContractDetail({ id, today }: { id: number; today: string }) {
  const { go, fail, confirm, toast } = useApp();
  const { data, reload } = useLoad(() => api.getContract(id), [id]);
  const [editing, setEditing] = useState<{ period: number; date: string } | null>(null);

  if (!data) return <main className="main" />;
  const { contract: c, customer, periods, photos, totals } = data;
  const active = c.status === 'active';

  const toggleSent = (r: PeriodRow) => api.markSent(c.id, r.period, !r.sent).then(reload).catch(fail);
  const togglePaid = (r: PeriodRow) => api.setPaid(c.id, r.period, r.paidDate ? null : today).then(reload).catch(fail);
  const saveDate = () => {
    if (!editing) return;
    api.setPaid(c.id, editing.period, editing.date || today).then(() => { setEditing(null); return reload(); }).catch(fail);
  };

  const setStatus = async (status: ContractStatus) => {
    const texts: Record<ContractStatus, { title: string; yes: string; done: string }> = {
      repaid: { title: '상환 완료로 처리하고 계약을 종료하시겠습니까?', yes: '상환 완료 처리', done: '상환 완료로 처리했습니다.' },
      forfeited: { title: '유질 처리하고 계약을 종료하시겠습니까?', yes: '유질 처리', done: '유질 처리했습니다.' },
      active: { title: '이 계약을 진행 중으로 복원하시겠습니까?', yes: '복원', done: '진행 중으로 복원했습니다.' }
    };
    const t = texts[status];
    const ok = await confirm({
      title: t.title,
      body: status === 'active' ? '다시 이자 고지 대상에 포함됩니다.' : '종료된 계약은 이자 고지 대상에서 제외되며, 기존 내역은 그대로 보관됩니다.',
      yes: t.yes
    });
    if (!ok) return;
    try {
      await api.setContractStatus(c.id, status);
      toast(t.done);
      await reload();
    } catch (e) { fail(e); }
  };

  return (
    <main className="main" style={{ gap: 20 }}>
      <BackButton />
      <div className="row between" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 14 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900 }}>{c.collateral || '(담보물 미기재)'}</h1>
        </div>
        <button type="button" className="name-link row" style={{ fontSize: 24, fontWeight: 700, gap: 10 }}
          onClick={() => go({ name: 'customer', id: customer.id })}>
          <UserIcon size={26} />{customer.name} · {customer.phone}
        </button>
      </div>

      <div className="row between" style={{ alignItems: 'stretch' }}>
        {/* 현재 상태와, 계약을 끝낼 때 누르는 버튼을 분리해서 보여 준다 */}
        <div className="status-bar">
          <div className="status-now">
            <span>현재 상태</span>
            <StatusBadge status={c.status} style={{ fontSize: 20, padding: '4px 16px' }} />
          </div>
          {active ? (
            <>
              <button type="button" className="action-btn green" onClick={() => setStatus('repaid')}>상환 완료 처리</button>
              <button type="button" className="action-btn orange" onClick={() => setStatus('forfeited')}>유질 처리</button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 20, color: 'var(--ink-2)' }}>
                {c.closedDate ? `${longDate(c.closedDate)}에 ${c.status === 'repaid' ? '상환 완료' : '유질 처리'}된 계약입니다.` : ''}
              </span>
              <button type="button" className="btn plain md" onClick={() => setStatus('active')}>진행 중으로 복원</button>
            </>
          )}
        </div>
        <button type="button" className="btn outline" onClick={() => go({ name: 'editContract', id: c.id })}>
          <PencilIcon size={22} />계약 수정
        </button>
      </div>

      <div className="row top" style={{ gap: 20 }}>
        <div className="col" style={{ flex: '1 1 400px', minWidth: 0, gap: 20 }}>
          <section aria-labelledby="info-h" className="card" style={{ gap: 18 }}>
            <h2 id="info-h" style={{ fontSize: 24, fontWeight: 900 }}>계약 정보</h2>
            <dl className="dl">
              <div><dt>계약일</dt><dd>{longDate(c.contractDate)}</dd></div>
              <div>
                <dt>만기일</dt>
                <dd>{c.maturityDate ? longDate(c.maturityDate) : '미정'}</dd>
                {c.maturityDate && active && (
                  <div className="hint" style={{ fontSize: 16 }}>{c.renewCount > 0 ? `자동 연장 ${c.renewCount}회 · ` : ''}종료하지 않으면 1년씩 자동 연장</div>
                )}
                <button type="button" className="name-link" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 17, textDecoration: 'underline' }}
                  onClick={() => go({ name: 'editContract', id: c.id })}>만기일 변경</button>
              </div>
              <div><dt>대부금액</dt><dd>{won(c.principal)}</dd></div>
              <div><dt>이자율</dt><dd>{rateText(c.rateType, c.rate)}</dd></div>
              <div><dt>월 이자</dt><dd style={{ fontSize: 26, fontWeight: 900, color: 'var(--blue)' }}>{won(c.monthlyInterest)}</dd></div>
              <div><dt>이자 납부일</dt><dd>매월 {Number(c.contractDate.slice(8))}일</dd></div>
            </dl>
            <div><div className="hint">비고</div><div style={{ whiteSpace: 'pre-wrap' }}>{c.memo || '—'}</div></div>
          </section>
          <section aria-labelledby="photo-h" className="card" style={{ gap: 12 }}>
            <h2 id="photo-h" style={{ fontSize: 24, fontWeight: 900 }}>첨부 사진 <span className="hint" style={{ fontWeight: 500 }}>클릭하면 확대</span></h2>
            <PhotoGrid scope={c.id} names={photos} />
          </section>
        </div>

        <section aria-labelledby="pay-h" className="card" style={{ flex: '1 1 560px', minWidth: 0 }}>
          <h2 id="pay-h" style={{ fontSize: 24, fontWeight: 900 }}>회차별 이자 내역</h2>
          <div className="stats">
            <div className="stat"><span>발생 이자</span><strong>{won(totals.accrued)}</strong><span>{totals.accruedCount}회분</span></div>
            <div className="stat green"><span>수납 이자</span><strong>{won(totals.paid)}</strong><span>{totals.paidCount}회</span></div>
            <div className={`stat ${totals.dueCount > 0 ? 'orange' : ''}`}><span>미수 이자</span><strong>{won(totals.due)}</strong><span>{totals.dueCount}회</span></div>
          </div>
          <div style={{ fontSize: 18, color: 'var(--ink-2)' }}>
            칸을 눌러 <b>체크</b>하고, 잘못 체크했으면 한 번 더 눌러 <b>해제</b>하세요. 수납일은 [수납일 수정]으로 바꿀 수 있습니다.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table compact" style={{ minWidth: 700 }}>
              <thead>
                <tr><th scope="col">회차</th><th scope="col">납부일</th><th scope="col">문자 발송</th><th scope="col">이자 수납</th></tr>
              </thead>
              <tbody>
                {periods.length === 0 && <tr><td colSpan={4} className="muted">아직 도래한 납부일이 없습니다.</td></tr>}
                {periods.map((r) => (
                  <tr key={r.period} className={r.isToday ? 'today' : ''}>
                    <td className="nowrap" style={{ fontWeight: 700, verticalAlign: 'middle' }}>{r.period}회차</td>
                    <td className="nowrap" style={{ verticalAlign: 'middle' }}>{monthDay(r.dueDate)}{r.isToday ? ' (오늘)' : ''}{r.dueDate.slice(0, 4) !== today.slice(0, 4) ? ` ${r.dueDate.slice(0, 4)}` : ''}</td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {r.future ? <span className="muted" style={{ fontWeight: 700 }}>예정</span>
                        : <SentCheck compact sent={r.sent} when={r.sentAt ? monthDay(r.sentAt.slice(0, 10)) : ''} onClick={() => toggleSent(r)} />}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {r.future ? <span className="muted">—</span> : editing?.period === r.period ? (
                        <div className="edit-box">
                          <label htmlFor="pd" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-dark)' }}>수납일</label>
                          <input id="pd" type="date" className="input sm" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                          <div className="row" style={{ gap: 8 }}>
                            <button type="button" className="btn success sm" onClick={saveDate}>저장</button>
                            <button type="button" className="btn plain sm" onClick={() => setEditing(null)}>닫기</button>
                          </div>
                        </div>
                      ) : (
                        <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                          <PaidCheck compact paidDate={r.paidDate} onClick={() => togglePaid(r)} />
                          {r.paidDate && (
                            <button type="button" className="name-link nowrap" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 18, textDecoration: 'underline', minHeight: 44 }}
                              onClick={() => setEditing({ period: r.period, date: r.paidDate! })}>수납일 수정</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
