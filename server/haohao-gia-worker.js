// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật. Mọi quyền được bảo lưu.
// HaoHao – MÁY CHỦ KHO GIÁ (Cloudflare Worker + D1)
// Mọi máy cài HaoHao gửi về: mã sản phẩm + giá (KHÔNG gửi thông tin cá nhân). Kho chung giúp khách mới mở món là thấy lịch sử giá.
//   Binding D1:  DB   (bảng tự tạo ở lần chạy đầu)
// API:
//   POST /p   { items: [{ k: 'sp:<shopid>.<itemid>' | 'tt:<productid>', p: giá, b: giá gạch (tuỳ chọn) }] }   (tối đa 60 món/lần)
//   GET  /h?k=sp:1.2,tt:3                → { items: { 'sp:1.2': [[ngày, giá, giáGạch], …] } }   (tối đa 20 món)
//   GET  /                               → tình trạng
// "ngày" = số ngày tính từ 1/1/1970 theo giờ Việt Nam. Mỗi món mỗi ngày 1 mốc (giữ giá thấp nhất trong ngày), giữ 120 ngày.

const KEEP_DAYS = 120, MAX_IN = 60, MAX_OUT = 20;
const KEY = /^(sp:\d{3,12}\.\d{3,16}|tt:\d{8,22})$/;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...cors, ...extra } });
const today = () => Math.floor((Date.now() + 7 * 3600e3) / 864e5);
let ready = false;
async function init(env) {
  if (ready) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS gia (k TEXT PRIMARY KEY, pts TEXT NOT NULL, at INTEGER NOT NULL)').run();
  ready = true;
}
const okPrice = n => Number.isInteger(n) && n >= 1000 && n <= 2e9;

async function put(env, body) {
  const list = Array.isArray(body && body.items) ? body.items.slice(0, MAX_IN) : [];
  const want = new Map();
  for (const x of list) {
    const k = String(x && x.k || ''), p = Math.round(Number(x && x.p)), b = Math.round(Number(x && x.b) || 0);
    if (!KEY.test(k) || !okPrice(p)) continue;
    const o = want.get(k); if (!o || p < o.p) want.set(k, { p, b: b > p && b <= p * 20 ? b : 0 });
  }
  if (!want.size) return { ok: true, saved: 0 };
  const keys = [...want.keys()], d = today();
  const { results = [] } = await env.DB.prepare(`SELECT k, pts FROM gia WHERE k IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
  const old = new Map(results.map(r => [r.k, r.pts]));
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
  if (stmts.length) await env.DB.batch(stmts);
  return { ok: true, saved: stmts.length };
}

async function get(env, ks) {
  const keys = [...new Set(String(ks || '').split(',').map(s => s.trim()).filter(k => KEY.test(k)))].slice(0, MAX_OUT);
  if (!keys.length) return { items: {} };
  const { results = [] } = await env.DB.prepare(`SELECT k, pts FROM gia WHERE k IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
  const items = {}; for (const r of results) { try { items[r.k] = JSON.parse(r.pts); } catch {} }
  return { items, day: today() };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(req.url);
    try {
      await init(env);
      if (u.pathname === '/p' && req.method === 'POST') {
        if (Number(req.headers.get('content-length') || 0) > 20000) return json({ error: 'too big' }, 413);
        return json(await put(env, await req.json().catch(() => null)));
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
