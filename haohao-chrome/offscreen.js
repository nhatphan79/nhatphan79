// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// Trang ẩn (offscreen) chỉ để phát nhạc nền: nhạc vẫn chạy khi bạn đổi tab hay đóng trang.
let au = null;
const auVol = v => Math.max(0, Math.min(1, Math.pow(v, 1.6)));
function auStop() { if (au) { au.pause(); au.src = ''; au = null; } }
// 📋 đọc chữ trong bộ nhớ chép (khi bạn bấm "Lưu chữ vừa chép" của HaoHao)
chrome.runtime.onMessage.addListener((m, s, send) => {
  if (!m || m.target !== 'offscreen' || m.type !== 'clip-read') return;
  const ta = document.createElement('textarea'); document.body.append(ta); ta.select(); ta.focus();
  let t = ''; try { document.execCommand('paste'); t = ta.value; } catch {}
  if (!t) { const d = document.createElement('div'); d.contentEditable = 'true'; document.body.append(d); d.focus(); try { document.execCommand('paste'); t = d.innerText; } catch {} d.remove(); }
  ta.remove(); send({ text: t }); return true;
});
chrome.runtime.onMessage.addListener(m => {
  if (!m || m.target !== 'offscreen') return;
  if (m.type === 'music-play') { auStop(); HHMusic.play(m.kind, m.vol); }
  if (m.type === 'music-url') {
    HHMusic.stop(0.4);
    if (!au || au.dataset.url !== m.url) { auStop(); au = new Audio(m.url); au.dataset.url = m.url; au.loop = true; }
    au.volume = auVol(m.vol ?? 0.5); au.play().catch(() => {});
  }
  if (m.type === 'music-vol') { HHMusic.setVol(m.vol); if (au) au.volume = auVol(m.vol); }
  if (m.type === 'music-stop') { HHMusic.stop(); auStop(); }
  if (m.type === 'music-pause') { HHMusic.stop(0.3); if (au) au.pause(); }
});
