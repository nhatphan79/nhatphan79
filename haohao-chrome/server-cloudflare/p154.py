def rep(s, a, b):
    assert s.count(a) == 1, ('MISS', a[:70], s.count(a)); return s.replace(a, b)
# ================= common.js =================
p='common.js'; s=open(p,encoding='utf-8').read()
s = rep(s, "HT.applyPrice = (it, price) => {\n  const now = Date.now(); it.history = it.history || [];",
"""HT.applyPrice = (it, price, out) => {
  const now = Date.now(); it.history = it.history || [];
  // 1.10.154: hết hàng → ghi nhận, chưa báo; có hàng lại → 'back'; tăng ≥10% so với lần trước → 'up' (7 ngày báo 1 lần)
  if (out) { if (!it.out) { it.out = true; it.outAt = now; } it.checked = now; return null; }
  const wasOut = !!it.out, prev = it.price; it.out = false;""")
s = rep(s, "  if (it.saved && price >= it.saved) it.dealNew = false;   // giá lên lại: thôi báo\n  return ev;\n};",
"""  if (it.saved && price >= it.saved) it.dealNew = false;   // giá lên lại: thôi báo
  if (!ev && wasOut) ev = 'back';
  if (!ev && prev && price >= prev * 1.1 && !(it.upAt && now - it.upAt < 7 * 864e5)) { ev = 'up'; it.upAt = now; }
  return ev;
};
// 📏 Gợi ý size (1.10.154): đọc bảng size shop ghi bằng chữ (vd "M: 45-52kg", "L (52-60kg) 1m60-1m70") → size hợp cân nặng / chiều cao
HT.sizeRows = text => {
  const out = [], seen = new Set();
  const SZ = '(XXXXL|XXXL|XXL|XL|XS|S|M|L|[2-6]XL|\\\\d{1,2}XL|FREESIZE|Free ?size|\\\\d{2,3})';
  const re = new RegExp('(?:^|[\\\\s,;|(\\\\[])(?:size\\\\s*)?' + SZ + '\\\\s*[:：\\\\-–=)\\\\]]?\\\\s*(?:[^\\\\n\\\\d]{0,14})?(\\\\d{2,3}(?:[.,]\\\\d)?)\\\\s*(?:kg)?\\\\s*(?:-|–|~|đến|tới|to)\\\\s*(\\\\d{2,3}(?:[.,]\\\\d)?)\\\\s*kg([^\\\\n]{0,40})', 'gim');
  for (const m of String(text || '').matchAll(re)) {
    const size = m[1].toUpperCase().replace(/\\s/g, ''), lo = parseFloat(m[2].replace(',', '.')), hi = parseFloat(m[3].replace(',', '.'));
    if (!(lo > 2 && hi > lo && hi < 200)) continue;
    const h = (m[4] || '').match(/(\\d)m(\\d{2})\\s*(?:-|–|~|đến)\\s*(\\d)m(\\d{2})|(\\d{2,3})\\s*(?:cm)?\\s*(?:-|–|~|đến)\\s*(\\d{2,3})\\s*cm/i);
    const hLo = h ? (h[1] ? +h[1] * 100 + +h[2] : +h[5]) : 0, hHi = h ? (h[3] ? +h[3] * 100 + +h[4] : +h[6]) : 0;
    const key = size + lo + hi; if (seen.has(key)) continue; seen.add(key);
    out.push({ size, lo, hi, hLo, hHi });
  }
  return out;
};
HT.pickSize = (rows, kg, cm) => {
  if (!rows.length || !(kg > 0)) return null;
  const fit = rows.filter(r => kg >= r.lo && kg <= r.hi);
  const byH = list => cm > 0 ? list.slice().sort((a, b) => ((a.hLo && cm >= a.hLo && cm <= a.hHi) ? 0 : 1) - ((b.hLo && cm >= b.hLo && cm <= b.hHi) ? 0 : 1)) : list;
  if (fit.length) { const f = byH(fit); return { row: f[f.length > 1 && !(cm > 0) ? f.length - 1 : 0], exact: true, between: fit.length > 1 }; }
  const near = rows.slice().sort((a, b) => Math.min(Math.abs(kg - a.lo), Math.abs(kg - a.hi)) - Math.min(Math.abs(kg - b.lo), Math.abs(kg - b.hi)))[0];
  return { row: near, exact: false };
};""")
open(p,'w',encoding='utf-8').write(s)

# ================= background.js =================
p='background.js'; s=open(p,encoding='utf-8').read()
s = rep(s, "      res.push({ id: due[i].id, price: r && r.price || 0, image: r && r.image || '' });",
           "      res.push({ id: due[i].id, price: r && r.price || 0, image: r && r.image || '', out: !!(r && r.out) });")
s = rep(s, "if (!it || !x.price) continue; const ev = HT.applyPrice(it, x.price);",
           "if (!it || !(x.price || x.out)) continue; const ev = HT.applyPrice(it, x.price, x.out);")
a = "      ev === 'target' ? `${it.title.slice(0, 60)}: còn ${k(it.price)}, đã chạm mức bạn đặt` : `${it.title.slice(0, 60)}: giảm còn ${k(it.price)} (lúc lưu ${k(it.saved)})`"
s = rep(s, a, "      ev === 'target' ? `${it.title.slice(0, 60)}: còn ${k(it.price)}, đã chạm mức bạn đặt` : ev === 'back' ? `${it.title.slice(0, 60)}: có hàng lại rồi, giá ${k(it.price)}` : ev === 'up' ? `${it.title.slice(0, 60)}: vừa tăng giá lên ${k(it.price)}` : `${it.title.slice(0, 60)}: giảm còn ${k(it.price)} (lúc lưu ${k(it.saved)})`")
open(p,'w',encoding='utf-8').write(s)

# ================= content.js =================
p='content.js'; s=open(p,encoding='utf-8').read()
# (5) hết hàng: quét nền + trang đang xem
s = rep(s, "    chrome.runtime.sendMessage({ type: 'scan-result', result: { price: p && p.price || 0, image: pageImg() } }).catch(() => {});",
           "    chrome.runtime.sendMessage({ type: 'scan-result', result: { price: p && p.price || 0, image: pageImg(), out: soldOutNow() } }).catch(() => {});")
s = rep(s, "      if (x.price) { ok++; if (HT.applyPrice(it, x.price)) deals++;", "      if (x.price || x.out) { ok++; if (HT.applyPrice(it, x.price, x.out)) deals++;")
s = rep(s, "    const ev = HT.applyPrice(it, p.price);", "    const ev = HT.applyPrice(it, p.price, soldOutNow());")
s = rep(s, "    Bb.append(el('span', 't', ev === 'target' ? '🎯 Chạm giá bạn đặt!' : '🐹 Có giá ngon!'));",
           "    Bb.append(el('span', 't', ev === 'target' ? '🎯 Chạm giá bạn đặt!' : ev === 'back' ? '📦 Có hàng lại rồi!' : ev === 'up' ? '📈 Giá vừa tăng' : '🐹 Có giá ngon!'));")
# (1) phí ship vào giá web
s = rep(s, """  function dealPrices(D) {
    const r = D.res, web = (D.main && D.main.total) || (D.detail && D.detail.total) || r.current;
    let app = r.best.final, wv = null;
    const a = r.base - r.best.shopOff, w = walletAppBest(a);
    if (w && a - w.v < app) { app = a - w.v; wv = w; }
    return { app, web, v: r.best.v, wv, appBetter: app < web - 1000 };
  }""", """  // 🚚 phí ship Shopee ghi trên trang sản phẩm ("Phí ship 16.500₫" / "Phí ship 0₫"); không đọc được → null
  function shipFee() {
    const t = document.body.innerText || '', m = t.match(/Phí (?:ship|vận chuyển)\\s*:?\\s*(?:₫\\s*)?(\\d[\\d.,]*\\s*k?)\\s*₫?/i);
    if (m) return HT.money(m[1]);
    return /Miễn phí vận chuyển|Freeship/i.test(t.slice(0, 6000)) ? 0 : null;
  }
  function dealPrices(D) {
    const r = D.res, web = (D.main && D.main.total) || (D.detail && D.detail.total) || r.current;
    let app = r.best.final, wv = null;
    const a = r.base - r.best.shopOff, w = walletAppBest(a);
    if (w && a - w.v < app) { app = a - w.v; wv = w; }
    const ship = shipFee(), webAll = web + (ship || 0);   // 1.10.154: giá về tay trên web = giá sau mã + phí ship
    return { app, web, ship, webAll, v: r.best.v, wv, appBetter: app < webAll - 1000 };
  }""")
s = rep(s, "      const a = el('button', 'b dbtn', P.web - P.app >= 1000 ? `📱 Mở app rẻ hơn ${kShort(P.web - P.app)}` : '📱 Mở trên app');",
           "      const a = el('button', 'b dbtn', P.webAll - P.app >= 1000 ? `📱 Mở app rẻ hơn ${kShort(P.webAll - P.app)}` : '📱 Mở trên app');")
s = rep(s, "    row('💻', 'Mua trên web', P.web, '+ phí ship', w,",
           "    row('💻', 'Mua trên web', P.webAll, P.ship == null ? '+ phí ship' : P.ship ? `đã gồm ship ${kShort(P.ship)}` : 'miễn phí ship', w,")
# (2)(3)(7) móc nối trong bong bóng
s = rep(s, "      const vh = saveHook(DR); if (vh) B.append(vh);",
"""      const vh = saveHook(DR); if (vh) B.append(vh);
      const nm = needMoreHook(DR); if (nm) B.append(nm);""")
s = rep(s, "  function dealButtons(D, cls) {", r'''  // ➕ Thêm Xk là dùng được mã: mã shop có đơn tối thiểu cao hơn giá món một chút mà đáng giá
  function needMoreHook(D) {
    const r = D && D.res; if (!r || !D.vouchers) return null;
    let best = null;
    for (const v of D.vouchers) {
      if (v.out || !v.min || v.min <= r.base) continue;
      const need = v.min - r.base; if (need > Math.max(30000, r.base * 0.3)) continue;
      const val = v.pct ? Math.min(Math.round(v.min * v.pct / 100), v.cap || Infinity) : v.off;
      if (!(val >= 5000) || val < need * 0.4) continue;
      if (!best || val - need * 0.4 > best.val - best.need * 0.4) best = { v, need, val };
    }
    if (!best) return null;
    const b = el('div', 'tb-hook ok');
    b.append(el('b', '', `➕ Thêm ${kShort(best.need)} nữa là dùng được mã ${best.v.label}`), el('span', '', `Giảm ${kShort(best.val)} · tăng số lượng hoặc mua thêm món nhỏ cùng shop`));
    return b;
  }
  // 🎵 So với TikTok Shop (chỉ khi có khoá soi sản phẩm): cùng món mà TikTok rẻ hơn → báo, bấm mở (qua link @haohaomall nếu có)
  const ttCmp = new Map();
  function ttCompare(p) {
    const key = itemKey(); if (!p || !p.price || ttCmp.has(key) || !spyOn() || isTikTokItem()) return;
    ttCmp.set(key, { loading: true });
    chrome.runtime.sendMessage({ type: 'spy-search', q: cmpQuery(p), src: 'tiktok', page: 1 }).then(r => {
      const list = ((r && r.tiktok && r.tiktok.items) || []).filter(x => x.price > p.price * 0.4 && x.price < p.price - 3000 && HT.sameProduct(p.title, x.title).same);
      list.sort((a, b) => a.price - b.price);
      ttCmp.set(key, { best: list[0] || null });
      if (list[0] && ui && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
    }).catch(() => ttCmp.set(key, {}));
  }
  function ttHook(p) {
    const st = ttCmp.get(itemKey()), x = st && st.best; if (!x) return null;
    const b = el('button', 'tb-hook hot');
    b.append(el('b', '', `🎵 TikTok bán rẻ hơn ${kShort(p.price - x.price)}`), el('span', '', `${x.shop || 'TikTok Shop'} · ${vnd(x.price)}`));
    b.addEventListener('click', e => { e.stopPropagation(); openDeal(x.url); });
    return b;
  }
  // 📏 Gợi ý size theo cân nặng / chiều cao khách tự nhập (lưu trong máy)
  const sizeRowsNow = () => { try { return HT.sizeRows(document.body.innerText || ''); } catch { return []; } };
  function sizeLine() {
    const b = settings.body || {}; if (!(b.kg > 0)) return null;
    const pick = HT.pickSize(sizeRowsNow(), b.kg, b.cm); if (!pick) return null;
    const r = pick.row, rg = `${r.lo}–${r.hi}kg` + (r.hLo ? ` · ${r.hLo}–${r.hHi}cm` : '');
    return { text: pick.exact ? `📏 Size hợp với bạn: ${r.size} (${rg})` : `📏 Gần nhất: ${r.size} (${rg}) – cân nặng bạn nằm ngoài bảng size`, exact: pick.exact };
  }
  function sizeBox() {
    if (!isShopeeItem() && !isTikTokItem()) return null;
    const rows = sizeRowsNow(), b = settings.body || {}, box = el('div', 'szb');
    box.append(el('b', '', '📏 Gợi ý size'));
    const f = el('div', 'szf');
    const kg = document.createElement('input'); kg.inputMode = 'decimal'; kg.placeholder = 'kg'; kg.value = b.kg || ''; kg.setAttribute('aria-label', 'Cân nặng (kg)');
    const cm = document.createElement('input'); cm.inputMode = 'numeric'; cm.placeholder = 'cm'; cm.value = b.cm || ''; cm.setAttribute('aria-label', 'Chiều cao (cm)');
    [kg, cm].forEach(i => i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') sv.click(); }));
    const sv = el('button', 'chip sm on', 'Lưu');
    sv.addEventListener('click', async () => { settings.body = { kg: parseFloat(String(kg.value).replace(',', '.')) || 0, cm: parseInt(cm.value) || 0 }; await chrome.storage.local.set({ settings }).catch(() => {}); renderPanel(); });
    f.append(el('span', '', 'Cân nặng'), kg, el('span', '', 'Cao'), cm, sv); box.append(f);
    const sl = sizeLine();
    box.append(el('div', 'szr', sl ? sl.text : rows.length ? 'Nhập cân nặng (và chiều cao) để HaoHao chọn size giúp.' : 'Shop chưa ghi bảng size bằng chữ trong mô tả (có thể là ảnh), HaoHao chưa đọc được.'));
    return box;
  }
  function dealButtons(D, cls) {''')
# bong bóng: hook TikTok + size
s = rep(s, "      const nm = needMoreHook(DR); if (nm) B.append(nm);",
"""      const nm = needMoreHook(DR); if (nm) B.append(nm);
      if (p && p.price) { ttCompare(p); const th = ttHook(p); if (th) B.append(th); }
      const szl = sizeLine(); if (szl && szl.exact) B.append(el('div', 'tb-hook ok', szl.text));""")
# tab Kiểm tra: ô size
s = rep(s, "      else if (trust) { if (item && p && p.price) L.append(ptBox(p)); L.append(trustCard()); const dc = dealCard(); if (dc) L.append(dc); }",
           "      else if (trust) { if (item && p && p.price) L.append(ptBox(p)); L.append(trustCard()); const dc = dealCard(); if (dc) L.append(dc); const sz = item && sizeBox(); if (sz) L.append(sz); }")
# hết hàng + nhắc mã sắp hết hạn (cạnh walletAppBest)
s = rep(s, "  function walletAppBest(a) {", r'''  const soldOutNow = () => { try { return !!findText(/^(Hết hàng|Sản phẩm này đã hết hàng|Sản phẩm đã hết hàng|HẾT HÀNG)$/i); } catch { return false; } };
  // 🎟️ Nhắc mã trong ví Shopee sắp hết hạn (đọc từ lần quét ví gần nhất) – 1 lần/ngày
  async function voucherExpiryNudge() {
    if (!ui || !walletApp || Date.now() - walletApp.at > 7 * 864e5 || !ui.panel.hidden || !ui.bubble.hidden || menuOpen) return;
    const day = new Date().toDateString(), { vexpDay = '' } = await chrome.storage.local.get('vexpDay').catch(() => ({}));
    if (vexpDay === day) return;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const soon = (walletApp.list || []).map(v => { const m = (v.until || '').match(/HSD:\s*(\d{2})\.(\d{2})\.(\d{4})/); if (!m) return null; const dd = Math.round((new Date(+m[3], +m[2] - 1, +m[1]) - d0) / 864e5); return dd >= 0 && dd <= 1 ? { v, dd } : null; }).filter(Boolean);
    if (!soon.length) return;
    await chrome.storage.local.set({ vexpDay: day }).catch(() => {});
    const x = soon.sort((a, b) => (b.v.pct ? b.v.pct * 1000 : b.v.off || 0) - (a.v.pct ? a.v.pct * 1000 : a.v.off || 0))[0], name = x.v.pct ? `giảm ${x.v.pct}%` : `giảm ${kShort(x.v.off || 0)}`;
    say(`Mã ${name}${soon.length > 1 ? ` và ${soon.length - 1} mã khác` : ''} hết hạn ${x.dd ? 'ngày mai' : 'hôm nay'}. Cần mua gì thì dùng trước khi hết nhé!`, 'remind', '🎟️ Mã sắp hết hạn', 'shop',
      [{ label: 'Mở giỏ hàng Shopee', fn: () => openDeal('https://shopee.vn/cart') }, { label: 'Để sau', ghost: true, fn: () => {} }]);
  }
  function walletAppBest(a) {''')
s = rep(s, "    setTimeout(newsBubble, 4500);\n", "    setTimeout(newsBubble, 4500);\n    setTimeout(voucherExpiryNudge, 12000);\n")
# (4) gom lời chê thành nhóm
a0 = s.index("      // tối đa 2 câu chê khác nhau, đủ ý (bỏ mẩu quá ngắn như \"Thất vọng\" nếu có câu khác rõ hơn)")
a1 = s.index("      B.append(box);\n    } else if (trust.info.reviewsReading)", a0)
s = s[:a0] + r'''      // 1.10.154: gom lời chê thành nhóm "Size nhỏ (5) · Vải mỏng (3)" + 1 câu trích tiêu biểu
      box.append(el('div', 'tb-grp', rv.issues.slice(0, 4).map(it => `${it.label} (${it.n})`).join(' · ')));
      const top = rv.issues[0], q0 = (top.quotes || []).filter(q => q.length >= 12)[0] || (top.quotes || [])[0];
      if (q0) { const row = el('div', 'tb-rl'); row.append(quote(q0.slice(0, 90), (top.words || []).find(w => q0.toLowerCase().includes(w)))); box.append(row); }
''' + s[a1:]
css = '''  /* 1.10.154 lời chê gom nhóm, gợi ý size */
  .tb-grp { font-size: 12px; font-weight: 700; color: #B91C1C; margin: 3px 0 2px; line-height: 1.4; }
  .szb { margin: 8px 0; padding: 9px 10px; border: 1px solid #E2E8F0; border-radius: 10px; background: #fff; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; }
  .szf { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: #64748B; }
  .szf input { width: 52px; padding: 5px 6px; border: 1px solid #CBD5E1; border-radius: 8px; font: inherit; color: #1F2A44; }
  .szr { font-size: 12.5px; color: #1F2A44; font-weight: 600; }
'''
s = rep(s, "  /* 1.10.127 Mở khoá Tiện ích */", css + "  /* 1.10.127 Mở khoá Tiện ích */")
open(p,'w',encoding='utf-8').write(s)
print('ok')
