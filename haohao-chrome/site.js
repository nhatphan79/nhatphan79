// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🏗️ V1.2.5: trang CÔNG TRÌNH (SITE BRAIN – bộ não thứ hai của Chỉ huy trưởng) trong Tab mới.
//   9 mục: Tổng quan (7 câu hỏi của CHT) · Tiến độ (+ biểu đồ ngang) · Công việc · Nhật ký thi công (+ ảnh, chép báo cáo ngày)
//          · Nhân lực (tổ đội, bảng công) · Vật tư (đề xuất, nhập xuất, tồn) · Chi phí (dự toán, chi, thu, công nợ, dòng tiền)
//          · Vấn đề & phê duyệt · Hồ sơ (cây thư mục chuẩn 00–99 trên máy, lệnh tạo thư mục)
//   Việc / vấn đề bấm 🔔 → đưa sang Todo HaoHao để nhắc (tick 2 bên tự khớp).
//   Lưu chrome.storage.local['siteBrain'] (tách riêng, không đụng trang Dự án).
(() => {
  const root = document.getElementById('site'); if (!root) return;
  const KEY = 'siteBrain';
  let data = { sites: [], cur: null }, todos = [], tab = 'dash', ready = false, lastSaved = '', pend = null, dirty = false;
  const flt = { task: 'open', issue: 'open' };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ymd = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
  const today = () => ymd(new Date());
  const addD = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const days = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const fd = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + (s.slice(0, 4) !== today().slice(0, 4) ? '/' + s.slice(2, 4) : '') : '';
  const fdFull = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
  const money = n => Math.round(n || 0).toLocaleString('vi-VN');
  const short = n => { const a = Math.abs(n), s = n < 0 ? '−' : ''; return a >= 1e9 ? s + (a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ' : a >= 1e6 ? s + (a / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr' : s + money(a) + ' ₫'; };
  const esc = t => String(t == null ? '' : t);
  const site = () => data.sites.find(s => s.id === data.cur) || null;
  const editing = () => { const a = document.activeElement; return a && root.contains(a) && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName)); };

  // ---------- lưu ----------
  const RO = !!window.SB_RO;   // V1.2.7: bản xem trên điện thoại (haohaostore.com/cong-trinh) – chỉ xem
  const save = () => { if (RO) return Promise.resolve(); lastSaved = JSON.stringify(data); pushSoon(); return chrome.storage.local.set({ [KEY]: data }).catch(e => toast('⚠ Chưa lưu được: ' + (e && e.message || e))); };
  let st = 0; const saveSoon = () => { clearTimeout(st); st = setTimeout(save, 400); };
  const saveTodos = () => chrome.storage.local.set({ todos }).catch(() => {});
  const toast = t => { let el = root.querySelector('.sb-toast'); if (!el) { el = $('div', 'sb-toast'); el.setAttribute('role', 'status'); root.append(el); } el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 3200); };

  // ---------- danh mục ----------
  const FOLDERS = ['00_TONG_QUAN_DU_AN', '01_PHAP_LY_HOP_DONG', '02_THIET_KE_BAN_VE', '03_KE_HOACH_TIEN_DO', '04_CONG_VIEC_NHAT_KY', '05_NHAN_LUC_VAT_TU',
    '06_CHI_PHI_DONG_TIEN', '07_VAN_DE_PHE_DUYET', '08_CHAT_LUONG_AN_TOAN', '09_NGHIEM_THU_BAN_GIAO', '10_HINH_ANH_VIDEO', '99_LUU_TRU'];
  const PRI = [['cao', '🔴 Cao'], ['tb', '🟡 Vừa'], ['thap', '⚪ Thấp']];
  const TST = [['todo', 'Chưa làm'], ['doing', 'Đang làm'], ['wait', 'Chờ'], ['done', 'Xong']];
  const MST = [['de', 'Đề xuất'], ['duyet', 'Đã duyệt'], ['dat', 'Đã đặt'], ['ve', 'Đã về']];
  const ITYPE = [['ht', 'Hiện trường'], ['kt', 'Kỹ thuật'], ['td', 'Tiến độ'], ['cp', 'Chi phí'], ['pd', 'Xin phê duyệt']];
  const IST = [['mo', 'Mới'], ['xl', 'Đang xử lý'], ['cd', 'Chờ duyệt'], ['dong', 'Đã xong']];
  const WX = ['☀️ Nắng', '⛅ Mây', '🌦 Mưa nhỏ', '🌧 Mưa to', '⛔ Nghỉ'];
  const lbl = (L, v) => (L.find(x => x[0] === v) || ['', ''])[1];
  const PHASES0 = ['Chuẩn bị', 'Móng', 'Phần thân', 'Mái', 'Hoàn thiện', 'Nghiệm thu – Bàn giao'];
  const TABS = [['dash', '📊 Tổng quan'], ['plan', '📅 Tiến độ'], ['task', '✅ Công việc'], ['log', '📓 Nhật ký'], ['crew', '👷 Nhân lực'],
    ['mat', '🧱 Vật tư'], ['cost', '💰 Chi phí'], ['issue', '⚠️ Vấn đề'], ['file', '📁 Hồ sơ']];

  function newSite(name, code) {
    const s0 = today();
    return { id: uid(), code: code || ('DA' + String(data.sites.length + 1).padStart(3, '0')), name: name || 'Công trình mới', owner: '', phone: '', addr: '',
      start: s0, end: addD(s0, 180), value: 0, phase: 'Chuẩn bị', note: '', dir: '', drive: '',
      plan: PHASES0.map((g, i) => ({ id: uid(), g, t: g, s: addD(s0, i * 30), e: addD(s0, i * 30 + 29), pct: 0, mile: i === 1 || i === 5 })),
      tasks: [], logs: [], teams: [], mats: [], stock: [], budget: [], costs: [], incomes: [], issues: [], docs: [] };
  }
  const fix = s => { ['plan', 'tasks', 'logs', 'teams', 'mats', 'stock', 'budget', 'costs', 'incomes', 'issues', 'docs'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; }); return s; };

  // ---------- tính toán ----------
  const dur = p => p.s && p.e ? Math.max(1, days(p.s, p.e) + 1) : 1;
  const planPct = (p, d) => !p.s || !p.e ? 0 : d < p.s ? 0 : d >= p.e ? 100 : Math.round((days(p.s, d) + 1) / dur(p) * 100);
  function progress(S, d = today()) {
    const P = S.plan.filter(p => p.s && p.e); const W = P.reduce((a, p) => a + dur(p), 0);
    if (!W) return { kh: 0, tt: 0 };
    return { kh: Math.round(P.reduce((a, p) => a + planPct(p, d) * dur(p), 0) / W), tt: Math.round(P.reduce((a, p) => a + Math.min(100, num(p.pct)) * dur(p), 0) / W) };
  }
  const pState = p => { const d = today(), kh = planPct(p, d), tt = num(p.pct);
    if (tt >= 100) return ['ok', 'Xong']; if (tt + 10 < kh) return ['late', 'Chậm ' + (kh - tt) + '%']; if (d < (p.s || d) && !tt) return ['', 'Chưa tới']; return ['run', 'Đang làm']; };
  const taskLate = t => t.st !== 'done' && t.due && t.due < today();
  const crewOf = L => Object.values(L.crew || {}).reduce((a, n) => a + num(n), 0) + num(L.other);
  const spent = (S, b) => S.costs.filter(c => !b || c.cat === b).reduce((a, c) => a + num(c.amt), 0);
  const stockOf = S => { const m = new Map(); for (const x of S.stock) { const k = (x.name || '').trim().toLowerCase() + '|' + (x.unit || '').trim(); if (!x.name) continue;
    const o = m.get(k) || { name: x.name.trim(), unit: x.unit || '', in: 0, out: 0 }; o[x.io === 'out' ? 'out' : 'in'] += num(x.qty); m.set(k, o); } return [...m.values()]; };

  // ---------- 🔔 Todo HaoHao ----------
  const todoOf = r => r && r.todoId ? todos.find(t => t.id === r.todoId) : null;
  function remind(r, text, S) {
    const old = todoOf(r);
    if (old) { todos = todos.filter(t => t !== old); delete r.todoId; saveTodos(); save(); render(true); toast('Đã bỏ nhắc trong Todo HaoHao'); return; }
    if (!(text || '').trim()) return toast('Gõ nội dung trước rồi bấm 🔔');
    const id = 't' + Date.now().toString(36) + uid().slice(0, 3);
    todos.push({ id, text: text.trim() + ' · ' + (S.code ? S.code + ' ' : '') + S.name, done: r.st === 'done' || r.st === 'dong', due: r.due ? r.due + 'T07:30' : '', notified: false, sb: S.id });
    r.todoId = id; saveTodos(); save(); render(true);
    toast(r.due ? '🔔 HaoHao sẽ nhắc lúc 7:30 ngày ' + fdFull(r.due) : '🔔 Đã đưa sang Todo HaoHao (chưa có hạn – thêm Hạn để được nhắc giờ)');
  }
  function todoSync() {
    let ch = false;
    for (const S of data.sites) for (const L of [S.tasks, S.issues]) for (const r of L) {
      if (!r.todoId) continue; const t = todos.find(x => x.id === r.todoId);
      if (!t) { delete r.todoId; ch = true; continue; }
      const isTask = L === S.tasks, dn = isTask ? r.st === 'done' : r.st === 'dong';
      if (!!t.done !== dn) { r.st = t.done ? (isTask ? 'done' : 'dong') : (isTask ? 'todo' : 'xl'); ch = true; }
    }
    return ch;
  }
  function todoPush(r, isTask) {   // sửa việc bên này → cập nhật việc bên Todo
    const t = todoOf(r); if (!t) return;
    t.done = isTask ? r.st === 'done' : r.st === 'dong';
    if (r.due && (!t.due || t.due.slice(0, 10) !== r.due)) { t.due = r.due + 'T07:30'; t.notified = false; }
    saveTodos();
  }

  // ---------- ô nhập & bảng kiểu Excel ----------
  // cols: { k, lb, t: text|area|date|num|money|sel|chk|calc, o: [[v,lb]], w, ph, f: r => node|string (calc), rr: vẽ lại khi đổi, on: (r) => sau khi đổi }
  function field(r, c, after) {
    let el;
    if (c.t === 'sel') { el = $('select', 'sb-in'); (typeof c.o === 'function' ? c.o() : c.o).forEach(([v, l]) => { const o = $('option', '', l); o.value = v; el.append(o); }); el.value = r[c.k] == null ? '' : r[c.k]; }
    else if (c.t === 'chk') { el = $('input', 'sb-chk'); el.type = 'checkbox'; el.checked = !!r[c.k]; }
    else if (c.t === 'area') { el = $('textarea', 'sb-in sb-ta'); el.rows = c.rows || 2; el.value = esc(r[c.k]); }
    else { el = $('input', 'sb-in'); el.type = c.t === 'date' ? 'date' : 'text';
      if (c.t === 'money' || c.t === 'num') { el.inputMode = 'decimal'; el.classList.add('r'); el.value = r[c.k] ? (c.t === 'money' ? money(r[c.k]) : String(r[c.k])) : ''; }
      else el.value = esc(r[c.k]); }
    if (c.ph && !RO) el.placeholder = c.ph; el.setAttribute('aria-label', c.lb || c.k);
    if (RO) { if (el.tagName === 'SELECT' || c.t === 'chk') el.disabled = true; else el.readOnly = true; }
    const get = () => c.t === 'chk' ? el.checked : (c.t === 'money' || c.t === 'num') ? num(el.value) : el.value;
    el.addEventListener('input', () => { if (c.t !== 'money') { r[c.k] = get(); saveSoon(); } });
    el.addEventListener('change', () => {
      r[c.k] = get(); if (c.t === 'money') el.value = r[c.k] ? money(r[c.k]) : '';
      if (c.on) c.on(r); save(); if (after) after();
      if (c.rr !== false) { if (c.t === 'sel' || c.t === 'chk') setTimeout(() => render(true), 0); else { dirty = true; setTimeout(() => render(), 0); } }   // ô chữ / ngày: vẽ lại khi rời bảng (không cướp con trỏ)
    });
    if (c.t === 'money') el.addEventListener('focus', () => { el.value = r[c.k] ? String(r[c.k]) : ''; });
    return el;
  }
  function table(rows, cols, o = {}) {
    const box = $('div', 'sb-tw'), t = $('table', 'sb-t'), th = $('thead'), hr = $('tr');
    if (o.num !== false) hr.append($('th', 'n', '#'));
    cols.forEach(c => { const h = $('th', c.t === 'money' || c.t === 'num' ? 'r' : '', c.lb); if (c.w) h.style.width = c.w; hr.append(h); });
    hr.append($('th', 'x')); th.append(hr); t.append(th);
    const tb = $('tbody');
    rows.forEach((r, i) => {
      const tr = $('tr', o.cls ? o.cls(r) : ''); if (r.id) tr.dataset.id = r.id;
      if (o.num !== false) tr.append($('td', 'n', String(i + 1)));
      cols.forEach(c => { const td = $('td', c.t === 'calc' ? 'calc' : ''); if (c.t === 'calc') { const v = c.f(r); td.append(v instanceof Node ? v : $('span', '', v)); } else td.append(field(r, c)); tr.append(td); });
      const x = $('td', 'x'); if (RO) { tr.append(x); tb.append(tr); return; } if (o.extra) o.extra(r, x); x.append(delBtn(() => { o.list.splice(o.list.indexOf(r), 1); if (r.todoId) { todos = todos.filter(z => z.id !== r.todoId); saveTodos(); } save(); render(true); }));
      tr.append(x); tb.append(tr);
    });
    t.append(tb);
    if (!rows.length) { const tr = $('tr'), td = $('td', 'sb-none', o.empty || 'Chưa có dòng nào'); td.colSpan = cols.length + 2; tr.append(td); tb.append(tr); }
    box.append(t);
    if (o.add && !RO) { const a = $('button', 'sb-add', o.addLb || '＋ Thêm dòng'); a.type = 'button'; a.addEventListener('click', () => { const r = o.add(); o.list.push(r); save(); render(true); setTimeout(() => { const tr = root.querySelector('tr[data-id="' + r.id + '"]'); const inp = tr && tr.querySelector('input[type=text],textarea'); if (inp) { inp.focus(); tr.scrollIntoView({ block: 'nearest' }); } }, 0); }); box.append(a); }
    return box;
  }
  function delBtn(fn) {
    const b = $('button', 'sb-del', '🗑'); b.type = 'button'; b.title = 'Xoá (bấm 2 lần)'; b.setAttribute('aria-label', 'Xoá');
    b.addEventListener('click', () => { if (b.classList.contains('arm')) return fn(); b.classList.add('arm'); b.textContent = 'Xoá?'; setTimeout(() => { b.classList.remove('arm'); b.textContent = '🗑'; }, 2500); });
    return b;
  }
  const bellBtn = (r, text, S) => { const on = !!todoOf(r), b = $('button', 'sb-bell' + (on ? ' on' : ''), on ? '🔔' : '🔕'); b.type = 'button';
    b.title = on ? 'Đang nhắc trong Todo HaoHao – bấm để bỏ' : 'Đưa sang Todo HaoHao để nhắc (7:30 ngày đến hạn)'; b.addEventListener('click', () => remind(r, text(), S)); return b; };
  const chips = (L, cur, fn) => { const w = $('div', 'sb-chips'); L.forEach(([v, l, n]) => { const b = $('button', 'sb-chip' + (v === cur ? ' on' : ''), l + (n != null ? ' · ' + n : '')); b.type = 'button'; b.addEventListener('click', () => fn(v)); w.append(b); }); return w; };
  const card = (title, cls) => { const c = $('section', 'sb-card ' + (cls || '')); if (title) c.append($('h3', '', title)); return c; };
  const kpi = (lb, v, sub, tone) => { const k = $('div', 'sb-kpi ' + (tone || '')); k.append($('span', '', lb), $('b', '', v)); if (sub) k.append($('small', '', sub)); return k; };
  const bar = (pc, tone) => { const b = $('div', 'sb-bar ' + (tone || '')), i = $('i'); i.style.width = Math.max(0, Math.min(100, pc)) + '%'; b.append(i); return b; };
  const sec = (W, t, sub) => { const h = $('div', 'sb-sech'); h.append($('h2', '', t)); if (sub) h.append($('span', '', sub)); W.append(h); return h; };

  // ---------- hộp thoại ----------
  function dialog(title, build, onOk, okLb = 'Lưu') {
    root.querySelectorAll('.sb-dlg').forEach(x => x.remove());
    const bg = $('div', 'sb-dlg'), cd = $('div', 'sb-dlgc'); cd.setAttribute('role', 'dialog'); cd.setAttribute('aria-label', title);
    const body = $('div', 'sb-dlgb'); build(body);
    const ok = $('button', 'sb-btn', okLb), no = $('button', 'sb-btn ghost', 'Huỷ'), row = $('div', 'sb-dlgf'); row.append(no, ok);
    const close = () => bg.remove();
    ok.addEventListener('click', () => { if (onOk(body) !== false) close(); }); no.addEventListener('click', close);
    bg.addEventListener('click', e => { if (e.target === bg) close(); }); cd.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    cd.append($('div', 'sb-dlgt', title), body, row); bg.append(cd); root.append(bg);
    const f = body.querySelector('input,select,textarea'); if (f) f.focus();
    return { close, body, row };
  }
  const lab = (lb, el, full) => { const l = $('label', 'sb-f' + (full ? ' full' : '')); l.append($('span', '', lb), el); return l; };
  function infoDlg(S, isNew) {
    const tmp = { ...S };
    const F = [['code', 'Mã công trình', 'text', 'DA001'], ['name', 'Tên công trình', 'text', 'Nhà phố anh A – Hoà Xuân'], ['owner', 'Chủ đầu tư', 'text'], ['phone', 'SĐT chủ đầu tư', 'text'],
      ['addr', 'Địa chỉ', 'text'], ['start', 'Khởi công', 'date'], ['end', 'Hoàn thành (kế hoạch)', 'date'], ['value', 'Giá trị hợp đồng (₫)', 'money'], ['phase', 'Giai đoạn hiện tại', 'text', 'Móng / Phần thân…'], ['note', 'Ghi chú', 'area']];
    dialog(isNew ? '🏗️ Tạo công trình mới' : '✏️ Thông tin công trình', b => {
      const g = $('div', 'sb-fg'); F.forEach(([k, lb, t, ph]) => { const el = field(tmp, { k, lb, t, ph, rr: false }); if (k === 'phase') { el.setAttribute('list', 'sb-phl'); const dl = $('datalist'); dl.id = 'sb-phl'; [...new Set([...S.plan.map(p => p.g), ...PHASES0])].filter(Boolean).forEach(v => { const o = $('option'); o.value = v; dl.append(o); }); g.append(dl); } g.append(lab(lb, el, t === 'area' || k === 'name' || k === 'addr')); });
      b.append(g);
      if (!isNew) { const d = $('div', 'sb-danger'); d.append($('span', '', 'Xoá hẳn công trình này và toàn bộ dữ liệu của nó'), delBtn(() => { data.sites = data.sites.filter(x => x !== S); data.cur = data.sites[0] ? data.sites[0].id : null; save(); root.querySelectorAll('.sb-dlg').forEach(x => x.remove()); render(true); toast('Đã xoá công trình'); })); b.append(d); }
    }, b => {
      b.querySelectorAll('input,textarea').forEach(i => i.dispatchEvent(new Event('change')));
      if (!String(tmp.name || '').trim()) { toast('Cần nhập tên công trình'); return false; }
      Object.assign(S, tmp); if (isNew) { data.sites.push(S); data.cur = S.id; tab = 'dash'; }
      save(); render(true); toast(isNew ? '✅ Đã tạo ' + S.name : '✅ Đã lưu thông tin');
    }, isNew ? 'Tạo công trình' : 'Lưu');
  }

  // ---------- khung trang ----------
  function head(W, S) {
    const h = $('div', 'sb-head');
    const br = $('div', 'sb-brand'), im = document.createElement('img'); im.src = window.SB_ICON || 'icons/icon48.png'; im.alt = '';
    const tx = $('div'); tx.append($('b', '', 'SITE BRAIN'), $('small', '', 'Điều hành công trình')); br.append(im, tx); h.append(br);
    if (S) {
      const sel = $('select', 'sb-sitesel'); sel.setAttribute('aria-label', 'Chọn công trình');
      data.sites.forEach(x => { const o = $('option', '', (x.code ? x.code + ' · ' : '') + x.name); o.value = x.id; sel.append(o); });
      sel.value = S.id; sel.addEventListener('change', () => { data.cur = sel.value; save(); render(true); }); h.append(sel);
      if (!RO) { const ed = $('button', 'sb-btn ghost sm', '✏️ Thông tin'); ed.type = 'button'; ed.addEventListener('click', () => infoDlg(S)); h.append(ed); }
    }
    if (RO) { const t = new Date(window.SB_RO.at || Date.now()); h.append($('small', 'sb-upd', '🕐 Cập nhật ' + t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + t.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })));
      const rl = $('button', 'sb-btn ghost sm', '↻'); rl.type = 'button'; rl.title = 'Tải lại'; rl.setAttribute('aria-label', 'Tải lại'); rl.addEventListener('click', () => location.reload()); h.append(rl); W.append(h); return; }
    const sp = $('div'); sp.style.flex = '1'; h.append(sp);
    const add = $('button', 'sb-btn sm', '＋ Công trình'); add.type = 'button'; add.addEventListener('click', () => infoDlg(newSite(''), true));
    const bk = $('button', 'sb-btn ghost sm', '💾 Sao lưu'); bk.type = 'button'; bk.title = 'Tải file sao lưu toàn bộ dữ liệu công trình (.json)'; bk.addEventListener('click', backup);
    const rs = $('button', 'sb-btn ghost sm', '📂 Khôi phục'); rs.type = 'button'; rs.title = 'Nạp lại từ file sao lưu'; rs.addEventListener('click', restore);
    const bt = $('button', 'sb-btn ghost sm', '🤖 Bot Zalo'); bt.type = 'button'; bt.title = 'Gửi tổng quan vào Zalo mỗi ngày'; bt.addEventListener('click', botDlg);
    if (botCfg.on && botCfg.chatId) bt.append($('i', 'sb-on', '●'));
    if (botCfg.err) { bt.classList.add('err'); bt.title = '⚠ Lần gửi gần nhất lỗi: ' + botCfg.err; }
    const mb = $('button', 'sb-btn ghost sm', '📱 Điện thoại'); mb.type = 'button'; mb.title = 'Xem trang Công trình trên điện thoại'; mb.addEventListener('click', mobileDlg);
    if (mobCfg.on) mb.append($('i', 'sb-on', '●')); if (mobCfg.on && mobCfg.err) { mb.classList.add('err'); mb.title = '⚠ Đồng bộ lỗi: ' + mobCfg.err; }
    h.append(mb, bt, add, bk, rs); W.append(h);
  }
  // 📱 V1.2.7: xem trên điện thoại – đẩy bản chụp (bỏ ảnh) lên máy chủ HaoHao; điện thoại mở haohao-gia.nhatphan79.workers.dev/cong-trinh#<mã>
  const CT_API = 'https://haohao-gia.nhatphan79.workers.dev/ct', CT_PAGE = 'https://haohao-gia.nhatphan79.workers.dev/cong-trinh#';
  let mobCfg = {}, pushT = 0, lastPush = '';
  const rnd = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); };
  if (!RO) chrome.storage.local.get('siteMobile').then(r => { mobCfg = r.siteMobile || {}; if (mobCfg.on) pushSoon(3000); }).catch(() => {});
  const snap = () => ({ cur: data.cur, sites: data.sites.map(S => ({ ...S, dir: '', drive: '', docs: [], logs: (S.logs || []).map(L => { const { photos, ...o } = L; return { ...o, pc: (photos || []).length }; }) })) });
  function pushSoon(ms = 15000) { if (RO || !mobCfg.on) return; clearTimeout(pushT); pushT = setTimeout(pushNow, ms); }
  async function pushNow() {
    if (RO || !mobCfg.on || !mobCfg.id) return;
    const v = snap(), js = JSON.stringify(v); if (js === lastPush) return;
    try {
      const r = await fetch(CT_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: mobCfg.id, w: mobCfg.w, v }) }).then(x => x.json());
      if (!r.ok) throw new Error(r.error || 'lỗi máy chủ');
      lastPush = js; mobCfg.at = Date.now(); mobCfg.err = '';
    } catch (e) { mobCfg.err = String(e.message || e); }
    chrome.storage.local.set({ siteMobile: mobCfg }).catch(() => {});
  }
  const ctDel = c => fetch(CT_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: c.id, w: c.w, del: 1 }) }).catch(() => {});
  function mobileDlg() {
    const D = dialog('📱 Xem trên điện thoại', b => {
      b.append($('p', 'sb-p', 'Bật lên là HaoHao tự gửi bản chụp trang Công trình lên máy chủ HaoHao mỗi khi anh sửa (chậm khoảng 15 giây). Mở link dưới trên điện thoại để xem – chỉ xem, không sửa. Ảnh nhật ký và đường dẫn thư mục trên máy không gửi đi.'));
      const box = $('div', 'sb-mob');
      const draw = () => {
        box.replaceChildren();
        if (!mobCfg.on) { const on = $('button', 'sb-btn', '📱 Bật xem trên điện thoại'); on.type = 'button';
          on.addEventListener('click', async () => { mobCfg = { ...mobCfg, on: true, id: mobCfg.id || rnd(24), w: mobCfg.w || rnd(40) }; await chrome.storage.local.set({ siteMobile: mobCfg }); lastPush = ''; on.disabled = true; on.textContent = '⏳ Đang gửi…'; await pushNow(); draw(); render(true); });
          box.append(on); return; }
        const url = CT_PAGE + mobCfg.id, q = $('div', 'sb-qr');
        try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); const im = document.createElement('img'); im.src = qr.createDataURL(5, 2); im.alt = 'Mã QR mở trang Công trình'; q.append(im); } catch {}
        const lk = $('a', 'sb-link', url); lk.href = url; lk.target = '_blank'; lk.rel = 'noopener';
        const st = $('div', 'sb-note' + (mobCfg.err ? ' bad' : ''), mobCfg.err ? '⚠ Gửi lỗi: ' + mobCfg.err : mobCfg.at ? '✅ Đã gửi lúc ' + new Date(mobCfg.at).toLocaleString('vi-VN') : '⏳ Chưa gửi');
        const row = $('div', 'sb-row');
        const cp = $('button', 'sb-btn sm', '📋 Chép link'); cp.type = 'button'; cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); toast('📋 Đã chép – gửi sang Zalo điện thoại của anh'); } catch {} });
        const now = $('button', 'sb-btn ghost sm', '⬆ Gửi ngay'); now.type = 'button'; now.addEventListener('click', async () => { lastPush = ''; now.disabled = true; await pushNow(); draw(); });
        const nw = $('button', 'sb-btn ghost sm', '🔄 Đổi link'); nw.type = 'button'; nw.title = 'Link cũ ngừng xem được (khi lỡ gửi nhầm người)';
        nw.addEventListener('click', async () => { ctDel(mobCfg); mobCfg = { on: true, id: rnd(24), w: rnd(40) }; lastPush = ''; await pushNow(); draw(); toast('🔄 Đã đổi link – link cũ không xem được nữa'); });
        const off = $('button', 'sb-x', 'Tắt & xoá trên máy chủ'); off.type = 'button';
        off.addEventListener('click', async () => { ctDel(mobCfg); mobCfg = {}; await chrome.storage.local.set({ siteMobile: mobCfg }); draw(); render(true); toast('Đã tắt – dữ liệu trên máy chủ đã xoá'); });
        row.append(cp, now, nw);
        const tx = $('div', 'sb-mobt'); tx.append($('b', '', 'Quét mã QR bằng Zalo / camera điện thoại'), lk, st, row);
        box.append(q, tx, off, $('div', 'sb-note', '💡 Ai có link này đều xem được – chỉ gửi cho người tin cậy. Trên điện thoại bấm "Thêm vào màn hình chính" để mở như app.'));
      };
      draw(); b.append(box);
    }, () => {}, 'Xong');
    D.row.querySelector('.ghost').style.display = 'none';
  }
  // 🤖 V1.2.6: bot Zalo – gửi Tổng quan mỗi ngày (sitebot.js chạy nền)
  let botCfg = {};
  chrome.storage.local.get('siteBot').then(r => { botCfg = r.siteBot || {}; if (ready) render(); }).catch(() => {});
  const bgMsg = m => chrome.runtime.sendMessage(m).catch(e => ({ ok: false, err: String(e.message || e) }));
  function botDlg() {
    const c = { token: '', chatId: '', chatName: '', time: '07:00', on: true, cmd: true, ...botCfg };
    const saveBot = async p => { Object.assign(c, p); const { siteBot: o = {} } = await chrome.storage.local.get('siteBot'); botCfg = { ...o, ...c }; await chrome.storage.local.set({ siteBot: botCfg }); };
    const D = dialog('🤖 Bot Zalo – Tổng quan mỗi ngày', b => {
      const st = $('ol', 'sb-ol sb-botsteps');
      const li1 = $('li'); const a = $('a', '', 'bot.zaloplatforms.com'); a.href = 'https://bot.zaloplatforms.com'; a.target = '_blank'; a.rel = 'noopener';
      li1.append('Mở ', a, ', đăng nhập Zalo → ', $('b', '', 'Tạo bot'), ' → chép ', $('b', '', 'Bot Token'), ' dán vào ô dưới.');
      const li2 = $('li'); li2.append('Mở Zalo trên điện thoại, tìm bot vừa tạo, nhắn ', $('b', '', 'hi'), ' (muốn gửi vào nhóm thì thêm bot vào nhóm rồi nhắn trong nhóm).');
      const li3 = $('li'); li3.append('Bấm ', $('b', '', '🔗 Kết nối'), ' – HaoHao tự nhận cuộc trò chuyện.');
      st.append(li1, li2, li3); b.append(st);
      const g = $('div', 'sb-fg');
      const tk = $('input', 'sb-in'); tk.type = 'password'; tk.value = c.token || ''; tk.placeholder = '123456789:AbCdEf…'; tk.autocomplete = 'off'; tk.setAttribute('aria-label', 'Bot Token');
      const show = $('button', 'sb-btn ghost sm', '👁'); show.type = 'button'; show.title = 'Hiện / ẩn token'; show.addEventListener('click', () => { tk.type = tk.type === 'password' ? 'text' : 'password'; });
      const tw = $('div', 'sb-row'); tk.style.flex = '1'; tw.append(tk, show);
      g.append(lab('Bot Token', tw, true));
      const linkSt = $('div', 'sb-note'), setLink = () => { linkSt.textContent = c.chatId ? '✅ Đã kết nối: ' + (c.chatName || 'Zalo') + ' (mã ' + c.chatId + ')' : 'Chưa kết nối cuộc trò chuyện nào'; };
      setLink();
      const lk = $('button', 'sb-btn sm', '🔗 Kết nối'); lk.type = 'button';
      lk.addEventListener('click', async () => {
        const token = tk.value.trim(); if (!/^\d+:.+/.test(token)) { toast('Token có dạng 123456789:chuỗi-ký-tự'); return tk.focus(); }
        lk.disabled = true; lk.textContent = '⏳ Kiểm tra token…';
        const ck = await bgMsg({ type: 'sb-bot-check', token });
        if (!ck || !ck.ok) { lk.disabled = false; lk.textContent = '🔗 Kết nối'; linkSt.textContent = '⚠ ' + ((ck && ck.err) || 'Không gọi được Zalo'); return; }
        lk.textContent = '⏳ Đang chờ tin nhắn "hi" (≤ 50 giây)…'; linkSt.textContent = 'Bot: ' + ck.name + ' – giờ mở Zalo nhắn "hi" cho bot';
        const r = await bgMsg({ type: 'sb-bot-link', token });
        lk.disabled = false; lk.textContent = '🔗 Kết nối';
        if (r && r.ok) { await saveBot({ token, chatId: r.chatId, chatName: (r.group ? 'Nhóm · ' : '') + (r.chatName || ck.name), on: true }); setLink(); toast('✅ Đã kết nối Zalo – bot vừa gửi lời chào'); render(true); }
        else linkSt.textContent = '⚠ ' + ((r && r.err) || 'Không kết nối được');
      });
      const lr = $('div', 'sb-row'); lr.append(lk); g.append(lab('Cuộc trò chuyện nhận tin', linkSt, true), lr);
      const tm = $('input', 'sb-in'); tm.type = 'time'; tm.value = c.time || '07:00'; tm.setAttribute('aria-label', 'Giờ gửi');
      const on = $('input', 'sb-chk'); on.type = 'checkbox'; on.checked = c.on !== false; on.style.margin = '6px 0';
      const cm = $('input', 'sb-chk'); cm.type = 'checkbox'; cm.checked = c.cmd !== false; cm.style.margin = '6px 0';
      g.append(lab('Giờ gửi mỗi ngày', tm), lab('Bật gửi tự động', on), lab('Trả lời lệnh tq / hn / vd', cm));
      b.append(g);
      const sl = $('div', 'sb-fl', 'Công trình được gửi'); const sw = $('div', 'sb-chips');
      data.sites.forEach(S => { const l = $('label', 'sb-chip on'), x = $('input'); x.type = 'checkbox'; x.checked = !S.botOff; x.style.marginRight = '6px'; l.classList.toggle('on', x.checked);
        x.addEventListener('change', () => { S.botOff = !x.checked; l.classList.toggle('on', x.checked); save(); }); l.append(x, (S.code ? S.code + ' · ' : '') + S.name); sw.append(l); });
      if (data.sites.length) b.append(sl, sw);
      const act = $('div', 'sb-row'); act.style.marginTop = '12px';
      const pv = $('button', 'sb-btn ghost sm', '👀 Xem trước tin nhắn'); pv.type = 'button';
      const pre = $('pre', 'sb-pre'); pre.hidden = true;
      pv.addEventListener('click', async () => { const r = await bgMsg({ type: 'sb-bot-preview' }); pre.textContent = (r && r.text) || (r && r.err) || ''; pre.hidden = false; });
      const ts = $('button', 'sb-btn ghost sm', '📨 Gửi thử ngay'); ts.type = 'button';
      ts.addEventListener('click', async () => {
        if (!c.chatId) return toast('Bấm 🔗 Kết nối trước');
        await saveBot({ token: tk.value.trim() || c.token, time: tm.value || '07:00', on: on.checked, cmd: cm.checked });
        ts.disabled = true; ts.textContent = '⏳ Đang gửi…'; const r = await bgMsg({ type: 'sb-bot-test' }); ts.disabled = false; ts.textContent = '📨 Gửi thử ngay';
        toast(r && r.ok ? '📨 Đã gửi ' + r.n + ' tin vào Zalo' : '⚠ ' + ((r && r.err) || 'Gửi lỗi'));
      });
      act.append(pv, ts); b.append(act, pre);
      if (c.err) b.append($('div', 'sb-note bad', '⚠ Lần gửi gần nhất lỗi: ' + c.err));
      b.append($('div', 'sb-note', '💡 Bot chạy trong HaoHao nên máy tính và Chrome cần đang mở. Lỡ giờ (máy tắt) thì HaoHao gửi bù ngay khi mở Chrome trong ngày. Token chỉ lưu trên máy này.'));
      D_on = () => ({ token: tk.value.trim(), time: tm.value || '07:00', on: on.checked, cmd: cm.checked });
    }, async () => {
      const p = D_on(); if (p.token !== c.token) Object.assign(p, { chatId: '', chatName: '' }); if (p.time !== c.time) p.last = '';
      if (p.token !== c.token && c.token) toast('Đổi token → cần 🔗 Kết nối lại');
      await saveBot(p); render(true); if (p.on && c.chatId) toast('🤖 Bot sẽ gửi tổng quan lúc ' + p.time + ' mỗi ngày');
    });
    void D;
  }
  let D_on = () => ({});
  function backup() {
    const b = new Blob([JSON.stringify({ app: 'HaoHao SITE BRAIN', at: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
    const a = $('a'); a.href = URL.createObjectURL(b); a.download = 'SITE-BRAIN-' + today() + '.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    data.lastBackup = today(); save(); toast('💾 Đã tải file sao lưu – cất vào thư mục 00_QUAN_LY_CHUNG');
  }
  function restore() {
    const i = $('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.addEventListener('change', async () => {
      try { const j = JSON.parse(await i.files[0].text()), d = j.data || j; if (!Array.isArray(d.sites)) throw 0;
        dialog('📂 Khôi phục dữ liệu', b => b.append($('p', 'sb-p', 'File có ' + d.sites.length + ' công trình (' + (j.at ? 'sao lưu ' + new Date(j.at).toLocaleString('vi-VN') : '') + '). Dữ liệu hiện tại sẽ được thay bằng file này.')),
          () => { data = d; data.sites.forEach(fix); if (!site()) data.cur = data.sites[0] ? data.sites[0].id : null; save(); render(true); toast('✅ Đã khôi phục'); }, 'Khôi phục');
      } catch { toast('⚠ File không đúng dạng sao lưu SITE BRAIN'); }
    });
    i.click();
  }
  function welcome(W) {
    const c = $('div', 'sb-welcome');
    c.append($('div', 'sb-wico', '🏗️'), $('h1', '', 'SITE BRAIN – bộ não thứ hai của Chỉ huy trưởng'),
      $('p', '', 'Mở ra là biết ngay: công trình đang ở giai đoạn nào, có chậm không, hôm nay làm gì, tổ đội nào đang làm, vật tư cần chuẩn bị, tiền đang ra sao và vấn đề nào chưa xử lý.'));
    const b = $('button', 'sb-btn', '＋ Tạo công trình đầu tiên'); b.type = 'button'; b.addEventListener('click', () => infoDlg(newSite(''), true));
    c.append(b, $('small', '', 'Dữ liệu lưu ngay trên máy anh (trong Chrome). Nhớ bấm 💾 Sao lưu định kỳ.')); W.append(c);
  }

  // ---------- 📊 TỔNG QUAN ----------
  function dash(W, S) {
    const d = today(), pr = progress(S), late = pr.tt - pr.kh;
    const top = $('div', 'sb-hero');
    const t1 = $('div', 'sb-heromain');
    t1.append($('div', 'sb-code', (S.code || '') + (S.owner ? ' · CĐT ' + S.owner : '') + (S.addr ? ' · ' + S.addr : '')), $('h1', '', S.name));
    const dl = S.end ? days(d, S.end) : null, ds = S.start ? days(S.start, d) : null;
    t1.append($('div', 'sb-sub', (ds != null && ds >= 0 ? 'Ngày thi công thứ ' + (ds + 1) : 'Chưa khởi công') + (dl != null ? ' · ' + (dl >= 0 ? 'còn ' + dl + ' ngày tới hạn hoàn thành ' + fdFull(S.end) : 'đã quá hạn hoàn thành ' + (-dl) + ' ngày') : '')));
    top.append(t1);
    const ring = $('div', 'sb-ring'); ring.style.setProperty('--p', pr.tt); ring.style.setProperty('--k', pr.kh);
    ring.append($('b', '', pr.tt + '%'), $('small', '', 'thực tế · KH ' + pr.kh + '%')); top.append(ring); W.append(top);

    const g = $('div', 'sb-grid');
    // 1. giai đoạn
    { const c = card('1 · Đang ở giai đoạn nào?'); const run = S.plan.filter(p => num(p.pct) < 100 && p.s && p.s <= d);
      c.append($('div', 'sb-big', S.phase || (run[0] && run[0].g) || 'Chưa đặt'));
      const ph = $('div', 'sb-phases'); [...new Set(S.plan.map(p => p.g || p.t))].forEach(gn => { const P = S.plan.filter(p => (p.g || p.t) === gn), w = P.reduce((a, p) => a + dur(p), 0) || 1, pc = Math.round(P.reduce((a, p) => a + num(p.pct) * dur(p), 0) / w);
        const it = $('div', 'sb-ph' + (pc >= 100 ? ' ok' : gn === S.phase ? ' cur' : '')); it.title = gn + ' · ' + pc + '%'; it.append($('span', '', gn), bar(pc, pc >= 100 ? 'ok' : '')); ph.append(it); });
      c.append(ph); g.append(c); }
    // 2. tiến độ
    { const c = card('2 · Tiến độ có chậm không?', late < -5 ? 'warn' : '');
      const lt = S.plan.filter(p => pState(p)[0] === 'late');
      c.append($('div', 'sb-big ' + (late < -5 ? 'bad' : lt.length ? 'warn' : 'good'), late < -5 ? 'Chậm ' + (-late) + '% so với kế hoạch' : (late > 5 ? 'Vượt ' + late + '% kế hoạch' : 'Tổng thể đúng kế hoạch') + (lt.length ? ' · ' + lt.length + ' hạng mục chậm' : ''))); if (lt.length) { const u = $('ul', 'sb-list'); lt.slice(0, 4).forEach(p => { const li = $('li'); li.append($('span', '', p.t), $('b', 'bad', pState(p)[1])); u.append(li); }); c.append(u); }
      const ms = S.plan.filter(p => p.mile && num(p.pct) < 100 && p.e).sort((a, b) => a.e < b.e ? -1 : 1)[0];
      if (ms) c.append($('div', 'sb-note', '🏁 Mốc nghiệm thu gần nhất: ' + ms.t + ' – ' + fdFull(ms.e) + (days(d, ms.e) >= 0 ? ' (còn ' + days(d, ms.e) + ' ngày)' : ' (đã quá ' + days(ms.e, d) + ' ngày)')));
      g.append(c); }
    // 3. hôm nay
    { const T = S.tasks.filter(t => t.st !== 'done' && (taskLate(t) || t.due === d || t.st === 'doing')).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
      const c = card('3 · Hôm nay cần làm gì?', 'wide'); const nl = S.tasks.filter(taskLate).length;
      c.querySelector('h3').append($('em', nl ? 'bad' : '', T.length + ' việc' + (nl ? ' · ' + nl + ' quá hạn' : '')));
      const u = $('ul', 'sb-list');
      T.slice(0, 8).forEach(t => { const li = $('li'), ck = $('input', 'sb-chk'); ck.type = 'checkbox'; ck.setAttribute('aria-label', 'Xong'); ck.disabled = RO;
        ck.addEventListener('change', () => { t.st = 'done'; todoPush(t, true); save(); render(true); toast('✓ Xong: ' + t.t); });
        const tx = $('span', '', t.t || '(chưa có tên)'); li.append(ck, tx, $('small', '', [t.who, t.due ? (taskLate(t) ? 'trễ ' + days(t.due, d) + ' ngày' : t.due === d ? 'hôm nay' : fd(t.due)) : ''].filter(Boolean).join(' · ')));
        if (taskLate(t)) li.classList.add('late'); u.append(li); });
      if (!T.length) u.append($('li', 'sb-none', 'Không có việc tới hạn hôm nay 👍'));
      c.append(u); const q = quickAdd(S, 'Thêm việc cho hôm nay… (Enter)', d); c.append(q); c.style.order = 4; g.append(c); }
    // 4. nhân lực
    { const L = S.logs.find(l => l.d === d), c = card('4 · Tổ đội nào đang làm, đủ người không?');
      if (L) { const n = crewOf(L); c.append($('div', 'sb-big', n + ' người hôm nay'));
        const u = $('ul', 'sb-list'); S.teams.forEach(tm => { const v = num((L.crew || {})[tm.id]); if (v) { const li = $('li'); li.append($('span', '', tm.name + (tm.scope ? ' – ' + tm.scope : '')), $('b', '', v + ' người')); u.append(li); } });
        if (num(L.other)) { const li = $('li'); li.append($('span', '', 'Khác'), $('b', '', num(L.other) + ' người')); u.append(li); } c.append(u); }
      else { c.append($('div', 'sb-big muted', 'Chưa ghi nhật ký hôm nay')); if (!RO) { const b = $('button', 'sb-btn sm', '📓 Ghi nhật ký hôm nay'); b.type = 'button'; b.addEventListener('click', () => { openLog(S, d); }); c.append(b); } }
      if (!S.teams.length) c.append($('div', 'sb-note', 'Chưa có tổ đội – thêm ở mục 👷 Nhân lực.'));
      c.style.order = 3; g.append(c); }
    // 5. vật tư
    { const M = S.mats.filter(m => m.st !== 've' && (!m.need || m.need <= addD(d, 7))).sort((a, b) => (a.need || '9') < (b.need || '9') ? -1 : 1), c = card('5 · Vật tư nào cần chuẩn bị?');
      c.querySelector('h3').append($('em', '', M.length ? M.length + ' loại trong 7 ngày tới' : ''));
      const u = $('ul', 'sb-list'); M.slice(0, 6).forEach(m => { const li = $('li'); li.append($('span', '', (m.name || '?') + ' – ' + (m.qty || '') + ' ' + (m.unit || '')), $('small', m.need && m.need < d ? 'bad' : '', lbl(MST, m.st) + (m.need ? ' · cần ' + fd(m.need) : ''))); u.append(li); });
      if (!M.length) u.append($('li', 'sb-none', 'Không có vật tư cần gấp')); c.append(u); c.style.order = 5; g.append(c); }
    // 6. chi phí
    { const B = S.budget.reduce((a, b) => a + num(b.est), 0) || num(S.value), C = spent(S), I = S.incomes.reduce((a, x) => a + num(x.amt), 0), debt = S.costs.filter(x => !x.paid).reduce((a, x) => a + num(x.amt), 0);
      const c = card('6 · Chi phí và dòng tiền ra sao?', C > B && B ? 'warn' : '');
      const k = $('div', 'sb-kpis'); k.append(kpi('Đã chi', short(C), B ? Math.round(C / B * 100) + '% dự toán' : 'chưa có dự toán', C > B && B ? 'bad' : ''), kpi('Đã thu', short(I), num(S.value) ? Math.round(I / num(S.value) * 100) + '% giá trị HĐ' : ''), kpi('Dòng tiền', short(I - C), I - C < 0 ? 'đang ứng tiền' : 'dương', I - C < 0 ? 'bad' : 'good'), kpi('Còn nợ', short(debt), 'chi chưa trả', debt ? 'warn' : ''));
      c.append(k); if (B) c.append(bar(C / B * 100, C > B ? 'bad' : '')); c.style.order = 6; c.classList.add('span2'); g.append(c); }
    // 7. vấn đề
    { const I = S.issues.filter(x => x.st !== 'dong').sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1), cd = I.filter(x => x.st === 'cd').length, c = card('7 · Vấn đề nào tồn đọng, ai xử lý?', 'wide');
      c.querySelector('h3').append($('em', I.some(x => x.due && x.due < d) ? 'bad' : '', I.length + ' đang mở' + (cd ? ' · ' + cd + ' chờ duyệt' : '')));
      const u = $('ul', 'sb-list'); I.slice(0, 6).forEach(x => { const li = $('li'); li.append($('span', 'sb-tag', lbl(ITYPE, x.type) || 'Vấn đề'), $('span', '', x.t || '(chưa ghi)'), $('small', x.due && x.due < d ? 'bad' : '', [x.who ? '👤 ' + x.who : '👤 chưa giao', lbl(IST, x.st), x.due ? 'hạn ' + fd(x.due) : ''].filter(Boolean).join(' · '))); if (x.due && x.due < d) li.classList.add('late'); u.append(li); });
      if (!I.length) u.append($('li', 'sb-none', 'Không có vấn đề tồn đọng 👍')); c.append(u); c.style.order = 7; g.append(c); }
    g.classList.add('dash'); W.append(g);
    if (!RO && (!data.lastBackup || days(data.lastBackup, d) > 7)) { const n = $('div', 'sb-remind'); n.append($('span', '', '💾 ' + (data.lastBackup ? 'Đã ' + days(data.lastBackup, d) + ' ngày chưa sao lưu.' : 'Chưa sao lưu lần nào.') + ' Dữ liệu chỉ nằm trong Chrome máy này.')); const b = $('button', 'sb-btn sm', 'Sao lưu ngay'); b.type = 'button'; b.addEventListener('click', backup); n.append(b); W.append(n); }
  }
  function quickAdd(S, ph, due) {
    if (RO) return $('div');
    const f = $('form', 'sb-quick'), i = $('input', 'sb-in'); i.placeholder = ph; i.setAttribute('aria-label', ph);
    const who = $('input', 'sb-in who'); who.placeholder = 'Người làm'; who.setAttribute('aria-label', 'Người phụ trách'); who.setAttribute('list', 'sb-wl');
    const dl = $('datalist'); dl.id = 'sb-wl'; [...new Set([...S.tasks.map(t => t.who), ...S.teams.map(t => t.name)].filter(Boolean))].forEach(v => { const o = $('option'); o.value = v; dl.append(o); });
    const b = $('button', 'sb-btn sm', '＋'); b.type = 'submit'; b.setAttribute('aria-label', 'Thêm việc');
    f.append(i, who, b, dl);
    f.addEventListener('submit', e => { e.preventDefault(); if (!i.value.trim()) return i.focus(); S.tasks.push({ id: uid(), t: i.value.trim(), who: who.value.trim(), due: due || '', pri: 'tb', st: 'todo', at: today() }); save(); i.value = ''; render(true); setTimeout(() => { const q = root.querySelector('.sb-quick input'); if (q) q.focus(); }, 0); toast('＋ Đã thêm việc'); });
    return f;
  }

  // ---------- 📅 TIẾN ĐỘ ----------
  function plan(W, S) {
    const pr = progress(S);
    sec(W, '📅 Kế hoạch & tiến độ', 'Nhập hạng mục theo giai đoạn – kế hoạch tự tính theo ngày, anh chỉ cần cập nhật % thực tế');
    const k = $('div', 'sb-kpis'); k.append(kpi('Kế hoạch đến hôm nay', pr.kh + '%'), kpi('Thực tế', pr.tt + '%', '', pr.tt + 5 < pr.kh ? 'bad' : 'good'), kpi('Chênh lệch', (pr.tt - pr.kh > 0 ? '+' : '') + (pr.tt - pr.kh) + '%', pr.tt + 5 < pr.kh ? 'đang chậm' : 'ổn', pr.tt + 5 < pr.kh ? 'bad' : ''), kpi('Mốc nghiệm thu', S.plan.filter(p => p.mile && num(p.pct) >= 100).length + '/' + S.plan.filter(p => p.mile).length, 'đã đạt'));
    W.append(k);
    const P = S.plan.slice().sort((a, b) => (a.s || '9') < (b.s || '9') ? -1 : 1);
    if (P.some((p, i) => p !== S.plan[i])) { S.plan.splice(0, S.plan.length, ...P); }
    W.append(table(S.plan, [
      { k: 'g', lb: 'Giai đoạn', t: 'text', w: '13%', ph: 'Móng…' }, { k: 't', lb: 'Hạng mục', t: 'text', ph: 'Đổ bê tông móng' },
      { k: 's', lb: 'Bắt đầu', t: 'date', w: '128px' }, { k: 'e', lb: 'Kết thúc', t: 'date', w: '128px' },
      { k: 'kh', lb: 'KH %', t: 'calc', w: '60px', f: p => planPct(p, today()) + '%' }, { k: 'pct', lb: 'Thực tế %', t: 'num', w: '78px', ph: '0' },
      { k: 'mile', lb: '🏁 Mốc NT', t: 'chk', w: '62px' }, { k: 'stt', lb: 'Tình trạng', t: 'calc', w: '100px', f: p => { const [c, l] = pState(p); return $('span', 'sb-st ' + c, l); } }
    ], { list: S.plan, add: () => { const last = S.plan[S.plan.length - 1]; const s0 = last && last.e ? addD(last.e, 1) : today(); return { id: uid(), g: last ? last.g : '', t: '', s: s0, e: addD(s0, 6), pct: 0, mile: false }; }, addLb: '＋ Thêm hạng mục', cls: p => pState(p)[0] === 'late' ? 'late' : '' }));
    gantt(W, S);
  }
  function gantt(W, S) {
    const P = S.plan.filter(p => p.s && p.e); if (!P.length) return;
    const a = P.reduce((m, p) => p.s < m ? p.s : m, P[0].s), b = P.reduce((m, p) => p.e > m ? p.e : m, P[0].e), T = Math.max(1, days(a, b) + 1), d = today();
    const c = card('Biểu đồ tiến độ', 'gantt'), g = $('div', 'sb-gantt');
    const ax = $('div', 'sb-gax'); let m = a.slice(0, 7) + '-01';
    while (m <= b) { const x = Math.max(0, days(a, m)) / T * 100; const s = $('span', '', 'T' + (+m.slice(5, 7)) + (m.slice(5, 7) === '01' ? '/' + m.slice(2, 4) : '')); s.style.left = x + '%'; ax.append(s); const nd = new Date(m + 'T00:00'); nd.setMonth(nd.getMonth() + 1); m = ymd(nd); }
    g.append($('div', 'sb-glb'), ax);
    P.forEach(p => { const lb = $('div', 'sb-glb', p.t || p.g); lb.title = (p.g ? p.g + ' · ' : '') + p.t + ' · ' + fdFull(p.s) + ' → ' + fdFull(p.e);
      const tr = $('div', 'sb-gtr'), br = $('div', 'sb-gbar ' + pState(p)[0] + (p.mile ? ' mile' : '')), dn = $('i');
      br.style.left = days(a, p.s) / T * 100 + '%'; br.style.width = Math.max(.6, dur(p) / T * 100) + '%'; dn.style.width = Math.min(100, num(p.pct)) + '%'; br.append(dn); br.title = lb.title + ' · thực tế ' + num(p.pct) + '%';
      tr.append(br); g.append(lb, tr); });
    if (d >= a && d <= b) { const nw = $('div', 'sb-gnow'); nw.style.left = 'calc(var(--glw) + (100% - var(--glw)) * ' + (days(a, d) / T) + ')'; nw.title = 'Hôm nay'; g.append(nw); }
    c.append(g, $('div', 'sb-legend', '▮ Xanh = phần đã làm · Cam = đang làm · Đỏ = chậm · 🏁 viền đậm = mốc nghiệm thu · Vạch đỏ dọc = hôm nay')); W.append(c);
  }

  // ---------- ✅ CÔNG VIỆC ----------
  function task(W, S) {
    const d = today(), wk = addD(d, 7);
    sec(W, '✅ Công việc & giao việc', 'Bấm 🔕 để HaoHao nhắc 7:30 sáng ngày đến hạn');
    const F = [['open', 'Chưa xong', S.tasks.filter(t => t.st !== 'done').length], ['today', 'Hôm nay', S.tasks.filter(t => t.st !== 'done' && t.due === d).length], ['late', 'Quá hạn', S.tasks.filter(taskLate).length],
      ['week', '7 ngày tới', S.tasks.filter(t => t.st !== 'done' && t.due && t.due >= d && t.due <= wk).length], ['done', 'Đã xong', S.tasks.filter(t => t.st === 'done').length], ['all', 'Tất cả', S.tasks.length]];
    W.append(chips(F, flt.task, v => { flt.task = v; render(true); }));
    W.append(quickAdd(S, 'Gõ việc cần làm rồi Enter… (vd: Kiểm tra cốt thép dầm tầng 2)', flt.task === 'today' ? d : ''));
    const pick = { open: t => t.st !== 'done', today: t => t.st !== 'done' && t.due === d, late: taskLate, week: t => t.st !== 'done' && t.due && t.due >= d && t.due <= wk, done: t => t.st === 'done', all: () => true }[flt.task] || (() => true);
    const ord = { cao: 0, tb: 1, thap: 2 };
    const R = S.tasks.filter(pick).sort((a, b) => (a.st === 'done') - (b.st === 'done') || (a.due || '9').localeCompare(b.due || '9') || (ord[a.pri] || 1) - (ord[b.pri] || 1));
    W.append(table(R, [
      { k: 'ok', lb: '✓', t: 'calc', w: '34px', f: t => { const c = $('input', 'sb-chk'); c.type = 'checkbox'; c.checked = t.st === 'done'; c.disabled = RO; c.setAttribute('aria-label', 'Xong'); c.addEventListener('change', () => { t.st = c.checked ? 'done' : 'todo'; if (c.checked) t.doneAt = d; todoPush(t, true); save(); render(true); }); return c; } },
      { k: 't', lb: 'Công việc', t: 'text', rr: false }, { k: 'who', lb: 'Người phụ trách', t: 'text', w: '15%', rr: false },
      { k: 'due', lb: 'Hạn', t: 'date', w: '128px', on: t => todoPush(t, true) }, { k: 'pri', lb: 'Ưu tiên', t: 'sel', o: PRI, w: '96px' },
      { k: 'st', lb: 'Trạng thái', t: 'sel', o: TST, w: '106px', on: t => todoPush(t, true) }
    ], { list: S.tasks, num: false, empty: flt.task === 'open' ? 'Chưa có việc nào – gõ ở ô trên rồi Enter' : 'Không có việc nào ở bộ lọc này', cls: t => (t.st === 'done' ? 'done' : '') + (taskLate(t) ? ' late' : ''), extra: (t, x) => x.append(bellBtn(t, () => t.t, S)) }));
  }

  // ---------- 📓 NHẬT KÝ ----------
  let openLogId = null;
  function openLog(S, dd) {
    let L = S.logs.find(l => l.d === dd);
    if (!L) { const prev = S.logs.slice().sort((a, b) => a.d < b.d ? 1 : -1)[0]; L = { id: uid(), d: dd, wx: WX[0], crew: prev ? { ...prev.crew } : {}, other: 0, work: '', mat: '', issue: '', next: '', photos: [] }; S.logs.push(L); save(); }
    openLogId = L.id; tab = 'log'; render(true);
    setTimeout(() => { const el = root.querySelector('.sb-log.open textarea'); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); } }, 30);
  }
  function report(S, L) {
    const cr = S.teams.map(t => num((L.crew || {})[t.id]) ? '  – ' + t.name + ': ' + num(L.crew[t.id]) + ' người' : '').filter(Boolean);
    if (num(L.other)) cr.push('  – Khác: ' + num(L.other) + ' người');
    const pr = progress(S, L.d);
    return ['📋 BÁO CÁO NGÀY ' + fdFull(L.d), '🏗️ ' + (S.code ? S.code + ' · ' : '') + S.name, 'Thời tiết: ' + (L.wx || ''), 'Tiến độ: thực tế ' + pr.tt + '% / kế hoạch ' + pr.kh + '%',
      '👷 Nhân lực: ' + crewOf(L) + ' người', ...cr, '', '✅ Công việc đã làm:', (L.work || '–').trim(), '', '🧱 Vật tư nhập về:', (L.mat || '–').trim(), '', '⚠️ Sự cố / vấn đề:', (L.issue || 'Không').trim(), '', '📅 Kế hoạch ngày mai:', (L.next || '–').trim()].join('\n');
  }
  async function addPhotos(L, files) {
    let n = 0;
    for (const f of files) {
      if (!/^image\//.test(f.type)) continue;
      try { const bm = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(bm.width, bm.height)), cv = document.createElement('canvas');
        cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k); cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
        (L.photos = L.photos || []).push(cv.toDataURL('image/jpeg', .74)); n++; } catch {}
    }
    if (n) { save(); render(true); toast('📷 Đã thêm ' + n + ' ảnh'); }
  }
  function lightbox(src) { const bg = $('div', 'sb-dlg sb-lb'), im = document.createElement('img'); im.src = src; im.alt = 'Ảnh hiện trường'; bg.append(im); bg.addEventListener('click', () => bg.remove()); document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { bg.remove(); document.removeEventListener('keydown', k); } }); root.append(bg); }
  function log(W, S) {
    const d = today(), h = sec(W, '📓 Nhật ký thi công', 'Mỗi ngày 1 trang – nhân lực tự lấy theo tổ đội, chép báo cáo gửi Zalo 1 chạm');
    const b = $('button', 'sb-btn sm', S.logs.some(l => l.d === d) ? '📓 Mở nhật ký hôm nay' : '＋ Ghi nhật ký hôm nay'); b.type = 'button'; b.addEventListener('click', () => openLog(S, d));
    const od = $('input', 'sb-in'); od.type = 'date'; od.title = 'Ghi bù ngày khác'; od.setAttribute('aria-label', 'Ghi nhật ký ngày khác'); od.addEventListener('change', () => od.value && openLog(S, od.value));
    if (!RO) h.append(b, od);
    const L0 = S.logs.slice().sort((a, b) => a.d < b.d ? 1 : -1);
    if (!L0.length) { W.append($('div', 'sb-emptybig', 'Chưa có nhật ký nào. Bấm “＋ Ghi nhật ký hôm nay” để bắt đầu.')); return; }
    if (!openLogId || !S.logs.some(l => l.id === openLogId)) openLogId = L0[0].id;
    L0.forEach(L => {
      const open = L.id === openLogId, c = $('section', 'sb-log' + (open ? ' open' : ''));
      const hd = $('button', 'sb-logh'); hd.type = 'button'; hd.setAttribute('aria-expanded', String(open));
      hd.append($('b', '', fdFull(L.d) + (L.d === d ? ' · Hôm nay' : '')), $('span', '', (L.wx || '') + ' · 👷 ' + crewOf(L) + ' người' + (L.photos && L.photos.length ? ' · 📷 ' + L.photos.length : '')), $('small', '', (L.work || '').split('\n')[0].slice(0, 90)));
      hd.addEventListener('click', () => { openLogId = open ? '' : L.id; render(true); }); c.append(hd);
      if (open) {
        const bd = $('div', 'sb-logb'), g = $('div', 'sb-fg');
        g.append(lab('Ngày', field(L, { k: 'd', lb: 'Ngày', t: 'date' })), lab('Thời tiết', field(L, { k: 'wx', lb: 'Thời tiết', t: 'sel', o: WX.map(w => [w, w]) })));
        bd.append(g);
        const cw = $('div', 'sb-crew'); cw.append($('div', 'sb-fl', '👷 Nhân lực theo tổ đội (người)'));
        const cg = $('div', 'sb-crewg'); L.crew = L.crew || {};
        S.teams.forEach(t => { const o = { v: L.crew[t.id] || '' }; const el = field(o, { k: 'v', lb: t.name, t: 'num', ph: '0', rr: false, on: () => { L.crew[t.id] = num(o.v); tot.textContent = 'Tổng: ' + crewOf(L) + ' người'; } }); cg.append(lab(t.name, el)); });
        cg.append(lab('Khác / lẻ', field(L, { k: 'other', lb: 'Khác', t: 'num', ph: '0', rr: false, on: () => { tot.textContent = 'Tổng: ' + crewOf(L) + ' người'; } })));
        const tot = $('b', 'sb-tot', 'Tổng: ' + crewOf(L) + ' người'); cw.append(cg, tot);
        if (!S.teams.length) cw.append($('div', 'sb-note', 'Thêm tổ đội ở mục 👷 Nhân lực để chấm người theo tổ.'));
        bd.append(cw);
        const g2 = $('div', 'sb-fg');
        [['work', '✅ Công việc đã thực hiện', 4], ['mat', '🧱 Vật tư nhập về / sử dụng', 2], ['issue', '⚠️ Sự cố, vướng mắc, chỉ đạo', 2], ['next', '📅 Kế hoạch ngày mai', 2]].forEach(([k, lb, rows]) => g2.append(lab(lb, field(L, { k, lb, t: 'area', rows, rr: false }), true)));
        bd.append(g2);
        const ph = $('div', 'sb-photos'); ph.append($('div', 'sb-fl', '📷 Hình ảnh hiện trường'));
        const pg = $('div', 'sb-pg');
        (L.photos || []).forEach((src, i) => { const f = $('figure', 'sb-ph1'), im = document.createElement('img'); im.src = src; im.alt = 'Ảnh ' + (i + 1); im.addEventListener('click', () => lightbox(src));
          const x = $('button', 'sb-phx', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Xoá ảnh'); x.addEventListener('click', () => { L.photos.splice(i, 1); save(); render(true); }); f.append(im, x); pg.append(f); });
        const up = $('label', 'sb-phadd'), fi = $('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true; fi.addEventListener('change', () => addPhotos(L, [...fi.files]));
        up.append(fi, $('span', '', '＋ Thêm ảnh'), $('small', '', 'hoặc kéo ảnh / Ctrl+V'));
        if (!RO) pg.append(up); else if (L.pc) pg.append($('div', 'sb-note', '📷 ' + L.pc + ' ảnh – xem trên máy tính')); if (!RO || L.pc) { ph.append(pg); bd.append(ph); }
        bd.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); }); bd.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); addPhotos(L, [...e.dataTransfer.files]); });
        bd.addEventListener('paste', e => { const f = [...(e.clipboardData && e.clipboardData.files || [])]; if (f.length) { e.preventDefault(); addPhotos(L, f); } });
        const ft = $('div', 'sb-logf');
        const cp = $('button', 'sb-btn sm', '📋 Chép báo cáo ngày'); cp.type = 'button'; cp.addEventListener('click', async () => { try { await navigator.clipboard.writeText(report(S, L)); toast('📋 Đã chép – dán vào Zalo / tin nhắn'); } catch { dialog('📋 Báo cáo ngày', b => { const t = $('textarea', 'sb-in sb-ta'); t.rows = 16; t.value = report(S, L); b.append(t); setTimeout(() => t.select(), 0); }, () => {}, 'Đóng'); } });
        const iss = $('button', 'sb-btn ghost sm', '⚠️ Đưa sự cố vào Vấn đề'); iss.type = 'button'; iss.addEventListener('click', () => { if (!(L.issue || '').trim()) return toast('Chưa ghi sự cố'); S.issues.push({ id: uid(), d: L.d, type: 'ht', t: L.issue.trim(), prop: '', who: '', due: addD(L.d, 2), st: 'mo', res: '' }); save(); toast('⚠️ Đã thêm vào mục Vấn đề'); });
        const sp = $('div'); sp.style.flex = '1';
        ft.append(cp, iss, sp, delBtn(() => { S.logs = S.logs.filter(x => x !== L); save(); render(true); }));
        if (!RO) bd.append(ft); c.append(bd);
      }
      W.append(c);
    });
  }

  // ---------- 👷 NHÂN LỰC ----------
  function crew(W, S) {
    sec(W, '👷 Tổ đội & nhân công', 'Số người mỗi ngày lấy từ Nhật ký');
    W.append(table(S.teams, [{ k: 'name', lb: 'Tổ đội', t: 'text', ph: 'Tổ nề anh Hùng', rr: false }, { k: 'lead', lb: 'Tổ trưởng', t: 'text', w: '14%', rr: false }, { k: 'phone', lb: 'SĐT', t: 'text', w: '12%', rr: false },
      { k: 'scope', lb: 'Phụ trách hạng mục', t: 'text', rr: false }, { k: 'rate', lb: 'Đơn giá / công', t: 'money', w: '120px' }, { k: 'call', lb: '', t: 'calc', w: '40px', f: t => { if (!t.phone) return ''; const a = $('a', 'sb-call', '📞'); a.href = 'tel:' + String(t.phone).replace(/[^\d+]/g, ''); a.title = 'Gọi ' + t.phone; return a; } }],
    { list: S.teams, add: () => ({ id: uid(), name: '', lead: '', phone: '', scope: '', rate: 0 }), addLb: '＋ Thêm tổ đội', empty: 'Chưa có tổ đội nào' }));
    // bảng công 14 ngày
    const d = today(), D = Array.from({ length: 14 }, (_, i) => addD(d, i - 13));
    const c = card('Bảng công 14 ngày gần nhất', 'wide'), w = $('div', 'sb-tw'), t = $('table', 'sb-t sb-att'), hr = $('tr');
    hr.append($('th', '', 'Tổ đội')); D.forEach(x => { const h = $('th', 'c' + ([0, 6].includes(new Date(x + 'T00:00').getDay()) ? ' we' : ''), x.slice(8) + '/' + x.slice(5, 7)); hr.append(h); }); hr.append($('th', 'r', 'Tổng công'), $('th', 'r', 'Thành tiền'));
    const th = $('thead'); th.append(hr); t.append(th); const tb = $('tbody');
    const rows = [...S.teams.map(tm => [tm.name || '(chưa đặt tên)', L => num((L.crew || {})[tm.id]), num(tm.rate)]), ['Khác', L => num(L.other), 0]];
    let gT = 0, gM = 0;
    rows.forEach(([nm, get, rate]) => { const tr = $('tr'); tr.append($('td', '', nm)); D.forEach(x => { const L = S.logs.find(l => l.d === x), v = L ? get(L) : 0; tr.append($('td', 'c' + (v ? ' has' : ''), v ? String(v) : '·')); });
      const tot = S.logs.reduce((a, L) => a + get(L), 0); gT += tot; gM += tot * rate; tr.append($('td', 'r', String(tot)), $('td', 'r', rate ? money(tot * rate) : '')); tb.append(tr); });
    const tf = $('tr', 'sum'); tf.append($('td', '', 'Cộng')); D.forEach(x => { const L = S.logs.find(l => l.d === x); tf.append($('td', 'c', L ? String(crewOf(L)) : '')); }); tf.append($('td', 'r', String(gT)), $('td', 'r', money(gM))); tb.append(tf);
    t.append(tb); w.append(t); c.append(w, $('div', 'sb-note', 'Tổng công & thành tiền tính trên toàn bộ nhật ký từ trước tới nay. Thanh toán tổ đội ghi ở mục 💰 Chi phí.')); W.append(c);
  }

  // ---------- 🧱 VẬT TƯ ----------
  function mat(W, S) {
    const d = today();
    sec(W, '🧱 Nhu cầu & đề xuất vật tư', 'Đặt “Cần ngày” – Tổng quan tự báo khi còn 7 ngày');
    W.append(table(S.mats.slice().sort((a, b) => (a.st === 've') - (b.st === 've') || (a.need || '9').localeCompare(b.need || '9')), [
      { k: 'name', lb: 'Vật tư', t: 'text', ph: 'Thép D16', rr: false }, { k: 'unit', lb: 'ĐVT', t: 'text', w: '64px', rr: false }, { k: 'qty', lb: 'Số lượng', t: 'num', w: '84px', rr: false },
      { k: 'need', lb: 'Cần ngày', t: 'date', w: '128px' }, { k: 'for', lb: 'Cho hạng mục', t: 'text', w: '14%', rr: false }, { k: 'sup', lb: 'Nhà cung cấp', t: 'text', w: '13%', rr: false },
      { k: 'st', lb: 'Trạng thái', t: 'sel', o: MST, w: '100px', on: m => { if (m.st === 've' && m.name && !m.inStock) { S.stock.push({ id: uid(), d, name: m.name, unit: m.unit, io: 'in', qty: num(m.qty), note: 'Từ đề xuất' + (m.sup ? ' · ' + m.sup : '') }); m.inStock = 1; toast('🧱 Đã tự ghi nhập kho ' + m.name); } } }
    ], { list: S.mats, add: () => ({ id: uid(), name: '', unit: '', qty: '', need: addD(d, 3), for: '', sup: '', st: 'de' }), addLb: '＋ Thêm vật tư cần', cls: m => (m.st === 've' ? 'done' : '') + (m.st !== 've' && m.need && m.need < d ? ' late' : '') }));
    sec(W, '📦 Nhập – xuất vật tư');
    W.append(table(S.stock.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '')), [
      { k: 'd', lb: 'Ngày', t: 'date', w: '128px' }, { k: 'name', lb: 'Vật tư', t: 'text', rr: false }, { k: 'unit', lb: 'ĐVT', t: 'text', w: '64px', rr: false },
      { k: 'io', lb: 'Nhập / Xuất', t: 'sel', o: [['in', '⬇ Nhập'], ['out', '⬆ Xuất']], w: '96px' }, { k: 'qty', lb: 'Số lượng', t: 'num', w: '90px' }, { k: 'note', lb: 'Ghi chú', t: 'text', rr: false }
    ], { list: S.stock, add: () => ({ id: uid(), d, name: '', unit: '', io: 'in', qty: '', note: '' }), addLb: '＋ Ghi nhập / xuất' }));
    const T = stockOf(S); if (T.length) { const c = card('Tồn kho hiện trường', 'wide'), u = $('div', 'sb-stock'); T.sort((a, b) => a.name.localeCompare(b.name, 'vi')).forEach(o => { const it = $('div', 'sb-stk' + (o.in - o.out <= 0 ? ' zero' : '')); it.append($('span', '', o.name), $('b', '', (Math.round((o.in - o.out) * 100) / 100).toLocaleString('vi-VN') + ' ' + o.unit), $('small', '', 'nhập ' + o.in.toLocaleString('vi-VN') + ' · xuất ' + o.out.toLocaleString('vi-VN'))); u.append(it); }); c.append(u); W.append(c); }
  }

  // ---------- 💰 CHI PHÍ ----------
  function cost(W, S) {
    const B = S.budget.reduce((a, b) => a + num(b.est), 0), C = spent(S), I = S.incomes.reduce((a, x) => a + num(x.amt), 0), debt = S.costs.filter(x => !x.paid).reduce((a, x) => a + num(x.amt), 0);
    sec(W, '💰 Chi phí & dòng tiền');
    const k = $('div', 'sb-kpis');
    k.append(kpi('Giá trị HĐ', short(num(S.value))), kpi('Dự toán', short(B)), kpi('Đã chi', short(C), B ? Math.round(C / B * 100) + '% dự toán' : '', C > B && B ? 'bad' : ''), kpi('Còn lại', short(B - C), '', B - C < 0 ? 'bad' : ''),
      kpi('Đã thu (CĐT)', short(I)), kpi('Dòng tiền', short(I - C), I - C < 0 ? 'đang ứng tiền' : '', I - C < 0 ? 'bad' : 'good'), kpi('Công nợ phải trả', short(debt), '', debt ? 'warn' : ''));
    W.append(k);
    sec(W, 'Ngân sách theo hạng mục');
    W.append(table(S.budget, [{ k: 'name', lb: 'Hạng mục', t: 'text', ph: 'Phần thô / Điện nước / Hoàn thiện…' }, { k: 'est', lb: 'Dự toán', t: 'money', w: '150px' },
      { k: 'sp', lb: 'Đã chi', t: 'calc', w: '130px', f: b => money(spent(S, b.id)) }, { k: 'pc', lb: '% sử dụng', t: 'calc', w: '150px', f: b => { const e = num(b.est), s = spent(S, b.id), w = $('div', 'sb-pcw'); w.append(bar(e ? s / e * 100 : 0, s > e && e ? 'bad' : ''), $('span', '', e ? Math.round(s / e * 100) + '%' : '')); return w; } }],
    { list: S.budget, add: () => ({ id: uid(), name: '', est: 0 }), addLb: '＋ Thêm hạng mục dự toán', empty: 'Chưa có dự toán – thêm hạng mục để theo dõi % sử dụng' }));
    sec(W, 'Chi (vật tư, nhân công, thiết bị, khác)');
    const cats = () => [['', '—'], ...S.budget.map(b => [b.id, b.name || '(chưa đặt tên)'])];
    W.append(table(S.costs.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '')), [
      { k: 'd', lb: 'Ngày', t: 'date', w: '128px' }, { k: 'cat', lb: 'Hạng mục', t: 'sel', o: cats, w: '15%' }, { k: 't', lb: 'Nội dung', t: 'text', rr: false },
      { k: 'who', lb: 'Trả cho (tổ đội / NCC)', t: 'text', w: '15%', rr: false }, { k: 'amt', lb: 'Số tiền', t: 'money', w: '130px' }, { k: 'paid', lb: 'Đã trả', t: 'chk', w: '58px' }
    ], { list: S.costs, add: () => ({ id: uid(), d: today(), cat: '', t: '', who: '', amt: 0, paid: true }), addLb: '＋ Thêm khoản chi', cls: x => x.paid ? '' : 'warnrow' }));
    sec(W, 'Thu (chủ đầu tư tạm ứng / thanh toán)');
    W.append(table(S.incomes.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '')), [{ k: 'd', lb: 'Ngày', t: 'date', w: '128px' }, { k: 't', lb: 'Nội dung', t: 'text', ph: 'Tạm ứng đợt 1', rr: false }, { k: 'amt', lb: 'Số tiền', t: 'money', w: '150px' }],
      { list: S.incomes, add: () => ({ id: uid(), d: today(), t: '', amt: 0 }), addLb: '＋ Thêm khoản thu' }));
    // công nợ theo đối tượng
    const debts = new Map(); S.costs.filter(x => !x.paid && num(x.amt)).forEach(x => { const k = (x.who || '(chưa ghi)').trim(); debts.set(k, (debts.get(k) || 0) + num(x.amt)); });
    const g = $('div', 'sb-grid');
    if (debts.size) { const c = card('Công nợ phải trả'), u = $('ul', 'sb-list'); [...debts].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { const li = $('li'); li.append($('span', '', k), $('b', 'bad', money(v) + ' ₫')); u.append(li); }); c.append(u); g.append(c); }
    // dòng tiền theo tháng
    const M = new Map(); const put = (d, k, v) => { if (!d) return; const m = d.slice(0, 7); const o = M.get(m) || { thu: 0, chi: 0 }; o[k] += v; M.set(m, o); };
    S.incomes.forEach(x => put(x.d, 'thu', num(x.amt))); S.costs.forEach(x => put(x.d, 'chi', num(x.amt)));
    if (M.size) { const c = card('Dòng tiền theo tháng', debts.size ? '' : 'wide'), ks = [...M.keys()].sort(), mx = Math.max(...[...M.values()].flatMap(o => [o.thu, o.chi]), 1); let cum = 0;
      const ch = $('div', 'sb-cf'); ks.forEach(m => { const o = M.get(m); cum += o.thu - o.chi; const col = $('div', 'sb-cfc'), bs = $('div', 'sb-cfb'), a = $('i', 'thu'), b2 = $('i', 'chi'); a.style.height = o.thu / mx * 100 + '%'; b2.style.height = o.chi / mx * 100 + '%'; a.title = 'Thu ' + money(o.thu); b2.title = 'Chi ' + money(o.chi); bs.append(a, b2);
        col.append(bs, $('span', '', 'T' + (+m.slice(5)) + '/' + m.slice(2, 4)), $('small', cum < 0 ? 'bad' : 'good', short(cum))); ch.append(col); });
      c.append(ch, $('div', 'sb-legend', '▮ xanh = thu · ▮ cam = chi · số dưới = dòng tiền luỹ kế')); g.append(c); }
    if (g.children.length) W.append(g);
  }

  // ---------- ⚠️ VẤN ĐỀ ----------
  function issue(W, S) {
    const d = today();
    sec(W, '⚠️ Vấn đề & phê duyệt', 'Mỗi vấn đề phải có người chịu trách nhiệm và hạn xử lý');
    const F = [['open', 'Đang mở', S.issues.filter(x => x.st !== 'dong').length], ['cd', 'Chờ duyệt', S.issues.filter(x => x.st === 'cd').length], ['late', 'Quá hạn', S.issues.filter(x => x.st !== 'dong' && x.due && x.due < d).length], ['dong', 'Đã xong', S.issues.filter(x => x.st === 'dong').length], ['all', 'Tất cả', S.issues.length]];
    W.append(chips(F, flt.issue, v => { flt.issue = v; render(true); }));
    const pick = { open: x => x.st !== 'dong', cd: x => x.st === 'cd', late: x => x.st !== 'dong' && x.due && x.due < d, dong: x => x.st === 'dong', all: () => true }[flt.issue];
    W.append(table(S.issues.filter(pick).sort((a, b) => (a.st === 'dong') - (b.st === 'dong') || (a.due || '9').localeCompare(b.due || '9')), [
      { k: 'd', lb: 'Ngày', t: 'date', w: '124px' }, { k: 'type', lb: 'Loại', t: 'sel', o: ITYPE, w: '112px' }, { k: 't', lb: 'Vấn đề', t: 'area', rr: false, rows: 1 },
      { k: 'prop', lb: 'Đề xuất xử lý', t: 'area', rr: false, rows: 1 }, { k: 'who', lb: 'Người chịu TN', t: 'text', w: '11%', rr: false },
      { k: 'due', lb: 'Hạn', t: 'date', w: '124px', on: x => todoPush(x, false) }, { k: 'st', lb: 'Trạng thái', t: 'sel', o: IST, w: '108px', on: x => { if (x.st === 'dong') x.closed = d; todoPush(x, false); } }, { k: 'res', lb: 'Kết quả', t: 'area', rr: false, rows: 1 }
    ], { list: S.issues, add: () => ({ id: uid(), d, type: 'ht', t: '', prop: '', who: '', due: addD(d, 2), st: 'mo', res: '' }), addLb: '＋ Thêm vấn đề', empty: 'Không có vấn đề nào ở bộ lọc này', cls: x => (x.st === 'dong' ? 'done' : '') + (x.st !== 'dong' && x.due && x.due < d ? ' late' : ''), extra: (x, td) => td.append(bellBtn(x, () => (lbl(ITYPE, x.type) ? '[' + lbl(ITYPE, x.type) + '] ' : '') + (x.t || '').split('\n')[0], S)) }));
  }

  // ---------- 📁 HỒ SƠ ----------
  const fileUrl = v => 'file:///' + v.trim().replace(/^file:\/+/i, '').replace(/\\/g, '/').split('/').map(x => encodeURIComponent(x).replace(/%3A/gi, ':')).join('/') + (/[\\/]$/.test(v.trim()) ? '' : '/');
  const fileOk = () => new Promise(res => { try { chrome.extension.isAllowedFileSchemeAccess(ok => res(!!ok)); } catch { res(false); } });
  async function openPath(v) {
    if (!v) return; if (/^https?:\/\//i.test(v)) { chrome.tabs.create({ url: v }).catch(() => window.open(v, '_blank')); return; }
    if (await fileOk()) { chrome.tabs.create({ url: fileUrl(v) }).catch(() => toast('⚠ Không mở được – kiểm tra lại đường dẫn')); return; }
    try { await navigator.clipboard.writeText(v); } catch {}
    dialog('📁 Cần bật 1 lần để mở thư mục', b => {
      const ol = $('ol', 'sb-ol'); [['Bấm ', '⚙️ Mở cài đặt HaoHao', ' bên dưới.'], ['Bật ', 'Cho phép truy cập vào URL tệp', ' (Allow access to file URLs).'], ['Quay lại bấm ', '📁', ' lần nữa.']].forEach(([a, x, c]) => { const li = $('li'); li.append(a, $('b', '', x), c); ol.append(li); });
      b.append(ol, $('p', 'sb-p', 'Đường dẫn đã được chép sẵn – mở bằng File Explorer: Win + E, Ctrl + L, Ctrl + V.'));
    }, () => { chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id }).catch(() => {}); }, '⚙️ Mở cài đặt HaoHao');
  }
  const folderName = S => (S.code || 'DA001') + '_' + (S.name || 'CONG_TRINH').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  function file(W, S) {
    sec(W, '📁 Hồ sơ công trình', 'Hồ sơ gốc nằm trên máy / ổ đám mây – ở đây chỉ lưu đường dẫn để mở nhanh');
    const c = card('Thư mục gốc của công trình', 'wide'), g = $('div', 'sb-fg');
    const dr = field(S, { k: 'dir', lb: 'Thư mục', t: 'text', ph: 'D:\\DU_AN_XAY_DUNG\\01_' + folderName(S) });
    g.append(lab('Thư mục trên máy', dr, true), lab('Link Google Drive / OneDrive (nếu có)', field(S, { k: 'drive', lb: 'Drive', t: 'text', ph: 'https://drive.google.com/…' }), true)); c.append(g);
    const row = $('div', 'sb-row');
    const op = $('button', 'sb-btn sm', '📁 Mở thư mục'); op.type = 'button'; op.addEventListener('click', () => S.dir ? openPath(S.dir) : toast('Nhập đường dẫn thư mục trước'));
    const dv = $('button', 'sb-btn ghost sm', '☁️ Mở Drive'); dv.type = 'button'; dv.addEventListener('click', () => S.drive ? openPath(S.drive) : toast('Chưa có link Drive'));
    const ps = $('button', 'sb-btn ghost sm', '⚡ Chép lệnh tạo cây thư mục chuẩn'); ps.type = 'button'; ps.title = 'Dán vào PowerShell (Win + X → Terminal) để tạo đủ 12 thư mục 00–99';
    ps.addEventListener('click', async () => {
      const base = (S.dir || ('D:\\DU_AN_XAY_DUNG\\01_' + folderName(S))).replace(/[\\/]+$/, '');
      const cmd = '$g = "' + base.replace(/"/g, '') + '"; ' + JSON.stringify(FOLDERS).replace(/^\[|\]$/g, '').split(',').map(x => x.trim()).join(', ').replace(/^/, '@(') + ') | ForEach-Object { New-Item -ItemType Directory -Force -Path (Join-Path $g $_) | Out-Null }; explorer $g';
      try { await navigator.clipboard.writeText(cmd); toast('⚡ Đã chép – mở PowerShell, dán (Ctrl+V), Enter'); } catch { dialog('⚡ Lệnh tạo thư mục', b => { const t = $('textarea', 'sb-in sb-ta'); t.rows = 6; t.value = cmd; b.append(t); }, () => {}, 'Đóng'); }
    });
    row.append(op, dv, ps); c.append(row); W.append(c);
    const fc = card('Cây thư mục chuẩn', 'wide'), fl = $('div', 'sb-folders');
    FOLDERS.forEach(f => { const b = $('button', 'sb-fold'); b.type = 'button'; b.append($('span', '', '📁'), $('b', '', f.slice(0, 2)), $('small', '', f.slice(3).replace(/_/g, ' ').toLowerCase())); b.title = S.dir ? S.dir.replace(/[\\/]+$/, '') + '\\' + f : 'Nhập thư mục gốc để mở';
      b.addEventListener('click', () => S.dir ? openPath(S.dir.replace(/[\\/]+$/, '') + '\\' + f) : toast('Nhập thư mục gốc ở trên trước')); fl.append(b); });
    fc.append(fl); W.append(fc);
    sec(W, '📌 Tài liệu hay dùng', 'Hợp đồng, bản vẽ, dự toán… – dán đường dẫn file hoặc link');
    W.append(table(S.docs, [{ k: 't', lb: 'Tên tài liệu', t: 'text', ph: 'Bản vẽ kết cấu rev2', rr: false }, { k: 'f', lb: 'Thư mục', t: 'sel', o: [['', '—'], ...FOLDERS.map(f => [f, f])], w: '22%' },
      { k: 'p', lb: 'Đường dẫn / link', t: 'text', ph: 'D:\\…\\ban-ve.pdf hoặc https://…', rr: false }, { k: 'op', lb: '', t: 'calc', w: '44px', f: x => { const b = $('button', 'sb-open', '↗'); b.type = 'button'; b.title = 'Mở'; b.addEventListener('click', () => x.p ? openPath(/\.[a-z0-9]{2,5}$/i.test(x.p) && !/^https?:/i.test(x.p) ? x.p.replace(/[\\/][^\\/]*$/, '') : x.p) : toast('Chưa có đường dẫn')); return b; } }],
    { list: S.docs, add: () => ({ id: uid(), t: '', f: '', p: '' }), addLb: '＋ Thêm tài liệu' }));
  }

  // ---------- vẽ ----------
  const VIEWS = { dash, plan, task, log, crew, mat, cost, issue, file };
  let rendering = false;
  function render(force) {
    if (rendering) { setTimeout(() => render(force), 0); return; }
    if (!ready || root.hidden || (!force && editing())) return;
    rendering = true; dirty = false;
    try {
      const y = window.scrollY, W = $('div', 'sb-wrap'), S = site(); head(W, S);
      if (!S) welcome(W);
      else {
        fix(S);
        const nav = $('nav', 'sb-tabs'); nav.setAttribute('aria-label', 'Mục công trình');
        const badge = { task: S.tasks.filter(taskLate).length, issue: S.issues.filter(x => x.st !== 'dong').length, mat: S.mats.filter(m => m.st !== 've' && m.need && m.need <= addD(today(), 3)).length };
        TABS.filter(([k]) => !RO || k !== 'file').forEach(([k, l]) => { const b = $('button', 'sb-tab' + (k === tab ? ' on' : ''), l); b.type = 'button'; if (k === tab) b.setAttribute('aria-current', 'page'); if (badge[k]) b.append($('i', '', String(badge[k]))); b.addEventListener('click', () => { tab = k; render(true); window.scrollTo(0, 0); }); nav.append(b); });
        W.append(nav); const body = $('div', 'sb-body'); (VIEWS[tab] || dash)(body, S); W.append(body);
      }
      const keep = [...root.querySelectorAll('.sb-toast,.sb-dlg')];
      root.replaceChildren(W, ...keep); window.scrollTo(0, y);
    } finally { rendering = false; }
  }
  window.addEventListener('sb-show', () => render(true));
  chrome.storage.local.get([KEY, 'todos']).then(r => {
    if (r[KEY] && Array.isArray(r[KEY].sites)) data = r[KEY];
    data.sites.forEach(fix); if (!site() && data.sites[0]) data.cur = data.sites[0].id;
    todos = Array.isArray(r.todos) ? r.todos : [];
    if (todoSync()) save();
    ready = true; render(true);
  }).catch(() => { ready = true; render(true); });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.todos) { todos = Array.isArray(ch.todos.newValue) ? ch.todos.newValue : []; if (ready && todoSync()) { save(); render(); } }
    if (!ch[KEY] || !ch[KEY].newValue) return;
    const v = ch[KEY].newValue, js = JSON.stringify(v);
    if (js === lastSaved || js === JSON.stringify(data)) return;
    if (editing()) { pend = v; return; }
    data = v; data.sites.forEach(fix); lastSaved = js; render();
  });
  root.addEventListener('focusout', () => setTimeout(() => { if (editing()) return; if (pend) { data = pend; pend = null; data.sites.forEach(fix); lastSaved = JSON.stringify(data); dirty = false; render(true); } else if (dirty) { dirty = false; render(true); } }, 0));
  // nhắc nhật ký: sau 17h chưa ghi nhật ký hôm nay → chấm đỏ trên nút 🏗️ Công trình
  const dot = () => { const b = document.querySelector('.pgsw-o[data-pg="2"]'), S = site(); if (!b) return; b.classList.toggle('sb-dot', !!(S && new Date().getHours() >= 17 && !S.logs.some(l => l.d === today()))); };
  setInterval(dot, 6e4); setTimeout(dot, 800);
})();
