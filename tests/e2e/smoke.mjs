// 실제 프로그램을 띄워서 주요 흐름을 눌러 보는 점검 스크립트.
//   npm run build && node tests/e2e/smoke.mjs [스크린샷 폴더]
// (Linux 서버에서는 xvfb-run -a node tests/e2e/smoke.mjs)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';

const shots = path.resolve(process.argv[2] ?? 'test-data/shots');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawn-e2e-'));
fs.mkdirSync(shots, { recursive: true });

const png = path.join(dataDir, 'sample.png');

const app = await electron.launch({
  args: ['.'],
  env: {
    ...process.env,
    PAWN_DATA_DIR: dataDir,
    PAWN_TODAY: '2026-10-21',
    PAWN_FAKE_UPDATE: '1.1.0',
    PAWN_NO_MAXIMIZE: '1'
  }
});
const page = await app.firstWindow();
page.on('pageerror', (e) => console.error('[화면 오류]', e));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.setViewportSize({ width: 1280, height: 900 });
// 사진 대신 첫 화면을 찍어서 쓴다
await page.getByText('오늘 보낼 이자 문자', { exact: true }).waitFor();
fs.writeFileSync(png, await page.screenshot());
const shot = (name) => page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
const call = (method, ...args) => page.evaluate(([m, a]) => window.pawn.invoke(m, a), [method, args]);

// 파일 고르기/저장 창은 자동으로 답하게
const xlsx = path.join(dataDir, 'export.xlsx');
await app.evaluate(({ dialog }, [img, out]) => {
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [img] });
  dialog.showSaveDialog = async () => ({ canceled: false, filePath: out });
}, [png, xlsx]);

try {
  await page.getByText('오늘은 이자 문자 보낼 사람이 없습니다').waitFor();
  await page.getByText('새 버전(1.1.0)이 나왔습니다').waitFor();
  await shot('01-empty');

  // ---- 기본 자료 (API로 바로 넣기) ----
  const mk = async (name, phone) => (await call('createCustomer', { name, phone, memo: '' })).customer.id;
  const kim1 = await mk('김영수', '01023456789');
  const kim2 = await mk('김영수', '010-9876-1234');
  const park = await mk('박정숙', '010-5555-1212');
  const lee = await mk('이민재', '010-3333-4444');
  const dup = await call('createCustomer', { name: '김영수', phone: '010-2345-6789', memo: '' });
  assert.equal(dup.ok, false, '같은 이름+번호는 막아야 함');

  const base = { collateral: '', maturityDate: null, memo: '' };
  const c1 = await call('createContract', { ...base, customerId: kim1, contractDate: '2026-06-21', principal: 1000000, rateType: 'month', rate: 3, collateral: '아이폰 15 Pro 256GB' }, [], true);
  await call('createContract', { ...base, customerId: park, contractDate: '2026-09-21', principal: 500000, rateType: 'month', rate: 5, collateral: '맥북 에어 M2' }, [], true);
  const c3 = await call('createContract', { ...base, customerId: lee, contractDate: '2026-07-19', principal: 800000, rateType: 'month', rate: 2.5, collateral: '신세계 상품권 10만원권 10장', maturityDate: '2026-10-25' }, [], false);
  for (const p of [1, 2]) { await call('markSent', c3, p, true); await call('setPaid', c3, p, '2026-08-20'); }
  const old = await call('getContract', c1);
  assert.equal(old.periods.filter((r) => !r.future && r.sent).length, 3, '지난 3회는 처리 완료로 기록');

  // ---- 새 계약 화면으로 등록 (동명이인 중 두 번째 김영수) ----
  await page.getByRole('button', { name: '새 계약' }).click();
  await page.getByLabel('이름이나 전화번호를 입력하세요').fill('김영수');
  await page.getByText('010-9876-1234').waitFor();
  assert.equal(await page.locator('.candidate').count(), 2, '동명이인 두 명이 보여야 함');
  await page.locator('.candidate', { hasText: '010-9876-1234' }).getByRole('button').click();
  await page.getByLabel('계약한 날').fill('2026-08-21');
  await page.getByLabel('빌려준 돈 (원)').fill('1000000');
  await page.getByLabel('이자율 (%)').fill('20');
  await page.getByText('16,667원').first().waitFor();
  await page.getByLabel('담보 물품').fill('갤럭시 S24 울트라');
  await page.getByRole('button', { name: '사진 추가' }).click();
  await page.locator('.photo img').first().waitFor();
  await shot('02-new-contract');
  await page.getByRole('button', { name: '계약 저장' }).click();
  await page.getByRole('heading', { name: '갤럭시 S24 울트라' }).waitFor();
  await page.locator('.photo img').first().waitFor();
  await shot('03-contract-detail');

  // ---- 오늘 할 일 ----
  await page.getByRole('button', { name: '오늘 할 일' }).click();
  await page.getByText('오늘 이자 문자 보낼 사람').waitFor();
  const cards = page.locator('.due-card:not(.late)');
  assert.equal(await cards.count(), 3, '오늘 보낼 문자 3건');
  assert.equal(await page.locator('.due-card.late').count(), 1, '못 보낸 문자 1건 (이민재 3회차)');
  await shot('04-today');

  await cards.first().getByRole('button', { name: '문자 문구 복사' }).click();
  const clip = await app.evaluate(({ clipboard }) => clipboard.readText());
  assert.match(clip, /이자 .+원 납부일/);

  const firstName = await cards.first().locator('.big-phone').innerText();
  await cards.first().getByRole('button', { name: '보냄', exact: true }).click();
  await page.locator('.list-row', { hasText: firstName }).waitFor();
  assert.equal(await cards.count(), 2, '보낸 건은 오늘 목록에서 빠짐');
  await page.locator('.list-row', { hasText: firstName }).getByRole('button', { name: '이자 받음' }).click();
  await page.locator('.list-row', { hasText: firstName }).getByRole('button', { name: '이자 받음 완료' }).waitFor();
  await shot('05-today-after-send');

  // 보냄 취소 → 다시 오늘 목록으로
  await page.locator('.list-row', { hasText: firstName }).getByRole('button', { name: '보냄 완료' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.due-card:not(.late)').length === 3);
  await cards.first().getByRole('button', { name: '보냄', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.due-card:not(.late)').length === 2);

  // ---- 계약 목록 / 검색 / 엑셀 ----
  await page.getByRole('button', { name: '계약 목록' }).click();
  await page.getByText('찾은 계약 4건').waitFor();
  await page.getByLabel(/무엇으로든 검색/).fill('6789');
  await page.getByText('찾은 계약 1건').waitFor();
  await page.getByLabel(/무엇으로든 검색/).fill('');
  await page.getByText('찾은 계약 4건').waitFor();
  await shot('06-contract-list');
  await page.getByRole('button', { name: '엑셀로 내보내기' }).click();
  await page.getByText('엑셀 파일을 저장했습니다').waitFor();
  assert.ok(fs.statSync(xlsx).size > 1000, '엑셀 파일이 만들어져야 함');

  // ---- 계약 상세: 보냄 토글, 받은 날짜 고치기, 상환 완료 ----
  await page.locator('tr', { hasText: '아이폰' }).click();
  await page.getByRole('heading', { name: '아이폰 15 Pro 256GB' }).waitFor();
  const row1 = page.locator('tbody tr').first();
  await row1.getByRole('button', { name: /받음/ }).click();
  await page.getByLabel('받은 날짜').fill('2026-07-25');
  await page.getByRole('button', { name: '날짜 저장' }).click();
  await row1.getByText('7월 25일 받음').waitFor();
  await row1.getByRole('button', { name: '보냄 완료' }).click();
  await row1.getByRole('button', { name: '보냄', exact: true }).waitFor();
  await row1.getByRole('button', { name: '보냄', exact: true }).click();
  await shot('07-contract-detail-periods');
  await page.getByRole('button', { name: '상환 완료 (계약 종료)' }).click();
  await page.getByRole('button', { name: '예, 상환 완료' }).click();
  await page.getByRole('button', { name: '진행 중으로 되돌리기' }).waitFor();

  // ---- 회원 ----
  await page.getByRole('button', { name: /김영수 · 010-2345-6789/ }).click();
  await page.getByText('같은 이름의 회원이 더 있습니다').waitFor();
  await page.getByText('김영수님과의 계약').waitFor();
  await shot('08-customer');
  await page.getByRole('button', { name: '회원 목록' }).click();
  await page.getByText('회원 4명').waitFor();

  // ---- 보낸 문자 전체 / 설정 ----
  await page.getByRole('button', { name: '오늘 할 일' }).click();
  await page.getByRole('button', { name: /전체 보기/ }).click();
  await page.getByRole('heading', { name: '보낸 이자 문자 전체' }).waitFor();
  await shot('09-sent');
  await page.getByRole('button', { name: '설정' }).click();
  await page.getByLabel('가게 이름').fill('행복전당포');
  await page.getByLabel('입금 계좌').fill('농협 123-4567-8901');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.getByText('행복전당포 관리').waitFor();
  await shot('10-settings');

  // 데이터가 파일로 남는지 + 백업
  assert.ok(fs.existsSync(path.join(dataDir, 'data.db')));
  console.log('OK — 스크린샷:', shots);
} catch (e) {
  await shot('error').catch(() => undefined);
  throw e;
} finally {
  await app.close();
}

// 다시 켰을 때 자료가 그대로인지
const again = await electron.launch({ args: ['.'], env: { ...process.env, PAWN_DATA_DIR: dataDir, PAWN_TODAY: '2026-10-21', PAWN_NO_MAXIMIZE: '1' } });
const p2 = await again.firstWindow();
await p2.getByText('행복전당포 관리').waitFor();
const rows = await p2.evaluate(() => window.pawn.invoke('searchContracts', [{ query: '', from: null, to: null, status: 'all' }]));
assert.equal(rows.length, 4);
await again.close();
assert.ok(fs.readdirSync(path.join(dataDir, 'backup')).length >= 1, '자동 백업');
fs.rmSync(dataDir, { recursive: true, force: true });
console.log('OK — 다시 켜도 자료 유지');
