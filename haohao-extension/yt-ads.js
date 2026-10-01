// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🛡️ Chặn quảng cáo YouTube: ẩn ô quảng cáo trên trang + tự bỏ qua quảng cáo video (tắt tiếng, tua hết, bấm "Bỏ qua").
// Không chặn mạng của YouTube (dễ bị YouTube phát hiện), chỉ xử lý ngay trên trang.
(() => {
  if (window.top !== window) return;
  const CSS = `
    #masthead-ad, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer,
    ytd-display-ad-renderer, ytd-compact-promoted-video-renderer, ytd-banner-promo-renderer, ytd-statement-banner-renderer,
    ytd-companion-slot-renderer, ytd-action-companion-ad-renderer, ytd-player-legacy-desktop-watch-ads-renderer, #player-ads,
    ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer), ytd-rich-section-renderer:has(ytd-statement-banner-renderer),
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"], .ytp-ad-overlay-container, .ytp-ad-image-overlay,
    ytd-merch-shelf-renderer, ytd-search-pyv-renderer, ytm-promoted-sparkles-web-renderer, ad-slot-renderer,
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model), ytd-enforcement-message-view-model { display: none !important; }`;
  let on = false, style = null, timer = null, obs = null, skipped = 0, muted = null, rate = null, hooked = null;
  const SKIP = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button, .ytp-ad-skip-button-container button, button[id^="skip-button"]';
  // lúc đang có quảng cáo: ẩn hình quảng cáo, hiện dòng "đang bỏ qua" để không phải nhìn quảng cáo chạy
  const HIDE = `.html5-video-player.ad-showing video, .html5-video-player.ad-interrupting video { opacity: 0 !important; }
    .html5-video-player.ad-showing::after, .html5-video-player.ad-interrupting::after { content: '⏩ HaoHao đang bỏ qua quảng cáo…'; position: absolute; inset: 0; display: grid; place-items: center;
      color: #fff; font: 600 16px/1.4 "Segoe UI", system-ui, sans-serif; background: #000; z-index: 30; pointer-events: none; }`;
  const playerOf = () => document.querySelector('#movie_player, .html5-video-player');
  const isAd = p => p && (p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting'));
  function skipNow() {
    const p = playerOf(), v = p && p.querySelector('video'), ad = isAd(p);
    if (ad && v) {
      if (muted === null) { muted = v.muted; rate = v.playbackRate; skipped++; }
      v.muted = true;
      try { v.playbackRate = 16; } catch {}
      // tua thẳng tới cuối ngay khi biết độ dài quảng cáo
      if (isFinite(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.05) { try { v.currentTime = v.duration; } catch {} }
      const b = document.querySelector(SKIP); if (b) b.click();
      if (v.paused) v.play().catch(() => {});
    } else if (muted !== null && v) {
      // hết quảng cáo: trả lại âm lượng và tốc độ người xem đang dùng
      v.muted = muted; try { v.playbackRate = rate || 1; } catch {}
      muted = null; rate = null;
    }
    // YouTube hiện bảng cấm chặn quảng cáo thì video bị dừng: cho phát tiếp
    if (document.querySelector('ytd-enforcement-message-view-model') && v && v.paused && !ad) v.play().catch(() => {});
    hook(p, v);
  }
  // phản ứng tức thì: theo dõi lúc trình phát chuyển sang quảng cáo và lúc video quảng cáo vừa biết độ dài
  function hook(p, v) {
    if (!p || p === hooked) return;
    hooked = p;
    new MutationObserver(() => { if (on) skipNow(); }).observe(p, { attributes: true, attributeFilter: ['class'] });
    if (v) ['loadedmetadata', 'durationchange', 'playing', 'timeupdate'].forEach(ev => v.addEventListener(ev, () => { if (on && isAd(p)) skipNow(); }));
  }
  const tick = () => { if (on) skipNow(); };
  function apply(want) {
    if (want === on) return; on = want;
    if (on) {
      style = document.createElement('style'); style.id = 'hh-ytads'; style.textContent = CSS + HIDE; (document.head || document.documentElement).appendChild(style);
      timer = setInterval(tick, 150);
      // trình phát có thể xuất hiện sau (YouTube tải trang kiểu ứng dụng): canh tới khi có thì gắn theo dõi
      obs = new MutationObserver(() => { if (hooked && hooked.isConnected) return; const p = playerOf(); if (p) { hook(p, p.querySelector('video')); if (isAd(p)) skipNow(); } });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } else { if (style) style.remove(); style = null; clearInterval(timer); timer = null; if (obs) obs.disconnect(); obs = null; }
  }
  const decide = s => apply(s.adBlock !== false && !(s.adAllow || []).includes('youtube.com'));
  chrome.storage.local.get('settings').then(({ settings = {} }) => decide(settings)).catch(() => {});
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.settings) decide(ch.settings.newValue || {}); });
  // đếm cho bảng HaoHao
  window.addEventListener('hh-ad-count', () => {
    let n = 0; try { n = on ? document.querySelectorAll(CSS.replace(/\{[^}]*\}/, '')).length : 0; } catch {}
    window.dispatchEvent(new CustomEvent('hh-ad-count-reply', { detail: { n, on, skipped, yt: true } }));
  });
})();
