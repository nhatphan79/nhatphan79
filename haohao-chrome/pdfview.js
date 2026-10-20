// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📄 V1.86: trình đọc PDF của HaoHao – hiện từng trang đúng như file gốc (bộ đọc PDF của Mozilla, giấy phép Apache 2.0),
// rồi phủ bản dịch lên đúng chỗ từng đoạn. Cuộn tới đâu dịch tới đó. Google Dịch trước, có nút dịch lại bằng Gemini.
import * as pdfjs from './pdfjs/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.mjs';

const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const SRC = qs.get('src') || '', TAB = +qs.get('tab') || 0;
const LANG = { vi: 'Tiếng Việt', en: 'Tiếng Anh', zh: 'Tiếng Trung', ja: 'Tiếng Nhật', ko: 'Tiếng Hàn', fr: 'Tiếng Pháp', de: 'Tiếng Đức', es: 'Tiếng Tây Ban Nha',
  ru: 'Tiếng Nga', th: 'Tiếng Thái', id: 'Tiếng Indonesia', pt: 'Tiếng Bồ Đào Nha', it: 'Tiếng Ý', hi: 'Tiếng Hindi', lo: 'Tiếng Lào', km: 'Tiếng Khmer' };
const base = l => String(l || '').split('-')[0].toLowerCase();
const langName = l => LANG[base(l)] || (String(l || '').length > 3 ? String(l) : String(l || '').toUpperCase());

let settings = {}, target = 'vi', doc = null, scale = 1, fitScale = 1, showing = 'tr', forceAi = false, engine = '', srcLang = '', stopped = '', done = 0, qBusy = false;
const P = [];   // từng trang: { n, el, W, H, rendered, busy, paras, tr }

const fileName = (() => { try { return decodeURIComponent(new URL(SRC).pathname.split('/').pop() || 'PDF'); } catch { return 'PDF'; } })();
$('nm').textContent = fileName; $('nm').title = fileName; document.title = '📄 ' + fileName + ' – HaoHao PDF';

// ---------- lấy file ----------
function b64ToBytes(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function getBytes() {
  // nhờ chính tab đang mở PDF đọc file (đọc được cả file trên máy), không được thì tải thẳng
  if (TAB) { try { const r = await chrome.tabs.sendMessage(TAB, { type: 'hh-pdf-bytes' }); if (r && r.ok && r.b64) return b64ToBytes(r.b64); if (r && r.error) stopped = r.error; } catch {} }
  try { const r = await fetch(SRC); if (r.ok) return new Uint8Array(await r.arrayBuffer()); } catch {}
  return null;
}
function showMsg(html) { $('load').hidden = true; const m = $('msg'); m.innerHTML = html; m.style.display = 'block'; }
async function fileGuide() {
  showMsg(`<h2>Cần bật 1 lần để HaoHao đọc được file trên máy</h2>
    <p>Chrome chỉ cho tiện ích đọc file PDF trên máy khi bạn cho phép. Làm 1 lần là xong:</p>
    <ol><li>Bấm nút bên dưới để mở trang cài đặt của HaoHao.</li>
    <li>Bật mục <b>“Cho phép truy cập URL tệp”</b> (Allow access to file URLs).</li>
    <li>Quay lại file PDF, bấm <b>🌍 Dịch cả trang</b> lần nữa.</li></ol>
    <p><button id="goset">Mở trang cài đặt HaoHao</button></p>`);
  $('goset').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id }));
}

// ---------- gom chữ thành dòng, dòng thành đoạn ----------
const CJK = /[⺀-鿿가-힯豈-﫿＀-￯]/;
function parasFrom(items, vp) {
  const L = [];
  for (const it of items) {
    const s = it.str || ''; if (!s.trim()) continue;
    const tx = pdfjs.Util.transform(vp.transform, it.transform);
    const h = Math.hypot(tx[2], tx[3]) || Math.abs(it.height) || 10;
    const w = Math.abs(it.width * vp.scale) || s.length * h * 0.5;
    L.push({ t: s, x: tx[4], y: tx[5] - h, w, h });
  }
  L.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of L) {
    let ln = null;
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 8); i--) {
      const l = lines[i];
      if (Math.abs((l.y + l.h) - (it.y + it.h)) < Math.min(l.h, it.h) * 0.5 && it.x >= l.x + l.w - l.h * 0.6 && it.x - (l.x + l.w) < l.h * 1.6) { ln = l; break; }
    }
    if (ln) {
      const gap = it.x - (ln.x + ln.w), cj = CJK.test(ln.t.slice(-1)) || CJK.test(it.t[0]);
      ln.t += (gap > ln.h * 0.12 && !cj && !/\s$/.test(ln.t) && !/^\s/.test(it.t) ? ' ' : '') + it.t;
      ln.w = Math.max(ln.w, it.x + it.w - ln.x); ln.h = Math.max(ln.h, it.h);
    } else lines.push({ ...it });
  }
  lines.forEach(l => { l.t = l.t.replace(/\s+/g, ' ').trim(); });
  lines.sort((a, b) => a.y - b.y || a.x - b.x);
  // dòng → đoạn (giống cách làm với PDF trên Google Drive)
  const paras = [];
  for (const l of lines.filter(x => x.t)) {
    let hit = null;
    for (let i = paras.length - 1; i >= Math.max(0, paras.length - 5); i--) {
      const q = paras[i], a = q.last;
      const gap = l.y - (a.y + a.h), ovl = Math.min(q.x2, l.x + l.w) - Math.max(q.x, l.x);
      if (l.y > a.y + a.h * 0.5 && gap < a.h * 0.8 && ovl > Math.min(l.w, q.x2 - q.x) * 0.3 && Math.abs(l.h - a.h) < a.h * 0.35) {
        const endPara = a.w < (q.x2 - q.x) * 0.8 && /[.!?:。！？：]["”’')\]」』]?$/.test(a.t);
        const title = q.n === 1 && a.w < l.w * 0.6 && !/[.,;，；]$/.test(a.t);
        const item = /^(\d{1,3}[.)、]\s?|[•▪●◦‣–-]\s|[（(]\d{1,3}[)）])/.test(l.t);
        if (!endPara && !title && !item) hit = q;
        break;
      }
    }
    if (hit) {
      const cj = CJK.test(hit.t.slice(-1)) || CJK.test(l.t[0]);
      hit.t = /[a-z]-$/.test(hit.t) && /^[a-z]/.test(l.t) ? hit.t.slice(0, -1) + l.t : hit.t + (cj ? '' : ' ') + l.t;
      hit.x = Math.min(hit.x, l.x); hit.x2 = Math.max(hit.x2, l.x + l.w); hit.y2 = Math.max(hit.y2, l.y + l.h); hit.n++; hit.last = l;
    } else paras.push({ t: l.t, x: l.x, x2: l.x + l.w, y: l.y, y2: l.y + l.h, last: l, lh: l.h, n: 1 });
  }
  return paras.filter(q => /[\p{L}]{2,}|[⺀-鿿]/u.test(q.t));
}

// ---------- dịch ----------
const send = m => chrome.runtime.sendMessage(m).catch(() => null);
async function translate(segs) {
  if (!forceAi) {
    const r = await send({ type: 'g-translate', q: segs, tl: target });
    if (r && r.ok && Array.isArray(r.items) && r.items.length === segs.length) {
      engine = 'google'; if (!srcLang && r.lang && base(r.lang) !== base(target)) srcLang = r.lang;
      return r.items;
    }
    if (!(settings.ai || {}).key) throw new Error('Không kết nối được Google Dịch, thử lại sau nhé.');
  }
  if (!(settings.ai || {}).key) throw new Error('Chưa có mã Gemini. Thêm mã ở Cài đặt → Đọc hộ (Gemini) để dịch bằng AI.');
  const r = await send({ type: 'ai-translate', mode: 'batch', segments: segs, target });
  if (!r || !r.ok) throw new Error(r && r.error === 'nokey' ? 'Chưa có mã Gemini.' : (r && r.error) || 'Không kết nối được Gemini');
  engine = 'ai'; if (!srcLang && r.lang) srcLang = r.lang;
  return r.items || [];
}

// ---------- vẽ ----------
function fit(p) {
  const H = p.el.clientHeight; if (!H) return;
  p.el.querySelectorAll('.ov > .p').forEach(b => {
    let fs = Math.max(5, +b.dataset.r * H); b.style.fontSize = fs + 'px';
    for (let k = 0; k < 14 && b.scrollHeight > b.clientHeight + 1 && fs > 5; k++) { fs *= 0.9; b.style.fontSize = fs + 'px'; }
  });
}
function draw(p) {
  p.el.querySelector('.ov')?.remove();
  const ov = document.createElement('div'); ov.className = 'ov';
  p.paras.forEach((q, i) => {
    const t = p.tr[i]; if (typeof t !== 'string' || !t.trim() || t === q.t) return;
    const b = document.createElement('div'); b.className = 'p'; const pad = q.lh * 0.12;
    Object.assign(b.style, { left: (q.x - pad) / p.W * 100 + '%', top: (q.y - pad) / p.H * 100 + '%', width: (q.x2 - q.x + 2 * pad) / p.W * 100 + '%', height: (q.y2 - q.y + pad + q.lh * 0.32) / p.H * 100 + '%' });   // chừa thêm phía dưới để che hết chân chữ (g, y, p)
    b.textContent = t; b.dataset.r = q.lh * 0.8 / p.H;
    ov.append(b);
  });
  p.el.append(ov); fit(p);
}
async function render(p) {
  if (p.rendered || p.busy) return; p.busy = true;
  try {
    const page = await doc.getPage(p.n), v1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale });
    p.W = v1.width; p.H = v1.height; p.el.style.width = vp.width + 'px'; p.el.style.height = vp.height + 'px';
    const dpr = window.devicePixelRatio || 1, c = document.createElement('canvas');
    c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr); c.style.width = '100%'; c.style.height = '100%';
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    p.el.querySelector('canvas')?.remove(); p.el.prepend(c);
    if (!p.paras) p.paras = parasFrom((await page.getTextContent()).items, v1);
    p.rendered = true; if (p.tr) fit(p);
  } catch (e) { console.warn('HaoHao PDF', p.n, e); }
  p.busy = false; pump();
}
function status() {
  const st = $('st'), eg = $('eng'), tg = $('tg'), ai = $('ai');
  const tName = LANG[base(target)] || target;
  if (stopped) st.textContent = '⚠ ' + stopped;
  else if (showing !== 'tr') st.textContent = 'Đang xem bản gốc';
  else st.textContent = (srcLang ? langName(srcLang) + ' → ' : 'Dịch sang ') + tName + ` · đã dịch ${done}/${P.length} trang` + (qBusy ? ' · đang dịch…' : ', cuộn tới đâu dịch tới đó');
  eg.hidden = !engine; eg.textContent = engine === 'ai' ? '✨ AI' : '🌐 Google'; eg.classList.toggle('ai', engine === 'ai');
  tg.hidden = !done; tg.textContent = showing === 'tr' ? 'Xem bản gốc' : 'Xem bản dịch';
  ai.hidden = !doc || engine === 'ai';
  $('zv').textContent = Math.round(scale / fitScale * 100) + '%';
}
async function pump() {
  if (qBusy || stopped || showing !== 'tr' || !doc) return;
  const vh = innerHeight;
  const c = P.filter(p => p.rendered && p.paras && !p.tr).map(p => ({ p, r: p.el.getBoundingClientRect() }))
    .filter(o => o.r.bottom > -vh && o.r.top < vh * 2).sort((a, b) => Math.abs(a.r.top) - Math.abs(b.r.top));
  if (!c.length) return;
  const p = c[0].p; qBusy = true; status();
  try { p.tr = p.paras.length ? await translate(p.paras.map(q => q.t)) : []; draw(p); done++; }
  catch (e) { stopped = String(e.message || e); }
  qBusy = false; status(); pump();
}

// ---------- phóng to / thu nhỏ ----------
function zoom(f) {
  const ns = Math.min(fitScale * 3, Math.max(fitScale * 0.4, scale * f)); if (Math.abs(ns - scale) < 0.001) return;
  const anchor = P.find(p => p.el.getBoundingClientRect().bottom > 60);
  scale = ns;
  for (const p of P) {
    p.rendered = false;
    const w = p.W * scale, h = p.H * scale; p.el.style.width = w + 'px'; p.el.style.height = h + 'px';
    if (p.tr) fit(p);
  }
  if (anchor) anchor.el.scrollIntoView({ block: 'start' });
  P.filter(p => { const r = p.el.getBoundingClientRect(); return r.bottom > -innerHeight && r.top < innerHeight * 2; }).forEach(render);
  status();
}

// ---------- mở ----------
async function main() {
  ({ settings = {} } = await chrome.storage.local.get('settings'));
  target = (settings.dich || {}).target || 'vi';
  if (!SRC) return showMsg('<h2>Chưa có file PDF</h2><p>Mở một file PDF rồi bấm <b>🌍 Dịch cả trang</b> nhé.</p>');
  const bytes = await getBytes();
  if (!bytes) {
    if (/^file:/i.test(SRC) && !(await chrome.extension.isAllowedFileSchemeAccess())) return fileGuide();
    return showMsg('<h2>Không mở được file PDF này</h2><p>' + (stopped ? stopped.replace(/</g, '&lt;') : 'Trang chứa file không cho tải về. Thử tải file về máy rồi mở lại nhé.') + '</p>');
  }
  stopped = '';
  try { doc = await pdfjs.getDocument({ data: bytes, cMapUrl: './pdfjs/cmaps/', cMapPacked: true, isEvalSupported: false }).promise; }
  catch (e) { return showMsg('<h2>File PDF bị lỗi hoặc có mật khẩu</h2><p>HaoHao chưa mở được file này.</p>'); }
  const first = await doc.getPage(1), v1 = first.getViewport({ scale: 1 });
  fitScale = scale = Math.min(2, Math.max(0.4, Math.min(innerWidth - 40, 1000) / v1.width));
  $('load').hidden = true;
  const box = $('pages');
  for (let n = 1; n <= doc.numPages; n++) {
    const el = document.createElement('div'); el.className = 'pg'; el.style.width = v1.width * scale + 'px'; el.style.height = v1.height * scale + 'px';
    el.setAttribute('aria-label', 'Trang ' + n); el.innerHTML = `<span class="no">${n}/${doc.numPages}</span>`;
    box.append(el); P.push({ n, el, W: v1.width, H: v1.height });
  }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) render(P[+e.target.dataset.i]); }), { rootMargin: '120% 0px' });
  P.forEach((p, i) => { p.el.dataset.i = i; io.observe(p.el); });
  let t = 0; addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(pump, 150); }, { passive: true });
  status();
}

$('tg').addEventListener('click', () => { showing = showing === 'tr' ? 'orig' : 'tr'; document.body.classList.toggle('orig', showing !== 'tr'); status(); pump(); });
$('ai').addEventListener('click', () => {
  if (!(settings.ai || {}).key) { stopped = 'Chưa có mã Gemini. Thêm mã ở Cài đặt → Đọc hộ (Gemini) để dịch bằng AI.'; status(); return; }
  forceAi = true; stopped = ''; srcLang = ''; done = 0; engine = '';
  P.forEach(p => { p.tr = null; p.el.querySelector('.ov')?.remove(); });
  showing = 'tr'; document.body.classList.remove('orig'); status(); pump();
});
$('zi').addEventListener('click', () => zoom(1.2));
$('zo').addEventListener('click', () => zoom(1 / 1.2));
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.settings) settings = ch.settings.newValue || {}; });
main().catch(e => showMsg('<h2>Có lỗi khi mở PDF</h2><p>' + String(e.message || e).replace(/</g, '&lt;') + '</p>'));
