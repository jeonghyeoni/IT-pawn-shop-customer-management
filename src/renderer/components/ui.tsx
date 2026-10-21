import { useEffect, useState, type CSSProperties, type DragEvent, type ReactElement } from 'react';
import { longDateWithWeekday } from '../../shared/format';
import type { ContractStatus, ISODate, UpdateStatus } from '../../shared/types';
import { api, photoUrl } from '../api';
import { useApp, type TabName } from '../app-context';
import {
  BackIcon, CameraIcon, CashIcon, CheckIcon, CloseIcon, GearIcon, HomeIcon, MessageIcon, PlusIcon, SearchIcon, UserIcon
} from './Icons';

const TABS: { name: TabName; label: string; icon: ReactElement }[] = [
  { name: 'today', label: '오늘 할 일', icon: <HomeIcon /> },
  { name: 'new', label: '새 계약', icon: <PlusIcon /> },
  { name: 'contracts', label: '계약 목록', icon: <SearchIcon /> },
  { name: 'customers', label: '회원 목록', icon: <UserIcon /> }
];

export function Header({ shopName, today }: { shopName: string; today: ISODate | null }) {
  const { tab, tabTo } = useApp();
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-name">{shopName ? `${shopName} 관리` : '전당포 관리'}</div>
          <div className="brand-date">{today ? longDateWithWeekday(today) : ''}</div>
        </div>
        <nav aria-label="메뉴" className="nav">
          {TABS.map((t) => (
            <button key={t.name} type="button" className="tab" aria-current={tab === t.name ? 'page' : undefined}
              onClick={() => tabTo({ name: t.name } as never)}>
              {t.icon}{t.label}
            </button>
          ))}
          <button type="button" className="tab icon-only" aria-label="설정" title="설정"
            aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => tabTo({ name: 'settings' })}>
            <GearIcon />
          </button>
        </nav>
      </div>
    </header>
  );
}

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' });
  const { fail } = useApp();
  useEffect(() => {
    api.getUpdateStatus().then(setStatus).catch(() => undefined);
    return window.pawn.onUpdateStatus(setStatus);
  }, []);
  if (status.state === 'idle') return null;

  const label =
    status.state === 'available' ? '지금 업데이트'
      : status.state === 'downloading' ? `업데이트 받는 중… ${status.percent}%`
        : status.state === 'ready' ? '곧 다시 켜집니다…' : '다시 시도';
  const text =
    status.state === 'available' ? `새 버전(${status.version})이 나왔습니다. 버튼을 누르면 바로 업데이트됩니다.`
      : status.state === 'error' ? '업데이트를 받지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.'
        : '업데이트를 받는 중입니다. 다 받으면 프로그램이 저절로 다시 켜집니다.';
  const busy = status.state === 'downloading' || status.state === 'ready';
  return (
    <div className="update-band">
      <div className="update-inner">
        <div className="update-text">{text}</div>
        <button type="button" className="btn warn" style={{ height: 52 }} disabled={busy}
          onClick={() => api.downloadUpdate().catch(fail)}>{label}</button>
      </div>
    </div>
  );
}

export function BackButton() {
  const { back, canGoBack, tabTo } = useApp();
  return (
    <button type="button" className="back" onClick={() => (canGoBack ? back() : tabTo({ name: 'today' }))}>
      <BackIcon />돌아가기
    </button>
  );
}

const STATUS_LABEL: Record<ContractStatus, string> = { active: '진행 중', repaid: '상환 완료', forfeited: '유질 (처분)' };
export function StatusBadge({ status, style }: { status: ContractStatus; style?: CSSProperties }) {
  return <span className={`badge ${status}`} style={style}>{STATUS_LABEL[status]}</span>;
}

/** 보냄 ↔ 보냄 완료 (다시 누르면 취소) */
export function SentButton({ sent, onClick, size = '' }: { sent: boolean; onClick: () => void; size?: '' | 'md' | 'sm' }) {
  return (
    <button type="button" className={`btn ${size} ${sent ? 'primary' : 'outline'}`} aria-pressed={sent} onClick={onClick}
      title={sent ? '한 번 더 누르면 취소됩니다' : undefined}>
      {sent ? <CheckIcon size={size === 'sm' ? 20 : 24} /> : <MessageIcon size={size === 'sm' ? 20 : 24} />}
      {sent ? '보냄 완료' : '보냄'}
    </button>
  );
}

/** 이자 받음 ↔ 이자 받음 완료 (다시 누르면 취소) */
export function PaidButton({ paid, onClick, size = '' }: { paid: boolean; onClick: () => void; size?: '' | 'md' }) {
  return (
    <button type="button" className={`btn ${size} ${paid ? 'success' : 'outline-success'}`} aria-pressed={paid} onClick={onClick}
      title={paid ? '한 번 더 누르면 취소됩니다' : undefined}>
      {paid ? <CheckIcon /> : <CashIcon />}
      {paid ? '이자 받음 완료' : '이자 받음'}
    </button>
  );
}

/** 사진 칸: 보기 / 추가(파일 고르기·끌어다 놓기) / 빼기 */
export function PhotoGrid({ scope, names, onAdd, onRemove }: {
  scope: number | 'p';
  names: string[];
  onAdd?: (names: string[]) => void;
  onRemove?: (name: string) => void;
}) {
  const { fail } = useApp();
  const [over, setOver] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const pick = () => api.pickPhotos().then((n) => n.length && onAdd?.(n)).catch(fail);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!onAdd) return;
    const paths = Array.from(e.dataTransfer.files).map((f) => window.pawn.pathForFile(f)).filter(Boolean);
    api.importPhotos(paths).then((n) => (n.length ? onAdd(n) : fail('사진 파일(jpg, png 등)만 넣을 수 있습니다.'))).catch(fail);
  };

  return (
    <div className={`drop-zone ${over ? 'over' : ''}`}
      onDragOver={(e) => { if (onAdd) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)} onDrop={drop}>
      <div className="photos">
        {names.map((n, i) => (
          <div key={n} className="photo">
            <button type="button" aria-label={`사진 ${i + 1} 크게 보기`} onClick={() => setViewing(n)}
              style={{ border: 0, padding: 0, width: '100%', height: '100%', cursor: 'pointer', background: 'none' }}>
              <img src={photoUrl(scope, n)} alt="" />
            </button>
            {onRemove && (
              <button type="button" className="photo-remove" aria-label={`사진 ${i + 1} 빼기`} onClick={() => onRemove(n)}>
                <CloseIcon />
              </button>
            )}
          </div>
        ))}
        {onAdd && (
          <button type="button" className="photo-add" onClick={pick}>
            <PlusIcon size={36} />사진 추가
          </button>
        )}
        {!onAdd && names.length === 0 && (
          <div className="hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CameraIcon />사진이 없습니다.</div>
        )}
      </div>
      {viewing && (
        <div className="overlay" onClick={() => setViewing(null)}>
          <div className="viewer">
            <img src={photoUrl(scope, viewing)} alt="크게 보기" />
            <button type="button" className="btn plain" onClick={() => setViewing(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
