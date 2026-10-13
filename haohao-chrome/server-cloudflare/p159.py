def rep(s, a, b):
    assert s.count(a) == 1, ('MISS', a[:70], s.count(a)); return s.replace(a, b)
p='content.js'; s=open(p,encoding='utf-8').read()
# 1) bỏ gợi ý size trong bong bóng (giữ ở tab Kiểm tra)
s = rep(s, "      const szq = sizeBubbleRow(); if (szq) B.append(szq);\n", "")
# 2) nút Kiểm tra vào trong khung đánh giá nổi bật
s = rep(s, """    acts.append(go);
    if (p && p.price && isItemPage()) { const go2 = el('button', 'tb-go' + (hookSave""", """    const rvBox = B.querySelector('.tb-rv, .tb-why');   // 1.10.159: có khung đánh giá → nút Kiểm tra nằm trong khung đó
    if (rvBox) { const ck = el('button', 'tb-ck', (bad ? '⚠' : '🛡️') + ' Kiểm tra chi tiết ›'); ck.addEventListener('click', e => { e.stopPropagation(); goCheck('check'); }); rvBox.append(ck); }
    else acts.append(go);
    if (p && p.price && isItemPage()) { const go2 = el('button', 'tb-go' + (hookSave""")
# 4) mỗi trang mới hamster về góc mặc định (kéo chỉ có tác dụng trên trang đó)
s = rep(s, "    const p = posOverride || settings.pos || { r: 24,", "    const p = posOverride || pagePos || { r: 24,")
s = rep(s, "  function placeWrap() {", "  let pagePos = null;   // 1.10.159: vị trí kéo chỉ giữ trên trang đang xem; sang trang mới về góc mặc định\n  function placeWrap() {")
s = rep(s, "      if (moved) { settings.pos = { r: start.r - dx, b: start.b - dy }; placeWrap(); }", "      if (moved) { pagePos = { r: start.r - dx, b: start.b - dy }; placeWrap(); }")
s = rep(s, """      if (moved) chrome.storage.local.get('settings').then(({ settings: s = {} }) =>
        chrome.storage.local.set({ settings: { ...s, pos: settings.pos } }));
      else if""", "      if (moved) {}\n      else if")
# 3) săn mã xong → tải lại trang để Shopee tính lại giá sau mã, HaoHao đọc giá mới
s = rep(s, "    if (m.type === 'vh-progress') vhRun = m; else { vhRun = null; vhRes[m.key] = m.res; }",
           "    if (m.type === 'vh-progress') vhRun = m; else { vhRun = null; vhRes[m.key] = m.res; if (m.key === itemKey() && m.res && (m.res.saved || []).length) { say('Đã lưu mã xong, HaoHao tải lại trang để tính giá mới…', 'happy', '🎟️ Voucher', 'shop'); setTimeout(() => location.reload(), 1800); } }")
# 5) Flash Sale: mã shop thường không áp → không hứa "app rẻ hơn" / "lưu mã giảm thêm" dựa trên mã shop
s = rep(s, "  function dealPrices(D) {", "  const flashSale = () => !!findText(/^FLASH ?SALE$/i) || /KẾT THÚC TRONG/i.test((document.body.innerText || '').slice(0, 8000));\n  function dealPrices(D) {")
s = rep(s, "    let app = r.best.final, wv = null;\n    const a = r.base - r.best.shopOff, w = walletAppBest(a);",
           "    const fs = flashSale();   // 1.10.159: Flash Sale – mã shop hay không áp, chỉ tính mã trong ví (nếu có)\n    let app = fs ? web : r.best.final, wv = null;\n    const a = fs ? web : r.base - r.best.shopOff, w = walletAppBest(a);")
# 6) "Lưu mã" chỉ gợi ý vào ngày sale (ngày đôi, 15, 25, Black Friday) và không phải Flash Sale
s = rep(s, "    const r = D && D.res, v = r && r.best && r.best.v; if (!v || v.saved || v.out) return null;",
           "    const r = D && D.res, v = r && r.best && r.best.v; if (!v || v.saved || v.out) return null;\n    if (flashSale() || !((HT.saleDays(new Date(), 1)[0] || {}).days === 0)) return null;   // 1.10.159: chỉ ngày sale")
css = '''  /* 1.10.159 nút Kiểm tra trong khung đánh giá */
  .tb-ck { all: unset; cursor: pointer; display: inline-block; margin-top: 6px; padding: 5px 10px; border-radius: 999px; background: #2E7DD7; color: #fff; font: 800 11.5px/1 inherit; }
  .tb-ck:hover { filter: brightness(1.08); }
'''
s = rep(s, "  /* 1.10.158 đã bán · lời chê */", css + "  /* 1.10.158 đã bán · lời chê */")
open(p,'w',encoding='utf-8').write(s)
print('ok')
