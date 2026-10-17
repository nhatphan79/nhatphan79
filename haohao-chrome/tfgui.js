// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// V1.48: khung 📤 Máy tính → iPhone nằm trong bảng Transfer của HaoHao (iframe trang tiện ích → gọi thẳng app Transfer ở 127.0.0.1:8686)
const H = 'http://127.0.0.1:8686', HD = { 'x-haohao': '1' }, $ = id => document.getElementById(id);
const f = $('f'), d = $('d'), p = $('p'), t = $('t'), b = $('b'), q = $('q');
const size = () => parent.postMessage({ hhTfH: Math.ceil(document.documentElement.scrollHeight) }, '*');
new ResizeObserver(size).observe(document.body);

async function ds() {
  try {
    const j = await (await fetch(H + '/gui-ds', { headers: HD })).json();
    if (!j.files || !j.files.length) { q.hidden = true; return; }
    $('qc').innerHTML = j.qr; $('l').textContent = j.files.map(x => x.name + ' (' + x.size + ')').join(' · '); q.hidden = false;
  } catch { q.hidden = true; }
}

function up(file, i, n, done, tot) {
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest();
    x.open('POST', H + '/gui?name=' + encodeURIComponent(file.name)); x.setRequestHeader('x-haohao', '1');
    x.upload.onprogress = e => { const a = Math.floor((done + e.loaded) / tot * 100); b.style.width = a + '%'; t.textContent = 'Đang chuẩn bị ' + (i + 1) + '/' + n + ' · ' + a + '%'; };
    x.onload = () => { if (x.status === 200) return ok(); let m = x.responseText; try { m = JSON.parse(m).error || m; } catch {} no(new Error(m || 'Lỗi ' + x.status)); };
    x.onerror = () => no(new Error('Không kết nối được app Transfer')); x.send(file);
  });
}

async function send(list) {
  const fs = [...list].filter(x => /^(image|video)\//.test(x.type) || /\.(jpe?g|png|heic|gif|webp|mp4|mov|m4v|avi|mkv)$/i.test(x.name));
  if (!fs.length) return;
  const tot = fs.reduce((a, x) => a + x.size, 0) || 1; let done = 0;
  p.hidden = false; q.hidden = true; t.classList.remove('err'); b.style.width = '0';
  try {
    // V1.50: mỗi lần chọn / kéo thả là THÊM vào danh sách gửi (không xoá file cũ); muốn làm lại thì bấm ✕ Xoá danh sách
    for (const [i, x] of fs.entries()) { await up(x, i, fs.length, done, tot); done += x.size; }
    t.textContent = '✓ Đã thêm ' + fs.length + ' file'; b.style.width = '100%';
    await ds();
  } catch (e) { t.textContent = '⚠️ ' + e.message; t.classList.add('err'); }
  f.value = '';
}

d.addEventListener('click', () => f.click());
d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.click(); } });
f.addEventListener('change', () => send(f.files));
['dragenter', 'dragover'].forEach(k => d.addEventListener(k, e => { e.preventDefault(); d.classList.add('over'); }));
['dragleave', 'drop'].forEach(k => d.addEventListener(k, e => { e.preventDefault(); d.classList.remove('over'); }));
d.addEventListener('drop', e => send(e.dataTransfer.files));
$('x').addEventListener('click', async () => { try { await fetch(H + '/gui-moi', { method: 'POST', headers: HD }); } catch {} p.hidden = true; q.hidden = true; });
// V1.49: nhận file kéo thả vào linh vật / bảng HaoHao (content script gửi qua postMessage kèm mã k)
const K = (location.hash.match(/k=([a-z0-9]+)/) || [])[1];
window.addEventListener('message', e => { if (e.source === parent && K && e.data && e.data.k === K && Array.isArray(e.data.hhTfFiles)) send(e.data.hhTfFiles); });
ds(); size();
