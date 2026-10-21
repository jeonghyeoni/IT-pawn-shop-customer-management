import { useState } from 'react';
import { longDate, monthDay, rateTextLong, won } from '../../shared/format';
import type { ContractStatus, PeriodRow } from '../../shared/types';
import { api } from '../api';
import { useApp, useLoad } from '../app-context';
import { CashIcon, CheckIcon, PencilIcon, UserIcon } from '../components/Icons';
import { BackButton, PhotoGrid, SentButton, StatusBadge } from '../components/ui';

export function ContractDetail({ id, today }: { id: number; today: string }) {
  const { go, fail, confirm, toast } = useApp();
  const { data, reload } = useLoad(() => api.getContract(id), [id]);
  const [editing, setEditing] = useState<{ period: number; date: string } | null>(null);

  if (!data) return <main className="main" />;
  const { contract: c, customer, periods, photos, totals } = data;
  const active = c.status === 'active';

  const toggleSent = (r: PeriodRow) => api.markSent(c.id, r.period, !r.sent).then(reload).catch(fail);
  const payButton = (r: PeriodRow) => {
    if (r.paidDate) setEditing({ period: r.period, date: r.paidDate });
    else api.setPaid(c.id, r.period, today).then(reload).catch(fail);
  };
  const saveDate = () => {
    if (!editing) return;
    api.setPaid(c.id, editing.period, editing.date || today).then(() => { setEditing(null); return reload(); }).catch(fail);
  };
  const cancelPaid = () => {
    if (!editing) return;
    api.setPaid(c.id, editing.period, null).then(() => { setEditing(null); return reload(); }).catch(fail);
  };

  const setStatus = async (status: ContractStatus) => {
    const texts: Record<ContractStatus, { title: string; yes: string; done: string }> = {
      repaid: { title: '상환 완료로 처리하고 계약을 종료할까요?', yes: '예, 상환 완료', done: '상환 완료로 처리했습니다.' },
      forfeited: { title: '물건을 처분(유질)하고 계약을 종료할까요?', yes: '예, 유질 처리', done: '유질 처리했습니다.' },
      active: { title: '이 계약을 다시 진행 중으로 되돌릴까요?', yes: '예, 되돌립니다', done: '진행 중으로 되돌렸습니다.' }
    };
    const t = texts[status];
    const ok = await confirm({
      title: t.title,
      body: status === 'active' ? '다시 이자 문자 목록에 나오게 됩니다.' : '처리하면 이 계약은 더 이상 이자 문자 목록에 나오지 않습니다. 기록은 그대로 남습니다.',
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
          <h1 style={{ fontSize: 36, fontWeight: 900 }}>{c.collateral || '(맡긴 물건 없음)'}</h1>
          <StatusBadge status={c.status} style={{ fontSize: 20, padding: '6px 16px' }} />
        </div>
        <button type="button" className="name-link row" style={{ fontSize: 24, fontWeight: 700, gap: 10 }}
          onClick={() => go({ name: 'customer', id: customer.id })}>
          <UserIcon size={26} />{customer.name} · {customer.phone}
        </button>
      </div>

      <div className="row between">
        <div className="row">
          {active ? (
            <>
              <button type="button" className="btn success" onClick={() => setStatus('repaid')}>상환 완료 (계약 종료)</button>
              <button type="button" className="btn plain" onClick={() => setStatus('forfeited')}>유질 처리 (물건 처분)</button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 20, color: 'var(--ink-2)' }}>
                {c.closedDate ? `${longDate(c.closedDate)}에 ${c.status === 'repaid' ? '상환 완료' : '유질 처리'}된 계약입니다.` : ''}
              </span>
              <button type="button" className="btn plain md" onClick={() => setStatus('active')}>진행 중으로 되돌리기</button>
            </>
          )}
        </div>
        <button type="button" className="btn outline" onClick={() => go({ name: 'editContract', id: c.id })}>
          <PencilIcon size={22} />내용 수정
        </button>
      </div>

      <div className="row top" style={{ gap: 20 }}>
        <div className="col" style={{ flex: '1 1 400px', minWidth: 0, gap: 20 }}>
          <section aria-labelledby="info-h" className="card" style={{ gap: 18 }}>
            <h2 id="info-h" style={{ fontSize: 24, fontWeight: 900 }}>계약 내용</h2>
            <dl className="dl">
              <div><dt>계약한 날</dt><dd>{longDate(c.contractDate)}</dd></div>
              <div><dt>만기일</dt><dd>{c.maturityDate ? longDate(c.maturityDate) : '없음'}</dd></div>
              <div><dt>빌려준 돈</dt><dd>{won(c.principal)}</dd></div>
              <div><dt>이자율</dt><dd>{rateTextLong(c.rateType, c.rate)}</dd></div>
              <div><dt>매달 이자</dt><dd style={{ fontSize: 26, fontWeight: 900, color: 'var(--blue)' }}>{won(c.monthlyInterest)}</dd></div>
              <div><dt>문자 보내는 날</dt><dd>매달 {Number(c.contractDate.slice(8))}일</dd></div>
            </dl>
            <div><div className="hint">메모</div><div style={{ whiteSpace: 'pre-wrap' }}>{c.memo || '—'}</div></div>
          </section>
          <section aria-labelledby="photo-h" className="card" style={{ gap: 12 }}>
            <h2 id="photo-h" style={{ fontSize: 24, fontWeight: 900 }}>사진 <span className="hint" style={{ fontWeight: 500 }}>누르면 크게 보기</span></h2>
            <PhotoGrid scope={c.id} names={photos} />
          </section>
        </div>

        <section aria-labelledby="pay-h" className="card" style={{ flex: '1 1 560px', minWidth: 0 }}>
          <h2 id="pay-h" style={{ fontSize: 24, fontWeight: 900 }}>매달 이자 기록</h2>
          <div className="stats">
            <div className="stat"><span>지금까지 생긴 이자</span><strong>{won(totals.accrued)}</strong><span>{totals.accruedCount}회분</span></div>
            <div className="stat green"><span>받은 이자</span><strong>{won(totals.paid)}</strong><span>{totals.paidCount}회</span></div>
            <div className={`stat ${totals.dueCount > 0 ? 'orange' : ''}`}><span>아직 안 받은 이자</span><strong>{won(totals.due)}</strong><span>{totals.dueCount}회</span></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table compact" style={{ minWidth: 600 }}>
              <thead>
                <tr><th scope="col">회차</th><th scope="col">문자 보낼 날</th><th scope="col">문자</th><th scope="col">이자</th></tr>
              </thead>
              <tbody>
                {periods.length === 0 && <tr><td colSpan={4} className="muted">아직 이자 날짜가 오지 않았습니다.</td></tr>}
                {periods.map((r) => (
                  <tr key={r.period} className={r.isToday ? 'today' : ''}>
                    <td style={{ fontWeight: 700 }}>{r.period}회</td>
                    <td className="nowrap">{monthDay(r.dueDate)}{r.isToday ? ' (오늘)' : ''}{r.dueDate.slice(0, 4) !== today.slice(0, 4) ? ` ${r.dueDate.slice(0, 4)}` : ''}</td>
                    <td>{r.future ? <span className="muted" style={{ fontWeight: 700 }}>예정</span> : <SentButton sent={r.sent} size="sm" onClick={() => toggleSent(r)} />}</td>
                    <td>
                      {r.future ? <span className="muted">—</span> : editing?.period === r.period ? (
                        <div className="edit-box">
                          <label htmlFor="pd" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-dark)' }}>받은 날짜</label>
                          <input id="pd" type="date" className="input sm" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                          <div className="row" style={{ gap: 8 }}>
                            <button type="button" className="btn success sm" onClick={saveDate}>날짜 저장</button>
                            <button type="button" className="btn danger-outline sm" onClick={cancelPaid}>받음 취소</button>
                            <button type="button" className="btn plain sm" onClick={() => setEditing(null)}>닫기</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" className={`btn sm ${r.paidDate ? 'success' : 'outline-success'}`} aria-pressed={!!r.paidDate} onClick={() => payButton(r)}>
                          {r.paidDate ? <CheckIcon size={20} /> : <CashIcon size={20} />}
                          {r.paidDate ? `${monthDay(r.paidDate)} 받음` : '받음'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hint">문자 버튼은 한 번 더 누르면 취소됩니다. 받은 날짜를 고치거나 취소하려면 초록색 [받음] 버튼을 누르세요.</div>
        </section>
      </div>
    </main>
  );
}
