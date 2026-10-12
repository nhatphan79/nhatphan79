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

// chạy an toàn: ghi lại lỗi để trang thống kê hiện ra
async function feedSafe(env) {
  try { const r = await feedRun(env); if (!r.ok) await setSt(env, 'feedErr', { e: r.error, at: Date.now() }).catch(() => {}); return r; }
  catch (e) { await setSt(env, 'feedErr', { e: String(e && e.message || e).slice(0, 200), at: Date.now() }).catch(() => {}); return { ok: false, error: String(e) }; }
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
  const n = x => (x && x.n || 0).toLocaleString('vi-VN'), feed = await getSt(env, 'feed').catch(() => null), fe = await getSt(env, 'feedErr').catch(() => null);
  const tile = (v, l) => `<div><div class="n">${v}</div><div class="l">${l}</div></div>`;
  return page('HaoHao – Thống kê', `<h1>🐹 HaoHao – Thống kê</h1><p>Mỗi máy chỉ tính 1 lần (mã ngẫu nhiên, không thông tin cá nhân).</p>
<div class="box g">${tile(n(d1), 'Dùng hôm nay')}${tile(n(d7), 'Dùng 7 ngày')}${tile(n(d30), 'Dùng 30 ngày')}</div>
<div class="box g">${tile(n(all), 'Tổng máy đã cài')}${tile(n(nw7), 'Cài mới 7 ngày')}${tile(n(gAll), 'Đã gỡ (7 ngày: ' + n(g7) + ')')}</div>
<div class="box"><b>Phiên bản đang chạy (30 ngày)</b><table>${vers.map(r => `<tr><td>${esc(r.v)}</td><td>${n(r)}</td></tr>`).join('') || '<tr><td>Chưa có</td><td></td></tr>'}</table></div>
<div class="box"><b>Lý do gỡ</b><table>${whys.map(r => `<tr><td>${esc(r.why)}</td><td>${n(r)}</td></tr>`).join('') || '<tr><td>Chưa có</td><td></td></tr>'}</table></div>
<p>Kho giá: ${n(gia)} món.${feed ? ` Tự nạp hôm nay: ${feed.done ? 'xong' : 'trang ' + feed.page} · ${(feed.n || 0).toLocaleString('vi-VN')} lượt ghi${feed.err ? ' · lỗi ' + esc(feed.err) : ''}.` : ''}${fe && (!feed || fe.at > (feed.at || 0)) ? ` ⚠️ Tự nạp lỗi: ${esc(fe.e)}` : ''}</p>`);
}

export default {
  async scheduled(evt, env, ctx) { ctx.waitUntil(feedSafe(env)); },
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(req.url);
    try {
      await init(env);
      if (u.pathname === '/p' && req.method === 'POST') {
        if (Number(req.headers.get('content-length') || 0) > 20000) return json({ error: 'too big' }, 413);
        return json(await put(env, await req.json().catch(() => null)));
      }
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
