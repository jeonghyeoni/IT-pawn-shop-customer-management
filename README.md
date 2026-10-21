# 전당포 관리

백화점 상품권 / IT 전당포용 **회원·계약 관리 프로그램** (Windows PC).
종이 장부 대신 계약을 적고, 찾고, **오늘 누구에게 이자 문자를 보내야 하는지** 프로그램을 켜자마자 크게 보여 줍니다.

- 화면 시안: https://claude.ai/artifact/PCQXdt3mUsXiF8NBoah8JY

## 사장님용 사용법

| 화면 | 하는 일 |
| --- | --- |
| **오늘 할 일** (켜면 바로 나옴) | 오늘 이자 문자 보낼 사람, 지난 날짜에 못 보낸 문자, 최근 보낸 문자, 이자 안 들어온 계약, 만기가 다가오는 계약 |
| **새 계약** | ① 회원 고르기(처음 온 분은 그 자리에서 등록) ② 날짜·금액·이자율(한 달 / 일 년) ③ 맡긴 물건 ④ 사진 |
| **계약 목록** | 이름·전화번호·물건 이름으로 찾기, 기간·상태로 거르기, **엑셀로 내보내기** |
| **회원 목록** | 회원 찾기 → 그 회원의 모든 계약 |
| ⚙ **설정** | 가게 이름·입금 계좌·문자 문구, 전체 자료 엑셀, 백업, 자료 폴더 열기 |

**이자 문자 보내는 순서**
1. [문자 문구 복사]를 누르고 휴대폰(또는 PC 문자 프로그램)에 붙여넣어 보냅니다.
2. 보낸 뒤 **[보냄]** 을 누릅니다. → ‘최근 보낸 이자 문자’로 옮겨집니다. (잘못 눌렀으면 [보냄 완료]를 한 번 더)
3. 돈이 들어오면 **[이자 받음]** 을 누릅니다. 받은 날짜는 계약 상세에서 고칠 수 있습니다.

**알아 두실 것**
- 이자 문자는 **계약일 한 달 뒤부터 매달 같은 날**입니다. 그 날이 없는 달(예: 31일)은 그 달 말일입니다.
- 동명이인은 **전화번호**로 구분합니다. 같은 이름이 있으면 ‘동명 이인 있음’ 표시가 붙습니다.
- 돈을 다 받으면 계약 상세에서 **[상환 완료]**, 물건을 처분하면 **[유질 처리]**. 그러면 문자 목록에서 빠집니다.
- 예전 종이 장부의 계약을 옮겨 적을 때는 ‘이미 지난 회차는 처리 완료로 기록’에 체크(기본)해 두면 지난 회차가 한꺼번에 뜨지 않습니다.
- 모든 자료는 **`문서\전당포관리`** 폴더에 있습니다 (`data.db`, 사진, `backup` 폴더). 프로그램을 켤 때마다 하루 한 번 자동 백업되고 최근 30개를 남깁니다. 가끔 이 폴더를 USB 등에 복사해 두세요.
- 화면 위에 노란 띠로 **“새 버전이 나왔습니다 [지금 업데이트]”** 가 보이면 버튼만 누르면 됩니다. 자료는 그대로 남습니다.

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

이 저장소는 **비공개**라서 클라이언트 PC가 여기서 설치 파일을 받을 수 없습니다.
그래서 설치 파일만 **공개 저장소 `jeonghyeoni/IT-pawn-shop-releases`** 에 올리고, 프로그램은 그 저장소의 최신 Release를 확인합니다. (소스 코드는 올라가지 않습니다.)

**처음 한 번만 준비**
1. GitHub에서 **공개(Public)** 저장소 `IT-pawn-shop-releases` 를 만듭니다 (README 하나 있어도 됨).
2. GitHub → Settings → Developer settings → **Fine-grained personal access token** 을 만들고,
   Repository access 는 `IT-pawn-shop-releases` 만, Permissions 는 **Contents: Read and write** 로 줍니다.
3. 이 저장소 → Settings → Secrets and variables → Actions → **New repository secret**
   이름 `RELEASE_TOKEN`, 값은 위 토큰.

> 이 저장소를 공개로 바꿔도 된다면 `electron-builder.yml` 의 `repo` 를 `IT-pawn-shop-customer-management` 로 바꾸고, 토큰 대신 기본 `GITHUB_TOKEN` 을 써도 됩니다.

**새 버전 올리기**
```bash
npm version patch          # 1.0.0 → 1.0.1 (package.json 수정 + 커밋 + 태그 v1.0.1)
git push && git push --tags
```
태그가 올라가면 GitHub Actions(`Release`)가 Windows 설치 파일을 만들어 공개 저장소의 Release로 올립니다.
클라이언트 프로그램은 켤 때와 4시간마다 확인해서 **[지금 업데이트]** 띠를 띄우고, 누르면 내려받은 뒤 저절로 다시 켜집니다.

**클라이언트 PC 첫 설치**: 공개 저장소의 Release 에서 `PawnShopManager-Setup-x.y.z.exe` 를 받아 실행합니다.
코드 서명 인증서가 없어서 처음 설치 때 Windows가 “PC 보호” 경고를 띄울 수 있습니다 → **추가 정보 → 실행**. 이후 업데이트는 그대로 됩니다.

푸시할 때마다 `CI` 워크플로가 테스트·점검을 돌리고, Windows 설치 파일을 Actions 아티팩트(`windows-installer`)로 남깁니다.
