/* 결과 표를 이미지로 만들어 공유·복사·저장합니다.
   시뮬레이터 네 곳에서 함께 씁니다. 표 구조를 그대로 읽으므로
   페이지마다 따로 손볼 것이 없습니다. */
window.HantaxImage = (function () {
  const SANS = "'Pretendard Variable',Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  const C = { ink: '#1F2328', mute: '#5C6572', line: '#E4E8EF', soft: '#F5F7FB', navy: '#0B1E3F', blue: '#1B4A9B' };

  /* 셀에서 본문과 작은 글씨를 갈라 냅니다 */
  function readCell(td) {
    const clone = td.cloneNode(true);
    const subs = [...clone.querySelectorAll('small')].map(e => e.textContent.trim());
    clone.querySelectorAll('small').forEach(e => e.remove());
    clone.querySelectorAll('br').forEach(e => e.replaceWith(' '));
    return {
      main: clone.textContent.replace(/\s+/g, ' ').trim(),
      sub: subs.join(' '),
      color: getComputedStyle(td).color,
      bold: Number(getComputedStyle(td).fontWeight) >= 700
    };
  }

  /* 폭에 맞게 글자 크기를 줄입니다 */
  function fit(g, text, max, size, weight) {
    let s = size;
    while (s > 10) {
      g.font = (weight || 400) + ' ' + s + "px " + SANS;
      if (g.measureText(text).width <= max) break;
      s -= 0.5;
    }
    return s;
  }

  async function fromTable(table, opt) {
    opt = opt || {};
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

    const head = [...table.querySelectorAll('thead th')].map(readCell);
    const body = [...table.querySelectorAll('tbody tr')]
      .filter(tr => !tr.classList.contains('gap') && tr.children.length > 1)
      .map(tr => ({
        cells: [...tr.children].map(readCell),
        strong: tr.classList.contains('tot'),
        faint: tr.classList.contains('sub-row')
      }));
    if (!body.length) throw new Error('표가 비어 있습니다');

    const W = 860, PAD = 34, COLS = head.length || body[0].cells.length;
    const firstW = Math.round((W - PAD * 2) * 0.33);
    const restW = Math.round((W - PAD * 2 - firstW) / (COLS - 1));
    const hRow = r => (r.cells.some(c => c.sub) ? 64 : 50);
    const hHead = head.some(c => c.sub) ? 70 : 54;

    let y = 0;
    const topH = 118;                                  // 제목과 조건
    const tableH = hHead + body.reduce((a, r) => a + hRow(r), 0);
    const footH = 96;
    const H = topH + tableH + footH;

    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    const g = cv.getContext('2d');
    g.scale(2, 2);
    g.textBaseline = 'middle';

    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = C.navy; g.fillRect(0, 0, W, 5);

    /* 제목과 조건 */
    y = 46;
    const title = (opt.title || '세금 비교 결과').trim();
    g.fillStyle = C.ink;
    g.font = '700 ' + fit(g, title, W - PAD * 2, 23, 700) + 'px ' + SANS;
    g.fillText(title, PAD, y);
    y += 30;
    if (opt.sub) {
      g.fillStyle = C.mute;
      g.font = '400 ' + fit(g, opt.sub, W - PAD * 2, 13.5, 400) + 'px ' + SANS;
      g.fillText(opt.sub.trim(), PAD, y);
    }

    /* 표 머리 */
    y = topH;
    g.fillStyle = C.soft; g.fillRect(PAD, y, W - PAD * 2, hHead);
    head.forEach((c, i) => {
      const x = i === 0 ? PAD + 14 : PAD + firstW + restW * i - 14;
      const w = i === 0 ? firstW - 20 : restW - 20;
      g.textAlign = i === 0 ? 'left' : 'right';
      g.fillStyle = C.ink;
      g.font = '700 ' + fit(g, c.main, w, 14, 700) + 'px ' + SANS;
      g.fillText(c.main, x, y + (c.sub ? hHead / 2 - 10 : hHead / 2));
      if (c.sub) {
        g.fillStyle = C.mute;
        g.font = '400 ' + fit(g, c.sub, w, 11.5, 400) + 'px ' + SANS;
        g.fillText(c.sub, x, y + hHead / 2 + 11);
      }
    });
    g.strokeStyle = C.line; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(PAD, y + hHead); g.lineTo(W - PAD, y + hHead); g.stroke();
    y += hHead;

    /* 표 본문 */
    body.forEach(r => {
      const h = hRow(r);
      r.cells.forEach((c, i) => {
        const x = i === 0 ? PAD + 14 : PAD + firstW + restW * i - 14;
        const w = i === 0 ? firstW - 20 : restW - 20;
        g.textAlign = i === 0 ? 'left' : 'right';
        const weight = (r.strong || c.bold) ? 700 : 400;
        g.fillStyle = r.faint ? C.mute : c.color;
        g.font = weight + ' ' + fit(g, c.main, w, r.strong ? 15 : 14, weight) + 'px ' + SANS;
        g.fillText(c.main, x, y + (c.sub ? h / 2 - 10 : h / 2));
        if (c.sub) {
          g.fillStyle = C.mute;
          g.font = '400 ' + fit(g, c.sub, w, 11.5, 400) + 'px ' + SANS;
          g.fillText(c.sub, x, y + h / 2 + 11);
        }
      });
      g.strokeStyle = C.line; g.lineWidth = r.strong ? 1.5 : 1;
      g.beginPath(); g.moveTo(PAD, y + h); g.lineTo(W - PAD, y + h); g.stroke();
      y += h;
    });

    /* 꼬리말 */
    y += 26;
    g.textAlign = 'left';
    g.fillStyle = C.blue;
    g.font = '700 14px ' + SANS;
    g.fillText('한택스 · hantax47.com', PAD, y);
    g.textAlign = 'right';
    g.fillStyle = C.mute;
    g.font = '400 12.5px ' + SANS;
    const d = new Date();
    g.fillText(d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + ' 기준', W - PAD, y);
    if (opt.note) {
      y += 22;
      g.textAlign = 'left';
      g.font = '400 ' + fit(g, opt.note, W - PAD * 2, 12, 400) + 'px ' + SANS;
      g.fillText(opt.note, PAD, y);
    }

    return new Promise(res => cv.toBlob(res, 'image/png'));
  }

  /* 글자를 폭에 맞춰 여러 줄로 나눕니다 (띄어쓰기 기준, 너무 긴 낱말은 글자 단위) */
  function wrap(g, text, max) {
    const out = [];
    let line = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const t = line ? line + ' ' + word : word;
      if (g.measureText(t).width <= max) { line = t; continue; }
      if (line) out.push(line);
      line = '';
      for (const ch of word) {
        if (g.measureText(line + ch).width > max && line) { out.push(line); line = ''; }
        line += ch;
      }
    }
    if (line) out.push(line);
    return out;
  }
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

  /* 체크리스트·진단 결과(판정 상자와 목록 상자)를 화면 구조 그대로 읽어 이미지로 만듭니다 */
  async function fromResult(root, opt) {
    opt = opt || {};
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
    const W = 860, PAD = 34, IN = W - PAD * 2;
    const cv = document.createElement('canvas');
    const g = cv.getContext('2d');
    const font = (w, s) => { g.font = w + ' ' + s + 'px ' + SANS; };
    const ops = [];                                     // 먼저 자리를 잡고, 높이를 안 뒤에 그립니다
    let y = 46;

    font(700, 23); ops.push({ t: 'text', s: (opt.title || '점검 결과').trim(), x: PAD, y, f: [700, 23], c: C.ink });
    y += 30;
    if (opt.sub) { ops.push({ t: 'text', s: opt.sub.trim(), x: PAD, y, f: [400, 13.5], c: C.mute, fit: IN }); }
    y += 28;

    /* 판정 상자 */
    const v = root.querySelector('.verdict');
    if (v) {
      const bg = getComputedStyle(v).backgroundColor, top = y, pad = 22, w = IN - pad * 2;
      const parts = [];
      const lbl = txt(v.querySelector('.lbl')), val = v.querySelector('.val'), sub = txt(v.querySelector('.sub'));
      const chips = [...v.querySelectorAll('.chips span')].map(txt).join(' · ');
      let h = pad;
      if (lbl) { font(400, 13.5); parts.push({ y: h + 9, s: lbl, f: [400, 13.5], o: .85 }); h += 26; }
      if (val) {
        const c = val.cloneNode(true); c.querySelectorAll('br').forEach(b => b.replaceWith(' '));
        font(800, 22);
        for (const l of wrap(g, txt(c), w)) { parts.push({ y: h + 14, s: l, f: [800, 22], o: 1 }); h += 32; }
        h += 4;
      }
      if (sub) { font(400, 13.5); for (const l of wrap(g, sub, w)) { parts.push({ y: h + 10, s: l, f: [400, 13.5], o: .88 }); h += 22; } }
      if (chips) { h += 6; parts.push({ y: h + 10, s: chips, f: [700, 13], o: 1 }); h += 22; }
      h += pad - 4;
      ops.push({ t: 'box', x: PAD, y: top, w: IN, h, fill: bg, r: 12 });
      parts.forEach(p => ops.push({ t: 'text', s: p.s, x: W / 2, y: top + p.y, f: p.f, c: '#fff', a: 'center', o: p.o }));
      y = top + h + 18;
    }

    /* 목록 상자 */
    for (const box of root.querySelectorAll('.box')) {
      if (getComputedStyle(box).display === 'none') continue;
      const top = y, pad = 20, w = IN - pad * 2;
      let h = pad;
      const inner = [];
      const h3 = txt(box.querySelector('h3'));
      if (h3) { inner.push({ t: 'text', s: h3, x: pad, y: h + 9, f: [700, 16], c: C.ink }); h += 30; }
      const items = [...box.querySelectorAll('li')];
      if (!items.length) {
        font(400, 13.5);
        for (const p of box.querySelectorAll('p')) for (const l of wrap(g, txt(p), w)) { inner.push({ t: 'text', s: l, x: pad, y: h + 10, f: [400, 13.5], c: C.char }); h += 22; }
      }
      items.forEach((li, i) => {
        const badge = li.querySelector('.tag,.lv');
        const b = li.querySelector('b');
        const rest = li.cloneNode(true);
        rest.querySelectorAll('b,.tag,.lv').forEach(e => e.remove());
        const em = b && b.querySelector('em');
        const bt = b ? b.cloneNode(true) : null;
        if (bt) bt.querySelectorAll('em').forEach(e => e.remove());
        const title = (em ? txt(em) + ' · ' : '') + txt(bt);
        const desc = txt(rest);
        let bw = 0;
        if (badge) {
          font(700, 12);
          bw = g.measureText(txt(badge)).width + 20;
          const cs = getComputedStyle(badge);
          inner.push({ t: 'box', x: pad + w - bw, y: h + 1, w: bw, h: 22, fill: cs.backgroundColor, r: 11 });
          inner.push({ t: 'text', s: txt(badge), x: pad + w - bw / 2, y: h + 12, f: [700, 12], c: cs.color, a: 'center' });
        }
        const tw = w - (bw ? bw + 14 : 0);
        const start = h;
        if (!b && !badge) {                                      // 그냥 문장인 목록
          font(400, 14);
          wrap(g, desc, tw - 14).forEach((l, k) => {
            if (!k) inner.push({ t: 'text', s: '·', x: pad, y: h + 11, f: [700, 14], c: C.mute });
            inner.push({ t: 'text', s: l, x: pad + 14, y: h + 11, f: [400, 14], c: C.char }); h += 23;
          });
        } else {
          if (title) { font(700, 14.5); for (const l of wrap(g, title, tw)) { inner.push({ t: 'text', s: l, x: pad, y: h + 11, f: [700, 14.5], c: C.ink }); h += 23; } }
          if (desc) { font(400, 13); for (const l of wrap(g, desc, tw)) { inner.push({ t: 'text', s: l, x: pad, y: h + 10, f: [400, 13], c: C.mute }); h += 21; } }
          h = Math.max(h, start + 24);
        }
        h += 10;
        if (i < items.length - 1 && (b || badge)) { inner.push({ t: 'line', x: pad, y: h, w }); h += 10; }
      });
      h += pad - 10;
      ops.push({ t: 'box', x: PAD, y: top, w: IN, h, stroke: C.line, r: 12 });
      inner.forEach(o => ops.push(Object.assign({}, o, { x: PAD + o.x, y: top + o.y })));
      y = top + h + 14;
    }

    const H = y + 60;
    cv.width = W * 2; cv.height = H * 2;
    g.scale(2, 2);
    g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = C.navy; g.fillRect(0, 0, W, 5);
    const round = (o) => { g.beginPath(); if (g.roundRect) g.roundRect(o.x, o.y, o.w, o.h, o.r); else g.rect(o.x, o.y, o.w, o.h); };
    for (const o of ops) {
      if (o.t === 'box') {
        round(o);
        if (o.fill) { g.fillStyle = o.fill; g.fill(); }
        if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = 1; g.stroke(); }
      } else if (o.t === 'line') {
        g.strokeStyle = C.soft; g.lineWidth = 1;
        g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + o.w, o.y); g.stroke();
      } else {
        g.globalAlpha = o.o == null ? 1 : o.o;
        g.textAlign = o.a || 'left';
        g.fillStyle = o.c;
        g.font = o.f[0] + ' ' + (o.fit ? fit(g, o.s, o.fit, o.f[1], o.f[0]) : o.f[1]) + 'px ' + SANS;
        g.fillText(o.s, o.x, o.y);
        g.globalAlpha = 1;
      }
    }
    /* 꼬리말 */
    y += 22;
    g.textAlign = 'left'; g.fillStyle = C.blue; g.font = '700 14px ' + SANS;
    g.fillText('한택스 · hantax47.com', PAD, y);
    g.textAlign = 'right'; g.fillStyle = C.mute; g.font = '400 12.5px ' + SANS;
    const d = new Date();
    g.fillText(d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + ' 기준', W - PAD, y);
    return new Promise(res => cv.toBlob(res, 'image/png'));
  }

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

  /* 내려받기가 막힌 인앱 브라우저에서도 저장할 수 있게 이미지를 크게 띄웁니다 */
  function showImage(blob) {
    const url = URL.createObjectURL(blob);
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(11,30,63,.94);'
      + 'overflow:auto;padding:18px;text-align:center;-webkit-overflow-scrolling:touch';
    const guide = document.createElement('p');
    guide.style.cssText = 'color:#fff;font-size:14px;line-height:1.7;margin:6px 0 14px';
    guide.innerHTML = '이미지를 <b>길게 눌러</b> 저장하시거나, 복사해서 대화창에 붙여넣어 주세요.';
    const img = document.createElement('img');
    img.src = url;
    img.alt = '계산 결과';
    img.style.cssText = 'width:100%;max-width:560px;border-radius:8px;display:block;margin:0 auto';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '닫기';
    close.style.cssText = 'margin:18px auto 6px;display:block;border:0;border-radius:8px;padding:12px 30px;'
      + 'background:#fff;color:#0B1E3F;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer';
    const bye = () => { ov.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    close.addEventListener('click', bye);
    ov.addEventListener('click', e => { if (e.target === ov) bye(); });
    ov.appendChild(guide); ov.appendChild(img); ov.appendChild(close);
    document.body.appendChild(ov);
  }

  /* 기기가 할 수 있는 가장 편한 방법으로 건네줍니다.
     blobPromise를 그대로 클립보드에 넘겨야 사용자 조작 흐름이 끊기지 않습니다. */
  async function deliver(blobPromise, filename) {
    if (!isMobile) {
      // PC는 공유 창을 띄워도 카카오톡에 파일이 딸려가지 않아 복사를 먼저 씁니다
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
          return 'copy';
        } catch (e) {}
      }
      const blob = await blobPromise;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return 'download';
    }

    const blob = await blobPromise;
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return 'share'; }
      catch (e) { if (e && e.name === 'AbortError') return null; }
    }
    // 인앱 브라우저는 내려받아도 사진첩에 남지 않아 화면에 띄워 줍니다
    showImage(blob);
    return 'longpress';
  }

  function toast(msg) {
    let el = document.getElementById('htx-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'htx-toast';
      el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;'
        + 'background:#0B1E3F;color:#fff;padding:13px 22px;border-radius:10px;font-size:14px;'
        + 'box-shadow:0 6px 24px rgba(11,30,63,.28);opacity:0;transition:opacity .2s;max-width:90vw;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }

  /* 버튼 하나를 표에 붙여 줍니다.
     hooks.before / hooks.after 로 이미지를 만드는 동안만 표를 손볼 수 있습니다. */
  function attach(btn, getTable, getOpt, hooks) {
    hooks = hooks || {};
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = '이미지를 만드는 중';
      if (hooks.before) { try { hooks.before(); } catch (e) {} }
      try {
        const el = getTable();   // 표면 표로, 체크리스트 결과 영역이면 목록으로 그립니다
        const blobPromise = el.tagName === 'TABLE' ? fromTable(el, getOpt()) : fromResult(el, getOpt());
        const how = await deliver(blobPromise, (getOpt().filename || '한택스_계산결과') + '.png');
        if (how === 'copy') toast('이미지를 복사했습니다. 카카오톡 대화창에 붙여넣기 하세요');
        else if (how === 'download') toast('이미지를 저장했습니다');
      } catch (e) {
        toast('이미지를 만들지 못했습니다. 화면을 캡처해 주세요');
      } finally {
        if (hooks.after) { try { hooks.after(); } catch (e) {} }
        btn.disabled = false; btn.textContent = label;
      }
    });
  }

  return { fromTable, fromResult, deliver, toast, attach };
})();
