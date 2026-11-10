/* © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790).
   💼 V1.8.0: đọc file Excel (.xlsx) → dữ liệu bảng tính cho tab Quản lý chi phí
   (giá trị, công thức, định dạng ô, ô gộp, độ rộng cột, chiều cao dòng, dòng/cột/sheet ẩn). Đọc thẳng XML, không cần thư viện ngoài ngoài JSZip. */
(function (root) {
  const unesc = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, '&');
  const attrs = s => { const o = {}; s.replace(/([\w:]+)="([^"]*)"/g, (_, k, v) => { o[k] = unesc(v); }); return o; };
  const colNum = s => { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
  const addr = a => { const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(a); return m ? [+m[2] - 1, colNum(m[1]) - 1] : null; };
  const tags = (x, tag) => { const out = [], re = new RegExp('<' + tag + '(\\s[^>]*?)?(?:/>|>([\\s\\S]*?)</' + tag + '>)', 'g'); let m; while ((m = re.exec(x))) out.push({ a: attrs(m[1] || ''), b: m[2] || '' }); return out; };
  const one = (x, tag) => tags(x, tag)[0] || null;
  const textOf = b => { const ts = []; b.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_, v) => { ts.push(unesc(v)); }); return ts.join(''); };

  // màu: rgb ARGB → #RRGGBB; màu theme cơ bản Office
  const THEME = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47'];
  function tint(hex, t) { if (!t) return hex; let [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); const f = v => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t); return [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function color(a) { if (!a) return null; if (a.rgb && a.rgb.length >= 6) return '#' + a.rgb.slice(-6).toUpperCase(); if (a.theme != null && THEME[+a.theme]) return '#' + tint(THEME[+a.theme], +(a.tint || 0)); if (a.indexed === '10') return '#FF0000'; return null; }

  // mã định dạng số → mã gọn: n2(- = số 2 lẻ, âm trong ngoặc, 0 hiện "-" · p1 = % 1 lẻ · d0 = ngày · t = chữ
  const BUILTIN = { 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 14: 'd/m/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 22: 'm/d/yyyy h:mm', 37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)', 41: '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)', 42: '_("$"* #,##0_);_("$"* (#,##0);_("$"* "-"_);_(@_)', 43: '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)', 44: '_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mmss.0', 49: '@' };
  function nfCode(code) {
    if (!code || /^general$/i.test(code)) return null;
    const secs = []; let cur = '', q = false, br = false;
    for (const ch of code) { if (ch === '"') q = !q; if (!q && ch === '[') br = true; if (!q && ch === ']') br = false; if (ch === ';' && !q && !br) { secs.push(cur); cur = ''; } else cur += ch; }
    secs.push(cur);
    const clean = s => s.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '').replace(/_./g, '').replace(/\*./g, '');
    const s0 = clean(secs[0]);
    if (s0.trim() === '@' && secs.length === 1) return 't';
    if (/[dmyhs]/i.test(s0) && !/[0#]/.test(s0)) return 'd0';
    const dm = /\.([0#?]+)/.exec(s0), d = dm ? (dm[1].match(/0/g) || []).length || dm[1].length : 0;
    let k = /%/.test(s0) ? 'p' : 'n', fl = '';
    if (secs[1] && /\(/.test(secs[1])) fl += '(';
    if (secs.length >= 3) { const z = secs[2]; if (/"-"|-/.test(z) && !/[0#]/.test(clean(z))) fl += '-'; else if (!clean(z).trim() && !/"/.test(z)) fl += 'z'; }
    return k + d + fl;
  }

  async function read(JSZip, bytes) {
    const zip = await JSZip.loadAsync(bytes), F = async p => { const f = zip.file(p); return f ? f.async('string') : ''; };
    const wb = await F('xl/workbook.xml'), rels = await F('xl/_rels/workbook.xml.rels');
    const relMap = {}; tags(rels, 'Relationship').forEach(r => { relMap[r.a.Id] = r.a.Target; });
    const ss = tags(await F('xl/sharedStrings.xml'), 'si').map(x => textOf(x.b));
    // định dạng
    const sx = await F('xl/styles.xml');
    const nfs = {}; tags(one(sx, 'numFmts') ? one(sx, 'numFmts').b : '', 'numFmt').forEach(n => { nfs[n.a.numFmtId] = n.a.formatCode; });
    const fonts = tags(one(sx, 'fonts').b, 'font').map(f => { const g = t => one(f.b, t); const o = {};
      if (g('b') && g('b').a.val !== '0') o.b = 1; if (g('i') && g('i').a.val !== '0') o.i = 1; if (g('u') && g('u').a.val !== 'none') o.u = 1;
      const c = g('color'); const cc = c && color(c.a); if (cc && cc !== '#000000') o.c = cc;
      if (g('sz') && +g('sz').a.val !== 11) o.sz = +g('sz').a.val; if (g('name')) o.fn = g('name').a.val; return o; });
    const fills = tags(one(sx, 'fills').b, 'fill').map(f => { const p = one(f.b, 'patternFill'); if (!p || p.a.patternType !== 'solid') return null; const fg = one(p.b, 'fgColor'); return fg ? color(fg.a) : null; });
    const BW = { thin: 1, hair: 1, dotted: 1, dashed: 1, dashDot: 1, dashDotDot: 1, mediumDashed: 2, mediumDashDot: 2, mediumDashDotDot: 2, slantDashDot: 2, medium: 2, thick: 2, double: 3 };
    const borders = tags(one(sx, 'borders').b, 'border').map(b => { const o = {}; [['left', 'bl'], ['right', 'br'], ['top', 'bt'], ['bottom', 'bb']].forEach(([t, k]) => { const e = one(b.b, t); if (e && e.a.style && BW[e.a.style]) o[k] = BW[e.a.style]; }); return o; });
    const xfs = tags(one(sx, 'cellXfs').b, 'xf');
    const STY = [], styKey = new Map(), xfIdx = [], xfCC = [];
    xfs.forEach(x => { const a = x.a, o = { ...(fonts[+a.fontId || 0] || {}) };
      const bg = fills[+a.fillId || 0]; if (bg) o.bg = bg;
      const al = one(x.b, 'alignment'); xfCC.push(!!(al && al.a.horizontal === 'centerContinuous')); if (al) { const h = al.a.horizontal; if (h === 'center' || h === 'centerContinuous') o.a = 'c'; else if (h === 'right') o.a = 'r'; else if (h && h !== 'general') o.a = 'l';
        const v = al.a.vertical; if (v === 'center') o.va = 'm'; else if (v === 'top') o.va = 't'; if (al.a.wrapText === '1') o.w = 1; if (+al.a.indent) o.ind = +al.a.indent; }
      const nf = nfCode(nfs[a.numFmtId] || BUILTIN[+a.numFmtId]); if (nf) o.nf = nf;
      Object.assign(o, borders[+a.borderId || 0] || {});
      const k = JSON.stringify(o); if (!styKey.has(k)) { styKey.set(k, STY.length); STY.push(o); } xfIdx.push(styKey.get(k)); });
    const SH = [];
    for (const s of tags(one(wb, 'sheets').b, 'sheet')) {
      const rid = s.a['r:id'], tg = relMap[rid] || ''; const path = tg.startsWith('/') ? tg.slice(1) : 'xl/' + tg.replace(/^\.\//, '');
      const x = await F(path); if (!x) continue;
      const fmt = one(x, 'sheetFormatPr'), defH = fmt && fmt.a.defaultRowHeight ? +fmt.a.defaultRowHeight : 15;
      const defW = fmt && fmt.a.defaultColWidth ? +fmt.a.defaultColWidth : fmt && fmt.a.baseColWidth ? +fmt.a.baseColWidth + 0.71 : 8.43;
      const px = w => Math.trunc(((256 * w + Math.trunc(128 / 7)) / 256) * 7) + 5;
      const colsDef = []; tags(one(x, 'cols') ? one(x, 'cols').b : '', 'col').forEach(c => { for (let i = +c.a.min; i <= +c.a.max && i <= 400; i++) colsDef[i - 1] = { w: c.a.width != null ? +c.a.width : defW, h: c.a.hidden === '1', s: c.a.style != null ? +c.a.style : null }; });
      const rows = [], shared = {}, ccM = []; let nc = 0;
      const sd = one(x, 'sheetData');
      tags(sd ? sd.b : '', 'row').forEach(r => { const ri = +r.a.r - 1; if (!(ri >= 0) || ri > 20000) return;
        const cells = [], cc = new Set();
        tags(r.b, 'c').forEach(c => { const p = addr(c.a.r || ''); if (!p) return; const ci = p[1]; if (ci > 399) return;
          const st = xfIdx[+c.a.s || 0] || 0; if (xfCC[+c.a.s || 0]) cc.add(ci); const vt = one(c.b, 'v'), ft = one(c.b, 'f'), t = c.a.t; let v = null, f = null;
          if (t === 's') v = vt ? ss[+vt.b] : null; else if (t === 'inlineStr') { const is = one(c.b, 'is'); v = is ? textOf(is.b) : ''; }
          else if (t === 'b') v = vt ? vt.b === '1' : null; else if (t === 'str' || t === 'e') v = vt ? unesc(vt.b) : null; else if (vt && vt.b !== '') v = +vt.b;
          if (typeof v === 'string') v = v.replace(/\r\n/g, '\n');
          if (ft) { const fa = ft.a; let body = unesc(ft.b || '');
            if (fa.t === 'shared' && fa.si != null) { if (body) shared[fa.si] = { f: body, r: ri, c: ci }; else if (shared[fa.si] && root.XLPatch) { const m = shared[fa.si]; body = root.XLPatch.shiftFormula(m.f, ri - m.r, ci - m.c); } }
            if (body) f = '=' + body; }
          cells[ci] = f != null ? [v, st, f] : [v, st]; if (ci + 1 > nc) nc = ci + 1; });
        // canh giữa qua vùng chọn (centerContinuous) → coi như ô gộp ngang
        cc.forEach(ci => { const z = cells[ci]; if (!z || z[0] == null || z[0] === '') return; let w = 1; while (cc.has(ci + w) && (!cells[ci + w] || cells[ci + w][0] == null || cells[ci + w][0] === '')) w++; if (w > 1) ccM.push([ri, ci, 1, w]); });
        rows[ri] = [r.a.hidden === '1' ? 1 : 0, Math.round((r.a.ht ? +r.a.ht : defH) * 4 / 3), cells]; });
      const m = ccM.slice(); tags(one(x, 'mergeCells') ? one(x, 'mergeCells').b : '', 'mergeCell').forEach(mc => { const [a, b] = mc.a.ref.split(':'); const p = addr(a), q = addr(b || a); if (!p || !q) return; m.push([p[0], p[1], q[0] - p[0] + 1, q[1] - p[1] + 1]); if (q[1] + 1 > nc) nc = q[1] + 1; });
      // ô gộp: viền phải / dưới của cả vùng lấy từ các ô ở mép (Excel vẽ viền vùng gộp theo từng ô)
      m.forEach(([r0, c0, h, w]) => { const A = rows[r0] && rows[r0][2][c0]; if (!A) return; const o = { ...STY[A[1]] }; let ch = false;
        const S = (r, c) => { const z = rows[r] && rows[r][2][c]; return z ? STY[z[1]] : null; };
        for (let r = r0; r < r0 + h; r++) { const z = S(r, c0 + w - 1); if (z && z.br && !o.br) { o.br = z.br; ch = true; } }
        for (let c = c0; c < c0 + w; c++) { const z = S(r0 + h - 1, c); if (z && z.bb && !o.bb) { o.bb = z.bb; ch = true; } }
        if (ch) { const k = JSON.stringify(o); if (!styKey.has(k)) { styKey.set(k, STY.length); STY.push(o); } A[1] = styKey.get(k); } });
      const pane = one(x, 'pane'); const fr = pane && pane.a.state && /frozen/.test(pane.a.state) && pane.a.topLeftCell ? pane.a.topLeftCell : null;
      nc = Math.max(nc, 1);
      const cols = []; for (let c = 0; c < nc; c++) { const d = colsDef[c]; cols.push(d ? (d.h ? 0 : px(d.w)) : px(defW)); }
      for (let i = 0; i < rows.length; i++) { if (!rows[i]) rows[i] = [0, Math.round(defH * 4 / 3), []]; const cs = rows[i][2]; for (let c = 0; c < nc; c++) if (!cs[c]) cs[c] = 0; cs.length = nc; }
      SH.push({ name: s.a.name, state: s.a.state || 'visible', cols, rows, m, fr, nc });
    }
    return { sheets: SH, styles: STY };
  }
  root.XLRead = { read, nfCode };
})(typeof window !== 'undefined' ? window : module.exports);
