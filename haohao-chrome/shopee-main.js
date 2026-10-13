// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 💰 Đọc giá & mã giảm giá mà trang Shopee ĐÃ NẠP SẴN (không gửi gì lên Shopee), trả về cho HaoHao tính giá tốt nhất.
// Chạy trong trang (MAIN world). Chỉ trả về số tiền / điều kiện mã, không lấy mã voucher hay chữ ký.
(() => {
  const fiberOf = e => { if (!e) return null; const k = Object.keys(e).find(k => k.startsWith('__reactFiber')); return k ? e[k] : null; };
  const up = (el, test, max = 220) => { let f = fiberOf(el); for (let i = 0; i < max && f; i++) { const r = test(f.memoizedProps || {}); if (r) return r; f = f.return; } return null; };
  const anchors = () => [document.querySelector('.mini-voucher-with-popover'), document.querySelector('h1'), document.querySelector('#main > div')].filter(Boolean);
  const vnd = v => (typeof v === 'number' && v > 0 ? Math.round(v / 1e5) : 0);
  function read() {
    let store = null, item = null, shopV = null;
    for (const a of anchors()) {
      store = store || up(a, p => (p.store && p.store.getState ? p.store : null));
      shopV = shopV || up(a, p => (Array.isArray(p.itemShopVouchers) ? p.itemShopVouchers : null), 40);
      item = item || up(a, p => (p.item && p.item.itemid ? p.item : null), 40);
    }
    if (!store) return null;
    const st = store.getState(), cm = (((st.DOMAIN_PDP || {}).data || {}).PDP_BFF_DATA || {}).cachedMap || {};
    const m = location.pathname.match(/-i\.(\d+)\.(\d+)|\/product\/(\d+)\/(\d+)/);
    const key = m ? (m[1] || m[3]) + '/' + (m[2] || m[4]) : '';
    const d = cm[key] || Object.values(cm)[0]; if (!d || !d.price_breakdown) return null;
    const pb = d.price_breakdown, sv = x => (x && x.single_value > 0 ? x.single_value : x && x.range_min > 0 ? x.range_min : 0);
    const total = vnd(sv(pb.price)), before = vnd(sv(pb.price_before_discount));
    let prodOff = 0, shopee = null, shopOff = 0;
    for (const b of pb.discount_breakdown || []) {
      if (b.platform_voucher) { const p = b.platform_voucher; shopee = { pct: +(p.discount_percentage || 0), off: p.discount_percentage ? 0 : vnd(p.discount_value), min: vnd(p.min_spend), cap: vnd(p.max_value || p.cap || 0) }; }
      else if (b.shop_voucher) shopOff = vnd(b.discount_amount);
      else if (b.type === 0) prodOff += vnd(b.discount_amount);
    }
    const base = before ? before - prodOff : 0;
    const list = (shopV || (item && item.shop_vouchers) || []).map(v => ({
      off: vnd(v.reward_value), pct: v.reward_percentage || 0, cap: vnd(v.reward_cap), min: vnd(v.min_spend) || 0,
      used: v.percentage_used || 0, saved: !!v.collect_time, limited: !!v.product_limit,
      label: v.reward_percentage ? `Giảm ${v.reward_percentage}%` : `Giảm ${Math.round(vnd(v.reward_value) / 1000)}k`
    })).filter(v => v.off || v.pct);
    const models = ((item && item.models) || []).map(x => ({ name: x.name, price: vnd(x.price) })).filter(x => x.price);
    const fpi = (d.product_price || {}).final_price_info || {}, sel = (item && item.models || []).find(x => x.modelid === fpi.model_id);
    const prices = [...new Set(models.map(x => x.price))];
    return { before, prodOff, base, total, shopee, shopOff, vouchers: list, model: sel ? sel.name : '', varies: prices.length > 1, minModel: prices.length ? Math.min(...prices) : 0, maxModel: prices.length ? Math.max(...prices) : 0 };
  }
  window.addEventListener('message', e => {
    if (e.source !== window || !e.data || e.data.hh !== 'deal-req') return;
    let data = null; try { data = read(); } catch {}
    window.postMessage({ hh: 'deal-res', id: e.data.id, data }, location.origin);
  });
})();
