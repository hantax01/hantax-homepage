/* 목록 주제 버튼 + 검색 + 페이지 나누기 (세무 칼럼 목록·FAQ 공용)
   - 목록: data-per="한 페이지 개수"가 붙은 요소, 그 바로 아래 자식들이 항목 (최신 글을 맨 위에 넣을 것)
   - 주제: 항목의 data-cat 또는 .cat 글자에 주제 버튼(.col-cats span) 이름이 들어 있으면 해당. 다시 누르면 전체
   - 검색: .list-search 입력칸이 있으면 항목 글자(제목·요약)에서 찾음. 낱말 여러 개는 모두 들어간 것만.
     입력칸의 data-index(예: search.json)가 있으면 처음 누를 때 본문 색인을 받아 본문까지 찾음 (assets/search-index.js로 생성)
   - 쪽 번호: .pager 안에 자동 생성, 한 페이지로 충분하면 안 보임 */
(function(){
  var list=document.querySelector('[data-per]'); if(!list) return;
  var per=+list.dataset.per, items=[].slice.call(list.children);
  var chips=[].slice.call(document.querySelectorAll('.col-cats span'));
  var empty=document.querySelector('.cat-empty'), pager=document.querySelector('.pager');
  var box=document.querySelector('.list-search'), emptyText=empty&&empty.textContent;
  var sel=null, page=1, q=[], idx={}, loaded=false;
  function norm(s){ return s.replace(/\s+/g,'').toLowerCase(); }
  function catOf(el){ return el.dataset.cat||(el.querySelector('.cat')||{}).textContent||''; }
  function textOf(el){ if(el._t==null) el._t=norm(el.textContent); return el._t+(idx[el.getAttribute('href')]||''); }
  function has(t){ return q.every(function(w){ return t.indexOf(w)>=0; }); }
  function show(scroll){
    var hit=items.filter(function(el){
      return (!sel||catOf(el).indexOf(sel)>=0)&&(!q.length||has(textOf(el)));
    });
    // 검색 중엔 제목·요약에 낱말이 있는 글을 본문에만 있는 글보다 앞에
    if(q.length) hit=hit.filter(function(el){ return has(el._t); }).concat(hit.filter(function(el){ return !has(el._t); }));
    (q.length?hit:items).forEach(function(el){ list.appendChild(el); });
    var pages=Math.max(1,Math.ceil(hit.length/per)); page=Math.min(page,pages);
    items.forEach(function(el){ el.style.display='none'; });
    hit.slice((page-1)*per,page*per).forEach(function(el){ el.style.display=''; });
    if(empty){
      empty.style.display=hit.length?'none':'block';
      empty.textContent=q.length?'찾는 낱말이 들어간 글이 없어요. 다른 낱말로 찾아보시거나 카카오톡 상담으로 물어봐 주세요.':emptyText;
    }
    if(pager){
      var h='';
      if(pages>1) for(var i=1;i<=pages;i++) h+='<button type="button"'+(i===page?' aria-current="page"':'')+'>'+i+'</button>';
      pager.innerHTML=h;
    }
    if(scroll) list.scrollIntoView({behavior:'smooth',block:'start'});
  }
  chips.forEach(function(c){ c.addEventListener('click',function(){
    var on=!c.classList.contains('on');
    chips.forEach(function(x){ x.classList.remove('on'); });
    if(on) c.classList.add('on');
    sel=on?c.textContent.trim():null; page=1; show();
  }); });
  if(pager) pager.addEventListener('click',function(e){
    if(e.target.tagName==='BUTTON'){ page=+e.target.textContent; show(true); }
  });
  if(box){
    var load=function(){
      if(loaded||!box.dataset.index) return; loaded=true;
      fetch(box.dataset.index).then(function(r){ return r.json(); })
        .then(function(d){ idx=d; if(q.length) show(); }).catch(function(){ loaded=false; });
    };
    box.addEventListener('focus',load);
    box.addEventListener('keydown',function(e){ if(e.key==='Enter') box.blur(); }); // 휴대전화 자판 닫기
    box.addEventListener('input',function(){
      load(); q=box.value.toLowerCase().split(/\s+/).filter(Boolean); page=1; show();
    });
  }
  show();
})();
