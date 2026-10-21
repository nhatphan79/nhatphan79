// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🔓 V1.2.2: Khoá tuần cho các trang của HaoHao (Tab mới, HaoHao Convert).
//   Nền (background.js) ghi proLock = true từ 0h thứ 6 tới khi khách ghé đủ 4 chỗ → trang tái nhạt, hiện bảng 4 bước.
(() => {
  if (window.__hhWeekLock) return; window.__hhWeekLock = true;
  const CSS = `
  html.hh-wl-on body > *:not(#hh-wl) { filter: grayscale(1) opacity(.45); pointer-events: none; user-select: none; }
  #hh-wl { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 16px; background: rgba(240, 236, 230, .55); backdrop-filter: blur(3px); font: 14px/1.45 "Be Vietnam Pro", "Segoe UI", system-ui, sans-serif; }
  #hh-wl .c { width: min(440px, 100%); max-height: calc(100vh - 32px); overflow: auto; background: #fff; color: #1F2A44; border-radius: 22px; padding: 22px 20px 16px; box-shadow: 0 24px 70px rgba(35, 48, 94, .28); }
  #hh-wl .pet { display: block; width: 84px; height: 84px; margin: 0 auto 6px; filter: grayscale(.85) opacity(.65); transform: rotate(-8deg); }
  #hh-wl h2 { margin: 0; text-align: center; font-size: 19px; font-weight: 800; }
  #hh-wl p { margin: 6px 0 14px; text-align: center; color: #64748B; font-size: 13px; }
  #hh-wl button.r { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 10px; width: 100%; margin-bottom: 8px; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 12px; cursor: pointer; }
  #hh-wl button.r:hover, #hh-wl button.r:focus-visible { border-color: #F2A71B; }
  #hh-wl button.r.ok { background: #F0FDF4; border-color: #BBF7D0; }
  #hh-wl .n { flex: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #FFF4DB; font-size: 16px; }
  #hh-wl .ok .n { background: #16A34A; color: #fff; font-weight: 800; }
  #hh-wl .x { flex: 1; min-width: 0; } #hh-wl .x b { display: block; font-size: 13.5px; } #hh-wl .x small { color: #64748B; font-size: 12px; }
  #hh-wl .go { flex: none; font-size: 12px; font-weight: 700; color: #B26B00; } #hh-wl .ok .go { color: #16A34A; }
  #hh-wl .bar { margin-top: 4px; padding: 11px; border-radius: 12px; text-align: center; font-weight: 800; background: #E5E7EB; color: #6B7280; }
  #hh-wl .ft { margin-top: 10px; text-align: center; color: #94A3B8; font-size: 11.5px; }`;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  let box = null, feed = null, st = null;
  const steps = () => {
    const tt = (feed && feed.tiktok) || {}, sp = (feed && feed.shopee) || {};
    return [
      { id: 'hs', ic: '🌐', label: 'Vào haohaostore.com', sub: 'Mỗi tuần một ngách hàng tuyển chọn', url: HT.WEEK.store, web: true },
      { id: 'sp', ic: '🧡', label: 'Trang trưng bày Shopee', sub: 'HaoHao Store trên Shopee', url: sp.showcase || 'https://collshp.com/haohaostore?view=storefront' },
      { id: 'tt', ic: '🎵', label: 'Trang trưng bày TikTok Shop', sub: '@' + (tt.creator || 'haohaomall'), url: tt.showcase || 'https://www.tiktok.com/@' + (tt.creator || 'haohaomall') },
      { id: 'fb', ic: '👍', label: 'Fanpage HaoHao', sub: 'Tin mới, mẹo dùng HaoHao', url: (feed && feed.fanpage) || HT.FANPAGE || 'https://www.facebook.com/trolyHaoHao', web: true }
    ];
  };
  function render() {
    if (!box) {
      const s = el('style'); s.textContent = CSS; document.head.append(s);
      box = el('div'); box.id = 'hh-wl'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Mở khoá HaoHao tuần này');
      document.body.append(box);
    }
    document.documentElement.classList.add('hh-wl-on');
    const done = (st && st.steps) || {}, S = steps(), n = S.filter(x => done[x.id]).length;
    const c = el('div', 'c'), img = el('img', 'pet'); img.src = chrome.runtime.getURL('icons/icon128.png'); img.alt = '';
    c.append(img, el('h2', '', 'HaoHao đang tạm nghỉ 💤'), el('p', '', 'HaoHao luôn miễn phí cho bạn. Mỗi thứ 6, hãy ghé shop HaoHao để mở khoá cả tuần nhé. Nếu cần mua gì, mua qua link HaoHao là bạn đã ủng hộ HaoHao rồi, giá không đổi.'));
    S.forEach((x, i) => {
      const ok = !!done[x.id], r = el('button', 'r' + (ok ? ' ok' : '')); r.type = 'button';
      const t = el('span', 'x'); t.append(el('b', '', (i + 1) + '. ' + x.label), el('small', '', x.sub));
      r.append(el('span', 'n', ok ? '✓' : x.ic), t, el('span', 'go', ok ? 'Đã ghé' : 'Mở ›'));
      r.addEventListener('click', async () => {
        if (x.web) window.open(x.url, '_blank', 'noopener'); else chrome.runtime.sendMessage({ type: 'open-deal', url: x.url }).catch(() => window.open(x.url, '_blank', 'noopener'));
        const s2 = await chrome.runtime.sendMessage({ type: 'week-step', id: x.id }).catch(() => null);
        if (s2) { st = s2; s2.ok ? off() : render(); }
      });
      c.append(r);
    });
    c.append(el('div', 'bar', `Còn ${S.length - n} bước – xong là tự mở khoá`), el('div', 'ft', 'Mở khoá tới 0h thứ 6 tuần sau · ⓘ Shopee, TikTok có link tiếp thị, giá không đổi'));
    box.replaceChildren(c);
  }
  function off() { document.documentElement.classList.remove('hh-wl-on'); if (box) { box.remove(); box = null; } }
  async function check() {
    const d = await chrome.storage.local.get(['proLock', 'couponFeed']).catch(() => ({}));
    feed = d.couponFeed || null;
    if (!d.proLock) return off();
    st = await chrome.runtime.sendMessage({ type: 'pro-st' }).catch(() => null);
    if (st && st.ok) return off();
    const go = () => render();
    document.body ? go() : document.addEventListener('DOMContentLoaded', go, { once: true });
  }
  chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && (ch.proLock || ch.weekLock)) check(); });
  check();
})();
