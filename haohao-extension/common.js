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

// Bỏ dấu tiếng Việt để so khớp (gõ không dấu vẫn ra)
HT.fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// ---------- 🔗 Link tiếp thị (affiliate) ----------
// DÁN LINK GIỚI THIỆU CỦA BẠN VÀO ĐÂY. Để trống thì link đi thẳng tới shop, không qua affiliate.
// Trong mẫu: {url} = link gốc đã mã hoá (dùng cho deep link AccessTrade, Ecomobi…), {raw} = link gốc giữ nguyên.
//   Ví dụ AccessTrade: 'https://go.isclix.com/deep_link/MÃ_PUBLISHER/MÃ_CHIẾN_DỊCH?url={url}'
//   Ví dụ Shopee (tham số tiếp thị): '{raw}?utm_source=an_MÃ_AFFILIATE&utm_medium=affiliates&utm_campaign=haohao'
HT.AFF = {
  shopee: { host: /(^|\.)shopee\.vn$/, link: '' },
  tiktok: { host: /(^|\.)tiktok\.com$/, link: '' },
};
HT.AFF_NOTE = 'Link tiếp thị: HaoHao có thể nhận hoa hồng khi bạn mua, bạn không phải trả thêm.';
HT.shopOf = url => { try { const h = new URL(url).hostname; return Object.keys(HT.AFF).find(k => HT.AFF[k].host.test(h)) || ''; } catch { return ''; } };
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
  { id: 'tiktok', label: 'TikTok Shop', search: 'https://www.tiktok.com/search?q=' }
];
HT.shopSearch = (id, q) => { const s = HT.SHOPS.find(x => x.id === id) || HT.SHOPS[0]; return HT.aff(s.search + encodeURIComponent(q)); };
// ---------- 🎟️ Mã giảm giá ----------
// Kho mã của bạn: sửa file haohao-extension/coupons.json trên GitHub, mọi người dùng tự nhận mã mới (6 giờ/lần), không cần ra bản mới.
HT.COUPON_FEED = 'https://raw.githubusercontent.com/nhatphan79/nhatphan79/main/haohao-extension/coupons.json';
// Số tiền giảm của 1 mã cho đơn giá `price` (null = chưa đủ điều kiện đơn tối thiểu)
HT.couponValue = (c, price) => {
  if (!price) return null;
  if (c.minOrder && price < c.minOrder) return null;
  let v = c.discount ? +c.discount : c.percent ? price * c.percent / 100 : 0;
  if (c.maxDiscount) v = Math.min(v, +c.maxDiscount);
  return Math.min(Math.round(v), price);
};
HT.couponLive = (c, now = Date.now()) => !c.expires || new Date(c.expires).getTime() > now;
HT.couponLabel = c => {
  const k = n => n >= 1e6 ? (n / 1e6).toString().replace('.', ',') + 'tr' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
  const main = c.discount ? `Giảm ${k(c.discount)}` : c.percent ? `Giảm ${c.percent}%${c.maxDiscount ? ' tối đa ' + k(c.maxDiscount) : ''}` : (c.title || 'Ưu đãi');
  return main + (c.minOrder ? ` · đơn từ ${k(c.minOrder)}` : '');
};
// Đọc chip mã trên trang Shopee: "Giảm ₫5k", "Giảm 10%", kèm "Đơn Tối Thiểu ₫99k", "Giảm tối đa ₫20k" nếu có
HT.parseVouchers = text => {
  const out = [], t = String(text || '').replace(/\s+/g, ' ');
  const re = /Giảm\s*(?:giá\s*)?(₫\s*[\d.,]+\s*k?|[\d.,]+\s*k?\s*₫|\d{1,2}\s*%)(?:\s*(?:Giảm tối đa|Tối đa)\s*(₫\s*[\d.,]+\s*k?|[\d.,]+\s*k?\s*₫))?(?:[^₫%]{0,20}Đơn (?:Tối Thiểu|tối thiểu|từ)\s*(₫\s*[\d.,]+\s*k?|[\d.,]+\s*k?\s*₫))?/gi;
  const money = s => HT.num(String(s).replace(/[₫\s]/g, ''));
  for (const m of t.matchAll(re)) {
    const c = /%/.test(m[1]) ? { percent: parseInt(m[1]) } : { discount: money(m[1]) };
    if (m[2]) c.maxDiscount = money(m[2]);
    if (m[3]) c.minOrder = money(m[3]);
    if ((c.discount && c.discount < 500) || (c.percent && c.percent > 90)) continue;
    const key = JSON.stringify(c); if (!out.some(x => JSON.stringify(x) === key)) out.push(c);
  }
  return out.slice(0, 12);
};


// ---------- 🔍 Tìm cùng món ở shop khác trên Shopee ----------
// Mã model (X20, WH-1000XM5, S24…): nếu tên gốc có thì món kia bắt buộc phải có
const UNIT = /^\d+([.,]\d+)?(gb|tb|mb|mah|w|kw|ml|l|g|kg|cm|mm|m|inch|in|hz|v|btu|lit|lít|k|tr|m2)$/i;
HT.modelOf = title => String(title || '').split(/[\s,()/[\]|+]+/).map(t => t.replace(/^[-.]+|[-.]+$/g, ''))
  .filter(t => t.length >= 3 && /^[A-Za-z0-9-]+$/.test(t) && /\d/.test(t) && /[a-z]/i.test(t) && !UNIT.test(t) && !/^(spf|pa|ip|usb|hdmi|wifi|ddr|pd|gen|mk|v)\d/i.test(t) && !/^\d+(g|k|x)$/i.test(t))
  .sort((a, b) => b.length - a.length)[0] || '';
const ACC = /\b(op lung|bao da|cuong luc|mieng dan|dan man|cap sac|cu sac|day deo|tui dung|gia do|phu kien)\b/;
// 0..1: tên món kia giống tên gốc bao nhiêu (0 = khác món)
HT.titleSim = (a, b) => {
  const fa = HT.fold(a), fb = HT.fold(b);
  if (ACC.test(fb) && !ACC.test(fa)) return 0;          // ốp lưng, cáp sạc… không phải cùng món
  const m = HT.modelOf(a);
  // có mã model mà món kia không có (hoặc là X200 thay vì X20) thì giảm mạnh độ giống
  const miss = m && !new RegExp('(^|[^a-z0-9])' + HT.fold(m).replace(/-/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![0-9])').test(fb.replace(/-/g, ''));
  const wa = [...new Set(HT.fold(HT.cleanTitle(a)).split(/[^a-z0-9]+/).filter(w => w.length > 1))].slice(0, 10);
  if (!wa.length) return 0;
  const wb = new Set(HT.fold(b).split(/[^a-z0-9]+/));
  return wa.filter(w => wb.has(w)).length / wa.length * (miss ? 0.5 : 1);
};
// Nhãn uy tín gọn cho 1 sản phẩm trong danh sách tìm kiếm
HT.listingTags = it => {
  const t = [];
  if (it.mall) t.push({ s: 'ok', t: '🏬 Mall' }); else if (it.preferred) t.push({ s: 'ok', t: '❤ Yêu thích' });
  if (it.rating) t.push({ s: it.rating >= 4.7 ? 'ok' : it.rating >= 4.3 ? '' : 'warn', t: `★${it.rating}` });
  if (it.sold != null && !isNaN(it.sold)) t.push(it.sold < 10 ? { s: 'warn', t: `⚠ Mới bán ${it.sold}` } : { s: it.sold >= 1000 ? 'ok' : '', t: `Đã bán ${it.sold >= 1000 ? (it.sold / 1000).toFixed(it.sold >= 10000 ? 0 : 1).replace('.', ',') + 'k' : it.sold}` });
  else t.push({ s: 'warn', t: '⚠ Chưa rõ số bán' });
  if (it.overseas) t.push({ s: 'warn', t: '✈ Hàng nước ngoài' });
  return t;
};
HT.shopeeSearchUrl = q => 'https://shopee.vn/search?keyword=' + encodeURIComponent(q) + '&order=asc&page=0&sortBy=price';
// Tên sản phẩm gọn để tìm ở sàn khác
HT.cleanTitle = title => String(title || '').replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, ' ')
  .replace(/\b(chính hãng|hàng chính hãng|freeship|miễn phí vận chuyển|bảo hành \d+ tháng|mới 100%|giá rẻ|sale|hot|new)\b/gi, ' ')
  .replace(/[|•\-–]+/g, ' ').replace(/\s+/g, ' ').trim();

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
// info: { rating, ratingCount, dist: {5,4,3,2,1}, sold, photos, dupReviews, mall, preferred, responseRate, responseTime, joinedMonths, shopRatings, shopStar, followers, shipFrom }
HT.trustScore = info => {
  let sc = info.shopOnly ? 72 : 60; const product = [], shop = [];
  const add = (list, pts, s, t) => { sc += pts; list.push({ s, t }); };
  const n = info.ratingCount, r = info.rating;
  // --- sản phẩm --- (trang shop thì chỉ chấm shop)
  if (info.shopOnly) {} else if (!n) add(product, -15, 'bad', 'Chưa có đánh giá nào, chưa ai kiểm chứng');
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
  const d = info.shopOnly ? null : info.dist, tot = d ? [1, 2, 3, 4, 5].reduce((a, k) => a + (d[k] || 0), 0) : 0;
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
  const rv = info.reviewsNormal;
  if (rv && rv.read) {
    if (rv.issues.length) {
      const top = rv.issues.slice(0, 3).map(i => `${i.label.toLowerCase()} (${i.n})`).join(', ');
      add(product, -Math.min(15, 4 * rv.issues.length), rv.bad >= 3 || rv.issues.length >= 2 ? 'bad' : 'warn', `${rv.bad}/${rv.read} đánh giá đang hiện có lời chê: ${top}`);
    } else if (rv.read >= 4) product.push({ s: 'ok', t: `Đọc ${rv.read} đánh giá đang hiện: không thấy lời chê` });
  }
  if (info.dupReviews >= 3) add(product, -8, 'bad', `${info.dupReviews} đánh giá giống hệt nhau, nghi đánh giá ảo`);
  // --- shop ---
  if (info.mall) add(shop, 12, 'ok', 'Shopee Mall: hàng chính hãng, được đổi trả');
  else if (info.preferred) add(shop, 6, 'ok', 'Shop Yêu Thích: bán tốt, ít bị phàn nàn');
  else shop.push({ s: 'warn', t: 'Shop thường, không phải Mall hay Yêu Thích' });
  if (info.responseRate != null && !isNaN(info.responseRate)) {
    if (info.responseRate >= 90) add(shop, 4, 'ok', `Phản hồi ${info.responseRate}%${info.responseTime ? ' ' + info.responseTime : ''}`);
    else if (info.responseRate < 70) add(shop, -6, 'warn', `Chỉ phản hồi ${info.responseRate}% tin nhắn`);
    else shop.push({ s: 'ok', t: `Phản hồi ${info.responseRate}%${info.responseTime ? ' ' + info.responseTime : ''}` });
  }
  const jm = info.joinedMonths;
  if (jm != null && !isNaN(jm)) {
    const lbl = jm >= 12 ? `${Math.floor(jm / 12)} năm` : jm >= 1 ? `${Math.round(jm)} tháng` : 'chưa tới 1 tháng';
    if (jm < 3) add(shop, -10, 'bad', `Shop mới tham gia ${lbl}`);
    else if (jm < 12) add(shop, -3, 'warn', `Shop tham gia ${lbl}`);
    else add(shop, jm >= 24 ? 4 : 2, 'ok', `Shop hoạt động ${lbl}`);
  }
  if (info.shopStar) {
    if (info.shopStar >= 4.8) add(shop, 5, 'ok', `Shop được chấm ${info.shopStar}★`);
    else if (info.shopStar < 4.5) add(shop, -8, 'warn', `Shop chỉ được ${info.shopStar}★`);
    else shop.push({ s: 'ok', t: `Shop được chấm ${info.shopStar}★` });
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

// ---------- 💬 Đọc lời chê trong đánh giá ----------
// Mỗi chủ đề: mẫu có dấu (đánh giá thường có dấu) + mẫu không dấu. Trích nguyên câu của người mua, không nói chung chung.
HT.REVIEW_TOPICS = [
  { id: 'quality', label: 'Chất lượng kém', re: /(chất lượng kém|kém chất lượng|quá tệ|tệ|kém|dởm|đểu|rách|bung chỉ|sứt chỉ|xù lông|phai màu|ra màu|bạc màu|co rút|lỗi|hỏng|hư|mỏng dính|mỏng quá|vải mỏng|không bền|nhanh hỏng|cũ|trầy)/u,
    fold: /(chat luong kem|kem chat luong|te qua|rach|bung chi|xu long|phai mau|ra mau|bac mau|mong dinh|vai mong|khong ben|nhanh hong)/ },
  { id: 'look', label: 'Xấu, không giống hình', re: /(xấu|không giống hình|khác hình|không giống ảnh|khác ảnh|không như hình|không như ảnh|không đúng mô tả|khác mô tả|sai màu|khác màu|màu không giống)/u,
    fold: /(khong giong hinh|khac hinh|khong giong anh|khac anh|khong nhu hinh|khong dung mo ta|khac mo ta|sai mau|khac mau)/ },
  { id: 'size', label: 'Sai size, không vừa', re: /(chật|rộng quá|quá rộng|nhỏ quá|quá nhỏ|to quá|quá to|sai size|không vừa|size không chuẩn|lệch size|form xấu|dài quá|ngắn quá)/u,
    fold: /(sai size|khong vua|size khong chuan|lech size)/ },
  { id: 'fake', label: 'Nghi hàng giả, nhái', re: /(hàng giả|fake|hàng nhái|nhái|không chính hãng|không phải hàng thật|hàng dỏm|hàng lỗi)/u,
    fold: /(hang gia|hang nhai|khong chinh hang|hang dom)/ },
  { id: 'ship', label: 'Giao hàng, đóng gói', re: /(giao chậm|giao lâu|giao thiếu|thiếu hàng|thiếu đồ|giao sai|gửi sai|đóng gói sơ sài|đóng gói ẩu|móp|bẹp|vỡ|bể)/u,
    fold: /(giao cham|giao lau|giao thieu|thieu hang|giao sai|gui sai|dong goi so sai)/ },
  { id: 'smell', label: 'Mùi khó chịu', re: /(mùi hôi|hôi rình|bốc mùi|mùi khó chịu|mùi hắc|mùi hóa chất|mùi lạ|hôi quá)/u,
    fold: /(mui hoi|boc mui|mui kho chiu|mui hac|mui hoa chat)/ },
  { id: 'shop', label: 'Shop, đổi trả', re: /(không trả lời|không rep|thái độ|không hỗ trợ|lừa đảo|lừa|không cho đổi|không đổi trả|không hoàn tiền|shop tệ)/u,
    fold: /(khong tra loi|khong ho tro|lua dao|khong cho doi|khong doi tra|khong hoan tien)/ },
  { id: 'upset', label: 'Thất vọng', re: /(thất vọng|không hài lòng|phí tiền|đừng mua|không nên mua|chán|bực|tức|thảm họa|không đáng tiền)/u,
    fold: /(that vong|khong hai long|phi tien|dung mua|khong nen mua|tham hoa|khong dang tien)/ }
];
const NEG_BEFORE = /(không|chẳng|chả|ko|k|hông|chưa|khong|chang|cha|chua)\s+(hề\s+|he\s+|bị\s+|bi\s+|có\s+|co\s+|thấy\s+|thay\s+)?$/u;
const L_ = '\\p{L}';
// texts: danh sách đánh giá (chuỗi, hoặc { t, low } với low = đánh giá 1–2★). Trả về { read, bad, issues: [{ id, label, n, quotes }] }
HT.reviewIssues = texts => {
  const issues = {}, badSet = new Set();
  const seen = new Map();
  for (const x of texts || []) { const t = String(typeof x === 'string' ? x : x.t).trim(); if (t.length >= 4) seen.set(t, (seen.get(t) || false) || !!(x && x.low)); }
  const list = [...seen.keys()].slice(0, 250);
  list.forEach((raw, idx) => {
    let any = false;
    const t = raw.toLowerCase().normalize('NFC'), f = HT.fold(raw);
    for (const tp of HT.REVIEW_TOPICS) {
      // tìm từ đứng riêng (không dính vào chữ khác), bỏ qua khi có "không/chẳng…" ngay trước
      const re = new RegExp('(?<![' + L_ + '])' + tp.re.source + '(?![' + L_ + '])', 'gu');
      let hit = null;
      for (const m of t.matchAll(re)) { if (!NEG_BEFORE.test(t.slice(Math.max(0, m.index - 14), m.index))) { hit = m; break; } }
      if (!hit && tp.fold) {
        const rf = new RegExp('(?<![a-z])' + tp.fold.source + '(?![a-z])', 'g');
        for (const m of f.matchAll(rf)) { if (!NEG_BEFORE.test(f.slice(Math.max(0, m.index - 14), m.index))) { hit = { index: -1, 0: m[0] }; break; } }
      }
      if (!hit) continue;
      any = true;
      const it = issues[tp.id] || (issues[tp.id] = { id: tp.id, label: tp.label, n: 0, quotes: [], words: new Set() });
      it.n++; it.words.add(hit[0]); badSet.add(idx);
      if (it.quotes.length < 3) {
        // trích câu chứa lời chê (tối đa ~110 ký tự)
        let q = raw;
        if (hit.index >= 0) { const s0 = raw.lastIndexOf('.', hit.index) + 1, e0 = raw.indexOf('.', hit.index); q = raw.slice(s0, e0 < 0 ? undefined : e0 + 1).trim() || raw; }
        if (q.length > 110) q = (hit.index > 60 ? '…' : '') + q.slice(Math.max(0, (hit.index >= 0 ? hit.index : 0) - 50), (hit.index >= 0 ? hit.index : 0) + 60).trim() + '…';
        if (!it.quotes.includes(q)) it.quotes.push(q);
      }
    }
    // đánh giá 1–2★ không có từ khoá nào vẫn là lời chê: gom vào "Chê khác"
    if (!any && seen.get(raw)) {
      const it = issues.other || (issues.other = { id: 'other', label: 'Chê khác (1–2★)', n: 0, quotes: [], words: new Set() });
      it.n++; badSet.add(idx); if (it.quotes.length < 3) it.quotes.push(raw.length > 110 ? raw.slice(0, 108) + '…' : raw);
    }
  });
  const arr = Object.values(issues).map(x => ({ id: x.id, label: x.label, n: x.n, quotes: x.quotes, words: [...x.words].slice(0, 4) })).sort((a, b) => b.n - a.n);
  return { read: list.length, bad: badSet.size, issues: arr };
};

// Đánh giá khen tiêu biểu (không có lời chê, nhiều ý khen nhất, độ dài vừa đọc)
const GOOD_RE = /(đẹp|tốt|ưng|thích|hài lòng|chất lượng|đáng tiền|giống hình|như hình|đúng mô tả|giao nhanh|nhanh|chuẩn|vừa|mát|bền|xịn|tuyệt|nên mua|ủng hộ|rẻ|dày dặn|mềm)/gu;
HT.goodReview = texts => {
  let best = null, bs = 0;
  for (const raw of texts || []) {
    const t = String(raw).trim(); if (t.length < 15) continue;
    if (HT.reviewIssues([t]).bad) continue;
    const sc = (t.toLowerCase().match(GOOD_RE) || []).length - (t.length > 140 ? 1 : 0);
    if (sc > bs) { bs = sc; best = t; }
  }
  return best && bs >= 1 ? (best.length > 85 ? best.slice(0, 83).trim() + '…' : best) : '';
};
// cho phép trang khác (xem thử) dùng chung
if (typeof self !== "undefined") self.HT = HT;
