// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🛡️ Chặn quảng cáo YouTube: ẩn ô quảng cáo trên trang + tự bỏ qua quảng cáo video (tắt tiếng, tua hết, bấm "Bỏ qua").
// Không chặn mạng của YouTube (dễ bị YouTube phát hiện), chỉ xử lý ngay trên trang.
// Lớp 1 (yt-main.js): gỡ dữ liệu quảng cáo trước khi trình phát đọc. Lớp 2 (file này): còn lọt thì tắt tiếng, tua hết, bấm "Bỏ qua" (kiểm tra mỗi 0,05 giây).
(() => {
  if (window.top !== window) return;
  // 🖱️ 1.9.57: thanh cuộn YouTube rõ và dễ kéo (YouTube tô thanh cuộn xám mảnh, nền trong suốt nên mờ khó thấy).
  // Luôn bật, không phụ thuộc công tắc chặn quảng cáo.
  try {
    const sc = document.createElement('style'); sc.id = 'hh-ytscroll';
    sc.textContent = 'html, body { scrollbar-color: #5f5f5f #e6e6e6 !important; scrollbar-width: auto !important; }';
    (document.head || document.documentElement).appendChild(sc);
  } catch {}
  const CSS = `
    #masthead-ad, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer,
    ytd-display-ad-renderer, ytd-compact-promoted-video-renderer, ytd-banner-promo-renderer, ytd-statement-banner-renderer,
    ytd-companion-slot-renderer, ytd-action-companion-ad-renderer, ytd-player-legacy-desktop-watch-ads-renderer, #player-ads,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"], .ytp-ad-overlay-container, .ytp-ad-image-overlay,
    ytd-merch-shelf-renderer, ytd-search-pyv-renderer, ytm-promoted-sparkles-web-renderer, ad-slot-renderer,
    ytd-enforcement-message-view-model, [data-hh-yt-hide] { display: none !important; }
    /* bảng cấm chặn QC bị ẩn nhưng lớp phủ tối của nó còn lại làm màn hình tối: ẩn luôn lớp phủ */
    tp-yt-iron-overlay-backdrop { display: none !important; }`;
  let enfSeen = false, on = false, style = null, timer = null, obs = null, skipped = 0, muted = null, rate = null, hooked = null;
  const SKIP = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button, .ytp-ad-skip-button-container button, button[id^="skip-button"]';
  // lúc đang có quảng cáo: ẩn hình quảng cáo, hiện dòng "đang bỏ qua" để không phải nhìn quảng cáo chạy
  const HIDE = '';   // 1.9.49: bỏ màn che đen lúc bỏ qua quảng cáo (làm video tối lại); video luôn hiện bình thường
  const playerOf = () => document.querySelector('#movie_player, .html5-video-player');
  const isAd = p => p && (p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting'));
  function skipNow() {
    const p = playerOf(), v = p && p.querySelector('video'), ad = isAd(p);
    if (ad && v) {
      if (muted === null) { muted = v.muted; rate = v.playbackRate; skipped++; try { chrome.runtime.sendMessage({ type: 'hh-ad-note', kind: 'yt', n: skipped }).catch(() => {}); } catch {} }
      v.muted = true;
      try { v.playbackRate = 16; } catch {}
      // tua thẳng tới cuối CHỈ khi quảng cáo là luồng riêng (độ dài ngắn, ≤ 3 phút).
      // YouTube giờ hay ghép quảng cáo chung vào luồng video chính: tua tới cuối ở đó làm video đen / đứng "Đang tải" → chỉ tua nhanh x16 + bấm Bỏ qua
      if (isFinite(v.duration) && v.duration > 0 && v.duration <= 180 && v.currentTime < v.duration - 0.05) { try { v.currentTime = v.duration; } catch {} }
      const b = document.querySelector(SKIP); if (b) b.click();
      if (v.paused) v.play().catch(() => {});
    } else if (muted !== null && v) {
      // hết quảng cáo: trả lại âm lượng và tốc độ người xem đang dùng
      v.muted = muted; try { v.playbackRate = rate || 1; } catch {}
      muted = null; rate = null;
    } else if (v && !ad && v.playbackRate >= 16) { try { v.playbackRate = 1; } catch {} }   // chốt an toàn: không bao giờ để video thường kẹt ở x16
    // YouTube hiện bảng cấm chặn quảng cáo thì video bị dừng: cho phát tiếp
    // 1.9.58: ẩn khung bao quảng cáo bằng JS (1 lần/giây) thay cho CSS :has() – :has() bắt trình duyệt dò lại cả trang
    // mỗi khi YouTube chèn thêm video lúc cuộn → kéo thanh cuộn bị giật, trang chớp trắng
    if (!ad) hideBoxes();
    // chỉ cho phát tiếp ĐÚNG 1 lần lúc bảng vừa hiện; sau đó người xem tự bấm tạm dừng thì để yên (1.9.51)
    const enf = !!document.querySelector('ytd-enforcement-message-view-model');
    if (enf && !enfSeen && v && v.paused && !ad) v.play().catch(() => {});
    enfSeen = enf;
    hook(p, v);
  }
  function hideBoxes() {
    const mark = e => { if (e && !e.hasAttribute('data-hh-yt-hide')) e.setAttribute('data-hh-yt-hide', ''); };
    for (const a of document.querySelectorAll('ytd-ad-slot-renderer')) mark(a.closest('ytd-rich-item-renderer'));
    for (const b of document.querySelectorAll('ytd-statement-banner-renderer')) mark(b.closest('ytd-rich-section-renderer'));
    const enf = document.querySelector('ytd-enforcement-message-view-model'); if (enf) mark(enf.closest('tp-yt-paper-dialog'));
  }
  // phản ứng tức thì: theo dõi lúc trình phát chuyển sang quảng cáo và lúc video quảng cáo vừa biết độ dài
  function hook(p, v) {
    if (!p || p === hooked) return;
    hooked = p;
    new MutationObserver(() => { if (on) { skipNow(); pace(); } }).observe(p, { attributes: true, attributeFilter: ['class'] });
    if (v) ['loadedmetadata', 'durationchange', 'playing', 'timeupdate'].forEach(ev => v.addEventListener(ev, () => { if (on && isAd(p)) skipNow(); }));
  }
  // 1.9.50 nhẹ máy: chỉ kiểm tra dồn dập (0,05 giây) khi ĐANG có quảng cáo; bình thường 1 giây/lần
  // (trước đây 0,05 giây suốt cả lúc xem + theo dõi mọi thay đổi trang → kéo thanh cuộn bị giật)
  let fast = false;
  const tick = () => { if (!on) return; skipNow(); pace(); if (!fast && !(hooked && hooked.isConnected)) watchPage(); };
  function pace() {
    const want = isAd(playerOf()) || muted !== null;
    if (want === fast && timer) return;
    fast = want; clearInterval(timer); timer = setInterval(tick, fast ? 50 : 1000);
  }
  // canh trình phát xuất hiện (YouTube tải trang kiểu ứng dụng); gắn xong thì THÔI theo dõi cả trang
  function watchPage() {
    if (obs) return;
    obs = new MutationObserver(() => {
      const p = playerOf(); if (!p) return;
      hook(p, p.querySelector('video')); if (isAd(p)) { skipNow(); pace(); }
      obs.disconnect(); obs = null;
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  function apply(want) {
    if (want === on) return; on = want;
    if (on) {
      style = document.createElement('style'); style.id = 'hh-ytads'; style.textContent = CSS + HIDE; (document.head || document.documentElement).appendChild(style);
      fast = false; timer = setInterval(tick, 1000); tick(); watchPage();
    } else { if (style) style.remove(); style = null; clearInterval(timer); timer = null; if (obs) obs.disconnect(); obs = null; }
  }
  let S0 = {}, LOCK = false;   // V1.65: hết dùng thử chưa mua Pro (proLock) → không chặn
  const decide = s => { if (s) S0 = s; const on = S0.adBlock !== false && !LOCK; try { localStorage.setItem('hh-ad', on ? '1' : '0'); } catch {} apply(on); };   // yt-main.js đọc cờ này
  chrome.storage.local.get(['settings', 'proLock']).then(({ settings = {}, proLock }) => { LOCK = !!proLock; decide(settings); }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, area) => { if (area !== 'local') return; if (ch.proLock) LOCK = !!ch.proLock.newValue; if (ch.settings || ch.proLock) decide(ch.settings ? ch.settings.newValue || {} : null); });
  // đếm cho bảng HaoHao
  window.addEventListener('hh-ad-count', () => {
    let n = 0; try { n = on ? document.querySelectorAll(CSS.split('{')[0]).length : 0; } catch {}
    window.dispatchEvent(new CustomEvent('hh-ad-count-reply', { detail: { n, on, skipped, yt: true } }));
  });
})();
