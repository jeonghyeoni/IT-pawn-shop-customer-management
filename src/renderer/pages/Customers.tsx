import { useEffect, useState } from 'react';
import { formatPhone, longDate } from '../../shared/format';
import type { CustomerSummary } from '../../shared/types';
import { api } from '../api';
import { useApp, useLoad } from '../app-context';
import { AlertIcon, PencilIcon, PlusIcon, SearchIcon } from '../components/Icons';
import { BackButton } from '../components/ui';
import { ContractTable } from './ContractList';

let lastQuery = '';

export function Customers() {
  const { go, fail } = useApp();
  const [query, setQuery] = useState(lastQuery);
  const [rows, setRows] = useState<CustomerSummary[] | null>(null);

  useEffect(() => {
    lastQuery = query;
    let alive = true;
    api.findCustomers(query).then((r) => alive && setRows(r)).catch(fail);
    return () => { alive = false; };
  }, [query, fail]);

  return (
    <main className="main" style={{ gap: 20 }}>
      <h1 className="page-title">채무자 목록</h1>
      <div className="search-box">
        <SearchIcon size={26} />
        <label htmlFor="cq" className="sr-only">채무자 검색</label>
        <input id="cq" type="search" value={query} placeholder="채무자 검색: 이름 또는 전화번호" onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>채무자 {rows?.length ?? 0}명</div>
      <div className="table-wrap">
        <table className="table" style={{ minWidth: 760 }}>
          <thead>
            <tr><th scope="col">이름</th><th scope="col">전화번호</th><th scope="col">계약</th><th scope="col">비고</th><th scope="col"><span className="sr-only">상세</span></th></tr>
          </thead>
          <tbody>
            {rows?.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => go({ name: 'customer', id: c.id })}>
                <td style={{ fontWeight: 700 }}>
                  {c.name}
                  {c.sameNameCount > 0 && <span className="badge warn" style={{ marginLeft: 8 }}>동명이인</span>}
                </td>
                <td className="nowrap">{c.phone}</td>
                <td className="nowrap">진행 {c.activeCount}건{c.closedCount ? ` · 종료 ${c.closedCount}건` : ''}</td>
                <td className="muted">{c.memo}</td>
                <td style={{ textAlign: 'right' }}>
                  <button type="button" className="btn outline sm" onClick={(e) => { e.stopPropagation(); go({ name: 'customer', id: c.id }); }}>상세</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && <div className="empty">{query ? '검색 결과가 없습니다.' : '등록된 채무자가 없습니다. [새 계약]에서 등록할 수 있습니다.'}</div>}
      </div>
    </main>
  );
}

export function CustomerDetail({ id }: { id: number }) {
  const { go, fail, toast } = useApp();
  const { data, reload } = useLoad(() => api.getCustomer(id), [id]);
  const [edit, setEdit] = useState<{ name: string; phone: string; memo: string } | null>(null);
  const [error, setError] = useState('');

  if (!data) return <main className="main" />;
  const { customer: c, contracts, sameName } = data;
  const active = contracts.filter((r) => r.status === 'active').length;

  const save = async () => {
    if (!edit) return;
    try {
      const res = await api.updateCustomer(c.id, edit);
      if (!res.ok) return setError(res.message);
      setEdit(null);
      setError('');
      toast('채무자 정보를 수정했습니다.');
      await reload();
    } catch (e) { fail(e); }
  };

  return (
    <main className="main" style={{ gap: 20 }}>
      <BackButton />
      <section aria-labelledby="who" className="card" style={{ padding: 28 }}>
        {!edit ? (
          <div className="row between top" style={{ gap: 16 }}>
            <div className="col">
              <h1 id="who" style={{ fontSize: 38, fontWeight: 900 }}>{c.name}</h1>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{c.phone}</div>
              <div className="muted" style={{ fontSize: 19 }}>
                등록일 {longDate(c.createdAt.slice(0, 10))}{c.memo ? ` · 비고: ${c.memo}` : ''}
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn primary" onClick={() => go({ name: 'new', customerId: c.id })}><PlusIcon />새 계약 추가</button>
              <button type="button" className="btn plain" onClick={() => setEdit({ name: c.name, phone: c.phone, memo: c.memo })}><PencilIcon size={22} />정보 수정</button>
            </div>
          </div>
        ) : (
          <div className="col" style={{ gap: 14 }}>
            <h1 id="who" style={{ fontSize: 28, fontWeight: 900 }}>채무자 정보 수정</h1>
            <div className="row top" style={{ gap: 16 }}>
              <div className="field" style={{ flex: '1 1 220px' }}>
                <label htmlFor="e-name">이름</label>
                <input id="e-name" className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div className="field" style={{ flex: '1 1 260px' }}>
                <label htmlFor="e-phone">전화번호</label>
                <input id="e-phone" className="input" inputMode="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: formatPhone(e.target.value) })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="e-memo">비고</label>
              <input id="e-memo" className="input" value={edit.memo} onChange={(e) => setEdit({ ...edit, memo: e.target.value })} />
            </div>
            {error && <div className="error-text">{error}</div>}
            <div className="row">
              <button type="button" className="btn primary md" onClick={save}>저장</button>
              <button type="button" className="btn plain md" onClick={() => { setEdit(null); setError(''); }}>취소</button>
            </div>
          </div>
        )}
        {sameName.map((s) => (
          <div key={s.id} className="notice-box">
            <AlertIcon />
            <span>동명이인이 있습니다: <b>{s.name} · {s.phone}</b></span>
            <button type="button" className="name-link" style={{ fontWeight: 700, color: '#7C2D12', textDecoration: 'underline', fontSize: 20 }}
              onClick={() => go({ name: 'customer', id: s.id })}>상세 보기</button>
          </div>
        ))}
      </section>

      <section aria-labelledby="list-h" className="col" style={{ gap: 14 }}>
        <h2 id="list-h" className="section-title">
          {c.name}님과의 계약 <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--muted)' }}>진행 {active}건 · 종료 {contracts.length - active}건</span>
        </h2>
        <ContractTable rows={contracts} />
      </section>
    </main>
  );
}
