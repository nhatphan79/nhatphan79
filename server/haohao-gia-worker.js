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
//   GET  /shop                            → web HaoHao Store (trang lấy từ GitHub haohao-shop-web/)
//   GET  /tin-tuc/ , /tin-tuc/<bài>, /sitemap.xml, /robots.txt → Tin tức SEO (GitHub haohao-shop-web/tin-tuc/)
//   GET  /store                           → sản phẩm HaoHao Store (5 ngách) đọc từ collshp.com/haohaostore, tự cập nhật 6 giờ/lần
// "ngày" = số ngày tính từ 1/1/1970 theo giờ Việt Nam. Mỗi món mỗi ngày 1 mốc (giữ giá thấp nhất trong ngày), giữ 120 ngày.

const KEEP_DAYS = 120, MAX_IN = 60, MAX_OUT = 20;
const KEY = /^((ap:)?sp:\d{3,12}\.\d{3,16}|tt:\d{8,22})$/;   // V1.81: ap:sp:… = giá "Mua trên app" tiện ích tính
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
    env.DB.prepare('CREATE TABLE IF NOT EXISTS gopy (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, by TEXT, ip TEXT, v TEXT, txt TEXT)'),   // 14/10: góp ý của khách – chỉ chủ app đọc
    env.DB.prepare('CREATE TABLE IF NOT EXISTS choip (d INTEGER, ip TEXT, n INTEGER, PRIMARY KEY (d, ip))'),   // 13/10: giới hạn đăng chợ theo IP
    env.DB.prepare('CREATE TABLE IF NOT EXISTS sp (k TEXT PRIMARY KEY, t TEXT, f TEXT, img TEXT, p INTEGER, o INTEGER, dc INTEGER, shop TEXT, url TEXT, d INTEGER)'),   // 13/10: kho tìm sản phẩm Shopee cho khách
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
  const d = today(); let st = (await getSt(env, 'feed2')) || {};
  if (st.day !== d) st = { day: d, page: 1, done: false, n: 0 };
  if (st.done) return { ok: true, done: true, n: st.n };
  const items = [], rows = [];
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
      if (price >= 1000 && p.name && p.url) rows.push([`sp:${m[1]}.${m[2]}`, String(p.name).slice(0, 200), fold(p.name + ' ' + (p.shop_name || '') + ' ' + (p.cate || '')).slice(0, 400), String(p.image || '').slice(0, 300), price, before > price ? before : 0,
        Math.round(Number(p.discount_rate) || 0) || (before > price ? Math.round((1 - price / before) * 100) : 0), String(p.shop_name || '').slice(0, 80), String(p.url).slice(0, 400), d]);
    }
    st.page++; if (data.length < 200) st.done = true;
  }
  items.sort((x, y) => (y.prio ? 1 : 0) - (x.prio ? 1 : 0));
  for (let i = 0; i < rows.length; i += 100) await env.DB.batch(rows.slice(i, i + 100).map(r => env.DB.prepare('INSERT INTO sp (k, t, f, img, p, o, dc, shop, url, d) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET t = excluded.t, f = excluded.f, img = excluded.img, p = excluded.p, o = excluded.o, dc = excluded.dc, shop = excluded.shop, url = excluded.url, d = excluded.d').bind(...r))).catch(() => {});
  const r = await save(env, items);
  st.n = (st.n || 0) + r.saved; st.at = Date.now();
  await setSt(env, 'feed2', st);
  if (st.done) await env.DB.prepare('DELETE FROM sp WHERE d < ?').bind(d - 2).run().catch(() => {});
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

// 🔎 /search?q=&src=all|shopee|tiktok&page=&cursor= – Soi sản phẩm cho mọi máy (13/10). Shopee: kho sp (AccessTrade nạp sẵn); TikTok: RioHub. Khoá chỉ nằm trên máy chủ.
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
async function spySearch(env, u) {
  const q = normQ(u.searchParams.get('q')), src = u.searchParams.get('src') || 'all', page = Math.max(1, Math.min(20, +u.searchParams.get('page') || 1)), cursor = String(u.searchParams.get('cursor') || '').slice(0, 300);
  if (q.length < 2) return { q, shopee: { items: [], total: 0 }, tiktok: { items: [] } };
  await init(env);
  const shopee = src === 'tiktok' ? null : await (async () => {
    const w = fold(q).split(/\s+/).filter(Boolean).slice(0, 6); if (!w.length) return { items: [], total: 0 };
    const where = w.map(() => 'f LIKE ?').join(' AND '), args = w.map(t => '%' + t.replace(/[%_]/g, '') + '%');
    const r = await env.DB.prepare(`SELECT k, t, img, p, o, dc, shop, url FROM sp WHERE ${where} ORDER BY dc DESC LIMIT 20 OFFSET ?`).bind(...args, (page - 1) * 20).all();
    const items = (r.results || []).map(x => ({ src: 'shopee', id: x.k.slice(3), title: x.t, image: x.img, price: x.p, oldPrice: x.o, discount: x.dc, shop: x.shop, url: x.url }));
    return { items, total: items.length < 20 ? (page - 1) * 20 + items.length : (page * 20) + 1 };
  })().catch(e => ({ items: [], error: String(e && e.message || e) }));
  const tiktok = src === 'shopee' || !env.RH_KEY ? null : await (async () => {
    const qs = new URLSearchParams({ creator_username: env.RH_CREATOR || 'nhanhimdaily', keyword: q, page_size: '20' }); if (cursor) qs.set('page_token', cursor);
    for (const base of ['https://riohub.vn/api/v1', 'https://riohub.riokupon.com/api/v1', 'https://riohub.riokupon.me/api/v1']) {
      try {
        const r = await fetch(`${base}/partner/tiktok/affiliate/products/search?${qs}`, { headers: { 'X-Riohub-Api-Key': env.RH_KEY } }); const j = await r.json().catch(() => ({}));
        if (!r.ok) return { items: [], error: 'RioHub ' + r.status };
        return { next: j.next_page_token || '', items: (j.products || []).map(p => {
          const price = rhNum(p.sales_price && p.sales_price.minimum_amount) || rhNum(p.price && (p.price.floor_price || p.price.amount));
          return { src: 'tiktok', id: String(p.id), title: p.title || '', image: p.main_image_url || '', price, oldPrice: 0, discount: 0,
            sold: (p.market_performance && +p.market_performance.historical_sold_quantity) || 0, rating: +(p.review && p.review.overall_score) || 0,
            shop: (p.shop && p.shop.name) || p.seller_name || '', url: `https://www.tiktok.com/view/product/${p.id}` };
        }).filter(x => /^\d{8,22}$/.test(x.id)) };
      } catch {}
    }
    return { items: [], error: 'RioHub lỗi' };
  })();
  return { q, shopee, tiktok };
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
  let out = null, lastErr = '';
  // mẫu Gemini: dò danh sách mẫu "flash" mà key dùng được (nhớ 1 ngày), lite trước
  let gm = await getSt(env, 'gemModels');
  if (!gm || Date.now() - gm.at > 864e5) {
    try { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': env.GEMINI_KEY } }); const j = await r.json();
      const ver = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
      const list = (j.models || []).map(m => ({ n: String(m.name || '').replace(/^models\//, ''), g: m.supportedGenerationMethods || [] })).filter(m => m.g.includes('generateContent') && /^gemini-[\d.]+-flash(-lite)?$/.test(m.n)).map(m => m.n)
        .sort((x, y) => (/-lite/.test(y) - /-lite/.test(x)) || ver(y) - ver(x));
      gm = { at: Date.now(), list: list.slice(0, 4) }; if (list.length) await setSt(env, 'gemModels', gm); else lastErr = 'models: ' + (j.error && j.error.message || r.status);
    } catch (e) { lastErr = 'models: ' + e.message; }
  }
  for (const m of [...new Set([env.GEMINI_MODEL, ...((gm && gm.list) || []), 'gemini-flash-lite-latest', 'gemini-flash-latest'].filter(Boolean))].slice(0, 5)) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 300 } }) });
    if (!r.ok) { lastErr = m + ' ' + r.status + ' ' + String(((await r.json().catch(() => ({}))).error || {}).message || '').slice(0, 120); continue; }
    const j = await r.json().catch(() => null), t = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts.map(x => x.text || '').join('');
    lastErr = m + ' trả lời lạ: ' + String(t || '').slice(0, 80);
    try { const v = JSON.parse(String(t || '').replace(/^```(json)?|```$/g, '').trim()); if (/^(giong|hoi_khac|khac_xa|khong_ro)$/.test(v.muc)) { out = { muc: v.muc, diem: Math.max(0, Math.min(100, Math.round(+v.diem || 0))), y: String(v.y || '').slice(0, 120), n: real.length }; break; } } catch {}
  }
  if (!out) return { ok: false, error: 'ai', why: lastErr.replace(/key=[\w-]+/g, '') };
  await env.DB.prepare('INSERT INTO anh (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at').bind(k, JSON.stringify(out), Date.now()).run();
  return { ok: true, ...out };
}

// 🤝 Chợ voucher cộng đồng: khách tặng mã nhập tay mình không dùng; mã bị 2 máy báo hỏng tự xoá; người đăng tự xoá được. Link chỉ nhận shopee.vn / tiktok.com (không nhận link rút gọn để khỏi bị cướp hoa hồng)
const CODE = /^[A-Z0-9]{4,24}$/;
async function choList(env, by = '') {
  const now = Date.now();
  // 13/10: mã bị 2 máy báo hỏng là ẩn (và bị xoá ở choVote); mine = mã do chính máy này đăng (không lộ mã máy)
  const { results = [] } = await env.DB.prepare('SELECT id, by, shop, code, label, url, until, at, ok, bad, used FROM cho WHERE until > ? AND bad < 2 ORDER BY (ok - bad) DESC, at DESC LIMIT 40').bind(now).all();
  return { ok: true, items: results.map(({ by: b, ...x }) => ({ ...x, mine: !!by && b === by })) };
}
// 13/10: địa chỉ IP người gửi (Cloudflare cấp, khó giả) → băm, không lưu IP thật
async function ipHash(req) {
  const ip = req.headers.get('CF-Connecting-IP') || ''; if (!ip) return '';
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('haohao|' + ip));
  return [...new Uint8Array(h)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join('');
}
const isAdmin = (env, u) => !!(env.STATS_KEY && u.searchParams.get('key') === env.STATS_KEY);
// 💬 14/10: góp ý – khách gửi, chỉ chủ app đọc ở /thongke?key=…  (mỗi mạng tối đa 5 góp ý/ngày)
async function gopy(env, b, ipx) {
  const txt = String(b && b.txt || '').replace(/[<>]/g, '').replace(/\s+\n/g, '\n').trim().slice(0, 1000), by = String(b && b.by || '').slice(0, 40), v = String(b && b.v || '').slice(0, 20);
  if (txt.length < 5 || !ipx) return { ok: false, error: 'bad' };
  const c = await env.DB.prepare('SELECT COUNT(*) n FROM gopy WHERE ip = ? AND at > ?').bind(ipx, Date.now() - 864e5).first();
  if (c && c.n >= 5) return { ok: false, error: 'limit' };
  await env.DB.prepare('INSERT INTO gopy (at, by, ip, v, txt) VALUES (?, ?, ?, ?, ?)').bind(Date.now(), by, ipx, v, txt).run();
  return { ok: true };
}
async function choDel(env, b) {   // 13/10: người đăng tự xoá mã của mình
  const by = String(b && b.by || ''), id = +b.id; if (!ID.test(by) || !(id > 0)) return { ok: false };
  const r = await env.DB.prepare('DELETE FROM cho WHERE id = ? AND by = ?').bind(id, by).run();
  await env.DB.prepare('DELETE FROM chov WHERE id = ?').bind(id).run().catch(() => {});
  return { ok: !!(r && r.meta && r.meta.changes) };
}
async function choAdd(env, b, ipx) {
  const by = String(b && b.by || ''); if (!ID.test(by)) return { ok: false, error: 'id' };
  const code = String(b.code || '').toUpperCase().replace(/\s+/g, ''), shop = b.shop === 'tiktok' ? 'tiktok' : 'shopee';
  const label = String(b.label || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60), until = +b.until || 0;
  let url = ''; try { const x = new URL(String(b.url || '')); if (/^(www\.)?shopee\.vn$|^(www\.|shop\.)?tiktok\.com$/.test(x.hostname) && x.protocol === 'https:') url = x.origin + x.pathname; } catch {}
  if (!CODE.test(code) || label.length < 4 || !(until > Date.now()) || until > Date.now() + 120 * 864e5) return { ok: false, error: 'bad' };
  if (/http|www|\.com|zalo|fb\.|0\d{9}/i.test(label)) return { ok: false, error: 'bad' };
  const d0 = Date.now() - 864e5, cnt = await env.DB.prepare('SELECT COUNT(*) n FROM cho WHERE by = ? AND at > ?').bind(by, d0).first();
  if (cnt && cnt.n >= 10) return { ok: false, error: 'limit' };
  const ipn = ipx ? await env.DB.prepare('SELECT n FROM choip WHERE d = ? AND ip = ?').bind(today(), ipx).first() : null;   // 13/10: mỗi IP tối đa 2 mã/ngày
  if (!ipx || (ipn && ipn.n >= 2)) return { ok: false, error: 'limit' };
  const dup = await env.DB.prepare('SELECT id FROM cho WHERE code = ? AND shop = ? AND until > ?').bind(code, shop, Date.now()).first();
  if (dup) return { ok: false, error: 'dup' };
  await env.DB.prepare('INSERT INTO cho (by, shop, code, label, url, until, at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(by, shop, code, label, url, until, Date.now()).run();
  await env.DB.prepare('INSERT INTO choip (d, ip, n) VALUES (?, ?, 1) ON CONFLICT(d, ip) DO UPDATE SET n = n + 1').bind(today(), ipx).run();
  return { ok: true };
}
async function choVote(env, b, ipx) {
  const by = String(b && b.by || ''), id = +b.id, v = b.v; if (!ID.test(by) || !(id > 0) || !/^(ok|bad|used)$/.test(v)) return { ok: false };
  if (v === 'used') { await env.DB.prepare('UPDATE cho SET used = used + 1 WHERE id = ?').bind(id).run(); return { ok: true }; }
  if (!ipx) return { ok: false };
  const r = await env.DB.prepare('INSERT OR IGNORE INTO chov (id, by, v) VALUES (?, ?, ?)').bind(id, 'ip:' + ipx, v).run();   // 13/10: tính theo IP – 1 IP báo nhiều lần chỉ tính 1
  if (r && r.meta && r.meta.changes === 0) return { ok: true, again: true };
  await env.DB.prepare(`UPDATE cho SET ${v} = ${v} + 1 WHERE id = ?`).bind(id).run();
  if (v === 'bad') await env.DB.prepare('DELETE FROM cho WHERE id = ? AND bad >= 2').bind(id).run();   // 13/10: 2 IP khác nhau báo hỏng → tự xoá
  return { ok: true };
}

// 🎟️ Mã hot tự động: 1 giờ/lần lấy mã Shopee từ AccessTrade (offers_informations), chọn mã giảm thật, còn hạn, sắp hết hạn trước
const atMoney = s => { const m = String(s || '').match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|K|tr|triệu)?/); if (!m) return 0; const raw = m[1], grp = /^\d{1,3}([.,]\d{3})+$/.test(raw); const n = grp ? +raw.replace(/[.,]/g, '') : parseFloat(raw.replace(',', '.')); return Math.round(/k/i.test(m[2] || '') ? n * 1e3 : /tr/.test(m[2] || '') ? n * 1e6 : n >= 1000 ? n : 0); };
const atTime = (t, endOfDay) => { t = String(t || '').trim(); if (!t) return NaN; if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += endOfDay ? 'T23:59:59' : 'T00:00:00'; t = t.replace(' ', 'T'); return Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(t) ? t : t + '+07:00'); };
async function hotRun(env, force) {
  if (!env.AT_KEY) return { ok: false, error: 'no AT_KEY' };
  const old = await getSt(env, 'hot'); if (!force && old && Date.now() - old.at < 3300e3) return { ok: true, cache: true, n: old.items.length };
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`https://api.accesstrade.vn/v1/offers_informations?merchant=shopee&status=1&limit=100&page=${page}`, { headers: { Authorization: 'Token ' + env.AT_KEY } });
    if (!r.ok) { if (page === 1) return { ok: false, error: 'AT ' + r.status }; break; }
    let j; try { j = JSON.parse((await r.text()).replace(/:\s*-?(NaN|Infinity)\b/g, ': null')); } catch { break; }
    const data = j.data || []; all.push(...data); if (data.length < 100) break;
  }
  const now = Date.now(), items = [];
  for (const o of all) {
    const end = atTime(o.end_time || o.end_date, true);
    if (!(end > now) || end - now > 30 * 864e5) continue;
    const start = atTime(o.start_time); if (start > now) continue;
    const cps = Array.isArray(o.coupons) && o.coupons.length ? o.coupons : [{}];
    for (const c of cps.slice(0, 2)) {
      const title = String(o.name || c.coupon_desc || '').replace(/^(\[[^\]]+\]\s*-?\s*)+/, m => m.replace(/\]\s*-?\s*\[.*$/, ']').trim() + ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').replace(/ VNĐ/g, 'đ').trim().slice(0, 90); if (title.length < 6) continue;
      const pm = title.match(/(\d{1,2})\s*%/), percent = pm ? +pm[1] : 0, dm = title.match(/giảm\s*(?:ngay\s*)?₫?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?\s*(?:k|K|tr)?)/i), discount = percent ? 0 : atMoney(dm && dm[1]);
      const mm = title.match(/(?:đơn|tối thiểu|từ)\s*(?:tối thiểu\s*)?₫?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?\s*(?:k|K|tr)?)/i), minOrder = atMoney(mm && mm[1]);
      const cap = (title.match(/tối đa\s*₫?\s*(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?\s*(?:k|K|tr)?)/i) || [])[1];
      if (!percent && !discount && !/freeship|miễn phí vận chuyển|hoàn xu/i.test(title)) continue;
      const kfmt = n => n >= 1e6 ? (n / 1e6 + 'tr').replace('.', ',') : Math.round(n / 1000) + 'k';
      const nice = title.replace(/\s*tối đa 0đ/i, '').replace(/\s*cho đơn tối thiểu 0đ/i, '').replace(/(\d{1,3}(?:[.,]\d{3})+)đ/g, (m, x) => kfmt(+x.replace(/[.,]/g, ''))).replace(/cho đơn tối thiểu/i, 'đơn từ');
      let link = ''; try { const x = new URL(String(o.link || '')); if (/^(www\.)?shopee\.vn$/.test(x.hostname)) link = x.href; } catch {}
      const code = /^[A-Z0-9]{4,24}$/.test(String(c.coupon_code || '').trim().toUpperCase()) ? String(c.coupon_code).trim().toUpperCase() : '';
      items.push({ id: 'at' + (o.id || '') + (code ? '-' + code : ''), shop: 'shopee', title: nice, code, url: link, expires: new Date(end).toISOString(), percent, discount, maxDiscount: atMoney(cap), minOrder, auto: 1,
        score: discount || Math.min(atMoney(cap) || Infinity, percent * 3000), brand: /official|(?<![a-z])mall(?![a-z])|chính hãng|flagship|thương hiệu/i.test(String(o.name || '')) });   // 10 mã giảm cao nhất (mã % tính theo mức tối đa)
    }
  }
  const seen = new Set(), uniq = items.sort((a, b) => b.score - a.score).filter(x => { const k = x.code || x.title; if (seen.has(k)) return false; seen.add(k); return true; });
  const pick = uniq.filter(x => x.brand).slice(0, 10).map(({ score, brand, ...x }) => x);   // mặc định: 10 mã giảm cao nhất của shop thương hiệu
  await setSt(env, 'hot', { at: now, items: pick, raw: all.length });
  await setSt(env, 'hotall', uniq.slice(0, 1000).map(({ score, ...x }) => x));   // để tìm theo từ khoá
  if (force === 'raw') return { ok: true, n: pick.length, raw: all.length, sample: all.slice(0, 3).map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 120) : Array.isArray(v) ? v.slice(0, 2) : v]))) };
  return { ok: true, n: pick.length, raw: all.length };
}

// chạy an toàn: ghi lại lỗi để trang thống kê hiện ra
const FEED_ON = false;   // 20/10: TẠM TẮT nạp kho Shopee/TikTok theo lịch (D1 vượt 5 triệu dòng đọc/ngày). Bật lại: đổi thành true
async function feedSafe(env, manual) {
  await hotRun(env).catch(e => setSt(env, 'feedErr', { e: 'Mã hot: ' + (e && e.message || e), at: Date.now() }).catch(() => {}));
  await env.DB.prepare('DELETE FROM tu WHERE d < ?').bind(today() - 60).run().catch(() => {});   // giữ 60 ngày
  await env.DB.prepare('DELETE FROM cho WHERE until < ?').bind(Date.now() - 864e5).run().catch(() => {});
  if (!FEED_ON && !manual) return { ok: true, paused: true };
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
async function gopyBox(env) {
  const { results: r = [] } = await env.DB.prepare('SELECT at, v, txt FROM gopy ORDER BY id DESC LIMIT 100').all();
  const t = x => new Date(x + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  return `<div class="box"><b>💬 Góp ý của khách (${r.length} mới nhất)</b><table>${r.map(x => `<tr><td style="white-space:nowrap;vertical-align:top">${t(x.at)}<br><small>${esc(x.v || '')}</small></td><td style="white-space:pre-wrap">${esc(x.txt)}</td></tr>`).join('') || '<tr><td>Chưa có góp ý</td><td></td></tr>'}</table></div>`;
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
  const n = x => (x && x.n || 0).toLocaleString('vi-VN'), feed = await getSt(env, 'feed2').catch(() => null), fe = await getSt(env, 'feedErr').catch(() => null), ft = await getSt(env, 'feedtt').catch(() => null);
  const tile = (v, l) => `<div><div class="n">${v}</div><div class="l">${l}</div></div>`;
  return page('HaoHao – Thống kê', `<h1>🐹 HaoHao – Thống kê</h1><p>Mỗi máy chỉ tính 1 lần (mã ngẫu nhiên, không thông tin cá nhân).</p>
<div class="box g">${tile(n(d1), 'Dùng hôm nay')}${tile(n(d7), 'Dùng 7 ngày')}${tile(n(d30), 'Dùng 30 ngày')}</div>
<div class="box g">${tile(n(all), 'Tổng máy đã cài')}${tile(n(nw7), 'Cài mới 7 ngày')}${tile(n(gAll), 'Đã gỡ (7 ngày: ' + n(g7) + ')')}</div>
<div class="box"><b>Phiên bản đang chạy (30 ngày)</b><table>${vers.map(r => `<tr><td>${esc(r.v)}</td><td>${n(r)}</td></tr>`).join('') || '<tr><td>Chưa có</td><td></td></tr>'}</table></div>
${isAdmin(env, u) ? await gopyBox(env) : '<div class="box"><b>💬 Góp ý của khách</b><p>Đặt Secret STATS_KEY trên Cloudflare rồi mở /thongke?key=… để xem.</p></div>'}
<div class="box"><b>Lý do gỡ</b><table>${whys.map(r => `<tr><td>${esc(r.why)}</td><td>${n(r)}</td></tr>`).join('') || '<tr><td>Chưa có</td><td></td></tr>'}</table></div>
<p>Kho giá: ${n(gia)} món.${feed ? ` Tự nạp hôm nay: ${feed.done ? 'xong' : 'trang ' + feed.page} · ${(feed.n || 0).toLocaleString('vi-VN')} lượt ghi${feed.err ? ' · lỗi ' + esc(feed.err) : ''}.` : ''}${ft ? ` TikTok hôm nay: ${ft.ki >= TT_KW.length ? 'xong' : 'từ khoá ' + ft.ki + '/' + TT_KW.length} · ${(ft.n || 0).toLocaleString('vi-VN')} lượt ghi${ft.err ? ' · lỗi ' + esc(ft.err) : ''}.` : ''}${fe && (!feed || fe.at > Math.max(feed.at || 0, ft && ft.at || 0)) ? ` ⚠️ Tự nạp lỗi: ${esc(fe.e)}` : ''}</p>
${await kwBox(env, [1, 7, 30].includes(+u.searchParams.get('ngay')) ? +u.searchParams.get('ngay') : 7)}`);
}

// ---------- 🏬 HaoHao Store web (19/10): đọc danh mục CHỦ APP tạo trên cửa hàng Shopee Affiliate (collshp.com/haohaostore) ----------
// Chỉ lấy món nằm trong danh mục anh Nhật tạo (bỏ "Có thể bạn thích" / quảng cáo Shopee tự chèn).
// Danh mục → 5 ngách web theo từ khoá tên danh mục; danh mục không khớp ngách nào thì bỏ qua.
// 20/10: ngách theo SỐ đầu tên danh mục (1–5); món → ô chủ đề = tên danh mục (bỏ số, bỏ "HaoHao"). Web: Bán chạy nhất = Tất cả + các ô chủ đề.
// Cron 15 phút gọi storeMaybe → chạy thật 6 giờ/lần. GET /store → JSON cho web. GET /store?run=1&key=STATS_KEY → chạy ngay.
const STORE_V = 5, STORE_SUFFIX = 'haohaostore', STORE_AFF = '17393130606', STORE_EVERY = 6 * 3600e3;
const STORE_QG = 'query StorefrontGroupListQuery($urlSuffix: String, $page: LinktreelandingpagePaginationInput, $affiliateMeta: AffiliateMetaInput, $uuId: String, $deviceId: String, $cid: String, $language: String) { storefrontGroupList(urlSuffix: $urlSuffix, page: $page, affiliateMeta: $affiliateMeta, uuId: $uuId, deviceId: $deviceId, cid: $cid, language: $language) { groupList { groupId groupName totalCount } pagination { hasMore totalCount } } }';
const STORE_QP = 'query StorefrontGroupProductListQuery($urlSuffix: String, $keyword: String, $groupId: Long, $page: LinktreelandingpagePaginationInput, $affiliateMeta: AffiliateMetaInput, $uuId: String, $deviceId: String, $cid: String, $language: String) { storefrontGroupProductList(urlSuffix: $urlSuffix, keyword: $keyword, groupId: $groupId, page: $page, affiliateMeta: $affiliateMeta, uuId: $uuId, deviceId: $deviceId, cid: $cid, language: $language) { itemList { link linkName image linkType itemId itemCard } pagination { hasMore totalCount } } }';
// thứ tự quan trọng: gia-dung trước xay-dung ("Nhà cửa & Gia dụng" / "Xây dựng & Dụng cụ")
const STORE_NICHE = [['thoi-trang', /thoi trang/], ['me-be', /(^|[^a-z])(me|be)([^a-z]|$)|tre em|so sinh/], ['gia-dung', /nha cua|gia dung/], ['xay-dung', /xay dung|dung cu/], ['qua-tang', /qua tang|(^|[^a-z])qua([^a-z]|$)/]];
// mục nhỏ – PHẢI trùng tên mục trên web (cats của từng ngách)
const STORE_CATS = {
  'thoi-trang': [['Áo', ['ao thun', 'ao phong', 'polo', 'ao so mi', 'so mi', 'ao', 'tee', 'croptop', 'ao kieu', 'ao ba lo', 'tank top']], ['Quần', ['quan', 'jean', 'jogger', 'legging']], ['Váy & đầm', ['vay', 'dam', 'chan vay', 'yem']], ['Áo khoác & giữ ấm', ['ao khoac', 'khoac', 'hoodie', 'jacket', 'ao gio', 'cardigan', 'ao len', 'ao ni', 'sweater', 'ao phao', 'ao long vu', 'gile', 'blazer', 'vest', 'khan len', 'gang tay len']], ['Đồ bộ', ['do bo', 'bo do', 'bo ngu', 'do ngu', 'pijama', 'pyjama', 'set do', 'bo quan ao', 'bo the thao', 'bo mac nha', 'set bo']]],
  'me-be': [['Đồ bé gái', ['be gai']], ['Đồ bé trai', ['be trai']], ['Sơ sinh', ['so sinh', 'newborn', 'body chip', 'bodysuit']], ['Bỉm sữa', ['bim', 'ta dan', 'ta quan', 'sua ', 'sua', 'binh sua', 'bo ve sinh', 'ghe bo']], ['Xe đẩy', ['xe day', 'xe dap', 'xe tap di', 'goi di xe', 'dai dia', 'dai do', 'noi ', 'cui ']], ['Đồ chơi', ['do choi', 'xep hinh', 'bup be', 'lego', 'gau bong', 'thu bong', 'dat nan']]],
  'gia-dung': [['Nồi chảo', ['noi ', 'chao ', 'xoong']], ['Nồi chiên không dầu', ['noi chien', 'chien khong dau']], ['Ấm siêu tốc', ['am sieu toc', 'am dun', 'binh dun', 'am dien']], ['Quạt', ['quat']], ['Máy hút bụi', ['hut bui', 'lau nha', 'cay lau']], ['Kệ & hộp đựng', ['ke ', 'hop ', 'gia de', 'moc treo', 'moc dan', 'thung dung', 'tu nhua', 'gio ']], ['Túi rác & giấy', ['tui rac', 'giay ve sinh', 'khan giay', 'giay rut', 'giay lau']]],
  'xay-dung': [['Máy khoan', ['khoan']], ['Máy cắt', ['may cat', 'may cua', 'cua go', 'cua xich', 'may mai', 'luoi cat']], ['Thước laser', ['thuoc', 'laser', 'can bang']], ['Mũ bảo hộ', ['mu bao ho', 'non bao ho', 'mu cong trinh']], ['Găng tay', ['gang tay', 'bao tay']], ['Sơn & keo', ['son ', 'keo ', 'silicon', 'chong tham', 'bot tret']], ['Đèn & phụ kiện', ['den ', 'quat tran', 'o cam', 'cong tac', 'day dien', 'hit cua', 'chan cua', 'giu cua', 'hut chan', 'khan che', 'khau trang']]],
  'qua-tang': [['Hộp quà', ['hop qua', 'qua tang', 'set qua']], ['Hoa & thiệp', ['hoa ', 'thiep']], ['Ấm chén', ['am chen', 'bo am', 'tach tra', 'chen tra', 'bo tra']], ['Đèn thờ', ['den tho', 'ban tho', 'nhang', 'huong tram', 'lu huong']], ['Khung ảnh', ['khung anh', 'khung hinh']], ['Gấu bông', ['gau bong', 'thu bong', 'gau ']]],
};
// 20/10: anh Nhật đánh số đầu tên danh mục theo ngách: 1 Thời trang · 2 Mẹ & bé · 3 Gia dụng · 4 Xây dựng · 5 Quà tặng
const STORE_NUM = ['thoi-trang', 'me-be', 'gia-dung', 'xay-dung', 'qua-tang'];
const storeNiche = name => { const m = /^\s*([1-5])\s*[.)\-:]/.exec(String(name || '')); if (m) return STORE_NUM[m[1] - 1]; const f = fold(name); for (const [id, re] of STORE_NICHE) if (re.test(f)) return id; return ''; };
// tên ô chủ đề trên web = tên danh mục bỏ số thứ tự và chữ "HaoHao" ("1. HaoHao Thu Đông" → "Thu Đông")
const storeTopic = name => String(name || '').replace(/^\s*\d+\s*[.)\-:]\s*/, '').replace(/^haohao\s+/i, '').replace(/\s+/g, ' ').trim();
function storeCat(niche, name) {
  const t = ' ' + fold(name).replace(/[^a-z0-9]+/g, ' ') + ' ';
  let best = '', at = 1e9, len = 0;
  for (const [lab, kws] of STORE_CATS[niche] || []) for (const kw of kws) {
    const i = t.indexOf(' ' + kw.trim() + ' '); if (i < 0) continue;
    if (i < at || (i === at && kw.length > len)) { best = lab; at = i; len = kw.length; }
  }
  return best;
}
async function storeGql(op, query, extra) {
  const id = crypto.randomUUID();
  const variables = { urlSuffix: STORE_SUFFIX, affiliateMeta: { affiliateId: STORE_AFF }, cid: 'vn', language: 'vi', uuId: id, deviceId: id.replace(/-/g, '').toUpperCase(), ...extra };
  const r = await fetch('https://collshp.com/api/v3/gql/graphql', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/plain, */*', origin: 'https://collshp.com', referer: 'https://collshp.com/' + STORE_SUFFIX, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' }, body: JSON.stringify({ operationName: op, query, variables }) });
  if (!r.ok) throw new Error('collshp ' + r.status);
  const j = await r.json();
  if (j.errors && j.errors.length) throw new Error('collshp ' + String(j.errors[0].message || '').slice(0, 80));
  return j.data || {};
}
function storeItem(x, niche, group) {
  let c = x.itemCard || {}; if (typeof c === 'string') { try { c = JSON.parse(c); } catch { c = {}; } }
  const d = c.itemData || {}, a = c.itemCardDisplayedAsset || {}, pr = d.itemCardDisplayPrice || {};
  const price = Math.round(Number(pr.price || 0) / 1e5), oldp = Math.round(Number(pr.strikethroughPrice || pr.originalPrice || 0) / 1e5);
  const r = d.itemRating && Number(d.itemRating.ratingStar);
  const img = String(x.image || a.image || '');
  return {
    id: String(x.itemId || d.itemid || ''), shop: String(d.shopid || ''), n: String(x.linkName || a.name || '').slice(0, 200),
    price, old: oldp > price ? oldp : price, sold: Number((d.itemCardDisplaySoldCount || {}).historicalSoldCount || 0) || 0,
    soldTxt: String((a.soldCount || {}).text || ''), rating: r ? Math.round(r * 10) / 10 : 0,
    img: /^https:\/\//.test(img) ? img : '', imgs: (a.images || []).slice(0, 10).map(h => 'https://down-vn.img.susercontent.com/file/' + h),
    tiers: (d.tierVariations || []).slice(0, 2).map(v => ({ name: String(v.name || '').slice(0, 30), options: (v.options || []).slice(0, 24).map(o => String(o).slice(0, 40)), images: (v.images || []).slice(0, 24).map(h => h ? 'https://down-vn.img.susercontent.com/file/' + h : '') })).filter(v => v.options.length),
    shopName: String((d.shopData || {}).shopName || '').slice(0, 80), liked: Number(d.likedCount) || 0,
    rc: Array.isArray((d.itemRating || {}).ratingCount) ? d.itemRating.ratingCount.slice(0, 6).map(n => Number(n) || 0) : [],
    link: /^https:\/\//.test(String(x.link || '')) ? String(x.link) : '', soldOut: !!d.isSoldOut,
    niche, cat: storeTopic(group) || storeCat(niche, x.linkName || a.name), group,
  };
}
async function storeSync(env) {
  const gl = await storeGql('StorefrontGroupListQuery', STORE_QG, { page: { offset: '0', limit: '50' } });
  const groups = ((gl.storefrontGroupList || {}).groupList || []).map(g => ({ id: String(g.groupId), name: String(g.groupName || ''), niche: storeNiche(g.groupName), topic: storeTopic(g.groupName), total: Number(g.totalCount) || 0 }));
  if (!groups.length) throw new Error('collshp: không thấy danh mục');
  const items = [], seen = new Set();
  for (const g of groups) {
    g.n = 0; if (!g.niche) continue;   // danh mục ngoài 5 ngách → bỏ
    for (let off = 0; off < 500; off += 50) {
      const pl = (await storeGql('StorefrontGroupProductListQuery', STORE_QP, { groupId: g.id, keyword: '', page: { offset: String(off), limit: '50' } })).storefrontGroupProductList || {};
      for (const x of pl.itemList || []) {
        if (x.linkType && x.linkType !== 'ITEM') continue;
        const it = storeItem(x, g.niche, g.name);
        if (!it.id || !it.price || seen.has(g.id + ':' + it.id)) continue;   // 20/10: 1 món nằm ở nhiều danh mục thì hiện ở cả các danh mục đó
        seen.add(g.id + ':' + it.id); items.push(it); g.n++;
      }
      if (!(pl.pagination || {}).hasMore) break;
    }
  }
  const data = { ok: true, v: STORE_V, at: Date.now(), groups, items };
  await storeCachePut(data);   // 20/10: cất thêm 1 bản ở bộ nhớ đệm Cloudflare (không tính hạn mức D1)
  await setSt(env, 'store', data).catch(() => {});
  await save(env, items.filter(x => x.shop).map(x => ({ k: `sp:${x.shop}.${x.id}`, p: x.price, b: x.old > x.price ? x.old : 0 }))).catch(() => {});   // ghi luôn vào kho giá
  return data;
}
async function storeMaybe(env, force) {
  const st = await getSt(env, 'storeRun').catch(() => null);
  if (!force && st && Date.now() - (st.at || 0) < STORE_EVERY) return null;
  if (force && st && Date.now() - (st.at || 0) < 60000) return { ok: false, error: 'đợi 1 phút' };
  await setSt(env, 'storeRun', { at: Date.now() });
  try { const d = await storeSync(env); await setSt(env, 'storeRun', { at: Date.now(), n: d.items.length }); return { ok: true, n: d.items.length, groups: d.groups }; }
  catch (e) { const err = String(e && e.message || e).slice(0, 200); await setSt(env, 'storeRun', { at: Date.now(), err }); return { ok: false, error: err }; }
}
// 20/10: bản dự phòng ở bộ nhớ đệm Cloudflare – web Store vẫn chạy khi D1 bị khoá/lỗi
const STORE_CK = 'https://haohaostore.com/__store-cache-v' + STORE_V;
async function storeCachePut(d) { try { await caches.default.put(STORE_CK, new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=172800' } })); } catch {} }
async function storeCacheGet() { try { const r = await caches.default.match(STORE_CK); return r ? await r.json() : null; } catch { return null; } }
async function storeGet(env) {
  try {
    let d = await getSt(env, 'store');
    if (!d || d.v !== STORE_V) { await storeMaybe(env, true); d = await getSt(env, 'store') || d; }   // dữ liệu bản cũ → đọc lại ngay
    const run = await getSt(env, 'storeRun').catch(() => null);
    if (d && d.v === STORE_V) await storeCachePut(d);
    return d ? { ...d, run } : { ok: false, error: (run && run.err) || 'chưa có dữ liệu', items: [], groups: [] };
  } catch (e) {   // D1 lỗi → bản đệm, chưa có thì lấy thẳng collshp
    const c = await storeCacheGet(); if (c) return { ...c, from: 'cache' };
    try { const d = await storeSync(env); return { ...d, from: 'live' }; }
    catch (e2) { return { ok: false, error: String(e2 && e2.message || e2).slice(0, 200), items: [], groups: [] }; }
  }
}


// 🛒 20/10: Tiệm nhà Hao – khách bấm "Gửi đơn" trên web → máy chủ gửi đơn vào Zalo của chủ tiệm qua Zalo Bot.
// Mã bot nằm ở Cloudflare (Settings → Variables → secret ZALO_BOT), KHÔNG để trong code/GitHub.
const ZALO_CHAT = '61a19044f013194d4002';   // id Zalo của chủ tiệm (Phan Nhật) – lấy ngày 20/10
const zbot = (env, m, body) => fetch('https://bot-api.zaloplatforms.com/bot' + env.ZALO_BOT + '/' + m, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }).then(r => r.json()).catch(e => ({ ok: false, error: String(e) }));
async function donHang(env, b, req) {
  if (!env.ZALO_BOT) return { ok: false, error: 'Tiệm chưa bật nhận đơn' };
  const chat = ZALO_CHAT || env.ZALO_CHAT; if (!chat) return { ok: false, error: 'Tiệm chưa bật nhận đơn' };
  const t = v => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim();
  const ten = t(b && b.ten).slice(0, 60), sdt = t(b && b.sdt).replace(/[^\d+ .]/g, '').slice(0, 15), dc = t(b && b.dc).slice(0, 200), gc = t(b && b.gc).slice(0, 200);
  const mon = (Array.isArray(b && b.mon) ? b.mon : []).slice(0, 30).map(x => ({ ten: t(x.ten).slice(0, 80), q: Math.max(1, Math.min(99, Math.round(+x.q || 1))), gia: Math.max(0, Math.round(+x.gia || 0)) })).filter(x => x.ten);
  if (!ten || sdt.replace(/\D/g, '').length < 9 || !dc || !mon.length) return { ok: false, error: 'Thiếu tên, số điện thoại, địa chỉ hoặc món' };
  // chống spam: mỗi IP tối đa 5 đơn / giờ (đếm bằng bộ nhớ đệm, không dùng D1)
  const ip = req.headers.get('CF-Connecting-IP') || '', ck = 'https://haohaostore.com/__don/' + encodeURIComponent(ip) + '/' + Math.floor(Date.now() / 3600e3);
  const c = await caches.default.match(ck).then(r => r ? r.json() : 0).catch(() => 0); if (c >= 5) return { ok: false, error: 'Bạn gửi nhiều đơn quá, vui lòng nhắn Zalo tiệm' };
  await caches.default.put(ck, new Response(JSON.stringify(c + 1), { headers: { 'cache-control': 'max-age=3600' } })).catch(() => {});
  const vnd = n => n.toLocaleString('vi-VN') + 'đ', tot = mon.reduce((a, x) => a + x.gia * x.q, 0);
  const text = '🛒 ĐƠN MỚI – Tiệm nhà Hao\n' + mon.map(x => '• ' + x.ten + ' × ' + x.q + (x.gia ? ' = ' + vnd(x.gia * x.q) : '')).join('\n') + '\nTạm tính: ' + (tot ? vnd(tot) : 'chờ báo giá') + '\n\n👤 ' + ten + '\n📞 ' + sdt + '\n📍 ' + dc + (gc ? '\n📝 ' + gc : '') + '\n🕒 ' + new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  const r = await zbot(env, 'sendMessage', { chat_id: chat, text: text.slice(0, 1990) });
  return r && r.ok ? { ok: true } : { ok: false, error: 'Chưa gửi được đơn, vui lòng nhắn Zalo tiệm' };
}


// 🔎 20/10: SEO – dựng sẵn tiêu đề, mô tả, dữ liệu cấu trúc và nội dung HTML cho Google (trang chủ, 5 ngách, /sale, /san-pham/<id>).
// Khách vẫn thấy web như cũ: JavaScript của index.html vẽ đè lên phần dựng sẵn trong <main id="app">.
const SEO_NICHE = { 'thoi-trang': ['Thời trang', 'Áo quần nam nữ, công sở, thể thao, thu đông – giá thật từ Shopee & TikTok Shop'], 'me-be': ['Mẹ & Bé', 'Đồ bé gái, bé trai, đồ đi học, đồ chơi và đồ cho mẹ – HaoHao chọn kỹ, giá thật'], 'gia-dung': ['Nhà cửa & Gia dụng', 'Đồ bếp, đồ điện gia dụng, dọn dẹp, trang trí nhà – so giá, xem lịch sử giá'], 'xay-dung': ['Xây dựng', 'Dụng cụ xây dựng, điện nước, hoàn thiện nhà, đồ bảo hộ – giá tốt, shop uy tín'], 'qua-tang': ['Quà tặng & Gia đình', 'Quà sinh nhật, quà cho bố mẹ, cho bé, cho bạn bè – gợi ý quà theo dịp'] };
const hx = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vndS = n => Math.round(n).toLocaleString('vi-VN') + 'đ';
async function seoData(env) { let d = await storeCacheGet(); if (!d) { try { d = await storeGet(env); } catch { d = null; } } return d && d.items ? d : { items: [], groups: [] }; }
async function seoIndex(env, u) {
  const r = await fetch(SHOP_SRC + 'index.html', { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) return shopFile('index.html', 'html');
  let html = await r.text();
  const d = await seoData(env), B = 'https://haohaostore.com', path = u.pathname.replace(/\/+$/, '') || '/';
  let title = 'HaoHao Store – Mua sắm không lo hớ, giá thật Shopee & TikTok Shop', desc = 'HaoHao tuyển chọn sản phẩm Shopee & TikTok Shop theo 5 ngách: thời trang, mẹ & bé, gia dụng, xây dựng, quà tặng. Giá thật, lịch sử giá 30 ngày, soi sale ảo.', img = B + '/shop/logo.webp', ld = [], body = '';
  const card = x => '<li><a href="/san-pham/' + hx(x.id) + '">' + hx(x.n) + '</a> – ' + vndS(x.price) + (x.old > x.price ? ' (giảm ' + Math.round((1 - x.price / x.old) * 100) + '%)' : '') + '</li>';
  const m = path.match(/^\/san-pham\/(\d+)$/), n = path.match(/^\/(thoi-trang|me-be|gia-dung|xay-dung|qua-tang)$/);
  if (m) {
    const x = d.items.find(i => String(i.id) === m[1]);
    if (x) {
      const nn = SEO_NICHE[x.niche] || ['HaoHao', ''];
      title = x.n.slice(0, 70) + ' – giá ' + vndS(x.price) + ' | HaoHao Store';
      desc = x.n.slice(0, 90) + '. Giá ' + vndS(x.price) + (x.old > x.price ? ' (giảm ' + Math.round((1 - x.price / x.old) * 100) + '% từ ' + vndS(x.old) + ')' : '') + ', ' + (x.rating ? x.rating + '★, ' : '') + (x.soldTxt || '') + ' – shop ' + (x.shopName || '') + '. HaoHao kiểm tra giá thật trước khi mua.';
      img = (x.imgs && x.imgs[0]) || x.img || img;
      const prod = { '@context': 'https://schema.org', '@type': 'Product', name: x.n, image: (x.imgs || [x.img]).slice(0, 5), description: desc, sku: String(x.id), brand: { '@type': 'Brand', name: x.shopName || 'Shopee' }, offers: { '@type': 'Offer', url: B + path, priceCurrency: 'VND', price: x.price, availability: x.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', seller: { '@type': 'Organization', name: x.shopName || 'Shopee' } } };
      if (x.rating && x.rc && x.rc[0]) prod.aggregateRating = { '@type': 'AggregateRating', ratingValue: x.rating, reviewCount: x.rc[0] };
      ld.push(prod, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Trang chủ', item: B + '/' }, { '@type': 'ListItem', position: 2, name: nn[0], item: B + '/' + x.niche }, { '@type': 'ListItem', position: 3, name: x.n.slice(0, 60) }] });
      const rel = d.items.filter(i => i.niche === x.niche && i.id !== x.id).slice(0, 8);
      body = '<article class="seo"><nav><a href="/">Trang chủ</a> / <a href="/' + x.niche + '">' + hx(nn[0]) + '</a></nav><h1>' + hx(x.n) + '</h1><img src="' + hx(img) + '" alt="' + hx(x.n) + '" width="400" height="400"><p><b>Giá: ' + vndS(x.price) + '</b>' + (x.old > x.price ? ' <s>' + vndS(x.old) + '</s>' : '') + '</p><p>' + hx(desc) + '</p><p><a href="' + hx(x.link) + '" rel="nofollow sponsored">Xem trên Shopee</a></p>' + (rel.length ? '<h2>Sản phẩm cùng ngách</h2><ul>' + rel.map(card).join('') + '</ul>' : '') + '</article>';
    }
  } else if (n) {
    const nn = SEO_NICHE[n[1]], l = d.items.filter(i => i.niche === n[1]).sort((a, b) => (b.sold || 0) - (a.sold || 0));
    title = nn[0] + ' giá tốt – ' + l.length + ' món HaoHao chọn kỹ | HaoHao Store'; desc = nn[1] + '. ' + l.length + ' sản phẩm đã kiểm tra giá.';
    ld.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: nn[0], itemListElement: l.slice(0, 30).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: B + '/san-pham/' + x.id, name: x.n })) });
    body = '<section class="seo"><h1>' + hx(nn[0]) + ' – HaoHao Store</h1><p>' + hx(nn[1]) + '</p><ul>' + l.slice(0, 60).map(card).join('') + '</ul></section>';
  } else if (path === '/sale') {
    const l = d.items.filter(i => i.old > i.price).sort((a, b) => (1 - b.price / b.old) - (1 - a.price / a.old));
    title = 'Sale hôm nay – ' + l.length + ' món giảm giá thật | HaoHao Store'; desc = 'Sale cả 5 ngách: giảm trên 30%, đồng giá 99k, dưới 50k. HaoHao lọc sale thật, bỏ sale ảo.';
    body = '<section class="seo"><h1>Sale hôm nay</h1><ul>' + l.slice(0, 60).map(card).join('') + '</ul></section>';
  } else {
    ld.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'HaoHao Store', url: B + '/' }, { '@context': 'https://schema.org', '@type': 'Organization', name: 'HaoHao', url: B + '/', logo: B + '/shop/logo.webp', sameAs: ['https://www.tiktok.com/@haohaomall', 'https://www.facebook.com/trolyHaoHao'] });
    body = '<section class="seo"><h1>HaoHao Store – Có HaoHao, không lo chọn nhầm</h1><p>' + hx(desc) + '</p>' + Object.entries(SEO_NICHE).map(([k, v]) => '<h2><a href="/' + k + '">' + hx(v[0]) + '</a></h2><ul>' + d.items.filter(i => i.niche === k).slice(0, 8).map(card).join('') + '</ul>').join('') + '<p><a href="/tin-tuc/">Cẩm nang mua sắm</a> · <a href="/sale">Sale hôm nay</a> · <a href="/tiem-nha-hao">Tiệm nhà HaoHao</a></p></section>';
  }
  const head = '<title>' + hx(title) + '</title><meta name="description" content="' + hx(desc) + '"><link rel="canonical" href="' + B + (path === '/' ? '/' : path) + '"><meta property="og:type" content="' + (m ? 'product' : 'website') + '"><meta property="og:title" content="' + hx(title) + '"><meta property="og:description" content="' + hx(desc) + '"><meta property="og:image" content="' + hx(img) + '"><meta property="og:url" content="' + B + path + '"><meta property="og:site_name" content="HaoHao Store"><meta property="og:locale" content="vi_VN"><style>#app:has(>.seo){min-height:70vh}#app>.seo{opacity:0;pointer-events:none}#app:has(>.seo)::before{content:"Đang tải HaoHao Store…";display:block;text-align:center;padding-top:30vh;color:#7A5A44;font:14px sans-serif}.seo{max-width:900px;margin:24px auto;padding:0 16px;font-size:14px;line-height:1.6;color:#3A2414}.seo h1{font-size:22px;line-height:1.3}.seo h2{font-size:17px;margin:18px 0 6px}.seo ul{padding-left:18px;margin:0}.seo img{width:160px;height:auto;border-radius:12px}.seo a{color:#C25E0A}</style>' + ld.map(o => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>').join('');
  html = html.replace('<html>', '<html lang="vi">').replace('<title>HaoHao Store</title>', head).replace('<main id="app"></main>', '<main id="app">' + body + '</main>');
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
}
async function seoSitemap(env) {
  const r = await fetch(SHOP_SRC + 'sitemap.xml', { cf: { cacheTtl: 300, cacheEverything: true } });
  let x = r.ok ? await r.text() : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
  const d = await seoData(env), day = new Date().toISOString().slice(0, 10);
  const add = d.items.map(i => '<url><loc>https://haohaostore.com/san-pham/' + i.id + '</loc><lastmod>' + day + '</lastmod></url>').join('\n');
  x = x.replace('</urlset>', add + '\n</urlset>');
  return new Response(x, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}

// 🏬 19/10: web HaoHao Store phát tại /shop – trang lấy từ GitHub (haohao-shop-web/), sửa web chỉ cần đẩy GitHub, không phải Deploy
const SHOP_SRC = 'https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/haohao-shop-web/';
const SHOP_TYPE = { webmanifest: 'application/manifest+json; charset=utf-8', xml: 'application/xml; charset=utf-8', txt: 'text/plain; charset=utf-8', html: 'text/html; charset=utf-8', json: 'application/json; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', mp4: 'video/mp4', ico: 'image/x-icon' };
// 20/10: đường dẫn sạch của web Store (/thoi-trang, /thoi-trang/ao, /san-pham/123, /sale…) → trang index.html, web tự đọc đường dẫn
const SHOP_ROUTE = /^\/(?:(?:sale|quan-ly|thoi-trang|me-be|gia-dung|xay-dung|qua-tang)(?:\/[a-z0-9-]{1,60})?|san-pham\/\d{1,20})\/?$/;
async function shopPage(u) {
  let f = u.pathname.replace(/^\/shop\/?/, '') || 'index.html';
  if (SHOP_ROUTE.test('/' + f)) f = 'index.html';
  const ext = (f.match(/\.([a-z0-9]+)$/) || [])[1];
  if (!/^[a-z0-9][a-z0-9._-]{0,80}$/i.test(f) || !SHOP_TYPE[ext]) return new Response('Không có trang này', { status: 404 });
  const r = await fetch(SHOP_SRC + f, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) return new Response('Không tải được trang (' + r.status + ')', { status: 502 });
  return new Response(r.body, { headers: { 'content-type': SHOP_TYPE[ext], 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
}
// 📰 20/10: Tin tức (SEO) – trang HTML thật lấy từ GitHub haohao-shop-web/tin-tuc/ (tạo bằng tin-tuc/_tao.py), + sitemap.xml, robots.txt
async function shopFile(f, ext) {
  const r = await fetch(SHOP_SRC + f, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) return new Response('Không có trang này', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  return new Response(r.body, { headers: { 'content-type': SHOP_TYPE[ext], 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
}
const CAI_DAT_HTML = "<!doctype html>\n<html lang=\"vi\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Cài HaoHao – 4 bước, 1 phút</title>\n<meta name=\"description\" content=\"Hướng dẫn cài HaoHao – trợ lý mua sắm, nhắc việc, chặn quảng cáo ngay trên Chrome. Miễn phí.\">\n<style>\n:root{--o:#F2A71B;--o2:#EE4D2D;--n:#23305E;--m:#5B6478;--bg:#FFF8EC;--c:#fff;--b:#EADFCB}\n*{box-sizing:border-box}\nbody{margin:0;background:var(--bg);color:var(--n);font:16px/1.55 system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}\na{color:inherit}\n.w{max-width:880px;margin:0 auto;padding:0 16px}\nheader{padding:36px 0 18px;text-align:center}\n.logo{width:76px;height:76px}\nh1{font-size:30px;line-height:1.2;margin:10px 0 6px}\n.lead{color:var(--m);margin:0 auto;max-width:560px}\n.cta{display:inline-flex;align-items:center;gap:10px;margin:20px 0 6px;padding:14px 26px;border-radius:999px;background:var(--o2);color:#fff;font-weight:800;font-size:18px;text-decoration:none;box-shadow:0 8px 22px rgba(238,77,45,.3)}\n.cta:hover{filter:brightness(1.05)}\n.small{font-size:13px;color:var(--m)}\n.steps{display:grid;gap:16px;margin:26px 0}\n.st{display:grid;grid-template-columns:1fr 1.15fr;gap:18px;align-items:center;background:var(--c);border:1.5px solid var(--b);border-radius:18px;padding:18px}\n.n{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--o);color:#fff;font-weight:900;margin-right:8px}\n.st h2{font-size:19px;margin:0 0 6px;display:flex;align-items:center}\n.st p{margin:6px 0;color:var(--m)}\n.st svg{width:100%;height:auto;border-radius:12px;border:1px solid #E6E9F2;background:#F7F8FC}\ncode{background:#FFF1D6;border:1px solid #F5D78E;border-radius:6px;padding:1px 6px;font-size:14px}\n.cp{margin-left:6px;border:0;background:var(--n);color:#fff;border-radius:8px;padding:4px 10px;font:700 12.5px system-ui;cursor:pointer}\n.faq{background:var(--c);border:1.5px solid var(--b);border-radius:18px;padding:6px 18px;margin:0 0 26px}\n.faq details{border-bottom:1px solid #F0E7D6;padding:12px 0}.faq details:last-child{border:0}\n.faq summary{font-weight:800;cursor:pointer}\n.faq p{color:var(--m);margin:8px 0 2px}\nfooter{text-align:center;padding:10px 0 34px;font-size:13px;color:var(--m)}\n@media (max-width:680px){.st{grid-template-columns:1fr}h1{font-size:25px}}\n</style>\n</head>\n<body>\n<div class=\"w\">\n<header>\n  <svg class=\"logo\" viewBox=\"0 0 100 100\" aria-hidden=\"true\"><circle cx=\"28\" cy=\"24\" r=\"11\" fill=\"#D98E1F\"/><circle cx=\"72\" cy=\"24\" r=\"11\" fill=\"#D98E1F\"/><ellipse cx=\"50\" cy=\"56\" rx=\"42\" ry=\"38\" fill=\"#F2B544\"/><ellipse cx=\"50\" cy=\"66\" rx=\"26\" ry=\"22\" fill=\"#FFF3DC\"/><circle cx=\"37\" cy=\"50\" r=\"5.5\" fill=\"#23305E\"/><circle cx=\"63\" cy=\"50\" r=\"5.5\" fill=\"#23305E\"/><ellipse cx=\"50\" cy=\"59\" rx=\"3\" ry=\"2.2\" fill=\"#23305E\"/><path d=\"M45 63.5q5 4.5 10 0\" fill=\"none\" stroke=\"#23305E\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>\n  <h1>Cài HaoHao trong 1 phút</h1>\n  <p class=\"lead\">Trợ lý ngay trên Chrome: kiểm tra shop &amp; bắt sale ảo khi mua Shopee, nhắc việc, ghi chú, chặn quảng cáo YouTube. Miễn phí.</p>\n  <a class=\"cta\" id=\"dl\" href=\"https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/HaoHao-V1.zip\">⬇️ Tải HaoHao <span id=\"ver\"></span></a>\n  <div class=\"small\">Dùng được trên Chrome, Cốc Cốc, Edge (máy tính). Gói có chữ ký số, không thu thập mật khẩu.</div>\n</header>\n\n<section class=\"vid\"><video controls playsinline preload=\"metadata\" poster=\"\" style=\"width:100%;border-radius:18px;border:1.5px solid #EADFCB;background:#fff;display:block\"><source src=\"https://cdn.jsdelivr.net/gh/nhatphan79/nhatphan79@1da54ac5b9f8e9a13837f7f3c00a507af234ae5a/downloads/huong-dan-cai-haohao.mp4\" type=\"video/mp4\"></video><div class=\"small\" style=\"text-align:center;margin-top:6px\">▶️ Xem video 1 phút (có lồng tiếng) – làm theo đúng 4 bước bên dưới</div></section>\n<section class=\"steps\">\n  <div class=\"st\">\n    <div><h2><span class=\"n\">1</span>Giải nén file vừa tải</h2>\n      <p>Mở thư mục <b>Tải về (Downloads)</b>, chuột phải vào <b>HaoHao-V1.zip</b> → <b>Giải nén tất cả (Extract All)</b>. Bạn sẽ có thư mục <b>HaoHao-V1</b> chứa các file của HaoHao.</p>\n      <p>Để thư mục giải nén ở chỗ cố định (ví dụ <b>Tài liệu</b>), <b>không xoá</b> sau khi cài.</p></div>\n    <svg viewBox=\"0 0 320 180\" aria-hidden=\"true\"><rect x=\"16\" y=\"18\" width=\"288\" height=\"146\" rx=\"10\" fill=\"#fff\" stroke=\"#D9DEEA\"/><rect x=\"16\" y=\"18\" width=\"288\" height=\"26\" rx=\"10\" fill=\"#EEF1F8\"/><text x=\"30\" y=\"36\" font-size=\"12\" fill=\"#5B6478\">Downloads</text><rect x=\"36\" y=\"62\" width=\"34\" height=\"40\" rx=\"4\" fill=\"#F2B544\"/><text x=\"30\" y=\"118\" font-size=\"11\" fill=\"#23305E\">HaoHao-V1.zip</text><rect x=\"120\" y=\"70\" width=\"160\" height=\"78\" rx=\"8\" fill=\"#fff\" stroke=\"#C9D0E0\"/><text x=\"134\" y=\"92\" font-size=\"12\" fill=\"#5B6478\">Mở</text><rect x=\"126\" y=\"102\" width=\"148\" height=\"22\" rx=\"5\" fill=\"#FFE8C2\"/><text x=\"134\" y=\"117\" font-size=\"12\" font-weight=\"700\" fill=\"#23305E\">Giải nén tất cả…</text><text x=\"134\" y=\"140\" font-size=\"12\" fill=\"#5B6478\">Xoá</text><path d=\"M96 98l22 10\" stroke=\"#EE4D2D\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg>\n  </div>\n  <div class=\"st\">\n    <div><h2><span class=\"n\">2</span>Mở trang Tiện ích</h2>\n      <p>Mở tab mới, dán địa chỉ <code>chrome://extensions</code><button class=\"cp\" data-t=\"chrome://extensions\">Chép</button> rồi Enter.</p>\n      <p class=\"small\">Cốc Cốc: <code>coccoc://extensions</code> · Edge: <code>edge://extensions</code></p></div>\n    <svg viewBox=\"0 0 320 180\" aria-hidden=\"true\"><rect x=\"16\" y=\"18\" width=\"288\" height=\"146\" rx=\"10\" fill=\"#fff\" stroke=\"#D9DEEA\"/><rect x=\"16\" y=\"18\" width=\"288\" height=\"34\" rx=\"10\" fill=\"#EEF1F8\"/><rect x=\"30\" y=\"26\" width=\"220\" height=\"18\" rx=\"9\" fill=\"#fff\" stroke=\"#C9D0E0\"/><text x=\"40\" y=\"39\" font-size=\"12\" font-weight=\"700\" fill=\"#23305E\">chrome://extensions</text><text x=\"30\" y=\"84\" font-size=\"15\" font-weight=\"800\" fill=\"#23305E\">Tiện ích</text><rect x=\"30\" y=\"98\" width=\"120\" height=\"10\" rx=\"5\" fill=\"#E6E9F2\"/><rect x=\"30\" y=\"116\" width=\"170\" height=\"10\" rx=\"5\" fill=\"#E6E9F2\"/></svg>\n  </div>\n  <div class=\"st\">\n    <div><h2><span class=\"n\">3</span>Bật \"Chế độ dành cho nhà phát triển\"</h2>\n      <p>Góc <b>trên bên phải</b> trang Tiện ích có công tắc <b>Chế độ dành cho nhà phát triển (Developer mode)</b>. Bật lên.</p></div>\n    <svg viewBox=\"0 0 320 180\" aria-hidden=\"true\"><rect x=\"16\" y=\"18\" width=\"288\" height=\"146\" rx=\"10\" fill=\"#fff\" stroke=\"#D9DEEA\"/><text x=\"30\" y=\"46\" font-size=\"15\" font-weight=\"800\" fill=\"#23305E\">Tiện ích</text><text x=\"150\" y=\"47\" font-size=\"11\" fill=\"#5B6478\">Nhà phát triển</text><rect x=\"258\" y=\"34\" width=\"34\" height=\"18\" rx=\"9\" fill=\"#1A73E8\"/><circle cx=\"283\" cy=\"43\" r=\"7\" fill=\"#fff\"/><circle cx=\"275\" cy=\"43\" r=\"22\" fill=\"none\" stroke=\"#EE4D2D\" stroke-width=\"3\"/><rect x=\"30\" y=\"80\" width=\"250\" height=\"10\" rx=\"5\" fill=\"#E6E9F2\"/><rect x=\"30\" y=\"100\" width=\"200\" height=\"10\" rx=\"5\" fill=\"#E6E9F2\"/></svg>\n  </div>\n  <div class=\"st\">\n    <div><h2><span class=\"n\">4</span>Bấm \"Tải tiện ích đã giải nén\"</h2>\n      <p>Bấm nút <b>Tải tiện ích đã giải nén (Load unpacked)</b> → chọn thư mục <b>HaoHao-V1</b> (thư mục có file <code>manifest.json</code> bên trong) → <b>Chọn thư mục</b>.</p>\n      <p class=\"small\">Nếu thấy 2 thư mục HaoHao-V1 lồng nhau, chọn thư mục <b>bên trong</b>.</p>\n      <p>Chú hamster HaoHao hiện ở góc màn hình là xong! Bấm biểu tượng 🧩 trên thanh Chrome → <b>ghim 📌 HaoHao</b> cho tiện.</p></div>\n    <svg viewBox=\"0 0 320 180\" aria-hidden=\"true\"><rect x=\"16\" y=\"18\" width=\"288\" height=\"146\" rx=\"10\" fill=\"#fff\" stroke=\"#D9DEEA\"/><rect x=\"30\" y=\"34\" width=\"150\" height=\"26\" rx=\"6\" fill=\"#E8F0FE\" stroke=\"#1A73E8\"/><text x=\"40\" y=\"51\" font-size=\"12\" font-weight=\"700\" fill=\"#1A73E8\">Tải tiện ích đã giải nén</text><rect x=\"186\" y=\"34\" width=\"70\" height=\"26\" rx=\"6\" fill=\"#fff\" stroke=\"#C9D0E0\"/><rect x=\"30\" y=\"76\" width=\"250\" height=\"70\" rx=\"10\" fill=\"#FFF8EC\" stroke=\"#F5D78E\"/><circle cx=\"58\" cy=\"111\" r=\"18\" fill=\"#F2B544\"/><circle cx=\"52\" cy=\"107\" r=\"2.5\" fill=\"#23305E\"/><circle cx=\"64\" cy=\"107\" r=\"2.5\" fill=\"#23305E\"/><text x=\"86\" y=\"106\" font-size=\"13\" font-weight=\"800\" fill=\"#23305E\">HaoHao V1</text><text x=\"86\" y=\"124\" font-size=\"11\" fill=\"#5B6478\">Đã cài · đang bật</text><rect x=\"246\" y=\"102\" width=\"24\" height=\"14\" rx=\"7\" fill=\"#1A73E8\"/></svg>\n  </div>\n</section>\n\n<section class=\"faq\">\n  <details><summary>Chrome báo \"Tắt tiện ích ở chế độ nhà phát triển\"?</summary><p>Đó là lời nhắc chung của Chrome với tiện ích cài từ file. Bấm <b>✕ / Huỷ</b> để giữ HaoHao. HaoHao sẽ sớm có trên Chrome Web Store để cài 1 bấm.</p></details>\n  <details><summary>Có bản mới thì sao?</summary><p>HaoHao tự báo \"🎉 Có bản mới\". Bấm Tải về, giải nén rồi chép các file trong thư mục HaoHao-V1 mới đè vào thư mục cũ, rồi F5 trang (máy có app HaoHao Transfer thì bấm Cập nhật ngay là tự cài).</p></details>\n  <details><summary>HaoHao có an toàn không?</summary><p>Gói cài có chữ ký số của tác giả. HaoHao không đọc mật khẩu, không thu thập thông tin cá nhân; ghi chú, việc cần làm lưu ngay trên máy bạn. Link mua hàng là link tiếp thị – giá không đổi.</p></details>\n  <details><summary>Chuyển ảnh, video iPhone sang máy tính?</summary><p>Tải thêm app <a href=\"https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/HaoHao-Transfer-Windows.zip\">HaoHao Transfer (Windows)</a>, mở app rồi quét mã QR bằng iPhone.</p></details>\n  <details><summary>Cần hỗ trợ?</summary><p>Trong HaoHao mở <b>Tiện ích → 💬 Góp ý</b>, hoặc nhắn fanpage <a href=\"https://www.facebook.com/trolyHaoHao\">HaoHao</a>.</p></details>\n</section>\n<footer>© 2026 HaoHao – Phan Thanh Nhật</footer>\n</div>\n<script>\ndocument.querySelectorAll('.cp').forEach(b=>b.onclick=()=>{navigator.clipboard.writeText(b.dataset.t).then(()=>{b.textContent='Đã chép ✓';setTimeout(()=>b.textContent='Chép',1500)})});\nfetch('https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/haohao-latest.json').then(r=>r.json()).then(j=>{if(j.name)document.getElementById('ver').textContent=j.name}).catch(()=>{});\n</script>\n</body>\n</html>\n";   // 14/10: trang hướng dẫn cài – nguồn: server/cai-dat.html
export default {
  async scheduled(evt, env, ctx) { ctx.waitUntil(storeMaybe(env).catch(() => {})); ctx.waitUntil(feedSafe(env)); },
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(req.url);
    // 🌐 20/10: tên miền riêng haohaostore.com – www chuyển về tên chính, trang chủ = HaoHao Store
    if (u.hostname === 'www.haohaostore.com') return Response.redirect('https://haohaostore.com' + u.pathname + u.search, 301);
    if (u.hostname === 'haohaostore.com' && (u.pathname === '/' || SHOP_ROUTE.test(u.pathname))) {
      // 📱 20/10: điện thoại → giao diện app (/app). ?desktop=1 → giữ bản máy tính 30 ngày. Bỏ qua bot tìm kiếm.
      const ua = req.headers.get('user-agent') || '', ck = req.headers.get('cookie') || '';
      if (u.searchParams.get('desktop') === '1') { const r = await seoIndex(env, u); const h = new Headers(r.headers); h.append('set-cookie', 'hh_desk=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure'); h.set('cache-control', 'private, no-store'); return new Response(r.body, { headers: h }); }
      if (/Mobi|Android|iPhone|iPod/i.test(ua) && !/bot|crawl|spider|slurp|Lighthouse|facebookexternalhit|Zalo/i.test(ua) && !/(^|;\s*)hh_desk=1/.test(ck)) {
        const m = u.pathname.match(/^\/san-pham\/(\d+)/), n = u.pathname.match(/^\/(thoi-trang|me-be|gia-dung|xay-dung|qua-tang)(?:\/|$)/);
        const hash = m ? '#/sp/' + m[1] : n ? '#/danh-muc/' + n[1] : u.pathname.startsWith('/sale') ? '#/uu-dai' : '';
        return new Response(null, { status: 302, headers: { location: '/app' + hash, 'cache-control': 'private, no-store', vary: 'User-Agent' } });
      }
      return await seoIndex(env, u);
    }
    try {
      await init(env);
      if (u.pathname === '/p' && req.method === 'POST') {
        if (Number(req.headers.get('content-length') || 0) > 20000) return json({ error: 'too big' }, 413);
        return json(await put(env, await req.json().catch(() => null)));
      }
      if (u.pathname === '/anh' && req.method === 'POST') { if (Number(req.headers.get('content-length') || 0) > 8000) return json({ error: 'too big' }, 413); return json(await anh(env, await req.json().catch(() => null))); }
      if (u.pathname === '/cho' && req.method === 'GET') return json(await choList(env, String(u.searchParams.get('by') || '')));
      // 14/10: link ngắn – /tai (tải HaoHao bản mới nhất), /video (video hướng dẫn), /transfer (app chuyển ảnh)
      if (u.pathname === '/tai') return Response.redirect('https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/HaoHao-V1.zip', 302);
      if (u.pathname === '/video') return Response.redirect((CAI_DAT_HTML.match(/https:\/\/cdn\.jsdelivr\.net\/[^"]+\.mp4/) || [''])[0] || 'https://haohao-gia.nhatphan79.workers.dev/cai', 302);
      if (u.pathname === '/transfer') return Response.redirect('https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/HaoHao-Transfer-Windows.zip', 302);
      if (u.pathname === '/cai-dat' || u.pathname === '/cai') return new Response(CAI_DAT_HTML, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=600' } });
      if (u.pathname === '/gopy' && req.method === 'POST') { if (Number(req.headers.get('content-length') || 0) > 6000) return json({ error: 'too big' }, 413); return json(await gopy(env, await req.json().catch(() => null), await ipHash(req))); }
      if (u.pathname === '/cho' && req.method === 'POST') { const b = await req.json().catch(() => null), ipx = await ipHash(req); return json(b && b.del ? await choDel(env, b) : b && b.vote ? await choVote(env, b, ipx) : await choAdd(env, b, ipx)); }
      if (u.pathname === '/hot' && u.searchParams.get('q')) {   // 🔎 tìm mã theo từ khoá (vd "thời trang", "sữa")
        const f = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
        const words = f(u.searchParams.get('q')).split(/\s+/).filter(w => w.length > 1).slice(0, 5), all = (await getSt(env, 'hotall')) || [], now = Date.now();
        // nhóm hàng → các chữ hay có trong tên shop (tên mã AccessTrade chỉ có tên shop + mức giảm)
        const GROUPS = { 'thoi trang': ['thoi trang', 'fashion', 'clothing', 'local brand', ' ao ', ' quan ', ' vay ', ' dam ', 'giay', ' dep ', ' tui ', 'balo', 'hoodie', 'jean', 'routine', 'yody', 'coolmate', 'canifa', 'owen', 'aristino', 'biti', 'juno', 'vascara', 'adidas', 'nike', 'puma', 'mlb', 'uniqlo'],
          'me be': ['me va be', 'baby', 'kids', ' kid ', 'tre em', ' be ', ' sua ', ' bim ', ' ta ', 'huggies', 'bobby', 'merries', 'pampers', 'moony', 'abbott', ' nan ', 'enfa', 'vinamilk', 'friso', 'aptamil', 'pigeon', 'mamamy', 'kodomo'],
          'gia dung': ['gia dung', 'home', 'house', 'nha cua', ' bep ', 'kitchen', ' noi ', ' chao ', 'lock&lock', 'locknlock', 'sunhouse', 'philips', 'panasonic', 'electrolux', 'xiaomi', 'tefal', 'elmich', 'kangaroo', 'sharp', 'toshiba', 'dreame', 'ecovacs', 'roborock', 'wmf', 'bear'],
          'my pham': ['my pham', 'beauty', 'cosmetic', 'skin', 'makeup', ' son ', 'loreal', "l'oreal", 'cocoon', 'la roche', 'maybelline', 'innisfree', 'cerave', 'simple', 'garnier', 'judydoll', 'moody', 'some by mi', 'bioderma', 'vichy', 'hada labo', 'senka', 'anessa'],
          'dien thoai': ['dien thoai', 'phone', 'mobile', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'apple', 'tai nghe', ' sac ', 'anker', 'baseus', 'ugreen', 'jbl', 'sony'] };
        const alias = { 'quan ao': 'thoi trang', 'mevabe': 'me be', 'me va be': 'me be', 'tre em': 'me be', 'do gia dung': 'gia dung', 'nha bep': 'gia dung', 'lam dep': 'my pham', 'cong nghe': 'dien thoai' };
        const qf = f(u.searchParams.get('q')).trim(), grp = GROUPS[alias[qf] || qf];
        const hit = x => { const t = ' ' + f(x.title) + ' '; return grp ? grp.some(w => t.includes(w)) : words.every(w => t.includes(w)); };
        const items = words.length ? all.filter(x => Date.parse(x.expires) > now && hit(x)).slice(0, 20) : [];
        return json({ ok: true, q: u.searchParams.get('q'), items: items.map(({ brand, ...x }) => x) });
      }
      if (u.pathname === '/hot') { if (u.searchParams.get('run') && !isAdmin(env, u)) return json({ ok: false, error: 'cần mật khẩu' }, 403); if (u.searchParams.get('run')) return json(await hotRun(env, u.searchParams.get('run') === 'raw' ? 'raw' : true)); const h = await getSt(env, 'hot'); return json({ ok: true, at: h ? h.at : 0, items: h ? h.items : [] }, 200, { 'cache-control': 'max-age=600' }); }
      if (u.pathname === '/shop' || u.pathname.startsWith('/shop/')) return await shopPage(u);
      if (u.pathname === '/tin-tuc') return Response.redirect(u.origin + '/tin-tuc/', 301);
      if (u.pathname.startsWith('/tin-tuc/')) { const g = u.pathname.slice(9).replace(/\/$/, ''); if (g && !/^[a-z0-9][a-z0-9-]{0,100}$/.test(g)) return new Response('Không có trang này', { status: 404 }); return await shopFile('tin-tuc/' + (g ? g + '.html' : 'index.html'), 'html'); }
      if (u.pathname === '/tiem-nha-hao' || u.pathname === '/tiem-nha-hao/') return await shopFile('tiem-nha-hao.html', 'html');
      if (u.pathname === '/app' || u.pathname === '/app/') { const r = await shopFile('app.html', 'html'); if (!/hh_desk=1/.test(req.headers.get('cookie') || '')) return r; const h = new Headers(r.headers); h.append('set-cookie', 'hh_desk=; Path=/; Max-Age=0; SameSite=Lax; Secure'); return new Response(r.body, { headers: h }); }   // 📱 20/10: app điện thoại (vào /app là bỏ chế độ máy tính)   // 📱 20/10: giao diện app điện thoại (8 màn theo canvas)
      if (u.pathname === '/sw.js') return await shopFile('sw.js', 'js');
      if (u.pathname === '/manifest.webmanifest') return await shopFile('manifest.webmanifest', 'webmanifest');   // 🏠 20/10: Tiệm nhà Hao
      if (u.pathname === '/sitemap.xml') return await seoSitemap(env);
      if (u.pathname === '/robots.txt') return await shopFile('robots.txt', 'txt');
      if (u.pathname === '/don' && req.method === 'POST') { if (Number(req.headers.get('content-length') || 0) > 8000) return json({ ok: false, error: 'too big' }, 413); return json(await donHang(env, await req.json().catch(() => null), req)); }
      if (u.pathname === '/store') {   // 🏬 19/10: sản phẩm HaoHao Store cho web (đọc từ collshp, 6 giờ/lần)
        if (u.searchParams.get('run')) { if (!isAdmin(env, u)) return json({ ok: false, error: 'cần mật khẩu' }, 403); return json(await storeMaybe(env, true)); }
        return json(await storeGet(env), 200, { 'cache-control': 'public, max-age=300' });
      }
      if (u.pathname === '/tt') return await ttSearch(env, u.searchParams.get('q'), ctx);
      if (u.pathname === '/search') return json(await spySearch(env, u), 200, { 'cache-control': 'public, max-age=300' });
      if (u.pathname === '/k' && req.method === 'POST') return json(await kw(env, await req.json().catch(() => null)));
      if (u.pathname === '/ping' && req.method === 'POST') return json(await ping(env, await req.json().catch(() => null)));
      if (u.pathname === '/bye') return req.method === 'POST' ? json(await byeWhy(env, await req.json().catch(() => null))) : await bye(env, u);
      if (u.pathname === '/thongke') return await stats(env, u);
      if (u.pathname === '/nap') {   // chạy tự nạp ngay (tối đa 1 lần / 2 phút)
        if (!isAdmin(env, u)) return json({ ok: false, error: 'cần mật khẩu' }, 403);   // 13/10: chỉ chủ app (?key=STATS_KEY); lịch tự nạp vẫn chạy
        const f = await getSt(env, 'feed2'); if (f && f.at && Date.now() - f.at < 120000) return json({ ok: false, error: 'đợi 2 phút', feed: f });
        return json(await feedSafe(env, true));
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
