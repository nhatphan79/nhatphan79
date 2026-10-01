// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// Tab mới của HaoHao: đồng hồ, ngày dương & âm, lời chào, ô tìm (dùng công cụ tìm kiếm mặc định của Chrome)
(() => {
  const $ = s => document.querySelector(s);
  const DOW = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
  const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];
  const pad = n => String(n).padStart(2, '0');
  let name = '';
  function tick() {
    const d = new Date(), h = d.getHours();
    $('#clock').textContent = pad(h) + ':' + pad(d.getMinutes());
    $('#date').textContent = `${DOW[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
    const l = HT.lunar.of(d);
    const dayTxt = l.day <= 10 ? 'Mùng ' + l.day : l.day === 15 ? 'Rằm (15)' : 'Ngày ' + l.day;
    $('#lunar').textContent = `Âm lịch: ${dayTxt} tháng ${l.month}${l.leap ? ' nhuận' : ''} năm ${CAN[l.year % 10]} ${CHI[l.year % 12]}`;
    const part = h < 5 ? 'Khuya rồi' : h < 11 ? 'Chào buổi sáng' : h < 13 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    $('#hello').textContent = part + (name ? ', ' + name : '') + (h < 5 ? ', nghỉ ngơi nhé' : '');
  }
  chrome.storage.local.get('settings').then(({ settings = {} }) => { name = (settings.userName || '').trim(); tick(); }).catch(() => {});
  tick(); setInterval(tick, 1000);

  // ---------- ô tìm kiếm kiểu Google ----------
  const G = 'https://www.google.com/search?q=';
  const isUrl = q => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(q) && !/\s/.test(q);
  const go = url => { location.href = url; };
  // Enter: gõ địa chỉ thì mở thẳng, còn lại tìm bằng công cụ tìm kiếm mặc định của Chrome (thường là Google)
  $('#search').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#q').value.trim(); if (!q) return;
    if (isUrl(q)) return go(/^https?:\/\//i.test(q) ? q : 'https://' + q);
    if (chrome.search && chrome.search.query) chrome.search.query({ text: q, disposition: 'CURRENT_TAB' });
    else go(G + encodeURIComponent(q));
  });
  $('#gsearch').addEventListener('click', () => { const q = $('#q').value.trim(); if (!q) return $('#q').focus(); go(G + encodeURIComponent(q)); });
  // "Xem trang đầu tiên tìm được": đi thẳng tới kết quả đầu (như nút của Google)
  $('#glucky').addEventListener('click', () => { const q = $('#q').value.trim(); go(q ? G + encodeURIComponent(q) + '&btnI=1' : 'https://www.google.com/doodles'); });
  // Chế độ AI của Google
  $('#aimode').addEventListener('click', () => { const q = $('#q').value.trim(); go('https://www.google.com/search?udm=50' + (q ? '&q=' + encodeURIComponent(q) : '')); });
  // Tìm bằng hình ảnh: mở Google Lens
  $('#lens').addEventListener('click', () => go('https://lens.google.com/'));
  // Tìm bằng giọng nói (tiếng Việt, hoặc tiếng Anh khi giao diện là English)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) $('#mic').hidden = true;
  else $('#mic').addEventListener('click', () => {
    const r = new SR(); r.lang = HT.lang === 'en' ? 'en-US' : 'vi-VN'; r.interimResults = true;
    const q = $('#q'), mic = $('#mic'); mic.classList.add('on'); q.placeholder = HT.tr('Đang nghe… hãy nói');
    r.onresult = e => { q.value = [...e.results].map(x => x[0].transcript).join(''); if (e.results[e.results.length - 1].isFinal) $('#search').requestSubmit(); };
    r.onerror = () => { q.placeholder = HT.tr('Không nghe được, bấm 🎤 thử lại'); };
    r.onend = () => { mic.classList.remove('on'); };
    try { r.start(); } catch { mic.classList.remove('on'); }
  });

  // ---------- ứng dụng Google (nút ô vuông góc trên) ----------
  // biểu tượng vẽ sẵn theo màu Google (không phụ thuộc favicon nên luôn đủ hình, không dính số thư chưa đọc)
  const cB = '#4285F4', cR = '#EA4335', cY = '#FBBC04', cG = '#34A853';
  const ICO = {
    search: `<path fill="${cR}" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="${cB}" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7.2-10.2 7.2-17.6z"/><path fill="${cY}" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.8-6.1z"/><path fill="${cG}" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z"/>`,
    gmail: `<path fill="${cB}" d="M4 40h8V22L2 14v22a4 4 0 0 0 2 4z"/><path fill="${cG}" d="M36 40h8a4 4 0 0 0 2-4V14l-10 8z"/><path fill="${cY}" d="M36 10v12l10-8v-2c0-4-4.5-6-7.5-4z"/><path fill="${cR}" d="M12 22V10l12 9 12-9v12l-12 9z"/><path fill="#C5221F" d="M2 12v2l10 8V10L9.5 8C6.5 6 2 8 2 12z"/>`,
    youtube: `<rect x="2" y="9" width="44" height="30" rx="9" fill="#FF0000"/><path fill="#fff" d="M20 17v14l12-7z"/>`,
    maps: `<path fill="${cG}" d="M24 2c-8.3 0-15 6.7-15 15 0 11 15 29 15 29s15-18 15-29c0-8.3-6.7-15-15-15z"/><path fill="${cB}" d="M24 2c-4.6 0-8.7 2.1-11.5 5.4L24 17V2z"/><path fill="${cR}" d="M12.5 7.4C10.3 10 9 13.4 9 17c0 2.5.8 5.2 2 7.8L24 17z"/><path fill="${cY}" d="M24 17l13 7.8c1.2-2.6 2-5.3 2-7.8 0-3.6-1.3-7-3.5-9.6z"/><circle cx="24" cy="17" r="5.5" fill="#fff"/>`,
    drive: `<path fill="${cG}" d="M16 6h16l14 24H30z"/><path fill="${cB}" d="M16 6L2 30l8 13 14-24z"/><path fill="${cY}" d="M18 30h28l-8 13H10z"/>`,
    translate: `<rect x="2" y="4" width="28" height="30" rx="4" fill="${cB}"/><rect x="18" y="14" width="28" height="30" rx="4" fill="#E8EAED"/><text x="16" y="26" font-size="17" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial">G</text><text x="33" y="37" font-size="15" fill="#5F6368" text-anchor="middle" font-family="Arial">文</text>`,
    calendar: `<rect x="5" y="5" width="38" height="38" rx="5" fill="#fff" stroke="${cB}" stroke-width="3"/><path fill="${cB}" d="M5 10a5 5 0 0 1 5-5h28a5 5 0 0 1 5 5v5H5z"/><text x="24" y="37" font-size="17" font-weight="700" fill="${cB}" text-anchor="middle" font-family="Arial">31</text>`,
    photos: `<path fill="${cR}" d="M24 24V4a10 10 0 0 0-10 10v10z"/><path fill="${cY}" d="M24 24H4a10 10 0 0 0 10 10h10z"/><path fill="${cG}" d="M24 24v20a10 10 0 0 0 10-10V24z"/><path fill="${cB}" d="M24 24h20a10 10 0 0 0-10-10H24z"/>`,
    news: `<rect x="4" y="8" width="40" height="32" rx="4" fill="${cB}"/><rect x="9" y="14" width="14" height="4" rx="1" fill="#fff"/><rect x="9" y="21" width="14" height="3" rx="1" fill="#C6DAFC"/><rect x="9" y="27" width="14" height="3" rx="1" fill="#C6DAFC"/><rect x="27" y="14" width="12" height="16" rx="2" fill="${cY}"/><rect x="9" y="33" width="30" height="3" rx="1" fill="#C6DAFC"/>`,
    meet: `<path fill="${cG}" d="M4 14a4 4 0 0 1 4-4h22a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path fill="${cG}" d="M34 20l10-7v22l-10-7z"/><path fill="${cB}" d="M4 14a4 4 0 0 1 4-4h6v12H4z"/><path fill="${cY}" d="M4 26h10v12H8a4 4 0 0 1-4-4z"/><path fill="${cR}" d="M4 22h10v4H4z"/>`,
    docs: `<path fill="${cB}" d="M10 2h20l12 12v28a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><path fill="#A1C2FA" d="M30 2v12h12z"/><rect x="14" y="22" width="20" height="3" fill="#fff"/><rect x="14" y="28" width="20" height="3" fill="#fff"/><rect x="14" y="34" width="14" height="3" fill="#fff"/>`,
    sheets: `<path fill="${cG}" d="M10 2h20l12 12v28a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><path fill="#8ED1A6" d="M30 2v12h12z"/><path fill="#fff" d="M13 21h22v16H13zm3 3v3h7v-3zm10 0v3h6v-3zm-10 6v4h7v-4zm10 0v4h6v-4z" fill-rule="evenodd"/>`,
  };
  const APPS = [['Tìm kiếm', 'https://www.google.com/', 'search'], ['Gmail', 'https://mail.google.com/', 'gmail'], ['YouTube', 'https://www.youtube.com/', 'youtube'], ['Maps', 'https://maps.google.com/', 'maps'],
    ['Drive', 'https://drive.google.com/', 'drive'], ['Dịch', 'https://translate.google.com/', 'translate'], ['Lịch', 'https://calendar.google.com/', 'calendar'], ['Ảnh', 'https://photos.google.com/', 'photos'],
    ['Tin tức', 'https://news.google.com/', 'news'], ['Meet', 'https://meet.google.com/', 'meet'], ['Tài liệu', 'https://docs.google.com/document/', 'docs'], ['Trang tính', 'https://docs.google.com/spreadsheets/', 'sheets']];
  const appsBox = $('#apps');
  APPS.forEach(([n, u, k]) => {
    const a = document.createElement('a'); a.href = u; a.className = 'app';
    const ic = document.createElement('span'); ic.className = 'aico';
    ic.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${ICO[k]}</svg>`;
    const t = document.createElement('span'); t.textContent = n; a.append(ic, t); appsBox.append(a);
  });
  const toggleApps = open => { appsBox.hidden = !open; $('#appsbtn').setAttribute('aria-expanded', open); };
  $('#appsbtn').addEventListener('click', e => { e.stopPropagation(); toggleApps(appsBox.hidden); });
  document.addEventListener('click', e => { if (!appsBox.hidden && !appsBox.contains(e.target)) toggleApps(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleApps(false); });

  // ---------- lối tắt: lần đầu lấy các trang hay vào nhất của chính người dùng (Chrome), sau đó tự thêm / xoá ----------
  const MAX = 12;
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const icon = u => { const x = new URL(chrome.runtime.getURL('/_favicon/')); x.searchParams.set('pageUrl', u); x.searchParams.set('size', '64'); return x.toString(); };
  const short = t => { t = String(t || '').replace(/\s*[|\-–—·:]\s.*$/, '').trim(); return t.length > 18 ? t.slice(0, 17) + '…' : t; };
  let sites = [];
  const save = () => chrome.storage.local.set({ ntSites: sites }).catch(() => {});
  function draw() {
    const box = $('#sites'); box.textContent = '';
    sites.forEach((s, i) => {
      const a = document.createElement('a'); a.className = 'site'; a.href = s.url; a.title = s.title + '\n' + s.url;
      const ic = document.createElement('span'); ic.className = 'ic';
      const im = document.createElement('img'); im.src = icon(s.url); im.alt = ''; ic.append(im);
      const lb = document.createElement('span'); lb.className = 'lb'; lb.textContent = short(s.title) || host(s.url);
      const x = document.createElement('button'); x.className = 'rm'; x.type = 'button'; x.textContent = '✕'; x.title = 'Xoá lối tắt'; x.setAttribute('aria-label', 'Xoá ' + (s.title || host(s.url)));
      x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); sites.splice(i, 1); save(); draw(); });
      a.append(ic, lb, x); box.append(a);
    });
    if (sites.length < MAX) {
      const add = document.createElement('button'); add.className = 'site add'; add.type = 'button';
      add.innerHTML = '<span class="ic">＋</span><span class="lb">Thêm</span>'; add.title = 'Thêm lối tắt';
      add.addEventListener('click', () => { $('#addsite').hidden = false; $('#as-title').value = ''; $('#as-url').value = ''; $('#as-url').focus(); });
      box.append(add);
    }
  }
  $('#as-cancel').addEventListener('click', () => { $('#addsite').hidden = true; });
  $('#addsite').addEventListener('submit', e => {
    e.preventDefault();
    let url = $('#as-url').value.trim(); if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch { return $('#as-url').focus(); }
    sites.push({ title: $('#as-title').value.trim() || host(url), url }); sites = sites.slice(0, MAX);
    save(); draw(); $('#addsite').hidden = true;
  });
  chrome.storage.local.get('ntSites').then(async ({ ntSites }) => {
    if (Array.isArray(ntSites)) sites = ntSites;
    else {
      // lần đầu: các trang người này hay mở nhất (không lấy trang của Chrome / tiện ích)
      const top = await new Promise(r => chrome.topSites ? chrome.topSites.get(r) : r([])).catch(() => []);
      const seen = new Set();
      sites = (top || []).filter(t => /^https?:/.test(t.url) && !seen.has(host(t.url)) && seen.add(host(t.url))).slice(0, 8).map(t => ({ title: t.title || host(t.url), url: t.url }));
      save();
    }
    draw();
  }).catch(draw);

  // ---------- ⛅ thời tiết: vị trí máy (hoặc đoán theo mạng) → Open-Meteo, lưu 30 phút ----------
  const WX = [[[0], '☀️', 'Trời quang'], [[1], '🌤️', 'Ít mây'], [[2], '⛅', 'Có mây'], [[3], '☁️', 'Nhiều mây'], [[45, 48], '🌫️', 'Sương mù'],
    [[51, 53, 55, 56, 57], '🌦️', 'Mưa phùn'], [[61, 63, 65, 66, 67, 80, 81, 82], '🌧️', 'Có mưa'], [[71, 73, 75, 77, 85, 86], '🌨️', 'Có tuyết'], [[95, 96, 99], '⛈️', 'Có dông']];
  const wxOf = c => WX.find(w => w[0].includes(c)) || [[], '🌡️', ''];
  const tip = (c, t) => t >= 35 ? 'Nắng nóng, nhớ uống nước' : c >= 95 ? 'Có dông, cẩn thận nhé' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? 'Nhớ mang ô nhé' : t <= 15 ? 'Trời lạnh, mặc ấm nhé' : c <= 2 ? 'Trời đẹp hôm nay' : 'Chúc bạn ngày tốt lành';
  const where = () => new Promise(res => {
    const byIp = () => fetch('https://ipwho.is/?fields=city,latitude,longitude,success').then(r => r.json())
      .then(j => res(j && j.success !== false && j.latitude ? { lat: j.latitude, lon: j.longitude, city: j.city || '' } : null)).catch(() => res(null));
    if (!navigator.geolocation) return byIp();
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude, city: '' }), byIp, { timeout: 8000, maximumAge: 3 * 3600e3 });
  });
  function showWx(w) {
    if (!w || w.temp == null) return;
    const [, ic, desc] = wxOf(w.code), a = $('#weather');
    a.textContent = `${ic} ${w.city ? w.city + ' · ' : ''}${Math.round(w.temp)}°C | ${HT.tr(tip(w.code, w.temp))}`;
    a.title = HT.tr(desc) + (w.city ? ' · ' + w.city : '');
    a.href = 'https://www.google.com/search?q=' + encodeURIComponent((HT.lang === 'en' ? 'weather ' : 'thời tiết ') + (w.city || ''));
    a.hidden = false;
  }
  (async () => {
    try {
      const { ntWeather: c } = await chrome.storage.local.get('ntWeather');
      if (c) showWx(c);
      if (c && Date.now() - c.at < 30 * 60e3) return;
      const loc = await where(); if (!loc) return;
      const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat.toFixed(3)}&longitude=${loc.lon.toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`)).json();
      let city = loc.city;
      if (!city) try { const g = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.lat}&longitude=${loc.lon}&localityLanguage=${HT.lang === 'en' ? 'en' : 'vi'}`)).json(); city = g.city || g.locality || g.principalSubdivision || ''; } catch {}
      city = String(city).replace(/^(Thành phố|Tỉnh|City of)\s+/i, '');
      const w = { at: Date.now(), city, temp: j.current && j.current.temperature_2m, code: j.current && j.current.weather_code };
      if (w.temp == null) return;
      chrome.storage.local.set({ ntWeather: w }).catch(() => {}); showWx(w);
    } catch {}
  })();

  // nút nhanh: mở đúng mục trong HaoHao (HaoHao chạy ngay trên trang này)
  document.querySelectorAll('.quick button').forEach(b => b.addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('hh-open', { detail: { tab: b.dataset.tab } }))));
})();
