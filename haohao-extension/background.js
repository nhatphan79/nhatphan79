importScripts('common.js');

const DEFAULT_RULES = [
  { id: 'r3', type: 'price', name: 'BTC vượt 120k', enabled: false, source: 'coingecko', coin: 'bitcoin', op: 'above', value: 120000 },
  { id: 'r4', type: 'reminder', name: 'Uống nước', icon: '💧', enabled: true, kind: 'interval', minutes: 60, from: '08:00', to: '21:00', message: 'Uống một ly nước nhé!' }
];

const DEFAULT_WATCH = [{ source: 'coingecko', coin: 'bitcoin' }, { source: 'coingecko', coin: 'solana' }];

chrome.runtime.onInstalled.addListener(async () => {
  const { rules, watch, todos } = await chrome.storage.local.get(['rules', 'watch', 'todos']);
  if (!watch) await chrome.storage.local.set({ watch: DEFAULT_WATCH });
  // bản mới đã bỏ Lọc: dọn các điều kiện lọc từ khoá cũ
  if (Array.isArray(rules) && rules.some(r => r.type === 'keyword')) await chrome.storage.local.set({ rules: rules.filter(r => r.type !== 'keyword') });
  if (!todos) await chrome.storage.local.set({ todos: [] });
  // bản mới đã bỏ Clipboard: xoá lịch sử copy cũ
  await chrome.storage.local.remove('clips');
  if (!rules) {
    await chrome.storage.local.set({
      rules: DEFAULT_RULES,
      settings: { mascotEnabled: true, hiddenSites: [] },
      log: [], priceState: {}
    });
  }
  scheduleAll(); scheduleTodos(); makeMenus(); syncCoupons();
});
chrome.runtime.onStartup.addListener(() => { scheduleAll(); scheduleTodos(); });
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local') return;
  if (ch.rules) scheduleAll();
  if (ch.todos) scheduleTodos();
});

async function clearAlarms(test) {
  for (const a of await chrome.alarms.getAll()) if (test(a.name)) await chrome.alarms.clear(a.name);
}

async function scheduleTodos() {
  const { todos = [] } = await chrome.storage.local.get('todos');
  await clearAlarms(n => n.startsWith('todo:'));
  for (const t of todos) {
    if (t.done || t.notified || !t.due) continue;
    const when = new Date(t.due).getTime();
    if (when > Date.now()) chrome.alarms.create('todo:' + t.id, { when });
  }
}
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

function nextDaily(time) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

async function scheduleAll() {
  const { rules = [] } = await chrome.storage.local.get('rules');
  await clearAlarms(n => !n.startsWith('todo:') && !n.startsWith('snz:') && n !== 'pomo');
  chrome.alarms.create('desk-sync', { delayInMinutes: 1, periodInMinutes: 1 });
  chrome.alarms.create('mail-check', { delayInMinutes: 0.5, periodInMinutes: 1 });
  chrome.alarms.create('coupon-sync', { delayInMinutes: 1, periodInMinutes: 360 });
  if (rules.some(r => r.enabled && r.type === 'price')) {
    chrome.alarms.create('price-check', { delayInMinutes: 0.5, periodInMinutes: 1 });
  }
  for (const r of rules) {
    if (!r.enabled || r.type !== 'reminder') continue;
    const name = 'rem:' + r.id;
    if (r.kind === 'daily' || r.kind === 'lunar') HT.timesOf(r).forEach((t, i) => chrome.alarms.create(name + ':' + i, { when: nextDaily(t), periodInMinutes: 1440 }));
    if (r.kind === 'lunar' && r.prep && r.prep.on && r.prep.time) chrome.alarms.create(name + ':p', { when: nextDaily(r.prep.time), periodInMinutes: 1440 });
    else if (r.kind === 'interval' && Number(r.minutes) >= 1) chrome.alarms.create(name, { delayInMinutes: Number(r.minutes), periodInMinutes: Number(r.minutes) });
    else if (r.kind === 'once' && r.datetime) {
      const t = new Date(r.datetime).getTime();
      if (t > Date.now()) chrome.alarms.create(name, { when: t });
    }
  }
}

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === 'price-check') return checkPrices();
  if (a.name === 'desk-sync') return syncApp();
  if (a.name === 'pomo') return pomoTick();
  if (a.name === 'mail-check') return checkMail(false);
  if (a.name === 'coupon-sync') return syncCoupons();
  if (a.name.startsWith('todo:')) {
    const { todos = [] } = await chrome.storage.local.get('todos');
    const t = todos.find(x => x.id === a.name.slice(5));
    if (!t || t.done) return;
    t.notified = true;
    await chrome.storage.local.set({ todos });
    return fire({ name: 'Todolist', type: 'todo', id: t.id }, '✅ ' + t.text, 'remind');
  }
  if (a.name.startsWith('rem:') || a.name.startsWith('snz:')) {
    const snooze = a.name.startsWith('snz:');
    const { rules = [] } = await chrome.storage.local.get('rules');
    const r = rules.find(x => x.id === a.name.split(':')[1]);
    if (!r || (!r.enabled && !snooze)) return;
    const now = new Date();
    if (!snooze && r.kind === 'daily' && r.days && r.days.length && !r.days.includes(now.getDay())) return;
    if (!snooze && r.kind === 'interval' && !HT.inWindow(r.from, r.to, now)) return;
    let extraTxt = '';
    if (!snooze && r.kind === 'lunar') {
      const isPrep = a.name.split(':')[2] === 'p';
      const day = isPrep ? HT.lunar.addDays(now, 1) : now;
      if (!HT.lunar.matches(day, r.lunarDays)) return;
      const l = HT.lunar.of(day);
      const which = HT.lunar.isLastDay(day) && (r.lunarDays || []).includes(30) ? 'cuối tháng' : HT.lunar.dayName(l.day);
      extraTxt = isPrep ? ` (Mai là ${which}, ${HT.lunar.label(day)})` : ` (Hôm nay ${which}, ${HT.lunar.label(day)})`;
      if (isPrep) { await fire(r, `${r.icon ? r.icon + ' ' : ''}${r.prepMessage || 'Chuẩn bị đồ cúng, hoa quả, nhang đèn cho ngày mai'}${extraTxt}`, 'remind'); return; }
    }
    await fire(r, (r.icon ? r.icon + ' ' : '') + (r.message || r.name) + extraTxt + (snooze ? ' (nhắc lại)' : ''), 'remind', r.url ? { url: r.url } : {});
    if (snooze) return;
    if (r.kind === 'once') { r.enabled = false; await chrome.storage.local.set({ rules }); }
  }
});

async function checkPrices() {
  const { rules = [], priceState = {} } = await chrome.storage.local.get(['rules', 'priceState']);
  const pr = rules.filter(r => r.enabled && r.type === 'price' && r.coin);
  if (!pr.length) return;
  const key = r => r.source === 'dexscreener' ? 'dx:' + r.coin.trim() : 'cg:' + r.coin.trim().toLowerCase();
  const quotes = {};
  const cgIds = [...new Set(pr.filter(r => r.source !== 'dexscreener').map(r => r.coin.trim().toLowerCase()))];
  if (cgIds.length) {
    try { const q = await HT.cgQuotes(cgIds); for (const id in q) quotes['cg:' + id] = q[id]; } catch (e) { console.warn(e); }
  }
  for (const r of pr.filter(r => r.source === 'dexscreener')) {
    if (quotes[key(r)]) continue;
    try { quotes[key(r)] = await HT.dxQuote(r.coin.trim()); } catch (e) { console.warn(e); }
  }
  let changed = false;
  for (const r of pr) {
    const q = quotes[key(r)];
    if (!q) continue;
    const met = HT.met(r, q);
    if (met && !priceState[r.id]) {
      priceState[r.id] = true; changed = true;
      const ch = (q.change >= 0 ? '+' : '') + q.change.toFixed(1) + '%';
      await fire(r, `${String(q.label).toUpperCase()} đang ở $${HT.fmt(q.price)} (24h ${ch}). Điều kiện: ${HT.describe(r)}`, 'alert');
    } else if (!met && priceState[r.id]) {
      priceState[r.id] = false; changed = true;
    }
  }
  const save = { lastQuotes: quotes, lastQuoteAt: Date.now() };
  if (changed) save.priceState = priceState;
  await chrome.storage.local.set(save);
}

async function addLog(entry) {
  const { log = [] } = await chrome.storage.local.get('log');
  log.unshift(entry);
  await chrome.storage.local.set({ log: log.slice(0, 150) });
}

async function fire(r, text, mood, extra = {}) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  await addLog({ t: Date.now(), rule: r.name, kind: r.type, text });
  // Nhắc nhở và việc đến hạn: HaoHao ra hẳn màn hình (cửa sổ riêng, đè lên các ứng dụng khác)
  if (settings.desktop !== false && (r.type === 'reminder' || r.type === 'todo' || r.type === 'mail' || r.type === 'pomo')) {
    await remindOnDesk({ id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ruleId: r.id, title: r.name, text, kind: r.type, t: Date.now(), ...extra });
    return;
  }
  const nid = 'ht' + Date.now();
  const opt = { type: 'basic', iconUrl: 'icons/icon128.png', title: 'HaoHao: ' + r.name, message: text, priority: 2 };
  if (r.type === 'reminder') {
    opt.buttons = [{ title: 'Nhắc lại sau 10 phút' }, { title: 'Đã xong' }];
    opt.requireInteraction = true;
    const { notifMap = {} } = await chrome.storage.session.get('notifMap');
    notifMap[nid] = r.id;
    await chrome.storage.session.set({ notifMap });
  }
  if (extra.url) {
    const { notifUrl = {} } = await chrome.storage.session.get('notifUrl');
    notifUrl[nid] = extra.url; await chrome.storage.session.set({ notifUrl });
  }
  chrome.notifications.create(nid, opt);
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'ht-alert', title: r.name, text, mood, kind: r.type, ruleId: r.id, url: extra.url, next: extra.next, end: extra.end, task: extra.task }).catch(() => {});
}

// ---------- HaoHao 3D (app Windows) ----------
const APP = 'http://127.0.0.1:47321';
async function appCall(path, body) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 1500);
  try {
    const r = await fetch(APP + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal } : { signal: ctl.signal });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(tm); }
}
// Ưu tiên con hamster 3D; nếu app chưa chạy thì mở cửa sổ nhắc nhỏ
async function remindOnDesk(item) {
  const ok = await appCall('/knock', item);
  if (!ok || !ok.ok) await showDesk(item);
}
async function syncApp() {
  const res = await appCall('/results');
  if (Array.isArray(res)) for (const r of res) await applyAction(r, r.action, r.minutes, true);
}

// ---------- Cửa sổ HaoHao trên màn hình ----------
const DESK_W = 390, DESK_H = 360;
async function showDesk(item) {
  const { deskQueue = [], deskWin = null } = await chrome.storage.session.get(['deskQueue', 'deskWin']);
  deskQueue.push(item);
  await chrome.storage.session.set({ deskQueue });
  if (deskWin != null) {
    try { await chrome.windows.get(deskWin); await chrome.windows.update(deskWin, { focused: true, drawAttention: true }); return; } catch {}
  }
  let left, top;
  try {
    const ds = await chrome.system.display.getInfo();
    const wa = (ds.find(d => d.isPrimary) || ds[0]).workArea;
    left = Math.round(wa.left + wa.width - DESK_W - 20);
    top = Math.round(wa.top + wa.height - DESK_H - 20);
  } catch {}
  const w = await chrome.windows.create({ url: 'alert.html', type: 'popup', width: DESK_W, height: DESK_H, left, top, focused: true });
  await chrome.storage.session.set({ deskWin: w.id });
}
chrome.windows.onRemoved.addListener(async id => {
  const { deskWin } = await chrome.storage.session.get('deskWin');
  if (id === deskWin) await chrome.storage.session.set({ deskWin: null, deskQueue: [] });
});
const localISO = ms => { const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
async function deskAct({ id, action, minutes = 10 }) {
  const { deskQueue = [] } = await chrome.storage.session.get('deskQueue');
  const it = deskQueue.find(x => x.id === id);
  await chrome.storage.session.set({ deskQueue: deskQueue.filter(x => x.id !== id) });
  if (it && action === 'open') { openMail(it.url); return; }
  if (it && action === 'deal') { openDeal(it.url); return; }
  if (it && action === 'pomo-next') { pomoStart({}); return; }
  if (it && action === 'pomo-done') { pomoTaskDone(it.task); return; }
  if (it) await applyAction(it, action, minutes, false);
}
const MAIL_HOSTS = ['https://mail.google.com/', 'https://outlook.live.com/', 'https://outlook.office.com/', 'https://outlook.office365.com/'];
function openMail(url) {
  if (typeof url === 'string' && MAIL_HOSTS.some(h => url.startsWith(h))) chrome.tabs.create({ url });
}
// appSnooze = true: app 3D tự nhắc lại, ở đây chỉ ghi nhận
async function applyAction(it, action, minutes = 10, appSnooze = false) {
  if (!it || !it.ruleId) return;
  if (it.kind === 'mail' || it.kind === 'pomo') return;
  if (it.kind === 'reminder') { if (action === 'done') remDone(it.ruleId); else if (!appSnooze) snooze(it.ruleId, minutes); }
  if (it.kind === 'todo') {
    const { todos = [] } = await chrome.storage.local.get('todos');
    const t = todos.find(x => x.id === it.ruleId);
    if (!t) return;
    if (action === 'done') t.done = true; else if (!appSnooze) { t.due = localISO(Date.now() + minutes * 60000); t.notified = false; } else return;
    await chrome.storage.local.set({ todos });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg.type === 'open-options') { if (msg.hash) chrome.tabs.create({ url: chrome.runtime.getURL('options.html#' + msg.hash) }); else chrome.runtime.openOptionsPage(); }
  if (msg.type === 'pomo-start') pomoStart(msg);
  if (msg.type === 'pomo-pause') pomoPause();
  if (msg.type === 'pomo-resume') pomoResume();
  if (msg.type === 'pomo-stop') pomoStop();
  if (msg.type === 'pomo-skip') pomoSkip();
  if (msg.type === 'pomo-done') pomoTaskDone(msg.task);
  if (msg.type === 'ai-explain') { aiExplain(msg).then(text => send({ ok: true, text })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'quick-remind') { quickRemind(msg.text).then(send); return true; }
  if (msg.type === 'idea-add') { ideaAdd(msg.item).then(id => send({ ok: true, id })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'idea-ai') { ideaSuggest(msg.id).then(() => send({ ok: true })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'voice-open') openVoice(msg.target);
  if (msg.type === 'ai-translate') { aiTranslate(msg).then(r => send({ ok: true, ...r })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'ai-read') { aiRead(msg).then(text => send({ ok: true, text })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'ai-test') { gemini([{ role: 'user', parts: [{ text: 'Trả lời đúng một chữ: OK' }] }], 'Trả lời ngắn.').then(t => send({ ok: true, text: t })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'mail-check-now') { checkMail(true).then(send); return true; }
  if (msg.type === 'ms-redirect') { send(msRedirect()); return; }
  if (msg.type === 'ms-login') {
    msAuth(true).then(async () => { await chrome.storage.local.set({ mailSeen: null }); const st = await checkMail(true); send({ ok: true, status: st }); })
      .catch(e => send({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'ms-logout') {
    chrome.storage.session.remove('msToken'); chrome.storage.local.set({ msAccount: '', mailStatus: null });
    chrome.tabs.create({ url: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout' });
  }
  if (msg.type === 'open-mail') openMail(msg.url);
  if (msg.type === 'app-status') { appCall('/ping').then(r => send({ running: !!(r && r.ok) })); return true; }
  if (msg.type === 'check-now') { checkPrices().then(() => send({ ok: true })); return true; }
  if (msg.type === 'snooze') snooze(msg.ruleId, msg.minutes || 10);
  if (msg.type === 'desk-act') deskAct(msg);
  if (msg.type === 'desk-test') remindOnDesk({ id: 'test' + Date.now(), ruleId: null, title: 'Thử HaoHao', text: '💧 Uống một ly nước nhé!', kind: 'test', t: Date.now() });
  if (msg.type === 'rem-done') remDone(msg.ruleId);
  if (msg.type === 'open-deal') openDeal(msg.url);
  if (msg.type === 'coupon-sync') { syncCoupons().then(send); return true; }
  if (msg.type === 'same-find') { sameFind(msg, sender).then(send).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'scan-me') { const job = scanJobs.get(sender.tab && sender.tab.id); send({ scan: job ? job.type : false }); return; }
  if (msg.type === 'scan-result') { const job = scanJobs.get(sender.tab && sender.tab.id); if (job) job.done(msg.result); return; }
  if (msg.type === 'get-quotes') { getQuotes(msg.items || []).then(send); return true; }
});

// Giá cho bảng Crypto của HaoHao (lưu tạm 30 giây để không gọi API quá nhiều)
const quoteCache = {};
const qKey = it => it.source === 'dexscreener' ? 'dx:' + it.coin.trim() : 'cg:' + it.coin.trim().toLowerCase();
async function getQuotes(items) {
  const out = {}, now = Date.now();
  const need = items.filter(it => it.coin && !(quoteCache[qKey(it)] && now - quoteCache[qKey(it)].at < 30000));
  const cg = [...new Set(need.filter(it => it.source !== 'dexscreener').map(it => it.coin.trim().toLowerCase()))];
  if (cg.length) {
    try {
      const q = await HT.cgQuotes(cg);
      for (const id of cg) quoteCache['cg:' + id] = q[id] ? { ...q[id], at: now } : { error: 'Không có mã này trên CoinGecko', at: now };
    } catch (e) { for (const id of cg) quoteCache['cg:' + id] = { error: e.message, at: now }; }
  }
  for (const it of need.filter(it => it.source === 'dexscreener')) {
    try { quoteCache[qKey(it)] = { ...(await HT.dxQuote(it.coin.trim())), at: now }; }
    catch (e) { quoteCache[qKey(it)] = { error: e.message, at: now }; }
  }
  for (const it of items) if (it.coin) out[qKey(it)] = quoteCache[qKey(it)];
  return out;
}

// Nhắc lại sau / đã xong (từ bong bóng HaoHao hoặc nút trên thông báo Windows)
function snooze(ruleId, minutes) {
  chrome.alarms.create(`snz:${ruleId}:${Date.now()}`, { when: Date.now() + minutes * 60000 });
}
async function remDone(ruleId) {
  const { rules = [] } = await chrome.storage.local.get('rules');
  const r = rules.find(x => x.id === ruleId);
  if (r) addLog({ t: Date.now(), rule: r.name, kind: 'reminder', text: 'Đã xong ✓' });
}
chrome.notifications.onButtonClicked.addListener(async (nid, idx) => {
  if (nid.startsWith('shop:')) {
    const { shopNotif = {} } = await chrome.storage.session.get('shopNotif');
    if (idx === 0 && shopNotif[nid]) openDeal(shopNotif[nid]);
    chrome.notifications.clear(nid); return;
  }
  const { notifMap = {} } = await chrome.storage.session.get('notifMap');
  const id = notifMap[nid];
  chrome.notifications.clear(nid);
  if (!id) return;
  if (idx === 0) snooze(id, 10); else remDone(id);
  delete notifMap[nid];
  chrome.storage.session.set({ notifMap });
});

// ---------- Canh email Gmail ----------
// Dùng nguồn tin (feed) của Gmail đang đăng nhập trên Chrome: chỉ đọc thư CHƯA ĐỌC, không cần mật khẩu.
function parseFeed(xml) {
  const dec = x => x.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const tag = (x, t) => { const m = x.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>')); return m ? dec(m[1]).trim() : ''; };
  const count = Number(tag(xml, 'fullcount')) || 0;
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1], author = (e.match(/<author>([\s\S]*?)<\/author>/) || [])[1] || '';
    const href = (e.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    return { id: tag(e, 'id'), title: tag(e, 'title') || '(Không có tiêu đề)', summary: tag(e, 'summary'),
             name: tag(author, 'name'), email: tag(author, 'email'), url: dec(href) };
  });
  return { count, entries };
}
const normTxt = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
function mailMatch(m, e) {
  if (m.mode !== 'filter') return true;
  const senders = (m.senders || []).map(normTxt).filter(Boolean), words = (m.words || []).map(normTxt).filter(Boolean);
  if (!senders.length && !words.length) return true;
  const who = normTxt(e.name + ' ' + e.email), body = normTxt(e.title + ' ' + e.summary);
  return senders.some(x => who.includes(x)) || words.some(x => body.includes(x));
}
async function fetchGmail(m) {
  const url = `https://mail.google.com/mail/u/${Number(m.account) || 0}/feed/atom${m.primary !== false ? '/%5Esmartlabel_personal' : ''}`;
  const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const txt = await r.text();
  if (!r.ok || !txt.includes('<feed')) throw new Error(r.status === 401 || r.status === 403 || /accounts\.google\.com/.test(r.url) ? 'login' : 'bad');
  return parseFeed(txt);
}

// ---------- Outlook / Hotmail / Office 365 (đăng nhập Microsoft, đọc qua Microsoft Graph) ----------
const MS_SCOPE = 'openid profile https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read';
const msRedirect = () => chrome.identity.getRedirectURL('ms');
async function msAuth(interactive) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  const cid = ((settings.mail || {}).msClientId || '').trim();
  if (!cid) throw new Error('noclient');
  const state = Math.random().toString(36).slice(2);
  const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + new URLSearchParams({
    client_id: cid, response_type: 'token', redirect_uri: msRedirect(), scope: MS_SCOPE,
    response_mode: 'fragment', state, prompt: interactive ? 'select_account' : 'none'
  });
  const back = await chrome.identity.launchWebAuthFlow({ url, interactive });
  const p = new URLSearchParams((new URL(back).hash || '').slice(1));
  if (p.get('error') || !p.get('access_token')) throw new Error(interactive ? (p.get('error_description') || p.get('error') || 'login') : 'login');
  if (p.get('state') !== state) throw new Error('login');
  const token = p.get('access_token'), exp = Date.now() + (Number(p.get('expires_in')) || 3600) * 1000 - 60000;
  await chrome.storage.session.set({ msToken: { token, exp } });
  let account = '';
  try {
    const me = await (await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: 'Bearer ' + token } })).json();
    account = me.mail || me.userPrincipalName || me.displayName || '';
  } catch {}
  await chrome.storage.local.set({ msAccount: account });
  return token;
}
async function msToken() {
  const { msToken: t } = await chrome.storage.session.get('msToken');
  if (t && t.token && t.exp > Date.now()) return t.token;
  try { return await msAuth(false); } catch (e) { if (e.message === 'noclient') throw e; return null; }
}
async function fetchOutlook(m) {
  const token = await msToken();
  if (!token) throw new Error('login');
  const H = { headers: { Authorization: 'Bearer ' + token } };
  const q = new URLSearchParams({
    '$filter': 'isRead eq false' + (m.primary !== false ? " and inferenceClassification eq 'focused'" : ''),
    '$top': '25', '$select': 'id,subject,from,bodyPreview,webLink,receivedDateTime'
  });
  const r = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?' + q, H);
  if (r.status === 401) { await chrome.storage.session.remove('msToken'); throw new Error('login'); }
  if (!r.ok) throw new Error('bad');
  const j = await r.json();
  let count = (j.value || []).length;
  try { const fo = await (await fetch('https://graph.microsoft.com/v1.0/me/mailFolders/inbox?$select=unreadItemCount', H)).json(); if (typeof fo.unreadItemCount === 'number') count = fo.unreadItemCount; } catch {}
  const entries = (j.value || []).map(x => ({
    id: x.id, title: x.subject || '(Không có tiêu đề)', summary: x.bodyPreview || '',
    name: x.from?.emailAddress?.name || '', email: x.from?.emailAddress?.address || '', url: x.webLink || ''
  }));
  return { count, entries };
}

let mailBusy = false;
async function checkMail(manual) {
  const { settings = {}, mailSeen = null } = await chrome.storage.local.get(['settings', 'mailSeen']);
  const m = settings.mail || {};
  if ((!m.enabled && !manual) || mailBusy) return null;
  mailBusy = true;
  let status;
  try {
    const f = m.provider === 'outlook' ? await fetchOutlook(m) : await fetchGmail(m);
    status = { ok: true, count: f.count, at: Date.now(), provider: m.provider || 'gmail' };
    const first = !Array.isArray(mailSeen);
    const seen = new Set(first ? [] : mailSeen);
    const fresh = f.entries.filter(e => e.id && !seen.has(e.id));
    f.entries.forEach(e => e.id && seen.add(e.id));
    await chrome.storage.local.set({ mailSeen: [...seen].slice(-300) });
    // Lần đầu bật: chỉ ghi nhận thư đang có, không báo dồn dập
    if (!first && m.enabled) {
      const hits = fresh.filter(e => mailMatch(m, e));
      for (const e of hits.slice(0, 4)) {
        await fire({ name: 'Email mới', type: 'mail', id: 'mail' }, `📧 ${e.name || e.email}: ${e.title}`, 'alert', { url: e.url });
      }
      if (hits.length > 4) await fire({ name: 'Email mới', type: 'mail', id: 'mail' }, `📧 Và ${hits.length - 4} email mới nữa`, 'alert', { url: m.provider === 'outlook' ? hits[4].url : `https://mail.google.com/mail/u/${Number(m.account) || 0}/#inbox` });
    }
  } catch (e) {
    status = { ok: false, error: ['login', 'noclient'].includes(e.message) ? e.message : 'net', at: Date.now(), provider: m.provider || 'gmail' };
  }
  mailBusy = false;
  await chrome.storage.local.set({ mailStatus: status });
  return status;
}
chrome.notifications.onClicked.addListener(async nid => {
  const { notifUrl = {} } = await chrome.storage.session.get('notifUrl');
  if (notifUrl[nid]) { openMail(notifUrl[nid]); openDeal(notifUrl[nid]); chrome.notifications.clear(nid); }
  if (nid.startsWith('shop:')) { const { shopNotif = {} } = await chrome.storage.session.get('shopNotif'); if (shopNotif[nid]) openDeal(shopNotif[nid]); chrome.notifications.clear(nid); }
});

// ---------- Đọc hộ: tóm tắt bằng Gemini ----------
const AI_SYS = 'Bạn là HaoHao, trợ lý "đọc hộ": nói rõ ràng, đi thẳng vào ý, dễ hiểu. Luôn trả lời bằng tiếng Việt. Chỉ dựa vào nội dung được cung cấp, không bịa thêm.';
async function gemini(contents, system, opts = {}) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  const ai = settings.ai || {};
  const key = (ai.key || '').trim();
  if (!key) throw new Error('nokey');
  const model = (ai.model || 'gemini-2.5-flash').trim();
  const gen = { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxTokens || 4096 };
  if (/flash/i.test(model) && /2\.5/.test(model)) gen.thinkingConfig = { thinkingBudget: 0 };   // nhanh hơn, đỡ tốn lượt
  if (opts.video) gen.mediaResolution = 'MEDIA_RESOLUTION_LOW';                                  // video đỡ tốn lượt
  if (opts.json) gen.responseMimeType = 'application/json';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: system }] }, generationConfig: gen })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.error && j.error.message) || ('HTTP ' + r.status);
    if (r.status === 429) throw new Error('quota');
    if (/API key/i.test(msg)) throw new Error('badkey');
    throw new Error(msg);
  }
  const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
  if (opts.meta) opts.meta.finish = j.candidates && j.candidates[0] && j.candidates[0].finishReason;
  if (!text) throw new Error(j.promptFeedback && j.promptFeedback.blockReason ? 'blocked' : 'empty');
  return text;
}
async function aiRead({ mode, src, length, summary, qa = [], question }) {
  const LEN = { ngan: 'rất ngắn (khoảng 80 chữ)', vua: 'vừa phải (khoảng 150 đến 250 chữ)', chitiet: 'chi tiết (khoảng 400 đến 600 chữ)' }[length] || 'vừa phải (khoảng 150 đến 250 chữ)';
  const what = src.kind === 'youtube' ? 'video YouTube này' : src.kind === 'pdf' ? 'tài liệu PDF này' : src.sub === 'sel' ? 'đoạn văn bản này' : 'nội dung trang web này';
  const prompt = `Tóm tắt ${what}, độ dài ${LEN}. Trình bày đúng mẫu sau:
**Tóm lại:** 1 đến 2 câu nêu điều quan trọng nhất.
**Ý chính:**
- ý thứ nhất
- ý thứ hai
(3 đến 7 ý, mỗi ý một dòng bắt đầu bằng "- ")
` + (src.kind === 'youtube' ? `**Mốc thời gian:**
- [mm:ss] nội dung đoạn đó
(4 đến 8 mốc quan trọng nhất, dùng đúng thời gian trong video)
` : '') + `Giữ nguyên số liệu, giá, ngày tháng quan trọng. Không chào hỏi, không nhận xét ngoài lề.`;
  const first = { role: 'user', parts: [] };
  if (src.kind === 'youtube') first.parts.push({ fileData: { fileUri: src.url } });
  else if (src.kind === 'pdf') first.parts.push({ inlineData: { mimeType: 'application/pdf', data: src.pdf } });
  else first.parts.push({ text: `Tiêu đề: ${src.title}\nĐịa chỉ: ${src.url}\n\n--- NỘI DUNG ---\n${src.text}` });
  first.parts.push({ text: prompt });
  const contents = [first];
  if (mode === 'ask') {
    contents.push({ role: 'model', parts: [{ text: summary || '' }] });
    for (const x of qa) if (x.a) contents.push({ role: 'user', parts: [{ text: x.q }] }, { role: 'model', parts: [{ text: x.a }] });
    contents.push({ role: 'user', parts: [{ text: question + '\n(Trả lời ngắn gọn, chỉ dựa trên nội dung ở trên. Nếu nội dung không nhắc tới thì nói rõ là không có.)' }] });
  }
  return gemini(contents, AI_SYS, { video: src.kind === 'youtube' });
}

// ---------- Kho ý tưởng ----------
async function ideaAdd(item) {
  const { ideas = [], settings = {} } = await chrome.storage.local.get(['ideas', 'settings']);
  const it = {
    id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type: item.type || 'text', text: String(item.text || '').slice(0, 5000), title: String(item.title || '').slice(0, 200),
    url: String(item.url || '').slice(0, 1000), sec: Number(item.sec) || 0, at: Date.now(), ai: null
  };
  ideas.unshift(it);
  await chrome.storage.local.set({ ideas: ideas.slice(0, 500) });
  const ai = settings.ai || {}, ideaSet = settings.ideas || {};
  if (ai.key && ideaSet.autoAI === true) ideaSuggest(it.id).catch(() => {});
  return it.id;
}
async function setIdea(id, patch) {
  const { ideas = [] } = await chrome.storage.local.get('ideas');
  const it = ideas.find(x => x.id === id); if (!it) return null;
  Object.assign(it, patch); await chrome.storage.local.set({ ideas }); return it;
}
async function ideaSuggest(id) {
  const { ideas = [], settings = {} } = await chrome.storage.local.get(['ideas', 'settings']);
  const it = ideas.find(x => x.id === id); if (!it) return;
  const plat = { facebook: 'bài đăng Facebook', tiktok: 'video TikTok', chung: 'mạng xã hội' }[(settings.ideas || {}).platform || 'chung'];
  await setIdea(id, { ai: { pending: true } });
  const ask = `Đây là một ý tưởng tôi lưu lại để làm nội dung cho ${plat}.
Hãy đề xuất:
- "titles": 3 tiêu đề hấp dẫn, mỗi cái dưới 70 ký tự
- "caption": 1 caption cho ${plat}, 2 đến 4 câu, emoji vừa phải, có lời kêu gọi tương tác ở cuối
- "hashtags": 5 hashtag phù hợp (có dấu # ở đầu)
Trả về đúng JSON dạng {"titles":["..."],"caption":"...","hashtags":["#..."]}, viết bằng tiếng Việt.`;
  const parts = [];
  if (it.type === 'video' && /youtube\.com\/watch\?v=/.test(it.url)) parts.push({ fileData: { fileUri: it.url.replace(/&t=\d+s?/, '') } });
  parts.push({ text: `Loại: ${it.type}\nNguồn: ${it.title || ''} ${it.url || ''}\nNội dung đã lưu:\n${it.text || '(không có, dựa vào nguồn)'}\n\n${ask}` });
  try {
    const raw = await gemini([{ role: 'user', parts }], AI_SYS, { json: true, video: it.type === 'video' });
    const j = JSON.parse(raw.replace(/^```(json)?|```$/g, '').trim());
    await setIdea(id, { ai: { titles: (j.titles || []).slice(0, 3), caption: j.caption || '', hashtags: (j.hashtags || []).slice(0, 8) } });
  } catch (e) {
    await setIdea(id, { ai: { error: e.message } });
  }
}
// Cửa sổ ghi chú giọng nói (quyền micro được xin cho tiện ích, chỉ hỏi 1 lần)
async function openVoice(target) {
  let left, top;
  try {
    const ds = await chrome.system.display.getInfo();
    const wa = (ds.find(d => d.isPrimary) || ds[0]).workArea;
    left = Math.round(wa.left + wa.width - 440); top = Math.round(wa.top + wa.height - 420);
  } catch {}
  chrome.windows.create({ url: 'voice.html?target=' + (target === 'todo' ? 'todo' : 'idea'), type: 'popup', width: 420, height: 400, left, top, focused: true });
}

// ---------- Dịch ----------
const LANG_NAME = { vi: 'tiếng Việt', en: 'tiếng Anh (English)', zh: 'tiếng Trung giản thể (中文)', ja: 'tiếng Nhật (日本語)', ko: 'tiếng Hàn (한국어)' };
const TR_SYS = 'Bạn là HaoHao, người dịch chuyên nghiệp. Dịch tự nhiên, đúng ngữ cảnh, như người bản xứ viết. Giữ nguyên số liệu, tên riêng, mã token, URL, emoji. Thuật ngữ chuyên ngành phổ biến thì dịch, kèm từ gốc trong ngoặc ở lần đầu nếu cần.';
function parseJson(raw) { return JSON.parse(String(raw).replace(/^```(json)?\s*|```\s*$/g, '').trim()); }
async function aiTranslate({ mode, text, segments, pdf, target, prev = [] }) {
  const to = LANG_NAME[target] || LANG_NAME.vi;
  if (mode === 'text') {
    const raw = await gemini([{ role: 'user', parts: [{ text:
      `Phát hiện ngôn ngữ của đoạn văn dưới đây rồi dịch sang ${to}. Giữ các chỗ xuống dòng.
Nếu đoạn văn đã là ${to} thì "same" = true và "translation" giữ nguyên.
Trả về JSON: {"lang":"tên ngôn ngữ gốc viết bằng tiếng Việt, ví dụ Tiếng Anh","same":false,"translation":"..."}

ĐOẠN VĂN:
${text}` }] }], TR_SYS, { json: true, temperature: 0.2, maxTokens: 8192 });
    const j = parseJson(raw);
    return { lang: j.lang || '', same: !!j.same, translation: j.translation || '' };
  }
  if (mode === 'batch') {
    const raw = await gemini([{ role: 'user', parts: [{ text:
      `Dịch TỪNG phần tử trong mảng JSON "items" sang ${to}. Đây là các đoạn chữ lấy từ cùng một trang web, theo thứ tự, nên hiểu theo ngữ cảnh chung.
Trả về JSON {"lang":"ngôn ngữ gốc chính của các đoạn, viết bằng tiếng Việt","items":[...]} với ĐÚNG ${segments.length} phần tử, cùng thứ tự.
Phần tử nào đã là ${to}, hoặc chỉ là số, ký hiệu, tên riêng, thì giữ nguyên. Không gộp, không tách phần tử.

${JSON.stringify({ items: segments })}` }] }], TR_SYS, { json: true, temperature: 0.2, maxTokens: 16384 });
    const j = parseJson(raw);
    if (!Array.isArray(j.items) || j.items.length !== segments.length) throw new Error('Gemini trả thiếu đoạn, bấm dịch lại nhé');
    return { lang: j.lang || '', items: j.items.map(x => String(x)) };
  }
  if (mode === 'pdf') {
    const ask = `Dịch toàn bộ tài liệu PDF này sang ${to}, theo đúng thứ tự trang. Giữ tiêu đề mục (viết dạng **tiêu đề**), danh sách (dòng bắt đầu bằng "- "), và số liệu. Bảng thì trình bày thành từng dòng "cột: giá trị". Dòng đầu tiên ghi: "Ngôn ngữ gốc: <tên ngôn ngữ bằng tiếng Việt>".`;
    const contents = [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: pdf } }, { text: ask }] }];
    if (prev.length) {
      contents.push({ role: 'model', parts: [{ text: prev.join('\n\n') }] });
      contents.push({ role: 'user', parts: [{ text: 'Dịch tiếp phần còn lại, bắt đầu ngay sau chỗ bạn dừng. Không lặp lại phần đã dịch, không ghi lại dòng Ngôn ngữ gốc.' }] });
    }
    const meta = {};
    let out = await gemini(contents, TR_SYS, { temperature: 0.2, maxTokens: 16384, meta });
    let lang = '';
    const m = out.match(/^\s*Ngôn ngữ gốc:\s*(.+)\n?/);
    if (m) { lang = m[1].trim(); out = out.slice(m[0].length).trim(); }
    return { lang, translation: out, truncated: meta.finish === 'MAX_TOKENS' };
  }
  throw new Error('Kiểu dịch không hợp lệ');
}

// ---------- Pomodoro ----------
// pomo = { phase: 'idle'|'focus'|'break'|'long', endAt, remain (khi tạm dừng), paused, round, task, focusMin }
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
async function pomoSave(p) {
  await chrome.storage.local.set({ pomo: p });
  await chrome.alarms.clear('pomo');
  if (p.phase !== 'idle' && !p.paused && p.endAt) chrome.alarms.create('pomo', { when: p.endAt });
}
async function pomoCfg() { const { settings = {} } = await chrome.storage.local.get('settings'); return { focus: 25, brk: 5, lng: 15, every: 4, ...(settings.pomo || {}) }; }
async function pomoStart({ task, minutes }) {
  const cfg = await pomoCfg();
  const { pomo = {} } = await chrome.storage.local.get('pomo');
  const focusMin = Number(minutes) || Number(cfg.focus) || 25;
  await pomoSave({ phase: 'focus', endAt: Date.now() + focusMin * 60000, paused: false, round: pomo.round || 0,
    task: task !== undefined ? task : (pomo.task || ''), focusMin, day: todayKey() === pomo.day ? pomo.day : todayKey() });
}
async function pomoPause() {
  const { pomo } = await chrome.storage.local.get('pomo');
  if (!pomo || pomo.paused || pomo.phase === 'idle') return;
  await pomoSave({ ...pomo, paused: true, remain: Math.max(0, pomo.endAt - Date.now()) });
}
async function pomoResume() {
  const { pomo } = await chrome.storage.local.get('pomo');
  if (!pomo || !pomo.paused) return;
  await pomoSave({ ...pomo, paused: false, endAt: Date.now() + (pomo.remain || 0), remain: 0 });
}
async function pomoStop() {
  const { pomo = {} } = await chrome.storage.local.get('pomo');
  await pomoSave({ phase: 'idle', round: pomo.round || 0, task: pomo.task || '', focusMin: pomo.focusMin, day: pomo.day });
}
async function pomoSkip() {   // bỏ qua giờ nghỉ, vào phiên mới luôn
  await pomoStart({});
}
async function pomoTick() {
  const { pomo, pomoStats = {} } = await chrome.storage.local.get(['pomo', 'pomoStats']);
  if (!pomo || pomo.phase === 'idle' || pomo.paused) return;
  if (Date.now() < pomo.endAt - 1500) { chrome.alarms.create('pomo', { when: pomo.endAt }); return; }
  const cfg = await pomoCfg();
  const P = { name: 'Pomodoro', type: 'pomo', id: 'pomo' };
  if (pomo.phase === 'focus') {
    const k = todayKey();
    pomoStats[k] = (pomoStats[k] || 0) + 1;
    const keep = Object.keys(pomoStats).slice(-60);
    await chrome.storage.local.set({ pomoStats: Object.fromEntries(keep.map(x => [x, pomoStats[x]])) });
    const round = (pomo.round || 0) + 1, isLong = round % (cfg.every || 4) === 0, mins = isLong ? cfg.lng : cfg.brk;
    await pomoSave({ ...pomo, phase: isLong ? 'long' : 'break', endAt: Date.now() + mins * 60000, round });
    await fire(P, `🍅 Hoàn thành ${pomo.focusMin || cfg.focus} phút Pomodoro${pomo.task ? `: ${pomo.task}` : ''}! Đang cho bạn ${isLong ? 'nghỉ dài' : 'nghỉ'} ${mins} phút.`, 'remind', { end: true, task: pomo.task || '' });
  } else {
    if (cfg.autoNext) {
      await pomoStart({});
      await fire(P, `☕ Hết giờ nghỉ! Tự vào phiên ${(pomo.round || 0) + 1}, cố lên nhé 💪`, 'remind');
    } else {
      await pomoSave({ ...pomo, phase: 'idle', paused: false });
      await fire(P, `☕ Hết giờ nghỉ! Sẵn sàng vào phiên ${(pomo.round || 0) + 1} chưa?`, 'remind', { next: true });
    }
  }
}

async function pomoTaskDone(task) {   // "Hoàn thành việc" sau phiên tập trung: tick việc trong Todo
  if (!task) return;
  const { todos = [] } = await chrome.storage.local.get('todos');
  const t = todos.find(x => !x.done && x.text === task);
  if (t) { t.done = true; await chrome.storage.local.set({ todos }); }
}

// ---------- Nhắc nhanh bằng câu tiếng Việt (menu chuột phải, ô nhập trong nhánh Nhắc) ----------
async function quickRemind(text) {
  const r = HT.parseWhen(text);
  const { todos = [] } = await chrome.storage.local.get('todos');
  const item = { id: 't' + Date.now().toString(36), text: r.task.slice(0, 200), done: false, due: r.due ? HT.localISO(r.due) : '', notified: false };
  todos.push(item);
  await chrome.storage.local.set({ todos });
  return { ok: true, item, due: r.due ? r.due.getTime() : 0 };
}

// ---------- Menu chuột phải ----------
function makeMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'hh', title: '🐹 HaoHao', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: 'hh-remind', parentId: 'hh', title: '🔔 Nhắc tôi: “%s”', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'hh-note', parentId: 'hh', title: '📝 Lưu Note', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: 'hh-todo', parentId: 'hh', title: '☑️ Thêm vào Todo', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'hh-translate', parentId: 'hh', title: '🌐 Dịch', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: 'hh-explain', parentId: 'hh', title: '💡 Giải thích', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'hh-summary', parentId: 'hh', title: '✨ Tóm tắt trang này', contexts: ['page', 'selection'] });
  });
}
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const sel = (info.selectionText || '').trim();
  const toTab = msg => tab && tab.id && chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  if (info.menuItemId === 'hh-remind' && sel) {
    const r = await quickRemind(sel);
    const when = r.due ? new Date(r.due).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
    chrome.notifications.create('hr' + Date.now(), { type: 'basic', iconUrl: 'icons/icon128.png', title: '🐹 Đã đặt nhắc',
      message: when ? `${when}: ${r.item.text}` : `Đã thêm "${r.item.text}" vào Todo. Chưa thấy giờ trong câu, bạn bấm ⏰ để hẹn giờ nhé.` });
    toTab({ type: 'hh-open', tab: 'bell' });
  }
  if (info.menuItemId === 'hh-todo' && sel) {
    const { todos = [] } = await chrome.storage.local.get('todos');
    todos.push({ id: 't' + Date.now().toString(36), text: sel.slice(0, 200), done: false, due: '', notified: false });
    await chrome.storage.local.set({ todos });
    toTab({ type: 'hh-open', tab: 'todo' });
  }
  if (info.menuItemId === 'hh-note') {
    await ideaAdd({ type: sel ? 'text' : 'page', text: sel, title: tab ? tab.title : '', url: tab ? tab.url : '' });
    toTab({ type: 'hh-open', tab: 'idea' });
  }
  if (info.menuItemId === 'hh-translate') toTab({ type: 'hh-open', tab: 'info', sub: 'dich', text: sel });
  if (info.menuItemId === 'hh-explain') toTab({ type: 'hh-open', tab: 'info', sub: 'explain', text: sel });
  if (info.menuItemId === 'hh-summary') toTab({ type: 'hh-open', tab: 'info', sub: 'read', run: true });
});

// ---------- 💡 Giải thích ----------
async function aiExplain({ text, mode, context }) {
  const how = {
    de: 'Giải thích thật dễ hiểu như nói với người không chuyên, 2 đến 4 câu, không dùng thuật ngữ khó.',
    chitiet: 'Giải thích chi tiết: định nghĩa, cách hoạt động hoặc cách tính (nếu có), khi nào dùng, lưu ý thường gặp. Dùng gạch đầu dòng "- ".',
    vidu: 'Giải thích ngắn gọn 1 đến 2 câu, rồi cho 2 ví dụ cụ thể, gần gũi với người Việt (có số liệu minh hoạ nếu hợp).'
  }[mode] || '';
  return gemini([{ role: 'user', parts: [{ text:
    `Người dùng đang đọc trang "${context || ''}" và bôi đen cụm sau, muốn biết nó nghĩa là gì:
"${String(text).slice(0, 2000)}"
${how}
Nếu là tiếng nước ngoài thì ghi nghĩa tiếng Việt trước. Bắt đầu bằng **tên cụm từ** in đậm. Trả lời bằng tiếng Việt.` }] }], AI_SYS, { temperature: 0.3, maxTokens: 2048 });
}

// ---------- 🛒 Mua sắm (Shopee, TikTok Shop): mở link tiếp thị ----------
// Chỉ mở link tiếp thị khi người dùng tự bấm (nút Mua ngay, So giá, Tìm). Không tự thay link khi đang lướt web.
function openDeal(url) {
  if (typeof url !== 'string' || !/^https:\/\//.test(url) || MAIL_HOSTS.some(h => url.startsWith(h))) return;
  chrome.tabs.create({ url: HT.aff(url) });
}
// ---------- 🎟️ Kho mã giảm giá ----------
// Lấy từ file coupons.json trên GitHub (chủ app cập nhật); mạng lỗi thì dùng bản đóng gói sẵn trong tiện ích.
async function syncCoupons() {
  let feed = null;
  try { const r = await fetch(HT.COUPON_FEED + '?t=' + Math.floor(Date.now() / 3600e3), { cache: 'no-store' }); if (r.ok) feed = await r.json(); } catch {}
  if (!feed) { const { couponFeed } = await chrome.storage.local.get('couponFeed'); if (couponFeed && couponFeed.coupons) return { ok: true, cached: true, n: couponFeed.coupons.length }; }
  if (!feed) { try { feed = await (await fetch(chrome.runtime.getURL('coupons.json'))).json(); } catch { return { ok: false }; } }
  const coupons = (feed.coupons || []).filter(c => c && c.id && HT.couponLive(c)).slice(0, 200);
  const hubs = (feed.hubs || []).filter(h => h && /^https:\/\//.test(h.url)).slice(0, 12);
  await chrome.storage.local.set({ couponFeed: { at: Date.now(), updated: feed.updated || '', coupons, hubs } });
  return { ok: true, n: coupons.length };
}

// ---------- 🔍 Tìm cùng món ở shop khác trên Shopee ----------
// Shopee không cho đọc từ nền, nên dùng 1 tab ẩn: mở trang tìm kiếm (sắp theo giá) để lấy danh sách,
// rồi mở lần lượt vài sản phẩm rẻ hơn để đọc tên shop và chấm điểm kiểm tra, xong đóng tab.
const scanJobs = new Map();
function scanIn(tabId, url, type, ms) {
  return new Promise(resolve => {
    const t = setTimeout(() => { scanJobs.delete(tabId); resolve(null); }, ms);
    scanJobs.set(tabId, { type, done: r => { clearTimeout(t); scanJobs.delete(tabId); resolve(r); } });
    chrome.tabs.update(tabId, { url });
  });
}
let sameQueue = Promise.resolve();
function sameFind(msg, sender) { const run = sameQueue.then(() => sameFindOne(msg, sender)); sameQueue = run.catch(() => {}); return run; }
async function sameFindOne({ q, key, title, price }, sender) {
  const ck = 'same2:' + key, cache = (await chrome.storage.session.get(ck))[ck];
  if (cache && Date.now() - cache.at < 20 * 60e3) return { ...cache, cached: true };
  const opener = sender.tab || {};
  // tab trống trước, ghi nhận việc rồi mới tải trang (để trang không chạy trước khi kịp ghi nhận)
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false, index: (opener.index ?? 0) + 1, windowId: opener.windowId });
  try {
    const list = await scanIn(tab.id, HT.shopeeSearchUrl(q), 'search', 30000);
    if (!list) return { ok: false, error: 'timeout' };
    const same = list.filter(x => x.key !== key).map(x => ({ ...x, sim: HT.titleSim(title, x.title) })).filter(x => x.sim >= 0.55 && x.price >= price * 0.4);
    const cheaper = same.filter(x => x.price < price * 0.99).sort((a, b) => a.price - b.price);
    // ứng viên: 2 món rẻ nhất + 2 món có dấu hiệu uy tín nhất (Mall, Yêu thích, bán nhiều)
    const rep = x => (x.mall ? 3 : x.preferred ? 2 : 0) + (x.sold >= 1000 ? 1 : 0) + (x.rating >= 4.8 ? 1 : 0);
    const cands = [...new Map([...cheaper.slice(0, 2), ...[...cheaper].sort((a, b) => rep(b) - rep(a) || a.price - b.price).slice(0, 2)].map(x => [x.key, x])).values()];
    const checked = [];
    for (const c of cands) {
      const r = await scanIn(tab.id, c.url, 'item', 20000);
      const info = (r && r.info) || { rating: c.rating, ratingCount: null, sold: c.sold, mall: c.mall, preferred: c.preferred, shipFrom: c.overseas ? 'Nước ngoài' : '' };
      const ts = HT.trustScore(info);
      checked.push({ key: c.key, url: c.url, title: c.title, price: (r && r.price) || c.price, shopName: (r && r.shopName) || '', score: ts.score, level: ts.level, cls: ts.cls,
        rating: info.rating || c.rating, sold: info.sold ?? c.sold, mall: !!(info.mall || c.mall), preferred: !!(info.preferred || c.preferred), full: !!(r && r.info) });
    }
    // 3 lựa chọn: đáng mua nhất (rẻ nhất trong shop điểm cao), rẻ nhất, uy tín nhất
    const byPrice = [...checked].sort((a, b) => a.price - b.price), byScore = [...checked].sort((a, b) => b.score - a.score || a.price - b.price);
    const best = byPrice.find(x => x.score >= 75) || byScore[0];
    const picks = [];
    const add = (x, tag) => { if (!x) return; const o = picks.find(y => y.key === x.key); if (o) { if (tag && !o.tags.includes(tag)) o.tags.push(tag); } else picks.push({ ...x, tags: tag ? [tag] : [] }); };
    add(best, 'best'); add(byPrice[0], 'cheap'); add(byScore[0], 'trust');
    for (const x of byScore) if (picks.length < 3) add(x, '');
    const res = { ok: true, at: Date.now(), total: same.length, options: picks.slice(0, 3) };
    await chrome.storage.session.set({ [ck]: res });
    return res;
  } finally { chrome.tabs.remove(tab.id).catch(() => {}); }
}
