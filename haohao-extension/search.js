// Trang tìm kiếm chung, mở từ thanh địa chỉ (hh + dấu cách) hoặc từ HaoHao.
const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
let data = {}, openKey = params.get('open') || '';
const expanded = new Set(openKey ? [openKey] : []);

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function markHit(text, q) {
  const f = document.createDocumentFragment(), words = HT.fold(q).split(/\s+/).filter(Boolean);
  let out = ''; const map = [];
  for (let i = 0; i < text.length; i++) { const n = HT.fold(text[i]); for (let k = 0; k < n.length; k++) { out += n[k]; map.push(i); } }
  const hits = [];
  for (const w of words) { let i = out.indexOf(w); while (i >= 0 && hits.length < 40) { hits.push([map[i], map[i + w.length - 1] + 1]); i = out.indexOf(w, i + w.length); } }
  hits.sort((a, b) => a[0] - b[0]);
  let at = 0;
  for (const [a, b] of hits) { if (a < at) continue; f.append(text.slice(at, a)); f.append(el('mark', '', text.slice(a, b))); at = b; }
  f.append(text.slice(at)); return f;
}
const save = k => chrome.storage.local.set({ [k]: data[k] });

function draw() {
  const q = $('#q').value.trim(), O = $('#out');
  O.innerHTML = '';
  document.title = q ? `${q} · HaoHao` : 'HaoHao: tìm kiếm';
  if (!q) { O.append(el('div', 'empty', 'Mẹo: trên thanh địa chỉ Chrome, gõ hh rồi dấu cách và từ cần tìm.')); return; }
  const res = HT.search(data, q, 200);
  if (!res.length) {
    O.append(el('div', 'empty', `Không thấy "${q}" trong HaoHao.`));
    const a = el('div', 'acts');
    const bt = el('button', '', '＋ Thêm thành Todo');
    bt.addEventListener('click', () => { (data.todos = data.todos || []).push({ id: 't' + Date.now().toString(36), text: q, done: false, due: '', notified: false }); save('todos'); });
    const bn = el('button', '', '💡 Lưu thành Note');
    bn.addEventListener('click', async () => { await chrome.runtime.sendMessage({ type: 'idea-add', item: { type: 'text', text: q } }).catch(() => {}); });
    a.append(bt, bn); O.append(a); return;
  }
  const groups = {};
  res.forEach(r => (groups[r.kind] = groups[r.kind] || []).push(r));
  for (const kind of Object.keys(HT.SEARCH_KIND)) {
    const list = groups[kind]; if (!list) continue;
    O.append(el('h2', '', `${HT.SEARCH_KIND[kind]} (${list.length})`));
    for (const r of list) O.append(card(r, q));
  }
  const hit = O.querySelector('.r.hit'); if (hit) { hit.scrollIntoView({ block: 'center' }); openKey = ''; }
}

function card(r, q) {
  const key = r.kind + ':' + r.id;
  const c = el('div', 'r' + (r.done ? ' dn' : '') + (openKey && key === openKey ? ' hit' : ''));
  c.append(el('span', 'ic', r.icon));
  const bd = el('div', 'bd'), tt = el('div', 'tt');
  if (r.url && (r.kind === 'shop' || r.kind === 'idea')) { const a = el('a'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener'; a.append(markHit(r.title, q)); tt.append(a); }
  else tt.append(markHit(r.title, q));
  bd.append(tt, el('div', 'sb', r.sub));
  if (r.kind === 'idea') {
    const it = (data.ideas || []).find(i => i.id === r.id);
    if (it && it.text && it.text !== r.title) {
      if (expanded.has(key)) { const m = el('div', 'more'); m.append(markHit(it.text, q)); bd.append(m); }
      const b = el('button', '', expanded.has(key) ? 'Thu gọn' : 'Xem nội dung');
      b.addEventListener('click', () => { expanded.has(key) ? expanded.delete(key) : expanded.add(key); draw(); });
      c.append(bd, b); return c;
    }
  }
  c.append(bd);
  if (r.kind === 'todo') {
    const t = (data.todos || []).find(x => x.id === r.id);
    const b = el('button', '', t && t.done ? '↺ Làm lại' : '✓ Xong');
    b.addEventListener('click', () => { if (!t) return; t.done = !t.done; save('todos'); });
    c.append(b);
  } else if (r.kind === 'bell' || r.kind === 'alert') {
    const x = (data.rules || []).find(y => y.id === r.id);
    const b = el('button', '', x && x.enabled ? 'Tắt' : 'Bật');
    b.addEventListener('click', () => { if (!x) return; x.enabled = !x.enabled; save('rules'); });
    c.append(b);
  }
  return c;
}

HT.WEB.forEach(w => {
  const b = el('button', 'chip', `${w.emoji} ${w.label}`);
  b.addEventListener('click', () => { const q = $('#q').value.trim(); if (!q) return $('#q').focus(); location.href = HT.webUrl(w.id, q); });
  $('#web').append(b);
});
let tm = null;
$('#q').addEventListener('input', () => {
  clearTimeout(tm);
  tm = setTimeout(() => { const q = $('#q').value.trim(); history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname); draw(); }, 120);
});
$('#f').addEventListener('submit', e => { e.preventDefault(); const q = $('#q').value.trim(); if (q) location.href = HT.webUrl('google', q); });
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local' || !HT.SEARCH_KEYS.some(k => ch[k])) return;
  for (const k of HT.SEARCH_KEYS) if (ch[k]) data[k] = ch[k].newValue;
  draw();
});
$('#q').value = params.get('q') || '';
chrome.storage.local.get(HT.SEARCH_KEYS).then(d => { data = d; draw(); });
