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

  // ô tìm: gõ địa chỉ thì mở thẳng, còn lại tìm bằng công cụ mặc định của Chrome
  $('#search').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#q').value.trim(); if (!q) return;
    if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(q) && !/\s/.test(q)) { location.href = /^https?:\/\//i.test(q) ? q : 'https://' + q; return; }
    if (chrome.search && chrome.search.query) chrome.search.query({ text: q, disposition: 'CURRENT_TAB' });
    else location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
  });

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

  // nút nhanh: mở đúng mục trong HaoHao (HaoHao chạy ngay trên trang này)
  document.querySelectorAll('.quick button').forEach(b => b.addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('hh-open', { detail: { tab: b.dataset.tab } }))));
})();
