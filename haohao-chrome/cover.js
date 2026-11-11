// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📄 V1.9.0 (V1.9.1: mục lục theo mẫu DANH MỤC HỒ SƠ – Stt | Tên hồ sơ | Có | Không | Ghi chú, 3 cấp Phần › Nhóm › Tài liệu; ô bìa điền sẵn từ dòng hồ sơ bên ngoài): COVER HỒ SƠ TRÌNH (tab QA/QC Shop) – bìa "Yêu cầu phê duyệt" theo mẫu ACON (Tài liệu / Vật liệu / Shop-BPTC),
//   mục lục tự động từ các file chọn (mã con …-01, -02), xuất 1 bộ PDF: bìa + mục lục + file – bấm mã nhảy trang, có bookmark.
//   File lưu trên máy (IndexedDB hhCover), thông tin bìa + mục lục lưu trong hồ sơ (S.subs[].cv) – đồng bộ như dữ liệu công trình.
const P = new URLSearchParams(location.search), SID = P.get('s') || '', XID = P.get('x') || '', CODE0 = P.get('c') || '';
const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const q = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n, k = 2) => String(n).padStart(k, '0');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const fd = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : (s || '');
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
let msgT = 0; const msg = (t, bad) => { const m = q('#msg'); m.textContent = t; m.className = 'msg' + (bad ? ' bad' : ''); m.hidden = !t; clearTimeout(msgT); if (t) msgT = setTimeout(() => { m.hidden = true; }, bad ? 7000 : 3500); };

// ---------- dữ liệu ----------
const MAU = { tl: ['Tài liệu', 'YÊU CẦU PHÊ DUYỆT TÀI LIỆU', 'TÀI LIỆU', 'TRÌNH DUYỆT TÀI LIỆU'], vl: ['Vật liệu', 'YÊU CẦU PHÊ DUYỆT VẬT LIỆU', 'VẬT LIỆU', 'TRÌNH DUYỆT VẬT LIỆU'], shop: ['Shopdrawing / BPTC', 'YÊU CẦU PHÊ DUYỆT SHOPDRAWING', 'SHOP-BPTC', 'TRÌNH DUYỆT SHOPDRAWING'] };
const LOAI = [['bptc', 'Hồ sơ bản vẽ biện pháp thi công'], ['shop', 'Hồ sơ bản vẽ shopdrawing'], ['bm', 'Hồ sơ biểu mẫu nghiệm thu'], ['khac', 'Khác']];
let S = null, X = null, CV = null;
const mauOf = g => g === 'MAA' ? 'vl' : (g === 'SHD' || g === 'MTS') ? 'shop' : 'tl';
const rv = x => 'R' + pad(+x.rev || 0);
const NT0 = 'CÔNG TY CỔ PHẦN ĐẦU TƯ XÂY DỰNG ACON';
const KEYS = ['mau', 'ct', 'ngay', 'so', 'pb', 'chude', 'dien', 'gom', 'ph', 'nt', 'nl', 'tt', 'da', 'hm', 'dd', 'bdh', 'tvgs'];
function cvOf(x) {
  const c = x.cv && typeof x.cv === 'object' ? x.cv : {}, o = {}; KEYS.forEach(k => { o[k] = c[k] || ''; });
  o.loai = c.loai || { bptc: x.grp === 'MTS', shop: x.grp === 'SHD', bm: false, khac: false };
  o.items = (Array.isArray(c.items) ? c.items : []).map(it => ({ lv: 'd', ...it }));   // lv: 'p' = Phần (A, B…) · 'g' = Nhóm (1, 2…) · 'd' = tài liệu
  return o;
}
// giá trị mặc định lấy từ bên ngoài (dòng hồ sơ ở QA/QC Shop + thông tin công trình) – ô để trống thì dùng giá trị này
const D0 = {
  mau: () => mauOf(X.grp),
  ct: () => POL() ? 'Khách sạn Polaris Danang Hotel' : (S.name || ''), ngay: () => X.d || today(), so: () => CODE0, pb: () => rv(X), ph: () => CV.ngay || X.d || today(),
  chude: () => X.t || '', nt: () => NT0, nl: () => X.who || '',
  dien: () => 'Công ty cổ phần đầu tư xây dựng ACON kính gửi chủ đầu tư, ban quản lý, tư vấn giám sát phê duyệt: ' + (CV.chude || X.t || '') + (X.note ? '\n' + X.note : ''),
  gom: () => autoGom(),
  tt: () => 'DANH MỤC HỒ SƠ ' + MAU[V.mau()][3],
  da: () => POL() ? 'KHÁCH SẠN POLARIS DANANG HOTEL' : (S.name || '').toUpperCase(), hm: () => POL() ? 'THI CÔNG XÂY TÔ VÀ HOÀN THIỆN NỀN CƠ BẢN' : '', dd: () => (S.addr || '').toUpperCase(),
  bdh: () => (S.owner || '').toUpperCase(), tvgs: () => POL() ? 'CÔNG TY CỔ PHẦN CONINCO THĂNG LONG' : '',
};
// V1.9.4: phần đầu danh mục + công trình + nhà thầu lưu chung cho cả công trình (S.cvHd) – theo hợp đồng / TVGS; còn lại theo từng hồ sơ (cv)
const POL = () => /polaris/i.test((S.code || '') + ' ' + (S.name || ''));   // HĐ 0711/2026/HĐXD/TTĐN-ACON
const SK = new Set(['ct', 'da', 'hm', 'dd', 'bdh', 'tvgs', 'nt']);
const gv = k => SK.has(k) ? ((S.cvHd || {})[k] || '') : (CV[k] || '');
const sv = (k, v) => { if (SK.has(k)) S.cvHd = { ...(S.cvHd || {}), [k]: v }; else CV[k] = v; };
const V = {}; KEYS.forEach(k => { V[k] = () => gv(k) || D0[k](); });
const docs = () => CV.items.filter(it => it.lv === 'd');
const hasF = it => !!it.fid;
const coOf = it => it.co === 1 ? 1 : 0;   // V1.9.4: Có / Không anh tự chọn, mặc định Không (bỏ đính kèm file)
function numbering() {   // Stt: Phần A, B… · Nhóm 1, 2… (đánh lại theo từng phần) · tài liệu: mã con -01, -02…
  let p = 0, g = 0, d = 0; return CV.items.map(it => { if (it.lv === 'p') { g = 0; return { stt: String.fromCharCode(65 + (p++ % 26)) }; } if (it.lv === 'g') return { stt: String(++g) }; d++; return { stt: '', code: V.so() + '-' + pad(d), sub: '-' + pad(d) }; });
}
function autoGom() {
  const L = docs(); if (!L.length) return '';
  const pg = L.reduce((a, it) => a + (+it.pages || 0), 0);
  return pad(L.length) + ' tài liệu theo danh mục hồ sơ đính kèm';
}
async function loadData() {
  const r = await chrome.storage.local.get('siteBrain'); const D = r.siteBrain || { sites: [] };
  S = (D.sites || []).find(z => z.id === SID) || null; X = S && (S.subs || []).find(z => z.id === XID) || null;
  if (X) CV = cvOf(X);
}
let saveT = 0;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveNow, 350); }
async function saveNow() {   // đọc bản mới nhất rồi chỉ ghi phần cv của đúng hồ sơ này (không đè thay đổi khác của trang Công trình)
  saveT = 0; const r = await chrome.storage.local.get('siteBrain'); const D = r.siteBrain; if (!D) return;
  const s = (D.sites || []).find(z => z.id === SID), x = s && (s.subs || []).find(z => z.id === XID); if (!x) return;
  x.cv = JSON.parse(JSON.stringify(CV)); if (S.cvHd) s.cvHd = JSON.parse(JSON.stringify(S.cvHd)); await chrome.storage.local.set({ siteBrain: D });
}
// ---------- file trên máy (IndexedDB) ----------
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('hhCover', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const fget = async k => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('f').objectStore('f').get(k); t.onsuccess = () => ok(t.result || null); t.onerror = () => no(t.error); }); };
const fput = async (k, v) => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').put(v, k); t.oncomplete = ok; t.onerror = () => no(t.error); }); };
const fdel = async k => { const d = await idb(); return new Promise(ok => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').delete(k); t.oncomplete = ok; t.onerror = ok; }); };
let pdflibP; const pdflib = () => pdflibP ||= import('./lib/pdflib/pdf-lib.esm.min.js');
const isPdf = f => /pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name || '');
const isImg = f => /^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type || '') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name || '');
async function readFile(f) {
  const bytes = new Uint8Array(await f.arrayBuffer()), fid = 'f_' + uid(); let pages = 0;
  if (isPdf(f)) { try { const { PDFDocument } = await pdflib(); pages = (await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount(); } catch { pages = 0; } }
  else if (isImg(f)) pages = 1;
  await fput(fid, { name: f.name, type: f.type || '', bytes });
  return { fid, fname: f.name, size: f.size, mime: f.type || '', pages, pdf: isPdf(f) ? 1 : 0, img: isImg(f) ? 1 : 0 };
}
async function addFiles(files) {   // chọn nhiều file: mỗi file 1 dòng tài liệu (thêm cuối danh mục – dùng ↑ ↓ đưa vào đúng nhóm)
  const L = [...files]; if (!L.length) return;
  msg('⏳ Đang đọc ' + L.length + ' file…');
  for (const f of L) CV.items.push({ id: uid(), lv: 'd', t: f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim(), note: '', ...(await readFile(f)) });
  saveSoon(); draw(); msg('📎 Đã thêm ' + L.length + ' tài liệu vào danh mục');
}
async function attach(it) {   // gắn / đổi file cho 1 dòng tài liệu
  const fl = await pick(false); if (!fl[0]) return; msg('⏳ Đang đọc ' + fl[0].name + '…');
  const old = it.fid; Object.assign(it, await readFile(fl[0])); delete it.co; if (old) fdel(old); saveSoon(); draw(); msg('📎 Đã gắn file cho "' + it.t + '"');
}
async function openFile(it) {
  const r = it.fid && await fget(it.fid);
  if (!r) return msg('File "' + (it.fname || it.t) + '" không có trên máy này – bấm 📎 ở dòng đó để chọn lại file.', true);
  const u = URL.createObjectURL(new Blob([r.bytes], { type: r.type || 'application/octet-stream' }));
  if (it.pdf || it.img) window.open(u, '_blank'); else { const a = document.createElement('a'); a.href = u; a.download = r.name; a.click(); }
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
const TPL_PL = [['p', 'HỒ SƠ PHÁP LÝ'], ['g', 'Hợp đồng'], ['g', 'Hồ sơ năng lực'], ['d', 'Giấy chứng nhận đăng ký doanh nghiệp'], ['d', 'Chứng chỉ năng lực hoạt động xây dựng'], ['d', 'Giấy xác nhận đủ điều kiện kinh doanh dịch vụ PCCC'],
  ['g', 'Quyết định Ban Chỉ huy'], ['d', 'Quyết định thành lập Ban chỉ huy công trình (Danh sách Ban chỉ huy đính kèm, Sơ đồ tổ chức)'], ['d', 'Quyết định, Hợp đồng lao động, CCCD, Bằng cấp, chứng chỉ của BCH'],
  ['g', 'Hồ sơ an toàn'], ['d', 'Quyết định thành lập Ban ATLĐ-VSMT-PCCN'], ['d', 'Giấy chứng nhận ATLĐ của BCH'], ['d', 'Biện pháp ATLĐ-VSMT, PCCN'], ['d', 'Cam kết ATLĐ'], ['g', 'Hồ sơ BHTN'], ['d', 'Giấy chứng nhận BHTN']];
// ---------- giao diện ----------
function field(lb, k, type, opts = {}) {
  const l = $('div', 'fld' + (opts.w ? ' w' : '')), hd = $('span', 'lb', lb), rs = $('button', 'rs', '↺'); rs.type = 'button'; rs.title = 'Trả về thông tin mặc định lấy từ bên ngoài'; hd.append(rs); l.append(hd);
  const el = type === 'area' ? $('textarea') : type === 'sel' ? $('select') : $('input');
  if (type === 'sel') opts.o.forEach(([v, t]) => { const o = $('option', '', t); o.value = v; el.append(o); });
  else if (type !== 'area') el.type = type || 'text';
  if (type === 'area') el.rows = opts.rows || 3;
  const upd = () => { rs.hidden = !gv(k); el.classList.toggle('man', !!gv(k)); };
  el.value = V[k](); upd();   // V1.9.1: điền sẵn giá trị mặc định từ bên ngoài; sửa tay thì giữ bản sửa (viền cam + nút ↺)
  el.addEventListener('input', () => { sv(k, el.value === D0[k]() ? '' : el.value); upd(); saveSoon(); after(k); });
  rs.addEventListener('click', e => { e.preventDefault(); sv(k, ''); el.value = D0[k](); upd(); saveSoon(); after(k); });
  // V1.9.7: mọi ô thông tin bìa / phần đầu danh mục khoá – bấm đúp mới sửa (Enter / bấm ra ngoài là khoá lại)
  { l.classList.add('lk'); const lock = () => { if (type === 'sel') el.tabIndex = -1; else el.readOnly = true; l.classList.remove('open'); };
    const open = () => { if (type === 'sel') el.tabIndex = 0; else el.readOnly = false; l.classList.add('open'); el.focus(); if (el.select && type !== 'sel' && type !== 'date') el.select(); };
    lock(); l.title = 'Bấm đúp để sửa';
    l.addEventListener('dblclick', e => { e.preventDefault(); if (!l.classList.contains('open')) open(); });
    el.addEventListener('blur', () => setTimeout(lock, 120)); el.addEventListener('keydown', e => { if (e.key === 'Enter' && type !== 'area') { e.preventDefault(); el.blur(); } if (e.key === 'Escape') el.blur(); }); }
  l.dataset.k = k; l.append(el); return l;
}
function after(k) { drawPv(); if (k === 'mau') { drawForm(); drawToc(); } else { if (k === 'so') drawToc(); refill(k); } }
function refill(skip) { document.querySelectorAll('#form .fld[data-k], #head .fld[data-k]').forEach(l => { const k = l.dataset.k; if (k === skip || gv(k)) return; const el = l.querySelector('input,textarea,select'); if (el && document.activeElement !== el) el.value = D0[k](); }); }
function drawForm() {
  const F = q('#form'); F.replaceChildren(
    field('Mẫu bìa', 'mau', 'sel', { o: Object.entries(MAU).map(([k, v]) => [k, v[0]]) }),
    field('Công trình', 'ct', 'text'),
    field('Ngày trình', 'ngay', 'date'),
    field('Số (mã hồ sơ)', 'so', 'text'),
    field('Phiên bản', 'pb', 'text'),
    field('Ngày phát hành', 'ph', 'date'),
    field('Chủ đề – yêu cầu phê duyệt', 'chude', 'text', { w: 1 }),
    field('Diễn giải chi tiết yêu cầu phê duyệt', 'dien', 'area', { w: 1, rows: 3 }),
    field('Trình duyệt bao gồm (tự ghi theo danh mục)', 'gom', 'area', { w: 1, rows: 2 }));
  if (V.mau() !== 'shop') F.append(field('Nhà thầu', 'nt', 'text'));
  else { const l = $('div', 'fld w'); l.append($('span', 'lb', 'Loại tài liệu')); const c = $('div', 'chks');
    LOAI.forEach(([k, t]) => { const lb = $('label'), b = $('input'); b.type = 'checkbox'; b.checked = !!CV.loai[k]; b.addEventListener('change', () => { CV.loai = { ...CV.loai, [k]: b.checked }; saveSoon(); drawPv(); }); lb.append(b, t); c.append(lb); });
    l.append(c); F.append(l);
    l.classList.add('lk'); l.title = 'Bấm đúp để sửa'; const bx = () => [...c.querySelectorAll('input')], lockB = () => { bx().forEach(b => { b.disabled = true; }); l.classList.remove('open'); };   // V1.9.7: khoá như các ô khác
    lockB(); l.addEventListener('dblclick', e => { e.preventDefault(); bx().forEach(b => { b.disabled = false; }); l.classList.add('open'); }); l.addEventListener('mouseleave', lockB); }
  q('#head').replaceChildren(field('Tiêu đề danh mục', 'tt', 'text', { w: 1 }), field('Dự án', 'da', 'text', { w: 1 }), field('Hạng mục / Gói thầu', 'hm', 'text', { w: 1 }), field('Địa điểm', 'dd', 'text', { w: 1 }),
    field('Ban điều hành dự án', 'bdh', 'text'), field('Đơn vị TVGS', 'tvgs', 'text'));
}
function drawToc() {
  const tb = q('#tb'); tb.replaceChildren(); const N = numbering(), L = docs();
  q('#sum').textContent = L.length ? L.length + ' tài liệu · ' + L.filter(coOf).length + ' có · ' + (L.length - L.filter(coOf).length) + ' không' : '';
  if (!CV.items.length) { const r = $('tr', 'none'), d = $('td', '', 'Chưa có dòng nào – bấm 📋 Mẫu Hồ sơ pháp lý, hoặc ＋ Phần / ＋ Nhóm / ＋ Tài liệu'); d.colSpan = 5; r.append(d); tb.append(r); return; }
  CV.items.forEach((it, i) => {
    const r = $('tr', 'lv-' + it.lv), n = N[i];
    const lv = $('select', 'lvs'); [['p', 'Phần'], ['g', 'Nhóm'], ['d', 'Tài liệu']].forEach(([v, t]) => { const o = $('option', '', t); o.value = v; lv.append(o); }); lv.value = it.lv; lv.title = 'Cấp của dòng'; lv.addEventListener('change', () => { it.lv = lv.value; saveSoon(); draw(); });
    const c0 = $('td', 'st'); c0.append($('b', '', n.stt || '·'), lv);
    const t = $('input', 'nm'); t.value = it.t || ''; t.placeholder = it.lv === 'p' ? 'TÊN PHẦN (vd HỒ SƠ PHÁP LÝ)' : it.lv === 'g' ? 'Tên nhóm (vd Hồ sơ năng lực)' : 'Tên tài liệu'; t.addEventListener('input', () => { it.t = t.value; saveSoon(); drawPv(); });
    const c1 = $('td'); c1.append(t);
    const c2 = $('td', 'cc'), c4 = $('td');
    if (it.lv === 'd') {
      const co = $('select', 'co ' + (coOf(it) ? 'y' : 'n')); [['1', '✓ Có'], ['0', '✗ Không']].forEach(([v, x]) => { const o = $('option', '', x); o.value = v; co.append(o); }); co.value = String(coOf(it));
      co.addEventListener('change', () => { it.co = +co.value; saveSoon(); draw(); }); c2.append(co);
      const nt = $('input'); nt.value = it.note || ''; nt.placeholder = 'Ghi chú'; nt.addEventListener('input', () => { it.note = nt.value; saveSoon(); drawPv(); }); c4.append(nt);
    }
    const x = $('td', 'x');
    const mv = (d, lb, tl) => { const b = $('button', 'sm', lb); b.type = 'button'; b.title = tl; b.disabled = !CV.items[i + d]; b.addEventListener('click', () => { const z = CV.items.splice(i, 1)[0]; CV.items.splice(i + d, 0, z); saveSoon(); draw(); }); return b; };
    const ad = $('button', 'sm', '＋'); ad.type = 'button'; ad.title = 'Thêm 1 tài liệu ngay dưới dòng này'; ad.addEventListener('click', () => { CV.items.splice(i + 1, 0, { id: uid(), lv: 'd', t: '', note: '' }); saveSoon(); draw(); const z = q('#tb').children[i + 1]; z && z.querySelector('input.nm').focus(); });
    const del = $('button', 'sm', '✕'); del.type = 'button'; del.title = 'Xoá dòng';
    del.addEventListener('click', () => { if (it.t && !confirm('Xoá dòng "' + (it.t || it.fname) + '"?')) return; CV.items.splice(i, 1); if (it.fid) fdel(it.fid); saveSoon(); draw(); });
    x.append(mv(-1, '↑', 'Lên'), mv(1, '↓', 'Xuống'), ad, del);
    r.append(c0, c1, c2, c4, x); tb.append(r);
  });
}
function addRow(lv) { CV.items.push({ id: uid(), lv, t: '', note: '' }); saveSoon(); draw(); const z = q('#tb').lastElementChild; z && z.querySelector('input.nm').focus(); }
// ---------- bìa A4 (HTML dùng chung: xem trước, in, xuất PDF) ----------
const CV_CSS = `
.cvp{width:794px;height:1123px;padding:34px 38px;background:#fff;color:#000;font:13.3px/1.3 "Times New Roman",Times,serif;box-sizing:border-box}
.cvp *{box-sizing:border-box}
.cvp table{width:100%;border-collapse:collapse;table-layout:fixed}
.cvp td{border:1px solid #000;padding:3px 6px;vertical-align:middle}
.cvp .nb td{border:0}
.cvp .lg{text-align:center;padding:4px}.cvp .lg img{max-width:100%;max-height:62px;display:block;margin:auto}
.cvp .h{font-size:13px}.cvp .tit{text-align:center;font-weight:700;font-size:18.6px;height:46px}
.cvp b{font-weight:700}.cvp .c{text-align:center}.cvp .pe{background:#F8CBAD;font-weight:700}.cvp .gr{background:#E2EFDA}
.cvp .bx{display:inline-block;width:11px;height:11px;border:1.3px solid #000;vertical-align:-1px;margin-right:8px;position:relative}
.cvp .bx.on::after{content:"";position:absolute;left:2px;top:-2px;width:4px;height:8px;border:solid #000;border-width:0 2px 2px 0;transform:rotate(45deg)}
.cvp .sig{height:96px;vertical-align:bottom;font-size:12.5px}
.cvp .pre{white-space:pre-wrap}
.cvp .sp{height:8px;border-left:0;border-right:0}
.cvp.dm{padding:40px 46px;font-size:14px}
.cvp.dm .hd{display:flex;align-items:center;gap:18px;margin-bottom:10px}.cvp.dm .hd img{height:58px}.cvp.dm h1{flex:1;font-size:19px;text-align:center;margin:0;padding-right:120px}
.cvp.dm .inf{margin:0 0 12px}.cvp.dm .inf td{border:0;padding:2px 4px;vertical-align:top;font-size:13.3px}.cvp.dm .inf td:first-child{width:190px;font-weight:700}
.cvp.dm th{border:1px solid #000;padding:5px 6px;font-weight:700;text-align:center}
.cvp.dm .t td{padding:4px 7px;height:32px}.cvp.dm tr.p td{font-weight:700}.cvp.dm tr.g td{font-weight:700}.cvp.dm tr.d td.n{font-style:italic}
.cvp.dm tr.d.lk td.n{color:#1F3F8A}.cvp.dm td.gc{font-size:11.5px}.cvp.dm td.gc b{font-family:Consolas,"Courier New",monospace;font-weight:600}
.cvp.dm .ft{margin-top:8px;font-size:11.5px;color:#444}
`;
const L = () => window.HH_CV_LOGO || {};
function coverHTML() {
  const m = V.mau(), lg = L(), box = on => '<span class="bx' + (on ? ' on' : '') + '"></span>';
  const head = `<table><colgroup><col style="width:21%"><col style="width:40%"><col style="width:21%"><col style="width:18%"></colgroup>
<tr><td class="lg" rowspan="3"><img src="${lg.acon || ''}"></td><td class="h">Công trình: ${esc(V.ct())}</td><td class="lg" rowspan="3"><img src="${lg.coninco || ''}"></td><td class="lg" rowspan="3"><img src="${lg.tanthuy || ''}"></td></tr>
<tr><td class="h">Ngày &nbsp; &nbsp; &nbsp; &nbsp;: ${esc(fd(V.ngay()))}</td></tr><tr><td class="h">Số &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;: ${esc(V.so())}</td></tr>
<tr><td class="tit" colspan="4">${MAU[m][1]}</td></tr></table>`;
  const meta = `<table><colgroup><col style="width:17%"><col style="width:18%"><col style="width:8%"><col style="width:27%"><col style="width:12%"><col style="width:18%"></colgroup>
${m !== 'shop' ? `<tr><td colspan="6"><b>NHÀ THẦU: ${esc(V.nt())}</b></td></tr>` : ''}
<tr><td class="c"><b>Ngày trình duyệt:</b></td><td class="c">${esc(fd(V.ngay()))}</td><td class="c"><b>Số:</b></td><td class="c" style="font-size:11.5px">${esc(V.so())}</td><td class="c"><b>Phiên bản:</b></td><td class="c">${esc(V.pb())}</td></tr>
${m !== 'shop' ? `<tr><td class="c"><b>CHỦ ĐỀ</b></td><td colspan="5">Yêu cầu phê duyệt: ${esc(V.chude())}</td></tr>` : ''}
<tr><td colspan="6" class="pe">DIỄN GIẢI CHI TIẾT YÊU CẦU PHÊ DUYỆT</td></tr>
<tr><td colspan="6" class="pre" style="height:${m === 'shop' ? 92 : 120}px;vertical-align:top">${esc(V.dien())}</td></tr></table>`;
  const gom = m !== 'shop'
    ? `<table><colgroup><col style="width:55%"><col style="width:15%"><col style="width:30%"></colgroup>
<tr><td class="c"><b>Trình duyệt bao gồm</b></td><td class="c"><b>Ngày phát hành</b></td><td class="c"><b>Đại diện Nhà thầu ký tên:</b></td></tr>
<tr><td class="pre" style="height:70px">${esc(V.gom())}</td><td class="c">${esc(fd(V.ph()))}</td><td></td></tr></table>`
    : `<table><colgroup><col style="width:52%"><col style="width:12%"><col style="width:36%"></colgroup>
<tr><td colspan="2"><b>Trình duyệt bao gồm:</b> ${esc(V.gom())}</td><td rowspan="6" style="vertical-align:top"><b>Đại diện Nhà thầu ký tên:</b><div style="height:70px"></div><div style="font-size:12px">Họ tên/ Full-name: ……………………………</div><div style="font-size:12px;margin-top:4px">Ngày ký/ Date: ……………………………</div></td></tr>
<tr><td colspan="2" class="c"><b>Loại tài liệu</b></td></tr>
${LOAI.map(([k, t]) => `<tr><td><b>${t}</b></td><td class="c">${box(CV.loai && CV.loai[k])}</td></tr>`).join('')}</table>`;
  const tt = `<table><colgroup><col style="width:12%"><col style="width:43%"><col style="width:22%"><col style="width:23%"></colgroup>
<tr><td colspan="4" class="pe">TÌNH TRẠNG PHÊ DUYỆT</td></tr>
<tr><td class="c"><b>A</b></td><td><b>CHẤP THUẬN</b></td><td rowspan="3" class="c"><b>TÌNH TRẠNG PHÊ DUYỆT</b></td><td rowspan="3" class="gr"></td></tr>
<tr><td class="c"><b>B</b></td><td><b>CHẤP THUẬN - CÓ Ý KIẾN</b></td></tr><tr><td class="c"><b>C</b></td><td><b>KHÔNG CHẤP THUẬN, ĐỆ TRÌNH LẠI</b></td></tr></table>`;
  const eva = t => `<table><tr><td class="pe">${t}</td></tr>
<tr><td style="padding:6px 6px 2px 24px">${box()}<b>CHẤP THUẬN</b></td></tr><tr><td style="padding:2px 6px 2px 24px;border-top:0">${box()}<b>CHẤP THUẬN - CÓ Ý KIẾN</b></td></tr><tr><td style="padding:2px 6px 6px 24px;border-top:0">${box()}<b>KHÔNG CHẤP THUẬN, ĐỆ TRÌNH LẠI</b></td></tr>
<tr><td class="sig"><table class="nb"><tr><td style="width:52%">Người phê duyệt:…........................................................</td><td style="width:20%">Chữ ký:</td><td style="width:14%">Ngày:</td><td>…./…./20..</td></tr></table></td></tr></table>`;
  return `<div class="cvp">${head}${meta}${gom}${tt}${eva('TƯ VẤN GIÁM SÁT ĐÁNH GIÁ')}${eva('CHỦ ĐẦU TƯ - BAN QUẢN LÝ DỰ ÁN ĐÁNH GIÁ')}</div>`;
}
// ---------- DANH MỤC HỒ SƠ (mục lục theo mẫu bìa còng: Stt | Tên hồ sơ | Có | Không | Ghi chú) ----------
const R1 = 17, RN = 24;   // số dòng trang đầu (có phần thông tin dự án) / các trang sau
const dmPages = () => { const n = CV.items.length; return n <= R1 ? 1 : 1 + Math.ceil((n - R1) / RN); };
function dmHTML(page, nPages, starts) {
  const N = numbering(), a = page ? R1 + (page - 1) * RN : 0, b = page ? a + RN : R1, lg = L(), ck = '<b style="font-size:15px">✓</b>';
  const rows = CV.items.slice(a, b).map((it, j) => { const i = a + j, n = N[i];
    if (it.lv !== 'd') return `<tr class="${it.lv}"><td class="c">${n.stt}</td><td class="n">${esc(it.lv === 'p' ? String(it.t || '').toUpperCase() : it.t)}</td><td></td><td></td><td></td></tr>`;
    const co = coOf(it), gc = esc(it.note || '');
    return `<tr class="d" data-i="${i}"><td></td><td class="n">${esc(it.t)}</td><td class="c">${co ? ck : ''}</td><td class="c">${co ? '' : ck}</td><td class="gc">${gc}</td></tr>`; }).join('');
  const inf = [['DỰ ÁN', V.da()], ['HẠNG MỤC/GÓI THẦU', V.hm()], ['ĐỊA ĐIỂM', V.dd()], ['BAN ĐIỀU HÀNH DỰ ÁN', V.bdh()], ['ĐƠN VỊ TVGS', V.tvgs()], ['NHÀ THẦU', V.nt()]];
  return `<div class="cvp dm">${page ? '' : `<div class="hd"><img src="${lg.acon || ''}"><h1>${esc(V.tt())}</h1></div>
<table class="inf">${inf.map(([k, v]) => `<tr><td>${k}</td><td>: ${esc(v)}</td></tr>`).join('')}</table>`}
<table class="t"><colgroup><col style="width:7%"><col style="width:53%"><col style="width:8%"><col style="width:9%"><col style="width:23%"></colgroup>
<thead><tr><th>Stt</th><th>Tên hồ sơ</th><th>Có</th><th>Không</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table>
<p class="ft">${esc(V.so())} · ${esc(V.pb())} · ${esc(fd(V.ngay()))} · trang danh mục ${page + 1}/${nPages}</p></div>`;
}
let pvTab = 'cv';
function drawPv() {
  const dm = pvTab === 'dm'; q('#pv').innerHTML = dm ? dmHTML(0, dmPages(), null) : coverHTML();
  document.querySelectorAll('.pvt button').forEach(b => b.classList.toggle('on', b.dataset.t === pvTab));
  q('#hCode').textContent = V.so() + ' · ' + V.pb() + ' · ' + MAU[V.mau()][0];
}
function draw() { drawToc(); drawPv(); refill(); }
function pick(multi = true) { return new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.multiple = multi; i.onchange = () => ok([...i.files]); i.click(); }); }

// ---------- chụp HTML → ảnh (SVG foreignObject) ----------
async function shot(html, scale = 2) {
  const box = document.createElement('div'); box.innerHTML = html;
  const xml = new XMLSerializer().serializeToString(box.firstElementChild);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${794 * scale}" height="${1123 * scale}" viewBox="0 0 794 1123"><foreignObject x="0" y="0" width="794" height="1123"><div xmlns="http://www.w3.org/1999/xhtml"><style>${CV_CSS.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</style>${xml}</div></foreignObject></svg>`;
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
  const c = document.createElement('canvas'); c.width = 794 * scale; c.height = 1123 * scale; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.92)); return new Uint8Array(await b.arrayBuffer());
}
function measure(html) {   // vị trí từng dòng mục lục (px trên trang 794×1123) để gắn liên kết bấm mã
  const h = document.createElement('div'); h.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px'; h.innerHTML = '<style>' + CV_CSS + '</style>' + html; document.body.append(h);
  const p = h.querySelector('.cvp').getBoundingClientRect(), out = {};
  h.querySelectorAll('tr[data-i]').forEach(r => { const b = r.getBoundingClientRect(); out[r.dataset.i] = [b.left - p.left, b.top - p.top, b.right - p.left, b.bottom - p.top]; });
  h.remove(); return out;
}
const dl = (bytes, name, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); };
const fname = s => String(s).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 150);

async function exportPdf() {   // V1.9.4: bìa + danh mục hồ sơ (không gộp file)
  const btn = q('#bPdf'); btn.disabled = true;
  try {
    const { PDFDocument, PDFName, PDFHexString, PDFNumber } = await pdflib(), W = 595.28, H = 841.89;
    msg('⏳ Đang tạo PDF…');
    const doc = await PDFDocument.create(); doc.setTitle(V.so() + ' – ' + V.chude()); doc.setAuthor(V.nt()); doc.setCreator('HaoHao – Site Brain');
    const addImgPage = async jpg => { const im = await doc.embedJpg(jpg); const pg = doc.addPage([W, H]); pg.drawImage(im, { x: 0, y: 0, width: W, height: H }); return pg; };
    const cov = await addImgPage(await shot(coverHTML())), nDm = dmPages(); let dm0 = null;
    if (CV.items.length) for (let t = 0; t < nDm; t++) { const pg = await addImgPage(await shot(dmHTML(t, nDm, null))); if (!t) dm0 = pg; }
    const ctx = doc.context, ent = [['Bìa – ' + MAU[V.mau()][1], cov]].concat(dm0 ? [[V.tt(), dm0]] : []);
    const oRef = ctx.nextRef(), refs = ent.map(() => ctx.nextRef());
    ent.forEach(([t, pg], i) => { const o = { Title: PDFHexString.fromText(t), Parent: oRef, Dest: ctx.obj([pg.ref, PDFName.of('Fit')]) }; if (i) o.Prev = refs[i - 1]; if (i < refs.length - 1) o.Next = refs[i + 1]; ctx.assign(refs[i], ctx.obj(o)); });
    ctx.assign(oRef, ctx.obj({ Type: 'Outlines', First: refs[0], Last: refs[refs.length - 1], Count: PDFNumber.of(refs.length) })); doc.catalog.set(PDFName.of('Outlines'), oRef);
    const out = await doc.save();
    dl(out, fname(V.so() + ' - Cover.pdf'), 'application/pdf');
    msg('✅ Đã xuất PDF: bìa' + (dm0 ? ' + danh mục (' + nDm + ' trang)' : '') + ' – ' + doc.getPageCount() + ' trang');
  } catch (e) { msg('⚠ Chưa xuất được: ' + (e && e.message || e), true); }
  finally { btn.disabled = false; }
}
async function exportXls() {
  const btn = q('#bXls'); btn.disabled = true;
  try {
    const src = new Uint8Array(await (await fetch('khtc-mau/cover-acon.xlsx')).arrayBuffer()), sh = MAU[V.mau()][2], m = V.mau();
    const e = { C1: 'Công trình: ' + V.ct(), C2: 'Ngày        : ' + fd(V.ngay()), C3: 'Số            : ' + V.so(), A4: MAU[m][1], C6: fd(V.ngay()), E6: V.so(), G6: V.pb() };
    if (m !== 'shop') Object.assign(e, { A5: 'NHÀ THẦU: ' + V.nt(), B7: 'Yêu cầu phê duyệt: ' + V.chude(), A9: V.dien(), A11: V.gom(), E11: fd(V.ph()) }, m === 'vl' ? { Q9: '' } : {});
    else { Object.assign(e, { A8: V.dien(), A9: 'Trình duyệt bao gồm: ' + V.gom() }); LOAI.forEach(([k], i) => { e['E' + (11 + i)] = CV.loai && CV.loai[k] ? 'þ' : 'o '; }); }
    const ed = {}; Object.entries(e).forEach(([a, v]) => { ed[a] = { value: v }; });
    let out = await XLPatch.patchWorkbook(JSZip, src, { [sh]: ed }, {});
    // chỉ để hiện sheet đúng mẫu (2 sheet còn lại ẩn)
    const z = await JSZip.loadAsync(out); let wb = await z.file('xl/workbook.xml').async('string');
    const names = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*\/>/g)].map(x => x[1].replace(/&amp;/g, '&')), ix = names.indexOf(sh);
    wb = wb.replace(/<sheet ([^>]*?)\/>/g, (all, a) => { const nm = (/name="([^"]+)"/.exec(a) || [])[1]; a = a.replace(/\s*state="[^"]*"/, ''); return '<sheet ' + a + (nm && nm.replace(/&amp;/g, '&') !== sh ? ' state="hidden"' : '') + '/>'; });
    wb = /<workbookView[^>]*activeTab="/.test(wb) ? wb.replace(/activeTab="\d+"/, 'activeTab="' + ix + '"') : wb.replace(/<workbookView /, '<workbookView activeTab="' + ix + '" ');
    wb = wb.replace(/firstSheet="\d+"/, 'firstSheet="' + ix + '"');
    z.file('xl/workbook.xml', wb);
    const rels = await z.file('xl/_rels/workbook.xml.rels').async('string'), rid = (new RegExp('<sheet [^>]*name="' + sh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*r:id="([^"]+)"').exec(wb) || [])[1];
    for (const f of Object.keys(z.files).filter(f => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))) { let x = await z.file(f).async('string'); const me = rid && new RegExp('Id="' + rid + '"[^>]*Target="(?:/xl/)?worksheets/' + f.split('/').pop() + '"').test(rels) || (rid && new RegExp('Target="(?:/xl/)?worksheets/' + f.split('/').pop() + '"[^>]*Id="' + rid + '"').test(rels));
      x = x.replace(/\s*tabSelected="1"/g, ''); if (me) x = x.replace(/<sheetView /, '<sheetView tabSelected="1" '); z.file(f, x); }
    out = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    dl(out, fname(V.so() + ' - Cover.xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    msg('✅ Đã tải bìa Excel (sheet ' + sh + ')');
  } catch (e) { msg('⚠ Chưa tạo được Excel: ' + (e && e.message || e), true); }
  finally { btn.disabled = false; }
}

// ---------- khởi động ----------
(async () => {
  q('#cvcss').textContent = CV_CSS;
  for (let i = 0; i < 40 && !(globalThis.chrome && chrome.storage && chrome.storage.local); i++) await new Promise(r => setTimeout(r, 100));
  await loadData();
  if (!X) { document.body.innerHTML = '<p style="padding:40px;font:16px system-ui">Không tìm thấy hồ sơ – mở lại từ tab QA/QC Shop trong Công trình.</p>'; return; }
  document.title = 'Cover ' + V.so() + ' – HaoHao';
  drawForm(); draw();
  q('#bP').addEventListener('click', () => addRow('p')); q('#bG').addEventListener('click', () => addRow('g')); q('#bD').addEventListener('click', () => addRow('d'));
  q('#bTpl').addEventListener('click', () => { if (CV.items.length && !confirm('Thêm mẫu "Hồ sơ pháp lý" (16 dòng) vào cuối danh mục đang có?')) return; TPL_PL.forEach(([lv, t]) => CV.items.push({ id: uid(), lv, t, note: '' })); saveSoon(); draw(); msg('📋 Đã thêm mẫu Hồ sơ pháp lý – bấm 📎 Gắn file ở từng dòng'); });
  q('#bPdf').addEventListener('click', exportPdf);
  q('#bXls').addEventListener('click', exportXls);
  q('#bPrint').addEventListener('click', () => window.print());
  document.querySelectorAll('.pvt button').forEach(b => b.addEventListener('click', () => { pvTab = b.dataset.t; drawPv(); }));
  chrome.storage.onChanged.addListener((ch, a) => { if (a !== 'local' || !ch.siteBrain) return; const D = ch.siteBrain.newValue; const s = D && D.sites.find(z => z.id === SID), x = s && s.subs.find(z => z.id === XID); if (!x) return; S = s; X = x;
    if (document.activeElement.matches('input,textarea,select')) return;
    if (JSON.stringify(x.cv || null) !== JSON.stringify(CV)) { CV = cvOf(x); drawForm(); draw(); } else { refill(); drawPv(); } });   // bên ngoài sửa Mô tả / Ngày / ↻ trình lại → ô mặc định tự đổi theo
  window.addEventListener('beforeunload', () => { if (saveT) { clearTimeout(saveT); saveNow(); } });
})();
