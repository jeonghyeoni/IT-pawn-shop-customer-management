import { monthDay, rateText, renderMessage, won } from '../../shared/format';
import type { DueItem, Settings } from '../../shared/types';
import { api } from '../api';
import { useApp, useLoad } from '../app-context';
import { useState } from 'react';
import { AlertIcon, CheckIcon, CopyIcon, NextIcon } from '../components/Icons';
import { PaidButton, SentButton } from '../components/ui';

export function Today({ settings }: { settings: Settings }) {
  const { go, fail, toast } = useApp();
  const { data, reload } = useLoad(() => api.getDashboard(), []);
  const [copied, setCopied] = useState<string | null>(null);

  if (!data) return <main className="main" />;
  const k = (i: DueItem) => `${i.contractId}:${i.period}`;

  const copy = async (i: DueItem) => {
    try {
      await api.copyText(renderMessage(settings, i));
      setCopied(k(i));
      toast('문자 문구를 복사했습니다. 휴대폰 문자에 붙여넣으세요.');
    } catch (e) { fail(e); }
  };
  const toggleSent = (i: DueItem, sent: boolean) => api.markSent(i.contractId, i.period, sent).then(reload).catch(fail);
  const togglePaid = (i: DueItem) =>
    api.setPaid(i.contractId, i.period, i.paid ? null : data.today).then(reload).catch(fail);
  const openContract = (id: number) => go({ name: 'contract', id });
  const openCustomer = (id: number) => go({ name: 'customer', id });

  const remaining = data.dueToday.length;
  const totalToday = data.todayTotal;

  return (
    <main className="main">
      <section aria-label="오늘 요약" className="hero">
        {remaining > 0 ? (
          <>
            <div className="col">
              <div className="hero-label">오늘 이자 문자 보낼 사람</div>
              <div className="hero-count">{remaining}명 <small>남음{totalToday > remaining ? ` (전체 ${totalToday}명)` : ''}</small></div>
            </div>
            <div className="hero-note">
              휴대폰으로 문자를 보낸 뒤, 꼭 <b>[보냄]</b> 버튼을 눌러 주세요. 보낸 문자는 아래 ‘최근 보낸 이자 문자’로 옮겨집니다.
            </div>
          </>
        ) : (
          <div className="hero-done">
            <CheckIcon size={56} />{totalToday > 0 ? '오늘 보낼 문자를 모두 보냈습니다' : '오늘은 이자 문자 보낼 사람이 없습니다'}
          </div>
        )}
      </section>

      <section aria-labelledby="today-h" className="col" style={{ gap: 16 }}>
        <h2 id="today-h" style={{ fontSize: 28, fontWeight: 900 }}>오늘 보낼 이자 문자</h2>
        {remaining === 0 && <div className="card muted" style={{ fontSize: 21 }}>오늘 보낼 문자가 더 없습니다.</div>}
        {data.dueToday.map((i) => (
          <article key={k(i)} className="due-card">
            <div className="row between top">
              <div className="col">
                <div className="row">
                  <button type="button" className="name-link big-name" onClick={() => openCustomer(i.customerId)}>{i.name}</button>
                  <span className="big-phone">{i.phone}</span>
                  {i.sameName && <span className="badge warn">동명 이인 있음 · 번호 확인</span>}
                </div>
                <div className="muted" style={{ fontSize: 19 }}>
                  빌려준 돈 {won(i.principal)} · {rateText(i.rateType, i.rate)} · 계약일 {i.contractDate.replace(/-/g, '.')}
                </div>
                <div className="muted" style={{ fontSize: 19 }}>
                  담보: {i.collateral || '—'} · <button type="button" className="name-link" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 19 }} onClick={() => openContract(i.contractId)}>계약 보기</button>
                </div>
              </div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                <span className="badge round">{i.period}회차 이자</span>
                <span className="amount">{won(i.amount)}</span>
              </div>
            </div>
            <div className="message">{renderMessage(settings, i)}</div>
            <div className="row">
              <button type="button" className="btn outline" onClick={() => copy(i)}>
                <CopyIcon />{copied === k(i) ? '복사됨 — 문자에 붙여넣기' : '문자 문구 복사'}
              </button>
              <SentButton sent={false} onClick={() => toggleSent(i, true)} />
              <PaidButton paid={i.paid} onClick={() => togglePaid(i)} />
            </div>
          </article>
        ))}
      </section>

      {data.late.length > 0 && (
        <section aria-labelledby="late-h" className="col" style={{ gap: 16 }}>
          <h2 id="late-h" className="late-h"><AlertIcon size={28} />지난 날짜에 못 보낸 문자 {data.late.length}건</h2>
          {data.late.map((i) => (
            <article key={k(i)} className="due-card late">
              <div className="row between">
                <div className="col">
                  <div className="row">
                    <button type="button" className="name-link" style={{ fontSize: 26, fontWeight: 900 }} onClick={() => openCustomer(i.customerId)}>{i.name}</button>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>{i.phone}</span>
                    {i.sameName && <span className="badge warn">동명 이인 있음 · 번호 확인</span>}
                  </div>
                  <div className="late-when">{monthDay(i.dueDate)} ({i.daysLate}일 지남) · {i.period}회차 이자 {won(i.amount)}</div>
                  <div className="muted" style={{ fontSize: 19 }}>담보: {i.collateral || '—'}</div>
                </div>
                <div className="row">
                  <button type="button" className="btn outline" onClick={() => copy(i)}>
                    <CopyIcon />{copied === k(i) ? '복사됨' : '문자 문구 복사'}
                  </button>
                  <SentButton sent={false} onClick={() => toggleSent(i, true)} />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="recent-h" className="card" style={{ gap: 14 }}>
        <div className="row between">
          <h2 id="recent-h" className="section-title">최근 보낸 이자 문자</h2>
          <button type="button" className="btn outline md" onClick={() => go({ name: 'sent' })}>
            전체 보기 ({data.recentTotal}건)<NextIcon size={22} />
          </button>
        </div>
        {data.recent.length === 0 && <div className="hint">아직 보낸 문자가 없습니다.</div>}
        {data.recent.map((i) => (
          <div key={k(i)} className="list-row">
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 23, fontWeight: 900 }}>{i.name} <span style={{ fontWeight: 700 }}>{i.phone}</span></span>
              <span style={{ fontSize: 19, color: 'var(--ink-2)' }}>
                <b>{sentWhen(i.sentAt, data.today)}</b> 보냄 · {i.period}회차 이자 {won(i.amount)}
              </span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <SentButton sent size="md" onClick={() => toggleSent(i, false)} />
              <PaidButton paid={i.paid} size="md" onClick={() => togglePaid(i)} />
            </div>
          </div>
        ))}
        <div className="hint">잘못 눌렀다면 [보냄 완료]를 한 번 더 누르세요. 보내기 전 상태로 돌아갑니다.</div>
      </section>

      <div className="split">
        <section aria-labelledby="unpaid-h" className="card" style={{ gap: 12 }}>
          <h2 id="unpaid-h" style={{ fontSize: 24, fontWeight: 900 }}>이자 안 들어온 계약 {data.unpaid.length}건</h2>
          {data.unpaid.length === 0 && <div className="hint">없습니다.</div>}
          {data.unpaid.map((i) => (
            <button key={k(i)} type="button" className="link-row orange" onClick={() => openContract(i.contractId)}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{i.name} · {i.phone}</span>
              <span style={{ fontSize: 19, color: 'var(--orange)' }}>
                {i.period}회차 ({monthDay(i.dueDate)}) {won(i.amount)} 미납 · {i.daysLate}일 지남
              </span>
            </button>
          ))}
        </section>
        <section aria-labelledby="due-h" className="card" style={{ gap: 12 }}>
          <h2 id="due-h" style={{ fontSize: 24, fontWeight: 900 }}>만기가 다가오는 계약 {data.maturity.length}건</h2>
          {data.maturity.length === 0 && <div className="hint">없습니다.</div>}
          {data.maturity.map((m) => (
            <button key={m.contractId} type="button" className={`link-row ${m.daysLeft < 0 ? 'orange' : 'blue'}`} onClick={() => openContract(m.contractId)}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{m.name} · {m.phone}</span>
              <span style={{ fontSize: 19, color: m.daysLeft < 0 ? 'var(--orange)' : 'var(--blue-dark)' }}>
                만기 {monthDay(m.maturityDate)} ({m.daysLeft < 0 ? `${-m.daysLeft}일 지남` : m.daysLeft === 0 ? '오늘' : `${m.daysLeft}일 남음`}) · {m.collateral || '—'}
              </span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}

/** '오늘 10:12' / '10월 20일' */
export function sentWhen(sentAt: string | null, today: string): string {
  if (!sentAt) return '';
  const day = sentAt.slice(0, 10);
  return day === today ? `오늘 ${sentAt.slice(11, 16)}` : monthDay(day);
}
