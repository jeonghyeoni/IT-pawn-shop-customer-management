# 전당포 관리

백화점 상품권 / IT 전당포용 **채무자·계약 관리 프로그램** (Windows PC).
대부 계약을 등록·조회하고, **당일 이자 고지 대상**을 프로그램 실행 즉시 보여 줍니다.

- 화면 시안: https://claude.ai/artifact/PCQXdt3mUsXiF8NBoah8JY
- 설치 파일: https://github.com/jeonghyeoni/IT-pawn-shop-customer-management/releases/latest

## 사용법

| 화면 | 기능 |
| --- | --- |
| **오늘 할 일** (시작 화면) | 오늘 이자 고지 대상, 미발송 고지, 최근 발송 내역, 이자 연체, 만기 임박 |
| **새 계약** | ① 채무자 선택(신규 채무자는 바로 등록) ② 계약일·대부금액·이자율(월 이율 / 연 이율) ③ 담보물 ④ 첨부 사진 |
| **계약 목록** | 채무자 이름·전화번호·담보물로 검색, 계약일 기간·계약 상태로 필터, **엑셀 내보내기** |
| **채무자 목록** | 채무자 검색 → 채무자별 전체 계약 |
| ⚙ **설정** | 상호·입금 계좌·이자 고지 문구, 화면 크기(작게·보통·크게·아주 크게), 전체 데이터 엑셀 내보내기, 백업, 데이터 폴더 열기 |

**이자 고지 절차**
1. [문구 복사]를 눌러 고지 문구를 복사하고, 휴대폰(또는 PC 문자 프로그램)에 붙여넣어 발송합니다.
2. 발송 후 **[문자 발송 확인]** 칸을 눌러 체크합니다. → 카드가 아래 ‘발송 완료’ 묶음으로 내려가 회색 체크로 표시되고, ‘최근 발송 내역’에도 추가됩니다. (체크된 칸을 다시 누르면 해제)
3. 이자가 입금되면 **[이자 수납 확인]** 칸을 체크합니다. 수납일은 계약 상세의 ‘회차별 이자 내역’에서 [수납일 수정]으로 바꿀 수 있습니다.
4. 오늘 대상자에게 모두 발송하면 맨 위에 **‘완료’** 가 표시됩니다.

**참고 사항**
- 이자 납부일은 **계약일로부터 1개월 후부터 매월 같은 날**입니다. 해당 일이 없는 달(예: 31일)은 그달 말일입니다.
- 동명이인은 **전화번호**로 구분하며, ‘동명이인’ 표시가 붙습니다.
- 상환이 끝나면 계약 상세에서 **[상환 완료]**, 담보물을 처분하면 **[유질 처리]** 합니다. 종료된 계약은 이자 고지 대상에서 제외됩니다.
- 기존 장부의 계약을 이관할 때는 ‘기존 계약 이관’ 항목을 체크(기본값)하면 지난 회차가 미발송·연체로 표시되지 않습니다.
- 모든 데이터는 **`문서\전당포관리`** 폴더에 저장됩니다 (`data.db`, 사진, `backup` 폴더). 실행 시 하루 1회 자동 백업되며 최근 30개를 보관합니다. 주기적으로 이 폴더를 USB 등에 별도 보관하십시오.
- 화면 상단에 **“새 버전이 있습니다 [지금 업데이트]”** 가 표시되면 버튼을 누르면 됩니다. 데이터는 그대로 유지됩니다.

## 개발

Electron + React + TypeScript. 자료는 SQLite(sql.js, WASM이라 설치 PC에 따로 깔 것 없음) 파일 하나에 저장합니다.

```bash
npm install
npm run dev          # 개발 모드로 실행
npm test             # 날짜·이자 계산 단위 테스트
npm run typecheck
npm run build && npm run smoke   # 실제 프로그램을 띄워 주요 흐름 점검 (Linux 서버: xvfb-run -a npm run smoke)
npm run dist         # Windows 설치 파일 (release/ 폴더, Windows에서 실행)
```

```
src/shared/   날짜·이자 계산(schedule.ts), 표시 형식(format.ts), 타입, 화면↔본체 API 정의
src/main/     Electron 본체: 저장소(store.ts, 표 구조 변경은 MIGRATIONS 에 덧붙이기), repo.ts, 사진, 엑셀, 백업, 업데이트
src/preload/  화면에 안전한 통로만 열어 줌
src/renderer/ 화면 (pages/*)
tests/        단위 테스트, e2e/smoke.mjs
```

점검용 환경 변수: `PAWN_DATA_DIR`(자료 폴더), `PAWN_TODAY`(오늘 날짜 고정, 예: `2026-10-21`), `PAWN_FAKE_UPDATE`(업데이트 띠 미리 보기, 예: `1.1.0`).

## 업데이트 배포 (자동 업데이트)

설치 파일은 이 저장소(공개)의 **Releases** 에 올라가고, 프로그램은 최신 Release를 확인해서 업데이트합니다.
따로 준비할 것은 없습니다 (GitHub Actions 기본 권한으로 올립니다).

**새 버전 올리기**
```bash
npm version patch          # 1.0.0 → 1.0.1 (package.json 수정 + 커밋 + 태그 v1.0.1)
git push && git push --tags
```
태그가 올라가면 GitHub Actions(`Release`)가 Windows 설치 파일을 만들어 이 저장소의 Release로 올립니다.
태그 대신 GitHub → **Actions → Release → Run workflow** 를 눌러도 됩니다 (main 의 package.json 버전으로 Release와 태그가 만들어집니다. 버전은 먼저 올려 두세요).
클라이언트 프로그램은 켤 때와 4시간마다 확인해서 **[지금 업데이트]** 띠를 띄우고, 누르면 내려받은 뒤 저절로 다시 켜집니다.

**클라이언트 PC 첫 설치**: https://github.com/jeonghyeoni/IT-pawn-shop-customer-management/releases/latest 에서 `PawnShopManager-Setup-x.y.z.exe` 를 받아 실행합니다.
코드 서명 인증서가 없어서 처음 설치 때 Windows가 “PC 보호” 경고를 띄울 수 있습니다 → **추가 정보 → 실행**. 이후 업데이트는 그대로 됩니다.

푸시할 때마다 `CI` 워크플로가 테스트·점검을 돌리고, Windows 설치 파일을 Actions 아티팩트(`windows-installer`)로 남깁니다.
