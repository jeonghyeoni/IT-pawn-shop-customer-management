import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import { useApp, type Route } from '../app-context';
import { CloseIcon } from './Icons';

/**
 * 처음 쓰는 분을 위한 화면 안내.
 * 화면을 어둡게 하고 설명할 버튼·영역만 밝게 띄운 뒤, 옆에 설명 상자를 선으로 이어 보여 준다.
 * 항상 '오늘 할 일'부터 시작해 [다음]으로 모든 화면을 차례로 돈다.
 */

type Page = 'today' | 'sent' | 'new' | 'contracts' | 'contract' | 'customers' | 'customer' | 'settings';

interface Step {
  page: Page;
  /** 밝게 보여 줄 대상 (CSS 선택자). 여러 개면 모두 감싸는 사각형. 없으면 가운데 안내 */
  target?: string | string[];
  title: string;
  body: ReactNode;
  /** 대상이 화면에 없으면 이 단계를 건너뛴다 */
  optional?: boolean;
  /** 대상이 화면에 없을 때 덧붙이는 말 */
  missing?: string;
}

const PAGE_LABEL: Record<Page, string> = {
  today: '오늘 할 일', sent: '이자 고지 발송 내역', new: '새 계약', contracts: '계약 목록',
  contract: '계약 상세', customers: '채무자 목록', customer: '채무자 정보', settings: '설정'
};

const NO_DUE = '오늘은 이자 납부일인 계약이 없어서 화면에 카드가 없습니다. 납부일인 계약이 있으면 이 자리에 나옵니다.';
const CARD = '[data-tour="due-card"]';

const STEPS: Step[] = [
  {
    page: 'today', title: '전당포 관리 사용법',
    body: <>프로그램의 모든 기능을 실제 화면을 보면서 차례대로 알려 드립니다.<br />아래 <b>[다음]</b>을 눌러 넘기세요. 그만 보려면 오른쪽 위 <b>[✕ 닫기]</b>를 누르면 됩니다.</>
  },
  {
    page: 'today', target: '[data-tour="nav"]', title: '메뉴',
    body: (
      <>
        누르면 그 화면으로 바로 갑니다.<br />
        <b>오늘 할 일</b>: 켜면 처음 나오는 화면<br />
        <b>새 계약</b>: 계약 등록<br />
        <b>계약 목록</b>: 계약 찾아보기<br />
        <b>채무자 목록</b>: 채무자 찾아보기<br />
        <b>톱니바퀴</b>: 설정<br />
        <b>?</b>: 이 도움말
      </>
    )
  },
  {
    page: 'today', target: '[data-tour="hero"]', title: '오늘 이자 고지 현황',
    body: <>오늘 이자 납부일인 계약 가운데 <b>아직 문자를 보내지 않은 건수</b>입니다. 오른쪽 막대는 문자 발송과 이자 수납이 얼마나 끝났는지 보여 줍니다. 모두 보내면 <b>‘완료’</b>로 바뀝니다.</>
  },
  {
    page: 'today', target: CARD, title: '오늘 이자 고지 카드', missing: NO_DUE,
    body: <>오늘 이자 납부일인 계약 하나가 카드 하나입니다. 채무자 이름·전화번호, <b>몇 회차 이자인지와 금액</b>이 크게 나옵니다. 이름을 누르면 채무자 정보로 갑니다.</>
  },
  {
    page: 'today', target: [`${CARD} .due-msg`, `${CARD} .due-copy`], title: '① 문구 복사 → 문자 보내기', missing: NO_DUE,
    body: <>고지 문자가 미리 만들어져 있습니다. <b>[문구 복사]</b>를 누른 뒤 휴대폰이나 문자 프로그램에 <b>붙여넣어 보내세요.</b> 문자에 들어가는 상호·계좌는 설정에서 바꿉니다.</>
  },
  {
    page: 'today', target: `${CARD} .check-row > :nth-child(1)`, title: '② 문자 발송 확인', missing: NO_DUE,
    body: <>문자를 보낸 뒤 이 칸을 누르면 <b>체크(✓)</b>됩니다. 체크한 카드는 아래 <b>‘발송 완료’</b> 묶음으로 내려가고 ‘최근 발송 내역’에도 들어갑니다. 잘못 눌렀으면 <b>한 번 더 누르면 해제</b>됩니다.</>
  },
  {
    page: 'today', target: `${CARD} .check-row > :nth-child(2)`, title: '③ 이자 수납 확인', missing: NO_DUE,
    body: <>이자가 입금되면 이 칸을 눌러 체크합니다. <b>받은 날짜가 함께 기록</b>됩니다. 잘못 눌렀으면 한 번 더 누르면 해제됩니다.</>
  },
  {
    page: 'today', target: `${CARD} .due-detail`, title: '계약 상세 보기', missing: NO_DUE,
    body: <><b>[계약 상세]</b>를 누르면 이 계약의 모든 정보와 회차별 이자 내역을 볼 수 있습니다.</>
  },
  {
    page: 'today', target: '[data-tour="done-card"]', title: '발송 완료된 카드', optional: true,
    body: <>문자 발송을 체크한 카드는 이렇게 <b>회색 체크</b>와 함께 아래로 모입니다. 여기서도 수납 체크와 해제를 할 수 있습니다.</>
  },
  {
    page: 'today', target: 'section[aria-labelledby="late-h"]', title: '미발송 고지', optional: true,
    body: <>납부일이 지났는데 <b>아직 문자 발송 체크를 하지 않은 건</b>입니다. 문자를 보냈으면 [발송 확인]을 눌러 주세요.</>
  },
  {
    page: 'today', target: 'section[aria-labelledby="recent-h"]', title: '최근 발송 내역',
    body: <>최근에 보낸 이자 고지 3건과 수납 여부입니다. <b>[전체 보기]</b>를 누르면 지금까지 보낸 내역을 모두 볼 수 있습니다.</>
  },
  {
    page: 'today', target: 'section[aria-labelledby="unpaid-h"]', title: '이자 연체',
    body: <>납부일이 지났는데 <b>이자 수납 체크가 안 된 회차</b>입니다. 누르면 그 계약으로 갑니다.</>
  },
  {
    page: 'today', target: 'section[aria-labelledby="due-h"]', title: '만기 임박',
    body: <>7일 안에 만기가 되는 계약입니다. <b>상환 완료·유질 처리를 하지 않으면 만기 다음 날 1년 자동 연장</b>됩니다.</>
  },

  {
    page: 'sent', target: '[aria-label="보기 선택"]', title: '보낸 이자 고지 전체',
    body: <>‘최근 발송 내역’의 [전체 보기]를 누르면 나오는 화면입니다. 보낸 문자가 최근 순서로 모두 나옵니다. <b>[미수납만]</b>을 누르면 문자는 보냈지만 아직 이자를 못 받은 건만 봅니다.</>
  },
  {
    page: 'sent', target: '.list-row', title: '여기서도 체크', missing: '아직 보낸 문자가 없어서 목록이 비어 있습니다.',
    body: <>이 화면에서도 칸을 눌러 <b>수납을 체크</b>하거나 <b>발송 체크를 해제</b>할 수 있습니다.</>
  },

  {
    page: 'new', target: '[data-tour="nc-customer"]', title: '새 계약 ① 채무자 고르기',
    body: <>이름이나 전화번호 일부를 입력하면 등록된 채무자가 나옵니다. <b>[선택]</b>을 누르세요. 처음 오신 분이면 <b>[신규 채무자 등록]</b>을 눌러 이름과 전화번호를 넣습니다. 이름이 같은 분은 전화번호로 구분합니다.</>
  },
  {
    page: 'new', target: ['.field:has(#f-date)', '.field:has(#f-principal)'], title: '새 계약 ② 계약일과 대부금액',
    body: <>계약일에는 오늘 날짜가 미리 들어가 있습니다. 대부금액은 숫자만 넣으면 쉼표가 자동으로 붙습니다.<br />예전 장부의 계약을 옮길 때 계약일을 예전 날짜로 넣으면 <b>‘기존 계약 이관’</b> 체크가 나오고, 체크하면 지난 회차는 처리 완료로 기록됩니다.</>
  },
  {
    page: 'new', target: ['.field:has(.segmented)', '.field:has(#f-rate)'], title: '새 계약 ③ 이자율',
    body: <>먼저 <b>월 이율</b>인지 <b>연 이율</b>인지 고르고, 이자율(%)을 넣습니다.</>
  },
  {
    page: 'new', target: '.interest-box', title: '월 이자 자동 계산',
    body: <>매달 받을 이자가 <b>자동으로 계산</b>됩니다. 첫 이자 납부일은 계약일로부터 한 달 뒤이고, 그 뒤로 매달 같은 날입니다.</>
  },
  {
    page: 'new', target: '.field:has(#f-maturity)', title: '새 계약 ④ 만기일',
    body: <>만기일은 <b>계약일로부터 1년</b>으로 자동 입력됩니다. 날짜 칸을 눌러 바꿀 수 있습니다. 상환 완료·유질 처리를 하지 않으면 <b>만기 다음 날 1년씩 자동 연장</b>됩니다.</>
  },
  {
    page: 'new', target: '[data-tour="nc-collateral"]', title: '새 계약 ⑤ 담보물',
    body: <>맡긴 물건을 자세히 적습니다. 흠집 같은 특이 사항은 비고에 적습니다.</>
  },
  {
    page: 'new', target: '[data-tour="nc-photos"]', title: '새 계약 ⑥ 사진 (선택)',
    body: <><b>[사진 추가]</b>를 눌러 담보물이나 계약서 사진을 붙입니다. 사진 파일을 이 칸으로 끌어다 놓아도 됩니다.</>
  },
  {
    page: 'new', target: '[data-tour="nc-save"]', title: '새 계약 ⑦ 계약 등록',
    body: <>다 적었으면 <b>[계약 등록]</b>을 누릅니다. 다음 달부터 이자 납부일마다 ‘오늘 할 일’에 자동으로 나옵니다.</>
  },

  {
    page: 'contracts', target: '[data-tour="cl-search"]', title: '계약 찾기',
    body: <>채무자 이름, 전화번호(뒷자리만도 됨), 담보물로 검색합니다. 계약일 기간이나 <b>계약 상태(진행 중·상환 완료·유질)</b>로 좁힐 수도 있습니다.</>
  },
  {
    page: 'contracts', target: '.table-wrap tbody tr', title: '계약 한 줄', missing: '아직 등록된 계약이 없습니다.',
    body: <>계약일, 채무자, 담보물, 대부금액, 월 이자, 상태, 다음 고지일이 나옵니다. 줄이나 <b>[상세]</b>를 누르면 계약 상세 화면으로 갑니다.</>
  },
  {
    page: 'contracts', target: '[data-tour="cl-export"]', title: '엑셀로 내보내기',
    body: <>지금 목록에 보이는 계약을 <b>엑셀 파일</b>로 저장합니다.</>
  },

  {
    page: 'contract', target: '.status-bar', title: '계약 상태와 종료 처리',
    body: <>왼쪽은 <b>지금 상태</b>입니다. 원금과 이자를 모두 받았으면 <b>[상환 완료 처리]</b>, 담보물을 처분하면 <b>[유질 처리]</b>를 누릅니다. 처리한 계약은 이자 고지에서 빠지고, 실수했으면 [진행 중으로 복원]으로 되돌립니다.</>
  },
  {
    page: 'contract', target: '[data-tour="cd-edit"]', title: '계약 수정',
    body: <>대부금액, 이자율, 담보물, 사진 같은 <b>계약 내용을 고칩니다.</b></>
  },
  {
    page: 'contract', target: 'section[aria-labelledby="info-h"]', title: '계약 정보',
    body: <>계약일, 대부금액, 이자율, <b>월 이자</b>, 매달 이자 납부일을 한눈에 봅니다.</>
  },
  {
    page: 'contract', target: '[data-tour="cd-maturity"]', title: '만기일',
    body: <>만기일과 자동 연장 횟수가 나옵니다. <b>[만기일 변경]</b>을 누르면 바로 바꿀 수 있습니다.</>
  },
  {
    page: 'contract', target: 'section[aria-labelledby="photo-h"]', title: '첨부 사진',
    body: <>사진을 누르면 크게 보입니다. 사진 추가·삭제는 [계약 수정]에서 합니다.</>
  },
  {
    page: 'contract', target: '.stats', title: '이자 합계',
    body: <>지금까지 <b>발생한 이자, 받은 이자, 아직 못 받은 이자</b>입니다.</>
  },
  {
    page: 'contract', target: 'section[aria-labelledby="pay-h"] table', title: '회차별 이자 내역',
    body: <>납부일마다 한 줄씩 나옵니다. <b>[발송 확인]·[수납 확인]</b> 칸을 눌러 체크하고, 받은 날짜가 다르면 <b>[수납일 수정]</b>으로 고칩니다. ‘예정’은 아직 납부일이 안 된 회차입니다.</>
  },
  {
    page: 'contract', target: '[data-tour="cd-customer"]', title: '채무자 정보로 가기',
    body: <>채무자 이름을 누르면 그분의 정보와 다른 계약을 볼 수 있습니다.</>
  },

  {
    page: 'customers', target: '.search-box', title: '채무자 찾기',
    body: <>이름이나 전화번호로 채무자를 찾습니다.</>
  },
  {
    page: 'customers', target: '.table-wrap tbody tr', title: '채무자 한 줄', missing: '아직 등록된 채무자가 없습니다.',
    body: <>이름, 전화번호, 진행 중·종료된 계약 수가 나옵니다. 이름이 같은 분은 <b>‘동명이인’</b> 표시가 붙습니다. 누르면 채무자 정보로 갑니다.</>
  },
  {
    page: 'customer', target: '[data-tour="cu-actions"]', title: '새 계약 추가 · 정보 수정',
    body: <><b>[새 계약 추가]</b>를 누르면 이 채무자가 미리 선택된 채로 새 계약 화면이 열립니다. <b>[정보 수정]</b>으로 이름·전화번호·비고를 고칩니다.</>
  },
  {
    page: 'customer', target: 'section[aria-labelledby="list-h"]', title: '이 채무자의 계약',
    body: <>이분의 모든 계약입니다. 누르면 계약 상세로 갑니다.</>
  },

  {
    page: 'settings', target: ['.field:has(#s-shop)', '.field:has(#s-template)'], title: '상호 · 계좌 · 고지 문구',
    body: <>상호와 입금 계좌를 넣고 <b>[저장]</b>을 누르면 이자 고지 문자에 자동으로 들어갑니다. {'{이름} {이자}'} 같은 중괄호 칸은 계약마다 자동으로 채워집니다. 아래 미리 보기로 확인하세요.</>
  },
  {
    page: 'settings', target: '[data-tour="st-zoom"]', title: '화면 크기',
    body: <>글씨와 버튼이 작거나 크면 여기서 고릅니다. <b>누르면 바로 바뀝니다.</b></>
  },
  {
    page: 'settings', target: '[data-tour="st-data"]', title: '데이터 관리',
    body: <>모든 자료는 이 컴퓨터의 문서 폴더에 저장되고 <b>하루 한 번 자동으로 백업</b>됩니다. [전체 데이터 엑셀 내보내기]로 모든 자료를 엑셀로 받을 수 있습니다.</>
  },
  {
    page: 'settings', target: '.help-btn', title: '도움말 다시 보기',
    body: <>이 안내를 다시 보려면 언제든 오른쪽 위 <b>[?]</b>를 누르세요.<br /><b>[완료]</b>를 누르면 도움말이 닫힙니다.</>
  }
];

interface Box { top: number; left: number; width: number; height: number }

const PAD = 10;
const GAP = 56;
const MARGIN = 16;

function findTargets(target: string | string[]): Element[] {
  const sels = Array.isArray(target) ? target : [target];
  return sels.map((s) => document.querySelector(s)).filter((e): e is Element => !!e);
}

function unionBox(els: Element[]): Box {
  const rs = els.map((e) => e.getBoundingClientRect());
  const top = Math.min(...rs.map((r) => r.top)) - PAD;
  const left = Math.min(...rs.map((r) => r.left)) - PAD;
  const bottom = Math.max(...rs.map((r) => r.bottom)) + PAD;
  const right = Math.max(...rs.map((r) => r.right)) + PAD;
  return { top, left, width: right - left, height: bottom - top };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** 설명 상자 위치와, 상자에서 대상까지 잇는 선 */
function layout(t: Box, w: number, h: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const b = { top: Math.max(t.top, 0), left: Math.max(t.left, 0), bottom: Math.min(t.top + t.height, vh), right: Math.min(t.left + t.width, vw) };
  const cx = (b.left + b.right) / 2;
  const cy = (b.top + b.bottom) / 2;
  let pos: { top: number; left: number };
  let line: [number, number, number, number] | null;
  if (vh - b.bottom >= h + GAP + MARGIN) {
    pos = { top: b.bottom + GAP, left: clamp(cx - w / 2, MARGIN, vw - w - MARGIN) };
    const x = clamp(cx, pos.left + 24, pos.left + w - 24);
    line = [x, pos.top, clamp(x, b.left + 12, b.right - 12), b.bottom];
  } else if (b.top >= h + GAP + MARGIN) {
    pos = { top: b.top - GAP - h, left: clamp(cx - w / 2, MARGIN, vw - w - MARGIN) };
    const x = clamp(cx, pos.left + 24, pos.left + w - 24);
    line = [x, pos.top + h, clamp(x, b.left + 12, b.right - 12), b.top];
  } else if (vw - b.right >= w + GAP + MARGIN) {
    pos = { top: clamp(cy - h / 2, MARGIN, vh - h - MARGIN), left: b.right + GAP };
    const y = clamp(cy, pos.top + 24, pos.top + h - 24);
    line = [pos.left, y, b.right, clamp(y, b.top + 12, b.bottom - 12)];
  } else if (b.left >= w + GAP + MARGIN) {
    pos = { top: clamp(cy - h / 2, MARGIN, vh - h - MARGIN), left: b.left - GAP - w };
    const y = clamp(cy, pos.top + 24, pos.top + h - 24);
    line = [pos.left + w, y, b.left, clamp(y, b.top + 12, b.bottom - 12)];
  } else {
    // 대상이 화면을 거의 채우면 아래쪽에 겹쳐 띄운다
    pos = { top: vh - h - MARGIN, left: clamp(cx - w / 2, MARGIN, vw - w - MARGIN) };
    line = null;
  }
  return { pos, line };
}

export function Tour({ onClose }: { onClose: () => void }) {
  const { route, go, tabTo } = useApp();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [ids, setIds] = useState<{ contract?: number; customer?: number }>({});
  const [i, setI] = useState(0);
  const dir = useRef<1 | -1>(1);
  const [box, setBox] = useState<Box | null>(null);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const bubble = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<ReturnType<typeof layout> | null>(null);

  // 상세 화면 안내에 쓸 계약·채무자를 하나 고른다. 없으면 그 화면 안내는 건너뛴다.
  useEffect(() => {
    api.searchContracts({ query: '', from: null, to: null, status: 'all' }).then((rows) => {
      const pick = rows.find((r) => r.status === 'active') ?? rows[0];
      setIds({ contract: pick?.id, customer: pick?.customerId });
      setSteps(STEPS.filter((s) => (s.page !== 'contract' || pick) && (s.page !== 'customer' || pick)));
    }).catch(() => setSteps(STEPS.filter((s) => s.page !== 'contract' && s.page !== 'customer')));
  }, []);

  const step = steps?.[i];
  const last = !!steps && i === steps.length - 1;

  // 상세 화면은 그 화면이 속한 메뉴 위에 쌓아서 연다 ([뒤로]가 자연스럽게 동작하도록)
  const open = useCallback((r: Route) => {
    if (r.name === 'contract' || r.name === 'editContract') { tabTo({ name: 'contracts' }); go(r); }
    else if (r.name === 'customer') { tabTo({ name: 'customers' }); go(r); }
    else if (r.name === 'sent') { tabTo({ name: 'today' }); go(r); }
    else tabTo(r);
  }, [go, tabTo]);

  // 끝나면 도움말을 누른 화면으로 돌아간다
  const startRoute = useRef(route);
  const finish = useCallback(() => {
    open(startRoute.current);
    onClose();
  }, [open, onClose]);

  const move = useCallback((d: 1 | -1) => {
    if (!steps) return;
    const n = i + d;
    if (n >= steps.length) return finish();
    if (n < 0) return;
    dir.current = d;
    setI(n);
  }, [steps, i, finish]);

  // 단계에 맞는 화면으로 이동
  const routeKey = JSON.stringify(route);
  const want: Route | null = !step ? null
    : step.page === 'contract' ? { name: 'contract', id: ids.contract! }
      : step.page === 'customer' ? { name: 'customer', id: ids.customer! }
        : { name: step.page };
  const onPage = !!want && JSON.stringify(want) === routeKey;
  useEffect(() => {
    if (!step || !want || onPage) return;
    open(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, onPage]);

  // 대상 찾기 (화면 자료를 불러오는 동안 잠시 기다린다)
  useEffect(() => {
    if (!step || !onPage) return;
    setReady(false);
    setBox(null);
    setMissing(false);
    setPlace(null);
    if (!step.target) { setReady(true); return; }
    const target = step.target;
    const started = performance.now();
    let raf = 0;
    const look = () => {
      const els = findTargets(target);
      const want = Array.isArray(target) ? target.length : 1;
      if (els.length >= want) {
        els[0].scrollIntoView({ block: 'center', inline: 'nearest' });
        requestAnimationFrame(() => { setBox(unionBox(els)); setReady(true); });
        return;
      }
      if (performance.now() - started > 1500) {
        if (step.optional) { move(dir.current); return; }
        setMissing(true);
        setReady(true);
        return;
      }
      raf = requestAnimationFrame(look);
    };
    raf = requestAnimationFrame(look);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, onPage]);

  // 스크롤·창 크기 바뀌면 다시 재기
  useEffect(() => {
    if (!step?.target || missing || !ready) return;
    const target = step.target;
    const remeasure = () => {
      const els = findTargets(target);
      if (els.length) setBox(unionBox(els));
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [step, missing, ready]);

  useLayoutEffect(() => {
    if (!box || !bubble.current) return setPlace(null);
    const r = bubble.current.getBoundingClientRect();
    setPlace(layout(box, r.width, r.height));
  }, [box, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, move]);

  if (!steps || !step) return <div className="tour"><div className="tour-shade" /></div>;

  const centered = !box;
  const pageSteps = steps.filter((s) => s.page === step.page);
  const pageNo = pageSteps.indexOf(step) + 1;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* 바깥 클릭은 막는다 (실수로 체크하지 않게) */}
      <div className="tour-block" />
      {box ? <div className="tour-spot" style={box} /> : <div className="tour-shade" />}
      {box && place?.line && (
        <svg className="tour-line" width="100%" height="100%" aria-hidden="true">
          <line x1={place.line[0]} y1={place.line[1]} x2={place.line[2]} y2={place.line[3]} />
          <circle cx={place.line[2]} cy={place.line[3]} r="7" />
        </svg>
      )}
      <div ref={bubble} className={`tour-bubble${centered ? ' centered' : ''}`}
        style={centered ? undefined : place ? { top: place.pos.top, left: place.pos.left } : { visibility: 'hidden' }}>
        <div className="tour-meta">
          <span className="tour-chip">{PAGE_LABEL[step.page]} {pageSteps.length > 1 ? `${pageNo}/${pageSteps.length}` : ''}</span>
          <span>전체 {i + 1} / {steps.length}</span>
        </div>
        <h2 id="tour-title" className="tour-title">{step.title}</h2>
        <div className="tour-body">{step.body}</div>
        {missing && step.missing && <div className="tour-missing">{step.missing}</div>}
        <div className="tour-nav">
          <button type="button" className="btn plain md" onClick={() => move(-1)} disabled={i === 0}>‹ 이전</button>
          <button type="button" className={`btn md ${last ? 'success' : 'primary'}`} onClick={() => move(1)} disabled={!ready} autoFocus>
            {last ? '완료 ✓' : '다음 ›'}
          </button>
        </div>
      </div>
      <button type="button" className="tour-close" onClick={finish} aria-label="도움말 닫기">
        <CloseIcon size={28} />닫기
      </button>
    </div>
  );
}
