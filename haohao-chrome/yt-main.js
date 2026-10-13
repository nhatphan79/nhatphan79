// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🛡️ YouTube: gỡ dữ liệu quảng cáo ngay khi trang nhận về, nên quảng cáo video không kịp xuất hiện.
// Chạy trong trang (MAIN world). Bật/tắt theo công tắc Chặn quảng cáo (yt-ads.js ghi vào localStorage 'hh-ad').
(() => {
  let off = false; try { off = localStorage.getItem('hh-ad') === '0'; } catch {}
  if (off) return;
  const KEYS = ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams'];
  const prune = o => {
    if (!o || typeof o !== 'object') return o;
    try {
      for (const k of KEYS) if (k in o) delete o[k];
      // dữ liệu trình phát có thể nằm lồng trong playerResponse
      if (o.playerResponse && typeof o.playerResponse === 'object') for (const k of KEYS) delete o.playerResponse[k];
      if (Array.isArray(o)) for (const x of o) if (x && x.playerResponse) for (const k of KEYS) delete x.playerResponse[k];
    } catch {}
    return o;
  };
  // 1) JSON.parse: YouTube đọc dữ liệu video qua đây
  const jp = JSON.parse;
  JSON.parse = function (...a) { return prune(jp.apply(this, a)); };
  // 2) fetch .../player: lúc chuyển video mới
  const rj = Response.prototype.json;
  Response.prototype.json = function (...a) { return rj.apply(this, a).then(prune); };
  // 4) 1.9.60: bảng "không cho chặn quảng cáo" của YouTube KHOÁ CUỘN cả trang (lăn chuột, kéo thanh cuộn đều không được).
  //    Chỉ ẩn bảng thì khoá vẫn còn → phải ĐÓNG bảng đúng cách (gọi close() của chính YouTube, chỉ làm được ở đây – MAIN world).
  setInterval(() => {
    try {
      const m = document.querySelector('ytd-enforcement-message-view-model'); if (!m) return;
      const d = m.closest('tp-yt-paper-dialog');
      if (d && d.opened && typeof d.close === 'function') d.close();
    } catch {}
  }, 1000);
  // 3) dữ liệu gắn sẵn trong trang lúc mở lần đầu
  let ipr;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', { configurable: true, get: () => ipr, set: v => { ipr = prune(v); } });
  } catch {}
})();
