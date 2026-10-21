// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🐹 HaoHao V2 – app trên Windows, chạy cùng tiện ích Chrome (V1) và dùng chung dữ liệu.
// Đợt 1: khay hệ thống + tự chạy khi bật máy · Việc cần làm · Nhắc nhở · Note · Dự án · thông báo Windows · máy chủ đồng bộ 127.0.0.1:47321
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, shell, nativeImage } = require('electron');
const path = require('path'), fs = require('fs'), http = require('http'), vm = require('vm');

app.setAppUserModelId('vn.haohao.v2');   // Windows cần dòng này thì thông báo mới hiện tên HaoHao
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const VER = app.getVersion();
const PORT = 47321;                                           // tiện ích Chrome nói chuyện với app qua cổng này
const SYNC_KEYS = ['todos', 'rules', 'ideas', 'ideaSeq', 'projBoard'];   // dữ liệu dùng chung với tiện ích
const HIDDEN = process.argv.includes('--hidden');            // bật máy tự chạy: nằm im ở khay, không mở cửa sổ

// ---------- HT (ngày âm lịch, nhãn ngày…) lấy nguyên từ tiện ích để 2 bên nhắc giống hệt ----------
const HT = (() => {
  const ctx = { console, Date, Math, Intl, navigator: { language: 'vi' } }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'app', 'common.js'), 'utf8') + '\n;globalThis.HT = HT;', ctx);
  return ctx.HT;
})();

// ---------- kho dữ liệu: 1 file JSON trong thư mục của app (AppData\Roaming\HaoHao V2) ----------
const FILE = path.join(app.getPath('userData'), 'haohao-data.json');
const DEFAULT_RULES = [
  { id: 'r4', type: 'reminder', name: 'Uống nước', icon: '💧', enabled: true, kind: 'interval', minutes: 180, from: '08:00', to: '21:00', message: 'Uống một ly nước nhé!' },
  { id: 'r6', type: 'reminder', name: 'Thắp hương', icon: '🙏', enabled: true, kind: 'lunar', lunarDays: [30, 1, 14, 15], times: ['06:00'], message: 'Thắp hương, dâng cúng', prep: { on: true, time: '17:00' }, prepMessage: 'Mai là ngày thắp hương, nhớ mua hoa quả, nhang đèn' },
  { id: 'r8', type: 'reminder', name: 'Tan làm', icon: '🏠', enabled: true, kind: 'daily', times: ['17:00'], days: [1, 2, 3, 4, 5], message: 'Tan làm rồi, về thôi! Nhớ chấm công nhé' }
];
let S = { data: {}, mt: {}, rev: 0, fired: {}, extSeen: 0, app: {} };
try { S = { ...S, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}
if (!Array.isArray(S.data.rules)) { S.data.rules = DEFAULT_RULES; S.mt.rules = 0; }
for (const k of ['todos', 'ideas']) if (!Array.isArray(S.data[k])) S.data[k] = [];
if (!S.data.projBoard || !Array.isArray(S.data.projBoard.projects)) S.data.projBoard = { projects: [] };

let saveT = 0;
function saveNow() {
  try { const tmp = FILE + '.tmp'; fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(tmp, JSON.stringify(S)); fs.renameSync(tmp, FILE); } catch (e) { console.error('save', e); }
}
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 300); };

// đổi dữ liệu → lưu, báo mọi cửa sổ (giống chrome.storage.onChanged), hẹn lại giờ nhắc
function setKeys(obj, from = 'app', mt = {}) {
  const changes = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (from === 'ext' && (S.mt[k] || 0) > (mt[k] || 0)) continue;   // bên app mới hơn thì giữ bên app
    changes[k] = { oldValue: S.data[k], newValue: v };
    S.data[k] = v; S.mt[k] = mt[k] || Date.now();
  }
  if (!Object.keys(changes).length) return {};
  S.rev++; saveSoon();
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('storage-changed', changes);
  return changes;
}
function getKeys(keys) {
  if (keys == null) return { ...S.data };
  if (typeof keys === 'string') return keys in S.data ? { [keys]: S.data[keys] } : {};
  if (Array.isArray(keys)) { const o = {}; for (const k of keys) if (k in S.data) o[k] = S.data[k]; return o; }
  const o = { ...keys }; for (const k of Object.keys(keys)) if (k in S.data) o[k] = S.data[k]; return o;   // dạng { khoá: mặc định }
}

// ---------- thông báo Windows ----------
// Chrome đang mở và tiện ích vừa nói chuyện với app (< 3 phút) → để tiện ích nhắc, app không nhắc trùng
const extAlive = () => Date.now() - (S.extSeen || 0) < 3 * 60e3;
function notify(title, body) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: path.join(__dirname, 'build', 'icon.png'), silent: false });
  n.on('click', showWin); n.show();
}

// ---------- hẹn giờ nhắc: 20 giây xem 1 lần (giống cách tiện ích nhắc) ----------
const pad = n => String(n).padStart(2, '0');
const hhmm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const dayKey = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
function once(key) { if (S.fired[key]) return false; S.fired[key] = Date.now(); saveSoon(); return true; }
function tick() {
  const now = new Date(), t = now.getTime(), hm = hhmm(now), dk = dayKey(now), quiet = extAlive();
  // việc cần làm có giờ nhắc
  const todos = S.data.todos || []; let tch = false;
  if (!quiet) for (const x of todos) {
    if (x.done || x.notified || x.mute || !x.due) continue;
    const when = new Date(x.due).getTime();
    if (!(when <= t) || t - when > 6 * 3600e3) continue;     // trễ quá 6 giờ (máy tắt) thì thôi, đánh dấu đã nhắc
    x.notified = true; tch = true;
    notify('✅ Việc cần làm', x.text);
  }
  if (tch) setKeys({ todos: [...todos] });
  // nhắc nhở (uống nước, tan làm, thắp hương, hẹn 1 lần…)
  const rules = S.data.rules || []; let rch = false;
  for (const r of rules) {
    if (!r.enabled || r.type !== 'reminder') continue;
    const msg = (r.icon ? r.icon + ' ' : '') + (r.message || r.name);
    if (r.kind === 'daily') {
      if (r.days && r.days.length && !r.days.includes(now.getDay())) continue;
      if (HT.timesOf(r).includes(hm) && once(`${r.id}:${dk}:${hm}`) && !quiet) notify(r.name || 'HaoHao nhắc', msg);
    } else if (r.kind === 'lunar') {
      if (HT.timesOf(r).includes(hm) && HT.lunar.matches(now, r.lunarDays) && once(`${r.id}:${dk}:${hm}`) && !quiet) {
        const l = HT.lunar.of(now), which = HT.lunar.isLastDay(now) && (r.lunarDays || []).includes(30) ? 'cuối tháng' : HT.lunar.dayName(l.day);
        notify(r.name || 'HaoHao nhắc', `${msg} (Hôm nay ${which}, ${HT.lunar.label(now)})`);
      }
      if (r.prep && r.prep.on && r.prep.time === hm) {
        const tmr = HT.lunar.addDays(now, 1);
        if (HT.lunar.matches(tmr, r.lunarDays) && once(`${r.id}:p:${dk}`) && !quiet) {
          const l = HT.lunar.of(tmr), which = HT.lunar.isLastDay(tmr) && (r.lunarDays || []).includes(30) ? 'cuối tháng' : HT.lunar.dayName(l.day);
          notify(r.name || 'HaoHao nhắc', `${r.icon ? r.icon + ' ' : ''}${r.prepMessage || 'Chuẩn bị đồ cúng cho ngày mai'} (Mai là ${which}, ${HT.lunar.label(tmr)})`);
        }
      }
    } else if (r.kind === 'interval') {
      const step = Math.max(1, Number(r.minutes) || 60), [fh = 0, fm = 0] = String(r.from || '00:00').split(':').map(Number);
      if (!HT.inWindow(r.from, r.to, now)) continue;
      let since = now.getHours() * 60 + now.getMinutes() - (fh * 60 + fm); if (since < 0) since += 1440;
      if (since % step === 0 && once(`${r.id}:${dk}:${hm}`) && !quiet) notify(r.name || 'HaoHao nhắc', msg);
    } else if (r.kind === 'once' && r.datetime) {
      const when = new Date(r.datetime).getTime();
      if (when <= t && !quiet) { if (t - when < 6 * 3600e3) notify(r.name || 'HaoHao nhắc', msg); r.enabled = false; rch = true; }   // Chrome đang mở: để tiện ích nhắc và tự tắt
    }
  }
  if (rch) setKeys({ rules: [...rules] });
  // dọn sổ "đã nhắc" cũ hơn 3 ngày
  for (const [k, v] of Object.entries(S.fired)) if (t - v > 3 * 864e5) delete S.fired[k];
}

// ---------- máy chủ đồng bộ cho tiện ích Chrome (chỉ nghe trong máy, chỉ nhận tiện ích) ----------
function startServer() {
  const srv = http.createServer((req, res) => {
    const origin = req.headers.origin || '';
    const okOrigin = !origin || /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
    const head = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
    if (origin && okOrigin) Object.assign(head, { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-haohao', 'access-control-allow-methods': 'GET, POST', vary: 'origin' });
    const out = (code, o) => { res.writeHead(code, head); res.end(JSON.stringify(o)); };
    if (!okOrigin) return out(403, { ok: false });                  // trang web lạ không gọi được
    if (req.method === 'OPTIONS') return out(204, {});
    if (req.headers['x-haohao'] !== '1') return out(403, { ok: false });
    const u = new URL(req.url, 'http://127.0.0.1');
    S.extSeen = Date.now();
    if (u.pathname === '/v2/ping') return out(200, { ok: true, app: 'HaoHao V2', ver: VER, rev: S.rev });
    if (u.pathname === '/v2/pull') {                                  // tiện ích lấy dữ liệu mới của app
      const since = Number(u.searchParams.get('since') || -1);
      return out(200, S.rev > since ? { ok: true, rev: S.rev, mt: pick(S.mt), data: pick(S.data) } : { ok: true, rev: S.rev });
    }
    if (u.pathname === '/v2/push' && req.method === 'POST') {          // tiện ích gửi dữ liệu mới sang app
      let body = ''; req.on('data', c => { body += c; if (body.length > 20e6) req.destroy(); });
      req.on('end', () => {
        try {
          const j = JSON.parse(body || '{}'), data = {};
          for (const k of SYNC_KEYS) if (j.data && k in j.data) data[k] = j.data[k];
          if (!S.app.linked) {   // lần đầu nối tiện ích: gộp 2 bên theo id, không bên nào mất dữ liệu
            for (const k of Object.keys(data)) data[k] = mergeFirst(k, S.data[k], data[k]);
            S.app.linked = Date.now(); setKeys(data);
          } else setKeys(data, 'ext', j.mt || {});
          out(200, { ok: true, rev: S.rev, mt: pick(S.mt) });
        } catch { out(400, { ok: false }); }
      });
      return;
    }
    out(404, { ok: false });
  });
  srv.on('error', e => console.error('server', e.code));
  srv.listen(PORT, '127.0.0.1');
}
function mergeFirst(k, mine, theirs) {
  const byId = (a, b) => { const m = new Map(); for (const x of [...(b || []), ...(a || [])]) if (x && x.id && !m.has(x.id)) m.set(x.id, x); return [...m.values()]; };   // trùng id: giữ bản tiện ích
  if (k === 'todos' || k === 'rules' || k === 'ideas') return byId(mine, theirs);
  if (k === 'projBoard') {
    const o = { ...(mine || {}), ...(theirs || {}) };
    for (const f of Object.keys(o)) if (Array.isArray((mine || {})[f]) && Array.isArray((theirs || {})[f]) && [...mine[f], ...theirs[f]].every(x => x && x.id)) o[f] = byId(mine[f], theirs[f]);   // dự án, mảng…
    return o;
  }
  if (k === 'ideaSeq') return Math.max(Number(mine) || 0, Number(theirs) || 0);
  return theirs;
}
const pick = o => { const r = {}; for (const k of SYNC_KEYS) if (k in o) r[k] = o[k]; return r; };

// ---------- tự cập nhật (từ 2.0.1): hỏi GitHub Releases "haohao-v2" lúc mở + 6 giờ/lần, tải ngầm phần thay đổi ----------
// Bản mới tải xong → báo "bấm để khởi động lại"; không bấm thì tự cài lần thoát app sau.
const UP = { st: 'idle', ver: '', pct: 0, err: '', at: 0, told: '' };
let updater = null;
function initUpdater() {
  if (!app.isPackaged) return;                                    // chạy thử bằng `npm start` thì không cập nhật
  try { updater = require('electron-updater').autoUpdater; } catch (e) { console.error('updater', e.message); return; }
  updater.autoDownload = true; updater.autoInstallOnAppQuit = true; updater.allowDowngrade = false;
  const send = () => { for (const w of BrowserWindow.getAllWindows()) w.webContents.send('update-status', { ...UP }); };
  updater.on('checking-for-update', () => { UP.st = 'checking'; UP.err = ''; send(); });
  updater.on('update-not-available', () => { UP.st = 'latest'; UP.at = Date.now(); send(); });
  updater.on('update-available', i => { UP.st = 'downloading'; UP.ver = i.version; UP.pct = 0; send(); });
  updater.on('download-progress', p => { UP.pct = Math.round(p.percent || 0); send(); });
  updater.on('update-downloaded', i => {
    UP.st = 'ready'; UP.ver = i.version; UP.at = Date.now(); send(); buildTrayMenu();
    if (UP.told === i.version || !Notification.isSupported()) return;
    UP.told = i.version;
    const n = new Notification({ title: '🐹 HaoHao V2 có bản mới ' + i.version, body: 'Bấm vào đây để khởi động lại và dùng bản mới (dữ liệu giữ nguyên).', icon: path.join(__dirname, 'build', 'icon.png') });
    n.on('click', installUpdate); n.show();
  });
  updater.on('error', e => { UP.st = 'error'; UP.err = String((e && e.message) || e).slice(0, 200); UP.at = Date.now(); send(); });
  checkUpdate(); setInterval(checkUpdate, 6 * 3600e3);
}
function checkUpdate() { if (updater && UP.st !== 'downloading' && UP.st !== 'ready') updater.checkForUpdates().catch(() => {}); }
function installUpdate() { if (!updater || UP.st !== 'ready') return; quitting = true; saveNow(); setImmediate(() => updater.quitAndInstall(false, true)); }

// ---------- cửa sổ + khay ----------
let win = null, tray = null, quitting = false;
function createWin(show) {
  win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 820, minHeight: 560, show: false, title: 'HaoHao V2', backgroundColor: '#FFF8EC',
    icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { openUrl(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); openUrl(url); } });
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });   // bấm ✕ = thu xuống khay, vẫn nhắc
  if (show) win.once('ready-to-show', () => win.show());
}
function showWin() { if (!win) createWin(true); else { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } }
function openUrl(url) {
  if (!url) return;
  if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
  if (/^file:/i.test(url)) { try { return shell.openPath(decodeURIComponent(new URL(url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))); } catch { return; } }
  if (/^[A-Za-z]:[\\/]/.test(url) || url.startsWith('\\\\')) return shell.openPath(url);
}
const autoOn = () => app.getLoginItemSettings({ args: ['--hidden'] }).openAtLogin;
const setAuto = on => app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] });
function buildTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'app', 'tray.png')));
  tray.setToolTip('HaoHao V2');
  buildTrayMenu();
  tray.on('click', showWin);
  tray.on('right-click', buildTrayMenu);
}
function buildTrayMenu() {
  if (!tray) return;
  const upItem = UP.st === 'ready'
    ? { label: `⬆️ Cài bản mới ${UP.ver} (khởi động lại)`, click: installUpdate }
    : { label: UP.st === 'downloading' ? `Đang tải bản mới ${UP.ver}… ${UP.pct}%` : 'Kiểm tra bản mới', enabled: !!updater && UP.st !== 'downloading', click: checkUpdate };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mở HaoHao', click: showWin },
    { type: 'separator' },
    { label: 'Tự chạy khi bật máy', type: 'checkbox', checked: autoOn(), click: m => { setAuto(m.checked); } },
    upItem,
    { label: 'Phiên bản ' + VER, enabled: false },
    { type: 'separator' },
    { label: 'Thoát HaoHao', click: () => { quitting = true; saveNow(); app.quit(); } }
  ]));
}

// ---------- cửa sổ hỏi app (giống chrome.* của tiện ích) ----------
ipcMain.handle('st-get', (_e, keys) => getKeys(keys));
ipcMain.handle('st-set', (_e, obj) => { setKeys(obj); });
ipcMain.handle('st-remove', (_e, keys) => {
  const changes = {};
  for (const k of [].concat(keys || [])) if (k in S.data) { changes[k] = { oldValue: S.data[k] }; delete S.data[k]; S.mt[k] = Date.now(); }
  if (Object.keys(changes).length) { S.rev++; saveSoon(); for (const w of BrowserWindow.getAllWindows()) w.webContents.send('storage-changed', changes); }
});
ipcMain.handle('open', (_e, url) => openUrl(url));
ipcMain.handle('app-info', () => ({ ver: VER, auto: autoOn(), ext: extAlive(), extSeen: S.extSeen || 0, file: FILE }));
ipcMain.handle('set-auto', (_e, on) => { setAuto(on); return autoOn(); });
ipcMain.handle('update-get', () => ({ ...UP, can: !!updater }));
ipcMain.handle('update-check', () => { checkUpdate(); return { ...UP, can: !!updater }; });
ipcMain.handle('update-install', () => installUpdate());
ipcMain.handle('test-notify', () => notify('🐹 HaoHao V2', 'Thông báo chạy tốt! HaoHao sẽ nhắc bạn ở góc màn hình như thế này.'));
ipcMain.handle('msg', (_e, m) => {                                   // lời nhắn tiện ích (chrome.runtime.sendMessage) – đợt 1 trả lời tối thiểu
  const t = m && m.type;
  if (t === 'pro-st') return { ok: true };
  if (t === 'note-tidy') return { ok: false, error: 'Dọn note bằng AI có ở đợt 2 của HaoHao V2' };
  return null;
});

app.on('second-instance', showWin);
app.on('before-quit', () => { quitting = true; saveNow(); });
app.on('window-all-closed', e => e.preventDefault?.());
app.whenReady().then(() => {
  if (!S.app.firstRun) { S.app.firstRun = Date.now(); setAuto(true); saveSoon(); }   // lần đầu: bật tự chạy khi bật máy
  startServer(); buildTray(); createWin(!HIDDEN);
  tick(); setInterval(tick, 20e3);
  setTimeout(initUpdater, 15e3);                                    // đợi máy khởi động xong rồi mới hỏi bản mới
});
