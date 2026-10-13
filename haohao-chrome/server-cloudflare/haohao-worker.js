// HaoHao – máy chủ soi sản phẩm (Cloudflare Worker)
// Giữ khoá ở Secret của Cloudflare, KHÔNG để trong tiện ích.
//   Secret:   AT_KEY   = khoá API AccessTrade (tài khoản phụ – chỉ lấy danh sách sản phẩm Shopee)
//             RH_KEY   = khoá API RioHub (chỉ tìm sản phẩm TikTok Shop)
//             APP_TOKEN (tuỳ chọn) = mật khẩu riêng, HaoHao gửi kèm để người lạ không xài ké
//   Biến:     RH_CREATOR = nhanhimdaily   (kênh TikTok phụ đã kết nối RioHub)
//   KV:       HAOHAO_KV  (lưu kho Shopee tải về mỗi ngày)
//   Cron:     */10 * * * *  (mỗi 10 phút tải tiếp một phần kho Shopee; cả kho ~65 trang, xong trong ~30 phút, mỗi ngày làm lại)
//
// API cho HaoHao:
//   GET /search?q=tai%20nghe&src=all|shopee|tiktok&page=1        → { items:[…], tiktokNext }
//   GET /search?q=…&src=tiktok&cursor=<tiktokNext>                → trang TikTok tiếp theo
//   GET /status                                                   → tình trạng kho Shopee
// Mỗi món: { src, id, title, image, price, oldPrice, discount, rate, commission, sold, rating, shop, url }
//   url = link GỐC của sàn (HaoHao tự gắn mã tiếp thị của anh Nhật: Shopee an_17393130606 / TikTok @haohaomall).

const AT = 'https://api.accesstrade.vn/v1';
const RH = ['https://riohub.vn/api/v1', 'https://riohub.riokupon.com/api/v1', 'https://riohub.riokupon.me/api/v1'];
const PAGE_SIZE = 200, PAGES_PER_CHUNK = 10, CHUNKS_PER_RUN = 3;   // 1 lần cron ≤ 30 lượt gọi (gói miễn phí giới hạn 50)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,x-haohao-token', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
const json = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...cors, ...extra } });
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const num = v => { const n = Number(String(v ?? '').replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; };

// ---------- Shopee: kho AccessTrade (không tìm theo từ khoá được → tải hết, tự lọc) ----------
function slimShopee(p) {
  // AccessTrade: price = giá gốc; discount = giá sau giảm (nếu là số tiền) – phòng khi trường đổi nghĩa thì lấy số nhỏ hơn hợp lệ
  const pr = num(p.price), dc = num(p.discount), old = Math.max(pr, dc > 1000 ? dc : 0);
  const price = dc > 1000 && pr > 1000 ? Math.min(pr, dc) : (pr || dc);
  return { src: 'shopee', id: String(p.product_id || p.sku || ''), title: p.name || '', image: p.image || '', price, oldPrice: old > price ? old : 0,
    discount: num(p.discount_rate) || (old > price ? Math.round((1 - price / old) * 100) : 0), shop: p.shop_name || '', cate: p.cate || '', url: p.url || '' };
}
async function atPage(env, page) {
  const r = await fetch(`${AT}/datafeeds?domain=shopee.vn&limit=${PAGE_SIZE}&page=${page}`, { headers: { Authorization: 'Token ' + env.AT_KEY } });
  if (!r.ok) throw new Error('AccessTrade ' + r.status);
  const j = await r.json(); return { items: (j.data || []).map(slimShopee).filter(x => x.url && x.title), total: j.total || 0 };
}
// mỗi lần cron tải tiếp CHUNKS_PER_RUN phần; tải đủ thì đánh dấu xong, hôm sau làm lại
async function syncShopee(env) {
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  let st = (await env.HAOHAO_KV.get('sp:state', 'json')) || {};
  if (st.day !== today || !st.building) { if (st.day === today && st.done) return st; st = { day: today, building: true, nextChunk: 0, total: st.total || 0, chunks: st.chunks || 0, done: false, ver: (st.ver || 0) + 1 }; }
  for (let n = 0; n < CHUNKS_PER_RUN; n++) {
    const c = st.nextChunk, items = [];
    for (let i = 0; i < PAGES_PER_CHUNK; i++) {
      const page = c * PAGES_PER_CHUNK + i + 1;
      const { items: got, total } = await atPage(env, page);
      if (total) st.total = total;
      items.push(...got);
      if (got.length < PAGE_SIZE) { st.lastPage = page; break; }
    }
    if (items.length) await env.HAOHAO_KV.put(`sp:v${st.ver}:c${c}`, JSON.stringify(items));
    st.nextChunk = c + 1;
    if (items.length < PAGE_SIZE * PAGES_PER_CHUNK) { st.done = true; st.building = false; st.chunks = st.nextChunk; st.at = Date.now(); st.liveVer = st.ver; break; }
  }
  await env.HAOHAO_KV.put('sp:state', JSON.stringify(st));
  return st;
}
let SP = { ver: 0, items: [], at: 0 };   // nhớ tạm trong máy chủ ~10 phút
async function shopeeItems(env) {
  const st = (await env.HAOHAO_KV.get('sp:state', 'json')) || {};
  const ver = st.liveVer || (st.done ? st.ver : 0); if (!ver) return [];
  if (SP.ver === ver && Date.now() - SP.at < 600e3) return SP.items;
  const parts = await Promise.all(Array.from({ length: st.chunks || 0 }, (_, c) => env.HAOHAO_KV.get(`sp:v${ver}:c${c}`, 'json')));
  SP = { ver, items: parts.flat().filter(Boolean).map(x => ({ ...x, _f: fold(x.title + ' ' + x.shop + ' ' + x.cate) })), at: Date.now() };
  return SP.items;
}
async function searchShopee(env, q, page, size) {
  const words = fold(q).split(/\s+/).filter(Boolean); if (!words.length) return { items: [], total: 0 };
  const hit = (await shopeeItems(env)).filter(x => words.every(w => x._f.includes(w)));
  hit.sort((a, b) => (b.discount || 0) - (a.discount || 0));
  return { items: hit.slice((page - 1) * size, page * size).map(({ _f, ...x }) => x), total: hit.length };
}

// ---------- TikTok: RioHub tìm theo từ khoá (qua kênh phụ) ----------
async function searchTikTok(env, q, cursor, size) {
  const qs = new URLSearchParams({ creator_username: env.RH_CREATOR || 'nhanhimdaily', keyword: q, page_size: String(Math.min(size, 50)) });
  if (cursor) qs.set('page_token', cursor);
  let last;
  for (const base of RH) {   // tên miền dự phòng khi lỗi mạng
    try {
      const r = await fetch(`${base}/partner/tiktok/affiliate/products/search?${qs}`, { headers: { 'X-Riohub-Api-Key': env.RH_KEY } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { items: [], error: (j.error && j.error.message) || 'RioHub ' + r.status };
      const items = (j.products || []).map(p => {
        const price = num(p.sales_price && p.sales_price.minimum_amount) || num(p.price && (p.price.floor_price || p.price.amount));
        const oc = p.observed_commission || {}, rate = (oc.commission_rate || (p.commission && p.commission.rate) || 0) / 100;
        return { src: 'tiktok', id: String(p.id), title: p.title || '', image: p.main_image_url || '', price, oldPrice: 0, discount: 0,
          rate, commission: num(p.commission && p.commission.amount) || Math.round(price * rate / 100),
          sold: (p.market_performance && p.market_performance.historical_sold_quantity) || 0,
          rating: num(p.review && p.review.overall_score), reviews: (p.review && p.review.count) || 0,
          shop: (p.shop && p.shop.name) || p.seller_name || '', url: `https://www.tiktok.com/view/product/${p.id}` };
      });
      return { items, next: j.next_page_token || '' };
    } catch (e) { last = e; }
  }
  return { items: [], error: 'RioHub: ' + (last && last.message) };
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const u = new URL(req.url);
    const tok = req.headers.get('x-haohao-token') || u.searchParams.get('token');   // trình duyệt: ?token=… ; HaoHao: header
    if (env.APP_TOKEN && tok !== env.APP_TOKEN && u.pathname !== '/') return json({ error: 'unauthorized' }, 401);
    if (u.pathname === '/status') {
      const st = (await env.HAOHAO_KV.get('sp:state', 'json')) || {};
      if (u.searchParams.get('sync') === '1') ctx.waitUntil(syncShopee(env));
      return json({ shopee: st, tiktokCreator: env.RH_CREATOR || 'nhanhimdaily' });
    }
    if (u.pathname === '/search') {
      const q = (u.searchParams.get('q') || '').trim().slice(0, 100), src = u.searchParams.get('src') || 'all';
      const page = Math.max(1, +u.searchParams.get('page') || 1), size = Math.min(50, Math.max(1, +u.searchParams.get('size') || 20));
      if (!q) return json({ error: 'missing q' }, 400);
      const [sp, tt] = await Promise.all([
        src === 'tiktok' ? null : searchShopee(env, q, page, size).catch(e => ({ items: [], error: e.message })),
        src === 'shopee' ? null : searchTikTok(env, q, u.searchParams.get('cursor') || '', size).catch(e => ({ items: [], error: e.message })),
      ]);
      return json({ q, shopee: sp, tiktok: tt }, 200, { 'cache-control': 'public, max-age=300' });
    }
    return json({ ok: true, name: 'HaoHao product API', endpoints: ['/search?q=', '/status'] });
  },
  async scheduled(evt, env, ctx) { ctx.waitUntil(syncShopee(env)); },
};
