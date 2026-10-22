import { useEffect, type ReactNode } from 'react';
import type { Route } from '../app-context';
import { CloseIcon } from './Icons';

interface HelpSection { title: string; steps?: boolean; items: ReactNode[] }
interface HelpPage { title: string; intro: string; sections: HelpSection[] }

const MATURITY: HelpSection = {
  title: '만기와 자동 연장',
  items: [
    <>새 계약의 만기일은 <b>계약일로부터 1년</b>으로 자동 입력됩니다. 날짜 칸을 눌러 바꿀 수 있습니다.</>,
    <>만기일이 지나도 <b>[상환 완료 처리]·[유질 처리]를 하지 않은 계약은 만기 다음 날 1년씩 자동 연장</b>됩니다.</>,
    <>이미 등록한 계약의 만기일은 계약 상세의 <b>[만기일 변경]</b>(또는 [계약 수정])에서 바꿉니다.</>
  ]
};

const PAGES: Record<Route['name'], HelpPage> = {
  today: {
    title: '오늘 할 일',
    intro: '프로그램을 켜면 처음 나오는 화면입니다. 오늘 이자 납부일인 계약과 챙겨야 할 일을 보여 줍니다.',
    sections: [
      {
        title: '이자 고지 문자 보내는 순서',
        steps: true,
        items: [
          <><b>[문구 복사]</b>를 누릅니다.</>,
          <>휴대폰(또는 PC 문자 프로그램)에 붙여넣어 문자를 보냅니다.</>,
          <>보낸 뒤 <b>[문자 발송 확인]</b> 칸을 눌러 체크합니다. 카드가 아래 ‘발송 완료’로 내려갑니다.</>,
          <>이자가 입금되면 <b>[이자 수납 확인]</b> 칸을 체크합니다.</>
        ]
      },
      {
        title: '알아 두면 좋은 점',
        items: [
          <>잘못 체크했으면 <b>한 번 더 누르면 해제</b>됩니다.</>,
          <><b>미발송 고지</b>: 납부일이 지났는데 아직 문자 발송 체크를 하지 않은 건입니다.</>,
          <><b>이자 연체</b>: 납부일이 지났는데 수납 체크가 되지 않은 회차입니다.</>,
          <><b>만기 임박</b>: 7일 안에 만기가 되는 계약입니다.</>,
          <>채무자 이름을 누르면 채무자 정보, <b>[계약 상세]</b>를 누르면 그 계약 화면으로 갑니다.</>
        ]
      }
    ]
  },
  new: {
    title: '새 계약 추가',
    intro: '새 계약을 등록하는 화면입니다. 위에서부터 차례로 채우고 맨 아래 [계약 등록]을 누르면 끝입니다.',
    sections: [
      {
        title: '입력 순서',
        steps: true,
        items: [
          <><b>채무자</b>: 이름이나 전화번호로 검색해 고릅니다. 처음 오신 분이면 <b>[신규 채무자 등록]</b>을 누릅니다. 이름이 같은 분은 전화번호로 구분합니다.</>,
          <><b>대부금액 / 이자율</b>: 계약일, 대부금액, 이자율 기준(월 이율·연 이율), 이자율을 넣으면 월 이자가 자동 계산됩니다.</>,
          <><b>담보물</b>: 담보물 내역과 비고를 적습니다.</>,
          <><b>첨부 사진</b>(선택): [사진 추가]를 누르거나 사진 파일을 끌어다 놓습니다.</>,
          <><b>[계약 등록]</b>을 누릅니다.</>
        ]
      },
      MATURITY,
      {
        title: '예전 장부의 계약을 옮길 때',
        items: [<>계약일을 예전 날짜로 넣으면 <b>‘기존 계약 이관’</b> 체크가 나옵니다. 체크해 두면 지난 회차는 고지·수납 완료로 처리됩니다.</>]
      }
    ]
  },
  editContract: {
    title: '계약 수정',
    intro: '등록한 계약의 내용을 고치는 화면입니다. 고친 뒤 맨 아래 [수정 내용 저장]을 누르세요.',
    sections: [
      MATURITY,
      {
        title: '계약 삭제',
        items: [<>[계약 삭제]는 잘못 등록한 계약을 지울 때만 쓰세요. 상환이 끝난 계약은 삭제하지 말고 계약 상세에서 <b>[상환 완료 처리]</b>를 누릅니다.</>]
      }
    ]
  },
  contracts: {
    title: '계약 목록',
    intro: '등록한 모든 계약을 찾아보는 화면입니다.',
    sections: [
      {
        title: '찾는 방법',
        items: [
          <>검색 칸에 <b>채무자 이름, 전화번호(뒷자리만도 가능), 담보물</b>을 입력합니다.</>,
          <>계약일 기간이나 계약 상태(진행 중·상환 완료·유질)로 좁힐 수 있습니다.</>,
          <>줄을 누르거나 <b>[상세]</b>를 누르면 계약 상세 화면으로 갑니다.</>,
          <><b>[엑셀로 내보내기]</b>를 누르면 지금 보이는 목록을 엑셀 파일로 저장합니다.</>
        ]
      }
    ]
  },
  contract: {
    title: '계약 상세',
    intro: '계약 한 건의 정보, 사진, 회차별 이자 내역을 보고 처리하는 화면입니다.',
    sections: [
      {
        title: '회차별 이자 내역',
        items: [
          <><b>[발송 확인]</b> 칸: 그 회차 이자 문자를 보냈으면 눌러 체크합니다.</>,
          <><b>[수납 확인]</b> 칸: 이자를 받았으면 눌러 체크합니다. 받은 날짜는 <b>[수납일 수정]</b>으로 바꿉니다.</>,
          <>잘못 체크했으면 한 번 더 누르면 해제됩니다.</>
        ]
      },
      {
        title: '계약이 끝났을 때',
        items: [
          <>원금과 이자를 모두 받았으면 <b>[상환 완료 처리]</b>, 담보물을 처분하면 <b>[유질 처리]</b>를 누릅니다.</>,
          <>처리한 계약은 이자 고지 대상에서 빠지고, 지난 내역은 그대로 보관됩니다.</>,
          <>실수로 눌렀으면 <b>[진행 중으로 복원]</b>을 누릅니다.</>
        ]
      },
      MATURITY,
      {
        title: '그 밖에',
        items: [
          <>계약 내용을 고치려면 <b>[계약 수정]</b>을 누릅니다.</>,
          <>오른쪽 위 채무자 이름을 누르면 그 채무자의 다른 계약도 볼 수 있습니다. 사진을 누르면 크게 보입니다.</>
        ]
      }
    ]
  },
  customers: {
    title: '채무자 목록',
    intro: '등록한 채무자를 찾아보는 화면입니다.',
    sections: [
      {
        title: '사용 방법',
        items: [
          <>검색 칸에 이름이나 전화번호를 입력합니다.</>,
          <>채무자를 누르면 그 분의 정보와 모든 계약이 나옵니다.</>,
          <>이름이 같은 분은 <b>동명이인</b> 표시와 전화번호로 구분합니다.</>
        ]
      }
    ]
  },
  customer: {
    title: '채무자 정보',
    intro: '채무자 한 분의 정보와 그 분의 모든 계약을 보는 화면입니다.',
    sections: [
      {
        title: '사용 방법',
        items: [
          <><b>[정보 수정]</b>: 이름, 전화번호, 비고를 고칩니다.</>,
          <><b>[새 계약 추가]</b>: 이 채무자로 새 계약을 바로 등록합니다.</>,
          <>아래 계약을 누르면 그 계약의 상세 화면으로 갑니다.</>
        ]
      }
    ]
  },
  sent: {
    title: '이자 고지 발송 내역',
    intro: '지금까지 보낸 이자 고지 문자를 최근 순서로 모두 보여 줍니다.',
    sections: [
      {
        title: '사용 방법',
        items: [
          <><b>[발송 완료]</b> 칸을 다시 누르면 발송 체크가 해제됩니다.</>,
          <><b>[수납 확인]</b> 칸을 누르면 이자를 받은 것으로 체크합니다.</>,
          <><b>[미수납만]</b>을 누르면 문자는 보냈지만 아직 이자를 받지 못한 건만 봅니다.</>
        ]
      }
    ]
  },
  settings: {
    title: '설정',
    intro: '이자 고지 문자 내용과 화면 크기, 자료 관리를 정하는 화면입니다.',
    sections: [
      {
        title: '업체 정보 및 고지 문구',
        items: [
          <><b>상호</b>와 <b>입금 계좌</b>를 넣고 [저장]을 누르면 고지 문자에 자동으로 들어갑니다.</>,
          <>문구 안의 {'{이름} {이자} {월} {납부일}'} 같은 중괄호 칸은 계약마다 자동으로 채워집니다. 아래 ‘미리 보기’로 확인하세요.</>
        ]
      },
      {
        title: '화면 크기',
        items: [<>글씨와 버튼이 작거나 크면 <b>작게·보통·크게·아주 크게</b> 중에서 고릅니다. 누르면 바로 바뀝니다.</>]
      },
      {
        title: '데이터 관리',
        items: [
          <>모든 자료는 이 컴퓨터의 문서 폴더(전당포관리)에 저장되고, 하루 한 번 자동으로 백업됩니다.</>,
          <><b>[전체 데이터 엑셀 내보내기]</b>로 모든 자료를 엑셀 파일로 받을 수 있습니다.</>
        ]
      }
    ]
  }
};

export function HelpLayer({ route, onClose }: { route: Route['name']; onClose: () => void }) {
  const page = PAGES[route];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="help-overlay" onClick={onClose}>
      <section className="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <div className="col" style={{ gap: 2 }}>
            <span className="help-kicker">도움말</span>
            <h2 id="help-title" className="help-title">{page.title}</h2>
          </div>
          <button type="button" className="help-close" onClick={onClose} aria-label="도움말 닫기" autoFocus>
            <CloseIcon size={30} />닫기
          </button>
        </div>
        <div className="help-body">
          <p className="help-intro">{page.intro}</p>
          {page.sections.map((s) => (
            <div key={s.title} className="help-section">
              <h3>{s.title}</h3>
              {s.steps ? (
                <ol className="help-steps">{s.items.map((it, i) => <li key={i}><span className="help-no">{i + 1}</span><span>{it}</span></li>)}</ol>
              ) : (
                <ul className="help-list">{s.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
