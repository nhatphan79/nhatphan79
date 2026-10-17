// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📋 Trang Dự án trong Tab mới (chỉ máy chủ app): bảng thẻ 3 cột (Đang làm / Tạm dừng / Xong), kéo thả đổi cột.
// V1.22–23: chi tiết dự án gọn – tên + thư mục con (đổi tên, xoá); mỗi thư mục là 1 bảng kiểu Excel
//        (☐ · Hạng mục con · Lưu ý), nền vàng như note dán, bấm ô là sửa, tự lưu, link trong Lưu ý bấm được.
// Lưu chrome.storage.local['projBoard'].
(() => {
  const root = document.getElementById('proj'); if (!root) return;
  const COLS = [['doing', 'Đang làm', '#E08A00'], ['pause', 'Tạm dừng', '#9AA1B5'], ['done', 'Xong', '#2E8B57']];
  let data = { projects: [] }, openId = null, openFolder = null, selRow = null, showHidden = false, ready = false;
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
  const editing = () => { const a = document.activeElement; return a && root.contains(a) && (a.isContentEditable || (/INPUT|TEXTAREA/.test(a.tagName) && !/checkbox|date/.test(a.type || ''))); };
  // V1.31: 🔔 đưa việc trong dự án sang Todo của HaoHao (chrome.storage.local.todos) để HaoHao nhắc; tick 2 bên tự khớp
  let todos = [];
  const saveTodos = () => chrome.storage.local.set({ todos }).catch(() => {});
  const todoOf = r => r && r.todoId ? todos.find(t => t.id === r.todoId) : null;
  function todoSync() {   // Todo HaoHao → dự án: tick / xoá bên HaoHao thì dự án theo
    let ch = false;
    for (const p of data.projects) for (const f of p.folders || []) for (const r of f.rows || []) {
      if (!r.todoId) continue;
      const t = todos.find(x => x.id === r.todoId);
      if (!t) { delete r.todoId; ch = true; continue; }
      if (!!t.done !== !!r.done) { r.done = !!t.done; ch = true; }
    }
    for (const p of data.projects) if (p.remindId && !todos.some(t => t.id === p.remindId && !t.done)) { delete p.remindId; ch = true; }   // V1.34: nhắc đã xong / bị xoá bên HaoHao
    return ch;
  }
  const newFolder = n => ({ id: uid(), name: n, rows: [], v28: 1, v29: 1 });
  const escH = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // V1.22: chuyển dữ liệu cũ (việc cần làm / ghi chú / link) vào bảng – không mất gì
  // V1.26: 5 mảng chính – 4 mảng cố định + mảng tự thêm (tên tuỳ ý)
  const AREAS0 = [
    { id: 'house', name: 'Xây dựng nhà phố', icon: '🏠', color: '#D9822B' },
    { id: 'app', name: 'APP HaoHao', icon: '🐹', color: '#E0A100' },
    { id: 'trade', name: 'Trade', icon: '📈', color: '#2E8B57' },
    { id: 'air', name: 'Airdrop', icon: '🪂', color: '#3B6FD8' }];
  const FREE_COLORS = ['#8B5CF6', '#DB2777', '#0D9488', '#64748B', '#B45309'];
  const areas = () => data.areas;
  const curArea = () => areas().find(a => a.id === data.cur) || areas()[0];
  function migrate() {
    let ch = false;
    if (!Array.isArray(data.areas) || !data.areas.length) { data.areas = AREAS0.map(a => ({ ...a })); ch = true; }
    for (const a of AREAS0) if (!data.areas.some(x => x.id === a.id)) { data.areas.splice(AREAS0.indexOf(a), 0, { ...a }); ch = true; }
    if (!data.cur || !data.areas.some(a => a.id === data.cur)) { data.cur = data.areas[0].id; ch = true; }
    for (const p of data.projects) if (!p.area || !data.areas.some(a => a.id === p.area)) { p.area = /hao\s*hao/i.test(p.name || '') ? 'app' : data.cur; ch = true; }
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
      // V1.28: dòng = việc cần làm + Link + Thư mục; chữ ở cột Lưu ý cũ chuyển xuống note làm việc của thư mục (không mất)
      for (const f of p.folders) {
        if (f.v28) continue;
        let add = '';
        for (const r of f.rows || []) {
          const n = (r.note || '').trim(), m = n.match(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/i);
          if (m && !r.link) r.link = /^https?:/i.test(m[0]) ? m[0] : 'https://' + m[0];
          const rest = (m ? n.replace(m[0], '') : n).trim();
          if (r.html && r.html.replace(/<[^>]+>/g, '').trim()) add += `<div><b>${escH(r.t || '')}</b></div>${r.html}`;
          else if (rest) add += `<div><b>${escH(r.t || '')}:</b> ${escH(rest)}</div>`;
          delete r.note; delete r.html; delete r.tidyAsked;
        }
        if (add) f.html = (f.html || '') + add;
        f.v28 = 1; ch = true;
      }
      // V1.29: note theo từng việc (r.html, r.color); note chung của thư mục chuyển vào việc đầu tiên
      for (const f of p.folders) {
        if (f.v29) continue;
        const h = (f.html || '').trim();
        if (h && h.replace(/<[^>]+>/g, '').trim() || /<img/i.test(h)) {
          let r0 = (f.rows || []).find(r => (r.t || '').trim());
          if (!r0) { r0 = { id: uid(), t: 'Ghi chú', done: false }; (f.rows = f.rows || []).push(r0); }
          r0.html = (r0.html || '') + h; if (f.color && !r0.color) r0.color = f.color;
        }
        delete f.html; delete f.color; f.v29 = 1; ch = true;
      }
    }
    return ch;
  }

  function newProject() {
    const p = { id: uid(), name: 'Dự án mới', area: curArea().id, col: 'doing', start: today(), due: '', at: Date.now(), folders: [newFolder('Việc chính')] };
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
  // V1.30: mục 0. Vốn đầu tư – sổ Nguồn thu / Nguồn chi của dự án (p.money). Có số liệu thì bảng tổng tự lấy:
  //        Vốn đầu tư = tổng chi, Lãi/lỗ = tổng thu − tổng chi.
  const MONEY = '$money';
  const tot = L => (L || []).reduce((a, x) => a + (Number(x.v) || 0), 0);
  const ledger = p => p.money && ((p.money.thu || []).some(x => x.v) || (p.money.chi || []).some(x => x.v));
  const vonOf = p => ledger(p) ? tot(p.money.chi) : (Number(p.von) || 0);
  const laiOf = p => ledger(p) ? tot(p.money.thu) - tot(p.money.chi) : (Number(p.lai) || 0);
  const sum = (L, k) => L.reduce((a, p) => a + (k === 'von' ? vonOf(p) : k === 'lai' ? laiOf(p) : (Number(p[k]) || 0)), 0);
  function areaBar(W) {
    const bar = $('div', 'pj-areas'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Các mảng dự án');
    areas().forEach(a => {
      const L = data.projects.filter(p => p.area === a.id), on = a.id === curArea().id, lai = sum(L, 'lai');
      const t = $('button', 'pj-area' + (on ? ' on' : '')); t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', on); t.style.setProperty('--ac', a.color);
      const ic = $('span', 'ai', a.icon), tx = $('div', 'at');
      tx.append($('b', '', a.name), $('small', '', L.length + ' dự án · ' + L.filter(p => p.col === 'doing').length + ' đang làm'));
      if (lai) tx.append($('span', 'al' + (lai > 0 ? ' pos' : ' neg'), (lai > 0 ? 'Lãi +' : 'Lỗ ') + money(lai)));
      t.append(ic, tx);
      t.addEventListener('click', () => { if (data.cur !== a.id) { data.cur = a.id; save(); render(true); } });
      bar.append(t);
    });
    // mảng 5: tự thêm, tên tuỳ ý
    const nw = $('button', 'pj-area add'); nw.append($('span', 'ai', '＋'), $('div', 'at', ''));
    nw.querySelector('.at').append($('b', '', 'Thêm mảng'), $('small', '', 'Đặt tên tự do'));
    nw.addEventListener('click', () => {
      const box = $('div', 'pj-area add ed'), inp = $('input', 'pj-in'); inp.placeholder = 'Tên mảng mới…'; inp.setAttribute('aria-label', 'Tên mảng mới');
      let done = false; const ok = keep => { if (done) return; done = true; const n = inp.value.trim();
        if (keep && n) { const id = 'a' + uid(), k = data.areas.length - AREAS0.length; data.areas.push({ id, name: n, icon: '📁', color: FREE_COLORS[k % FREE_COLORS.length], free: true }); data.cur = id; save(); }
        render(true); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(true); if (e.key === 'Escape') ok(false); }); inp.addEventListener('blur', () => ok(true));
      box.append(inp); nw.replaceWith(box); inp.focus();
    });
    bar.append(nw); W.append(bar);
  }
  // V1.34: ⏰ hẹn ngày nhắc cho dự án (vd hạn claim airdrop) → tạo việc có giờ trong Todo HaoHao, tới giờ HaoHao báo
  const whenTxt = d => { const x = new Date(d); return isNaN(x) ? d : x.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); };
  function remindDlg(p) {
    root.querySelectorAll('.pj-need').forEach(x => x.remove());
    const old = todos.find(t => t.id === p.remindId);
    const bg = $('div', 'pj-need'), cd = $('div', 'pj-needc'); cd.setAttribute('role', 'dialog'); cd.setAttribute('aria-label', 'Hẹn nhắc');
    const tx = $('input', 'pj-in'); tx.value = old ? old.text.replace(' · ' + p.name, '') : (p.area === 'air' ? 'Claim' : ''); tx.placeholder = 'Nhắc việc gì? (vd: Claim, nộp hồ sơ, gọi khách)'; tx.setAttribute('aria-label', 'Nội dung nhắc');
    const dt = $('input', 'pj-in'); dt.type = 'datetime-local'; dt.setAttribute('aria-label', 'Ngày giờ nhắc');
    if (old && old.due) dt.value = old.due.slice(0, 16); else { const d = new Date(Date.now() + 864e5); d.setHours(9, 0, 0, 0); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); dt.value = d.toISOString().slice(0, 16); }
    const quick = $('div', 'pj-rmq'); [['Mai 9h', 1], ['3 ngày', 3], ['1 tuần', 7], ['1 tháng', 30]].forEach(([lb, n]) => { const b = $('button', 'pj-chipq', lb); b.type = 'button'; b.addEventListener('click', () => { const d = new Date(Date.now() + n * 864e5); d.setHours(9, 0, 0, 0); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); dt.value = d.toISOString().slice(0, 16); }); quick.append(b); });
    const ok = $('button', 'pj-btn', '⏰ Lưu nhắc'), no = $('button', 'pj-btn ghost', 'Huỷ'), off = $('button', 'pj-x', 'Bỏ nhắc'); off.hidden = !old;
    const close = () => bg.remove();
    ok.addEventListener('click', () => {
      if (!dt.value) return dt.focus(); const text = (tx.value.trim() || 'Nhắc') + ' · ' + p.name;
      if (old) Object.assign(old, { text, due: dt.value, notified: false, done: false });
      else { const id = 't' + Date.now().toString(36); todos.push({ id, text, done: false, due: dt.value, notified: false, pj: p.id }); p.remindId = id; }
      saveTodos(); save(); close(); render(true); toast('⏰ Đã hẹn ' + whenTxt(dt.value) + ' – HaoHao sẽ nhắc');
    });
    off.addEventListener('click', () => { todos = todos.filter(t => t !== old); delete p.remindId; saveTodos(); save(); close(); render(true); toast('Đã bỏ nhắc'); });
    no.addEventListener('click', close); bg.addEventListener('click', e => { if (e.target === bg) close(); });
    cd.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && e.target.tagName === 'INPUT') ok.click(); });
    const row = $('div', 'pj-needb'); const sp = $('div'); sp.style.flex = '1'; row.append(off, sp, no, ok);
    cd.append($('div', 'pj-needt', '⏰ Hẹn nhắc · ' + (p.name || '')), $('div', 'pj-needn', 'Nhắc việc'), tx, $('div', 'pj-needn', 'Ngày giờ'), dt, quick,
      $('div', 'pj-needn', 'Tới giờ HaoHao sẽ hiện thông báo. Việc này cũng nằm trong Todo HaoHao.'), row);
    bg.append(cd); root.append(bg); tx.focus(); tx.select();
  }
  function board(W) {
    areaBar(W);
    const A = curArea(), PL = data.projects.filter(p => p.area === A.id);
    const top = $('div', 'pj-top pj-atop'), add = $('button', 'pj-btn', '＋ Dự án mới'); add.addEventListener('click', newProject);
    const h = $('h1'); h.append($('span', 'hi', A.icon), A.name); h.style.setProperty('--ac', A.color);
    top.append(h);
    if (A.free) {   // mảng tự thêm: đổi tên / xoá (chỉ xoá khi trống)
      const ed = $('button', 'pj-x', '✏️ Đổi tên'); ed.addEventListener('click', () => {
        const inp = $('input', 'pj-in pj-ren'); inp.value = A.name; let done = false;
        const ok = keep => { if (done) return; done = true; const n = inp.value.trim(); if (keep && n) { A.name = n; save(); } render(true); };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(true); if (e.key === 'Escape') ok(false); }); inp.addEventListener('blur', () => ok(true));
        h.replaceWith(inp); inp.focus(); inp.select(); });
      const dl = $('button', 'pj-x', '🗑 Xoá mảng'); dl.disabled = PL.length > 0; dl.title = PL.length ? 'Chuyển hoặc xoá hết dự án trong mảng trước' : 'Xoá mảng này';
      dl.addEventListener('click', () => { if (PL.length) return; data.areas = data.areas.filter(x => x !== A); data.cur = data.areas[0].id; save(); render(true); });
      top.append(ed, dl);
    }
    top.append(add); W.append(top);
    const T = $('div', 'pj-list'); T.setAttribute('role', 'table'); T.setAttribute('aria-label', 'Danh sách dự án');
    const hd = $('div', 'pj-lr hd'); hd.setAttribute('role', 'row');
    ['STT', 'Tên dự án', 'Bắt đầu', 'Kết thúc', 'Tiến độ', 'Trạng thái', 'Vốn đầu tư', 'Lãi / lỗ', ''].forEach(t => hd.append($('div', 'c', t)));
    T.append(hd);
    // V1.34: 👁 ẩn dự án đã xong / không cần xem (p.hidden) – mặc định không hiện; ✕ xoá dự án (bấm 2 lần)
    const nHid = PL.filter(p => p.hidden).length, VL = showHidden ? PL : PL.filter(p => !p.hidden);
    VL.forEach((p, i) => {
      const r = $('div', 'pj-lr st-' + p.col + (p.hidden ? ' hid' : '')); r.setAttribute('role', 'row');
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
      const vc = $('div', 'c'), lc = $('div', 'c');
      if (ledger(p)) {   // V1.30: lấy từ mục 0. Vốn đầu tư
        const go = () => { openId = p.id; openFolder = MONEY; render(true); window.scrollTo({ top: 0 }); };
        const vb = $('button', 'pj-money pj-calc', money(vonOf(p)) || '0'), l = laiOf(p), lb = $('button', 'pj-money pj-calc lai' + (l > 0 ? ' pos' : l < 0 ? ' neg' : ''), (l > 0 ? '+' : '') + (money(l) || '0'));
        vb.title = lb.title = 'Tính từ mục 0. Vốn đầu tư – bấm để xem thu / chi'; vb.addEventListener('click', go); lb.addEventListener('click', go);
        vc.append(vb); lc.append(lb);
      } else { vc.append(moneyInput(p, 'von')); lc.append(moneyInput(p, 'lai', 'lai')); }
      const ac = $('div', 'c c-act');
      const eye = $('button', 'pj-ic2', p.hidden ? '🙈' : '👁'); eye.title = p.hidden ? 'Hiện lại dự án' : 'Ẩn dự án cho gọn'; eye.setAttribute('aria-label', (p.hidden ? 'Hiện lại ' : 'Ẩn ') + p.name);
      eye.addEventListener('click', () => { p.hidden = !p.hidden; save(); render(true); });
      const del = $('button', 'pj-ic2 del', '✕'); del.title = 'Xoá dự án'; del.setAttribute('aria-label', 'Xoá ' + p.name); let arm = false;
      del.addEventListener('click', () => {
        if (!arm) { arm = true; del.textContent = 'Xoá?'; del.classList.add('arm'); setTimeout(() => { arm = false; del.textContent = '✕'; del.classList.remove('arm'); }, 3000); return; }
        const ids = new Set(p.folders.flatMap(f => (f.rows || []).map(x => x.todoId).filter(Boolean)));   // việc đã đưa sang Todo HaoHao thì xoá theo
        if (ids.size) { todos = todos.filter(t => !ids.has(t.id)); saveTodos(); }
        data.projects = data.projects.filter(x => x !== p); save(); render(true); toast('🗑 Đã xoá dự án “' + (p.name || '') + '”');
      });
      const rm = todos.find(t => t.id === p.remindId), al = $('button', 'pj-ic2' + (rm ? ' on' : ''), '⏰'); al.title = rm ? 'Sửa nhắc hẹn' : 'Hẹn ngày nhắc (HaoHao nhắc đúng giờ)'; al.setAttribute('aria-label', 'Hẹn nhắc cho ' + p.name);
      al.addEventListener('click', () => remindDlg(p));
      if (rm && rm.due) { const ch = $('button', 'pj-rmchip', '⏰ ' + whenTxt(rm.due) + ' · ' + rm.text.replace(' · ' + p.name, '')); ch.title = 'Sửa nhắc'; ch.addEventListener('click', () => remindDlg(p)); nmc.append(ch); }
      ac.append(al, eye, del);
      r.append(no, nmc, ds, de, pc, sc, vc, lc, ac); T.append(r);
    });
    if (!VL.length) T.append($('div', 'pj-empty', PL.length ? 'Các dự án trong mảng này đang ẩn' : 'Mảng này chưa có dự án · bấm ＋ Dự án mới'));
    else {
      const ft = $('div', 'pj-lr ft'), tv = $('div', 'c c-sum'), tl = $('div', 'c c-sum');
      ft.append($('div', 'c'), $('div', 'c', nHid && !showHidden ? 'Tổng (gồm cả ' + nHid + ' dự án ẩn)' : 'Tổng'), $('div', 'c'), $('div', 'c'), $('div', 'c'), $('div', 'c'), tv, tl, $('div', 'c'));
      updTotal = () => {
        const sv = sum(PL, 'von'), sl = sum(PL, 'lai');
        tv.textContent = money(sv) || '0'; tl.textContent = (sl > 0 ? '+' : '') + (money(sl) || '0'); tl.className = 'c c-sum' + (sl > 0 ? ' pos' : sl < 0 ? ' neg' : '');
      };
      updTotal(); T.append(ft);
    }
    W.append(T);
    if (nHid) { const hb = $('button', 'pj-hidbtn', showHidden ? '🙈 Ẩn lại ' + nHid + ' dự án đã ẩn' : '👁 Hiện ' + nHid + ' dự án đã ẩn'); hb.addEventListener('click', () => { showHidden = !showHidden; render(true); }); W.append(hb); }
    quickLinks(W, A);
  }
  // V1.32: 🔗 lối tắt trang web riêng cho từng mảng (giống hàng lối tắt ở trang chủ) – lưu area.links
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const favicon = u => { try { const x = new URL(chrome.runtime.getURL('/_favicon/')); x.searchParams.set('pageUrl', u); x.searchParams.set('size', '64'); return x.toString(); } catch { return ''; } };
  function quickLinks(W, A) {
    if (!Array.isArray(A.links)) A.links = [];
    const box = $('section', 'pj-ql'); box.setAttribute('aria-label', 'Lối tắt ' + A.name);
    box.append($('div', 'pj-qlh', '🔗 Lối tắt · ' + A.name));
    const row = $('div', 'pj-qls');
    A.links.forEach((l, i) => {
      const a = $('a', 'pj-site'); a.href = l.u; a.target = '_blank'; a.rel = 'noopener'; a.title = (l.t || hostOf(l.u)) + '\n' + l.u;
      const ic = $('span', 'ic'), im = $('img'); im.alt = ''; im.src = favicon(l.u); im.addEventListener('error', () => { im.remove(); ic.textContent = (l.t || hostOf(l.u)).slice(0, 1).toUpperCase(); }); ic.append(im);
      const lb = $('span', 'lb', l.t || hostOf(l.u));
      const x = $('button', 'rm', '✕'); x.type = 'button'; x.title = 'Xoá lối tắt'; x.setAttribute('aria-label', 'Xoá ' + (l.t || hostOf(l.u)));
      x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); A.links.splice(i, 1); save(); render(true); });
      a.append(ic, lb, x); row.append(a);
    });
    const add = $('button', 'pj-site add'); add.type = 'button'; add.append($('span', 'ic', '＋'), $('span', 'lb', 'Thêm')); add.title = 'Thêm lối tắt cho mảng ' + A.name;
    const form = $('form', 'pj-qlf'); form.hidden = true;
    const tn = $('input', 'pj-in'); tn.placeholder = 'Tên (vd: Bảng giá thép)'; tn.setAttribute('aria-label', 'Tên lối tắt');
    const tu = $('input', 'pj-in'); tu.placeholder = 'Link trang web'; tu.setAttribute('aria-label', 'Link'); tu.inputMode = 'url';
    const ok = $('button', 'pj-btn', 'Thêm'); ok.type = 'submit'; const no = $('button', 'pj-btn ghost', 'Huỷ'); no.type = 'button';
    form.append(tn, tu, ok, no);
    add.addEventListener('click', () => { form.hidden = false; tu.focus(); });
    no.addEventListener('click', () => { form.hidden = true; });
    form.addEventListener('submit', e => {
      e.preventDefault(); let u = tu.value.trim(); if (!u) return tu.focus();
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { new URL(u); } catch { return tu.focus(); }
      A.links.push({ id: uid(), t: tn.value.trim() || hostOf(u), u }); save(); render(true);
    });
    row.append(add); box.append(row, form); W.append(box);
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
  const toast = t => { let el = root.querySelector('.pj-toast'); if (!el) { el = $('div', 'pj-toast'); el.setAttribute('role', 'status'); root.append(el); } el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 3200); };
  // V1.33: 📁 đường dẫn trên máy (D:\…) → mở thư mục trong tab Chrome (file:///…). Chrome chưa cho HaoHao đọc file trên máy
  //        thì hiện bảng hướng dẫn bật "Cho phép truy cập vào URL tệp" kèm nút mở thẳng trang cài đặt của HaoHao.
  const fileUrl = v => 'file:///' + v.trim().replace(/^file:\/+/i, '').replace(/\\/g, '/').split('/').map(x => encodeURIComponent(x).replace(/%3A/gi, ':')).join('/') + (/[\\/]$/.test(v.trim()) ? '' : '/');
  const fileOk = () => new Promise(res => { try { chrome.extension.isAllowedFileSchemeAccess(ok => res(!!ok)); } catch { res(false); } });
  async function openDir(v, ref) {
    if (ref) chrome.storage.local.set({ pjDirPick: { ...ref, at: Date.now() } }).catch(() => {});   // V1.35: tab thư mục hiện nút 💾 Lưu thư mục này (pjdir.js)
    if (await fileOk()) { chrome.tabs.create({ url: fileUrl(v) }).catch(() => toast('⚠ Không mở được thư mục này – kiểm tra lại đường dẫn')); return; }
    try { await navigator.clipboard.writeText(v); } catch {}
    root.querySelectorAll('.pj-need').forEach(x => x.remove());
    const bg = $('div', 'pj-need'), cd = $('div', 'pj-needc'); cd.setAttribute('role', 'dialog'); cd.setAttribute('aria-label', 'Cần bật quyền mở thư mục');
    const ext = 'chrome://extensions/?id=' + chrome.runtime.id;
    const go = $('button', 'pj-btn', '⚙️ Mở trang cài đặt HaoHao'); go.addEventListener('click', () => { chrome.tabs.create({ url: ext }).catch(() => {}); bg.remove(); });
    const x = $('button', 'pj-btn ghost', 'Để sau'); x.addEventListener('click', () => bg.remove());
    const st = $('ol', 'pj-needs');
    [['Bấm nút ', '⚙️ Mở trang cài đặt HaoHao', ' bên dưới.'], ['Kéo xuống, bật ', 'Cho phép truy cập vào URL tệp', ' (Allow access to file URLs).'], ['Quay lại đây, bấm ', '📁', ' lần nữa là thư mục mở ra.']]
      .forEach(([a, b, c]) => { const li = $('li'); li.append(a, $('b', '', b), c); st.append(li); });
    const lk = $('code', 'pj-needl', ext);
    cd.append($('div', 'pj-needt', '📁 Cần bật 1 lần để mở thư mục'), st, $('div', 'pj-needn', 'Hoặc dán link này vào thanh địa chỉ Chrome:'), lk,
      $('div', 'pj-needn', 'Đường dẫn thư mục đã được chép sẵn – muốn mở bằng File Explorer thì bấm Win + E, Ctrl + L, Ctrl + V.'));
    const row = $('div', 'pj-needb'); row.append(x, go); cd.append(row); bg.append(cd);
    bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
    root.append(bg); go.focus();
  }
  const grow = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

  // V1.30: 💰 mục 0. Vốn đầu tư – 3 ô tổng (Thu · Chi = vốn · Lãi/lỗ) + 2 bảng Nguồn thu / Nguồn chi (Ngày · Nội dung · Số tiền)
  function moneyView(M, p) {
    if (!p.money) p.money = { thu: [], chi: [] };
    const fh = $('div', 'pj-fh'); fh.append('💰', $('b', 'pj-f0t', 'Vốn đầu tư')); M.append(fh);
    const cards = $('div', 'pj-mcards'), cT = $('div', 'pj-mc thu'), cC = $('div', 'pj-mc chi'), cL = $('div', 'pj-mc lai');
    cards.append(cT, cC, cL); M.append(cards);
    const upd = () => {
      const t = tot(p.money.thu), c = tot(p.money.chi), l = t - c;
      cT.replaceChildren($('span', '', 'Tổng thu'), $('b', '', money(t) || '0'));
      cC.replaceChildren($('span', '', 'Tổng chi · vốn đầu tư'), $('b', '', money(c) || '0'));
      cL.replaceChildren($('span', '', l < 0 ? 'Lỗ' : 'Lãi'), $('b', '', (l > 0 ? '+' : '') + (money(l) || '0'))); cL.className = 'pj-mc lai' + (l > 0 ? ' pos' : l < 0 ? ' neg' : '');
      const sm = root.querySelector('.pj-f0 small'); if (sm) { sm.textContent = ledger(p) ? (l > 0 ? '+' : '') + money(l) : ''; sm.className = 'pj-l0' + (l > 0 ? ' pos' : l < 0 ? ' neg' : ''); }
    };
    const book = (key, title, ic) => {
      const L = p.money[key] = p.money[key] || [];
      const box = $('div', 'pj-book ' + key), h = $('div', 'pj-bh'), st = $('b', 'pj-bs');
      h.append($('span', '', ic + ' ' + title), st); box.append(h);
      const sheet = $('div', 'pj-sheet pj-ms'); sheet.setAttribute('role', 'table'); sheet.setAttribute('aria-label', title);
      const hd = $('div', 'pj-mr hd'); ['STT', 'Ngày', 'Nội dung', 'Số tiền', ''].forEach(t => hd.append($('div', 'c', t))); sheet.append(hd);
      const subt = () => { st.textContent = money(tot(L)) || '0'; upd(); };
      const renum = () => sheet.querySelectorAll('.pj-mr:not(.hd)').forEach((r, i) => { r.firstChild.textContent = r.classList.contains('blank') ? '' : i + 1; });
      const rowEl = (x, blank) => {
        const r = $('div', 'pj-mr' + (blank ? ' blank' : '')); r.setAttribute('role', 'row');
        const no = $('div', 'c c-no'), dc = $('div', 'c'), d = $('input', 'pj-date'); d.type = 'date'; d.value = x.d || ''; dc.append(d);
        const tc = $('div', 'c'), t = $('input', 'pj-mt'); t.value = x.t || ''; t.placeholder = blank ? (key === 'thu' ? 'Thêm khoản thu…' : 'Thêm khoản chi…') : ''; t.setAttribute('aria-label', 'Nội dung'); tc.append(t);
        const vc = $('div', 'c'), v = $('input', 'pj-money'); v.inputMode = 'numeric'; v.value = money(x.v); v.placeholder = '0'; v.setAttribute('aria-label', 'Số tiền'); vc.append(v);
        const xc = $('div', 'c c-x'), del = $('button', 'pj-x', '✕'); del.setAttribute('aria-label', 'Xoá dòng'); del.hidden = blank; xc.append(del);
        r.append(no, dc, tc, vc, xc);
        const make = () => { if (!blank) return; blank = false; r.classList.remove('blank'); if (!x.d) { x.d = today(); d.value = x.d; } L.push(x); del.hidden = false; t.placeholder = ''; sheet.append(rowEl({ id: uid(), d: '', t: '', v: null }, true)); renum(); };
        t.addEventListener('input', () => { if (t.value.trim()) make(); x.t = t.value; saveSoon(); });
        v.addEventListener('input', () => { const n = parseMoney(v.value); if (n != null) make(); x.v = n == null ? null : Math.abs(n); saveSoon(); subt(); });
        v.addEventListener('focus', () => v.select()); v.addEventListener('blur', () => { v.value = money(x.v); if (!blank) save(); });
        t.addEventListener('blur', () => { if (!blank) save(); }); t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); v.focus(); } });
        v.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const nx = r.nextElementSibling; if (nx) nx.querySelector('.pj-mt').focus(); } });
        d.addEventListener('change', () => { x.d = d.value; if (!blank) save(); });
        del.addEventListener('click', () => { const k = L.indexOf(x); if (k >= 0) L.splice(k, 1); r.remove(); save(); subt(); renum(); });
        return r;
      };
      L.forEach(x => sheet.append(rowEl(x, false))); sheet.append(rowEl({ id: uid(), d: '', t: '', v: null }, true)); renum();
      box.append(sheet); subt(); return box;
    };
    const two = $('div', 'pj-books'); two.append(book('thu', 'Nguồn thu', '⬇️'), book('chi', 'Nguồn chi', '⬆️')); M.append(two);
    M.append($('div', 'pj-hint', 'Lãi / lỗ = tổng thu − tổng chi · Vốn đầu tư = tổng chi · số liệu tự đưa ra bảng dự án bên ngoài · tự lưu'));
    upd();
  }

  function detail(W, p) {
    const top = $('div', 'pj-top'), back = $('button', 'pj-btn ghost', '← Về bảng dự án');
    back.addEventListener('click', () => { openId = null; render(true); });
    const del = $('button', 'pj-x', '🗑 Xoá dự án'); let armed = false;
    del.addEventListener('click', () => { if (!armed) { armed = true; del.textContent = 'Bấm lần nữa để xoá hẳn'; setTimeout(() => { armed = false; del.textContent = '🗑 Xoá dự án'; }, 3000); return; } data.projects = data.projects.filter(x => x !== p); save(); openId = null; render(true); });
    // V1.26: chuyển dự án sang mảng khác
    const am = $('select', 'pj-st pj-amove'); am.setAttribute('aria-label', 'Mảng'); areas().forEach(a => { const o = $('option', '', a.icon + ' ' + a.name); o.value = a.id; o.selected = a.id === p.area; am.append(o); });
    am.addEventListener('change', () => { p.area = am.value; data.cur = am.value; save(); });
    const sp = $('div'); sp.style.flex = '1'; top.append(back, am, sp, del); W.append(top);
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
    { // V1.30: mục 0 cố định ở mọi dự án
      const it = $('div', 'pj-fi pj-f0' + (openFolder === MONEY ? ' on' : '')), b = $('button', openFolder === MONEY ? 'on' : '');
      const l = laiOf(p); b.append($('span', 'pj-no', '0.'), 'Vốn đầu tư', $('small', 'pj-l0' + (l > 0 ? ' pos' : l < 0 ? ' neg' : ''), ledger(p) ? (l > 0 ? '+' : '') + money(l) : ''));
      b.addEventListener('click', () => { if (openFolder !== MONEY) { openFolder = MONEY; render(true); } });
      it.append(b); FL.append(it);
    }
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
    if (openFolder === MONEY) moneyView(M, p);
    else if (!f) M.append($('div', 'pj-empty', 'Gõ tên thư mục con ở cột bên trái rồi Enter để bắt đầu.'));
    else {
      if (!Array.isArray(f.rows)) f.rows = [];
      const fh = $('div', 'pj-fh'), fn = $('input'); fn.value = f.name; fn.setAttribute('aria-label', 'Tên thư mục con');
      fn.addEventListener('change', () => { f.name = fn.value.trim() || f.name; save(); render(true); });
      const fd = $('button', 'pj-x', 'Xoá thư mục'); let arm = false;
      fd.addEventListener('click', () => { if (!arm && f.rows.some(real)) { arm = true; fd.textContent = 'Bấm lần nữa để xoá'; setTimeout(() => { arm = false; fd.textContent = 'Xoá thư mục'; }, 3000); return; } delFolder(f); });
      fh.append('📂', fn, fd); M.append(fh);

      let pick = () => {}, syncTitle = () => {};
      // V1.28: danh sách việc đánh số · Link · Thư mục (biểu tượng gọn, bấm là mở)
      const sheet = $('div', 'pj-sheet'); sheet.setAttribute('role', 'table'); sheet.setAttribute('aria-label', 'Việc cần làm ' + f.name);
      const hd = $('div', 'pj-r hd'); hd.setAttribute('role', 'row');
      hd.append($('div', 'c c-no', 'STT'), $('div', 'c c-k', '✓'), $('div', 'c', 'Việc cần làm'), $('div', 'c c-ln', 'Link'), $('div', 'c c-ln', 'Thư mục'), $('div', 'c c-bell', 'Nhắc'), $('div', 'c c-x', '')); sheet.append(hd);
      const renum = () => sheet.querySelectorAll('.pj-r:not(.hd)').forEach((tr, i) => { const c = tr.querySelector('.c-no'); if (c) c.textContent = tr.classList.contains('blank') ? '' : i + 1; });
      // ô Link / Thư mục: có giá trị → biểu tượng bấm mở (✏️ sửa khi rê chuột); trống → ＋ để dán
      const chipCell = (r, key, blankRow) => {
        const c = $('div', 'c c-ln'); const isUrl = v => /^(https?:\/\/|www\.)/i.test(v);
        const show = () => {
          c.replaceChildren(); const v = (r[key] || '').trim(); if (blankRow()) return;
          if (!v) { const a = $('button', 'pj-chip add', '＋'); a.title = key === 'link' ? 'Dán link' : 'Dán link thư mục Drive hoặc đường dẫn trên máy (D:\\...)'; a.addEventListener('click', edit); c.append(a); return; }
          const ic = key === 'link' ? '🔗' : '📁', b = $('button', 'pj-chip', ic); b.title = v;
          b.addEventListener('click', () => { if (isUrl(v)) window.open(/^https?:/i.test(v) ? v : 'https://' + v, '_blank', 'noopener'); else openDir(v, { p: p.id, f: f.id, r: r.id }); });
          const e = $('button', 'pj-chip ed', '✏️'); e.title = 'Sửa'; e.addEventListener('click', edit);
          c.append(b, e);
        };
        const edit = () => {
          const i = $('input', 'pj-chin'); i.value = r[key] || ''; i.placeholder = key === 'link' ? 'Dán link…' : 'Link Drive hoặc D:\\…'; i.setAttribute('aria-label', key === 'link' ? 'Link' : 'Thư mục');
          let done = false; const ok = keep => { if (done) return; done = true; if (keep) { r[key] = i.value.trim(); save(); } c.classList.remove('editing'); show(); };
          i.addEventListener('keydown', e => { if (e.key === 'Enter') ok(true); if (e.key === 'Escape') ok(false); }); i.addEventListener('blur', () => ok(true));
          c.replaceChildren(i); c.classList.add('editing'); i.focus(); i.select();
        };
        c._show = show; show(); return c;
      };
      const rowEl = (r, blank) => {
        const tr = $('div', 'pj-r' + (blank ? ' blank' : '') + (r.done ? ' done' : '')); tr.setAttribute('role', 'row');
        const no = $('div', 'c c-no');
        const ck = $('div', 'c c-k'), cb = $('input'); cb.type = 'checkbox'; cb.checked = !!r.done; cb.setAttribute('aria-label', 'Xong'); cb.disabled = blank; ck.append(cb);
        const ct = $('div', 'c'), ti = $('textarea', 'c-t'); ti.rows = 1; ti.value = r.t || ''; ti.placeholder = blank ? 'Gõ việc mới…' : ''; ti.setAttribute('aria-label', 'Việc cần làm'); ct.append(ti);
        const lk = chipCell(r, 'link', () => blank), dr = chipCell(r, 'dir', () => blank);
        const bc = $('div', 'c c-bell'), bell = $('button', 'pj-bell'); bell.hidden = blank;
        const bellSt = () => { const on = !!todoOf(r); bell.classList.toggle('on', on); bell.textContent = '🔔'; bell.title = on ? 'Đang ở Todo HaoHao – bấm để bỏ' : 'Đưa sang Todo HaoHao để nhắc'; bell.setAttribute('aria-pressed', on); };
        bell.addEventListener('click', () => {
          const t = todoOf(r);
          if (t) { todos = todos.filter(x => x !== t); delete r.todoId; toast('Đã bỏ khỏi Todo HaoHao'); }
          else { if (!(r.t || '').trim()) return; const id = 't' + Date.now().toString(36); todos.push({ id, text: r.t.trim() + ' · ' + p.name, done: !!r.done, due: '', notified: false, pj: p.id }); r.todoId = id; toast('🔔 Đã đưa sang Todo HaoHao – bấm 🔔 bên đó để hẹn giờ nhắc'); }
          saveTodos(); save(); bellSt();
        });
        bellSt(); bc.append(bell);
        const cx = $('div', 'c c-x'), x = $('button', 'pj-x', '✕'); x.setAttribute('aria-label', 'Xoá việc'); x.hidden = blank; cx.append(x);
        tr.append(no, ck, ct, lk, dr, bc, cx); tr._r = r;
        // V1.29: bấm / gõ vào việc nào thì note bên dưới chuyển sang việc đó
        tr.addEventListener('focusin', () => { if (!blank) pick(r); });
        no.addEventListener('click', () => { if (!blank) { pick(r); ti.focus(); } });
        const make = () => { if (!blank) return; blank = false; tr.classList.remove('blank'); f.rows.push(r); cb.disabled = false; x.hidden = false; bell.hidden = false; ti.placeholder = ''; lk._show(); dr._show(); sheet.append(rowEl({ id: uid(), t: '', done: false }, true)); renum(); };
        ti.addEventListener('input', () => { grow(ti); const was = blank; if (ti.value.trim()) make(); r.t = ti.value; saveSoon(); updBar(); if (was && !blank) pick(r); else if (selRow === r.id) syncTitle(); });
        ti.addEventListener('blur', () => { if (!blank) { const t = todoOf(r); if (t && r.t.trim()) { t.text = r.t.trim() + ' · ' + p.name; saveTodos(); } save(); } });
        ti.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const nx = tr.nextElementSibling; (nx ? nx.querySelector('.c-t') : ti).focus(); } });
        cb.addEventListener('change', () => { r.done = cb.checked; tr.classList.toggle('done', r.done); const t = todoOf(r); if (t) { t.done = r.done; saveTodos(); } save(); updBar(); });
        x.addEventListener('click', () => { const t = todoOf(r); if (t) { todos = todos.filter(y => y !== t); saveTodos(); } f.rows = f.rows.filter(y => y !== r); tr.remove(); save(); updBar(); renum(); if (selRow === r.id) pick(f.rows.find(real) || null); });
        setTimeout(() => grow(ti), 0);
        return tr;
      };
      f.rows.forEach(r => sheet.append(rowEl(r, false)));
      sheet.append(rowEl({ id: uid(), t: '', done: false }, true)); renum();
      M.append(sheet);

      // V1.29: NOTE THEO TỪNG VIỆC – tiêu đề = tên việc (sửa ở đây thì bảng đổi theo), nội dung r.html, màu r.color
      const NC = { white: '#FFFFFF', yellow: '#FFF8D6', red: '#FFE4EA', blue: '#E3F1FF', green: '#E3F6E8', purple: '#F0E8FD' };
      const noteBox = $('div'); M.append(noteBox);
      let titleIn = null;
      syncTitle = () => { const r = f.rows.find(x => x.id === selRow); if (titleIn && r && document.activeElement !== titleIn) titleIn.value = r.t || ''; };
      pick = r => {
        if (r && selRow === r.id && noteBox.firstChild) return;
        selRow = r ? r.id : null;
        sheet.querySelectorAll('.pj-r:not(.hd)').forEach(tr => tr.classList.toggle('sel', !!r && tr._r === r));
        noteBox.replaceChildren(r ? buildNote(r) : $('div', 'pj-empty pj-nempty', 'Gõ một việc ở bảng trên, rồi bấm vào việc đó để ghi note.'));
      };
      const buildNote = r => {
        const idx = f.rows.filter(real).indexOf(r) + 1;
        const nt = $('div', 'pj-nt'); nt.style.setProperty('--nb', NC[r.color] || NC.white);
        const tb = $('div', 'pj-ntb');
        titleIn = $('input', 'pj-ntitle'); titleIn.value = r.t || ''; titleIn.placeholder = 'Tiêu đề…'; titleIn.setAttribute('aria-label', 'Tiêu đề note (tên việc)');
        titleIn.addEventListener('input', () => { r.t = titleIn.value; const tr = [...sheet.children].find(x => x._r === r); if (tr) { const t = tr.querySelector('.c-t'); t.value = r.t; grow(t); } saveSoon(); });
        titleIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ed.focus(); } });
        const dots = $('div', 'pj-dots'); Object.entries(NC).forEach(([k, v]) => { const d = $('button', 'pj-dot' + ((r.color || 'white') === k ? ' on' : '')); d.style.background = v; d.setAttribute('aria-label', 'Màu ' + k); d.addEventListener('click', () => { r.color = k; nt.style.setProperty('--nb', v); dots.querySelectorAll('.pj-dot').forEach(z => z.classList.toggle('on', z === d)); save(); }); dots.append(d); });
        const saved = $('span', 'pj-saved');
        tb.append($('span', 'pj-nno', idx ? String(idx) : '•'), titleIn, dots, saved);
        const ed = $('div', 'pj-nted'); ed.contentEditable = 'true'; ed.setAttribute('role', 'textbox'); ed.setAttribute('aria-multiline', 'true'); ed.setAttribute('aria-label', 'Nội dung note');
        ed.dataset.ph = 'Ghi chú cho việc này… (dán ảnh, link được)'; ed.innerHTML = r.html || '';
        let nts = 0; const saveNote = () => { r.html = ed.innerHTML.replace(/^(<br>|<div><br><\/div>)$/, ''); save(); saved.textContent = '✓ Đã lưu'; setTimeout(() => { saved.textContent = ''; }, 1200); };
        ed.addEventListener('input', () => { clearTimeout(nts); nts = setTimeout(saveNote, 500); });
        ed.addEventListener('blur', () => { clearTimeout(nts); saveNote(); });
        const cmds = [['bold', '<b>B</b>', 'Đậm'], ['italic', '<i>I</i>', 'Nghiêng'], ['underline', '<u>U</u>', 'Gạch chân'], ['strikeThrough', '<s>ab</s>', 'Gạch ngang'], ['insertUnorderedList', '☰', 'Danh sách']];
        const fmt = $('div', 'pj-fmt');
        cmds.forEach(([c, h, t]) => { const b = $('button', 'pj-fb'); b.innerHTML = h; b.title = t; b.setAttribute('aria-label', t); b.addEventListener('mousedown', e => e.preventDefault()); b.addEventListener('click', () => { ed.focus(); document.execCommand(c); clearTimeout(nts); nts = setTimeout(saveNote, 300); }); fmt.append(b); });
        const addImg = async file => {
          const url = await new Promise(rs => { const fr = new FileReader(); fr.onload = () => rs(fr.result); fr.readAsDataURL(file); });
          const im = await new Promise((rs, j) => { const i = new Image(); i.onload = () => rs(i); i.onerror = j; i.src = url; });
          const k = Math.min(1, 900 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ed.focus(); document.execCommand('insertHTML', false, `<img src="${cv.toDataURL('image/jpeg', 0.85)}">`); saveNote();
        };
        const fi = $('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true; fi.addEventListener('change', () => { if (fi.files[0]) addImg(fi.files[0]); fi.value = ''; });
        const ib = $('button', 'pj-fb', '🖼'); ib.title = 'Chèn ảnh'; ib.setAttribute('aria-label', 'Chèn ảnh'); ib.addEventListener('mousedown', e => e.preventDefault()); ib.addEventListener('click', () => fi.click()); fmt.append(ib, fi);
        ed.addEventListener('paste', e => {
          const img = [...(e.clipboardData.files || [])].find(x => /^image\//.test(x.type)); if (img) { e.preventDefault(); addImg(img); return; }
          const t = e.clipboardData.getData('text/plain'); if (!t) return; e.preventDefault();
          document.execCommand('insertHTML', false, escH(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>'));
        });
        ed.addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.href) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); } });   // link trong note: bấm là mở
        let prev = null; const undo = $('button', 'pj-fb wide', '↶ Hoàn tác'); undo.hidden = true;
        const tidy = $('button', 'pj-fb wide', '✨ Sắp xếp'); tidy.title = 'Sắp xếp nội dung cho gọn (Gemini)';
        tidy.addEventListener('click', async () => {
          const txt = ed.innerText.trim(); if (!txt || tidy.disabled) return; tidy.disabled = true; tidy.textContent = '⏳ Đang sắp xếp…';
          try { const res = await chrome.runtime.sendMessage({ type: 'note-tidy', text: txt }); if (!res || !res.ok) throw new Error(res && res.error === 'nokey' ? 'Cần mã Gemini (HaoHao → Thông tin → Tóm tắt)' : (res && res.error) || 'Mất kết nối');
            prev = ed.innerHTML; ed.innerHTML = res.html; undo.hidden = false; saveNote(); }
          catch (e) { saved.textContent = '⚠ ' + e.message; setTimeout(() => { saved.textContent = ''; }, 4000); }
          tidy.disabled = false; tidy.textContent = '✨ Sắp xếp';
        });
        undo.addEventListener('click', () => { if (prev == null) return; ed.innerHTML = prev; prev = null; undo.hidden = true; saveNote(); });
        const bt = $('div', 'pj-ntf'); bt.append(fmt, $('div', 'pj-sp'), undo, tidy);
        nt.append(tb, ed, bt); return nt;
      };
      const first = f.rows.find(x => x.id === selRow && real(x)) || f.rows.find(real) || null; selRow = null; pick(first);
    }
    D.append(S, M); W.append(D);
  }

  function render(force) {
    if (!ready || (!force && editing())) return;
    const W = $('div', 'pj-wrap'), p = openId && proj();
    if (p) detail(W, p); else { openId = null; board(W); }
    root.replaceChildren(W);
  }
  chrome.storage.local.get(['projBoard', 'todos']).then(({ projBoard, todos: td }) => {
    if (projBoard && Array.isArray(projBoard.projects)) data = projBoard;
    todos = Array.isArray(td) ? td : [];
    if (migrate() | todoSync()) save();
    ready = true; render(true);
  }).catch(() => { ready = true; render(true); });
  let pend = null;
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.todos) { todos = Array.isArray(ch.todos.newValue) ? ch.todos.newValue : []; if (ready && todoSync()) { save(); if (!editing()) render(true); } else if (ready && !editing()) render(true); }
    if (!ch.projBoard || !ch.projBoard.newValue) return;
    const v = ch.projBoard.newValue, js = JSON.stringify(v);
    if (js === lastSaved || js === JSON.stringify(data)) return;   // của chính trang này
    if (editing()) { pend = v; return; }                            // tab khác vừa sửa: đợi gõ xong mới nạp
    data = v; migrate(); lastSaved = JSON.stringify(data); render();
  });
  root.addEventListener('focusout', () => setTimeout(() => { if (pend && !editing()) { data = pend; pend = null; migrate(); lastSaved = JSON.stringify(data); render(true); } }, 0));
})();
