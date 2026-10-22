import { useState } from 'react';
import { monthDay, rateText, renderMessage, won } from '../../shared/format';
import type { DueItem, Settings } from '../../shared/types';
import { api } from '../api';
import { useApp, useLoad } from '../app-context';
import { AlertIcon, CheckIcon, CopyIcon, NextIcon } from '../components/Icons';
import { PaidCheck, SentCheck } from '../components/ui';

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
      toast('고지 문구를 복사했습니다. 문자 앱에 붙여넣어 발송하세요.');
    } catch (e) { fail(e); }
  };
  const toggleSent = (i: DueItem) => api.markSent(i.contractId, i.period, !i.sentAt).then(reload).catch(fail);
  const togglePaid = (i: DueItem) =>
    api.setPaid(i.contractId, i.period, i.paid ? null : data.today).then(reload).catch(fail);
  const openContract = (id: number) => go({ name: 'contract', id });
  const openCustomer = (id: number) => go({ name: 'customer', id });
  const when = (i: DueItem) => sentWhen(i.sentAt, data.today);

  const pending = data.dueToday.filter((i) => !i.sentAt);
  // 발송 완료는 방금 보낸 것부터
  const done = data.dueToday.filter((i) => i.sentAt).sort((a, b) => (a.sentAt! < b.sentAt! ? 1 : -1));
  const total = data.dueToday.length;
  const paidCount = data.dueToday.filter((i) => i.paid).length;
  const pct = (n: number) => `${total ? Math.round((n / total) * 100) : 0}%`;

  return (
    <main className="main">
      <section aria-label="오늘 요약" className="hero" data-tour="hero">
        {total === 0 ? (
          <div className="hero-done"><CheckIcon size={56} />오늘 이자 고지 대상이 없습니다</div>
        ) : (
          <>
            <div className="col">
              <div className="hero-label">오늘 이자 고지 · 발송 대기</div>
              {pending.length > 0 ? (
                <div className="hero-count">{pending.length}건 <small>/ 전체 {total}건</small></div>
              ) : (
                <div className="hero-count row" style={{ gap: 14 }}><CheckIcon size={60} />완료 <small>전체 {total}건 발송</small></div>
              )}
            </div>
            <div className="col" style={{ flex: '0 1 460px', gap: 12 }}>
              <div className="progress">
                <div className="progress-head"><span>문자 발송</span><span>{done.length} / {total}</span></div>
                <div className="progress-bar"><div style={{ width: pct(done.length) }} /></div>
              </div>
              <div className="progress">
                <div className="progress-head"><span>이자 수납</span><span>{paidCount} / {total}</span></div>
                <div className="progress-bar paid"><div style={{ width: pct(paidCount) }} /></div>
              </div>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="today-h" className="col" style={{ gap: 16 }}>
        <h2 id="today-h" style={{ fontSize: 28, fontWeight: 900 }}>오늘 이자 고지</h2>
        {total > 0 && (
          <div style={{ fontSize: 19, color: 'var(--ink-2)' }}>
            문자를 보낸 뒤 <b>[문자 발송 확인]</b> 칸을 눌러 체크하세요. 입금되면 <b>[이자 수납 확인]</b> 칸을 체크합니다. 잘못 체크했으면 한 번 더 누르면 해제됩니다.
          </div>
        )}
        {total === 0 && <div className="card muted" style={{ fontSize: 21 }}>오늘 납부일인 계약이 없습니다.</div>}

        {pending.map((i, idx) => (
          <article key={k(i)} className="due-card" data-tour={idx === 0 ? 'due-card' : undefined}>
            <div className="row between">
              <div className="row">
                <button type="button" className="name-link big-name" onClick={() => openCustomer(i.customerId)}>{i.name}</button>
                <span className="big-phone">{i.phone}</span>
                {i.sameName && <span className="badge warn">동명이인 · 전화번호 확인</span>}
              </div>
              <div className="row">
                <span className="badge round">{i.period}회차 이자</span>
                <span className="amount">{won(i.amount)}</span>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 19, marginTop: -8 }}>
              대부금액 {won(i.principal)} · {rateText(i.rateType, i.rate)} · 계약일 {i.contractDate.replace(/-/g, '.')} · 담보물: {i.collateral || '—'} · <button type="button" className="name-link due-detail" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 19 }} onClick={() => openContract(i.contractId)}>계약 상세</button>
            </div>
            <div className="row" style={{ alignItems: 'stretch' }}>
              <div className="message due-msg" style={{ flex: '1 1 420px' }}>{renderMessage(settings, i)}</div>
              <button type="button" className="btn outline due-copy" style={{ height: 'auto', minHeight: 60 }} onClick={() => copy(i)}>
                <CopyIcon />{copied === k(i) ? '복사됨' : '문구 복사'}
              </button>
              <div className="check-row">
                <SentCheck sent={false} when="" onClick={() => toggleSent(i)} />
                <PaidCheck paidDate={i.paidDate} onClick={() => togglePaid(i)} />
              </div>
            </div>
          </article>
        ))}

        {done.length > 0 && <div className="done-divider"><CheckIcon size={26} />발송 완료 {done.length}건</div>}
        {done.map((i, idx) => (
          <article key={k(i)} className="card" style={{ padding: '18px 24px', gap: 14 }} data-tour={idx === 0 ? 'done-card' : undefined}>
            <div className="row between">
              <div className="row">
                <span className="chip solid"><CheckIcon size={18} />{i.paid ? '발송·수납 완료' : '발송 완료'}</span>
                <button type="button" className="name-link" style={{ fontSize: 26, fontWeight: 900 }} onClick={() => openCustomer(i.customerId)}>{i.name}</button>
                <span style={{ fontSize: 24, fontWeight: 700 }}>{i.phone}</span>
              </div>
              <div className="row">
                <span className="badge round">{i.period}회차 이자</span>
                <span style={{ fontSize: 28, fontWeight: 900 }}>{won(i.amount)}</span>
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <SentCheck sent when={when(i)} onClick={() => toggleSent(i)} />
              <PaidCheck paidDate={i.paidDate} onClick={() => togglePaid(i)} />
            </div>
          </article>
        ))}
      </section>

      {data.late.length > 0 && (
        <section aria-labelledby="late-h" className="col" style={{ gap: 16 }}>
          <h2 id="late-h" className="late-h"><AlertIcon size={28} />미발송 고지 {data.late.length}건</h2>
          {data.late.map((i) => (
            <article key={k(i)} className="due-card late">
              <div className="row between">
                <div className="col">
                  <div className="row">
                    <button type="button" className="name-link" style={{ fontSize: 26, fontWeight: 900 }} onClick={() => openCustomer(i.customerId)}>{i.name}</button>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>{i.phone}</span>
                    {i.sameName && <span className="badge warn">동명이인 · 전화번호 확인</span>}
                  </div>
                  <div className="late-when">{monthDay(i.dueDate)} ({i.daysLate}일 경과) · {i.period}회차 이자 {won(i.amount)}</div>
                  <div className="muted" style={{ fontSize: 19 }}>담보물: {i.collateral || '—'}</div>
                </div>
                <div className="row">
                  <button type="button" className="btn outline" onClick={() => copy(i)}>
                    <CopyIcon />{copied === k(i) ? '복사됨' : '문구 복사'}
                  </button>
                  <SentCheck compact sent={false} when="" onClick={() => toggleSent(i)} />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="recent-h" className="card" style={{ gap: 14 }}>
        <div className="row between">
          <h2 id="recent-h" className="section-title">최근 발송 내역</h2>
          <button type="button" className="btn outline md" onClick={() => go({ name: 'sent' })}>
            전체 보기 ({data.recentTotal}건)<NextIcon size={22} />
          </button>
        </div>
        {data.recent.length === 0 && <div className="hint">발송 내역이 없습니다.</div>}
        {data.recent.map((i) => (
          <div key={k(i)} className="list-row">
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 23, fontWeight: 900 }}>{i.name} <span style={{ fontWeight: 700 }}>{i.phone}</span></span>
              <span style={{ fontSize: 19, color: 'var(--ink-2)' }}>
                <b>{when(i)}</b> 발송 · {i.period}회차 이자 {won(i.amount)}
              </span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span className="chip green"><CheckIcon size={20} />발송 완료</span>
              <span className={`chip ${i.paid ? 'green' : 'orange'}`}>{i.paid ? '수납 완료' : '미수납'}</span>
            </div>
          </div>
        ))}
        <div className="hint">발송·수납 체크와 해제는 위 ‘오늘 이자 고지’ 카드나 [전체 보기]에서 할 수 있습니다.</div>
      </section>

      <div className="split">
        <section aria-labelledby="unpaid-h" className="card" style={{ gap: 12 }}>
          <h2 id="unpaid-h" style={{ fontSize: 24, fontWeight: 900 }}>이자 연체 {data.unpaid.length}건</h2>
          {data.unpaid.length === 0 && <div className="hint">해당 없음</div>}
          {data.unpaid.map((i) => (
            <button key={k(i)} type="button" className="link-row orange" onClick={() => openContract(i.contractId)}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{i.name} · {i.phone}</span>
              <span style={{ fontSize: 19, color: 'var(--orange)' }}>
                {i.period}회차 ({monthDay(i.dueDate)}) {won(i.amount)} 미납 · {i.daysLate}일 연체
              </span>
            </button>
          ))}
        </section>
        <section aria-labelledby="due-h" className="card" style={{ gap: 12 }}>
          <h2 id="due-h" style={{ fontSize: 24, fontWeight: 900 }}>만기 임박 {data.maturity.length}건</h2>
          {data.maturity.length === 0 && <div className="hint">해당 없음</div>}
          {data.maturity.length > 0 && <div className="hint">상환 완료·유질 처리를 하지 않으면 만기 다음 날 1년 자동 연장됩니다.</div>}
          {data.maturity.map((m) => (
            <button key={m.contractId} type="button" className={`link-row ${m.daysLeft < 0 ? 'orange' : 'blue'}`} onClick={() => openContract(m.contractId)}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{m.name} · {m.phone}</span>
              <span style={{ fontSize: 19, color: m.daysLeft < 0 ? 'var(--orange)' : 'var(--blue-dark)' }}>
                만기 {monthDay(m.maturityDate)} ({m.daysLeft < 0 ? `${-m.daysLeft}일 경과` : m.daysLeft === 0 ? '오늘' : `D-${m.daysLeft}`}) · {m.collateral || '—'}
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
