// HaoHao V1 – 🔄 HaoHao Convert (đổi file kéo-thả; V1.87, đổi tên V1.88 – 21/10/2026)
// Kéo file vào trang → hiện vòng tròn: thả vào ô định dạng để đổi file; giữ chuột ở giữa vòng → đổi sang vòng Công cụ
// (Cắt, Thêm nền, Nén, Che, Chỉnh sửa, Ghi chú, Thông tin ẩn). Mọi thứ chạy trên máy, không gửi file lên mạng.
// Thư viện đóng gói sẵn trong lib/ (pdf.js, libheif, AVIF, UTIF) – chỉ nạp khi cần.
const URLX = p => (globalThis.chrome && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL(p) : new URL(p, import.meta.url).href;
const PAGE = document.documentElement.dataset.hhdoi === 'page';   // doifile.html (trang riêng) hay Tab mới
const $e = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const EXT = n => ((String(n).match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
const BASE = n => String(n).replace(/\.[a-z0-9]+$/i, '') || 'file';
const KB = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ───────────────────────── loại file ───────────────────────── */
const IMG_EXT = /^(jpe?g|jfif|png|webp|gif|bmp|avif|heic|heif|tiff?|ico|svg)$/;
function kindOf(f) {
  const e = EXT(f.name), t = f.type || '';
  if (IMG_EXT.test(e) || /^image\//.test(t)) return 'img';
  if (e === 'pdf' || t === 'application/pdf') return 'pdf';
  if (e === 'docx') return 'docx';
  if (/^(xlsx|xlsm|xls|ods|csv)$/.test(e) || /spreadsheetml|ms-excel|opendocument\.spreadsheet|text\/csv/.test(t)) return 'xls';   // V1.90: Excel
  if (/^(txt|md|log)$/.test(e) || t === 'text/plain') return 'txt';
  return 'other';
}
function kindOfMime(t) {
  if (!t || /^image\//.test(t)) return 'img';   // HEIC trên Windows thường không có loại → coi là ảnh
  if (t === 'application/pdf') return 'pdf';
  if (/wordprocessingml/.test(t)) return 'docx';
  if (/spreadsheetml|ms-excel|opendocument\.spreadsheet|text\/csv/.test(t)) return 'xls';
  if (/^text\//.test(t)) return 'txt';
  return 'other';
}
const FORMATS = {
  img: ['JPG', 'PNG', 'WEBP', 'AVIF', 'PDF', 'DOCX', 'GOP', 'TIFF'],   // V1.89: ô BMP → Gộp / Tách (anh Nhật)
  pdf: ['JPG', 'PNG', 'WEBP', 'TXT', 'DOCX', 'GOP'],
  docx: ['PDF', 'TXT', 'JPG', 'PNG'],
  txt: ['PDF', 'DOCX', 'JPG', 'PNG'],
  xls: ['PDF', 'PNG', 'JPG', 'CSV', 'XLSX', 'GOP'],   // V1.90
  other: []
};
const KIND_NAME = { img: 'ảnh', pdf: 'PDF', docx: 'Word', txt: 'văn bản', xls: 'Excel', other: 'file' };
const TOOLS = [   // V1.91: Cắt + Thêm nền + Chỉnh sửa gộp thành 1 mục; thêm Kích thước, Xoá nền, Đóng logo
  { id: 'sua', label: 'Chỉnh sửa', ic: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>' },
  { id: 'size', label: 'Kích thước', ic: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4M7 9v4M17 15h-4M17 15v-4"/>' },
  { id: 'xnen', label: 'Xoá nền', ic: '<path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/><circle cx="12" cy="10" r="3"/><path d="M7 18c1-3 3-4.5 5-4.5s4 1.5 5 4.5"/>' },
  { id: 'logo', label: 'Đóng logo', ic: '<path d="M9 3h6v5l3 4H6l3-4z"/><path d="M4 15h16v4H4z"/>' },
  { id: 'nen', label: 'Nén', ic: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>' },
  { id: 'che', label: 'Che', ic: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>' },
  { id: 'note', label: 'Ghi chú', ic: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>' },
  { id: 'meta', label: 'Thông tin ẩn', ic: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>' }
];

/* ───────────────────────── nạp thư viện khi cần ───────────────────────── */
let pdfjsP, heifP, avifP, tifP;
const pdfjs = () => pdfjsP ||= import(URLX('lib/pdf/pdf.min.mjs')).then(m => { m.GlobalWorkerOptions.workerSrc = URLX('lib/pdf/pdf.worker.min.mjs'); return m; });
let xlsxP; const xlsxLib = () => xlsxP ||= globalThis.XLSX ? Promise.resolve(globalThis.XLSX) : new Promise((ok, no) => {
  const s = document.createElement('script'); s.src = URLX('lib/xlsx/xlsx.full.min.js'); s.onload = () => globalThis.XLSX ? ok(globalThis.XLSX) : no(new Error('Không nạp được bộ đọc Excel'));
  s.onerror = () => no(new Error('Không nạp được bộ đọc Excel')); document.head.append(s);
});
let pdflibP; const pdflib = () => pdflibP ||= import(URLX('lib/pdflib/pdf-lib.esm.min.js'));
let pwP; const pdfWord = () => pwP ||= Promise.all([import(URLX('doifile-pdfword.js')), pdfjs()]).then(([m, Pj]) => { m.init(Pj, makeZip); return m; });   // V1.96: PDF → Word giữ cấu trúc
const tiff = () => tifP ||= import(URLX('lib/tiff/utif.mjs')).then(m => m.default);
const heif = () => heifP ||= new Promise((res, rej) => {
  const done = async () => {
    try {
      const wasmBinary = new Uint8Array(await (await fetch(URLX('lib/heif/libheif.wasm'))).arrayBuffer());
      const m = globalThis.libheif({ wasmBinary, locateFile: f => URLX('lib/heif/' + f) });
      const ready = m && typeof m.then === 'function' ? m : (m && m.ready) ? m.ready.then(() => m) : Promise.resolve(m);
      ready.then(res, rej);
    } catch (e) { rej(e); }
  };
  if (globalThis.libheif) return done();
  const s = document.createElement('script'); s.src = URLX('lib/heif/libheif.js'); s.onload = done; s.onerror = () => rej(new Error('Không nạp được bộ đọc HEIC')); document.head.append(s);
});
const avif = () => avifP ||= import(URLX('lib/avif/avif_enc.js')).then(m => m.default({ locateFile: f => URLX('lib/avif/' + f) }));

/* ───────────────────────── đọc ảnh vào canvas ───────────────────────── */
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
async function decodeImage(file) {
  const e = EXT(file.name), t = file.type || '';
  if (/^(heic|heif)$/.test(e) || /heic|heif/.test(t)) {
    const H = await heif(), dec = new H.HeifDecoder(), imgs = dec.decode(new Uint8Array(await file.arrayBuffer()));
    if (!imgs || !imgs.length) throw new Error('File HEIC không đọc được');
    const im = imgs[0], w = im.get_width(), h = im.get_height(), c = mkCanvas(w, h), x = c.getContext('2d'), d = x.createImageData(w, h);
    await new Promise((ok, no) => im.display(d, r => r ? ok() : no(new Error('Lỗi giải mã HEIC'))));
    x.putImageData(d, 0, 0); imgs.forEach(i => { try { i.free && i.free(); } catch {} }); return c;
  }
  if (/^tiff?$/.test(e) || /tiff/.test(t)) {
    const U = await tiff(), buf = await file.arrayBuffer(), ifds = U.decode(buf);
    const pg = ifds.find(i => i.width) || ifds[0]; U.decodeImage(buf, pg, ifds);
    const rgba = U.toRGBA8(pg), c = mkCanvas(pg.width, pg.height), x = c.getContext('2d');
    x.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, pg.width * pg.height * 4), pg.width, pg.height), 0, 0); return c;
  }
  try {
    const bm = await createImageBitmap(file);   // tự xoay đúng theo EXIF
    const c = mkCanvas(bm.width, bm.height); c.getContext('2d').drawImage(bm, 0, 0); bm.close && bm.close(); return c;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const im = new Image(); im.src = url; await im.decode();
      const w = im.naturalWidth || 1024, h = im.naturalHeight || 1024, c = mkCanvas(w, h); c.getContext('2d').drawImage(im, 0, 0, w, h); return c;
    } catch { throw new Error('Không đọc được ảnh này'); } finally { URL.revokeObjectURL(url); }
  }
}

/* ───────────────────────── ghi ảnh ra các định dạng ───────────────────────── */
const toBlob = (c, type, q) => new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('Không tạo được ảnh')), type, q));
function flatten(c, bg = '#fff') { const o = mkCanvas(c.width, c.height), x = o.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0); return o; }
const rgba = c => c.getContext('2d').getImageData(0, 0, c.width, c.height);
function encBMP(c) {
  const f = flatten(c), w = f.width, h = f.height, d = rgba(f).data, row = (w * 3 + 3) & ~3, size = 54 + row * h;
  const b = new Uint8Array(size), v = new DataView(b.buffer);
  b[0] = 0x42; b[1] = 0x4D; v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true);
  v.setInt32(18, w, true); v.setInt32(22, h, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true); v.setUint32(34, row * h, true);
  v.setInt32(38, 3780, true); v.setInt32(42, 3780, true);
  for (let y = 0; y < h; y++) { let o = 54 + (h - 1 - y) * row, i = y * w * 4; for (let x = 0; x < w; x++, i += 4) { b[o++] = d[i + 2]; b[o++] = d[i + 1]; b[o++] = d[i]; } }
  return new Blob([b], { type: 'image/bmp' });
}
async function encTIFF(c) { const U = await tiff(), d = rgba(c); return new Blob([U.encodeImage(d.data.buffer, c.width, c.height)], { type: 'image/tiff' }); }
async function encAVIF(c, q = 60) {
  const M = await avif(), d = rgba(c);
  const opt = { quality: q, qualityAlpha: -1, denoiseLevel: 0, tileColsLog2: 0, tileRowsLog2: 0, speed: 8, subsample: 1, chromaDeltaQ: false, sharpness: 0, tune: 0, enableSharpYUV: false, bitDepth: 8, lossless: false };
  const out = M.encode(new Uint8Array(d.data.buffer), c.width, c.height, opt);
  if (!out) throw new Error('Không tạo được AVIF'); return new Blob([out], { type: 'image/avif' });
}
const MIME = { JPG: 'image/jpeg', PNG: 'image/png', WEBP: 'image/webp', AVIF: 'image/avif', BMP: 'image/bmp', TIFF: 'image/tiff', PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', TXT: 'text/plain', ZIP: 'application/zip',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', CSV: 'text/csv' };
const EXT_OF = { JPG: 'jpg', PNG: 'png', WEBP: 'webp', AVIF: 'avif', BMP: 'bmp', TIFF: 'tif', PDF: 'pdf', DOCX: 'docx', TXT: 'txt', ZIP: 'zip', XLSX: 'xlsx', CSV: 'csv' };
async function encode(c, fmt, q) {
  switch (fmt) {
    case 'JPG': return toBlob(flatten(c), 'image/jpeg', q ?? .92);
    case 'PNG': return toBlob(c, 'image/png');
    case 'WEBP': return toBlob(c, 'image/webp', q ?? .9);
    case 'AVIF': return encAVIF(c, q != null ? Math.round(q * 100) : 60);
    case 'BMP': return encBMP(c);
    case 'TIFF': return encTIFF(c);
  }
  throw new Error('Định dạng chưa hỗ trợ: ' + fmt);
}
const fmtOfFile = f => { const e = EXT(f.name); return /^(jpe?g|jfif)$/.test(e) ? 'JPG' : e === 'webp' ? 'WEBP' : 'PNG'; };

/* ───────────────────────── ZIP (cho DOCX + gói nhiều ảnh) ───────────────────────── */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = ~0; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
const U8 = async x => x instanceof Uint8Array ? x : typeof x === 'string' ? new TextEncoder().encode(x) : new Uint8Array(await x.arrayBuffer());
async function makeZip(entries, type = 'application/zip') {
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate()), tm = (d.getHours() << 11 | d.getMinutes() << 5 | (d.getSeconds() >> 1));
  for (const e of entries) {
    const data = await U8(e.data), nm = enc.encode(e.name), crc = crc32(data);
    const h = new Uint8Array(30 + nm.length), v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true); v.setUint16(10, tm, true); v.setUint16(12, dt, true);
    v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, nm.length, true); h.set(nm, 30);
    const c = new Uint8Array(46 + nm.length), w = new DataView(c.buffer);
    w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true); w.setUint16(12, tm, true); w.setUint16(14, dt, true);
    w.setUint32(16, crc, true); w.setUint32(20, data.length, true); w.setUint32(24, data.length, true); w.setUint16(28, nm.length, true); w.setUint32(42, off, true); c.set(nm, 46);
    parts.push(h, data); cen.push(c); off += h.length + data.length;
  }
  const cs = cen.reduce((a, c) => a + c.length, 0), end = new Uint8Array(22), v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true); v.setUint16(8, entries.length, true); v.setUint16(10, entries.length, true); v.setUint32(12, cs, true); v.setUint32(16, off, true);
  return new Blob([...parts, ...cen, end], { type });
}
async function readZipEntry(buf, want) {   // đọc 1 file trong zip (DOCX)
  const u = new Uint8Array(buf), v = new DataView(buf); let e = u.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('File Word bị hỏng');
  let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true), dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    const meth = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
    const name = dec.decode(u.subarray(p + 46, p + 46 + nl));
    if (name === want) {
      const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), raw = u.subarray(ds, ds + csz);
      if (meth === 0) return raw;
      const st = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(st).arrayBuffer());
    }
    p += 46 + nl + xl + cl;
  }
  throw new Error('Không thấy nội dung trong file Word');
}

/* ───────────────────────── PDF (ghi từ ảnh JPEG) ───────────────────────── */
function makePDF(pages) {   // pages: [{data: Uint8Array JPEG, w, h, pw, ph}]
  const enc = new TextEncoder(), chunks = [], xref = []; let off = 0;
  const push = x => { const u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); off += u.length; };
  const obj = (id, fn) => { xref[id] = off; push(`${id} 0 obj\n`); fn(); push('\nendobj\n'); };
  push('%PDF-1.4\n'); push(new Uint8Array([37, 226, 227, 207, 211, 10]));
  const n = pages.length;
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] >>`));
  pages.forEach((p, i) => {
    const pw = +p.pw.toFixed(2), ph = +p.ph.toFixed(2);
    obj(3 + 3 * i, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${5 + 3 * i} 0 R >> >> /Contents ${4 + 3 * i} 0 R >>`));
    const cs = `q ${pw} 0 0 ${ph} 0 0 cm /Im${i} Do Q`;
    obj(4 + 3 * i, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    obj(5 + 3 * i, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.data.length} >>\nstream\n`); push(p.data); push('\nendstream'); });
  });
  const total = 3 + 3 * n, xo = off;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let id = 1; id < total; id++) push(String(xref[id]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
async function pageFromCanvas(c, a4) {
  const data = await U8(await toBlob(flatten(c), 'image/jpeg', .9));
  if (a4) return c.width > c.height ? { data, w: c.width, h: c.height, pw: 841.89, ph: 595.28 } : { data, w: c.width, h: c.height, pw: 595.28, ph: 841.89 };
  let pw = c.width * .75, ph = c.height * .75; const k = Math.min(1, 14000 / Math.max(pw, ph)); pw *= k; ph *= k;
  return { data, w: c.width, h: c.height, pw, ph };
}

/* ───────────────────────── DOCX (ghi) ───────────────────────── */
const xesc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const pText = line => `<w:p><w:r>${line.split('\t').map((s, i) => (i ? '<w:tab/>' : '') + (s ? `<w:t xml:space="preserve">${xesc(s)}</w:t>` : '')).join('')}</w:r></w:p>`;
const P_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
async function makeDOCX(blocks) {   // blocks: [{text}] | [{img: Blob(jpeg/png), w, h}] | [{br:true}]
  const media = [], body = [];
  for (const b of blocks) {
    if (b.br) { body.push(P_BREAK); continue; }
    if (b.text != null) { (b.text.length ? b.text.split(/\r?\n/) : ['']).forEach(l => body.push(pText(l))); continue; }
    if (b.img) {
      const i = media.length + 1, ext = b.img.type === 'image/png' ? 'png' : 'jpeg';
      media.push({ name: `word/media/image${i}.${ext}`, data: b.img, id: `rIdImg${i}`, target: `media/image${i}.${ext}` });
      let cx = b.w * 9525, cy = b.h * 9525; const k = Math.min(1, 6120000 / cx, 8900000 / cy); cx = Math.round(cx * k); cy = Math.round(cy * k);
      body.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${i}" name="Hinh ${i}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${i}" name="image${i}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${i}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
    }
  }
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const doc = X + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'
    + body.join('') + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const styles = X + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="SimSun"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>';
  const ct = X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  const rels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const drels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + media.map(m => `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.target}"/>`).join('') + '</Relationships>';
  return makeZip([{ name: '[Content_Types].xml', data: ct }, { name: '_rels/.rels', data: rels }, { name: 'word/document.xml', data: doc },
    { name: 'word/styles.xml', data: styles }, { name: 'word/_rels/document.xml.rels', data: drels }, ...media.map(m => ({ name: m.name, data: m.data }))], MIME.DOCX);
}
async function docxText(file) {
  const xml = new TextDecoder().decode(await readZipEntry(await file.arrayBuffer(), 'word/document.xml'));
  const d = new DOMParser().parseFromString(xml, 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', out = [];
  for (const p of d.getElementsByTagNameNS(W, 'p')) {
    let s = '';
    const walk = n => { for (const c of n.childNodes) { if (c.namespaceURI === W) { if (c.localName === 't') s += c.textContent; else if (c.localName === 'tab') s += '\t'; else if (c.localName === 'br' || c.localName === 'cr') s += '\n'; else if (c.localName !== 'p') walk(c); } } };
    walk(p); out.push(s);
  }
  return out.join('\n');
}
async function readText(file) {
  const b = new Uint8Array(await file.arrayBuffer());
  let t = new TextDecoder('utf-8').decode(b);
  if ((t.match(/�/g) || []).length > 3) { try { t = new TextDecoder('windows-1258').decode(b); } catch {} }
  return t.replace(/^﻿/, '');
}

/* ───────────────────────── chữ → trang ảnh (TXT/Word → PDF/JPG) ───────────────────────── */
function textPages(text) {
  const W = 1240, H = 1754, M = 110, FS = 25, LH = 38, pages = [];
  const font = `${FS}px "Times New Roman", "Segoe UI", serif`;
  let c, x, y;
  const page = () => { c = mkCanvas(W, H); x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#111'; x.font = font; x.textBaseline = 'top'; y = M; pages.push(c); };
  const line = s => { if (y + LH > H - M) page(); x.fillText(s, M, y); y += LH; };
  page();
  for (const para of String(text).replace(/\t/g, '    ').split(/\r?\n/)) {
    if (!para.trim()) { y += LH * .6; if (y > H - M) page(); continue; }
    let cur = '';
    for (const w of para.split(/(\s+)/)) {
      const t = cur + w;
      if (x.measureText(t).width <= W - 2 * M) { cur = t; continue; }
      if (cur.trim()) line(cur.trimEnd());
      cur = w.trimStart();
      while (x.measureText(cur).width > W - 2 * M) {   // từ quá dài: cắt theo ký tự
        let k = cur.length; while (k > 1 && x.measureText(cur.slice(0, k)).width > W - 2 * M) k--;
        line(cur.slice(0, k)); cur = cur.slice(k);
      }
    }
    if (cur.trim()) line(cur.trimEnd());
  }
  return pages;
}

/* ───────────────────────── PDF (đọc bằng pdf.js) ───────────────────────── */
async function openPDF(file) {
  const P = await pdfjs();
  return P.getDocument({ data: new Uint8Array(await file.arrayBuffer()), cMapUrl: URLX('lib/pdf/cmaps/'), cMapPacked: true,
    standardFontDataUrl: URLX('lib/pdf/standard_fonts/'), isEvalSupported: false }).promise;
}
async function renderPage(doc, n, scale = 2) {
  const pg = await doc.getPage(n); let vp = pg.getViewport({ scale });
  const k = Math.min(1, 5000 / Math.max(vp.width, vp.height)); if (k < 1) vp = pg.getViewport({ scale: scale * k });
  const c = mkCanvas(vp.width, vp.height), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  await pg.render({ canvasContext: x, canvas: c, viewport: vp }).promise; pg.cleanup(); return c;
}
async function pageText(doc, n) {
  const tc = await (await doc.getPage(n)).getTextContent(); let s = '', lastY = null;
  for (const it of tc.items) {
    if (!('str' in it)) continue;
    const y = it.transform ? Math.round(it.transform[5]) : null;
    if (lastY != null && y != null && Math.abs(y - lastY) > 2 && !s.endsWith('\n')) s += '\n';
    s += it.str; if (it.hasEOL) s += '\n'; lastY = y;
  }
  return s.replace(/[ \t]+\n/g, '\n').trim();
}

/* ───────────────────────── V1.90: Excel (SheetJS) ───────────────────────── */
async function readBook(file) {
  const X = await xlsxLib();
  if (EXT(file.name) === 'csv') return X.read(await readText(file), { type: 'string', raw: false });
  return X.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
}
function sheetRows(X, ws) {
  const rows = X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false }).map(r => r.map(v => v == null ? '' : String(v)));
  let w = 0; rows.forEach(r => { for (let k = r.length - 1; k >= 0; k--) if (r[k].trim()) { w = Math.max(w, k + 1); break; } });
  return rows.filter(r => r.some(v => v.trim())).map(r => { const o = r.slice(0, w); while (o.length < w) o.push(''); return o; });
}
const isNum = v => /^[-+(]?[\d.,\s]+%?\)?$/.test(v.trim()) && /\d/.test(v);
// vẽ bảng: mode 'pdf' → các trang A4 (dọc/ngang; bảng quá rộng thì chia cột sang trang sau, lặp cột đầu), 'img' → 1 ảnh dài mỗi sheet (cắt nếu quá cao)
function tableCanvases(rows, title, mode) {
  const FS = 22, RH = 36, PAD = 9, MAXW = 460, MINW = 46, font = b => `${b ? 700 : 400} ${FS}px "Segoe UI", Arial, sans-serif`;
  const m = mkCanvas(10, 10).getContext('2d'), nc = Math.max(1, ...rows.map(r => r.length)), cw = Array(nc).fill(MINW);
  rows.forEach((r, i) => { m.font = font(i === 0); r.forEach((v, k) => { cw[k] = Math.min(MAXW, Math.max(cw[k], m.measureText(v).width + PAD * 2)); }); });
  const fit = (x, v, w) => { if (x.measureText(v).width <= w) return v; let k = v.length; while (k > 1 && x.measureText(v.slice(0, k) + '…').width > w) k--; return v.slice(0, k) + '…'; };
  const drawRows = (x, cols, list, y0) => {   // cols: chỉ số cột cần vẽ; luôn vẽ dòng đầu (tiêu đề cột) trước
    const W2 = cols.reduce((a, k) => a + cw[k], 0) + 1, all = rows.length ? [[rows[0], true], ...list.map(r => [r, false])] : [];
    let y = y0;
    for (const [r, head] of all) {
      let xx = .5; if (head) { x.fillStyle = '#EEF1F7'; x.fillRect(0, y, W2, RH); }
      x.font = font(head); x.fillStyle = '#1B2240';
      cols.forEach(k => { const v = r[k] || '', num = !head && isNum(v), t = fit(x, v, cw[k] - PAD * 2); x.textAlign = num ? 'right' : 'left'; x.fillText(t, num ? xx + cw[k] - PAD : xx + PAD, y + RH / 2 + 1); xx += cw[k]; });
      x.strokeStyle = '#C9CFDD'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, y + RH + .5); x.lineTo(W2, y + RH + .5); x.stroke(); y += RH;
    }
    x.strokeStyle = '#C9CFDD'; x.beginPath(); let xx = .5; x.moveTo(xx, y0); x.lineTo(xx, y); cols.forEach(k => { xx += cw[k]; x.moveTo(Math.round(xx) + .5, y0); x.lineTo(Math.round(xx) + .5, y); }); x.moveTo(0, y0 + .5); x.lineTo(W2, y0 + .5); x.stroke();
    return W2;
  };
  const head = (x, t) => { if (!t) return; x.font = `700 ${FS + 6}px "Segoe UI", Arial, sans-serif`; x.fillStyle = '#1B2240'; x.textAlign = 'left'; x.fillText(t, 0, 26); };
  const allCols = cw.map((_, k) => k), TW = cw.reduce((a, b) => a + b, 0) + 1, body = rows.slice(1), out = [];
  if (mode === 'img') {
    const TH = title ? 54 : 0, per = Math.max(1, Math.floor((16000 - TH - 40) / RH) - 1);
    for (let i = 0; i === 0 || i < body.length; i += per) {
      const part = body.slice(i, i + per), c = mkCanvas(TW + 40, (i === 0 ? TH : 0) + RH * (part.length + 1) + 40), x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.translate(20, 20); x.textBaseline = 'middle'; if (i === 0) head(x, title); drawRows(x, allCols, part, i === 0 ? TH : 0); out.push(c);
      if (!body.length) break;
    }
    return out;
  }
  const MINSC = .8, M = 80, land = TW > 1080, PW = land ? 1754 : 1240, PH = land ? 1240 : 1754, cwid = PW - 2 * M;
  // chia cột thành từng dải vừa trang (chữ không nhỏ hơn 62%); dải sau lặp lại cột đầu
  const bands = [];
  if (TW * MINSC <= cwid) bands.push(allCols);
  else {   // số dải cần có rồi chia đều cho cân trang
    const lim = cwid / MINSC, rest = TW - cw[0], nb = Math.max(2, Math.ceil(rest / Math.max(1, lim - cw[0]))), target = rest / nb;
    let cur = [0], w = 0; for (let k = 1; k < nc; k++) { if (cur.length > 1 && (w + cw[k] > lim - cw[0] || (w >= target && bands.length < nb - 1))) { bands.push(cur); cur = [0]; w = 0; } cur.push(k); w += cw[k]; } bands.push(cur);
  }
  bands.forEach((cols, bi) => {
    const BW = cols.reduce((a, k) => a + cw[k], 0) + 1, sc = Math.min(1, cwid / BW), usable = (PH - 2 * M) / sc;
    const t = bands.length > 1 ? `${title ? title + ' · ' : ''}phần ${bi + 1}/${bands.length}` : title, TH = t ? 54 : 0;
    let i = 0, first = true;
    do {
      const n = Math.max(1, Math.floor((usable - (first ? TH : 0) - RH) / RH)), part = body.slice(i, i + n);
      const c = mkCanvas(PW, PH), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH); x.translate(M, M); x.scale(sc, sc); x.textBaseline = 'middle';
      if (first) head(x, t); drawRows(x, cols, part, first ? TH : 0); out.push(c); i += n; first = false;
    } while (i < body.length);
  });
  return out;
}
// V1.95: Excel → PDF giống Excel in (doifile-xls.js: định dạng ô, ô gộp, logo, thiết lập in)
let xlsModP; const xlsMod = () => xlsModP ||= Promise.all([import(URLX('doifile-xls.js')), xlsxLib()]).then(([m, X]) => { m.init(X); return m; });
async function xlsBook(file) {
  const m = await xlsMod(), e = EXT(file.name); let buf;
  if (e === 'xlsx' || e === 'xlsm') buf = await file.arrayBuffer();
  else { const X = await xlsxLib(), wb = await readBook(file); buf = X.write(wb, { bookType: 'xlsx', type: 'array' }); }   // .xls/.csv/.ods: đổi sang xlsx trong máy rồi đọc
  return { m, book: await m.parseXlsx(buf) };
}
const XR = 2.5;   // độ nét khi xuất: 2,5 điểm ảnh / 1 pt ≈ 180 dpi
function xlsPlan(m, book, over) {   // → [{sh, L, pg, name}]
  const out = [];
  book.sheets.forEach((sh, i) => {
    if (!m.hasData(sh) || (over && over.skip && over.skip.has(i))) return;
    const d = m.sheetDefaults(sh), o = { ...d };
    if (over) for (const k of ['paper', 'orient', 'fit', 'pct', 'margin', 'hc', 'area']) if (over[k] != null && over[k] !== 'file') o[k] = k === 'paper' ? +over[k] : k === 'hc' ? over[k] === '1' : over[k];
    if (over && over.fit === 'pct') o.pct = over.pct; if (over && over.titles) o.titles = over.titles;
    const L = m.layout(sh, o); L.pages.forEach(pg => out.push({ sh, L, pg, name: sh.name }));
  });
  return out;
}
async function xlsPdfBlob(m, plan, step) {
  const ps = [];
  for (let k = 0; k < plan.length; k++) { step && step(k, plan.length); const p = plan[k], c = m.renderPage(p.sh, p.L, p.pg, XR); ps.push({ data: await U8(await toBlob(c, 'image/jpeg', .92)), w: c.width, h: c.height, pw: p.L.pw, ph: p.L.ph }); }
  return makePDF(ps);
}
async function bookSheets(file) { const X = await xlsxLib(), wb = await readBook(file); return { X, wb, sheets: wb.SheetNames.map(n => ({ name: n, rows: sheetRows(X, wb.Sheets[n]) })).filter(s => s.rows.length) }; }
const sheetName = (n, used) => { let b = String(n).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31) || 'Sheet'; let x = b, k = 2; while (used.has(x.toLowerCase())) { const suf = ` (${k++})`; x = b.slice(0, 31 - suf.length) + suf; } used.add(x.toLowerCase()); return x; };
const safeFile = n => String(n).replace(/[\\/:*?"<>|]/g, ' ').trim() || 'sheet';
async function convertXls(f, to, step) {
  const b = BASE(f.name), out = [];
  if (to === 'XLSX') { const X = await xlsxLib(), wb = await readBook(f); return [{ blob: new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: MIME.XLSX }), name: b + '.xlsx' }]; }
  const { X, wb, sheets } = await bookSheets(f); if (!sheets.length) throw new Error(`"${f.name}" không có dữ liệu`);
  const nm = (sh, ext, part) => (sheets.length > 1 ? `${b} - ${safeFile(sh.name)}` : b) + (part ? ` (phần ${part})` : '') + '.' + ext;
  if (to === 'CSV') sheets.forEach(sh => out.push({ blob: new Blob(['\uFEFF' + X.utils.sheet_to_csv(wb.Sheets[sh.name], { blankrows: false })], { type: MIME.CSV }), name: nm(sh, 'csv') }));
  else if (to === 'PDF') { const { m, book } = await xlsBook(f), plan = xlsPlan(m, book); if (!plan.length) throw new Error(`"${f.name}" không có dữ liệu`); out.push({ blob: await xlsPdfBlob(m, plan), name: b + '.pdf' }); }
  else for (const sh of sheets) { const cs = tableCanvases(sh.rows, sheets.length > 1 ? sh.name : '', 'img'); for (let k = 0; k < cs.length; k++) out.push({ blob: await encode(cs[k], to), name: nm(sh, EXT_OF[to], cs.length > 1 ? k + 1 : 0) }); }
  if (out.length > 10) return [{ blob: await makeZip(out.map(x => ({ name: x.name, data: x.blob }))), name: `${b} (${out.length} file ${to}).zip` }];
  return out;
}
async function mergeXlsx(files, step) {
  const X = await xlsxLib(), nb = X.utils.book_new(), used = new Set();
  for (let i = 0; i < files.length; i++) {
    step(i, files.length); const wb = await readBook(files[i]), fb = BASE(files[i].name);
    wb.SheetNames.forEach(sn => X.utils.book_append_sheet(nb, wb.Sheets[sn], sheetName(wb.SheetNames.length > 1 ? `${fb} - ${sn}` : fb, used)));
  }
  return new Blob([X.write(nb, { bookType: 'xlsx', type: 'array' })], { type: MIME.XLSX });
}
async function splitXlsx(f, step) {
  const X = await xlsxLib(), wb = await readBook(f), b = BASE(f.name);
  if (wb.SheetNames.length < 2) throw new Error('File Excel này chỉ có 1 sheet, không cần tách');
  const outs = wb.SheetNames.map((sn, k) => { step(k, wb.SheetNames.length); const nb = X.utils.book_new(); X.utils.book_append_sheet(nb, wb.Sheets[sn], sheetName(sn, new Set())); return { blob: new Blob([X.write(nb, { bookType: 'xlsx', type: 'array' })], { type: MIME.XLSX }), name: `${b} - ${safeFile(sn)}.xlsx` }; });
  return outs.length >= 10 ? [{ blob: await makeZip(outs.map(x => ({ name: x.name, data: x.blob }))), name: `${b} (tách ${outs.length} sheet).zip` }] : outs;
}

/* ───────────────────────── V1.89: Gộp / Tách (pdf-lib, giữ nguyên chữ của PDF) ───────────────────────── */
const canGop = f => { const k = kindOf(f); return k === 'img' || k === 'pdf' || k === 'xls'; };
async function loadPdfLib(f) {
  const { PDFDocument } = await pdflib(), d = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
  if (d.isEncrypted) throw new Error(`"${f.name}" có mật khẩu, không gộp/tách được`); return d;
}
async function mergeToPdf(files, step) {   // nhiều ảnh + PDF (lẫn lộn) → 1 PDF, theo thứ tự file
  const { PDFDocument } = await pdflib(), out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    step(i, files.length); const f = files[i];
    if (kindOf(f) === 'pdf') { const src = await loadPdfLib(f); (await out.copyPages(src, src.getPageIndices())).forEach(pg => out.addPage(pg)); continue; }
    if (kindOf(f) === 'xls') {   // V1.95: bảng Excel in vào PDF theo thiết lập in của file
      const { m, book } = await xlsBook(f);
      for (const p of xlsPlan(m, book)) { const c = m.renderPage(p.sh, p.L, p.pg, XR), im = await out.embedJpg(await U8(await toBlob(c, 'image/jpeg', .92))); out.addPage([p.L.pw, p.L.ph]).drawImage(im, { x: 0, y: 0, width: p.L.pw, height: p.L.ph }); }
      continue;
    }
    const e = EXT(f.name), buf = new Uint8Array(await f.arrayBuffer()); let img = null;
    if ((/^(jpe?g|jfif)$/.test(e) || f.type === 'image/jpeg') && ((readExif(buf) || {}).orient || 1) === 1) { try { img = await out.embedJpg(buf); } catch {} }   // JPG đúng chiều: nhúng nguyên bản, không nén lại
    else if (e === 'png' || f.type === 'image/png') { try { img = await out.embedPng(buf); } catch {} }
    if (!img) {
      const c = await decodeImage(f), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let alpha = false;
      for (let k = 3; k < d.length; k += 4) if (d[k] < 255) { alpha = true; break; }
      img = alpha ? await out.embedPng(await U8(await toBlob(c, 'image/png'))) : await out.embedJpg(await U8(await toBlob(flatten(c), 'image/jpeg', .92)));
    }
    let w = img.width * .75, h = img.height * .75; const k = Math.min(1, 14000 / Math.max(w, h)); w *= k; h *= k;
    out.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  return new Blob([await out.save()], { type: MIME.PDF });
}
async function splitPdf(f, step) {   // 1 PDF nhiều trang → mỗi trang 1 PDF (≥10 trang gói zip)
  const { PDFDocument } = await pdflib(), src = await loadPdfLib(f), N = src.getPageCount(), b = BASE(f.name);
  if (N < 2) throw new Error('PDF này chỉ có 1 trang, không cần tách');
  const outs = [];
  for (let k = 0; k < N; k++) {
    step(k, N); const d = await PDFDocument.create(), [pg] = await d.copyPages(src, [k]); d.addPage(pg);
    outs.push({ blob: new Blob([await d.save()], { type: MIME.PDF }), name: `${b} - trang ${String(k + 1).padStart(String(N).length, '0')}.pdf` });
  }
  return N >= 10 ? [{ blob: await makeZip(outs.map(x => ({ name: x.name, data: x.blob }))), name: `${b} (tách ${N} trang).zip` }] : outs;
}
async function gopTach(files, _to, step) {
  const allX = files.every(f => kindOf(f) === 'xls');
  if (allX && files.length > 1) return [{ blob: await mergeXlsx(files, step), name: `${BASE(files[0].name)} (gộp ${files.length} file).xlsx` }];
  if (allX) return splitXlsx(files[0], step);
  if (files.length > 1) return [{ blob: await mergeToPdf(files, step), name: `${BASE(files[0].name)} (gộp ${files.length} file).pdf` }];
  if (kindOf(files[0]) !== 'pdf') throw new Error('Kéo từ 2 file trở lên để gộp, hoặc 1 PDF/Excel nhiều trang để tách');
  return splitPdf(files[0], step);
}

/* ───────────────────────── đổi định dạng ───────────────────────── */
// trả về [{blob, name}]
async function convert(files, to, step) {
  const kind = kindOf(files[0]), out = [];
  const one = files.length === 1;
  if (kind === 'img') {
    if (to === 'PDF') {   // nhiều ảnh → 1 PDF
      const pages = []; for (let i = 0; i < files.length; i++) { step(i, files.length); pages.push(await pageFromCanvas(await decodeImage(files[i]))); }
      return [{ blob: makePDF(pages), name: BASE(files[0].name) + (one ? '' : ` (+${files.length - 1} ảnh)`) + '.pdf' }];
    }
    if (to === 'DOCX') {
      const bl = []; for (let i = 0; i < files.length; i++) { step(i, files.length); const c = await decodeImage(files[i]); bl.push({ img: await toBlob(flatten(c), 'image/jpeg', .92), w: c.width, h: c.height }); }
      return [{ blob: await makeDOCX(bl), name: BASE(files[0].name) + (one ? '' : ` (+${files.length - 1} ảnh)`) + '.docx' }];
    }
    for (let i = 0; i < files.length; i++) { step(i, files.length); out.push({ blob: await encode(await decodeImage(files[i]), to), name: BASE(files[i].name) + '.' + EXT_OF[to] }); }
    return out;
  }
  for (let i = 0; i < files.length; i++) {
    step(i, files.length); const f = files[i], b = BASE(f.name);
    if (kind === 'xls') { out.push(...await convertXls(f, to, step)); continue; }
    if (kind === 'pdf') {
      const doc = await openPDF(f), N = doc.numPages;
      if (to === 'DOCX') { const m = await pdfWord(); out.push({ blob: await m.pdfToDocx(doc, (W.pdfMode || 'flow'), (k, n) => step(i + k / n, files.length)), name: b + '.docx' }); try { await doc.destroy(); } catch {} continue; }   // V1.96
      if (to === 'TXT') {
        const texts = []; for (let n = 1; n <= N; n++) texts.push(await pageText(doc, n));
        if (!texts.join('').trim()) throw new Error('PDF này là ảnh scan, không có chữ để lấy');
        if (to === 'TXT') out.push({ blob: new Blob(['﻿' + texts.join('\n\n')], { type: MIME.TXT }), name: b + '.txt' });
        else { const bl = []; texts.forEach((t, k) => { if (k) bl.push({ br: true }); bl.push({ text: t }); }); out.push({ blob: await makeDOCX(bl), name: b + '.docx' }); }
      } else {
        const imgs = []; for (let n = 1; n <= N; n++) { step(i + n / (N + 1), files.length); imgs.push({ blob: await encode(await renderPage(doc, n), to), name: N === 1 ? `${b}.${EXT_OF[to]}` : `${b} - trang ${String(n).padStart(String(N).length, '0')}.${EXT_OF[to]}` }); }
        if (imgs.length > 10) out.push({ blob: await makeZip(imgs.map(x => ({ name: x.name, data: x.blob }))), name: `${b} (${N} trang ${to}).zip` });
        else out.push(...imgs);
      }
      try { await doc.destroy(); } catch {} continue;
    }
    const text = kind === 'docx' ? await docxText(f) : await readText(f);
    if (to === 'TXT') { out.push({ blob: new Blob(['﻿' + text], { type: MIME.TXT }), name: b + '.txt' }); continue; }
    if (to === 'DOCX') { out.push({ blob: await makeDOCX([{ text }]), name: b + '.docx' }); continue; }
    const pages = textPages(text);
    if (to === 'PDF') { const ps = []; for (const c of pages) ps.push(await pageFromCanvas(c, true)); out.push({ blob: makePDF(ps), name: b + '.pdf' }); continue; }
    const imgs = []; for (let n = 0; n < pages.length; n++) imgs.push({ blob: await encode(pages[n], to), name: pages.length === 1 ? `${b}.${EXT_OF[to]}` : `${b} - trang ${n + 1}.${EXT_OF[to]}` });
    if (imgs.length > 10) out.push({ blob: await makeZip(imgs.map(x => ({ name: x.name, data: x.blob }))), name: `${b} (${imgs.length} trang).zip` }); else out.push(...imgs);
  }
  return out;
}

/* ───────────────────────── nơi lưu: Tải về hoặc thư mục đã chọn ───────────────────────── */
const DB = () => new Promise((ok, no) => { const r = indexedDB.open('haohao-doifile', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const kvGet = async k => { try { const d = await DB(); return await new Promise(ok => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ok(undefined); }); } catch { return undefined; } };
const kvSet = async (k, v) => { try { const d = await DB(); await new Promise(ok => { const t = d.transaction('kv', 'readwrite'); v === undefined ? t.objectStore('kv').delete(k) : t.objectStore('kv').put(v, k); t.oncomplete = ok; t.onerror = ok; }); } catch {} };
let dirH = null, dirOk = false;
async function loadDir() { dirH = await kvGet('dir') || null; dirOk = false; if (dirH) { try { dirOk = (await dirH.queryPermission({ mode: 'readwrite' })) === 'granted'; } catch { dirOk = false; } } fire(); }
async function pickDir() {
  if (!window.showDirectoryPicker) return toast('Trình duyệt này chưa cho chọn thư mục');
  try { dirH = await window.showDirectoryPicker({ id: 'haohao-doifile', mode: 'readwrite' }); dirOk = true; await kvSet('dir', dirH); fire(); toast('✅ File mới sẽ lưu vào thư mục ' + dirH.name); } catch {}
}
async function regrantDir() { if (!dirH) return pickDir(); try { dirOk = (await dirH.requestPermission({ mode: 'readwrite' })) === 'granted'; } catch { dirOk = false; } fire(); }
async function clearDir() { dirH = null; dirOk = false; await kvSet('dir', undefined); fire(); }
const listeners = new Set(); const fire = () => listeners.forEach(f => { try { f(); } catch {} });
async function uniqueName(dir, name) {
  const b = BASE(name), e = EXT(name);
  for (let i = 1; i < 500; i++) { const n = i === 1 ? name : `${b} (${i})${e ? '.' + e : ''}`; try { await dir.getFileHandle(n); } catch { return n; } }
  return `${b} ${Date.now()}.${e}`;
}
async function saveBlob(blob, name) {
  if (dirH && dirOk) {
    try {
      const n = await uniqueName(dirH, name), fh = await dirH.getFileHandle(n, { create: true }), w = await fh.createWritable();
      await w.write(blob); await w.close(); return { where: dirH.name, name: n };
    } catch { dirOk = false; fire(); }
  }
  const a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000); return { where: 'Tải về', name };
}

// V1.92: lỗi do Chrome chưa nạp manifest mới (chưa cho chạy WebAssembly) → báo dễ hiểu
const wasmBlocked = e => /Content Security Policy|wasm-unsafe-eval|unsafe-eval|no available backend/i.test(String(e && (e.message || e)));
const errText = e => wasmBlocked(e) ? 'Chrome chưa nạp lại HaoHao bản mới. Mở trang chrome://extensions, bấm nút ↻ ở HaoHao rồi thử lại.' : ((e && e.message) || String(e));
/* ───────────────────────── thông báo nhỏ ───────────────────────── */
let toastT; function toast(msg, ms = 2600) { let t = document.querySelector('.hhd-toast'); if (!t) { t = $e('div', 'hhd-toast'); document.body.append(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms); }

/* ───────────────────────── khay file vừa làm ───────────────────────── */
const RES = new Map(); let resId = 0, tray, trayList;
function buildTray() {
  tray = $e('div', 'hhd hhd-tray' + (PAGE ? ' inline' : '')); tray.hidden = !PAGE;
  const h = $e('div', 'hhd-tray-h'); h.append($e('span', '', '📂 File vừa làm'));
  const clr = $e('button', '', 'Xoá danh sách'); clr.style.fontSize = '11.5px'; clr.addEventListener('click', () => { RES.forEach(r => URL.revokeObjectURL(r.url)); RES.clear(); trayList.textContent = ''; empty(); if (!PAGE) tray.hidden = true; });
  h.append(clr);
  if (!PAGE) { const x = $e('button', '', '✕'); x.title = 'Đóng'; x.addEventListener('click', () => { tray.hidden = true; }); h.append(x); }
  trayList = $e('div', 'hhd-list'); const f = $e('div', 'hhd-tray-f', 'Kéo file trong danh sách ra màn hình máy tính, hoặc thả lại vào trang để làm tiếp.');
  tray.append(h, trayList, f);
  (PAGE ? document.getElementById('hhd-trayslot') || document.body : document.body).append(tray); empty();
}
function empty() { if (!RES.size) { const p = $e('div', 'hhd-note', PAGE ? 'Chưa có file nào. Kéo file vào trang để bắt đầu.' : ''); p.style.padding = '8px 10px'; trayList.append(p); } }
function addResult(blob, name, saved) {
  if (!RES.size) trayList.textContent = '';
  const id = ++resId, url = URL.createObjectURL(blob), file = new File([blob], name, { type: blob.type });
  RES.set(id, { blob, name, url, file });
  const it = $e('div', 'hhd-item'); it.draggable = true; it.dataset.id = id;
  const th = $e('div', 'th'); if (/^image\/(png|jpeg|webp|avif|gif|bmp)/.test(blob.type)) th.style.backgroundImage = `url("${url}")`; else th.textContent = (EXT(name) || 'FILE').toUpperCase();
  const nm = $e('div', 'nm'); nm.append($e('b', '', name), $e('small', '', `${KB(blob.size)} · ${saved ? 'đã lưu vào ' + saved.where : 'chưa lưu'}`)); nm.firstChild.title = name;
  const ac = $e('div', 'ac');
  const bo = $e('button', '', '👁'); bo.title = 'Mở xem'; bo.addEventListener('click', () => window.open(url, '_blank'));
  const bs = $e('button', '', '💾'); bs.title = 'Lưu lại lần nữa'; bs.addEventListener('click', async () => { const s = await saveBlob(blob, name); nm.lastChild.textContent = `${KB(blob.size)} · đã lưu vào ${s.where}`; });
  const bn = $e('button', '', '🔄'); bn.title = 'Làm tiếp với file này (đổi định dạng, công cụ)'; bn.addEventListener('click', () => { const r = it.getBoundingClientRect(); openWheel([file], r.left - 230, r.top + 20, true); });
  ac.append(bo, bs, bn); it.append(th, nm, ac);
  it.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-hhd', String(id));
    try { e.dataTransfer.setData('DownloadURL', `${blob.type || 'application/octet-stream'}:${name}:${url}`); } catch {}
    try { e.dataTransfer.items.add(file); } catch {}
  });
  trayList.prepend(it); tray.hidden = false;
  if (PAGE) document.getElementById('hhd-trayslot')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function addError(name, msg) {
  if (!RES.size) trayList.textContent = '';
  const it = $e('div', 'hhd-item'), th = $e('div', 'th', '⚠️'), nm = $e('div', 'nm');
  nm.append($e('b', '', name), $e('small', 'err', msg)); it.append(th, nm); trayList.prepend(it); tray.hidden = false;
}
async function deliver(results) {
  for (const r of results) { const s = await saveBlob(r.blob, r.name); addResult(r.blob, r.name, s); }
  if (results.length) { const w = dirH && dirOk ? 'thư mục ' + dirH.name : 'thư mục Tải về'; toast(`✅ Xong ${results.length} file · đã lưu vào ${w}`); }
}

/* ───────────────────────── vòng tròn ───────────────────────── */
const R_OUT = 192, R_IN = 74, R_HUB = 62, NS = 'http://www.w3.org/2000/svg';
const W = { ov: null, wheel: null, svg: null, segG: null, hub: null, tip: null, items: [], mode: 'fmt', kind: 'img', files: null, hot: -1, onHub: false, hubLock: true, hubT: 0, cx: 0, cy: 0, open: false, click: false, busy: false, dragT: 0, count: 0, total: 0, all: null, mimeKinds: [] };
function svgEl(tag, attrs) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }
function arc(a0, a1, r0, r1) {
  const p = (a, r) => [Math.cos(a) * r, Math.sin(a) * r].map(v => v.toFixed(2)).join(' ');
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(a0, r1)} A ${r1} ${r1} 0 ${big} 1 ${p(a1, r1)} L ${p(a1, r0)} A ${r0} ${r0} 0 ${big} 0 ${p(a0, r0)} Z`;
}
function buildWheel() {
  W.ov = $e('div', 'hhd hhd-ov'); W.ov.hidden = true;
  W.wheel = $e('div', 'hhd-wheel');
  W.svg = svgEl('svg', { viewBox: '-210 -210 420 420', 'aria-hidden': 'true' });
  const defs = svgEl('defs', {}), g = svgEl('linearGradient', { id: 'hhdHot', x1: '0', y1: '0', x2: '1', y2: '1' });
  g.append(svgEl('stop', { offset: '0', 'stop-color': '#F47A4F' }), svgEl('stop', { offset: '1', 'stop-color': '#E0402F' })); defs.append(g);
  W.svg.append(defs, svgEl('circle', { class: 'hhd-ring', r: R_OUT + 8 }));
  W.segG = svgEl('g', {}); W.svg.append(W.segG, svgEl('circle', { class: 'hhd-hubc', r: R_HUB }));
  W.hub = $e('div', 'hhd-hub');
  W.hub.style.setProperty('--hhd-mascot', `url("${URLX('icons/icon128.png')}")`);   // V1.89: chú hamster mờ làm nền giữa vòng
  W.wheel.append(W.svg, W.hub);
  W.tip = $e('div', 'hhd-tip');
  W.ov.append(W.wheel, W.tip); document.body.append(W.ov);
  // chế độ bấm chuột (không kéo): rê chuột + bấm
  W.ov.addEventListener('pointermove', e => { if (W.click && !W.busy) track(e.clientX, e.clientY); });
  W.ov.addEventListener('click', e => {
    if (!W.click || W.busy) return;
    track(e.clientX, e.clientY);
    if (W.onHub) return toggleMode();
    if (W.hot >= 0) return choose(W.hot);
    closeWheel();
  });
}
function segItems() {
  if (W.mode === 'tool') return TOOLS.map(t => ({ ...t, off: W.kind !== 'img' }));
  return (FORMATS[W.kind] || []).map(f => f !== 'GOP' ? { id: f, label: f }
    : W.total > 1 ? { id: f, label: W.allX ? 'Gộp Excel' : 'Gộp PDF', long: true }
    : W.kind === 'xls' ? { id: f, label: 'Tách sheet', long: true } : { id: f, label: 'Tách trang', long: true, off: W.kind !== 'pdf' });
}
function drawSegs() {
  W.segG.textContent = ''; W.items = segItems();
  const n = W.items.length; if (!n) return;
  const gap = n > 1 ? .045 : 0, step = Math.PI * 2 / n, start = -Math.PI / 2 - step / 2;
  W.items.forEach((it, i) => {
    const a0 = start + i * step + gap / 2, a1 = start + (i + 1) * step - gap / 2, am = (a0 + a1) / 2, rm = (R_IN + R_OUT) / 2 + 4;
    const g = svgEl('g', { class: 'hhd-seg' + (W.mode === 'tool' ? ' tool' : '') + (it.long ? ' long' : '') + (it.off ? ' off' : '') });
    g.dataset.dx = (Math.cos(am) * 7).toFixed(1); g.dataset.dy = (Math.sin(am) * 7).toFixed(1);
    g.append(svgEl('path', { d: n === 1 ? `M 0 ${-R_OUT} A ${R_OUT} ${R_OUT} 0 1 1 -0.01 ${-R_OUT} Z M 0 ${-R_IN} A ${R_IN} ${R_IN} 0 1 0 0.01 ${-R_IN} Z` : arc(a0, a1, R_IN, R_OUT), 'fill-rule': 'evenodd' }));
    const cx = Math.cos(am) * rm, cy = Math.sin(am) * rm;
    if (it.ic) {
      const ic = svgEl('g', { class: 'ic', transform: `translate(${(cx - 11).toFixed(1)} ${(cy - 21).toFixed(1)}) scale(.92)` }); ic.innerHTML = it.ic; g.append(ic);
      const t = svgEl('text', { x: cx.toFixed(1), y: (cy + 14).toFixed(1) }); t.textContent = it.label; g.append(t);
    } else { const t = svgEl('text', { x: cx.toFixed(1), y: cy.toFixed(1) }); t.textContent = it.label; g.append(t); }
    W.segG.append(g);
  });
  setHot(-1);
}
function hubText() {
  W.hub.textContent = '';
  if (W.busy) { W.hub.append($e('div', 'hhd-spin'), $e('small', '', W.busy === true ? 'Đang làm…' : W.busy)); return; }
  const n = W.count, what = W.total > n ? `${W.total} file` : n > 1 ? `${n} file ${KIND_NAME[W.kind]}` : (W.files && W.files[0] ? W.files[0].name : `1 file ${KIND_NAME[W.kind]}`);
  W.hub.append($e('b', '', W.mode === 'fmt' ? '🧰 Công cụ' : '🔄 Định dạng'), $e('small', '', W.click ? 'bấm để đổi vòng' : 'giữ chuột ở đây'));
  const bar = $e('div', 'bar'); bar.append($e('i')); W.hub.append(bar);
  W.tip.textContent = W.kind === 'other' ? '⚠️ Chưa hỗ trợ loại file này · Esc để huỷ'
    : W.mode === 'fmt' ? `${what} → thả vào ô định dạng · giữ ở giữa để mở Công cụ · Esc để huỷ`
    : W.kind !== 'img' ? 'Công cụ chỉ dùng cho ảnh · giữ ở giữa để quay lại Định dạng'
    : `${what} → thả vào công cụ · giữ ở giữa để quay lại Định dạng`;
}
function setHot(i) {
  W.hot = i;
  [...W.segG.children].forEach((g, k) => { const on = k === i; g.classList.toggle('hot', on); g.setAttribute('transform', on ? `translate(${g.dataset.dx} ${g.dataset.dy})` : ''); });
}
function track(x, y) {
  const dx = x - W.cx, dy = y - W.cy, r = Math.hypot(dx, dy);
  const onHub = r <= R_HUB;
  if (onHub !== W.onHub) {
    W.onHub = onHub; clearTimeout(W.hubT); W.wheel.classList.remove('hubhot');
    if (!onHub) W.hubLock = false;
    else if (!W.hubLock && !W.click) { void W.wheel.offsetWidth; W.wheel.classList.add('hubhot'); W.hubT = setTimeout(() => { W.hubLock = true; W.wheel.classList.remove('hubhot'); toggleMode(); }, 560); }
  }
  let hot = -1;
  if (r >= R_IN - 6 && r <= R_OUT + 22 && W.items.length) {
    const n = W.items.length, step = Math.PI * 2 / n; let a = Math.atan2(dy, dx) + Math.PI / 2 + step / 2; a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    hot = Math.floor(a / step) % n; if (W.items[hot].off) hot = -1;
  }
  if (hot !== W.hot) setHot(hot);
}
function toggleMode() { W.mode = W.mode === 'fmt' ? 'tool' : 'fmt'; drawSegs(); hubText(); }
function placeAt(x, y) {
  const m = 214, vw = innerWidth, vh = innerHeight;
  W.cx = vw < 2 * m ? vw / 2 : Math.min(Math.max(x, m), vw - m); W.cy = vh < 2 * m ? vh / 2 : Math.min(Math.max(y, m), vh - m);
  W.wheel.style.left = W.cx + 'px'; W.wheel.style.top = W.cy + 'px';
}
function showWheel(x, y, kind, count, click, total, allX) {
  if (!W.ov) buildWheel();
  W.kind = kind; W.count = count; W.total = total ?? count; W.allX = allX ?? kind === 'xls'; W.click = !!click; W.mode = 'fmt'; W.hubLock = true; W.onHub = false; W.busy = false;
  W.wheel.classList.remove('busy', 'hubhot'); W.ov.classList.toggle('click', W.click);
  clearTimeout(W.hideT); placeAt(x, y); drawSegs(); hubText(); W.ov.hidden = false; W.open = true;
  void W.ov.offsetWidth; W.ov.classList.add('on');
  if (!click) track(x, y);
}
function closeWheel() {
  if (!W.ov || !W.open) return;
  W.open = false; W.files = null; W.all = null; clearTimeout(W.hubT); W.ov.classList.remove('on');
  clearTimeout(W.hideT); W.hideT = setTimeout(() => { if (!W.open) W.ov.hidden = true; }, 160);
}
function openWheel(files, x, y, click) {
  const fs = [...files]; if (!fs.length) return;
  const kind = kindOf(fs[0]), same = fs.filter(f => kindOf(f) === kind), all = canGop(fs[0]) ? fs.filter(canGop) : same;
  showWheel(x ?? innerWidth / 2, y ?? innerHeight / 2, kind, same.length, click, all.length, all.every(f => kindOf(f) === 'xls')); W.files = same; W.all = all; W.picked = fs.length;
  drawSegs(); hubText();
}
async function choose(i) {
  const it = W.items[i], gop = it && it.id === 'GOP', files = gop ? (W.all || W.files) : W.files; if (!it || !files || !files.length || it.off) return closeWheel();
  const skip = (W.picked || files.length) - files.length;
  if (skip > 0) toast(gop ? `Bỏ qua ${skip} file không phải ảnh/PDF/Excel` : `Chỉ làm ${files.length} file ${KIND_NAME[W.kind]}, bỏ qua ${skip} file khác loại`);
  if (W.mode === 'tool') { closeWheel(); return openTool(it.id, files); }
  if (!gop && W.kind === 'xls' && it.id === 'PDF' && files.length === 1) { closeWheel(); return openXlsPdf(files[0]); }   // V1.95: hộp chỉnh trước khi xuất PDF
  if (!gop && W.kind === 'pdf' && it.id === 'DOCX') { closeWheel(); return openPdfWord(files); }   // V1.96: hỏi kiểu chuyển PDF → Word
  W.busy = true; W.wheel.classList.add('busy'); hubText(); setHot(i);
  const name = files.length > 1 ? `${files.length} file` : files[0].name;
  try {
    const res = await (gop ? gopTach : convert)(files, it.id === 'GOP' ? undefined : it.id, (k, n) => { if (n > 1) { W.busy = `Đang làm ${Math.min(n, Math.floor(k) + 1)}/${n}…`; hubText(); } });
    closeWheel(); await deliver(res);
  } catch (e) { console.warn('[HaoHao Convert]', e); closeWheel(); addError(name, errText(e) || 'Không đổi được file này'); toast('⚠️ ' + (errText(e) || 'Không đổi được file này'), 6000); }
}

/* kéo-thả trên cả trang */
const hasFiles = dt => dt && [...(dt.types || [])].some(t => t === 'Files' || t === 'application/x-hhd');
function dragKind(dt) {
  const its = [...(dt.items || [])].filter(i => i.kind === 'file');
  if ([...(dt.types || [])].includes('application/x-hhd') && !its.length) return { kind: 'img', n: 1 };
  if (!its.length) return { kind: 'img', n: 1 };
  const kind = kindOfMime(its[0].type), ok = k => k === 'img' || k === 'pdf' || k === 'xls', g = ok(kind) ? its.filter(i => ok(kindOfMime(i.type))) : its;
  return { kind, n: its.filter(i => kindOfMime(i.type) === kind).length, total: g.length, allX: g.every(i => kindOfMime(i.type) === 'xls') };
}
function onDragOver(e) {
  if (!hasFiles(e.dataTransfer)) return;
  if (document.querySelector('.hhd-dlgov')) return;   // đang mở hộp công cụ
  if (e.target && e.target.closest && e.target.closest('#hattieu-host')) { if (W.open && !W.click) closeWheel(); return; }   // thả vào chú hamster → để HaoHao gửi sang iPhone như cũ
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  if (!W.open || W.click) { const k = dragKind(e.dataTransfer); showWheel(e.clientX, e.clientY, k.kind, k.n, false, k.total, k.allX); }
  else track(e.clientX, e.clientY);
  clearTimeout(W.dragT); W.dragT = setTimeout(() => { if (!W.busy) closeWheel(); }, 260);   // chuột ra khỏi cửa sổ → tắt
}
async function onDrop(e) {
  if (!hasFiles(e.dataTransfer) || !W.open || W.click) return;
  e.preventDefault(); clearTimeout(W.dragT);
  track(e.clientX, e.clientY);
  const id = e.dataTransfer.getData('application/x-hhd');
  let files = id && RES.get(+id) ? [RES.get(+id).file] : [...(e.dataTransfer.files || [])];
  if (!files.length) return closeWheel();
  const kind = kindOf(files[0]), same = files.filter(f => kindOf(f) === kind), all = canGop(files[0]) ? files.filter(canGop) : same;
  const tot0 = W.total, ax0 = W.allX, allX = all.every(f => kindOf(f) === 'xls'); W.files = same; W.all = all; W.picked = files.length; W.count = same.length; W.total = all.length; W.allX = allX;
  if (kind !== W.kind || (tot0 > 1) !== (all.length > 1) || (all.length > 1 && ax0 !== allX)) {   // lúc kéo chưa biết đúng loại → mở lại vòng đúng loại để bấm chọn
    W.kind = kind; W.click = true; W.ov.classList.add('click'); W.mode = 'fmt'; drawSegs(); hubText(); return;
  }
  if (W.hot >= 0) return choose(W.hot);
  if (W.onHub) { W.click = true; W.ov.classList.add('click'); hubText(); return; }   // thả ở giữa → giữ vòng để bấm chọn
  closeWheel();
}
document.addEventListener('dragover', onDragOver);
document.addEventListener('dragenter', onDragOver);
document.addEventListener('drop', onDrop);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && W.open && !W.busy) closeWheel(); });

/* ───────────────────────── hộp công cụ ───────────────────────── */
function dialog(title, { applyText = 'Áp dụng', foot = '' } = {}) {
  const ov = $e('div', 'hhd hhd-dlgov'), d = $e('div', 'hhd-dlg'); d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', title);
  const h = $e('div', 'hhd-dlg-h'), x = $e('button', 'hhd-x', '✕'); x.title = 'Đóng'; h.append(x, $e('b', '', title), $e('span', '', '')); h.lastChild.style.width = '30px';
  const b = $e('div', 'hhd-dlg-b'), f = $e('div', 'hhd-dlg-f'), reset = $e('button', 'hhd-btn', 'Đặt lại'), sp = $e('span', 'sp', foot), ok = $e('button', 'hhd-btn pri', applyText);
  f.append(reset, sp, ok); d.append(h, b, f); ov.append(d); document.body.append(ov);
  const close = () => { ov.remove(); document.removeEventListener('keydown', esc, true); };
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', esc, true); x.addEventListener('click', close); ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  return { ov, body: b, reset, ok, sp, close };
}
function row(label, ...kids) { const r = $e('div', 'hhd-row'); r.append($e('span', 'lb', label)); kids.forEach(k => { r.append(k); if (k && k._v) r.append(k._v); }); return r; }
function segBtns(opts, cur, on) {
  const w = $e('div', 'hhd-seg2');
  const set = v => { [...w.children].forEach(b => b.classList.toggle('on', b.dataset.v === String(v))); };
  opts.forEach(([v, t]) => { const b = $e('button', '', t); b.type = 'button'; b.dataset.v = String(v); b.addEventListener('click', () => { set(v); on(v); }); w.append(b); });
  set(cur); w.set = set; return w;
}
function slider(min, max, val, on, fmt = v => v) {
  const i = $e('input'); i.type = 'range'; i.min = min; i.max = max; i.value = val; const s = $e('span', 'val', fmt(val));
  i.addEventListener('input', () => { s.textContent = fmt(+i.value); on(+i.value); });
  i._v = s; i.setv = v => { i.value = v; s.textContent = fmt(v); }; return [i, s];
}
// khung xem trước: ảnh thu nhỏ vừa hộp
function stage(src, maxH) {
  const box = $e('div', 'hhd-stage'), cv = $e('canvas');
  const mw = Math.min(640, innerWidth - 70), mh = maxH || Math.min(400, innerHeight * .46);
  const k = Math.min(1, mw / src.width, mh / src.height);
  cv.width = Math.max(1, Math.round(src.width * k)); cv.height = Math.max(1, Math.round(src.height * k));
  const prev = mkCanvas(cv.width, cv.height); prev.getContext('2d').drawImage(src, 0, 0, prev.width, prev.height);
  box.append(cv); return { box, cv, k, prev, x: cv.getContext('2d') };
}
const ptr = (cv, e, k) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width) / k, y: (e.clientY - r.top) * (cv.height / r.height) / k }; };
async function toolSave(results) { await deliver(results); }

async function openTool(id, files) {
  const imgs = files.filter(f => kindOf(f) === 'img');
  if (!imgs.length) return toast('Công cụ chỉ dùng cho ảnh');
  let src; try { toast('⏳ Đang mở ảnh…', 1500); src = await decodeImage(imgs[0]); } catch (e) { return toast('⚠️ ' + errText(e), 6000); }
  const tt = document.querySelector('.hhd-toast'); if (tt) tt.hidden = true;
  const T = { sua: toolEdit, size: toolSize, xnen: toolXnen, logo: toolLogo, nen: toolNen, che: toolChe, note: toolNote, meta: toolMeta }[id];
  T(src, imgs);
}
const firstOnly = files => files.length > 1 ? `Chỉ làm ảnh đầu tiên (${files[0].name})` : '';

/* 🖼️ Thêm nền */
const BG_GRAD = [['#FF6A3D', '#FFC95E'], ['#F857A6', '#FF5858'], ['#FF9A8B', '#FF6A88', '#FF99AC'], ['#C471F5', '#FA71CD'], ['#7F7FD5', '#86A8E7', '#91EAE4'], ['#4FACFE', '#00F2FE'],
  ['#43E97B', '#38F9D7'], ['#FA709A', '#FEE140'], ['#30CFD0', '#330867'], ['#232526', '#414345']];
const BG_SOLID = ['#FFFFFF', '#F4F1EC', '#FDE68A', '#86EFAC', '#5EEAD4', '#93C5FD', '#1E3A8A', '#111827', '#C084FC', '#FCA5A5'];
function compose(src, o, scale = 1) {
  const big = Math.max(src.width, src.height), pad = o.pad / 100 * big;
  let w = src.width + pad * 2, h = src.height + pad * 2;
  if (o.ratio) { if (w / h < o.ratio) w = h * o.ratio; else h = w / o.ratio; }
  const c = mkCanvas(w * scale, h * scale), x = c.getContext('2d'); x.scale(scale, scale);
  if (o.bg.length === 1) x.fillStyle = o.bg[0];
  else { const g = x.createLinearGradient(0, 0, w, h); o.bg.forEach((col, i) => g.addColorStop(i / (o.bg.length - 1), col)); x.fillStyle = g; }
  x.fillRect(0, 0, w, h);
  const ix = (w - src.width) / 2, iy = (h - src.height) / 2, rad = Math.min(src.width, src.height) / 2 * o.rad / 100;
  const rr = () => { x.beginPath(); x.roundRect ? x.roundRect(ix, iy, src.width, src.height, rad) : x.rect(ix, iy, src.width, src.height); };
  if (o.sh > 0) { x.save(); const s = o.sh / 100 * big * .08; x.shadowColor = 'rgba(0,0,0,.38)'; x.shadowBlur = s * scale; x.shadowOffsetY = s * .45 * scale; x.fillStyle = '#fff'; rr(); x.fill(); x.restore(); }
  x.save(); rr(); x.clip(); x.drawImage(src, ix, iy); x.restore();
  return c;
}
/* 🗜️ Nén */
function toolNen(src, files) {
  const D = dialog('Nén ảnh', { applyText: files.length > 1 ? `Nén ${files.length} ảnh` : 'Nén & lưu' });
  const def = () => ({ fmt: 'JPG', q: 75, max: 0 });
  let o = def();
  const info = $e('div', 'hhd-note'); info.style.fontSize = '14px'; info.style.color = 'var(--hd-ink)';
  const prev = $e('div', 'hhd-stage'), cv = $e('canvas'); prev.append(cv);
  const scaled = (s, max) => { if (!max || Math.max(s.width, s.height) <= max) return s; const k = max / Math.max(s.width, s.height), c = mkCanvas(s.width * k, s.height * k); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, c.width, c.height); return c; };
  let tk = 0;
  const calc = async () => {
    const my = ++tk; info.textContent = '⏳ Đang tính…';
    const c = scaled(src, o.max), b = await encode(c, o.fmt, o.q / 100); if (my !== tk) return;
    const before = files[0].size, pct = Math.round((1 - b.size / before) * 100);
    info.innerHTML = ''; info.append(`Ảnh đầu: ${KB(before)} → `, Object.assign($e('b', '', KB(b.size)), {}), ` (${pct >= 0 ? '−' + pct : '+' + -pct}%) · ${c.width}×${c.height}px`);
    const u = URL.createObjectURL(b), im = new Image(); im.onload = () => { const mw = Math.min(640, innerWidth - 70), mh = Math.min(300, innerHeight * .38), k = Math.min(1, mw / im.width, mh / im.height); cv.width = im.width * k; cv.height = im.height * k; cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); }; im.src = u;
  };
  let calcT; const re = () => { clearTimeout(calcT); calcT = setTimeout(calc, 180); };
  const fb = segBtns([['JPG', 'JPG'], ['WEBP', 'WEBP'], ['AVIF', 'AVIF (nhẹ nhất, chậm)']], o.fmt, v => { o.fmt = v; re(); });
  const [qS] = slider(10, 95, o.q, v => { o.q = v; re(); }, v => v + '%');
  const sel = $e('select'); [[0, 'Giữ nguyên'], [3840, '3840 px'], [2560, '2560 px'], [1920, '1920 px'], [1280, '1280 px'], [1080, '1080 px'], [800, '800 px (Shopee)']].forEach(([v, t]) => { const op = $e('option', '', t); op.value = v; sel.append(op); });
  sel.addEventListener('change', () => { o.max = +sel.value; re(); });
  D.body.append(prev, info, row('Định dạng', fb), row('Chất lượng', qS), row('Cạnh dài tối đa', sel));
  D.reset.addEventListener('click', () => { o = def(); fb.set(o.fmt); qS.setv(o.q); sel.value = 0; re(); });
  D.ok.addEventListener('click', async () => {
    D.ok.disabled = true; D.ok.textContent = 'Đang nén…'; const out = [];
    for (let i = 0; i < files.length; i++) { const s = i ? await decodeImage(files[i]) : src; out.push({ blob: await encode(scaled(s, o.max), o.fmt, o.q / 100), name: `${BASE(files[i].name)} đã nén.${EXT_OF[o.fmt]}` }); }
    D.close(); await toolSave(out);
  });
  calc();
}

/* 🙈 Che */
function applyRedact(c, boxes) {
  const x = c.getContext('2d');
  for (const b of boxes) {
    const bx = Math.round(Math.min(b.x, b.x + b.w)), by = Math.round(Math.min(b.y, b.y + b.h)), bw = Math.round(Math.abs(b.w)), bh = Math.round(Math.abs(b.h)); if (bw < 2 || bh < 2) continue;
    if (b.m === 'den') { x.fillStyle = '#000'; x.fillRect(bx, by, bw, bh); continue; }
    if (b.m === 'mo') { const t = mkCanvas(bw, bh), tx = t.getContext('2d'); tx.drawImage(c, bx, by, bw, bh, 0, 0, bw, bh); const r = Math.max(6, Math.min(bw, bh) / 6); x.save(); x.beginPath(); x.rect(bx, by, bw, bh); x.clip(); x.filter = `blur(${r}px)`; x.drawImage(t, bx - r, by - r, bw + 2 * r, bh + 2 * r); x.restore(); x.filter = 'none'; continue; }
    const cell = Math.max(6, Math.round(Math.max(c.width, c.height) / 80)), sw = Math.max(1, Math.round(bw / cell)), sh = Math.max(1, Math.round(bh / cell)), t = mkCanvas(sw, sh);
    t.getContext('2d').drawImage(c, bx, by, bw, bh, 0, 0, sw, sh); x.save(); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, sw, sh, bx, by, bw, bh); x.restore();
  }
}
function toolChe(src, files) {
  const D = dialog('Che thông tin', { foot: firstOnly(files) || 'Kéo chuột trên ảnh để che' }), S = stage(src);
  let boxes = [], mode = 'pixel', cur = null;
  const draw = () => { const c = mkCanvas(S.prev.width, S.prev.height); c.getContext('2d').drawImage(S.prev, 0, 0); applyRedact(c, boxes.concat(cur ? [cur] : []).map(b => ({ ...b, x: b.x * S.k, y: b.y * S.k, w: b.w * S.k, h: b.h * S.k }))); S.x.clearRect(0, 0, S.cv.width, S.cv.height); S.x.drawImage(c, 0, 0); if (cur) { S.x.strokeStyle = '#E8513C'; S.x.lineWidth = 2; S.x.strokeRect(cur.x * S.k, cur.y * S.k, cur.w * S.k, cur.h * S.k); } };
  S.cv.style.cursor = 'crosshair';
  S.cv.addEventListener('pointerdown', e => { S.cv.setPointerCapture(e.pointerId); const p = ptr(S.cv, e, S.k); cur = { x: p.x, y: p.y, w: 0, h: 0, m: mode }; });
  S.cv.addEventListener('pointermove', e => { if (!cur) return; const p = ptr(S.cv, e, S.k); cur.w = p.x - cur.x; cur.h = p.y - cur.y; draw(); });
  S.cv.addEventListener('pointerup', () => { if (cur && Math.abs(cur.w) > 3 && Math.abs(cur.h) > 3) boxes.push(cur); cur = null; draw(); });
  const mb = segBtns([['pixel', '▦ Ô vuông'], ['mo', '◌ Làm mờ'], ['den', '■ Tô đen']], mode, v => { mode = v; });
  const undo = $e('button', 'hhd-btn', '↶ Hoàn tác'); undo.addEventListener('click', () => { boxes.pop(); draw(); });
  D.body.append(S.box, row('Kiểu che', mb, undo), $e('div', 'hhd-note', 'Dùng để che số điện thoại, địa chỉ, số tài khoản, mặt người… trước khi gửi ảnh.'));
  D.reset.addEventListener('click', () => { boxes = []; draw(); });
  D.ok.addEventListener('click', async () => {
    if (!boxes.length) return toast('Kéo chuột trên ảnh để chọn chỗ cần che');
    D.ok.disabled = true; const c = mkCanvas(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); applyRedact(c, boxes);
    const f = fmtOfFile(files[0]); D.close(); await toolSave([{ blob: await encode(c, f), name: `${BASE(files[0].name)} đã che.${EXT_OF[f]}` }]);
  });
  draw();
}

/* xoay, lật, màu – dùng trong Chỉnh sửa */
function renderEdit(src, o) {
  const odd = o.rot % 2 === 1, w = odd ? src.height : src.width, h = odd ? src.width : src.height, c = mkCanvas(w, h), x = c.getContext('2d');
  x.filter = `brightness(${1 + o.b / 100}) contrast(${1 + o.c / 100}) saturate(${1 + o.s / 100})`;
  x.translate(w / 2, h / 2); x.rotate(o.rot * Math.PI / 2); x.scale(o.fh ? -1 : 1, o.fv ? -1 : 1); x.drawImage(src, -src.width / 2, -src.height / 2);
  if (o.w) { x.setTransform(1, 0, 0, 1, 0, 0); x.filter = 'none'; x.globalCompositeOperation = 'soft-light'; x.fillStyle = o.w > 0 ? `rgba(255,150,40,${o.w / 160})` : `rgba(40,120,255,${-o.w / 160})`; x.fillRect(0, 0, w, h); }
  return c;
}
/* 🎚️ Chỉnh sửa (V1.91: gộp Cắt + Nền + Xoay & màu vào 1 hộp, 3 thẻ) */
const scaleTo = (s, k) => { if (k >= 1) return s; const c = mkCanvas(s.width * k, s.height * k), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, c.width, c.height); return c; };
const cropTo = (s, f) => { if (!f) return s; const x0 = Math.round(f.x * s.width), y0 = Math.round(f.y * s.height), w = Math.max(1, Math.round(f.w * s.width)), h = Math.max(1, Math.round(f.h * s.height)), c = mkCanvas(w, h); c.getContext('2d').drawImage(s, x0, y0, w, h, 0, 0, w, h); return c; };
function toolEdit(src, files) {
  const D = dialog('Chỉnh sửa', { applyText: files.length > 1 ? `Lưu ${files.length} ảnh` : 'Lưu', foot: files.length > 1 ? `Áp dụng cho ${files.length} ảnh (vùng cắt theo tỉ lệ ảnh đầu)` : '' });
  const small = scaleTo(src, Math.min(1, 900 / Math.max(src.width, src.height)));
  const defO = () => ({ rot: 0, fh: false, fv: false, b: 0, c: 0, s: 0, w: 0 }), defB = () => ({ on: false, bg: BG_GRAD[0], pad: 12, rad: 6, sh: 30, ratio: 0 });
  let o = defO(), bg = defB(), tab = 'crop', E = renderEdit(small, o), r = { x: 0, y: 0, w: E.width, h: E.height }, ratio = 0, drag = null;
  const box = $e('div', 'hhd-stage'), cv = $e('canvas'); box.append(cv); const x = cv.getContext('2d');
  const MW = Math.min(640, innerWidth - 70), MH = Math.min(360, innerHeight * .42);
  let k = 1;   // tỉ lệ khung xem / ảnh E
  const frac = () => (r.x <= .5 && r.y <= .5 && r.w >= E.width - 1 && r.h >= E.height - 1) ? null : { x: r.x / E.width, y: r.y / E.height, w: r.w / E.width, h: r.h / E.height };
  const handles = () => { const { x: a, y: b, w, h } = r; return [[a, b, 'nw'], [a + w / 2, b, 'n'], [a + w, b, 'ne'], [a + w, b + h / 2, 'e'], [a + w, b + h, 'se'], [a + w / 2, b + h, 's'], [a, b + h, 'sw'], [a, b + h / 2, 'w']]; };
  const clamp = () => { const W0 = E.width, H0 = E.height; r.w = Math.max(8, Math.min(r.w, W0)); r.h = Math.max(8, Math.min(r.h, H0)); r.x = Math.min(Math.max(0, r.x), W0 - r.w); r.y = Math.min(Math.max(0, r.y), H0 - r.h); };
  const fitRatio = () => { if (!ratio) return; let w = E.width, h = w / ratio; if (h > E.height) { h = E.height; w = h * ratio; } const cx = r.x + r.w / 2, cy = r.y + r.h / 2; r = { x: cx - w / 2, y: cy - h / 2, w, h }; clamp(); };
  const show = c => { k = Math.min(1, MW / c.width, MH / c.height); cv.width = Math.max(1, Math.round(c.width * k)); cv.height = Math.max(1, Math.round(c.height * k)); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(c, 0, 0, cv.width, cv.height); };
  const draw = () => {
    if (tab === 'crop') {
      show(E); x.save(); x.fillStyle = 'rgba(20,16,30,.55)'; x.beginPath(); x.rect(0, 0, cv.width, cv.height); x.rect(r.x * k, r.y * k, r.w * k, r.h * k); x.fill('evenodd');
      x.strokeStyle = '#E8513C'; x.lineWidth = 2; x.strokeRect(r.x * k + 1, r.y * k + 1, r.w * k - 2, r.h * k - 2); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1; x.beginPath();
      for (let i = 1; i < 3; i++) { x.moveTo((r.x + r.w * i / 3) * k, r.y * k); x.lineTo((r.x + r.w * i / 3) * k, (r.y + r.h) * k); x.moveTo(r.x * k, (r.y + r.h * i / 3) * k); x.lineTo((r.x + r.w) * k, (r.y + r.h * i / 3) * k); }
      x.stroke(); x.fillStyle = '#E8513C'; handles().forEach(([hx, hy]) => x.fillRect(hx * k - 5, hy * k - 5, 10, 10)); x.restore();
      wIn.value = Math.round(r.w * fw()); hIn.value = Math.round(r.h * fw());
    } else { const C = cropTo(E, frac()); show(bg.on ? compose(C, bg) : C); }
  };
  const P = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * (cv.width / b.width) / k, y: (e.clientY - b.top) * (cv.height / b.height) / k }; };
  const HS = () => 11 / k;
  cv.addEventListener('pointerdown', e => {
    if (tab !== 'crop') return; const p = P(e), h = handles().find(([hx, hy]) => Math.abs(hx - p.x) < HS() && Math.abs(hy - p.y) < HS()); cv.setPointerCapture(e.pointerId);
    if (h) drag = { t: h[2], r0: { ...r } }; else if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) drag = { t: 'move', p0: p, r0: { ...r } }; else drag = { t: 'new', p0: p };
  });
  cv.addEventListener('pointermove', e => {
    if (tab !== 'crop') { cv.style.cursor = 'default'; return; }
    const p = P(e), W0 = E.width, H0 = E.height;
    if (!drag) { const h = handles().find(([hx, hy]) => Math.abs(hx - p.x) < HS() && Math.abs(hy - p.y) < HS()); cv.style.cursor = h ? (h[2].length === 2 ? h[2] + '-resize' : (h[2] === 'n' || h[2] === 's' ? 'ns-resize' : 'ew-resize')) : (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h ? 'move' : 'crosshair'); return; }
    const X = Math.min(Math.max(p.x, 0), W0), Y = Math.min(Math.max(p.y, 0), H0);
    if (drag.t === 'move') { r.x = drag.r0.x + p.x - drag.p0.x; r.y = drag.r0.y + p.y - drag.p0.y; clamp(); return draw(); }
    let ax, ay, t = drag.t;
    if (t === 'new') { ax = drag.p0.x; ay = drag.p0.y; t = (Y < ay ? 'n' : 's') + (X < ax ? 'w' : 'e'); }
    const r0 = t === drag.t ? drag.r0 : null; let x0, y0, x1, y1;
    if (r0) { x0 = r0.x; y0 = r0.y; x1 = r0.x + r0.w; y1 = r0.y + r0.h; } else { x0 = x1 = ax; y0 = y1 = ay; }
    if (t.includes('w')) x0 = X; if (t.includes('e')) x1 = X; if (t.includes('n')) y0 = Y; if (t.includes('s')) y1 = Y;
    if (drag.t === 'new') { x0 = Math.min(ax, X); x1 = Math.max(ax, X); y0 = Math.min(ay, Y); y1 = Math.max(ay, Y); }
    let w = Math.max(8, Math.abs(x1 - x0)), h = Math.max(8, Math.abs(y1 - y0));
    if (ratio) {
      if (t === 'n' || t === 's') w = h * ratio; else if (t === 'e' || t === 'w') h = w / ratio; else if (w / h > ratio) w = h * ratio; else h = w / ratio;
      const fx = t.includes('w') ? (r0 ? r0.x + r0.w : ax) : t.includes('e') ? (r0 ? r0.x : ax) : null, fy = t.includes('n') ? (r0 ? r0.y + r0.h : ay) : t.includes('s') ? (r0 ? r0.y : ay) : null;
      const maxW = fx == null ? W0 : t.includes('w') ? fx : W0 - fx, maxH = fy == null ? H0 : t.includes('n') ? fy : H0 - fy, sc = Math.min(1, maxW / w, maxH / h); w *= sc; h *= sc;
      x0 = fx == null ? (r0 ? r0.x + r0.w / 2 - w / 2 : ax - w / 2) : t.includes('w') ? fx - w : fx; y0 = fy == null ? (r0 ? r0.y + r0.h / 2 - h / 2 : ay - h / 2) : t.includes('n') ? fy - h : fy;
    } else { x0 = Math.min(x0, x1); y0 = Math.min(y0, y1); }
    r = { x: x0, y: y0, w, h }; clamp(); draw();
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  // ── thẻ Cắt
  const pCrop = $e('div'), wIn = $e('input'), hIn = $e('input'); [wIn, hIn].forEach(i => { i.type = 'number'; i.min = 1; });
  const rb = segBtns([[0, 'Tự do'], [1, '1:1'], [16 / 9, '16:9'], [9 / 16, '9:16'], [4 / 3, '4:3'], [3 / 4, '3:4'], [4 / 5, '4:5']], 0, v => { ratio = v; fitRatio(); draw(); });
  const setWH = (w, h) => { const cx = r.x + r.w / 2, cy = r.y + r.h / 2; r = { x: cx - w / 2, y: cy - h / 2, w, h }; clamp(); draw(); };
  const fw = () => (o.rot % 2 ? src.height : src.width) / E.width;   // px ảnh gốc / px xem trước
  wIn.addEventListener('change', () => { let w = (+wIn.value || r.w * fw()) / fw(), h = ratio ? w / ratio : r.h; setWH(w, h); });
  hIn.addEventListener('change', () => { let h = (+hIn.value || r.h * fw()) / fw(), w = ratio ? h * ratio : r.w; setWH(w, h); });
  const px = $e('span', '', 'px'); px.style.color = 'var(--hd-soft)';
  pCrop.append(row('Tỉ lệ', rb), row('Kích thước', $e('span', '', 'Rộng'), wIn, $e('span', '', 'Cao'), hIn, px));
  // ── thẻ Nền
  const pBg = $e('div'), sw1 = $e('div', 'hhd-sw'), sw2 = $e('div', 'hhd-sw');
  const mark = () => [...sw1.children, ...sw2.children].forEach(b => b.classList && b.classList.toggle('on', bg.on ? b.dataset.v === bg.bg.join(',') : b.dataset.v === 'none'));
  const swb = (wrap, cols) => { const b = $e('button'); b.type = 'button'; b.dataset.v = cols ? cols.join(',') : 'none'; b.title = cols ? cols.join(' → ') : 'Không thêm nền';
    if (cols) b.style.background = cols.length > 1 ? `linear-gradient(135deg, ${cols.join(',')})` : cols[0]; else { b.textContent = '∅'; b.style.cssText = 'background:#fff;color:#C0392B;font-weight:800'; }
    b.addEventListener('click', () => { if (cols) { bg.on = true; bg.bg = cols; } else bg.on = false; mark(); draw(); }); wrap.append(b); };
  swb(sw1, null); BG_GRAD.forEach(g => swb(sw1, g)); BG_SOLID.forEach(c => swb(sw2, [c]));
  const pick = $e('input'); pick.type = 'color'; pick.value = '#ffffff'; pick.title = 'Chọn màu khác'; pick.addEventListener('input', () => { bg.on = true; bg.bg = [pick.value]; mark(); draw(); }); sw2.append(pick);
  const [pS] = slider(0, 40, bg.pad, v => { bg.pad = v; if (bg.on) draw(); }, v => v + '%'), [rS] = slider(0, 60, bg.rad, v => { bg.rad = v; if (bg.on) draw(); }, v => v + '%'), [sS] = slider(0, 100, bg.sh, v => { bg.sh = v; if (bg.on) draw(); }, v => v + '%');
  const brb = segBtns([[0, 'Tự động'], [1, '1:1'], [16 / 9, '16:9'], [4 / 5, '4:5'], [9 / 16, '9:16']], 0, v => { bg.ratio = v; if (bg.on) draw(); });
  pBg.append(row('Nền', sw1), row('', sw2), row('Khoảng đệm', pS), row('Bo góc', rS), row('Bóng đổ', sS), row('Tỉ lệ khung', brb));
  // ── thẻ Xoay & màu
  const pAdj = $e('div'), pct = v => (v > 0 ? '+' : '') + v;
  const reE = () => { const w0 = E.width, h0 = E.height; E = renderEdit(small, o); if (E.width !== w0 || E.height !== h0) { r = { x: 0, y: 0, w: E.width, h: E.height }; fitRatio(); } draw(); };   // xoay: giữ tỉ lệ cắt đã chọn
  const bt = (t, ti, fn) => { const b = $e('button', 'hhd-btn', t); b.title = ti; b.addEventListener('click', () => { fn(); reE(); }); return b; };
  const [bS] = slider(-100, 100, 0, v => { o.b = v; reE(); }, pct), [cS] = slider(-100, 100, 0, v => { o.c = v; reE(); }, pct), [s2] = slider(-100, 100, 0, v => { o.s = v; reE(); }, pct), [wS] = slider(-100, 100, 0, v => { o.w = v; reE(); }, pct);
  pAdj.append(row('Xoay, lật', bt('↺ Trái', 'Xoay trái 90°', () => { o.rot = (o.rot + 3) % 4; }), bt('↻ Phải', 'Xoay phải 90°', () => { o.rot = (o.rot + 1) % 4; }), bt('⇋ Lật ngang', 'Lật ngang', () => { o.fh = !o.fh; }), bt('⇵ Lật dọc', 'Lật dọc', () => { o.fv = !o.fv; })),
    row('Độ sáng', bS), row('Tương phản', cS), row('Độ đậm màu', s2), row('Ấm / lạnh', wS));
  const panes = { crop: pCrop, bg: pBg, adj: pAdj };
  const tabs = segBtns([['crop', '✂️ Cắt'], ['bg', '🖼️ Nền'], ['adj', '🎚️ Xoay & màu']], tab, v => { tab = v; Object.entries(panes).forEach(([kk, el]) => { el.hidden = kk !== tab; }); draw(); });
  tabs.classList.add('hhd-tabs'); const tw = $e('div', 'hhd-tabw'); tw.append(tabs);
  D.body.append(tw, box, pCrop, pBg, pAdj); pBg.hidden = pAdj.hidden = true;
  D.reset.addEventListener('click', () => { o = defO(); bg = defB(); ratio = 0; rb.set(0); brb.set(0); [bS, cS, s2, wS].forEach(i => i.setv(0)); pS.setv(bg.pad); rS.setv(bg.rad); sS.setv(bg.sh); E = renderEdit(small, o); r = { x: 0, y: 0, w: E.width, h: E.height }; mark(); draw(); });
  D.ok.addEventListener('click', async () => {
    D.ok.disabled = true; D.ok.textContent = 'Đang lưu…'; const out = [], f0 = frac();
    for (let i = 0; i < files.length; i++) {
      const s = i ? await decodeImage(files[i]) : src, C = cropTo(renderEdit(s, o), f0), res = bg.on ? compose(C, bg) : C, f = bg.on ? 'PNG' : fmtOfFile(files[i]);
      out.push({ blob: await encode(res, f), name: `${BASE(files[i].name)} đã sửa.${EXT_OF[f]}` });
    }
    D.close(); await toolSave(out);
  });
  mark(); draw();
}

/* 📐 Kích thước chuẩn sàn (V1.91) */
const SIZES = [['800x800', 'Shopee 800×800', 800, 800], ['1080x1080', 'Vuông 1080 – TikTok Shop, Facebook, Instagram', 1080, 1080], ['1080x1350', 'Facebook / Instagram dọc 4:5 (1080×1350)', 1080, 1350],
  ['1080x1920', 'TikTok, Story, Reels 9:16 (1080×1920)', 1080, 1920], ['1920x1080', 'Ngang 16:9 – YouTube, bìa (1920×1080)', 1920, 1080], ['tu', 'Tự nhập kích thước…', 0, 0]];
function fitTo(s, W, H, mode, fill) {
  const c = mkCanvas(W, H), x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  if (mode === 'lap') { const k = Math.max(W / s.width, H / s.height); x.drawImage(s, (W - s.width * k) / 2, (H - s.height * k) / 2, s.width * k, s.height * k); return c; }
  if (fill === 'mo') { const k = Math.max(W / s.width, H / s.height); x.filter = `blur(${Math.round(Math.max(W, H) / 28)}px) brightness(.9)`; x.drawImage(s, (W - s.width * k * 1.1) / 2, (H - s.height * k * 1.1) / 2, s.width * k * 1.1, s.height * k * 1.1); x.filter = 'none'; }
  else { x.fillStyle = fill === 'den' ? '#000' : '#fff'; x.fillRect(0, 0, W, H); }
  const k = Math.min(W / s.width, H / s.height); x.drawImage(s, (W - s.width * k) / 2, (H - s.height * k) / 2, s.width * k, s.height * k); return c;
}
function toolSize(src, files) {
  const D = dialog('Kích thước chuẩn sàn', { applyText: files.length > 1 ? `Đổi ${files.length} ảnh` : 'Đổi & lưu' });
  const def = () => ({ p: '800x800', W: 800, H: 800, mode: 'vua', fill: 'trang', fmt: 'JPG' }); let o = def();
  const box = $e('div', 'hhd-stage'), cv = $e('canvas'); box.append(cv);
  const small = scaleTo(src, Math.min(1, 1200 / Math.max(src.width, src.height)));
  const draw = () => { const sc = Math.min(1, 900 / Math.max(o.W, o.H)), c = fitTo(small, Math.round(o.W * sc), Math.round(o.H * sc), o.mode, o.fill), mw = Math.min(640, innerWidth - 70), mh = Math.min(330, innerHeight * .4), k = Math.min(1, mw / c.width, mh / c.height); cv.width = c.width * k; cv.height = c.height * k; cv.getContext('2d').drawImage(c, 0, 0, cv.width, cv.height); info.textContent = `${o.W} × ${o.H} px · ảnh gốc ${src.width} × ${src.height} px`; };
  const info = $e('div', 'hhd-note');
  const sel = $e('select'); SIZES.forEach(([v, t]) => { const op = $e('option', '', t); op.value = v; sel.append(op); });
  const wIn = $e('input'), hIn = $e('input'); [wIn, hIn].forEach(i => { i.type = 'number'; i.min = 16; i.max = 8000; }); wIn.value = o.W; hIn.value = o.H;
  const custom = row('Tự nhập', $e('span', '', 'Rộng'), wIn, $e('span', '', 'Cao'), hIn); custom.hidden = true;
  sel.addEventListener('change', () => { const z = SIZES.find(q => q[0] === sel.value); o.p = sel.value; custom.hidden = sel.value !== 'tu'; if (z[2]) { o.W = z[2]; o.H = z[3]; wIn.value = o.W; hIn.value = o.H; } draw(); });
  [wIn, hIn].forEach(i => i.addEventListener('change', () => { o.W = Math.max(16, Math.min(8000, +wIn.value || o.W)); o.H = Math.max(16, Math.min(8000, +hIn.value || o.H)); draw(); }));
  const fillRow = row('Viền', segBtns([['trang', 'Trắng'], ['mo', 'Nền mờ từ ảnh'], ['den', 'Đen']], o.fill, v => { o.fill = v; draw(); }));
  const mb = segBtns([['vua', 'Vừa khung (giữ đủ ảnh)'], ['lap', 'Lấp đầy (cắt bớt mép)']], o.mode, v => { o.mode = v; fillRow.hidden = v !== 'vua'; draw(); });
  const fb = segBtns([['JPG', 'JPG'], ['PNG', 'PNG'], ['WEBP', 'WEBP']], o.fmt, v => { o.fmt = v; });
  D.body.append(box, info, row('Kích thước', sel), custom, row('Cách đặt ảnh', mb), fillRow, row('Lưu thành', fb));
  D.reset.addEventListener('click', () => { o = def(); sel.value = o.p; custom.hidden = true; wIn.value = o.W; hIn.value = o.H; mb.set(o.mode); fb.set(o.fmt); fillRow.hidden = false; draw(); });
  D.ok.addEventListener('click', async () => {
    D.ok.disabled = true; D.ok.textContent = 'Đang đổi…'; const out = [];
    for (let i = 0; i < files.length; i++) { const s = i ? await decodeImage(files[i]) : src; out.push({ blob: await encode(fitTo(s, o.W, o.H, o.mode, o.fill), o.fmt, .92), name: `${BASE(files[i].name)} ${o.W}x${o.H}.${EXT_OF[o.fmt]}` }); }
    D.close(); await toolSave(out);
  });
  draw();
}

/* ✂️ Xoá nền ảnh bằng AI chạy trên máy (V1.91: U²-Net nhỏ u2netp, onnxruntime-web) */
let aiP;
const aiLoad = () => aiP ||= (async () => {
  const ort = await import(URLX('lib/ort/ort.wasm.min.mjs'));
  ort.env.wasm.wasmPaths = URLX('lib/ort/'); ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
  const sess = await ort.InferenceSession.create(URLX('lib/ai/u2netp.onnx'), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return { ort, sess };
})().catch(e => { aiP = null; throw e; });
async function aiMask(src) {   // → canvas 320×320, độ trong suốt = vùng giữ lại
  const { ort, sess } = await aiLoad(), N = 320, c = mkCanvas(N, N), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, N, N);
  const d = x.getImageData(0, 0, N, N).data, inp = new Float32Array(3 * N * N), mean = [.485, .456, .406], std = [.229, .224, .225]; let mx = 0;
  for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i], d[i + 1], d[i + 2]); mx = mx / 255 || 1;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) for (let ch = 0; ch < 3; ch++) inp[ch * N * N + p] = (d[i + ch] / 255 / mx - mean[ch]) / std[ch];
  const res = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', inp, [1, 3, N, N]) }), o = res[sess.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < N * N; i++) { lo = Math.min(lo, o[i]); hi = Math.max(hi, o[i]); }
  const m = mkCanvas(N, N), mx2 = m.getContext('2d'), md = mx2.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = 255; md.data[i * 4 + 3] = Math.round((o[i] - lo) / (hi - lo + 1e-8) * 255); }
  mx2.putImageData(md, 0, 0); return m;
}
function buildMask(base, W, H, o, strokes, k) {
  const m = mkCanvas(W, H), x = m.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(base, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), a = d.data, g = o.gon / 100 * .42, lo = g, hi = 1 - g;
  for (let i = 3; i < a.length; i += 4) { const v = (a[i] / 255 - lo) / (hi - lo); a[i] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255); }
  x.putImageData(d, 0, 0);
  if (o.mem > 0) { const t = mkCanvas(W, H), tx = t.getContext('2d'); tx.filter = `blur(${(o.mem * Math.max(W, H) / 1400).toFixed(2)}px)`; tx.drawImage(m, 0, 0); x.clearRect(0, 0, W, H); x.drawImage(t, 0, 0); }
  for (const s of strokes) {
    x.save(); x.globalCompositeOperation = s.t === 'tay' ? 'destination-out' : 'source-over'; x.strokeStyle = x.fillStyle = '#fff'; x.lineWidth = s.r * 2 * k; x.lineCap = x.lineJoin = 'round';
    x.beginPath(); s.p.forEach((p, i) => i ? x.lineTo(p.x * k, p.y * k) : x.moveTo(p.x * k, p.y * k)); if (s.p.length === 1) { x.arc(s.p[0].x * k, s.p[0].y * k, s.r * k, 0, Math.PI * 2); x.fill(); } else x.stroke(); x.restore();
  }
  return m;
}
function cutOut(img, mask, bg) {
  const c = mkCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0, c.width, c.height);
  if (!bg) return c; const o = mkCanvas(c.width, c.height), ox = o.getContext('2d'); ox.fillStyle = bg; ox.fillRect(0, 0, o.width, o.height); ox.drawImage(c, 0, 0); return o;
}
async function toolXnen(src, files) {
  const D = dialog('Xoá nền ảnh', { applyText: files.length > 1 ? `Xoá nền ${files.length} ảnh` : 'Lưu', foot: files.length > 1 ? 'Sửa tay chỉ áp cho ảnh đầu, ảnh khác AI tự làm' : '' });
  const S = stage(src); D.body.append(S.box);
  const wait = $e('div', 'hhd-note', '⏳ Đang chạy AI tách nền ngay trên máy… (lần đầu mất vài giây để nạp bộ AI)'); wait.style.cssText = 'text-align:center;font-size:13.5px'; D.body.append(wait);
  D.ok.disabled = true; S.x.globalAlpha = .35; S.x.drawImage(S.prev, 0, 0); S.x.globalAlpha = 1;
  let base; try { base = await aiMask(src); } catch (e) { console.warn('[HaoHao Convert] AI', e); wait.textContent = '⚠️ Không chạy được AI xoá nền. ' + errText(e); return; }
  if (!document.body.contains(D.ov)) return;
  wait.remove(); D.ok.disabled = false;
  const def = () => ({ gon: 20, mem: 2, out: 'trong', col: '#ffffff', brush: 'xem', r: Math.max(6, Math.round(Math.max(src.width, src.height) / 60)) });
  let o = def(), strokes = [], cur = null;
  const bgOf = () => o.out === 'trong' ? null : o.out === 'trang' ? '#ffffff' : o.col;
  const draw = () => { const m = buildMask(base, S.cv.width, S.cv.height, o, cur ? strokes.concat([cur]) : strokes, S.k); S.x.clearRect(0, 0, S.cv.width, S.cv.height); S.x.drawImage(cutOut(S.prev, m, bgOf()), 0, 0); };
  S.cv.addEventListener('pointerdown', e => { if (o.brush === 'xem') return; S.cv.setPointerCapture(e.pointerId); cur = { t: o.brush, r: o.r, p: [ptr(S.cv, e, S.k)] }; draw(); });
  S.cv.addEventListener('pointermove', e => { if (!cur) return; cur.p.push(ptr(S.cv, e, S.k)); draw(); });
  S.cv.addEventListener('pointerup', () => { if (cur) { strokes.push(cur); cur = null; draw(); } });
  const colIn = $e('input'); colIn.type = 'color'; colIn.value = o.col; colIn.hidden = true; colIn.addEventListener('input', () => { o.col = colIn.value; draw(); });
  const ob = segBtns([['trong', 'Trong suốt (PNG)'], ['trang', 'Nền trắng (JPG)'], ['mau', 'Màu khác']], o.out, v => { o.out = v; colIn.hidden = v !== 'mau'; draw(); });
  const [gS] = slider(0, 100, o.gon, v => { o.gon = v; draw(); }, v => v + '%'), [mS] = slider(0, 10, o.mem, v => { o.mem = v; draw(); });
  const bb = segBtns([['xem', '👁 Xem'], ['tay', '🧽 Tẩy'], ['khoi', '🖌️ Khôi phục']], o.brush, v => { o.brush = v; S.cv.style.cursor = v === 'xem' ? 'default' : 'crosshair'; });
  const [rS2] = slider(2, 120, o.r, v => { o.r = Math.round(v * Math.max(src.width, src.height) / 1200) || 2; }, v => v);
  rS2.value = Math.round(o.r * 1200 / Math.max(src.width, src.height)); rS2._v.textContent = rS2.value;
  const undo = $e('button', 'hhd-btn', '↶ Hoàn tác'); undo.addEventListener('click', () => { strokes.pop(); draw(); });
  D.body.append(row('Nền ra', ob, colIn), row('Độ gọn', gS), row('Làm mềm mép', mS), row('Sửa tay', bb, undo), row('Cỡ cọ', rS2),
    $e('div', 'hhd-note', 'AI tách tốt ảnh sản phẩm rõ nét. Chỗ sót thì chọn 🧽 Tẩy rồi tô lên; chỗ mất thì chọn 🖌️ Khôi phục.'));
  D.reset.addEventListener('click', () => { o = def(); strokes = []; ob.set(o.out); colIn.hidden = true; gS.setv(o.gon); mS.setv(o.mem); bb.set('xem'); draw(); });
  D.ok.addEventListener('click', async () => {
    D.ok.disabled = true; D.ok.textContent = 'Đang lưu…'; const out = [], bgc = bgOf(), fmt = bgc ? 'JPG' : 'PNG';
    for (let i = 0; i < files.length; i++) {
      const s = i ? await decodeImage(files[i]) : src, b0 = i ? await aiMask(s) : base;
      out.push({ blob: await encode(cutOut(s, buildMask(b0, s.width, s.height, o, i ? [] : strokes, 1), bgc), fmt, .93), name: `${BASE(files[i].name)} xoá nền.${EXT_OF[fmt]}` });
    }
    D.close(); await toolSave(out);
  });
  draw();
}

/* 🏷️ Đóng dấu logo (V1.91) – nhớ logo + cài đặt cho lần sau */
function logoMark(o, img, W) {   // tạo dấu (logo ảnh hoặc chữ) theo bề rộng ảnh W
  const tw = Math.max(8, W * o.size / 100);
  if (o.kind === 'anh') { if (!img) return null; const k = tw / img.width, c = mkCanvas(img.width * k, img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; }
  const txt = (o.text || '').trim(); if (!txt) return null;
  const m = mkCanvas(10, 10).getContext('2d'); let fs = 100; m.font = `800 ${fs}px "Be Vietnam Pro", "Segoe UI", sans-serif`; fs = Math.max(6, fs * tw / Math.max(1, m.measureText(txt).width));
  const c = mkCanvas(tw + fs * .4, fs * 1.45), x = c.getContext('2d'); x.font = `800 ${fs}px "Be Vietnam Pro", "Segoe UI", sans-serif`; x.textBaseline = 'middle'; x.textAlign = 'center';
  x.lineWidth = Math.max(1, fs / 9); x.lineJoin = 'round'; x.strokeStyle = /^#f/i.test(o.color) || o.color.toLowerCase() === '#ffffff' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.7)';
  x.strokeText(txt, c.width / 2, c.height / 2); x.fillStyle = o.color; x.fillText(txt, c.width / 2, c.height / 2); return c;
}
function stamp(s, o, img) {
  const c = mkCanvas(s.width, s.height), x = c.getContext('2d'); x.drawImage(s, 0, 0);
  const mk = logoMark(o, img, s.width); if (!mk) return c;
  x.globalAlpha = o.op / 100;
  if (o.tile) {
    const gx = mk.width * 1.7, gy = mk.height * 2.6, R = Math.hypot(c.width, c.height);
    x.translate(c.width / 2, c.height / 2); x.rotate(-Math.PI / 6);
    for (let yy = -R, row = 0; yy < R; yy += gy, row++) for (let xx = -R + (row % 2) * gx / 2; xx < R; xx += gx) x.drawImage(mk, xx, yy);
    return c;
  }
  const mar = Math.min(s.width, s.height) * o.mar / 100, [v, h] = o.pos;
  const px = h === 'l' ? mar : h === 'r' ? s.width - mk.width - mar : (s.width - mk.width) / 2, py = v === 't' ? mar : v === 'b' ? s.height - mk.height - mar : (s.height - mk.height) / 2;
  x.drawImage(mk, px, py); return c;
}
async function toolLogo(src, files) {
  const saved = await kvGet('logoOpt'), blob = await kvGet('logoBlob');
  const def = () => ({ kind: 'chu', text: 'HaoHao Shop', color: '#FFFFFF', pos: 'br', size: 22, op: 85, mar: 3, tile: false });
  let o = { ...def(), ...(saved || {}) }, img = null;
  if (blob) { try { img = await createImageBitmap(blob); } catch {} }
  if (!saved && img) o.kind = 'anh';
  const D = dialog('Đóng dấu logo', { applyText: files.length > 1 ? `Đóng ${files.length} ảnh` : 'Đóng & lưu', foot: files.length > 1 ? `Áp dụng cho ${files.length} ảnh` : '' });
  const S = stage(src);
  const draw = () => { S.x.clearRect(0, 0, S.cv.width, S.cv.height); S.x.drawImage(stamp(S.prev, o, img), 0, 0); kvSet('logoOpt', o); };
  const kb = segBtns([['anh', '🖼️ Ảnh logo'], ['chu', '🔤 Chữ']], o.kind, v => { o.kind = v; rA.hidden = v !== 'anh'; rC.hidden = v !== 'chu'; draw(); });
  const th = $e('span', 'hhd-note', img ? 'Đang dùng logo đã lưu' : 'Chưa có logo'); th.style.margin = '0';
  const pickB = $e('button', 'hhd-btn', '📁 Chọn ảnh logo…'); pickB.addEventListener('click', () => { const i = $e('input'); i.type = 'file'; i.accept = 'image/*'; i.addEventListener('change', async () => { const f = i.files[0]; if (!f) return; try { const c = await decodeImage(f), b = await toBlob(c, 'image/png'); img = await createImageBitmap(b); await kvSet('logoBlob', b); th.textContent = '✅ ' + f.name + ' (đã lưu cho lần sau)'; o.kind = 'anh'; kb.set('anh'); draw(); } catch (e) { toast('⚠️ ' + e.message); } }); i.click(); });
  const rA = row('Logo', pickB, th);
  const tIn = $e('input'); tIn.type = 'text'; tIn.value = o.text; tIn.maxLength = 60; tIn.style.cssText = 'flex:1;min-width:140px;font:inherit;padding:5px 8px;border:1px solid var(--hd-bd);border-radius:8px;background:var(--hd-card);color:var(--hd-ink)'; tIn.placeholder = 'Tên shop, số điện thoại…';
  tIn.addEventListener('input', () => { o.text = tIn.value; draw(); }); tIn.addEventListener('keydown', e => e.stopPropagation());
  const cIn = $e('input'); cIn.type = 'color'; cIn.value = o.color; cIn.addEventListener('input', () => { o.color = cIn.value; draw(); });
  const rC = row('Chữ', tIn, cIn); rA.hidden = o.kind !== 'anh'; rC.hidden = o.kind !== 'chu';
  const grid = $e('div', 'hhd-pos'), POS = [['tl', '↖'], ['tc', '↑'], ['tr', '↗'], ['cl', '←'], ['cc', '•'], ['cr', '→'], ['bl', '↙'], ['bc', '↓'], ['br', '↘']];
  const markPos = () => [...grid.children].forEach(b => b.classList.toggle('on', !o.tile && b.dataset.v === o.pos));
  POS.forEach(([v, t]) => { const b = $e('button', '', t); b.type = 'button'; b.dataset.v = v; b.addEventListener('click', () => { o.pos = v; o.tile = false; tb.set('mot'); markPos(); draw(); }); grid.append(b); });
  const tb = segBtns([['mot', 'Một chỗ'], ['lap', 'Lặp chéo khắp ảnh']], o.tile ? 'lap' : 'mot', v => { o.tile = v === 'lap'; markPos(); draw(); });
  const [zS] = slider(5, 60, o.size, v => { o.size = v; draw(); }, v => v + '%'), [pS] = slider(10, 100, o.op, v => { o.op = v; draw(); }, v => v + '%'), [mS] = slider(0, 10, o.mar, v => { o.mar = v; draw(); }, v => v + '%');
  D.body.append(S.box, row('Loại', kb), rA, rC, row('Kiểu', tb), row('Vị trí', grid), row('Độ to', zS), row('Độ rõ', pS), row('Cách mép', mS));
  D.reset.addEventListener('click', () => { const keep = { kind: o.kind, text: o.text, color: o.color }; o = { ...def(), ...keep }; tb.set('mot'); zS.setv(o.size); pS.setv(o.op); mS.setv(o.mar); markPos(); draw(); });
  D.ok.addEventListener('click', async () => {
    if (o.kind === 'anh' && !img) return toast('Chọn ảnh logo trước nhé'); if (o.kind === 'chu' && !o.text.trim()) return toast('Gõ chữ cần đóng lên ảnh');
    D.ok.disabled = true; D.ok.textContent = 'Đang đóng…'; const out = [];
    for (let i = 0; i < files.length; i++) { const s = i ? await decodeImage(files[i]) : src, f = fmtOfFile(files[i]); out.push({ blob: await encode(stamp(s, o, img), f), name: `${BASE(files[i].name)} có logo.${EXT_OF[f]}` }); }
    D.close(); await toolSave(out);
  });
  markPos(); draw();
}

/* ✍️ Ghi chú */
function drawShapes(x, shapes, k, base) {
  for (const s of shapes) {
    const lw = base * s.z * k; x.save(); x.strokeStyle = x.fillStyle = s.c; x.lineWidth = lw; x.lineCap = x.lineJoin = 'round';
    if (s.t === 'pen') { x.beginPath(); s.p.forEach((p, i) => i ? x.lineTo(p.x * k, p.y * k) : x.moveTo(p.x * k, p.y * k)); x.stroke(); }
    else if (s.t === 'rect') { x.strokeRect(s.a.x * k, s.a.y * k, (s.b.x - s.a.x) * k, (s.b.y - s.a.y) * k); }
    else if (s.t === 'ell') { x.beginPath(); x.ellipse((s.a.x + s.b.x) / 2 * k, (s.a.y + s.b.y) / 2 * k, Math.abs(s.b.x - s.a.x) / 2 * k, Math.abs(s.b.y - s.a.y) / 2 * k, 0, 0, Math.PI * 2); x.stroke(); }
    else if (s.t === 'arrow') {
      const ax = s.a.x * k, ay = s.a.y * k, bx = s.b.x * k, by = s.b.y * k, an = Math.atan2(by - ay, bx - ax), hl = lw * 4;
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx - Math.cos(an) * hl * .6, by - Math.sin(an) * hl * .6); x.stroke();
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx - hl * Math.cos(an - .45), by - hl * Math.sin(an - .45)); x.lineTo(bx - hl * Math.cos(an + .45), by - hl * Math.sin(an + .45)); x.closePath(); x.fill();
    } else if (s.t === 'text') {
      const fs = base * s.z * 7 * k; x.font = `800 ${fs}px "Be Vietnam Pro", "Segoe UI", sans-serif`; x.textBaseline = 'top';
      x.lineWidth = fs / 6; x.strokeStyle = s.c === '#FFFFFF' ? '#000' : '#fff'; x.strokeText(s.s, s.a.x * k, s.a.y * k); x.fillText(s.s, s.a.x * k, s.a.y * k);
    }
    x.restore();
  }
}
function toolNote(src, files) {
  const D = dialog('Ghi chú lên ảnh', { foot: firstOnly(files) }), S = stage(src);
  const base = Math.max(src.width, src.height) / 300;
  let shapes = [], tool = 'arrow', col = '#E8513C', z = 2, cur = null, inp = null;
  const draw = () => { S.x.clearRect(0, 0, S.cv.width, S.cv.height); S.x.drawImage(S.prev, 0, 0); drawShapes(S.x, shapes.concat(cur ? [cur] : []), S.k, base); };
  S.box.style.position = 'relative'; S.cv.style.cursor = 'crosshair';
  const commitText = () => { if (!inp) return; const v = inp.value.trim(); if (v) shapes.push({ t: 'text', a: inp._p, s: v, c: col, z }); inp.remove(); inp = null; draw(); };
  S.cv.addEventListener('pointerdown', e => {
    const p = ptr(S.cv, e, S.k);
    if (tool === 'text') {
      e.preventDefault(); commitText(); inp = $e('input', 'hhd-txtin'); inp._p = p; const r = S.cv.getBoundingClientRect(), br = S.box.getBoundingClientRect();
      inp.style.left = (e.clientX - br.left) + 'px'; inp.style.top = (e.clientY - br.top - 4) + 'px'; inp.placeholder = 'Gõ chữ rồi Enter';
      inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') commitText(); if (ev.key === 'Escape') { inp.remove(); inp = null; } });
      S.box.append(inp); inp.focus(); return;
    }
    S.cv.setPointerCapture(e.pointerId); cur = tool === 'pen' ? { t: 'pen', p: [p], c: col, z } : { t: tool, a: p, b: p, c: col, z };
  });
  S.cv.addEventListener('pointermove', e => { if (!cur) return; const p = ptr(S.cv, e, S.k); if (cur.t === 'pen') cur.p.push(p); else cur.b = p; draw(); });
  S.cv.addEventListener('pointerup', () => { if (cur) { if (cur.t === 'pen' ? cur.p.length > 1 : Math.hypot(cur.b.x - cur.a.x, cur.b.y - cur.a.y) > 3) shapes.push(cur); cur = null; draw(); } });
  const tb = segBtns([['arrow', '➜ Mũi tên'], ['rect', '▭ Khung'], ['ell', '◯ Tròn'], ['pen', '✏️ Bút'], ['text', 'T Chữ']], tool, v => { commitText(); tool = v; });
  const sw = $e('div', 'hhd-sw'); const COLS = ['#E8513C', '#F2B544', '#2F9E7E', '#2E7DD7', '#7C5CFF', '#111827', '#FFFFFF'];
  COLS.forEach(c => { const b = $e('button'); b.type = 'button'; b.style.background = c; b.dataset.v = c; b.addEventListener('click', () => { col = c; [...sw.children].forEach(x => x.classList.toggle('on', x.dataset.v === c)); }); sw.append(b); }); sw.firstChild.classList.add('on');
  const zb = segBtns([[1, 'Mảnh'], [2, 'Vừa'], [3.5, 'Đậm']], z, v => { z = v; });
  const undo = $e('button', 'hhd-btn', '↶ Hoàn tác'); undo.addEventListener('click', () => { shapes.pop(); draw(); });
  D.body.append(S.box, row('Công cụ', tb), row('Màu', sw), row('Nét', zb, undo));
  D.reset.addEventListener('click', () => { shapes = []; draw(); });
  D.ok.addEventListener('click', async () => {
    commitText(); if (!shapes.length) return toast('Vẽ hoặc viết lên ảnh trước nhé');
    D.ok.disabled = true; const c = mkCanvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); drawShapes(x, shapes, 1, base);
    const f = fmtOfFile(files[0]); D.close(); await toolSave([{ blob: await encode(c, f), name: `${BASE(files[0].name)} ghi chú.${EXT_OF[f]}` }]);
  });
  draw();
}

/* 🏷️ Thông tin ẩn (EXIF) */
function readExif(u8) {
  if (u8[0] !== 0xFF || u8[1] !== 0xD8) return null;
  let i = 2; const segs = [];
  while (i + 4 < u8.length && u8[i] === 0xFF) {
    const m = u8[i + 1]; if (m === 0xDA || m === 0xD9) break; const len = (u8[i + 2] << 8) | u8[i + 3];
    segs.push({ m, at: i + 4, len: len - 2 }); i += 2 + len;
  }
  const out = { segs, orient: 1 };
  const ex = segs.find(s => s.m === 0xE1 && String.fromCharCode(...u8.subarray(s.at, s.at + 4)) === 'Exif');
  out.xmp = segs.some(s => s.m === 0xE1 && String.fromCharCode(...u8.subarray(s.at, s.at + 4)) === 'http');
  out.iptc = segs.some(s => s.m === 0xED); out.com = segs.some(s => s.m === 0xFE);
  if (!ex) return out;
  const t0 = ex.at + 6, v = new DataView(u8.buffer, u8.byteOffset + t0, Math.min(ex.len - 6, u8.length - t0)), le = v.getUint16(0) === 0x4949;
  const g16 = o => v.getUint16(o, le), g32 = o => v.getUint32(o, le);
  const str = (o, n) => { let s = ''; for (let k = 0; k < n; k++) { const c = v.getUint8(o + k); if (!c) break; s += String.fromCharCode(c); } return s.trim(); };
  const rat = o => { const a = g32(o), b = g32(o + 4); return b ? a / b : 0; };
  const ifd = (o, want) => {
    const r = {}; if (o <= 0 || o + 2 > v.byteLength) return r; const n = g16(o);
    for (let k = 0; k < n; k++) {
      const e = o + 2 + k * 12; if (e + 12 > v.byteLength) break; const tag = g16(e), type = g16(e + 2), cnt = g32(e + 4), vo = e + 8;
      if (!want.includes(tag)) continue;
      try {
        if (type === 2) r[tag] = str(cnt > 4 ? g32(vo) : vo, cnt);
        else if (type === 3) r[tag] = g16(vo);
        else if (type === 4) r[tag] = g32(vo);
        else if (type === 5) { const p = g32(vo); r[tag] = Array.from({ length: cnt }, (_, j) => rat(p + j * 8)); }
      } catch {}
    }
    return r;
  };
  try {
    const d0 = ifd(g32(4), [0x010F, 0x0110, 0x0131, 0x0132, 0x0112, 0x8769, 0x8825]);
    out.make = d0[0x010F]; out.model = d0[0x0110]; out.soft = d0[0x0131]; out.date = d0[0x0132]; out.orient = d0[0x0112] || 1;
    if (d0[0x8769]) { const e = ifd(d0[0x8769], [0x9003, 0xA434]); out.date = e[0x9003] || out.date; out.lens = e[0xA434]; }
    if (d0[0x8825]) {
      const g = ifd(d0[0x8825], [1, 2, 3, 4]);
      if (g[2] && g[4]) { const dms = a => a[0] + (a[1] || 0) / 60 + (a[2] || 0) / 3600; let la = dms(g[2]), lo = dms(g[4]); if (g[1] === 'S') la = -la; if (g[3] === 'W') lo = -lo; if (la || lo) out.gps = [la, lo]; }
    }
  } catch {}
  return out;
}
function stripJpeg(u8) {
  const parts = [u8.subarray(0, 2)]; let i = 2;
  while (i + 4 < u8.length && u8[i] === 0xFF) {
    const m = u8[i + 1]; if (m === 0xDA) break; const len = (u8[i + 2] << 8) | u8[i + 3];
    const drop = m === 0xE1 || m === 0xED || m === 0xFE || (m >= 0xE3 && m <= 0xEC) || m === 0xEF;
    if (!drop) parts.push(u8.subarray(i, i + 2 + len)); i += 2 + len;
  }
  parts.push(u8.subarray(i)); return new Blob(parts, { type: 'image/jpeg' });
}
function pngInfo(u8) {
  if (u8[0] !== 0x89 || u8[1] !== 0x50) return null; const v = new DataView(u8.buffer, u8.byteOffset); let i = 8; const found = [], keep = [u8.subarray(0, 8)];
  while (i + 8 <= u8.length) {
    const len = v.getUint32(i), type = String.fromCharCode(...u8.subarray(i + 4, i + 8)), end = i + 12 + len;
    if (/^(tEXt|iTXt|zTXt|eXIf|tIME)$/.test(type)) found.push(type); else keep.push(u8.subarray(i, end));
    i = end; if (type === 'IEND') break;
  }
  return { found, clean: new Blob(keep, { type: 'image/png' }) };
}
async function toolMeta(src, files) {
  const f = files[0], u8 = new Uint8Array(await f.arrayBuffer()), ex = readExif(u8), pg = pngInfo(u8);
  const D = dialog('Thông tin ẩn trong ảnh', { applyText: files.length > 1 ? `🧹 Xoá cho ${files.length} ảnh` : '🧹 Xoá thông tin ẩn & lưu' });
  const t = $e('table', 'hhd-meta'), add = (k, val, warn) => { const r = $e('tr', warn ? 'warn' : ''); r.append($e('td', '', k), $e('td', '', val)); t.append(r); };
  add('Tên file', f.name); add('Kích thước', `${src.width} × ${src.height} px`); add('Dung lượng', KB(f.size));
  let any = false;
  if (ex) {
    if (ex.make || ex.model) { add('Máy chụp', [ex.make, ex.model].filter(Boolean).join(' ')); any = true; }
    if (ex.lens) { add('Ống kính', ex.lens); any = true; }
    if (ex.date) { add('Ngày giờ chụp', ex.date.replace(/^(\d{4}):(\d\d):(\d\d)/, '$3/$2/$1')); any = true; }
    if (ex.soft) { add('Phần mềm', ex.soft); any = true; }
    if (ex.gps) { add('📍 Vị trí GPS', `${ex.gps[0].toFixed(5)}, ${ex.gps[1].toFixed(5)} – lộ nơi chụp!`, true); any = true; }
    if (ex.xmp) { add('XMP', 'Có (thông tin chỉnh sửa, tác giả…)'); any = true; }
    if (ex.iptc) { add('IPTC', 'Có (chú thích, bản quyền…)'); any = true; }
    if (ex.com) { add('Ghi chú trong file', 'Có'); any = true; }
  }
  if (pg && pg.found.length) { add('Thông tin trong PNG', pg.found.join(', ')); any = true; }
  if (!any) add('Thông tin ẩn', ex || pg ? 'Không thấy – ảnh đã sạch' : 'Không đọc được với loại ảnh này (khi lưu sẽ tạo bản sạch)');
  D.body.append(t, $e('div', 'hhd-note', 'Ảnh chụp bằng điện thoại thường kèm vị trí GPS, ngày giờ, loại máy. Xoá trước khi gửi cho người lạ. Ảnh JPG/PNG giữ nguyên chất lượng (không nén lại).'));
  D.reset.style.visibility = 'hidden';
  D.ok.addEventListener('click', async () => {
    D.ok.disabled = true; const out = [];
    for (const file of files) {
      const b = new Uint8Array(await file.arrayBuffer()), e2 = readExif(b), p2 = pngInfo(b), nm = BASE(file.name);
      if (e2 && (e2.orient || 1) === 1) out.push({ blob: stripJpeg(b), name: `${nm} sạch.jpg` });
      else if (p2) out.push({ blob: p2.clean, name: `${nm} sạch.png` });
      else { const c = file === f ? src : await decodeImage(file), fm = e2 ? 'JPG' : fmtOfFile(file); out.push({ blob: await encode(c, fm, .95), name: `${nm} sạch.${EXT_OF[fm]}` }); }
    }
    D.close(); await toolSave(out);
  });
}

/* 📝 PDF → Word: chọn kiểu (V1.96) */
function openPdfWord(files) {
  const D = dialog('Chuyển PDF sang Word', { applyText: files.length > 1 ? `Chuyển ${files.length} file` : 'Chuyển sang Word' });
  let mode = 'flow';
  const card = (v, title, desc) => { const b = $e('button', 'hhd-mode'); b.type = 'button'; b.dataset.v = v; b.append($e('b', '', title), $e('span', '', desc)); b.addEventListener('click', () => { mode = v; [...wrap.children].forEach(x => x.classList.toggle('on', x.dataset.v === v)); }); return b; };
  const wrap = $e('div', 'hhd-modes');
  wrap.append(card('flow', '✍️ Dễ sửa (khuyên dùng)', 'Dựng lại đoạn văn, căn lề, cỡ chữ, đậm/nghiêng/màu; bảng có kẻ thành bảng Word thật; hình đặt đúng chỗ. Sửa chữ thoải mái, chữ tự xuống dòng.'),
    card('exact', '📐 Giữ nguyên bố cục', 'Trông giống hệt PDF: nền, đường kẻ, hình y nguyên, từng dòng chữ đặt đúng chỗ. Sửa được chữ trong từng dòng nhưng không tự xuống dòng.'));
  wrap.firstChild.classList.add('on');
  const st = $e('div', 'hhd-note', files.length > 1 ? `${files.length} file PDF` : files[0].name);
  D.body.append(wrap, st, $e('div', 'hhd-note', 'PDF scan (chỉ là ảnh chụp) không có chữ để chuyển. Phông chữ lấy theo PDF; máy không có phông đó thì Word dùng phông gần giống.'));
  D.reset.style.visibility = 'hidden';
  D.ok.addEventListener('click', async () => {
    D.ok.disabled = true; W.pdfMode = mode;
    try { const res = await convert(files, 'DOCX', (k, n) => { D.ok.textContent = n > 1 ? `Đang chuyển ${Math.min(n, Math.floor(k) + 1)}/${n}…` : 'Đang chuyển…'; st.textContent = `⏳ Đang đọc từng trang… ${Math.round(k / Math.max(1, n) * 100)}%`; }); D.close(); await deliver(res); }
    catch (e) { console.warn('[HaoHao Convert] pdf→docx', e); D.ok.disabled = false; D.ok.textContent = 'Chuyển sang Word'; st.textContent = '⚠️ ' + errText(e); }
    finally { W.pdfMode = null; }
  });
}

/* 📄 Excel → PDF: hộp chỉnh trước khi xuất (V1.95) – mặc định theo thiết lập in của file */
async function openXlsPdf(file) {
  toast('⏳ Đang đọc file Excel…', 4000);
  let m, book; try { ({ m, book } = await xlsBook(file)); } catch (e) { console.warn('[HaoHao Convert] xls', e); return toast('⚠️ ' + errText(e), 6000); }
  const tt = document.querySelector('.hhd-toast'); if (tt) tt.hidden = true;
  const live = book.sheets.map((sh, i) => ({ sh, i })).filter(q => m.hasData(q.sh));
  if (!live.length) return toast('⚠️ File Excel này không có dữ liệu');
  const D = dialog('Xuất PDF từ Excel', { applyText: 'Xuất PDF' });
  const def = () => ({ paper: 'file', orient: 'file', fit: 'file', pct: 100, margin: 'file', hc: 'file', area: 'file', titles: '', skip: new Set() });
  let o = def(), plan = [], cur = 0;
  const d0 = m.sheetDefaults(live[0].sh), fitName = { w1: 'vừa chiều ngang 1 trang', p1: 'vừa 1 trang', pct: d0.pct + '%' };
  const box = $e('div', 'hhd-stage'), cv = $e('canvas'); box.append(cv); box.style.minHeight = '260px';
  const nav = $e('div', 'hhd-row'); nav.style.justifyContent = 'center'; nav.style.marginTop = '8px';
  const prev = $e('button', 'hhd-btn', '‹'), next = $e('button', 'hhd-btn', '›'), lab = $e('span', '', ''); lab.style.cssText = 'min-width:170px;text-align:center;color:var(--hd-soft)';
  nav.append(prev, lab, next);
  const show = () => {
    if (!plan.length) { lab.textContent = 'Không có trang nào'; cv.width = 10; cv.height = 10; return; }
    cur = Math.max(0, Math.min(cur, plan.length - 1)); const p = plan[cur], mw = Math.min(600, innerWidth - 80), mh = Math.min(430, innerHeight * .5), r = Math.min(mw / p.L.pw, mh / p.L.ph);
    const c = m.renderPage(p.sh, p.L, p.pg, Math.min(2, r * (devicePixelRatio || 1))); cv.width = c.width; cv.height = c.height; cv.style.width = Math.round(p.L.pw * r) + 'px'; cv.style.height = Math.round(p.L.ph * r) + 'px'; cv.style.boxShadow = '0 2px 10px rgba(0,0,0,.18)';
    cv.getContext('2d').drawImage(c, 0, 0); lab.textContent = `Trang ${cur + 1}/${plan.length}${live.length > 1 ? ' · ' + p.name : ''}`; prev.disabled = cur === 0; next.disabled = cur >= plan.length - 1;
  };
  const rebuild = () => { plan = xlsPlan(m, book, o); show(); };
  prev.addEventListener('click', () => { cur--; show(); }); next.addEventListener('click', () => { cur++; show(); });
  const sel = (opts, v, on) => { const s = $e('select'); opts.forEach(([a, t]) => { const op = $e('option', '', t); op.value = a; s.append(op); }); s.value = v; s.addEventListener('change', () => on(s.value)); return s; };
  const paperS = sel([['file', `Theo file (${m.PAPER_NAMES[d0.paper] || 'A4'})`], ['9', 'A4'], ['8', 'A3'], ['11', 'A5'], ['1', 'Letter']], 'file', v => { o.paper = v; rebuild(); });
  const orB = segBtns([['file', `Theo file (${d0.orient === 'land' ? 'ngang' : 'dọc'})`], ['port', 'Dọc'], ['land', 'Ngang']], 'file', v => { o.orient = v; rebuild(); });
  const pctIn = $e('input'); pctIn.type = 'number'; pctIn.min = 10; pctIn.max = 400; pctIn.value = 100; pctIn.hidden = true; pctIn.addEventListener('change', () => { o.pct = Math.max(10, Math.min(400, +pctIn.value || 100)); rebuild(); });
  const fitS = sel([['file', `Theo file (${fitName[d0.fit] || '100%'})`], ['w1', 'Vừa chiều ngang 1 trang'], ['p1', 'Vừa gọn 1 trang'], ['pct', 'Tỉ lệ % tự nhập']], 'file', v => { o.fit = v; pctIn.hidden = v !== 'pct'; rebuild(); });
  const mgB = segBtns([['file', 'Theo file'], ['normal', 'Thường'], ['narrow', 'Hẹp'], ['wide', 'Rộng']], 'file', v => { o.margin = v; rebuild(); });
  const hcB = segBtns([['file', `Theo file (${d0.hc ? 'có' : 'không'})`], ['1', 'Có'], ['0', 'Không']], 'file', v => { o.hc = v; rebuild(); });
  const tIn = $e('input'); tIn.type = 'text'; tIn.placeholder = d0.titles ? `Theo file: ${d0.titles}` : 'vd 1:3'; tIn.style.cssText = 'width:120px;font:inherit;font-size:12.5px;padding:4px 7px;border:1px solid var(--hd-bd);border-radius:8px;background:var(--hd-card);color:var(--hd-ink)';
  tIn.addEventListener('keydown', e => e.stopPropagation()); tIn.addEventListener('change', () => { o.titles = /^\s*\d+\s*:\s*\d+\s*$/.test(tIn.value) ? tIn.value.replace(/\s/g, '') : ''; rebuild(); });
  D.body.append(box, nav);
  if (live.length > 1) {
    const w = $e('div', 'hhd-sw'); w.style.gap = '10px';
    live.forEach(q => { const lb = $e('label'); lb.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12.5px'; const cb = $e('input'); cb.type = 'checkbox'; cb.checked = true; cb.addEventListener('change', () => { cb.checked ? o.skip.delete(q.i) : o.skip.add(q.i); cur = 0; rebuild(); }); lb.append(cb, q.sh.name); w.append(lb); });
    D.body.append(row('Sheet', w));
  }
  D.body.append(row('Khổ giấy', paperS), row('Hướng giấy', orB), row('Co giãn', fitS, pctIn), row('Lề', mgB), row('Căn giữa ngang', hcB));
  if (live.some(q => q.sh.area)) D.body.append(row('Vùng in', segBtns([['file', 'Theo file'], ['all', 'Cả sheet']], 'file', v => { o.area = v; rebuild(); })));
  D.body.append(row('Dòng lặp mỗi trang', tIn), $e('div', 'hhd-note', 'Mặc định lấy đúng thiết lập in trong file Excel (vùng in, khổ giấy, vừa trang, lề…). Màu ô, khung kẻ, ô gộp, logo được giữ; biểu đồ và định dạng có điều kiện chưa vẽ được.'));
  D.reset.addEventListener('click', () => { o = def(); paperS.value = 'file'; orB.set('file'); fitS.value = 'file'; pctIn.hidden = true; mgB.set('file'); hcB.set('file'); tIn.value = ''; cur = 0; rebuild(); });
  D.ok.addEventListener('click', async () => {
    if (!plan.length) return toast('Chọn ít nhất 1 sheet');
    D.ok.disabled = true; D.ok.textContent = 'Đang xuất…';
    try { const blob = await xlsPdfBlob(m, plan, (k, n) => { D.ok.textContent = `Đang xuất ${k + 1}/${n}…`; }); D.close(); await deliver([{ blob, name: BASE(file.name) + '.pdf' }]); }
    catch (e) { D.ok.disabled = false; D.ok.textContent = 'Xuất PDF'; toast('⚠️ ' + errText(e), 6000); }
  });
  rebuild();
}

/* ───────────────────────── khởi động ───────────────────────── */
function pickFiles() {
  const i = $e('input'); i.type = 'file'; i.multiple = true; i.accept = 'image/*,.heic,.heif,.tif,.tiff,.avif,.pdf,.docx,.txt,.md,.csv,.xlsx,.xlsm,.xls,.ods';
  i.addEventListener('change', () => { if (i.files.length) openWheel(i.files, innerWidth / 2, innerHeight / 2, true); }); i.click();
}
function initPage() {
  document.getElementById('hhd-pick')?.addEventListener('click', pickFiles);
  const drop = document.getElementById('hhd-drop');
  drop?.addEventListener('click', e => { if (e.target === drop || e.target.closest('.dz-in')) pickFiles(); });
  drop?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFiles(); } });
  const lbl = document.getElementById('hhd-dir'), bPick = document.getElementById('hhd-dir-pick'), bRe = document.getElementById('hhd-dir-re'), bClr = document.getElementById('hhd-dir-clr');
  const upd = () => {
    if (!lbl) return;
    lbl.textContent = !dirH ? 'Thư mục Tải về (Downloads) của Chrome' : dirOk ? '📁 ' + dirH.name : `📁 ${dirH.name} – cần cho phép lại (tạm lưu vào Tải về)`;
    if (bRe) bRe.hidden = !dirH || dirOk; if (bClr) bClr.hidden = !dirH;
  };
  listeners.add(upd); upd();
  bPick?.addEventListener('click', pickDir); bRe?.addEventListener('click', regrantDir); bClr?.addEventListener('click', clearDir);
}
buildTray(); loadDir();
if (PAGE) initPage();
window.HHDoi = { open: (files, x, y) => openWheel(files, x, y, true), pick: pickFiles, convert, _t: { openPDF, pdfWord, openPdfWord, xlsBook, xlsPlan, xlsPdfBlob, openXlsPdf, convertXls, gopTach, makePDF, makeDOCX, makeZip, readExif, stripJpeg, decodeImage, encode, docxText, textPages } };
