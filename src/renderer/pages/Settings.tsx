import { useEffect, useState } from 'react';
import { DEFAULT_TEMPLATE, ZOOMS, renderMessage } from '../../shared/format';
import type { DueItem, Settings as SettingsT } from '../../shared/types';
import { api } from '../api';
import { useApp } from '../app-context';
import { DownloadIcon } from '../components/Icons';

const ZOOM_LABELS = ['작게', '보통 (기본)', '크게', '아주 크게'];

const SAMPLE = { name: '홍길동', amount: 30000, dueDate: '2026-10-21', period: 4 } as DueItem;

export function Settings({ settings, onSaved }: { settings: SettingsT; onSaved: (s: SettingsT) => void }) {
  const { toast, fail } = useApp();
  const [form, setForm] = useState(settings);
  const [zoom, setZoom] = useState(settings.zoom);
  const [info, setInfo] = useState<{ version: string; dataDir: string } | null>(null);

  useEffect(() => { api.getAppInfo().then(setInfo).catch(fail); }, [fail]);

  const save = async () => {
    try {
      await api.saveSettings({ ...form, zoom });
      onSaved({ ...form, zoom });
      toast('설정을 저장했습니다.');
    } catch (e) { fail(e); }
  };
  // 화면 크기는 누르는 즉시 바뀌고 저장된다 (저장된 업체 정보는 그대로)
  const changeZoom = async (z: number) => {
    try {
      await api.saveSettings({ ...settings, zoom: z });
      setZoom(z);
      onSaved({ ...settings, zoom: z });
    } catch (e) { fail(e); }
  };
  const run = async (fn: () => Promise<string | null | void>, ok: (r: string) => string) => {
    try {
      const r = await fn();
      if (r) toast(ok(r));
    } catch (e) { fail(e); }
  };

  return (
    <main className="main narrow">
      <h1 className="page-title">설정</h1>

      <section className="card" style={{ padding: 28 }}>
        <h2 className="section-title">업체 정보 및 고지 문구</h2>
        <div className="row top" style={{ gap: 16 }}>
          <div className="field" style={{ flex: '1 1 260px' }}>
            <label htmlFor="s-shop">상호</label>
            <input id="s-shop" className="input" value={form.shopName} placeholder="예: 행복전당포" onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '1 1 320px' }}>
            <label htmlFor="s-account">입금 계좌</label>
            <input id="s-account" className="input" value={form.account} placeholder="예: 농협 123-4567-8901 홍길동" onChange={(e) => setForm({ ...form, account: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="s-template">이자 고지 문구</label>
          <textarea id="s-template" className="textarea" rows={3} value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
          <div className="hint">
            중괄호 항목은 자동으로 채워집니다: {'{이름} {이자} {월} {납부일} {회차} {상호} {계좌}'}
          </div>
        </div>
        <div className="col" style={{ gap: 6 }}>
          <span className="label">미리 보기</span>
          <div className="message">{renderMessage(form, SAMPLE)}</div>
        </div>
        <div className="row">
          <button type="button" className="btn primary" onClick={save}>저장</button>
          <button type="button" className="btn plain md" onClick={() => setForm({ ...form, template: DEFAULT_TEMPLATE })}>기본 문구로 복원</button>
        </div>
      </section>

      <section className="card" style={{ padding: 28 }} data-tour="st-zoom">
        <h2 className="section-title">화면 크기</h2>
        <div style={{ color: 'var(--ink-2)' }}>글자와 버튼 크기를 고릅니다. 누르면 바로 바뀝니다.</div>
        <div className="segmented" role="group" aria-label="화면 크기" style={{ alignSelf: 'flex-start' }}>
          {ZOOMS.map((z, i) => (
            <button key={z} type="button" aria-pressed={zoom === z} onClick={() => changeZoom(z)}>
              {ZOOM_LABELS[i]} ({Math.round(z * 100)}%)
            </button>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 28 }} data-tour="st-data">
        <h2 className="section-title">데이터 관리</h2>
        <div style={{ color: 'var(--ink-2)' }}>
          모든 데이터는 이 컴퓨터의 <b>{info?.dataDir}</b> 폴더에 저장됩니다. 프로그램 실행 시 하루 1회 자동으로 백업됩니다.
        </div>
        <div className="row">
          <button type="button" className="btn success" onClick={() => run(api.exportAll, (f) => `엑셀 파일을 저장했습니다: ${f}`)}>
            <DownloadIcon />전체 데이터 엑셀 내보내기
          </button>
          <button type="button" className="btn plain" onClick={() => run(api.backupNow, (f) => `백업했습니다: ${f}`)}>지금 백업</button>
          <button type="button" className="btn plain" onClick={() => run(api.openDataFolder, () => '')}>데이터 폴더 열기</button>
        </div>
      </section>

      <div className="hint">프로그램 버전 {info?.version}</div>
    </main>
  );
}
