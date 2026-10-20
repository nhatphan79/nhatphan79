// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
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
  GOLD_NAMES: { sjc: 'Vàng SJC', nhan: 'Nhẫn 9999', xau: 'Vàng thế giới' },
  isMkt: r => r && (r.source === 'gold' || r.source === 'stock'),
  mktUnit: r => r.source === 'stock' ? ' nghìn đ' : r.coin === 'xau' ? ' USDT' : ' triệu/chỉ',
  describe(r) {
    if (r.type === 'keyword') {
      const w = (r.words || []).join(', ');
      return (r.mode === 'all' ? 'Trang có đủ các từ: ' : 'Trang có một trong các từ: ') + w +
        (r.sites ? ` (chỉ trên ${r.sites})` : '');
    }
    if (r.type === 'price' && HT.isMkt(r)) {
      const pct = r.op === 'up' || r.op === 'down', nm = r.source === 'gold' ? (HT.GOLD_NAMES[r.coin] || r.coin) : r.coin;
      return `${nm} ${r.source === 'gold' && r.coin !== 'xau' && !pct ? (r.op === 'above' ? 'giá bán ≥' : 'giá bán ≤') : HT.opLabel[r.op] || ''} ${pct ? r.value + '% hôm nay' : Number(r.value).toLocaleString('vi-VN') + HT.mktUnit(r)}`;
    }
    if (r.type === 'price') {
      const pct = r.op === 'up' || r.op === 'down';
      const coin = r.source === 'dexscreener' ? (r.coin || '').slice(0, 6) + '…' : r.coin;
      return `${coin} ${HT.opLabel[r.op] || ''} ${pct ? r.value + '% trong 24h' : '$' + HT.fmt(r.value)}`;
    }
    if (r.type === 'reminder') {
      if (r.kind === 'daily') return `${HT.daysLabel(r.days)} lúc ${HT.timesOf(r).join(', ')}`;
      if (r.kind === 'lunar' && HT.lang === 'en') return HT.lunarDescEn(r, HT.timesOf(r));
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
  // 📈 rổ VN30 (dự phòng; danh sách thật lấy từ SSI mỗi lần cập nhật giá)
  VN30: ["ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB", "MSN", "MWG", "PLX", "SAB", "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"],
  // tên cửa hàng Shopee (trang trưng bày collshp.com/<tên>) để hiện @tên trên thẻ Cửa hàng
  get spName() { const m = String((HT.SP || {}).showcase || '').match(/collshp\.com\/([\w.-]+)/); return m ? m[1] : ''; },
  // mô tả lịch âm bằng tiếng Anh (giao diện English)
  lunarDescEn(r, times) {
    const nm = d => d === 30 ? 'last day of month' : d === 15 ? '15th (full moon)' : d + (d === 1 || d === 21 ? 'st' : d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : 'th');
    return `Lunar: ${[...(r.lunarDays || [])].sort((a, b) => a - b).map(nm).join(', ')}, at ${times.join(', ')}` + (r.prep && r.prep.on ? ` · reminder the day before at ${r.prep.time}` : '');
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
  // Ký hiệu coin → mã CoinGecko (coin phổ biến); coin khác thì tra CoinGecko
  CG_SYM: { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', DOGE: 'dogecoin', ADA: 'cardano', TRX: 'tron', TON: 'the-open-network',
    AVAX: 'avalanche-2', SHIB: 'shiba-inu', DOT: 'polkadot', LINK: 'chainlink', POL: 'polygon-ecosystem-token', LTC: 'litecoin', BCH: 'bitcoin-cash', NEAR: 'near',
    UNI: 'uniswap', APT: 'aptos', SUI: 'sui', ARB: 'arbitrum', OP: 'optimism', PEPE: 'pepe', WIF: 'dogwifcoin', BONK: 'bonk', FIL: 'filecoin', ATOM: 'cosmos',
    ICP: 'internet-computer', XLM: 'stellar', ETC: 'ethereum-classic', HBAR: 'hedera-hashgraph', INJ: 'injective-protocol', TIA: 'celestia', SEI: 'sei-network',
    JUP: 'jupiter-exchange-solana', RENDER: 'render-token', FET: 'fetch-ai', TAO: 'bittensor', USDT: 'tether', USDC: 'usd-coin', TRUMP: 'official-trump',
    HYPE: 'hyperliquid', ENA: 'ethena', ONDO: 'ondo-finance', WLD: 'worldcoin-wld', AAVE: 'aave', LDO: 'lido-dao', PENDLE: 'pendle', FLOKI: 'floki',
    NOT: 'notcoin', XMR: 'monero', KAS: 'kaspa', CAKE: 'pancakeswap-token', TWT: 'trust-wallet-token', PAXG: 'pax-gold' },
  cgSymOf(id) { return Object.keys(HT.CG_SYM).find(k => HT.CG_SYM[k] === id) || ''; },
  // "btc", "BTC", "bitcoin", "Bitcoin" → { id: 'bitcoin', sym: 'BTC' }
  async cgResolve(q) {
    const t = String(q || '').trim(); if (!t) return { ok: false, error: 'empty' };
    const up = t.toUpperCase().replace(/^\$/, '');
    if (HT.CG_SYM[up]) return { ok: true, id: HT.CG_SYM[up], sym: up };
    const low = t.toLowerCase(); if (HT.cgSymOf(low)) return { ok: true, id: low, sym: HT.cgSymOf(low) };
    const res = await fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(t));
    if (!res.ok) return { ok: false, error: 'CoinGecko trả lỗi ' + res.status };
    const coins = ((await res.json()).coins || []).map(c => ({ ...c, r: c.market_cap_rank || 1e9 }));
    // ưu tiên đúng ký hiệu, rồi đúng tên / mã; trong đó chọn coin vốn hoá lớn nhất
    const hit = coins.filter(c => String(c.symbol).toUpperCase() === up).sort((a, b) => a.r - b.r)[0]
      || coins.filter(c => c.id === low || String(c.name).toLowerCase() === low).sort((a, b) => a.r - b.r)[0];
    return hit ? { ok: true, id: hit.id, sym: String(hit.symbol).toUpperCase() } : { ok: false, error: 'notfound' };
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

// ---------- ©️ Bản quyền ----------
HT.OWNER = { name: 'Phan Thanh Nhật', phone: '+84 366.159.790', tel: 'tel:+84366159790', year: 2026 };
HT.COPYRIGHT = `© ${HT.OWNER.year} HaoHao · Bản quyền thuộc ${HT.OWNER.name} · ${HT.OWNER.phone}`;

// Bỏ dấu tiếng Việt để so khớp (gõ không dấu vẫn ra)
HT.fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// ---------- 🔗 Link tiếp thị (affiliate) ----------
// DÁN LINK GIỚI THIỆU CỦA BẠN VÀO ĐÂY. Để trống thì link đi thẳng tới shop, không qua affiliate.
// Trong mẫu: {url} = link gốc đã mã hoá (dùng cho deep link AccessTrade, Ecomobi…), {raw} = link gốc giữ nguyên.
//   Ví dụ AccessTrade: 'https://go.isclix.com/deep_link/MÃ_PUBLISHER/MÃ_CHIẾN_DỊCH?url={url}'
//   Ví dụ Shopee (tham số tiếp thị): '{raw}?utm_source=an_MÃ_AFFILIATE&utm_medium=affiliates&utm_campaign=haohao'
HT.AFF = {
  shopee: { host: /(^|\.)shopee\.vn$/, link: '{raw}?utm_source=an_17393130606&utm_medium=affiliates&utm_campaign=id_2luevOJq1Sb&utm_content=HaoHao----&mmp_pid=an_17393130606' },
  tiktok: { host: /(^|\.)tiktok\.com$/, link: '' },
};
// TikTok Shop không có mã chung cho mọi món: mỗi món có link riêng (vt.tiktok.com/…) lấy từ phòng trưng bày.
// Danh sách nằm trong coupons.json → "tiktok": { creator: tên TikTok, links: { mã sản phẩm: link } }
HT.TT = { creator: '', links: {} };
HT.setTikTok = t => { HT.TT = { creator: (t && t.creator) || '', links: (t && t.links) || {}, titles: (t && t.titles) || {}, images: (t && t.images) || {}, showcase: (t && t.showcase) || '' }; };
// trang trưng bày Shopee của bạn (Shopee Affiliate: collshp.com/…)
HT.SP = { showcase: '' };
HT.setShopee = t => { HT.SP = { showcase: (t && t.showcase) || '' }; };
// trang TikTok của bạn (phòng trưng bày) để giới thiệu hàng tuyển chọn
HT.ttShowcase = () => HT.TT.showcase || (HT.TT.creator ? 'https://www.tiktok.com/@' + HT.TT.creator : '');
HT.ttId = url => { const m = String(url || '').match(/\/product\/(\d{8,})|\/pdp\/(?:[^/?#]*\/)?(\d{8,})/); return m ? (m[1] || m[2]) : ''; };
HT.ttLink = url => HT.shopOf(url) === 'tiktok' ? HT.TT.links[HT.ttId(url)] || '' : '';
HT.AFF_NOTE = 'Link tiếp thị · Giá không đổi';
HT.shopOf = url => { try { const h = new URL(url).hostname; return Object.keys(HT.AFF).find(k => HT.AFF[k].host.test(h)) || ''; } catch { return ''; } };
HT.aff = url => {
  const k = HT.shopOf(url); const tpl = k && HT.AFF[k].link;
  if (!tpl) return HT.ttLink(url) || url;
  if (tpl.includes('{url}')) return tpl.replace('{url}', encodeURIComponent(url));
  if (tpl.startsWith('{raw}')) {
    // bỏ mã tiếp thị cũ trong link (của người khác) rồi gắn mã của mình
    try {
      const u = new URL(url), add = new URLSearchParams(tpl.slice(5).replace(/^\?/, ''));
      for (const k of [...u.searchParams.keys()]) if (/^(utm_|mmp_pid$|uls_trackid$|gads_t_sig$|af_|aff_|smtt$|sp_atk$|xptdk$)/i.test(k)) u.searchParams.delete(k);
      for (const [k, v] of add) u.searchParams.set(k, v);
      return u.toString();
    } catch { const rest = tpl.slice(5); return url + (url.includes('?') && rest.startsWith('?') ? '&' + rest.slice(1) : rest); }
  }
  return tpl;
};
// link này đã mang mã tiếp thị của mình chưa (vd. mở từ nút Xem của HaoHao)
HT.hasOurAff = url => { const k = HT.shopOf(url), tpl = k && HT.AFF[k].link;
  if (k === 'tiktok' && HT.TT.creator) { try { return new URL(url).searchParams.get('unique_id') === HT.TT.creator; } catch { return false; } }
  if (!tpl || !tpl.startsWith('{raw}')) return false;
  try { const u = new URL(url), want = new URLSearchParams(tpl.slice(5).replace(/^\?/, '')); return want.has('utm_source') && u.searchParams.get('utm_source') === want.get('utm_source'); } catch { return false; } };
HT.isAff = url => { const k = HT.shopOf(url); return !!(k && HT.AFF[k].link) || !!HT.ttLink(url); };
HT.SHOPS = [
  { id: 'shopee', label: 'Shopee', search: 'https://shopee.vn/search?keyword=' },
  { id: 'tiktok', label: 'TikTok Shop', search: 'https://www.tiktok.com/search?q=' }
];
HT.shopSearch = (id, q) => { const s = HT.SHOPS.find(x => x.id === id) || HT.SHOPS[0]; return HT.aff(s.search + encodeURIComponent(q)); };
// ---------- 🎟️ Mã giảm giá ----------
// Kho mã của bạn: sửa file haohao-extension/coupons.json trên GitHub, mọi người dùng tự nhận mã mới (1 giờ/lần), không cần ra bản mới.
// 🔎 Máy chủ soi sản phẩm (Cloudflare Worker của chủ app): giữ khoá AccessTrade/RioHub, trả danh sách hàng Shopee + TikTok.
//   Để trống = tắt (ô tìm mở thẳng Shopee như cũ). Điền link worker, vd 'https://haohao-api.<tên>.workers.dev'
// ⭐ V1.65: HaoHao Pro – 2 tháng đầu mở khoá toàn bộ; sau đó Tiện ích + Dự án cần mã kích hoạt (ký Ed25519 trên máy chủ app, gắn mã máy)
HT.PRO = {
  pub: 'XU118CDS/gQLwdRGEBoxlYlpKaT+f/ciLIjIIb6Hoyc=', trialDays: 60,
  plans: [['m1', '1 tháng', 20000, 30], ['m3', '3 tháng', 50000, 90], ['m6', '6 tháng', 90000, 180], ['y1', '1 năm', 199000, 365], ['life', 'Trọn đời', 499000, 0]],
  bank: { name: 'BIDV', bin: '970418', acc: '8889763829', owner: 'PHAN THANH NHAT' }   // BIDV – PGD Cẩm Lệ
};
HT.machineCode = id => 'HH-' + String(id || '').slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-');
// mã QR chuyển khoản VietQR (chuẩn NAPAS/EMVCo) – app ngân hàng nào cũng quét được
HT.vietQR = (bin, acc, amount, note) => {
  const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const acct = f('00', 'A000000727') + f('01', f('00', bin) + f('01', acc)) + f('02', 'QRIBFTTA');
  let s = f('00', '01') + f('01', amount ? '12' : '11') + f('38', acct) + f('53', '704') + (amount ? f('54', String(amount)) : '') + f('58', 'VN') + (note ? f('62', f('08', note)) : '') + '6304';
  let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
  return s + c.toString(16).toUpperCase().padStart(4, '0');
};
HT.STORE = true;   // V1.78: chỉ còn 1 bản = bản Chrome Web Store (bản cài tay lưu ở nhánh ban-cai-tay-V1.77)
HT.AFF_NOTE = 'Trong cửa hàng HaoHao có link tiếp thị, giá không đổi so với khi bạn tự mua sắm.';
HT.SPY_API = 'https://haohao-gia.nhatphan79.workers.dev';   // 1.10.250: khách dùng Soi sản phẩm luôn, khoá nằm trên máy chủ
// 🧾 Máy chủ kho giá chung (1.10.122): mọi máy HaoHao gửi mã sản phẩm + giá (không thông tin cá nhân) → khách mới mở món là thấy lịch sử giá. Để trống = tắt.
HT.FANPAGE = 'https://www.facebook.com/trolyHaoHao';   // fanpage HaoHao (dự phòng nếu coupons.json chưa có 'fanpage')
HT.PRICE_API = 'https://haohao-gia.nhatphan79.workers.dev';
// 🛡️ V1.82: trang không chặn quảng cáo – mặc định (không xoá được) + trang người dùng tự thêm (settings.adSkip)
HT.AD_SKIP_DEF = ['haohaostore.com', 'haohao-gia.nhatphan79.workers.dev'];
HT.adHost = v => { let h = String(v || '').trim().toLowerCase(); try { if (/^[a-z]+:\/\//.test(h)) h = new URL(h).hostname; } catch {} h = h.replace(/^\*\./, '').replace(/^www\./, '').replace(/[/?#:].*$/, ''); return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : ''; };
HT.adSkipList = s => [...new Set([...HT.AD_SKIP_DEF, ...((s && s.adSkip) || []).map(HT.adHost).filter(Boolean)])];
HT.adSkipHit = (host, s) => { host = String(host || '').replace(/^www\./, ''); return !!host && HT.adSkipList(s).some(h => host === h || host.endsWith('.' + h)); };
HT.SPY_TOKEN = '';   // trùng APP_TOKEN trên Cloudflare (nếu có đặt)
HT.COUPON_FEED = 'https://raw.githubusercontent.com/nhatphan79/nhatphan79/HEAD/haohao-extension/coupons.json'   // HEAD = nhánh chính của kho, tên gì cũng được;
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
// ---------- ✅ Có đúng là CÙNG MỘT sản phẩm không? ----------
// Chỉ khi qua hết các cửa dưới đây mới được coi là "shop khác bán cùng món":
// cùng loại hàng, cùng thương hiệu, cùng mã model, cùng dung lượng/khối lượng, cùng số lượng trong gói,
// không lệch thuộc tính chính (nam/nữ, dài/ngắn, jean/kaki…) và tên giống nhau đủ nhiều.
const SP_BRANDS = ['apple', 'iphone', 'ipad', 'macbook', 'airpods', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'poco', 'oppo', 'vivo', 'realme', 'huawei', 'honor', 'nokia', 'sony', 'jbl', 'marshall', 'bose', 'anker', 'baseus', 'ugreen', 'remax', 'hoco', 'logitech', 'razer', 'dareu', 'asus', 'acer', 'dell', 'lenovo', 'msi', 'lg', 'panasonic', 'philips', 'sharp', 'toshiba', 'electrolux', 'sunhouse', 'kangaroo', 'tefal', 'elmich', 'lock&lock', 'locknlock', 'casio', 'nike', 'adidas', 'puma', 'converse', 'vans', 'uniqlo', 'loreal', 'cerave', 'bioderma', 'innisfree', 'senka', 'hada labo', 'la roche posay', 'cocoon', 'maybelline', 'romand', '3ce', 'garnier', 'nivea', 'vaseline', 'dove', 'colgate', 'omo', 'downy', 'comfort', 'ariel', 'vinamilk', 'nestle', 'milo', 'enfa', 'similac', 'huggies', 'bobby', 'merries', 'moony', 'pampers'];
const SP_GROUPS = [
  ['nam', 'nu', 'be trai', 'be gai', 'tre em'],
  ['dai', 'ngan', 'short', 'lung'],
  ['tay dai', 'tay ngan', 'sat nach', 'ba lo'],
  ['jean', 'kaki', 'tay', 'thun', 'ni', 'len', 'lanh', 'kate', 'jogger', 'da', 'dui'],
  ['ong rong', 'ong suong', 'ong dung', 'ong loe', 'ong con', 'skinny', 'baggy'],
  ['co tron', 'co tim', 'co be', 'co lo', 'co tru', 'hoodie', 'polo'],
  ['co day', 'khong day', 'bluetooth'],
  ['nguoi lon', 'tre em', 'so sinh'],
];
const SP_STOP = new Set('co ban dep chuan form gia re han quoc cao cap thoi trang phong cach sieu xinh basic hang loai xuong mau nhieu mem min tot ben hot trend si le nhe ca tinh tre trung cho va the cua voi sale shop store official chinh sang chanh ulzzang style kieu moi nam nay 2024 2025 2026 sieu'.split(' '));
const SP_SYN = [[/\bjeans\b/g, 'jean'], [/\bbo\b(?= |$)/g, 'bo'], [/\bquan short\b/g, 'quan ngan'], [/\bunisex\b/g, 'nam nu'], [/\bwireless\b/g, 'khong day'], [/\btrue wireless\b|\btws\b/g, 'khong day']];
const spNorm = s => { let f = ' ' + HT.fold(HT.cleanTitle(s)).replace(/\d+(?:[.,]\d+)? ?%/g, ' ').replace(/[^a-z0-9.&]+/g, ' ') + ' '; for (const [r, t] of SP_SYN) f = f.replace(r, t); return f.replace(/\s+/g, ' '); };
const spHas = (f, w) => new RegExp('(^| )' + w.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&') + '(?= |$)').test(f);
// thông số có đơn vị: 128gb, 500ml, 1.5l, 20000mah, 65w… → { gb:['128'], ml:['500'] }
const SP_UNITS = { gb: 'gb', g: 'g', tb: 'tb', mah: 'mah', w: 'w', ml: 'ml', l: 'l', lit: 'l', kg: 'kg', gr: 'g', gram: 'g', inch: 'inch', hz: 'hz', btu: 'btu', vien: 'vien', goi: 'goi', mieng: 'mieng' };
const spSpecs = f => { const o = {}; for (const m of f.matchAll(/(?:^| )(\d+(?:[.,]\d+)?) ?(gb|tb|mah|ml|lit|l|kg|gr|gram|g|w|inch|hz|btu|vien|goi|mieng)(?= |$)/g)) { const u = SP_UNITS[m[2]], v = String(parseFloat(m[1].replace(',', '.'))); (o[u] = o[u] || new Set()).add(v); } return o; };
// số lượng trong gói: combo 2, set 3, bộ 5, x2, 2 đôi, hộp 10 cái… (không ghi = 1)
const spQty = f => { const m = f.match(/(?:^| )(?:combo|set|bo|loc|pack|hop|tui) ?(\d{1,3})(?= |$)|(?:^| )x ?(\d{1,2})(?= |$)|(?:^| )(\d{1,3}) ?(?:cai|chiec|doi|cuon|chai|lon|hop|tuyp)(?= |$)/); const n = m ? +(m[1] || m[2] || m[3]) : 1; return n > 0 && n < 500 ? n : 1; };
HT.sameProduct = (a, b) => {
  const no = why => ({ same: false, sim: 0, why });
  const fa = spNorm(a), fb = spNorm(b), ra = HT.fold(a), rb = HT.fold(b);
  if (ACC.test(rb) !== ACC.test(ra)) return no('phụ kiện khác món');
  // thương hiệu: tên gốc có thì món kia phải có, và không được là hãng khác
  const ba = SP_BRANDS.filter(x => spHas(fa, x)), bb = SP_BRANDS.filter(x => spHas(fb, x));
  if (ba.length && !ba.some(x => bb.includes(x))) return no('khác thương hiệu');
  if (bb.some(x => !ba.includes(x)) && ba.length) { if (!bb.every(x => ba.includes(x) || ['iphone', 'galaxy', 'redmi', 'poco', 'ipad', 'airpods', 'macbook'].includes(x))) return no('khác thương hiệu'); }
  // mã model phải khớp đúng (X20 ≠ X200)
  // (món kia không ghi mã nào thì có thể chỉ là mã riêng của shop → vẫn xét, nhưng đòi tên giống hơn)
  const hasCode = (code, raw) => new RegExp('(^|[^a-z0-9])' + HT.fold(code).replace(/-/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![0-9a-z])').test(raw.replace(/-/g, ''));
  const m = HT.modelOf(a), mb = HT.modelOf(b);
  const noCode = m && !hasCode(m, rb);
  if (noCode && mb && !hasCode(mb, ra)) return no('khác mã model');
  // dung lượng, khối lượng, công suất… cùng đơn vị thì phải trùng
  const sa = spSpecs(fa), sb = spSpecs(fb);
  for (const u in sa) if (sb[u] && ![...sa[u]].some(v => sb[u].has(v))) return no('khác dung lượng/khối lượng');
  for (const u of ['gb', 'tb', 'ml', 'l', 'kg', 'mah']) if (sa[u] && !sb[u] && !(u === 'l' && sb.ml) && !(u === 'ml' && sb.l)) return no('không ghi rõ dung lượng');
  if (spQty(fa) !== spQty(fb)) return no('khác số lượng trong gói');
  // số trần trong tên (Buds 4, Series 9, 2 lớp…) phải có đủ ở món kia
  const nums = f => new Set([...f.matchAll(/(?:^| )(\d{1,4})(?= |$)(?! (?:mau|size|kieu|kich|sao))/g)].map(x => String(+x[1])));
  const na = nums(fa), nb = nums(fb);
  if ([...na].some(n => !nb.has(n))) return no('khác số hiệu');
  // phiên bản: Pro / Lite / Max / Plus / Mini / Ultra / SE phải y hệt nhau
  const ver = f => ['pro', 'lite', 'max', 'plus', 'mini', 'ultra', 'se', 'fe', 'neo'].filter(w => spHas(f, w)).join();
  if (ver(fa) !== ver(fb)) return no('khác phiên bản');
  // thuộc tính chính không được lệch nhau
  for (const g of SP_GROUPS) {
    const ga = g.filter(w => spHas(fa, w)), gb = g.filter(w => spHas(fb, w));
    if (ga.length && gb.length && !ga.some(w => gb.includes(w))) return no('khác loại (' + ga[0] + ' / ' + gb[0] + ')');
  }
  // loại hàng: 2 chữ đầu của tên (quần jean, áo thun, tai nghe…) phải có trong món kia
  const wa = fa.trim().split(' ').filter(w => w.length > 1 && !ba.includes(w)), wb = new Set(fb.trim().split(' '));
  if (!wa.length) return no('không đọc được tên');
  if (!wa.slice(0, 2).every(w => wb.has(w))) return no('khác loại hàng');
  // độ giống: phần lớn chữ chính của tên gốc có trong món kia, và ngược lại
  // bỏ chữ quảng cáo (đẹp, chuẩn, cao cấp, Hàn Quốc…) khi so, chỉ so chữ nói lên món hàng
  const key = w => w.length > 1 && !SP_STOP.has(w);
  const ka = [...new Set(wa.filter(key))].slice(0, 12), kb = [...new Set(fb.trim().split(' ').filter(key))].slice(0, 12), sa2 = new Set(fa.trim().split(' '));
  if (!ka.length) return no('không đọc được tên');
  const fwd = ka.filter(w => wb.has(w)).length / ka.length, back = kb.length ? kb.filter(w => sa2.has(w)).length / kb.length : 0;
  const sim = Math.round((fwd * 0.65 + back * 0.35) * 100) / 100;
  if (fwd < (noCode ? 0.8 : 0.7) || back < 0.45) return { same: false, sim, why: noCode ? 'khác mã model' : 'tên khác nhiều' };
  return { same: true, sim, why: '' };
};
// ---------- 🔎 Tìm sản phẩm ----------
HT.PRICE_RANGES = { lt100: [0, 100000], '100-300': [100000, 300000], gt300: [300000, Infinity] };
// trang tìm kiếm Shopee theo độ liên quan, kèm khoảng giá nếu có
HT.shopeeFindUrl = (q, range) => {
  const r = HT.PRICE_RANGES[range];
  return 'https://shopee.vn/search?keyword=' + encodeURIComponent(q) + (r ? (r[0] ? '&minPrice=' + r[0] : '') + (r[1] < Infinity ? '&maxPrice=' + r[1] : '') : '');
};
// tên món có đúng thứ người dùng tìm không (đủ ~70% chữ của từ khoá, không lạc sang phụ kiện)
HT.matchQuery = (q, title) => {
  const wq = [...new Set(HT.fold(q).split(/[^a-z0-9]+/).filter(w => w.length > 1))];
  if (!wq.length) return true;
  const ft = HT.fold(title);
  if (ACC.test(ft) && !ACC.test(HT.fold(q))) return false;
  const wt = new Set(ft.split(/[^a-z0-9]+/));
  return wq.filter(w => wt.has(w)).length >= Math.ceil(wq.length * 0.7);
};
// từ khoá hay được tìm, để gợi ý khi đang gõ
HT.HOT_KEYWORDS = ('tai nghe bluetooth|tai nghe có dây|tai nghe chụp tai|tai nghe gaming|loa bluetooth|sạc dự phòng|củ sạc nhanh|cáp sạc type c|cáp sạc iphone|ốp lưng iphone|kính cường lực|chuột không dây|bàn phím cơ|bàn phím không dây|lót chuột|giá đỡ điện thoại|đồng hồ thông minh|camera wifi|ổ cắm điện|đèn ngủ|đèn học|quạt mini|quạt tích điện|' +
  'quần jean nam|quần jean nữ|quần short nam|quần tây nam|quần ống rộng nữ|áo thun nam|áo thun nữ|áo polo nam|áo sơ mi nam|áo sơ mi nữ|áo khoác nam|áo khoác nữ|áo hoodie|áo len|váy nữ|đầm công sở|đồ bộ nữ|đồ ngủ|đồ lót nữ|quần lót nam|tất vớ|' +
  'giày thể thao nam|giày thể thao nữ|giày sneaker|dép nam|dép nữ|sandal nữ|giày cao gót|túi xách nữ|balo laptop|balo đi học|ví nam|thắt lưng nam|mũ lưỡi trai|kính mát|đồng hồ nam|đồng hồ nữ|' +
  'sữa rửa mặt|kem chống nắng|serum vitamin c|toner|kem dưỡng ẩm|tẩy trang|son môi|phấn phủ|kem nền|mặt nạ|dầu gội|sữa tắm|kem đánh răng|bàn chải điện|nước hoa nữ|nước hoa nam|lăn khử mùi|máy sấy tóc|máy cạo râu|' +
  'nồi chiên không dầu|nồi cơm điện|ấm siêu tốc|máy xay sinh tố|bếp từ|chảo chống dính|bộ nồi|hộp đựng thực phẩm|bình giữ nhiệt|máy hút bụi|robot hút bụi|cây lau nhà|móc treo quần áo|giá phơi đồ|chăn ga gối|gối ngủ|nệm|rèm cửa|' +
  'tã bỉm|sữa bột|bình sữa|xe đẩy em bé|đồ chơi trẻ em|quần áo trẻ em|' +
  'bánh tráng|đồ ăn vặt|cà phê|trà|hạt dinh dưỡng|nước giặt|nước xả vải|nước rửa chén|giấy vệ sinh|khăn giấy|' +
  'thức ăn cho mèo|cát vệ sinh cho mèo|thức ăn cho chó|vợt cầu lông|thảm tập yoga|tạ tay|dây nhảy|bình nước thể thao').split('|');
HT.suggest = (q, hist = [], n = 6) => {
  const f = HT.fold(q).trim(); if (!f) return hist.slice(0, n).map(t => ({ t, hist: true }));
  const out = [], has = t => out.some(x => HT.fold(x.t) === HT.fold(t));
  for (const t of hist) if (HT.fold(t).includes(f) && !has(t)) out.push({ t, hist: true });
  for (const t of HT.HOT_KEYWORDS) if (HT.fold(t).startsWith(f) && !has(t)) out.push({ t });
  for (const t of HT.HOT_KEYWORDS) if ((' ' + HT.fold(t)).includes(' ' + f) && !has(t)) out.push({ t });
  return out.slice(0, n);
};
// Món trong danh sách TikTok của bạn giống món/từ khoá đang xem (cùng loại hàng, không lệch nam/nữ, trẻ em…)
HT.related = (text, n = 2, skipId = '') => {
  const fa = spNorm(text), wa = fa.trim().split(' ').filter(w => w.length > 1 && !SP_STOP.has(w));
  if (!wa.length) return [];
  const out = [];
  for (const [id, title] of Object.entries(HT.TT.titles || {})) {
    if (id === skipId || !HT.TT.links[id]) continue;
    const fb = spNorm(title), wb = new Set(fb.trim().split(' '));
    if (!wb.has(wa[0])) continue;                                   // khác loại hàng (quần ≠ áo)
    if (SP_GROUPS.some(g => { const ga = g.filter(w => spHas(fa, w)), gb = g.filter(w => spHas(fb, w)); return ga.length && gb.length && !ga.some(w => gb.includes(w)); })) continue;
    const sc = wa.filter(w => wb.has(w)).length / Math.min(wa.length, 8);
    if (sc >= 0.35) out.push({ id, title, url: HT.TT.links[id], image: (HT.TT.images || {})[id] || '', sc });
  }
  return out.sort((a, b) => b.sc - a.sc).slice(0, n);
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
// ---------- 🏷️ Thương hiệu + loại hàng (cho "HaoHao chọn" ở trang Sản phẩm tương tự) ----------
// Thương hiệu: hãng quen trong SP_BRANDS, hoặc chữ IN HOA đầu tiên trong tên (TORANO, ROWAY…) không phải chữ chung chung.
const BR_GENERIC = new Set(('AO QUAN POLO COLLAR TEE SHIRT TSHIRT BASIC CLASSIC SMART PREMIUM COTTON WAFFLE PIQUE OVERSIZE OVERSIZED LOCAL BRAND UNISEX FORM SIZE ' +
  'MALL BEST SELLER HOT NEW SALE FREESHIP COMBO SET VIP PRO MAX PLUS MINI LITE ULTRA SLIM FIT REGULAR STYLE SPORT SPORTS COOL COOLMAX AIRCOOL DRY EXTRA ' +
  'OFFICIAL STORE SHOP CHINH HANG TOP XTRA VOUCHER LOGO MAN MEN WOMEN NAM NU KIDS CO BE TAY NGAN DAI VAI THUN JEAN KAKI DEAL GIAM GIA SIEU XU LY THANH').split(' '));
HT.brandOf = title => {
  const f = spNorm(title), known = SP_BRANDS.find(x => spHas(f, x));
  if (known) return known;
  const raw = HT.cleanTitle(title), letters = raw.replace(/[^\p{L}]/gu, '');
  if (letters && letters.replace(/[^\p{Lu}]/gu, '').length / letters.length > 0.6) return '';   // cả tên viết hoa: không đoán được hãng
  for (const w of raw.split(/[\s,.;:/|+&()-]+/)) {
    const u = w.replace(/^[^\p{L}]+|[^\p{L}0-9]+$/gu, '');
    if (u.length < 3 || /\d/.test(u) || u !== u.toUpperCase() || u === u.toLowerCase()) continue;
    const k = HT.fold(u);
    if (!BR_GENERIC.has(k.toUpperCase())) return k;
  }
  return '';
};
HT.hasBrand = (title, brand) => !!brand && spHas(spNorm(title), brand);
// Cùng loại hàng: 2 chữ đầu của tên gốc (áo polo, quần jean…) có trong món kia, cùng số lượng trong gói (không combo),
// không phải phụ kiện, không lệch thuộc tính chính (nam/nữ, tay dài/ngắn…)
HT.sameKind = (a, b) => {
  const fa = spNorm(a), fb = spNorm(b);
  if (ACC.test(HT.fold(a)) !== ACC.test(HT.fold(b))) return false;
  if (spQty(fa) !== spQty(fb)) return false;
  for (const g of SP_GROUPS) {
    const ga = g.filter(w => spHas(fa, w)), gb = g.filter(w => spHas(fb, w));
    if (ga.length && gb.length && !ga.some(w => gb.includes(w))) return false;
  }
  const head = fa.trim().split(' ').filter(w => w.length > 1 && !SP_STOP.has(w)).slice(0, 2);
  return head.length > 0 && head.every(w => spHas(fb, w));
};
// 🏠 Công việc của tác giả (hiện trong bong bóng suy nghĩ 16:30–17:00, mỗi ngày 1 lần, 5 phút tự tắt)
HT.WORK_AD = { text: 'Xây nhà phố trọn gói Huế · Đà Nẵng · Quảng Nam', who: 'KS Nhật +84 366.159.790', phone: '+84 366.159.790', url: 'https://zalo.me/0366159790' };
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
    else if (day === 1) name = `Sale mở màn 1.${mon}`;
    else if (day === 10 || day === 20) name = `Ngày hội thành viên ${day}.${mon}`;
    else if (day === 15) name = `Sale giữa tháng 15.${mon}`;
    else if (day === 25) name = `Sale lương về 25.${mon}`;
    if (name) out.push({ name, date: d, big, days: i });
  }
  return out;
};

// ---------- 📉 Nhận xét giá từ lịch sử 30 ngày ----------
// ❤️ Đã lưu: ghi giá mới cho 1 món, trả về sự kiện nếu đáng báo
// 'target' = chạm giá khách đặt; 'deal' = rẻ hơn lúc lưu ≥5% và là giá thấp nhất từ lúc lưu (mỗi mức giá chỉ báo 1 lần)
HT.SAVE_MAX = 10;   // V1.4: 5 → 10 món
// 🎵 nhạc nền đóng gói sẵn trong tiện ích (thư mục music/, tự lặp lại khi phát)
HT.BUILTIN_MUSIC = [
  { id: 'piano', name: 'Piano nhẹ', url: 'music/piano.ogg' },
  { id: 'study', name: 'Study with me', url: 'music/study.ogg' },
  { id: 'nen', name: 'Nhạc nền', url: 'music/nen.ogg' }
];
HT.applyPrice = (it, price, out) => {
  const now = Date.now(); it.history = it.history || [];
  // 1.10.154: hết hàng → ghi nhận, chưa báo; có hàng lại → 'back'; tăng ≥10% so với lần trước → 'up' (7 ngày báo 1 lần)
  if (out) { if (!it.out) { it.out = true; it.outAt = now; } it.checked = now; return null; }
  const wasOut = !!it.out, prev = it.price; it.out = false;
  const last = it.history[it.history.length - 1];
  if (!last || last.p !== price || now - last.t > 6 * 3600e3) it.history.push({ t: now, p: price });
  it.history = it.history.slice(-60);
  const lowBefore = it.low || it.saved || price;
  it.price = price; it.low = Math.min(lowBefore, price); it.checked = now; it.upd = now;
  let ev = null;
  if (it.target && price <= it.target) { if (!it.hit) { it.hit = true; ev = 'target'; } } else if (it.target) it.hit = false;
  const pct = it.saved ? (it.saved - price) / it.saved : 0;
  if (!ev && pct >= 0.05 && price <= lowBefore && price < (it.dealPrice || Infinity)) ev = 'deal';
  if (ev) { it.dealPrice = price; it.dealNew = ev; }
  if (it.saved && price >= it.saved) it.dealNew = false;   // giá lên lại: thôi báo
  if (!ev && wasOut) ev = 'back';
  if (!ev && prev && price >= prev * 1.1 && !(it.upAt && now - it.upAt < 7 * 864e5)) { ev = 'up'; it.upAt = now; }
  return ev;
};
// 📏 Gợi ý size (1.10.154): đọc bảng size shop ghi bằng chữ (vd "M: 45-52kg", "L (52-60kg) 1m60-1m70") → size hợp cân nặng / chiều cao
HT.sizeRows = text => {
  const out = [], seen = new Set();
  const SZ = '(XXXXL|XXXL|XXL|XL|XS|S|M|L|[2-6]XL|\\d{1,2}XL|FREESIZE|Free ?size|\\d{2,3})';
  const re = new RegExp('(?:^|[\\s,;|(\\[])(?:size[ \\t]*)?' + SZ + '(?![A-Za-zÀ-ỹ])[ \\t]*[:：\\-–=)\\]]?\\s*(?:[^\\n\\d]{0,14})?(\\d{2,3}(?:[.,]\\d)?)\\s*(?:kg)?\\s*(?:-|–|~|đến|tới|to)\\s*(\\d{2,3}(?:[.,]\\d)?)\\s*kg([^\\n]{0,40})', 'gim');
  for (const m of String(text || '').matchAll(re)) {
    const size = m[1].toUpperCase().replace(/\s/g, ''), lo = parseFloat(m[2].replace(',', '.')), hi = parseFloat(m[3].replace(',', '.'));
    if (!(lo > 2 && hi > lo && hi < 200)) continue;
    const h = (m[4] || '').match(/(\d)m(\d{2})\s*(?:-|–|~|đến)\s*(\d)m(\d{2})|(\d{2,3})\s*(?:cm)?\s*(?:-|–|~|đến)\s*(\d{2,3})\s*cm/i);
    const hLo = h ? (h[1] ? +h[1] * 100 + +h[2] : +h[5]) : 0, hHi = h ? (h[3] ? +h[3] * 100 + +h[4] : +h[6]) : 0;
    const key = size + lo + hi; if (seen.has(key)) continue; seen.add(key);
    out.push({ size, lo, hi, hLo, hHi });
  }
  return out;
};
HT.sizeTable = text => {
  const t = String(text || ''), i = t.search(/Hướng Dẫn Chọn Size|Số đo sản phẩm|Bảng quy đổi kích cỡ/i); if (i < 0) return [];
  const tk = t.slice(i, i + 4000).split(/[\n\t]+/).map(x => x.trim()).filter(Boolean);
  const SZ = /^(XXXXXL|XXXXL|XXXL|XXL|XL|XS|S|M|L|[2-7]XL|FREE ?SIZE|Freesize|\d{1,3})$/i, RG = /^(\d{2,3}(?:[.,]\d)?)\s*[-–~]\s*(\d{2,3}(?:[.,]\d)?)$/;
  const h = tk.findIndex(x => /^Size\b/i.test(x)); if (h < 0) return [];
  const heads = []; let j = h;
  for (; j < tk.length && j < h + 12; j++) { if (j > h && SZ.test(tk[j])) break; if (/^\(.*\)$/.test(tk[j]) && heads.length) heads[heads.length - 1] += ' ' + tk[j]; else heads.push(tk[j]); }
  const n = heads.length, hc = heads.findIndex(x => /cao|height/i.test(x)), wc = heads.findIndex(x => /nặng|weight|kg/i.test(x));
  if (n < 2 || wc < 0) return [];
  const out = [];
  for (; j + n - 1 < tk.length && SZ.test(tk[j]); j += n) {
    const row = tk.slice(j, j + n), w = (row[wc] || '').match(RG), hh = hc >= 0 ? (row[hc] || '').match(RG) : null;
    if (!w) break;
    out.push({ size: row[0].toUpperCase().replace(/\s/g, ''), lo: parseFloat(w[1].replace(',', '.')), hi: parseFloat(w[2].replace(',', '.')), hLo: hh ? +hh[1] : 0, hHi: hh ? +hh[2] : 0 });
  }
  return out;
};
// chọn size: theo cân nặng và chiều cao; 2 cách ra 2 size khác nhau thì trả cả 2
HT.pickSize2 = (rows, kg, cm) => {
  if (!rows.length || !(kg > 0)) return null;
  const inW = rows.filter(r => kg >= r.lo && kg <= r.hi), inH = cm > 0 ? rows.filter(r => r.hLo && cm >= r.hLo && cm <= r.hHi) : [];
  const both = inW.filter(r => inH.includes(r));
  if (both.length) return { size: both[both.length - 1].size, row: both[both.length - 1], ok: true };
  const w = inW[inW.length - 1], hgt = inH[inH.length - 1];
  if (w && hgt) return { size: w.size, alt: hgt.size, row: w, ok: true, why: `cân nặng hợp ${w.size}, chiều cao hợp ${hgt.size}` };
  if (w || hgt) return { size: (w || hgt).size, row: w || hgt, ok: true };
  const near = rows.slice().sort((a, b) => Math.min(Math.abs(kg - a.lo), Math.abs(kg - a.hi)) - Math.min(Math.abs(kg - b.lo), Math.abs(kg - b.hi)))[0];
  return { size: near.size, row: near, ok: false };
};
HT.pickSize = (rows, kg, cm) => {
  if (!rows.length || !(kg > 0)) return null;
  const fit = rows.filter(r => kg >= r.lo && kg <= r.hi);
  const byH = list => cm > 0 ? list.slice().sort((a, b) => ((a.hLo && cm >= a.hLo && cm <= a.hHi) ? 0 : 1) - ((b.hLo && cm >= b.hLo && cm <= b.hHi) ? 0 : 1)) : list;
  if (fit.length) { const f = byH(fit); return { row: f[f.length > 1 && !(cm > 0) ? f.length - 1 : 0], exact: true, between: fit.length > 1 }; }
  const near = rows.slice().sort((a, b) => Math.min(Math.abs(kg - a.lo), Math.abs(kg - a.hi)) - Math.min(Math.abs(kg - b.lo), Math.abs(kg - b.hi)))[0];
  return { row: near, exact: false };
};
HT.dropPct = it => it.saved && it.price < it.saved ? Math.round((it.saved - it.price) / it.saved * 100) : 0;
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

// ---------- 🧾 Mua không hớ (1.10.115): sổ giá mọi món đã xem + nhận xét đáy giá / sale ảo ----------
// Không cố "giảm thêm": nói thật giá này có hớ không, sale có ảo không. Dữ liệu = các lần khách xem món (lưu trên máy khách).
HT.PLOG_MAX = 400;
HT.plogAdd = (log, key, price, before, now = Date.now()) => {
  if (!key || !(price > 0)) return log;
  const e = log[key] || (log[key] = { t0: now, pts: [] });
  const last = e.pts[e.pts.length - 1], b = before > price ? before : 0;
  if (!last || last.p !== price || now - last.t > 6 * 3600e3) e.pts.push({ t: now, p: price, b });
  else if (b) last.b = b;
  e.pts = e.pts.filter(x => now - x.t <= 90 * 864e5).slice(-80); e.at = now;
  const ks = Object.keys(log);
  if (ks.length > HT.PLOG_MAX) ks.sort((a, c) => (log[a].at || 0) - (log[c].at || 0)).slice(0, ks.length - HT.PLOG_MAX).forEach(k => delete log[k]);
  return log;
};
// pts [{t,p}] cũ → mới (gồm cả lần xem này); cur = giá đang hiện; before = giá gạch ngang Shopee ghi
HT.priceTruth = (pts, cur, before = 0, now = Date.now()) => {
  const D = 864e5, P = (pts || []).filter(x => x.p > 0 && now - x.t <= 30 * D).sort((a, c) => a.t - c.t);
  const dm = t => { const d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1); };
  const k = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '').replace('.', ',') + 'tr' : Math.round(n / 1000) + 'k';
  const first = P.length ? P[0].t : now, span = Math.round((now - first) / D);
  const older = P.filter(x => now - x.t > 3600e3);   // bỏ chính lần xem này
  const lo = older.length ? Math.min(...older.map(x => x.p)) : 0, hi = older.length ? Math.max(...older.map(x => x.p)) : 0;
  const loAt = lo ? older.find(x => x.p === lo).t : 0;
  const days = span >= 28 ? '30' : String(Math.max(1, span));
  // ⚠ sale ảo: giá gốc gạch ngang cao hơn hẳn mọi mức đã thấy
  if (before > cur && hi && span >= 3 && before > Math.max(hi, cur) * 1.15)
    return { cls: 'bad', icon: '⚠', head: `Sale ảo: giá gốc ${k(before)} chưa từng có`, sub: `${days} ngày qua món này cao nhất chỉ ${k(Math.max(hi, cur))}. Mức giảm thật ${Math.max(0, Math.round((1 - cur / Math.max(hi, cur)) * 100))}%, không phải ${Math.round((1 - cur / before) * 100)}%` };
  // ⚠ đẩy giá trước sale lớn
  const sale = HT.saleDays(new Date(now), 6).find(x => x.big && x.days <= 10);
  const up = older.some((x, i) => i && now - x.t <= 14 * D && x.p > older[i - 1].p * 1.05);
  // 1.10.173: "bắt quả tang" dọn đường sale ảo – sắp sale lớn mà giá vừa bị đẩy lên
  const recentLo = older.filter(x => now - x.t <= 21 * D).reduce((m, x) => Math.min(m, x.p), Infinity);
  if (sale && recentLo < Infinity && cur >= recentLo * 1.08 && (up || cur >= recentLo * 1.12)) {
    const pct = Math.round((cur / recentLo - 1) * 100), loT = older.find(x => x.p === recentLo && now - x.t <= 21 * D).t;
    return { cls: 'bad', icon: '🚨', head: sale.days ? `Còn ${sale.days} ngày nữa ${sale.name} mà giá vừa tăng ${pct}%` : `Hôm nay ${sale.name} mà giá vừa tăng ${pct}%`,
      sub: `Shop đang đẩy giá chờ sale: ngày ${dm(loT)} chỉ ${k(recentLo)}, giờ ${k(cur)} (+${k(cur - recentLo)}). Đừng mua lúc này, để HaoHao canh giá giúp` };
  }
  if (lo && sale && up && cur > lo * 1.05)
    return { cls: 'bad', icon: '⚠', head: `Bị đẩy giá trước ${sale.name}`, sub: `Ngày ${dm(loAt)} chỉ ${k(lo)}, giờ ${k(cur)} (+${k(cur - lo)}). Đừng vội, để HaoHao canh giá giúp` };
  if (!lo || span < 1) return { cls: 'new', icon: '🔔', head: 'Bấm Canh giá để HaoHao canh mỗi khi giá giảm', sub: '' };
  if (cur <= lo * 1.005) return { cls: 'good', icon: '✓', head: span >= 28 ? 'Giá này đã là đáy 30 ngày' : `Giá thấp nhất từ ${dm(first)} đến nay`, sub: 'Mua không hớ. Giá đã đáy thì để HaoHao canh, giảm nữa là báo' };
  return { cls: 'warn', icon: '📉', head: `Ngày ${dm(loAt)} từng chỉ ${k(lo)}`, sub: `Giờ đắt hơn ${k(cur - lo)}. Để HaoHao canh, về lại giá cũ là báo` };
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
  // đã đọc toàn bộ đánh giá (gồm hết 1–2★): trừ điểm theo tỉ lệ lời chê trên tổng số đánh giá
  const fr = info.fullRead, rvAll = info.reviews;
  if (fr && rvAll) {
    if (rvAll.issues.length) {
      const share = rvAll.bad / Math.max(info.ratingCount || 0, rvAll.read);
      const top = rvAll.issues.slice(0, 3).map(i => `${i.label.toLowerCase()} (${i.n})`).join(', ');
      // càng nhiều người chê càng trừ nặng: 1/5 người mua chê thì gần như chắc chắn có vấn đề
      const pts = share >= 0.2 ? -35 : share >= 0.1 ? -22 : share >= 0.05 ? -12 : share >= 0.02 ? -6 : -3;
      add(product, pts, share >= 0.05 ? 'bad' : 'warn', `${rvAll.bad} đánh giá chê (${(share * 100).toFixed(share < 0.01 ? 1 : 0)}%): ${top}`);
    } else add(product, 3, 'ok', `Đọc ${rvAll.read} đánh giá: không thấy lời chê`);
  }
  const rv = fr ? null : info.reviewsNormal;
  if (rv && rv.read) {
    if (rv.issues.length) {
      const top = rv.issues.slice(0, 3).map(i => `${i.label.toLowerCase()} (${i.n})`).join(', ');
      add(product, -Math.min(15, 4 * rv.issues.length), rv.bad >= 3 || rv.issues.length >= 2 ? 'bad' : 'warn', `${rv.bad}/${rv.read} đánh giá đang hiện có lời chê: ${top}`);
    } else if (rv.read >= 4) product.push({ s: 'ok', t: `Đọc ${rv.read} đánh giá đang hiện: không thấy lời chê` });
  }
  if (info.dupReviews >= 3) add(product, -8, 'bad', `${info.dupReviews} đánh giá giống hệt nhau, nghi đánh giá ảo`);
  // 1.10.162: chất lượng GẦN ĐÂY (50 đánh giá mới nhất) – shop đổi hàng/đổi xưởng thì lời chê dồn về cuối
  const rc = info.recent;
  if (rc && rc.n >= 20) {
    const s = rc.low / rc.n, base = tot >= 20 ? ((d[1] || 0) + (d[2] || 0)) / tot : 0, span = rc.days ? ` (${rc.days} ngày qua)` : '';
    if (s >= 0.15) add(product, -12, 'bad', `Gần đây chất lượng đi xuống: ${rc.low}/${rc.n} đánh giá mới nhất chê${span}`);
    else if (s >= 0.06 && s >= base * 2) add(product, -6, 'warn', `Gần đây bị chê nhiều hơn trước: ${rc.low}/${rc.n} đánh giá mới nhất${span}`);
    else if (rc.low <= 1) add(product, 3, 'ok', `${rc.n} đánh giá mới nhất${span}: hầu như không ai chê`);
  }
  if (info.lowPhotos >= 3) add(product, -3, 'warn', `${info.lowPhotos} lời chê kèm ảnh/video thật`);
  if (info.anh) {   // 1.10.172: ảnh khách chụp vs ảnh shop
    if (info.anh.muc === 'khac_xa') add(product, -12, 'bad', `Ảnh khách chụp khác xa ảnh mẫu: ${info.anh.y}`);
    else if (info.anh.muc === 'hoi_khac') add(product, -4, 'warn', `Ảnh khách chụp hơi khác ảnh mẫu: ${info.anh.y}`);
    else add(product, 3, 'ok', 'Ảnh khách chụp giống ảnh mẫu');
  }
  if (info.badVariant) add(product, -2, 'warn', `Phân loại hay bị chê: ${info.badVariant.name} (${info.badVariant.n}/${info.badVariant.of} lời chê)`);
  // --- shop ---
  if (info.mall) add(shop, 12, 'ok', info.platform === 'tiktok' ? 'TikTok Shop Mall: hàng chính hãng' : 'Shopee Mall: hàng chính hãng, được đổi trả');
  else if (info.preferred) add(shop, 6, 'ok', 'Shop Yêu Thích: bán tốt, ít bị phàn nàn');
  else if (info.platform !== 'tiktok') shop.push({ s: 'warn', t: 'Shop thường, không phải Mall hay Yêu Thích' });
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
  if (info.shopName && info.platform === 'tiktok') shop.push({ s: 'ok', t: `Người bán: ${info.shopName}` });
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
  { id: 'look', label: 'Xấu, không giống hình', re: /(xấu|không giống hình|khác hình|không giống ảnh|khác ảnh|không như hình|không như ảnh|không giống video|khác video|không như video|không đúng mô tả|khác mô tả|sai màu|khác màu|màu khác|màu không giống)/u,
    fold: /(khong giong hinh|khac hinh|khong giong anh|khac anh|khong nhu hinh|khong giong video|khac video|khong dung mo ta|khac mo ta|sai mau|khac mau|mau khac)/ },
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
  const list = [...seen.keys()].slice(0, 1200);
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

// 1.10.162: đọc sâu đánh giá (từ danh sách Shopee): chê gần đây, chê có ảnh, phân loại hay bị chê
HT.reviewDeep = items => {
  const out = {}, now = Date.now() / 1000;
  const all = (items || []).filter(x => x.all);
  if (all.length >= 20) out.recent = { n: all.length, low: all.filter(x => x.star > 0 && x.star <= 2).length, days: all[all.length - 1].at ? Math.max(1, Math.round((now - all[all.length - 1].at) / 86400)) : 0 };
  const seen = new Set(), low = [];
  for (const x of items || []) { if (!(x.star > 0 && x.star <= 2)) continue; const k = x.t + '|' + x.at; if (seen.has(k)) continue; seen.add(k); low.push(x); }
  out.lowPhotos = low.filter(x => x.img).length;
  out.low30 = low.filter(x => x.at && now - x.at < 30 * 86400).length;
  const cnt = {}; let withModel = 0;
  for (const x of low) if (x.model) { withModel++; cnt[x.model] = (cnt[x.model] || 0) + 1; }
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3 && Object.keys(cnt).length >= 2 && top[1] / withModel >= 0.35) out.badVariant = { name: top[0], n: top[1], of: withModel };
  return out;
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
// Điểm tham khảo cho 1 sản phẩm trong danh sách (khi trang không hiện thông tin shop, vd mục gợi ý của TikTok)
HT.listingScore = x => {
  let sc = 60; const r = [], k = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '').replace('.', ',') + 'k' : String(n);
  if (x.rating >= 4.7) { sc += 15; r.push({ s: 'ok', t: `${x.rating}★ điểm đánh giá cao` }); }
  else if (x.rating >= 4.5) { sc += 8; r.push({ s: 'ok', t: `${x.rating}★` }); }
  else if (x.rating) { sc -= 15; r.push({ s: 'warn', t: `Chỉ ${x.rating}★` }); }
  else { sc -= 5; r.push({ s: 'warn', t: 'Chưa có điểm đánh giá' }); }
  if (x.sold >= 10000) { sc += 15; r.push({ s: 'ok', t: `Đã bán ${k(x.sold)}, rất nhiều người mua` }); }
  else if (x.sold >= 1000) { sc += 10; r.push({ s: 'ok', t: `Đã bán ${k(x.sold)}` }); }
  else if (x.sold >= 100) { sc += 3; r.push({ s: 'ok', t: `Đã bán ${k(x.sold)}` }); }
  else if (x.sold != null) { sc -= 20; r.push({ s: 'bad', t: `Mới bán ${x.sold}, ít người mua` }); }
  else { sc -= 5; r.push({ s: 'warn', t: 'Chưa rõ số đã bán' }); }
  if (x.mall) { sc += 10; r.push({ s: 'ok', t: 'Mall: hàng chính hãng' }); }
  const score = Math.max(0, Math.min(100, Math.round(sc)));
  const [level, cls] = score >= 80 ? ['Đáng tin', 'good'] : score >= 60 ? ['Khá ổn', 'ok'] : score >= 40 ? ['Cân nhắc', 'warn'] : ['Rủi ro', 'bad'];
  return { score, level, cls, reasons: r.sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.s] - { bad: 0, warn: 1, ok: 2 }[b.s])) };
};
// Chọn 3 lựa chọn: đáng mua nhất (rẻ nhất trong nhóm điểm cao), rẻ nhất, uy tín nhất
HT.pickOptions = checked => {
  const byPrice = [...checked].sort((a, b) => a.price - b.price), byScore = [...checked].sort((a, b) => b.score - a.score || a.price - b.price);
  const best = byPrice.find(x => x.score >= 75) || byScore[0], picks = [];
  const add = (x, tag) => { if (!x) return; const o = picks.find(y => y.key === x.key); if (o) { if (tag && !o.tags.includes(tag)) o.tags.push(tag); } else picks.push({ ...x, tags: tag ? [tag] : [] }); };
  add(best, 'best'); add(byPrice[0], 'cheap'); add(byScore[0], 'trust');
  for (const x of byScore) if (picks.length < 3) add(x, '');
  return picks.slice(0, 3);
};
// 💰 Giá tốt nhất theo đúng luật Shopee (đọc từ chữ Shopee hiện trên trang, không đoán)
//   • mỗi đơn chỉ 1 mã của Shop, mã phải đủ "Đơn Tối Thiểu"  • Voucher Shopee % tính trên giá sau mã Shop
HT.money = s => { const m = String(s || '').replace(/\s/g, '').match(/([\d.,]+)(k|tr)?/i); if (!m) return 0; const n = HT.num(m[1] + (m[2] || '')); return isNaN(n) ? 0 : n; };
HT.parsePriceDetail = text => {
  const t = String(text || ''), i = t.search(/Chi tiết giá/i); if (i < 0) return null;
  const s = t.slice(i, i + 1200), M = re => (s.match(re) || [])[1];
  const orig = HT.money(M(/Giá gốc\s*([\d.,]+)\s*₫/i)), prodOff = HT.money(M(/Giảm giá sản phẩm\s*-?\s*([\d.,]+)\s*₫/i));
  const spOff = HT.money(M(/Voucher Shopee\s*-?\s*([\d.,]+)\s*₫/i)), shopOff = HT.money(M(/Voucher (?:của )?Shop\s*-?\s*([\d.,]+)\s*₫/i));
  const total = HT.money(M(/Giá tạm tính[^\n]*\n?\s*([\d.,]+)\s*₫/i));
  const spTxt = (s.match(/Voucher Shopee[\s\S]*?\n([^\n]*Mua từ[^\n]*)/i) || [])[1] || '';
  const pct = +(spTxt.match(/giảm\s*(\d{1,2})\s*%/i) || [])[1] || 0;
  const shopee = spOff || pct ? { pct, off: pct ? 0 : spOff, min: HT.money((spTxt.match(/Mua từ\s*([\d.,]+\s*(?:k|tr)?)\s*₫/i) || [])[1]), cap: HT.money((spTxt.match(/tối đa\s*([\d.,]+\s*(?:k|tr)?)\s*₫/i) || [])[1]) } : null;
  const base = orig ? orig - prodOff : (total + spOff + shopOff);
  return base > 0 ? { orig, prodOff, base, shopee, shopOff, total: total || (base - spOff - shopOff) } : null;
};
HT.parseShopVouchers = text => {
  const out = [], seen = new Set();
  const re = /Giảm\s*(\d{1,2}\s*%|[\d.,]+\s*(?:k|tr)?\s*₫?)\s*\n(?:\s*Giảm tối đa\s*([\d.,]+\s*(?:k|tr)?)\s*₫?\s*\n)?\s*Đơn Tối Thiểu\s*([\d.,]+\s*(?:k|tr)?)\s*₫?([\s\S]{0,160}?)(Dùng Ngay|Đã lưu|Lưu|Hết lượt|Đã hết)/gi;
  for (const m of String(text || '').matchAll(re)) {
    const pct = /%/.test(m[1]) ? parseInt(m[1]) : 0, off = pct ? 0 : HT.money(m[1]), min = HT.money(m[3]);
    const key = (pct || off) + '|' + min; if (seen.has(key)) continue; seen.add(key);
    const used = +((m[4].match(/Đã dùng\s*(\d+)\s*%/i) || [])[1] || 0);
    out.push({ off, pct, cap: HT.money(m[2]), min, used, label: pct ? `Giảm ${pct}%` : `Giảm ${Math.round(off / 1000)}k`,
      limited: /Sản phẩm nhất định/i.test(m[4]), saved: /Dùng Ngay|Đã lưu/i.test(m[5]), out: /Hết lượt|Đã hết/i.test(m[5]) });
  }
  return out;
};
HT.bestDeal = ({ base, vouchers = [], shopee = null, total = 0 }) => {
  if (!(base > 0)) return null;
  const spOff = a => !shopee || (shopee.min && a < shopee.min) ? 0 : Math.round(shopee.pct ? Math.min(a * shopee.pct / 100, shopee.cap || Infinity) : (shopee.off || 0));
  const opts = [{ v: null, shopOff: 0 }];
  for (const v of vouchers) {
    if (v.out || (v.min && base < v.min)) continue;
    const off = v.pct ? Math.min(Math.round(base * v.pct / 100), v.cap || Infinity) : v.off;
    if (off > 0) opts.push({ v, shopOff: Math.min(off, base) });
  }
  for (const o of opts) { const a = base - o.shopOff; o.spOff = spOff(a); o.final = a - o.spOff; }
  opts.sort((a, b) => a.final - b.final || ((a.v && a.v.used) || 0) - ((b.v && b.v.used) || 0));
  const best = opts[0], cur = total || 0;
  return { base, best, opts, current: cur, save: cur ? Math.max(0, cur - best.final) : 0 };
};
// cho phép trang khác (xem thử) dùng chung
if (typeof self !== "undefined") self.HT = HT;

// 🔥 Deal hôm nay: mỗi ngày xoay vòng, lấy n món (mọi trang của HaoHao hiện giống nhau trong ngày)
HT.pickDeals = (deals, n = 4) => {
  const list = (deals || []).filter(x => x && x.url && x.title);
  if (list.length <= n) return list;
  const day = Math.floor((Date.now() + 7 * 3600e3) / 86400e3), start = (day * n) % list.length;
  return Array.from({ length: n }, (_, i) => list[(start + i) % list.length]);
};
HT.dealOff = x => x && x.orig && x.price && x.orig > x.price ? Math.round((1 - x.price / x.orig) * 100) : 0;

// 📲 HaoHao Transfer: link tải app Windows dự phòng (coupons.json `transfer` ưu tiên hơn)
HT.TRANSFER_DL = 'https://github.com/nhatphan79/nhatphan79/raw/HEAD/downloads/HaoHao-Transfer-Windows.zip';
