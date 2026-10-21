import { useEffect, useState } from 'react';
import { formatPhone } from '../../shared/format';
import type { Customer, CustomerSummary } from '../../shared/types';
import { api } from '../api';
import { useApp } from '../app-context';
import { PlusIcon } from './Icons';

/** 이름이나 전화번호로 회원을 찾아 고르거나, 처음 온 분이면 그 자리에서 등록한다. */
export function CustomerPicker({ value, onChange }: { value: Customer | null; onChange: (c: Customer | null) => void }) {
  const { fail } = useApp();
  const [query, setQuery] = useState(value?.name ?? '');
  const [matches, setMatches] = useState<CustomerSummary[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', memo: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query.trim();
    if (!q) { setMatches([]); return; }
    let alive = true;
    api.findCustomers(q).then((m) => alive && setMatches(m.slice(0, 8))).catch(fail);
    return () => { alive = false; };
  }, [query, fail]);

  const startAdd = () => {
    const isPhone = /^[\d-\s]+$/.test(query.trim());
    setForm({ name: isPhone ? '' : query.trim(), phone: isPhone ? formatPhone(query) : '', memo: '' });
    setError('');
    setAdding(true);
  };

  const save = async () => {
    try {
      const res = await api.createCustomer(form);
      if (!res.ok) {
        setError(res.message);
        if (res.existing) onChange(res.existing);
        return;
      }
      onChange(res.customer);
      setQuery(res.customer.name);
      setAdding(false);
    } catch (e) { fail(e); }
  };

  const list = value && !matches.some((m) => m.id === value.id) ? [{ ...value, activeCount: -1, closedCount: 0, sameNameCount: 0 }, ...matches] : matches;

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="field">
        <label htmlFor="cust-q">이름이나 전화번호를 입력하세요</label>
        <input id="cust-q" className="input" style={{ fontSize: 24 }} value={query} placeholder="예: 김영수 또는 010-1234-5678"
          onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      </div>
      <div className="col" style={{ gap: 10 }}>
        {list.map((m) => {
          const on = value?.id === m.id;
          return (
            <div key={m.id} className={`candidate ${on ? 'on' : ''}`}>
              <div className="col" style={{ gap: 0 }}>
                <span style={{ fontSize: 24, fontWeight: 900 }}>{m.name} <span style={{ fontWeight: 700 }}>{m.phone}</span></span>
                <span className="hint">
                  {m.activeCount < 0 ? '선택한 회원' : `진행 중인 계약 ${m.activeCount}건${m.closedCount ? ` · 끝난 계약 ${m.closedCount}건` : ''}`}
                  {m.sameNameCount > 0 ? ' · 동명 이인 있음' : ''}
                </span>
              </div>
              <button type="button" className={`btn md ${on ? 'primary' : 'plain'}`} onClick={() => onChange(on ? null : m)}>
                {on ? '선택됨' : '이 회원으로 선택'}
              </button>
            </div>
          );
        })}
        {query.trim() && matches.length === 0 && !value && (
          <div className="hint" style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--surface-2)', fontSize: 20 }}>
            찾는 회원이 없습니다. 아래 버튼으로 새로 등록하세요.
          </div>
        )}
      </div>
      {!adding ? (
        <button type="button" className="btn md dashed" style={{ alignSelf: 'flex-start' }} onClick={startAdd}>
          <PlusIcon />처음 오신 분 — 새 회원 등록
        </button>
      ) : (
        <div className="col" style={{ gap: 14, padding: 20, border: '2px solid var(--blue)', borderRadius: 14, background: 'var(--blue-softer)' }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>새 회원 등록</div>
          <div className="row top" style={{ gap: 16 }}>
            <div className="field" style={{ flex: '1 1 220px' }}>
              <label htmlFor="nc-name">이름</label>
              <input id="nc-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field" style={{ flex: '1 1 260px' }}>
              <label htmlFor="nc-phone">전화번호</label>
              <input id="nc-phone" className="input" inputMode="tel" value={form.phone} placeholder="010-1234-5678"
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="nc-memo">메모 <span className="muted" style={{ fontWeight: 400 }}>(선택)</span></label>
            <input id="nc-memo" className="input" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
          </div>
          {error && <div className="error-text">{error}{error.includes('이미') ? ' 그 회원을 선택해 두었습니다.' : ''}</div>}
          <div className="row">
            <button type="button" className="btn primary md" onClick={save}>회원 등록하고 선택</button>
            <button type="button" className="btn plain md" onClick={() => setAdding(false)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
