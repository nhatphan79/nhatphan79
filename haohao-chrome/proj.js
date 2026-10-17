// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📋 Trang Dự án trong Tab mới (chỉ máy chủ app): bảng thẻ 3 cột (Đang làm / Tạm dừng / Xong), kéo thả đổi cột.
// V1.22–23: chi tiết dự án gọn – tên + thư mục con (đổi tên, xoá); mỗi thư mục là 1 bảng kiểu Excel
//        (☐ · Hạng mục con · Lưu ý), nền vàng như note dán, bấm ô là sửa, tự lưu, link trong Lưu ý bấm được.
// Lưu chrome.storage.local['projBoard'].
(() => {
  const root = document.getElementById('proj'); if (!root) return;
  const COLS = [['doing', 'Đang làm', '#E08A00'], ['pause', 'Tạm dừng', '#9AA1B5'], ['done', 'Xong', '#2E8B57']];
  let data = { projects: [] }, openId = null, openFolder = null, ready = false;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  // V1.21: nhớ bản vừa tự lưu – sự kiện đổi kho do chính trang này gây ra thì bỏ qua (không thay `data` bằng bản sao)
  let lastSaved = '';
  const save = () => { lastSaved = JSON.stringify(data); return chrome.storage.local.set({ projBoard: data }).catch(() => {}); };
  let st = 0; const saveSoon = () => { clearTimeout(st); st = setTimeout(save, 400); };
  const ymd = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
  const today = () => ymd(new Date());
  const fmt = s => s ? new Date(s + 'T00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const real = r => r && (r.t || '').trim();
  const rowsOf = p => p.folders.flatMap(f => (f.rows || []).filter(real));
  const pct = p => { const R = rowsOf(p); return R.length ? Math.round(R.filter(r => r.done).length / R.length * 100) : (p.col === 'done' ? 100 : 0); };
  const nextOf = p => { for (const f of p.folders) { const r = (f.rows || []).find(x => !x.done && real(x)); if (r) return r.t.trim() + ' · ' + f.name; } return ''; };
  const proj = () => data.projects.find(p => p.id === openId);
  const editing = () => { const a = document.activeElement; return a && root.contains(a) && /INPUT|TEXTAREA/.test(a.tagName) && !/checkbox|date/.test(a.type || ''); };
  const newFolder = n => ({ id: uid(), name: n, rows: [] });

  // V1.22: chuyển dữ liệu cũ (việc cần làm / ghi chú / link) vào bảng – không mất gì
  function migrate() {
    let ch = false;
    for (const p of data.projects) {
      if (!Array.isArray(p.folders)) { p.folders = []; ch = true; }
      if (p.start == null) { p.start = ''; ch = true; }
      for (const f of p.folders) {
        if (Array.isArray(f.rows)) continue;
        f.rows = (f.tasks || []).map(t => ({ id: t.id || uid(), t: t.t || '', note: '', done: !!t.done }));
        if ((f.note || '').trim()) f.rows.push({ id: uid(), t: 'Ghi chú', note: f.note.trim(), done: false });
        (f.links || []).forEach(l => f.rows.push({ id: uid(), t: l.t || 'Link', note: l.u || '', done: false }));
        delete f.tasks; delete f.note; delete f.links; ch = true;
      }
    }
    return ch;
  }

  function newProject() {
    const p = { id: uid(), name: 'Dự án mới', col: 'doing', start: today(), due: '', at: Date.now(), folders: [newFolder('Việc chính')] };
    data.projects.unshift(p); save(); openId = p.id; openFolder = p.folders[0].id; render(true);
    setTimeout(() => { const n = root.querySelector('.pj-name'); if (n) { n.focus(); n.select(); } }, 30);
  }

  function card(p) {
    const c = $('div', 'pj-card'); c.tabIndex = 0; c.draggable = true; c.setAttribute('role', 'button'); c.setAttribute('aria-label', 'Mở dự án ' + p.name);
    c.append($('div', 'nm', p.name || '(chưa đặt tên)'));
    const m = $('div', 'pj-meta'), v = pct(p); m.append($('span', 'pj-pct', v + '%'));
    if (p.start || p.due) m.append($('span', '', '📅 ' + (fmt(p.start) || '…') + ' → ' + (fmt(p.due) || '…')));
    if (p.due && p.col !== 'done') { const T = today(), soon = ymd(Date.now() + 3 * 864e5); if (p.due < T) m.append($('span', 'pj-due late', 'Trễ hạn')); else if (p.due <= soon) m.append($('span', 'pj-due soon', 'Sắp tới hạn')); }
    const bar = $('div', 'pj-bar'), bi = $('i'); bi.style.width = v + '%'; bar.append(bi);
    c.append(m, bar);
    const nx = nextOf(p); if (nx && p.col !== 'done') { const n = $('div', 'pj-next'); n.append($('span', '', 'Việc tiếp theo'), nx); c.append(n); }
    const open = () => { openId = p.id; openFolder = (p.folders[0] || {}).id || null; render(true); window.scrollTo({ top: 0 }); };
    c.addEventListener('click', open); c.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', p.id); c.classList.add('drag'); });
    c.addEventListener('dragend', () => c.classList.remove('drag'));
    return c;
  }

  // V1.25: bảng dự án kiểu Excel: STT · Tên dự án · Bắt đầu · Kết thúc · Tiến độ · Trạng thái · Vốn đầu tư · Lãi/lỗ
  const money = n => (n == null || n === '' || isNaN(n)) ? '' : Number(n).toLocaleString('vi-VN');
  const parseMoney = t => { const s = String(t || '').replace(/[^\d-]/g, ''); if (!s || s === '-') return null; const n = parseInt(s, 10); return isNaN(n) ? null : n; };
  function moneyInput(p, key, cls) {
    const i = $('input', 'pj-money ' + (cls || '')); i.inputMode = 'numeric'; i.value = money(p[key]); i.placeholder = '0';
    const tone = () => { if (key === 'lai') { i.classList.toggle('pos', p.lai > 0); i.classList.toggle('neg', p.lai < 0); } };
    tone();
    i.addEventListener('input', () => { p[key] = parseMoney(i.value); saveSoon(); tone(); updTotal(); });
    i.addEventListener('blur', () => { i.value = money(p[key]); save(); });
    i.addEventListener('focus', () => { i.select(); });
    return i;
  }
  let updTotal = () => {};
  function board(W) {
    const top = $('div', 'pj-top'), add = $('button', 'pj-btn', '＋ Dự án mới'); add.addEventListener('click', newProject);
    top.append($('h1', '', 'Dự án đang làm'), add); W.append(top);
    const T = $('div', 'pj-list'); T.setAttribute('role', 'table'); T.setAttribute('aria-label', 'Danh sách dự án');
    const hd = $('div', 'pj-lr hd'); hd.setAttribute('role', 'row');
    ['STT', 'Tên dự án', 'Bắt đầu', 'Kết thúc', 'Tiến độ', 'Trạng thái', 'Vốn đầu tư', 'Lãi / lỗ'].forEach(t => hd.append($('div', 'c', t)));
    T.append(hd);
    data.projects.forEach((p, i) => {
      const r = $('div', 'pj-lr st-' + p.col); r.setAttribute('role', 'row');
      const no = $('div', 'c c-no', String(i + 1));
      const nmc = $('div', 'c c-nm'), nb = $('button', 'pj-open', p.name || '(chưa đặt tên)'); nb.title = 'Mở dự án';
      nb.addEventListener('click', () => { openId = p.id; openFolder = (p.folders[0] || {}).id || null; render(true); window.scrollTo({ top: 0 }); });
      const nx = nextOf(p); nmc.append(nb); if (nx && p.col !== 'done') nmc.append($('small', 'pj-nx', '→ ' + nx));
      const date = k => { const c = $('div', 'c'), d = $('input', 'pj-date'); d.type = 'date'; d.value = p[k] || ''; d.addEventListener('change', () => { p[k] = d.value; save(); render(true); }); c.append(d); return c; };
      const ds = date('start'), de = date('due');
      if (p.due && p.col !== 'done') { const t = today(); if (p.due < t) de.classList.add('late'); else if (p.due <= ymd(Date.now() + 3 * 864e5)) de.classList.add('soon'); }
      const v = pct(p), pc = $('div', 'c c-pg'), bar = $('div', 'pj-bar'), bi = $('i'); bi.style.width = v + '%'; bar.append(bi); pc.append(bar, $('b', '', v + '%'));
      const sc = $('div', 'c'), sel = $('select', 'pj-st'); for (const [k, lb] of COLS) { const o = $('option', '', lb); o.value = k; o.selected = k === p.col; sel.append(o); }
      sel.addEventListener('change', () => { p.col = sel.value; save(); render(true); }); sc.append(sel);
      const vc = $('div', 'c'), lc = $('div', 'c'); vc.append(moneyInput(p, 'von')); lc.append(moneyInput(p, 'lai', 'lai'));
      r.append(no, nmc, ds, de, pc, sc, vc, lc); T.append(r);
    });
    if (!data.projects.length) T.append($('div', 'pj-empty', 'Bấm ＋ Dự án mới để bắt đầu'));
    else {
      const ft = $('div', 'pj-lr ft'), tv = $('div', 'c c-sum'), tl = $('div', 'c c-sum');
      ft.append($('div', 'c'), $('div', 'c', 'Tổng'), $('div', 'c'), $('div', 'c'), $('div', 'c'), $('div', 'c'), tv, tl);
      updTotal = () => {
        const sv = data.projects.reduce((a, p) => a + (Number(p.von) || 0), 0), sl = data.projects.reduce((a, p) => a + (Number(p.lai) || 0), 0);
        tv.textContent = money(sv) || '0'; tl.textContent = (sl > 0 ? '+' : '') + (money(sl) || '0'); tl.className = 'c c-sum' + (sl > 0 ? ' pos' : sl < 0 ? ' neg' : '');
      };
      updTotal(); T.append(ft);
    }
    W.append(T, $('div', 'pj-hint', 'Bấm tên dự án để mở · sửa ngày, trạng thái, vốn, lãi/lỗ ngay trong bảng · tự lưu · lỗ ghi số âm (vd -500000)'));
  }

  // Lưu ý: chữ thường + link tự nhận (http…, www…, tên miền…/…) → thẻ a bấm được
  const LINK = /(https?:\/\/[^\s<]+|www\.[^\s<]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|vn|net|org|io|me|dev|app|ee|co)(?:\/[^\s<]*)?)/gi;
  function linkify(el, s) {
    el.replaceChildren(); let i = 0; s = s || '';
    s.replace(LINK, (m, _a, at) => {
      if (at > i) el.append(s.slice(i, at));
      const a = $('a', '', m); a.href = /^https?:/i.test(m) ? m : 'https://' + m; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', e => e.stopPropagation()); el.append(a); i = at + m.length; return m;
    });
    if (i < s.length) el.append(s.slice(i));
  }
  const grow = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

  function detail(W, p) {
    const top = $('div', 'pj-top'), back = $('button', 'pj-btn ghost', '← Về bảng dự án');
    back.addEventListener('click', () => { openId = null; render(true); });
    const del = $('button', 'pj-x', '🗑 Xoá dự án'); let armed = false;
    del.addEventListener('click', () => { if (!armed) { armed = true; del.textContent = 'Bấm lần nữa để xoá hẳn'; setTimeout(() => { armed = false; del.textContent = '🗑 Xoá dự án'; }, 3000); return; } data.projects = data.projects.filter(x => x !== p); save(); openId = null; render(true); });
    const sp = $('div'); sp.style.flex = '1'; top.append(back, sp, del); W.append(top);
    const D = $('div', 'pj-det'), S = $('div', 'pj-side'), M = $('div', 'pj-main');
    const fld = (lb, el) => { const l = $('label', 'pj-field'); l.append(lb, el); return l; };
    const nm = $('input', 'pj-name'); nm.value = p.name; nm.setAttribute('aria-label', 'Tên dự án');
    nm.addEventListener('input', () => { p.name = nm.value.trim() || 'Dự án mới'; saveSoon(); });
    nm.addEventListener('change', () => { p.name = nm.value.trim() || 'Dự án mới'; save(); });
    // V1.23: bỏ ngày bắt đầu / kết thúc và thanh tiến độ ở cột trái (anh Nhật muốn gọn)
    const updBar = () => {
      const sm = S.querySelector('.pj-fl button.on small'), cf = p.folders.find(x => x.id === openFolder);
      if (sm && cf) { const R = (cf.rows || []).filter(real); sm.textContent = R.length ? R.filter(r => r.done).length + '/' + R.length : ''; }
    };
    S.append(nm);   // V1.24: bỏ chữ "Thư mục con"
    const FL = $('div', 'pj-fl');
    // V1.23: mỗi thư mục có ✏️ đổi tên (hoặc bấm đúp) và 🗑 xoá ngay trên dòng
    const delFolder = f => { p.folders = p.folders.filter(x => x !== f); if (openFolder === f.id) openFolder = (p.folders[0] || {}).id || null; save(); render(true); };
    p.folders.forEach((f, i) => {
      const it = $('div', 'pj-fi' + (f.id === openFolder ? ' on' : ''));
      const b = $('button', f.id === openFolder ? 'on' : ''); const R = (f.rows || []).filter(real), dn = R.filter(r => r.done).length;
      b.append($('span', 'pj-no', (i + 1) + '.'), f.name, $('small', '', R.length ? dn + '/' + R.length : ''));   // V1.24: đánh số 1, 2, 3… theo thứ tự tạo
      b.addEventListener('click', () => { if (openFolder !== f.id) { openFolder = f.id; render(true); } });
      const ed = $('button', 'pj-ic', '✏️'); ed.title = 'Đổi tên'; ed.setAttribute('aria-label', 'Đổi tên thư mục ' + f.name);
      const dl = $('button', 'pj-ic', '🗑'); dl.title = 'Xoá thư mục'; dl.setAttribute('aria-label', 'Xoá thư mục ' + f.name);
      const rename = () => {
        const inp = $('input', 'pj-in pj-ren'); inp.value = f.name; inp.setAttribute('aria-label', 'Tên mới');
        let done = false; const ok = keep => { if (done) return; done = true; if (keep) { const n = inp.value.trim(); if (n) { f.name = n; save(); } } render(true); };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(true); if (e.key === 'Escape') ok(false); });
        inp.addEventListener('blur', () => ok(true));
        it.replaceChildren(inp); inp.focus(); inp.select();
      };
      ed.addEventListener('click', e => { e.stopPropagation(); rename(); }); b.addEventListener('dblclick', rename);
      let arm = false;
      dl.addEventListener('click', e => {
        e.stopPropagation();
        if (!arm && (f.rows || []).some(real)) { arm = true; dl.textContent = 'Xoá?'; dl.classList.add('arm'); setTimeout(() => { arm = false; dl.textContent = '🗑'; dl.classList.remove('arm'); }, 3000); return; }
        delFolder(f);
      });
      it.append(b, ed, dl); FL.append(it);
    });
    // V1.22: gõ tên + Enter (hoặc ＋) → thêm thư mục con và tự mở luôn, con trỏ nằm sẵn ở bảng
    const af = $('div', 'pj-addrow'), ai = $('input', 'pj-in'); ai.placeholder = 'Thêm thư mục con…'; ai.setAttribute('aria-label', 'Tên thư mục con mới');
    const ab = $('button', 'pj-btn', '＋');
    const addF = () => { const n = ai.value.trim(); if (!n) return ai.focus(); const f = newFolder(n); p.folders.push(f); openFolder = f.id; save(); render(true); setTimeout(() => { const c = root.querySelector('.pj-sheet .blank .c-t'); if (c) c.focus(); }, 20); };
    ab.addEventListener('click', addF); ai.addEventListener('keydown', e => { if (e.key === 'Enter') addF(); });
    af.append(ai, ab); S.append(FL, af);

    const f = p.folders.find(x => x.id === openFolder);
    if (!f) M.append($('div', 'pj-empty', 'Gõ tên thư mục con ở cột bên trái rồi Enter để bắt đầu.'));
    else {
      if (!Array.isArray(f.rows)) f.rows = [];
      const fh = $('div', 'pj-fh'), fn = $('input'); fn.value = f.name; fn.setAttribute('aria-label', 'Tên thư mục con');
      fn.addEventListener('change', () => { f.name = fn.value.trim() || f.name; save(); render(true); });
      const fd = $('button', 'pj-x', 'Xoá thư mục'); let arm = false;
      fd.addEventListener('click', () => { if (!arm && f.rows.some(real)) { arm = true; fd.textContent = 'Bấm lần nữa để xoá'; setTimeout(() => { arm = false; fd.textContent = 'Xoá thư mục'; }, 3000); return; } delFolder(f); });
      fh.append('📂', fn, fd); M.append(fh);

      const sheet = $('div', 'pj-sheet'); sheet.setAttribute('role', 'table'); sheet.setAttribute('aria-label', 'Bảng hạng mục ' + f.name);
      const hd = $('div', 'pj-r hd'); hd.setAttribute('role', 'row'); hd.append($('div', 'c c-k', '✓'), $('div', 'c', 'Hạng mục con'), $('div', 'c', 'Lưu ý (dán link được)'), $('div', 'c c-x', '')); sheet.append(hd);
      const rowEl = (r, blank) => {
        const tr = $('div', 'pj-r' + (blank ? ' blank' : '') + (r.done ? ' done' : '')); tr.setAttribute('role', 'row');
        const ck = $('div', 'c c-k'), cb = $('input'); cb.type = 'checkbox'; cb.checked = !!r.done; cb.setAttribute('aria-label', 'Xong'); cb.disabled = blank; ck.append(cb);
        const ct = $('div', 'c'), ti = $('textarea', 'c-t'); ti.rows = 1; ti.value = r.t || ''; ti.placeholder = blank ? 'Gõ hạng mục mới…' : ''; ti.setAttribute('aria-label', 'Hạng mục con'); ct.append(ti);
        const cn = $('div', 'c c-n'), nv = $('div', 'nv'), ne = $('textarea', 'c-ne'); ne.rows = 1; ne.value = r.note || ''; ne.setAttribute('aria-label', 'Lưu ý'); ne.hidden = true;
        linkify(nv, r.note); if (!r.note) nv.append($('span', 'ph', blank ? '' : 'Bấm để ghi lưu ý, dán link…'));
        cn.append(nv, ne);
        // V1.24: 📝 mở hạng mục thành note nổi đầy đủ (màu, định dạng, ảnh, link, sắp xếp) – sticky.html?id=pj:…
        const cx = $('div', 'c c-x'), op = $('button', 'pj-x pj-op', '📝'); op.title = 'Mở thành note'; op.setAttribute('aria-label', 'Mở hạng mục thành note'); op.hidden = blank;
        op.addEventListener('click', async () => { clearTimeout(st); await save(); chrome.runtime.sendMessage({ type: 'sticky-open', id: 'pj:' + p.id + ':' + f.id + ':' + r.id }).catch(() => {}); });
        const x = $('button', 'pj-x', '✕'); x.setAttribute('aria-label', 'Xoá dòng'); x.hidden = blank; cx.append(op, x);
        tr.append(ck, ct, cn, cx);
        const make = () => { if (!blank) return; blank = false; tr.classList.remove('blank'); f.rows.push(r); cb.disabled = false; x.hidden = false; op.hidden = false; ti.placeholder = ''; sheet.append(rowEl({ id: uid(), t: '', note: '', done: false }, true)); };
        ti.addEventListener('input', () => { grow(ti); if (ti.value.trim()) make(); r.t = ti.value; saveSoon(); updBar(); });
        ti.addEventListener('blur', () => { if (!blank) save(); });
        ti.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const nx = tr.nextElementSibling; (nx ? nx.querySelector('.c-t') : ti).focus(); } });
        const openNote = () => { nv.hidden = true; ne.hidden = false; grow(ne); ne.focus(); };
        nv.addEventListener('click', openNote); nv.tabIndex = 0; nv.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); openNote(); } });
        ne.addEventListener('input', () => { grow(ne); if (ne.value.trim()) make(); r.note = ne.value; delete r.html; saveSoon(); });   // sửa ở bảng → note nổi lấy chữ mới
        ne.addEventListener('blur', () => { if (r.note !== ne.value) delete r.html; r.note = ne.value; ne.hidden = true; nv.hidden = false; linkify(nv, r.note); if (!r.note && !blank) nv.append($('span', 'ph', 'Bấm để ghi lưu ý, dán link…')); if (!blank) save(); });
        cb.addEventListener('change', () => { r.done = cb.checked; tr.classList.toggle('done', r.done); save(); updBar(); });
        x.addEventListener('click', () => { f.rows = f.rows.filter(y => y !== r); tr.remove(); save(); updBar(); });
        setTimeout(() => grow(ti), 0);
        return tr;
      };
      f.rows.forEach(r => sheet.append(rowEl(r, false)));
      sheet.append(rowEl({ id: uid(), t: '', note: '', done: false }, true));
      M.append(sheet, $('div', 'pj-hint', 'Bấm vào ô để sửa · Enter xuống dòng dưới · tự lưu'));
    }
    D.append(S, M); W.append(D);
  }

  function render(force) {
    if (!ready || (!force && editing())) return;
    const W = $('div', 'pj-wrap'), p = openId && proj();
    if (p) detail(W, p); else { openId = null; board(W); }
    root.replaceChildren(W);
  }
  chrome.storage.local.get('projBoard').then(({ projBoard }) => {
    if (projBoard && Array.isArray(projBoard.projects)) data = projBoard;
    if (migrate()) save();
    ready = true; render(true);
  }).catch(() => { ready = true; render(true); });
  let pend = null;
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local' || !ch.projBoard || !ch.projBoard.newValue) return;
    const v = ch.projBoard.newValue, js = JSON.stringify(v);
    if (js === lastSaved || js === JSON.stringify(data)) return;   // của chính trang này
    if (editing()) { pend = v; return; }                            // tab khác vừa sửa: đợi gõ xong mới nạp
    data = v; migrate(); lastSaved = JSON.stringify(data); render();
  });
  root.addEventListener('focusout', () => setTimeout(() => { if (pend && !editing()) { data = pend; pend = null; migrate(); lastSaved = JSON.stringify(data); render(true); } }, 0));
})();
