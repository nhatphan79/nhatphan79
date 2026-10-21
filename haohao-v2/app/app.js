// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// Giao diện HaoHao V2: Việc cần làm · Nhắc nhở · Note · Dự án (proj.js của tiện ích) · Cài đặt.
// Dữ liệu cùng khuôn với tiện ích Chrome (todos, rules, ideas, projBoard) để 2 bên dùng chung.
(() => {
  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const st = chrome.storage.local;
  let todos = [], rules = [], ideas = [], ideaSeq = 0, filt = 'open', editing = null;
  const toast = m => { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200); };

  // ---------- chuyển mục ----------
  const views = [...document.querySelectorAll('.side nav button')];
  function go(v) {
    views.forEach(b => b.classList.toggle('on', b.dataset.v === v));
    document.querySelectorAll('.view').forEach(s => { s.hidden = s.id !== 'v-' + v; });
    if (v === 'set') renderSet();
    try { localStorage.setItem('hh-v', v); } catch {}
  }
  views.forEach(b => b.addEventListener('click', () => go(b.dataset.v)));

  // ---------- giờ ----------
  const dueLabel = v => {
    const d = new Date(v); if (isNaN(d)) return '';
    const t0 = new Date(); t0.setHours(0, 0, 0, 0); const dd = Math.round((new Date(d).setHours(0, 0, 0, 0) - t0) / 864e5);
    const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return dd === 0 ? 'Hôm nay ' + hm : dd === 1 ? 'Mai ' + hm : dd === -1 ? 'Hôm qua ' + hm : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + hm;
  };

  // ---------- việc cần làm ----------
  const saveTodos = () => st.set({ todos });
  function renderTodos() {
    const ul = $('todo-list'); ul.innerHTML = '';
    const open = todos.filter(t => !t.done), done = todos.filter(t => t.done);
    $('n-open').textContent = open.length || ''; $('n-done').textContent = done.length || '';
    const list = (filt === 'open' ? open : done).slice().sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
    if (!list.length) { ul.append(el('li', 'empty', filt === 'open' ? 'Chưa có việc nào. Gõ việc cần làm ở ô bên trên nhé.' : 'Chưa có việc đã xong.')); ul.lastChild.style.border = '0'; ul.lastChild.style.background = 'none'; return; }
    for (const t of list) {
      const li = el('li', t.done ? 'done' : '');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.setAttribute('aria-label', 'Xong: ' + t.text);
      cb.addEventListener('change', () => { t.done = cb.checked; if (t.done) t.doneAt = Date.now(); else delete t.doneAt; saveTodos(); });
      const tx = el('div', 'tx'); tx.append(el('span', '', t.text));
      li.append(cb, tx);
      if (t.due) {
        const late = !t.done && new Date(t.due) < new Date(), soon = !late && new Date(t.due) - Date.now() < 3600e3;
        li.append(el('span', 'chip' + (late ? ' late' : soon ? ' soon' : ''), '⏰ ' + dueLabel(t.due)));
      }
      const del = el('button', 'ib', '🗑'); del.title = 'Xoá'; del.setAttribute('aria-label', 'Xoá việc ' + t.text);
      del.addEventListener('click', () => { todos = todos.filter(x => x !== t); saveTodos(); renderTodos(); });
      li.append(del); ul.append(li);
    }
  }
  $('todo-add').addEventListener('submit', e => {
    e.preventDefault();
    let t = $('todo-in').value.trim(), dv = $('todo-due').value || ''; if (!t) return $('todo-in').focus();
    if (!dv) { try { const r = HT.parseWhen(t); if (r && r.due && r.due.getTime() > Date.now() && r.task) { t = r.task; dv = HT.localISO(r.due); } } catch {} }
    todos.push({ id: 't' + Date.now().toString(36), text: t, done: false, due: dv, notified: false });
    $('todo-in').value = ''; $('todo-due').value = ''; saveTodos(); renderTodos();
    if (dv) toast('Đã hẹn nhắc ' + dueLabel(dv));
  });
  document.querySelectorAll('.tabs2 button').forEach(b => b.addEventListener('click', () => {
    filt = b.dataset.f; document.querySelectorAll('.tabs2 button').forEach(x => x.classList.toggle('on', x === b)); renderTodos();
  }));

  // ---------- nhắc nhở ----------
  const saveRules = () => st.set({ rules });
  const DAYS = [[1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, 'T7'], [0, 'CN']];
  $('rem-days').append(...DAYS.map(([v, n]) => { const l = el('label'); const c = el('input'); c.type = 'checkbox'; c.name = 'day'; c.value = v; l.append(c, n); return l; }));
  function renderRules() {
    const ul = $('rem-list'); ul.innerHTML = '';
    const list = rules.filter(r => r.type === 'reminder');
    if (!list.length) ul.append(el('li', 'empty', 'Chưa có nhắc nhở nào.'));
    for (const r of list) {
      const li = el('li');
      li.append(el('span', 'ic', r.icon || '🔔'));
      const tx = el('div', 'tx'); tx.append(el('span', '', r.name || '(chưa đặt tên)')); const sm = el('small', '', HT.describe(r) + (r.message ? ' · ' + r.message : '')); tx.append(sm);
      const tg = el('label', 'tg'); tg.title = r.enabled ? 'Đang bật' : 'Đang tắt'; const c = el('input'); c.type = 'checkbox'; c.checked = !!r.enabled; c.setAttribute('aria-label', 'Bật nhắc ' + (r.name || ''));
      c.addEventListener('change', () => { r.enabled = c.checked; saveRules(); }); tg.append(c, el('i'));
      const ed = el('button', 'ib', '✏️'); ed.title = 'Sửa'; ed.setAttribute('aria-label', 'Sửa ' + (r.name || '')); ed.addEventListener('click', () => openForm(r));
      const del = el('button', 'ib', '🗑'); del.title = 'Xoá'; del.setAttribute('aria-label', 'Xoá ' + (r.name || ''));
      del.addEventListener('click', () => { if (!confirm('Xoá nhắc nhở "' + (r.name || '') + '"?')) return; rules = rules.filter(x => x !== r); saveRules(); renderRules(); });
      li.append(tx, tg, ed, del); ul.append(li);
    }
  }
  const F = $('rem-form');
  function showKind() { const k = F.kind.value; F.querySelectorAll('.k').forEach(d => { d.hidden = !d.classList.contains('k-' + k); }); }
  F.kind.addEventListener('change', showKind);
  function openForm(r) {
    editing = r; F.hidden = false; $('rem-ftitle').textContent = r ? 'Sửa nhắc nhở' : 'Nhắc nhở mới';
    F.name.value = r ? r.name || '' : ''; F.icon.value = r ? r.icon || '' : '🔔'; F.message.value = r ? r.message || '' : '';
    F.kind.value = r ? r.kind || 'daily' : 'daily';
    F.times.value = r ? HT.timesOf(r).join(', ') : '08:00';
    const days = r && r.days && r.days.length ? r.days : [1, 2, 3, 4, 5, 6, 0];
    F.querySelectorAll('[name=day]').forEach(c => { c.checked = days.includes(Number(c.value)); });
    F.minutes.value = r && r.minutes || 60; F.from.value = r && r.from || '08:00'; F.to.value = r && r.to || '21:00';
    F.datetime.value = r && r.datetime || ''; F.lunar.value = r && r.lunarDays ? r.lunarDays.join(', ') : '1, 15';
    showKind(); F.scrollIntoView({ behavior: 'smooth', block: 'center' }); F.name.focus();
  }
  $('rem-new').addEventListener('click', () => openForm(null));
  $('rem-cancel').addEventListener('click', () => { F.hidden = true; editing = null; });
  F.addEventListener('submit', e => {
    e.preventDefault();
    const r = { ...(editing || {}), id: editing ? editing.id : 'r' + Date.now().toString(36), type: 'reminder', name: F.name.value.trim(), icon: F.icon.value.trim(), message: F.message.value.trim(), kind: F.kind.value, enabled: editing ? editing.enabled : true };
    const times = [...new Set((F.times.value.match(/\d{1,2}:\d{2}/g) || []).map(t => t.padStart(5, '0')))].sort();
    if (r.kind === 'daily' || r.kind === 'lunar') { if (!times.length) return alert('Nhập ít nhất một giờ, ví dụ 08:00.'); r.times = times; delete r.time; }
    if (r.kind === 'daily') r.days = [...F.querySelectorAll('[name=day]:checked')].map(c => Number(c.value));
    if (r.kind === 'interval') { r.minutes = Math.max(5, Number(F.minutes.value) || 60); r.from = F.from.value; r.to = F.to.value; }
    if (r.kind === 'once') { if (!F.datetime.value) return alert('Chọn ngày giờ nhắc.'); r.datetime = F.datetime.value; r.enabled = true; }
    if (r.kind === 'lunar') { r.lunarDays = [...new Set((F.lunar.value.match(/\d{1,2}/g) || []).map(Number).filter(n => n >= 1 && n <= 30))]; if (!r.lunarDays.length) return alert('Nhập ngày âm, ví dụ 1, 15.'); }
    if (editing) rules[rules.indexOf(editing)] = r; else rules.push(r);
    saveRules(); F.hidden = true; editing = null; renderRules(); toast('Đã lưu nhắc nhở');
  });

  // ---------- note ----------
  const saveIdeas = () => st.set({ ideas, ideaSeq });
  function renderNotes() {
    const box = $('note-list'), q = $('note-q').value.trim().toLowerCase(); box.innerHTML = '';
    const list = ideas.filter(i => !q || ((i.title || '') + ' ' + (i.text || '') + ' ' + (i.url || '')).toLowerCase().includes(q));
    if (!list.length) { box.append(el('div', 'empty', q ? 'Không thấy note nào khớp.' : 'Chưa có note nào.')); return; }
    for (const it of list) {
      const c = el('article', 'nt');
      const hd = el('div', 'hd'); hd.append(el('b', '', it.no ? '#' + it.no : '📝'), el('span', '', new Date(it.at || Date.now()).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })));
      const del = el('button', 'ib', '🗑'); del.title = 'Xoá note'; del.setAttribute('aria-label', 'Xoá note');
      del.addEventListener('click', () => { if (!confirm('Xoá note này?')) return; ideas = ideas.filter(x => x !== it); saveIdeas(); renderNotes(); });
      hd.append(del); c.append(hd);
      if (it.title) c.append(el('b', '', it.title));
      const bd = el('div', 'bd', it.text || ''); bd.contentEditable = 'plaintext-only'; bd.setAttribute('aria-label', 'Nội dung note');
      bd.addEventListener('blur', () => { const v = bd.innerText.trim(); if (v !== (it.text || '')) { it.text = v; saveIdeas(); } });
      c.append(bd);
      if (it.url) { const a = el('a', '', it.url); a.href = it.url; a.addEventListener('click', e => { e.preventDefault(); hhApp.open(it.url); }); c.append(a); }
      box.append(c);
    }
  }
  $('note-add').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('note-in').value.trim(); if (!v) return $('note-in').focus();
    ideaSeq = Math.max(ideaSeq || 0, ...ideas.map(i => i.no || 0)) + 1;
    ideas.unshift({ id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: 'text', text: v.slice(0, 5000), title: '', url: '', sec: 0, at: Date.now(), ai: null, no: ideaSeq });
    ideas = ideas.slice(0, 500); $('note-in').value = ''; saveIdeas(); renderNotes();
  });
  $('note-in').addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) $('note-add').requestSubmit(); });
  $('note-q').addEventListener('input', renderNotes);

  // ---------- cài đặt ----------
  async function renderSet() {
    const i = await hhApp.info();
    $('set-auto').checked = !!i.auto;
    $('set-ver').textContent = `HaoHao V2 · bản ${i.ver} · dữ liệu lưu tại ${i.file}`;
    $('set-sync').textContent = i.ext
      ? '✓ Đang dùng chung dữ liệu với tiện ích HaoHao trên Chrome. Khi Chrome đang mở, tiện ích nhắc; tắt Chrome thì HaoHao V2 nhắc thay.'
      : 'Chưa nối với tiện ích Chrome. Phần đồng bộ sẽ có ở bản tiện ích HaoHao kế tiếp; trong lúc chờ, HaoHao V2 tự nhắc và lưu dữ liệu riêng trên máy.';
  }
  $('set-auto').addEventListener('change', async e => { const on = await hhApp.setAuto(e.target.checked); e.target.checked = on; toast(on ? 'Đã bật tự chạy khi bật máy' : 'Đã tắt tự chạy'); });
  $('set-test').addEventListener('click', () => hhApp.testNotify());
  // cập nhật: app tự hỏi GitHub lúc mở + 6 giờ/lần; ở đây chỉ hiện trạng thái + cho bấm kiểm tra / cài
  function renderUp(u) {
    const t = u.at ? ' (lúc ' + new Date(u.at).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' }) + ')' : '';
    const msg = !u.can ? 'Tự cập nhật chỉ chạy ở bản đã cài.'
      : u.st === 'checking' ? 'Đang kiểm tra bản mới…'
      : u.st === 'downloading' ? `Đang tải ngầm bản ${u.ver}… ${u.pct}%`
      : u.st === 'ready' ? `✓ Bản ${u.ver} đã tải xong. Bấm nút bên dưới để khởi động lại và dùng bản mới (dữ liệu giữ nguyên).`
      : u.st === 'latest' ? '✓ Đang dùng bản mới nhất' + t
      : u.st === 'error' ? 'Chưa kiểm tra được (mất mạng?). HaoHao sẽ thử lại sau' + t
      : 'HaoHao tự kiểm tra bản mới khi mở máy và cứ 6 giờ một lần, tải ngầm rồi báo bạn.';
    $('set-up').textContent = msg;
    const b = $('set-up-btn');
    b.textContent = u.st === 'ready' ? `⬆️ Cài bản ${u.ver} ngay` : '🔄 Kiểm tra bản mới';
    b.disabled = !u.can || u.st === 'checking' || u.st === 'downloading';
  }
  if (hhApp.updateGet) {
    hhApp.updateGet().then(renderUp);
    hhApp.onUpdate(u => renderUp({ ...u, can: true }));
    $('set-up-btn').addEventListener('click', async () => {
      const u = await hhApp.updateGet();
      if (u.st === 'ready') hhApp.updateInstall(); else renderUp(await hhApp.updateCheck());
    });
  }
  async function syncDot() {
    const i = await hhApp.info(), s = $('sync');
    s.classList.toggle('on', !!i.ext); s.querySelector('span').textContent = i.ext ? 'Đã nối tiện ích Chrome' : 'Chưa nối tiện ích Chrome';
  }

  // ---------- nạp & theo dõi dữ liệu ----------
  async function load() {
    const d = await st.get(['todos', 'rules', 'ideas', 'ideaSeq']);
    todos = d.todos || []; rules = d.rules || []; ideas = d.ideas || []; ideaSeq = d.ideaSeq || 0;
    renderTodos(); renderRules(); renderNotes();
  }
  chrome.storage.onChanged.addListener(ch => {
    if (ch.todos) { todos = ch.todos.newValue || []; renderTodos(); }
    if (ch.rules && F.hidden) { rules = ch.rules.newValue || []; renderRules(); }
    if (ch.ideas) { ideas = ch.ideas.newValue || []; const a = document.activeElement; if (!(a && a.classList && a.classList.contains('bd'))) renderNotes(); }
    if (ch.ideaSeq) ideaSeq = ch.ideaSeq.newValue || 0;
  });
  load(); syncDot(); setInterval(syncDot, 30e3);
  let v0 = 'todo'; try { v0 = localStorage.getItem('hh-v') || 'todo'; } catch {}
  go(document.getElementById('v-' + v0) ? v0 : 'todo');
})();
