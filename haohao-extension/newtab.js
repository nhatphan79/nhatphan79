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
  const APPS = [['Tìm kiếm', 'https://www.google.com/'], ['Gmail', 'https://mail.google.com/'], ['YouTube', 'https://www.youtube.com/'], ['Maps', 'https://maps.google.com/'],
    ['Drive', 'https://drive.google.com/'], ['Dịch', 'https://translate.google.com/'], ['Lịch', 'https://calendar.google.com/'], ['Ảnh', 'https://photos.google.com/'],
    ['Tin tức', 'https://news.google.com/'], ['Meet', 'https://meet.google.com/'], ['Tài liệu', 'https://docs.google.com/'], ['Trang tính', 'https://sheets.google.com/']];
  const appsBox = $('#apps');
  APPS.forEach(([n, u]) => {
    const a = document.createElement('a'); a.href = u; a.className = 'app';
    const im = document.createElement('img'); im.alt = ''; im.src = (() => { const x = new URL(chrome.runtime.getURL('/_favicon/')); x.searchParams.set('pageUrl', u); x.searchParams.set('size', '32'); return x.toString(); })();
    const t = document.createElement('span'); t.textContent = n; a.append(im, t); appsBox.append(a);
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
