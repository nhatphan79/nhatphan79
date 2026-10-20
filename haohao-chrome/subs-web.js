// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🎬 Phụ đề song ngữ cho video trên các trang KHÁC YouTube (YouTube có subs.js riêng).
//  Nhóm A: video có file phụ đề chuẩn (textTracks / VTT) → lấy cả file có mốc giờ, Chrome dịch tạm + Gemini dịch chuẩn theo ngữ cảnh.
//  Nhóm B: trình phát tự vẽ phụ đề lên màn hình (không có file) → đọc câu đang hiện, Chrome dịch ngay, Gemini dịch lại (giới hạn để không hết lượt).
(() => {
  if (/(^|\.)youtube\.com$/.test(location.hostname)) return;
  // 1.10.116: trang mua bán (Shopee, TikTok, Lazada…) không dịch song ngữ, không hiện bong bóng
  const topHost = (() => { try { const ao = location.ancestorOrigins; return ao && ao.length ? new URL(ao[ao.length - 1]).hostname : location.hostname; } catch { return location.hostname; } })();
  if (/(^|\.)(shopee\.[a-z.]+|tiktok\.com|lazada\.[a-z.]+|tiki\.vn|sendo\.vn|amazon\.[a-z.]+|aliexpress\.[a-z.]+|temu\.com|shein\.com|taobao\.com|tmall\.com|1688\.com|ebay\.[a-z.]+|susercontent\.com|ibyteimg\.com|tiktokcdn[\w-]*\.com)$/.test(topHost) || /(^|\.)(shopee\.[a-z.]+|tiktok\.com|lazada\.[a-z.]+|tiki\.vn|sendo\.vn|amazon\.[a-z.]+|aliexpress\.[a-z.]+|temu\.com|shein\.com|taobao\.com|tmall\.com|1688\.com|ebay\.[a-z.]+|susercontent\.com|ibyteimg\.com|tiktokcdn[\w-]*\.com)$/.test(location.hostname)) return;
  const TOP = window.top === window;
  // video nằm trong khung nhúng (iframe) → nhờ nền chuyển lời nhắn lên trang chính (nơi có HaoHao)
  const emit = (ev, detail) => { if (TOP) window.dispatchEvent(new CustomEvent(ev, { detail })); else chrome.runtime.sendMessage({ type: 'subs-relay', ev, detail }).catch(() => {}); };
  const LANG = { en: 'Tiếng Anh', vi: 'Tiếng Việt', zh: 'Tiếng Trung', ja: 'Tiếng Nhật', ko: 'Tiếng Hàn', fr: 'Tiếng Pháp', de: 'Tiếng Đức', es: 'Tiếng Tây Ban Nha',
    ru: 'Tiếng Nga', th: 'Tiếng Thái', id: 'Tiếng Indonesia', pt: 'Tiếng Bồ Đào Nha', it: 'Tiếng Ý', hi: 'Tiếng Hindi' };
  const base = l => String(l || '').split('-')[0].toLowerCase();
  let settings = {}, on = false, S = null;   // S: video đang theo dõi
  const asked = new Set(), told = new Set(); let noSubAt = 0;
  const target = () => (settings.dich || {}).target || 'vi';
  // các khung phụ đề quen thuộc của trình phát phổ biến (nhóm B) + nhận dạng chung theo tên lớp
  const CAP_SEL = ['.vjs-text-track-display', '.jw-captions', '.jw-text-track-container', '.plyr__captions', '.shaka-text-container',
    '.bmpui-ui-subtitle-overlay', '.vp-captions', '[data-testid*="caption" i]', '[class*="caption" i]', '[class*="subtitle" i]'].join(',');

  const css = document.createElement('style');
  css.textContent = `
  #hh-wsubs { position: fixed; z-index: 2147483646; display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: none; text-align: center; }
  #hh-wsubs .l { display: inline-block; max-width: 92%; background: rgba(8,8,8,.74); border-radius: 6px; padding: 2px 10px; line-height: 1.35; font-family: Roboto, Arial, sans-serif; text-shadow: 0 1px 2px #000; }
  #hh-wsubs .o { color: #fff; } #hh-wsubs .t { color: #ffe066; } #hh-wsubs .t.tmp { opacity: .8; } #hh-wsubs .l:empty { display: none; }
  .hh-cap-hide { visibility: hidden !important; }`;
  (document.head || document.documentElement).append(css);

  // ---------- dịch ----------
  const trPool = new Map();
  async function chromeTr(src, to) {
    if (typeof self.Translator === 'undefined' || !src) return null;
    const k = src + '>' + to;
    if (!trPool.has(k)) trPool.set(k, (async () => {
      const a = await self.Translator.availability({ sourceLanguage: src, targetLanguage: to });
      return a === 'unavailable' ? null : self.Translator.create({ sourceLanguage: src, targetLanguage: to });
    })().catch(() => null));
    return trPool.get(k);
  }
  async function detect(text) {
    try {
      if (typeof self.LanguageDetector !== 'undefined') {
        const d = await self.LanguageDetector.create(); const r = await d.detect(String(text).slice(0, 1000));
        if (r && r[0] && r[0].detectedLanguage !== 'und' && r[0].confidence > 0.5) return base(r[0].detectedLanguage);
      }
    } catch {}
    try { const r = await chrome.i18n.detectLanguage(String(text).slice(0, 1000)); const l = r && r.languages && r.languages[0]; if (l && l.language !== 'und') return base(l.language); } catch {}
    return '';
  }
  // V1.86: dòng dịch tạm lấy Google Dịch (nhanh, không cần mã); Gemini vẫn dịch lại cho chuẩn
  const gtr = lines => chrome.runtime.sendMessage({ type: 'g-translate', q: lines, tl: target() }).then(r => r && r.ok && Array.isArray(r.items) && r.items.length === lines.length ? r : null).catch(() => null);
  const ai = (lines, ctx) => chrome.runtime.sendMessage({ type: 'ai-subs', lines, ctx, title: document.title, to: target() }).catch(() => null);

  // ---------- tìm video & phụ đề ----------
  // tìm cả trong "shadow DOM" (nhiều trình phát giấu video/phụ đề bên trong)
  function deepAll(sel, root = document, out = []) {
    out.push(...root.querySelectorAll(sel));
    for (const e of root.querySelectorAll('*')) if (e.shadowRoot) deepAll(sel, e.shadowRoot, out);
    return out;
  }
  // phần video đang thấy trên màn hình (px²)
  function seen(v) {
    const r = v.getBoundingClientRect();
    if (r.width < 200 || r.height < 110) return 0;
    const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function mainVideo() {
    // đang theo một video còn chạy và còn thấy hơn nửa → giữ nguyên (trang như X tự phát nhiều video khi cuộn)
    if (S && S.v && S.v.isConnected && !S.v.paused) { const r = S.v.getBoundingClientRect(); if (seen(S.v) > 0.5 * r.width * r.height) return S.v; }
    let best = null, score = 0;
    for (const v of deepAll('video')) {
      const sc = seen(v) * (v.paused ? 1 : 100);   // ưu tiên video đang chạy, thấy rõ nhất
      if (sc > score) { score = sc; best = v; }
    }
    return best;
  }
  function pickTrack(v) {
    const ts = [...(v.textTracks || [])].filter(t => /subtitles|captions/.test(t.kind));
    return ts.find(t => t.mode === 'showing') || ts[0] || null;
  }
  function capBox(v) {
    let p = v.parentElement;
    for (let i = 0; p && i < 5; i++, p = p.parentElement) {
      const c = deepAll(CAP_SEL, p).filter(e => e !== v && !e.closest('#hh-wsubs') && !e.querySelector('video') && !/^(BUTTON|svg|path)$/i.test(e.tagName));
      if (c.length) return c.sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)[0];
    }
    return null;
  }

  // ---------- hiển thị ----------
  function box() {
    let d = document.getElementById('hh-wsubs');
    if (!d) { d = document.createElement('div'); d.id = 'hh-wsubs'; d.innerHTML = '<div class="l o"></div><div class="l t"></div>'; }
    const host = document.fullscreenElement || document.body;
    if (d.parentElement !== host) host.append(d);
    return d;
  }
  function place(d, v) {
    const r = v.getBoundingClientRect(), fs = Math.max(13, Math.min(26, r.width / 38));
    d.style.display = r.bottom < 40 || r.top > innerHeight - 40 || r.width < 50 ? 'none' : '';   // video cuộn khuất → ẩn phụ đề
    d.style.left = r.left + 'px'; d.style.width = r.width + 'px'; d.style.top = 'auto';
    d.style.bottom = Math.max(0, innerHeight - r.bottom + r.height * 0.1) + 'px';
    d.querySelectorAll('.l').forEach(x => { x.style.fontSize = fs + 'px'; });
  }
  function show(v, o, t, tmp) {
    const d = box(); place(d, v);
    const a = d.querySelector('.o'), b = d.querySelector('.t');
    if (a.textContent !== o) a.textContent = o; if (b.textContent !== (t || '')) b.textContent = t || '';
    b.classList.toggle('tmp', !!tmp);
  }
  function clear() { const d = document.getElementById('hh-wsubs'); if (d) d.remove(); document.querySelectorAll('.hh-cap-hide').forEach(e => e.classList.remove('hh-cap-hide')); }
  const status = msg => { if (S) S.msg = msg; emit('hh-subs-status', { on, msg, web: true }); };

  // ---------- nhóm A: có file phụ đề ----------
  async function runTrack(st) {
    const tr = st.track; if (tr.mode === 'disabled') tr.mode = 'hidden';
    if (on && tr.mode === 'showing') tr.mode = 'hidden';   // tắt chữ của trình phát, HaoHao vẽ 2 dòng
    const cues = st.cues = []; const seen = new Set();
    const sync = () => {
      for (const c of [...(tr.cues || [])]) {
        const k = c.startTime + '|' + c.text; if (seen.has(k)) continue; seen.add(k);
        const o = String(c.text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); if (!o) continue;
        cues.push({ s: c.startTime, e: c.endTime, o });
      }
      cues.sort((a, b) => a.s - b.s);
    };
    sync(); tr.addEventListener('cuechange', sync);
    const sample = cues.slice(0, 20).map(c => c.o).join(' ');
    st.lang = base(tr.language) || await detect(sample);
    if (!st.lang && sample) { const r = await gtr([sample.slice(0, 1500)]); if (r && r.lang) st.lang = base(r.lang); }
    return cues.length > 0 || !!tr.cues;
  }
  async function transA(st) {
    let t, busy = false, last = 0, gBusy = false, gOff = false;
    st.tick = async () => {
      const v = st.v, now = v.currentTime;
      // Google dịch tạm cả gói câu sắp tới (1 phút tới); Google lỗi thì nhờ bộ dịch Chrome
      const soon = st.cues.filter(c => !c.t && !c.q && c.e >= now - 1 && c.s <= now + 60);
      if (soon.length && !gOff && !gBusy) {
        gBusy = true; soon.forEach(c => c.q = 1);
        gtr(soon.map(c => c.o)).then(r => { if (r) soon.forEach((c, i) => { if (!c.ai && r.items[i]) c.t = r.items[i]; }); else { gOff = true; soon.forEach(c => c.q = 0); } }).finally(() => { gBusy = false; });
      } else if (soon.length && gOff) {
        if (t === undefined) t = await chromeTr(st.lang, target());
        if (t) for (const c of soon) { c.q = 1; t.translate(c.o).then(x => { if (!c.ai) c.t = x; }).catch(() => {}); }
      }
      // Gemini dịch chuẩn theo gói, ưu tiên đoạn đang xem
      if (busy || Date.now() - last < 1500) return;
      const todo = st.cues.filter(c => !c.ai && !c.g && c.e >= now - 2).slice(0, 50); if (!todo.length) return;
      busy = true; last = Date.now(); todo.forEach(c => c.g = 1);
      const i0 = st.cues.indexOf(todo[0]);
      const r = await ai(todo.map(c => c.o), st.cues.slice(Math.max(0, i0 - 4), i0).map(c => c.o));
      if (r && r.ok && r.lines && r.lines.length === todo.length) todo.forEach((c, i) => { c.t = r.lines[i]; c.ai = true; });
      else { todo.forEach(c => c.g = 0); if (r && r.error === 'nokey') st.noKey = true; last = Date.now() + 8000; }
      busy = false;
      const n = st.cues.length, k = st.cues.filter(c => c.ai).length;
      status(st.noKey ? 'Chưa có mã Gemini nên đang dùng Google Dịch' : k >= n ? 'Đã dịch chuẩn' : 'Đang dịch chuẩn… ' + Math.round(100 * k / n) + '%');
    };
  }
  function drawA(st) {
    const now = st.v.currentTime, c = st.cues.find(x => x.s <= now && now < x.e);
    show(st.v, c ? c.o : '', c ? c.t : '', c && !c.ai);
  }

  // ---------- nhóm B: phụ đề vẽ trên màn hình ----------
  function setupB(st) {
    st.lines = []; st.cur = null; st.lastAi = 0; st.aiBusy = false;
    st.readB = () => {
      if (!st.cap || !st.cap.isConnected) st.cap = capBox(st.v);
      if (!st.cap) return '';
      return (st.cap.innerText || st.cap.textContent || '').replace(/\s+/g, ' ').trim();
    };
  }
  async function stepB(st) {
    const txt = st.readB();
    if (on && st.cap) st.cap.classList.add('hh-cap-hide');
    if (!txt) { st.cur = null; show(st.v, '', ''); return; }
    if (!st.cur || st.cur.o !== txt) {
      st.cur = st.lines.find(l => l.o === txt) || { o: txt };
      if (!st.lines.includes(st.cur)) { st.lines.push(st.cur); if (st.lines.length > 200) st.lines.shift(); }
      const c = st.cur;
      if (!c.t) gtr([c.o]).then(async r => {
        if (r) { if (!c.ai) c.t = r.items[0]; return; }
        const t = await chromeTr(st.lang, target()); if (t) t.translate(c.o).then(x => { if (!c.ai) c.t = x; }).catch(() => {});
      });
      // Gemini dịch lại cho chuẩn: tối đa 1 câu / 4 giây (giữ lượt miễn phí)
      if (!c.ai && !st.aiBusy && Date.now() - st.lastAi > 4000 && !st.noKey) {
        st.aiBusy = true; st.lastAi = Date.now();
        const i = st.lines.indexOf(c);
        ai([c.o], st.lines.slice(Math.max(0, i - 3), i).map(l => l.o)).then(r => {
          if (r && r.ok && r.lines && r.lines[0]) { c.t = r.lines[0]; c.ai = true; } else if (r && r.error === 'nokey') { st.noKey = true; status('Chưa có mã Gemini nên đang dùng Google Dịch'); }
        }).finally(() => { st.aiBusy = false; });
      }
    }
    show(st.v, st.cur.o, st.cur.t, !st.cur.ai);
  }

  // ---------- vòng chính ----------
  async function begin(v) {
    const st = S = { v, src: v.currentSrc || location.href, kind: '', lang: '', msg: '' };
    // chờ phụ đề xuất hiện: có file phụ đề (A) hoặc chữ phụ đề trên màn hình (B).
    // Phụ đề đang tắt → HaoHao nhắc khách bấm CC trên video (mỗi video 1 lần), bật lên là dịch ngay.
    const t0 = Date.now(), tried = new Set(); let hinted = false;
    while (S === st) {
      const tr = pickTrack(v);
      if (tr && !tried.has(tr)) { tried.add(tr); st.kind = 'A'; st.track = tr; if (await runTrack(st)) break; st.kind = ''; }
      const cap = capBox(v), txt = cap ? (cap.innerText || '').trim() : '';
      if (txt) { st.kind = 'B'; setupB(st); st.cap = cap; break; }
      if (!hinted && on && !v.paused && Date.now() - t0 > 4000) {
        hinted = true;
        // có khung phụ đề / có danh sách phụ đề mà chưa hiện chữ → phụ đề đang tắt; không có gì cả → video không có phụ đề
        const hasSub = !!cap || [...(v.textTracks || [])].some(t => /subtitles|captions/.test(t.kind));
        if (hasSub) {
          status('Phụ đề của video đang tắt: bấm nút CC trên video để HaoHao dịch');
          if (!asked.has('hint:' + st.src)) { asked.add('hint:' + st.src); emit('hh-subs-hint', {}); }
        } else {
          status('Video này không có phụ đề, HaoHao chưa dịch được (sắp có ở bản Pro)');
          if (Date.now() - noSubAt > 10 * 60e3) { noSubAt = Date.now(); emit('hh-subs-nosub', {}); }   // nhắc tối đa 10 phút/lần, tránh làm phiền khi lướt nhiều video
        }
      }
      await new Promise(z => setTimeout(z, 1000));
    }
    if (S !== st) return;
    if (st.kind === 'B') {
      // đợi có vài câu để nhận diện ngôn ngữ
      let acc = ''; for (let i = 0; i < 40 && acc.length < 60 && S === st; i++) { const x = st.readB(); if (x && !acc.includes(x)) acc += ' ' + x; await new Promise(z => setTimeout(z, 500)); }
      st.lang = await detect(acc);
      if (!st.lang && acc.trim()) { const r = await gtr([acc.trim()]); if (r && r.lang) st.lang = base(r.lang); }   // máy không tự nhận được → hỏi Google
    }
    if (S !== st) return;
    if (!st.lang || st.lang === base(target())) { st.skip = true; status(st.lang ? 'Video đã là ' + (LANG[st.lang] || st.lang) + ', không cần dịch' : 'Chưa nhận ra ngôn ngữ của phụ đề'); return; }
    const key = st.src;
    if (!on) {   // chưa bật → HaoHao mời
      if (!asked.has(key)) { asked.add(key); emit('hh-subs-offer', { from: LANG[st.lang] || st.lang.toUpperCase(), to: LANG[base(target())] || target() }); }
      return;
    }
    if (!told.has(key)) { told.add(key); emit('hh-subs-active', { from: LANG[st.lang] || st.lang, to: LANG[base(target())] || target() }); }
    if (st.kind === 'A') { if (st.track.mode === 'showing') st.track.mode = 'hidden'; await transA(st); status('Đang dịch…'); }
    else status('Đang dịch từng câu');
    st.ready = true;
  }
  let stepping = false;
  setInterval(async () => {
    const v = mainVideo();
    if (!v || v.paused && !S) return;
    if (!S || S.v !== v || (v.currentSrc && S.src !== v.currentSrc)) { clear(); if (!v.paused) begin(v); return; }
    if (!on || !S.ready || S.skip) return;
    if (S.kind === 'A') { drawA(S); if (S.tick && !stepping) { stepping = true; S.tick().finally(() => { stepping = false; }); } }
    else if (S.kind === 'B' && !stepping) { stepping = true; stepB(S).finally(() => { stepping = false; }); }
  }, 200);

  function apply(want) {
    if (want === on) return; on = want;
    if (!on) { if (S && S.track && S.track.mode === 'hidden') S.track.mode = 'showing'; S = null; clear(); }
    else { if (S) told.add(S.src); S = null; }   // bật lại → bắt đầu lại với video đang xem
  }
  window.addEventListener('hh-subs-turn', e => {
    const want = !!(e.detail || {}).on;
    chrome.storage.local.get('settings').then(({ settings: s = {} }) => { s.subs = { ...(s.subs || {}), on: want }; chrome.storage.local.set({ settings: s }); });
    apply(want);
  });
  chrome.storage.local.get('settings').then(({ settings: s = {} }) => { settings = s; on = !!(s.subs || {}).on; });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local' || !ch.settings) return;
    const oldT = target(); settings = ch.settings.newValue || {};
    apply(!!(settings.subs || {}).on);
    if (target() !== oldT) { S = null; clear(); }
  });
})();
