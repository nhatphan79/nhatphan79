// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật. Mọi quyền được bảo lưu.
// HaoHao – MÁY CHỦ KHO GIÁ (Cloudflare Worker + D1)
// Mọi máy cài HaoHao gửi về: mã sản phẩm + giá (KHÔNG gửi thông tin cá nhân). Kho chung giúp khách mới mở món là thấy lịch sử giá.
//   Binding D1:  DB   (bảng tự tạo ở lần chạy đầu)
// API:
//   POST /p   { items: [{ k: 'sp:<shopid>.<itemid>' | 'tt:<productid>', p: giá, b: giá gạch (tuỳ chọn) }] }   (tối đa 60 món/lần)
//   GET  /h?k=sp:1.2,tt:3                → { items: { 'sp:1.2': [[ngày, giá, giáGạch], …] } }   (tối đa 20 món)
//   GET  /                               → tình trạng
//   POST /ping { id, v }                  → đếm máy đang dùng (id ngẫu nhiên, KHÔNG thông tin cá nhân), mỗi máy 1 lần/ngày
//   GET  /bye?id=&v=                      → Chrome mở khi khách gỡ HaoHao: ghi 1 lượt gỡ + hỏi lý do (POST /bye { id, why })
//   GET  /thongke?key=                    → trang thống kê cho chủ app (đặt biến STATS_KEY trên Cloudflare để khoá bằng mật khẩu)
// "ngày" = số ngày tính từ 1/1/1970 theo giờ Việt Nam. Mỗi món mỗi ngày 1 mốc (giữ giá thấp nhất trong ngày), giữ 120 ngày.

const KEEP_DAYS = 120, MAX_IN = 60, MAX_OUT = 20;
const KEY = /^(sp:\d{3,12}\.\d{3,16}|tt:\d{8,22})$/;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...cors, ...extra } });
const today = () => Math.floor((Date.now() + 7 * 3600e3) / 864e5);
let ready = false;
async function init(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS gia (k TEXT PRIMARY KEY, pts TEXT NOT NULL, at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS may (id TEXT PRIMARY KEY, v TEXT, d0 INTEGER, d1 INTEGER, gone INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS go (d INTEGER, id TEXT, v TEXT, why TEXT)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS st (k TEXT PRIMARY KEY, v TEXT)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS tu (d INTEGER, q TEXT, src TEXT, n INTEGER, PRIMARY KEY (d, q, src))'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS anh (k TEXT PRIMARY KEY, v TEXT, at INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS cho (id INTEGER PRIMARY KEY AUTOINCREMENT, by TEXT, shop TEXT, code TEXT, label TEXT, url TEXT, until INTEGER, at INTEGER, ok INTEGER DEFAULT 0, bad INTEGER DEFAULT 0, used INTEGER DEFAULT 0)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS chov (id INTEGER, by TEXT, v TEXT, PRIMARY KEY (id, by))'),
  ]);
  ready = true;
}
const okPrice = n => Number.isInteger(n) && n >= 1000 && n <= 2e9;

async function put(env, body) { return save(env, Array.isArray(body && body.items) ? body.items.slice(0, MAX_IN) : []); }
async function save(env, list) {
  const want = new Map();
  for (const x of list) {
    const k = String(x && x.k || ''), p = Math.round(Number(x && x.p)), b = Math.round(Number(x && x.b) || 0);
    if (!KEY.test(k) || !okPrice(p)) continue;
    const o = want.get(k); if (!o || p < o.p) want.set(k, { p, b: b > p && b <= p * 20 ? b : 0 });
  }
  if (!want.size) return { ok: true, saved: 0 };
  const keys = [...want.keys()], d = today(), old = new Map();
  for (let i = 0; i < keys.length; i += 90) {   // D1: tối đa 100 tham số / câu
    const part = keys.slice(i, i + 90);
    const { results = [] } = await env.DB.prepare(`SELECT k, pts FROM gia WHERE k IN (${part.map(() => '?').join(',')})`).bind(...part).all();
    for (const r of results) old.set(r.k, r.pts);
  }
  const stmts = [];
  for (const [k, { p, b }] of want) {
    let pts = []; try { pts = JSON.parse(old.get(k) || '[]'); } catch {}
    const last = pts[pts.length - 1];
    if (last && (p < last[1] * 0.2 || p > last[1] * 5)) continue;   // giá lạ (gõ sai / phá) → bỏ
    if (last && last[0] === d) {
      if (p >= last[1] && !(b > (last[2] || 0))) continue;          // trong ngày không thấp hơn → khỏi ghi
      last[1] = Math.min(last[1], p); if (b > (last[2] || 0)) last[2] = b;
    } else pts.push(b ? [d, p, b] : [d, p]);
    pts = pts.filter(x => d - x[0] <= KEEP_DAYS);
    stmts.push(env.DB.prepare('INSERT INTO gia (k, pts, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET pts = excluded.pts, at = excluded.at').bind(k, JSON.stringify(pts), Date.now()));
  }
  for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
  return { ok: true, saved: stmts.length };
}

async function get(env, ks) {
  const keys = [...new Set(String(ks || '').split(',').map(s => s.trim()).filter(k => KEY.test(k)))].slice(0, MAX_OUT);
  if (!keys.length) return { items: {} };
  const { results = [] } = await env.DB.prepare(`SELECT k, pts FROM gia WHERE k IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
  const items = {}; for (const r of results) { try { items[r.k] = JSON.parse(r.pts); } catch {} }
  return { items, day: today() };
}

// ---------- 🛒 Tự nạp kho giá từ AccessTrade (tài khoản phụ) – mỗi ngày tải lại toàn bộ kho Shopee của AccessTrade ----------
// Cần Secret AT_KEY trên Cloudflare + Cron Trigger (vd */15 * * * *). Mỗi lần chạy tải tối đa FEED_PAGES trang × 200 món, ưu tiên ghi
// trước đồ trẻ em / gia dụng; hết kho thì đánh dấu xong ngày, hôm sau làm lại.
// Chỉ nhận 3 nhóm anh Nhật chọn: Thời trang · Gia dụng (nhà cửa & đời sống) · Mẹ và bé
const FEED_PAGES = 5;
const KEEP = /(?<!\p{L})(thời trang|fashion|áo|quần|váy|đầm|giày|dép|sandal|túi xách|balo|ví nữ|ví nam|phụ kiện thời trang|đồ lót|nội y|đồ ngủ|đồ bộ|nhà cửa|đời sống|gia dụng|nhà bếp|đồ bếp|phòng tắm|phòng ngủ|chăn|ga gối|gối|nệm|rèm|thảm|nồi|chảo|bát|chén|cốc|hộp đựng|kệ|móc treo|chổi|cây lau nhà|mẹ và bé|mẹ & bé|mẹ bé|trẻ em|trẻ sơ sinh|em bé|cho bé|bé trai|bé gái|baby|kids?|tã|bỉm|sữa bột|bình sữa|đồ chơi)(?!\p{L})/iu;
const PRIO = /(?<!\p{L})(trẻ em|bé trai|bé gái|em bé|cho bé|baby|kids?|mẹ và bé|mẹ & bé|sơ sinh|nhà cửa|gia dụng|nhà bếp)(?!\p{L})/iu;
const getSt = async (env, k) => { const r = await env.DB.prepare('SELECT v FROM st WHERE k = ?').bind(k).first(); try { return r ? JSON.parse(r.v) : null; } catch { return null; } };
const setSt = (env, k, v) => env.DB.prepare('INSERT INTO st (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').bind(k, JSON.stringify(v)).run();
async function feedRun(env) {
  if (!env.AT_KEY) return { ok: false, error: 'no AT_KEY' };
  await init(env);
  const d = today(); let st = (await getSt(env, 'feed')) || {};
  if (st.day !== d) st = { day: d, page: 1, done: false, n: 0 };
  if (st.done) return { ok: true, done: true, n: st.n };
  const items = [];
  for (let i = 0; i < FEED_PAGES && !st.done; i++) {
    const r = await fetch(`https://api.accesstrade.vn/v1/datafeeds?domain=shopee.vn&limit=200&page=${st.page}`, { headers: { Authorization: 'Token ' + env.AT_KEY } });
    if (!r.ok) { st.err = 'AT ' + r.status; break; }
    let j; try { j = JSON.parse((await r.text()).replace(/:\s*-?(NaN|Infinity)\b/g, ': null')); } catch { st.page++; continue; }
    const data = j.data || [];
    for (const p of data) {
      const m = String(p.url || '').match(/-i\.(\d{3,12})\.(\d{3,16})/) || String(p.url || '').match(/product\/(\d{3,12})\/(\d{3,16})/); if (!m) continue;
      const a = Math.round(Number(p.price) || 0), b = Math.round(Number(p.discount) || 0);
      const price = b > 1000 && a > 1000 ? Math.min(a, b) : (a || b), before = Math.max(a, b);
      const tx = (p.cate || '') + ' ' + (p.name || '');
      if (!KEEP.test(tx)) continue;   // ngoài 3 nhóm → bỏ
      if (price >= 1000) items.push({ k: `sp:${m[1]}.${m[2]}`, p: price, b: before > price ? before : 0, prio: PRIO.test(tx) });
    }
    st.page++; if (data.length < 200) st.done = true;
  }
  items.sort((x, y) => (y.prio ? 1 : 0) - (x.prio ? 1 : 0));
  const r = await save(env, items);
  st.n = (st.n || 0) + r.saved; st.at = Date.now();
  await setSt(env, 'feed', st);
  return { ok: true, page: st.page, done: st.done, saved: r.saved, n: st.n, err: st.err };
}

// ---------- 🎵 Tự nạp giá TikTok từ RioHub (Secret RH_KEY) – cùng 3 nhóm, tìm theo từ khoá ----------
const TT_KW = ['áo bé gái', 'áo bé trai', 'quần bé trai', 'quần bé gái', 'váy bé gái', 'đầm bé gái', 'đồ bộ trẻ em', 'đồ ngủ trẻ em', 'đồ sơ sinh', 'body sơ sinh', 'giày trẻ em', 'dép trẻ em',
  'tã quần', 'bỉm', 'bình sữa', 'đồ chơi trẻ em', 'balo trẻ em',
  'nồi', 'chảo chống dính', 'hộp đựng thực phẩm', 'kệ nhà bếp', 'đồ dùng nhà bếp', 'chăn ga gối', 'gối', 'rèm cửa', 'thảm', 'móc treo quần áo', 'cây lau nhà', 'đồ gia dụng',
  'áo thun nữ', 'áo sơ mi nữ', 'váy nữ', 'đầm nữ', 'quần jean nữ', 'áo thun nam', 'áo polo nam', 'quần short nam', 'đồ bộ nữ', 'túi xách nữ', 'dép nữ', 'giày nữ'];
const TT_PAGES = 3, TT_PER_RUN = 4;
const rhNum = x => { const n = Number(String(x == null ? '' : x).replace(/[^\d.]/g, '')); return isFinite(n) ? Math.round(n) : 0; };
async function feedTT(env) {
  if (!env.RH_KEY) return { ok: false, error: 'no RH_KEY' };
  await init(env);
  const d = today(); let st = (await getSt(env, 'feedtt')) || {};
  if (st.day !== d) st = { day: d, ki: 0, pg: 0, tok: '', n: 0 };
  if (st.ki >= TT_KW.length) return { ok: true, done: true, n: st.n };
  const items = []; delete st.err;
  for (let i = 0; i < TT_PER_RUN && st.ki < TT_KW.length; i++) {
    const qs = new URLSearchParams({ creator_username: env.RH_CREATOR || 'nhanhimdaily', keyword: TT_KW[st.ki], page_size: '50' }); if (st.tok) qs.set('page_token', st.tok);
    let r, j;
    for (const base of ['https://riohub.vn/api/v1', 'https://riohub.riokupon.com/api/v1', 'https://riohub.riokupon.me/api/v1']) {
      try { r = await fetch(`${base}/partner/tiktok/affiliate/products/search?${qs}`, { headers: { 'X-Riohub-Api-Key': env.RH_KEY } }); j = await r.json().catch(() => ({})); break; } catch (e) { r = null; }
    }
    if (!r || !r.ok) { st.err = 'RioHub ' + (r ? r.status : 'mạng'); break; }
    for (const p of j.products || []) {
      const id = String(p.id || ''); if (!/^\d{8,22}$/.test(id)) continue;
      const price = rhNum(p.sales_price && p.sales_price.minimum_amount) || rhNum(p.price && (p.price.floor_price || p.price.amount));
      if (price >= 1000) items.push({ k: 'tt:' + id, p: price, b: 0 });
    }
    st.pg++; st.tok = j.next_page_token || '';
    if (!st.tok || st.pg >= TT_PAGES) { st.ki++; st.pg = 0; st.tok = ''; }
  }
  const sv = await save(env, items);
  st.n = (st.n || 0) + sv.saved; st.at = Date.now();
  await setSt(env, 'feedtt', st);
  return { ok: true, kw: st.ki, of: TT_KW.length, saved: sv.saved, n: st.n, err: st.err };
}

// 🎵 /tt?q= – tìm món TikTok cho mọi máy (so giá "TikTok rẻ hơn"), nhớ 6 giờ theo từ khoá, không lộ key
async function ttSearch(env, q, ctx) {
  q = normQ(q); if (!env.RH_KEY || q.length < 3) return json({ items: [] });
  const ck = new Request('https://cache.haohao/tt?q=' + encodeURIComponent(q)), cache = caches.default;
  const hit = await cache.match(ck); if (hit) return new Response(hit.body, { headers: { 'content-type': 'application/json; charset=utf-8', ...cors } });
  const qs = new URLSearchParams({ creator_username: env.RH_CREATOR || 'nhanhimdaily', keyword: q, page_size: '30' });
  let j = null;
  for (const base of ['https://riohub.vn/api/v1', 'https://riohub.riokupon.com/api/v1', 'https://riohub.riokupon.me/api/v1']) {
    try { const r = await fetch(`${base}/partner/tiktok/affiliate/products/search?${qs}`, { headers: { 'X-Riohub-Api-Key': env.RH_KEY } }); if (!r.ok) return json({ items: [], error: 'RioHub ' + r.status }); j = await r.json(); break; } catch {}
  }
  const items = ((j && j.products) || []).map(p => ({ id: String(p.id || ''), title: String(p.title || '').slice(0, 160), image: p.main_image_url || '', shop: (p.shop && p.shop.name) || p.seller_name || '',
    price: rhNum(p.sales_price && p.sales_price.minimum_amount) || rhNum(p.price && (p.price.floor_price || p.price.amount)),
    sold: (p.market_performance && +p.market_performance.historical_sold_quantity) || 0, rating: +(p.review && p.review.overall_score) || 0 })).filter(x => /^\d{8,22}$/.test(x.id) && x.price >= 1000);
  const body = JSON.stringify({ items });
  if (ctx) ctx.waitUntil(cache.put(ck, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=21600' } })));
  if (items.length) ctx && ctx.waitUntil(save(env, items.map(x => ({ k: 'tt:' + x.id, p: x.price, b: 0 }))).catch(() => {}));   // góp luôn vào kho giá
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', ...cors } });
}

// 📸 /anh – so ảnh khách chụp (đánh giá) với ảnh shop đăng bằng Gemini (Secret GEMINI_KEY). Mỗi món chấm 1 lần, nhớ 14 ngày cho mọi máy.
const IMG_OK = /^https:\/\/(down-[a-z0-9-]+\.img\.susercontent\.com|cf\.shopee\.vn)\/file\/[\w-]+(_tn)?$/;
const b64 = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
async function anh(env, b) {
  const k = String(b && b.k || ''); if (!/^sp:\d{3,12}\.\d{3,16}$/.test(k)) return { ok: false };
  const old = await env.DB.prepare('SELECT v, at FROM anh WHERE k = ?').bind(k).first();
  if (old && Date.now() - old.at < 14 * 864e5) return { ok: true, cache: true, ...JSON.parse(old.v) };
  if (!env.GEMINI_KEY) return { ok: false, error: 'off' };
  const shop = (b.shop || []).filter(u => IMG_OK.test(u)).slice(0, 3), real = (b.real || []).filter(u => IMG_OK.test(u)).slice(0, 5);
  if (shop.length < 1 || real.length < 2) return { ok: false, error: 'few' };
  const d = today(), lim = (await getSt(env, 'anhDay')) || {}; if (lim.d !== d) { lim.d = d; lim.n = 0; }
  if (lim.n >= +(env.ANH_MAX || 1200)) return { ok: false, error: 'limit' };
  lim.n++; await setSt(env, 'anhDay', lim);
  const parts = [{ text: `Ảnh 1–${shop.length}: ảnh SHOP đăng bán. Ảnh ${shop.length + 1}–${shop.length + real.length}: ảnh NGƯỜI MUA chụp khi nhận hàng (đánh giá). So sánh sản phẩm thật với ảnh mẫu: màu sắc, chất liệu, hình dáng, kích thước, độ hoàn thiện. Bỏ qua khác biệt do ánh sáng, góc chụp, người mặc. Nếu ảnh người mua không chụp sản phẩm thì bỏ qua ảnh đó. Trả JSON: {"muc":"giong"|"hoi_khac"|"khac_xa"|"khong_ro","diem":0-100 (100 = giống hệt),"y":"1 câu tiếng Việt ≤ 90 ký tự nói điểm khác chính hoặc giống ở chỗ nào"}` }];
  for (const u of [...shop, ...real]) {
    try { const r = await fetch(u.replace(/_tn$/, '') + '_tn'); if (!r.ok) continue; const ct = r.headers.get('content-type') || 'image/jpeg'; parts.push({ inline_data: { mime_type: ct.split(';')[0], data: b64(await r.arrayBuffer()) } }); } catch {}
  }
  if (parts.length < 4) return { ok: false, error: 'img' };
  let out = null;
  for (const m of [env.GEMINI_MODEL || 'gemini-flash-lite-latest', 'gemini-flash-latest']) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 200 } }) });
    if (!r.ok) continue;
    const j = await r.json().catch(() => null), t = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts.map(x => x.text || '').join('');
    try { const v = JSON.parse(t); if (/^(giong|hoi_khac|khac_xa|khong_ro)$/.test(v.muc)) { out = { muc: v.muc, diem: Math.max(0, Math.min(100, Math.round(+v.diem || 0))), y: String(v.y || '').slice(0, 120), n: real.length }; break; } } catch {}
  }
  if (!out) return { ok: false, error: 'ai' };
  await env.DB.prepare('INSERT INTO anh (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at').bind(k, JSON.stringify(out), Date.now()).run();
  return { ok: true, ...out };
}

// 🤝 Chợ voucher cộng đồng: khách tặng mã nhập tay mình không dùng; mã báo "hết" ≥ 3 lần tự ẩn. Link chỉ nhận shopee.vn / tiktok.com (không nhận link rút gọn để khỏi bị cướp hoa hồng)
const CODE = /^[A-Z0-9]{4,24}$/;
async function choList(env) {
  const now = Date.now();
  const { results = [] } = await env.DB.prepare('SELECT id, shop, code, label, url, until, at, ok, bad, used FROM cho WHERE until > ? AND bad < 3 AND bad <= ok + 2 ORDER BY (ok - bad) DESC, at DESC LIMIT 40').bind(now).all();
  return { ok: true, items: results };
}
async function choAdd(env, b) {
  const by = String(b && b.by || ''); if (!ID.test(by)) return { ok: false, error: 'id' };
  const code = String(b.code || '').toUpperCase().replace(/\s+/g, ''), shop = b.shop === 'tiktok' ? 'tiktok' : 'shopee';
  const label = String(b.label || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60), until = +b.until || 0;
  let url = ''; try { const x = new URL(String(b.url || '')); if (/^(www\.)?shopee\.vn$|^(www\.|shop\.)?tiktok\.com$/.test(x.hostname) && x.protocol === 'https:') url = x.origin + x.pathname; } catch {}
  if (!CODE.test(code) || label.length < 4 || !(until > Date.now()) || until > Date.now() + 120 * 864e5) return { ok: false, error: 'bad' };
  if (/http|www|\.com|zalo|fb\.|0\d{9}/i.test(label)) return { ok: false, error: 'bad' };
  const d0 = Date.now() - 864e5, cnt = await env.DB.prepare('SELECT COUNT(*) n FROM cho WHERE by = ? AND at > ?').bind(by, d0).first();
  if (cnt && cnt.n >= 10) return { ok: false, error: 'limit' };
  const dup = await env.DB.prepare('SELECT id FROM cho WHERE code = ? AND shop = ? AND until > ?').bind(code, shop, Date.now()).first();
  if (dup) return { ok: false, error: 'dup' };
  await env.DB.prepare('INSERT INTO cho (by, shop, code, label, url, until, at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(by, shop, code, label, url, until, Date.now()).run();
  return { ok: true };
}
async function choVote(env, b) {
  const by = String(b && b.by || ''), id = +b.id, v = b.v; if (!ID.test(by) || !(id > 0) || !/^(ok|bad|used)$/.test(v)) return { ok: false };
  if (v === 'used') { await env.DB.prepare('UPDATE cho SET used = used + 1 WHERE id = ?').bind(id).run(); return { ok: true }; }
  const r = await env.DB.prepare('INSERT OR IGNORE INTO chov (id, by, v) VALUES (?, ?, ?)').bind(id, by, v).run();
  if (r && r.meta && r.meta.changes === 0) return { ok: true, again: true };
  await env.DB.prepare(`UPDATE cho SET ${v} = ${v} + 1 WHERE id = ?`).bind(id).run();
  return { ok: true };
}

// 🎟️ Mã hot tự động: 1 giờ/lần lấy mã Shopee từ AccessTrade (offers_informations), chọn mã giảm thật, còn hạn, sắp hết hạn trước
const atMoney = s => { const m = String(s || '').match(/(\d+(?:[.,]\d+)?)\s*(k|K|tr|triệu|đ|₫|000)?/); if (!m) return 0; const n = parseFloat(m[1].replace(',', '.')); return Math.round(/k/i.test(m[2] || '') ? n * 1e3 : /tr/.test(m[2] || '') ? n * 1e6 : n >= 1000 ? n : 0); };
async function hotRun(env, force) {
  if (!env.AT_KEY) return { ok: false, error: 'no AT_KEY' };
  const old = await getSt(env, 'hot'); if (!force && old && Date.now() - old.at < 3300e3) return { ok: true, cache: true, n: old.items.length };
  const all = [];
  for (let page = 1; page <= 4; page++) {
    const r = await fetch(`https://api.accesstrade.vn/v1/offers_informations?merchant=shopee&status=1&limit=100&page=${page}`, { headers: { Authorization: 'Token ' + env.AT_KEY } });
    if (!r.ok) { if (page === 1) return { ok: false, error: 'AT ' + r.status }; break; }
    let j; try { j = JSON.parse((await r.text()).replace(/:\s*-?(NaN|Infinity)\b/g, ': null')); } catch { break; }
    const data = j.data || []; all.push(...data); if (data.length < 100) break;
  }
  const now = Date.now(), items = [];
  for (const o of all) {
    const end = Date.parse(String(o.end_time || o.end_date || '').replace(' ', 'T') + (/[zZ+]/.test(String(o.end_time || '')) ? '' : '+07:00'));
    if (!(end > now) || end - now > 30 * 864e5) continue;
    const start = Date.parse(String(o.start_time || '').replace(' ', 'T') + '+07:00'); if (start > now + 864e5) continue;
    const cps = Array.isArray(o.coupons) && o.coupons.length ? o.coupons : [{}];
    for (const c of cps.slice(0, 2)) {
      const title = String(c.coupon_desc || o.name || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (title.length < 6) continue;
      const pm = title.match(/(\d{1,2})\s*%/), percent = pm ? +pm[1] : 0, dm = title.match(/giảm\s*(?:ngay\s*)?₫?\s*(\d+(?:[.,]\d+)?\s*(?:k|K|tr|000)?)/i), discount = percent ? 0 : atMoney(dm && dm[1]);
      const mm = title.match(/(?:đơn|tối thiểu|từ)\s*(?:tối thiểu\s*)?₫?\s*(\d+(?:[.,]\d+)?\s*(?:k|K|tr|000)?)/i), minOrder = atMoney(mm && mm[1]);
      const cap = (title.match(/tối đa\s*₫?\s*(\d+(?:[.,]\d+)?\s*(?:k|K|tr|000)?)/i) || [])[1];
      if (!percent && !discount && !/freeship|miễn phí vận chuyển|hoàn xu/i.test(title)) continue;
      let link = ''; try { const x = new URL(String(o.link || '')); if (/^(www\.)?shopee\.vn$/.test(x.hostname)) link = x.origin + x.pathname; } catch {}
      const code = /^[A-Z0-9]{4,24}$/.test(String(c.coupon_code || '').trim().toUpperCase()) ? String(c.coupon_code).trim().toUpperCase() : '';
      items.push({ id: 'at' + (o.id || '') + (code ? '-' + code : ''), shop: 'shopee', title, code, url: link, expires: new Date(end).toISOString(), percent, discount, maxDiscount: atMoney(cap), minOrder, auto: 1,
        score: (discount || percent * 2000) / Math.max(1, minOrder / 1000 + 50) - (end - now) / 864e5 * 0.2 });
    }
  }
  const seen = new Set(), pick = items.sort((a, b) => b.score - a.score).filter(x => { const k = x.code || x.title; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 30).map(({ score, ...x }) => x);
  await setSt(env, 'hot', { at: now, items: pick, raw: all.length });
  return { ok: true, n: pick.length, raw: all.length };
}

// chạy an toàn: ghi lại lỗi để trang thống kê hiện ra
async function feedSafe(env) {
  await hotRun(env).catch(e => setSt(env, 'feedErr', { e: 'Mã hot: ' + (e && e.message || e), at: Date.now() }).catch(() => {}));
  await env.DB.prepare('DELETE FROM tu WHERE d < ?').bind(today() - 60).run().catch(() => {});   // giữ 60 ngày
  await env.DB.prepare('DELETE FROM cho WHERE until < ?').bind(Date.now() - 864e5).run().catch(() => {});
  const tt = await feedTT(env).catch(e => ({ ok: false, error: String(e && e.message || e) }));
  if (!tt.ok && tt.error !== 'no RH_KEY') await setSt(env, 'feedErr', { e: 'TikTok: ' + tt.error, at: Date.now() }).catch(() => {});
  try { const r = await feedRun(env); if (!r.ok) await setSt(env, 'feedErr', { e: r.error, at: Date.now() }).catch(() => {}); return { ...r, tiktok: tt }; }
  catch (e) { await setSt(env, 'feedErr', { e: String(e && e.message || e).slice(0, 200), at: Date.now() }).catch(() => {}); return { ok: false, error: String(e) }; }
}

// ---------- 🔎 từ khoá mọi người tìm (chỉ chữ tìm kiếm, không mã máy) ----------
const SRC = { hh: 'HaoHao', sp: 'Shopee', tt: 'TikTok' };
const normQ = q => String(q || '').normalize('NFC').toLowerCase().replace(/[\s_+]+/g, ' ').replace(/[^\p{L}\p{N} .,&%\-/]/gu, '').trim().slice(0, 60);
async function kw(env, b) {
  const q = normQ(b && b.q), src = SRC[b && b.src] ? b.src : 'hh';
  if (q.length < 2 || /https?|www\.|@|\d{7,}/.test(q)) return { ok: false };   // bỏ link, email, số điện thoại
  await env.DB.prepare('INSERT INTO tu (d, q, src, n) VALUES (?, ?, ?, 1) ON CONFLICT(d, q, src) DO UPDATE SET n = n + 1').bind(today(), q, src).run();
  return { ok: true };
}
async function kwBox(env, days) {
  const d = today();
  const { results: rows = [] } = await env.DB.prepare('SELECT q, SUM(n) n, SUM(CASE WHEN src = \'hh\' THEN n ELSE 0 END) hh, SUM(CASE WHEN src = \'sp\' THEN n ELSE 0 END) sp, SUM(CASE WHEN src = \'tt\' THEN n ELSE 0 END) tt FROM tu WHERE d > ? GROUP BY q ORDER BY n DESC LIMIT 50').bind(d - days).all();
  const tabs = [1, 7, 30].map(x => x === days ? `<b>${x === 1 ? 'Hôm nay' : x + ' ngày'}</b>` : `<a href="?ngay=${x}#tu">${x === 1 ? 'Hôm nay' : x + ' ngày'}</a>`).join(' · ');
  const src = r => [['hh', 'HH'], ['sp', 'SP'], ['tt', 'TT']].filter(([k]) => r[k]).map(([k, l]) => `<span class="s ${k}">${l} ${r[k]}</span>`).join('');
  return `<div class="box" id="tu"><b>🔑 Kho key – từ khoá mọi người tìm</b> <span class="l">(${tabs})</span>
<p class="l" style="margin:4px 0 8px">Bấm Shopee / TikTok để tìm món có hoa hồng rồi đưa vào cửa hàng. HH = ô tìm HaoHao, SP = trang tìm Shopee, TT = trang tìm TikTok.</p>
<table>${rows.map((r, i) => `<tr><td>${i + 1}. ${esc(r.q)} ${src(r)}</td><td><a href="https://affiliate.shopee.vn/offer/product_offer?query=${encodeURIComponent(r.q)}" target="_blank">Shopee</a> · <a href="https://www.tiktok.com/search?q=${encodeURIComponent(r.q)}" target="_blank">TikTok</a> · <b>${r.n}</b></td></tr>`).join('') || '<tr><td>Chưa có</td><td></td></tr>'}</table></div>`;
}

// ---------- 👥 đếm người dùng ----------
const ID = /^[a-z0-9]{16,40}$/, VER = /^\d{1,3}(\.\d{1,4}){1,3}$/;
async function ping(env, b) {
  const id = String(b && b.id || ''), v = String(b && b.v || '');
  if (!ID.test(id) || !VER.test(v)) return { ok: false };
  const d = today();
  await env.DB.prepare('INSERT INTO may (id, v, d0, d1, gone) VALUES (?, ?, ?, ?, NULL) ON CONFLICT(id) DO UPDATE SET v = excluded.v, d1 = excluded.d1, gone = NULL WHERE may.d1 < excluded.d1 OR may.v <> excluded.v OR may.gone IS NOT NULL').bind(id, v, d, d).run();
  return { ok: true };
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const page = (title, body) => new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6f7f9;color:#1f2a44}main{max-width:560px;margin:0 auto;padding:28px 16px}h1{font-size:22px;margin:0 0 6px}p{color:#5b6475}
.box{background:#fff;border:1px solid #e3e6ec;border-radius:12px;padding:16px;margin:14px 0}.n{font:800 30px/1.1 system-ui;color:#1f2a44}.l{font-size:12px;color:#7a8394}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}table{width:100%;border-collapse:collapse;font-size:14px}td{padding:6px 4px;border-bottom:1px solid #eef0f4}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.s{display:inline-block;font-size:11px;padding:0 5px;margin-left:4px;border-radius:6px;background:#eef0f4;color:#5b6475}.s.sp{background:#fff1ea;color:#ee4d2d}.s.tt{background:#eef;color:#333}a{color:#ec4a68;text-decoration:none}
button{display:block;width:100%;text-align:left;margin:8px 0;padding:11px 14px;border:1px solid #d7dbe3;border-radius:10px;background:#fff;font:inherit;cursor:pointer}button:hover{border-color:#ec4a68}</style></head><body><main>${body}</main></body></html>`,
  { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
async function bye(env, u) {
  const id = String(u.searchParams.get('id') || ''), v = String(u.searchParams.get('v') || '');
  const d = today();
  if (ID.test(id)) {
    const r = await env.DB.prepare('SELECT gone FROM may WHERE id = ?').bind(id).first();
    if (!r || r.gone == null) {
      await env.DB.batch([env.DB.prepare('INSERT INTO go (d, id, v, why) VALUES (?, ?, ?, NULL)').bind(d, id, VER.test(v) ? v : ''),
        env.DB.prepare('UPDATE may SET gone = ? WHERE id = ?').bind(d, id)]);
    }
  }
  const why = ['Không dùng tới', 'Làm chậm máy / trình duyệt', 'Hiện thông báo nhiều quá', 'Thiếu tính năng mình cần', 'Bị lỗi', 'Lý do khác'];
  return page('Tạm biệt HaoHao', `<h1>🐹 Tiếc quá, HaoHao đã được gỡ</h1><p>Bạn cho HaoHao biết lý do để làm tốt hơn nhé (không bắt buộc):</p>
<div id="w">${why.map(w => `<button>${esc(w)}</button>`).join('')}</div><p id="t" hidden>💛 Cảm ơn bạn! Chúc bạn mua sắm vui.</p>
<script>document.querySelectorAll('#w button').forEach(b=>b.onclick=()=>{fetch('/bye',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:${JSON.stringify(ID.test(id) ? id : '')},why:b.textContent})}).catch(()=>{});document.getElementById('w').hidden=true;document.getElementById('t').hidden=false;});</script>`);
}
async function byeWhy(env, b) {
  const id = String(b && b.id || ''), why = String(b && b.why || '').slice(0, 60);
  if (!ID.test(id) || !why) return { ok: false };
  await env.DB.prepare('UPDATE go SET why = ? WHERE id = ? AND why IS NULL').bind(why, id).run();
  return { ok: true };
}
async function stats(env, u) {
  if (env.STATS_KEY && u.searchParams.get('key') !== env.STATS_KEY) return page('Thống kê', '<h1>🔒 Cần mật khẩu</h1><p>Mở lại đường dẫn có ?key=…</p>');
  const d = today(), q = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();
  const [all, d1, d7, d30, nw7, g7, gAll, gia] = await Promise.all([
    q('SELECT COUNT(*) n FROM may'), q('SELECT COUNT(*) n FROM may WHERE d1 >= ? AND gone IS NULL', d), q('SELECT COUNT(*) n FROM may WHERE d1 >= ? AND gone IS NULL', d - 6),
    q('SELECT COUNT(*) n FROM may WHERE d1 >= ? AND gone IS NULL', d - 29), q('SELECT COUNT(*) n FROM may WHERE d0 >= ?', d - 6),
    q('SELECT COUNT(*) n FROM go WHERE d >= ?', d - 6), q('SELECT COUNT(*) n FROM go'), q('SELECT COUNT(*) n FROM gia')]);
  const { results: vers = [] } = await env.DB.prepare('SELECT v, COUNT(*) n FROM may WHERE d1 >= ? AND gone IS NULL GROUP BY v ORDER BY n DESC LIMIT 12').bind(d - 29).all();
  const { results: whys = [] } = await env.DB.prepare('SELECT why, COUNT(*) n FROM go WHERE why IS NOT NULL GROUP BY why ORDER BY n DESC').all();
  const n = x => (x && x.n || 0).toLocaleString('vi-VN'), feed = await getSt(env, 'feed').catch(() => null), fe = await getSt(env, 'feedErr').catch(() => null), ft = await getSt(env, 'feedtt').catch(() => null);
  const tile = (v, l) => `<div><div class="n">${v}</div><div class="l">${l}</div></div>`;
  return page('HaoHao – Thống kê', `<h1>🐹 HaoHao – Thống kê</h1><p>Mỗi máy chỉ tính 1 lần (mã ngẫu nhiên, không thông tin cá nhân).</p>
<div class="box g">${tile(n(d1), 'Dùng hôm nay')}${tile(n(d7), 'Dùng 7 ngày')}${tile(n(d30), 'Dùng 30 ngày')}</div>
<div class="box g">${tile(n(all), 'Tổng máy đã cài')}${tile(n(nw7), 'Cài mới 7 ngày')}${tile(n(gAll), 'Đã gỡ (7 ngày: ' + n(g7) + ')')}</div>
<div class="box"><b>Phiên bản đang chạy (30 ngày)</b><table>${vers.map(r => `<tr><td>${esc(r.v)}</td><td>${n(r)}</td></tr>`).join('') || '<tr><td>Chưa có</td><td></td></tr>'}</table></div>
<div class="box"><b>Lý do gỡ</b><table>${whys.map(r => `<tr><td>${esc(r.why)}</td><td>${n(r)}</td></tr>`).join('') || '<tr><td>Chưa có</td><td></td></tr>'}</table></div>
<p>Kho giá: ${n(gia)} món.${feed ? ` Tự nạp hôm nay: ${feed.done ? 'xong' : 'trang ' + feed.page} · ${(feed.n || 0).toLocaleString('vi-VN')} lượt ghi${feed.err ? ' · lỗi ' + esc(feed.err) : ''}.` : ''}${ft ? ` TikTok hôm nay: ${ft.ki >= TT_KW.length ? 'xong' : 'từ khoá ' + ft.ki + '/' + TT_KW.length} · ${(ft.n || 0).toLocaleString('vi-VN')} lượt ghi${ft.err ? ' · lỗi ' + esc(ft.err) : ''}.` : ''}${fe && (!feed || fe.at > Math.max(feed.at || 0, ft && ft.at || 0)) ? ` ⚠️ Tự nạp lỗi: ${esc(fe.e)}` : ''}</p>
${await kwBox(env, [1, 7, 30].includes(+u.searchParams.get('ngay')) ? +u.searchParams.get('ngay') : 7)}`);
}

export default {
  async scheduled(evt, env, ctx) { ctx.waitUntil(feedSafe(env)); },
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(req.url);
    try {
      await init(env);
      if (u.pathname === '/p' && req.method === 'POST') {
        if (Number(req.headers.get('content-length') || 0) > 20000) return json({ error: 'too big' }, 413);
        return json(await put(env, await req.json().catch(() => null)));
      }
      if (u.pathname === '/anh' && req.method === 'POST') { if (Number(req.headers.get('content-length') || 0) > 8000) return json({ error: 'too big' }, 413); return json(await anh(env, await req.json().catch(() => null))); }
      if (u.pathname === '/cho' && req.method === 'GET') return json(await choList(env));
      if (u.pathname === '/cho' && req.method === 'POST') { const b = await req.json().catch(() => null); return json(b && b.vote ? await choVote(env, b) : await choAdd(env, b)); }
      if (u.pathname === '/hot') { if (u.searchParams.get('run')) return json(await hotRun(env, true)); const h = await getSt(env, 'hot'); return json({ ok: true, at: h ? h.at : 0, items: h ? h.items : [] }, 200, { 'cache-control': 'max-age=600' }); }
      if (u.pathname === '/tt') return await ttSearch(env, u.searchParams.get('q'), ctx);
      if (u.pathname === '/k' && req.method === 'POST') return json(await kw(env, await req.json().catch(() => null)));
      if (u.pathname === '/ping' && req.method === 'POST') return json(await ping(env, await req.json().catch(() => null)));
      if (u.pathname === '/bye') return req.method === 'POST' ? json(await byeWhy(env, await req.json().catch(() => null))) : await bye(env, u);
      if (u.pathname === '/thongke') return await stats(env, u);
      if (u.pathname === '/nap') {   // chạy tự nạp ngay (tối đa 1 lần / 2 phút)
        const f = await getSt(env, 'feed'); if (f && f.at && Date.now() - f.at < 120000) return json({ ok: false, error: 'đợi 2 phút', feed: f });
        return json(await feedSafe(env));
      }
      if (u.pathname === '/h') return json(await get(env, u.searchParams.get('k')), 200, { 'cache-control': 'public, max-age=600' });
      if (u.pathname === '/') {
        const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM gia').first();
        return json({ ok: true, name: 'HaoHao kho giá', mon: r ? r.n : 0, day: today() });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) { return json({ error: String(e && e.message || e) }, 500); }
  },
};
