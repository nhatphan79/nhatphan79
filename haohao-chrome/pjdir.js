// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 📁 V1.35: trang danh sách thư mục trên máy (file:///…) mở từ nút 📁 của trang Dự án → thanh "💾 Lưu thư mục này"
//        để ghi thư mục đang xem vào việc đó; lần sau bấm 📁 là mở thẳng thư mục đã lưu.
(() => {
  if (location.protocol !== 'file:' || !/\/$/.test(location.pathname)) return;   // chỉ trang danh sách thư mục
  const KEEP = 2 * 60 * 60 * 1000;   // nhớ việc đang chọn thư mục trong 2 giờ
  const winPath = () => { let p = decodeURIComponent(location.pathname).replace(/^\/+/, '').replace(/\//g, '\\'); if (!/^[A-Za-z]:\\$/.test(p)) p = p.replace(/\\+$/, ''); return p; };
  chrome.storage.local.get(['pjDirPick', 'projBoard']).then(({ pjDirPick: k, projBoard: b }) => {
    if (!k || !b || Date.now() - (k.at || 0) > KEEP) return;
    const p = (b.projects || []).find(x => x.id === k.p), f = p && (p.folders || []).find(x => x.id === k.f), r = f && (f.rows || []).find(x => x.id === k.r);
    if (!r) return;
    const cur = winPath(), same = (r.dir || '').replace(/\\+$/, '').toLowerCase() === cur.replace(/\\+$/, '').toLowerCase();
    const bar = document.createElement('div');
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Lưu thư mục cho HaoHao');
    bar.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;align-items:center;gap:10px;max-width:min(560px,calc(100vw - 24px));background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:10px 12px 10px 14px;box-shadow:0 12px 32px rgba(20,28,56,.18);font:13.5px/1.4 "Segoe UI",system-ui,sans-serif;color:#23305E';
    const tx = document.createElement('div'); tx.style.cssText = 'min-width:0;flex:1';
    const t1 = document.createElement('b'); t1.textContent = '🐹 HaoHao · ' + (r.t || 'việc') + ' · ' + (p.name || '');
    t1.style.cssText = 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    const t2 = document.createElement('span'); t2.style.cssText = 'display:block;color:#6B7280;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    t2.textContent = same ? '✓ Đây là thư mục đang lưu' : 'Lưu thư mục đang xem để lần sau 📁 mở thẳng vào đây';
    tx.append(t1, t2);
    const sv = document.createElement('button'); sv.type = 'button'; sv.textContent = same ? '✓ Đã lưu' : '💾 Lưu thư mục này'; sv.disabled = same;
    sv.style.cssText = 'all:unset;cursor:pointer;flex:none;background:#23305E;color:#fff;font-weight:700;padding:8px 14px;border-radius:10px;font-size:13.5px' + (same ? ';opacity:.6;cursor:default' : '');
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Đóng');
    x.style.cssText = 'all:unset;cursor:pointer;flex:none;color:#6B7280;padding:4px 6px;border-radius:7px;font-size:13px';
    x.addEventListener('click', () => bar.remove());
    sv.addEventListener('click', async () => {
      const { projBoard: B } = await chrome.storage.local.get('projBoard');
      const P = (B.projects || []).find(z => z.id === k.p), F = P && (P.folders || []).find(z => z.id === k.f), R = F && (F.rows || []).find(z => z.id === k.r);
      if (!R) { t2.textContent = '⚠ Không tìm thấy việc này nữa (đã bị xoá?)'; return; }
      R.dir = cur; await chrome.storage.local.set({ projBoard: B });
      sv.textContent = '✓ Đã lưu'; sv.disabled = true; sv.style.opacity = '.6'; sv.style.cursor = 'default'; t2.textContent = cur;
    });
    bar.append(tx, sv, x); document.body.append(bar);
  }).catch(() => {});
})();
