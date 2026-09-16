/* 입력칸 옆 물음표를 누르면 설명이 펼쳐집니다.
   라벨에 <button class="help" data-help="..."> 를 두면 알아서 붙습니다. */
(function () {
  /* 설명을 붙일 자리를 찾습니다.
     가로로 늘어놓는 상자(체크박스 줄 등) 안이면 한 칸 밖으로 나갑니다. */
  function holderOf(btn) {
    const lab = btn.closest('label');
    let el = lab ? lab.parentElement : btn.parentElement;
    while (el && el !== document.body) {
      const d = getComputedStyle(el).display;
      if (d !== 'flex' && d !== 'inline-flex' && d !== 'grid' && d !== 'inline-grid') return el;
      el = el.parentElement;
    }
    return btn.parentElement;
  }

  /* 한 자리에 여러 설명이 붙을 수 있어 버튼마다 자기 상자를 갖습니다 */
  const made = new WeakMap();

  function box(btn) {
    let el = made.get(btn);
    if (!el) {
      const lab = btn.closest('label');
      const name = lab && lab.childNodes[0] ? (lab.childNodes[0].textContent || '').trim() : '';
      el = document.createElement('p');
      el.className = 'helpbox';
      const b = document.createElement('b');
      b.textContent = name;
      if (name) el.appendChild(b);
      el.appendChild(document.createTextNode(btn.dataset.help || ''));
      holderOf(btn).appendChild(el);
      made.set(btn, el);
    }
    return el;
  }
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.help');
    if (!btn) return;
    e.preventDefault();
    const el = box(btn);
    const open = el.classList.toggle('on');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();
