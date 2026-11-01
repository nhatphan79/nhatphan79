// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// ☑️ V1.4.0: VIỆC CẦN LÀM + NHẮC NHỞ trên điện thoại – cùng dữ liệu với HaoHao máy tính (máy chủ /sb?ns=todo, gộp 3 chiều).
//   Gọi: HHTodo.mount(el, { email, token }) – trang cong-trinh.html nạp khi bấm tab ☑️.
(() => {
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const pad = n => String(n).padStart(2, '0');
  const localIso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  const todayY = () => localIso(new Date()).slice(0, 10);
  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const whenTxt = due => { if (!due) return ''; const d = due.slice(0, 10), t = due.slice(11, 16), td = todayY(), tm = localIso(new Date(Date.now() + 864e5)).slice(0, 10);
    return (d === td ? 'Hôm nay' : d === tm ? 'Mai' : d.slice(8, 10) + '/' + d.slice(5, 7)) + (t ? ' ' + t : ''); };
  const ruleDesc = r => {
    const times = Array.isArray(r.times) && r.times.length ? r.times : (r.time ? [r.time] : []);
    if (r.kind === 'daily') return (Array.isArray(r.days) && r.days.length && r.days.length < 7 ? r.days.map(d => DOW[d]).join(', ') : 'Mỗi ngày') + ' lúc ' + times.join(', ');
    if (r.kind === 'interval') return 'Mỗi ' + r.minutes + ' phút, ' + (r.from || '00:00') + '–' + (r.to || '23:59');
    if (r.kind === 'lunar') return 'Âm lịch ngày ' + (r.lunarDays || []).map(x => x === 30 ? 'cuối tháng' : x).join(', ') + ' lúc ' + times.join(', ');
    if (r.kind === 'once') return 'Một lần: ' + whenTxt(r.datetime);
    return '';
  };

  window.HHTodo = {
    mount(root, A) {
      const KD = 'sbTodo:' + A.email, KB = 'sbBaseT:' + A.email;
      let doc = ls.get(KD), st = { at: 0, err: '' }, editId = null, showDone = false;
      const eng = SBSync({ api: location.origin, path: '/sb?ns=todo', empty: () => ({ todos: [], rules: [] }), token: async () => A.token,
        getLocal: async () => doc, setLocal: async v => { doc = v; ls.set(KD, v); draw(); }, getBase: async () => ls.get(KB), setBase: async v => ls.set(KB, v) });
      const sync = async () => { const r = await eng.sync(); if (r.ok) { st.at = Date.now(); st.err = ''; } else st.err = r.err; drawStatus(); return r; };
      let sT = 0; const soon = () => { clearTimeout(sT); sT = setTimeout(sync, 1200); };
      const save = () => { ls.set(KD, doc); draw(); soon(); };
      const toast = t => { let e = root.querySelector('.td-toast'); if (!e) { e = $('div', 'td-toast'); root.append(e); } e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2600); };
      const statusEl = $('div', 'td-status');
      function drawStatus() { statusEl.textContent = st.err ? '⚠ ' + st.err : st.at ? '☁️ Đã đồng bộ ' + new Date(st.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '☁️ Đang đồng bộ…'; statusEl.classList.toggle('bad', !!st.err); }

      function addForm() {
        const f = $('form', 'td-add'), i = $('input', 'td-in'); i.placeholder = 'Thêm việc… (vd: Gọi khách 9h mai)'; i.setAttribute('aria-label', 'Việc cần làm'); i.enterKeyHint = 'done';
        const dt = $('input', 'td-in td-dt'); dt.type = 'datetime-local'; dt.setAttribute('aria-label', 'Hẹn giờ nhắc');
        const q = $('div', 'td-quick');
        [['+1 giờ', () => new Date(Date.now() + 36e5)], ['Chiều 14h', () => { const d = new Date(); d.setHours(14, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d; }], ['Mai 8h', () => { const d = new Date(Date.now() + 864e5); d.setHours(8, 0, 0, 0); return d; }], ['Không hẹn', null]]
          .forEach(([l, fn]) => { const b = $('button', 'td-chip', l); b.type = 'button'; b.addEventListener('click', () => { dt.value = fn ? localIso(fn()) : ''; }); q.append(b); });
        const st0 = $('button', 'td-star', '☆'); st0.type = 'button'; st0.setAttribute('aria-label', 'Quan trọng'); let star = false; st0.addEventListener('click', () => { star = !star; st0.textContent = star ? '⭐' : '☆'; });
        const b = $('button', 'td-btn', 'Thêm'); b.type = 'submit';
        const row = $('div', 'td-row'); row.append(i, st0, b);
        f.append(row, dt, q);
        f.addEventListener('submit', e => { e.preventDefault(); const t = i.value.trim(); if (!t) return i.focus();
          doc.todos.push({ id: 't' + Date.now().toString(36), text: t, done: false, due: dt.value || '', notified: false, ...(star ? { star: true } : {}) });
          i.value = ''; dt.value = ''; star = false; st0.textContent = '☆'; save(); toast('＋ Đã thêm' + (doc.todos[doc.todos.length - 1].due ? ' – nhắc ' + whenTxt(doc.todos[doc.todos.length - 1].due) : '')); i.focus(); });
        return f;
      }
      function item(t) {
        const li = $('li', 'td-it' + (t.done ? ' done' : '') + (t.star ? ' star' : '') + (!t.done && t.due && t.due < localIso(new Date()) ? ' late' : ''));
        const ck = $('input', 'td-ck'); ck.type = 'checkbox'; ck.checked = !!t.done; ck.setAttribute('aria-label', 'Xong');
        ck.addEventListener('change', () => { t.done = ck.checked; if (t.done) t.doneAt = Date.now(); else delete t.doneAt; save(); if (t.done) toast('✓ Xong: ' + t.text); });
        const body = $('div', 'td-body');
        if (editId === t.id) {
          const tx = $('input', 'td-in'); tx.value = t.text; tx.setAttribute('aria-label', 'Sửa việc');
          const dt = $('input', 'td-in td-dt'); dt.type = 'datetime-local'; dt.value = (t.due || '').slice(0, 16); dt.setAttribute('aria-label', 'Hẹn giờ');
          const ok = $('button', 'td-btn sm', 'Lưu'), no = $('button', 'td-btn sm ghost', 'Huỷ'), del = $('button', 'td-btn sm danger', 'Xoá'); ok.type = no.type = del.type = 'button';
          ok.addEventListener('click', () => { const v = tx.value.trim(); if (v) t.text = v; if ((t.due || '') !== dt.value) { t.due = dt.value; t.notified = false; } editId = null; save(); });
          no.addEventListener('click', () => { editId = null; draw(); });
          del.addEventListener('click', () => { if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Chắc xoá?'; return; } doc.todos = doc.todos.filter(x => x !== t); editId = null; save(); toast('Đã xoá'); });
          const r = $('div', 'td-row'); r.append(ok, no, del); body.append(tx, dt, r);
          setTimeout(() => tx.focus(), 0);
        } else {
          body.append($('span', 'td-tx', (t.star ? '⭐ ' : '') + t.text));
          if (t.due) body.append($('small', 'td-due', '⏰ ' + whenTxt(t.due)));
          body.addEventListener('click', () => { editId = t.id; draw(); });
        }
        li.append(ck, body); return li;
      }
      function group(title, arr, cls) { if (!arr.length) return null; const g = $('section', 'td-grp ' + (cls || '')); g.append($('h3', '', title + ' · ' + arr.length)); const u = $('ul', 'td-list'); arr.forEach(t => u.append(item(t))); g.append(u); return g; }
      function rulesBox() {
        const g = $('section', 'td-grp td-rules'); g.append($('h3', '', '🔔 Nhắc nhở'));
        const u = $('ul', 'td-list');
        (doc.rules || []).forEach(r => {
          const li = $('li', 'td-it' + (r.enabled ? '' : ' off')), sw = $('input', 'td-sw'); sw.type = 'checkbox'; sw.checked = !!r.enabled; sw.setAttribute('aria-label', 'Bật nhắc ' + r.name);
          sw.addEventListener('change', () => { r.enabled = sw.checked; save(); toast(r.enabled ? '🔔 Bật ' + r.name : '🔕 Tắt ' + r.name); });
          const b = $('div', 'td-body'); b.append($('span', 'td-tx', (r.icon ? r.icon + ' ' : '') + (r.name || r.message)), $('small', 'td-due', ruleDesc(r)));
          const x = $('button', 'td-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Xoá nhắc');
          x.addEventListener('click', () => { if (!x.classList.contains('arm')) { x.classList.add('arm'); x.textContent = 'Xoá?'; setTimeout(() => { x.classList.remove('arm'); x.textContent = '✕'; }, 2500); return; } doc.rules = doc.rules.filter(z => z !== r); save(); });
          li.append(b, sw, x); u.append(li);
        });
        if (!(doc.rules || []).length) u.append($('li', 'td-none', 'Chưa có nhắc nhở'));
        g.append(u);
        const f = $('form', 'td-radd'), m = $('input', 'td-in'); m.placeholder = 'Nhắc gì? (vd: Uống thuốc)'; m.setAttribute('aria-label', 'Nội dung nhắc');
        const k = $('select', 'td-in'); [['daily', 'Mỗi ngày'], ['wd', 'T2–T6'], ['once', 'Một lần']].forEach(([v, l]) => { const o = $('option', '', l); o.value = v; k.append(o); }); k.setAttribute('aria-label', 'Kiểu nhắc');
        const tm = $('input', 'td-in'); tm.type = 'time'; tm.value = '08:00'; tm.setAttribute('aria-label', 'Giờ');
        const dd = $('input', 'td-in'); dd.type = 'date'; dd.value = todayY(); dd.hidden = true; dd.setAttribute('aria-label', 'Ngày');
        k.addEventListener('change', () => { dd.hidden = k.value !== 'once'; });
        const b = $('button', 'td-btn', '＋ Thêm nhắc'); b.type = 'submit';
        const r1 = $('div', 'td-row'); r1.append(k, tm, dd);
        f.append(m, r1, b);
        f.addEventListener('submit', e => { e.preventDefault(); const msg = m.value.trim(); if (!msg) return m.focus();
          const id = 'r' + Date.now().toString(36), base = { id, type: 'reminder', name: msg, icon: '🔔', enabled: true, message: msg };
          doc.rules = doc.rules || [];
          if (k.value === 'once') doc.rules.push({ ...base, kind: 'once', datetime: dd.value + 'T' + (tm.value || '08:00') });
          else doc.rules.push({ ...base, kind: 'daily', times: [tm.value || '08:00'], days: k.value === 'wd' ? [1, 2, 3, 4, 5] : [] });
          m.value = ''; save(); toast('🔔 Đã thêm nhắc ' + msg); });
        g.append(f);
        return g;
      }
      function draw() {
        if (!doc) return;
        doc.todos = Array.isArray(doc.todos) ? doc.todos : []; doc.rules = Array.isArray(doc.rules) ? doc.rules : [];
        const y = window.scrollY, f0 = root.querySelector('.td-add input'), keep = f0 && document.activeElement === f0 ? f0.value : null;
        const now = localIso(new Date()), td = todayY(), T = doc.todos;
        const sort = (a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || (a.due || '9').localeCompare(b.due || '9');
        const open = T.filter(t => !t.done);
        const W = $('div', 'td-wrap');
        const hd = $('div', 'td-head'); hd.append($('h1', '', '☑️ Việc cần làm'), statusEl); W.append(hd);
        W.append(addForm());
        [group('❗ Quá hạn', open.filter(t => t.due && t.due < now).sort(sort), 'late'), group('📅 Hôm nay', open.filter(t => t.due && t.due >= now && t.due.slice(0, 10) === td).sort(sort)),
          group('🗓 Sắp tới', open.filter(t => t.due && t.due.slice(0, 10) > td).sort(sort)), group('📝 Chưa hẹn giờ', open.filter(t => !t.due).sort(sort))].forEach(g => g && W.append(g));
        if (!open.length) W.append($('div', 'td-empty', 'Hết việc rồi 🎉'));
        const dn = T.filter(t => t.done);
        if (dn.length) { const b = $('button', 'td-more', (showDone ? '▾ Ẩn' : '▸ Xem') + ' ' + dn.length + ' việc đã xong'); b.type = 'button'; b.addEventListener('click', () => { showDone = !showDone; draw(); }); W.append(b); if (showDone) { const g = group('✅ Đã xong', dn, 'done'); if (g) W.append(g); } }
        W.append(rulesBox());
        W.append($('p', 'td-foot', 'Cùng dữ liệu với HaoHao trên máy tính. Đã kết nối bot Zalo thì đến giờ máy chủ HaoHao nhắn Zalo cho anh – kể cả khi máy tính tắt.'));
        root.replaceChildren(W); drawStatus(); window.scrollTo(0, y);
        if (keep != null) { const i = root.querySelector('.td-add input'); i.value = keep; i.focus(); }
      }
      (async () => {
        if (!doc) { root.replaceChildren($('div', 'td-empty', '☁️ Đang tải việc cần làm…')); const r = await sync(); if (!doc) doc = { todos: [], rules: [] }; if (!r.ok && !doc.todos.length) toast('⚠ ' + r.err); }
        else sync();
        draw();
        setInterval(() => { if (!document.hidden && !editId) sync(); }, 30000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
      })();
      return { sync };
    }
  };
})();
