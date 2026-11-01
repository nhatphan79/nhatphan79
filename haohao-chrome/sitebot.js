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
  const todayTasks = (S, d) => L(S, 'tasks').filter(t => t.st !== 'done' && (taskLate(t, d) || t.due === d || t.st === 'doing')).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
  const head = S => '🏗️ ' + (S.code ? S.code + ' · ' : '') + (S.name || 'Công trình');
  const taskLine = (t, d) => '• ' + (taskLate(t, d) ? '❗' : '') + cut(t.t, 70) + (t.who ? ' – ' + t.who : '') + (t.due ? (taskLate(t, d) ? ' (trễ ' + days(t.due, d) + ' ngày)' : t.due === d ? '' : ' (' + fd(t.due) + ')') : '');
  const issueLine = (x, d) => '• ' + (x.due && x.due < d ? '❗' : '') + '[' + (ITYPE[x.type] || 'Vấn đề') + '] ' + cut(x.t, 70) + ' – ' + (x.who || 'chưa giao') + (x.due ? ', hạn ' + fd(x.due) : '') + (x.st === 'cd' ? ' · chờ duyệt' : '');

  // 📊 bản tổng quan 1 công trình (≤ 2000 ký tự – giới hạn của Zalo)
  function overview(S, d = today()) {
    const pr = progress(S, d), late = pr.tt - pr.kh, plan = L(S, 'plan');
    const slow = plan.filter(p => { const kh = planPct(p, d), tt = num(p.pct); return tt < 100 && tt + 10 < kh; });
    const o = ['📊 TỔNG QUAN ' + fdFull(d), head(S)];
    const ds = S.start ? days(S.start, d) : null, dl = S.end ? days(d, S.end) : null;
    o.push('📍 Giai đoạn: ' + (S.phase || '—') + (ds != null && ds >= 0 ? ' · ngày thứ ' + (ds + 1) : '') + (dl != null ? (dl >= 0 ? ' · còn ' + dl + ' ngày' : ' · QUÁ HẠN ' + (-dl) + ' ngày') : ''));
    o.push('📈 Tiến độ: thực tế ' + pr.tt + '% / kế hoạch ' + pr.kh + '% → ' + (late < -5 ? '🔴 CHẬM ' + (-late) + '%' : late > 5 ? '🟢 vượt ' + late + '%' : slow.length ? '🟡 tổng thể đúng kế hoạch, ' + slow.length + ' hạng mục chậm' : '🟢 đúng kế hoạch'));
    slow.slice(0, 3).forEach(p => o.push('   ⚠ ' + cut(p.t || p.g, 50) + ': chậm ' + (planPct(p, d) - num(p.pct)) + '%'));
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
  const HELP = '🤖 Bot Công trình HaoHao\nNhắn:\n• tq – tổng quan\n• hn – việc hôm nay\n• vd – vấn đề đang mở\n• id – mã cuộc trò chuyện\nMỗi ngày bot tự gửi tổng quan đúng giờ đã hẹn (khi máy và Chrome đang mở; lỡ giờ thì gửi bù lúc mở Chrome).';

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
  const sites = async () => { const { siteBrain: B } = await chrome.storage.local.get('siteBrain'); return (B && Array.isArray(B.sites) ? B.sites : []).filter(s => !s.botOff); };
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
      if (!cfg.on || !cfg.token || !cfg.chatId) return;
      const d = today(), [h, m] = String(cfg.time || '07:00').split(':').map(Number), now = new Date();
      if (cfg.last !== d && now.getHours() * 60 + now.getMinutes() >= h * 60 + (m || 0)) {
        try { await sendDaily(cfg); await setCfg({ last: d, err: '' }); } catch (e) { await setCfg({ err: String(e.message || e), errAt: Date.now() }); }
      }
      if (cfg.cmd !== false) await poll(cfg, 1);
    } finally { busy = false; }
  }
  async function poll(cfg, rounds) {
    for (let i = 0; i < rounds; i++) {
      const j = await call(cfg.token, 'getUpdates', { timeout: '5' }, 9000);
      const msg = j && j.ok && j.result && j.result.message; if (!msg) return null;
      const chatId = String((msg.chat && msg.chat.id) || (msg.from && msg.from.id) || ''), text = String(msg.text || '').trim().toLowerCase().replace(/^\//, '');
      if (!chatId) continue;
      if (String(cfg.chatId) !== chatId) { if (text === 'id') await call(cfg.token, 'sendMessage', { chat_id: chatId, text: 'Mã cuộc trò chuyện: ' + chatId }); continue; }   // người lạ: chỉ trả mã, không lộ dữ liệu
      const S = await sites(), all = fn => S.length ? Promise.all(S.map(s => send(cfg, fn(s)))) : send(cfg, '🏗️ Chưa có công trình nào.');
      if (/^(tq|tong ?quan|tổng ?quan|bc|bao ?cao|báo ?cáo)$/.test(text)) await all(s => overview(s));
      else if (/^(hn|hom ?nay|hôm ?nay|viec|việc)$/.test(text)) await all(s => todayText(s));
      else if (/^(vd|van ?de|vấn ?đề)$/.test(text)) await all(s => issueText(s));
      else if (text === 'id') await send(cfg, 'Mã cuộc trò chuyện: ' + chatId);
      else await send(cfg, HELP);
    }
    return null;
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
  chrome.alarms.onAlarm.addListener(a => { if (a.name === 'sb:bot') tick(); });
  const ensure = () => chrome.alarms.get('sb:bot').then(a => { if (!a) chrome.alarms.create('sb:bot', { delayInMinutes: 0.2, periodInMinutes: 1 }); }).catch(() => {});
  ensure(); chrome.runtime.onStartup.addListener(() => { ensure(); setTimeout(tick, 4000); });
  self.HHSiteBot = { overview, tick };
})();
