// HaoHao V1 – HaoHao Convert: Excel → PDF "giống Excel in" (V1.95, 21/10/2026)
// Tự đọc file .xlsx: định dạng ô (nền, chữ, khung, căn lề), ô gộp, độ rộng cột / cao dòng, hình (logo),
// thiết lập in (vùng in, khổ giấy, dọc/ngang, co giãn vừa trang, lề, căn giữa, dòng tiêu đề lặp, ngắt trang).
// Số được định dạng bằng SSF của SheetJS (truyền vào qua init). Vẽ từng trang ra canvas.
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NSR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NSA = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NSX = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
let SSF = null;
export function init(X) { SSF = X && X.SSF; }

/* ── giải nén ── */
async function unzip(buf) {
  const u = new Uint8Array(buf), v = new DataView(buf); let e = u.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('File Excel bị hỏng');
  let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true), dec = new TextDecoder(), ents = new Map();
  for (let i = 0; i < n; i++) {
    const meth = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
    ents.set(dec.decode(u.subarray(p + 46, p + 46 + nl)), { meth, csz, lo }); p += 46 + nl + xl + cl;
  }
  const cache = new Map();
  const get = async name => {
    name = name.replace(/^\//, ''); if (cache.has(name)) return cache.get(name);
    const en = ents.get(name); if (!en) return null;
    const ds = en.lo + 30 + v.getUint16(en.lo + 26, true) + v.getUint16(en.lo + 28, true), raw = u.subarray(ds, ds + en.csz);
    const out = en.meth === 0 ? raw : new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    cache.set(name, out); return out;
  };
  return { get, has: n => ents.has(n.replace(/^\//, '')) };
}
const xml = async (z, n) => { const b = await z.get(n); return b ? new DOMParser().parseFromString(new TextDecoder().decode(b), 'application/xml') : null; };
const kids = (el, name) => el ? [...el.children].filter(c => c.localName === name) : [];
const kid = (el, name) => kids(el, name)[0] || null;
const resolve = (base, t) => { if (t.startsWith('/')) return t.slice(1); const parts = base.split('/'); parts.pop(); for (const s of t.split('/')) { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); } return parts.join('/'); };
async function rels(z, part) {
  const i = part.lastIndexOf('/'), rp = part.slice(0, i) + '/_rels/' + part.slice(i + 1) + '.rels', d = await xml(z, rp), m = {};
  if (d) for (const r of d.getElementsByTagName('Relationship')) m[r.getAttribute('Id')] = { target: resolve(part, r.getAttribute('Target')), type: r.getAttribute('Type') || '' };
  return m;
}
const colIdx = s => { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const ref = r => { const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(r); return m ? { c: colIdx(m[1]), r: +m[2] - 1 } : null; };
const range = s => { const [a, b] = s.split(':'); const A = ref(a), B = ref(b || a); return A && B ? { c0: Math.min(A.c, B.c), r0: Math.min(A.r, B.r), c1: Math.max(A.c, B.c), r1: Math.max(A.r, B.r) } : null; };

/* ── màu ── */
const IDX = ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF', '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99', '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696', '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333'];
function tintHex(hex, t) {
  if (!t) return hex; let r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  l = t < 0 ? l * (1 + t) : l * (1 - t) + t;
  const f = (p, q, x) => { if (x < 0) x += 1; if (x > 1) x -= 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < .5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
  if (s === 0) r = g = b = l; else { const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); }
  return [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function color(el, theme, dflt) {
  if (!el) return dflt;
  if (el.getAttribute('auto') === '1' || el.getAttribute('auto') === 'true') return dflt;
  let hex = null; const rgb = el.getAttribute('rgb'), th = el.getAttribute('theme'), ix = el.getAttribute('indexed');
  if (rgb) hex = rgb.slice(-6); else if (th != null) hex = theme[+th] || null; else if (ix != null) hex = +ix === 64 ? '000000' : +ix === 65 ? 'FFFFFF' : IDX[+ix] || null;
  if (!hex) return dflt; return '#' + tintHex(hex.toUpperCase(), parseFloat(el.getAttribute('tint') || '0'));
}

/* ── đọc sổ ── */
export async function parseXlsx(buf) {
  const z = await unzip(buf);
  const wbRels = await rels(z, 'xl/workbook.xml'), wb = await xml(z, 'xl/workbook.xml');
  if (!wb) throw new Error('Không đọc được file Excel');
  // chủ đề màu
  const theme = []; const thRel = Object.values(wbRels).find(r => /theme$/.test(r.type));
  const thd = thRel ? await xml(z, thRel.target) : null;
  if (thd) {
    const cs = thd.getElementsByTagNameNS(NSA, 'clrScheme')[0];
    if (cs) { const g = n => { const e = kid(cs, n); const c = e && e.firstElementChild; return c ? (c.getAttribute('lastClr') || c.getAttribute('val') || '000000') : '000000'; };
      ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].forEach(n => theme.push(g(n).toUpperCase())); }
  }
  if (!theme.length) theme.push('FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47');
  // chữ dùng chung
  const ss = []; const ssRel = Object.values(wbRels).find(r => /sharedStrings$/.test(r.type)); const ssd = ssRel ? await xml(z, ssRel.target) : null;
  if (ssd) for (const si of ssd.getElementsByTagNameNS(NS, 'si')) { let t = ''; for (const e of si.getElementsByTagNameNS(NS, 't')) { if (e.parentNode.localName === 'rPh') continue; t += e.textContent; } ss.push(t); }
  // định dạng
  const stRel = Object.values(wbRels).find(r => /styles$/.test(r.type)), st = stRel ? await xml(z, stRel.target) : null;
  const numFmts = {}, fonts = [], fills = [], borders = [], xfs = [];
  if (st) {
    for (const f of st.getElementsByTagNameNS(NS, 'numFmt')) numFmts[f.getAttribute('numFmtId')] = f.getAttribute('formatCode');
    for (const f of kids(kid(st.documentElement, 'fonts'), 'font')) {
      const a = n => kid(f, n), val = (n, d) => { const e = a(n); return e ? (e.getAttribute('val') ?? true) : d; };
      fonts.push({ b: !!a('b') && a('b').getAttribute('val') !== '0', i: !!a('i') && a('i').getAttribute('val') !== '0', u: !!a('u') && a('u').getAttribute('val') !== 'none', s: !!a('strike'),
        sz: parseFloat(val('sz', 11)) || 11, name: val('name', 'Calibri'), color: color(a('color'), theme, '#000000') });
    }
    for (const f of kids(kid(st.documentElement, 'fills'), 'fill')) {
      const p = kid(f, 'patternFill'); const t = p && p.getAttribute('patternType');
      fills.push(p && t && t !== 'none' && t !== 'gray125' ? color(kid(p, 'fgColor'), theme, t === 'solid' ? null : null) || color(kid(p, 'bgColor'), theme, null) : null);
    }
    for (const b of kids(kid(st.documentElement, 'borders'), 'border')) {
      const side = n => { const e = kid(b, n); const s = e && e.getAttribute('style'); return s ? { s, c: color(kid(e, 'color'), theme, '#000000') } : null; };
      borders.push({ l: side('left') || side('start'), r: side('right') || side('end'), t: side('top'), b: side('bottom') });
    }
    for (const x of kids(kid(st.documentElement, 'cellXfs'), 'xf')) {
      const al = kid(x, 'alignment');
      xfs.push({ nf: +(x.getAttribute('numFmtId') || 0), font: +(x.getAttribute('fontId') || 0), fill: +(x.getAttribute('fillId') || 0), bd: +(x.getAttribute('borderId') || 0),
        h: al && al.getAttribute('horizontal') || 'general', v: al && al.getAttribute('vertical') || 'bottom', wrap: !!al && (al.getAttribute('wrapText') === '1' || al.getAttribute('wrapText') === 'true'),
        ind: al ? +(al.getAttribute('indent') || 0) : 0, shrink: !!al && al.getAttribute('shrinkToFit') === '1' });
    }
  }
  if (!fonts.length) fonts.push({ sz: 11, name: 'Calibri', color: '#000000' });
  if (!xfs.length) xfs.push({ nf: 0, font: 0, fill: 0, bd: 0, h: 'general', v: 'bottom' });
  // tên định nghĩa: vùng in, dòng tiêu đề
  const sheetsEl = wb.getElementsByTagNameNS(NS, 'sheet'), defs = {};
  for (const d of wb.getElementsByTagNameNS(NS, 'definedName')) {
    const n = d.getAttribute('name'), ls = d.getAttribute('localSheetId'); if (ls == null) continue;
    (defs[ls] ||= {})[n] = d.textContent;
  }
  const sheets = [];
  for (let i = 0; i < sheetsEl.length; i++) {
    const se = sheetsEl[i], rid = se.getAttributeNS(NSR, 'id') || se.getAttribute('r:id'), rel = wbRels[rid]; if (!rel) continue;
    if (se.getAttribute('state') === 'hidden' || se.getAttribute('state') === 'veryHidden') { sheets.push({ name: se.getAttribute('name'), hidden: true }); continue; }
    const sh = await parseSheet(z, rel.target, { ss, xfs, fonts, fills, borders, numFmts, theme }, defs[i] || {});
    sh.name = se.getAttribute('name'); sheets.push(sh);
  }
  return { sheets, styles: { xfs, fonts, fills, borders, numFmts } };
}
const BUILTIN = { 0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??', 14: 'm/d/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss', 22: 'm/d/yyyy h:mm', 37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mmss.0', 48: '##0.0E+0', 49: '@' };
function fmtNum(v, id, numFmts) {
  const code = numFmts[id] || BUILTIN[id] || 'General';
  try { if (SSF) return SSF.format(code, v); } catch {}
  return Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-9 && v) ? v.toExponential(4) : String(+v.toFixed(10));
}
async function parseSheet(z, part, S, def) {
  const d = await xml(z, part), root = d.documentElement, R = await rels(z, part);
  const fmtPr = kid(root, 'sheetFormatPr'), defRowH = fmtPr && fmtPr.getAttribute('defaultRowHeight') ? parseFloat(fmtPr.getAttribute('defaultRowHeight')) : 15;
  const wPx = w => Math.trunc(((256 * w + Math.trunc(128 / 7)) / 256) * 7);
  const defColPx = fmtPr && fmtPr.getAttribute('defaultColWidth') ? wPx(parseFloat(fmtPr.getAttribute('defaultColWidth'))) : Math.ceil(((fmtPr && +fmtPr.getAttribute('baseColWidth')) || 8) * 7 + 5) + 3;
  const cols = []; // [ {w (pt), hidden} ] theo chỉ số
  for (const c of kids(kid(root, 'cols'), 'col')) {
    const a = +c.getAttribute('min') - 1, b = Math.min(+c.getAttribute('max') - 1, 16383), w = c.getAttribute('width') ? wPx(parseFloat(c.getAttribute('width'))) * .75 : defColPx * .75, hid = c.getAttribute('hidden') === '1' || c.getAttribute('hidden') === 'true';
    for (let k = a; k <= Math.min(b, a + 2000); k++) cols[k] = { w, hid };
  }
  const rows = [], cells = new Map(); let maxR = -1, maxC = -1;
  const sd = kid(root, 'sheetData');
  for (const r of kids(sd, 'row')) {
    const ri = +r.getAttribute('r') - 1; const ro = { ht: r.getAttribute('ht') ? parseFloat(r.getAttribute('ht')) : null, hid: r.getAttribute('hidden') === '1' || r.getAttribute('hidden') === 'true', s: r.getAttribute('s') != null && (r.getAttribute('customFormat') === '1') ? +r.getAttribute('s') : null };
    rows[ri] = ro;
    let ci = -1;
    for (const c of kids(r, 'c')) {
      const rf = c.getAttribute('r'); const p = rf ? ref(rf) : { r: ri, c: ci + 1 }; ci = p.c;
      const t = c.getAttribute('t') || 'n', s = +(c.getAttribute('s') || 0), ve = kid(c, 'v'), raw = ve ? ve.textContent : null;
      let txt = '', num = null;
      if (t === 's') txt = raw != null ? (S.ss[+raw] ?? '') : '';
      else if (t === 'inlineStr') { const is = kid(c, 'is'); txt = is ? [...is.getElementsByTagNameNS(NS, 't')].map(e => e.textContent).join('') : ''; }
      else if (t === 'str') txt = raw ?? '';
      else if (t === 'b') txt = raw === '1' ? 'TRUE' : raw != null ? 'FALSE' : '';
      else if (t === 'e') txt = raw ?? '';
      else if (t === 'd') txt = raw ?? '';
      else if (raw != null && raw !== '') { num = parseFloat(raw); const xf = S.xfs[s] || S.xfs[0]; txt = isNaN(num) ? raw : fmtNum(num, xf.nf, S.numFmts); }
      if (txt === '' && !s) continue;
      cells.set(ri * 16384 + p.c, { t: txt, n: num, s });
      if (txt !== '' || (S.xfs[s] && (S.xfs[s].fill || S.xfs[s].bd))) { if (ri > maxR) maxR = ri; if (p.c > maxC) maxC = p.c; }
    }
  }
  const merges = kids(kid(root, 'mergeCells'), 'mergeCell').map(m => range(m.getAttribute('ref'))).filter(Boolean);
  merges.forEach(m => { maxR = Math.max(maxR, m.r1); maxC = Math.max(maxC, m.c1); });
  // in ấn
  const ps = kid(root, 'pageSetup'), pm = kid(root, 'pageMargins'), po = kid(root, 'printOptions'), spr = kid(root, 'sheetPr'), psp = spr && kid(spr, 'pageSetUpPr');
  const fit = !!psp && (psp.getAttribute('fitToPage') === '1' || psp.getAttribute('fitToPage') === 'true');
  const g = (e, n, dflt) => e && e.getAttribute(n) != null ? e.getAttribute(n) : dflt;
  const setup = {
    paper: +g(ps, 'paperSize', 9), orient: g(ps, 'orientation', 'default') === 'landscape' ? 'land' : 'port', scale: +g(ps, 'scale', 100),
    fit, fitW: +g(ps, 'fitToWidth', 1), fitH: +g(ps, 'fitToHeight', 1),
    m: { l: +g(pm, 'left', .7) * 72, r: +g(pm, 'right', .7) * 72, t: +g(pm, 'top', .75) * 72, b: +g(pm, 'bottom', .75) * 72 },
    hc: !!po && g(po, 'horizontalCentered', '0') !== '0' && g(po, 'horizontalCentered', 'false') !== 'false', grid: !!po && (g(po, 'gridLines', '0') === '1' || g(po, 'gridLines', '') === 'true')
  };
  const strip = s => s.replace(/^.*!/, '').replace(/\$/g, '');
  let area = null, titles = null;
  const pa = def['_xlnm.Print_Area']; if (pa) area = range(strip(pa.split(',')[0]));
  const pt = def['_xlnm.Print_Titles']; if (pt) for (const part of pt.split(',')) { const m = /^(\d+):(\d+)$/.exec(strip(part)); if (m) titles = { r0: +m[1] - 1, r1: +m[2] - 1 }; }
  const rowBreaks = new Set(kids(kid(root, 'rowBreaks'), 'brk').map(b => +b.getAttribute('id')));
  // hình (logo)
  const images = [];
  const dr = kid(root, 'drawing'), drRel = dr && R[dr.getAttributeNS(NSR, 'id') || dr.getAttribute('r:id')];
  if (drRel) {
    const dd = await xml(z, drRel.target), DR = await rels(z, drRel.target);
    if (dd) for (const an of [...dd.documentElement.children]) {
      const blip = an.getElementsByTagNameNS(NSA, 'blip')[0]; if (!blip) continue;
      const emb = blip.getAttributeNS(NSR, 'embed') || blip.getAttribute('r:embed'), mr = DR[emb]; if (!mr) continue;
      const pos = n => { const e = kid(an, n); if (!e) return null; const v = k => +(kid(e, k) ? kid(e, k).textContent : 0); return { c: v('col'), co: v('colOff') / 12700, r: v('row'), ro: v('rowOff') / 12700 }; };
      const ext = kid(an, 'ext') || (an.getElementsByTagNameNS(NSA, 'ext')[0]);
      images.push({ from: pos('from'), to: an.localName === 'twoCellAnchor' ? pos('to') : null, abs: an.localName === 'absoluteAnchor' ? kid(an, 'pos') : null,
        cx: ext ? +ext.getAttribute('cx') / 12700 : 0, cy: ext ? +ext.getAttribute('cy') / 12700 : 0, path: mr.target });
    }
    for (const im of images) { const b = await z.get(im.path); if (b) { try { im.bmp = await createImageBitmap(new Blob([b])); } catch {} } }
    images.forEach(im => { if (im.from) { maxR = Math.max(maxR, im.to ? im.to.r : im.from.r); maxC = Math.max(maxC, im.to ? im.to.c : im.from.c); } });
  }
  return { cells, rows, cols, merges, defRowH, defColW: defColPx * .75, maxR, maxC, setup, area, titles, rowBreaks, images: images.filter(i => i.bmp), S };
}

/* ── chia trang ── */
const PAPER = { 9: [595.28, 841.89], 8: [841.89, 1190.55], 11: [419.53, 595.28], 1: [612, 792], 5: [612, 1008] };
export const PAPER_NAMES = { 9: 'A4', 8: 'A3', 11: 'A5', 1: 'Letter' };
function rowH(sh, r) {
  const ro = sh.rows[r]; if (ro && ro.hid) return 0;
  if (ro && ro.ht != null) return ro.ht;
  // không ghi chiều cao → ước lượng theo cỡ chữ lớn nhất trong dòng
  let mx = 0; for (let c = 0; c <= sh.maxC; c++) { const ce = sh.cells.get(r * 16384 + c); if (ce && ce.t !== '') { const xf = sh.S.xfs[ce.s] || sh.S.xfs[0], f = sh.S.fonts[xf.font] || sh.S.fonts[0]; mx = Math.max(mx, f.sz); } }
  return Math.max(sh.defRowH, mx * 1.32);
}
const colW = (sh, c) => { const co = sh.cols[c]; return co ? (co.hid ? 0 : co.w) : sh.defColW; };
export function sheetDefaults(sh) { const s = sh.setup; return { paper: PAPER[s.paper] ? s.paper : 9, orient: s.orient, fit: s.fit ? (s.fitH === 0 ? 'w1' : s.fitW === 1 && s.fitH === 1 ? 'p1' : 'w1') : 'pct', pct: s.fit ? 100 : s.scale || 100, margin: 'file', hc: s.hc, area: 'file', titles: sh.titles ? `${sh.titles.r0 + 1}:${sh.titles.r1 + 1}` : '' }; }
export function hasData(sh) { return !sh.hidden && sh.maxR >= 0; }
export function layout(sh, o) {
  let [pw, ph] = PAPER[o.paper] || PAPER[9]; if (o.orient === 'land') [pw, ph] = [ph, pw];
  const M = o.margin === 'narrow' ? { l: 18, r: 18, t: 54, b: 54 } : o.margin === 'normal' ? { l: 50.4, r: 50.4, t: 54, b: 54 } : o.margin === 'wide' ? { l: 72, r: 72, t: 72, b: 72 } : sh.setup.m;
  const A = (o.area !== 'all' && sh.area) || { r0: 0, c0: 0, r1: Math.max(0, sh.maxR), c1: Math.max(0, sh.maxC) };
  const T = (() => { const m = /^(\d+)\s*:\s*(\d+)$/.exec(o.titles || ''); return m ? { r0: +m[1] - 1, r1: +m[2] - 1 } : null; })();
  const colList = [], rowList = []; for (let c = A.c0; c <= A.c1; c++) if (colW(sh, c) > 0) colList.push(c); for (let r = A.r0; r <= A.r1; r++) if (rowH(sh, r) > 0) rowList.push(r);
  const totW = colList.reduce((a, c) => a + colW(sh, c), 0), totH = rowList.reduce((a, r) => a + rowH(sh, r), 0), cw = pw - M.l - M.r, chh = ph - M.t - M.b;
  let s = 1;
  if (o.fit === 'w1') s = Math.min(1, cw / Math.max(1, totW)); else if (o.fit === 'p1') s = Math.min(1, cw / Math.max(1, totW), chh / Math.max(1, totH)); else s = Math.max(.1, Math.min(4, (o.pct || 100) / 100));
  // dải cột
  const bands = []; let cur = [], w = 0;
  for (const c of colList) { const x = colW(sh, c) * s; if (cur.length && w + x > cw + .5) { bands.push(cur); cur = []; w = 0; } cur.push(c); w += x; } if (cur.length) bands.push(cur);
  // trang dòng
  const titleRows = T ? rowList.filter(r => r >= T.r0 && r <= T.r1) : [], titleH = titleRows.reduce((a, r) => a + rowH(sh, r), 0) * s;
  const segs = []; let seg = [], h = 0;
  for (const r of rowList) {   // trang sau trang đầu chừa chỗ cho dòng tiêu đề lặp lại; ngắt trang tay (rowBreaks) được giữ
    const x = rowH(sh, r) * s, cap = segs.length ? chh - titleH : chh;
    if (seg.length && (h + x > cap + .5 || sh.rowBreaks.has(r))) { segs.push(seg); seg = []; h = 0; }
    seg.push(r); h += x;
  }
  if (seg.length) segs.push(seg);
  const pages = [];
  for (const b of bands) segs.forEach((sg, i) => { const rows = i > 0 && titleRows.length && !titleRows.includes(sg[0]) ? [...titleRows, ...sg] : sg; pages.push({ cols: b, rows, mainStart: sg[0], nTitle: rows.length - sg.length }); });
  return { pw, ph, M, s, pages, hc: o.hc };
}

/* ── vẽ 1 trang ── */
const LW = { hair: .35, thin: .6, medium: 1.25, thick: 2, dashed: .6, dotted: .6, double: .5, mediumDashed: 1.25, dashDot: .6, mediumDashDot: 1.25, dashDotDot: .6, mediumDashDotDot: 1.25, slantDashDot: 1.25 };
const DASH = { dashed: [3, 1.5], mediumDashed: [4, 2], dotted: [.7, 1.2], hair: [], dashDot: [3, 1.5, .7, 1.5], mediumDashDot: [4, 2, 1, 2], dashDotDot: [3, 1.5, .7, 1.5, .7, 1.5], mediumDashDotDot: [4, 2, 1, 2, 1, 2], slantDashDot: [4, 1.5, 1, 1.5] };
export function renderPage(sh, L, pg, R) {
  const c = document.createElement('canvas'); c.width = Math.round(L.pw * R); c.height = Math.round(L.ph * R);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  const S = sh.S, cols = pg.cols, rows = pg.rows, s = L.s;
  const xs = [0]; cols.forEach(cc => xs.push(xs[xs.length - 1] + colW(sh, cc))); const ys = [0]; rows.forEach(rr => ys.push(ys[ys.length - 1] + rowH(sh, rr)));
  const W = xs[xs.length - 1], H = ys[ys.length - 1];
  const ox = L.M.l + (L.hc ? Math.max(0, (L.pw - L.M.l - L.M.r - W * s) / 2) : 0), oy = L.M.t;
  x.save(); x.scale(R, R); x.translate(ox, oy); x.scale(s, s);
  x.beginPath(); x.rect(0, 0, W, H); x.clip();
  const ci = new Map(cols.map((cc, i) => [cc, i])), ri = new Map(rows.map((rr, i) => [rr, i]));
  const xf = s0 => S.xfs[s0] || S.xfs[0];
  const mergeAt = (r, cc) => sh.merges.find(m => r >= m.r0 && r <= m.r1 && cc >= m.c0 && cc <= m.c1);
  // khung chữ nhật của ô (gộp → cả vùng trong trang)
  const rect = (r, cc, m) => {
    if (!m) { const i = ci.get(cc), j = ri.get(r); return [xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j]]; }
    let a = Infinity, b = -Infinity, t = Infinity, u = -Infinity;
    for (let k = m.c0; k <= m.c1; k++) if (ci.has(k)) { const i = ci.get(k); a = Math.min(a, xs[i]); b = Math.max(b, xs[i + 1]); }
    for (let k = m.r0; k <= m.r1; k++) if (ri.has(k)) { const j = ri.get(k); t = Math.min(t, ys[j]); u = Math.max(u, ys[j + 1]); }
    return isFinite(a) && isFinite(t) ? [a, t, b - a, u - t] : null;
  };
  const getCell = (r, cc) => sh.cells.get(r * 16384 + cc);
  const styleOf = (r, cc) => { const ce = getCell(r, cc); if (ce) return ce.s; const ro = sh.rows[r]; return ro && ro.s != null ? ro.s : 0; };
  // 1) nền ô
  const doneM = new Set();
  rows.forEach(r => cols.forEach(cc => {
    const m = mergeAt(r, cc); let st;
    if (m) { if (doneM.has(m)) return; doneM.add(m); st = styleOf(m.r0, m.c0); } else st = styleOf(r, cc);
    const fill = S.fills[xf(st).fill]; if (!fill) return; const q = rect(r, cc, m); if (!q) return;
    x.fillStyle = fill; x.fillRect(q[0], q[1], q[2] + .3, q[3] + .3);
  }));
  if (sh.setup.grid) { x.strokeStyle = '#C8C8C8'; x.lineWidth = .4; x.beginPath(); xs.forEach(v => { x.moveTo(v, 0); x.lineTo(v, H); }); ys.forEach(v => { x.moveTo(0, v); x.lineTo(W, v); }); x.stroke(); }
  // 2) chữ
  const pad = 2.2, empty = (r, cc) => { const ce = getCell(r, cc); return !(ce && ce.t !== '') && !mergeAt(r, cc); };
  doneM.clear();
  rows.forEach(r => cols.forEach(cc => {
    const m = mergeAt(r, cc);
    if (m) { if (doneM.has(m)) return; doneM.add(m); }
    const ce = m ? getCell(m.r0, m.c0) : getCell(r, cc); if (!ce || ce.t === '') return;
    let q = rect(r, cc, m); if (!q) return;
    const X = xf(ce.s), f = S.fonts[X.font] || S.fonts[0], sz = f.sz;
    x.font = `${f.i ? 'italic ' : ''}${f.b ? 'bold ' : ''}${sz}px "${f.name}", Calibri, Arial, "Segoe UI", sans-serif`;
    let hA = X.h; const isNum = ce.n != null && !isNaN(ce.n);
    if (hA === 'general') hA = isNum ? 'right' : 'left'; if (hA === 'centerContinuous' || hA === 'distributed') hA = 'center'; if (hA === 'fill' || hA === 'justify') hA = 'left';
    const lines = [];
    if (X.wrap) {
      const maxW = q[2] - pad * 2;
      for (const para of ce.t.split(/\r?\n/)) { let line = ''; for (const wd of para.split(/(\s+)/)) { const t = line + wd; if (line && x.measureText(t).width > maxW) { lines.push(line.trimEnd()); line = wd.trimStart(); } else line = t; } lines.push(line); }
    } else lines.push(ce.t.replace(/\r?\n/g, ' '));
    // tràn sang ô trống bên cạnh (chữ không xuống dòng, không gộp)
    let clipX = q[0], clipW = q[2];
    if (!X.wrap && !m && !isNum) {
      const tw = x.measureText(lines[0]).width + pad * 2 + X.ind * 9;
      if (tw > q[2]) {
        const i0 = ci.get(cc);
        if (hA === 'left') { let i = i0 + 1; while (i < cols.length && clipW < tw && empty(r, cols[i])) { clipW += xs[i + 1] - xs[i]; i++; } }
        else if (hA === 'right') { let i = i0 - 1; while (i >= 0 && clipW < tw && empty(r, cols[i])) { clipX -= xs[i + 1] - xs[i]; clipW += xs[i + 1] - xs[i]; i--; } }
        else if (hA === 'center') { let a = i0 - 1, b = i0 + 1; while (clipW < tw && ((a >= 0 && empty(r, cols[a])) || (b < cols.length && empty(r, cols[b])))) { if (a >= 0 && empty(r, cols[a])) { clipX -= xs[a + 1] - xs[a]; clipW += xs[a + 1] - xs[a]; a--; } if (b < cols.length && empty(r, cols[b])) { clipW += xs[b + 1] - xs[b]; b++; } } }
      }
    }
    if (isNum && !X.wrap) { const tw = x.measureText(lines[0]).width + pad * 2; if (tw > q[2] + .5 && !m) lines[0] = '#'.repeat(Math.max(1, Math.floor((q[2] - pad * 2) / Math.max(1, x.measureText('#').width)))); }
    const lh = sz * 1.22, blockH = lh * lines.length;
    let y0 = X.v === 'top' ? q[1] + 1.5 : X.v === 'center' || X.v === 'distributed' || X.v === 'justify' ? q[1] + (q[3] - blockH) / 2 : q[1] + q[3] - blockH - 1.2;
    x.save(); x.beginPath(); x.rect(clipX, q[1], clipW, q[3]); x.clip(); x.fillStyle = f.color || '#000'; x.textBaseline = 'alphabetic';
    lines.forEach((ln, k) => {
      const tw = x.measureText(ln).width, base = y0 + lh * k + sz * .98;
      let tx = hA === 'left' ? q[0] + pad + X.ind * 9 : hA === 'right' ? q[0] + q[2] - pad - tw - X.ind * 9 : q[0] + (q[2] - tw) / 2;
      x.fillText(ln, tx, base);
      if (f.u) { x.fillRect(tx, base + sz * .12, tw, Math.max(.4, sz / 16)); }
      if (f.s) { x.fillRect(tx, base - sz * .32, tw, Math.max(.4, sz / 16)); }
    });
    x.restore();
  }));
  // 3) khung kẻ (bỏ cạnh nằm trong vùng gộp)
  const line = (side, x1, y1, x2, y2) => {
    if (!side) return; const lw = LW[side.s] || .6; x.save(); x.strokeStyle = side.c || '#000'; x.lineWidth = lw; x.setLineDash(DASH[side.s] || []);
    if (side.s === 'double') { const dx = y1 === y2 ? 0 : .7, dy = y1 === y2 ? .7 : 0; x.beginPath(); x.moveTo(x1 - dx, y1 - dy); x.lineTo(x2 - dx, y2 - dy); x.moveTo(x1 + dx, y1 + dy); x.lineTo(x2 + dx, y2 + dy); x.stroke(); }
    else { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); }
    x.restore();
  };
  rows.forEach((r, j) => cols.forEach((cc, i) => {
    const b = S.borders[xf(styleOf(r, cc)).bd]; if (!b || !(b.l || b.r || b.t || b.b)) return;
    const m = mergeAt(r, cc), x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1];
    if (!m || cc === m.c0) line(b.l, x0, y0, x0, y1);
    if (!m || cc === m.c1) line(b.r, x1, y0, x1, y1);
    if (!m || r === m.r0) line(b.t, x0, y0, x1, y0);
    if (!m || r === m.r1) line(b.b, x0, y1, x1, y1);
  }));
  // 4) hình – theo vị trí trên sheet, chỉ vùng dòng chính của trang
  if (sh.images.length) {
    const sheetX = cc => { let v = 0; for (let k = 0; k < cc; k++) v += colW(sh, k); return v; }, sheetY = rr => { let v = 0; for (let k = 0; k < rr; k++) v += rowH(sh, k); return v; };
    const px0 = sheetX(cols[0]), titleH = ys[pg.nTitle], py0 = sheetY(pg.mainStart) - titleH;
    x.save(); x.beginPath(); x.rect(0, titleH, W, H - titleH); if (pg.nTitle === 0) { x.rect(0, 0, W, H); } x.clip();
    for (const im of sh.images) {
      let ax, ay, aw, ah;
      if (im.from) { ax = sheetX(im.from.c) + im.from.co; ay = sheetY(im.from.r) + im.from.ro; if (im.to) { aw = sheetX(im.to.c) + im.to.co - ax; ah = sheetY(im.to.r) + im.to.ro - ay; } else { aw = im.cx; ah = im.cy; } }
      else continue;
      if (!aw || !ah) { aw = im.bmp.width * .75; ah = im.bmp.height * .75; }
      x.drawImage(im.bmp, ax - px0, ay - py0, aw, ah);
    }
    x.restore();
  }
  x.restore();
  return c;
}
