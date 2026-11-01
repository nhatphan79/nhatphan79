// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🤖 V1.2.6: BOT ZALO cho trang 🏗️ Công trình (SITE BRAIN) – chạy trong nền HaoHao (background.js importScripts).
//   • Mỗi ngày đúng giờ (mặc định 07:00) gửi TỔNG QUAN từng công trình vào Zalo (chat riêng hoặc nhóm có bot).
//     Máy tắt / Chrome đóng lúc đó → gửi bù ngay khi mở Chrome lại trong ngày.
//   • Nhắn bot: "tq" (tổng quan) · "hn" (việc hôm nay) · "vd" (vấn đề) · "id" · "giup" → bot trả lời (khi Chrome đang mở).
//   API: Zalo Bot Platform (bot.zaloplatforms.com) – https://bot-api.zaloplatforms.com/bot<TOKEN>/<method>, POST JSON.
//   Cấu hình lưu chrome.storage.local['siteBot'] = { token, chatId, chatName, time, on, last, offset }.
(() => {
  const API = 'https://bot-api.zaloplatforms.com/bot';
  const ymd = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
  const today = () => ymd(new Date());
  const addD = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const days = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
  const fd = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '';
  const fdFull = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
  const short = n => { const a = Math.abs(n), s = n < 0 ? '−' : ''; return a >= 1e9 ? s + (a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ' : a >= 1e6 ? s + (a / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr' : s + Math.round(a).toLocaleString('vi-VN') + 'đ'; };
  const dur = p => p.s && p.e ? Math.max(1, days(p.s, p.e) + 1) : 1;
  const planPct = (p, d) => !p.s || !p.e ? 0 : d < p.s ? 0 : d >= p.e ? 100 : Math.round((days(p.s, d) + 1) / dur(p) * 100);
  const L = (S, k) => Array.isArray(S[k]) ? S[k] : [];
  function progress(S, d) {
    const P = L(S, 'plan').filter(p => p.s && p.e), W = P.reduce((a, p) => a + dur(p), 0);
    if (!W) return { kh: 0, tt: 0 };
    return { kh: Math.round(P.reduce((a, p) => a + planPct(p, d) * dur(p), 0) / W), tt: Math.round(P.reduce((a, p) => a + Math.min(100, num(p.pct)) * dur(p), 0) / W) };
  }
  const MST = { de: 'đề xuất', duyet: 'đã duyệt', dat: 'đã đặt', ve: 'đã về' };
  const ITYPE = { ht: 'Hiện trường', kt: 'Kỹ thuật', td: 'Tiến độ', cp: 'Chi phí', pd: 'Xin duyệt' };
  const IST = { mo: 'mới', xl: 'đang xử lý', cd: 'chờ duyệt', dong: 'xong' };
  const cut = (t, n) => (t = String(t || '').replace(/\s+/g, ' ').trim()).length > n ? t.slice(0, n - 1) + '…' : t;
  const taskLate = (t, d) => t.st !== 'done' && t.due && t.due < d;
  const CATS0 = { qs: 'QS', qaqc: 'QA/QC', shop: 'Shopdrawing', ht: 'Hiện trường', cdt: 'Chủ đầu tư' };
  let CATS = CATS0;   // V1.3.3: bộ phận anh tự thêm (siteBrain.cats)
  const catOf = t => CATS[t.cat] || CATS.ht || Object.values(CATS)[0] || 'Khác';
  const lagDays = (p, d) => { if (!p.s || !p.e || num(p.pct) >= 100 || d < p.s) return 0; return Math.max(0, days(p.s, d) + 1 - Math.round(Math.min(100, num(p.pct)) / 100 * dur(p))); };
  const todayTasks = (S, d) => L(S, 'tasks').filter(t => t.st !== 'done' && (taskLate(t, d) || t.due === d || t.st === 'doing')).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
  const head = S => '🏗️ ' + (S.code ? S.code + ' · ' : '') + (S.name || 'Công trình');
  const taskLine = (t, d) => '• ' + (taskLate(t, d) ? '❗' : '') + (t.pri === 'cao' ? '🔴' : '') + '[' + catOf(t) + '] ' + cut(t.t, 70) + (t.who ? ' – ' + t.who : '') + (t.due ? (taskLate(t, d) ? ' (trễ ' + days(t.due, d) + ' ngày)' : t.due === d ? '' : ' (' + fd(t.due) + ')') : '');
  const issueLine = (x, d) => '• ' + (x.due && x.due < d ? '❗' : '') + '[' + (ITYPE[x.type] || 'Vấn đề') + '] ' + cut(x.t, 70) + ' – ' + (x.who || 'chưa giao') + (x.due ? ', hạn ' + fd(x.due) : '') + (x.st === 'cd' ? ' · chờ duyệt' : '');

  // 📊 bản tổng quan 1 công trình (≤ 2000 ký tự – giới hạn của Zalo)
  function overview(S, d = today()) {
    const pr = progress(S, d), late = pr.tt - pr.kh, plan = L(S, 'plan');
    const slow = plan.filter(p => lagDays(p, d) >= 1).sort((a, b) => lagDays(b, d) - lagDays(a, d));
    const o = ['📊 TỔNG QUAN ' + fdFull(d), head(S)];
    const ds = S.start ? days(S.start, d) : null, dl = S.end ? days(d, S.end) : null;
    o.push('📍 Giai đoạn: ' + (S.phase || '—') + (ds != null && ds >= 0 ? ' · ngày thứ ' + (ds + 1) : '') + (dl != null ? (dl >= 0 ? ' · còn ' + dl + ' ngày' : ' · QUÁ HẠN ' + (-dl) + ' ngày') : ''));
    o.push('📈 Tiến độ: thực tế ' + pr.tt + '% / kế hoạch ' + pr.kh + '% → ' + (late < -5 ? '🔴 CHẬM ' + (-late) + '%' : late > 5 ? '🟢 vượt ' + late + '%' : slow.length ? '🟡 tổng thể đúng kế hoạch, ' + slow.length + ' hạng mục chậm' : '🟢 đúng kế hoạch'));
    slow.slice(0, 4).forEach(p => o.push('   ' + (lagDays(p, d) >= 3 ? '🔴' : '🟡') + ' ' + cut(p.t || p.g, 50) + ': ' + (p.e && d > p.e ? 'QUÁ HẠN ' + days(p.e, d) + ' ngày' : 'chậm ' + lagDays(p, d) + ' ngày') + ' (' + num(p.pct) + '% / KH ' + planPct(p, d) + '%)'));
    const ms = plan.filter(p => p.mile && num(p.pct) < 100 && p.e).sort((a, b) => a.e < b.e ? -1 : 1)[0];
    if (ms) o.push('🏁 Mốc nghiệm thu: ' + cut(ms.t, 50) + ' – ' + fd(ms.e) + (days(d, ms.e) >= 0 ? ' (còn ' + days(d, ms.e) + ' ngày)' : ' (QUÁ ' + days(ms.e, d) + ' ngày)'));
    const T = todayTasks(S, d), nl = L(S, 'tasks').filter(t => taskLate(t, d)).length;
    o.push('', '✅ HÔM NAY: ' + T.length + ' việc' + (nl ? ' · ' + nl + ' quá hạn' : ''));
    T.slice(0, 8).forEach(t => o.push(taskLine(t, d))); if (T.length > 8) o.push('  … và ' + (T.length - 8) + ' việc nữa');
    if (!T.length) o.push('• Không có việc tới hạn 👍');
    const logs = L(S, 'logs').slice().sort((a, b) => a.d < b.d ? 1 : -1), lg = logs.find(x => x.d <= d);
    if (lg) { const teams = L(S, 'teams'), parts = teams.map(t => num((lg.crew || {})[t.id]) ? t.name + ' ' + num(lg.crew[t.id]) : '').filter(Boolean);
      const n = Object.values(lg.crew || {}).reduce((a, x) => a + num(x), 0) + num(lg.other);
      o.push('', '👷 Nhân lực ' + (lg.d === d ? 'hôm nay' : fd(lg.d)) + ': ' + n + ' người' + (parts.length ? ' (' + parts.join(', ') + ')' : ''));
      if (lg.next && lg.d === addD(d, -1)) o.push('📅 Kế hoạch hôm nay (ghi hôm qua): ' + cut(lg.next, 160)); }
    const M = L(S, 'mats').filter(m => m.st !== 've' && (!m.need || m.need <= addD(d, 7))).sort((a, b) => (a.need || '9') < (b.need || '9') ? -1 : 1);
    if (M.length) { o.push('', '🧱 VẬT TƯ 7 NGÀY TỚI:'); M.slice(0, 6).forEach(m => o.push('• ' + (m.need && m.need < d ? '❗' : '') + cut(m.name, 40) + ' ' + (m.qty || '') + ' ' + (m.unit || '') + (m.need ? ' – cần ' + fd(m.need) : '') + ' (' + (MST[m.st] || '') + ')')); }
    const B = L(S, 'budget').reduce((a, b) => a + num(b.est), 0) || num(S.value), C = L(S, 'costs').reduce((a, x) => a + num(x.amt), 0),
      I = L(S, 'incomes').reduce((a, x) => a + num(x.amt), 0), debt = L(S, 'costs').filter(x => !x.paid).reduce((a, x) => a + num(x.amt), 0);
    if (B || C || I) o.push('', '💰 Đã chi ' + short(C) + (B ? '/' + short(B) + ' (' + Math.round(C / B * 100) + '%)' : '') + ' · Đã thu ' + short(I) + ' · Dòng tiền ' + short(I - C) + (debt ? ' · Còn nợ ' + short(debt) : ''));
    const X = L(S, 'issues').filter(x => x.st !== 'dong').sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
    o.push('', '⚠️ VẤN ĐỀ: ' + X.length + ' đang mở' + (X.filter(x => x.st === 'cd').length ? ' · ' + X.filter(x => x.st === 'cd').length + ' chờ duyệt' : ''));
    X.slice(0, 5).forEach(x => o.push(issueLine(x, d))); if (!X.length) o.push('• Không có vấn đề tồn đọng 👍');
    if (!L(S, 'logs').some(x => x.d === addD(d, -1)) && L(S, 'logs').length) o.push('', '📓 Nhắc: hôm qua chưa ghi nhật ký.');
    let t = o.join('\n'); if (t.length > 1990) t = t.slice(0, 1985) + '\n…'; return t;
  }
  const todayText = (S, d = today()) => { const T = todayTasks(S, d); return ['✅ VIỆC HÔM NAY ' + fdFull(d), head(S), ...(T.length ? T.slice(0, 20).map(t => taskLine(t, d)) : ['• Không có việc tới hạn 👍'])].join('\n').slice(0, 1990); };
  const issueText = (S, d = today()) => { const X = L(S, 'issues').filter(x => x.st !== 'dong'); return ['⚠️ VẤN ĐỀ ĐANG MỞ', head(S), ...(X.length ? X.slice(0, 15).map(x => issueLine(x, d)) : ['• Không có vấn đề tồn đọng 👍'])].join('\n').slice(0, 1990); };
  // 🚨 V1.3.2: cảnh báo trễ hạn / chậm tiến độ – gửi 1 lần/ngày đúng giờ cảnh báo (mặc định 16:00), chỉ gửi khi có việc
  function alertText(S, d = today(), afterHour = true) {
    const T = L(S, 'tasks'), od = T.filter(t => taskLate(t, d)), dueToday = afterHour ? T.filter(t => t.st !== 'done' && t.due === d) : [];
    const slow = L(S, 'plan').filter(p => lagDays(p, d) >= 1).sort((a, b) => lagDays(b, d) - lagDays(a, d));
    const oi = L(S, 'issues').filter(x => x.st !== 'dong' && x.due && x.due < d);
    if (!od.length && !dueToday.length && !slow.length && !oi.length) return '';
    const o = ['🚨 CẢNH BÁO ' + fdFull(d), head(S)];
    if (slow.length) { o.push('', '📅 CHẬM TIẾN ĐỘ (' + slow.length + '):'); slow.slice(0, 6).forEach(p => o.push('• ' + (lagDays(p, d) >= 3 ? '🔴 ' : '🟡 ') + cut(p.t || p.g, 50) + ': ' + (p.e && d > p.e ? 'quá hạn ' + days(p.e, d) + ' ngày' : 'chậm ' + lagDays(p, d) + ' ngày') + ' (' + num(p.pct) + '% / KH ' + planPct(p, d) + '%)')); }
    if (od.length) {
      o.push('', '❗ VIỆC QUÁ HẠN (' + od.length + '):');
      const ord = { cao: 0, tb: 1, thap: 2 };
      Object.values(CATS).forEach(cn => { const G = od.filter(t => catOf(t) === cn).sort((a, b) => (ord[a.pri] ?? 1) - (ord[b.pri] ?? 1) || (a.due < b.due ? -1 : 1)); if (!G.length) return; o.push('▸ ' + cn + ':'); G.slice(0, 6).forEach(t => o.push('   ' + (t.pri === 'cao' ? '🔴 ' : '• ') + cut(t.t, 60) + ' – ' + (t.who || 'chưa giao') + ' – trễ ' + days(t.due, d) + ' ngày')); });
    }
    if (dueToday.length) { o.push('', '⏰ HẠN HÔM NAY CHƯA XONG (' + dueToday.length + '):'); dueToday.slice(0, 8).forEach(t => o.push('• ' + (t.pri === 'cao' ? '🔴' : '') + '[' + catOf(t) + '] ' + cut(t.t, 60) + ' – ' + (t.who || 'chưa giao'))); }
    if (oi.length) { o.push('', '⚠️ VẤN ĐỀ QUÁ HẠN (' + oi.length + '):'); oi.slice(0, 5).forEach(x => o.push('• ' + cut(x.t, 60) + ' – ' + (x.who || 'chưa giao') + ' – trễ ' + days(x.due, d) + ' ngày')); }
    let t = o.join('\n'); if (t.length > 1990) t = t.slice(0, 1985) + '\n…'; return t;
  }
  const HELP = '🤖 Bot Công trình HaoHao\n📊 XEM: tq tổng quan · hn việc hôm nay · vd vấn đề · cb cảnh báo · bct báo cáo tuần · bcth báo cáo tháng\n✏️ SỬA NHANH:\n• ds – danh sách việc (có số)\n• xong 2 – việc số 2 xong (xong 2 5 – nhiều việc)\n• them Đặt bê tông M250 @Nhật #qs ! han 5/11\n   (@ người làm · #bộ phận · ! ưu tiên cao · han ngày)\n• han 2 7/11 – đổi hạn · giao 2 @Minh – giao người\n• td – danh sách hạng mục · td 3 70 – hạng mục 3 đạt 70%\n• nk Đổ bê tông sàn tầng 2 – ghi vào nhật ký hôm nay\n• vande Thiếu thép D16 @Nhật – thêm vấn đề\n• ct – danh sách công trình · ct 2 – chọn công trình\n• id – mã cuộc trò chuyện\nMỗi ngày bot tự gửi tổng quan đúng giờ đã hẹn (khi máy và Chrome đang mở; lỡ giờ thì gửi bù lúc mở Chrome).';

  // ---------- gọi API ----------
  async function call(token, method, body, ms = 15000) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(API + token + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: ac.signal });
      const j = await r.json().catch(() => ({ ok: false, description: 'HTTP ' + r.status }));
      return j;
    } catch (e) { return { ok: false, description: e.name === 'AbortError' ? 'timeout' : String(e.message || e) }; }
    finally { clearTimeout(tm); }
  }
  const getCfg = async () => (await chrome.storage.local.get('siteBot')).siteBot || {};
  const setCfg = async p => { const c = await getCfg(); Object.assign(c, p); await chrome.storage.local.set({ siteBot: c }); return c; };
  const sites = async () => { const { siteBrain: B } = await chrome.storage.local.get('siteBrain'); CATS = B && Array.isArray(B.cats) && B.cats.length ? Object.fromEntries(B.cats.map(c => [c.id, c.name])) : CATS0; return (B && Array.isArray(B.sites) ? B.sites : []).filter(s => !s.botOff); };
  async function send(cfg, text) { const j = await call(cfg.token, 'sendMessage', { chat_id: String(cfg.chatId), text }); if (!j.ok) throw new Error(j.description || ('Lỗi ' + (j.error_code || ''))); return j; }
  async function sendDaily(cfg, force) {
    const S = await sites();
    if (!S.length) { if (force) await send(cfg, '🏗️ Chưa có công trình nào trong HaoHao.'); return 0; }
    for (const s of S) await send(cfg, overview(s));
    return S.length;
  }

  // ---------- nhịp 1 phút: gửi theo giờ + đọc tin nhắn lệnh ----------
  let busy = false;
  async function tick() {
    if (busy) return; busy = true;
    try {
      const cfg = await getCfg();
      if (!cfg.token || !cfg.chatId) return;
      const d = today(), [h, m] = String(cfg.time || '07:00').split(':').map(Number), now = new Date();
      if (cfg.on && cfg.last !== d && now.getHours() * 60 + now.getMinutes() >= h * 60 + (m || 0)) {
        try { await sendDaily(cfg); await setCfg({ last: d, err: '' }); } catch (e) { await setCfg({ err: String(e.message || e), errAt: Date.now() }); }
      }
      const [ah, am] = String(cfg.alertTime || '16:00').split(':').map(Number);
      if (cfg.alertOn !== false && cfg.lastAlert !== d && now.getHours() * 60 + now.getMinutes() >= ah * 60 + (am || 0)) {
        try { const S = await sites(); let n = 0; for (const s of S) { const t = alertText(s, d); if (t) { await send(cfg, t); n++; } } await setCfg({ lastAlert: d, alertN: n }); } catch (e) { await setCfg({ err: String(e.message || e), errAt: Date.now() }); }
      }
      if (cfg.cmd !== false) await poll(cfg, Date.now() + 50000);   // V1.3.4: nghe liên tục ~50 giây mỗi phút → trả lời gần như tức thì
    } finally { busy = false; }
  }
  async function poll(cfg, end) {
    while (Date.now() < end) {
      const left = Math.max(2, Math.min(15, Math.floor((end - Date.now()) / 1000)));
      const j = await call(cfg.token, 'getUpdates', { timeout: String(left) }, (left + 5) * 1000);
      const msg = j && j.ok && j.result && j.result.message;
      if (!msg) { if (j && j.error_code === 401) return null; if (!j || (!j.ok && j.error_code !== 408 && !/timeout/i.test(j.description || ''))) await new Promise(r => setTimeout(r, 3000)); continue; }
      const chatId = String((msg.chat && msg.chat.id) || (msg.from && msg.from.id) || ''), text = String(msg.text || '').trim().toLowerCase().replace(/^\//, '');
      if (!chatId) continue;
      if (String(cfg.chatId) !== chatId) { if (text === 'id') await call(cfg.token, 'sendMessage', { chat_id: chatId, text: 'Mã cuộc trò chuyện: ' + chatId }); continue; }   // người lạ: chỉ trả mã, không lộ dữ liệu
      const S = await sites(), all = fn => S.length ? Promise.all(S.map(s => send(cfg, fn(s)))) : send(cfg, '🏗️ Chưa có công trình nào.');
      if (/^(tq|tong ?quan|tổng ?quan|bc|bao ?cao|báo ?cáo)$/.test(text)) await all(s => overview(s));
      else if (/^(hn|hom ?nay|hôm ?nay|viec|việc)$/.test(text)) await all(s => todayText(s));
      else if (/^(vd|van ?de|vấn ?đề)$/.test(text)) await all(s => issueText(s));
      else if (/^(cb|canh ?bao|cảnh ?báo|tre|trễ)$/.test(text)) { const T = S.map(s => alertText(s)).filter(Boolean); if (T.length) for (const t of T) await send(cfg, t); else await send(cfg, '✅ Không có việc trễ hạn hay hạng mục chậm tiến độ 👍'); }
      else if (text === 'id') await send(cfg, 'Mã cuộc trò chuyện: ' + chatId);
      else { const raw = String(msg.text || '').trim().replace(/^\//, ''); const r = await zaloEdit(raw, cfg); await send(cfg, r || HELP); }
    }
    return null;
  }

  // ---------- ✏️ V1.3.4: SỬA NHANH QUA ZALO ----------
  const noDia = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const uid2 = () => Math.random().toString(36).slice(2, 9);
  const ord = { cao: 0, tb: 1, thap: 2 };
  const parseD = (t, d) => { const m = /(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/.exec(t || ''); if (!m) return ''; let y = m[3] ? +m[3] : +d.slice(0, 4); if (y < 100) y += 2000; const r = y + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0'); return isNaN(new Date(r + 'T00:00')) ? '' : r; };
  async function loadB() { const { siteBrain: B } = await chrome.storage.local.get('siteBrain'); CATS = B && Array.isArray(B.cats) && B.cats.length ? Object.fromEntries(B.cats.map(c => [c.id, c.name])) : CATS0; return B && Array.isArray(B.sites) ? B : null; }
  const curSite = B => B.sites.find(s => s.id === B.cur) || B.sites[0];
  const openList = S => L(S, 'tasks').filter(t => t.st !== 'done').sort((a, b) => (ord[a.pri] ?? 1) - (ord[b.pri] ?? 1) || (a.due || '9').localeCompare(b.due || '9'));
  async function saveB(B) { await chrome.storage.local.set({ siteBrain: B }); try { await cloud(); } catch {} }
  function pickCat(B, word) {
    const C = Array.isArray(B.cats) && B.cats.length ? B.cats : Object.entries(CATS0).map(([id, name]) => ({ id, name }));
    const w = noDia(word).replace(/[^a-z0-9]/g, ''); if (!w) return null;
    return C.find(c => noDia(c.name).replace(/[^a-z0-9]/g, '') === w || c.id === w) || C.find(c => noDia(c.name).replace(/[^a-z0-9]/g, '').startsWith(w)) || null;
  }
  async function zaloEdit(raw, cfg) {
    const k = noDia(raw).split(/\s+/)[0], rest = raw.replace(/^\S+\s*/, ''), d = today();
    cfg = await getCfg();   // đọc mới: danh sách số thứ tự từ lệnh ds vừa gửi
    const B = await loadB(); if (!B || !B.sites.length) return /^(ds|xong|them|han|giao|td|nk|vande|ct|bct|bcth)$/.test(k) ? '🏗️ Chưa có công trình nào trong HaoHao.' : null;
    const S = curSite(B); ['tasks', 'plan', 'logs', 'issues'].forEach(x => { if (!Array.isArray(S[x])) S[x] = []; });
    const hd = head(S);
    const byNum = (arr, n) => { const i = parseInt(n, 10); return i >= 1 && i <= arr.length ? arr[i - 1] : null; };
    const mapTasks = () => { const ids = (cfg.map && cfg.map.site === S.id && cfg.map.ids) || openList(S).map(t => t.id); return ids.map(id => S.tasks.find(t => t.id === id)).filter(Boolean); };
    if (k === 'ct') {
      const n = parseInt(rest, 10);
      if (n >= 1 && n <= B.sites.length) { B.cur = B.sites[n - 1].id; await saveB(B); return '✅ Đang làm việc với: ' + head(B.sites[n - 1]); }
      return '🏗️ Công trình (nhắn "ct số" để chọn):\n' + B.sites.map((x, i) => (x.id === S.id ? '▶ ' : '   ') + (i + 1) + '. ' + (x.code ? x.code + ' · ' : '') + x.name).join('\n');
    }
    if (k === 'ds') {
      const T = openList(S); await setCfg({ map: { site: S.id, ids: T.map(t => t.id), at: Date.now() } });
      if (!T.length) return hd + '\n✅ Không còn việc nào chưa xong.';
      return ('📋 VIỆC CHƯA XONG – ' + hd + '\n' + T.slice(0, 40).map((t, i) => (i + 1) + '. ' + (t.pri === 'cao' ? '🔴' : '') + (taskLate(t, d) ? '❗' : '') + '[' + catOf(t) + '] ' + cut(t.t, 55) + (t.who ? ' – ' + t.who : '') + (t.due ? ' (' + fd(t.due) + ')' : '')).join('\n') + '\n\nNhắn: xong 2 · han 2 7/11 · giao 2 @Tên').slice(0, 1990);
    }
    if (k === 'xong') {
      const T = mapTasks(), ns = rest.split(/[\s,]+/).filter(Boolean), ok = [];
      for (const n of ns) { const t = byNum(T, n); if (t && t.st !== 'done') { t.st = 'done'; t.doneAt = d; ok.push(t.t); } }
      if (!ok.length) return '⚠️ Không thấy việc số ' + rest + '. Nhắn "ds" để xem lại số thứ tự.';
      await saveB(B); return '✅ Đã xong ' + ok.length + ' việc:\n' + ok.map(x => '• ' + x).join('\n');
    }
    if (k === 'han' || k === 'giao') {
      const T = mapTasks(), [n] = rest.split(/\s+/), t = byNum(T, n);
      if (!t) return '⚠️ Không thấy việc số ' + (n || '?') + '. Nhắn "ds" để xem số thứ tự.';
      if (k === 'han') { const nd = parseD(rest.replace(/^\S+\s*/, ''), d); if (!nd) return '⚠️ Ngày chưa đúng. Ví dụ: han 2 7/11'; t.due = nd; await saveB(B); return '📅 "' + t.t + '" – hạn mới ' + fd(nd); }
      const who = (rest.replace(/^\S+\s*/, '').replace(/^@/, '') || '').trim(); if (!who) return '⚠️ Ví dụ: giao 2 @Minh'; t.who = who; await saveB(B); return '👤 "' + t.t + '" – giao cho ' + who;
    }
    if (k === 'them') {
      let txt = rest, who = '', due = '', pri = 'tb', cat = null;
      txt = txt.replace(/@(\S+(?:\s(?![#!@]|han\b|hạn\b)[^\s#!@]+)?)/i, (m, w) => { who = w.trim(); return ' '; });
      txt = txt.replace(/#(\S+)/, (m, w) => { cat = pickCat(B, w); return ' '; });
      txt = txt.replace(/(?:^|\s)(?:han|hạn)\s+(\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?)/i, (m, w) => { due = parseD(w, d); return ' '; });
      txt = txt.replace(/(?:^|\s)!(?:\s|$)|!$/, () => { pri = 'cao'; return ' '; });
      txt = txt.replace(/\s+/g, ' ').trim(); if (!txt) return '⚠️ Ví dụ: them Đặt bê tông M250 @Nhật #qs ! han 5/11';
      const t = { id: uid2(), t: txt, who, due, pri, cat: cat ? cat.id : 'ht', st: 'todo', at: d }; S.tasks.push(t); await saveB(B);
      return '＋ Đã thêm việc vào ' + hd + ':\n' + (pri === 'cao' ? '🔴 ' : '') + txt + '\n[' + (cat ? cat.name : catOf(t)) + ']' + (who ? ' · ' + who : '') + (due ? ' · hạn ' + fd(due) : '');
    }
    if (k === 'td') {
      const P = L(S, 'plan').filter(p => p.s && p.e), parts = rest.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) { const p = byNum(P, parts[0]), v = parseInt(parts[1], 10); if (!p || isNaN(v) || v < 0 || v > 100) return '⚠️ Ví dụ: td 3 70 (hạng mục số 3 đạt 70%). Nhắn "td" để xem số.'; p.pct = v; await saveB(B); const lg = lagDays(p, d); return '📈 ' + (p.t || p.g) + ': ' + v + '% (KH ' + planPct(p, d) + '%)' + (lg ? ' – 🔴 chậm ' + lg + ' ngày' : ' – 🟢 đúng tiến độ'); }
      return ('📅 HẠNG MỤC – ' + hd + '\n' + P.map((p, i) => (i + 1) + '. ' + (p.t || p.g) + ': ' + num(p.pct) + '% / KH ' + planPct(p, d) + '%' + (lagDays(p, d) ? ' 🔴' + lagDays(p, d) + 'n' : '')).join('\n') + '\n\nNhắn: td 3 70').slice(0, 1990);
    }
    if (k === 'nk') {
      if (!rest.trim()) return '⚠️ Ví dụ: nk Đổ bê tông sàn tầng 2, 12 người';
      let lg = S.logs.find(x => x.d === d); if (!lg) { lg = { id: uid2(), d, wx: '☀️ Nắng', crew: {}, other: 0, work: '', mat: '', issue: '', next: '', photos: [] }; S.logs.push(lg); }
      lg.work = (lg.work ? lg.work.trim() + '\n' : '') + rest.trim(); await saveB(B); return '📓 Đã ghi nhật ký ' + fd(d) + ':\n' + lg.work;
    }
    if (k === 'vande') {
      let txt = rest, who = ''; txt = txt.replace(/@(\S+)/, (m, w) => { who = w; return ' '; }).trim(); if (!txt) return '⚠️ Ví dụ: vande Thiếu thép D16 @Nhật';
      S.issues.push({ id: uid2(), d, type: 'ht', t: txt, prop: '', who, due: (() => { const x = new Date(d + 'T00:00'); x.setDate(x.getDate() + 2); return ymd(x); })(), st: 'mo', res: '' }); await saveB(B); return '⚠️ Đã thêm vấn đề: ' + txt + (who ? ' – ' + who : '') + ' (hạn 2 ngày)';
    }
    if (k === 'bct' || k === 'bcth') return leadText(S, k === 'bct' ? 'w' : 'm');
    return null;
  }
  // 📑 báo cáo lãnh đạo (tuần / tháng hiện tại) – bản chữ cho Zalo
  function leadText(S, kind) {
    const d = today(), t = new Date(d + 'T00:00');
    let a, b; if (kind === 'w') { t.setDate(t.getDate() - (t.getDay() + 6) % 7); a = ymd(t); b = addD(a, 6); } else { a = d.slice(0, 8) + '01'; const e = new Date(t.getFullYear(), t.getMonth() + 1, 0); b = ymd(e); }
    const inP = x => x && x >= a && x <= b, dE = b < d ? b : d, pr = progress(S, dE);
    const items = L(S, 'plan').filter(p => p.s && p.e && p.s <= b && p.e >= a), slow = items.filter(p => lagDays(p, dE) >= 1).sort((x, y) => lagDays(y, dE) - lagDays(x, dE)), maxLag = slow.length ? lagDays(slow[0], dE) : 0;
    const logs = L(S, 'logs').filter(l => inP(l.d)), cong = logs.reduce((s, l) => s + Object.values(l.crew || {}).reduce((x, n) => x + num(n), 0) + num(l.other), 0);
    const done = L(S, 'tasks').filter(x => x.st === 'done' && inP(x.doneAt)).sort((x, y) => (ord[x.pri] ?? 1) - (ord[y.pri] ?? 1)), late = L(S, 'tasks').filter(x => taskLate(x, d));
    const cK = L(S, 'costs').filter(c => inP(c.d)).reduce((s, c) => s + num(c.amt), 0), cAll = L(S, 'costs').reduce((s, c) => s + num(c.amt), 0), B = L(S, 'budget').reduce((s, x) => s + num(x.est), 0);
    const iss = L(S, 'issues').filter(x => x.st !== 'dong').sort((x, y) => (y.st === 'cd') - (x.st === 'cd'));
    const na = addD(b, 1), nb = kind === 'w' ? addD(b, 7) : ymd(new Date(t.getFullYear(), t.getMonth() + 2, 0)), next = L(S, 'tasks').filter(x => x.st !== 'done' && x.due && x.due >= na && x.due <= nb).sort((x, y) => (ord[x.pri] ?? 1) - (ord[y.pri] ?? 1));
    const o = ['📑 BÁO CÁO ' + (kind === 'w' ? 'TUẦN ' + fd(a) + ' – ' + fd(b) : 'THÁNG ' + (+a.slice(5, 7)) + '/' + a.slice(0, 4)), head(S), ''];
    o.push('1. TÌNH HÌNH CHUNG', '• Tiến độ ' + pr.tt + '% / KH ' + pr.kh + '% → ' + (pr.tt + 5 < pr.kh || maxLag >= 3 ? '🔴 CHẬM' + (maxLag ? ' ' + maxLag + ' ngày' : '') : maxLag ? '🟡 chậm nhẹ ' + maxLag + ' ngày' : '🟢 đúng kế hoạch'), '• Thi công ' + logs.length + ' ngày · TB ' + (logs.length ? Math.round(cong / logs.length) : 0) + ' người/ngày', '• Chi trong kỳ ' + short(cK) + ' · luỹ kế ' + short(cAll) + (B ? ' (' + Math.round(cAll / B * 100) + '% dự toán)' : ''));
    if (slow.length) { o.push('', '2. HẠNG MỤC CHẬM'); slow.slice(0, 5).forEach(p => o.push('• ' + (p.t || p.g) + ': ' + num(p.pct) + '% / KH ' + planPct(p, dE) + '% – chậm ' + lagDays(p, dE) + ' ngày')); }
    o.push('', 'KẾT QUẢ CHÍNH (' + done.length + ' việc xong)'); done.slice(0, 6).forEach(x => o.push('• ' + cut(x.t, 70))); if (!done.length) o.push('• Chưa ghi nhận việc hoàn thành');
    if (iss.length || late.length) { o.push('', 'VƯỚNG MẮC CẦN CHỈ ĐẠO'); iss.slice(0, 5).forEach(x => o.push('• ' + (x.st === 'cd' ? '[Chờ duyệt] ' : '') + cut(x.t, 70) + ' – ' + (x.who || 'chưa giao'))); late.slice(0, 4).forEach(x => o.push('• ' + (x.pri === 'cao' ? '🔴 ' : '') + '[' + catOf(x) + '] ' + cut(x.t, 60) + ' – trễ ' + days(x.due, d) + ' ngày')); }
    o.push('', 'KẾ HOẠCH ' + (kind === 'w' ? 'TUẦN' : 'THÁNG') + ' TỚI'); next.slice(0, 6).forEach(x => o.push('• ' + cut(x.t, 70) + ' – ' + fd(x.due))); if (!next.length) o.push('• (chưa có việc hẹn)');
    const note = S.reports && S.reports[(kind === 'w' ? 'W' + a : 'M' + a.slice(0, 7))]; if (note && (note.note || '').trim()) o.push('', '📝 ĐỀ XUẤT CỦA CHT:', note.note.trim());
    return o.join('\n').slice(0, 1990);
  }

  // ---------- trang Công trình gọi sang ----------
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('sb-bot-')) return;
    (async () => {
      try {
        if (msg.type === 'sb-bot-check') { const j = await call(msg.token, 'getMe', {}); return reply(j.ok ? { ok: true, name: (j.result && (j.result.account_name || j.result.display_name || j.result.name)) || 'Bot' } : { ok: false, err: j.description || 'Token không đúng' }); }
        if (msg.type === 'sb-bot-link') {   // chờ người dùng nhắn bất kỳ cho bot (tối đa ~50 giây) → lấy chat_id
          busy = true;
          try {
            for (let i = 0; i < 6; i++) {
              const j = await call(msg.token, 'getUpdates', { timeout: '8' }, 12000), m = j && j.ok && j.result && j.result.message;
              if (j && !j.ok && j.error_code === 401) return reply({ ok: false, err: 'Token không đúng' });
              if (m && m.chat) {
                const id = String(m.chat.id), name = (m.from && (m.from.display_name || m.from.name)) || '';
                await call(msg.token, 'sendMessage', { chat_id: id, text: '✅ Đã kết nối HaoHao – Công trình.\n' + HELP });
                return reply({ ok: true, chatId: id, chatName: name, group: m.chat.chat_type === 'GROUP' });
              }
            }
            reply({ ok: false, err: 'Chưa thấy tin nhắn nào – mở Zalo, nhắn "hi" cho bot rồi bấm lại' });
          } finally { busy = false; }
          return;
        }
        if (msg.type === 'sb-bot-test') { const cfg = await getCfg(); const n = await sendDaily(cfg, true); await setCfg({ err: '' }); return reply({ ok: true, n }); }
        if (msg.type === 'sb-bot-preview') { const S = await sites(); return reply({ ok: true, text: S.map(s => overview(s)).join('\n\n— — —\n\n') || '(chưa có công trình)' }); }
        reply({ ok: false, err: 'lệnh lạ' });
      } catch (e) { reply({ ok: false, err: String(e.message || e) }); }
    })();
    return true;
  });
  // 🔐 V1.3.0: đồng bộ trang Công trình theo tài khoản Google (sbsync.js) – mỗi phút + ngay sau khi sửa
  const SB_API = 'https://haohao-gia.nhatphan79.workers.dev';
  const auth = async () => (await chrome.storage.local.get('sbAuth')).sbAuth || {};
  const eng = self.SBSync ? self.SBSync({
    api: SB_API,
    token: async () => (await auth()).token || '',
    getLocal: async () => (await chrome.storage.local.get('siteBrain')).siteBrain,
    setLocal: async v => chrome.storage.local.set({ siteBrain: v }),
    getBase: async () => (await chrome.storage.local.get('sbBase')).sbBase,
    setBase: async v => chrome.storage.local.set({ sbBase: v })
  }) : null;
  async function cloud() {
    const a = await auth(); if (!a.token || !eng) return null;
    const r = await eng.sync();
    const A = await auth(); if (A.token !== a.token) return r;   // vừa đăng xuất / đổi tài khoản
    if (r.ok) Object.assign(A, { at: Date.now(), err: '' }); else if (r.auth === false) Object.assign(A, { token: '', err: 'Hết phiên đăng nhập – đăng nhập lại' }); else A.err = r.err;
    await chrome.storage.local.set({ sbAuth: A }); return r;
  }
  chrome.runtime.onMessageExternal.addListener((m, sender, reply) => {   // trang đăng nhập (workers.dev) gửi phiên về
    if (!m || m.type !== 'sb-login' || !/^https:\/\/haohao-gia\.nhatphan79\.workers\.dev\//.test(sender.url || '')) return;
    (async () => {
      if (!/^[a-z0-9]{30}$/.test(String(m.token || ''))) return reply({ ok: false });
      const old = await auth();
      if (old.email && old.email !== m.email) await chrome.storage.local.remove('sbBase');   // đổi tài khoản: gộp lại từ đầu, không mất dữ liệu máy này
      await chrome.storage.local.set({ sbAuth: { token: m.token, email: m.email, name: m.name || '', at: 0, err: '' } });
      const r = await cloud(); reply({ ok: true, sync: r });
    })();
    return true;
  });
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (!m || (m.type !== 'sb-sync-now' && m.type !== 'sb-logout')) return;
    (async () => {
      if (m.type === 'sb-logout') { const a = await auth(); if (a.token) fetch(SB_API + '/sb/logout', { method: 'POST', headers: { authorization: 'Bearer ' + a.token } }).catch(() => {}); await chrome.storage.local.set({ sbAuth: {} }); await chrome.storage.local.remove('sbBase'); return reply({ ok: true }); }
      reply(await cloud() || { ok: false, err: 'chưa đăng nhập' });
    })();
    return true;
  });
  chrome.alarms.onAlarm.addListener(a => { if (a.name === 'sb:bot') { cloud().catch(() => {}).finally(tick); } });
  const ensure = () => chrome.alarms.get('sb:bot').then(a => { if (!a) chrome.alarms.create('sb:bot', { delayInMinutes: 0.2, periodInMinutes: 1 }); }).catch(() => {});
  ensure(); chrome.runtime.onStartup.addListener(() => { ensure(); setTimeout(tick, 4000); });
  self.HHSiteBot = { overview, tick };
})();
