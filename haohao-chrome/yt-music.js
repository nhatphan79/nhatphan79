// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🎵 Tab YouTube do HaoHao mở để phát nhạc nền (link có ?hhmusic=1): phát / dừng / chỉnh âm lượng theo Pomodoro.
// Tab YouTube bình thường của bạn không bị đụng tới.
(() => {
  if (window.top !== window) return;
  const q = new URLSearchParams(location.search);
  try { if (q.has('hhmusic')) sessionStorage.setItem('hhmusic', '1'); } catch {}
  let ours = q.has('hhmusic'); try { ours = ours || sessionStorage.getItem('hhmusic') === '1'; } catch {}
  if (!ours) return;
  let st = { cmd: 'play', vol: 0.5 }, waitSince = 0, blocked = false;
  // 1.9.51: tôn trọng nút tạm dừng của người xem (chỉ HaoHao ra lệnh dừng/phát mới đổi)
  let userPaused = false, ourPause = false, hookedV = null;
  const hookV = v => {
    if (!v || v === hookedV) return; hookedV = v;
    v.addEventListener('pause', () => { if (!ourPause && !isAd() && !v.ended) userPaused = true; ourPause = false; });
    v.addEventListener('play', () => { userPaused = false; });
  };
  const single = !q.has('list');
  const vid = () => document.querySelector('video.html5-main-video') || document.querySelector('video');
  const isAd = () => !!document.querySelector('.ad-showing, .ad-interrupting');
  const setBlocked = b => {
    if (b === blocked) return; blocked = b;
    chrome.storage.local.get('musicYt').then(({ musicYt }) => { if (musicYt) chrome.storage.local.set({ musicYt: { ...musicYt, blocked: b } }); }).catch(() => {});
  };
  const apply = () => {
    const v = vid(); if (!v) return; hookV(v);
    if (!isAd()) v.volume = Math.max(0, Math.min(1, Math.pow(st.vol, 1.6)));
    if (single) v.loop = true;
    if (st.cmd === 'play') {
      if (userPaused) return;   // bạn tự bấm tạm dừng trên YouTube: không tự phát lại
      if (v.paused && !isAd()) {
        v.play().then(() => setBlocked(false)).catch(() => {});
        if (!waitSince) waitSince = Date.now();
        if (Date.now() - waitSince > 4000) setBlocked(true);   // YouTube chặn tự phát: cần bấm vào tab một lần
      } else { waitSince = 0; setBlocked(false); }
    } else { waitSince = 0; if (!v.paused) { ourPause = true; v.pause(); } }
  };
  chrome.storage.local.get('musicYt').then(({ musicYt }) => { if (musicYt) st = musicYt; apply(); }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.musicYt && ch.musicYt.newValue) { const was = st.cmd; st = ch.musicYt.newValue; if (st.cmd === 'play' && was !== 'play') userPaused = false; apply(); } });
  setInterval(apply, 1500);
  if (!document.title.startsWith('🎵')) document.title = '🎵 ' + document.title;
})();
