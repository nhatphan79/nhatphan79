// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🗒 Note dạng giấy dán (sticky note): cửa sổ nhỏ, sửa trực tiếp (đậm, nghiêng, gạch, danh sách, ảnh), tự lưu vào kho Note
const $ = s => document.querySelector(s);
const id = new URLSearchParams(location.search).get('id');
let item = null, timer = 0, typing = false, loaded = false;
// V1.11: đang gõ trong note (con trỏ đang ở tiêu đề / nội dung) thì KHÔNG nạp lại chữ – tránh con trỏ nhảy về đầu dòng sau mỗi lần tự lưu
const editing = () => loaded && (document.activeElement === $('#title') || document.activeElement === $('#text'));
const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// chữ thường → đoạn gọn: mỗi dòng 1 khối, dòng trống = khoảng cách đoạn, dòng bắt đầu "-", "•", "*", "✓" → danh sách chấm
function textToHtml(t) {
  const L = String(t || '').replace(/\r/g, '').split('\n'), out = []; let ul = [];
  const flush = () => { if (ul.length) { out.push('<ul>' + ul.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'); ul = []; } };
  for (const raw of L) {
    const m = raw.match(/^\s*(?:[-•*✓✔]|\d+[.)])\s+(.*)$/);
    if (m) { ul.push(m[1]); continue; }
    flush();
    out.push(raw.trim() ? `<div>${esc(raw)}</div>` : '<div><br></div>');
  }
  flush();
  return out.join('');
}
// chỉ giữ thẻ định dạng an toàn
const OK = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'DIV', 'P', 'BR', 'IMG', 'SPAN']);
function clean(html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const walk = n => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 1) {
        if (!OK.has(c.tagName)) { c.replaceWith(...c.childNodes); continue; }
        for (const a of [...c.attributes]) if (!(c.tagName === 'IMG' && a.name === 'src' && /^data:image\//.test(a.value))) c.removeAttribute(a.name);
        if (c.tagName === 'IMG' && !c.getAttribute('src')) { c.remove(); continue; }
        walk(c);
      } else if (c.nodeType !== 3) c.remove();
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}
async function load() {
  const { ideas = [] } = await chrome.storage.local.get('ideas');
  item = ideas.find(x => x.id === id);
  if (!item) { $('#text').textContent = 'Note này đã bị xoá.'; $('#text').contentEditable = 'false'; return; }
  document.body.dataset.c = item.color || 'yellow';
  document.querySelectorAll('.dot').forEach(d => d.classList.toggle('on', d.dataset.c === document.body.dataset.c));
  if (!typing && !editing()) { $('#title').textContent = item.name || ''; $('#text').innerHTML = item.html ? clean(item.html) : textToHtml(item.text); }
  loaded = true;
  document.title = (item.name || (item.text || '').split('\n')[0] || 'Note').slice(0, 40) + ' · HaoHao';
  $('#meta').textContent = new Date(item.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  const a = $('#src');
  if (item.url) { a.href = item.url; a.textContent = '🔗 Link'; a.title = (item.title ? item.title + '\n' : '') + item.url; } else a.textContent = '';
}
async function save(patch) {
  const { ideas = [] } = await chrome.storage.local.get('ideas');
  const x = ideas.find(y => y.id === id); if (!x) return;
  Object.assign(x, patch); if (patch.name === '') delete x.name;
  await chrome.storage.local.set({ ideas });
  $('#saved').textContent = '✓ Đã lưu'; setTimeout(() => { $('#saved').textContent = ''; }, 1200);
}
const saveBody = () => save({ name: $('#title').textContent.trim(), html: clean($('#text').innerHTML), text: $('#text').innerText.replace(/\n{3,}/g, '\n\n').trim() });
const later = () => { typing = true; clearTimeout(timer); timer = setTimeout(() => { typing = false; saveBody(); }, 500); };
$('#title').addEventListener('input', later);
$('#text').addEventListener('input', later);
// rời khỏi ô gõ: lưu ngay phần đang chờ, rồi nạp lại nếu chỗ khác vừa sửa
for (const k of ['#title', '#text']) $(k).addEventListener('blur', () => setTimeout(() => { if (editing()) return; if (typing) { clearTimeout(timer); typing = false; saveBody(); } else load(); }, 0));
$('#title').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#text').focus(); } });
// dán: chỉ lấy chữ thuần rồi chia đoạn gọn
$('#text').addEventListener('paste', e => {
  const img = [...(e.clipboardData.files || [])].find(f => /^image\//.test(f.type));
  if (img) { e.preventDefault(); return addImage(img); }
  const t = e.clipboardData.getData('text/plain'); if (!t) return;
  e.preventDefault(); document.execCommand('insertHTML', false, textToHtml(t));
});
// ✍️ thanh định dạng (như Sticky Notes của Windows)
document.querySelectorAll('.tb button[data-cmd]').forEach(b => {
  b.addEventListener('mousedown', e => e.preventDefault());
  b.addEventListener('click', () => { $('#text').focus(); document.execCommand(b.dataset.cmd); later(); state(); });
});
const state = () => document.querySelectorAll('.tb button[data-cmd]').forEach(b => { try { b.classList.toggle('on', document.queryCommandState(b.dataset.cmd)); } catch {} });
document.addEventListener('selectionchange', state);
// 🖼 chèn ảnh: thu nhỏ cạnh dài 900px cho nhẹ
async function addImage(f) {
  const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
  const im = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
  const k = Math.min(1, 900 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
  cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  $('#text').focus(); document.execCommand('insertHTML', false, `<img src="${cv.toDataURL('image/jpeg', 0.85)}">`); later();
}
$('#imgBtn').addEventListener('mousedown', e => e.preventDefault());
$('#imgBtn').addEventListener('click', () => $('#imgFile').click());
$('#imgFile').addEventListener('change', () => { const f = $('#imgFile').files[0]; if (f) addImage(f); $('#imgFile').value = ''; });
// ✨ Sắp xếp nội dung chính (Gemini), có Hoàn tác
let prevHtml = null;
$('#tidyBtn').addEventListener('click', async () => {
  const b = $('#tidyBtn'), txt = $('#text').innerText.trim(); if (!txt || b.disabled) return;
  b.disabled = true; b.textContent = '⏳ Đang sắp xếp…';
  try {
    const r = await chrome.runtime.sendMessage({ type: 'note-tidy', text: txt });
    if (!r || !r.ok) throw new Error(r && r.error === 'nokey' ? 'Cần mã Gemini (HaoHao → Thông tin → Tóm tắt)' : (r && r.error) || 'Mất kết nối');
    prevHtml = $('#text').innerHTML;
    $('#text').innerHTML = clean(r.html);
    $('#undoBtn').hidden = false;
    typing = false; await saveBody();
  } catch (e) { $('#saved').textContent = '⚠ ' + e.message; setTimeout(() => { $('#saved').textContent = ''; }, 4000); }
  b.disabled = false; b.textContent = '✨ Sắp xếp';
});
$('#undoBtn').addEventListener('click', async () => { if (prevHtml == null) return; $('#text').innerHTML = prevHtml; prevHtml = null; $('#undoBtn').hidden = true; await saveBody(); });
document.querySelectorAll('.dot').forEach(d => d.addEventListener('click', async () => { document.body.dataset.c = d.dataset.c; document.querySelectorAll('.dot').forEach(x => x.classList.toggle('on', x === d)); await save({ color: d.dataset.c }); }));
$('#copy').addEventListener('click', async () => {
  const t = [$('#title').textContent.trim(), $('#text').innerText.trim()].filter(Boolean).join('\n\n');
  try { await navigator.clipboard.writeText(t); $('#copy').textContent = '✓'; setTimeout(() => { $('#copy').textContent = '📋'; }, 1200); } catch {}
});
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.ideas && !typing) load(); });
// 📐 mở ra là thấy hết nội dung: kéo cửa sổ cao vừa đủ (tối đa gần hết màn hình), 1 lần lúc mở
async function fit() {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const w = await chrome.windows.getCurrent();
    const T = $('#text'), extra = T.scrollHeight - T.clientHeight;
    if (extra <= 4) return;
    const frame = window.outerHeight - window.innerHeight;
    const maxH = Math.min(600, (screen.availHeight || 900) - 40);   // gọn: cao tối đa 600px, dài hơn thì cuộn
    const h = Math.min(maxH, window.innerHeight + extra + frame + 8);
    const top = Math.max(screen.availTop || 0, Math.min(w.top, (screen.availTop || 0) + (screen.availHeight || 900) - h));
    await chrome.windows.update(w.id, { height: Math.round(h), top: Math.round(top) });
  } catch {}
}
// 💡 gợi ý sắp xếp: note dán vào dài, chưa định dạng, chưa từng sắp xếp / chưa bấm "để sau"
function maybeHint() {
  if (!item || item.tidyAsked) return;
  const t = item.text || '', lines = t.split('\n').filter(x => x.trim());
  const long = t.length > 350, plain = !/<(b|ul|li)>/i.test(item.html || '');
  const messy = lines.some(x => x.length > 220) || lines.length > 8;
  if (long && plain && messy) $('#hint').hidden = false;
}
$('#hintGo').addEventListener('click', () => { $('#hint').hidden = true; save({ tidyAsked: true }); $('#tidyBtn').click(); });
$('#hintX').addEventListener('click', () => { $('#hint').hidden = true; save({ tidyAsked: true }); });
load().then(() => { maybeHint(); fit(); });
