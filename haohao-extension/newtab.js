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

  // nút nhanh: mở đúng mục trong HaoHao (HaoHao chạy ngay trên trang này)
  document.querySelectorAll('.quick button').forEach(b => b.addEventListener('click', () =>
    window.dispatchEvent(new CustomEvent('hh-open', { detail: { tab: b.dataset.tab } }))));
})();
