// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📋 V1.18: trang Quản lý công việc trong Tab mới (chỉ máy chủ app). Lưu ở chrome.storage.local 'projTasks'.
(() => {
  const root = document.getElementById('proj'); if (!root) return;
  const ST = { todo: 'Chưa bắt đầu', doing: 'Đang làm', done: 'Đã xong' };
  const PR = { low: 'Thấp', med: 'Vừa', high: 'Cao', urgent: 'Gấp' };
  let tasks = [], todoTab = 'todo', schTab = 'today', built = false;
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ymd = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
  const today = () => ymd(new Date());
  const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const save = () => chrome.storage.local.set({ projTasks: tasks }).catch(() => {});
  const fmtDate = s => { if (!s) return ''; const d = new Date(s + 'T00:00'); return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const weekEnd = () => { const d = new Date(); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() + (6 - w)); return ymd(d); };

  function filterTodo(k) { return k === 'all' ? tasks : tasks.filter(t => t.status === k); }
  function filterSch(k) {
    const T = today();
    if (k === 'today') return tasks.filter(t => t.due === T && t.status !== 'done');
    if (k === 'tomorrow') return tasks.filter(t => t.due === addDays(T, 1) && t.status !== 'done');
    if (k === 'week') return tasks.filter(t => t.due && t.due >= T && t.due <= weekEnd() && t.status !== 'done');
    return tasks.filter(t => t.status === 'done' || (t.due && t.due < T)).sort((a, b) => (b.due || '').localeCompare(a.due || ''));
  }
  const sortTasks = L => [...L].sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.due || '9999').localeCompare(b.due || '9999'));

  function row(t) {
    const tr = $('tr');
    const c1 = $('td', 'c-title'), tt = $('div', 'pj-ttl');
    const ck = $('button', 'pj-chk' + (t.status === 'done' ? ' on' : ''), t.status === 'done' ? '✓' : '');
    ck.title = t.status === 'done' ? 'Bỏ đánh dấu xong' : 'Đánh dấu xong'; ck.setAttribute('aria-label', ck.title);
    ck.addEventListener('click', () => { if (t.status === 'done') { t.status = 'doing'; delete t.doneAt; } else { t.status = 'done'; t.prog = 100; t.doneAt = Date.now(); } save(); render(); });
    const inp = $('input'); inp.value = t.title || ''; inp.placeholder = 'Tên việc…'; inp.setAttribute('aria-label', 'Tên việc');
    inp.addEventListener('change', () => { t.title = inp.value.trim(); save(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
    const del = $('button', 'pj-del', '🗑'); del.title = 'Xoá việc'; del.setAttribute('aria-label', 'Xoá việc');
    del.addEventListener('click', () => { tasks = tasks.filter(x => x !== t); save(); render(); });
    tt.append(ck, inp, del); c1.append(tt);
    const sel = (map, val, cls, fn, lb) => { const s = $('select', 'pj-pill ' + cls + val); s.setAttribute('aria-label', lb); for (const k in map) { const o = $('option', '', map[k]); o.value = k; o.selected = k === val; s.append(o); } s.addEventListener('change', () => fn(s.value)); return s; };
    const c2 = $('td'); c2.append(sel(ST, t.status, 'pj-st-', v => { t.status = v; if (v === 'done') { t.prog = 100; t.doneAt = Date.now(); } else delete t.doneAt; save(); render(); }, 'Trạng thái'));
    const c3 = $('td'); c3.append(sel(PR, t.prio, 'pj-pr-', v => { t.prio = v; save(); render(); }, 'Ưu tiên'));
    const c4 = $('td'), dt = $('input', 'pj-date' + (t.due && t.due < today() && t.status !== 'done' ? ' late' : '')); dt.type = 'date'; dt.value = t.due || ''; dt.setAttribute('aria-label', 'Hạn chót');
    dt.title = t.due ? fmtDate(t.due) : 'Chọn hạn chót';
    dt.addEventListener('change', () => { t.due = dt.value; save(); render(); }); c4.append(dt);
    const c5 = $('td'), pg = $('div', 'pj-prog'), pv = $('b', '', (t.prog || 0).toFixed(2).replace('.', ',') + '%'), rg = $('input');
    rg.type = 'range'; rg.min = 0; rg.max = 100; rg.step = 5; rg.value = t.prog || 0; rg.setAttribute('aria-label', 'Tiến độ');
    rg.addEventListener('input', () => { pv.textContent = (+rg.value).toFixed(2).replace('.', ',') + '%'; });
    rg.addEventListener('change', () => { t.prog = +rg.value; if (t.prog >= 100) { t.status = 'done'; t.doneAt = Date.now(); } else if (t.prog > 0 && t.status === 'todo') t.status = 'doing'; else if (t.prog < 100 && t.status === 'done') { t.status = 'doing'; delete t.doneAt; } save(); render(); });
    pg.append(pv, rg); c5.append(pg);
    tr.append(c1, c2, c3, c4, c5);
    return tr;
  }
  function table(list, addDefaults) {
    const w = $('div', 'pj-tbl'), tb = $('table'), th = $('thead'), hr = $('tr');
    ['Aa  Tên việc', '✳  Trạng thái', '◉  Ưu tiên', '🗓  Hạn chót', '◔  Tiến độ'].forEach(x => hr.append($('th', '', x)));
    th.append(hr); const bd = $('tbody'); sortTasks(list).forEach(t => bd.append(row(t))); tb.append(th, bd); w.append(tb);
    if (!list.length) w.append($('div', 'pj-empty', 'Chưa có việc nào ở đây.'));
    if (addDefaults) {
      const a = $('button', 'pj-add', '＋ Thêm việc');
      a.addEventListener('click', () => { const t = { id: 'p' + Date.now().toString(36), title: '', status: 'todo', prio: 'med', due: '', prog: 0, at: Date.now(), ...addDefaults }; tasks.push(t); save(); render(); setTimeout(() => { const ins = root.querySelectorAll('.pj-ttl input'); [...ins].find(i => !i.value) && [...ins].find(i => !i.value).focus(); }, 30); });
      w.append(a);
    }
    return w;
  }
  function tabs(list, cur, fn) { const d = $('div', 'pj-tabs'); list.forEach(([k, ic, lb]) => { const b = $('button', k === cur ? 'on' : '', ic + ' ' + lb); b.addEventListener('click', () => fn(k)); d.append(b); }); return d; }
  function timeline() {
    const days = 21, start = addDays(today(), -3), cols = `220px repeat(${days}, minmax(28px, 1fr))`;
    const w = $('div', 'pj-tl'), g = $('div', 'pj-tl-grid'), hd = $('div', 'pj-tl-head'); hd.style.gridTemplateColumns = cols; hd.append($('div', '', 'Việc'));
    for (let i = 0; i < days; i++) { const s = addDays(start, i), d = new Date(s + 'T00:00'); hd.append($('div', s === today() ? 'today' : '', d.getDate() + '/' + (d.getMonth() + 1))); }
    g.append(hd);
    const L = sortTasks(tasks.filter(t => t.due));
    if (!L.length) g.append($('div', 'pj-empty', 'Việc có hạn chót sẽ hiện trên dòng thời gian.'));
    for (const t of L) {
      const r = $('div', 'pj-tl-row'); r.style.gridTemplateColumns = cols;
      const nm = $('div', '', t.title || '(chưa đặt tên)'); nm.style.cssText = 'padding:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px';
      const from = ymd(new Date(t.at || Date.now()));
      let a = Math.round((new Date(from + 'T00:00') - new Date(start + 'T00:00')) / 864e5), b = Math.round((new Date(t.due + 'T00:00') - new Date(start + 'T00:00')) / 864e5);
      if (a > b) a = b; a = Math.max(0, a); b = Math.min(days - 1, b);
      r.append(nm);
      if (b >= 0 && a <= days - 1) { const bar = $('div', 'pj-tl-bar ' + t.status, (t.prog || 0) + '%'); bar.title = (t.title || '') + ' · ' + ST[t.status] + ' · hạn ' + fmtDate(t.due); bar.style.gridColumn = (a + 2) + ' / ' + (b + 3); r.append(bar); }
      g.append(r);
    }
    w.append(g); return w;
  }
  function render() {
    if (!built) return;
    const ae = document.activeElement; if (ae && root.contains(ae) && ae.tagName === 'INPUT' && ae.type !== 'range' && ae.type !== 'date') return;   // đang gõ: không vẽ lại
    const W = $('div', 'pj-wrap');
    const ic = $('div', 'pj-icon'); ic.append($('i'), $('i'), $('i'));
    W.append(ic, $('h1', 'pj-h1', 'Quản lý công việc'));
    const G = $('div', 'pj-grid');
    const nav = $('div', 'pj-card'), nl = $('div', 'pj-nav'); nav.append($('h2', '', 'Điều hướng'), nl);
    const go = (sec, k) => { if (sec === 'todo') todoTab = k; else if (sec === 'sch') schTab = k; render(); const el = root.querySelector('#pj-' + sec); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    [['☰', 'Việc cần làm', 'todo', 'all'], ['📅', 'Hôm nay', 'sch', 'today'], ['📅', 'Ngày mai', 'sch', 'tomorrow'], ['📅', 'Tuần này', 'sch', 'week'], ['↺', 'Lịch sử', 'sch', 'history'], ['▤', 'Dòng thời gian', 'tl', ''], ['⌛', 'Đang làm', 'todo', 'doing'], ['✔', 'Đã xong', 'todo', 'done']]
      .forEach(([i, lb, sec, k]) => { const b = $('button'); b.append($('span', 'pj-ic', i), $('span', '', lb)); b.addEventListener('click', () => go(sec, k)); nl.append(b); });
    const main = $('div');
    const c1 = $('div', 'pj-card'); c1.id = 'pj-todo'; c1.append($('h2', '', 'Danh sách việc'),
      tabs([['todo', '☰', 'Cần làm'], ['doing', '⌛', 'Đang làm'], ['done', '✔', 'Đã xong'], ['all', '☷', 'Tất cả']], todoTab, k => { todoTab = k; render(); }),
      table(filterTodo(todoTab), { status: todoTab === 'all' ? 'todo' : todoTab, prog: todoTab === 'done' ? 100 : 0 }));
    const T = today();
    const c2 = $('div', 'pj-card'); c2.id = 'pj-sch'; c2.append($('h2', '', 'Lịch'),
      tabs([['today', '📅', 'Hôm nay'], ['tomorrow', '📅', 'Ngày mai'], ['week', '📅', 'Tuần này'], ['history', '↺', 'Lịch sử']], schTab, k => { schTab = k; render(); }),
      table(filterSch(schTab), schTab === 'history' ? null : { due: schTab === 'tomorrow' ? addDays(T, 1) : T }));
    const c3 = $('div', 'pj-card'); c3.id = 'pj-tl'; c3.append($('h2', '', 'Dòng thời gian'), timeline());
    main.append(c1, c2, c3); G.append(nav, main); W.append(G);
    root.replaceChildren(W);
    if (window.HT && HT.i18nApply) HT.i18nApply(root);
  }
  chrome.storage.local.get('projTasks').then(({ projTasks }) => { tasks = Array.isArray(projTasks) ? projTasks : []; built = true; render(); }).catch(() => { built = true; render(); });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.projTasks) { tasks = ch.projTasks.newValue || []; render(); } });
})();
