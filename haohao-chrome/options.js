// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
const $ = s => document.querySelector(s);
const form = $('#editor');
let rules = [], settings = {}, editing = null;

const TYPE_NAMES = { keyword: 'Lọc', price: 'Cảnh báo giá', reminder: 'Nhắc nhở' };

async function load() {
  const d = await chrome.storage.local.get(['rules', 'settings', 'log', 'lastQuotes']);
  rules = (d.rules || []).filter(r => r.type !== 'keyword');
  settings = { mascotEnabled: true, hiddenSites: [], ...(d.settings || {}) };
  renderRules(d.lastQuotes || {});
  renderLog(d.log || []);
  renderSettings();
}
const saveRules = () => chrome.storage.local.set({ rules });
const saveSettings = () => chrome.storage.local.set({ settings });

// ---------- tabs ----------
document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('main > section').forEach(s => s.hidden = s.id !== 'tab-' + b.dataset.tab);
}));

// ---------- danh sách điều kiện ----------
function renderRules(quotes) {
  const L = $('#list'); L.innerHTML = '';
  if (!rules.length) {
    L.innerHTML = '<div class="empty">Chưa có điều kiện nào. Bấm “Thêm điều kiện” để HaoHao bắt đầu làm việc.</div>';
    return;
  }
  for (const type of ['price', 'reminder']) {
    const list = rules.filter(r => r.type === type);
    if (!list.length) continue;
    const g = document.createElement('div'); g.className = 'group';
    g.innerHTML = `<h3>${TYPE_NAMES[type]} <small>${list.length}</small></h3>`;
    for (const r of list) {
      const row = document.createElement('div'); row.className = 'rule' + (r.enabled ? '' : ' off');
      const sw = document.createElement('label'); sw.className = 'sw';
      sw.innerHTML = `<input type="checkbox" aria-label="Bật hoặc tắt ${esc(r.name)}" ${r.enabled ? 'checked' : ''}><span></span>`;
      sw.querySelector('input').addEventListener('change', e => { r.enabled = e.target.checked; saveRules(); row.classList.toggle('off', !r.enabled); });
      const info = document.createElement('div');
      info.innerHTML = `<div class="n">${type === 'reminder' ? esc(r.icon || '🔔') + ' ' : ''}${esc(r.name)}</div><div class="d">${esc(HT.describe(r))}</div>`;
      if (type === 'price') {
        const k = r.source === 'dexscreener' ? 'dx:' + (r.coin || '').trim() : 'cg:' + (r.coin || '').trim().toLowerCase();
        if (quotes[k]) info.insertAdjacentHTML('beforeend', `<div class="q">Giá gần nhất: $${HT.fmt(quotes[k].price)} (24h ${quotes[k].change >= 0 ? '+' : ''}${quotes[k].change.toFixed(1)}%)</div>`);
      }
      if (type === 'reminder' && r.message) info.insertAdjacentHTML('beforeend', `<div class="d">“${esc(r.message)}”</div>`);
      const ops = document.createElement('div'); ops.className = 'ops';
      const ed = btn('Sửa', 'btn ghost sm', () => HT.isMkt(r) ? alert('Cảnh báo giá vàng / chứng khoán sửa trong HaoHao: bấm HaoHao trên trang web > Tiện ích > 📊 Thị trường.') : r.kind === 'lunar' ? alert('Lịch nhắc âm lịch sửa trong HaoHao: bấm HaoHao trên trang web > nhánh Nhắc nhở > nút ✎.') : openEditor(r));
      const del = btn('Xoá', 'btn ghost sm danger', () => {
        if (!confirm(`Xoá điều kiện “${r.name}”?`)) return;
        rules = rules.filter(x => x !== r); saveRules(); load();
      });
      ops.append(ed, del);
      row.append(sw, info, ops); g.append(row);
    }
    L.append(g);
  }
}
function btn(text, cls, fn) { const b = document.createElement('button'); b.className = cls; b.textContent = text; b.addEventListener('click', fn); return b; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- trình soạn điều kiện ----------
function syncForm() {
  const type = form.type.value;
  form.querySelectorAll('.grp').forEach(g => g.hidden = g.dataset.for !== type);
  const kind = form.kind.value;
  form.querySelectorAll('[data-kind]').forEach(el => el.hidden = el.dataset.kind !== kind);
  form.coin.placeholder = form.source.value === 'dexscreener' ? 'Dán địa chỉ token (contract)' : 'bitcoin';
  form.value.placeholder = ['up', 'down'].includes(form.op.value) ? '20' : '120000';
}
form.addEventListener('change', syncForm);

function openEditor(r) {
  editing = r || null;
  form.reset();
  const v = r || { type: 'price', accentless: true, mode: 'any', source: 'coingecko', op: 'above', kind: 'daily', times: ['08:00'], minutes: 60, icon: '🔔' };
  form.type.value = v.type;
  form.name.value = v.name || '';
  form.words.value = (v.words || []).join(', ');
  form.sites.value = v.sites || '';
  form.mode.value = v.mode || 'any';
  form.accentless.checked = v.accentless !== false;
  form.source.value = v.source || 'coingecko';
  form.coin.value = v.coin || '';
  form.op.value = v.op || 'above';
  form.value.value = v.value ?? '';
  form.kind.value = v.kind || 'daily';
  form.times.value = HT.timesOf(v).join(', ') || '08:00';
  form.icon.value = v.icon || '🔔';
  form.from.value = v.from || '08:00'; form.to.value = v.to || '21:00';
  form.querySelectorAll('[name=day]').forEach(c => c.checked = (v.days || []).includes(Number(c.value)));
  form.minutes.value = v.minutes || 60;
  form.datetime.value = v.datetime || '';
  form.message.value = v.message || '';
  $('#testOut').textContent = '';
  form.hidden = false; syncForm(); form.name.focus();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#add').addEventListener('click', () => openEditor(null));
$('#cancel').addEventListener('click', () => { form.hidden = true; editing = null; });

form.addEventListener('submit', e => {
  e.preventDefault();
  const type = form.type.value;
  const r = { id: editing?.id || 'r' + Date.now().toString(36), type, name: form.name.value.trim(), enabled: editing ? editing.enabled : true };
  if (type === 'keyword') {
    r.words = form.words.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    if (!r.words.length) return alert('Nhập ít nhất một từ khoá.');
    r.sites = form.sites.value.trim(); r.mode = form.mode.value; r.accentless = form.accentless.checked;
  } else if (type === 'price') {
    r.source = form.source.value; r.coin = form.coin.value.trim(); r.op = form.op.value; r.value = Number(form.value.value);
    if (!r.coin || form.value.value === '') return alert('Nhập mã coin và mốc giá.');
  } else {
    r.kind = form.kind.value; r.icon = form.icon.value; r.minutes = Math.max(5, Number(form.minutes.value) || 60);
    r.times = [...new Set((form.times.value.match(/\d{1,2}:\d{2}/g) || []).map(t => t.padStart(5, '0')))].sort();
    r.days = [...form.querySelectorAll('[name=day]:checked')].map(c => Number(c.value));
    r.from = form.from.value; r.to = form.to.value;
    r.datetime = form.datetime.value; r.message = form.message.value.trim();
    if (r.kind === 'daily' && !r.times.length) return alert('Nhập ít nhất một giờ, ví dụ 08:00.');
    if (r.kind === 'once' && !r.datetime) return alert('Chọn ngày giờ nhắc.');
    if (r.kind === 'once') r.enabled = true;
  }
  if (editing) rules[rules.indexOf(editing)] = r; else rules.push(r);
  if (type === 'price') chrome.storage.local.get('priceState').then(({ priceState = {} }) => { delete priceState[r.id]; chrome.storage.local.set({ priceState }); });
  saveRules().then(() => { form.hidden = true; editing = null; load(); });
});

$('#test').addEventListener('click', async () => {
  const out = $('#testOut'); out.textContent = 'Đang lấy giá…'; out.style.color = '';
  try {
    const q = await HT.quote({ source: form.source.value, coin: form.coin.value });
    out.textContent = `${String(q.label).toUpperCase()}: $${HT.fmt(q.price)} (24h ${q.change >= 0 ? '+' : ''}${q.change.toFixed(1)}%)`;
  } catch (err) { out.textContent = err.message; out.style.color = 'var(--coral)'; }
});

// ---------- nhật ký ----------
function renderLog(log) {
  const L = $('#log'); L.innerHTML = '';
  if (!log.length) { L.innerHTML = '<li>Chưa có lần báo nào.</li>'; return; }
  for (const e of log) {
    const li = document.createElement('li'); li.className = 'k-' + (e.kind || 'keyword');
    li.innerHTML = `<time>${new Date(e.t).toLocaleString('vi-VN')}</time><strong>${esc(e.rule)}</strong>: ${esc(e.text)}` +
      (e.url ? `<br><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url)}</a>` : '');
    L.append(li);
  }
}
$('#clearLog').addEventListener('click', () => chrome.storage.local.set({ log: [] }));

// ---------- cài đặt chung ----------
function renderSettings() {
  $('#lang').value = settings.lang === 'en' ? 'en' : 'vi';
  $('#mascotEnabled').checked = settings.mascotEnabled !== false;
  $('#greet').checked = settings.greet !== false;
  $('#greetMin').value = String(settings.greetMin || 15);
  $('#desktop').checked = settings.desktop !== false;
  $('#sound').checked = settings.sound !== false;
  $('#shopTrust').checked = settings.shopTrust !== false;
  $('#statsOn').checked = settings.stats !== false; $('#priceShare').checked = settings.priceShare !== false;   // V1.56: tắt được thống kê ẩn danh / góp giá
  $('#shopAsk').checked = settings.shopAsk !== false;
  $('#shopAuto').checked = settings.shopAuto !== false;
  const L = $('#hidden'); L.innerHTML = '';
  if (!settings.hiddenSites.length) L.innerHTML = '<li>Không có trang nào.</li>';
  for (const h of settings.hiddenSites) {
    const li = document.createElement('li'); li.textContent = h;
    li.append(btn('Hiện lại', 'btn ghost sm', () => { settings.hiddenSites = settings.hiddenSites.filter(x => x !== h); saveSettings(); }));
    L.append(li);
  }
}
$('#lang').addEventListener('change', e => { settings.lang = e.target.value; saveSettings(); });   // trang tự tải lại theo ngôn ngữ mới
$('#mascotEnabled').addEventListener('change', e => { settings.mascotEnabled = e.target.checked; saveSettings(); });
$('#desktop').addEventListener('change', e => { settings.desktop = e.target.checked; saveSettings(); });
$('#sound').addEventListener('change', e => { settings.sound = e.target.checked; saveSettings(); });
$('#shopTrust').addEventListener('change', e => { settings.shopTrust = e.target.checked; saveSettings(); });
$('#statsOn').addEventListener('change', e => { settings.stats = e.target.checked; saveSettings(); });
$('#priceShare').addEventListener('change', e => { settings.priceShare = e.target.checked; saveSettings(); });
$('#shopAsk').addEventListener('change', e => { settings.shopAsk = e.target.checked; saveSettings(); });
$('#shopAuto').addEventListener('change', e => { settings.shopAuto = e.target.checked; saveSettings(); });
$('#deskTest').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'desk-test' }));
chrome.runtime.sendMessage({ type: 'app-status' }).then(r => {
  $('#appStatus').textContent = r && r.running
    ? '🐹 App HaoHao 3D đang chạy: nhắc nhở sẽ do con hamster 3D gõ cửa.'
    : 'App HaoHao 3D chưa chạy: đang dùng cửa sổ nhắc nhỏ. Bấm đúp biểu tượng HaoHao trên Desktop để bật con hamster 3D.';
}).catch(() => {});
$('#greet').addEventListener('change', e => { settings.greet = e.target.checked; saveSettings(); });
$('#greetMin').addEventListener('change', e => { settings.greetMin = +e.target.value; saveSettings(); });
$('#resetPos').addEventListener('click', () => { delete settings.pos; saveSettings(); });

$('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ rules, settings }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'haohao-sao-luu.json'; a.click();
});
$('#import').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.rules)) throw new Error();
    await chrome.storage.local.set({ rules: d.rules, settings: { ...settings, ...(d.settings || {}) } });
    alert('Đã nạp ' + d.rules.length + ' điều kiện.');
  } catch { alert('File không đúng định dạng sao lưu của HaoHao.'); }
  e.target.value = '';
});

chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && !form.hidden && ch.rules) return; if (area === 'local') load(); });
load();

// ---------- Outlook ----------
async function renderOutlook() {
  const { settings: st = {}, msAccount = '' } = await chrome.storage.local.get(['settings', 'msAccount']);
  const cid = (st.mail || {}).msClientId || '';
  if (document.activeElement !== $('#msClientId')) $('#msClientId').value = cid;
  $('#msState').textContent = msAccount ? '✓ Đang đăng nhập: ' + msAccount : (cid ? 'Đã lưu mã. Bấm "Đăng nhập Outlook".' : 'Chưa có mã ứng dụng.');
}
chrome.runtime.sendMessage({ type: 'ms-redirect' }).then(u => { if (u) $('#msRedirect').textContent = u; }).catch(() => {});
$('#copyRedirect').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#msRedirect').textContent); $('#copyRedirect').textContent = 'Đã chép ✓'; } catch { alert($('#msRedirect').textContent); }
});
$('#saveClient').addEventListener('click', async () => {
  const cid = $('#msClientId').value.trim();
  if (cid && !/^[0-9a-f-]{36}$/i.test(cid)) return alert('Mã có dạng xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 ký tự).');
  const { settings: st = {} } = await chrome.storage.local.get('settings');
  st.mail = { ...(st.mail || {}), msClientId: cid, provider: 'outlook' };
  await chrome.storage.local.set({ settings: st });
  $('#msState').textContent = 'Đã lưu. Bấm "Đăng nhập Outlook".';
});
$('#msLogin').addEventListener('click', async () => {
  $('#msState').textContent = 'Đang mở cửa sổ đăng nhập Microsoft…';
  const r = await chrome.runtime.sendMessage({ type: 'ms-login' }).catch(e => ({ ok: false, error: e.message }));
  if (!r || !r.ok) $('#msState').textContent = '⚠ Chưa đăng nhập được: ' + (r && r.error === 'noclient' ? 'chưa lưu mã ứng dụng.' : (r && r.error) || 'lỗi không rõ');
  else renderOutlook();
});
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && (ch.msAccount || ch.settings)) renderOutlook(); });
renderOutlook();
if (location.hash === '#outlook') document.querySelector('nav button[data-tab="settings"]').click(), setTimeout(() => $('#outlook').scrollIntoView({ behavior: 'smooth' }), 100);

// ---------- Đọc hộ (Gemini) ----------
(async () => {
  const { settings: st = {} } = await chrome.storage.local.get('settings');
  const ai = st.ai || {};
  $('#aiKey').value = ai.key || ''; $('#aiModel').value = ai.model || '';
  $('#aiState').textContent = ai.key ? 'Đã có mã.' : 'Chưa có mã.';
})();
// V1.86: dán mã là tự lưu + tự kiểm tra nhanh (dưới 1 giây, tối đa 10 giây), có đếm giây khi chờ
async function aiSaveKey() {
  const { settings: st = {} } = await chrome.storage.local.get('settings');
  st.ai = { ...(st.ai || {}), key: $('#aiKey').value.trim(), model: $('#aiModel').value.trim() };
  await chrome.storage.local.set({ settings: st });
}
let aiRun = 0;
async function aiCheckKey() {
  const key = $('#aiKey').value.trim(), st = $('#aiState'), run = ++aiRun;
  if (!key) { st.textContent = 'Chưa có mã.'; return; }
  const t0 = Date.now(); st.textContent = 'Đang kiểm tra… 0s';
  const tk = setInterval(() => { if (run === aiRun) st.textContent = `Đang kiểm tra… ${Math.floor((Date.now() - t0) / 1000)}s`; }, 500);
  const r = await chrome.runtime.sendMessage({ type: 'ai-check', key }).catch(e => ({ ok: false, error: e.message }));
  clearInterval(tk); if (run !== aiRun) return;
  const map = { badkey: 'Mã không đúng. Kiểm tra lại mã vừa dán nhé.', timeout: 'Mạng chậm hoặc Google chưa phản hồi, thử lại sau nhé.', net: 'Không kết nối được mạng.',
    quota: 'Mã đúng nhưng đang hết lượt miễn phí, thử lại sau.', nomodel: 'Mã này chưa dùng được Gemini (tài khoản Google chưa bật).', nokey: 'Chưa có mã.' };
  st.textContent = r && r.ok ? '✓ Mã đúng, đã sẵn sàng dùng.' : '⚠ ' + ((r && (map[r.error] || r.error)) || 'lỗi không rõ');
}
let aiTm = 0;
$('#aiKey').addEventListener('input', () => {
  clearTimeout(aiTm); const v = $('#aiKey').value.trim();
  if (v.length < 30) return;   // mã Gemini dài ~39 ký tự: dán xong mới kiểm tra
  aiTm = setTimeout(async () => { await aiSaveKey(); aiCheckKey(); }, 400);
});
$('#aiSave').addEventListener('click', async () => { await aiSaveKey(); $('#aiKey').value.trim() ? aiCheckKey() : ($('#aiState').textContent = 'Đã lưu.'); });
$('#aiTest').addEventListener('click', async () => { await aiSaveKey(); aiCheckKey(); });
$('#aiTestOld') && $('#aiTestOld').addEventListener('click', async () => {
  $('#aiState').textContent = 'Đang thử…';
  const r = await chrome.runtime.sendMessage({ type: 'ai-test' }).catch(e => ({ ok: false, error: e.message }));
  const map = { nokey: 'chưa có mã (bấm Lưu trước)', badkey: 'mã không đúng', quota: 'hết lượt miễn phí, thử lại sau', busy: 'Gemini đang quá tải, đợi 1–2 phút rồi thử lại' };
  const { settings: s3 = {} } = await chrome.storage.local.get('settings'), a3 = s3.ai || {};
  $('#aiState').textContent = r && r.ok ? `✓ Kết nối Gemini được (mẫu ${a3.model || a3.autoModel || 'gemini-3.8-flash'}).` : '⚠ Chưa được: ' + ((r && (map[r.error] || r.error)) || 'lỗi không rõ');
  if (r && r.ok) $('#aiModel').value = a3.model || '';
});
if (location.hash === '#ai') document.querySelector('nav button[data-tab="settings"]').click(), setTimeout(() => $('#ai').scrollIntoView({ behavior: 'smooth' }), 100);

// phiên bản: V1 = tiện ích Chrome (V2 = máy tính, V3 = điện thoại)
try { const mf = chrome.runtime.getManifest(); $('#ver').textContent = 'HaoHao ' + (mf.version_name || mf.version); } catch {}

// V1.62: bỏ trang ☕ Ủng hộ (anh Nhật không làm miễn phí nữa); khung "Đặt viết phần mềm" chuyển sang Giới thiệu
const ZALO0 = '+84366159790';
// V1.64: 💬 Góp ý nằm ở trang Giới thiệu
$('#gpSend').addEventListener('click', async () => {
  const t = $('#gpTxt').value.trim(), m = $('#gpMsg'), b = $('#gpSend');
  if (t.length < 5) { m.textContent = 'Viết thêm chút nữa nhé (ít nhất 5 chữ).'; return $('#gpTxt').focus(); }
  b.disabled = true; m.textContent = 'Đang gửi…';
  const r = await chrome.runtime.sendMessage({ type: 'gopy', txt: t }).catch(() => null);
  b.disabled = false;
  if (r && r.ok) { $('#gpTxt').value = ''; m.textContent = '✓ Đã gửi. Cảm ơn bạn!'; } else m.textContent = '⚠ Chưa gửi được, thử lại sau nhé.';
});
async function copyBtn(btn, text, label) {
  try { await navigator.clipboard.writeText(text); btn.textContent = '✓ Đã chép'; } catch { btn.textContent = '⚠ Chép tay giúp mình'; }
  setTimeout(() => { btn.textContent = label; }, 1600);
}
$('#zaloCopy').addEventListener('click', () => copyBtn($('#zaloCopy'), ZALO0, '📋 Chép số'));

// ---------- Giới thiệu: phiên bản đang cài; #about mở thẳng tab này ----------
try { const mf = chrome.runtime.getManifest(); $('#abVer').textContent = `Phiên bản ${mf.version_name || mf.version} · Bản quyền thuộc Phan Thanh Nhật`; } catch {}
if (location.hash === '#about') document.querySelector('nav button[data-tab="about"]').click();
// ⭐ V1.65: trang HaoHao Pro – chọn gói, QR chuyển khoản BIDV (VietQR), mã máy, dán mã kích hoạt
{
  let st = null, sel = 'y1';
  const P = HT.PRO, vnd = n => n.toLocaleString('vi-VN') + 'đ';
  const fmtD = t => new Date(t).toLocaleDateString('vi-VN');
  const short = () => (st && st.code || '').replace(/^HH-/, '').replace(/-/g, '');
  const drawPay = () => {
    const pl = P.plans.find(x => x[0] === sel), note = 'HH ' + short() + ' ' + sel.toUpperCase();
    $('#proAmt').textContent = vnd(pl[2]); $('#proNote').textContent = note; $('#proBank').textContent = P.bank.name; $('#proOwner').textContent = P.bank.owner;
    $('#proAcc').textContent = P.bank.acc || '(đang cập nhật)';
    if (P.bank.acc && typeof qrcode === 'function') { const q = qrcode(0, 'M'); q.addData(HT.vietQR(P.bank.bin, P.bank.acc, pl[2], note)); q.make(); $('#proQr').src = q.createDataURL(5, 2); $('#proQr').hidden = false; $('#proQrNote').textContent = 'Quét bằng app ngân hàng – đã điền sẵn số tiền và nội dung'; }
    else { $('#proQr').hidden = true; $('#proQrNote').textContent = 'Mã QR hiện khi có số tài khoản'; }
    document.querySelectorAll('#proPlans button').forEach(b => { const on = b.dataset.k === sel; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  };
  P.plans.forEach(([k, l, p, d]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.setAttribute('role', 'radio'); b.className = 'pro-pl' + (k === 'y1' ? ' hot' : '');
    b.innerHTML = `<b>${l}</b><span>${vnd(p)}</span>` + (d ? `<small>≈ ${vnd(Math.round(p / (d / 30) / 1000) * 1000)}/tháng</small>` : '<small>dùng mãi mãi</small>');
    b.addEventListener('click', () => { sel = k; drawPay(); }); $('#proPlans').append(b); });
  const show = s => {
    st = s; if (!s) { $('#proSub').textContent = 'Chưa kiểm tra được, tải lại trang nhé.'; return; }
    $('#proCode').textContent = s.code;
    const pl = s.plan && P.plans.find(x => x[0] === s.plan);
    // V1.66: đã mua Pro / máy chủ app → ẩn bảng giá + chuyển khoản; gói có hạn còn ≤ 7 ngày thì hiện lại để gia hạn
    const paid = s.owner || s.pro, soon = s.pro && s.exp && s.exp - Date.now() < 7 * 864e5;
    $('#proBuy').hidden = paid && !soon; $('#proRenewBox').hidden = !(s.pro && s.exp) || soon;
    $('#proSub').textContent = s.owner ? '✓ Máy chủ app – mở khoá toàn bộ' : s.pro ? `✓ Đang dùng Pro${pl ? ' · gói ' + pl[1] : ''}${s.exp ? ' · đến ' + fmtD(s.exp) : ' · trọn đời'}` : s.trial ? '🎁 Đang mở khoá toàn bộ' : '🔒 Đã hết 2 tháng mở khoá toàn bộ · Tiện ích và Dự án cần gói Pro';
    drawPay();
  };
  chrome.runtime.sendMessage({ type: 'pro-st' }).then(show).catch(() => show(null));
  $('#proRenew').addEventListener('click', () => { $('#proBuy').hidden = false; $('#proRenewBox').hidden = true; });
  $('#proCodeCopy').addEventListener('click', () => copyBtn($('#proCodeCopy'), (st && st.code) || '', '📋 Chép mã máy'));
  $('#proGo').addEventListener('click', async () => {
    const v = $('#proInput').value.trim(), m = $('#proMsg'); if (!v) return $('#proInput').focus();
    m.textContent = 'Đang kiểm tra…'; const r = await chrome.runtime.sendMessage({ type: 'pro-activate', code: v }).catch(() => null);
    if (r && r.ok) { $('#proInput').value = ''; m.textContent = '🎉 Kích hoạt thành công. Cảm ơn bạn đã ủng hộ HaoHao!'; show(r.st); } else m.textContent = '⚠ ' + ((r && r.error) || 'Chưa kích hoạt được');
  });
}
if (location.hash === '#pro') document.querySelector('nav button[data-tab="pro"]').click();
if (/^#(rules|log|settings)$/.test(location.hash)) document.querySelector(`nav button[data-tab="${location.hash.slice(1)}"]`).click();
