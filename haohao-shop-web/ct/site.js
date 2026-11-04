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
  let data = { sites: [], cur: null }, todos = [], tab = 'dash', ready = false, lastSaved = '', pend = null, dirty = false, recent = [];   // recent: các bản chính trang này vừa ghi – sự kiện đổi kho đến muộn của chúng thì bỏ qua
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
  const RO = !!window.SB_RO, WEB = !!window.SB_WEB;   // WEB = trang điện thoại đã đăng nhập Google (sửa được)
  const SB_API = window.SB_API || 'https://haohao-gia.nhatphan79.workers.dev';
  const photoSrc = s => /^p_[a-f0-9]{32}$/.test(s) ? SB_API + '/sbp/' + s : s;
  let syncT = 0; const syncSoon = () => { if (RO) return; clearTimeout(syncT); syncT = setTimeout(() => { if (WEB) window.SB_SYNC_SOON && window.SB_SYNC_SOON(); else chrome.runtime.sendMessage({ type: 'sb-sync-now' }).catch(() => {}); }, 1500); };   // V1.2.7: bản xem trên điện thoại (haohaostore.com/cong-trinh) – chỉ xem
  const save = () => { if (RO) return Promise.resolve(); pend = null; lastSaved = JSON.stringify(data);   // V1.5.8: lưu bản đang sửa thì bỏ bản chờ cũ (không để bản cũ đè lên lúc rời ô)
    ; recent.push(lastSaved); if (recent.length > 8) recent.shift(); pushSoon(); syncSoon(); return chrome.storage.local.set({ [KEY]: data }).catch(e => toast('⚠ Chưa lưu được: ' + (e && e.message || e))); };
  let st = 0; const saveSoon = () => { clearTimeout(st); st = setTimeout(save, 400); };
  const saveTodos = () => chrome.storage.local.set({ todos }).catch(() => {});
  const toast = t => { let el = root.querySelector('.sb-toast'); if (!el) { el = $('div', 'sb-toast'); el.setAttribute('role', 'status'); root.append(el); } el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 3200); };

  // ---------- danh mục ----------
  // V1.4.2: cây thư mục chuẩn 2 cấp (00–11, 99) – mỗi loại hồ sơ đúng 1 chỗ (thư mục chính → thư mục con)
  const FTREE = [["00_QUAN_LY_CHUNG", ["01_THONG_TIN_DU_AN", "02_TO_CHUC_DANH_BA", "03_KE_HOACH_QUAN_LY"]], ["01_HOP_DONG_PHAP_LY", ["01_HD_CHU_DAU_TU", "02_HD_THAU_PHU_NCC", "03_GIAY_PHEP", "04_BAO_LANH_BAO_HIEM"]], ["02_CONG_VAN_BIEN_BAN", ["01_CONG_VAN_DEN", "02_CONG_VAN_DI", "03_BIEN_BAN_HOP"]], ["03_THIET_KE_SHOP", ["01_BAN_VE_THI_CONG_CDT", "02_SHOP_TRINH", "03_SHOP_DA_DUYET", "04_RFI_THAY_DOI_TK"]], ["04_TIEN_DO", ["01_TIEN_DO_TONG", "02_KE_HOACH_TUAN_THANG", "03_THUC_TE_BU_TIEN_DO"]], ["05_HIEN_TRUONG", ["01_NHAT_KY_THI_CONG", "02_BIEN_PHAP_THI_CONG", "03_HINH_ANH", "04_MAY_MOC"]], ["06_CHAT_LUONG_QAQC", ["01_ITP_CHECKLIST", "02_TRINH_DUYET_VAT_LIEU", "03_CO_CQ_THI_NGHIEM", "04_NT_CONG_VIEC", "05_NT_GIAI_DOAN", "06_NCR_KHAC_PHUC"]], ["07_AN_TOAN_MOI_TRUONG", ["01_KE_HOACH_ATLD", "02_HUAN_LUYEN_THE_AT", "03_KIEM_DINH_THIET_BI", "04_KIEM_TRA_SU_CO"]], ["08_QS_THANH_TOAN", ["01_DU_TOAN_BOQ", "02_PHAT_SINH", "03_TT_CHU_DAU_TU", "04_TT_THAU_PHU_NCC", "05_DONG_TIEN_CONG_NO"]], ["09_VAT_TU_NHAN_LUC", ["01_KE_HOACH_CUNG_UNG", "02_BAO_GIA_DAT_HANG", "03_NHAP_XUAT_KHO", "04_NHAN_LUC_CHAM_CONG"]], ["10_BAO_CAO", ["01_NGAY", "02_TUAN", "03_THANG"]], ["11_HOAN_CONG_BAN_GIAO", ["01_BAN_VE_HOAN_CONG", "02_NT_HOAN_THANH", "03_HO_SO_BAN_GIAO_HDSD", "04_BAO_HANH"]], ["99_LUU_TRU", []]];
  const FOLDERS = FTREE.map(x => x[0]), FPATHS = FTREE.flatMap(([k, v]) => v.length ? v.map(c => k + '\\' + c) : [k]);
  const fNice = f => f.slice(3).replace(/_/g, ' ').toLowerCase().replace(/\b(qa|qc|qaqc|atld|qs|rfi|ncr|itp|co cq|boq|ncc|hd|nt|tt|cdt|tk|hdsd|at)\b/g, m => m.toUpperCase().replace(" ", "-"));
  const PRI = [['cao', '🔴 Cao'], ['tb', '🟡 Vừa'], ['thap', '⚪ Thấp']];
  // V1.3.2: bộ phận / hạng mục giao việc
  // V1.3.3: danh sách bộ phận anh tự thêm / đổi tên / xoá (data.cats = [{ id, name, c }], dùng chung mọi công trình, đồng bộ theo tài khoản)
  const CATS0 = [{ id: 'qs', name: 'QS', c: '#2F6FD8' }, { id: 'qaqc', name: 'QA/QC', c: '#2E8B57' }, { id: 'shop', name: 'Shopdrawing', c: '#8B5CF6' }, { id: 'ht', name: 'Hiện trường', c: '#E08A00' }, { id: 'cdt', name: 'Chủ đầu tư', c: '#DB2777' }];
  const CAT_PAL = ['#0D9488', '#B45309', '#64748B', '#DC2626', '#7C3AED', '#0284C7', '#65A30D', '#C026D3', '#EA580C', '#475569'];
  const catArr = () => Array.isArray(data.cats) && data.cats.length ? data.cats : CATS0;
  const catList = () => catArr().map(c => [c.id, c.name]);
  const catDef = () => (catArr().find(c => c.id === 'ht') || catArr()[0]).id;
  const catOf = t => catArr().some(c => c.id === t.cat) ? t.cat : catDef();
  const catName = id => (catArr().find(c => c.id === id) || catArr().find(c => c.id === catDef()) || {}).name || 'Khác';
  const catColor = id => (catArr().find(c => c.id === id) || {}).c || '#6B7280';
  const catTag = c => { const id = catArr().some(x => x.id === c) ? c : catDef(), t = $('span', 'sb-cat', catName(id)); t.style.setProperty('--c', catColor(id)); return t; };
  const NEWCAT = '__new';
  function addCat(done) {   // ＋ thêm bộ phận mới
    const o = { name: '' };
    dialog('＋ Thêm bộ phận / hạng mục', b => {
      const i = field(o, { k: 'name', lb: 'Tên bộ phận', t: 'text', ph: 'vd: MEP, An toàn, Kế toán, Thầu phụ…', rr: false, ns: true });
      b.append(lab('Tên bộ phận', i, true), $('p', 'sb-p', 'Dùng chung cho mọi công trình. Đổi tên / xoá ở nút ⚙️ cạnh hàng bộ phận.'));
      i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); b.parentNode.querySelector('.sb-dlgf .sb-btn:not(.ghost)').click(); } });
    }, b => {
      const n = String(b.querySelector('input').value || '').trim(); if (!n) { toast('Nhập tên bộ phận'); return false; }
      const ex = catArr().find(c => c.name.toLowerCase() === n.toLowerCase()); if (ex) { done && done(ex.id); return; }
      if (!Array.isArray(data.cats) || !data.cats.length) data.cats = CATS0.map(c => ({ ...c }));
      const id = 'c' + uid(); data.cats.push({ id, name: n, c: CAT_PAL[(data.cats.length - CATS0.length + CAT_PAL.length * 9) % CAT_PAL.length] });
      save(); toast('＋ Đã thêm bộ phận ' + n); done && done(id); render(true);
    }, 'Thêm');
  }
  function catDlg() {   // ⚙️ sửa danh sách bộ phận
    if (!Array.isArray(data.cats) || !data.cats.length) data.cats = CATS0.map(c => ({ ...c }));
    dialog('⚙️ Bộ phận / hạng mục giao việc', b => {
      const draw = () => {
        b.replaceChildren($('p', 'sb-p', 'Đổi tên, đổi màu hoặc xoá. Xoá bộ phận thì các việc của nó chuyển về "' + catName(catDef()) + '".'));
        const box = $('div', 'sb-catedit');
        data.cats.forEach(c => {
          const r = $('div', 'sb-catrow'), col = $('input'); col.type = 'color'; col.value = c.c || '#6B7280'; col.setAttribute('aria-label', 'Màu ' + c.name);
          col.addEventListener('input', () => { c.c = col.value; saveSoon(); });
          const nm = field(c, { k: 'name', lb: 'Tên bộ phận', t: 'text', rr: false });
          const n = S0().reduce((a, S) => a + S.tasks.filter(t => catOf(t) === c.id).length, 0);
          r.append(col, nm, $('small', '', n + ' việc'));
          if (data.cats.length > 1) r.append(delBtn(() => { const keep = data.cats.filter(x => x !== c); data.cats = keep; const def = catDef(); S0().forEach(S => S.tasks.forEach(t => { if (t.cat === c.id) t.cat = def; })); save(); draw(); }));
          box.append(r);
        });
        const add = $('button', 'sb-add', '＋ Thêm bộ phận'); add.type = 'button'; add.addEventListener('click', () => addCat(() => catDlg()));
        b.append(box, add);
      };
      draw();
    }, () => { save(); render(true); }, 'Xong');
  }
  const S0 = () => data.sites;
  const TST = [['todo', 'Chưa làm'], ['doing', 'Đang làm'], ['wait', 'Chờ'], ['done', 'Xong']];
  const MST = [['de', 'Đề xuất'], ['duyet', 'Đã duyệt'], ['dat', 'Đã đặt'], ['ve', 'Đã về']];
  const ITYPE = [['ht', 'Hiện trường'], ['kt', 'Kỹ thuật'], ['td', 'Tiến độ'], ['cp', 'Chi phí'], ['pd', 'Xin phê duyệt']];
  const IST = [['mo', 'Mới'], ['xl', 'Đang xử lý'], ['cd', 'Chờ duyệt'], ['dong', 'Đã xong']];
  const WX = ['☀️ Nắng', '⛅ Mây', '🌦 Mưa nhỏ', '🌧 Mưa to', '⛔ Nghỉ'];
  const lbl = (L, v) => (L.find(x => x[0] === v) || ['', ''])[1];
  const PHASES0 = ['Chuẩn bị', 'Móng', 'Phần thân', 'Mái', 'Hoàn thiện', 'Nghiệm thu – Bàn giao'];
  const TABS = [['dash', '📊 Tổng quan'], ['plan', '📅 Tiến độ'], ['task', '✅ Công việc'], ['crew', '👷 Nhân lực'],
    ['mat', '🧱 Vật tư'], ['cost', '💰 Chi phí'], ['issue', '⚠️ Vấn đề'], ['rep', '📑 Báo cáo'], ['file', '📁 Hồ sơ']];

  function newSite(name, code) {
    const s0 = today();
    return { id: uid(), code: code || ('DA' + String(data.sites.length + 1).padStart(3, '0')), name: name || 'Công trình mới', owner: '', phone: '', addr: '',
      start: s0, end: addD(s0, 180), value: 0, phase: 'Chuẩn bị', note: '', dir: '', drive: '',
      plan: PHASES0.map((g, i) => ({ id: uid(), g, t: g, s: addD(s0, i * 30), e: addD(s0, i * 30 + 29), pct: 0, mile: i === 1 || i === 5 })),
      tasks: [], logs: [], teams: [], mats: [], stock: [], budget: [], costs: [], incomes: [], issues: [], docs: [] };
  }
  const fix = s => { ['plan', 'tasks', 'logs', 'teams', 'staff', 'mats', 'stock', 'budget', 'costs', 'incomes', 'issues', 'docs'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; }); return s; };

  // ---------- tính toán ----------
  const plab = p => p.g && p.t ? p.g + ' – ' + p.t : (p.t || p.g || '');
  const dur = p => p.s && p.e ? Math.max(1, days(p.s, p.e) + 1) : 1;
  const planPct = (p, d) => !p.s || !p.e ? 0 : d < p.s ? 0 : d >= p.e ? 100 : Math.round((days(p.s, d) + 1) / dur(p) * 100);
  function progress(S, d = today()) {
    const P = S.plan.filter(p => p.s && p.e); const W = P.reduce((a, p) => a + dur(p), 0);
    if (!W) return { kh: 0, tt: 0 };
    return { kh: Math.round(P.reduce((a, p) => a + planPct(p, d) * dur(p), 0) / W), tt: Math.round(P.reduce((a, p) => a + Math.min(100, num(p.pct)) * dur(p), 0) / W) };
  }
  // V1.3.2: chậm tính theo NGÀY = số ngày đã trôi qua − số ngày làm được (theo % thực tế). ≥3 ngày → đỏ, 1–2 ngày → cam.
  const lagDays = (p, d = today()) => { if (!p.s || !p.e || num(p.pct) >= 100 || d < p.s) return 0; return Math.max(0, days(p.s, d) + 1 - Math.round(Math.min(100, num(p.pct)) / 100 * dur(p))); };
  const pState = p => { const d = today(), tt = num(p.pct), lg = lagDays(p, d);
    if (tt >= 100) return ['ok', 'Xong'];
    if (p.e && d > p.e) return ['late', 'Quá hạn ' + days(p.e, d) + ' ngày'];
    if (lg >= 3) return ['late', 'Chậm ' + lg + ' ngày'];
    if (lg >= 1) return ['warn', 'Chậm ' + lg + ' ngày'];
    if (d < (p.s || d) && !tt) return ['', 'Chưa tới']; return ['run', 'Đúng tiến độ']; };
  const slowItems = S => S.plan.filter(p => ['late', 'warn'].includes(pState(p)[0])).sort((a, b) => lagDays(b) - lagDays(a));
  function alertBox(W, S, where) {   // 🚨 thanh cảnh báo đỏ: hạng mục chậm + việc quá hạn
    const sl = slowItems(S).filter(p => pState(p)[0] === 'late'), od = S.tasks.filter(taskLate), oi = S.issues.filter(x => x.st !== 'dong' && x.due && x.due < today());
    if (!sl.length && !od.length && !oi.length) return;
    const b = $('div', 'sb-alert'); b.setAttribute('role', 'alert');
    const t = $('div', 'sb-alertt'); t.append($('b', '', '🚨 Cảnh báo'), $('span', '', [sl.length ? sl.length + ' hạng mục chậm tiến độ' : '', od.length ? od.length + ' việc quá hạn' : '', oi.length ? oi.length + ' vấn đề quá hạn' : ''].filter(Boolean).join(' · ')));
    b.append(t);
    const u = $('ul', 'sb-alertl');
    sl.slice(0, 4).forEach(p => { const li = $('li'); li.append($('span', '', '📅 ' + plab(p)), $('b', '', pState(p)[1] + ' · ' + num(p.pct) + '% / KH ' + planPct(p, today()) + '%')); u.append(li); });
    od.slice(0, 5).forEach(x => { const li = $('li'); li.append(catTag(x.cat), $('span', '', (x.pri === 'cao' ? '🔴 ' : '') + x.t + (x.who ? ' – ' + x.who : '')), $('b', '', 'trễ ' + days(x.due, today()) + ' ngày')); u.append(li); });
    oi.slice(0, 3).forEach(x => { const li = $('li'); li.append($('span', '', '⚠️ ' + (x.t || '').split('\n')[0] + ' – ' + (x.who || 'chưa giao')), $('b', '', 'trễ ' + days(x.due, today()) + ' ngày')); u.append(li); });
    b.append(u);
    if (where === 'dash') { const r = $('div', 'sb-row'); [['plan', '📅 Xem tiến độ'], ['task', '✅ Xem việc quá hạn']].forEach(([k, l]) => { const x = $('button', 'sb-btn sm', l); x.type = 'button'; x.addEventListener('click', () => { tab = k; if (k === 'task') flt.task = 'late'; render(true); window.scrollTo(0, 0); }); r.append(x); }); b.append(r); }
    W.append(b);
  }
  const taskLate = t => t.st !== 'done' && t.due && t.due < today();
  const crewOf = L => Object.values(L.crew || {}).reduce((a, n) => a + num(n), 0) + num(L.other);
  const bchOf = L => L && L.bchT != null ? num(L.bchT) : L && L.bch ? Object.values(L.bch).reduce((a, n) => a + num(n), 0) : Object.values((L && L.staff) || {}).filter(Boolean).length;   // V1.5.6: Ban chỉ huy theo chức vụ
  const qsTxt = L => { const b = bchOf(L), c = crewOf(L); return (b ? 'BCH ' + b + ' · CN ' + c + ' · ' : '') + 'Tổng ' + (b + c) + ' người'; };
  // V1.5.5: danh sách tên người (phụ trách / chịu TN) tự lưu, dùng chung mọi công trình; tên dùng nhiều xếp đầu
  const rememberWho = v => { v = String(v || '').trim(); if (!v || RO) return; data.people = data.people && typeof data.people === 'object' ? data.people : {}; data.people[v] = (data.people[v] || 0) + 1; data.lastWho = v; if (data.peopleOff) data.peopleOff = data.peopleOff.filter(x => x !== v); };
  const peopleList = S => { const c = { ...(data.people || {}) }, off = new Set(data.peopleOff || []);
    if (S) [...S.tasks.map(t => t.who), ...S.issues.map(x => x.who), ...S.teams.map(t => t.name), ...(S.roles || []).map(x => x.who)].forEach(v => { v = String(v || '').trim(); if (v && !(v in c)) c[v] = 0; });
    return Object.keys(c).filter(v => !off.has(v)).sort((a, b) => c[b] - c[a] || a.localeCompare(b, 'vi')); };
  const peopleDl = S => { const dl = $('datalist'); dl.id = 'sb-people'; peopleList(S).forEach(v => { const o = $('option'); o.value = v; dl.append(o); }); return dl; };
  function peopleDlg(S) {
    dialog('👤 Danh sách tên người', b => {
      b.append($('p', 'sb-p', 'Tên gõ vào ô Người phụ trách / Người chịu TN tự lưu ở đây để chọn lại. Bấm ✕ để bỏ tên gõ nhầm.'));
      const u = $('ul', 'sb-list'); const L = peopleList(S);
      if (!L.length) u.append($('li', 'sb-none', 'Chưa có tên nào'));
      L.forEach(v => { const li = $('li'); const x = $('button', 'sb-rpx', '✕'); x.type = 'button'; x.title = 'Bỏ khỏi danh sách'; x.setAttribute('aria-label', 'Bỏ ' + v);
        x.addEventListener('click', () => { data.peopleOff = [...new Set([...(data.peopleOff || []), v])]; if (data.people) delete data.people[v]; if (data.lastWho === v) data.lastWho = ''; li.remove(); save(); });
        li.append($('span', '', v), $('small', '', (data.people || {})[v] ? (data.people[v] + ' lần') : ''), x); u.append(li); });
      b.append(u);
    }, () => { render(true); }, 'Xong');
  }
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
  const grow = el => { if (!el.isConnected) return; el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; };
  function field(r, c, after) {
    let el;
    if (c.t === 'sel') { el = $('select', 'sb-in'); (typeof c.o === 'function' ? c.o() : c.o).forEach(([v, l]) => { const o = $('option', '', l); o.value = v; el.append(o); }); el.value = r[c.k] == null ? '' : r[c.k]; }
    else if (c.t === 'chk') { el = $('input', 'sb-chk'); el.type = 'checkbox'; el.checked = !!r[c.k]; }
    else if (c.t === 'area') { el = $('textarea', 'sb-in sb-ta'); el.rows = c.rows || 2; el.value = esc(r[c.k]); }
    else { el = $('input', 'sb-in'); el.type = c.t === 'date' ? 'date' : 'text';
      if (c.t === 'money' || c.t === 'num') { el.inputMode = 'decimal'; el.classList.add('r'); el.value = r[c.k] ? (c.t === 'money' ? money(r[c.k]) : String(r[c.k])) : ''; }
      else el.value = esc(r[c.k]); }
    if (c.ph && !RO) el.placeholder = c.ph; el.setAttribute('aria-label', c.lb || c.k);
    if (c.who && !RO) { el.setAttribute('list', 'sb-people'); el.autocomplete = 'off'; el.addEventListener('change', () => rememberWho(el.value)); }   // V1.5.5
    if (c.t === 'area') { el.classList.add('sb-grow'); el.addEventListener('input', () => grow(el)); }   // V1.5.5: tự xuống dòng, ô tự cao theo chữ
    if (RO) { if (el.tagName === 'SELECT' || c.t === 'chk') el.disabled = true; else el.readOnly = true; }
    const get = () => c.t === 'chk' ? el.checked : (c.t === 'money' || c.t === 'num') ? num(el.value) : el.value;
    el.addEventListener('input', () => { if (c.t !== 'money') { r[c.k] = get(); if (!c.ns) saveSoon(); } });
    el.addEventListener('change', () => {
      r[c.k] = get(); if (c.t === 'money') el.value = r[c.k] ? money(r[c.k]) : '';
      if (c.on) c.on(r); if (!c.ns) save(); if (after) after();
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
  function delBtnTxt(txt, ask, fn) {
    const b = $('button', 'sb-btn ghost sm', txt); b.type = 'button';
    b.addEventListener('click', () => { if (b.classList.contains('arm')) return fn(); b.classList.add('arm'); b.textContent = ask + ' Bấm lần nữa'; setTimeout(() => { b.classList.remove('arm'); b.textContent = txt; }, 3000); });
    return b;
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
      const g = $('div', 'sb-fg'); F.forEach(([k, lb, t, ph]) => { const el = field(tmp, { k, lb, t, ph, rr: false, ns: true }); if (k === 'phase') { el.setAttribute('list', 'sb-phl'); const dl = $('datalist'); dl.id = 'sb-phl'; [...new Set([...S.plan.map(p => p.g), ...PHASES0])].filter(Boolean).forEach(v => { const o = $('option'); o.value = v; dl.append(o); }); g.append(dl); } g.append(lab(lb, el, t === 'area' || k === 'name' || k === 'addr')); });
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
      if (!RO) { const ed = $('button', 'sb-btn ghost sm sb-ico', '✏️'); ed.type = 'button'; ed.title = 'Sửa thông tin công trình'; ed.setAttribute('aria-label', 'Sửa thông tin công trình'); ed.addEventListener('click', () => infoDlg(S)); h.append(ed); }
    }
    if (RO) { const t = new Date(window.SB_RO.at || Date.now()); h.append($('small', 'sb-upd', '🕐 Cập nhật ' + t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + t.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })));
      const rl = $('button', 'sb-btn ghost sm', '↻'); rl.type = 'button'; rl.title = 'Tải lại'; rl.setAttribute('aria-label', 'Tải lại'); rl.addEventListener('click', () => location.reload()); h.append(rl); W.append(h); return; }
    const sp = $('div'); sp.style.flex = '1'; h.append(sp);
    const add = $('button', 'sb-btn sm', '＋ Công trình'); add.type = 'button'; add.addEventListener('click', () => infoDlg(newSite(''), true));
    // V1.4.7: gộp Sao lưu + Khôi phục vào 1 nút "💾 Dữ liệu ▾" cho đầu trang gọn 1 hàng
    const dw = $('div', 'sb-menuw'), dv = $('button', 'sb-btn ghost sm', '💾 Dữ liệu ▾'); dv.type = 'button'; dv.title = 'Sao lưu / khôi phục dữ liệu'; dv.setAttribute('aria-haspopup', 'true'); dv.setAttribute('aria-expanded', 'false');
    const mn = $('div', 'sb-menu'); mn.hidden = true;
    const mi = (lb, sub, fn) => { const b = $('button', 'sb-mi'); b.type = 'button'; b.append($('b', '', lb), $('small', '', sub)); b.addEventListener('click', () => { close(); fn(); }); mn.append(b); };
    const close = () => { mn.hidden = true; dv.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', out, true); };
    const out = e => { if (!dw.contains(e.target)) close(); };
    dv.addEventListener('click', () => { if (!mn.hidden) return close(); mn.hidden = false; dv.setAttribute('aria-expanded', 'true'); setTimeout(() => document.addEventListener('click', out, true)); });
    dw.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); dv.focus(); } });
    mi('💾 Sao lưu', 'Tải file chụp toàn bộ dữ liệu (.json)', backup); mi('📂 Khôi phục', 'Nạp lại từ file sao lưu', restore);
    dw.append(dv, mn);
    const bt = $('button', 'sb-btn ghost sm', '🤖 Bot Zalo'); bt.type = 'button'; bt.title = 'Gửi tổng quan vào Zalo mỗi ngày'; bt.addEventListener('click', botDlg);
    if (botCfg.on && botCfg.chatId) bt.append($('i', 'sb-on', '●'));
    if (botCfg.err) { bt.classList.add('err'); bt.title = '⚠ Lần gửi gần nhất lỗi: ' + botCfg.err; }
    const mb = $('button', 'sb-btn ghost sm', '📱 Điện thoại'); mb.type = 'button'; mb.title = 'Xem trang Công trình trên điện thoại'; mb.addEventListener('click', mobileDlg);
    if (mobCfg.on) mb.append($('i', 'sb-on', '●')); if (mobCfg.on && mobCfg.err) { mb.classList.add('err'); mb.title = '⚠ Đồng bộ lỗi: ' + mobCfg.err; }
    h.append(acctBtn()); if (!WEB) h.append(mb, bt); h.append(add, dw); W.append(h);
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
  // 🔐 V1.3.0: tài khoản Google – đồng bộ máy tính ⇄ điện thoại
  const LOGIN_URL = SB_API + '/cong-trinh';
  let acct = {};
  if (!WEB && !RO) { chrome.storage.local.get('sbAuth').then(r => { acct = r.sbAuth || {}; if (ready) render(); if (acct.token) syncSoon(); }).catch(() => {});
    chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && ch.sbAuth) { acct = ch.sbAuth.newValue || {}; render(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && acct.token) syncSoon(); }); }
  const A = () => WEB ? (window.SB_AUTH || {}) : acct;
  const hm = t => t ? new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
  function acctBtn() {
    const a = A();
    if (!a.token && !a.email) { const b = $('button', 'sb-btn sm sb-login', '🔐 Đăng nhập Google'); b.type = 'button'; b.title = 'Lưu dữ liệu theo tài khoản Google – máy tính, điện thoại cùng cập nhật, không mất dữ liệu';
      b.addEventListener('click', () => chrome.tabs.create({ url: LOGIN_URL + '?ext=' + chrome.runtime.id })); return b; }
    const b = $('button', 'sb-btn ghost sm sb-acct' + (a.err ? ' err' : ''), (a.err ? '⚠ ' : '☁️ ') + String(a.email || '').replace(/@gmail\.com$/, '') + (a.at && !a.err ? ' · ✓' + hm(a.at) : ''));
    b.type = 'button'; b.title = a.err ? 'Đồng bộ lỗi: ' + a.err : 'Đã đồng bộ theo tài khoản ' + a.email; b.addEventListener('click', acctDlg); return b;
  }
  function acctDlg() {
    const a = A();
    const D = dialog('☁️ Tài khoản & đồng bộ', b => {
      b.append($('p', 'sb-p', 'Dữ liệu Công trình lưu theo tài khoản Google. Máy tính (HaoHao) và điện thoại (' + LOGIN_URL.replace('https://', '') + ') cùng đăng nhập là cùng xem, cùng sửa – tự đồng bộ vài giây sau mỗi lần sửa. Hai nơi sửa cùng lúc thì tự gộp từng dòng, không đè mất.'));
      const k = $('div', 'sb-kpis'); k.append(kpi('Tài khoản', a.email || '—'), kpi('Đồng bộ lần cuối', a.at ? new Date(a.at).toLocaleString('vi-VN') : 'chưa', a.err ? '⚠ ' + a.err : '', a.err ? 'bad' : 'good')); b.append(k);
      const row = $('div', 'sb-row');
      const now = $('button', 'sb-btn sm', '🔄 Đồng bộ ngay'); now.type = 'button';
      now.addEventListener('click', async () => { now.disabled = true; now.textContent = '⏳ Đang đồng bộ…'; const r = WEB ? await window.SB_SYNC_NOW() : await chrome.runtime.sendMessage({ type: 'sb-sync-now' }).catch(e => ({ ok: false, err: String(e) })); now.disabled = false; now.textContent = '🔄 Đồng bộ ngay'; toast(r && r.ok ? '✅ Đã đồng bộ' : '⚠ ' + ((r && r.err) || 'Lỗi')); D.close(); render(true); });
      const out = $('button', 'sb-btn ghost sm', 'Đăng xuất'); out.type = 'button'; out.title = 'Dữ liệu trên máy này vẫn giữ nguyên';
      out.addEventListener('click', async () => { if (WEB) window.SB_LOGOUT(); else { await chrome.runtime.sendMessage({ type: 'sb-logout' }).catch(() => {}); toast('Đã đăng xuất – dữ liệu trên máy này vẫn còn'); } D.close(); });
      row.append(now, out); b.append(row);
      if (a.err && /đăng nhập/.test(a.err) && !WEB) { const lg = $('button', 'sb-btn sm', '🔐 Đăng nhập lại'); lg.type = 'button'; lg.addEventListener('click', () => chrome.tabs.create({ url: LOGIN_URL + '?ext=' + chrome.runtime.id })); b.append(lg); }
    }, () => {}, 'Đóng');
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
      const at = $('input', 'sb-in'); at.type = 'time'; at.value = c.alertTime || '16:00'; at.setAttribute('aria-label', 'Giờ cảnh báo');
      const ao = $('input', 'sb-chk'); ao.type = 'checkbox'; ao.checked = c.alertOn !== false; ao.style.margin = '6px 0';
      const rz = $('input', 'sb-chk'); rz.type = 'checkbox'; rz.checked = c.remindZalo !== false; rz.style.margin = '6px 0';
      g.append(lab('⏰ Nhắc Todo & nhắc nhở qua Zalo (cả khi tắt máy)', rz),
        lab('Giờ gửi tổng quan', tm), lab('Bật gửi tự động', on), lab('Trả lời lệnh tq / hn / vd / cb', cm), lab('🚨 Giờ cảnh báo trễ / chậm', at), lab('Bật cảnh báo trễ hạn', ao));
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
      b.append($('div', 'sb-note', '💡 Đã đăng nhập Google và tích "⏰ Nhắc Todo & nhắc nhở qua Zalo" thì máy chủ HaoHao tự gửi tổng quan + cảnh báo đúng giờ, kể cả khi tắt máy. Lệnh nhắn bot (tq, xong, them…) được trả lời khi có 1 máy đang mở HaoHao. Token lưu trên máy này và máy chủ HaoHao (để tự gửi).'));
      D_on = () => ({ token: tk.value.trim(), time: tm.value || '07:00', on: on.checked, cmd: cm.checked, alertTime: at.value || '16:00', alertOn: ao.checked, remindZalo: rz.checked });
    }, async () => {
      const p = D_on(); if (p.token !== c.token) Object.assign(p, { chatId: '', chatName: '' }); if (p.time !== c.time) p.last = ''; if (p.alertTime !== c.alertTime) p.lastAlert = '';
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
    alertBox(W, S, 'dash');

    const g = $('div', 'sb-grid');
    // 1. giai đoạn
    { const c = card('1 · Đang ở giai đoạn nào?'); const run = S.plan.filter(p => num(p.pct) < 100 && p.s && p.s <= d);
      c.append($('div', 'sb-big', S.phase || (run[0] && run[0].g) || 'Chưa đặt'));
      const ph = $('div', 'sb-phases'); [...new Set(S.plan.map(p => p.g || p.t))].forEach(gn => { const P = S.plan.filter(p => (p.g || p.t) === gn), w = P.reduce((a, p) => a + dur(p), 0) || 1, pc = Math.round(P.reduce((a, p) => a + num(p.pct) * dur(p), 0) / w);
        const it = $('div', 'sb-ph' + (pc >= 100 ? ' ok' : gn === S.phase ? ' cur' : '')); it.title = gn + ' · ' + pc + '%'; it.append($('span', '', gn), bar(pc, pc >= 100 ? 'ok' : '')); ph.append(it); });
      c.append(ph); g.append(c); }
    // 2. tiến độ
    { const c = card('2 · Tiến độ có chậm không?', late < -5 ? 'warn' : '');
      const lt = slowItems(S);
      c.append($('div', 'sb-big ' + (late < -5 ? 'bad' : lt.length ? 'warn' : 'good'), late < -5 ? 'Chậm ' + (-late) + '% so với kế hoạch' : (late > 5 ? 'Vượt ' + late + '% kế hoạch' : 'Tổng thể đúng kế hoạch') + (lt.length ? ' · ' + lt.length + ' hạng mục chậm' : ''))); if (lt.length) { const u = $('ul', 'sb-list'); lt.slice(0, 4).forEach(p => { const li = $('li'); li.append($('span', '', p.t), $('b', pState(p)[0] === 'late' ? 'bad' : 'warnt', pState(p)[1])); u.append(li); }); c.append(u); }
      const ms = S.plan.filter(p => p.mile && num(p.pct) < 100 && p.e).sort((a, b) => a.e < b.e ? -1 : 1)[0];
      if (ms) c.append($('div', 'sb-note', '🏁 Mốc nghiệm thu gần nhất: ' + ms.t + ' – ' + fdFull(ms.e) + (days(d, ms.e) >= 0 ? ' (còn ' + days(d, ms.e) + ' ngày)' : ' (đã quá ' + days(ms.e, d) + ' ngày)')));
      g.append(c); }
    // 3. hôm nay
    { const T = S.tasks.filter(t => t.st !== 'done' && (taskLate(t) || t.due === d || t.st === 'doing')).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
      const c = card('3 · Hôm nay cần làm gì?', 'wide'); const nl = S.tasks.filter(taskLate).length;
      c.querySelector('h3').append($('em', nl ? 'bad' : '', T.length + ' việc' + (nl ? ' · ' + nl + ' quá hạn' : '')));
      const u = $('ul', 'sb-list');
      T.slice(0, 8).forEach(t => { const li = $('li'), ck = $('input', 'sb-chk'); ck.type = 'checkbox'; ck.setAttribute('aria-label', 'Xong'); ck.disabled = RO;
        ck.addEventListener('change', () => { t.st = 'done'; t.doneAt = d; todoPush(t, true); save(); render(true); toast('✓ Xong: ' + t.t); });
        const tx = $('span', '', (t.pri === 'cao' ? '🔴 ' : '') + (t.t || '(chưa có tên)')); li.append(ck, catTag(t.cat), tx, $('small', '', [t.who, t.due ? (taskLate(t) ? 'trễ ' + days(t.due, d) + ' ngày' : t.due === d ? 'hôm nay' : fd(t.due)) : ''].filter(Boolean).join(' · ')));
        if (taskLate(t)) li.classList.add('late'); u.append(li); });
      if (!T.length) u.append($('li', 'sb-none', 'Không có việc tới hạn hôm nay 👍'));
      c.append(u); const q = quickAdd(S, 'Thêm việc cho hôm nay… (Enter)', d); c.append(q); c.style.order = 4; g.append(c); }
    // 4. nhân lực
    { const L = S.logs.find(l => l.d === d), c = card('4 · Tổ đội nào đang làm, đủ người không?');
      if (L) { c.append($('div', 'sb-big', (bchOf(L) + crewOf(L)) + ' người hôm nay'), $('div', 'sb-note', qsTxt(L)));
        const u = $('ul', 'sb-list'); S.teams.forEach(tm => { const v = num((L.crew || {})[tm.id]); if (v) { const li = $('li'); li.append($('span', '', tm.name + (tm.scope ? ' – ' + tm.scope : '')), $('b', '', v + ' người')); u.append(li); } });
        if (num(L.other)) { const li = $('li'); li.append($('span', '', 'Công nhật'), $('b', '', num(L.other) + ' người')); u.append(li); } c.append(u); }
      else { c.append($('div', 'sb-big muted', 'Chưa điểm danh hôm nay')); if (!RO) { const b = $('button', 'sb-btn sm', '📋 Báo cáo ngày hôm nay'); b.type = 'button'; b.addEventListener('click', () => { openLog(S, d); }); c.append(b); } }
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
    const who = $('input', 'sb-in who'); who.placeholder = 'Người làm'; who.setAttribute('aria-label', 'Người phụ trách'); who.setAttribute('list', 'sb-people'); who.autocomplete = 'off';
    who.value = data.lastWho && !(data.peopleOff || []).includes(data.lastWho) ? data.lastWho : '';   // V1.5.5: mặc định người chọn lần gần nhất
    const dl = $('button', 'sb-btn ghost sm sb-pplbtn', '⚙️'); dl.type = 'button'; dl.title = 'Danh sách tên người (xoá tên gõ nhầm)'; dl.setAttribute('aria-label', 'Danh sách tên người'); dl.addEventListener('click', () => peopleDlg(S));
    const b = $('button', 'sb-btn sm', '＋'); b.type = 'submit'; b.setAttribute('aria-label', 'Thêm việc');
    const ct = $('select', 'sb-in cat'); ct.setAttribute('aria-label', 'Bộ phận'); catList().forEach(([v, l]) => { const o = $('option', '', l); o.value = v; ct.append(o); }); { const o = $('option', '', '＋ Thêm bộ phận…'); o.value = NEWCAT; ct.append(o); } ct.value = flt.cat && flt.cat !== 'all' ? flt.cat : catDef();
    ct.addEventListener('change', () => { if (ct.value !== NEWCAT) return; ct.value = catDef(); addCat(id => { flt.cat = id; render(true); setTimeout(() => { const q = root.querySelector('.sb-quick input'); if (q) q.focus(); }, 0); }); });
    const pr = $('select', 'sb-in pri'); pr.setAttribute('aria-label', 'Ưu tiên'); PRI.forEach(([v, l]) => { const o = $('option', '', l); o.value = v; pr.append(o); }); pr.value = 'tb';
    f.append(i, ct, pr, who, b, dl);
    f.addEventListener('submit', e => { e.preventDefault(); if (!i.value.trim()) return i.focus(); rememberWho(who.value); S.tasks.push({ id: uid(), t: i.value.trim(), who: who.value.trim(), due: due || '', pri: pr.value, cat: ct.value, st: 'todo', at: today() }); save(); i.value = ''; render(true); setTimeout(() => { const q = root.querySelector('.sb-quick input'); if (q) q.focus(); }, 0); toast('＋ Đã thêm việc'); });
    return f;
  }

  // ---------- 📅 TIẾN ĐỘ ----------
  function plan(W, S) {
    const pr = progress(S);
    alertBox(W, S, 'plan');
    sec(W, '📅 Kế hoạch & tiến độ', 'Nhập hạng mục theo giai đoạn – kế hoạch tự tính theo ngày, anh chỉ cần cập nhật % thực tế');
    const k = $('div', 'sb-kpis'); k.append(kpi('Kế hoạch đến hôm nay', pr.kh + '%'), kpi('Thực tế', pr.tt + '%', '', pr.tt + 5 < pr.kh ? 'bad' : 'good'), kpi('Chênh lệch', (pr.tt - pr.kh > 0 ? '+' : '') + (pr.tt - pr.kh) + '%', pr.tt + 5 < pr.kh ? 'đang chậm' : 'ổn', pr.tt + 5 < pr.kh ? 'bad' : ''), kpi('Mốc nghiệm thu', S.plan.filter(p => p.mile && num(p.pct) >= 100).length + '/' + S.plan.filter(p => p.mile).length, 'đã đạt'));
    W.append(k);
    W.append(planTable(S));
    gantt(W, S);
  }
  function gantt(W, S) {
    const P = S.plan.filter(p => p.s && p.e); if (!P.length) return;
    // V1.4.5: trục theo TUẦN (thứ 2 → chủ nhật), ghi rõ ngày của từng tuần; kéo ngang khi dài
    const a1 = P.reduce((m, p) => p.s < m ? p.s : m, P[0].s), b1 = P.reduce((m, p) => p.e > m ? p.e : m, P[0].e), d = today();
    const dow = x => (new Date(x + 'T00:00').getDay() + 6) % 7, a = addD(a1, -dow(a1)), b = addD(b1, 6 - dow(b1)), T = Math.max(7, days(a, b) + 1), NW = Math.round(T / 7), WK = 76;
    const c = card('Biểu đồ tiến độ', 'gantt'), wrap = $('div', 'sb-gwrap'), g = $('div', 'sb-gantt sb-gweek'); wrap.append(g);
    g.style.setProperty('--wk', WK + 'px'); g.style.width = 'calc(var(--glw) + ' + NW * WK + 'px)';
    const tg = $('button', 'sb-btn ghost sm sb-gtog', gantt.full ? '▴ Thu gọn theo nhóm' : '▾ Hiện chi tiết từng việc'); tg.type = 'button'; tg.addEventListener('click', () => { gantt.full = !gantt.full; render(true); });
    if (planTree(S).some(x => x.items.length > 1)) c.append(tg);
    const ax = $('div', 'sb-gax'), dm = x => x.slice(8, 10) + '/' + x.slice(5, 7);
    for (let w = 0; w < NW; w++) { const ws = addD(a, w * 7), we = addD(ws, 6), cell = $('div', 'sb-gwk' + (d >= ws && d <= we ? ' now' : '') + (w && ws.slice(5, 7) !== addD(ws, -7).slice(5, 7) ? ' mon' : ''));
      cell.style.left = w * WK + 'px'; cell.style.width = WK + 'px'; cell.append($('b', '', 'Tuần ' + (w + 1)), $('span', '', dm(ws) + '–' + dm(we)));
      cell.title = 'Tuần ' + (w + 1) + ': thứ 2 ' + fdFull(ws) + ' → chủ nhật ' + fdFull(we); ax.append(cell);
    }
    { let m = a.slice(0, 7) + '-01'; while (m <= b) { const st = m < a ? a : m, x = days(a, st) / 7 * WK; const ml = $('i', 'sb-gmo', 'Tháng ' + (+m.slice(5, 7)) + '/' + m.slice(0, 4)); ml.style.left = x + 'px'; ax.append(ml); const nd = new Date(m + 'T00:00'); nd.setMonth(nd.getMonth() + 1); m = ymd(nd); } }
    g.append($('div', 'sb-glb'), ax);
    const row = (p, lbTxt, cls, title) => { if (!p.s || !p.e) return; const lb = $('div', 'sb-glb ' + (cls || ''), lbTxt); lb.title = title || lbTxt;
      const tr = $('div', 'sb-gtr'), br = $('div', 'sb-gbar ' + pState(p)[0] + (p.mile ? ' mile' : '') + (cls ? ' ' + cls : '')), dn = $('i');
      br.style.left = days(a, p.s) / T * 100 + '%'; br.style.width = Math.max(.6, dur(p) / T * 100) + '%'; dn.style.width = Math.min(100, num(p.pct)) + '%'; br.append(dn); br.title = lb.title + ' · ' + fdFull(p.s) + ' → ' + fdFull(p.e) + ' · thực tế ' + num(p.pct) + '%';
      const dm2 = x => x.slice(8, 10) + '/' + x.slice(5, 7), L0 = days(a, p.s) / T * 100, L1 = (days(a, p.s) + dur(p)) / T * 100;
      const ls = $('span', 'sb-gd s' + (cls ? ' ' + cls : ''), dm2(p.s)), le = $('span', 'sb-gd e' + (cls ? ' ' + cls : ''), dm2(p.e)); ls.style.left = L0 + '%'; le.style.left = L1 + '%';
      const tight = days(a, p.s) / 7 * WK < 36; if (tight) le.textContent = dm2(p.s) + ' → ' + dm2(p.e);
      tr.append(...(tight ? [] : [ls]), br, le); g.append(lb, tr); };
    let lastSec = null;
    planTree(S).forEach(G => {
      if (G.sec && G.sec !== lastSec) { lastSec = G.sec; const sh = $('div', 'sb-glb sec', G.sec.replace('|', '. ')); sh.style.gridColumn = '1 / -1'; g.append(sh); }
      const one = G.items.length === 1 && !G.g;
      if (one) return row(G.items[0], G.items[0].t || '—', '', G.items[0].t);
      row(G.agg, (G.gn ? G.gn + '. ' : '') + (G.g || 'Khác'), 'grp');
      if (gantt.full) G.items.forEach(p => row(p, '· ' + (p.t || '—'), 'sub', (G.g ? G.g + ' · ' : '') + p.t));
    });
    if (d >= a && d <= b) { const nw = $('div', 'sb-gnow'); nw.style.left = 'calc(var(--glw) + (100% - var(--glw)) * ' + (days(a, d) / T) + ')'; nw.title = 'Hôm nay'; g.append(nw); }
    c.append(wrap, $('div', 'sb-legend', 'Mỗi cột là 1 tuần (thứ 2 → chủ nhật) · ▮ Xanh = phần đã làm · Cam = đang làm · Đỏ = chậm · 🏁 viền đậm = mốc nghiệm thu · Vạch đỏ dọc = hôm nay')); W.append(c);
  }
  // V1.4.3: tiến độ dạng cây giống file Excel – Tổng › Phần (A, B, C…) › Nhóm (I, 1, 2…) › Công việc. Giữ đúng thứ tự nhập, không tự sắp xếp.
  // Mỗi việc: { sec: 'B|THI CÔNG PHẦN NGẦM', gn: '1', g: 'Tầng hầm B3', n: '', t, s, e, pct, mile }
  function aggOf(L) {
    const P = L.filter(p => p.s && p.e); if (!P.length) return { s: '', e: '', pct: 0 };
    const s = P.reduce((m, p) => p.s < m ? p.s : m, P[0].s), e = P.reduce((m, p) => p.e > m ? p.e : m, P[0].e), W = P.reduce((x, p) => x + dur(p), 0);
    return { s, e, pct: Math.round(P.reduce((x, p) => x + Math.min(100, num(p.pct)) * dur(p), 0) / W), mile: false };
  }
  const aggKh = (L, d) => { const P = L.filter(p => p.s && p.e), W = P.reduce((x, p) => x + dur(p), 0); return W ? Math.round(P.reduce((x, p) => x + planPct(p, d) * dur(p), 0) / W) : 0; };
  function planTree(S) {
    const out = []; let cur = null;
    S.plan.forEach(p => { const key = (p.sec || '') + '\u0001' + (p.gn || '') + '\u0001' + (p.g || '');
      if (!cur || cur.key !== key) { cur = { key, sec: p.sec || '', gn: p.gn || '', g: p.g || '', items: [] }; out.push(cur); }
      cur.items.push(p); });
    out.forEach(G => { G.agg = aggOf(G.items); });
    return out;
  }
  function planTable(S) {
    const d = today(), box = $('div', 'sb-tw'), t = $('table', 'sb-t sb-pt'), th = $('thead'), hr = $('tr');
    [['TT', 'n'], ['Công việc', ''], ['Bắt đầu', 'dt'], ['Số ngày', 'r dn'], ['Kết thúc', 'dt'], ['KH %', 'r pc'], ['Thực tế %', 'r pc'], ['🏁', 'c mk'], ['Tình trạng', 'st'], ['Ghi chú / lý do', 'pnote'], ['', 'x']].forEach(([l, c]) => hr.append($('th', c, l)));
    th.append(hr); t.append(th); const tb = $('tbody'); t.append(tb);
    const st = p => { const [c, l] = pState(p); return $('span', 'sb-st ' + c, l); };
    const aggRow = (cls, tt, name, L, extra) => { const A = aggOf(L), tr = $('tr', cls);
      tr.append($('td', 'n', tt)); const nm = $('td', 'nm'); nm.append($('span', '', name)); if (extra) extra(nm); tr.append(nm);
      tr.append($('td', 'dt', A.s ? fdFull(A.s) : ''), $('td', 'r dn', A.s ? String(days(A.s, A.e) + 1) : ''), $('td', 'dt', A.e ? fdFull(A.e) : ''), $('td', 'r pc', aggKh(L, d) + '%'), $('td', 'r pc', A.pct + '%'), $('td', 'c mk'));
      const sc = $('td', 'st'); if (A.s) sc.append(st({ ...A, s: A.s, e: A.e })); tr.append(sc, $('td', 'pnote'), $('td', 'x')); tb.append(tr); return tr; };
    const insertAfter = (G) => { const last = G.items[G.items.length - 1], s0 = last && last.e ? addD(last.e, 1) : d;
      const r = { id: uid(), sec: G.sec, gn: G.gn, g: G.g, n: '', t: '', s: s0, e: addD(s0, 6), pct: 0, mile: false }; S.plan.splice(S.plan.indexOf(last) + 1, 0, r); save(); render(true);
      setTimeout(() => { const x = root.querySelector('tr[data-id="' + r.id + '"] input.sb-in'); if (x) x.focus(); }, 60); };
    if (S.plan.length) aggRow('tot', '', 'TỔNG TIẾN ĐỘ THI CÔNG', S.plan);
    let lastSec = null;
    planTree(S).forEach(G => {
      if (G.sec && G.sec !== lastSec) { lastSec = G.sec; const [sn, ...rest] = G.sec.split('|'); const name = rest.length ? rest.join('|') : sn;
        aggRow('psec', rest.length ? sn : '', name, S.plan.filter(p => (p.sec || '') === G.sec)); }
      if (G.g || G.gn) aggRow('pgrp', G.gn, G.g, G.items, RO ? null : nm => { const b = $('button', 'sb-gadd', '＋'); b.type = 'button'; b.title = 'Thêm việc vào ' + G.g; b.addEventListener('click', () => insertAfter(G)); nm.append(b); });
      G.items.forEach(p => {
        const tr = $('tr', 'pleaf ' + (num(p.pct) >= 100 ? 'done ' : '') + (pState(p)[0] === 'late' ? 'late lateBg' : pState(p)[0] === 'warn' ? 'warnBg' : '')); tr.dataset.id = p.id;
        const upd = () => render(true);
        tr.append($('td', 'n', p.n || ''));
        const nm = $('td', 'nm'); nm.append(field(p, { k: 't', lb: 'Công việc', t: 'text', ph: 'Tên công việc' })); tr.append(nm);
        const sd = $('td', 'dt'); sd.append(field(p, { k: 's', lb: 'Bắt đầu', t: 'date', on: r => { if (r.s && r.e && r.e < r.s) r.e = r.s; } }, upd));
        const dn = $('td', 'r dn'), di = $('input', 'sb-in r'); di.inputMode = 'numeric'; di.value = p.s && p.e ? String(dur(p)) : ''; di.setAttribute('aria-label', 'Số ngày'); if (RO) di.readOnly = true;
        di.addEventListener('change', () => { const n = Math.max(1, Math.round(num(di.value))); if (p.s && n) { p.e = addD(p.s, n - 1); save(); upd(); } }); dn.append(di);
        const ed = $('td', 'dt'); ed.append(field(p, { k: 'e', lb: 'Kết thúc', t: 'date' }, upd));
        const pc = $('td', 'r pc'); pc.append(field(p, { k: 'pct', lb: 'Thực tế %', t: 'num', ph: '0' }, upd));
        const mk = $('td', 'c mk'); mk.append(field(p, { k: 'mile', lb: 'Mốc nghiệm thu', t: 'chk' }));
        const sc = $('td', 'st'); sc.append(st(p));
        // V1.5.3: ghi chú / lý do chậm – dòng đang chậm mà chưa ghi thì nhắc đỏ
        const slow = ['late', 'warn'].includes(pState(p)[0]) && num(p.pct) < 100, nt = $('td', 'pnote' + (slow && !String(p.why || '').trim() ? ' need' : ''));
        const ni = field(p, { k: 'why', lb: 'Ghi chú / lý do chậm', t: 'text', ph: slow ? 'Ghi lý do chậm…' : 'Ghi chú' });
        ni.addEventListener('input', () => nt.classList.toggle('need', slow && !ni.value.trim())); nt.append(ni);
        const x = $('td', 'x'); if (!RO) x.append(delBtn(() => { S.plan.splice(S.plan.indexOf(p), 1); save(); render(true); }));
        tr.append(sd, dn, ed, $('td', 'r pc kh', planPct(p, d) + '%'), pc, mk, sc, nt, x); tb.append(tr);
      });
    });
    if (!S.plan.length) { const tr = $('tr'), td = $('td', 'sb-none', 'Chưa có hạng mục nào'); td.colSpan = 11; tr.append(td); tb.append(tr); }
    box.append(t);
    if (!RO) { const a = $('button', 'sb-add', '＋ Thêm hạng mục'); a.type = 'button'; a.addEventListener('click', () => { const T = planTree(S); if (T.length) return insertAfter(T[T.length - 1]); const r = { id: uid(), sec: '', gn: '', g: '', n: '', t: '', s: d, e: addD(d, 6), pct: 0, mile: false }; S.plan.push(r); save(); render(true); }); box.append(a); }
    return box;
  }


  // ---------- ✅ CÔNG VIỆC ----------
  function task(W, S) {
    const d = today(), wk = addD(d, 7);
    sec(W, '✅ Công việc & giao việc', 'Bấm 🔕 để HaoHao nhắc 7:30 sáng ngày đến hạn');
    const F = [['open', 'Chưa xong', S.tasks.filter(t => t.st !== 'done').length], ['today', 'Hôm nay', S.tasks.filter(t => t.st !== 'done' && t.due === d).length], ['late', 'Quá hạn', S.tasks.filter(taskLate).length],
      ['week', '7 ngày tới', S.tasks.filter(t => t.st !== 'done' && t.due && t.due >= d && t.due <= wk).length], ['done', 'Đã xong', S.tasks.filter(t => t.st === 'done').length], ['all', 'Tất cả', S.tasks.length]];
    W.append(chips(F, flt.task, v => { flt.task = v; flt.cat = 'all'; render(true); }));   // đổi bộ lọc → xem lại tất cả bộ phận cho khỏi trống
    // V1.5.1: số việc ở từng bộ phận đếm theo bộ lọc đang chọn (Đã xong → đếm việc đã xong), không còn luôn = 0
    const pick0 = { open: t => t.st !== 'done', today: t => t.st !== 'done' && t.due === d, late: taskLate, week: t => t.st !== 'done' && t.due && t.due >= d && t.due <= wk, done: t => t.st === 'done', all: () => true }[flt.task] || (() => true);
    const open = S.tasks.filter(pick0), cc = c => open.filter(t => catOf(t) === c);
    const CF = [['all', 'Tất cả bộ phận', open.length], ...catList().map(([v, l]) => [v, l, cc(v).length])];
    const cw = chips(CF, flt.cat || 'all', v => { flt.cat = v; render(true); }); cw.classList.add('sb-catchips');
    cw.querySelectorAll('.sb-chip').forEach((b, i) => { if (i) { const v = catList()[i - 1][0]; b.style.setProperty('--c', catColor(v)); const lt = cc(v).filter(taskLate).length; if (lt) b.append($('i', 'sb-chipbad', lt + ' trễ')); } });
    if (!RO) { const ed = $('button', 'sb-chip sb-chipadd', '＋ Bộ phận'); ed.type = 'button'; ed.title = 'Thêm bộ phận mới'; ed.addEventListener('click', () => addCat(id => { flt.cat = id; render(true); })); const st = $('button', 'sb-chip', '⚙️'); st.type = 'button'; st.title = 'Đổi tên / xoá bộ phận'; st.setAttribute('aria-label', 'Sửa danh sách bộ phận'); st.addEventListener('click', catDlg); cw.append(ed, st); }
    W.append(cw);
    W.append(quickAdd(S, 'Gõ việc cần làm rồi Enter… (vd: Kiểm tra cốt thép dầm tầng 2)', flt.task === 'today' ? d : ''));
    const pick = { open: t => t.st !== 'done', today: t => t.st !== 'done' && t.due === d, late: taskLate, week: t => t.st !== 'done' && t.due && t.due >= d && t.due <= wk, done: t => t.st === 'done', all: () => true }[flt.task] || (() => true);
    const ord = { cao: 0, tb: 1, thap: 2 };
    const R0 = S.tasks.filter(pick).filter(t => !flt.cat || flt.cat === 'all' || catOf(t) === flt.cat).sort((a, b) => (a.st === 'done') - (b.st === 'done') || (ord[a.pri] ?? 1) - (ord[b.pri] ?? 1) || (a.due || '9').localeCompare(b.due || '9'));
    const groups = (!flt.cat || flt.cat === 'all') ? catList().map(([v, l]) => [v, l, R0.filter(t => catOf(t) === v)]).filter(g => g[2].length) : [[flt.cat, catName(flt.cat), R0]];
    if (!groups.length) groups.push([catDef(), '', []]);
    for (const [gv, gl, R] of groups) {
    if (gl && groups.length > 1) { const gh = $('div', 'sb-grph'); gh.append(catTag(gv), $('span', '', R.length + ' việc' + (R.filter(taskLate).length ? ' · ' + R.filter(taskLate).length + ' quá hạn' : '') + (R.filter(t => t.pri === 'cao' && t.st !== 'done').length ? ' · ' + R.filter(t => t.pri === 'cao' && t.st !== 'done').length + ' ưu tiên cao' : ''))); W.append(gh); }
    W.append(table(R, [
      { k: 'ok', lb: '✓', t: 'calc', w: '34px', f: t => { const c = $('input', 'sb-chk'); c.type = 'checkbox'; c.checked = t.st === 'done'; c.disabled = RO; c.setAttribute('aria-label', 'Xong'); c.addEventListener('change', () => { t.st = c.checked ? 'done' : 'todo'; if (c.checked) t.doneAt = d; todoPush(t, true); save(); render(true); }); return c; } },
      { k: 't', lb: 'Công việc', t: 'text', rr: false }, { k: 'cat', lb: 'Bộ phận', t: 'sel', o: () => [...catList(), [NEWCAT, '＋ Thêm bộ phận…']], w: '118px', on: t => { if (t.cat !== NEWCAT) return; t.cat = catDef(); addCat(id => { t.cat = id; save(); render(true); }); } }, { k: 'who', lb: 'Người phụ trách', who: true, t: 'text', w: '14%', rr: false },
      { k: 'due', lb: 'Hạn', t: 'date', w: '128px', on: t => todoPush(t, true) }, { k: 'pri', lb: 'Ưu tiên', t: 'sel', o: PRI, w: '96px' },
      { k: 'lt', lb: 'Trễ', t: 'calc', w: '70px', f: t => taskLate(t) ? $('b', 'bad', days(t.due, d) + ' ngày') : t.st !== 'done' && t.due === d ? $('span', 'warnt', 'hôm nay') : '' },
      { k: 'st', lb: 'Trạng thái', t: 'sel', o: TST, w: '106px', on: t => todoPush(t, true) }
    ], { list: S.tasks, num: false, empty: flt.task === 'open' && (!flt.cat || flt.cat === 'all') ? 'Chưa có việc nào – gõ ở ô trên rồi Enter' : 'Không có việc nào ở bộ lọc này' + (flt.cat && flt.cat !== 'all' ? ' – bấm "Tất cả bộ phận" để xem hết' : ''), cls: t => (t.st === 'done' ? 'done' : '') + (taskLate(t) ? ' late lateBg' : '') + (t.pri === 'cao' && t.st !== 'done' ? ' hot' : ''), extra: (t, x) => { if (!WEB) x.append(bellBtn(t, () => t.t, S)); } }));
    }
  }

  // ---------- 📓 NHẬT KÝ ----------
  let openLogId = null;
  function openLog(S, dd) { rp = { kind: 'd', off: 0 }; rpDay = dd; rpEdit = false; tab = 'rep'; render(true); }   // V1.5.11: nhật ký → Báo cáo ngày
  // V1.5.11: E. Kế hoạch – tự tổng hợp việc ngày mai: hạng mục tiến độ đang / sẽ thi công, công việc tới hạn / quá hạn, vấn đề cần giải quyết
  function planNext(S, day) {
    const t1 = addD(day, 1), out = [];
    S.plan.filter(p => p.s && p.e && p.s <= t1 && t1 <= p.e && num(p.pct) < 100).forEach(p => out.push('Thi công: ' + plab(p)));
    S.tasks.filter(t => t.st !== 'done' && t.due && t.due <= t1).forEach(t => out.push('Công việc: ' + (t.t || '') + (t.who ? ' (' + t.who + ')' : '')));
    S.issues.filter(x => x.st !== 'dong' && x.due && x.due <= t1).forEach(x => out.push('Giải quyết: ' + String(x.t || '').split('\n')[0] + (x.who ? ' (' + x.who + ')' : '')));
    return out;
  }
  // V1.5.10: báo cáo ngày theo mẫu anh Nhật – A. Nhân lực (từ bảng Quân số) · B. Công việc thi công · C. Nghiệm thu · D. Vướng mắc (+ E. Vật tư, F. Kế hoạch ngày mai khi có)
  function dayReport(S, L) {   // V1.5.10: đổi tên – trùng tên với report(W, S) của tab Báo cáo nên trước đây chép báo cáo ngày bị lỗi
    const bl = (t, none) => { const a = String(t || '').split('\n').map(x => x.trim()).filter(Boolean); return a.length ? a.map(x => /^[-•+–*]/.test(x) ? x.replace(/^[•+–*]\s*/, '- ') : '- ' + x) : (none ? ['- ' + none] : []); };
    const nm = String(S.name || '').trim(), proj = /^dự án/i.test(nm) ? nm : 'Dự án ' + nm;
    const Q = dayQS(S, L.d, L), qs = qsZalo(S, L.d, Q).split('\n').slice(1);
    const out = ['Báo cáo công việc ngày ' + fdFull(L.d) + ' - ' + proj, 'Thời tiết: ' + String(L.wx || '').replace(/^[^\p{L}\d]+/u, '').trim(),
      'A. Nhân lực: ' + Q.T + ' người', ...qs, 'B. Công việc thi công:', ...bl(L.work, 'Không'), 'C. Nghiệm thu', ...bl(L.qa, 'Không'), 'D. Vướng mắc', ...bl(L.issue, 'Không')];
    out.push('E. Kế hoạch', ...bl(planNext(S, L.d).concat(String(L.next || '').split('\n')).join('\n'), 'Chưa có'));   // V1.5.11: tự tổng hợp việc ngày mai
    if (String(L.mat || '').trim()) out.push('F. Vật tư', ...bl(L.mat));
    return out.join('\n');
  }
  // V1.5.10: báo cáo ngày SỬA ĐƯỢC trước khi gửi – bản đã sửa lưu theo ngày (L.rep); ↺ tạo lại từ dữ liệu mới nhất
  function repDlg(S, L) {
    let ta;
    const d = dialog('📋 Báo cáo công việc ngày ' + fdFull(L.d), b => {
      ta = $('textarea', 'sb-in sb-ta sb-repta'); ta.rows = 22; ta.value = L.rep || dayReport(S, L); ta.setAttribute('aria-label', 'Nội dung báo cáo ngày'); if (RO) ta.readOnly = true; b.append(ta);
      const row = $('div', 'sb-row');
      if (L.rep) row.append($('span', 'sb-note', '✏️ Bản đã sửa tay – lưu lúc ' + new Date(L.repAt || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })));
      if (!RO) { const re = $('button', 'sb-btn ghost sm', '↺ Tạo lại từ dữ liệu'); re.type = 'button'; re.title = 'Bỏ bản sửa tay, lấy lại theo Quân số / nhật ký mới nhất'; re.addEventListener('click', () => { ta.value = dayReport(S, L); delete L.rep; delete L.repAt; save(); toast('↺ Đã tạo lại báo cáo'); }); row.append(re); }
      b.append(row);
    }, () => { const v = ta.value.trim(); if (!RO) { if (v && v !== dayReport(S, L).trim()) { L.rep = v; L.repAt = Date.now(); } else { delete L.rep; delete L.repAt; } save(); }
      navigator.clipboard.writeText(v).then(() => toast('📋 Đã lưu & chép – dán vào Zalo / tin nhắn'), () => { ta.select(); toast('Bấm Ctrl+C để chép'); }); return true; }, '💾 Lưu & 📋 Chép gửi Zalo');
    setTimeout(() => { if (ta) { ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0; } }, 30);
    return d;
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
  function lightbox(src) { const bg = $('div', 'sb-dlg sb-lb'), im = document.createElement('img'); im.src = photoSrc(src); im.alt = 'Ảnh hiện trường'; bg.append(im); bg.addEventListener('click', () => bg.remove()); document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { bg.remove(); document.removeEventListener('keydown', k); } }); root.append(bg); }
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
      hd.append($('b', '', fdFull(L.d) + (L.d === d ? ' · Hôm nay' : '')), $('span', '', (L.wx || '') + ' · 👷 ' + (bchOf(L) + crewOf(L)) + ' người' + (L.photos && L.photos.length ? ' · 📷 ' + L.photos.length : '')), $('small', '', (L.work || '').split('\n')[0].slice(0, 90)));
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
        [['work', 'B. Công việc thi công', 4], ['qa', 'C. Nghiệm thu', 2], ['issue', 'D. Vướng mắc', 2], ['mat', 'E. Vật tư nhập về / sử dụng', 2], ['next', 'F. Kế hoạch ngày mai', 2]].forEach(([k, lb, rows]) => g2.append(lab(lb, field(L, { k, lb, t: 'area', rows, rr: false }), true)));
        bd.append(g2);
        const ph = $('div', 'sb-photos'); ph.append($('div', 'sb-fl', '📷 Hình ảnh hiện trường'));
        const pg = $('div', 'sb-pg');
        (L.photos || []).forEach((src, i) => { const f = $('figure', 'sb-ph1'), im = document.createElement('img'); im.src = photoSrc(src); im.alt = 'Ảnh ' + (i + 1); im.loading = 'lazy'; im.addEventListener('click', () => lightbox(src));
          const x = $('button', 'sb-phx', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Xoá ảnh'); x.addEventListener('click', () => { L.photos.splice(i, 1); save(); render(true); }); f.append(im, x); pg.append(f); });
        const up = $('label', 'sb-phadd'), fi = $('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true; fi.addEventListener('change', () => addPhotos(L, [...fi.files]));
        up.append(fi, $('span', '', '＋ Thêm ảnh'), $('small', '', 'hoặc kéo ảnh / Ctrl+V'));
        if (!RO) pg.append(up); else if (L.pc) pg.append($('div', 'sb-note', '📷 ' + L.pc + ' ảnh – xem trên máy tính')); if (!RO || L.pc) { ph.append(pg); bd.append(ph); }
        bd.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); }); bd.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); addPhotos(L, [...e.dataTransfer.files]); });
        bd.addEventListener('paste', e => { const f = [...(e.clipboardData && e.clipboardData.files || [])]; if (f.length) { e.preventDefault(); addPhotos(L, f); } });
        const ft = $('div', 'sb-logf');
        const cp = $('button', 'sb-btn sm', '📋 Báo cáo ngày'); cp.type = 'button'; cp.addEventListener('click', () => repDlg(S, L));
        const iss = $('button', 'sb-btn ghost sm', '⚠️ Đưa sự cố vào Vấn đề'); iss.type = 'button'; iss.addEventListener('click', () => { if (!(L.issue || '').trim()) return toast('Chưa ghi sự cố'); S.issues.push({ id: uid(), d: L.d, type: 'ht', t: L.issue.trim(), prop: '', who: '', due: addD(L.d, 2), st: 'mo', res: '' }); save(); toast('⚠️ Đã thêm vào mục Vấn đề'); });
        const sp = $('div'); sp.style.flex = '1';
        ft.append(cp, iss, sp, delBtn(() => { S.logs = S.logs.filter(x => x !== L); save(); render(true); }));
        if (!RO) bd.append(ft); c.append(bd);
      }
      W.append(c);
    });
  }

  // ---------- 👷 NHÂN LỰC ----------
  // V1.5.8: 📋 BẢNG QUÂN SỐ NGÀY – I. Ban chỉ huy · II. Tổ đội · III. Công nhật. Thêm / sửa / xoá dòng ngay trong bảng (không còn bảng khai báo).
  // Ngày mới tự điền giống ngày gần nhất đã điểm danh (mặc định cho lần sau). Ghi thẳng vào Nhật ký ngày đó. Dưới cùng tổng hợp cả tháng.
  let rollD = '', rollM = '';
  const ROLES0 = [['CHT', 'Chỉ huy trưởng'], ['QA/QC', 'Kỹ sư QA/QC'], ['Shop', 'Kỹ sư Shopdrawing'], ['QS', 'Kỹ sư QS'], ['Hiện trường', 'Kỹ sư hiện trường']];
  const rolesOf = S => { if (!Array.isArray(S.roles)) S.roles = ROLES0.map(([n, f]) => ({ id: uid(), name: n + ' – ' + f, def: 1 })); S.roles.forEach(r => { if (r.full) { if (!String(r.name || '').includes(r.full)) r.name = (r.name ? r.name + ' – ' : '') + r.full; delete r.full; } }); return S.roles; };
  const dwOf = S => { if (!Array.isArray(S.dayers)) S.dayers = [{ id: 'cn0', name: 'Công nhật', job: '' }]; return S.dayers; };
  const teamName = tm => { const n = (tm.name || '(chưa đặt tên)').trim(); return /^tổ\b/i.test(n) ? n : 'Tổ ' + n; };
  const shortRole = r => String(r.name || '').split(/\s+[–-]\s+/)[0] || '?';
  const dwVal = (L, x) => L ? (L.dw ? num(L.dw[x.id]) : (x.id === 'cn0' ? num(L.other) : 0)) : 0;
  const dwJob = (L, x) => L ? (L.dwJob && L.dwJob[x.id] != null ? L.dwJob[x.id] : (x.id === 'cn0' && L.otherJob != null ? L.otherJob : null)) : null;
  // số đang hiện của 1 ngày: đã điểm danh → lấy trong nhật ký; chưa → giống ngày gần nhất đã điểm danh (không có thì số mặc định ban đầu)
  function dayQS(S, d, L) {
    const R = rolesOf(S), DW = dwOf(S), done = !!(L && L.bch);
    const P = done ? null : S.logs.filter(l => l.bch && l.d < d).sort((a, b) => a.d < b.d ? 1 : -1)[0] || null;
    const bch = R.map(r => ({ r, n: done ? num(L.bch[r.id]) : P && (r.id in P.bch) ? num(P.bch[r.id]) : num(r.def) }));
    const crew = S.teams.map(tm => {
      const fromL = L && L.crew && (tm.id in L.crew), n = fromL ? num(L.crew[tm.id]) : done ? 0 : P && P.crew && (tm.id in P.crew) ? num(P.crew[tm.id]) : num(tm.def);
      const job = L && L.job && L.job[tm.id] != null ? L.job[tm.id] : P && P.job && P.job[tm.id] != null ? P.job[tm.id] : (tm.scope || '');
      return { tm, n, job }; });
    const dw = DW.map(x => ({ x, n: done || (L && L.dw) ? dwVal(L, x) : P ? dwVal(P, x) : 0, job: dwJob(L, x) ?? dwJob(P, x) ?? (x.job || '') }));
    const B = bch.reduce((a, o) => a + o.n, 0), C = crew.reduce((a, o) => a + o.n, 0), K = dw.reduce((a, o) => a + o.n, 0);
    return { done, bch, crew, dw, B, C, K, T: B + C + K };
  }
  function qsZalo(S, d, Q) {
    const L = ['📋 Quân số ngày ' + fdFull(d) + ': ' + Q.T + ' người'];
    L.push('1. Ban chỉ huy: ' + Q.B + ' người' + (Q.B ? ': ' + Q.bch.filter(o => o.n).map(o => o.n + ' ' + shortRole(o.r)).join(', ') : ''));
    L.push('2. Tổ đội: ' + Q.C + ' người'); Q.crew.filter(o => o.n).forEach(o => L.push('– ' + teamName(o.tm) + (String(o.job).trim() ? ' (' + String(o.job).trim() + ')' : '') + ': ' + o.n + ' người'));
    const W = Q.dw.filter(o => o.n);
    if (W.length === 1 && /^công nhật$/i.test(String(W[0].x.name || '').trim())) L.push('3. Công nhật: ' + Q.K + ' người' + (String(W[0].job).trim() ? ': ' + String(W[0].job).trim() : ''));
    else { L.push('3. Công nhật: ' + Q.K + ' người'); W.forEach(o => L.push('– ' + (o.x.name || 'Công nhật') + (String(o.job).trim() ? ' (' + String(o.job).trim() + ')' : '') + ': ' + o.n + ' người')); }
    return L.join('\n');
  }
  function rollCall(W, S) {
    const d = today(); if (!rollD || rollD > d) rollD = d;
    const h = sec(W, '📋 Quân số ngày ' + fdFull(rollD), 'Ngày mới tự điền giống ngày gần nhất – chỉ chỉnh chỗ khác · ghi thẳng vào Nhật ký ngày đó');
    const di = $('input', 'sb-in'); di.type = 'date'; di.value = rollD; di.max = d; di.setAttribute('aria-label', 'Ngày điểm danh'); di.title = 'Điểm danh ngày khác';
    di.addEventListener('change', () => { if (di.value) { rollD = di.value; render(true); } });
    let L = S.logs.find(l => l.d === rollD);
    const Q = dayQS(S, rollD, L);
    const commit = () => {   // lưu toàn bộ số đang hiện vào nhật ký ngày đó
      if (!L) { L = { id: uid(), d: rollD, wx: WX[0], crew: {}, other: 0, work: '', mat: '', issue: '', next: '', photos: [] }; S.logs.push(L); }
      L.bch = {}; Q.bch.forEach(o => { L.bch[o.r.id] = o.n; }); delete L.bchT; L.crew = L.crew || {}; L.job = L.job || {};
      Q.crew.forEach(o => { if (o.n) L.crew[o.tm.id] = o.n; else delete L.crew[o.tm.id]; L.job[o.tm.id] = o.job; });
      L.dw = {}; L.dwJob = {}; Q.dw.forEach(o => { L.dw[o.x.id] = o.n; L.dwJob[o.x.id] = o.job; }); L.other = Q.dw.reduce((a, o) => a + o.n, 0); delete L.otherJob;
      Q.done = true; save();
    };
    const cp = $('button', 'sb-btn sm', '📋 Chép gửi Zalo'); cp.type = 'button';
    cp.addEventListener('click', async () => { const t = qsZalo(S, rollD, Q); try { await navigator.clipboard.writeText(t); toast('📋 Đã chép quân số – dán vào Zalo'); } catch { dialog('📋 Quân số', b => { const ta = $('textarea', 'sb-in sb-ta'); ta.rows = 10; ta.value = t; b.append(ta); }, () => {}, 'Đóng'); } });
    if (!RO) h.append(di); h.append(cp);
    const box = $('div', 'sb-tw'), t = $('table', 'sb-t sb-qs'), th = $('thead'), hr = $('tr');
    [['STT', 'n'], ['Chức vụ / Tổ đội', 'nm'], ['Công việc hôm nay', 'job'], ['Số người', 'qty'], ['', 'x']].forEach(([l, c]) => hr.append($('th', c, l))); th.append(hr); t.append(th);
    const tb = $('tbody'); t.append(tb);
    const subs = {}, tot = $('td', 'qty'), st = $('span', 'sb-qsst');
    const focusNew = id => setTimeout(() => { const x = root.querySelector('.sb-qs tr[data-id="' + id + '"] td.nm input'); if (x) { x.focus(); x.select(); } }, 60);
    const head = (k, roman, name, addFn, addLb) => { const tr = $('tr', 'qsg'); tr.append($('td', 'n', roman)); const nm = $('td', 'nm'); nm.colSpan = 2; nm.append($('span', '', name));
      if (addFn && !RO) { const b = $('button', 'sb-gadd', '＋'); b.type = 'button'; b.title = addLb; b.setAttribute('aria-label', addLb); b.addEventListener('click', addFn); nm.append(b); }
      tr.append(nm); subs[k] = $('td', 'qty', ''); tr.append(subs[k], $('td', 'x')); tb.append(tr); };
    const upd = () => { Q.B = Q.bch.reduce((a, o) => a + o.n, 0); Q.C = Q.crew.reduce((a, o) => a + o.n, 0); Q.K = Q.dw.reduce((a, o) => a + o.n, 0); Q.T = Q.B + Q.C + Q.K;
      subs.b.textContent = Q.B + ' người'; subs.c.textContent = Q.C + ' người'; subs.k.textContent = Q.K + ' người'; tot.textContent = Q.T + ' người';
      st.textContent = Q.done ? '✓ Đã điểm danh' : 'Chưa điểm danh – đang hiện số ngày gần nhất'; st.className = 'sb-qsst ' + (Q.done ? 'ok' : 'wait'); };
    const qty = (o, lb) => { const w = $('div', 'sb-qsn'), mi = $('button', 'sb-qsb', '−'), pl = $('button', 'sb-qsb', '+'), inp = $('input', 'sb-in'); mi.type = pl.type = 'button'; inp.inputMode = 'numeric'; inp.value = String(o.n); inp.setAttribute('aria-label', 'Số người ' + lb);
      mi.setAttribute('aria-label', 'Bớt 1 – ' + lb); pl.setAttribute('aria-label', 'Thêm 1 – ' + lb);
      if (RO) { inp.readOnly = true; mi.disabled = pl.disabled = true; }
      const put = v => { o.n = Math.max(0, Math.round(num(v))); inp.value = String(o.n); commit(); upd(); };
      mi.addEventListener('click', () => put(o.n - 1)); pl.addEventListener('click', () => put(o.n + 1)); inp.addEventListener('change', () => put(inp.value)); inp.addEventListener('focus', () => inp.select());
      w.append(mi, inp, pl); return w; };
    const txt = (get, set, ph, lb) => { const i = $('input', 'sb-in'); i.value = get() || ''; i.placeholder = RO ? '' : ph; i.setAttribute('aria-label', lb); if (RO) i.readOnly = true; i.addEventListener('change', () => set(i.value.trim())); return i; };
    const row = (id, no, nameEl, jobEl, o, lb, del) => { const tr = $('tr'); tr.dataset.id = id; const nm = $('td', 'nm'), jb = $('td', 'job'), q = $('td', 'qty'), x = $('td', 'x');
      nm.append(nameEl); if (jobEl) jb.append(jobEl); q.append(qty(o, lb)); if (!RO && del) x.append(delBtn(del));
      tr.append($('td', 'n', String(no)), nm, jb, q, x); tb.append(tr); };
    // I. Ban chỉ huy
    head('b', 'I', 'BAN CHỈ HUY', () => { const r = { id: uid(), name: '', def: 1 }; rolesOf(S).push(r); save(); render(true); focusNew(r.id); }, 'Thêm chức vụ');
    Q.bch.forEach((o, i) => row(o.r.id, i + 1, txt(() => o.r.name, v => { o.r.name = v; save(); }, 'Chức vụ (vd: An toàn)', 'Chức vụ'), txt(() => o.r.who, v => { o.r.who = v; rememberWho(v); save(); }, 'Họ tên (không bắt buộc)', 'Họ tên'), o, shortRole(o.r),
      () => { S.roles.splice(S.roles.indexOf(o.r), 1); save(); render(true); }));
    // II. Tổ đội
    head('c', 'II', 'TỔ ĐỘI', () => { const tm = { id: uid(), name: '', lead: '', phone: '', scope: '', def: 0, rate: 0 }; S.teams.push(tm); save(); render(true); focusNew(tm.id); }, 'Thêm tổ đội');
    Q.crew.forEach((o, i) => row(o.tm.id, i + 1, txt(() => o.tm.name, v => { o.tm.name = v; save(); }, 'Tên tổ (vd: Mr Bình)', 'Tên tổ'), txt(() => o.job, v => { o.job = v; if (!o.tm.scope) o.tm.scope = v; commit(); }, 'Việc hôm nay (vd: cốp pha dầm sàn tầng 3)', 'Việc hôm nay'), o, teamName(o.tm),
      () => { S.teams.splice(S.teams.indexOf(o.tm), 1); save(); render(true); }));
    if (!S.teams.length) { const tr = $('tr'), td = $('td', 'sb-none', 'Chưa có tổ đội – bấm ＋ ở dòng “II. TỔ ĐỘI”'); td.colSpan = 5; tr.append(td); tb.append(tr); }
    // III. Công nhật
    head('k', 'III', 'CÔNG NHẬT', () => { const x = { id: uid(), name: '', job: '' }; dwOf(S).push(x); save(); render(true); focusNew(x.id); }, 'Thêm dòng công nhật');
    Q.dw.forEach((o, i) => row(o.x.id, i + 1, txt(() => o.x.name, v => { o.x.name = v; save(); }, 'Tên / nhóm (vd: Phụ hồ)', 'Tên công nhật'), txt(() => o.job, v => { o.job = v; commit(); }, 'Làm việc gì (vd: dọn vệ sinh, vận chuyển vật tư)', 'Việc hôm nay'), o, o.x.name || 'Công nhật',
      () => { S.dayers.splice(S.dayers.indexOf(o.x), 1); save(); render(true); }));
    const tf = $('tfoot'), fr = $('tr', 'qstot'), fl = $('td', 'nm', 'TỔNG QUÂN SỐ'); fl.colSpan = 3; fl.append(st); fr.append(fl, tot, $('td', 'x')); tf.append(fr); t.append(tf);
    upd(); box.append(t); W.append(box);
    if (!Q.done && !RO) { const ok = $('button', 'sb-btn', '✓ Xác nhận quân số ' + fdFull(rollD)); ok.type = 'button'; ok.addEventListener('click', () => { commit(); upd(); toast('✓ Đã điểm danh ' + fdFull(rollD)); render(true); }); const r = $('div', 'sb-row sb-qsok'); r.append(ok, $('span', 'sb-note', 'Bấm nếu số đã đúng – hoặc chỉnh số ở bảng, HaoHao tự lưu.')); W.append(r); }
  }
  // ---- tổng hợp tháng – NHẬP THẲNG: bấm ô ngày gõ số người (Enter / Tab sang ngày kế), ＋ thêm tổ / công nhật, ghi chú đội làm gì ----
  function monthSum(W, S) {
    const d = today(); if (!rollM) rollM = d.slice(0, 7);
    const [yy, mm] = rollM.split('-').map(Number), nd = new Date(yy, mm, 0).getDate(), D = Array.from({ length: nd }, (_, i) => rollM + '-' + String(i + 1).padStart(2, '0'));
    const h = sec(W, '📊 Quân số tháng ' + mm + '/' + yy, 'Bấm ô ngày gõ số người – Enter / Tab sang ngày kế · tự lưu vào Nhật ký từng ngày');
    const nav = $('div', 'sb-row'), pv = $('button', 'sb-btn ghost sm', '‹'), nx = $('button', 'sb-btn ghost sm', '›'); pv.type = nx.type = 'button'; pv.setAttribute('aria-label', 'Tháng trước'); nx.setAttribute('aria-label', 'Tháng sau');
    const mv = k => { const x = new Date(yy, mm - 1 + k, 1); rollM = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); render(true); };
    pv.addEventListener('click', () => mv(-1)); nx.addEventListener('click', () => mv(1)); nav.append(pv, nx); h.append(nav);
    const logOf = (x, mk) => { let L = S.logs.find(l => l.d === x); if (!L && mk) { L = { id: uid(), d: x, wx: WX[0], crew: {}, other: 0, work: '', mat: '', issue: '', next: '', photos: [] }; S.logs.push(L); } return L; };
    const setDw = (L, id, n) => { if (!L.dw) { L.dw = {}; if (num(L.other)) L.dw.cn0 = num(L.other); } if (n) L.dw[id] = n; else delete L.dw[id]; L.other = Object.values(L.dw).reduce((a, v) => a + num(v), 0); };
    // [stt, tên, công việc, lấy số, ghi số, đối tượng tên, khoá tên, khoá việc, kiểu]
    const R = [{ no: 'I', nm: 'BAN CHỈ HUY', get: L => bchOf(L), set: (L, n) => { L.bchT = n; }, cls: 'qsg bch' },
      { g: 'TỔ ĐỘI', gno: 'II', add: () => { const tm = { id: uid(), name: '', lead: '', phone: '', scope: '', def: 0, rate: 0 }; S.teams.push(tm); return tm.id; } },
      ...S.teams.map((tm, i) => ({ id: tm.id, no: String(i + 1), o: tm, nk: 'name', jk: 'scope', nph: 'Tên tổ (vd: Mr Bình)', jph: 'Đội làm gì (vd: cốp pha)', get: L => num((L.crew || {})[tm.id]), set: (L, n) => { L.crew = L.crew || {}; if (n) L.crew[tm.id] = n; else delete L.crew[tm.id]; } })),
      { g: 'CÔNG NHẬT', gno: 'III', add: () => { const x = { id: uid(), name: '', job: '' }; dwOf(S).push(x); return x.id; } },
      ...dwOf(S).map((x, i) => ({ id: x.id, no: String(i + 1), o: x, nk: 'name', jk: 'job', nph: 'Tên / nhóm (vd: Phụ hồ)', jph: 'Làm gì (vd: dọn vệ sinh)', get: L => dwVal(L, x), set: (L, n) => setDw(L, x.id, n) }))];
    const box = $('div', 'sb-tw sb-msw'), t = $('table', 'sb-t sb-ms'), hr = $('tr');
    hr.append($('th', 'n', 'STT'), $('th', 'nm', 'Chức vụ / Tổ đội'), $('th', 'jb', 'Công việc / ghi chú'));
    D.forEach(x => { const dw = new Date(x + 'T00:00').getDay(); hr.append($('th', 'c' + (dw === 0 ? ' we' : '') + (x === d ? ' td' : ''), String(+x.slice(8)))); });
    hr.append($('th', 'r', 'Tổng công')); const th = $('thead'); th.append(hr); t.append(th);
    const tb = $('tbody'), dayT = D.map(() => 0), dayCells = [], rowTot = []; let gC = 0; const gCell = $('td', 'r');
    const recalc = () => { dayT.fill(0); let g = 0; rowTot.forEach(([cells, cell]) => { let s = 0; cells.forEach((inp, i) => { const v = num(inp.value); s += v; dayT[i] += v; }); cell.textContent = String(s); g += s; }); dayCells.forEach((c, i) => { c.textContent = dayT[i] ? String(dayT[i]) : ''; }); gCell.textContent = String(g); };
    const focusNew = id => setTimeout(() => { const x = root.querySelector('.sb-ms tr[data-id="' + id + '"] td.nm input'); if (x) { x.focus(); x.select(); } }, 60);
    R.forEach(r => {
      if (r.g) { const tr = $('tr', 'qsg'), td = $('td', 'nm', ''); td.colSpan = 3; td.append($('span', '', r.g));
        if (!RO) { const b = $('button', 'sb-gadd', '＋'); b.type = 'button'; b.title = 'Thêm dòng ' + r.g.toLowerCase(); b.setAttribute('aria-label', b.title); b.addEventListener('click', () => { const id = r.add(); save(); render(true); focusNew(id); }); td.append(b); }
        const rest = $('td', ''); rest.colSpan = nd + 1; td.colSpan = 2; tr.append($('td', 'n', r.gno), td, rest); tb.append(tr); return; }
      const tr = $('tr', r.cls || ''); if (r.id) tr.dataset.id = r.id;
      const nm = $('td', 'nm'), jb = $('td', 'jb');
      if (r.o) { const ni = $('input', 'sb-in'); ni.value = r.o[r.nk] || ''; ni.placeholder = RO ? '' : r.nph; ni.setAttribute('aria-label', 'Tên'); if (RO) ni.readOnly = true; ni.addEventListener('change', () => { r.o[r.nk] = ni.value.trim(); save(); }); nm.append(ni);
        const ji = $('input', 'sb-in'); ji.value = r.o[r.jk] || ''; ji.placeholder = RO ? '' : r.jph; ji.setAttribute('aria-label', 'Công việc / ghi chú'); if (RO) ji.readOnly = true; ji.addEventListener('change', () => { r.o[r.jk] = ji.value.trim(); save(); }); jb.append(ji); }
      else nm.append($('b', '', r.nm));
      tr.append($('td', 'n', r.no), nm, jb);
      const cells = [];
      D.forEach((x, i) => { const L = logOf(x, false), v = L ? r.get(L) : 0, td = $('td', 'c' + (v ? ' has' : '') + (x === d ? ' td' : '')), inp = $('input', 'sb-mi'); inp.inputMode = 'numeric'; inp.value = v ? String(v) : '';
        inp.setAttribute('aria-label', (r.o ? (r.o[r.nk] || 'dòng ' + r.no) : r.nm) + ' ngày ' + (+x.slice(8)) + '/' + mm); if (RO) inp.readOnly = true;
        inp.addEventListener('focus', () => inp.select());
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const nx = cells[i + 1]; if (nx) nx.focus(); else inp.blur(); } });
        inp.addEventListener('change', () => { const n = Math.max(0, Math.round(num(inp.value))); inp.value = n ? String(n) : ''; const LL = logOf(x, true); r.set(LL, n); td.classList.toggle('has', !!n); save(); recalc(); });
        td.append(inp); tr.append(td); cells.push(inp); });
      const tc = $('td', 'r b'); tr.append(tc); rowTot.push([cells, tc]); tb.append(tr);
    });
    const fr = $('tr', 'sum'), fnm = $('td', 'nm'); fnm.append($('span', '', 'Cộng')); fr.append($('td', 'n', ''), fnm, $('td', 'jb', '')); D.forEach(() => { const c = $('td', 'c'); dayCells.push(c); fr.append(c); }); fr.append(gCell); tb.append(fr);
    t.append(tb); box.append(t); W.append(box); recalc();
  }
  function crew(W, S) { rolesOf(S); dwOf(S); rollCall(W, S); monthSum(W, S); }

  // ---------- 🧱 VẬT TƯ ----------
  // V1.5.3: 📁 mỗi dòng vật tư gắn 1 thư mục hồ sơ trên máy (báo giá, hợp đồng, phiếu giao…). Chọn trong cây thư mục công trình hoặc dán đường dẫn.
  function pickDir(r, S) {
    const base = (S.dir || '').replace(/[\\/]+$/, ''), sc = S.fscan && S.fscan.dir === base ? S.fscan.t : null;
    dialog('📁 Thư mục hồ sơ' + (r.name ? ' – ' + r.name : ''), b => {
      const inp = $('input', 'sb-in'); inp.value = r.dir || (base ? base + '\\' : ''); inp.placeholder = 'D:\\DU_AN\\05_VAT_TU\\Thep'; inp.setAttribute('aria-label', 'Đường dẫn thư mục');
      b.append(lab('Đường dẫn thư mục trên máy', inp, true));
      if (!base) { b.append($('p', 'sb-p', 'Mẹo: đặt Thư mục gốc ở tab 📁 Hồ sơ để chọn nhanh trong cây thư mục công trình.')); return; }
      const L = $('div', 'sb-dirl'); L.setAttribute('aria-label', 'Cây thư mục công trình');
      mergeTree(sc).forEach(([f, subs, st]) => {
        if (st === 'miss') return;
        const add = (path, txt, cls) => { const x = $('button', cls || '', txt); x.type = 'button'; x.title = base + '\\' + path;
          x.addEventListener('click', () => { inp.value = base + '\\' + path; L.querySelectorAll('.on').forEach(y => y.classList.remove('on')); x.classList.add('on'); }); L.append(x); };
        add(f, '📁 ' + f);
        subs.forEach(([c, cs]) => { if (cs !== 'miss') add(f + '\\' + c, '└ ' + c, 'c'); });
      });
      b.append(L);
      if (!sc) b.append($('p', 'sb-p', 'Chưa quét thư mục trên máy – cây đang là cây chuẩn. Vào tab 📁 Hồ sơ bấm 🔄 Quét lại để thấy đúng thư mục thật.'));
    }, body => { const v = body.querySelector('input').value.trim().replace(/[\\/]+$/, ''); if (v) r.dir = v; else delete r.dir; save(); render(true); toast(v ? '📁 Đã gắn thư mục' : 'Đã bỏ thư mục'); }, 'Lưu');
  }
  const dirCell = (r, S, x) => {
    const o = $('button', 'sb-dirb', r.dir ? '📂' : '📁'); o.type = 'button';
    o.title = r.dir ? 'Mở ' + r.dir : 'Chọn thư mục lưu hồ sơ trên máy'; o.setAttribute('aria-label', o.title);
    o.addEventListener('click', () => r.dir ? openPath(r.dir) : pickDir(r, S)); x.append(o);
    if (r.dir) { const e = $('button', 'sb-dirb ed', '✎'); e.type = 'button'; e.title = 'Đổi / bỏ thư mục'; e.setAttribute('aria-label', 'Đổi thư mục hồ sơ'); e.addEventListener('click', () => pickDir(r, S)); x.append(e); }
  };
  function mat(W, S) {
    const d = today();
    sec(W, '🧱 Nhu cầu & đề xuất vật tư', 'Đặt “Cần ngày” – Tổng quan tự báo khi còn 7 ngày');
    W.append(table(S.mats.slice().sort((a, b) => (a.st === 've') - (b.st === 've') || (a.need || '9').localeCompare(b.need || '9')), [
      { k: 'name', lb: 'Vật tư', t: 'text', ph: 'Thép D16', rr: false }, { k: 'unit', lb: 'ĐVT', t: 'text', w: '64px', rr: false }, { k: 'qty', lb: 'Số lượng', t: 'num', w: '84px', rr: false },
      { k: 'need', lb: 'Cần ngày', t: 'date', w: '128px' }, { k: 'for', lb: 'Cho hạng mục', t: 'text', w: '14%', rr: false }, { k: 'sup', lb: 'Nhà cung cấp', t: 'text', w: '13%', rr: false },
      { k: 'st', lb: 'Trạng thái', t: 'sel', o: MST, w: '100px', on: m => { if (m.st === 've' && m.name && !m.inStock) { S.stock.push({ id: uid(), d, name: m.name, unit: m.unit, io: 'in', qty: num(m.qty), note: 'Từ đề xuất' + (m.sup ? ' · ' + m.sup : '') }); m.inStock = 1; toast('🧱 Đã tự ghi nhập kho ' + m.name); } } }
    ], { list: S.mats, extra: (r, x) => dirCell(r, S, x), add: () => ({ id: uid(), name: '', unit: '', qty: '', need: addD(d, 3), for: '', sup: '', st: 'de' }), addLb: '＋ Thêm vật tư cần', cls: m => (m.st === 've' ? 'done' : '') + (m.st !== 've' && m.need && m.need < d ? ' late' : '') }));
    sec(W, '📦 Nhập – xuất vật tư');
    W.append(table(S.stock.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '')), [
      { k: 'd', lb: 'Ngày', t: 'date', w: '128px' }, { k: 'name', lb: 'Vật tư', t: 'text', rr: false }, { k: 'unit', lb: 'ĐVT', t: 'text', w: '64px', rr: false },
      { k: 'io', lb: 'Nhập / Xuất', t: 'sel', o: [['in', '⬇ Nhập'], ['out', '⬆ Xuất']], w: '96px' }, { k: 'qty', lb: 'Số lượng', t: 'num', w: '90px' }, { k: 'note', lb: 'Ghi chú', t: 'text', rr: false }
    ], { list: S.stock, extra: (r, x) => dirCell(r, S, x), add: () => ({ id: uid(), d, name: '', unit: '', io: 'in', qty: '', note: '' }), addLb: '＋ Ghi nhập / xuất' }));
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
      { k: 'prop', lb: 'Đề xuất xử lý', t: 'area', rr: false, rows: 1 }, { k: 'who', lb: 'Người chịu TN', who: true, t: 'text', w: '11%', rr: false },
      { k: 'due', lb: 'Hạn', t: 'date', w: '124px', on: x => todoPush(x, false) }, { k: 'st', lb: 'Trạng thái', t: 'sel', o: IST, w: '108px', on: x => { if (x.st === 'dong') x.closed = d; todoPush(x, false); } }, { k: 'res', lb: 'Kết quả', t: 'area', rr: false, rows: 1 }
    ], { list: S.issues, add: () => ({ id: uid(), d, type: 'ht', t: '', prop: '', who: '', due: addD(d, 2), st: 'mo', res: '' }), addLb: '＋ Thêm vấn đề', empty: 'Không có vấn đề nào ở bộ lọc này', cls: x => (x.st === 'dong' ? 'done' : '') + (x.st !== 'dong' && x.due && x.due < d ? ' late' : ''), extra: (x, td) => WEB || td.append(bellBtn(x, () => (lbl(ITYPE, x.type) ? '[' + lbl(ITYPE, x.type) + '] ' : '') + (x.t || '').split('\n')[0], S)) }));
  }

  // ---------- 📁 HỒ SƠ ----------
  const fileUrl = v => 'file:///' + v.trim().replace(/^file:\/+/i, '').replace(/\\/g, '/').split('/').map(x => encodeURIComponent(x).replace(/%3A/gi, ':')).join('/') + (/[\\/]$/.test(v.trim()) ? '' : '/');
  const fileOk = () => new Promise(res => { try { chrome.extension.isAllowedFileSchemeAccess(ok => res(!!ok)); } catch { res(false); } });
  // V1.4.2: đọc thư mục thật trên máy (cần bật "Cho phép truy cập URL tệp") – Chrome trả trang liệt kê có addRow("tên", …, 1 = thư mục)
  const lsDir = path => new Promise(res => { try { const x = new XMLHttpRequest(); x.open('GET', fileUrl(path)); x.timeout = 4000;
    x.onload = () => { const out = [], re = /addRow\("((?:[^"\\]|\\.)*)","((?:[^"\\]|\\.)*)",(\d)/g; let m; while ((m = re.exec(x.responseText || ''))) { let n = ''; try { n = decodeURIComponent(m[2]).replace(/\/$/, ''); } catch {} if (!n) { try { n = JSON.parse('"' + m[1] + '"'); } catch { n = m[1]; } } if (m[3] === '1' && n !== '..' && n !== '.' && !/^[._$~]/.test(n)) out.push(n); } res(/addRow|start\(/.test(x.responseText || '') ? out : null); };
    x.onerror = x.ontimeout = () => res(null); x.send(); } catch { res(null); } });
  const byName = (a, b) => a.localeCompare(b, 'vi', { numeric: true });
  async function scanDir(base) {
    const top = await lsDir(base); if (!top) return null;
    const t = []; for (const f of top.sort(byName).slice(0, 60)) { const sub = await lsDir(base + '\\' + f); t.push([f, (sub || []).sort(byName).slice(0, 80)]); }
    return t;
  }
  // Ghép cây chuẩn + cây thật: chuẩn mà máy chưa có → "miss", máy có mà chuẩn không có → "new"
  function mergeTree(sc) {
    if (!sc) return FTREE.map(([k, v]) => [k, v.map(c => [c, ''])]);
    const M = new Map(sc.map(([k, v]) => [k, v])), out = [];
    const keys = [...new Set([...FTREE.map(x => x[0]), ...sc.map(x => x[0])])].sort(byName);
    for (const k of keys) { const std = (FTREE.find(x => x[0] === k) || [k, null])[1], disk = M.get(k);
      const subs = [...new Set([...(std || []), ...(disk || [])])].sort(byName).map(c => [c, disk ? (disk.includes(c) ? (std && std.includes(c) ? '' : 'new') : 'miss') : '']);
      out.push([k, subs, !disk ? 'miss' : !std ? 'new' : '']); }
    return out;
  }
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
    const ps = $('button', 'sb-btn ghost sm', '⚡ Chép lệnh tạo cây thư mục chuẩn'); ps.type = 'button'; ps.title = 'Dán vào PowerShell (Win + X → Terminal) để tạo đủ thư mục chính 00–11, 99 và các thư mục con';
    ps.addEventListener('click', async () => {
      const base = (S.dir || ('D:\\DU_AN_XAY_DUNG\\01_' + folderName(S))).replace(/[\\/]+$/, '');
      const cmd = '$g = "' + base.replace(/"/g, '') + '"; ' + '@(' + FPATHS.map(x => "'" + x + "'").join(', ') + ') | ForEach-Object { New-Item -ItemType Directory -Force -Path (Join-Path $g $_) | Out-Null }; explorer $g';
      try { await navigator.clipboard.writeText(cmd); toast('⚡ Đã chép – mở PowerShell, dán (Ctrl+V), Enter'); } catch { dialog('⚡ Lệnh tạo thư mục', b => { const t = $('textarea', 'sb-in sb-ta'); t.rows = 6; t.value = cmd; b.append(t); }, () => {}, 'Đóng'); }
    });
    row.append(op, dv, ps); c.append(row); W.append(c);
    const fc = card('Cây thư mục', 'wide'), fhd = $('div', 'sb-row sb-fhd'), fst = $('span', 'sb-fst'), fl = $('div', 'sb-folders');
    const rs = $('button', 'sb-btn ghost sm', '🔄 Quét lại thư mục trên máy'); rs.type = 'button';
    fhd.append(fst, rs); fc.append(fhd, fl); W.append(fc);
    const base0 = () => (S.dir || '').replace(/[\\/]+$/, ''), go = p => S.dir ? openPath(base0() + '\\' + p) : toast('Nhập thư mục gốc ở trên trước');
    const draw = () => {
      fl.textContent = ''; const sc = S.fscan && S.fscan.dir === base0() ? S.fscan.t : null, T = mergeTree(sc);
      T.forEach(([f, subs, st]) => { const box = $('div', 'sb-fgrp' + (st === 'miss' ? ' miss' : '')), b = $('button', 'sb-fold'); b.type = 'button'; b.append($('span', '', '📁'), $('b', '', /^\d\d_/.test(f) ? f.slice(0, 2) : '＋'), $('small', '', fNice(/^\d\d_/.test(f) ? f : '00_' + f)));
        if (st === 'new') b.append($('i', 'sb-fnew', 'mới')); if (st === 'miss') b.append($('i', 'sb-fmiss', 'chưa có'));
        b.title = S.dir ? base0() + '\\' + f : 'Nhập thư mục gốc để mở'; b.addEventListener('click', () => go(f)); box.append(b);
        if (subs.length) { const ul = $('div', 'sb-fsub'); subs.forEach(([c, cs]) => { const x = $('button', 'sb-fsubi' + (cs === 'miss' ? ' miss' : '')); x.type = 'button'; const num = /^\d\d_/.test(c);
          x.append($('b', '', num ? c.slice(0, 2) : '•'), ' ' + fNice(num ? c : '00_' + c).replace(/^./, m => m.toUpperCase())); if (cs === 'new') x.append($('i', 'sb-fnew', 'mới'));
          x.title = S.dir ? base0() + '\\' + f + '\\' + c : 'Nhập thư mục gốc để mở'; x.addEventListener('click', () => go(f + '\\' + c)); ul.append(x); }); box.append(ul); }
        fl.append(box); });
      fst.textContent = !S.dir ? 'Nhập thư mục gốc để HaoHao đọc thư mục trên máy' : sc ? '✓ Đã khớp với máy lúc ' + new Date(S.fscan.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) + ' – thư mục anh thêm trên máy sẽ tự hiện ở đây' : 'Đang hiện cây chuẩn – chưa đọc được thư mục trên máy';
    };
    const scan = async manual => {
      if (!S.dir || RO) { draw(); return; }
      if (!(await fileOk())) { draw(); if (manual) openPath(S.dir); return; }
      fst.textContent = '⏳ Đang đọc thư mục trên máy…';
      const t = await scanDir(base0());
      if (!t) { draw(); fst.textContent = '⚠ Không đọc được thư mục – kiểm tra lại đường dẫn'; return; }
      const v = { dir: base0(), t }, same = S.fscan && S.fscan.dir === v.dir && JSON.stringify(S.fscan.t) === JSON.stringify(t);
      S.fscan = { ...v, at: Date.now() }; if (!same) save(); draw(); if (manual) toast('🔄 Đã cập nhật cây thư mục theo máy');
    };
    rs.addEventListener('click', () => scan(true));
    draw(); scan(false);
    if (!file.hooked) { file.hooked = true; window.addEventListener('focus', () => { const h = document.querySelector('.sb-fhd'); if (h && h.isConnected) h.querySelector('button').dispatchEvent(new CustomEvent('sb-rescan')); }); }
    rs.addEventListener('sb-rescan', () => scan(false));
    sec(W, '📌 Tài liệu hay dùng', 'Hợp đồng, bản vẽ, dự toán… – dán đường dẫn file hoặc link');
    W.append(table(S.docs, [{ k: 't', lb: 'Tên tài liệu', t: 'text', ph: 'Bản vẽ kết cấu rev2', rr: false }, { k: 'f', lb: 'Thư mục', t: 'sel', o: [['', '—'], ...mergeTree(S.fscan && S.fscan.t).flatMap(([k, v]) => [[k, k], ...v.map(([c]) => [k + '\\' + c, '   └ ' + c])]), ...[...new Set((S.docs || []).map(d => d.f))].filter(f => f && !mergeTree(S.fscan && S.fscan.t).some(([k, v]) => f === k || v.some(([c]) => f === k + '\\' + c))).map(f => [f, f + ' (cũ)'])], w: '22%' },
      { k: 'p', lb: 'Đường dẫn / link', t: 'text', ph: 'D:\\…\\ban-ve.pdf hoặc https://…', rr: false }, { k: 'op', lb: '', t: 'calc', w: '44px', f: x => { const b = $('button', 'sb-open', '↗'); b.type = 'button'; b.title = 'Mở'; b.addEventListener('click', () => x.p ? openPath(/\.[a-z0-9]{2,5}$/i.test(x.p) && !/^https?:/i.test(x.p) ? x.p.replace(/[\\/][^\\/]*$/, '') : x.p) : toast('Chưa có đường dẫn')); return b; } }],
    { list: S.docs, add: () => ({ id: uid(), t: '', f: '', p: '' }), addLb: '＋ Thêm tài liệu' }));
  }

  // ---------- 📑 V1.3.1: BÁO CÁO TUẦN / THÁNG ----------
  // Mỗi ngày mở trang → ghi 1 mốc tiến độ (S.hist: { d, kh, tt }) để báo cáo biết đầu kỳ – cuối kỳ đạt bao nhiêu.
  function snapHist(S) {
    if (RO) return; const d = today(), pr = progress(S); S.hist = Array.isArray(S.hist) ? S.hist : [];
    const last = S.hist[S.hist.length - 1];
    if (last && last.d === d) { if (last.kh === pr.kh && last.tt === pr.tt) return; last.kh = pr.kh; last.tt = pr.tt; }
    else S.hist.push({ id: d, d, kh: pr.kh, tt: pr.tt });
    if (S.hist.length > 800) S.hist.splice(0, S.hist.length - 800);
    saveSoon();
  }
  const histAt = (S, d) => { const H = (S.hist || []).filter(h => h.d <= d); return H.length ? H[H.length - 1] : null; };
  let rp = { kind: 'd', off: 0 }, rpEdit = false, rpDay = '';
  // V1.3.6: báo cáo CHỈNH TAY – sửa thẳng trên bản báo cáo rồi lưu theo kỳ (S.reports[key].html). Lọc bỏ mã lạ trước khi lưu / hiện.
  function cleanHtml(h) {
    const d = new DOMParser().parseFromString('<div>' + String(h || '') + '</div>', 'text/html'), root0 = d.body.firstChild;
    root0.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,select,textarea').forEach(e => e.remove());
    root0.querySelectorAll('*').forEach(e => [...e.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) || a.name === 'contenteditable') e.removeAttribute(a.name); }));
    return [...root0.childNodes];
  }
  function period(kind, off) {
    const t = new Date(today() + 'T00:00');
    if (kind === 'w') { const dow = (t.getDay() + 6) % 7; t.setDate(t.getDate() - dow + off * 7); const a = ymd(t); return { a, b: addD(a, 6), key: 'W' + a, label: 'Tuần ' + fd(a) + ' – ' + fd(addD(a, 6)) + '/' + addD(a, 6).slice(0, 4), next: { a: addD(a, 7), b: addD(a, 13) } }; }
    const m = new Date(t.getFullYear(), t.getMonth() + off, 1), a = ymd(m), e = new Date(m.getFullYear(), m.getMonth() + 1, 0), b = ymd(e), n2 = new Date(m.getFullYear(), m.getMonth() + 2, 0);
    return { a, b, key: 'M' + a.slice(0, 7), label: 'Tháng ' + (m.getMonth() + 1) + '/' + m.getFullYear(), next: { a: addD(b, 1), b: ymd(n2) } };
  }
  const inP = (d, P) => d && d >= P.a && d <= P.b;
  function repData(S, P) {
    const d0 = addD(P.a, -1), dEnd = P.b < today() ? P.b : today();
    const h0 = histAt(S, d0), h1 = P.b < today() ? histAt(S, P.b) : null, prNow = progress(S, dEnd);
    const startKh = h0 ? h0.kh : progress(S, d0).kh, startTt = h0 ? h0.tt : null, endKh = h1 ? h1.kh : prNow.kh, endTt = h1 ? h1.tt : prNow.tt;
    const logs = S.logs.filter(l => inP(l.d, P)).sort((a, b) => a.d < b.d ? -1 : 1);
    const crewT = S.teams.map(t => ({ t, n: logs.reduce((a, l) => a + num((l.crew || {})[t.id]), 0) })).filter(x => x.n);
    const other = logs.reduce((a, l) => a + num(l.other), 0), cong = crewT.reduce((a, x) => a + x.n, 0) + other;
    const rain = logs.filter(l => /Mưa|Nghỉ/.test(l.wx || '')).length;
    const done = S.tasks.filter(t => t.st === 'done' && inP(t.doneAt, P)), added = S.tasks.filter(t => inP(t.at, P));
    const late = S.tasks.filter(t => t.st !== 'done' && t.due && t.due <= P.b && t.due < today());
    const nextT = S.tasks.filter(t => t.st !== 'done' && t.due && t.due >= P.next.a && t.due <= P.next.b).sort((a, b) => a.due < b.due ? -1 : 1);
    const costs = S.costs.filter(c => inP(c.d, P)), inc = S.incomes.filter(x => inP(x.d, P));
    const cSum = costs.reduce((a, c) => a + num(c.amt), 0), iSum = inc.reduce((a, x) => a + num(x.amt), 0);
    const byCat = new Map(); costs.forEach(c => { const n = (S.budget.find(b => b.id === c.cat) || {}).name || 'Khác'; byCat.set(n, (byCat.get(n) || 0) + num(c.amt)); });
    const cAll = S.costs.filter(c => c.d && c.d <= P.b).reduce((a, c) => a + num(c.amt), 0), iAll = S.incomes.filter(x => x.d && x.d <= P.b).reduce((a, x) => a + num(x.amt), 0);
    const debt = S.costs.filter(c => !c.paid).reduce((a, c) => a + num(c.amt), 0), B = S.budget.reduce((a, b) => a + num(b.est), 0);
    const stock = S.stock.filter(x => inP(x.d, P)), stIn = new Map(), stOut = new Map();
    stock.forEach(x => { const k = (x.name || '?') + '|' + (x.unit || ''), M = x.io === 'out' ? stOut : stIn; M.set(k, (M.get(k) || 0) + num(x.qty)); });
    const matNext = S.mats.filter(m => m.st !== 've' && m.need && m.need <= P.next.b).sort((a, b) => a.need < b.need ? -1 : 1);
    const isNew = S.issues.filter(x => inP(x.d, P)), isClosed = S.issues.filter(x => x.st === 'dong' && inP(x.closed, P)), isOpen = S.issues.filter(x => x.st !== 'dong');
    const items = S.plan.filter(p => p.s && p.e && p.s <= P.b && p.e >= P.a);
    const photos = logs.reduce((a, l) => a + ((l.photos || []).length || num(l.pc)), 0);
    return { P, startKh, startTt, endKh, endTt, logs, crewT, other, cong, rain, done, added, late, nextT, costs, inc, cSum, iSum, byCat, cAll, iAll, debt, B, stIn, stOut, matNext, isNew, isClosed, isOpen, items, photos };
  }
  // V1.3.4: báo cáo dành cho LÃNH ĐẠO – chỉ thông tin chính, không kèm nhật ký chi tiết
  const ord3 = { cao: 0, tb: 1, thap: 2 };
  function repLead(S, R) {
    const P = R.P, dE = P.b < today() ? P.b : today();
    const slow = R.items.filter(p => lagDays(p, dE) >= 1).sort((a, b) => lagDays(b, dE) - lagDays(a, dE));
    const maxLag = slow.length ? lagDays(slow[0], dE) : 0;
    const verdict = R.endTt + 5 < R.endKh || maxLag >= 3 ? 'CHẬM' : maxLag >= 1 ? 'chậm nhẹ' : 'đúng kế hoạch';
    const done = R.done.slice().sort((a, b) => (ord3[a.pri] ?? 1) - (ord3[b.pri] ?? 1));
    const late = R.late.slice().sort((a, b) => (ord3[a.pri] ?? 1) - (ord3[b.pri] ?? 1) || (a.due < b.due ? -1 : 1));
    const needs = R.isOpen.slice().sort((a, b) => (b.st === 'cd') - (a.st === 'cd') || ((a.due || '9') < (b.due || '9') ? -1 : 1));
    return { slow, maxLag, verdict, done, late, needs };
  }
  function repText(S, R, note, add, hide) {
    const P = R.P, X = repLead(S, R), dE = P.b < today() ? P.b : today(), L = [];
    const hid = (k, key) => ((hide || {})[k] || []).includes(key);   // V1.5.3: dòng anh đã ✕ trong báo cáo kỳ này thì không chép
    const S4 = { slow: p => '📅 Hạng mục ' + plab(p) + ' chậm ' + lagDays(p, dE) + ' ngày', need: x => (x.st === 'cd' ? '🖊 Chờ duyệt: ' : '⚠️ ') + (x.t || '').split('\n')[0], late: t => (t.pri === 'cao' ? '🔴 ' : '❗ ') + t.t };
    const ad = k => ((add || {})[k] || []).filter(t => t.trim()).forEach(t => L.push((/^\s{2}/.test(t) ? '   – ' : '• ') + t.trim()));
    L.push('📑 BÁO CÁO ' + (rp.kind === 'w' ? 'TUẦN' : 'THÁNG') + ' – ' + P.label.replace(/^(Tuần|Tháng) /, ''), '🏗️ ' + (S.code ? S.code + ' · ' : '') + S.name, '');
    L.push('1. TÌNH HÌNH CHUNG', '• Tiến độ: thực tế ' + R.endTt + '% / kế hoạch ' + R.endKh + '% → ' + (X.verdict === 'CHẬM' ? '🔴 CHẬM' + (X.maxLag ? ' ' + X.maxLag + ' ngày' : '') : X.verdict === 'chậm nhẹ' ? '🟡 chậm nhẹ ' + X.maxLag + ' ngày' : '🟢 đúng kế hoạch') + (R.startTt != null ? ' (tăng ' + (R.endTt - R.startTt) + '% trong kỳ)' : ''));
    L.push('• Thi công ' + R.logs.length + ' ngày · TB ' + (R.logs.length ? Math.round(R.cong / R.logs.length) : 0) + ' người/ngày' + (R.rain ? ' · ' + R.rain + ' ngày mưa/nghỉ' : ''));
    L.push('• Tài chính: chi trong kỳ ' + short(R.cSum) + ' · luỹ kế ' + short(R.cAll) + (R.B ? ' (' + Math.round(R.cAll / R.B * 100) + '% dự toán)' : '') + ' · đã thu ' + short(R.iAll) + (R.debt ? ' · còn nợ ' + short(R.debt) : ''));
    ad('s1');
    L.push('', '2. TIẾN ĐỘ HẠNG MỤC'); R.items.filter(p => !hid('s2', plab(p))).forEach(p => { const lg = lagDays(p, dE); L.push('• ' + plab(p) + ': ' + num(p.pct) + '% / KH ' + planPct(p, dE) + '%' + (num(p.pct) >= 100 ? ' – xong' : lg ? ' – 🔴 chậm ' + lg + ' ngày' : ' – đúng tiến độ') + (String(p.why || '').trim() ? ' (lý do: ' + String(p.why).trim() + ')' : '')); }); ad('s2');
    L.push('', '3. KẾT QUẢ CHÍNH (' + R.done.length + ' việc xong)');
    X.done.slice(0, 8).filter(t => !hid('s3', '✓ ' + t.t)).slice(0, 6).forEach(t => L.push('• ' + t.t)); if (R.done.length > 6) L.push('• … và ' + (R.done.length - 6) + ' việc khác'); ad('s3');
    L.push('', '4. VƯỚNG MẮC CẦN CHỈ ĐẠO');
    X.slow.filter(p => lagDays(p, dE) >= 3 && !hid('s4', S4.slow(p))).forEach(p => L.push('• Hạng mục ' + plab(p) + ' chậm ' + lagDays(p, dE) + ' ngày' + (String(p.why || '').trim() ? ' – lý do: ' + String(p.why).trim() : '')));
    X.needs.slice(0, 6).filter(x => !hid('s4', S4.need(x))).slice(0, 5).forEach(x => L.push('• ' + (x.st === 'cd' ? '[Chờ duyệt] ' : '') + (x.t || '').split('\n')[0] + ' – ' + (x.who || 'chưa giao') + (x.due ? ', hạn ' + fd(x.due) : '')));
    X.late.slice(0, 5).filter(t => !hid('s4', S4.late(t))).slice(0, 4).forEach(t => L.push('• ' + (t.pri === 'cao' ? '🔴 ' : '') + '[' + catName(catOf(t)) + '] ' + t.t + ' – trễ ' + days(t.due, today()) + ' ngày')); ad('s4');
    L.push('', '5. KẾ HOẠCH ' + (rp.kind === 'w' ? 'TUẦN' : 'THÁNG') + ' TỚI');
    R.nextT.slice().sort((a, b) => (ord3[a.pri] ?? 1) - (ord3[b.pri] ?? 1)).slice(0, 8).filter(t => !hid('s5', (t.pri === 'cao' ? '🔴 ' : '') + t.t)).slice(0, 6).forEach(t => L.push('• ' + t.t + ' – ' + fd(t.due))); ad('s5');
    if (((add || {}).s6 || []).some(t => t.trim())) { L.push('', '6. ĐỀ XUẤT CỦA CHỈ HUY TRƯỞNG'); ad('s6'); } else if ((note || '').trim()) L.push('', '6. ĐỀ XUẤT CỦA CHỈ HUY TRƯỞNG', note.trim());
    return L.join('\n').replace(/\n{3,}/g, '\n\n');
  }
  // V1.5.11: 📋 BÁO CÁO NGÀY (trước nằm ở tab Nhật ký) – thời tiết · A. Nhân lực (từ Quân số) · B–F gõ thẳng · xem & sửa & chép Zalo
  function dayView(W, S) {
    const d = today(); if (!rpDay || rpDay > d) rpDay = d;
    const h = sec(W, '📑 Báo cáo', 'Ngày: thời tiết, nhân lực, công việc, nghiệm thu, vướng mắc · Tuần / Tháng: tự tổng hợp'); h.classList.add('sb-noprint');
    const bar = $('div', 'sb-rpbar sb-noprint');
    bar.append(chips([['d', 'Ngày'], ['w', 'Tuần'], ['m', 'Tháng']], 'd', v => { rp = { kind: v, off: 0 }; rpEdit = false; render(true); }));
    const nav = $('div', 'sb-row'), pv = $('button', 'sb-btn ghost sm', '‹'), nx = $('button', 'sb-btn ghost sm', '›'), di = $('input', 'sb-in'); pv.type = nx.type = 'button'; di.type = 'date'; di.value = rpDay; di.max = d;
    pv.setAttribute('aria-label', 'Ngày trước'); nx.setAttribute('aria-label', 'Ngày sau'); di.setAttribute('aria-label', 'Chọn ngày báo cáo');
    pv.addEventListener('click', () => { rpDay = addD(rpDay, -1); render(true); }); nx.addEventListener('click', () => { if (rpDay < d) { rpDay = addD(rpDay, 1); render(true); } }); di.addEventListener('change', () => { if (di.value) { rpDay = di.value; render(true); } });
    nav.append(pv, di, nx); if (rpDay !== d) { const cur = $('button', 'sb-btn ghost sm', 'Hôm nay'); cur.type = 'button'; cur.addEventListener('click', () => { rpDay = d; render(true); }); nav.append(cur); }
    const act = $('div', 'sb-row'), cp = $('button', 'sb-btn sm', '📋 Xem & chép gửi Zalo'); cp.type = 'button'; act.append(cp);
    bar.append(nav, act); W.append(bar);
    const L0 = S.logs.find(l => l.d === rpDay), L = L0 || { id: uid(), d: rpDay, wx: WX[0], crew: {}, other: 0, work: '', qa: '', mat: '', issue: '', next: '', photos: [] };
    const ensure = () => { if (!S.logs.includes(L)) S.logs.push(L); };
    cp.addEventListener('click', () => { ensure(); save(); repDlg(S, L); });
    const doc = $('article', 'sb-rp sb-rpday'), hd = $('header', 'sb-rph');
    const nm = String(S.name || '').trim();
    hd.append($('div', 'sb-rpk', 'BÁO CÁO CÔNG VIỆC NGÀY ' + fdFull(rpDay)), $('h1', '', /^dự án/i.test(nm) ? nm : 'Dự án ' + nm));
    doc.append(hd);
    const wx = field(L, { k: 'wx', lb: 'Thời tiết', t: 'sel', o: WX.map(w => [w, w]) }); wx.addEventListener('change', ensure);
    const wr = $('div', 'sb-row sb-wx'); wr.append($('b', '', 'Thời tiết:'), wx); doc.append(wr);
    // A. Nhân lực từ bảng Quân số
    const Q = dayQS(S, rpDay, L0), qa = $('section', 'sb-rps'); qa.append($('h2', '', 'A. Nhân lực: ' + Q.T + ' người'));
    const ul = $('ul', 'sb-list'); qsZalo(S, rpDay, Q).split('\n').slice(1).forEach(t => ul.append($('li', /^–/.test(t) ? 'sub' : '', t))); qa.append(ul);
    if (!Q.done) qa.append($('div', 'sb-note', 'Chưa điểm danh ngày này – đang hiện số ngày gần nhất.'));
    if (!RO) { const go = $('button', 'sb-btn ghost sm sb-noprint', '👷 Sửa quân số ngày này'); go.type = 'button'; go.addEventListener('click', () => { rollD = rpDay; tab = 'crew'; render(true); }); qa.append(go); }
    doc.append(qa);
    [['work', 'B. Công việc thi công', 'Mỗi dòng 1 việc – vd: Thi công đắp cát mặt bằng cao độ 1.5m'], ['qa', 'C. Nghiệm thu', 'vd: Lấy mẫu 2 mỏ đất mới, đã gửi request'], ['issue', 'D. Vướng mắc', 'Không có thì để trống'],
      ['mat', 'F. Vật tư nhập về / sử dụng', 'Có thì ghi – báo cáo tự thêm mục']].forEach(([k, lb, ph]) => {
      const c = $('section', 'sb-rps'); c.append($('h2', '', lb)); const ta = field(L, { k, lb, t: 'area', rows: 2, ph, rr: false }); ta.addEventListener('input', ensure); c.append(ta); doc.append(c);
      if (k === 'issue') {   // E. Kế hoạch – chỉ xem, tự tổng hợp
        const e = $('section', 'sb-rps'); e.append($('h2', '', 'E. Kế hoạch ngày ' + fdFull(addD(rpDay, 1))));
        const pl = planNext(S, rpDay).concat(String(L.next || '').split('\n').map(x => x.trim()).filter(Boolean)), u = $('ul', 'sb-list');
        pl.forEach(x => u.append($('li', '', x))); if (!pl.length) u.append($('li', 'sb-none', 'Chưa có việc nào cho ngày mai'));
        e.append(u, $('div', 'sb-note sb-noprint', 'Tự tổng hợp từ 📅 Tiến độ, ✅ Công việc, ⚠️ Vấn đề – sửa ở các mục đó.')); doc.append(e); }
    });
    if (L.rep) doc.append($('div', 'sb-note sb-noprint', '✏️ Ngày này có bản báo cáo đã sửa tay – bấm “📋 Xem & chép gửi Zalo” để xem.'));
    W.append(doc);
  }
  function report(W, S) {
    if (rp.kind === 'd') return dayView(W, S);
    const P = period(rp.kind, rp.off), R = repData(S, P);
    S.reports = S.reports && typeof S.reports === 'object' && !Array.isArray(S.reports) ? S.reports : {};
    const N = S.reports[P.key] = S.reports[P.key] || { note: '' };
    const h = sec(W, '📑 Báo cáo ' + (rp.kind === 'w' ? 'tuần' : 'tháng'), 'Tự tổng hợp từ nhật ký, công việc, vật tư, chi phí, vấn đề');
    h.classList.add('sb-noprint');
    const bar = $('div', 'sb-rpbar sb-noprint');
    bar.append(chips([['d', 'Ngày'], ['w', 'Tuần'], ['m', 'Tháng']], rp.kind, v => { rp = { kind: v, off: 0 }; rpEdit = false; render(true); }));
    const nav = $('div', 'sb-row'), pv = $('button', 'sb-btn ghost sm', '‹'), nx = $('button', 'sb-btn ghost sm', '›'), cur = $('button', 'sb-btn ghost sm', rp.kind === 'w' ? 'Tuần này' : 'Tháng này');
    [pv, nx, cur].forEach(b => b.type = 'button'); pv.setAttribute('aria-label', 'Kỳ trước'); nx.setAttribute('aria-label', 'Kỳ sau');
    pv.addEventListener('click', () => { rp.off--; rpEdit = false; render(true); }); nx.addEventListener('click', () => { rp.off++; rpEdit = false; render(true); }); cur.addEventListener('click', () => { rp.off = 0; rpEdit = false; render(true); });
    nav.append(pv, $('b', 'sb-rplabel', P.label), nx); if (rp.off) nav.append(cur);
    const act = $('div', 'sb-row'), cp = $('button', 'sb-btn sm', '📋 Chép gửi Zalo'), pr = $('button', 'sb-btn ghost sm', '🖨 In / Lưu PDF');
    cp.type = pr.type = 'button';
    cp.addEventListener('click', async () => { const t = repText(S, R, N.note, N.add, N.hide); try { await navigator.clipboard.writeText(t); toast('📋 Đã chép báo cáo – dán vào Zalo'); } catch { dialog('📋 Báo cáo', b => { const ta = $('textarea', 'sb-in sb-ta'); ta.rows = 18; ta.value = t; b.append(ta); }, () => {}, 'Đóng'); } });
    pr.addEventListener('click', () => { document.body.classList.add('sb-printing'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('sb-printing'), 500); }, 50); });
    act.append(cp, pr);
    // V1.3.7: CHỈNH TAY = giữ nguyên các mục & số liệu tự động, chỉ THÊM Ý dưới từng mục (xuống dòng = gạch đầu dòng mới, Tab = ý con)
    const hasAdd = x => x && ((x.add && Object.values(x.add).some(v => Array.isArray(v) && v.some(t => String(t).trim()))) || (x.hide && Object.values(x.hide).some(v => Array.isArray(v) && v.length)));
    if (N.note && !(N.add && N.add.s6)) { N.add = N.add || {}; N.add.s6 = String(N.note).split('\n'); }
    if (!RO) {
      if (!rpEdit) { const ed = $('button', 'sb-btn ghost sm', hasAdd(N) ? '✏️ Sửa ý bổ sung' : '✏️ Chỉnh tay'); ed.type = 'button'; ed.title = 'Thêm ý dưới từng mục báo cáo'; ed.addEventListener('click', () => { rpEdit = true; render(true); setTimeout(() => { const u = root.querySelector('.sb-rpadd'); if (u) { u.focus(); } }, 0); }); act.append(ed); }
      else {
        const sv = $('button', 'sb-btn sm', '💾 Lưu báo cáo'), no = $('button', 'sb-btn ghost sm', 'Huỷ'); sv.type = no.type = 'button';
        sv.addEventListener('click', () => {
          const add = {}; root.querySelectorAll('.sb-rpadd').forEach(u => { const lines = [...u.querySelectorAll('li')].map(li => (li.classList.contains('sub') ? '  ' : '') + li.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.trim()); if (lines.length) add[u.dataset.k] = lines; });
          const hide = {}; root.querySelectorAll('.sb-rps').forEach(c => { const ks = [...c.querySelectorAll('ul.sb-list > li.sb-hid')].map(li => li.dataset.key).filter(Boolean); if (ks.length) hide[c.dataset.k] = ks; });
          N.add = add; N.hide = hide; N.note = (add.s6 || []).map(t => t.trim()).join('\n'); N.savedAt = Date.now(); delete N.html; rpEdit = false; save(); render(true); toast('💾 Đã lưu báo cáo ' + P.label);
        });
        no.addEventListener('click', () => { rpEdit = false; render(true); });
        act.append(sv, no);
      }
      const saved = Object.entries(S.reports || {}).filter(([, v]) => hasAdd(v)).sort((a, b) => a[0] < b[0] ? 1 : -1);
      if (saved.length) { const sel = $('select', 'sb-in sb-rpsaved'); sel.setAttribute('aria-label', 'Báo cáo đã lưu'); const o0 = $('option', '', '📚 Đã lưu (' + saved.length + ')'); o0.value = ''; sel.append(o0);
        saved.forEach(([key]) => { const o = $('option', '', key[0] === 'W' ? 'Tuần ' + fd(key.slice(1)) + '/' + key.slice(1, 5) : 'Tháng ' + (+key.slice(6, 8)) + '/' + key.slice(1, 5)); o.value = key; sel.append(o); });
        sel.addEventListener('change', () => { const key = sel.value; if (!key) return; const kind = key[0] === 'W' ? 'w' : 'm'; for (let off = -260; off <= 52; off++) { if (period(kind, off).key === key) { rp = { kind, off }; rpEdit = false; render(true); return; } } });
        act.append(sel); }
    }
    bar.append(nav, act); W.append(bar);
    if (hasAdd(N) && !rpEdit && N.savedAt) W.append($('div', 'sb-note sb-noprint', '✏️ Có ý bổ sung – lưu lúc ' + new Date(N.savedAt).toLocaleString('vi-VN') + '. Số liệu tự động vẫn cập nhật theo dữ liệu mới.'));
    if (rpEdit) W.append($('div', 'sb-note sb-noprint sb-editnote', '✏️ Đang chỉnh tay: gõ ý vào ô vàng dưới mỗi mục · Enter = xuống dòng thêm ý · Tab = ý con (lùi vào) · Shift+Tab = bỏ lùi · xong bấm 💾 Lưu báo cáo.'));
    if (P.a > today()) { W.append($('div', 'sb-emptybig', 'Kỳ này chưa tới.')); return; }

    const doc = $('article', 'sb-rp');
    const hd = $('header', 'sb-rph');
    hd.append($('div', 'sb-rpk', 'BÁO CÁO ' + (rp.kind === 'w' ? 'TUẦN' : 'THÁNG')), $('h1', '', S.name), $('div', 'sb-rpm', [S.code, P.label + ' (' + fdFull(P.a) + ' – ' + fdFull(P.b) + ')', S.owner ? 'CĐT: ' + S.owner : '', S.addr].filter(Boolean).join(' · ')));
    doc.append(hd);
    const k = $('div', 'sb-kpis');
    { const X0 = repLead(S, R); k.append(kpi('Tiến độ thực tế', R.endTt + '%', 'kế hoạch ' + R.endKh + '%', R.endTt + 5 < R.endKh || X0.maxLag >= 3 ? 'bad' : 'good'), kpi('Chậm nhất', X0.maxLag ? X0.maxLag + ' ngày' : '0', X0.slow.length ? X0.slow.length + ' hạng mục chậm' : 'không chậm', X0.maxLag >= 3 ? 'bad' : X0.maxLag ? 'warn' : 'good'),
      kpi('Việc hoàn thành', String(R.done.length), R.late.length ? R.late.length + ' quá hạn' : 'không quá hạn', R.late.length ? 'warn' : ''), kpi('Nhân lực TB', (R.logs.length ? Math.round(R.cong / R.logs.length) : 0) + ' người', R.logs.length + ' ngày thi công'), kpi('Chi trong kỳ', short(R.cSum), 'luỹ kế ' + short(R.cAll))); }
    doc.append(k);
    let si = 0; const S2 = (t, cls) => { const c = $('section', 'sb-rps ' + (cls || '')); c.dataset.k = 's' + (++si); c.append($('h2', '', t)); doc.append(c); return c; };
    const ul = (arr, f, empty) => { const u = $('ul', 'sb-list'); arr.forEach(x => { const li = $('li'); f(x, li); u.append(li); }); if (!arr.length) u.append($('li', 'sb-none', empty || 'Không có')); return u; };
    const X = repLead(S, R), dE = P.b < today() ? P.b : today();
    // 1 tình hình chung
    { const c = S2('1. Tình hình chung'); const p = $('p', 'sb-rpsum');
      p.append('Tiến độ thực tế ', $('b', '', R.endTt + '%'), ' / kế hoạch ' + R.endKh + '% → ', $('b', X.verdict === 'CHẬM' ? 'bad' : X.verdict === 'chậm nhẹ' ? 'warnt' : 'goodt', X.verdict === 'đúng kế hoạch' ? 'đúng kế hoạch' : X.verdict + ' ' + X.maxLag + ' ngày'),
        (R.startTt != null ? ' (tăng ' + (R.endTt - R.startTt) + '% trong kỳ)' : '') + '. Thi công ' + R.logs.length + ' ngày, bình quân ' + (R.logs.length ? Math.round(R.cong / R.logs.length) : 0) + ' người/ngày' + (R.rain ? ', ' + R.rain + ' ngày mưa/nghỉ' : '') + '. Chi trong kỳ ' + short(R.cSum) + ', luỹ kế ' + short(R.cAll) + (R.B ? ' (' + Math.round(R.cAll / R.B * 100) + '% dự toán)' : '') + '.');
      c.append(p); }
    // 2 tiến độ hạng mục
    { const c = S2('2. Tiến độ hạng mục'); c.append(ul(R.items, (p, li) => { const lg = lagDays(p, dE); li.append($('span', '', plab(p)), ...(String(p.why || '').trim() ? [$('em', 'sb-why', 'Lý do: ' + String(p.why).trim())] : []), $('small', '', num(p.pct) + '% / KH ' + planPct(p, dE) + '%'), $('b', lg >= 3 ? 'bad' : lg ? 'warnt' : 'goodt', num(p.pct) >= 100 ? 'Xong' : lg ? 'Chậm ' + lg + ' ngày' : 'Đúng tiến độ')); }, 'Không có hạng mục nào trong kỳ')); }
    // 3 kết quả chính
    { const c = S2('3. Kết quả chính (' + R.done.length + ' việc hoàn thành)'); c.append(ul(X.done.slice(0, 8), (t, li) => li.append($('span', '', '✓ ' + t.t), catTag(t.cat)), 'Chưa ghi nhận việc hoàn thành')); if (R.done.length > 8) c.append($('p', 'sb-p', '… và ' + (R.done.length - 8) + ' việc khác')); }
    // 4 vướng mắc cần chỉ đạo
    { const c = S2('4. Vướng mắc cần lãnh đạo chỉ đạo', 'sb-rpwarn');
      const rows = [...X.slow.filter(p => lagDays(p, dE) >= 3).map(p => ['📅 Hạng mục ' + plab(p) + ' chậm ' + lagDays(p, dE) + ' ngày', String(p.why || '').trim() ? 'Lý do: ' + String(p.why).trim() : '']), ...X.needs.slice(0, 6).map(x => [(x.st === 'cd' ? '🖊 Chờ duyệt: ' : '⚠️ ') + (x.t || '').split('\n')[0], (x.who || 'chưa giao') + (x.due ? ' · hạn ' + fd(x.due) : '')]), ...X.late.slice(0, 5).map(t => [(t.pri === 'cao' ? '🔴 ' : '❗ ') + t.t, catName(catOf(t)) + ' · trễ ' + days(t.due, today()) + ' ngày'])];
      c.append(ul(rows, ([a, b], li) => li.append($('span', '', a), $('small', '', b)), 'Không có vướng mắc')); }
    // 5 kế hoạch kỳ tới
    { const c = S2('5. Kế hoạch ' + (rp.kind === 'w' ? 'tuần' : 'tháng') + ' tới (' + fd(P.next.a) + ' – ' + fd(P.next.b) + ')');
      c.append(ul(R.nextT.slice().sort((a, b) => (ord3[a.pri] ?? 1) - (ord3[b.pri] ?? 1)).slice(0, 8), (t, li) => li.append($('span', '', (t.pri === 'cao' ? '🔴 ' : '') + t.t), $('small', '', [t.who, fd(t.due)].filter(Boolean).join(' · '))), 'Chưa có việc nào hẹn trong kỳ tới'));
      if (R.matNext.length) c.append($('p', 'sb-p', '🧱 Vật tư cần chuẩn bị: ' + R.matNext.slice(0, 5).map(m => m.name + ' ' + (m.qty || '') + ' ' + (m.unit || '') + ' (' + fd(m.need) + ')').join(' · '))); }
    // ghi chú CHT
    S2('6. Đề xuất của Chỉ huy trưởng');
    const ft = $('footer', 'sb-rpf'); ft.append($('span', '', 'Lập ngày ' + fdFull(today())), $('span', '', 'Người lập'), $('span', '', 'Chỉ huy trưởng')); doc.append(ft);
    doc.querySelectorAll('.sb-rps').forEach(c => {
      const k = c.dataset.k, lines = (N.add && N.add[k]) || [];
      // V1.5.3: dòng tự điền xoá được – Chỉnh tay hiện ✕ (bấm lại ↺ để hiện), Lưu báo cáo thì dòng đã ✕ không còn trong báo cáo / In / Zalo của kỳ này
      const hidK = (N.hide && N.hide[k]) || [];
      c.querySelectorAll('ul.sb-list > li:not(.sb-none)').forEach(li => {
        const key = ((li.querySelector('span') || li).textContent || '').trim(); li.dataset.key = key;
        const off = hidK.includes(key);
        if (!rpEdit) { if (off) li.remove(); return; }
        li.classList.toggle('sb-hid', off);
        const x = $('button', 'sb-rpx', off ? '↺' : '✕'); x.type = 'button'; x.title = off ? 'Hiện lại dòng này' : 'Xoá dòng này khỏi báo cáo kỳ này';
        x.setAttribute('aria-label', (off ? 'Hiện lại: ' : 'Xoá khỏi báo cáo: ') + key);
        x.addEventListener('click', () => { const h = li.classList.toggle('sb-hid'); x.textContent = h ? '↺' : '✕'; x.title = h ? 'Hiện lại dòng này' : 'Xoá dòng này khỏi báo cáo kỳ này'; });
        li.append(x);
      });
      if (!rpEdit) { const u = c.querySelector('ul.sb-list'); if (u && !u.querySelector('li')) u.append($('li', 'sb-none', 'Không có')); }
      if (rpEdit) {
        const u = $('ul', 'sb-rpadd'); u.dataset.k = k; u.contentEditable = 'true'; u.spellcheck = false; u.setAttribute('aria-label', 'Thêm ý cho mục ' + c.querySelector('h2').textContent);
        (lines.length ? lines : ['']).forEach(t => { const li = $('li', /^\s{2}/.test(t) ? 'sub' : '', t.trim()); if (!t.trim()) li.append(document.createElement('br')); u.append(li); });
        u.addEventListener('keydown', e => {
          if (e.key !== 'Tab') return; e.preventDefault();
          const sel = getSelection(), n = sel.anchorNode, li = n && (n.nodeType === 1 ? n : n.parentElement).closest('li'); if (li && u.contains(li)) li.classList.toggle('sub', !e.shiftKey);
        });
        u.addEventListener('paste', e => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t); });
        u.addEventListener('input', () => { if (!u.querySelector('li')) { const li = $('li'); li.append(document.createElement('br')); u.append(li); } });
        c.append(u);
      } else if (lines.some(t => t.trim())) {
        const u = $('ul', 'sb-rpaddv'); lines.filter(t => t.trim()).forEach(t => u.append($('li', /^\s{2}/.test(t) ? 'sub' : '', t.trim()))); c.append(u);
        c.querySelectorAll('.sb-none').forEach(x => x.remove());
      }
    });
    W.append(doc);
  }

  // ---------- vẽ ----------
  const VIEWS = { dash, plan, task, log: report, crew, mat, cost, issue, rep: report, file };   // V1.5.11: bỏ tab Nhật ký – báo cáo ngày ở tab Báo cáo
  let rendering = false;
  function render(force) {
    if (rendering) { setTimeout(() => render(force), 0); return; }
    if (!ready || root.hidden || (!force && editing())) return;
    rendering = true; dirty = false;
    try {
      const y = window.scrollY, W = $('div', 'sb-wrap'), S = site(); head(W, S);
      if (!S) welcome(W);
      else {
        fix(S); snapHist(S);
        const nav = $('nav', 'sb-tabs'); nav.setAttribute('aria-label', 'Mục công trình');
        const badge = { task: S.tasks.filter(taskLate).length, issue: S.issues.filter(x => x.st !== 'dong').length, mat: S.mats.filter(m => m.st !== 've' && m.need && m.need <= addD(today(), 3)).length };
        TABS.filter(([k]) => !RO || k !== 'file').forEach(([k, l]) => { const b = $('button', 'sb-tab' + (k === tab ? ' on' : ''), l); b.type = 'button'; if (k === tab) b.setAttribute('aria-current', 'page'); if (badge[k]) b.append($('i', '', String(badge[k]))); b.addEventListener('click', () => { tab = k; render(true); window.scrollTo(0, 0); }); nav.append(b); });
        W.append(nav); const body = $('div', 'sb-body'); (VIEWS[tab] || dash)(body, S); W.append(body);
      }
      const keep = [...root.querySelectorAll('.sb-toast,.sb-dlg')];
      if (S) W.append(peopleDl(S));
      root.replaceChildren(W, ...keep); window.scrollTo(0, y);
      root.querySelectorAll('textarea.sb-grow').forEach(grow);
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
    if (js === lastSaved || recent.includes(js) || js === JSON.stringify(data)) return;
    if (editing()) { pend = v; return; }
    data = v; data.sites.forEach(fix); lastSaved = js; render();
  });
  root.addEventListener('focusout', () => setTimeout(() => { if (editing()) return; if (pend) { data = pend; pend = null; data.sites.forEach(fix); lastSaved = JSON.stringify(data); dirty = false; render(true); } else if (dirty) { dirty = false; render(true); } }, 0));
  // nhắc nhật ký: sau 17h chưa ghi nhật ký hôm nay → chấm đỏ trên nút 🏗️ Công trình
  // V1.5.2: bỏ chấm đỏ nhắc ghi nhật ký (anh không dùng nhật ký)
  setTimeout(() => { const b = document.querySelector('.pgsw-o[data-pg="2"]'); if (b) b.classList.remove('sb-dot'); }, 800);
})();
