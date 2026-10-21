import { useEffect, useState } from 'react';
import { digitsOnly, longDate, won } from '../../shared/format';
import { addMonths, dueDate, monthlyInterest, parseISO, periodsUntil } from '../../shared/schedule';
import type { Contract, Customer, ContractInput, RateType } from '../../shared/types';
import { api } from '../api';
import { useApp } from '../app-context';
import { CustomerPicker } from '../components/CustomerPicker';
import { BackButton, PhotoGrid } from '../components/ui';

interface Props {
  today: string;
  /** 고칠 때: 원래 계약과 사진 */
  existing?: { contract: Contract; customer: Customer; photos: string[] };
  /** 새 계약을 회원 화면에서 열었을 때 */
  initialCustomerId?: number;
}

function Step({ no, title, extra }: { no: number; title: string; extra?: string }) {
  return (
    <h2 className="step"><span className="step-no">{no}</span>{title}
      {extra && <span className="muted" style={{ fontSize: 20, fontWeight: 400 }}>{extra}</span>}
    </h2>
  );
}

export function ContractForm({ today, existing, initialCustomerId }: Props) {
  const { go, back, tabTo, toast, fail, confirm } = useApp();
  const c = existing?.contract;
  const [customer, setCustomer] = useState<Customer | null>(existing?.customer ?? null);
  const [date, setDate] = useState(c?.contractDate ?? today);
  const [principal, setPrincipal] = useState(c ? String(c.principal) : '');
  const [rateType, setRateType] = useState<RateType>(c?.rateType ?? 'year');
  const [rate, setRate] = useState(c ? String(c.rate) : '');
  const [maturity, setMaturity] = useState(c?.maturityDate ?? '');
  const [collateral, setCollateral] = useState(c?.collateral ?? '');
  const [memo, setMemo] = useState(c?.memo ?? '');
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [markPastDone, setMarkPastDone] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialCustomerId) api.getCustomer(initialCustomerId).then((d) => setCustomer(d.customer)).catch(fail);
  }, [initialCustomerId, fail]);

  const p = Number(principal) || 0;
  const r = parseFloat(rate) || 0;
  const interest = monthlyInterest(p, rateType, r);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const firstDue = validDate ? dueDate(date, 1) : null;
  const day = validDate ? parseISO(date).d : 0;
  const pastCount = !existing && validDate ? periodsUntil(date, today).filter((n) => dueDate(date, n) < today).length : 0;

  const save = async () => {
    setError('');
    if (!customer) return setError('1번에서 계약할 회원을 골라 주세요.');
    if (!validDate) return setError('계약한 날을 입력해 주세요.');
    if (p <= 0) return setError('빌려준 돈을 입력해 주세요.');
    if (!rate.trim()) return setError('이자율을 입력해 주세요.');
    const input: ContractInput = {
      customerId: customer.id, contractDate: date, principal: p, rateType, rate: r,
      collateral, maturityDate: maturity || null, memo
    };
    setSaving(true);
    try {
      if (existing) {
        await api.updateContract(existing.contract.id, input);
        toast('계약 내용을 고쳤습니다.');
        back();
      } else {
        const id = await api.createContract(input, photos, pastCount > 0 && markPastDone);
        toast('계약을 저장했습니다.');
        go({ name: 'contract', id });
      }
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async (names: string[]) => {
    if (!existing) return setPhotos((ps) => [...ps, ...names]);
    try {
      await api.addContractPhotos(existing.contract.id, names);
      setPhotos((ps) => [...ps, ...names]);
    } catch (e) { fail(e); }
  };
  const removePhoto = async (name: string) => {
    if (!existing) return setPhotos((ps) => ps.filter((n) => n !== name));
    if (!(await confirm({ title: '이 사진을 뺄까요?', body: '뺀 사진은 되살릴 수 없습니다.', yes: '예, 뺍니다' }))) return;
    try {
      await api.removeContractPhoto(existing.contract.id, name);
      setPhotos((ps) => ps.filter((n) => n !== name));
    } catch (e) { fail(e); }
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: '이 계약을 완전히 지울까요?',
      body: '문자·이자 기록과 사진까지 모두 지워지고 되살릴 수 없습니다. 돈을 다 받았다면 지우지 말고 [상환 완료]를 눌러 주세요.',
      yes: '예, 완전히 지웁니다'
    });
    if (!ok) return;
    try {
      await api.deleteContract(existing.contract.id);
      toast('계약을 지웠습니다.');
      tabTo({ name: 'contracts' });
    } catch (e) { fail(e); }
  };

  return (
    <main className="main narrow">
      {existing && <BackButton />}
      <h1 className="page-title">{existing ? '계약 내용 수정' : '새 계약 적기'}</h1>

      <section className="card" style={{ padding: 28 }}>
        <Step no={1} title="누구와 계약하나요?" />
        <CustomerPicker value={customer} onChange={setCustomer} />
      </section>

      <section className="card" style={{ padding: 28, gap: 20 }}>
        <Step no={2} title="얼마를, 어떤 이자로?" />
        <div className="row top" style={{ gap: 20 }}>
          <div className="field" style={{ flex: '1 1 260px' }}>
            <label htmlFor="f-date">계약한 날</label>
            <input id="f-date" type="date" className="input" value={date} max="2999-12-31" onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 260px' }}>
            <label htmlFor="f-principal">빌려준 돈 (원)</label>
            <input id="f-principal" className="input money" inputMode="numeric" placeholder="0"
              value={p ? p.toLocaleString('ko-KR') : ''} onChange={(e) => setPrincipal(digitsOnly(e.target.value).slice(0, 12))} />
          </div>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 20 }}>
          <div className="field">
            <span id="f-rt" className="label">이자 기준</span>
            <div role="group" aria-labelledby="f-rt" className="segmented">
              <button type="button" aria-pressed={rateType === 'month'} onClick={() => setRateType('month')}>한 달에</button>
              <button type="button" aria-pressed={rateType === 'year'} onClick={() => setRateType('year')}>일 년에</button>
            </div>
          </div>
          <div className="field" style={{ flex: '0 1 200px' }}>
            <label htmlFor="f-rate">이자율 (%)</label>
            <div className="suffix-wrap">
              <input id="f-rate" className="input money" inputMode="decimal" value={rate} style={{ height: 60 }}
                onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 7))} />
              <span className="suffix" aria-hidden="true">%</span>
            </div>
          </div>
        </div>
        <div className="interest-box">
          <div style={{ fontSize: 20, color: 'var(--blue-dark)', fontWeight: 700 }}>매달 받을 이자 (자동 계산)</div>
          <div className="big">{won(interest)}</div>
          <div style={{ fontSize: 19, color: 'var(--ink-2)' }}>
            {rateType === 'month'
              ? `${won(p)} × 한 달 ${r}% = 매달 ${won(interest)}`
              : `${won(p)} × 일 년 ${r}% ÷ 12개월 = 매달 ${won(interest)}`}
          </div>
          {firstDue && (
            <div style={{ fontSize: 19, color: 'var(--ink-2)' }}>
              이자 문자: <b>{longDate(firstDue)}</b>부터 매달 {day >= 29 ? `${day}일(짧은 달은 말일)` : `${day}일`} 알려 드립니다.
            </div>
          )}
        </div>
        <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="f-maturity">만기일 <span className="muted" style={{ fontWeight: 400 }}>(없으면 비워 두세요)</span></label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input id="f-maturity" type="date" className="input" value={maturity} max="2999-12-31" onChange={(e) => setMaturity(e.target.value)} />
            {validDate && !maturity && (
              <button type="button" className="btn plain sm" onClick={() => setMaturity(addMonths(date, 3))}>3개월 뒤</button>
            )}
            {maturity && <button type="button" className="btn plain sm" onClick={() => setMaturity('')}>비우기</button>}
          </div>
        </div>
        {pastCount > 0 && (
          <label className="check" style={{ padding: 16, borderRadius: 12, background: 'var(--amber-soft)' }}>
            <input type="checkbox" checked={markPastDone} onChange={(e) => setMarkPastDone(e.target.checked)} />
            <span>
              예전 계약을 옮겨 적는 중이라면: 이미 지난 <b>{pastCount}회</b>의 문자와 이자는 <b>처리 완료</b>로 기록합니다.
              <span className="hint" style={{ display: 'block' }}>체크를 끄면 지난 회차가 모두 ‘못 보낸 문자’, ‘이자 안 들어온 계약’에 나옵니다.</span>
            </span>
          </label>
        )}
      </section>

      <section className="card" style={{ padding: 28, gap: 20 }}>
        <Step no={3} title="맡긴 물건" />
        <div className="field">
          <label htmlFor="f-collateral">담보 물품</label>
          <input id="f-collateral" className="input" value={collateral} placeholder="예: 아이폰 15 Pro 256GB 블랙, 박스·충전기 있음"
            onChange={(e) => setCollateral(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f-memo">메모 <span className="muted" style={{ fontWeight: 400 }}>(선택)</span></label>
          <textarea id="f-memo" className="textarea" rows={3} value={memo} placeholder="예: 액정 기스 있음" onChange={(e) => setMemo(e.target.value)} />
        </div>
      </section>

      <section className="card" style={{ padding: 28 }}>
        <Step no={4} title="사진" extra="(선택)" />
        <div style={{ color: 'var(--ink-2)' }}>맡긴 물건, 계약서 등 필요한 사진을 자유롭게 넣을 수 있습니다.</div>
        <PhotoGrid scope={existing ? existing.contract.id : 'p'} names={photos} onAdd={addPhotos} onRemove={removePhoto} />
        <div className="hint">사진 파일을 이 칸으로 끌어다 놓아도 됩니다.</div>
      </section>

      {error && <div role="alert" className="error-text" style={{ fontSize: 22 }}>{error}</div>}
      <div className="row" style={{ gap: 16 }}>
        <button type="button" className="btn primary lg" style={{ flex: '1 1 360px' }} disabled={saving} onClick={save}>
          {existing ? '고친 내용 저장' : '계약 저장'}
        </button>
        <button type="button" className="btn plain lg" style={{ flex: '0 1 200px', fontSize: 24, fontWeight: 700 }}
          onClick={() => (existing ? back() : tabTo({ name: 'today' }))}>취소</button>
      </div>
      {existing && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn danger-outline md" onClick={remove}>이 계약 완전히 지우기</button>
        </div>
      )}
    </main>
  );
}
