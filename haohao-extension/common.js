// Dùng chung cho background và trang cài đặt
const HT = {
  fmt(p) {
    if (p == null || isNaN(p)) return '?';
    p = Number(p);
    if (p === 0) return '0';
    if (Math.abs(p) < 0.01) return p.toPrecision(4);
    return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  },
  opLabel: { above: 'giá ≥', below: 'giá ≤', up: 'tăng ≥', down: 'giảm ≥' },
  describe(r) {
    if (r.type === 'keyword') {
      const w = (r.words || []).join(', ');
      return (r.mode === 'all' ? 'Trang có đủ các từ: ' : 'Trang có một trong các từ: ') + w +
        (r.sites ? ` (chỉ trên ${r.sites})` : '');
    }
    if (r.type === 'price') {
      const pct = r.op === 'up' || r.op === 'down';
      const coin = r.source === 'dexscreener' ? (r.coin || '').slice(0, 6) + '…' : r.coin;
      return `${coin} ${HT.opLabel[r.op] || ''} ${pct ? r.value + '% trong 24h' : '$' + HT.fmt(r.value)}`;
    }
    if (r.type === 'reminder') {
      if (r.kind === 'daily') return `${HT.daysLabel(r.days)} lúc ${HT.timesOf(r).join(', ')}`;
      if (r.kind === 'lunar') return `Âm lịch: ${(r.lunarDays || []).map(HT.lunar ? d => HT.lunar.dayName(d) : String).join(', ')} lúc ${HT.timesOf(r).join(', ')}` + (r.prep && r.prep.on ? `, nhắc trước 1 ngày lúc ${r.prep.time}` : '');
      if (r.kind === 'interval') return `Cứ ${r.minutes} phút một lần` + (r.from && r.to ? `, từ ${r.from} đến ${r.to}` : '');
      if (r.kind === 'once') return `Một lần, lúc ${r.datetime ? new Date(r.datetime).toLocaleString('vi-VN') : '?'}`;
    }
    return '';
  },
  timesOf(r) { return (r.times && r.times.length) ? r.times : (r.time ? [r.time] : []); },
  DAY_NAMES: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  daysLabel(days) {
    if (!days || !days.length || days.length === 7) return 'Mỗi ngày';
    const d = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    if (d.join() === '1,2,3,4,5') return 'Thứ 2 đến thứ 6';
    if (d.join() === '6,0') return 'Cuối tuần';
    return d.map(x => HT.DAY_NAMES[x]).join(', ');
  },
  inWindow(from, to, now = new Date()) {
    if (!from || !to) return true;
    const m = now.getHours() * 60 + now.getMinutes();
    const [fh, fm] = from.split(':').map(Number), [th, tm] = to.split(':').map(Number);
    const a = fh * 60 + fm, b = th * 60 + tm;
    return a <= b ? (m >= a && m <= b) : (m >= a || m <= b);
  },
  async cgQuotes(ids) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('CoinGecko trả lỗi ' + res.status);
    const j = await res.json();
    const out = {};
    for (const id of ids) if (j[id]) out[id] = { price: j[id].usd, change: j[id].usd_24h_change || 0, label: id };
    return out;
  },
  async dxQuote(addr) {
    const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + encodeURIComponent(addr));
    if (!res.ok) throw new Error('DexScreener trả lỗi ' + res.status);
    const j = await res.json();
    const p = (j.pairs || []).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    if (!p) throw new Error('Không tìm thấy token với địa chỉ này');
    return { price: Number(p.priceUsd), change: Number(p.priceChange?.h24 || 0), label: p.baseToken?.symbol || addr.slice(0, 6) };
  },
  async quote(r) {
    const coin = (r.coin || '').trim();
    if (r.source === 'dexscreener') return HT.dxQuote(coin);
    const q = await HT.cgQuotes([coin.toLowerCase()]);
    if (!q[coin.toLowerCase()]) throw new Error('Không có mã "' + coin + '" trên CoinGecko');
    return q[coin.toLowerCase()];
  },
  met(r, q) {
    const v = Number(r.value);
    if (r.op === 'above') return q.price >= v;
    if (r.op === 'below') return q.price <= v;
    if (r.op === 'up') return q.change >= v;
    if (r.op === 'down') return q.change <= -Math.abs(v);
    return false;
  }
};

// ---------- Âm lịch Việt Nam (thuật toán Hồ Ngọc Đức, múi giờ +7) ----------
HT.lunar = (() => {
  const PI = Math.PI, TZ = 7, INT = Math.floor;
  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function newMoon(k) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
                           : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Jd1 + C1 - deltat;
  }
  const getNewMoonDay = k => INT(newMoon(k) + 0.5 + TZ / 24);
  function sunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    return L - PI * 2 * INT(L / (PI * 2));
  }
  const getSunLongitude = d => INT(sunLongitude(d - 0.5 - TZ / 24) / PI * 6);
  function getLunarMonth11(yy) {
    const k = INT((jdFromDate(31, 12, yy) - 2415021) / 29.530588853);
    let nm = getNewMoonDay(k);
    if (getSunLongitude(nm) >= 9) nm = getNewMoonDay(k - 1);
    return nm;
  }
  function getLeapMonthOffset(a11) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1, arc = getSunLongitude(getNewMoonDay(k + i));
    do { last = arc; i++; arc = getSunLongitude(getNewMoonDay(k + i)); } while (arc !== last && i < 14);
    return i - 1;
  }
  function solar2lunar(dd, mm, yy) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k);
    let a11 = getLunarMonth11(yy), b11 = a11, year;
    if (a11 >= monthStart) { year = yy; a11 = getLunarMonth11(yy - 1); } else { year = yy + 1; b11 = getLunarMonth11(yy + 1); }
    const day = dayNumber - monthStart + 1, diff = INT((monthStart - a11) / 29);
    let leap = 0, month = diff + 11;
    if (b11 - a11 > 365) {
      const leapDiff = getLeapMonthOffset(a11);
      if (diff >= leapDiff) { month = diff + 10; if (diff === leapDiff) leap = 1; }
    }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) year -= 1;
    return { day, month, year, leap };
  }
  const of = date => solar2lunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const addDays = (date, n) => { const t = new Date(date); t.setDate(t.getDate() + n); return t; };
  const isLastDay = date => of(addDays(date, 1)).day === 1;
  // days: số ngày âm 1..29; 30 = ngày cuối tháng (29 hoặc 30 tuỳ tháng)
  const matches = (date, days) => { const l = of(date); return (days || []).some(d => d === 30 ? isLastDay(date) : l.day === d); };
  const dayName = d => d === 1 ? 'mùng 1' : d === 14 ? 'rằm (14)' : d === 15 ? 'rằm (15)' : d === 30 ? 'cuối tháng' : d <= 10 ? 'mùng ' + d : 'ngày ' + d;
  const label = date => { const l = of(date); return `${l.day}/${l.month}${l.leap ? ' nhuận' : ''} âm lịch`; };
  return { of, isLastDay, matches, dayName, label, addDays };
})();

// ---------- Hiểu câu nhắc tiếng Việt: "15h mai gửi báo giá", "30 phút nữa gọi anh Nam", "thứ 6 lúc 9h họp" ----------
HT.parseWhen = function (input, now = new Date()) {
  let s = ' ' + String(input || '').replace(/\s+/g, ' ') + ' ';
  const low = () => s.toLowerCase();
  let date = null, hh = null, mm = 0, rel = 0, dayShift = null;
  const cut = re => { s = s.replace(re, ' '); };
  // sau X phút / X tiếng nữa
  let m = low().match(/(?:sau\s+)?(\d{1,3})\s*(phút|p|tiếng|giờ|h)\s*(?:nữa|sau)/);
  if (!m) m = low().match(/sau\s+(\d{1,3})\s*(phút|p|tiếng|giờ|h)\b/);
  if (m) { rel = Number(m[1]) * (/phút|p/.test(m[2]) ? 1 : 60); cut(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')); }
  // ngày
  const L = low();
  if (/\b(ngày mốt|ngày kia|mốt)\b/.test(L)) { dayShift = 2; cut(/\b(ngày mốt|ngày kia|mốt)\b/i); }
  else if (/\b(ngày mai|sáng mai|chiều mai|tối mai|trưa mai|mai)\b/.test(L)) { dayShift = 1; cut(/\bngày mai\b|\bmai\b/i); }
  else if (/\b(hôm nay|hôm ni|nay)\b/.test(L)) { dayShift = 0; cut(/\b(hôm nay|hôm ni|nay)\b/i); }
  m = low().match(/\b(\d{1,2})\s*[\/\-]\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{2,4}))?\b/);
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : now.getFullYear();
    date = new Date(y, Number(m[2]) - 1, Number(m[1]));
    if (!m[3] && date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date.setFullYear(y + 1);
    cut(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  m = low().match(/\b(thứ\s*(hai|ba|tư|năm|sáu|bảy|[2-7])|chủ nhật|cn)\b/);
  if (m && !date) {
    const map = { hai: 1, ba: 2, 'tư': 3, 'năm': 4, 'sáu': 5, 'bảy': 6, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6 };
    const want = /chủ nhật|cn/.test(m[1]) ? 0 : map[m[2]];
    const d = new Date(now); let add = (want - d.getDay() + 7) % 7; if (add === 0) add = 7;
    d.setDate(d.getDate() + add); date = d; cut(new RegExp(m[0], 'i'));
  }
  // giờ: 15h, 15h30, 15:30, 3 giờ chiều, 8h tối
  m = low().match(/\b(\d{1,2})\s*(?:h|giờ|:)\s*(\d{1,2})?\s*(?:phút|p)?\s*(sáng|trưa|chiều|tối|đêm)?/);
  if (m) {
    hh = Number(m[1]); mm = Number(m[2] || 0);
    const part = m[3] || (low().match(/\b(sáng|trưa|chiều|tối|đêm)\b/) || [])[1];
    if (part && /chiều|tối|đêm/.test(part) && hh < 12) hh += 12;
    if (part === 'trưa' && hh < 6) hh += 12;
    cut(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  // không ghi giờ nhưng có buổi: sáng 8h, trưa 12h, chiều 15h, tối 20h
  if (hh === null) {
    const part = (low().match(/\b(sáng|trưa|chiều|tối|đêm)\b/) || [])[1];
    if (part) { hh = { 'sáng': 8, 'trưa': 12, 'chiều': 15, 'tối': 20, 'đêm': 21 }[part]; mm = 0; }
  }
  cut(/\b(sáng|trưa|chiều|tối|đêm)\b/i);
  cut(/^\s*(hãy\s+)?(nhắc|nhắc nhở)\s+(tôi|mình|em|anh|tui)?\s*/i);
  cut(/\s(lúc|vào|vào lúc|để|là)\s(?=\s)/gi);
  const task = s.replace(/\s+/g, ' ').replace(/^[\s,.:\-–]+|[\s,.:\-–]+$/g, '').replace(/^(lúc|vào|để)\s+/i, '').trim();
  let due = null;
  if (rel) due = new Date(now.getTime() + rel * 60000);
  else if (hh !== null || date || dayShift !== null) {
    const d = date ? new Date(date) : new Date(now);
    if (!date && dayShift) d.setDate(d.getDate() + dayShift);
    d.setHours(hh !== null ? hh : 9, hh !== null ? mm : 0, 0, 0);
    if (!date && dayShift === null && d <= now) d.setDate(d.getDate() + 1);   // giờ đã qua hôm nay -> ngày mai
    due = d;
  }
  return { due, task: task || String(input || '').trim() };
};
HT.localISO = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

// ---------- 🔎 Tìm kiếm chung: tìm trong mọi thứ HaoHao đang giữ (dùng cho HaoHao trên trang, trang tìm kiếm và ô địa chỉ "hh") ----------
HT.fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
HT.SEARCH_KEYS = ['todos', 'ideas', 'rules', 'products', 'watch'];
HT.WEB = [
  { id: 'google', label: 'Google', emoji: '🌐', url: 'https://www.google.com/search?q=' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️', url: 'https://www.youtube.com/results?search_query=' },
  { id: 'wiki', label: 'Wikipedia', emoji: '📚', url: 'https://vi.wikipedia.org/w/index.php?search=' },
  { id: 'maps', label: 'Bản đồ', emoji: '📍', url: 'https://www.google.com/maps/search/' },
  { id: 'dich', label: 'Dịch', emoji: '🔤', url: 'https://translate.google.com/?sl=auto&tl=vi&text=' }
];
HT.webUrl = (id, q) => { const w = HT.WEB.find(x => x.id === id) || HT.WEB[0]; return HT.aff(w.url + encodeURIComponent(q)); };
// Trả về danh sách kết quả, việc khớp nhiều/đúng đầu câu xếp trước. Gõ không dấu vẫn ra.
HT.search = (data, query, limit = 40) => {
  const words = HT.fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  const test = (kind, icon, title, sub, extra, ...fields) => {
    const hay = HT.fold(fields.join(' \n '));
    if (!words.every(w => hay.includes(w))) return;
    const t = HT.fold(title);
    const score = (t.startsWith(words[0]) ? 3 : 0) + words.filter(w => t.includes(w)).length;
    out.push({ kind, icon, title: String(title || '').slice(0, 140), sub, score, ...extra });
  };
  for (const t of data.todos || [])
    test('todo', t.done ? '☑️' : '✅', t.text, t.done ? 'Todo · đã xong' : 'Todo' + (t.due ? ' · hạn ' + new Date(t.due).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''), { id: t.id, done: !!t.done }, t.text);
  for (const i of data.ideas || [])
    test('idea', '💡', i.title || i.text, 'Note' + (i.url ? ' · ' + (i.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) : ''), { id: i.id, url: i.url || '' },
      i.title, i.text, i.url, i.ai && (i.ai.summary || i.ai.title || ''), (i.ai && i.ai.tags || []).join(' '));
  for (const r of data.rules || [])
    test(r.type === 'price' ? 'alert' : 'bell', r.type === 'price' ? '📈' : (r.icon || '🔔'), r.name,
      (r.type === 'price' ? 'Cảnh báo giá · ' : 'Nhắc nhở · ') + (r.enabled ? 'đang bật' : 'đang tắt'), { id: r.id }, r.name, r.message, r.coin);
  for (const p of data.products || [])
    test('shop', '🛒', p.title, 'Mua sắm · ' + (p.price ? Number(p.price).toLocaleString('vi-VN') + 'đ' : 'đã lưu'), { id: p.id, url: p.url }, p.title, p.url);
  for (const w of data.watch || [])
    test('coin', '₿', w.coin, 'Crypto · ' + (w.source === 'dexscreener' ? 'DexScreener' : 'CoinGecko'), {}, w.coin);
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
};
HT.SEARCH_KIND = { todo: 'Todo', idea: 'Note', bell: 'Nhắc nhở', alert: 'Cảnh báo giá', shop: 'Mua sắm', coin: 'Crypto' };

// ---------- 🔗 Link tiếp thị (affiliate) ----------
// DÁN LINK GIỚI THIỆU CỦA BẠN VÀO ĐÂY. Để trống thì link đi thẳng tới shop, không qua affiliate.
// Trong mẫu: {url} = link gốc đã mã hoá (dùng cho deep link AccessTrade, Ecomobi…), {raw} = link gốc giữ nguyên.
//   Ví dụ AccessTrade: 'https://go.isclix.com/deep_link/MÃ_PUBLISHER/MÃ_CHIẾN_DỊCH?url={url}'
//   Ví dụ Shopee (tham số tiếp thị): '{raw}?utm_source=an_MÃ_AFFILIATE&utm_medium=affiliates&utm_campaign=haohao'
HT.AFF = {
  shopee: { host: /(^|\.)shopee\.vn$/, link: '' },
  lazada: { host: /(^|\.)lazada\.vn$/, link: '' },
  tiktok: { host: /(^|\.)tiktok\.com$/, link: '' },
  tiki: { host: /(^|\.)tiki\.vn$/, link: '' },
  other: { link: '' }   // mọi shop khác (nếu mạng affiliate của bạn có deep link chung)
};
HT.AFF_NOTE = 'Link tiếp thị: HaoHao có thể nhận hoa hồng khi bạn mua, bạn không phải trả thêm.';
HT.shopOf = url => { try { const h = new URL(url).hostname; return Object.keys(HT.AFF).find(k => HT.AFF[k].host && HT.AFF[k].host.test(h)) || 'other'; } catch { return ''; } };
HT.aff = url => {
  const k = HT.shopOf(url); const tpl = k && HT.AFF[k].link;
  if (!tpl) return url;
  if (tpl.includes('{url}')) return tpl.replace('{url}', encodeURIComponent(url));
  if (tpl.startsWith('{raw}')) { const rest = tpl.slice(5); return url + (url.includes('?') && rest.startsWith('?') ? '&' + rest.slice(1) : rest); }
  return tpl;
};
HT.isAff = url => { const k = HT.shopOf(url); return !!(k && HT.AFF[k].link); };
HT.SHOPS = [
  { id: 'shopee', label: 'Shopee', search: 'https://shopee.vn/search?keyword=' },
  { id: 'lazada', label: 'Lazada', search: 'https://www.lazada.vn/catalog/?q=' },
  { id: 'tiktok', label: 'TikTok Shop', search: 'https://www.tiktok.com/search?q=' },
  { id: 'tiki', label: 'Tiki', search: 'https://tiki.vn/search?q=' }
];
HT.shopSearch = (id, q) => { const s = HT.SHOPS.find(x => x.id === id) || HT.SHOPS[0]; return HT.aff(s.search + encodeURIComponent(q)); };
HT.DEAL_PAGES = { voucher: 'https://shopee.vn/m/ma-giam-gia', flash: 'https://shopee.vn/flash_sale' };

// ---------- ⚖️ So giá: nhận mã model và so khớp tên sản phẩm ----------
const UNIT = /^\d+([.,]\d+)?(gb|tb|mb|mah|w|kw|ml|l|g|kg|cm|mm|m|inch|in|hz|v|btu|lit|lít|k|tr|m2)$/i;
HT.modelOf = title => {
  const toks = String(title || '').split(/[\s,()/[\]|+]+/).map(t => t.replace(/^[-.]+|[-.]+$/g, ''));
  const c = toks.filter(t => t.length >= 3 && /\d/.test(t) && /[a-z]/i.test(t) && !UNIT.test(t) && !/^(spf|pa|ip|usb|hdmi|wifi|ddr|pd|gen|mk|v)\d/i.test(t) && !/^\d+(g|k|x)$/i.test(t));
  return c.sort((a, b) => b.length - a.length)[0] || '';
};
HT.cleanTitle = title => String(title || '').replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, ' ')
  .replace(/\b(chính hãng|hàng chính hãng|freeship|miễn phí vận chuyển|bảo hành \d+ tháng|mới 100%|giá rẻ|sale|hot|new)\b/gi, ' ')
  .replace(/[|•\-–]+/g, ' ').replace(/\s+/g, ' ').trim();
// 'model' = cùng mã model (chắc chắn), 'similar' = tên giống nhiều (nên xem lại), '' = không khớp
const ACCESSORY = /\b(op lung|bao da|cuong luc|mieng dan|dan man|cap sac|cu sac|sac nhanh|day deo|case|op|tui dung|gia do|phu kien)\b/;
HT.matchProduct = (a, b) => {
  const m = HT.modelOf(a), fa = HT.fold(a), fb = HT.fold(b);
  if (ACCESSORY.test(fb) && !ACCESSORY.test(fa)) return '';   // ốp lưng, cáp sạc… không phải cùng món
  const wa = HT.fold(HT.cleanTitle(a)).split(' ').filter(w => w.length > 1).slice(0, 7);
  const overlap = wa.length ? wa.filter(w => fb.includes(w)).length / wa.length : 0;
  if (m) {
    // mã model phải đứng riêng (X20 khớp "X20+" nhưng không khớp "X200"); bỏ qua gạch ngang: WH-1000XM5 = WH1000XM5
    const mm = HT.fold(m).replace(/-/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + mm + '(?![0-9])').test(fb.replace(/-/g, '')) && overlap >= 0.5 ? 'model' : '';
  }
  return wa.length >= 3 && overlap >= 0.75 ? 'similar' : '';
};

// ---------- 🎟️ Lịch sale ----------
// Ngày đôi (1.1 … 12.12), sale giữa tháng (15), sale lương về (25), Black Friday. big = ngày sale lớn.
HT.saleDays = (from = new Date(), n = 4) => {
  const out = [], d0 = new Date(from); d0.setHours(0, 0, 0, 0);
  for (let i = 0; i < 400 && out.length < n; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    const day = d.getDate(), mon = d.getMonth() + 1;
    const lastFri = mon === 11 && d.getDay() === 5 && day + 7 > 30;
    let name = '', big = false;
    if (day === mon) { name = `${day}.${mon}`; big = mon >= 9 || mon === 6 || mon === 3; }
    else if (lastFri) { name = 'Black Friday'; big = true; }
    else if (day === 15) name = `Sale giữa tháng 15.${mon}`;
    else if (day === 25) name = `Sale lương về 25.${mon}`;
    if (name) out.push({ name, date: d, big, days: i });
  }
  return out;
};

// ---------- 📉 Nhận xét giá từ lịch sử 30 ngày ----------
HT.priceVerdict = (history, now = Date.now()) => {
  const pts = (history || []).filter(x => x.p && now - x.t <= 30 * 86400e3);
  if (pts.length < 3) return { cls: 'na', text: 'Chưa đủ dữ liệu, HaoHao đang theo dõi thêm' };
  const cur = pts[pts.length - 1].p;
  // so với giá TRƯỚC lần đổi giá gần nhất (bỏ các lần ghi lặp lại giá hiện tại)
  let k = pts.length - 1; while (k > 0 && pts[k - 1].p === cur) k--;
  const prev = pts.slice(0, k).map(x => x.p);
  if (!prev.length) return { cls: 'ok', text: 'Giá không đổi trong 30 ngày' };
  const low = Math.min(...prev), avg = prev.reduce((a, b) => a + b, 0) / prev.length;
  const sale = HT.saleDays(new Date(now), 6).find(x => x.big && x.days <= 10);
  const rose = pts.some((x, i) => i && now - x.t <= 10 * 86400e3 && x.p > pts[i - 1].p * 1.03);
  if (cur <= low) return { cls: 'good', text: 'Giá thấp nhất 30 ngày 👍' };
  if (cur <= avg * 0.97) return { cls: 'good', text: 'Giá tốt, thấp hơn bình thường' };
  if (sale && rose && cur >= avg * 1.05) return { cls: 'bad', text: `Đang bị đẩy giá trước ${sale.name} ⚠` };
  if (cur >= avg * 1.05) return { cls: 'warn', text: 'Cao hơn bình thường, nên chờ thêm' };
  return { cls: 'ok', text: 'Giá bình thường' };
};

// ---------- 🛡️ Kiểm tra sản phẩm & shop (Shopee) ----------
// Số kiểu Shopee: "2,3k" = 2300, "1,2tr" = 1.200.000, "10k+" = 10000, "1.234" = 1234
HT.num = s => {
  const m = String(s || '').toLowerCase().replace(/\s/g, '').match(/^([\d.,]+)(k|tr|triệu|m)?\+?$/);
  if (!m) return NaN;
  let x = m[1];
  if (m[2]) x = x.replace(',', '.'); else x = x.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.');
  return Math.round(parseFloat(x) * (m[2] === 'k' ? 1e3 : m[2] ? 1e6 : 1));
};
// "5 năm trước" → 60, "3 tháng trước" → 3, "20 ngày trước" → 0.7
HT.monthsAgo = s => {
  const m = String(s || '').toLowerCase().match(/(\d+)\s*(năm|tháng|tuần|ngày|giờ|phút)/);
  if (!m) return NaN;
  return +m[1] * { 'năm': 12, 'tháng': 1, 'tuần': 0.25, 'ngày': 1 / 30, 'giờ': 0, 'phút': 0 }[m[2]];
};
const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'tr' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'k' : String(n);
// info: { rating, ratingCount, dist: {5,4,3,2,1}, sold, photos, dupReviews, mall, preferred, responseRate, responseTime, joinedMonths, shopRatings, followers, shipFrom, price, marketPrice }
HT.trustScore = info => {
  let sc = 60; const product = [], shop = [];
  const add = (list, pts, s, t) => { sc += pts; list.push({ s, t }); };
  const n = info.ratingCount, r = info.rating;
  // --- sản phẩm ---
  if (!n) add(product, -15, 'bad', 'Chưa có đánh giá nào, chưa ai kiểm chứng');
  else {
    if (r >= 4.95 && n < 50) add(product, -5, 'warn', `${r}★ nhưng chỉ ${n} đánh giá, điểm cao bất thường`);
    else if (r >= 4.8) add(product, n >= 50 ? 10 : 4, 'ok', `${r}★ từ ${fmtN(n)} đánh giá`);
    else if (r >= 4.5) add(product, 5, 'ok', `${r}★ từ ${fmtN(n)} đánh giá`);
    else if (r >= 4) add(product, -3, 'warn', `Chỉ ${r}★ (${fmtN(n)} đánh giá), thấp hơn mặt bằng Shopee`);
    else add(product, r < 3.5 ? -25 : -15, 'bad', `Điểm thấp: ${r}★ (${fmtN(n)} đánh giá)`);
    if (n < 20) add(product, -10, 'warn', 'Ít đánh giá, chưa đủ để tin');
    else if (n >= 1000) add(product, 8, 'ok', 'Rất nhiều người đã mua và đánh giá');
    else if (n >= 100) add(product, 4, 'ok', 'Đủ nhiều đánh giá để tham khảo');
  }
  const d = info.dist, tot = d ? [1, 2, 3, 4, 5].reduce((a, k) => a + (d[k] || 0), 0) : 0;
  if (tot >= 20) {
    const low = ((d[1] || 0) + (d[2] || 0)) / tot;
    if (low >= 0.1) add(product, -12, 'bad', `${Math.round(low * 100)}% đánh giá 1–2★, nhiều người không hài lòng`);
    else if (low >= 0.05) add(product, -5, 'warn', `${Math.round(low * 100)}% đánh giá 1–2★`);
    else add(product, 3, 'ok', `Chỉ ${Math.round(low * 100)}% đánh giá 1–2★`);
  }
  if (info.photos && n) {
    if (info.photos / n >= 0.1) add(product, 5, 'ok', `${fmtN(info.photos)} đánh giá có ảnh/video thật`);
    else if (n >= 100 && info.photos / n < 0.03) add(product, -4, 'warn', 'Rất ít đánh giá có ảnh thật');
  }
  if (info.sold > 50 && n && n / info.sold > 0.9) add(product, -6, 'warn', 'Số đánh giá gần bằng số đã bán, có thể có đánh giá ảo');
  else if (info.sold >= 1000) product.push({ s: 'ok', t: `Đã bán ${fmtN(info.sold)}` });
  if (info.dupReviews >= 3) add(product, -8, 'bad', `${info.dupReviews} đánh giá giống hệt nhau, nghi đánh giá ảo`);
  if (info.price && info.marketPrice) {
    if (info.price < info.marketPrice * 0.6) add(product, -12, 'bad', 'Rẻ bất thường so với sàn khác, cẩn thận hàng giả');
    else if (info.price <= info.marketPrice * 1.02) add(product, 3, 'ok', 'Giá hợp lý so với sàn khác');
    else if (info.price > info.marketPrice * 1.15) product.push({ s: 'warn', t: 'Đắt hơn sàn khác, xem bảng so giá bên dưới' });
  }
  // --- shop ---
  if (info.mall) add(shop, 12, 'ok', 'Shopee Mall: hàng chính hãng, được đổi trả');
  else if (info.preferred) add(shop, 6, 'ok', 'Shop Yêu Thích: bán tốt, ít bị phàn nàn');
  else shop.push({ s: 'warn', t: 'Shop thường, không phải Mall hay Yêu Thích' });
  if (info.responseRate != null && !isNaN(info.responseRate)) {
    if (info.responseRate >= 90) add(shop, 4, 'ok', `Phản hồi ${info.responseRate}%${info.responseTime ? ' ' + info.responseTime : ''}`);
    else if (info.responseRate < 70) add(shop, -6, 'warn', `Chỉ phản hồi ${info.responseRate}% tin nhắn`);
    else shop.push({ s: 'ok', t: `Phản hồi ${info.responseRate}%` });
  }
  const jm = info.joinedMonths;
  if (jm != null && !isNaN(jm)) {
    const lbl = jm >= 12 ? `${Math.floor(jm / 12)} năm` : jm >= 1 ? `${Math.round(jm)} tháng` : 'chưa tới 1 tháng';
    if (jm < 3) add(shop, -10, 'bad', `Shop mới tham gia ${lbl}`);
    else if (jm < 12) add(shop, -3, 'warn', `Shop tham gia ${lbl}`);
    else add(shop, jm >= 24 ? 4 : 2, 'ok', `Shop hoạt động ${lbl}`);
  }
  if (info.shopRatings != null && !isNaN(info.shopRatings)) {
    if (info.shopRatings >= 10000) add(shop, 4, 'ok', `${fmtN(info.shopRatings)} lượt đánh giá shop`);
    else if (info.shopRatings < 100) add(shop, -5, 'warn', `Shop mới có ${info.shopRatings} lượt đánh giá`);
  }
  if (info.followers != null && info.followers < 100) add(shop, -3, 'warn', `Chỉ ${info.followers} người theo dõi shop`);
  if (info.shipFrom) {
    if (/nước ngoài|quốc tế|trung quốc|overseas/i.test(info.shipFrom)) add(shop, -4, 'warn', `Hàng gửi từ ${info.shipFrom}: giao lâu, khó đổi trả`);
    else shop.push({ s: 'ok', t: `Gửi từ ${info.shipFrom}` });
  }
  const score = Math.max(0, Math.min(100, Math.round(sc)));
  const [level, cls] = score >= 80 ? ['Đáng tin', 'good'] : score >= 60 ? ['Khá ổn', 'ok'] : score >= 40 ? ['Cân nhắc', 'warn'] : ['Rủi ro', 'bad'];
  return { score, level, cls, product, shop };
};

// cho phép trang khác (xem thử) dùng chung
if (typeof self !== "undefined") self.HT = HT;
