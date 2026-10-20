// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🛡️ Chặn quảng cáo (phần trên trang): ẩn khung quảng cáo còn sót lại sau khi đã chặn tận gốc.
//  1) Bộ chọn quen thuộc (Google Ads, Taboola, Admicro…)
//  2) Tự nhận banner cờ bạc / banner ngang dẫn ra trang khác, tự gỡ popup có nút "Đóng QC / Tắt QC"
//  3) Khung quảng cáo đúng cỡ chuẩn (728×90, 300×250…) dẫn ra trang khác
//  4) Quảng cáo video trong trình phát phim: tắt tiếng, tua hết, tự bấm "Bỏ qua quảng cáo"
// Tự động hoàn toàn, mọi trang. Không chạy trên trang tiếp thị (Shopee, TikTok, trang trưng bày) và các trang làm việc của Google.
// 🖱️ 1.9.52: báo cho nền mỗi lần người dùng BẤM THẬT (link hoặc nút) trên MỌI trang, kể cả YouTube, X, Gmail…
// để không đóng nhầm tab người dùng muốn mở (vd link d3al.xyz bấm từ YouTube / X qua t.co)
(() => {
  const tellLink = e => {
    if (!e.isTrusted) return;
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    const href = a && /^https?:/.test(a.href) ? a.href : '';
    try { chrome.runtime.sendMessage({ type: 'hh-user-link', href }).catch(() => {}); } catch {}
  };
  ['click', 'auxclick', 'contextmenu'].forEach(ev => document.addEventListener(ev, tellLink, true));
})();

(() => {
  const host = location.hostname.replace(/^www\./, '');
  const AFF = /(^|\.)(shopee\.vn|shope\.ee|tiktok\.com|collshp\.com)$/;
  // V1.3: không đụng Facebook, Messenger, Instagram, Zalo, Telegram (ẩn nhầm hình trong tin nhắn)
  // 1.10.174: không đụng trang làm việc (AI Studio, Cloudflare, GitHub, tài khoản Google…): ẩn nhầm làm hỏng nút / hộp thoại
  if (AFF.test(host) || /(^|\.)(mail|docs|drive|calendar|aistudio|accounts|myaccount|gemini|cloud|console\.cloud)\.google\.com$|(^|\.)(facebook\.com|messenger\.com|instagram\.com|zalo\.me|telegram\.org|youtube\.com|dash\.cloudflare\.com|github\.com|claude\.ai|chatgpt\.com|notion\.so|figma\.com|canva\.com|microsoft\.com|live\.com|office\.com|apple\.com|zalo\.me|accesstrade\.vn|riohub\.vn|haohao-gia\.nhatphan79\.workers\.dev)$/.test(host)) return;
  const TOP = window.top === window;
  const SEL = [
    'ins.adsbygoogle', '.adsbygoogle', '[id^="google_ads_iframe"]', '[id^="div-gpt-ad"]', '[data-google-query-id]', '[data-ad-slot]',
    'iframe[src*="doubleclick.net"]', 'iframe[src*="googlesyndication.com"]', 'iframe[src*="amazon-adsystem.com"]', 'a[href*="doubleclick.net"]',
    '[id^="taboola-"]', '.trc_related_container', '.OUTBRAIN', '[data-widget-id^="outbrain"]', '[id^="admzone"]', '[id^="adm-slot"]',
    '.ad-slot', '.ad-banner', '.ads-banner', '.banner-ads', '.adsbox', '.advertisement', '[aria-label="Advertisement"]', '[aria-label="Quảng cáo"]',
    '.quang-cao', '.quangcao', '[class*="box-quangcao"]', '[id*="quangcao"]', '[data-hh-ad]'
  ].join(',\n');
  // dấu hiệu cờ bạc / cá cược trong link, tên ảnh, alt
  const GAMB = /(bet|casino|cacuoc|ca-cuoc|gamebai|game-bai|nohu|no-hu|xoso|xo-so|lode|baccarat|jackpot|taixiu|tai-xiu|banca|ban-ca|rikvip|sunwin|hitclub|iwin|b52|789club|kubet|kuwin|[a-z]{1,6}88(?!\d)|\b\d{2,3}win|vin(?:club|win)|nhacai|nha-cai|keonhacai|choi-ngay|nap-ngay)/i;
  // trong đường dẫn / tên ảnh / chữ: chỉ tính khi đứng riêng thành 1 từ (tránh nhầm mã ảnh "…c5f88fd…", "ban-cau-co", "Elizabeth")
  const GAMBW = new RegExp('(?:^|[^a-z0-9])(?:' + GAMB.source.slice(1, -1) + ')(?![a-z0-9])', 'i');
  const hostOf = u => { try { return new URL(u, location.href).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const pathOf = u => { try { const x = new URL(u, location.href); return decodeURIComponent(x.pathname + ' ' + x.search); } catch { return String(u || ''); } };
  // tên miền: dò rộng (vsbet, cm88…) nhưng chỉ với trang khác; phần còn lại: dò theo từ
  const gambUrl = u => { const h = hostOf(u); return (h && h !== host && GAMB.test(h)) || GAMBW.test(pathOf(u)); };
  const SELF_GAMB = GAMB.test(host);   // đang vào chính trang cá cược: không đụng tới
  let style = null, on = false, hidCount = 0, mo = null;
  const css = () => SEL + ' { display: none !important; }';
  const apply = v => {
    on = v;
    if (on) {
      if (!style) { style = document.createElement('style'); style.id = 'hh-adhide'; (document.head || document.documentElement).appendChild(style); }
      style.textContent = css();
      startScan();
    } else {
      if (style) { style.remove(); style = null; }
      if (mo) { mo.disconnect(); mo = null; }
      if (pTimer) { clearInterval(pTimer); pTimer = null; }
      document.querySelectorAll('[data-hh-ad]').forEach(e => e.removeAttribute('data-hh-ad'));
    }
  };
  let S0 = {}, LOCK = false;   // V1.65: hết dùng thử chưa mua Pro (proLock) → không chặn
  const decide = s => { if (s) S0 = s; apply(S0.adBlock !== false && !LOCK); };   // không còn "tắt trên trang này": bật là chặn mọi trang
  chrome.storage.local.get(['settings', 'proLock']).then(({ settings = {}, proLock }) => { LOCK = !!proLock; decide(settings); }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, area) => { if (area !== 'local') return; if (ch.proLock) LOCK = !!ch.proLock.newValue; if (ch.settings || ch.proLock) decide(ch.settings ? ch.settings.newValue || {} : null); });

  // ---------- 2) tự nhận quảng cáo ----------
  // ⚠ không bao giờ ẩn trình phát phim: khung đang chứa <video>, khung trình phát quen thuộc, hoặc iframe phim lớn
  const PLAYER = /art-video-player|artplayer|jwplayer|video-js|plyr|dplayer|player-wrapper|video-player|fluid_video|mejs-container|clappr|shaka|bitmovin/i;
  const isPlayer = e => {
    if (e.tagName === 'VIDEO' || e.querySelector('video')) return true;
    const cls = (e.className && e.className.baseVal == null ? e.className : '') + ' ' + (e.id || '');
    if (PLAYER.test(cls) || e.querySelector('.art-video-player, .artplayer-app, .jwplayer, .video-js, .plyr, .dplayer')) return true;
    for (const f of e.querySelectorAll('iframe')) { const r = f.getBoundingClientRect(); if (r.width >= 400 && r.height >= 220 && !GAMB.test(f.src || '')) return true; }
    if (e.tagName === 'IFRAME') { const r = e.getBoundingClientRect(); if (r.width >= 400 && r.height >= 220 && !GAMB.test(e.src || '')) return true; }
    return false;
  };
  const mark = e => {
    if (!e || e === document.body || e === document.documentElement || e.hasAttribute('data-hh-ad') || e.closest('#hattieu-host')) return;
    if (isPlayer(e)) return;
    e.setAttribute('data-hh-ad', ''); hidCount++;
    // quảng cáo nằm trong lớp phủ tối toàn màn hình: ẩn luôn lớp phủ, nếu không trang bị che và bấm không được
    for (let p = e.parentElement, i = 0; p && p !== document.body && i < 6; p = p.parentElement, i++) {
      const cs = getComputedStyle(p);
      if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      const r = p.getBoundingClientRect();
      if (r.width >= innerWidth * 0.8 && r.height >= innerHeight * 0.8 && (p.innerText || '').trim().length < 3 && !p.querySelector('video')) { p.setAttribute('data-hh-ad', ''); hidCount++; unlockScroll(); break; }
    }
  };
  const unlockScroll = () => { for (const x of [document.body, document.documentElement]) if (x && getComputedStyle(x).overflow === 'hidden') x.style.setProperty('overflow', 'auto', 'important'); };
  // link ra trang khác (trừ link tiếp thị Shopee / TikTok: không bao giờ ẩn)
  const extCache = new Map();
  const extLink = a => {
    const href = a.href; let v = extCache.get(href);
    if (v === undefined) { try { const u = new URL(href, location.href), h = u.hostname.replace(/^www\./, ''); v = /^https?:$/.test(u.protocol) && h !== host && !AFF.test(h); } catch { v = false; } if (extCache.size > 4000) extCache.clear(); extCache.set(href, v); }
    return v;
  };
  const IAB = [[728, 90], [970, 90], [970, 250], [300, 250], [336, 280], [300, 600], [160, 600], [120, 600], [320, 50], [320, 100], [468, 60], [250, 250], [200, 200]];
  const iab = r => IAB.some(([w, h]) => Math.abs(r.width - w) <= 6 && Math.abs(r.height - h) <= 6);
  // leo lên khung bao ngoài cùng có cùng cỡ (để ẩn cả khung, không chừa ô trống)
  const outer = e => {
    let x = e; const r0 = e.getBoundingClientRect();
    while (x.parentElement && x.parentElement !== document.body) {
      const p = x.parentElement, r = p.getBoundingClientRect();
      if (Math.abs(r.width - r0.width) > 24 || Math.abs(r.height - r0.height) > 24) break;
      x = p;
    }
    return x;
  };
  // quét 1 vùng (cả trang lúc đầu, sau đó chỉ phần mới chèn vào) – nhẹ máy, không quét lại cả trang mỗi lần
  const within = (root, sel) => { const out = root.querySelectorAll ? [...root.querySelectorAll(sel)] : []; if (root.matches && root.matches(sel)) out.unshift(root); return out; };
  function checkLink(a) {
    if (a.hasAttribute('data-hh-ad') || !extLink(a)) return;
    const m = a.querySelector('img, video, iframe, picture, [style*="background"]');
    if (!m && !/background-image/.test(a.getAttribute('style') || '')) return;
    if (gambUrl(a.href) || (m && gambUrl(m.currentSrc || m.src || '')) || GAMBW.test((m && m.alt || '') + ' ' + (a.title || ''))) { mark(outer(a)); return; }
    const r = (m || a).getBoundingClientRect();
    if (!r.width && m && m.tagName === 'IMG' && !m.complete) { m.addEventListener('load', () => on && checkLink(a), { once: true }); return; }   // ảnh chưa tải: đợi có kích thước
    const wide = r.width >= 300 && r.height > 0 && r.width / r.height >= 3;   // banner ngang dẫn ra trang khác
    if (wide || iab(r)) mark(outer(a));
  }
  function scanBanners(root) {
    if (SELF_GAMB) return;
    for (const a of within(root, 'a[href]')) checkLink(a);
    // ảnh/gif banner cờ bạc không bọc link (bấm bằng JS); khung quảng cáo đúng cỡ chuẩn từ trang khác (iframe)
    for (const im of within(root, 'img, iframe')) {
      if (im.closest('[data-hh-ad]')) continue;
      if (gambUrl(im.currentSrc || im.src || '') || GAMBW.test(im.alt || '')) { mark(outer(im)); continue; }
      if (im.tagName === 'IFRAME') { try { const u = new URL(im.src, location.href); if (u.hostname && u.hostname.replace(/^www\./, '') !== host && !AFF.test(u.hostname) && !/youtube|vimeo|facebook\.com\/plugins|google\.com\/maps|recaptcha/.test(u.href) && iab(im.getBoundingClientRect())) mark(outer(im)); } catch {} }
    }
  }
  const CLOSE = /^\s*(đóng|tắt|dong|tat)\s*(qc|quảng cáo|quang cao|ads?)\b|^\s*(close|skip)\s*ads?\b|^\s*(đóng|close)\s*[x×✕]?\s*$/i;
  const CLOSE_HINT = /đóng|tắt|dong|tat|close|skip/i;
  // tìm nút "Đóng QC / Tắt QC" bằng cách duyệt chữ (nhanh hơn đọc từng thẻ)
  function scanPopups(root) {
    if (!root || root.nodeType !== 1) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.data.length <= 22 && CLOSE_HINT.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
    const seen = new Set();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      let b = n.parentElement;
      for (let k = 0; b && k < 2 && b.childElementCount <= 2; k++) { if (CLOSE.test((b.textContent || '').trim())) break; b = b.parentElement; }
      if (!b || seen.has(b) || !CLOSE.test((b.textContent || '').trim()) || b.closest('[data-hh-ad], #hattieu-host')) continue;
      seen.add(b);
      // khung chứa nút: tổ tiên gần nhất là lớp nổi (fixed/sticky) hoặc có ảnh / iframe quảng cáo
      let box = b.parentElement, pick = null;
      for (let i = 0; box && box !== document.body && i < 6; i++, box = box.parentElement) {
        const cs = getComputedStyle(box);
        if (cs.position === 'fixed' || cs.position === 'sticky') { pick = box; break; }
        if (!pick && box.querySelector('img, iframe, video')) pick = box;
      }
      if (pick) { mark(pick); dropBackdrop(); }
    }
  }
  // lớp phủ tối phía sau popup (fixed, che gần hết màn hình, không có chữ)
  function dropBackdrop() {
    const W = innerWidth, H = innerHeight;
    for (const e of document.querySelectorAll('body > *, body > * > *')) {
      if (e.hasAttribute('data-hh-ad') || e.closest('#hattieu-host')) continue;
      const cs = getComputedStyle(e); if (cs.position !== 'fixed') continue;
      const r = e.getBoundingClientRect();
      if (r.width >= W * 0.9 && r.height >= H * 0.9 && (e.innerText || '').trim().length < 3 && !e.querySelector('video')) mark(e);
    }
    if (getComputedStyle(document.body).overflow === 'hidden') document.body.style.setProperty('overflow', 'auto', 'important');
  }
  // ---------- 4) quảng cáo video trong trình phát phim (JW Player, Video.js, Plyr, trình phát tự làm) ----------
  const AD_VIDEO = '.jw-flag-ads video, .vjs-ad-playing video, .plyr--ad video, .ad-playing video, .ads-playing video, video[src*="vast"], video[src*="/ads/"], video[src*="preroll"], video[src*="quangcao"]';
  const SKIPTXT = /^\s*(bỏ qua|bo qua|skip)(\s*(quảng cáo|quang cao|qc|ads?))?\s*[»›>▶⏭→]*\s*$/i;
  const nearPlayer = e => { for (let x = e, i = 0; x && i < 7; x = x.parentElement, i++) { if (x.querySelector && x.querySelector('video, iframe')) return true; if (/player|video|jw|vjs|plyr|preroll|\bads?\b/i.test((x.className && x.className.baseVal == null ? x.className : '') + ' ' + (x.id || ''))) return true; } return false; };
  let pTimer = null, adMuted = new WeakSet();
  const VIDS = document.getElementsByTagName('video');   // danh sách tự cập nhật, đọc rất nhẹ
  const AD_BOX = '.jw-flag-ads, .vjs-ad-playing, .plyr--ad, .ad-playing, .ads-playing', AD_SRC = /vast|\/ads\/|preroll|quangcao/i;
  function skipPlayerAds() {
    if (!on || !VIDS.length) return;   // trang không có video: không làm gì
    // video quảng cáo: tắt tiếng, tua tới cuối
    for (const v of [...VIDS].filter(v => v.closest(AD_BOX) || AD_SRC.test(v.currentSrc || v.src || ''))) {
      if (!adMuted.has(v)) { adMuted.add(v); }
      if (!v.__hhNoted) { v.__hhNoted = 1; note('video', 1); }
      // mạnh tay: tắt tiếng + tua nhanh x16. Tua thẳng tới cuối CHỈ khi quảng cáo là thẻ video riêng (không phải thẻ đang chiếu phim):
      // nhiều trình phát (JW…) dùng chung 1 thẻ cho quảng cáo và phim, tua cuối ở đó làm phim đứng "Đang tải"
      v.muted = true; try { if (v.playbackRate < 16) v.playbackRate = 16; } catch {}
      const own = AD_SRC.test(v.currentSrc || v.src || '') || [...VIDS].some(x => x !== v && !x.closest(AD_BOX));
      if (own && isFinite(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.1) { try { v.currentTime = v.duration; } catch {} }
    }
    for (const v of VIDS) if (v.playbackRate >= 16 && !v.closest(AD_BOX) && !AD_SRC.test(v.currentSrc || v.src || '')) { try { v.playbackRate = 1; v.muted = false; } catch {} }   // hết quảng cáo: phim về tốc độ thường, bật lại tiếng
    // nút "Bỏ qua quảng cáo / Skip Ad": chỉ tìm trong khung trình phát, hiện là bấm ngay
    const players = VIDS;
    const boxes = new Set();
    for (const p of players) { let c = p.closest('.jwplayer, .video-js, .plyr') || p; for (let i = 0; i < 3 && c.parentElement && c.parentElement !== document.body; i++) c = c.parentElement; boxes.add(c); }
    for (const box of boxes) for (const b of box.querySelectorAll('.jw-skip, .vjs-ad-skip, .videoAdUiSkipButton, [class*="skip"], [id*="skip"], button, a, [role="button"], span, div')) {
      if (b.childElementCount > 3 || !b.offsetParent || b.disabled || b.getAttribute('aria-disabled') === 'true') continue;
      const cls = b.className && b.className.baseVal == null ? b.className : '';
      const byClass = /jw-skip|vjs-ad-skip|videoAdUiSkipButton|skip-?ad|btn-skip/i.test(cls);
      const t = byClass ? (b.textContent || '').trim() : (b.childElementCount ? '' : (b.textContent || '').trim());
      if (!byClass && (!t || t.length > 24 || !SKIPTXT.test(t))) continue;
      if (b.closest('#hattieu-host')) continue;
      if (/\d/.test(t) && !byClass) continue;   // "Bỏ qua sau 5 giây": chưa bấm được, đợi
      if (byClass && /\d/.test(t) && !/jw-skippable/.test(cls) && b.classList.contains('jw-skip')) continue;
      b.click(); note('video', 1);
    }
  }
  let tmr = 0, noted = 0, pend = new Set(), full = true;
  const note = (kind, n) => { try { chrome.runtime.sendMessage({ type: 'hh-ad-note', kind, n }).catch(() => {}); } catch {} };
  const scanAll = () => {
    tmr = 0; if (!on || !document.body) return;
    const before = hidCount, roots = full ? [document.body] : [...pend].filter(n => n.isConnected);
    full = false; pend.clear();
    try { for (const r of roots) { scanBanners(r); scanPopups(r); } } catch {}
    if (TOP && (hidCount !== before || roots[0] === document.body)) { let n = 0; try { n = document.querySelectorAll(SEL).length; } catch {} if (n > noted) { noted = n; note('page', n); } }
  };
  const fullScan = () => { full = true; scanAll(); };
  function startScan() {
    if (mo || !document.documentElement) return;
    const go = () => { fullScan(); [800, 2500, 6000].forEach(t => setTimeout(fullScan, t)); addEventListener('load', () => setTimeout(fullScan, 300), { once: true }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true }); else go();
    mo = new MutationObserver(recs => {
      for (const r of recs) for (const n of r.addedNodes) if (n.nodeType === 1 && n.id !== 'hattieu-host') { pend.add(n); }
      if (pend.size > 400) { pend.clear(); full = true; }
      if ((pend.size || full) && !tmr) tmr = setTimeout(scanAll, 400);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    if (!pTimer) pTimer = setInterval(skipPlayerAds, 100);
  }

  // đếm cho bảng HaoHao
  if (TOP) window.addEventListener('hh-ad-count', () => {
    let n = 0; try { n = on ? document.querySelectorAll(SEL).length : 0; } catch {}
    window.dispatchEvent(new CustomEvent('hh-ad-count-reply', { detail: { n, on } }));
  });
})();


// 🚫 1.10.21: bảng "Bạn đang chặn quảng cáo / Hãy tắt AdBlock" che kín trang → gỡ bảng + màn đen, mở lại cuộn trang
// (thư viện dò AdBlock như blockadblock.js đã bị chặn tận gốc trong rules/ads.json; đây là lớp dự phòng)
(() => {
  if (window.top !== window) return;
  const host = location.hostname.replace(/^www\./, '');
  if (/(^|\.)(shopee\.vn|shope\.ee|tiktok\.com|collshp\.com|youtube\.com|google\.[a-z.]+)$/.test(host)) return;
  const AAB = /(đang|bạn đang)\s*(sử dụng|dùng|bật|chặn)[^.]{0,30}(quảng cáo|adblock|ad ?block)|(tắt|vô hiệu hóa|vô hiệu hoá|disable|turn off|whitelist)[^.]{0,40}(adblock|ad ?blocker|trình chặn quảng cáo)|ad ?block(er)? (detected|is enabled)|you('re| are) using an? ad ?block/i;
  const KNOWN = '.jquery-adi, .jquery-adi_content, [class*="i-said-no-thing-can-stop-me"], #adblock-notice, .adblock-notice, .adblock-overlay, .adb-overlay, #adb-overlay, .fc-ab-root';
  const covers = e => { const r = e.getBoundingClientRect(); return r.width >= innerWidth * 0.6 && r.height >= innerHeight * 0.5; };
  let done = 0;
  function unlock() {
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      const s = getComputedStyle(el);
      if (s.overflow === 'hidden' || s.overflowY === 'hidden') el.style.setProperty('overflow', 'auto', 'important');
      if (s.filter && s.filter !== 'none') el.style.setProperty('filter', 'none', 'important');
      if (s.position === 'fixed') el.style.setProperty('position', 'static', 'important');
    }
    document.querySelectorAll('body > *').forEach(x => { const f = getComputedStyle(x).filter; if (f && /blur/.test(f)) x.style.setProperty('filter', 'none', 'important'); });
  }
  function kill() {
    if (!document.body) return;
    let hit = false;
    document.querySelectorAll(KNOWN).forEach(x => { x.remove(); hit = true; });
    for (const el of document.querySelectorAll('body div, body section, body aside, body dialog')) {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed' && s.position !== 'absolute') continue;
      if ((parseInt(s.zIndex) || 0) < 100 && s.position !== 'fixed') continue;
      if (!covers(el)) continue;
      const t = (el.innerText || '').slice(0, 600);
      if (!AAB.test(t)) continue;
      el.remove(); hit = true;
    }
    if (hit) {
      // màn đen phủ còn sót (cùng cỡ màn hình, không có chữ)
      document.querySelectorAll('body > div').forEach(x => { const s = getComputedStyle(x); if (s.position === 'fixed' && covers(x) && !(x.innerText || '').trim() && (parseInt(s.zIndex) || 0) > 1000) x.remove(); });
      unlock(); done++;
    }
  }
  const run = () => kill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  let n = 0; const t = setInterval(() => { run(); if (++n > 30) clearInterval(t); }, 500);
  new MutationObserver(() => { if (done < 20) run(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
