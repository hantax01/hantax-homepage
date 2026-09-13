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

  /* 기기가 할 수 있는 가장 편한 방법으로 건네줍니다 */
  async function deliver(blob, filename) {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return 'share'; }
      catch (e) { if (e && e.name === 'AbortError') return null; }
    }
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return 'copy';
      } catch (e) {}
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'download';
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

  /* 버튼 하나를 표에 붙여 줍니다 */
  function attach(btn, getTable, getOpt) {
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = '이미지를 만드는 중';
      try {
        const blob = await fromTable(getTable(), getOpt());
        const how = await deliver(blob, (getOpt().filename || '한택스_계산결과') + '.png');
        if (how === 'share') toast('보낼 곳을 골라 주세요');
        else if (how === 'copy') toast('이미지를 복사했습니다. 카카오톡에 붙여넣기 하세요');
        else if (how === 'download') toast('이미지를 저장했습니다');
      } catch (e) {
        toast('이미지를 만들지 못했습니다. 화면을 캡처해 주세요');
      } finally {
        btn.disabled = false; btn.textContent = label;
      }
    });
  }

  return { fromTable, deliver, toast, attach };
})();
