/* 카카오톡·SNS 공유 미리보기 이미지(1200×630) 만들기 — 대표님 PC의 Edge로 찍습니다
   사용: node assets/og/make.js <column|tool> <파일명> "<제목 첫 줄<br>둘째 줄>" "<한 줄 설명>"
   예:   node assets/og/make.js column holiday-gift-card "명절 상품권, 법인카드로<br>사면 비용 처리되나요?" "직원·거래처별 처리와 기록이 없을 때 더 내는 세금"
   결과: assets/og/<column|tool>-<파일명>.png → 페이지의 og:image(칼럼은 Article JSON-LD image도)에 연결 */
const fs=require('fs'), os=require('os'), path=require('path'), {execFileSync}=require('child_process');
const EDGE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const [kind,slug,title,sub]=process.argv.slice(2);
if(!['column','tool'].includes(kind)||!slug||!title||!sub){ console.log('사용: node assets/og/make.js <column|tool> <파일명> "<제목<br>둘째 줄>" "<한 줄 설명>"'); process.exit(1); }
const logo='file:///'+path.resolve(__dirname,'../logo.png').split(path.sep).join('/');
const html=`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#fff;font-family:'Pretendard Variable',Pretendard,sans-serif;position:relative}
.bar{position:absolute;left:0;top:0;width:14px;height:630px;background:#1B4A9B}
.wrap{position:absolute;left:96px;top:74px;right:90px}
.logo{height:62px;display:block}
.eye{margin-top:58px;font-size:26px;font-weight:800;letter-spacing:.16em;color:#1B4A9B}
h1{margin-top:18px;font-family:'Noto Serif KR',serif;font-weight:900;font-size:62px;line-height:1.32;letter-spacing:-.03em;color:#1F2328}
.sub{margin-top:26px;font-size:28px;color:#5C6572;letter-spacing:-.01em}
.by{position:absolute;left:96px;bottom:62px;font-size:24px;font-weight:700;color:#5C6572}
.url{position:absolute;right:90px;bottom:62px;font-size:24px;font-weight:700;color:#8b98a8}
</style></head><body>
<div class="bar"></div>
<div class="wrap">
  <img class="logo" src="${logo}" alt="">
  <div class="eye">${kind==='column'?'세무 칼럼':'세금 계산기'}</div>
  <h1>${title}</h1>
  <p class="sub">${sub}</p>
</div>
${kind==='column'?'<div class="by">한진식 세무사</div>':''}
<div class="url">hantax47.com</div>
</body></html>`;
const tmp=path.join(os.tmpdir(),'og-'+slug+'.html');
fs.writeFileSync(tmp,html,'utf8');
const out=path.join(__dirname,kind+'-'+slug+'.png');
// 쓰고 있는 Edge와 프로필이 겹치면 멈출 수 있어 전용 임시 프로필을 쓰고, 60초 넘으면 중단합니다
execFileSync(EDGE,['--headless=new','--disable-gpu','--hide-scrollbars','--virtual-time-budget=8000','--window-size=1200,630',
  '--user-data-dir='+path.join(os.tmpdir(),'og-edge-profile'),
  '--screenshot='+out,'file:///'+tmp.split(path.sep).join('/')],{stdio:'ignore',timeout:60000});
fs.unlinkSync(tmp);
console.log('만듦: assets/og/'+kind+'-'+slug+'.png');
