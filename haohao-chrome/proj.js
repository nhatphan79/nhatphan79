// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📋 V1.20: trang Dự án trong Tab mới (chỉ máy chủ app): bảng thẻ 3 cột (Đang làm / Tạm dừng / Xong), kéo thả đổi cột;
// mỗi dự án có thư mục con (việc cần làm, ghi chú, link). Lưu chrome.storage.local['projBoard'].
(() => {
  const root = document.getElementById('proj'); if (!root) return;
  const COLS = [['doing', 'Đang làm', '#E08A00'], ['pause', 'Tạm dừng', '#9AA1B5'], ['done', 'Xong', '#2E8B57']];
  const TYPES = { sw: '💻 Phần mềm', build: '🏠 Công trình', biz: '📣 Kinh doanh' };
  const FOLDERS = { sw: ['Tính năng', 'Lỗi cần sửa', 'Phát hành'], build: ['Báo giá', 'Thiết kế', 'Xin phép', 'Thi công', 'Bàn giao'], biz: ['Ý tưởng', 'Nội dung', 'Kết quả'] };
  let data = { projects: [] }, openId = null, openFolder = null, ready = false;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const save = () => chrome.storage.local.set({ projBoard: data }).catch(() => {});
  const ymd = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
  const today = () => ymd(new Date());
  const fmt = s => s ? new Date(s + 'T00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const tasksOf = p => p.folders.flatMap(f => f.tasks);
  const pct = p => { const T = tasksOf(p); return T.length ? Math.round(T.filter(t => t.done).length / T.length * 100) : (p.col === 'done' ? 100 : 0); };
  const nextOf = p => { if (p.next && p.next.trim()) return p.next.trim(); for (const f of p.folders) { const t = f.tasks.find(x => !x.done && x.t.trim()); if (t) return t.t + ' · ' + f.name; } return ''; };
  const proj = () => data.projects.find(p => p.id === openId);
  const editing = () => { const a = document.activeElement; return a && root.contains(a) && /INPUT|TEXTAREA/.test(a.tagName) && !/checkbox|date/.test(a.type || ''); };

  function newProject() {
    const p = { id: uid(), name: 'Dự án mới', type: 'sw', col: 'doing', due: '', next: '', at: Date.now(), folders: FOLDERS.sw.map(n => ({ id: uid(), name: n, tasks: [], note: '', links: [] })) };
    data.projects.unshift(p); save(); openId = p.id; openFolder = p.folders[0].id; render(true);
    setTimeout(() => { const n = root.querySelector('.pj-name'); if (n) { n.focus(); n.select(); } }, 30);
  }

  function card(p) {
    const c = $('div', 'pj-card'); c.tabIndex = 0; c.draggable = true; c.setAttribute('role', 'button'); c.setAttribute('aria-label', 'Mở dự án ' + p.name);
    c.append($('div', 'nm', p.name || '(chưa đặt tên)'));
    const m = $('div', 'pj-meta'), v = pct(p); m.append($('span', 'pj-tag ' + p.type, TYPES[p.type]), $('span', '', v + '%'));
    if (p.due) { const T = today(), soon = ymd(Date.now() + 3 * 864e5); m.append($('span', 'pj-due' + (p.col !== 'done' && p.due < T ? ' late' : p.col !== 'done' && p.due <= soon ? ' soon' : ''), '⏰ ' + fmt(p.due))); }
    const bar = $('div', 'pj-bar'), bi = $('i'); bi.style.width = v + '%'; bar.append(bi);
    c.append(m, bar);
    const nx = nextOf(p); if (nx && p.col !== 'done') { const n = $('div', 'pj-next'); n.append($('span', '', 'Việc tiếp theo'), nx); c.append(n); }
    const open = () => { openId = p.id; openFolder = (p.folders[0] || {}).id || null; render(true); window.scrollTo({ top: 0 }); };
    c.addEventListener('click', open); c.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
    c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', p.id); c.classList.add('drag'); });
    c.addEventListener('dragend', () => c.classList.remove('drag'));
    return c;
  }

  function board(W) {
    const top = $('div', 'pj-top'), add = $('button', 'pj-btn', '＋ Dự án mới'); add.addEventListener('click', newProject);
    top.append($('h1', '', 'Dự án đang làm'), add); W.append(top);
    const B = $('div', 'pj-board');
    for (const [k, lb, color] of COLS) {
      const col = $('div', 'pj-col'), L = data.projects.filter(p => p.col === k);
      const h = $('div', 'pj-colh'), dot = $('i'); dot.style.background = color; h.append(dot, lb, $('b', '', L.length));
      const cs = $('div', 'pj-cards'); L.forEach(p => cs.append(card(p)));
      if (!L.length) cs.append($('div', 'pj-empty', k === 'doing' ? 'Bấm ＋ Dự án mới để bắt đầu' : 'Kéo thẻ dự án vào đây'));
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); const p = data.projects.find(x => x.id === e.dataTransfer.getData('text/plain')); if (p && p.col !== k) { p.col = k; save(); render(true); } });
      col.append(h, cs); B.append(col);
    }
    W.append(B);
  }

  function detail(W, p) {
    const top = $('div', 'pj-top'), back = $('button', 'pj-btn ghost', '← Về bảng dự án');
    back.addEventListener('click', () => { openId = null; render(true); });
    const del = $('button', 'pj-x', '🗑 Xoá dự án'); let armed = false;
    del.addEventListener('click', () => { if (!armed) { armed = true; del.textContent = 'Bấm lần nữa để xoá hẳn'; setTimeout(() => { armed = false; del.textContent = '🗑 Xoá dự án'; }, 3000); return; } data.projects = data.projects.filter(x => x !== p); save(); openId = null; render(true); });
    top.append(back, $('div', '', ''), del); top.children[1].style.flex = '1'; W.append(top);
    const D = $('div', 'pj-det'), S = $('div', 'pj-side'), M = $('div', 'pj-main');
    const fld = (lb, el) => { const l = $('label', 'pj-field'); l.append(lb, el); return l; };
    const nm = $('input', 'pj-name'); nm.value = p.name; nm.setAttribute('aria-label', 'Tên dự án');
    nm.addEventListener('change', () => { p.name = nm.value.trim() || 'Dự án mới'; save(); });
    const ty = $('select'); for (const k in TYPES) { const o = $('option', '', TYPES[k]); o.value = k; o.selected = k === p.type; ty.append(o); }
    ty.addEventListener('change', () => { p.type = ty.value; save(); render(true); });
    const st = $('select'); for (const [k, lb] of COLS) { const o = $('option', '', lb); o.value = k; o.selected = k === p.col; st.append(o); }
    st.addEventListener('change', () => { p.col = st.value; save(); render(true); });
    const du = $('input'); du.type = 'date'; du.value = p.due || ''; du.addEventListener('change', () => { p.due = du.value; save(); });
    const nx = $('input'); nx.value = p.next || ''; nx.placeholder = 'Để trống: tự lấy việc chưa xong đầu tiên';
    nx.addEventListener('change', () => { p.next = nx.value; save(); });
    S.append(nm, fld('Loại', ty), fld('Trạng thái', st), fld('Hạn chót', du), fld('Việc tiếp theo', nx));
    const v = pct(p), bar = $('div', 'pj-bar'), bi = $('i'); bi.style.width = v + '%'; bar.append(bi);
    S.append($('div', 'pj-sec', 'Tiến độ ' + v + '%'), bar, $('div', 'pj-sec', 'Thư mục con'));
    const FL = $('div', 'pj-fl');
    for (const f of p.folders) {
      const b = $('button', f.id === openFolder ? 'on' : ''); const dn = f.tasks.filter(t => t.done).length;
      b.append('📂 ' + f.name, $('small', '', f.tasks.length ? dn + '/' + f.tasks.length : ''));
      b.addEventListener('click', () => { openFolder = f.id; render(true); }); FL.append(b);
    }
    const af = $('div', 'pj-addrow'), ai = $('input', 'pj-in'); ai.placeholder = 'Thêm thư mục con…'; ai.setAttribute('aria-label', 'Tên thư mục con mới');
    const ab = $('button', 'pj-btn', '＋');
    const addF = () => { const n = ai.value.trim(); if (!n) return ai.focus(); const f = { id: uid(), name: n, tasks: [], note: '', links: [] }; p.folders.push(f); openFolder = f.id; save(); ai.value = ''; render(true); };
    ab.addEventListener('click', addF); ai.addEventListener('keydown', e => { if (e.key === 'Enter') addF(); });
    af.append(ai, ab); S.append(FL, af);

    const f = p.folders.find(x => x.id === openFolder);
    if (!f) M.append($('div', 'pj-empty', 'Thêm thư mục con ở cột bên trái để bắt đầu.'));
    else {
      const fh = $('div', 'pj-fh'), fn = $('input'); fn.value = f.name; fn.setAttribute('aria-label', 'Tên thư mục con');
      fn.addEventListener('change', () => { f.name = fn.value.trim() || f.name; save(); render(true); });
      const fd = $('button', 'pj-x', 'Xoá thư mục'); let arm = false;
      fd.addEventListener('click', () => { if (!arm && (f.tasks.length || f.note)) { arm = true; fd.textContent = 'Bấm lần nữa để xoá'; setTimeout(() => { arm = false; fd.textContent = 'Xoá thư mục'; }, 3000); return; } p.folders = p.folders.filter(x => x !== f); openFolder = (p.folders[0] || {}).id || null; save(); render(true); });
      fh.append('📂', fn, fd); M.append(fh);
      M.append($('div', 'pj-sec', 'Việc cần làm'));
      for (const t of f.tasks) {
        const r = $('div', 'pj-task' + (t.done ? ' done' : '')), cb = $('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.setAttribute('aria-label', 'Xong');
        cb.addEventListener('change', () => { t.done = cb.checked; save(); render(true); });
        const ti = $('input'); ti.type = 'text'; ti.value = t.t; ti.setAttribute('aria-label', 'Nội dung việc');
        ti.addEventListener('change', () => { t.t = ti.value; save(); });
        const x = $('button', 'pj-x', '✕'); x.setAttribute('aria-label', 'Xoá việc'); x.addEventListener('click', () => { f.tasks = f.tasks.filter(y => y !== t); save(); render(true); });
        r.append(cb, ti, x); M.append(r);
      }
      const ar = $('div', 'pj-addrow'), at = $('input', 'pj-in'); at.placeholder = 'Gõ việc rồi Enter…'; at.setAttribute('aria-label', 'Thêm việc');
      const addT = () => { const n = at.value.trim(); if (!n) return; f.tasks.push({ id: uid(), t: n, done: false }); save(); at.value = ''; render(true); setTimeout(() => { const i = root.querySelector('.pj-main .pj-addrow input'); if (i) i.focus(); }, 20); };
      at.addEventListener('keydown', e => { if (e.key === 'Enter') addT(); }); const atb = $('button', 'pj-btn', 'Thêm'); atb.addEventListener('click', addT);
      ar.append(at, atb); M.append(ar);
      M.append($('div', 'pj-sec', 'Ghi chú'));
      const no = $('textarea', 'pj-in pj-note'); no.value = f.note || ''; no.placeholder = 'Ghi chú cho thư mục này…'; no.setAttribute('aria-label', 'Ghi chú');
      let tm = 0; no.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { f.note = no.value; save(); }, 500); });
      no.addEventListener('blur', () => { f.note = no.value; save(); }); M.append(no);
      M.append($('div', 'pj-sec', 'Link liên quan'));
      for (const l of f.links) {
        const r = $('div', 'pj-link'), a = $('a', '', l.t || l.u); a.href = /^https?:/i.test(l.u) ? l.u : 'https://' + l.u; a.target = '_blank'; a.rel = 'noopener';
        const x = $('button', 'pj-x', '✕'); x.setAttribute('aria-label', 'Xoá link'); x.addEventListener('click', () => { f.links = f.links.filter(y => y !== l); save(); render(true); });
        r.append('🔗', a, x); M.append(r);
      }
      const lr = $('div', 'pj-addrow'), lu = $('input', 'pj-in'); lu.placeholder = 'Dán link (Drive, GitHub, Zalo…) rồi Enter'; lu.setAttribute('aria-label', 'Thêm link');
      const addL = () => { const u = lu.value.trim(); if (!u) return; f.links.push({ t: '', u }); save(); lu.value = ''; render(true); };
      lu.addEventListener('keydown', e => { if (e.key === 'Enter') addL(); }); lr.append(lu); M.append(lr);
    }
    D.append(S, M); W.append(D);
  }

  function render(force) {
    if (!ready || (!force && editing())) return;
    const W = $('div', 'pj-wrap'), p = openId && proj();
    if (p) detail(W, p); else { openId = null; board(W); }
    root.replaceChildren(W);
  }
  chrome.storage.local.get('projBoard').then(({ projBoard }) => { if (projBoard && Array.isArray(projBoard.projects)) data = projBoard; ready = true; render(true); }).catch(() => { ready = true; render(true); });
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.projBoard && ch.projBoard.newValue) { data = ch.projBoard.newValue; render(); } });
})();
