import { useEffect, useState } from 'react';
import { rateText, won } from '../../shared/format';
import type { ContractFilter, ContractRow } from '../../shared/types';
import { api } from '../api';
import { useApp } from '../app-context';
import { DownloadIcon, SearchIcon } from '../components/Icons';
import { StatusBadge } from '../components/ui';

const STATUS_OPTIONS: { value: ContractFilter['status']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행 중' },
  { value: 'repaid', label: '상환 완료' },
  { value: 'forfeited', label: '유질' }
];

/** 계약 표. 계약 목록과 회원 상세에서 같이 쓴다. */
export function ContractTable({ rows }: { rows: ContractRow[] }) {
  const { go } = useApp();
  const nextColor = (k: ContractRow['next']['kind']) => (k === 'today' ? 'var(--blue)' : k === 'late' ? 'var(--orange)' : 'var(--ink)');
  return (
    <div className="table-wrap">
      <table className="table" style={{ minWidth: 1060 }}>
        <thead>
          <tr>
            <th scope="col">계약일</th><th scope="col">채무자</th><th scope="col">담보물</th>
            <th scope="col" className="num">대부금액</th><th scope="col" className="num">월 이자</th>
            <th scope="col">상태</th><th scope="col">다음 고지일</th><th scope="col"><span className="sr-only">상세</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="clickable" onClick={() => go({ name: 'contract', id: r.id })}>
              <td className="nowrap">{r.contractDate}</td>
              <td><div style={{ fontWeight: 700 }}>{r.name}</div><div className="nowrap" style={{ fontSize: 18, color: 'var(--muted)' }}>{r.phone}</div></td>
              <td>{r.collateral || '—'}</td>
              <td className="num">{won(r.principal)}</td>
              <td className="num">{won(r.monthlyInterest)}<div style={{ fontSize: 17, color: 'var(--muted)' }}>{rateText(r.rateType, r.rate)}</div></td>
              <td><StatusBadge status={r.status} /></td>
              <td className="nowrap" style={{ fontWeight: 700, color: nextColor(r.next.kind) }}>{r.next.label}</td>
              <td style={{ textAlign: 'right' }}>
                <button type="button" className="btn outline sm" onClick={(e) => { e.stopPropagation(); go({ name: 'contract', id: r.id }); }}>상세</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="empty">검색 결과가 없습니다.</div>}
    </div>
  );
}

let lastFilter: ContractFilter = { query: '', from: null, to: null, status: 'all' };

export function ContractList() {
  const { fail, toast } = useApp();
  const [filter, setFilter] = useState<ContractFilter>(lastFilter);
  const [rows, setRows] = useState<ContractRow[] | null>(null);

  useEffect(() => {
    lastFilter = filter;
    let alive = true;
    api.searchContracts(filter).then((r) => alive && setRows(r)).catch(fail);
    return () => { alive = false; };
  }, [filter, fail]);

  const exportXlsx = async () => {
    try {
      const file = await api.exportContracts(filter);
      if (file) toast(`엑셀 파일을 저장했습니다: ${file}`);
    } catch (e) { fail(e); }
  };

  return (
    <main className="main" style={{ gap: 20 }}>
      <h1 className="page-title">계약 목록</h1>
      <section aria-label="검색 조건" className="card" style={{ gap: 18 }} data-tour="cl-search">
        <div className="field">
          <label htmlFor="sq">채무자 이름, 전화번호, 담보물로 검색할 수 있습니다</label>
          <div className="search-box">
            <SearchIcon size={28} />
            <input id="sq" type="search" value={filter.query} placeholder="예: 김영수 / 6789 / 아이폰"
              onChange={(e) => setFilter({ ...filter, query: e.target.value })} />
          </div>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 20 }}>
          <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
            <div className="field" style={{ gap: 6 }}>
              <label htmlFor="from" style={{ fontSize: 19 }}>계약일 (시작)</label>
              <input id="from" type="date" className="input sm" value={filter.from ?? ''} onChange={(e) => setFilter({ ...filter, from: e.target.value || null })} />
            </div>
            <span style={{ fontSize: 22, paddingBottom: 12 }}>~</span>
            <div className="field" style={{ gap: 6 }}>
              <label htmlFor="to" style={{ fontSize: 19 }}>계약일 (종료)</label>
              <input id="to" type="date" className="input sm" value={filter.to ?? ''} onChange={(e) => setFilter({ ...filter, to: e.target.value || null })} />
            </div>
            {(filter.from || filter.to) && (
              <button type="button" className="btn plain sm" style={{ marginBottom: 4 }} onClick={() => setFilter({ ...filter, from: null, to: null })}>기간 초기화</button>
            )}
          </div>
          <div className="field" style={{ gap: 6 }}>
            <span id="stl" style={{ fontSize: 19, fontWeight: 700 }}>계약 상태</span>
            <div role="group" aria-labelledby="stl" className="row" style={{ gap: 8 }}>
              {STATUS_OPTIONS.map((o) => (
                <button key={o.value} type="button" className="pill" aria-pressed={filter.status === o.value}
                  onClick={() => setFilter({ ...filter, status: o.value })}>{o.label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="row between">
        <div style={{ fontSize: 24, fontWeight: 900 }}>검색 결과 {rows?.length ?? 0}건</div>
        <button type="button" className="btn success" onClick={exportXlsx} data-tour="cl-export"><DownloadIcon />엑셀로 내보내기</button>
      </div>
      {rows && <ContractTable rows={rows} />}
    </main>
  );
}
