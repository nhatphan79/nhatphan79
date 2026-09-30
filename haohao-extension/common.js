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
  { id: 'shopee', label: 'Shopee', emoji: '🛍️', url: 'https://shopee.vn/search?keyword=' },
  { id: 'wiki', label: 'Wikipedia', emoji: '📚', url: 'https://vi.wikipedia.org/w/index.php?search=' },
  { id: 'maps', label: 'Bản đồ', emoji: '📍', url: 'https://www.google.com/maps/search/' },
  { id: 'dich', label: 'Dịch', emoji: '🔤', url: 'https://translate.google.com/?sl=auto&tl=vi&text=' }
];
HT.webUrl = (id, q) => { const w = HT.WEB.find(x => x.id === id) || HT.WEB[0]; return w.url + encodeURIComponent(q); };
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

// cho phép trang khác (xem thử) dùng chung
if (typeof self !== "undefined") self.HT = HT;
