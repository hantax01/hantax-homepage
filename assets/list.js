/* 목록 주제 버튼 + 페이지 나누기 (세무 칼럼 목록·FAQ 공용)
   - 목록: data-per="한 페이지 개수"가 붙은 요소, 그 바로 아래 자식들이 항목 (최신 글을 맨 위에 넣을 것)
   - 주제: 항목의 data-cat 또는 .cat 글자에 주제 버튼(.col-cats span) 이름이 들어 있으면 해당. 다시 누르면 전체
   - 쪽 번호: .pager 안에 자동 생성, 한 페이지로 충분하면 안 보임 */
(function(){
  var list=document.querySelector('[data-per]'); if(!list) return;
  var per=+list.dataset.per, items=[].slice.call(list.children);
  var chips=[].slice.call(document.querySelectorAll('.col-cats span'));
  var empty=document.querySelector('.cat-empty'), pager=document.querySelector('.pager');
  var sel=null, page=1;
  function catOf(el){ return el.dataset.cat||(el.querySelector('.cat')||{}).textContent||''; }
  function show(scroll){
    var hit=items.filter(function(el){ return !sel||catOf(el).indexOf(sel)>=0; });
    var pages=Math.max(1,Math.ceil(hit.length/per)); page=Math.min(page,pages);
    items.forEach(function(el){ el.style.display='none'; });
    hit.slice((page-1)*per,page*per).forEach(function(el){ el.style.display=''; });
    if(empty) empty.style.display=hit.length?'none':'block';
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
  show();
})();
