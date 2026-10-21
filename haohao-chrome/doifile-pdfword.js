// HaoHao V1 – HaoHao Convert: PDF → Word giữ cấu trúc (V1.96, 21/10/2026)
// 2 kiểu: 'flow' = dựng lại tài liệu dễ sửa (đoạn văn, căn lề, cỡ/đậm/nghiêng/màu chữ, bảng Word thật từ đường kẻ,
// hình đặt đúng chỗ); 'exact' = giữ nguyên bố cục (nền hình/đường kẻ của trang + từng dòng chữ đặt đúng toạ độ).
// Đọc PDF bằng pdf.js (truyền vào), ghi DOCX bằng makeZip (truyền vào).
let P = null, ZIP = null;
export function init(pdfjs, makeZip) { P = pdfjs; ZIP = makeZip; }

const EMU = 12700, TW = 20;   // 1pt = 12700 EMU = 20 twip
const xesc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const hex2 = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const rgbHex = a => typeof a[0] === 'string' ? a[0].replace('#', '').toUpperCase() : (hex2(a[0]) + hex2(a[1]) + hex2(a[2])).toUpperCase();

/* ── tên phông PDF → phông Word ── */
function fontFamily(raw) {
  let n = String(raw || '').replace(/^[A-Z]{6}\+/, '').split(/[-,]/)[0].replace(/(PSMT|PS|MT|Std|LT)$/i, '');
  const map = { timesnewroman: 'Times New Roman', times: 'Times New Roman', 'times-roman': 'Times New Roman', arial: 'Arial', helvetica: 'Arial', arialnarrow: 'Arial Narrow', calibri: 'Calibri', cambria: 'Cambria', tahoma: 'Tahoma', verdana: 'Verdana', courier: 'Courier New', couriernew: 'Courier New', segoeui: 'Segoe UI', georgia: 'Georgia', garamond: 'Garamond', symbol: 'Symbol', wingdings: 'Wingdings', liberationserif: 'Times New Roman', liberationsans: 'Arial', dejavusans: 'Arial', dejavuserif: 'Times New Roman' };
  const k = n.toLowerCase().replace(/\s+/g, ''); if (map[k]) return map[k];
  for (const [a, b] of Object.entries(map)) if (k.startsWith(a)) return b;
  return n.replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'Times New Roman';
}

/* ── đọc 1 trang: chữ, đường kẻ, ô tô màu, hình ── */
async function readPage(doc, n, R) {
  const page = await doc.getPage(n), vp = page.getViewport({ scale: 1 }), W = vp.width, H = vp.height;
  // vẽ 2 lần: đủ (để lấy màu chữ) và không chữ (nền: hình, đường kẻ, ô màu)
  const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(W * R); c.height = Math.ceil(H * R); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return [c, x]; };
  const [full, fx] = mk(); await page.render({ canvasContext: fx, canvas: full, viewport: page.getViewport({ scale: R }) }).promise;
  const [bare, bx] = mk(); bx.fillText = () => {}; bx.strokeText = () => {};
  await page.render({ canvasContext: bx, canvas: bare, viewport: page.getViewport({ scale: R }) }).promise;
  delete bx.fillText; delete bx.strokeText;
  const fd = fx.getImageData(0, 0, full.width, full.height).data, bd = bx.getImageData(0, 0, bare.width, bare.height).data;
  // chữ
  const tc = await page.getTextContent({ includeMarkedContent: false }), runs = [];
  for (const it of tc.items) {
    let str0 = (it.str || '').replace(/[\u0000-\u001F\u007F]/g, '');
    if (/^[^\x00-\x7F],$/u.test(str0) && it.width < Math.hypot(it.transform[2], it.transform[3]) * .8) str0 = str0[0];   // PDF gắn nhầm dấu phẩy sau chữ có dấu đứng riêng
    if (!str0.trim()) continue;   // mảnh chỉ có dấu cách: bỏ (khoảng cách tính lại theo vị trí)
    const t = mul(vp.transform, it.transform), size = Math.hypot(t[2], t[3]) || Math.hypot(t[0], t[1]); if (size < 1) continue;
    const rot = Math.abs(t[1]) > size * .2 || Math.abs(t[2]) > size * .2 && Math.abs(t[0]) < size * .2;
    const x = t[4], base = t[5], w = it.width * (Math.hypot(t[0], t[1]) / Math.max(1e-6, Math.hypot(it.transform[0], it.transform[1])) || 1);
    let fo = null; try { if (page.commonObjs.has(it.fontName)) fo = page.commonObjs.get(it.fontName); } catch {}
    const st = tc.styles[it.fontName] || {}, fname = (fo && fo.name) || st.fontFamily || '';
    const bold = !!(fo && (fo.bold || fo.black)) || /bold|black|heavy|semibold|demi/i.test(fname), italic = !!(fo && fo.italic) || /italic|oblique/i.test(fname);
    runs.push({ str: str0, x, base, w: Math.max(0, w), size, top: base - size * .82, bottom: base + size * .22, bold, italic, family: fontFamily(fname), loaded: fo && fo.loadedName, rot, color: '000000' });
  }
  // màu chữ = điểm ảnh khác nhau giữa bản đủ và bản không chữ
  for (const r of runs) {
    const x0 = Math.max(0, Math.floor(r.x * R)), x1 = Math.min(full.width - 1, Math.ceil((r.x + r.w) * R)), y0 = Math.max(0, Math.floor(r.top * R)), y1 = Math.min(full.height - 1, Math.ceil(r.base * R));
    const px = []; const step = Math.max(1, Math.floor((x1 - x0) * (y1 - y0) / 5000));
    for (let y = y0, k = 0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++, k++) {
      if (k % step) continue; const i = (y * full.width + xx) * 4, d = Math.abs(fd[i] - bd[i]) + Math.abs(fd[i + 1] - bd[i + 1]) + Math.abs(fd[i + 2] - bd[i + 2]);
      if (d > 120) px.push([d, fd[i], fd[i + 1], fd[i + 2]]);
    }
    if (px.length) {   // chỉ lấy 25% điểm khác nhiều nhất (lõi nét chữ), bỏ viền mờ khử răng cưa
      px.sort((a, b) => b[0] - a[0]); const top = px.slice(0, Math.max(1, Math.ceil(px.length * .25))), c = [1, 2, 3].map(j => top.reduce((a, q) => a + q[j], 0) / top.length);
      r.color = Math.max(...c) - Math.min(...c) < 45 && Math.max(...c) < 150 ? '000000' : rgbHex(c);
    }
  }
  // đường kẻ / ô màu / hình từ danh sách lệnh vẽ
  const ops = await page.getOperatorList(), O = P.OPS, segs = [], fills = [], imgs = [];
  let ctm = vp.transform.slice(), stack = [], lw = 1, stroke = '000000', fill = '000000', path = [];
  const toHex = a => { try { return rgbHex(a); } catch { return '000000'; } };
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], a = ops.argsArray[i];
    switch (fn) {
      case O.save: stack.push([ctm, lw, stroke, fill]); break;
      case O.restore: if (stack.length) [ctm, lw, stroke, fill] = stack.pop(); break;
      case O.transform: ctm = mul(ctm, a); break;
      case O.paintFormXObjectBegin: stack.push([ctm, lw, stroke, fill]); if (a && a[0]) ctm = mul(ctm, a[0]); break;
      case O.paintFormXObjectEnd: if (stack.length) [ctm, lw, stroke, fill] = stack.pop(); break;
      case O.setLineWidth: lw = a[0]; break;
      case O.setStrokeRGBColor: stroke = toHex(a); break;
      case O.setFillRGBColor: fill = toHex(a); break;
      case O.setStrokeGray: stroke = toHex([a[0] * 255, a[0] * 255, a[0] * 255]); break;
      case O.setFillGray: fill = toHex([a[0] * 255, a[0] * 255, a[0] * 255]); break;
      case O.constructPath: {
        const pops = a[0], c = a[1]; let k = 0, cur = null, start = null;
        for (const op of pops) {
          if (op === O.rectangle) { const [x, y, w, h] = [c[k], c[k + 1], c[k + 2], c[k + 3]]; k += 4; const p = [ap(ctm, x, y), ap(ctm, x + w, y), ap(ctm, x + w, y + h), ap(ctm, x, y + h)]; path.push({ rect: p }); cur = null; }
          else if (op === O.moveTo) { cur = start = ap(ctm, c[k], c[k + 1]); k += 2; }
          else if (op === O.lineTo) { const p = ap(ctm, c[k], c[k + 1]); k += 2; if (cur) path.push({ line: [cur, p] }); cur = p; }
          else if (op === O.curveTo) { k += 6; cur = ap(ctm, c[k - 2], c[k - 1]); path.push({ curve: true }); }
          else if (op === O.curveTo2 || op === O.curveTo3) { k += 4; cur = ap(ctm, c[k - 2], c[k - 1]); path.push({ curve: true }); }
          else if (op === O.closePath) { if (cur && start) path.push({ line: [cur, start] }); cur = start; }
        }
        break;
      }
      case O.stroke: case O.closeStroke: case O.fillStroke: case O.eoFillStroke: case O.closeFillStroke: case O.closeEOFillStroke:
      case O.fill: case O.eoFill: {
        const doStroke = fn !== O.fill && fn !== O.eoFill, doFill = fn !== O.stroke && fn !== O.closeStroke;
        const sc = Math.hypot(ctm[0], ctm[1]) || 1, w = Math.max(.1, lw * sc);
        const curvy = path.some(p => p.curve);
        for (const p of path) {
          if (p.rect) {
            const xs = p.rect.map(q => q[0]), ys = p.rect.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            if (doFill && !curvy) { if (x1 - x0 < 2.2 || y1 - y0 < 2.2) segs.push(x1 - x0 >= y1 - y0 ? { h: 1, y: (y0 + y1) / 2, a: x0, b: x1, w: Math.max(.4, y1 - y0), c: fill } : { h: 0, x: (x0 + x1) / 2, a: y0, b: y1, w: Math.max(.4, x1 - x0), c: fill }); else if (fill !== 'FFFFFF') fills.push({ x0, y0, x1, y1, c: fill }); }
            if (doStroke) { segs.push({ h: 1, y: y0, a: x0, b: x1, w, c: stroke }, { h: 1, y: y1, a: x0, b: x1, w, c: stroke }, { h: 0, x: x0, a: y0, b: y1, w, c: stroke }, { h: 0, x: x1, a: y0, b: y1, w, c: stroke }); }
          } else if (p.line && doStroke && !curvy) {
            const [[ax, ay], [bx2, by]] = p.line;
            if (Math.abs(ay - by) < .8) segs.push({ h: 1, y: (ay + by) / 2, a: Math.min(ax, bx2), b: Math.max(ax, bx2), w, c: stroke });
            else if (Math.abs(ax - bx2) < .8) segs.push({ h: 0, x: (ax + bx2) / 2, a: Math.min(ay, by), b: Math.max(ay, by), w, c: stroke });
          }
        }
        path = []; break;
      }
      case O.endPath: path = []; break;
      case O.paintImageXObject: case O.paintInlineImageXObject: case O.paintImageMaskXObject: case O.paintImageXObjectRepeat: case O.paintInlineImageXObjectGroup: {
        const q = [ap(ctm, 0, 0), ap(ctm, 1, 0), ap(ctm, 0, 1), ap(ctm, 1, 1)], xs = q.map(v => v[0]), ys = q.map(v => v[1]);
        const b = { x0: Math.max(0, Math.min(...xs)), y0: Math.max(0, Math.min(...ys)), x1: Math.min(W, Math.max(...xs)), y1: Math.min(H, Math.max(...ys)) };
        if (b.x1 - b.x0 > 4 && b.y1 - b.y0 > 4) imgs.push(b); break;
      }
    }
  }
  // hình: cắt từ bản không chữ (bỏ hình nền phủ gần kín trang – PDF scan)
  const images = [];
  for (const b of imgs) {
    if ((b.x1 - b.x0) * (b.y1 - b.y0) > W * H * .7) continue;
    const c = document.createElement('canvas'); c.width = Math.round((b.x1 - b.x0) * R); c.height = Math.round((b.y1 - b.y0) * R);
    c.getContext('2d').drawImage(bare, b.x0 * R, b.y0 * R, c.width, c.height, 0, 0, c.width, c.height);
    images.push({ ...b, blob: await new Promise(ok => c.toBlob(ok, 'image/png')) });
  }
  page.cleanup();
  return { W, H, runs, segs, fills, images, bare, scanned: !runs.length && imgs.some(b => (b.x1 - b.x0) * (b.y1 - b.y0) > W * H * .5) };
}

/* ── dựng bảng từ đường kẻ ── */
function cluster(vals, tol) { const s = [...vals].sort((a, b) => a - b), out = []; for (const v of s) { if (out.length && v - out[out.length - 1].v <= tol) { const o = out[out.length - 1]; o.v = (o.v * o.n + v) / (o.n + 1); o.n++; } else out.push({ v, n: 1 }); } return out.map(o => o.v); }
function mergeSegs(list, key) {   // gộp các đoạn thẳng trùng / nối tiếp
  const g = new Map(); for (const s of list) { const k = Math.round(s[key] * 2) / 2; let arr = null; for (const [kk, v] of g) if (Math.abs(kk - k) <= 1) { arr = v; break; } if (!arr) g.set(k, arr = []); arr.push(s); }
  const out = []; for (const arr of g.values()) { arr.sort((a, b) => a.a - b.a); let cur = null; for (const s of arr) { if (cur && s.a <= cur.b + 1.5) { cur.b = Math.max(cur.b, s.b); cur.w = Math.max(cur.w, s.w); } else { if (cur) out.push(cur); cur = { ...s }; } } if (cur) out.push(cur); }
  return out;
}
function findTables(pg) {
  const H = mergeSegs(pg.segs.filter(s => s.h && s.b - s.a > 6), 'y'), V = mergeSegs(pg.segs.filter(s => !s.h && s.b - s.a > 4), 'x');
  // nhóm các đoạn cắt nhau
  const all = [...H.map(s => ({ ...s, kind: 'h' })), ...V.map(s => ({ ...s, kind: 'v' }))], par = all.map((_, i) => i);
  const find = i => par[i] === i ? i : (par[i] = find(par[i]));
  const hit = (h, v) => v.x >= h.a - 2.5 && v.x <= h.b + 2.5 && h.y >= v.a - 2.5 && h.y <= v.b + 2.5;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const A = all[i], B = all[j]; if (A.kind !== B.kind && (A.kind === 'h' ? hit(A, B) : hit(B, A))) par[find(i)] = find(j); }
  const groups = new Map(); all.forEach((s, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(s); });
  const tables = [];
  for (const g of groups.values()) {
    const hs = g.filter(s => s.kind === 'h'), vs = g.filter(s => s.kind === 'v'); if (hs.length < 2 || vs.length < 2) continue;
    const X = cluster(vs.map(s => s.x), 2.5), Y = cluster(hs.map(s => s.y), 2.5); if (X.length < 2 || Y.length < 2) continue;
    const x0 = X[0], x1 = X[X.length - 1], y0 = Y[0], y1 = Y[Y.length - 1]; if (x1 - x0 < 30 || y1 - y0 < 8) continue;
    const nr = Y.length - 1, nc = X.length - 1;
    const vAt = (x, ya, yb) => vs.find(s => Math.abs(s.x - x) <= 2.5 && s.a <= ya + (yb - ya) * .4 && s.b >= yb - (yb - ya) * .4);
    const hAt = (y, xa, xb) => hs.find(s => Math.abs(s.y - y) <= 2.5 && s.a <= xa + (xb - xa) * .4 && s.b >= xb - (xb - xa) * .4);
    // ô gộp: duyệt từng ô lưới, mở rộng sang phải khi không có vạch dọc, xuống dưới khi không có vạch ngang
    const own = Array.from({ length: nr }, () => Array(nc).fill(null)), cells = [];
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
      if (own[r][c]) continue; let c2 = c; while (c2 + 1 < nc && !vAt(X[c2 + 1], Y[r], Y[r + 1])) c2++;
      let r2 = r; const canDown = rr => { for (let k = c; k <= c2; k++) if (hAt(Y[rr + 1], X[k], X[k + 1]) || own[rr + 1][k]) return false; return true; };
      while (r2 + 1 < nr && canDown(r2)) r2++;
      const cell = { r, c, r2, c2, x0: X[c], x1: X[c2 + 1], y0: Y[r], y1: Y[r2 + 1], runs: [], b: {} };
      cell.b.t = hAt(Y[r], X[c], X[c2 + 1]); cell.b.bt = hAt(Y[r2 + 1], X[c], X[c2 + 1]); cell.b.l = vAt(X[c], Y[r], Y[r2 + 1]); cell.b.r = vAt(X[c2 + 1], Y[r], Y[r2 + 1]);
      const f = pg.fills.find(f => f.x0 <= (cell.x0 + cell.x1) / 2 && f.x1 >= (cell.x0 + cell.x1) / 2 && f.y0 <= (cell.y0 + cell.y1) / 2 && f.y1 >= (cell.y0 + cell.y1) / 2 && (f.x1 - f.x0) < (x1 - x0) * 1.02 + 2);
      if (f) cell.fill = f.c;
      for (let rr = r; rr <= r2; rr++) for (let k = c; k <= c2; k++) own[rr][k] = cell;
      cells.push(cell);
    }
    if (nr * nc === 1 && cells[0]) {   // khung 1 ô (viền quanh đoạn văn) → vẫn là bảng 1 ô
    }
    tables.push({ x0, x1, y0, y1, X, Y, cells, nr, nc, own });
  }
  return tables;
}

/* ── ghép mảnh chồng nhau (PDF dùng 2 phông: phông chính để dấu cách giữ chỗ, chữ có dấu nằm ở phông khác) ── */
const MC = document.createElement('canvas').getContext('2d');
const mfont = A => A.loaded && document.fonts && document.fonts.check(`10px "${A.loaded}"`) ? `${A.size}px "${A.loaded}"` : `${A.italic ? 'italic ' : ''}${A.bold ? 'bold ' : ''}${A.size}px "${A.family}", serif`;   // đo bằng chính phông nhúng trong PDF
function splitAt(A, X) {   // chia mảnh A tại toạ độ X
  MC.font = mfont(A);
  const full = MC.measureText(A.str).width || 1, k = A.w / full; let best = 0, bd = Infinity;
  const pos = i => A.x + MC.measureText(A.str.slice(0, i)).width * k;
  for (let i = 0; i <= A.str.length; i++) { const d = Math.abs(pos(i) - X); if (d < bd) { bd = d; best = i; } }
  // phông giữ chỗ bằng dấu cách: chọn dấu cách gần X nhất (đo chữ chỉ gần đúng vì máy không có phông của PDF)
  let sp = -1, sd = Infinity; for (let i = 0; i < A.str.length; i++) if (A.str[i] === ' ') { const d = Math.abs(pos(i) - X); if (d < sd) { sd = d; sp = i; } }
  if (sp >= 0 && sd < Math.max(A.size * .35, bd + A.size * .2)) return sp;
  return best;
}
function fixOverlaps(rs) {
  rs.sort((a, b) => a.x - b.x);
  for (let guard = 0; guard < 400; guard++) {
    let done = true;
    for (let i = 0; i < rs.length && done; i++) for (let j = 0; j < rs.length; j++) {
      const A = rs[i], B = rs[j]; if (i === j || A.str.length < 2) continue;
      if (B.x > A.x + .6 && B.x < A.x + A.w - .6 && Math.abs(A.base - B.base) < A.size * .5) {
        const idx = splitAt(A, B.x); if (idx <= 0 || idx >= A.str.length) continue;
        MC.font = mfont(A);
        const k = A.w / (MC.measureText(A.str).width || 1), pre = A.str.slice(0, idx), skip = A.str[idx] === ' ' ? 1 : 0, post = A.str.slice(idx + skip);
        const wPre = MC.measureText(pre).width * k, xPost = A.x + MC.measureText(A.str.slice(0, idx + skip)).width * k;
        const a1 = { ...A, str: pre, w: wPre }, a2 = { ...A, str: post, x: Math.max(xPost, B.x + B.w), w: Math.max(0, A.x + A.w - Math.max(xPost, B.x + B.w)) };
        rs.splice(i, 1, ...[a1, a2].filter(q => q.str.length)); rs.sort((a, b) => a.x - b.x); done = false; break;
      }
    }
    if (done) break;
  }
  return rs;
}

/* ── chữ → dòng ── */
function toLines(runs, gapK = 2.2) {
  const rs = runs.filter(r => !r.rot).sort((a, b) => a.base - b.base || a.x - b.x), lines = [];
  for (const r of rs) {
    let L = null; for (let i = lines.length - 1; i >= 0 && i >= lines.length - 4; i--) { const l = lines[i]; if (Math.abs(l.base - r.base) < Math.max(1.5, Math.min(l.size, r.size) * .45)) { L = l; break; } }
    if (!L) { L = { base: r.base, size: r.size, runs: [] }; lines.push(L); }
    L.runs.push(r); L.size = Math.max(L.size, r.size);
  }
  for (const L of lines) {
    fixOverlaps(L.runs);
    for (let i = 1; i < L.runs.length; i++) { const r = L.runs[i]; if (/^\p{M}/u.test(r.str)) { const p = L.runs[i - 1]; p.str = (p.str + r.str).normalize('NFC'); p.w = Math.max(p.w, r.x + r.w - p.x); L.runs.splice(i--, 1); } }
    L.runs.forEach(r => { r.str = r.str.normalize('NFC'); });
    // tách dòng thành các cụm khi khoảng trống rất lớn (cột chữ không kẻ bảng → dùng tab)
    L.x0 = L.runs[0].x; L.x1 = Math.max(...L.runs.map(r => r.x + r.w)); L.top = Math.min(...L.runs.map(r => r.top)); L.bottom = Math.max(...L.runs.map(r => r.bottom));
    const parts = []; let cur = null;
    for (const r of L.runs) {
      if (cur) { const gap = r.x - cur.x1; if (gap > Math.max(L.size * gapK, gapK > 1.5 ? 18 : 4)) { parts.push(cur); cur = null; } }
      if (!cur) cur = { x0: r.x, x1: r.x + r.w, runs: [] };
      cur.runs.push(r); cur.x1 = Math.max(cur.x1, r.x + r.w);
    }
    if (cur) parts.push(cur); L.parts = parts;
  }
  return lines;
}
const same = (a, b) => a.bold === b.bold && a.italic === b.italic && a.color === b.color && Math.abs(a.size - b.size) < .6 && a.family === b.family;
function runsXml(rs, scale = 1) {   // gộp các mảnh cùng kiểu chữ, chèn dấu cách theo khoảng hở
  const out = []; let prev = null, buf = '', st = null;
  const flush = () => { if (!st || buf === '') return; const sz = Math.max(2, Math.round(st.size * scale * 2));
    out.push(`<w:r><w:rPr><w:rFonts w:ascii="${xesc(st.family)}" w:hAnsi="${xesc(st.family)}" w:cs="${xesc(st.family)}" w:eastAsia="${xesc(st.family)}"/>${st.bold ? '<w:b/><w:bCs/>' : ''}${st.italic ? '<w:i/><w:iCs/>' : ''}${st.color !== '000000' ? `<w:color w:val="${st.color}"/>` : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xesc(buf)}</w:t></w:r>`); buf = ''; };
  for (const r of rs) {
    let sp = '';
    if (prev) { const gap = r.x - (prev.x + prev.w); if (gap > r.size * .18 && !/\s$/.test(prev.str) && !/^\s/.test(r.str)) sp = ' '; }
    if (!st || !same(st, r)) { if (sp) buf += sp, sp = ''; flush(); st = r; }
    buf += sp + r.str; prev = r;
  }
  flush(); return out.join('');
}

/* ── kiểu "dễ sửa" ── */
function buildFlow(pages, media) {
  const body = []; let imgId = 0;
  // lề chung lấy theo trang đầu
  const p0 = pages[0], xsL = [], xsR = [], ysT = [], ysB = [];
  pages.forEach(pg => { pg.runs.forEach(r => { xsL.push(r.x); xsR.push(r.x + r.w); ysT.push(r.top); ysB.push(r.bottom); }); });
  const clampM = v => Math.max(18, Math.min(108, v));
  const mL = clampM(xsL.length ? Math.min(...xsL) : 72), mR = clampM(xsR.length ? p0.W - Math.max(...xsR) : 72), mT = clampM(ysT.length ? Math.min(...ysT) - 4 : 72), mB = clampM(ysB.length ? p0.H - Math.max(...ysB) - 4 : 72);
  const CW = p0.W - mL - mR;
  const anchor = (im, pg) => {
    const id = ++imgId, rid = `rIdP${id}`, cx = Math.round((im.x1 - im.x0) * EMU), cy = Math.round((im.y1 - im.y0) * EMU);
    media.push({ name: `word/media/p${id}.png`, data: im.blob, id: rid, target: `media/p${id}.png` }); void pg;
    return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${Math.round(im.x0 * EMU)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${Math.round(im.y0 * EMU)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${1000 + id}" name="Hinh ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${1000 + id}" name="p${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
  };
  pages.forEach((pg, pi) => {
    const tables = findTables(pg), inT = r => tables.find(t => r.x + r.w / 2 >= t.x0 - 1 && r.x + r.w / 2 <= t.x1 + 1 && (r.top + r.base) / 2 >= t.y0 - 1 && (r.top + r.base) / 2 <= t.y1 + 1);
    const free = []; for (const r of pg.runs) { const t = inT(r); if (t) { const cell = t.cells.find(c => r.x + r.w / 2 >= c.x0 - .5 && r.x + r.w / 2 <= c.x1 + .5 && (r.top + r.base) / 2 >= c.y0 - .5 && (r.top + r.base) / 2 <= c.y1 + .5); if (cell) { cell.runs.push(r); continue; } } free.push(r); }
    const blocks = [];
    // dòng chữ ngoài bảng → đoạn văn
    const lines = toLines(free);
    let para = null;
    const endPara = () => { if (para) blocks.push(para); para = null; };
    lines.forEach((L, i) => {
      const prev = lines[i - 1], multi = L.parts.length > 1, full = L.x1 > mL + CW * .88;
      const cont = para && !multi && !para.multi && prev && Math.abs(L.size - prev.size) < .8 && L.base - prev.base < L.size * 1.75 && L.base - prev.base > L.size * .8 && para.lastFull && Math.abs(L.x0 - para.leftX) < Math.max(4, L.size * 1.6) && !(L.runs[0].bold !== prev.runs[0].bold && L.runs[0].size !== prev.runs[0].size);
      if (cont) { para.lines.push(L); para.lastFull = full; para.bottom = L.bottom; return; }
      endPara(); para = { kind: 'p', lines: [L], top: L.top, bottom: L.bottom, multi, lastFull: full, leftX: L.x0, firstX: L.x0 };
      if (prev && para) void 0;
    });
    endPara();
    // đoạn có ≥2 dòng: lề trái theo dòng 2, thụt đầu dòng theo dòng 1
    blocks.forEach(b => { if (b.lines.length > 1) { b.leftX = Math.min(...b.lines.slice(1).map(l => l.x0)); b.firstX = b.lines[0].x0; } });
    tables.forEach(t => blocks.push({ kind: 't', t, top: t.y0, bottom: t.y1 }));
    blocks.sort((a, b) => a.top - b.top);
    let prevBottom = mT, firstInPage = true;
    const anchors = pg.images.map(im => anchor(im, pg)).join('');
    let anchorsUsed = false;
    for (const b of blocks) {
      const before = Math.max(0, Math.min(400, (b.top - prevBottom))) * TW;
      if (b.kind === 'p') {
        const L0 = b.lines[0], lastX1 = Math.max(...b.lines.map(l => l.x1)), lx = b.leftX, gapL = lx - mL, gapR = mL + CW - lastX1;
        let jc = 'left'; if (b.multi) jc = 'left'; else if (b.lines.length === 1) { if (gapL > 24 && Math.abs(gapL - gapR) < Math.max(10, CW * .04)) jc = 'center'; else if (gapR < 8 && gapL > CW * .3) jc = 'right'; } else if (b.lines.slice(0, -1).every(l => l.x1 > mL + CW * .95)) jc = 'both';
        const ind = jc === 'left' || jc === 'both' ? `<w:ind w:left="${Math.max(0, Math.round((lx - mL) * TW))}"${b.firstX - lx > 2 ? ` w:firstLine="${Math.round((b.firstX - lx) * TW)}"` : b.firstX - lx < -2 ? ` w:hanging="${Math.round((lx - b.firstX) * TW)}"` : ''}/>` : '';
        const lineGap = b.lines.length > 1 ? (b.lines[b.lines.length - 1].base - L0.base) / (b.lines.length - 1) : 0;
        const spacing = `<w:spacing w:before="${Math.round(before)}" w:after="0" ${lineGap ? `w:line="${Math.round(lineGap * TW)}" w:lineRule="exact"` : 'w:line="240" w:lineRule="auto"'}/>`;
        let tabs = '', content = '';
        if (b.multi) {   // các cụm cách xa nhau trên 1 dòng → tab đặt đúng vị trí
          const ps = L0.parts; tabs = '<w:tabs>' + ps.slice(1).map(p => `<w:tab w:val="left" w:pos="${Math.max(0, Math.round((p.x0 - mL) * TW))}"/>`).join('') + '</w:tabs>';
          content = ps.map((p, k) => (k ? '<w:r><w:tab/></w:r>' : '') + runsXml(p.runs)).join('');
        } else content = b.lines.map((l, k) => { const x = runsXml(l.runs); return k && !/[\s-]$/.test(b.lines[k - 1].runs[b.lines[k - 1].runs.length - 1].str) ? `<w:r><w:t xml:space="preserve"> </w:t></w:r>${x}` : x; }).join('');
        const pb = firstInPage && pi > 0 ? '<w:pageBreakBefore/>' : '';
        const ms = Math.round(Math.max(...b.lines.map(l => l.size)) * 2);
        body.push(`<w:p><w:pPr>${pb}${tabs}${spacing}${ind}<w:jc w:val="${jc}"/><w:rPr><w:sz w:val="${ms}"/><w:szCs w:val="${ms}"/></w:rPr></w:pPr>${!anchorsUsed ? anchors : ''}${content}</w:p>`); anchorsUsed = true;
      } else {
        if (firstInPage && pi > 0) body.push('<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>');
        if (before > 40) body.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${Math.max(20, Math.round(before))}" w:lineRule="exact"/></w:pPr>${!anchorsUsed ? anchors : ''}</w:p>`), anchorsUsed = true;
        body.push(tableXml(b.t, mL));
      }
      prevBottom = b.bottom; firstInPage = false;
    }
    if (!anchorsUsed && anchors) body.push(`<w:p><w:pPr>${pi > 0 ? '<w:pageBreakBefore/>' : ''}</w:pPr>${anchors}</w:p>`);
    if (!blocks.length && !anchors && pi > 0) body.push('<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>');
  });
  const sect = `<w:sectPr><w:pgSz w:w="${Math.round(p0.W * TW)}" w:h="${Math.round(p0.H * TW)}"${p0.W > p0.H ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${Math.round(mT * TW)}" w:right="${Math.round(mR * TW)}" w:bottom="${Math.round(mB * TW)}" w:left="${Math.round(mL * TW)}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
  return body.join('') + sect;
}
function tableXml(t, mL) {
  const allR = t.cells.flatMap(c => c.runs); t.minSize = allR.length ? Math.min(...allR.map(r => r.size)) : 8;
  const grid = t.X.slice(1).map((x, i) => `<w:gridCol w:w="${Math.max(30, Math.round((x - t.X[i]) * TW))}"/>`).join('');
  const bd = (s, tag) => s ? `<w:${tag} w:val="single" w:sz="${Math.max(2, Math.min(48, Math.round(s.w * 8)))}" w:space="0" w:color="${s.c || '000000'}"/>` : `<w:${tag} w:val="nil"/>`;
  const rows = [];
  for (let r = 0; r < t.nr; r++) {
    const h = Math.max(6, t.Y[r + 1] - t.Y[r]), tcs = [];
    for (let c = 0; c < t.nc;) {
      const cell = t.own[r][c], span = cell.c2 - cell.c + 1;
      const vm = cell.r2 > cell.r ? (cell.r === r ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>') : '';
      const tSz = Math.max(2, Math.round((t.minSize || 8) * 2)), mark = `<w:rPr><w:sz w:val="${tSz}"/><w:szCs w:val="${tSz}"/></w:rPr>`;
      let inner = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${Math.round(Math.min(h, (t.minSize || 8) * 1.15) * TW)}" w:lineRule="exact"/>${mark}</w:pPr></w:p>`, va = 'top';
      if (cell.r === r && cell.runs.length) {
        const ls = toLines(cell.runs), ps = [];
        const cw = cell.x1 - cell.x0;
        ls.forEach((L, i) => {
          const gl = L.x0 - cell.x0, gr = cell.x1 - L.x1, jc = Math.abs(gl - gr) < Math.max(3, cw * .08) && gl > 3 ? 'center' : gr < gl && gr < Math.max(6, cw * .15) ? 'right' : 'left';
          const prev = ls[i - 1];
          if (prev && ps.length && jc === ps[ps.length - 1].jc && jc !== 'center' && L.base - prev.base < L.size * 1.7 && prev.x1 > cell.x1 - Math.max(12, L.size * 4)) { ps[ps.length - 1].lines.push(L); return; }
          ps.push({ jc, lines: [L] });
        });
        inner = ps.map(p => { const sz = Math.max(...p.lines.map(l => l.size)), ms = Math.round(sz * 2); return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${Math.round(sz * 1.18 * TW)}" w:lineRule="exact"/><w:jc w:val="${p.jc}"/><w:rPr><w:sz w:val="${ms}"/><w:szCs w:val="${ms}"/></w:rPr></w:pPr>${p.lines.map((l, k) => (k ? '<w:r><w:t xml:space="preserve"> </w:t></w:r>' : '') + runsXml(l.runs)).join('')}</w:p>`; }).join('');
        const tTop = Math.min(...cell.runs.map(x => x.top)), tBot = Math.max(...cell.runs.map(x => x.bottom)), mid = (cell.y0 + cell.y1) / 2;
        va = Math.abs((tTop + tBot) / 2 - mid) < (cell.y1 - cell.y0) * .18 && cell.y1 - cell.y0 > (tBot - tTop) * 1.6 ? 'center' : tTop - cell.y0 > (cell.y1 - tBot) * 2 ? 'bottom' : (Math.abs((tTop + tBot) / 2 - mid) < 3 ? 'center' : 'top');
      }
      const borders = `<w:tcBorders>${bd(cell.b.t, 'top')}${bd(cell.b.l, 'left')}${bd(cell.b.bt, 'bottom')}${bd(cell.b.r, 'right')}</w:tcBorders>`;
      tcs.push(`<w:tc><w:tcPr><w:tcW w:w="${Math.round((cell.x1 - cell.x0) * TW)}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${vm}${borders}${cell.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${cell.fill}"/>` : ''}<w:vAlign w:val="${va}"/></w:tcPr>${inner}</w:tc>`);
      c += span;
    }
    const oneLine = t.cells.filter(c => c.r === r && c.r2 === r).every(c => !c.runs.length || toLines(c.runs).length <= 1);
    rows.push(`<w:tr><w:trPr><w:trHeight w:val="${Math.round(h * TW)}" w:hRule="${oneLine ? 'exact' : 'atLeast'}"/></w:trPr>${tcs.join('')}</w:tr>`);
  }
  return `<w:tbl><w:tblPr><w:tblW w:w="${Math.round((t.x1 - t.x0) * TW)}" w:type="dxa"/><w:tblInd w:w="${Math.round((t.x0 - mL) * TW)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.join('')}</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>`;
}

/* ── kiểu "giữ nguyên bố cục" ── */
async function buildExact(pages, media) {
  const body = [];
  for (let pi = 0; pi < pages.length; pi++) {
    const pg = pages[pi], id = pi + 1, rid = `rIdB${id}`, cx = Math.round(pg.W * EMU), cy = Math.round(pg.H * EMU);
    const blob = await new Promise(ok => pg.bare.toBlob(ok, 'image/jpeg', .9));
    media.push({ name: `word/media/nen${id}.jpeg`, data: blob, id: rid, target: `media/nen${id}.jpeg` });
    const bg = `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${1000 + id}" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${2000 + id}" name="Nen trang ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${2000 + id}" name="nen${id}.jpeg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
    body.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>${bg}</w:p>`);
    for (const L of toLines(pg.runs, .9)) for (const part of L.parts) {
      const size = L.size, top = L.base - size * .86, w = (part.x1 - part.x0) * 1.08 + size * .6, h = size * 1.2;
      body.push(`<w:p><w:pPr><w:framePr w:w="${Math.round(w * TW)}" w:h="${Math.round(h * TW)}" w:hRule="exact" w:wrap="around" w:vAnchor="page" w:hAnchor="page" w:x="${Math.round(part.x0 * TW)}" w:y="${Math.round(top * TW)}"/><w:spacing w:before="0" w:after="0" w:line="${Math.round(h * TW)}" w:lineRule="exact"/><w:ind w:left="0" w:right="0"/></w:pPr>${runsXml(part.runs)}</w:p>`);
    }
    const last = pi === pages.length - 1;
    const sect = `<w:sectPr><w:pgSz w:w="${Math.round(pg.W * TW)}" w:h="${Math.round(pg.H * TW)}"${pg.W > pg.H ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
    if (last) body.push(sect); else body.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${sect}</w:pPr></w:p>`);
  }
  return body.join('');
}

/* ── ráp file DOCX ── */
export async function pdfToDocx(doc, mode, step) {
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) { step && step(n - 1, doc.numPages); pages.push(await readPage(doc, n, 2)); }
  if (pages.every(p => !p.runs.length)) throw new Error('PDF này là ảnh scan, không có chữ để chuyển sang Word');
  const media = [], inner = mode === 'exact' ? await buildExact(pages, media) : buildFlow(pages, media);
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const docXml = X + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + inner + '</w:body></w:document>';
  const styles = X + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
  const ct = X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  const rels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const drels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' + media.map(m => `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${m.target}"/>`).join('') + '</Relationships>';
  return ZIP([{ name: '[Content_Types].xml', data: ct }, { name: '_rels/.rels', data: rels }, { name: 'word/document.xml', data: docXml }, { name: 'word/styles.xml', data: styles }, { name: 'word/_rels/document.xml.rels', data: drels }, ...media.map(m => ({ name: m.name, data: m.data }))], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
