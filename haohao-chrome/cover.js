// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📄 V1.9.0: COVER HỒ SƠ TRÌNH (tab QA/QC Shop) – bìa "Yêu cầu phê duyệt" theo mẫu ACON (Tài liệu / Vật liệu / Shop-BPTC),
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
const MAU = { tl: ['Tài liệu', 'YÊU CẦU PHÊ DUYỆT TÀI LIỆU', 'TÀI LIỆU'], vl: ['Vật liệu', 'YÊU CẦU PHÊ DUYỆT VẬT LIỆU', 'VẬT LIỆU'], shop: ['Shopdrawing / BPTC', 'YÊU CẦU PHÊ DUYỆT SHOPDRAWING', 'SHOP-BPTC'] };
const KIND = ['Bản vẽ', 'Thuyết minh', 'Catalogue', 'Chứng chỉ CO/CQ', 'Biểu mẫu', 'Hợp đồng / báo giá', 'Khác'];
const LOAI = [['bptc', 'Hồ sơ bản vẽ biện pháp thi công'], ['shop', 'Hồ sơ bản vẽ shopdrawing'], ['bm', 'Hồ sơ biểu mẫu nghiệm thu'], ['khac', 'Khác']];
let S = null, X = null, CV = null;
const mauOf = g => g === 'MAA' ? 'vl' : (g === 'SHD' || g === 'MTS') ? 'shop' : 'tl';
const rv = x => 'R' + pad(+x.rev || 0);
const NT0 = 'CÔNG TY CỔ PHẦN ĐẦU TƯ XÂY DỰNG ACON';
function cvOf(x) {
  const c = x.cv && typeof x.cv === 'object' ? x.cv : {};
  return { mau: c.mau || mauOf(x.grp), ct: c.ct || '', ngay: c.ngay || '', so: c.so || '', pb: c.pb || '', chude: c.chude || '', dien: c.dien || '', gom: c.gom || '', ph: c.ph || '', nt: c.nt || '',
    loai: c.loai || { bptc: x.grp === 'MTS', shop: x.grp === 'SHD', bm: false, khac: false }, items: Array.isArray(c.items) ? c.items : [] };
}
// giá trị hiển thị (ô trống → tự lấy từ hồ sơ)
const V = {
  ct: () => CV.ct || ('Khách sạn ' + (S.name || '')).replace(/^Khách sạn (Khách sạn )/, '$1'),
  ngay: () => CV.ngay || X.d || today(), so: () => CV.so || CODE0, pb: () => CV.pb || rv(X),
  chude: () => CV.chude || X.t || '', nt: () => CV.nt || NT0, ph: () => CV.ph || CV.ngay || X.d || today(),
  dien: () => CV.dien || ('Công ty cổ phần đầu tư xây dựng ACON kính gửi chủ đầu tư, ban quản lý, tư vấn giám sát phê duyệt: ' + (CV.chude || X.t || '')),
  gom: () => CV.gom || autoGom(),
};
const itCode = i => V.so() + '-' + pad(i + 1);
function autoGom() {
  if (!CV.items.length) return '';
  const n = {}; CV.items.forEach(it => { n[it.kind] = (n[it.kind] || 0) + 1; });
  const pg = CV.items.reduce((a, it) => a + (+it.pages || 0), 0);
  return KIND.filter(k => n[k]).map(k => pad(n[k]) + ' ' + k.toLowerCase()).join(', ') + (pg ? ' (' + pg + ' trang)' : '');
}
async function loadData() {
  const r = await chrome.storage.local.get('siteBrain'); const D = r.siteBrain || { sites: [] };
  S = (D.sites || []).find(z => z.id === SID) || null; X = S && (S.subs || []).find(z => z.id === XID) || null;
  if (X) CV = cvOf(X);
}
let saveT = 0;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveNow, 350); }
async function saveNow() {   // đọc bản mới nhất rồi chỉ ghi phần cv của đúng hồ sơ này (không đè thay đổi khác của trang Công trình)
  const r = await chrome.storage.local.get('siteBrain'); const D = r.siteBrain; if (!D) return;
  const s = (D.sites || []).find(z => z.id === SID), x = s && (s.subs || []).find(z => z.id === XID); if (!x) return;
  x.cv = JSON.parse(JSON.stringify(CV)); await chrome.storage.local.set({ siteBrain: D });
}
// ---------- file trên máy (IndexedDB) ----------
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('hhCover', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const fget = async k => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('f').objectStore('f').get(k); t.onsuccess = () => ok(t.result || null); t.onerror = () => no(t.error); }); };
const fput = async (k, v) => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').put(v, k); t.oncomplete = ok; t.onerror = () => no(t.error); }); };
const fdel = async k => { const d = await idb(); return new Promise(ok => { const t = d.transaction('f', 'readwrite'); t.objectStore('f').delete(k); t.oncomplete = ok; t.onerror = ok; }); };
let pdflibP; const pdflib = () => pdflibP ||= import('./lib/pdflib/pdf-lib.esm.min.js');
const isPdf = f => /pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name || '');
const isImg = f => /^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type || '') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name || '');
function guessKind(n) {
  const s = n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  if (/catalog|brochure/.test(s)) return 'Catalogue';
  if (/\bco\b|\bcq\b|chung chi|chung nhan|certificate|test|thi nghiem|kiem dinh/.test(s)) return 'Chứng chỉ CO/CQ';
  if (/thuyet minh|\btm\b|bien phap|method|quy trinh/.test(s)) return 'Thuyết minh';
  if (/bieu mau|bien ban|checklist|\bbm\b/.test(s)) return 'Biểu mẫu';
  if (/bao gia|hop dong|quotation|contract/.test(s)) return 'Hợp đồng / báo giá';
  if (/\.(dwg|dxf)$/.test(s) || /ban ve|shop|\bbv\b|\bsd\b|drawing|mat bang|mat cat|chi tiet/.test(s)) return 'Bản vẽ';
  return CV.mau === 'shop' ? 'Bản vẽ' : 'Khác';
}
async function addFiles(files) {
  const L = [...files]; if (!L.length) return;
  msg('⏳ Đang đọc ' + L.length + ' file…');
  for (const f of L) {
    const bytes = new Uint8Array(await f.arrayBuffer()), fid = 'f_' + uid();
    let pages = 0;
    if (isPdf(f)) { try { const { PDFDocument } = await pdflib(); pages = (await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount(); } catch { pages = 0; } }
    else if (isImg(f)) pages = 1;
    await fput(fid, { name: f.name, type: f.type || '', bytes });
    CV.items.push({ id: uid(), t: f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim(), kind: guessKind(f.name), pages, fid, fname: f.name, size: f.size, mime: f.type || '', pdf: isPdf(f) ? 1 : 0, img: isImg(f) ? 1 : 0 });
  }
  saveSoon(); draw(); msg('📎 Đã thêm ' + L.length + ' file vào mục lục');
}
async function openFile(it) {
  const r = it.fid && await fget(it.fid);
  if (!r) return msg('File "' + (it.fname || it.t) + '" không có trên máy này – bấm ✎ để chọn lại file.', true);
  const u = URL.createObjectURL(new Blob([r.bytes], { type: r.type || 'application/octet-stream' }));
  if (it.pdf || it.img) window.open(u, '_blank'); else { const a = document.createElement('a'); a.href = u; a.download = r.name; a.click(); }
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}
// ---------- giao diện ----------
function field(lb, k, type, opts = {}) {
  const l = $('label', opts.w ? 'w' : ''); l.append(lb);
  const el = type === 'area' ? $('textarea') : type === 'sel' ? $('select') : $('input');
  if (type === 'sel') opts.o.forEach(([v, t]) => { const o = $('option', '', t); o.value = v; el.append(o); });
  else if (type !== 'area') el.type = type || 'text';
  el.value = CV[k] || ''; if (opts.ph) el.placeholder = opts.ph();
  if (type === 'area') el.rows = opts.rows || 3;
  el.addEventListener('input', () => { CV[k] = el.value; saveSoon(); drawPv(); if (k === 'mau') drawForm(); if (k === 'so') drawToc(); });
  l.append(el); return l;
}
function drawForm() {
  const F = q('#form'); F.replaceChildren(
    field('Mẫu bìa', 'mau', 'sel', { o: Object.entries(MAU).map(([k, v]) => [k, v[0]]) }),
    field('Công trình', 'ct', 'text', { ph: V.ct }),
    field('Ngày trình', 'ngay', 'date'),
    field('Số (mã hồ sơ)', 'so', 'text', { ph: () => CODE0 }),
    field('Phiên bản', 'pb', 'text', { ph: () => rv(X) }),
    field('Ngày phát hành', 'ph', 'date'),
    field('Chủ đề – yêu cầu phê duyệt', 'chude', 'text', { ph: () => X.t || '', w: 1 }),
    field('Diễn giải chi tiết yêu cầu phê duyệt', 'dien', 'area', { ph: V.dien, w: 1, rows: 3 }),
    field('Trình duyệt bao gồm (để trống = tự ghi theo mục lục)', 'gom', 'area', { ph: () => autoGom() || 'vd: 05 bản vẽ, 01 thuyết minh', w: 1, rows: 2 }));
  if (CV.mau !== 'shop') F.append(field('Nhà thầu', 'nt', 'text', { ph: () => NT0, w: 1 }));
  else { const l = $('label', 'w'); l.append('Loại tài liệu'); const c = $('div', 'chks');
    LOAI.forEach(([k, t]) => { const lb = $('label'), b = $('input'); b.type = 'checkbox'; b.checked = !!CV.loai[k]; b.addEventListener('change', () => { CV.loai = { ...CV.loai, [k]: b.checked }; saveSoon(); drawPv(); }); lb.append(b, t); c.append(lb); });
    l.append(c); F.append(l); }
  if (!CV.ngay) q('#form input[type=date]').value = '';
}
function drawToc() {
  const tb = q('#tb'); tb.replaceChildren();
  q('#sum').textContent = CV.items.length ? CV.items.length + ' tài liệu · ' + CV.items.reduce((a, it) => a + (+it.pages || 0), 0) + ' trang' : '';
  if (!CV.items.length) { const r = $('tr', 'none'), d = $('td', '', 'Chưa có tài liệu – bấm 📎 Chọn file'); d.colSpan = 6; r.append(d); tb.append(r); return; }
  CV.items.forEach((it, i) => {
    const r = $('tr'), a = $('a', 'code', itCode(i)); a.title = 'Mở file: ' + (it.fname || ''); a.addEventListener('click', () => openFile(it));
    const t = $('input'); t.value = it.t; t.addEventListener('input', () => { it.t = t.value; saveSoon(); drawPv(); });
    const k = $('select'); KIND.forEach(v => { const o = $('option', '', v); o.value = v; k.append(o); }); k.value = it.kind; k.addEventListener('change', () => { it.kind = k.value; saveSoon(); drawPv(); drawToc(); });
    const pg = $('td', 'r', it.pdf || it.img ? String(it.pages || 0) : 'gửi kèm');
    const f = $('td', 'f', (it.fname || '') + (it.size ? ' · ' + (it.size / 1048576).toFixed(it.size > 1048576 ? 1 : 2) + ' MB' : '')); f.title = it.fname || '';
    const x = $('td', 'x');
    const mv = (d, lb, tl) => { const b = $('button', 'sm', lb); b.type = 'button'; b.title = tl; b.disabled = !CV.items[i + d]; b.addEventListener('click', () => { const z = CV.items.splice(i, 1)[0]; CV.items.splice(i + d, 0, z); saveSoon(); draw(); }); return b; };
    const re = $('button', 'sm', '✎'); re.type = 'button'; re.title = 'Chọn lại file cho dòng này';
    re.addEventListener('click', async () => { const fl = await pick(false); if (!fl[0]) return; const old = it.fid; await addFiles(fl); const nw = CV.items.pop(); Object.assign(it, { fid: nw.fid, fname: nw.fname, size: nw.size, mime: nw.mime, pages: nw.pages, pdf: nw.pdf, img: nw.img }); if (old) fdel(old); saveSoon(); draw(); });
    const del = $('button', 'sm', '✕'); del.type = 'button'; del.title = 'Bỏ khỏi mục lục';
    del.addEventListener('click', () => { if (!confirm('Bỏ "' + it.t + '" khỏi mục lục?')) return; CV.items.splice(i, 1); if (it.fid) fdel(it.fid); saveSoon(); draw(); });
    x.append(mv(-1, '↑', 'Lên'), mv(1, '↓', 'Xuống'), re, del);
    const c0 = $('td'); c0.append(a); const c1 = $('td'); c1.append(t); const c2 = $('td'); c2.append(k);
    r.append(c0, c1, c2, pg, f, x); tb.append(r);
    fget(it.fid).then(z => { if (!z) { a.classList.add('nf'); a.title = 'File chưa có trên máy này – bấm ✎ chọn lại'; } }).catch(() => {});
  });
}
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
.cvp.toc h1{font-size:18.6px;text-align:center;margin:6px 0 4px}.cvp.toc .sub{text-align:center;margin:0 0 14px}
.cvp.toc th{border:1px solid #000;padding:5px 6px;background:#F8CBAD;font-weight:700;text-align:center}
.cvp.toc td{padding:5px 6px;height:30px}.cvp.toc td.code{font:12px Consolas,"Courier New",monospace;color:#1F4E9A;text-decoration:underline;white-space:nowrap}
.cvp.toc .r{text-align:right}.cvp.toc .ft{margin-top:10px;font-size:12px;color:#444}
`;
const L = () => window.HH_CV_LOGO || {};
function coverHTML() {
  const m = CV.mau, lg = L(), box = on => '<span class="bx' + (on ? ' on' : '') + '"></span>';
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
const ROWS = 24;
function tocHTML(page, nPages, starts) {
  const it = CV.items.slice(page * ROWS, page * ROWS + ROWS);
  return `<div class="cvp toc"><h1>MỤC LỤC HỒ SƠ TRÌNH DUYỆT</h1><p class="sub"><b>${esc(V.so())}</b> · ${esc(V.pb())} · ${esc(fd(V.ngay()))}<br>${esc(V.chude())}</p>
<table><colgroup><col style="width:7%"><col style="width:30%"><col style="width:37%"><col style="width:14%"><col style="width:12%"></colgroup>
<thead><tr><th>STT</th><th>Mã tài liệu</th><th>Tên tài liệu</th><th>Loại</th><th>Trang</th></tr></thead><tbody>
${it.map((x, j) => { const i = page * ROWS + j, st = starts[i]; return `<tr data-i="${i}"><td class="c">${i + 1}</td><td class="code">${esc(itCode(i))}</td><td>${esc(x.t)}</td><td class="c">${esc(x.kind)}</td><td class="r">${st ? st + (x.pages > 1 ? '–' + (st + x.pages - 1) : '') : 'gửi kèm'}</td></tr>`; }).join('')}
</tbody></table><p class="ft">Bấm mã tài liệu để tới trang tương ứng · Trang mục lục ${page + 1}/${nPages} · ${esc(V.ct())}</p></div>`;
}
function drawPv() { q('#pv').innerHTML = coverHTML(); q('#hCode').textContent = V.so() + ' · ' + V.pb() + ' · ' + MAU[CV.mau][0]; }
function draw() { drawToc(); drawPv(); }
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

async function exportPdf() {
  const btn = q('#bPdf'); btn.disabled = true;
  try {
    const PL = await pdflib(), { PDFDocument, PDFName, PDFHexString, PDFNumber } = PL;
    const W = 595.28, H = 841.89, k = W / 794;
    // file thật: kiểm tra trước, đếm trang thật
    const files = []; let miss = 0;
    for (const it of CV.items) { const r = (it.pdf || it.img) ? await fget(it.fid) : null; if ((it.pdf || it.img) && !r) miss++; files.push(r); }
    if (miss && !confirm(miss + ' file chưa có trên máy này (mã màu cam) – vẫn xuất, các file đó ghi "gửi kèm"?')) return;
    msg('⏳ Đang gộp hồ sơ…');
    const srcs = [];
    for (let i = 0; i < CV.items.length; i++) { const it = CV.items[i], r = files[i]; if (!r) { srcs.push(null); continue; }
      if (it.pdf) { try { const d = await PDFDocument.load(r.bytes, { ignoreEncryption: true }); srcs.push({ pdf: d, n: d.getPageCount() }); } catch { srcs.push(null); } }
      else srcs.push({ img: r, n: 1 }); }
    const nToc = Math.max(1, Math.ceil(CV.items.length / ROWS)), starts = []; let p = 1 + nToc;
    srcs.forEach((s, i) => { if (s) { starts[i] = p + 1; CV.items[i].pages = s.n; p += s.n; } else starts[i] = 0; });
    const doc = await PDFDocument.create(); doc.setTitle(V.so() + ' – ' + V.chude()); doc.setAuthor(V.nt()); doc.setCreator('HaoHao – Site Brain');
    const addImgPage = async (jpg, w = W, h = H) => { const im = await doc.embedJpg(jpg); const pg = doc.addPage([w, h]); pg.drawImage(im, { x: 0, y: 0, width: w, height: h }); return pg; };
    await addImgPage(await shot(coverHTML()));
    const tocPages = [], tocRects = [];
    for (let t = 0; t < nToc; t++) { const h = tocHTML(t, nToc, starts); tocPages.push(await addImgPage(await shot(h))); tocRects.push(measure(h)); }
    const first = [];
    for (let i = 0; i < srcs.length; i++) { const s = srcs[i]; if (!s) { first.push(null); continue; }
      if (s.pdf) { const cp = await doc.copyPages(s.pdf, s.pdf.getPageIndices()); cp.forEach(pg => doc.addPage(pg)); first.push(cp[0]); }
      else { const r = s.img; let bytes = r.bytes, jpg = /jpe?g/i.test(r.type) || /\.jpe?g$/i.test(r.name), png = /png/i.test(r.type) || /\.png$/i.test(r.name);
        if (!jpg && !png) { const bm = await createImageBitmap(new Blob([bytes])); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0); bytes = new Uint8Array(await (await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.92))).arrayBuffer()); jpg = true; }
        const im = jpg ? await doc.embedJpg(bytes) : await doc.embedPng(bytes); const land = im.width > im.height, pw = land ? H : W, ph = land ? W : H;
        const sc = Math.min((pw - 40) / im.width, (ph - 40) / im.height), w = im.width * sc, hh = im.height * sc; const pg = doc.addPage([pw, ph]); pg.drawImage(im, { x: (pw - w) / 2, y: (ph - hh) / 2, width: w, height: hh }); first.push(pg); } }
    const ctx = doc.context, dest = pg => ctx.obj([pg.ref, PDFName.of('Fit')]);
    // liên kết bấm mã trong mục lục → trang đầu của tài liệu
    tocPages.forEach((pg, t) => { const ann = [];
      Object.entries(tocRects[t]).forEach(([i, [x1, y1, x2, y2]]) => { const tg = first[+i]; if (!tg) return;
        ann.push(ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x1 * k, H - y2 * k, x2 * k, H - y1 * k], Border: [0, 0, 0], Dest: dest(tg) }))); });
      if (ann.length) pg.node.set(PDFName.of('Annots'), ctx.obj(ann)); });
    // dấu trang (bookmark)
    const pages = doc.getPages(), ent = [['Bìa – ' + MAU[CV.mau][1], pages[0]], ['Mục lục', tocPages[0]]];
    CV.items.forEach((it, i) => { if (first[i]) ent.push([itCode(i) + ' – ' + it.t, first[i]]); });
    const oRef = ctx.nextRef(), refs = ent.map(() => ctx.nextRef());
    ent.forEach(([t, pg], i) => { const o = { Title: PDFHexString.fromText(t), Parent: oRef, Dest: dest(pg) }; if (i) o.Prev = refs[i - 1]; if (i < refs.length - 1) o.Next = refs[i + 1]; ctx.assign(refs[i], ctx.obj(o)); });
    ctx.assign(oRef, ctx.obj({ Type: 'Outlines', First: refs[0], Last: refs[refs.length - 1], Count: PDFNumber.of(refs.length) }));
    doc.catalog.set(PDFName.of('Outlines'), oRef); doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
    const out = await doc.save(); saveSoon(); drawToc();
    dl(out, fname(V.so() + ' - Bo ho so trinh.pdf'), 'application/pdf');
    msg('✅ Đã xuất bộ hồ sơ: ' + doc.getPageCount() + ' trang (' + (out.length / 1048576).toFixed(1) + ' MB)');
  } catch (e) { msg('⚠ Chưa xuất được: ' + (e && e.message || e), true); }
  finally { btn.disabled = false; }
}
async function exportXls() {
  const btn = q('#bXls'); btn.disabled = true;
  try {
    const src = new Uint8Array(await (await fetch('khtc-mau/cover-acon.xlsx')).arrayBuffer()), sh = MAU[CV.mau][2], m = CV.mau;
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
  q('#bPick').addEventListener('click', async () => addFiles(await pick(true)));
  q('#bPdf').addEventListener('click', exportPdf);
  q('#bXls').addEventListener('click', exportXls);
  q('#bPrint').addEventListener('click', () => window.print());
  const dz = q('#drop');
  ['dragenter', 'dragover'].forEach(t => document.addEventListener(t, e => { e.preventDefault(); dz.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(t => document.addEventListener(t, e => { e.preventDefault(); if (t === 'drop' || e.target === document.documentElement) dz.classList.remove('on'); }));
  document.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  chrome.storage.onChanged.addListener((ch, a) => { if (a !== 'local' || !ch.siteBrain) return; const D = ch.siteBrain.newValue; const s = D && D.sites.find(z => z.id === SID), x = s && s.subs.find(z => z.id === XID); if (!x) return; S = s; X = x; if (JSON.stringify(x.cv || null) !== JSON.stringify(CV) && !document.activeElement.matches('input,textarea,select')) { CV = cvOf(x); drawForm(); draw(); } });
  window.addEventListener('beforeunload', () => { if (saveT) { clearTimeout(saveT); saveNow(); } });
})();
