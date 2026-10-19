/* 이미지·PDF에 넣을 정보(회사명·이름) 공용 칸. 계산 결과의 저장 버튼 아래에 둡니다.
   <div class="docinfo" data-co="i-co" data-who="i-name" data-who-label="임원 이름" data-month="i-month"></div>
   - 칸 id는 페이지가 정합니다(페이지 코드가 그 id로 값을 읽습니다). 이 파일은 페이지 스크립트보다 먼저 불러옵니다
   - 회사명은 다음에 쓰기 편하게 이 브라우저에만 기억합니다. 이름은 기억하지 않습니다 */
(function(){
  var KEY='hx_doc_co';
  var st=document.createElement('style');
  st.textContent='.docinfo{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;background:var(--soft);border-radius:12px;padding:12px 14px;margin:0 0 16px}'
    +'.docinfo .dl{font-size:13.5px;font-weight:700;color:var(--ink)}'
    +'.docinfo .dl small{font-weight:400;color:var(--mute);font-size:12px;margin-left:5px}'
    +'.docinfo input{flex:1 1 150px;min-width:0;max-width:230px;width:auto;padding:9px 12px;border:1px solid var(--line);border-radius:9px;font-size:14px;font-family:inherit;background:#fff;color:var(--ink)}'
    +'.docinfo input:focus{outline:none;border-color:var(--blue)}'
    +'.docinfo .dn{flex-basis:100%;font-size:12px;color:var(--mute);margin:0}'
    +'@media(max-width:660px){.docinfo .dl{flex-basis:100%}.docinfo input{max-width:none}}';
  document.head.appendChild(st);
  function load(){ try{ return localStorage.getItem(KEY)||''; }catch(e){ return ''; } }
  function save(v){ try{ if(v) localStorage.setItem(KEY,v); else localStorage.removeItem(KEY); }catch(e){} }
  var boxes=document.querySelectorAll('.docinfo');
  for(var i=0;i<boxes.length;i++){
    var d=boxes[i].dataset, who=d.whoLabel||'직원 이름';
    boxes[i].innerHTML='<span class="dl">이미지·PDF에 넣을 정보<small>선택</small></span>'
      +'<input type="text" id="'+d.co+'" placeholder="회사명" aria-label="회사명" maxlength="40" autocomplete="organization">'
      +(d.who?'<input type="text" id="'+d.who+'" placeholder="'+who+'" aria-label="'+who+'" maxlength="20" autocomplete="off">':'')
      +(d.month?'<input type="month" id="'+d.month+'" aria-label="지급 연월" title="지급 연월" min="2000-01" max="2099-12">':'')
      +'<p class="dn">회사명은 다음에 쓰기 편하게 이 브라우저에만 기억합니다.</p>';
    var co=document.getElementById(d.co);
    co.value=load();
    co.addEventListener('input',function(e){ save(e.target.value.trim()); });
  }
})();
