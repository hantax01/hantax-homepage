// 칼럼 본문 검색 색인: node assets/search-index.js → column/search.json
// 새 칼럼을 올리거나 본문을 고치면 다시 실행하고 search.json도 함께 커밋
// (안 돌려도 제목·요약 검색은 목록 카드로 되고, 본문 검색만 빠짐)
// 글자 비교는 assets/list.js와 같은 규칙: 띄어쓰기 없애고 소문자
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'column'), out = {};
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.html') || f === 'index.html' || f.startsWith('_')) continue;
  let s = fs.readFileSync(path.join(dir, f), 'utf8');
  s = s.slice(s.indexOf('<h1'));                                       // 제목부터
  s = s.slice(0, s.search(/<div class="(notice|art-cta|more)"|<\/article>/)); // 안내·상담·관련 카드 전까지
  out[f] = s.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/\s+/g, '').toLowerCase();
}
fs.writeFileSync(path.join(dir, 'search.json'), JSON.stringify(out));
console.log(Object.keys(out).length + '편, ' + Math.round(fs.statSync(path.join(dir, 'search.json')).size / 1024) + 'KB');
