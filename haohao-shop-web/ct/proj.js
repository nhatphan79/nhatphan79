// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📋 V1.4.8: DỰ ÁN trên điện thoại – cùng bảng Dự án với HaoHao máy tính (máy chủ /sb?ns=proj, gộp 3 chiều).
//   Xem theo mảng · cột Đang làm / Tạm dừng / Xong · mở dự án: tick việc, sửa, thêm, xoá, đọc ghi chú (ảnh mở được).
//   Gọi: HHProj.mount(el, { email, token }) – trang cong-trinh.html nạp khi bấm tab 📋.
(() => {
  const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } } };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const COLS = [['doing', 'Đang làm', '#E08A00'], ['pause', 'Tạm dừng', '#9AA1B5'], ['done', 'Xong', '#2E8B57']];
  const fmt = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const ymd = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
  const real = r => r && (r.t || '').trim();
  const rowsOf = p => (p.folders || []).flatMap(f => (f.rows || []).filter(real));
  const pct = p => { const R = rowsOf(p); return R.length ? Math.round(R.filter(r => r.done).length / R.length * 100) : (p.col === 'done' ? 100 : 0); };
  const nextOf = p => { for (const f of p.folders || []) { const r = (f.rows || []).find(x => !x.done && real(x)); if (r) return r.t.trim() + ' · ' + f.name; } return ''; };
  // ghi chú là HTML do chính anh soạn trên HaoHao – vẫn lọc bỏ thẻ / thuộc tính nguy hiểm trước khi hiện
  const OK_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'DIV', 'P', 'SPAN', 'UL', 'OL', 'LI', 'A', 'IMG', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'TABLE', 'TR', 'TD', 'TH', 'TBODY', 'THEAD', 'FONT']);
  function safeHtml(h) {
    const d = new DOMParser().parseFromString('<div>' + (h || '') + '</div>', 'text/html').body.firstChild;
    (function walk(n) { [...n.children].forEach(c => {
      if (!OK_TAGS.has(c.tagName)) { c.replaceWith(...c.childNodes); return walk(n); }
      [...c.attributes].forEach(a => { const k = a.name.toLowerCase(), v = a.value.trim();
        const keep = (k === 'href' && c.tagName === 'A' && /^https?:/i.test(v)) || (k === 'src' && c.tagName === 'IMG' && /^(https:|data:image\/)/i.test(v));
        if (!keep) c.removeAttribute(a.name); });
      if (c.tagName === 'A') { c.target = '_blank'; c.rel = 'noopener'; }
      walk(c); }); })(d);
    return d.innerHTML;
  }
  const CSS = `
  .pm-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 4px 0 10px; } .pm-head h1 { font-size: 22px; margin: 0; font-weight: 850; }
  .pm-st { font-size: 12px; color: #6B7280; } .pm-st.bad { color: #C4401F; }
  .pm-areas { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 8px; scrollbar-width: none; }
  .pm-chip { all: unset; cursor: pointer; white-space: nowrap; font-size: 13px; font-weight: 700; padding: 7px 12px; border-radius: 999px; background: #fff; box-shadow: inset 0 0 0 1.5px #E5E7EB; color: #23305E; }
  .pm-chip.on { background: #23305E; color: #fff; box-shadow: none; }
  .pm-col { margin: 14px 0 6px; font-size: 12px; font-weight: 850; letter-spacing: .04em; text-transform: uppercase; display: flex; align-items: center; gap: 6px; color: #23305E; }
  .pm-col i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; } .pm-col small { font-weight: 700; color: #6B7280; }
  .pm-card { all: unset; box-sizing: border-box; display: block; width: 100%; cursor: pointer; background: #fff; border-radius: 14px; padding: 12px 14px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(20,30,60,.06), 0 0 0 1px #EEF0F3; }
  .pm-card .nm { font-weight: 800; font-size: 15px; color: #23305E; } .pm-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: #6B7280; margin-top: 4px; }
  .pm-meta b { color: #E08A00; } .pm-late { color: #C4401F; font-weight: 800; }
  .pm-bar { height: 5px; border-radius: 3px; background: #F0F1F4; margin-top: 8px; overflow: hidden; } .pm-bar i { display: block; height: 100%; background: #2E8B57; }
  .pm-next { font-size: 12.5px; margin-top: 6px; color: #374151; } .pm-next span { color: #6B7280; margin-right: 4px; }
  .pm-empty { text-align: center; color: #6B7280; font-size: 13px; padding: 18px 8px; }
  .pm-btn { all: unset; cursor: pointer; font-weight: 800; font-size: 14px; padding: 9px 14px; border-radius: 10px; background: #23305E; color: #fff; text-align: center; }
  .pm-btn.ghost { background: #fff; color: #23305E; box-shadow: inset 0 0 0 1.5px #E5E7EB; } .pm-btn.sm { font-size: 13px; padding: 7px 11px; } .pm-btn.danger { background: #fff; color: #C4401F; box-shadow: inset 0 0 0 1.5px #F2C7BC; }
  .pm-back { margin-bottom: 10px; }
  .pm-title { font-size: 20px; font-weight: 850; color: #23305E; margin: 0 0 6px; }
  .pm-cols { display: flex; gap: 6px; margin: 8px 0 4px; }
  .pm-fold { background: #FFFBEA; border-radius: 14px; margin: 12px 0; box-shadow: 0 0 0 1px #F1E6B8; overflow: hidden; }
  .pm-fold h3 { margin: 0; padding: 10px 14px; font-size: 14px; font-weight: 850; color: #23305E; display: flex; justify-content: space-between; } .pm-fold h3 small { color: #8A6A2E; font-weight: 700; }
  .pm-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-top: 1px solid #F1E6B8; }
  .pm-row input[type=checkbox] { width: 20px; height: 20px; margin: 1px 0 0; accent-color: #2E8B57; flex-shrink: 0; }
  .pm-row .tx { flex: 1; font-size: 14.5px; color: #1F2937; word-break: break-word; } .pm-row.done .tx { text-decoration: line-through; color: #9CA3AF; }
  .pm-row .tx small { display: block; font-size: 12px; color: #8A6A2E; margin-top: 3px; }
  .pm-row .tx a { color: #2F6FD8; }
  .pm-ed { all: unset; cursor: pointer; color: #9CA3AF; font-size: 15px; padding: 0 4px; }
  .pm-note { padding: 4px 14px 12px 44px; font-size: 13.5px; color: #374151; overflow-wrap: anywhere; } .pm-note img { max-width: 100%; border-radius: 8px; margin: 6px 0; display: block; }
  .pm-in { box-sizing: border-box; width: 100%; font: inherit; font-size: 15px; padding: 9px 11px; border-radius: 10px; border: 1.5px solid #E5E7EB; background: #fff; }
  .pm-in:focus { outline: none; border-color: #E08A00; }
  .pm-add { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid #F1E6B8; }
  .pm-edbox { display: grid; gap: 8px; flex: 1; } .pm-edbtn { display: flex; gap: 6px; flex-wrap: wrap; }
  .pm-skip { padding: 10px 14px; font-size: 12.5px; color: #8A6A2E; border-top: 1px solid #F1E6B8; }
  .pm-toast { position: fixed; left: 50%; bottom: calc(80px + env(safe-area-inset-bottom)); transform: translateX(-50%) translateY(20px); background: #23305E; color: #fff; padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 700; opacity: 0; transition: .2s; pointer-events: none; z-index: 60; max-width: 86vw; }
  .pm-toast.on { opacity: 1; transform: translateX(-50%); }
  .pm-newp { display: grid; gap: 8px; background: #fff; border-radius: 14px; padding: 12px; box-shadow: 0 0 0 1px #EEF0F3; margin: 8px 0; }
  `;

  window.HHProj = {
    mount(root, A) {
      if (!document.getElementById('pm-css')) { const s = $('style'); s.id = 'pm-css'; s.textContent = CSS; document.head.append(s); }
      const KD = 'sbProj:' + A.email, KB = 'sbBaseP:' + A.email;
      let doc = ls.get(KD), st = { at: 0, err: '' }, openId = null, area = ls.get('pmArea') || '$all', showHidden = false, editRow = null, openNote = null, newOpen = false;
      const eng = SBSync({ api: location.origin, path: '/sb?ns=proj', empty: () => ({ projects: [], areas: [] }), token: async () => A.token,
        getLocal: async () => doc, setLocal: async v => { doc = v; ls.set(KD, v); if (!busyEdit()) draw(); }, getBase: async () => ls.get(KB), setBase: async v => { if (!ls.set(KB, v)) ls.set(KB, null); } });
      const busyEdit = () => { const a = document.activeElement; return a && root.contains(a) && /INPUT|TEXTAREA/.test(a.tagName) && a.type !== 'checkbox'; };
      const sync = async () => { const r = await eng.sync(); if (r.ok) { st.at = Date.now(); st.err = ''; } else st.err = r.err; drawStatus(); return r; };
      let sT = 0; const soon = () => { clearTimeout(sT); sT = setTimeout(sync, 1200); };
      const save = (redraw = true) => { if (!ls.set(KD, doc)) toast('⚠ Bộ nhớ điện thoại đầy – vẫn gửi lên máy chủ'); if (redraw) draw(); soon(); };
      const toast = t => { let e = document.querySelector('.pm-toast'); if (!e) { e = $('div', 'pm-toast'); document.body.append(e); } e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 1800); };
      const statusEl = $('div', 'pm-st');
      function drawStatus() { statusEl.className = 'pm-st' + (st.err ? ' bad' : ''); statusEl.textContent = st.err ? '⚠ ' + st.err : st.at ? '☁️ Đã đồng bộ ' + new Date(st.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '☁️ Đang đồng bộ…'; }
      const areas = () => (doc && doc.areas) || [];
      const proj = () => doc && doc.projects.find(p => p.id === openId);

      function list(W) {
        const ch = $('div', 'pm-areas'), mk = (id, lb) => { const b = $('button', 'pm-chip' + (area === id ? ' on' : ''), lb); b.type = 'button'; b.addEventListener('click', () => { area = id; ls.set('pmArea', id); draw(); }); ch.append(b); };
        mk('$all', 'Tất cả'); areas().forEach(a => mk(a.id, (a.icon ? a.icon + ' ' : '') + a.name));
        if (areas().length) W.append(ch);
        const P = doc.projects.filter(p => (area === '$all' || p.area === area) && (showHidden || !p.hidden));
        if (area !== '$all') {
          const nb = $('button', 'pm-btn ghost sm', newOpen ? '✕ Đóng' : '＋ Dự án mới'); nb.type = 'button'; nb.addEventListener('click', () => { newOpen = !newOpen; draw(); }); W.append(nb);
          if (newOpen) { const f = $('form', 'pm-newp'), i = $('input', 'pm-in'); i.placeholder = 'Tên dự án'; i.setAttribute('aria-label', 'Tên dự án'); const b = $('button', 'pm-btn', 'Tạo dự án'); b.type = 'submit'; f.append(i, b);
            f.addEventListener('submit', e => { e.preventDefault(); const n = i.value.trim(); if (!n) return i.focus();
              const p = { id: uid(), name: n, area, col: 'doing', start: ymd(Date.now()), due: '', at: Date.now(), folders: [{ id: uid(), name: 'Việc chính', rows: [], v28: 1, v29: 1 }] };
              doc.projects.unshift(p); newOpen = false; openId = p.id; save(); toast('＋ Đã tạo ' + n); });
            W.append(f); setTimeout(() => i.focus(), 30); }
        }
        COLS.forEach(([c, lb, color]) => {
          const L = P.filter(p => (p.col || 'doing') === c); if (!L.length && c !== 'doing') return;
          const h = $('div', 'pm-col'), dot = $('i'); dot.style.background = color; h.append(dot, lb, $('small', '', '· ' + L.length)); W.append(h);
          if (!L.length) W.append($('div', 'pm-empty', 'Chưa có dự án đang làm'));
          L.forEach(p => {
            const c2 = $('button', 'pm-card'); c2.type = 'button'; c2.append($('div', 'nm', p.name || '(chưa đặt tên)'));
            const v = pct(p), m = $('div', 'pm-meta'), pb = $('b', '', v + '%'); m.append(pb);
            const a = areas().find(x => x.id === p.area); if (area === '$all' && a) m.append($('span', '', (a.icon || '') + ' ' + a.name));
            if (p.due) { const late = p.col !== 'done' && p.due < ymd(Date.now()); m.append($('span', late ? 'pm-late' : '', (late ? 'Trễ hạn · ' : '📅 ') + fmt(p.due))); }
            const bar = $('div', 'pm-bar'), bi = $('i'); bi.style.width = v + '%'; bar.append(bi); c2.append(m, bar);
            const nx = nextOf(p); if (nx && p.col !== 'done') { const n = $('div', 'pm-next'); n.append($('span', '', 'Tiếp:'), nx); c2.append(n); }
            c2.addEventListener('click', () => { openId = p.id; editRow = null; openNote = null; draw(); window.scrollTo(0, 0); });
            W.append(c2);
          });
        });
        if (doc.projects.some(p => p.hidden)) { const hb = $('button', 'pm-btn ghost sm', showHidden ? 'Ẩn dự án đã cất' : 'Hiện cả dự án đã cất'); hb.type = 'button'; hb.style.marginTop = '10px'; hb.addEventListener('click', () => { showHidden = !showHidden; draw(); }); W.append(hb); }
        if (!doc.projects.length) W.append($('div', 'pm-empty', 'Chưa có dự án. Mở HaoHao trên máy tính (đã đăng nhập Google) để đưa bảng Dự án lên đây.'));
      }

      function detail(W, p) {
        const bk = $('button', 'pm-btn ghost sm pm-back', '← Danh sách dự án'); bk.type = 'button'; bk.addEventListener('click', () => { openId = null; draw(); }); W.append(bk);
        W.append($('h2', 'pm-title', p.name || '(chưa đặt tên)'));
        const m = $('div', 'pm-meta'); m.append($('b', '', pct(p) + '% xong')); if (p.start || p.due) m.append($('span', '', '📅 ' + (fmt(p.start) || '…') + ' → ' + (fmt(p.due) || '…'))); W.append(m);
        const cs = $('div', 'pm-cols'); COLS.forEach(([c, lb]) => { const b = $('button', 'pm-chip' + ((p.col || 'doing') === c ? ' on' : ''), lb); b.type = 'button'; b.addEventListener('click', () => { p.col = c; save(); toast('Đã chuyển sang ' + lb); }); cs.append(b); }); W.append(cs);
        (p.folders || []).forEach(f => {
          const box = $('section', 'pm-fold'), R = (f.rows || []).filter(real), dn = R.filter(r => r.done).length;
          const h = $('h3'); h.append($('span', '', f.name || 'Mục'), $('small', '', R.length ? dn + '/' + R.length : '')); box.append(h);
          if (f.kind === 'trade' || f.kind === 'hold') { box.append($('div', 'pm-skip', 'Mục ' + (f.kind === 'hold' ? 'Hold' : 'Trade') + ' (giá, lệnh) – xem và sửa trên HaoHao máy tính.')); W.append(box); return; }
          R.forEach(r => {
            const row = $('div', 'pm-row' + (r.done ? ' done' : ''));
            if (editRow === r.id) {
              const ed = $('div', 'pm-edbox'), i = $('input', 'pm-in'); i.value = r.t; i.setAttribute('aria-label', 'Sửa việc');
              const bt = $('div', 'pm-edbtn'), ok = $('button', 'pm-btn sm', 'Lưu'), no = $('button', 'pm-btn ghost sm', 'Huỷ'), del = $('button', 'pm-btn danger sm', 'Xoá'); ok.type = no.type = del.type = 'button';
              ok.addEventListener('click', () => { const v = i.value.trim(); if (v) r.t = v; editRow = null; save(); });
              no.addEventListener('click', () => { editRow = null; draw(); });
              del.addEventListener('click', () => { if (del.dataset.arm) { f.rows.splice(f.rows.indexOf(r), 1); editRow = null; save(); toast('Đã xoá'); return; } del.dataset.arm = 1; del.textContent = 'Bấm lần nữa để xoá'; });
              i.addEventListener('keydown', e => { if (e.key === 'Enter') ok.click(); });
              bt.append(ok, no, del); ed.append(i, bt); row.append(ed); box.append(row); setTimeout(() => i.focus(), 30); return;
            }
            const ck = $('input'); ck.type = 'checkbox'; ck.checked = !!r.done; ck.setAttribute('aria-label', 'Xong: ' + r.t);
            ck.addEventListener('change', () => { r.done = ck.checked; save(); if (r.done) toast('✓ ' + r.t); });
            const tx = $('div', 'tx'); tx.append(r.t);
            const hasNote = typeof r.html === 'string' && r.html.replace(/<[^>]*>|&nbsp;/g, '').trim() || /<img/i.test(r.html || '');
            if (r.link) { const a = $('a', '', '🔗 ' + r.link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)); a.href = /^https?:/i.test(r.link) ? r.link : 'https://' + r.link; a.target = '_blank'; a.rel = 'noopener'; const s = $('small'); s.append(a); tx.append(s); }
            if (hasNote) { const s = $('small', '', openNote === r.id ? '▾ Ẩn ghi chú' : '▸ Xem ghi chú'); s.style.cursor = 'pointer'; s.addEventListener('click', () => { openNote = openNote === r.id ? null : r.id; draw(); }); tx.append(s); }
            const eb = $('button', 'pm-ed', '✎'); eb.type = 'button'; eb.setAttribute('aria-label', 'Sửa ' + r.t); eb.addEventListener('click', () => { editRow = r.id; draw(); });
            row.append(ck, tx, eb); box.append(row);
            if (hasNote && openNote === r.id) { const n = $('div', 'pm-note'); n.innerHTML = safeHtml(r.html); box.append(n); }
          });
          const ad = $('form', 'pm-add'), ai = $('input', 'pm-in'); ai.placeholder = '＋ Thêm việc vào ' + (f.name || 'mục này'); ai.setAttribute('aria-label', 'Thêm việc vào ' + f.name); ai.enterKeyHint = 'done';
          ad.append(ai); ad.addEventListener('submit', e => { e.preventDefault(); const t = ai.value.trim(); if (!t) return;
            f.rows = f.rows || []; const blank = f.rows.findIndex(x => !real(x)); const nr = { id: uid(), t, done: false };
            if (blank >= 0) f.rows.splice(blank, 0, nr); else f.rows.push(nr); save(); toast('＋ Đã thêm'); setTimeout(() => { const x = root.querySelectorAll('.pm-add input')[[...(p.folders || [])].filter(z => z.kind !== 'trade' && z.kind !== 'hold').indexOf(f)]; if (x) x.focus(); }, 30); });
          box.append(ad); W.append(box);
        });
      }

      function draw() {
        const W = $('div', 'pm-wrap'), hd = $('div', 'pm-head'); hd.append($('h1', '', '📋 Dự án'), statusEl); W.append(hd); drawStatus();
        if (!doc) { W.append($('div', 'pm-empty', '☁️ Đang tải bảng Dự án…')); root.replaceChildren(W); return; }
        doc.projects = Array.isArray(doc.projects) ? doc.projects : [];
        const p = proj(); if (p) detail(W, p); else { openId = null; list(W); }
        root.replaceChildren(W);
      }
      draw();
      sync().then(() => { if (!doc) doc = { projects: [], areas: [] }; if (!busyEdit()) draw(); });
      setInterval(() => { if (!document.hidden && !root.hidden) sync(); }, 30000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && !root.hidden) sync(); });
    }
  };
})();
