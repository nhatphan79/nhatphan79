// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
importScripts('common.js', 'i18n.js');

// ngôn ngữ giao diện (vi mặc định / en) cho thông báo, menu chuột phải và câu trả lời của Gemini
const loadLang = async () => { const { settings = {} } = await chrome.storage.local.get('settings'); HT.setLang(settings.lang); return HT.lang; };
chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && ch.settings && ((ch.settings.newValue || {}).lang || 'vi') !== ((ch.settings.oldValue || {}).lang || 'vi')) { HT.setLang((ch.settings.newValue || {}).lang); makeMenus(); }
});
// thông báo của Chrome: dịch tiêu đề / nội dung / nút khi đang dùng tiếng Anh
async function notifyTr(id, opt) {
  await loadLang();
  const { settings = {} } = await chrome.storage.local.get('settings');
  const o = { ...opt, title: HT.tr(opt.title || ''), message: HT.tr(opt.message || ''), silent: settings.sound === false };   // 🔕 im lặng: thông báo Windows không kêu
  if (opt.buttons) o.buttons = opt.buttons.map(b => ({ ...b, title: HT.tr(b.title) }));
  return chrome.notifications.create(id, o);
}

const DEFAULT_RULES = [
  { id: 'r3', type: 'price', name: 'BTC vượt 120k', enabled: false, source: 'coingecko', coin: 'bitcoin', op: 'above', value: 120000 },
  { id: 'r4', type: 'reminder', name: 'Uống nước', icon: '💧', enabled: true, kind: 'interval', minutes: 180, from: '08:00', to: '21:00', message: 'Uống một ly nước nhé!' },
  { id: 'r6', type: 'reminder', name: 'Thắp hương', icon: '🙏', enabled: true, kind: 'lunar', lunarDays: [30, 1, 14, 15], times: ['06:00'], message: 'Thắp hương, dâng cúng', prep: { on: true, time: '17:00' }, prepMessage: 'Mai là ngày thắp hương, nhớ mua hoa quả, nhang đèn' },
  { id: 'r8', type: 'reminder', name: 'Tan làm', icon: '🏠', enabled: true, kind: 'daily', times: ['17:00'], days: [1, 2, 3, 4, 5], message: 'Tan làm rồi, về thôi! Nhớ chấm công nhé' }
];

// 🛡️ Chặn quảng cáo: bật/tắt bộ luật chặn mạng quảng cáo + danh sách trang được phép (tắt chặn)
async function applyAdBlock() {
  try {
    const { settings = {} } = await chrome.storage.local.get('settings');
    const { proLock } = await chrome.storage.local.get('proLock'), on = settings.adBlock !== false && !proLock;   // V1.65: hết dùng thử, chưa mua Pro → tắt chặn quảng cáo
    await chrome.declarativeNetRequest.updateEnabledRulesets(on ? { enableRulesetIds: ['ads'] } : { disableRulesetIds: ['ads'] });
    // chừa trang tiếp thị + 1.10.174: trang làm việc (AI Studio, Cloudflare, GitHub, Google tài khoản…) – chặn ở đây làm hỏng nút, hộp thoại
    const allow = ['shopee.vn', 'shope.ee', 'tiktok.com', 'collshp.com', 'aistudio.google.com', 'cloud.google.com', 'accounts.google.com', 'myaccount.google.com', 'mail.google.com', 'docs.google.com', 'drive.google.com', 'calendar.google.com', 'gemini.google.com', 'dash.cloudflare.com', 'github.com', 'claude.ai', 'chatgpt.com', 'notion.so', 'figma.com', 'canva.com', 'microsoft.com', 'live.com', 'office.com', 'apple.com', 'zalo.me', 'chat.zalo.me', 'accesstrade.vn', 'riohub.vn', 'affiliate.shopee.vn', 'seller.shopee.vn', 'banhang.shopee.vn'];
    const old = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: old.map(r => r.id),
      addRules: allow.map((h, i) => ({ id: 1000 + i, priority: 2, action: { type: 'allowAllRequests' }, condition: { requestDomains: [h], resourceTypes: ['main_frame', 'sub_frame'] } })) });
  } catch (e) { console.warn('adblock', e); }
}
chrome.runtime.onStartup.addListener(applyAdBlock);
// 🛡️ Tab tự bật (popunder): trang tự mở tab sang trang KHÁC mà người dùng không bấm vào link đó → HaoHao đóng ngay, quay lại trang đang xem.
//  Giữ lại: link người dùng bấm (kể cả Ctrl/chuột giữa/chuột phải → mở tab mới), trang cùng web, cửa sổ đăng nhập/chia sẻ dạng popup, Shopee/TikTok.

const popWatch = new Map(), userClick = new Map();   // userClick: tabId → { host, t } lần cuối người dùng bấm link
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const sameSite = (a, b) => !!a && !!b && (a === b || a.endsWith('.' + b) || b.endsWith('.' + a) || a.split('.').slice(-2).join('.') === b.split('.').slice(-2).join('.'));
// Chỉ đóng tab quảng cáo thật: web cờ bạc / cá cược / mạng quảng cáo popup. Xét TÊN MIỀN (không xét ?v=… để khỏi bắt nhầm link YouTube).
const POP_HOST = /(casino|cacuoc|ca-?cuoc|gamebai|game-?bai|nohu|no-?hu|xoso|xo-?so|taixiu|tai-?xiu|xocdia|xoc-?dia|lode|lo-?de|danhde|soicau|banca|ban-?ca|baccarat|jackpot|slot(?:s|game|vip)|rikvip|sunwin|hitclub|iwin|b52|789club|kubet|kuwin|nhacai|keonhacai|okvip|1xbet|8xbet|dafabet|12bet|letou|bk8|ok365|win55|twin68|(?:^|[.-])[a-z0-9]{1,4}88(?!\d)|(?:^|[.-])[a-z0-9]{0,3}bet(?:vip|club|win|\d*)?(?=[.-])|(?:^|[.-])[a-z]{0,6}(?:68|79|86|99|777)(?:club|win|vip|game)\b)/i;
const POP_NET = /(^|\.)(popads|popcash|propellerads|propellerclick|adsterra|adsterratech|exoclick|exosrv|juicyads|adcash|clickadu|hilltopads|galaksion|onclickads|onclkds|onclickperformance|popmyads|trafficstars|admaven|adxpremium|richads|ad-maven|realsrv|tsyndicate|a-ads|clickaine|zeroredirect\d*|bebi|adskeeper|monetag|profitablecpmrate|highperformanceformat|effectivegatecpm|displayvertising|pemsrv|whitebit)\.\w+$/i;
const POP_QS = /(utm_medium=(popunder|popup|pop|clickunder)|[?&](popunder|clickunder)=|\/popunder)/i;
const SHADY_TLD = /\.(xyz|top|click|icu|buzz|cfd|sbs|cyou|lol|monster|bond|quest|rest|fun|vip|win|bet|casino|tk|ml|ga|cf|gq)$/i;
// trang quen thuộc: không bao giờ đóng
const SAFE_HOST = /(^|\.)(youtube\.com|youtu\.be|google\.[a-z.]+|gstatic\.com|facebook\.com|fb\.com|fb\.watch|messenger\.com|instagram\.com|zalo\.me|zalo\.vn|tiktok\.com|shopee\.vn|shope\.ee|collshp\.com|lazada\.vn|tiki\.vn|wikipedia\.org|github\.com|x\.com|twitter\.com|t\.co|reddit\.com|microsoft\.com|live\.com|office\.com|apple\.com|netflix\.com|spotify\.com|discord\.com|telegram\.org|t\.me|vnexpress\.net|dantri\.com\.vn|tuoitre\.vn|thanhnien\.vn|baomoi\.com|zingnews\.vn|znews\.vn)$/i;
// 1.9.54: trang chủ app cho phép mở (không bao giờ đóng), còn lại chặn như cũ
const ALLOW_HOST = /(^|\.)(d3al\.xyz|predict\.fun)$/i;
const popBad = u => { const h = hostOf(u); return !!h && (POP_HOST.test(h) || POP_NET.test(h) || POP_QS.test(u)); };
const POP_RE = POP_HOST;   // giữ tên cũ cho chỗ khác dùng
chrome.runtime.onMessage.addListener((m, s) => {
  if (m && m.type === 'hh-user-link' && s.tab) userClick.set(s.tab.id, { host: hostOf(m.href), href: String(m.href || '').slice(0, 2000), t: Date.now() });
  if (m && m.type === 'hh-ad-note' && s.tab) chrome.tabs.sendMessage(s.tab.id, { type: 'hh-ad-toast', kind: m.kind, n: m.n || 0 }, { frameId: 0 }).catch(() => {});
});
chrome.tabs.onCreated.addListener(t => { if (t.openerTabId) { popWatch.set(t.id, t.openerTabId); setTimeout(() => popWatch.delete(t.id), 20000); } });
chrome.tabs.onRemoved.addListener(id => { popWatch.delete(id); userClick.delete(id); });
chrome.tabs.onUpdated.addListener(async (id, ch, tab) => {
  if (!popWatch.has(id)) return;
  const url = ch.url || tab.pendingUrl || tab.url || ''; if (!/^https?:/.test(url)) return;
  const host = hostOf(url); if (!host || SAFE_HOST.test(host) || ALLOW_HOST.test(host)) return;          // trang quen thuộc: để yên (vẫn canh tiếp nếu nó chuyển hướng sang web cờ bạc)
  const { settings = {}, proLock } = await chrome.storage.local.get(['settings', 'proLock']); if (settings.adBlock === false || proLock) return;
  // 1.9.56: trong lúc chờ đọc cài đặt, tab có thể đã bị bỏ khỏi danh sách canh (đóng tab, chuyển trang) → không còn mã tab mở ra nó: thôi
  const opener = popWatch.get(id); if (typeof opener !== 'number') return;
  let op = null; try { op = await chrome.tabs.get(opener); } catch {}
  const oh = hostOf(op && op.url);
  // chỉ canh tab do trang web mở; trang của HaoHao / Chrome (Cài đặt, Tab mới…) mở link là người dùng bấm → để yên
  if (!op || !/^https?:/.test(op.url || op.pendingUrl || '')) { popWatch.delete(id); return; }
  if (popBad(op.url)) { popWatch.delete(id); return; }                              // đang ở chính trang cờ bạc: để yên
  if (sameSite(oh, host)) return;                                                   // cùng trang web
  const uc = userClick.get(opener);
  const clicked = uc && Date.now() - uc.t < 4000 && (sameSite(uc.host, host) || (uc.href || '').includes(host));   // người dùng bấm đúng link này (kể cả link chuyển hướng l.facebook.com?u=…)
  // ĐÓNG khi: web cờ bạc / mạng quảng cáo popup; hoặc tên miền lạ đuôi rẻ tiền (.xyz, .top…) mà người dùng không hề bấm link đó
  const bad = popBad(url) || (!clicked && SHADY_TLD.test(host));
  if (!bad) return;                                                                 // web bình thường: để yên (vẫn canh tiếp trong 20 giây phòng chuyển hướng)
  popWatch.delete(id);
  chrome.tabs.remove(id).catch(() => {});
  if (op) { chrome.tabs.update(op.id, { active: true }).catch(() => {}); chrome.tabs.sendMessage(op.id, { type: 'hh-ad-toast', kind: 'pop', n: 1 }, { frameId: 0 }).catch(() => {}); }
  const { popBlocked = 0 } = await chrome.storage.local.get('popBlocked'); chrome.storage.local.set({ popBlocked: popBlocked + 1 });
});
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local' || !ch.settings) return;
  const a = ch.settings.oldValue || {}, b = ch.settings.newValue || {};
  if ((a.adBlock !== false) !== (b.adBlock !== false)) applyAdBlock();
});

const DEFAULT_WATCH = [{ source: 'coingecko', coin: 'bitcoin', sym: 'BTC' }, { source: 'coingecko', coin: 'ethereum', sym: 'ETH' }, { source: 'coingecko', coin: 'solana', sym: 'SOL' }];

// ⭐ V1.65: HaoHao Pro – trạng thái mở khoá (dùng thử 2 tháng / mã kích hoạt / máy chủ app)
const b64d = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(s).length / 4) * 4, '=')), c => c.charCodeAt(0));
async function proVerify(code, mid) {
  try {
    const [h, b, g] = String(code || '').trim().split('.'); if (h !== 'HHP1' || !b || !g) return null;
    const data = b64d(b), key = await crypto.subtle.importKey('raw', b64d(HT.PRO.pub), { name: 'Ed25519' }, false, ['verify']);
    if (!(await crypto.subtle.verify({ name: 'Ed25519' }, key, b64d(g), data))) return null;
    const j = JSON.parse(new TextDecoder().decode(data)); return j && j.m === mid ? j : null;
  } catch { return null; }
}
async function proStatus() {
  const { proStart, proLic, spyKeys } = await chrome.storage.local.get(['proStart', 'proLic', 'spyKeys']);
  const now = Date.now(), id = await hhId(), mid = id.slice(0, 12).toUpperCase();
  const owner = !!(spyKeys && (spyKeys.at || spyKeys.rh)), start = proStart || now, trialEnd = start + HT.PRO.trialDays * 864e5;
  const lic = proLic ? await proVerify(proLic, mid) : null, pro = !!(lic && (lic.e === 0 || lic.e > now)), trial = now < trialEnd;
  return { ok: owner || pro || trial, owner, trial, trialEnd, trialLeft: Math.max(0, Math.ceil((trialEnd - now) / 864e5)), pro, plan: lic && lic.p, exp: lic ? lic.e : null, code: HT.machineCode(id) };
}
async function proSync() {
  const { proStart } = await chrome.storage.local.get('proStart'); if (!proStart) await chrome.storage.local.set({ proStart: Date.now() });
  const st = await proStatus(), { proLock } = await chrome.storage.local.get('proLock');
  if (!!proLock !== !st.ok) { await chrome.storage.local.set({ proLock: !st.ok }); applyAdBlock(); }
  return st;
}
chrome.runtime.onStartup.addListener(() => { proSync(); chrome.alarms.create('pro-check', { periodInMinutes: 360 }); });
chrome.runtime.onInstalled.addListener(details => { proSync(); chrome.alarms.create('pro-check', { periodInMinutes: 360 }); });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'pro-check') proSync(); });
chrome.runtime.onInstalled.addListener(async details => {
  if (details && details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('options.html#about') }).catch(() => {});   // cài lần đầu: mở trang Giới thiệu
  if (details && details.reason === 'install') { const { unlock } = await chrome.storage.local.get('unlock'); if (!unlock) await chrome.storage.local.set({ unlock: { steps: {}, until: Date.now() + 7 * 864e5, trial: true } }); }   // V1.10: máy cài mới dùng ngay 7 ngày, chưa cần mở khoá
  { const { tipStart } = await chrome.storage.local.get('tipStart'); if (tipStart == null) await chrome.storage.local.set({ tipStart: details && details.reason === 'install' ? -1 : 1 }); }   // V1.2: hướng dẫn 15 phút đầu – chỉ máy cài mới (-1 = chờ lần mở đầu tiên)
  const { rules, watch, todos } = await chrome.storage.local.get(['rules', 'watch', 'todos']);
  // mặc định BTC, ETH, SOL, BNB; ai còn danh sách mặc định cũ (BTC, SOL) thì nâng lên danh sách mới
  // mặc định BTC, ETH, SOL; ai còn nguyên danh sách mặc định cũ thì đổi sang danh sách mới
  if (!watch || (Array.isArray(watch) && ['bitcoin,solana', 'bitcoin,ethereum,solana,binancecoin'].includes(watch.map(w => w.coin).join()))) await chrome.storage.local.set({ watch: DEFAULT_WATCH });
  // bản mới đã bỏ Lọc: dọn các điều kiện lọc từ khoá cũ
  if (Array.isArray(rules) && rules.some(r => r.type === 'keyword')) await chrome.storage.local.set({ rules: rules.filter(r => r.type !== 'keyword') });
  if (!todos) await chrome.storage.local.set({ todos: [] });
  { const { rules: r0, remDefaultsV2 } = await chrome.storage.local.get(['rules', 'remDefaultsV2']);
    if (Array.isArray(r0) && !remDefaultsV2) {
      const w = r0.find(x => x.id === 'r4'); if (w && w.kind === 'interval' && Number(w.minutes) === 60 && w.from === '08:00') w.minutes = 90;
      for (const x of DEFAULT_RULES) if (x.type === 'reminder' && !r0.some(y => y.id === x.id || y.name === x.name)) r0.push(x);
      await chrome.storage.local.set({ rules: r0, remDefaultsV2: true });
    } else if (!remDefaultsV2) await chrome.storage.local.set({ remDefaultsV2: true });
  }
  // 1.9.73: Uống nước mặc định 3 tiếng/lần (chỉ đổi nếu người dùng chưa tự sửa: vẫn 90 phút)
  { const { rules: r1, remDefaultsV3 } = await chrome.storage.local.get(['rules', 'remDefaultsV3']);
    if (!remDefaultsV3) { if (Array.isArray(r1)) { const w = r1.find(x => x.id === 'r4'); if (w && w.kind === 'interval' && Number(w.minutes) === 90) w.minutes = 180; await chrome.storage.local.set({ rules: r1 }); } await chrome.storage.local.set({ remDefaultsV3: true }); }
  }
  // 1.9.74: chưa từng cài đặt email → tự bật báo Gmail (chỉ báo thư đến sau lúc bật)
  { const { settings: s2, mailDefaultV1 } = await chrome.storage.local.get(['settings', 'mailDefaultV1']);
    if (!mailDefaultV1) { if (s2 && !s2.mail) { await chrome.storage.local.set({ settings: { ...s2, mail: { enabled: true, provider: 'gmail', primary: true, skipJunk: true, mode: 'all' } }, mailSeen: null }); } await chrome.storage.local.set({ mailDefaultV1: true }); }
  }
  // 🛡️ chặn quảng cáo tự động mọi trang: bỏ danh sách "tắt trên trang này" cũ, bật lại chặn
  { const { settings: s0 } = await chrome.storage.local.get('settings'); if (s0 && (s0.adAllow || s0.adCustom || s0.adBlock === false)) { const s1 = { ...s0, adBlock: true }; delete s1.adAllow; delete s1.adCustom; await chrome.storage.local.set({ settings: s1 }); } }
  const { stocks } = await chrome.storage.local.get('stocks');
  if (!stocks || (Array.isArray(stocks) && stocks.join() === 'FPT,HPG,VCB,VNM')) await chrome.storage.local.set({ stocks: ['FPT', 'TCB', 'VIC'] });   // 📈 mặc định 3 mã VN30
  // bản mới đã bỏ Clipboard: xoá lịch sử copy cũ
  await chrome.storage.local.remove('clips');
  if (!rules) {
    await chrome.storage.local.set({
      rules: DEFAULT_RULES,
      settings: { mascotEnabled: true, hiddenSites: [], mail: { enabled: true, provider: 'gmail', primary: true, skipJunk: true, mode: 'all' } },   // 📧 cài mới: tự bật báo Gmail (tài khoản đang đăng nhập trên Chrome)
      log: [], priceState: {}
    });
  }
  scheduleAll(); scheduleTodos(); makeMenus(); syncCoupons(); applyAdBlock();
});
chrome.runtime.onStartup.addListener(() => { scheduleAll(); scheduleTodos(); });
// mở lại Chrome: không tự phát nhạc nền (khách muốn nghe thì tự bấm)
chrome.runtime.onStartup.addListener(async () => { const { settings = {} } = await chrome.storage.local.get('settings'); if (settings.pomo && settings.pomo.music) chrome.storage.local.set({ settings: { ...settings, pomo: { ...settings.pomo, music: '' } } }); });
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
    if (t.done || t.notified || t.mute || !t.due) continue;   // mute: bỏ tick ở tab Nhắc = không nhắc
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

// 🧹 Việc đã xong: giữ hết trong ngày, sang ngày mới thì tự xoá (ghi doneAt lúc thấy xong lần đầu)
async function cleanDoneTodos() {
  const { todos = [] } = await chrome.storage.local.get('todos');
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  let changed = false;
  const keep = [];
  for (const t of todos) {
    if (t.done && !t.doneAt) { t.doneAt = Date.now(); changed = true; }
    if (t.done && t.doneAt < d0.getTime()) { changed = true; continue; }
    if (!t.done && t.doneAt) { delete t.doneAt; changed = true; }
    keep.push(t);
  }
  if (changed) await chrome.storage.local.set({ todos: keep });
}
async function scheduleAll() {
  const { rules = [] } = await chrome.storage.local.get('rules');
  await clearAlarms(n => !n.startsWith('todo:') && !n.startsWith('snz:') && !n.startsWith('fs:') && n !== 'pomo');
  chrome.alarms.create('desk-sync', { delayInMinutes: 1, periodInMinutes: 1 });
  chrome.alarms.create('mail-check', { delayInMinutes: 0.5, periodInMinutes: 1 });
  chrome.alarms.create('todo-clean', { delayInMinutes: 0.2, periodInMinutes: 30 });
  chrome.alarms.create('coupon-sync', { delayInMinutes: 1, periodInMinutes: 60 });
  chrome.alarms.create('prod-auto', { delayInMinutes: 20, periodInMinutes: 180 });
  chrome.alarms.clear('live-chk');   // 1.10.249: bỏ Săn live   // 1.10.170: săn live – shop khách theo dõi đang live thì báo
  chrome.alarms.create('hh-ping', { delayInMinutes: 0.5, periodInMinutes: 180 });   // 1.10.126: đếm máy đang dùng, 1 lần/ngày   // 1.10.115: canh giá món đã lưu, mỗi ngày 1 lần
  chrome.alarms.clear('prod-check');   // đã bỏ kiểm tra giá ngầm định kỳ: khách tự bấm cập nhật
  chrome.alarms.clear('voucher-scan');   // đã bỏ quét voucher tự động
  if (rules.some(r => r.enabled && r.type === 'price')) {
    chrome.alarms.create('price-check', { delayInMinutes: 0.5, periodInMinutes: 1 });
  }
  for (const r of rules) {
    if (!r.enabled || r.type !== 'reminder') continue;
    const name = 'rem:' + r.id;
    if (r.kind === 'daily' || r.kind === 'lunar') HT.timesOf(r).forEach((t, i) => chrome.alarms.create(name + ':' + i, { when: nextDaily(t), periodInMinutes: 1440 }));
    if (r.kind === 'lunar' && r.prep && r.prep.on && r.prep.time) chrome.alarms.create(name + ':p', { when: nextDaily(r.prep.time), periodInMinutes: 1440 });
    else if (r.kind === 'interval' && Number(r.minutes) >= 1) chrome.alarms.create(name, { when: nextSlot(r) });
    else if (r.kind === 'once' && r.datetime) {
      const t = new Date(r.datetime).getTime();
      if (t > Date.now()) chrome.alarms.create(name, { when: t });
    }
  }
}

// lần nhắc kế tiếp của nhắc "cứ N phút": tính từ giờ bắt đầu (from), trong khung from–to, hết khung thì sang ngày sau
function nextSlot(r, after = Date.now()) {
  const step = Math.max(1, Number(r.minutes) || 60) * 60000, hm = s => (String(s || '').match(/^(\d{1,2}):(\d{2})$/) || []).slice(1).map(Number);
  const [fh = 0, fm = 0] = hm(r.from), [th = 23, tm = 59] = hm(r.to);
  for (let add = 0; add < 3; add++) {
    const b = new Date(after); b.setDate(b.getDate() + add); b.setHours(fh, fm, 0, 0);
    const e = new Date(b); e.setHours(th, tm, 59, 999); if (e <= b) e.setDate(e.getDate() + 1);
    let t = b.getTime(); if (t <= after) t += Math.ceil((after - t + 1) / step) * step;
    if (t <= e.getTime()) return t;
  }
  return after + step;
}
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === 'price-check') return checkPrices();
  if (a.name === 'desk-sync') { pomoGuard().catch(() => {}); return syncApp(); }
  if (a.name === 'pomo') return pomoTick();
  if (a.name === 'mail-check') return checkMail(false);
  if (a.name === 'todo-clean') return cleanDoneTodos();
  if (a.name === 'coupon-sync') { updCheck(); return syncCoupons(); }
  if (a.name === 'prod-auto') return autoCheckPrices();
  if (a.name === 'live-chk') return chrome.alarms.clear('live-chk');
  if (a.name === 'price-flush') return priceFlush();
  if (a.name === 'hh-ping') return hhPing();
  if (a.name.startsWith('fs:')) {
    const { fsRem = {} } = await chrome.storage.local.get('fsRem'), x = fsRem[a.name]; delete fsRem[a.name]; await chrome.storage.local.set({ fsRem });
    if (x && /^https:\/\/(www\.)?shopee\.vn\//.test(x.url || '')) await fire({ id: a.name, name: '⚡ HaoHao nhắc Flash Sale', type: 'price' }, `${x.title}: 5 phút nữa Flash Sale${x.price ? ', còn ' + Number(x.price).toLocaleString('vi-VN') + 'đ' : ''}. Vào canh mua nhé!`, 'alert', { url: HT.aff(x.url) });
    return;
  }
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
    if (!snooze && r.kind === 'interval') chrome.alarms.create('rem:' + r.id, { when: nextSlot(r, Date.now() + 1000) });   // hẹn lần kế tiếp
    const now = new Date();
    if (!snooze && r.kind === 'daily' && r.days && r.days.length && !r.days.includes(now.getDay())) return;
    if (!snooze && r.kind === 'interval' && !HT.inWindow(r.from, r.to, new Date(now.getTime() + 60000))) return;
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
  const key = r => r.source === 'dexscreener' ? 'dx:' + r.coin.trim() : r.source === 'gold' ? 'gd:' + r.coin : r.source === 'stock' ? 'st:' + r.coin : 'cg:' + r.coin.trim().toLowerCase();
  const quotes = {};
  const cgIds = [...new Set(pr.filter(r => r.source !== 'dexscreener' && !HT.isMkt(r)).map(r => r.coin.trim().toLowerCase()))];
  // 🥇 vàng: giá bán (triệu/chỉ), % so với hôm qua; vàng thế giới: $/oz, % 24h
  if (pr.some(r => r.source === 'gold')) {
    try {
      const g = await goldGet();
      for (const k of ['sjc', 'nhan']) if (g[k] && g[k].sell) quotes['gd:' + k] = { price: g[k].sell / 1e7, change: g[k].dSell && g[k].sell - g[k].dSell ? g[k].dSell / (g[k].sell - g[k].dSell) * 100 : 0, label: HT.GOLD_NAMES[k] };
      if (g.xau && g.xau.price) quotes['gd:xau'] = { price: g.xau.price, change: g.xau.change || 0, label: HT.GOLD_NAMES.xau };
    } catch (e) { console.warn(e); }
  }
  // 📈 chứng khoán VN30: nghìn đ, % hôm nay
  const sc = [...new Set(pr.filter(r => r.source === 'stock').map(r => r.coin))];
  if (sc.length) {
    try { const s = await stockGet(sc); for (const c of sc) if (s.q && s.q[c] && s.q[c].price) quotes['st:' + c] = { price: s.q[c].price, change: s.q[c].pct || 0, label: c }; } catch (e) { console.warn(e); }
  }
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
    const met = HT.met(r.source === 'gold' && r.coin !== 'xau' && /above|below/.test(r.op) && Number(r.value) > 60 ? { ...r, value: Number(r.value) / 10 } : r, q);
    if (met && !priceState[r.id]) {
      priceState[r.id] = true; changed = true;
      const ch = (q.change >= 0 ? '+' : '') + q.change.toFixed(1) + '%';
      const vi = v => Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
      const msg = r.source === 'gold' ? (r.coin === 'xau' ? `Vàng thế giới đang ở ${vi(Math.round(q.price))} USDT (24h ${ch})` : `${q.label} bán ra ${vi(q.price)} triệu/chỉ (hôm nay ${ch})`)
        : r.source === 'stock' ? `${q.label} đang ở ${vi(q.price)} nghìn đ (hôm nay ${ch})`
        : `${String(q.label).toUpperCase()} đang ở $${HT.fmt(q.price)} (24h ${ch})`;
      await fire(r, `${msg}. Điều kiện: ${HT.describe(r)}`, 'alert');
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
  // Nhắc nhở, việc đến hạn, mail, cảnh báo giá: HaoHao ra hẳn màn hình (cửa sổ riêng, đè lên các ứng dụng khác)
  if (settings.desktop !== false && (r.type === 'reminder' || r.type === 'todo' || r.type === 'mail' || r.type === 'pomo' || r.type === 'price')) {
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
  notifyTr(nid, opt);
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
const DESK_W = 360, DESK_H = 250;   // alert.js tự co chiều cao cho vừa nội dung
async function showDesk(item) {
  const { deskQueue = [], deskWin = null } = await chrome.storage.session.get(['deskQueue', 'deskWin']);
  deskQueue.push(item);
  await chrome.storage.session.set({ deskQueue });
  if (deskWin != null) {
    // V1.7: cửa sổ nhắc cũ còn đang ở trên cùng → chỉ thêm lời nhắc; đang bị che / thu nhỏ → đóng, mở cửa sổ mới trên cùng (giữ lời nhắc chưa xử lý)
    try {
      const w = await chrome.windows.get(deskWin);
      if (w.state !== 'minimized' && w.focused) { await chrome.windows.update(deskWin, { drawAttention: true }); return; }
      await chrome.storage.session.set({ deskKeep: deskWin }); await chrome.windows.remove(deskWin).catch(() => {});
    } catch {}
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
  const { deskWin, deskKeep } = await chrome.storage.session.get(['deskWin', 'deskKeep']);
  if (id === deskKeep) { await chrome.storage.session.set({ deskKeep: null }); return; }   // V1.7: HaoHao tự đóng để mở lại trên cùng → giữ lời nhắc
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
  if (it.kind === 'price') {   // "Tắt cảnh báo này": không báo lại nữa
    if (action !== 'off') return;
    const { rules = [] } = await chrome.storage.local.get('rules');
    const r = rules.find(x => x.id === it.ruleId); if (r) { r.enabled = false; await chrome.storage.local.set({ rules }); }
    return;
  }
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
  // 📲 HaoHao Transfer: hỏi app ChuyenAnh-iPhone đang chạy trên máy (cổng 8686)
  // ⬆️ V1.1: tự cập nhật – xem có bản mới không (+ app Transfer có hỗ trợ tự cài không), chạy cập nhật qua app Transfer
  if (msg.type === 'upd-st') { (async () => { const info = await updCheck(); let tf = false; try { const r = await fetch('http://127.0.0.1:8686/info', { cache: 'no-store', headers: TFH, signal: AbortSignal.timeout(2000) }).then(r => r.json()); tf = !!r.up; } catch {} send({ info, tf }); })(); return true; }
  if (msg.type === 'upd-run') { fetch('http://127.0.0.1:8686/capnhat?id=' + chrome.runtime.id, { cache: 'no-store', headers: TFH, signal: AbortSignal.timeout(180000) }).then(r => r.json()).then(send).catch(e => send({ error: String(e && e.message || e) })); return true; }
  // 💬 V1.8: góp ý → máy chủ HaoHao (chỉ chủ app đọc)
  if (msg.type === 'pro-st') { proSync().then(send).catch(() => send(null)); return true; }
  if (msg.type === 'pro-activate') { (async () => { const id = await hhId(), j = await proVerify(msg.code, id.slice(0, 12).toUpperCase()); if (!j) return send({ ok: false, error: 'Mã không đúng hoặc không phải của máy này' }); await chrome.storage.local.set({ proLic: String(msg.code).trim() }); send({ ok: true, st: await proSync() }); })().catch(() => send({ ok: false, error: 'Lỗi kiểm tra mã' })); return true; }
  if (msg.type === 'gopy') { (async () => { try { const m = chrome.runtime.getManifest(), r = await fetch(HT.PRICE_API.replace(/\/$/, '') + '/gopy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ by: await hhId(), txt: String(msg.txt || '').slice(0, 1000), v: m.version_name || m.version }) }).then(r => r.json()); send(r); } catch { send({ ok: false }); } })(); return true; }
  if (msg.type === 'tf-st') {
    const T = 'http://127.0.0.1:8686', g = p => fetch(T + p, { cache: 'no-store', headers: TFH, signal: AbortSignal.timeout(2500) }).then(r => r.json());
    Promise.all([g('/info'), g('/tt')]).then(([info, tt]) => send({ ok: true, info, tt })).catch(() => send({ ok: false }));
    return true;
  }
  // 1.10.228: tự đọc ví voucher – cửa sổ nhỏ mở giỏ hàng, content.js đọc bảng mã rồi báo xong
  if (msg.type === 'wallet-auto') {
    if (self.__hhWalletWin) return;
    chrome.windows.create({ url: 'https://shopee.vn/cart#hh-wallet', type: 'popup', width: 420, height: 640, focused: false }).then(w => {
      self.__hhWalletWin = w.id; setTimeout(() => { if (self.__hhWalletWin === w.id) { chrome.windows.remove(w.id).catch(() => {}); self.__hhWalletWin = null; } }, 60000);
    }).catch(() => {});
    return;
  }
  if (msg.type === 'wallet-auto-done') {
    const id = sender && sender.tab && sender.tab.windowId;
    if (id && id === self.__hhWalletWin) { self.__hhWalletWin = null; setTimeout(() => chrome.windows.remove(id).catch(() => {}), 800); }
    return;
  }
  if (msg.type === 'tf-mo') { fetch('http://127.0.0.1:8686/mo', { headers: TFH }).catch(() => {}); return; }
  if (msg.type === 'tf-thoat') { fetch('http://127.0.0.1:8686/thoat', { headers: TFH }).catch(() => {}).finally(() => send({})); return true; }
  if (msg.type === 'tf-doi') {
    const T = 'http://127.0.0.1:8686';
    fetch(T + '/chon-thu-muc', { method: 'POST', headers: TFH }).then(r => r.json()).then(j => {
      if (!j.path) return send({});
      return fetch(T + '/noi-luu?path=' + encodeURIComponent(j.path), { method: 'POST', headers: TFH }).then(r => r.json()).then(x => send(x));
    }).catch(() => send({ error: 'Không gọi được app' }));
    return true;
  }
  if (msg.type === 'tf-pc') { chrome.tabs.create({ url: 'http://127.0.0.1:8686/pc' + (msg.hash ? '#' + msg.hash : '') }); return; }
  if (msg.type === 'open-options') { if (msg.hash) chrome.tabs.create({ url: chrome.runtime.getURL('options.html#' + msg.hash) }); else chrome.runtime.openOptionsPage(); }
  if (msg.type === 'pomo-start') pomoStart(msg);
  if (msg.type === 'pomo-pause') pomoPause();
  if (msg.type === 'pomo-resume') pomoResume();
  if (msg.type === 'pomo-stop') pomoStop();
  if (msg.type === 'pomo-skip') pomoSkip();
  if (msg.type === 'pomo-done') pomoTaskDone(msg.task);
  if (msg.type === 'music-preview') musicTry(msg.kind, msg.vol).catch(() => {});
  if (msg.type === 'music-vol') musicVol(msg.vol).catch(() => {});
  if (msg.type === 'music-add') { musicAdd(msg).then(t => send({ ok: true, track: t })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'music-tab') { ytTab().then(t => { if (t) chrome.tabs.update(t.id, { active: true }); }); }
  if (msg.type === 'ai-explain') { aiExplain(msg, chunkTo(msg, sender)).then(text => send({ ok: true, text })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'quick-remind') { quickRemind(msg.text).then(send); return true; }
  if (msg.type === 'idea-add') { ideaAdd(msg.item).then(r => send({ ok: true, ...r })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'idea-ai') { ideaSuggest(msg.id).then(() => send({ ok: true })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'voice-open') openVoice(msg.target);
  if (msg.type === 'clip-read') { clipRead().then(text => send({ ok: true, text })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'note-tidy') { noteTidy(msg.text).then(html => send({ ok: true, html })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'sticky-open' && msg.id) { openSticky(msg.id); return; }
  if (msg.type === 'ocr-boxes') { ocrBoxes(msg.image).then(lines => send({ ok: true, lines })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'ocr') { ocrImage(msg.image).then(text => send({ ok: true, text })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'ocr-capture') {
    const wid = sender && sender.tab ? sender.tab.windowId : chrome.windows.WINDOW_ID_CURRENT;
    chrome.tabs.captureVisibleTab(wid, { format: 'png' }).then(shot => send({ ok: true, shot })).catch(e => send({ ok: false, error: /permission|activeTab|all_urls/i.test(e.message) ? 'noperm' : e.message }));
    return true;
  }
  if (msg.type === 'ai-translate') { aiTranslate(msg).then(r => send({ ok: true, ...r })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'subs-relay' && sender.tab && /^hh-subs-(offer|active|status|hint|nosub)$/.test(msg.ev)) { chrome.tabs.sendMessage(sender.tab.id, { type: 'subs-ev', ev: msg.ev, detail: msg.detail }, { frameId: 0 }).catch(() => {}); return; }
  if (msg.type === 'ai-subs') { aiSubs(msg).then(lines => send({ ok: true, lines })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'ai-read') { aiRead(msg, chunkTo(msg, sender)).then(text => send({ ok: true, text })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'ai-test') { gemini([{ role: 'user', parts: [{ text: 'Trả lời đúng một chữ: OK' }] }], 'Trả lời ngắn.').then(t => send({ ok: true, text: t })).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'mail-check-now') { checkMail(true).then(send); return true; }
  if (msg.type === 'mail-accounts') { mailAccounts().then(send).catch(() => send(null)); return true; }
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
  if (msg.type === 'price-log') { priceLog(msg.items || [msg.item]); return; }
  if (msg.type === 'kw-log') { kwLog(msg.q, msg.src); return; }
  if (msg.type === 'hot-q') { fetch(HT.PRICE_API.replace(/\/$/, '') + '/hot?q=' + encodeURIComponent(msg.q || ''), { cache: 'no-store' }).then(r => r.json()).then(send).catch(() => send({ ok: false, items: [] })); return true; }
  if (msg.type === 'hot-sync') { syncHot().then(() => send({ ok: true })).catch(() => send({ ok: false })); return true; }
  if (msg.type === 'cho') {   // 🤝 chợ voucher cộng đồng
    (async () => { const base = HT.PRICE_API.replace(/\/$/, '') + '/cho';
      const by = await hhId();
      if (msg.op === 'list') return send(await fetch(base + '?by=' + encodeURIComponent(by)).then(r => r.json()).catch(() => ({ ok: false })));   // 13/10: biết mã nào do máy này đăng
      send(await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...msg.data, by }) }).then(r => r.json()).catch(() => ({ ok: false }))); })();
    return true;
  }
  if (msg.type === 'anh-cmp') { fetch(HT.PRICE_API.replace(/\/$/, '') + '/anh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k: msg.k, shop: msg.shop, real: msg.real }) }).then(r => r.json()).then(send).catch(() => send({ ok: false })); return true; }
  if (msg.type === 'fs-remind') {   // ⚡ nhắc Flash Sale trước 5 phút
    (async () => { const { fsRem = {} } = await chrome.storage.local.get('fsRem'); const id = 'fs:' + String(msg.at) + ':' + (msg.url || '').slice(-40);
      fsRem[id] = { url: msg.url, title: msg.title, price: msg.price || 0, at: msg.at }; await chrome.storage.local.set({ fsRem });
      chrome.alarms.create(id, { when: Math.max(Date.now() + 5000, msg.at - 5 * 6e4) }); send({ ok: true }); })(); return true;
  }
  if (msg.type === 'tt-cmp') { fetch(HT.PRICE_API.replace(/\/$/, '') + '/tt?q=' + encodeURIComponent(msg.q || '')).then(r => r.json()).then(send).catch(() => send({ items: [] })); return true; }
  if (msg.type === 'price-hist') { priceHist(msg.k).then(send).catch(() => send(null)); return true; }
  if (msg.type === 'spy-search') { spySearch(msg).then(send).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'coupon-sync') { syncCoupons().then(send); return true; }
  if (msg.type === 'cg-resolve') { HT.cgResolve(msg.q).then(send).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'prod-search') { prodSearch(msg, sender).then(send).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'same-find') { sameFind(msg, sender).then(send).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'img-dist') { imgDists(msg).then(send).catch(() => send({ d: [] })); return true; }
  if (msg.type === 'reviews-scan') { reviewsScan(msg).then(send).catch(() => send({ items: [] })); return true; }
  if (msg.type === 'prod-update') { prodUpdate(msg.ids || [], sender.tab && sender.tab.id).then(r => send(r)).catch(e => send({ ok: false, error: e.message })); return true; }
  if (msg.type === 'prod-open') { chrome.tabs.create({ url: msg.url, active: true }); return; }
  if (msg.type === 'vh-hunt') { voucherHunt(msg, sender).then(send).catch(e => { hunt = null; send({ ok: false, error: e.message }); }); return true; }
  if (msg.type === 'vh-stop') { huntStop('stop'); return; }
  if (msg.type === 'scan-me') { const job = scanJobs.get(sender.tab && sender.tab.id); send({ scan: job ? job.type : false, data: job ? job.data : null }); return; }
  if (msg.type === 'scan-result') { const job = scanJobs.get(sender.tab && sender.tab.id); if (job) job.done(msg.result); return; }
  if (msg.type === 'get-quotes') { getQuotes(msg.items || []).then(send); return true; }
  if (msg.type === 'stock-list') { stockList(msg.force).then(send).catch(e => send({ error: e.message, L: [] })); return true; }
  if (msg.type === 'stock-get') { stockGet(msg.codes || [], msg.force).then(send).catch(e => send({ error: e.message, q: {} })); return true; }
  if (msg.type === 'gold-get') { goldGet(msg.force).then(send).catch(e => send({ error: e.message })); return true; }
});

// Giá cho bảng Crypto của HaoHao (lưu tạm 30 giây để không gọi API quá nhiều)
const quoteCache = {};
const qKey = it => it.source === 'dexscreener' ? 'dx:' + it.coin.trim() : 'cg:' + it.coin.trim().toLowerCase();
// 🥇 Giá vàng trong nước (SJC miếng, nhẫn 9999) + vàng thế giới (PAXG ≈ 1 oz vàng). Lưu 10 phút.
const vnd = v => { v = Number(String(v == null ? '' : v).replace(/[^\d.]/g, '')) || 0; while (v > 0 && v < 1e6) v *= 1000; return v; };
async function goldSJC() {
  const r = await fetch('https://sjc.com.vn/GoldPrice/Services/PriceService.ashx', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: 'method=GetCurrentGoldPricesByBranch&BranchId=1' });
  if (!r.ok) throw new Error('SJC ' + r.status);
  const j = await r.json(), L = j.data || j.Data || [];
  const pick = re => L.find(x => re.test(String(x.TypeName || x.typeName || '')));
  const f = x => x && { buy: vnd(x.BuyValue ?? x.Buy), sell: vnd(x.SellValue ?? x.Sell), dBuy: Number(x.BuyDifferValue) || 0, dSell: Number(x.SellDifferValue) || 0 };
  const sjc = f(pick(/SJC.*1\s*L/i) || pick(/vàng\s*SJC/i)), nhan = f(pick(/nhẫn.*99[,.]?99/i) || pick(/nhẫn/i));
  if (!sjc || !sjc.sell) throw new Error('SJC: không đọc được giá');
  return { sjc, nhan, src: 'SJC', diff: true };
}
async function goldVapi() {   // dự phòng: vapi.vnappmob.com (khoá miễn phí, tự xin lại sau 14 ngày)
  let { vapiKey } = await chrome.storage.local.get('vapiKey');
  if (!vapiKey || Date.now() - vapiKey.at > 14 * 864e5) {
    const k = await (await fetch('https://vapi.vnappmob.com/api/request_api_key?scope=gold')).json();
    vapiKey = { key: k.results, at: Date.now() }; await chrome.storage.local.set({ vapiKey });
  }
  const r = await fetch('https://vapi.vnappmob.com/api/v2/gold/sjc', { headers: { Authorization: 'Bearer ' + vapiKey.key } });
  if (!r.ok) { if (r.status === 401 || r.status === 403) await chrome.storage.local.remove('vapiKey'); throw new Error('vapi ' + r.status); }
  const x = ((await r.json()).results || [])[0] || {};
  const sjc = { buy: vnd(x.buy_1l), sell: vnd(x.sell_1l) }, nhan = { buy: vnd(x.buy_nhan1c), sell: vnd(x.sell_nhan1c) };
  if (!sjc.sell) throw new Error('vapi: không có giá');
  return { sjc, nhan, src: 'vapi.vnappmob' };
}
// 📈 Giá VN30: 1 lần gọi SSI lấy cả rổ VN30; lỗi thì lấy từng mã từ VNDirect. Lưu 60 giây.
let stockCache = null;
const kdong = v => { v = Number(v); if (!v) return 0; return v > 1000 ? v / 1000 : v; };   // về nghìn đồng
// V1.12: giá từng mã theo đúng sàn (HOSE / HNX / UPCoM), không còn giới hạn rổ VN30
async function stockSSI(codes) {
  const q = {};
  await Promise.all(codes.map(async c => {
    try {
      const r = await fetch(`https://iboard-query.ssi.com.vn/stock/${encodeURIComponent(c)}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) return;
      const x = (await r.json()).data; if (!x) return;
      const ref = kdong(x.refPrice ?? x.ref), price = kdong(x.matchedPrice ?? x.mp) || ref;
      const chg = x.priceChange != null ? kdong(Math.abs(x.priceChange)) * Math.sign(x.priceChange) : price - ref;
      q[c] = { price, chg, pct: x.priceChangePercent != null ? Number(x.priceChangePercent) : (ref ? chg / ref * 100 : 0), ex: String(x.exchange || '').toUpperCase() };
    } catch {}
  }));
  if (!Object.keys(q).length) throw new Error('SSI: không có dữ liệu');
  return { q, src: 'SSI iBoard' };
}
// V1.12: danh sách mọi mã cổ phiếu niêm yết (HOSE, HNX, UPCoM) + tên công ty, tải lại mỗi ngày 1 lần
const stockShort = n => String(n || '').replace(/^Cổ phiếu\s+/i, '').replace(/^(Công ty|Cty)\s+(Cổ phần|CP)\s+/i, 'CTCP ').replace(/\s+/g, ' ').trim();
async function stockList(force) {
  const { stockList: old } = await chrome.storage.local.get('stockList');
  if (!force && old && old.L && old.L.length > 500 && Date.now() - old.at < 864e5) return old;
  try {
    const L = [];
    for (const e of ['hose', 'hnx', 'upcom']) {
      const r = await fetch(`https://iboard-query.ssi.com.vn/stock/exchange/${e}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('SSI ' + r.status);
      for (const x of ((await r.json()).data || [])) if (x.stockType === 's' && x.stockSymbol) L.push([String(x.stockSymbol).toUpperCase(), stockShort(x.companyNameVi || x.companyNameEn), e.toUpperCase()]);
    }
    if (L.length < 500) throw new Error('danh sách mã thiếu');
    L.sort((a, b) => a[0].localeCompare(b[0]));
    const res = { at: Date.now(), L };
    await chrome.storage.local.set({ stockList: res });
    return res;
  } catch (e) { return old && old.L ? old : { at: 0, L: HT.VN30.map(c => [c, '', 'HOSE']), error: e.message }; }
}
async function stockVND(codes) {
  const q = {};
  await Promise.all(codes.map(async c => {
    const r = await fetch(`https://api-finfo.vndirect.com.vn/v4/stock_prices?sort=date&size=1&q=code:${encodeURIComponent(c)}`);
    if (!r.ok) return;
    const x = ((await r.json()).data || [])[0]; if (!x) return;
    q[c] = { price: kdong(x.close), chg: kdong(Math.abs(x.change || 0)) * Math.sign(x.change || 0), pct: Number(x.pctChange) || 0 };
  }));
  if (!Object.keys(q).length) throw new Error('VNDirect: không có dữ liệu');
  return { q, src: 'VNDirect' };
}
async function stockGet(codes, force) {
  if (!force && stockCache && Date.now() - stockCache.at < 60000 && codes.every(c => stockCache.q[c])) return stockCache;
  let res, err = '';
  if (!codes.length) return { q: {}, at: Date.now(), src: 'SSI iBoard' };
  try { res = await stockSSI(codes); } catch (e) { err = e.message; }
  const miss = codes.filter(c => !(res && res.q[c]));
  if (miss.length) { try { const v = await stockVND(miss); res = res ? { ...res, q: { ...res.q, ...v.q } } : v; } catch (e2) { err += (err ? ' · ' : '') + e2.message; } }
  if (!res) return { ...(stockCache || { q: {} }), error: err };
  stockCache = { ...res, at: Date.now() };
  return stockCache;
}
async function goldGet(force) {
  const { gold: old } = await chrome.storage.local.get('gold');
  if (!force && old && old.sjc && Date.now() - old.at < 10 * 60000) return old;
  let g = null, err = '';
  try { g = await goldSJC(); } catch (e) { err = e.message; try { g = await goldVapi(); } catch (e2) { err += ' · ' + e2.message; } }
  let xau = old && old.xau;
  try { const q = await HT.cgQuotes(['pax-gold']); if (q['pax-gold']) xau = { price: q['pax-gold'].price, change: q['pax-gold'].change }; } catch {}
  // 1.10.93: tỷ giá USDT→VND (CoinGecko) để quy vốn vàng thế giới ra triệu đồng trong dòng Tổng vốn
  try { const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd').then(r => r.json()); const v = r && r.tether && r.tether.vnd; if (v > 10000 && xau) xau = { ...xau, vnd: v }; } catch {}
  if (xau && !xau.vnd && old && old.xau && old.xau.vnd) xau = { ...xau, vnd: old.xau.vnd };
  if (!g) { const res = { ...(old || {}), xau, error: err, at: (old && old.at) || Date.now() }; return res; }
  // nguồn không có ± hôm nay: tự so với giá chốt cuối ngày hôm trước
  const today = new Date().toLocaleDateString('sv');
  let { goldBase } = await chrome.storage.local.get('goldBase');
  if (!goldBase || goldBase.d !== today) { goldBase = { d: today, base: old && old.day !== today && old.sjc ? { sjc: old.sjc, nhan: old.nhan } : (goldBase && goldBase.base) || null }; await chrome.storage.local.set({ goldBase }); }
  if (!g.diff && goldBase.base) for (const k of ['sjc', 'nhan']) if (g[k] && goldBase.base[k]) { g[k].dBuy = g[k].buy - goldBase.base[k].buy; g[k].dSell = g[k].sell - goldBase.base[k].sell; }
  const res = { at: Date.now(), day: today, sjc: g.sjc, nhan: g.nhan, xau, src: g.src };
  await chrome.storage.local.set({ gold: res });
  return res;
}
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
  // tiêu đề feed có dạng "Gmail - Inbox for ten@gmail.com": lấy địa chỉ để người dùng biết đang đọc hộp thư nào
  const account = (tag(xml.split('<entry>')[0], 'title').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0] || '';
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1], author = (e.match(/<author>([\s\S]*?)<\/author>/) || [])[1] || '';
    const href = (e.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    return { id: tag(e, 'id'), title: tag(e, 'title') || '(Không có tiêu đề)', summary: tag(e, 'summary'),
             name: tag(author, 'name'), email: tag(author, 'email'), url: dec(href) };
  });
  return { count, entries, account };
}
const normTxt = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
// Mã OTP / xác minh: luôn báo GẤP (kể cả đang lọc theo người gửi); mạng xã hội, quảng cáo khuyến mãi: không báo
const MAIL_OTP = /\b(otp|2fa|ma xac (thuc|nhan|minh)|ma bao mat|ma dang nhap|ma kich hoat|verification code|verify your|security code|login code|sign[- ]?in code|one[- ]time (code|password|passcode)|confirmation code|your code|passcode|xac minh (tai khoan|email|danh tinh)|dat lai mat khau|reset (your )?password)\b/;
const JUNK_SOCIAL = /(facebookmail|facebook\.com|instagram|tiktok|linkedin|twitter|(^|[@.])x\.com|pinterest|threads\.net|reddit|quora|discord|zalo|youtube\.com|snapchat|telegram)/;
const JUNK_PROMO = /\b(khuyen mai|giam gia|flash ?sale|voucher|uu dai|sale off|mega sale|deal (soc|hot)|newsletter|ban tin|unsubscribe|huy dang ky|% off|freeship|mien phi van chuyen)\b/;
function mailJunk(e) {
  const who = normTxt(e.name + ' ' + e.email), txt = normTxt(e.title + ' ' + e.summary);
  if (JUNK_SOCIAL.test(normTxt(e.email)) || /^(facebook|instagram|tiktok|linkedin|zalo|youtube|x|twitter)$/.test(normTxt(e.name).trim())) return 'social';
  if (JUNK_PROMO.test(txt) || /(no-?reply|marketing|newsletter|promo|deals?)@/.test(who) && JUNK_PROMO.test(txt)) return 'promo';
  return '';
}
function mailOtp(e) {
  const raw = e.title + ' ' + e.summary;
  if (!MAIL_OTP.test(normTxt(raw))) return null;
  const c = raw.match(/\b(?:G-)?\d{4,8}\b/);
  return { code: c ? c[0] : '' };
}
function mailMatch(m, e) {
  if (m.mode !== 'filter') return true;
  const senders = (m.senders || []).map(normTxt).filter(Boolean), words = (m.words || []).map(normTxt).filter(Boolean);
  if (!senders.length && !words.length) return true;
  const who = normTxt(e.name + ' ' + e.email), body = normTxt(e.title + ' ' + e.summary);
  return senders.some(x => who.includes(x)) || words.some(x => body.includes(x));
}
async function fetchGmail(m) {
  const get = async label => {
    const r = await fetch(`https://mail.google.com/mail/u/${Number(m.account) || 0}/feed/atom${label}`, { credentials: 'include', cache: 'no-store' });
    const txt = await r.text();
    if (!r.ok || !txt.includes('<feed')) throw new Error(r.status === 401 || r.status === 403 || /accounts\.google\.com/.test(r.url) ? 'login' : 'bad');
    return parseFeed(txt);
  };
  // đọc cả hộp thư đến (mã OTP hay nằm ở tab Cập nhật) rồi đánh dấu thư thuộc tab Chính
  const all = await get('');
  if (m.primary === false) return all;
  const pri = await get('/%5Esmartlabel_personal'), ids = new Set(pri.entries.map(e => e.id));
  return { ...pri, entries: [...pri.entries, ...all.entries.filter(e => !ids.has(e.id)).map(e => ({ ...e, primary: false }))] };
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
  const { settings = {}, mailSeen = null, mailStatus: prevSt } = await chrome.storage.local.get(['settings', 'mailSeen', 'mailStatus']);
  const prevSkip = prevSt && prevSt.ok && new Date(prevSt.at).toDateString() === new Date().toDateString() ? prevSt.skipped || 0 : 0;   // đếm thư bỏ qua trong ngày
  const m = settings.mail || {};
  if ((!m.enabled && !manual) || mailBusy) return null;
  mailBusy = true;
  let status;
  try {
    const f = m.provider === 'outlook' ? await fetchOutlook(m) : await fetchGmail(m);
    status = { ok: true, count: f.count, at: Date.now(), provider: m.provider || 'gmail', account: f.account || '',
      latest: f.entries.filter(e => e.primary !== false || mailOtp(e)).slice(0, 3).map(e => ({ name: e.name || e.email, title: e.title, url: e.url, otp: !!mailOtp(e), junk: m.skipJunk === false || mailOtp(e) ? '' : mailJunk(e) })), skipped: prevSkip };
    const first = !Array.isArray(mailSeen);
    const seen = new Set(first ? [] : mailSeen);
    const fresh = f.entries.filter(e => e.id && !seen.has(e.id));
    f.entries.forEach(e => e.id && seen.add(e.id));
    await chrome.storage.local.set({ mailSeen: [...seen].slice(-300) });
    // Lần đầu bật: chỉ ghi nhận thư đang có, không báo dồn dập
    if (!first && m.enabled) {
      // thư khớp đúng người gửi bạn tự nhập thì vẫn báo; còn lại bỏ qua thư không quan trọng (tắt được trong cài đặt)
      const mine = e => m.mode === 'filter' && (m.senders || []).map(normTxt).filter(Boolean).some(x => normTxt(e.name + ' ' + e.email).includes(x));
      const otps = fresh.filter(e => mailOtp(e));
      const hits = fresh.filter(e => !mailOtp(e) && e.primary !== false && mailMatch(m, e) && (m.skipJunk === false || mine(e) || !mailJunk(e)));
      status.skipped = (prevSkip || 0) + fresh.filter(e => !mailOtp(e) && e.primary !== false && mailMatch(m, e)).length - hits.length;
      // 🔐 báo mã OTP trước, ghi luôn mã để khỏi mở mail
      for (const e of otps) {
        const o = mailOtp(e);
        await fire({ name: 'Mã OTP', type: 'mail', id: 'mail' }, `🔐 ${o.code ? 'Mã ' + o.code + ' · ' : ''}${e.name || e.email}: ${e.title}`, 'alert', { url: e.url });
      }
      // đã lọc rồi nên thư nào qua lọc cũng báo ngay, mỗi thư 1 dòng (không gộp)
      for (const e of hits) await fire({ name: 'Email mới', type: 'mail', id: 'mail' }, `📧 ${e.name || e.email}: ${e.title}`, 'alert', { url: e.url });
    }
  } catch (e) {
    status = { ok: false, error: ['login', 'noclient'].includes(e.message) ? e.message : 'net', at: Date.now(), provider: m.provider || 'gmail' };
  }
  mailBusy = false;
  await chrome.storage.local.set({ mailStatus: status });
  return status;
}
// Dò các tài khoản Gmail đang đăng nhập trên Chrome (u/0..u/3) để hiện đúng địa chỉ email thay vì "Gmail thứ 1, 2…"
async function mailAccounts() {
  const list = [];
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://mail.google.com/mail/u/${i}/feed/atom`, { credentials: 'include', cache: 'no-store' });
      const txt = await r.text(); if (!r.ok || !txt.includes('<feed')) break;
      const email = parseFeed(txt).account;
      // số thứ tự không có thật thì Gmail trả về tài khoản đầu → gặp lại email cũ là hết
      if (!email || list.some(x => x.email === email)) break;
      list.push({ i, email });
    } catch { break; }
  }
  const res = { at: Date.now(), list };
  await chrome.storage.local.set({ mailAccounts: res });
  return res;
}
chrome.notifications.onClicked.addListener(async nid => {
  const { notifUrl = {} } = await chrome.storage.session.get('notifUrl');
  if (notifUrl[nid]) { openMail(notifUrl[nid]); openDeal(notifUrl[nid]); chrome.notifications.clear(nid); }
  if (nid.startsWith('shop:')) { const { shopNotif = {} } = await chrome.storage.session.get('shopNotif'); if (shopNotif[nid]) openDeal(shopNotif[nid]); chrome.notifications.clear(nid); }
});

// ---------- Đọc hộ: tóm tắt bằng Gemini ----------
const AI_SYS = 'Bạn là HaoHao, trợ lý "đọc hộ": nói rõ ràng, đi thẳng vào ý, dễ hiểu. Luôn trả lời bằng tiếng Việt. Chỉ dựa vào nội dung được cung cấp, không bịa thêm.';
// Mẫu mặc định; Google ngừng mẫu cũ thì HaoHao tự tìm mẫu "flash" mới nhất mà mã dùng được và nhớ lại
const GEMINI_DEFAULT = 'gemini-3.8-flash';
// Các mẫu "flash" mã này dùng được, mới nhất trước (bản -lite xếp sau bản thường)
async function geminiModels(key) {
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    const j = await r.json();
    const ver = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
    const ok = (j.models || []).map(m => ({ n: String(m.name || '').replace(/^models\//, ''), g: m.supportedGenerationMethods || [] }))
      .filter(m => m.g.includes('generateContent') && /^gemini-[\d.]+-flash(-lite)?(-\d{3}|-latest)?$/.test(m.n));
    ok.sort((x, y) => /-lite/.test(x.n) - /-lite/.test(y.n) || ver(y.n) - ver(x.n) || x.n.length - y.n.length);
    return ok.map(m => m.n);
  } catch { return []; }
}
// nhớ mẫu lite + mức suy nghĩ mẫu nhận được vào bộ nhớ máy: service worker khởi động lại vẫn nhanh, không phải dò lại
let tune = null;
async function tuneGet() { if (!tune) { const { geminiTune } = await chrome.storage.local.get('geminiTune'); tune = geminiTune || { lite: '', at: 0, steps: {} }; } return tune; }
function tuneSave() { if (tune) chrome.storage.local.set({ geminiTune: tune }).catch(() => {}); }
async function geminiLite(key) {
  const t = await tuneGet();
  if (t.lite && Date.now() - t.at < 24 * 3600e3) return t.lite;
  const m = (await geminiModels(key)).find(n => /^gemini-[3-9][\d.]*-flash-lite$/.test(n)) || '';
  if (m) { t.lite = m; t.at = Date.now(); tuneSave(); }
  return m;
}
async function geminiPickModel(key, hint) {
  if (hint) return hint;
  return (await geminiModels(key)).find(n => !/-lite/.test(n)) || '';
}
const thinkStep = new Map();   // mẫu → bậc tắt suy nghĩ đang dùng (0: tắt hẳn, 1: 'low', 2: không gửi)
// gửi từng phần câu trả lời về đúng khung trang đã hỏi (để chữ hiện dần)
function chunkTo(msg, sender) {
  if (!msg.sid || !sender || !sender.tab) return null;
  return text => chrome.tabs.sendMessage(sender.tab.id, { type: 'ai-chunk', sid: msg.sid, text }, { frameId: sender.frameId || 0 }).catch(() => {});
}
async function gemini(contents, system, opts = {}) {
  const { settings = {} } = await chrome.storage.local.get('settings');
  const ai = settings.ai || {};
  const key = (ai.key || '').trim();
  if (!key) throw new Error('nokey');
  let model = (ai.model || ai.autoModel || GEMINI_DEFAULT).trim();
  // ⚡ chế độ nhanh (mặc định cho Tóm tắt / Giải thích): dùng mẫu flash-lite mới nhất, chữ ra dưới 1 giây; "Kỹ hơn" thì dùng mẫu thường
  if (opts.fast) { const lite = await geminiLite(key); if (lite) model = lite; }
  if (settings.lang === 'en' && system !== TR_SYS && system !== OCR_SYS) system += '\nIMPORTANT: The user interface is in English. Write the whole answer in English, even if other instructions say Vietnamese.';
  const gen = { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxTokens || 4096 };
  if (opts.video) gen.mediaResolution = 'MEDIA_RESOLUTION_LOW';                                  // video đỡ tốn lượt
  if (opts.json) gen.responseMimeType = 'application/json';
  const tn = await tuneGet(); for (const [k, v] of Object.entries(tn.steps || {})) if (!thinkStep.has(k)) thinkStep.set(k, v);
  const call = m => {
    const g = { ...gen };
    // ⚡ 1.10.24: tắt/giảm "suy nghĩ" của Gemini cho việc nhanh (dịch, tóm tắt, giải thích): trả lời nhanh hơn nhiều
    if (/2\.5/.test(m)) { if (/flash/i.test(m)) g.thinkingConfig = { thinkingBudget: 0 }; }
    else if (/gemini-[3-9]/.test(m)) {   // 1.10.28: thử tắt hẳn suy nghĩ (chữ ra ngay); mẫu không nhận thì lùi về 'low'
      const k = thinkStep.get(m) || 0;
      if (k === 0) g.thinkingConfig = { thinkingBudget: 0 }; else if (k === 1) g.thinkingConfig = { thinkingLevel: 'low' };
    }
    // ⚡ 1.10.28: có onChunk → gọi dạng "stream": chữ hiện dần ngay khi Google trả về, khách không phải chờ cả câu trả lời
    const ep = opts.onChunk ? 'streamGenerateContent?alt=sse' : 'generateContent';
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:${ep}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: system }] }, generationConfig: g })
    });
  };
  const rj = async r => { if (r.ok && opts.onChunk) return {}; const x = await r.json().catch(() => ({})); return Array.isArray(x) ? (x[0] || {}) : x; };
  let r = await call(model), j = await rj(r);
  // mẫu không nhận mức suy nghĩ "minimal" → nhớ lại, gọi lại không kèm cài đặt này
  for (let i = 0; i < 2 && !r.ok && r.status === 400 && /gemini-[3-9]/.test(model) && (thinkStep.get(model) || 0) < 2; i++) { thinkStep.set(model, (thinkStep.get(model) || 0) + 1); r = await call(model); j = await rj(r); if (r.ok) { tn.steps = { ...(tn.steps || {}), [model]: thinkStep.get(model) }; tuneSave(); } }
  if (!r.ok && r.status !== 429 && r.status !== 401 && r.status !== 403) {
    const msg = (j.error && j.error.message) || '';
    // mẫu bị ngừng / không có: lấy mẫu Google gợi ý trong lỗi, hoặc tự tìm mẫu flash mới nhất, rồi thử lại 1 lần
    if (r.status === 404 || /no longer available|not found|not supported|deprecated|update your code/i.test(msg)) {
      const next = await geminiPickModel(key, (msg.match(/models\/(gemini-[\w.-]+)/g) || []).map(x => x.slice(7)).find(x => x !== model));
      if (next && next !== model) {
        model = next; r = await call(model); j = await rj(r);
        if (r.ok) { const { settings: s2 = {} } = await chrome.storage.local.get('settings'); s2.ai = { ...(s2.ai || {}), autoModel: model }; if ((s2.ai.model || '') === (ai.model || '') && ai.model) s2.ai.model = ''; await chrome.storage.local.set({ settings: s2 }); }
      }
    }
  }
  // Google quá tải (503 "high demand") hoặc mẫu này hết lượt (429): thử lại 1 lần, rồi đổi sang mẫu flash khác
  const busy = () => r.status === 500 || r.status === 503 || /high demand|overloaded|unavailable|try again later/i.test((j.error && j.error.message) || '');
  if (!r.ok && busy()) { await new Promise(z => setTimeout(z, 1500)); r = await call(model); j = await rj(r); }
  if (!r.ok && (busy() || r.status === 429)) {
    for (const m of (await geminiModels(key)).filter(n => n !== model).slice(0, 3)) {
      r = await call(m); j = await rj(r);
      if (r.ok || !(busy() || r.status === 429)) break;
    }
  }
  if (!r.ok) {
    const msg = (j.error && j.error.message) || ('HTTP ' + r.status);
    if (busy()) throw new Error('busy');
    if (r.status === 429) throw new Error('quota');
    if (/API key/i.test(msg)) throw new Error('badkey');
    throw new Error(msg);
  }
  if (opts.onChunk) {
    // đọc từng mẩu "data: {...}" Google gửi về, ghép lại và báo cho trang hiện dần
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', acc = '', fin, last = 0;
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        try {
          const d = JSON.parse(line.slice(5)), c = d.candidates && d.candidates[0];
          if (c && c.content && c.content.parts) acc += c.content.parts.map(p => p.thought ? '' : (p.text || '')).join('');
          if (c && c.finishReason) fin = c.finishReason;
          if (!c && d.promptFeedback && d.promptFeedback.blockReason) j = d;
        } catch {}
      }
      if (acc && Date.now() - last > 120) { last = Date.now(); try { opts.onChunk(acc); } catch {} }
    }
    if (acc) try { opts.onChunk(acc); } catch {}
    j = { candidates: [{ content: { parts: [{ text: acc }] }, finishReason: fin }], promptFeedback: j.promptFeedback };
  }
  const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
  if (opts.meta) opts.meta.finish = j.candidates && j.candidates[0] && j.candidates[0].finishReason;
  if (!text) throw new Error(j.promptFeedback && j.promptFeedback.blockReason ? 'blocked' : 'empty');
  return text;
}
async function aiRead({ mode, src, length, summary, qa = [], question, deep }, onChunk) {
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
  return gemini(contents, AI_SYS, { video: src.kind === 'youtube', onChunk, fast: !deep && src.kind !== 'youtube' });
}

// ---------- Kho ý tưởng ----------
// đánh số thứ tự cố định cho note (#1 là note cũ nhất); xoá note thì số cũ không bị dùng lại
function ideaNumber(ideas, seq) {
  let max = Math.max(Number(seq) || 0, ...ideas.map(x => Number(x.no) || 0));
  const miss = ideas.filter(x => !x.no).sort((a, b) => (a.at || 0) - (b.at || 0));
  for (const x of miss) x.no = ++max;
  return { seq: max, changed: miss.length > 0 };
}
async function ideaNumberAll() {
  const { ideas = [], ideaSeq = 0 } = await chrome.storage.local.get(['ideas', 'ideaSeq']);
  const r = ideaNumber(ideas, ideaSeq);
  if (r.changed || r.seq !== ideaSeq) await chrome.storage.local.set({ ideas, ideaSeq: r.seq });
}
ideaNumberAll().catch(() => {});
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.ideas && (ch.ideas.newValue || []).some(x => !x.no)) ideaNumberAll().catch(() => {}); });
async function ideaAdd(item) {
  const { ideas = [], settings = {}, ideaSeq = 0 } = await chrome.storage.local.get(['ideas', 'settings', 'ideaSeq']);
  const it = {
    id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type: item.type || 'text', text: String(item.text || '').slice(0, 5000), title: String(item.title || '').slice(0, 200),
    url: String(item.url || '').slice(0, 1000), sec: Number(item.sec) || 0, at: Date.now(), ai: null
  };
  ideas.unshift(it);
  const r = ideaNumber(ideas, ideaSeq);
  await chrome.storage.local.set({ ideas: ideas.slice(0, 500), ideaSeq: r.seq });
  const ai = settings.ai || {}, ideaSet = settings.ideas || {};
  if (ai.key && ideaSet.autoAI === true) ideaSuggest(it.id).catch(() => {});
  return { id: it.id, no: it.no };
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
  musicSync().catch(() => {});
}

// ---------- 🎵 Nhạc nền không lời ----------
// Nhạc dựng sẵn và link .mp3: phát trong trang ẩn offscreen (đổi tab vẫn nghe).
// Link YouTube: HaoHao mở 1 tab ghim chạy ngầm (có ?hhmusic=1), yt-music.js trong tab đó phát / dừng theo lệnh.
// Tự phát khi đang tập trung; tạm dừng, nghỉ thì dừng; bấm Dừng Pomodoro thì đóng hẳn. Chọn nhạc lúc chưa chạy: nghe thử 12 giây.
let musicOn = '', musicPreview = null;
const YT_RE = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch|playlist|live\/|shorts\/)|youtu\.be\/)/i;
function ytNorm(url) {
  try {
    const u = new URL(url);
    let id = '', list = u.searchParams.get('list') || '';
    if (/youtu\.be$/.test(u.hostname)) id = u.pathname.slice(1).split('/')[0];
    else if (/^\/(shorts|live)\//.test(u.pathname)) id = u.pathname.split('/')[2];
    else id = u.searchParams.get('v') || '';
    if (!id && !list) return '';
    const o = new URL('https://www.youtube.com/watch');   // playlist cũng mở dạng watch?list= để tự phát
    if (id) o.searchParams.set('v', id);
    if (list) o.searchParams.set('list', list);
    return o.href;
  } catch { return ''; }
}
async function musicAdd({ url, name }) {
  url = String(url || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Link phải bắt đầu bằng http:// hoặc https://');
  let type = 'url', title = String(name || '').trim();
  if (YT_RE.test(url)) {
    type = 'yt'; url = ytNorm(url); if (!url) throw new Error('Không đọc được link YouTube này.');
    if (!title) {
      try { const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(5000) }); if (r.ok) title = (await r.json()).title || ''; } catch {}
      if (!title) title = /list=/.test(url) ? 'Playlist YouTube' : 'Video YouTube';
    }
  } else if (!title) {
    try { title = decodeURIComponent(new URL(url).pathname.split('/').pop() || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[-_]+/g, ' ').trim(); } catch {}
    title = title || 'Nhạc của tôi';
  }
  const { settings = {} } = await chrome.storage.local.get('settings');
  const pomo = { ...(settings.pomo || {}) };
  const tracks = Array.isArray(pomo.tracks) ? [...pomo.tracks] : [];
  const old = tracks.find(t => t.url === url);
  if (old) return old;
  const t = { id: 'u' + Date.now().toString(36), type, url, name: title.slice(0, 80) };
  tracks.push(t); pomo.tracks = tracks.slice(-20);
  await chrome.storage.local.set({ settings: { ...settings, pomo } });
  return t;
}
async function musicTrack(kind) {
  kind = String(kind || '');
  if (kind.startsWith('f:')) {
    const { couponFeed } = await chrome.storage.local.get('couponFeed');
    const b = HT.BUILTIN_MUSIC.find(x => x.id === kind.slice(2));
    if (b) return { ...b, url: chrome.runtime.getURL(b.url), type: 'url' };   // nhạc đóng gói sẵn
    const t = ((couponFeed || {}).music || []).find(x => x.id === kind.slice(2));
    return t ? { ...t, type: YT_RE.test(t.url) ? 'yt' : 'url' } : null;
  }
  if (!kind.startsWith('u:')) return null;
  const cfg = await pomoCfg(); return (cfg.tracks || []).find(t => t.id === kind.slice(2)) || null;
}
async function offscreenReady() {
  if (chrome.offscreen.hasDocument && await chrome.offscreen.hasDocument()) return;
  try { await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Phát nhạc nền không lời khi tập trung (Pomodoro)' }); }
  catch (e) { if (!/single offscreen|already/i.test(String(e && e.message))) throw e; }
}
async function clipRead() {
  await offscreenReady();
  let r = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'clip-read' }).catch(() => null);
  return String((r && r.text) || '').trim();
}
async function musicSend(m) { await offscreenReady(); await chrome.runtime.sendMessage({ target: 'offscreen', ...m }).catch(() => {}); }
async function offStop() {
  if (!(chrome.offscreen.hasDocument && await chrome.offscreen.hasDocument())) return;
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'music-stop' }).catch(() => {});
  setTimeout(async () => { if (!musicOn && !musicPreview) try { await chrome.offscreen.closeDocument(); } catch {} }, 1800);
}
// tab YouTube
async function ytTab() {
  const { musicTab } = await chrome.storage.session.get('musicTab');
  if (!musicTab) return null;
  try { await chrome.tabs.get(musicTab.id); return musicTab; } catch { await chrome.storage.session.remove('musicTab'); return null; }
}
async function ytPlay(track, vol) {
  await offStop();
  const { musicYt } = await chrome.storage.local.get('musicYt');
  await chrome.storage.local.set({ musicYt: { cmd: 'play', vol, url: track.url, blocked: !!(musicYt && musicYt.url === track.url && musicYt.blocked) } });
  const cur = await ytTab();
  if (cur && cur.url === track.url) return;
  if (cur) chrome.tabs.remove(cur.id).catch(() => {});
  const u = new URL(track.url); u.searchParams.set('hhmusic', '1');
  const t = await chrome.tabs.create({ url: u.href, active: false, pinned: true });
  await chrome.storage.session.set({ musicTab: { id: t.id, url: track.url } });
}
async function ytPause(close) {
  const { musicYt } = await chrome.storage.local.get('musicYt');
  if (musicYt && musicYt.cmd !== 'pause') await chrome.storage.local.set({ musicYt: { ...musicYt, cmd: 'pause' } });
  if (close) { const cur = await ytTab(); if (cur) { chrome.tabs.remove(cur.id).catch(() => {}); await chrome.storage.session.remove('musicTab'); } }
}
chrome.tabs.onRemoved.addListener(async id => {
  const { musicTab } = await chrome.storage.session.get('musicTab');
  if (musicTab && musicTab.id === id) { await chrome.storage.session.remove('musicTab'); const { musicYt } = await chrome.storage.local.get('musicYt'); if (musicYt) chrome.storage.local.set({ musicYt: { ...musicYt, cmd: 'pause', blocked: false } }); }
});
async function musicPlay(kind, vol) {
  const tr = await musicTrack(kind);
  if (!tr) return musicStopAll(false);   // chỉ phát nhạc gợi ý (f:) hoặc nhạc người dùng tự thêm (u:)
  musicOn = kind;
  if (tr && tr.type === 'yt') return ytPlay(tr, vol);
  await ytPause(true);
  if (tr) return musicSend({ type: 'music-url', url: tr.url, vol });
  return musicSend({ type: 'music-play', kind, vol });
}
async function musicStopAll(closeYt) {
  musicOn = '';
  await offStop();
  await ytPause(closeYt);
}
async function musicSync() {
  const [{ pomo }, cfg] = await Promise.all([chrome.storage.local.get('pomo'), pomoCfg()]);
  const want = cfg.music || '';   // nhạc nền không phụ thuộc Pomodoro: chọn là phát, Tắt là dừng
  const vol = cfg.vol ?? 0.5;
  if (want && cfg.mpause) { clearTimeout(musicPreview); musicPreview = null; return musicHold(want); }   // ⏸ tạm dừng từ thanh nhạc mini
  if (want) { clearTimeout(musicPreview); musicPreview = null; return musicPlay(want, vol); }
  if (musicPreview) return;
  return musicStopAll(!pomo || pomo.phase === 'idle');
}
// ⏸ tạm dừng: giữ nguyên bài (bấm ▶ là phát tiếp đúng chỗ đang nghe)
async function musicHold(kind) {
  musicOn = '';
  const tr = await musicTrack(kind);
  if (tr && tr.type === 'yt') return ytPause(false);
  if (chrome.offscreen.hasDocument && await chrome.offscreen.hasDocument()) await chrome.runtime.sendMessage({ target: 'offscreen', type: 'music-pause' }).catch(() => {});
}
async function musicTry(kind, vol) {
  clearTimeout(musicPreview); musicPreview = null;
  if (!kind) return musicStopAll(true);
  await musicPlay(kind, vol ?? 0.5);   // phát luôn (không còn nghe thử 12 giây), tự lặp tới khi bấm Tắt
}
async function musicVol(vol) {
  if (!musicOn) musicOn = (await pomoCfg()).music || '';   // nền (service worker) ngủ dậy thì quên bài đang phát: đọc lại từ cài đặt
  if (!musicOn) return;
  const tr = await musicTrack(musicOn);
  if (tr && tr.type === 'yt') { const { musicYt } = await chrome.storage.local.get('musicYt'); if (musicYt) chrome.storage.local.set({ musicYt: { ...musicYt, vol } }); }
  else chrome.runtime.sendMessage({ target: 'offscreen', type: 'music-vol', vol }).catch(() => {});
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local' || !ch.settings) return;
  const a = (ch.settings.oldValue || {}).pomo || {}, b = (ch.settings.newValue || {}).pomo || {};
  if (a.music !== b.music || a.vol !== b.vol || !!a.mpause !== !!b.mpause || JSON.stringify(a.tracks || []) !== JSON.stringify(b.tracks || [])) musicSync().catch(() => {});
});
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

// 🍅 1.10.23: phiên bị kẹt ở 0:00 (nền từng ngủ/hỏng nên lỡ hẹn giờ) → tự gỡ
//  • hết giờ < 10 phút: xử lý như bình thường (báo xong phiên / hết nghỉ)
//  • hết giờ lâu rồi: về trạng thái nghỉ, không báo cũ
//  • chưa hết giờ: đảm bảo còn hẹn giờ
async function pomoGuard() {
  const { pomo } = await chrome.storage.local.get('pomo');
  if (!pomo || pomo.phase === 'idle' || pomo.paused || !pomo.endAt) return;
  const late = Date.now() - pomo.endAt;
  if (late < -1500) { const a = await chrome.alarms.get('pomo'); if (!a) chrome.alarms.create('pomo', { when: pomo.endAt }); return; }
  if (late < 10 * 60000) return pomoTick();
  await pomoSave({ ...pomo, phase: 'idle', paused: false });
}
pomoGuard().catch(() => {});
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

// ---------- 🖼️ Lấy chữ trong ảnh (OCR bằng Gemini) ----------
const OCR_SYS = 'Bạn là công cụ nhận dạng chữ trong ảnh (OCR). Chỉ chép lại chữ, không giải thích, không dịch, không thêm gì.';
async function ocrImage(dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!m) throw new Error('Ảnh không hợp lệ');
  const ask = `Chép lại CHÍNH XÁC toàn bộ chữ có trong ảnh này.
- Giữ nguyên ngôn ngữ gốc, dấu tiếng Việt, số liệu, ký hiệu, chữ hoa thường.
- Giữ xuống dòng, đọc theo thứ tự từ trên xuống, trái sang phải. Nhiều cột thì chép hết cột trái rồi tới cột phải.
- Bảng: mỗi hàng một dòng, các ô cách nhau bằng " | ".
- Không thêm lời dẫn, không giải thích, không dịch, không bọc trong dấu \`\`\`.
- Ảnh không có chữ thì trả về đúng: (không có chữ)`;
  const out = await gemini([{ role: 'user', parts: [{ inlineData: { mimeType: m[1], data: m[2] } }, { text: ask }] }], OCR_SYS, { temperature: 0, maxTokens: 8192 });
  return out.replace(/^```[a-z]*\s*|```\s*$/g, '').trim();
}
// 🔍 Live Text (giống iPhone): đọc chữ KÈM vị trí từng dòng để phủ chữ chọn được lên ảnh
async function ocrBoxes(dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!m) throw new Error('Ảnh không hợp lệ');
  const ask = `Tìm MỌI dòng chữ trong ảnh. Trả về JSON mảng, mỗi phần tử là 1 dòng chữ:
{"t": "<chữ của dòng, chép CHÍNH XÁC, giữ dấu tiếng Việt, số, ký hiệu>", "b": [ymin, xmin, ymax, xmax]}
b là khung bao dòng chữ đó, toạ độ chuẩn hoá 0–1000 theo chiều cao/rộng ảnh.
Đọc từ trên xuống, trái sang phải. Chữ cùng hàng nhưng cách xa nhau (khác cột) thì tách thành dòng riêng. Không có chữ thì trả [].`;
  const out = await gemini([{ role: 'user', parts: [{ inlineData: { mimeType: m[1], data: m[2] } }, { text: ask }] }], OCR_SYS, { temperature: 0, maxTokens: 8192, json: true });
  let arr = [];
  try { arr = JSON.parse(out.replace(/^```[a-z]*\s*|```\s*$/g, '').trim()); } catch { const j = out.match(/\[[\s\S]*\]/); if (j) arr = JSON.parse(j[0]); }
  return (Array.isArray(arr) ? arr : []).filter(x => x && typeof x.t === 'string' && Array.isArray(x.b) && x.b.length === 4).slice(0, 400)
    .map(x => ({ t: x.t, b: x.b.map(n => Math.max(0, Math.min(1000, Number(n) || 0))) }));
}
// 🗒 mở note thành giấy dán (cửa sổ nhỏ, xếp so le); đã mở rồi thì đưa lên trước
async function openSticky(id) {
  const url = chrome.runtime.getURL('sticky.html?id=' + encodeURIComponent(id));
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('sticky.html') + '*' }).catch(() => []);
  const old = tabs.find(t => t.url === url);
  if (old) { chrome.windows.update(old.windowId, { focused: true }).catch(() => {}); return; }
  const n = tabs.length % 6;
  let left, top;
  try { const d = (await chrome.system.display.getInfo())[0].workArea; left = d.left + d.width - 360 - n * 28; top = d.top + 60 + n * 28; } catch {}
  chrome.windows.create({ url, type: 'popup', width: 330, height: 360, left, top, focused: true });
}
async function fetchAsDataUrl(url) {
  if (/^data:image\//.test(url)) return url;
  const r = await fetch(url, { credentials: 'include' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const bl = await r.blob(); if (!/^image\//.test(bl.type)) throw new Error('not image');
  const buf = new Uint8Array(await bl.arrayBuffer()); let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return `data:${bl.type};base64,${btoa(s)}`;
}
async function ocrFromImageUrl(src, tab) {
  // tải thẳng ảnh; ảnh bị chặn (khác tên miền) thì chụp màn hình rồi cắt đúng chỗ ảnh
  try { const image = await fetchAsDataUrl(src); return chrome.tabs.sendMessage(tab.id, { type: 'hh-ocr', image }).catch(() => {}); } catch {}
  try { const shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }); chrome.tabs.sendMessage(tab.id, { type: 'hh-ocr', shot, src }).catch(() => {}); }
  catch { chrome.tabs.sendMessage(tab.id, { type: 'hh-ocr', error: 'Không lấy được ảnh này. Thử “Lấy chữ trong vùng chọn” nhé.' }).catch(() => {}); }
}
// 1.9.98: manifest không còn "commands" → chrome.commands có thể không tồn tại; gọi thẳng làm service worker chết (mọi chức năng lưu/nhắn tin hỏng)
if (chrome.commands && chrome.commands.onCommand) chrome.commands.onCommand.addListener((cmd, tab) => {
  if (cmd === 'ocr-area' && tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: 'hh-ocr-area' }).catch(() => {});
});

// ---------- Menu chuột phải ----------
async function makeMenus() {
  await loadLang();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'hh', title: HT.tr('🐹 HaoHao'), contexts: ['selection', 'page'] });
    // 1.9.88: bỏ quét chữ trong ảnh qua chuột phải (Chrome đã có Google Ống kính)
    chrome.contextMenus.create({ id: 'hh-remind', parentId: 'hh', title: HT.tr('🔔 Nhắc tôi: “%s”'), contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'hh-note', parentId: 'hh', title: HT.tr('📝 Lưu Note'), contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: 'hh-todo', parentId: 'hh', title: HT.tr('☑️ Thêm vào Todo'), contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'hh-translate', parentId: 'hh', title: HT.tr('🌐 Dịch'), contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: 'hh-explain', parentId: 'hh', title: HT.tr('💡 Giải thích'), contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'hh-shop', parentId: 'hh', title: HT.tr('🛒 Tìm trên Shopee: “%s”'), contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'hh-summary', parentId: 'hh', title: HT.tr('✨ Tóm tắt trang này'), contexts: ['page', 'selection'] });
  });
}
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const sel = (info.selectionText || '').trim();
  const toTab = msg => tab && tab.id && chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
  if (info.menuItemId === 'hh-remind' && sel) {
    const r = await quickRemind(sel);
    const when = r.due ? new Date(r.due).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
    notifyTr('hr' + Date.now(), { type: 'basic', iconUrl: 'icons/icon128.png', title: '🐹 Đã đặt nhắc',
      message: when ? `${when}: ${r.item.text}` : `Đã thêm "${r.item.text}" vào Todo. Chưa thấy giờ trong câu, bạn bấm ⏰ để hẹn giờ nhé.` });
    toTab({ type: 'hh-open', tab: 'bell' });
  }
  if (info.menuItemId === 'hh-todo' && sel) {
    const { todos = [] } = await chrome.storage.local.get('todos');
    todos.push({ id: 't' + Date.now().toString(36), text: sel.slice(0, 200), done: false, due: '', notified: false });
    await chrome.storage.local.set({ todos });
    toTab({ type: 'hh-open', tab: 'todo' });
  }
  if (info.menuItemId === 'hh-clip') {
    toTab({ type: 'hh-clip-save' });   // trang tự đọc bộ nhớ chép (cách đã chạy chắc) rồi lưu Note
  }
  if (info.menuItemId === 'hh-note') {
    await ideaAdd({ type: sel ? 'text' : 'page', text: sel, title: tab ? tab.title : '', url: tab ? tab.url : '' });
    toTab({ type: 'hh-open', tab: 'idea' });
  }
  if (info.menuItemId === 'hh-ocr-img' && info.srcUrl && tab) ocrFromImageUrl(info.srcUrl, tab);
  if (info.menuItemId === 'hh-ocr-area') toTab({ type: 'hh-ocr-area' });
  if (info.menuItemId === 'hh-translate') toTab({ type: 'hh-open', tab: 'info', sub: 'dich', text: sel });
  if (info.menuItemId === 'hh-explain') toTab({ type: 'hh-open', tab: 'info', sub: 'explain', text: sel });
  // bôi đen tên món → HaoHao tìm và lọc sẵn trong bảng Mua sắm; trang không chạy được HaoHao thì mở thẳng Shopee
  if (info.menuItemId === 'hh-shop' && sel) {
    const q = sel.replace(/\s+/g, ' ').slice(0, 100);
    const ok = tab && tab.id && await chrome.tabs.sendMessage(tab.id, { type: 'hh-open', tab: 'shop', search: q }).then(() => true).catch(() => false);
    if (!ok) openDeal(HT.shopeeFindUrl(q));
  }
  if (info.menuItemId === 'hh-summary') toTab({ type: 'hh-open', tab: 'info', sub: 'read', run: true });
});

// ---------- 💡 Giải thích ----------
// ✨ Giấy dán: sắp xếp lại nội dung chính cho gọn (giữ đủ ý, không bịa thêm)
async function noteTidy(text) {
  const t = String(text || '').trim(); if (!t) throw new Error('Note trống');
  const ask = `Sắp xếp lại ghi chú dưới đây cho gọn, dễ đọc, làm nổi bật NỘI DUNG CHÍNH.
Yêu cầu:
- Giữ ĐỦ ý và số liệu, giữ ngôn ngữ gốc. KHÔNG bịa thêm, không bình luận.
- Dòng đầu: 1 câu tóm ý chính (in đậm).
- Chia thành vài phần, mỗi phần có tiêu đề ngắn in đậm, bên dưới là các gạch đầu dòng ngắn gọn.
- Trả về HTML đơn giản, CHỈ dùng các thẻ: <div>, <b>, <ul>, <li>, <br>. Không dùng markdown, không bọc trong \`\`\`.

Ghi chú:
${t.slice(0, 12000)}`;
  const out = await gemini([{ role: 'user', parts: [{ text: ask }] }], AI_SYS, { temperature: 0.2, maxTokens: 4096 });
  return out.replace(/^```[a-z]*\s*|```\s*$/g, '').trim();
}
// 🈯 Phụ đề song ngữ: dịch một gói câu phụ đề theo ngữ cảnh cả video, giữ đúng số dòng
const SUB_LANG = { vi: 'tiếng Việt', en: 'tiếng Anh', zh: 'tiếng Trung giản thể', ja: 'tiếng Nhật', ko: 'tiếng Hàn', fr: 'tiếng Pháp', de: 'tiếng Đức', es: 'tiếng Tây Ban Nha', th: 'tiếng Thái', ru: 'tiếng Nga' };
async function aiSubs({ lines, ctx = [], title, to }) {
  if (!Array.isArray(lines) || !lines.length) return [];
  const L = SUB_LANG[to] || to;
  const ask = `Bạn là người dịch phụ đề phim chuyên nghiệp. Dịch các câu phụ đề của video "${String(title || '').slice(0, 150)}" sang ${L}.
Yêu cầu:
- Dịch đúng nghĩa theo NGỮ CẢNH cả đoạn (các câu nối tiếp nhau, một câu có thể bị cắt sang dòng sau), tự nhiên như người bản xứ nói, ngắn gọn kiểu phụ đề.
- Giữ tên riêng, thuật ngữ; không thêm giải thích, không bỏ ý.
- Trả về ĐÚNG ${lines.length} phần tử, theo đúng thứ tự, phần tử thứ i là bản dịch dòng thứ i.
` + (ctx.length ? `Ngữ cảnh ngay trước (không cần dịch):\n${ctx.join('\n')}\n` : '') + `Các dòng cần dịch (JSON):
${JSON.stringify(lines)}`;
  const out = await gemini([{ role: 'user', parts: [{ text: ask }] }], 'Bạn chỉ trả về một mảng JSON các chuỗi, không thêm gì khác.', { temperature: 0.2, maxTokens: 8192, json: true, fast: true });
  let arr; try { arr = JSON.parse(out.replace(/^```(json)?\s*|```\s*$/g, '')); } catch { throw new Error('bad'); }
  if (arr && !Array.isArray(arr)) arr = Object.values(arr).find(Array.isArray);
  if (!Array.isArray(arr) || arr.length !== lines.length) throw new Error('count');
  return arr.map(x => String(x || '').trim());
}
async function aiExplain({ text, mode, context, deep }, onChunk) {
  const how = {
    de: 'Giải thích thật dễ hiểu như nói với người không chuyên, 2 đến 4 câu, không dùng thuật ngữ khó.',
    chitiet: 'Giải thích chi tiết: định nghĩa, cách hoạt động hoặc cách tính (nếu có), khi nào dùng, lưu ý thường gặp. Dùng gạch đầu dòng "- ".',
    vidu: 'Giải thích ngắn gọn 1 đến 2 câu, rồi cho 2 ví dụ cụ thể, gần gũi với người Việt (có số liệu minh hoạ nếu hợp).'
  }[mode] || '';
  return gemini([{ role: 'user', parts: [{ text:
    `Người dùng đang đọc trang "${context || ''}" và bôi đen cụm sau, muốn biết nó nghĩa là gì:
"${String(text).slice(0, 2000)}"
${how}
Nếu là tiếng nước ngoài thì ghi nghĩa tiếng Việt trước. Bắt đầu bằng **tên cụm từ** in đậm. Trả lời bằng tiếng Việt.` }] }], AI_SYS, { temperature: 0.3, maxTokens: 2048, onChunk, fast: !deep });
}

// ---------- 🛒 Mua sắm (Shopee, TikTok Shop): mở link tiếp thị ----------
// Chỉ mở link tiếp thị khi người dùng tự bấm (nút Mua ngay, So giá, Tìm). Không tự thay link khi đang lướt web.
// 🔎 1.10.108 soi sản phẩm qua máy chủ HaoHao (Cloudflare) – khoá API nằm trên máy chủ, không nằm trong tiện ích
// 1.10.109: KHÔNG cần máy chủ – gọi thẳng AccessTrade (kho Shopee) + RioHub (TikTok) bằng khoá chủ app dán trong HaoHao
//   (khoá chỉ lưu trong Chrome máy này: storage 'spyKeys' = { at, rh, creator }).
const spyNum = v => { const n = Number(String(v ?? '').replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; };
const spyFold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
let spyMem = null, spyBuilding = null;
function spySlimShopee(p) {
  const pr = spyNum(p.price), dc = spyNum(p.discount), old = Math.max(pr, dc > 1000 ? dc : 0);
  const price = dc > 1000 && pr > 1000 ? Math.min(pr, dc) : (pr || dc);
  return { src: 'shopee', id: String(p.product_id || p.sku || ''), title: p.name || '', image: p.image || '', price, oldPrice: old > price ? old : 0,
    discount: spyNum(p.discount_rate) || (old > price ? Math.round((1 - price / old) * 100) : 0), shop: p.shop_name || '', cate: p.cate || '', url: p.url || '' };
}
// tải cả kho Shopee của AccessTrade (200 món/trang, ~65 trang), mỗi ngày 1 lần, lưu trong máy
async function spyShopeeFeed(k) {
  const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  if (spyMem && spyMem.day === day) return spyMem.items;
  const { spyFeed } = await chrome.storage.local.get('spyFeed');
  if (spyFeed && spyFeed.day === day && spyFeed.items && spyFeed.items.length) { spyMem = { day, items: spyFeed.items.map(x => ({ ...x, _f: spyFold(x.title + ' ' + x.shop + ' ' + x.cate) })) }; return spyMem.items; }
  if (!spyBuilding) spyBuilding = (async () => {
    const items = [];
    for (let page = 1; page <= 120; page++) {
      const r = await fetch(`https://api.accesstrade.vn/v1/datafeeds?domain=shopee.vn&limit=200&page=${page}`, { headers: { Authorization: 'Token ' + k.at } });
      if (!r.ok) { if (items.length) break; throw new Error('AccessTrade ' + r.status); }
      // AccessTrade có trang trả JSON lỗi ("desc": NaN) → đổi NaN/Infinity thành null rồi mới đọc; trang hỏng hẳn thì bỏ qua
      let j; try { j = JSON.parse((await r.text()).replace(/:\s*-?(NaN|Infinity)\b/g, ': null')); } catch { continue; }
      const raw = j.data || [], got = raw.map(spySlimShopee).filter(x => x.url && x.title);
      items.push(...got); if (raw.length < 200) break;
    }
    await chrome.storage.local.set({ spyFeed: { day, at: Date.now(), items } });
    spyMem = { day, items: items.map(x => ({ ...x, _f: spyFold(x.title + ' ' + x.shop + ' ' + x.cate) })) };
    return spyMem.items;
  })().finally(() => { spyBuilding = null; });
  // kho cũ (hôm qua) dùng tạm trong lúc tải kho mới
  if (spyFeed && spyFeed.items && spyFeed.items.length) { spyBuilding.catch(() => {}); return spyFeed.items.map(x => ({ ...x, _f: spyFold(x.title + ' ' + x.shop + ' ' + x.cate) })); }
  return spyBuilding;
}
async function spyShopee(k, q, page) {
  const w = spyFold(q).split(/\s+/).filter(Boolean);
  const hit = (await spyShopeeFeed(k)).filter(x => w.every(t => x._f.includes(t)));
  hit.sort((a, b) => (b.discount || 0) - (a.discount || 0));
  return { items: hit.slice((page - 1) * 20, page * 20).map(({ _f, ...x }) => x), total: hit.length };
}
async function spyTikTok(k, q, cursor) {
  const qs = new URLSearchParams({ creator_username: k.creator || 'nhanhimdaily', keyword: q, page_size: '20' }); if (cursor) qs.set('page_token', cursor);
  let last;
  for (const base of ['https://riohub.vn/api/v1', 'https://riohub.riokupon.com/api/v1', 'https://riohub.riokupon.me/api/v1']) {
    try {
      const r = await fetch(`${base}/partner/tiktok/affiliate/products/search?${qs}`, { headers: { 'X-Riohub-Api-Key': k.rh } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { items: [], error: (j.error && j.error.message) || 'RioHub ' + r.status };
      return { next: j.next_page_token || '', items: (j.products || []).map(p => {
        const price = spyNum(p.sales_price && p.sales_price.minimum_amount) || spyNum(p.price && (p.price.floor_price || p.price.amount));
        const rate = ((p.observed_commission && p.observed_commission.commission_rate) || (p.commission && p.commission.rate) || 0) / 100;
        return { src: 'tiktok', id: String(p.id), title: p.title || '', image: p.main_image_url || '', price, oldPrice: 0, discount: 0, rate,
          commission: spyNum(p.commission && p.commission.amount) || Math.round(price * rate / 100), sold: (p.market_performance && p.market_performance.historical_sold_quantity) || 0,
          rating: spyNum(p.review && p.review.overall_score), shop: (p.shop && p.shop.name) || p.seller_name || '', url: `https://www.tiktok.com/view/product/${p.id}` };
      }) };
    } catch (e) { last = e; }
  }
  return { items: [], error: 'RioHub: ' + (last && last.message) };
}
async function spySearch({ q, src, cursor, page }) {
  if (!HT.SPY_API) {
    const { spyKeys: k } = await chrome.storage.local.get('spyKeys');
    if (!k || (!k.at && !k.rh)) return { ok: false, error: 'off' };
    src = src || 'all'; page = page || 1;
    const [shopee, tiktok] = await Promise.all([
      src === 'tiktok' || !k.at ? null : spyShopee(k, q, page).catch(e => ({ items: [], error: e.message })),
      src === 'shopee' || !k.rh ? null : spyTikTok(k, q, cursor).catch(e => ({ items: [], error: e.message })),
    ]);
    return { ok: true, q, shopee, tiktok };
  }
  const u = new URL(HT.SPY_API.replace(/\/$/, '') + '/search');
  u.searchParams.set('q', q); u.searchParams.set('src', src || 'all'); u.searchParams.set('size', '20');
  if (cursor) u.searchParams.set('cursor', cursor); if (page) u.searchParams.set('page', String(page));
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(u, { headers: HT.SPY_TOKEN ? { 'x-haohao-token': HT.SPY_TOKEN } : {}, signal: ctl.signal });
    const j = await r.json(); if (!r.ok) return { ok: false, error: j.error || 'HTTP ' + r.status };
    return { ok: true, ...j };
  } finally { clearTimeout(tm); }
}
async function openDeal(url) {
  if (typeof url !== 'string' || !/^https:\/\//.test(url) || MAIL_HOSTS.some(h => url.startsWith(h))) return;
  const { couponFeed } = await chrome.storage.local.get('couponFeed'); HT.setTikTok(couponFeed && couponFeed.tiktok);
  chrome.tabs.create({ url: HT.aff(url) });
}
// ---------- 🎟️ Kho mã giảm giá ----------
// Nhận nội dung coupons.json (từ GitHub hoặc bản đóng gói), lọc dữ liệu hợp lệ rồi lưu cho các trang dùng
async function applyFeed(feed) {
  const coupons = (feed.coupons || []).filter(c => c && c.id && HT.couponLive(c)).slice(0, 200);
  const hubs = (feed.hubs || []).filter(h => h && /^https:\/\//.test(h.url)).slice(0, 12);
  // link TikTok riêng từng món: chỉ nhận mã sản phẩm là số và link tiktok.com; kèm tên món để gợi ý món tương tự
  const tt = feed.tiktok || {}, links = {}, titles = {}, images = {};
  for (const [id, u] of Object.entries(tt.links || {}).slice(0, 2000)) if (/^\d{8,}$/.test(id) && /^https:\/\/(vt|vm|www|shop)\.tiktok\.com\//.test(u)) {
    links[id] = u; const t = (tt.titles || {})[id]; if (typeof t === 'string' && t.trim()) titles[id] = t.trim().slice(0, 160);
    const im = (tt.images || {})[id]; if (typeof im === 'string' && /^https:\/\/[\w.-]+\.(ibyteimg|tiktokcdn|tiktokcdn-us|byteimg)\.com\//.test(im)) images[id] = im;
  }
  // link rút gọn chủ app dán vào file (tiktok.list): lấy mã/tên/ảnh đã đọc trước đó trên máy này
  const short = (Array.isArray(tt.list) ? tt.list : []).map(u => String(u || '').trim()).filter(u => /^https:\/\/(vt|vm)\.tiktok\.com\/[\w-]+\/?$/.test(u)).slice(0, 300);
  const { ttCache = {} } = await chrome.storage.local.get('ttCache');
  for (const u of short) { const x = ttCache[u]; if (x && x.id && !links[x.id]) { links[x.id] = u; if (x.title) titles[x.id] = x.title; if (x.image) images[x.id] = x.image; } }
  const tiktok = { creator: /^[\w.]{2,40}$/.test(tt.creator || '') ? tt.creator : '', links, titles, images, showcase: /^https:\/\/(www\.|vt\.|vm\.)?tiktok\.com\//.test(tt.showcase || '') ? tt.showcase : '' };
  HT.setTikTok(tiktok);
  const sp = feed.shopee || {}, shopee = { showcase: /^https:\/\/(collshp\.com|shopee\.vn|s\.shopee\.vn)\//.test(sp.showcase || '') ? sp.showcase : '' };
  // 🔥 deal hôm nay + ☕ ủng hộ (chủ app chọn)
  const deals = (Array.isArray(feed.deals) ? feed.deals : []).filter(x => x && /^[\w-]{1,40}$/.test(x.id || '') && /^https:\/\/(www\.|s\.)?shopee\.vn\//.test(x.url || '') && x.title)
    .slice(0, 40).map(x => ({ id: x.id, url: x.url, title: String(x.title).slice(0, 150), image: /^https:\/\//.test(x.image || '') ? x.image : '', price: Number(x.price) || 0, orig: Number(x.orig) || 0 }));
  // 🎧 nhạc gợi ý (chủ app chọn): chỉ nhận link https, tối đa 30 bản
  const music = (Array.isArray(feed.music) ? feed.music : []).filter(m => m && /^[\w-]{1,40}$/.test(m.id || '') && /^https:\/\//.test(m.url || ''))
    .slice(0, 30).map(m => ({ id: m.id, name: String(m.name || 'Nhạc gợi ý').slice(0, 80), url: m.url }));
  // 📣 tin của chủ app (1.10.125): thông báo / giới thiệu sản phẩm mới – mỗi tin hiện 1 lần trên máy khách
  const news = (Array.isArray(feed.news) ? feed.news : []).filter(x => x && /^[\w-]{1,40}$/.test(x.id || '') && (x.title || x.text) && (!x.until || new Date(x.until).getTime() > Date.now()))
    .slice(0, 5).map(x => ({ id: x.id, title: String(x.title || '📣 HaoHao').slice(0, 60), text: String(x.text || '').slice(0, 300), url: /^https:\/\//.test(x.url || '') ? x.url : '', btn: String(x.btn || 'Xem ngay').slice(0, 24), until: x.until || '' }));
  const fanpage = /^https:\/\/(www\.|m\.)?(facebook\.com|fb\.com)\//.test(feed.fanpage || '') ? feed.fanpage : '';   // 1.10.127: fanpage HaoHao (bước 3 mở khoá Tiện ích)
  const he = feed.hotEvent, hotEvent = he && he.name && (!he.until || new Date(he.until).getTime() > Date.now()) ? { name: String(he.name).slice(0, 20), text: String(he.text || '').slice(0, 120), url: /^https:\/\/(www\.|s\.)?shopee\.vn\//.test(he.url || '') ? he.url : '', until: he.until || '' } : null;   // 1.10.165
  await chrome.storage.local.set({ couponFeed: { at: Date.now(), updated: feed.updated || '', coupons, hubs, tiktok, shopee, music, deals, news, fanpage, hotEvent } });
  const todo = short.filter(u => !ttCache[u] || (!ttCache[u].id && Date.now() - (ttCache[u].at || 0) > 864e5));
  if (todo.length) ttLearn(todo).then(n => { if (n) applyFeed(feed); }).catch(() => {});
  return { ok: true, n: coupons.length };
}

// ---------- 🛍️ Link TikTok của chủ app: file coupons.json chỉ cần link vt.tiktok.com; máy người dùng tự đọc mã + tên + ảnh 1 lần rồi nhớ ----------
const ttTitleOf = url => { try { const j = JSON.parse(new URL(url).searchParams.get('og_info') || '{}'); return String(j.title || '').replace(/\+/g, ' ').trim(); } catch { return ''; } };
const ttImageOf = url => { try { const j = JSON.parse(new URL(url).searchParams.get('og_info') || '{}'); return /^https:\/\//.test(j.image || '') ? j.image : ''; } catch { return ''; } };
const htmlDecode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// 1 dòng dán vào: "link" hoặc "link  mã-sản-phẩm" (khi TikTok không cho HaoHao tự đọc mã)
async function ttResolve(line) {
  const link = (line.match(/https:\/\/(?:vt|vm)\.tiktok\.com\/[\w-]+\/?/) || [])[0];
  const long = (line.match(/https:\/\/(?:www|shop)\.tiktok\.com\/\S+/) || [])[0];
  let id = (line.replace(/https?:\/\/\S+/g, ' ').match(/\b(\d{15,22})\b/) || [])[1] || (long ? HT.ttId(long) : ''), title = long ? ttTitleOf(long) : '', image = long ? ttImageOf(long) : '';
  if (!link) return { line, error: long ? 'Cần link rút gọn vt.tiktok.com (Chia sẻ → Sao chép liên kết)' : 'Không thấy link TikTok' };
  if (!id || !title) {
    try {
      const r = await fetch(link, { redirect: 'follow', credentials: 'omit' });
      id = id || HT.ttId(r.url); title = title || ttTitleOf(r.url); image = image || ttImageOf(r.url);
      if (!id || !title) {
        const html = await r.text();
        id = id || ((html.match(/\/pdp\/(?:[^"'?\/\s]*\/)?(\d{15,22})|\/product\/(\d{15,22})/) || []).slice(1).find(Boolean) || '');
        title = title || htmlDecode((html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1] || '').replace(/\s*\|\s*TikTok.*$/i, '');
        image = image || htmlDecode((html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || '');
      }
    } catch {}
  }
  if (!id) return { line, link, error: 'Không đọc được mã sản phẩm: dán thêm mã (dãy số sau /pdp/) cùng dòng' };
  return { line, link, id, title: title.slice(0, 160), image };
}
// đọc link rút gọn TikTok (tối đa 20 link mỗi lượt), nhớ vào ttCache; trả về số link đọc được
let ttLearning = false;
async function ttLearn(list) {
  if (ttLearning) return 0; ttLearning = true; let n = 0;
  try {
    const { ttCache = {} } = await chrome.storage.local.get('ttCache');
    for (const u of list.slice(0, 20)) {
      const x = await ttResolve(u).catch(() => ({}));
      ttCache[u] = x && x.id ? { id: x.id, title: x.title || '', image: /^https:\/\//.test(x.image || '') ? x.image : '', at: Date.now() } : { at: Date.now() };
      if (x && x.id) n++;
    }
    await chrome.storage.local.set({ ttCache });
  } finally { ttLearning = false; }
  return n;
}
// Lấy từ file coupons.json trên GitHub (chủ app cập nhật); mạng lỗi thì dùng bản đóng gói sẵn trong tiện ích.
async function syncCoupons() {
  let feed = null;
  try { const r = await fetch(HT.COUPON_FEED + '?t=' + Math.floor(Date.now() / 3600e3), { cache: 'no-store' }); if (r.ok) feed = await r.json(); } catch {}
  // GitHub chưa có / mất mạng: dùng bản đi kèm tiện ích (luôn mới theo phiên bản); hỏng nữa mới dùng bản đã lưu
  if (!feed) { try { feed = await (await fetch(chrome.runtime.getURL('coupons.json'))).json(); } catch {} }
  if (!feed) { const { couponFeed } = await chrome.storage.local.get('couponFeed'); if (couponFeed && couponFeed.coupons) { HT.setTikTok(couponFeed.tiktok); return { ok: true, cached: true, n: couponFeed.coupons.length }; } return { ok: false }; }
  const res = await applyFeed(feed);
  syncHot().catch(() => {});   // 1.10.178: mã hot tự động từ máy chủ (AccessTrade, mỗi giờ)
  return res;
}
async function syncHot() {
  if (!HT.PRICE_API) return;
  const r = await fetch(HT.PRICE_API.replace(/\/$/, '') + '/hot?t=' + Math.floor(Date.now() / 6e5), { cache: 'no-store' }); if (!r.ok) return;   // 1.10.182: không dùng bản nhớ đệm cũ (rỗng)
  const j = await r.json(); const items = (j.items || []).filter(c => c && c.id && c.shop === 'shopee' && HT.couponLive(c) && (!c.url || /^https:\/\/(www\.)?shopee\.vn\//.test(c.url))).slice(0, 30);
  await chrome.storage.local.set({ autoHot: { at: Date.now(), items } });
}

// ---------- ❤️ Món đã lưu: khách bấm "🔄 Cập nhật tất cả" ----------
// Không có API: lần lượt mở từng món Shopee ở 1 tab nền (link thường, không gắn link tiếp thị), đọc giá rồi đóng.
// Tối đa 5 món mỗi lần, nghỉ 3 giây giữa các món để không làm phiền Shopee. Giá được ghi ở content.js (HT.applyPrice).
let prodBusy = false;
// 🔔 Canh giá (1.10.115): mỗi ngày 1 lần mở nền các món Shopee đã lưu (tab không hiện lên trước), ghi giá; giảm / chạm mức thì báo
// 🧾 Kho giá chung (1.10.122): gom giá các món khách xem, vài phút gửi 1 lần (mỗi lần ≤60 món); hỏi lịch sử giá 1 món (nhớ 10 phút)
const priceOn = async () => { if (!HT.PRICE_API) return false; const { settings = {} } = await chrome.storage.local.get('settings'); return settings.priceShare !== false; };
async function priceLog(items) {
  items = (items || []).filter(x => x && x.k && x.p > 0).slice(0, 120);
  if (!items.length || !(await priceOn())) return;
  const { pq = [] } = await chrome.storage.session.get('pq');
  for (const item of items) pq.push({ k: item.k, p: Math.round(item.p), b: Math.round(item.b || 0) });
  await chrome.storage.session.set({ pq: pq.slice(-600) });
  chrome.alarms.create('price-flush', { delayInMinutes: pq.length >= 40 ? 0.1 : 2 });
}
async function priceFlush() {
  if (!(await priceOn())) return;
  const { pq = [] } = await chrome.storage.session.get('pq'); if (!pq.length) return;
  await chrome.storage.session.set({ pq: pq.slice(60) });
  try {
    const r = await fetch(HT.PRICE_API.replace(/\/$/, '') + '/p', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: pq.slice(0, 60) }) });
    if (!r.ok) throw new Error('kho giá ' + r.status);
  } catch (e) { const { pq: now = [] } = await chrome.storage.session.get('pq'); await chrome.storage.session.set({ pq: [...pq.slice(0, 60), ...now].slice(-600) }); }
  if (pq.length > 60) chrome.alarms.create('price-flush', { delayInMinutes: 0.5 });
}
const histCache = new Map();
async function priceHist(k) {
  if (!k || !(await priceOn())) return null;
  const c = histCache.get(k); if (c && Date.now() - c.at < 600e3) return c.v;
  const r = await fetch(HT.PRICE_API.replace(/\/$/, '') + '/h?k=' + encodeURIComponent(k)); if (!r.ok) return null;
  const j = await r.json(), v = { pts: (j.items || {})[k] || [], day: j.day };
  histCache.set(k, { at: Date.now(), v }); if (histCache.size > 300) histCache.delete(histCache.keys().next().value);
  return v;
}
// 👥 Đếm người dùng (1.10.126): mỗi máy 1 mã ngẫu nhiên (không thông tin cá nhân), báo máy chủ 1 lần/ngày + phiên bản; gỡ HaoHao → Chrome mở trang /bye
async function hhId() {
  let { hhId: id } = await chrome.storage.local.get('hhId');
  if (!/^[a-z0-9]{16,40}$/.test(id || '')) { id = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '').slice(0, 24); await chrome.storage.local.set({ hhId: id }); }
  return id;
}
// 🔎 Kho key: gửi chữ tìm kiếm (không kèm mã máy) – mỗi máy mỗi từ khoá 1 lần/ngày → đếm số người tìm
async function kwLog(q, src) {
  q = String(q || '').trim().replace(/\s+/g, ' ').slice(0, 60); if (!HT.PRICE_API || q.length < 2) return;
  const { settings = {} } = await chrome.storage.local.get('settings'); if (settings.stats === false) return;
  const d = Math.floor((Date.now() + 7 * 3600e3) / 864e5), k = HT.fold(q);
  const { kwSeen = {} } = await chrome.storage.session.get('kwSeen').catch(() => ({}));
  const seen = kwSeen.d === d ? kwSeen.l || [] : [];
  if (seen.includes(k)) return;
  await chrome.storage.session.set({ kwSeen: { d, l: [...seen, k].slice(-300) } }).catch(() => {});
  fetch(HT.PRICE_API.replace(/\/$/, '') + '/k', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, src }) }).catch(() => {});
}
async function hhPing() {
  if (!HT.PRICE_API) return;
  const { settings = {}, pingDay = 0, pingV = '' } = await chrome.storage.local.get(['settings', 'pingDay', 'pingV']);
  if (settings.stats === false) return;
  const d = Math.floor((Date.now() + 7 * 3600e3) / 864e5), v = chrome.runtime.getManifest().version, id = await hhId(), base = HT.PRICE_API.replace(/\/$/, '');
  try { await chrome.runtime.setUninstallURL(`${base}/bye?id=${id}&v=${v}`); } catch {}
  if (pingDay === d && pingV === v) return;
  try {
    const r = await fetch(base + '/ping', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, v }) });
    if (r.ok) await chrome.storage.local.set({ pingDay: d, pingV: v });
  } catch {}
}
// 1.10.165: canh giá qua máy chủ HaoHao trước (kho giá chung, không mở tab, không captcha) – món nào máy chủ có giá hôm nay thì dùng luôn
const srvKeyOf = url => { const u = String(url || ''); const m = u.match(/-i\.(\d+)\.(\d+)/) || u.match(/\/product\/(\d+)\/(\d+)/); if (m && /shopee\.vn/.test(u)) return `sp:${m[1]}.${m[2]}`; const t = /tiktok\.com/.test(u) && u.match(/(\d{15,22})/); return t ? 'tt:' + t[1] : ''; };
// 📺 Săn live (thử nghiệm): xem trang live TikTok của shop khách theo dõi, đang live mà trước đó chưa live → báo 1 lần
async function liveCheck() {
  const { liveShops = [], liveStat = {}, settings = {} } = await chrome.storage.local.get(['liveShops', 'liveStat', 'settings']);
  if (settings.liveAlert === false || !liveShops.length) return;
  for (const s of liveShops.slice(0, 15)) {
    try {
      const r = await fetch(`https://www.tiktok.com/@${encodeURIComponent(s.u)}/live`, { credentials: 'include' }); if (!r.ok) continue;
      const h = await r.text();
      const live = /"status"\s*:\s*2\b/.test(h) && /"roomId"\s*:\s*"[1-9]\d{6,}"/.test(h);
      const was = liveStat[s.u] && liveStat[s.u].live;
      liveStat[s.u] = { live, at: Date.now(), since: live ? (was ? liveStat[s.u].since : Date.now()) : 0 };
      if (live && !was) await fire({ id: 'live-' + s.u, name: '🔴 HaoHao săn live', type: 'price' }, `@${s.u} đang live! Vào xem để săn mã chỉ có trong live nhé.`, 'alert', { url: `https://www.tiktok.com/@${s.u}/live` });
    } catch {}
    await new Promise(ok => setTimeout(ok, 1500));
  }
  await chrome.storage.local.set({ liveStat });
}
async function serverCheckPrices(products) {
  const fresh = new Set(); if (!HT.PRICE_API || !(await priceOn())) return { fresh, res: [] };
  const map = products.map(x => [x, srvKeyOf(x.url)]).filter(([, k]) => k), res = [];
  for (let i = 0; i < map.length; i += 20) {
    const part = map.slice(i, i + 20);
    try {
      const r = await fetch(HT.PRICE_API.replace(/\/$/, '') + '/h?k=' + encodeURIComponent(part.map(([, k]) => k).join(','))); if (!r.ok) continue;
      const j = await r.json();
      for (const [x, k] of part) { const pts = (j.items || {})[k] || [], last = pts[pts.length - 1]; if (last && last[0] === j.day && last[1] > 0) { fresh.add(x.id); res.push({ id: x.id, price: last[1], out: false }); } }
    } catch {}
  }
  return { fresh, res };
}
async function autoCheckPrices() {
  const { settings = {}, products = [], prodAutoAt = 0 } = await chrome.storage.local.get(['settings', 'products', 'prodAutoAt']);
  if (settings.priceAuto === false || !products.length) return;
  const srv = await serverCheckPrices(products).catch(() => ({ fresh: new Set(), res: [] }));   // mỗi 3 giờ
  let tabRes = [];
  if (Date.now() - prodAutoAt >= 20 * 3600e3) {   // món máy chủ chưa có giá hôm nay: mở tab nền như cũ, ≤ 1 lần/20 giờ
    const ids = products.filter(x => !srv.fresh.has(x.id) && x.shop !== 'tiktok' && /^https:\/\/(www\.)?shopee\.vn\//.test(x.url || '')).map(x => x.id);
    if (ids.length) { await chrome.storage.local.set({ prodAutoAt: Date.now() }); const r = await prodUpdate(ids); if (r && r.ok && r.res) tabRes = r.res; }
  }
  const all = [...srv.res, ...tabRes]; if (!all.length) return;
  const { products: ps = [] } = await chrome.storage.local.get('products'); const evs = [];
  for (const x of all) { const it = ps.find(y => y.id === x.id); if (!it || !(x.price || x.out)) continue; const ev = HT.applyPrice(it, x.price, x.out); if (x.image && !it.image) it.image = x.image; if (ev) evs.push([it, ev]); }
  await chrome.storage.local.set({ products: ps });
  for (const [it, ev] of evs) {
    const k = n => Number(n).toLocaleString('vi-VN') + 'đ';
    await fire({ id: 'canh-' + it.id, name: '🔔 HaoHao canh giá', type: 'price' },
      ev === 'target' ? `${it.title.slice(0, 60)}: còn ${k(it.price)}, đã chạm mức bạn đặt` : ev === 'back' ? `${it.title.slice(0, 60)}: có hàng lại rồi, giá ${k(it.price)}` : ev === 'up' ? (() => { const sl = HT.saleDays(new Date(), 6).find(x => x.big && x.days <= 10), h = (it.history || []).slice(-2)[0], pct = h && h.p ? Math.round((it.price / h.p - 1) * 100) : 0; return sl ? `🚨 ${it.title.slice(0, 50)}: còn ${sl.days} ngày nữa ${sl.name} mà giá vừa tăng ${pct}% (${k(it.price)}). Shop đang đẩy giá chờ sale, đừng mua lúc này!` : `${it.title.slice(0, 60)}: vừa tăng giá lên ${k(it.price)}`; })() : `${it.title.slice(0, 60)}: giảm còn ${k(it.price)} (lúc lưu ${k(it.saved)})`, 'alert', { url: HT.aff(it.url) });
  }
}
async function prodUpdate(ids, fromTab) {
  if (prodBusy) return { ok: false, busy: true };
  const { products = [] } = await chrome.storage.local.get('products');
  const due = products.filter(p => ids.includes(p.id) && /^https:\/\/(www\.)?shopee\.vn\//.test(p.url || '')).slice(0, HT.SAVE_MAX);
  if (!due.length) return { ok: true, res: [] };
  prodBusy = true; const res = [];
  const tell = i => fromTab && chrome.tabs.sendMessage(fromTab, { type: 'prod-progress', i, n: due.length }).catch(() => {});
  try {
    for (let i = 0; i < due.length; i++) {
      tell(i + 1);
      const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
      const r = await scanIn(tab.id, due[i].url, 'price', 20000);
      chrome.tabs.remove(tab.id).catch(() => {});
      res.push({ id: due[i].id, price: r && r.price || 0, image: r && r.image || '', out: !!(r && r.out) });
      if (i < due.length - 1) await new Promise(ok => setTimeout(ok, 3000));
    }
  } finally { prodBusy = false; }
  return { ok: true, res };
}

// ---------- 🎟️ Voucher Shopee: tự quét trang mã giảm giá, người dùng bấm thì tự "Lưu" mã vào tài khoản ----------
// ---------- 🎟️ Voucher Shopee: chỉ mở kho mã, người dùng tự bấm "Lưu" (không quét / lưu tự động) ----------
chrome.storage.local.remove('vouchers').catch(() => {});
// ---------- 🎟️ Săn mã (1.9.61): KHÁCH BẤM "Tìm mã tốt nhất" → mở 1 cửa sổ nhỏ HIỆN RÕ (không ngầm) ----------
// Đi lần lượt: mã của shop (trang sản phẩm / trang shop) → kho mã Shopee (hubs trong file chủ app) → lưu mã hợp với món đang xem.
// Khách dùng tài khoản Shopee của chính mình (đã đăng nhập sẵn trên Chrome). Gặp đăng nhập / xác minh thì dừng, để khách tự làm.
let hunt = null;   // { win, tab, from, key, stop }
const huntSleep = ms => new Promise(r => setTimeout(r, ms));
function huntTell(m) { if (hunt && hunt.from) chrome.tabs.sendMessage(hunt.from, { key: hunt.key, ...m }).catch(() => {}); }
function huntStop(why) {
  if (!hunt) return; hunt.stop = why || 'stop';
  const job = scanJobs.get(hunt.tab); if (job) job.done({ err: hunt.stop });
}
chrome.windows.onRemoved.addListener(id => { if (hunt && hunt.win === id) { hunt.closed = true; huntStop('closed'); } });
async function voucherHunt({ url, price, key, cart, hot, extra, ship, sale }, sender) {
  if (hunt) { if (hunt.win) chrome.windows.update(hunt.win, { focused: true }).catch(() => {}); return { ok: false, error: 'busy' }; }
  if (hot) { url = 'https://shopee.vn/'; price = 1e8; key = 'hot'; }   // 1.10.168: lưu hết mã hot (chủ app chọn) vào ví khách – khách bấm 1 nút
  if (!/^https:\/\/(www\.)?shopee\.vn\//.test(url || '') || !(price > 0)) return { ok: false, error: 'bad' };
  const m = url.match(/-i\.(\d+)\.(\d+)|\/product\/(\d+)\/(\d+)/), shopId = m ? (m[1] || m[3]) : '';
  const { couponFeed } = await chrome.storage.local.get('couponFeed');
  const hubs = ((couponFeed && couponFeed.hubs) || []).filter(h => h.shop === 'shopee' && /^https:\/\/(www\.)?shopee\.vn\//.test(h.url)).map(h => h.url);
  const hotUrls = [...new Set(((couponFeed && couponFeed.coupons) || []).filter(c => c.shop === 'shopee' && !c.code && /^https:\/\/(www\.)?shopee\.vn\//.test(c.url || '')).map(c => c.url))];
  // 1.10.230: nút "Tìm voucher" = săn 1 mã Freeship tốt nhất (+ mã đợt sale vào ngày sale). Mã shop / Shopee Voucher web đã tự tối ưu → không săn
  const shipSteps = ship ? [
    ...[...new Set(['https://shopee.vn/m/ma-giam-gia', ...hubs])].slice(0, 2).map(u => ({ kind: 'hub', ship: true, url: u, label: 'Mã Freeship' })),
    ...(sale ? [...new Set([...(extra || []).filter(u => /^https:\/\/(www\.)?shopee\.vn\//.test(u)), ...hotUrls])].slice(0, 3).map(u => ({ kind: 'hub', sale: true, url: u, label: 'Mã đợt sale' })) : [])] : null;
  const steps = shipSteps ? shipSteps : hot ? [...new Set(['https://shopee.vn/m/ma-giam-gia', ...(extra || []).filter(u => /^https:\/\/(www\.)?shopee\.vn\/m\//.test(u)), ...hotUrls])].slice(0, 5).map(u => ({ kind: 'hub', hot: true, url: u, label: 'Mã hot HaoHao' })) : [...(cart ? [] : [{ kind: 'shop', url: url.split('?')[0], shopId, label: 'Mã của shop' }]),
    ...(hubs.length ? hubs : ['https://shopee.vn/m/ma-giam-gia']).slice(0, 3).map(u => ({ kind: 'hub', url: u, label: 'Kho mã Shopee' }))];
  // cửa sổ nhỏ ở góc phải cửa sổ khách đang dùng
  let left, top;
  try { const w0 = await chrome.windows.get(sender.tab.windowId); left = Math.max(0, w0.left + w0.width - 880); top = w0.top + 60; } catch {}
  const w = await chrome.windows.create({ url: 'about:blank', type: 'popup', width: 860, height: 760, left, top, focused: true });
  hunt = { win: w.id, tab: w.tabs[0].id, from: sender.tab && sender.tab.id, key, stop: '' };
  const out = { key, at: Date.now(), price, saved: [], have: [], err: '', steps: steps.length };
  const seen = new Set();
  try {
    for (let i = 0; i < steps.length && !hunt.stop; i++) {
      huntTell({ type: 'vh-progress', i: i + 1, n: steps.length, label: steps[i].label, saved: out.saved.length });
      const r = await scanIn(hunt.tab, steps[i].url, 'vhunt', 60000, { ...steps[i], price, i: i + 1, n: steps.length, savedSoFar: out.saved.length });
      if (hunt.stop) break;
      if (!r) continue;   // trang chậm: bỏ qua bước này
      if (r.err) { out.err = r.err; break; }
      for (const x of r.saved || []) if (!seen.has(x.id)) { seen.add(x.id); out.saved.push(x); }
      for (const x of r.have || []) if (!seen.has(x.id)) { seen.add(x.id); out.have.push(x); }
      await huntSleep(1200);
    }
    if (hunt.stop && !out.err) out.err = hunt.stop;
    // 1.10.187: lưu mã xong → mở Ví voucher trong cửa sổ đó để HaoHao đọc lại ví (Ví voucher của khách cập nhật luôn)
    if (!out.err && out.saved.length) { huntTell({ type: 'vh-progress', i: steps.length, n: steps.length, label: 'Cập nhật ví', saved: out.saved.length }); await chrome.tabs.update(hunt.tab, { url: 'https://shopee.vn/user/voucher-wallet' }).catch(() => {}); await huntSleep(9000); }
  } finally {
    const h = hunt; hunt = null;
    // đăng nhập / xác minh: giữ cửa sổ để khách tự làm; còn lại tự đóng
    if (!h.closed && !/^(login|captcha)$/.test(out.err)) setTimeout(() => chrome.windows.remove(h.win).catch(() => {}), 1500);
    const { vhunt = {} } = await chrome.storage.local.get('vhunt');
    vhunt[key] = out;
    const keys = Object.keys(vhunt).sort((a, b) => (vhunt[b].at || 0) - (vhunt[a].at || 0)).slice(0, 20);
    await chrome.storage.local.set({ vhunt: Object.fromEntries(keys.map(k => [k, vhunt[k]])) });
    if (h.from) chrome.tabs.sendMessage(h.from, { type: 'vh-done', key, res: out }).catch(() => {});
  }
  return { ok: true, res: out };
}

// ---------- 🔍 Tìm cùng món ở shop khác trên Shopee ----------
// Shopee không cho đọc từ nền, nên dùng 1 tab ẩn: mở trang tìm kiếm (sắp theo giá) để lấy danh sách,
// rồi mở lần lượt vài sản phẩm rẻ hơn để đọc tên shop và chấm điểm kiểm tra, xong đóng tab.
const scanJobs = new Map();
function scanIn(tabId, url, type, ms, data) {
  return new Promise(resolve => {
    const t = setTimeout(() => { scanJobs.delete(tabId); resolve(null); }, ms);
    scanJobs.set(tabId, { type, data, done: r => { clearTimeout(t); scanJobs.delete(tabId); resolve(r); } });
    chrome.tabs.update(tabId, { url });
  });
}
// Tab dò ngầm nằm trong 1 cửa sổ thu nhỏ riêng, không chen vào thanh tab của người dùng; xong việc thì đóng cửa sổ
let scanWinP = null, scanUsers = 0;
async function scanTab() {
  scanUsers++;
  if (scanWinP) { const id = await scanWinP.catch(() => null); if (id && await chrome.windows.get(id).then(() => 1, () => 0)) return chrome.tabs.create({ windowId: id, url: 'about:blank', active: false }); }
  let first;
  scanWinP = chrome.windows.create({ url: 'about:blank', state: 'minimized', focused: false }).then(w => { first = w.tabs[0]; return w.id; });
  await scanWinP; return first;
}
function dropScanTab(tabId) {
  if (--scanUsers > 0) return chrome.tabs.remove(tabId).catch(() => {});
  scanUsers = 0; const p = scanWinP; scanWinP = null;
  if (p) p.then(id => chrome.windows.remove(id)).catch(() => {});
}
let sameQueue = Promise.resolve();
// báo tiến độ về trang đang hỏi: kết quả nhanh (từ trang tìm kiếm) rồi từng bước kiểm tra kỹ
const tellTab = (sender, key, m) => { if (sender && sender.tab && sender.tab.id) chrome.tabs.sendMessage(sender.tab.id, { type: 'same-progress', key, ...m }).catch(() => {}); };
const quickOpts = list => HT.pickOptions(list.map(x => ({ ...x, ...HT.listingScore(x), issues: [], quick: true })));
async function imgDists({ base, list }) {
  const mh = await imgHash(base); if (!mh || !Array.isArray(list)) return { d: [] };
  const d = new Array(list.length).fill(null);
  await mapLimit(list.slice(0, 30).map((u, i) => ({ u, i })), 8, async x => { const h = x.u ? await imgHash(x.u) : null; d[x.i] = h ? hamming(mh, h) : null; });
  return { d };
}
function sameFind(msg, sender) { const run = sameQueue.then(() => sameFindOne(msg, sender)); sameQueue = run.catch(() => {}); return run; }
// 🖼️ Dấu vân tay ảnh (dHash 64 bit): ảnh giống nhau (cùng ảnh gốc nhà cung cấp, khác chữ/viền chút ít) → khoảng cách nhỏ
const imgHashCache = new Map();
const thumbUrl = u => /susercontent\.com\/file\/[\w-]+$/.test(u) ? u + '_tn' : u;   // ảnh nhỏ của Shopee: tải nhanh
async function imgHash(url) {
  if (!/^https:\/\//.test(url || '')) return null;
  if (imgHashCache.has(url)) return imgHashCache.get(url);
  let h = null;
  try {
    const r = await fetch(thumbUrl(url), { credentials: 'omit' }); if (!r.ok) throw 0;
    const bmp = await createImageBitmap(await r.blob());
    const cv = new OffscreenCanvas(9, 8), x = cv.getContext('2d', { willReadFrequently: true });
    // cắt vuông ở giữa (bỏ viền, khung khác nhau giữa các shop)
    const s = Math.min(bmp.width, bmp.height) * 0.86, sx = (bmp.width - s) / 2, sy = (bmp.height - s) / 2;
    x.filter = 'blur(1px)';   // làm mờ nhẹ: bỏ qua chữ, logo, viền nhỏ shop chèn thêm
    x.drawImage(bmp, sx, sy, s, s, 0, 0, 9, 8);
    const px = x.getImageData(0, 0, 9, 8).data, g = i => px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    const bits = new Uint32Array(2); let k = 0;
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++, k++) if (g(yy * 9 + xx) > g(yy * 9 + xx + 1)) bits[k >> 5] |= 1 << (k & 31);
    h = bits;
  } catch { h = null; }
  if (imgHashCache.size > 600) imgHashCache.clear();
  imgHashCache.set(url, h); return h;
}
const hamming = (a, b) => { let n = 0; for (let i = 0; i < 2; i++) { let v = a[i] ^ b[i]; while (v) { v &= v - 1; n++; } } return n; };
async function mapLimit(arr, lim, fn) { const out = new Array(arr.length); let i = 0; await Promise.all(Array.from({ length: Math.min(lim, arr.length) }, async () => { while (i < arr.length) { const k = i++; out[k] = await fn(arr[k]); } })); return out; }
async function sameFindOne({ q, key, title, price, image }, sender) {
  const ck = 'same5:' + key, cache = (await chrome.storage.session.get(ck))[ck];
  if (cache && Date.now() - cache.at < 20 * 60e3) return { ...cache, cached: true };
  // tab trống trước, ghi nhận việc rồi mới tải trang (để trang không chạy trước khi kịp ghi nhận)
  const tab = await scanTab();
  try {
    tellTab(sender, key, { step: 'search' });
    const list = await scanIn(tab.id, HT.shopeeSearchUrl(q), 'search', 25000);
    if (!list) return { ok: false, error: 'timeout' };
    // CÙNG sản phẩm = tên khớp (hãng, model, dung lượng…) HOẶC ảnh gần như y hệt ảnh món đang xem; rẻ dưới 1/2 giá là đáng ngờ → bỏ
    const pool = list.filter(x => x.key !== key && x.price >= price * 0.5);
    const mh = await imgHash(image);
    if (mh) await mapLimit(pool.filter(x => x.price < price * 0.99 && x.image), 8, async x => { const h = await imgHash(x.image); x.imgDist = h ? hamming(mh, h) : 99; });
    const same = pool.map(x => { const t = HT.sameProduct(title, x.title), img = (x.imgDist ?? 99) <= 12; return { ...x, ...t, imgSame: img, same: t.same || (img && t.why !== 'phụ kiện khác món'), sim: img ? Math.max(t.sim || 0, 0.9) : t.sim }; }).filter(x => x.same);
    const cheaper = same.filter(x => x.price < price * 0.99).sort((a, b) => a.price - b.price);
    // ứng viên: 2 món rẻ nhất + 2 món có dấu hiệu uy tín nhất (Mall, Yêu thích, bán nhiều)
    const rep = x => (x.mall ? 3 : x.preferred ? 2 : 0) + (x.sold >= 1000 ? 1 : 0) + (x.rating >= 4.8 ? 1 : 0);
    const cands = [...new Map([...cheaper.slice(0, 2), ...[...cheaper].sort((a, b) => rep(b) - rep(a) || a.price - b.price).slice(0, 2), ...cheaper.slice(2)].map(x => [x.key, x])).values()].slice(0, 3);
    tellTab(sender, key, { step: 'check', done: 0, of: cands.length, quick: { total: same.length, options: quickOpts(cheaper) } });
    const checked = [];
    if (cheaper.length && cheaper.every(x => x.ratingCount !== undefined)) {
      checked.push(...cheaper.filter(x => !x.overseas && x.rating >= 4.5 && x.ratingCount >= 5).slice(0, 12).map(x => {
        const ts = HT.trustScore({ rating: x.rating, ratingCount: x.ratingCount, sold: x.sold, mall: x.mall, preferred: x.preferred, shipFrom: x.loc, shopStar: x.shopRating ? Math.round(x.shopRating * 10) / 10 : null });
        return { ...x, score: ts.score, level: ts.level, cls: ts.cls, issues: [], reasons: [...ts.product, ...ts.shop].sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.s] - { bad: 0, warn: 1, ok: 2 }[b.s])).slice(0, 6) };
      }).filter(x => x.score >= 55));
    } else checked.push(...await checkMany(cands, (t, c) => (c && c.imgSame) || HT.sameProduct(title, t).same, n => tellTab(sender, key, { step: 'check', done: n, of: cands.length })));
    // 3 lựa chọn: đáng mua nhất (rẻ nhất trong shop điểm cao), rẻ nhất, uy tín nhất
    // chỉ giới thiệu shop uy tín, đánh giá ổn (Khá ổn trở lên)
    const res = { ok: true, at: Date.now(), total: same.length, options: HT.pickOptions(checked.filter(x => x.score >= 60)) };
    await chrome.storage.session.set({ [ck]: res });
    return res;
  } finally { dropScanTab(tab.id); }
}

// Mở trang 1 sản phẩm trong tab ẩn để chấm điểm shop. verify(tênĐầyĐủ) = false thì bỏ món đó.
// kiểm tra kỹ nhiều món cùng lúc: mỗi món 1 tab trong cửa sổ thu nhỏ, xong món nào báo tiến độ món đó
async function checkMany(cands, verify, onDone) {
  let n = 0;
  const res = await Promise.all(cands.map(async c => {
    const t = await scanTab();
    try { const x = await checkListing(t.id, c, verify); n++; if (onDone) onDone(n); return x; }
    finally { dropScanTab(t.id); }
  }));
  return res.filter(Boolean);
}
async function checkListing(tabId, c, verify) {
  const r = await scanIn(tabId, c.url, 'item', 9000);
  if (verify && r && r.title && !verify(r.title, c)) return null;
  const info = (r && r.info) || { rating: c.rating, ratingCount: null, sold: c.sold, mall: c.mall, preferred: c.preferred, shipFrom: c.overseas ? 'Nước ngoài' : '' };
  const ts = HT.trustScore(info);
  return { key: c.key, url: c.url, image: (r && r.image) || c.image || '', title: (r && r.title) || c.title, sim: c.sim, price: (r && r.price) || c.price, shopName: (r && r.shopName) || '', score: ts.score, level: ts.level, cls: ts.cls,
    rating: info.rating || c.rating, sold: info.sold ?? c.sold, mall: !!(info.mall || c.mall), preferred: !!(info.preferred || c.preferred), full: !!(r && r.info),
    // bản kiểm tra gọn cho nút 🛡️: điểm xấu trước, tối đa 6 dòng + 2 lời chê nổi bật
    reasons: [...ts.product, ...ts.shop].sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.s] - { bad: 0, warn: 1, ok: 2 }[b.s])).slice(0, 6),
    issues: ((info.reviews && info.reviews.issues) || []).slice(0, 2).map(i => ({ label: i.label, n: i.n, quote: i.quotes[0] || '' })) };
}

// 🔎 Tìm sản phẩm: mở ngầm trang tìm kiếm Shopee, bỏ món rủi ro / lạc đề, kiểm tra 4 món tốt nhất rồi chọn 3
let findQueue = Promise.resolve();
function prodSearch(msg, sender) { const run = findQueue.then(() => prodSearchOne(msg, sender)); findQueue = run.catch(() => {}); return run; }
async function prodSearchOne({ q, range, mall }, sender) {
  q = String(q || '').trim().slice(0, 100); if (!q) return { ok: false, error: 'empty' };
  const ck = 'ps:' + HT.fold(q) + '|' + (range || '') + '|' + (mall ? 1 : 0), cache = (await chrome.storage.session.get(ck))[ck];
  if (cache && Date.now() - cache.at < 20 * 60e3) return { ...cache, cached: true };
  const tab = await scanTab();
  try {
    const pk = 'ps:' + HT.fold(q);
    tellTab(sender, pk, { step: 'search' });
    const list = await scanIn(tab.id, HT.shopeeFindUrl(q, range), 'search', 25000);
    if (!list) return { ok: false, error: 'timeout' };
    const [lo, hi] = HT.PRICE_RANGES[range] || [0, Infinity];
    const fit = list.filter(x => x.price >= lo && x.price <= hi && (!mall || x.mall) && HT.matchQuery(q, x.title));
    // bỏ món rủi ro: bán dưới 10, điểm dưới 4.3, hàng nước ngoài
    const safe = fit.filter(x => !x.overseas && !(x.sold != null && x.sold < 10) && !(x.rating && x.rating < 4.3)).map(x => ({ ...x, ...HT.listingScore(x) }));
    const top = [...safe].sort((a, b) => b.score - a.score || a.price - b.price);
    const cheap = [...safe].filter(x => x.score >= 70).sort((a, b) => a.price - b.price);
    // trùng nhau (món điểm cao cũng là món rẻ) thì lấy thêm món kế tiếp cho đủ 3
    const cands = [...new Map([...top.slice(0, 2), ...cheap.slice(0, 1), ...top.slice(2), ...cheap.slice(1)].map(x => [x.key, x])).values()].slice(0, 3);
    tellTab(sender, pk, { step: 'check', done: 0, of: cands.length, quick: { total: fit.length, safe: safe.length, options: quickOpts(safe) } });
    const checked = [];
    checked.push(...await checkMany(cands, null, n => tellTab(sender, pk, { step: 'check', done: n, of: cands.length })));
    const res = { ok: true, at: Date.now(), total: fit.length, safe: safe.length, options: HT.pickOptions(checked) };
    await chrome.storage.session.set({ [ck]: res });
    return res;
  } finally { dropScanTab(tab.id); }
}

// Đọc toàn bộ đánh giá bằng tab ẩn (khi không lấy thẳng được): bấm lọc sao và lật từng trang
// hàng đợi riêng: đọc đánh giá (có thể lâu) không làm chậm việc tìm shop rẻ hơn
let rvQueue = Promise.resolve();
function reviewsScan(msg) { const run = rvQueue.then(() => reviewsScanOne(msg)); rvQueue = run.catch(() => {}); return run; }
async function reviewsScanOne({ url, key }) {
  const ck = 'rv:' + key, cache = (await chrome.storage.session.get(ck))[ck] || ((await chrome.storage.local.get('rvCache')).rvCache || {})[key];
  if (cache && Date.now() - cache.at < 24 * 3600e3) return cache;
  const tab = await scanTab();
  try {
    const items = await scanIn(tab.id, url, 'reviews', 120000);
    const res = { at: Date.now(), items: items || [] };
    if (items && items.length) {
      await chrome.storage.session.set({ [ck]: res });
      const { rvCache = {} } = await chrome.storage.local.get('rvCache'); rvCache[key] = res;
      const ks = Object.keys(rvCache).sort((a, b) => rvCache[b].at - rvCache[a].at); ks.slice(30).forEach(k => delete rvCache[k]);   // giữ 30 món gần nhất
      await chrome.storage.local.set({ rvCache });
    }
    return res;
  } finally { dropScanTab(tab.id); }
}

// 🔄 1.9.59 TỰ CẬP NHẬT (chỉ bản cài từ thư mục – "Tiện ích đã giải nén"): Claude ghi file mới vào thư mục,
// HaoHao thấy manifest.json đổi thì tự tải lại, không cần tải zip / bấm ↻. Bản trên Chrome Web Store không chạy phần này.
(() => {
  if (HT.STORE || 'update_url' in chrome.runtime.getManifest()) return;
  const running = chrome.runtime.getManifest().version;   // so theo SỐ PHIÊN BẢN: mỗi lần cập nhật đều tăng số
  const check = async () => {
    try {
      const t = await (await fetch(chrome.runtime.getURL('manifest.json') + '?t=' + Date.now(), { cache: 'no-store' })).text();
      const disk = JSON.parse(t).version;              // file đang ghi dở thì JSON lỗi → bỏ qua lần này
      if (disk && disk !== running) chrome.runtime.reload();   // trên ổ đĩa đã có bản mới → nạp lại
    } catch {}
  };
  check(); setInterval(check, 3000);
  chrome.alarms.create('hh-dev-reload', { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener(a => { if (a.name === 'hh-dev-reload') check(); });
})();

// ⬆️ V1.1: bản cài giải nén không được Chrome tự cập nhật → tự xem bản mới trên GitHub (downloads/haohao-latest.json), 6 giờ/lần
const UPD_BASE = 'https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/';
const verGt = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; } return false; };
async function updCheck(force) {
  if (HT.STORE || 'update_url' in chrome.runtime.getManifest()) return null;   // bản trên Chrome Web Store: Chrome tự cập nhật
  const { updInfo } = await chrome.storage.local.get('updInfo');
  if (!force && updInfo && Date.now() - updInfo.at < 6 * 3600e3) return { ...updInfo, avail: !!(updInfo.version && verGt(updInfo.version, chrome.runtime.getManifest().version)) };
  try {
    const j = await fetch(UPD_BASE + 'haohao-latest.json', { cache: 'no-store' }).then(r => r.json());
    const info = { at: Date.now(), name: String(j.name || '').slice(0, 20), version: String(j.version || ''), notes: String(j.notes || '').slice(0, 200), url: /^[\w.-]+\.zip$/.test(j.file || '') ? UPD_BASE + j.file : '' };
    await chrome.storage.local.set({ updInfo: info });
    return { ...info, avail: !!(info.version && verGt(info.version, chrome.runtime.getManifest().version)) };
  } catch { return updInfo || null; }
}

const TFH = { 'x-haohao': '1' };   // V1.6: app Transfer chỉ nhận lệnh có header này (trang web lạ không gửi được)
