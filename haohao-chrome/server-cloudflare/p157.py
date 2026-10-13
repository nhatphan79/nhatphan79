def rep(s, a, b):
    assert s.count(a) == 1, ('MISS', a[:70], s.count(a)); return s.replace(a, b)
# ---------- common.js: đọc bảng "Hướng Dẫn Chọn Size" của Shopee (Size · Chiều cao · Cân nặng)
p='common.js'; s=open(p,encoding='utf-8').read()
s = rep(s, "HT.pickSize = (rows, kg, cm) => {", r'''HT.sizeTable = text => {
  const t = String(text || ''), i = t.search(/Hướng Dẫn Chọn Size|Số đo sản phẩm|Bảng quy đổi kích cỡ/i); if (i < 0) return [];
  const tk = t.slice(i, i + 4000).split(/[\n\t]+/).map(x => x.trim()).filter(Boolean);
  const SZ = /^(XXXXXL|XXXXL|XXXL|XXL|XL|XS|S|M|L|[2-7]XL|FREE ?SIZE|Freesize|\d{1,3})$/i, RG = /^(\d{2,3}(?:[.,]\d)?)\s*[-–~]\s*(\d{2,3}(?:[.,]\d)?)$/;
  const h = tk.findIndex(x => /^Size\b/i.test(x)); if (h < 0) return [];
  const heads = []; let j = h;
  for (; j < tk.length && j < h + 12; j++) { if (j > h && SZ.test(tk[j])) break; if (/^\(.*\)$/.test(tk[j]) && heads.length) heads[heads.length - 1] += ' ' + tk[j]; else heads.push(tk[j]); }
  const n = heads.length, hc = heads.findIndex(x => /cao|height/i.test(x)), wc = heads.findIndex(x => /nặng|weight|kg/i.test(x));
  if (n < 2 || wc < 0) return [];
  const out = [];
  for (; j + n - 1 < tk.length && SZ.test(tk[j]); j += n) {
    const row = tk.slice(j, j + n), w = (row[wc] || '').match(RG), hh = hc >= 0 ? (row[hc] || '').match(RG) : null;
    if (!w) break;
    out.push({ size: row[0].toUpperCase().replace(/\s/g, ''), lo: parseFloat(w[1].replace(',', '.')), hi: parseFloat(w[2].replace(',', '.')), hLo: hh ? +hh[1] : 0, hHi: hh ? +hh[2] : 0 });
  }
  return out;
};
// chọn size: theo cân nặng và chiều cao; 2 cách ra 2 size khác nhau thì trả cả 2
HT.pickSize2 = (rows, kg, cm) => {
  if (!rows.length || !(kg > 0)) return null;
  const inW = rows.filter(r => kg >= r.lo && kg <= r.hi), inH = cm > 0 ? rows.filter(r => r.hLo && cm >= r.hLo && cm <= r.hHi) : [];
  const both = inW.filter(r => inH.includes(r));
  if (both.length) return { size: both[both.length - 1].size, row: both[both.length - 1], ok: true };
  const w = inW[inW.length - 1], hgt = inH[inH.length - 1];
  if (w && hgt) return { size: w.size, alt: hgt.size, row: w, ok: true, why: `cân nặng hợp ${w.size}, chiều cao hợp ${hgt.size}` };
  if (w || hgt) return { size: (w || hgt).size, row: w || hgt, ok: true };
  const near = rows.slice().sort((a, b) => Math.min(Math.abs(kg - a.lo), Math.abs(kg - a.hi)) - Math.min(Math.abs(kg - b.lo), Math.abs(kg - b.hi)))[0];
  return { size: near.size, row: near, ok: false };
};
HT.pickSize = (rows, kg, cm) => {''')
open(p,'w',encoding='utf-8').write(s)

# ---------- content.js
p='content.js'; s=open(p,encoding='utf-8').read()
s = rep(s, "  const sizeRowsNow = () => { try { return HT.sizeRows(document.body.innerText || ''); } catch { return []; } };",
r'''  const sizeRowsNow = () => { try { const t = document.body.innerText || '', a = HT.sizeTable(t); return a.length ? a : HT.sizeRows(t); } catch { return []; } };
  // 📏 1.10.157: tự kéo tới "Hướng Dẫn Chọn Size" của Shopee để trang tải bảng size rồi đọc; nhớ theo từng món
  const sizeCache = new Map(); let sizeUi = { key: '', open: false, busy: false, res: null, msg: '' };
  const hasSizeOpt = () => !!(findText(/^(Size|SIZE|Kích cỡ|Kích Cỡ|Kích thước|Size\s*\/\s*Kích cỡ)$/) || findText(/^Hướng dẫn chọn size$/i));
  async function loadSizeGuide() {
    const key = itemKey(); if (sizeCache.has(key) && sizeCache.get(key).length) return sizeCache.get(key);
    let rows = sizeRowsNow();
    if (!rows.length) {
      const y0 = window.scrollY, H = () => document.body.scrollHeight;
      for (let k = 0; k < 14 && !rows.length; k++) {
        const head = findText(/^Hướng Dẫn Chọn Size$/);
        if (head) { head.scrollIntoView({ block: 'center' }); await wait(900); rows = sizeRowsNow(); if (rows.length) break; }
        window.scrollBy(0, Math.round(innerHeight * 0.9)); await wait(450); rows = sizeRowsNow();
        if (window.scrollY + innerHeight >= H() - 5) break;
      }
      if (!rows.length) window.scrollTo({ top: y0 });
    }
    sizeCache.set(key, rows); return rows;
  }
  function sizeVerdict(rows) {
    const b = settings.body || {}, r = HT.pickSize2(rows, b.kg, b.cm); if (!r) return null;
    const rg = x => [x.hLo ? `${x.hLo}–${x.hHi}cm` : '', `${x.lo}–${x.hi}kg`].filter(Boolean).join(' · ');
    if (!r.ok) return { size: r.size, text: `📏 Ngoài bảng size, gần nhất: ${r.size} (${rg(r.row)})` };
    if (r.alt && r.alt !== r.size) return { size: r.size, alt: r.alt, text: `📏 Size ${r.size} hoặc ${r.alt}: ${r.why}. Thích rộng chọn size lớn hơn` };
    return { size: r.size, text: `📏 Size hợp với bạn: ${r.size} (${rg(r.row)})` };
  }
  // chọn giúp ô size trên trang Shopee (khách vẫn tự bấm Mua)
  function pickSizeOnPage(size) {
    const b = [...document.querySelectorAll('button')].find(x => !x.closest('#hattieu-host') && (x.innerText || '').trim().toUpperCase() === size && !x.disabled && x.getAttribute('aria-disabled') !== 'true');
    if (b) { b.click(); b.scrollIntoView({ block: 'center' }); return true; } return false;
  }
  async function runSize() {
    sizeUi = { ...sizeUi, key: itemKey(), busy: true, msg: '' }; refreshSizeUi();
    const rows = await loadSizeGuide(), v = rows.length ? sizeVerdict(rows) : null;
    sizeUi = { ...sizeUi, busy: false, res: v, msg: rows.length ? '' : 'Shop chưa có bảng size HaoHao đọc được (có thể là ảnh).' };
    refreshSizeUi();
  }
  function refreshSizeUi() {
    if (ui && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
    if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel();
  }
  // khối gọn trong bong bóng: nút "📏 Gợi ý size" → (chưa có số đo) ô kg/cm → kết quả + nút chọn size trên trang
  function sizeBubbleRow() {
    if (!isShopeeItem() || !hasSizeOpt()) return null;
    if (sizeUi.key !== itemKey()) sizeUi = { key: itemKey(), open: false, busy: false, res: null, msg: '' };
    const b = settings.body || {}, box = el('div', 'szq');
    if (sizeUi.busy) { box.append(el('span', 'szq-t', '📏 Đang đọc bảng size của shop…')); return box; }
    if (sizeUi.res || sizeUi.msg) {
      box.append(el('span', 'szq-t', sizeUi.res ? sizeUi.res.text : '📏 ' + sizeUi.msg));
      const acts = el('span', 'szq-a');
      if (sizeUi.res) [sizeUi.res.size, sizeUi.res.alt].filter(Boolean).forEach(z => { const c = el('button', 'chip sm on', 'Chọn ' + z); c.addEventListener('click', e => { e.stopPropagation(); if (!pickSizeOnPage(z)) c.textContent = 'Hết ' + z; }); acts.append(c); });
      const ed = el('button', 'chip sm', `✎ ${b.kg || '?'}kg${b.cm ? ' · ' + b.cm + 'cm' : ''}`); ed.title = 'Đổi số đo';
      ed.addEventListener('click', e => { e.stopPropagation(); sizeUi.open = true; sizeUi.res = null; sizeUi.msg = ''; refreshSizeUi(); }); acts.append(ed);
      box.append(acts); return box;
    }
    if (!sizeUi.open && b.kg > 0) { const go = el('button', 'szq-go', '📏 Gợi ý size cho bạn ›'); go.addEventListener('click', e => { e.stopPropagation(); runSize(); }); box.append(go); return box; }
    if (!sizeUi.open) { const go = el('button', 'szq-go', '📏 Gợi ý size ›'); go.addEventListener('click', e => { e.stopPropagation(); sizeUi.open = true; refreshSizeUi(); }); box.append(go); return box; }
    const f = el('div', 'szf');
    const kg = document.createElement('input'); kg.inputMode = 'decimal'; kg.placeholder = 'kg'; kg.value = b.kg || ''; kg.setAttribute('aria-label', 'Cân nặng (kg)');
    const cm = document.createElement('input'); cm.inputMode = 'numeric'; cm.placeholder = 'cm'; cm.value = b.cm || ''; cm.setAttribute('aria-label', 'Chiều cao (cm)');
    const ok = el('button', 'chip sm on', 'Chọn size');
    const save = async e => { e && e.stopPropagation(); const k = parseFloat(String(kg.value).replace(',', '.')) || 0; if (!k) return kg.focus(); settings.body = { kg: k, cm: parseInt(cm.value) || 0 }; await chrome.storage.local.set({ settings }).catch(() => {}); sizeUi.open = false; runSize(); };
    [kg, cm].forEach(i => { i.addEventListener('click', e => e.stopPropagation()); i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') save(); }); });
    ok.addEventListener('click', save);
    f.append(el('span', '', '📏'), kg, el('span', '', 'kg'), cm, el('span', '', 'cm'), ok); box.append(f);
    setTimeout(() => kg.focus(), 50);
    return box;
  }''')
# bong bóng: thay dòng size cũ bằng khối mới
s = rep(s, "      const szl = sizeLine(); if (szl && szl.exact) B.append(el('div', 'tb-hook ok', szl.text));",
           "      const szq = sizeBubbleRow(); if (szq) B.append(szq);")
# tab Kiểm tra: dùng chung khối mới thay sizeBox cũ
s = rep(s, "const sz = item && sizeBox(); if (sz) L.append(sz); }", "const sz = item && sizeBubbleRow(); if (sz) { sz.classList.add('inpanel'); L.append(sz); } }")
css = '''  /* 1.10.157 gợi ý size gọn trong bong bóng */
  .szq { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 6px 0 2px; padding: 7px 9px; border-radius: 10px; background: #F5F3FF; border: 1px solid #DDD6FE; font-size: 12px; }
  .szq.inpanel { margin: 8px 0; }
  .szq-t { flex: 1 1 100%; font-weight: 700; color: #4C1D95; line-height: 1.35; }
  .szq-a { display: flex; gap: 5px; flex-wrap: wrap; }
  .szq-go { all: unset; cursor: pointer; font-weight: 800; color: #5B21B6; font-size: 12.5px; }
  .szq .szf input { width: 46px; }
'''
s = rep(s, "  /* 1.10.154 lời chê gom nhóm, gợi ý size */", css + "  /* 1.10.154 lời chê gom nhóm, gợi ý size */")
open(p,'w',encoding='utf-8').write(s)
print('ok')
