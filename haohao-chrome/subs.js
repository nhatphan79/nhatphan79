// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🈯 Phụ đề song ngữ cho video YouTube: dòng trên tiếng gốc, dòng dưới ngôn ngữ chọn dịch (mục Dịch).
// Lấy cả file phụ đề của video (có mốc giờ từng câu) → dịch tạm bằng Chrome (tức thì) → Gemini dịch lại cả bài theo ngữ cảnh cho chuẩn.
(() => {
  if (window.top !== window || !/(^|\.)youtube\.com$/.test(location.hostname)) return;
  const TAG = '__hhsub';
  const LANG = { en: 'Tiếng Anh', vi: 'Tiếng Việt', zh: 'Tiếng Trung', ja: 'Tiếng Nhật', ko: 'Tiếng Hàn', fr: 'Tiếng Pháp', de: 'Tiếng Đức', es: 'Tiếng Tây Ban Nha',
    ru: 'Tiếng Nga', th: 'Tiếng Thái', id: 'Tiếng Indonesia', pt: 'Tiếng Bồ Đào Nha', it: 'Tiếng Ý', hi: 'Tiếng Hindi' };
  const base = l => String(l || '').split('-')[0].toLowerCase();
  let settings = {}, on = false, S = null; const told = new Set(); let lastMsg = null, noSubAt = 0;   // S: trạng thái của video đang xem
  const target = () => (settings.dich || {}).target || 'vi';

  // ---------- giao diện ----------
  const css = document.createElement('style');
  css.textContent = `
  html.hh-subs-on .ytp-caption-window-container { display: none !important; }
  #hh-subs { position: absolute; left: 0; right: 0; bottom: 9%; z-index: 60; display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: none; text-align: center; padding: 0 6%; }
  .ytp-autohide #hh-subs { bottom: 4%; }
  #hh-subs .l { display: inline-block; max-width: 100%; background: rgba(8,8,8,.72); border-radius: 6px; padding: 2px 10px; line-height: 1.35; font-family: Roboto, Arial, sans-serif; text-shadow: 0 1px 2px #000; }
  #hh-subs .o { color: #fff; font-size: clamp(14px, 2.1vw, 26px); }
  #hh-subs .t { color: #ffe066; font-size: clamp(14px, 2.1vw, 26px); }
  #hh-subs .t.tmp { opacity: .8; }
  #hh-subs .l:empty { display: none; }
  #hh-subs .w { color: #fff; font-size: clamp(13px, 1.6vw, 20px); background: rgba(35,48,94,.9); }
  .hh-sub-btn { width: auto !important; padding: 0 6px !important; display: inline-flex !important; align-items: center; justify-content: center; vertical-align: top; }
  .hh-sub-btn span { font: 700 12px/1 Roboto, Arial, sans-serif; color: #fff; border: 1.6px solid #fff; border-radius: 5px; padding: 3px 5px; letter-spacing: .3px; }
  .hh-sub-btn.on span { background: #ffe066; color: #222; border-color: #ffe066; }
  .hh-sub-btn .tip { display: none; }`;
  (document.head || document.documentElement).append(css);

  function button() {
    const bar = document.querySelector('#movie_player .ytp-right-controls'); if (!bar) return;
    let b = bar.querySelector('.hh-sub-btn');
    if (!b) {
      b = document.createElement('button'); b.className = 'ytp-button hh-sub-btn'; b.innerHTML = '<span>Song ngữ</span>';
      b.addEventListener('click', e => { e.stopPropagation(); toggle(); });
      bar.prepend(b);
    }
    b.classList.toggle('on', on);
    const msg = S && S.msg || ''; if (msg !== lastMsg) { lastMsg = msg; window.dispatchEvent(new CustomEvent('hh-subs-status', { detail: { on, msg } })); }
    b.title = on ? (S && S.msg ? 'HaoHao: ' + S.msg : 'Tắt phụ đề song ngữ HaoHao') : 'Bật phụ đề song ngữ HaoHao (gốc + ' + (LANG[target()] || target()) + ')';
  }
  function box() {
    const p = document.getElementById('movie_player'); if (!p) return null;
    let d = p.querySelector('#hh-subs');
    if (!d) { d = document.createElement('div'); d.id = 'hh-subs'; d.innerHTML = '<div class="l o"></div><div class="l t"></div>'; p.append(d); }
    return d;
  }
  function clearBox() { const d = document.getElementById('hh-subs'); if (d) d.remove(); }

  // ---------- đọc file phụ đề ----------
  function parse(body, asr) {
    let ev = [];
    try {
      const j = JSON.parse(body);
      ev = (j.events || []).filter(e => e.segs && !e.aAppend).map(e => ({ s: e.tStartMs || 0, d: e.dDurationMs || 0, segs: e.segs }));
    } catch {
      // định dạng XML (srv3 / srv1)
      const x = new DOMParser().parseFromString(body, 'text/xml');
      ev = [...x.querySelectorAll('p, text')].map(p => {
        const s = +(p.getAttribute('t') || Math.round(parseFloat(p.getAttribute('start') || 0) * 1000));
        const d = +(p.getAttribute('d') || Math.round(parseFloat(p.getAttribute('dur') || 0) * 1000));
        const ss = [...p.querySelectorAll('s')];
        return { s, d, segs: ss.length ? ss.map(z => ({ utf8: z.textContent, tOffsetMs: +(z.getAttribute('t') || 0) })) : [{ utf8: p.textContent }] };
      });
    }
    const clean = t => String(t || '').replace(/\s+/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
    if (!asr) {
      return ev.map(e => ({ s: e.s, e: e.s + (e.d || 2500), o: clean(e.segs.map(x => x.utf8).join('')) })).filter(c => c.o && !/^\[[^\]]*\]$/.test(c.o));
    }
    // phụ đề tự động: vụn từng vài chữ → ghép lại thành câu cho dễ đọc, dịch đúng hơn
    const words = [];
    for (const e of ev) for (const g of e.segs) { const w = clean(g.utf8); if (w) words.push({ t: e.s + (g.tOffsetMs || 0), w }); }
    words.sort((a, b) => a.t - b.t);
    const out = []; let cur = null;
    for (let i = 0; i < words.length; i++) {
      const w = words[i], prev = words[i - 1];
      const brk = !cur || (prev && w.t - prev.t > 1200) || cur.n >= 14 || (cur.n >= 5 && /[.?!]$/.test(prev.w));
      if (brk) { if (cur) out.push(cur); cur = { s: w.t, o: w.w, n: 1, last: w.t }; }
      else { cur.o += ' ' + w.w; cur.n++; cur.last = w.t; }
    }
    if (cur) out.push(cur);
    out.forEach((c, i) => { const nx = out[i + 1]; c.e = Math.min(nx ? nx.s : Infinity, c.last + 1800); delete c.n; delete c.last; });
    return out.filter(c => !/^\[[^\]]*\]$/.test(c.o));
  }

  // ---------- dịch ----------
  let trPool = new Map();
  async function chromeTr(src, to) {
    if (typeof self.Translator === 'undefined') return null;
    const k = src + '>' + to;
    if (!trPool.has(k)) trPool.set(k, (async () => {
      const a = await self.Translator.availability({ sourceLanguage: src, targetLanguage: to });
      if (a === 'unavailable') return null;
      return self.Translator.create({ sourceLanguage: src, targetLanguage: to });
    })().catch(() => null));
    return trPool.get(k);
  }
  const order = (n, from) => [...Array(n).keys()].sort((a, b) => ((a < from) - (b < from)) || (a - b));   // ưu tiên đoạn đang xem trở về sau
  async function translateAll(st) {
    const video = document.querySelector('#movie_player video');
    const now = () => { const t = (video ? video.currentTime : 0) * 1000; const i = st.cues.findIndex(c => c.e > t); return i < 0 ? 0 : i; };
    const key = 'hhsub:' + st.v + ':' + st.lang + '>' + st.to;
    // đã dịch chuẩn video này rồi → dùng lại luôn
    const got = await chrome.storage.local.get(key).catch(() => ({}));
    if (got[key] && got[key].length === st.cues.length) { got[key].forEach((t, i) => { st.cues[i].t = t; st.cues[i].ai = true; }); st.msg = 'Đã dịch chuẩn'; button(); return; }
    // 1) Chrome dịch tạm (tức thì, chạy trên máy) để có chữ ngay
    const tr = await chromeTr(st.lang, st.to);
    const quick = (async () => {
      if (!tr) return;
      const idx = order(st.cues.length, now());
      for (let i = 0; i < idx.length && S === st; i += 12)
        await Promise.all(idx.slice(i, i + 12).map(async k => { const c = st.cues[k]; if (c.ai) return; try { const t = await tr.translate(c.o); if (!c.ai) c.t = t; } catch {} }));
    })();
    // 2) Gemini dịch lại cả bài theo ngữ cảnh (chuẩn hơn), từng gói 60 câu, bắt đầu từ đoạn đang xem
    const from = now(), N = st.cues.length, B = 60, starts = [];
    for (let s = Math.floor(from / B) * B; s < N; s += B) starts.push(s);
    for (let s = 0; s < Math.floor(from / B) * B; s += B) starts.push(s);
    let okAll = true, noKey = false;
    for (const s of starts) {
      if (S !== st) return;
      const lines = st.cues.slice(s, s + B).map(c => c.o);
      const ctx = st.cues.slice(Math.max(0, s - 4), s).map(c => c.o);
      let r = null; try { r = await chrome.runtime.sendMessage({ type: 'ai-subs', lines, ctx, title: st.title, from: st.lang, to: st.to }); } catch {}
      if (r && r.ok && Array.isArray(r.lines) && r.lines.length === lines.length) r.lines.forEach((t, i) => { const c = st.cues[s + i]; c.t = t; c.ai = true; });
      else { okAll = false; if (r && r.error === 'nokey') { noKey = true; break; } }
      st.msg = 'Đang dịch chuẩn… ' + Math.round(100 * st.cues.filter(c => c.ai).length / N) + '%'; button();
    }
    await quick;
    if (okAll && S === st) { st.msg = 'Đã dịch chuẩn'; chrome.storage.local.set({ [key]: st.cues.map(c => c.t || '') }).catch(() => {}); pruneCache(); }
    else if (S === st) st.msg = noKey ? 'Chưa có mã Gemini nên đang dùng bản dịch nhanh của Chrome' : 'Một phần đang dùng bản dịch nhanh của Chrome';
    button();
  }
  async function pruneCache() {
    const all = await chrome.storage.local.get(null).catch(() => ({}));
    const ks = Object.keys(all).filter(k => k.startsWith('hhsub:'));
    if (ks.length > 20) chrome.storage.local.remove(ks.slice(0, ks.length - 20)).catch(() => {});
  }

  // ---------- 🎙️ V1.6.3: video không có phụ đề – Gemini nghe TRƯỚC từng đoạn 2 phút rồi mới phát, phụ đề khớp đúng câu ----------
  const CH = 120, vid = () => document.querySelector('#movie_player video');
  async function listen(st) {
    const v = vid(); if (!v) return;
    if (!isFinite(v.duration) || v.duration <= 0) { st.msg = 'Video trực tiếp chưa dịch được'; button(); return; }
    st.ai = true; st.to = target(); st.cues = []; st.at = -1; st.chunks = {}; st.held = false; st.key = 'hhai:' + st.v + '>' + st.to;
    const got = await chrome.storage.local.get(st.key).catch(() => ({})), c0 = got[st.key];
    if (c0 && c0.chunks) { st.chunks = Object.fromEntries(Object.keys(c0.chunks).map(k => [k, 'ok'])); st.cues = Object.values(c0.chunks).flat().sort((a, b) => a.s - b.s).map(c => ({ ...c, ai: true })); st.lang = c0.lang || ''; }
    st.msg = 'HaoHao nghe & dịch video không phụ đề'; button();
    aiLoop(st);
  }
  function hold(st, v, why, k) { st.wait = why; if (st.heldFor === k || v.paused) return; st.heldFor = k; v.pause(); st.held = true; st.back = Math.max(0, v.currentTime - 2); }   // mỗi đoạn chỉ dừng 1 lần – khách tự bấm phát thì để phát   // mỗi đoạn chỉ dừng 1 lần – khách tự bấm phát thì để phát
  async function getChunk(st, k) {
    const v = vid(); if (!v || st.chunks[k] === 'run' || st.chunks[k] === 'ok' || st.chunks[k] === 'none') return;
    if (st.chunks[k] && st.chunks[k].err > 1 && Date.now() - st.chunks[k].at < 60e3) return;   // lỗi 2 lần → đợi 1 phút mới thử lại
    const prev = st.chunks[k]; st.chunks[k] = 'run';
    const from = k * CH, to = Math.min((k + 1) * CH, Math.ceil(v.duration));
    let r = null; try { r = await chrome.runtime.sendMessage({ type: 'ai-listen', v: st.v, from, to, title: st.title, lang: st.to }); } catch {}
    if (S !== st) return;
    if (r && r.ok) {
      if (r.lang && base(r.lang) === base(st.to) && k === Math.floor((vid() || v).currentTime / CH)) { st.chunks[k] = 'none'; st.msg = 'Video đã là ' + (LANG[base(st.to)] || st.to) + ', không cần dịch'; st.wait = ''; st.stop = true; release(st); button(); return; }
      st.lang = st.lang || r.lang;
      st.cues = st.cues.filter(c => c.s < from * 1000 || c.s >= to * 1000).concat(r.cues.map(c => ({ ...c, ai: true }))).sort((a, b) => a.s - b.s); st.at = -1;
      st.chunks[k] = r.cues.length ? 'ok' : 'none';
      const all = {}; st.cues.forEach(c => { const kk = Math.floor(c.s / 1000 / CH); (all[kk] = all[kk] || []).push({ s: c.s, e: c.e, o: c.o, t: c.t }); });
      chrome.storage.local.set({ [st.key]: { lang: st.lang, chunks: all } }).then(pruneAi).catch(() => {});
      if (!told.has(st.v)) { told.add(st.v); window.dispatchEvent(new CustomEvent('hh-subs-active', { detail: { from: LANG[base(st.lang)] || st.lang || 'tiếng nước ngoài', to: LANG[base(st.to)] || st.to } })); }
    } else {
      const err = (r && r.error) || '';
      st.chunks[k] = { err: ((prev && prev.err) || 0) + 1, at: Date.now() };
      if (err === 'nokey' || err === 'badkey') { st.stop = true; st.wait = ''; st.msg = 'Cần mã Gemini (Cài đặt → AI) để HaoHao nghe video không phụ đề'; release(st); button(); return; }
      if (st.chunks[k].err > 1) { st.wait = ''; st.msg = err === 'quota' ? 'Gemini hết lượt hôm nay – thử lại sau' : 'HaoHao chưa nghe được đoạn này, sẽ thử lại'; release(st); }
    }
    button();
  }
  function release(st) { const v = vid(); st.wait = ''; if (st.held && v) { st.held = false; if (st.back != null) v.currentTime = st.back; v.play().catch(() => {}); } }
  async function aiLoop(st) {
    while (S === st && on && !st.stop) {
      const v = vid();
      if (v && isFinite(v.duration)) {
        const t = v.currentTime, k = Math.floor(t / CH), st0 = st.chunks[k], last = Math.floor((v.duration - 0.5) / CH);
        if (st0 === 'ok' || st0 === 'none') { if (st.held) release(st); else st.wait = ''; }
        else { const first = !Object.values(st.chunks).some(x => x === 'ok' || x === 'none'); if (!(st0 && st0.err > 1)) hold(st, v, first ? '🎙️ HaoHao đang nghe & dịch đoạn đầu… (khoảng 10–20 giây)' : '🎙️ HaoHao đang nghe & dịch đoạn này…', k); getChunk(st, k); }
        if ((st0 === 'ok' || st0 === 'none') && k < last && t > k * CH + 20) getChunk(st, k + 1);   // xem tới đâu thì dịch trước đoạn kế tiếp
      }
      await new Promise(z => setTimeout(z, 700));
    }
  }
  async function pruneAi() {
    const all = await chrome.storage.local.get(null).catch(() => ({}));
    const ks = Object.keys(all).filter(k => k.startsWith('hhai:'));
    if (ks.length > 30) chrome.storage.local.remove(ks.slice(0, ks.length - 30)).catch(() => {});
  }

  // ---------- chạy theo video ----------
  function render() {
    if (!on || !S || !S.cues) return;
    const v = document.querySelector('#movie_player video'); if (!v) return;
    const t = v.currentTime * 1000;
    let c = S.cues[S.at] && S.cues[S.at].s <= t && t < S.cues[S.at].e ? S.cues[S.at] : null;
    if (!c) { const i = S.cues.findIndex(x => x.s <= t && t < x.e); S.at = i; c = i >= 0 ? S.cues[i] : null; }
    const d = box(); if (!d) return;
    const o = d.querySelector('.o'), tt = d.querySelector('.t');
    let ot = c ? c.o : '', trt = c ? (c.t || '') : '';
    if (!c && S.ai && S.wait) { ot = S.wait; trt = ''; }
    o.classList.toggle('w', !c && !!(S.ai && S.wait));
    if (o.textContent !== ot) o.textContent = ot;
    if (tt.textContent !== trt) tt.textContent = trt;
    tt.classList.toggle('tmp', !!(c && !c.ai));
  }
  setInterval(render, 150);

  window.addEventListener('message', e => {
    const d = e.data; if (e.source !== window || !d || !d[TAG]) return;
    if (d[TAG] === 'tracks' && S && !S.lang && d.v === S.v) pick(d);
    if (d[TAG] === 'tracks' && P && P.v === d.v && !P.done) offer(d);
    if (d[TAG] === 'data' && S && S.v === d.v && S.lang && !S.cues && new RegExp('[?&]lang=' + S.lang + '(&|$)').test(d.url)) {
      const cues = parse(d.body, /[?&]kind=asr/.test(d.url));
      if (!cues.length) { listen(S); return; }
      S.cues = cues; S.at = -1; S.msg = 'Đang dịch…'; button(); translateAll(S);
      // 💬 nhắc nhẹ cho khách biết HaoHao đang dịch (mỗi video 1 lần)
      if (!told.has(S.v)) { told.add(S.v); window.dispatchEvent(new CustomEvent('hh-subs-active', { detail: { from: LANG[S.src] || S.src, to: LANG[base(S.to)] || S.to } })); }
    }
  });
  function pick(d) {
    if (S.ai) return;
    if (!d.tracks.length) { S.title = d.title; listen(S); return; }   // V1.6.3: không có phụ đề → HaoHao nghe trước & dịch
    // ngôn ngữ gốc của video = ngôn ngữ của phụ đề tự động; ưu tiên phụ đề người làm cùng ngôn ngữ đó (có dấu câu, chuẩn hơn)
    const a = d.tracks.find(t => t.asr), lang = a ? a.lang : d.tracks[0].lang;
    const human = d.tracks.find(t => !t.asr && base(t.lang) === base(lang));
    const tr = human || a || d.tracks[0];
    S.title = d.title;
    if (base(tr.lang) === base(target())) { S.msg = 'Video đã là ' + (LANG[base(target())] || target()) + ', không cần dịch'; button(); return; }
    S.lang = tr.lang; S.src = base(tr.lang); S.to = target();
    S.msg = 'Đang lấy phụ đề ' + (LANG[base(tr.lang)] || tr.lang) + '…'; button();
    window.postMessage({ [TAG]: 'cmd', act: 'on', lang: tr.lang, asr: tr.asr }, '*');
  }
  const curV = () => { try { return new URL(location.href).searchParams.get('v') || ''; } catch { return ''; } };
  function start() {
    const v = curV(); if (!v) { S = null; clearBox(); return; }
    if (S && S.v === v) return;
    S = { v, lang: '', cues: null, msg: '' }; clearBox();
    document.documentElement.classList.add('hh-subs-on');
    // trình phát cần chút thời gian để có danh sách phụ đề
    let n = 0; const ask = () => { if (!S || S.v !== v || S.lang || S.msg) return; window.postMessage({ [TAG]: 'cmd', act: 'tracks' }, '*'); if (++n < 10) setTimeout(ask, 800); };
    ask();
  }
  function stop() {
    if (S && S.held) release(S);
    S = null; clearBox(); document.documentElement.classList.remove('hh-subs-on');
    window.postMessage({ [TAG]: 'cmd', act: 'off' }, '*');
  }
  function toggle() {
    on = !on; settings.subs = { ...(settings.subs || {}), on };
    chrome.storage.local.get('settings').then(({ settings: s = {} }) => { s.subs = { ...(s.subs || {}), on }; chrome.storage.local.set({ settings: s }); });
    if (on) start(); else stop();
    button();
  }
  // 💬 Gợi ý qua HaoHao: video nói tiếng nước ngoài mà chưa bật → HaoHao hiện bong bóng có nút "Bật song ngữ" (mỗi video hỏi 1 lần)
  let P = null; const asked = new Set();
  function probe() {
    const v = curV(); if (!v || asked.has(v) || (settings.subs || {}).ask === false) return;
    const vd = document.querySelector('#movie_player video'); if (!vd || vd.paused || vd.currentTime < 1.5) return;   // đợi video chạy rồi mới hỏi
    if (P && P.v === v) return;
    P = { v, done: false }; let n = 0;
    const ask = () => { if (!P || P.v !== v || P.done) return; window.postMessage({ [TAG]: 'cmd', act: 'tracks' }, '*'); if (++n < 6) setTimeout(ask, 800); };
    ask();
  }
  function offer(d) {
    P.done = true; asked.add(d.v);
    if (on || !d.tracks.length) return;
    const a = d.tracks.find(t => t.asr), lang = base(a ? a.lang : d.tracks[0].lang);
    if (lang === base(target())) return;
    window.dispatchEvent(new CustomEvent('hh-subs-offer', { detail: { from: LANG[lang] || lang.toUpperCase(), to: LANG[base(target())] || target() } }));
  }
  window.addEventListener('hh-subs-turn', e => { const want = !!(e.detail || {}).on; if (want) told.add(curV()); if (want !== on) toggle(); });   // vừa bấm bật thì đã có lời 'Đã bật', không nhắc thêm
  // YouTube chuyển video không tải lại trang
  const tick = () => { button(); if (on) start(); else probe(); };
  document.addEventListener('yt-navigate-finish', () => setTimeout(tick, 300));
  setInterval(tick, 1500);
  chrome.storage.local.get('settings').then(({ settings: s = {} }) => { settings = s; on = !!(s.subs || {}).on; tick(); });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local' || !ch.settings) return;
    const s = ch.settings.newValue || {}, oldT = target(); settings = s;
    const want = !!(s.subs || {}).on;
    if (want !== on) { on = want; if (on) { told.add(curV()); start(); } else stop(); button(); return; }
    if (on && S && target() !== oldT) { S = null; tick(); }
  });
})();
