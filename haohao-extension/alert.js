// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
const $ = s => document.querySelector(s);
let items = [], knocks = 0, ac = null, soundOn = true, closing = false;
const MAX_KNOCKS = 6, KNOCK_EVERY = 45000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function load() {
  const [{ deskQueue = [] }, { settings = {} }] = await Promise.all([
    chrome.storage.session.get('deskQueue'), chrome.storage.local.get('settings')
  ]);
  soundOn = settings.sound !== false;
  const grew = deskQueue.length > items.length;
  items = deskQueue;
  if (!items.length) { closing = true; window.close(); return; }
  render();
  if (grew) knock();
}

function render() {
  $('#head').textContent = items.length > 1 ? `Cốc cốc! Có ${items.length} lời nhắc` : items[0].kind === 'mail' ? 'Cốc cốc! Có thư mới' : 'Cốc cốc! Tới giờ rồi';
  $('#sub').textContent = items.length > 1 ? 'Làm xong việc nào thì bấm việc đó nhé' : 'HaoHao nhắc bạn nè';
  document.title = `HaoHao: ${items[0].title}`;
  const L = $('#list'); L.innerHTML = '';
  for (const it of items) {
    const c = document.createElement('div'); c.className = 'card'; c.setAttribute('role', 'listitem');
    const t = document.createElement('div'); t.className = 't';
    const a = document.createElement('span'); a.textContent = it.title;
    const b = document.createElement('span'); b.textContent = new Date(it.t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    t.append(a, b);
    const x = document.createElement('div'); x.className = 'x'; x.textContent = it.text;
    const acts = document.createElement('div'); acts.className = 'acts';
    if (it.kind === 'pomo') acts.append(...(it.next
      ? [btn('▶ Vào phiên tiếp', 'main', () => act(it, 'pomo-next')), btn('Để sau', '', () => act(it, 'done'))]
      : it.end ? [btn('✅ Hoàn thành việc', 'main', () => act(it, 'pomo-done')), btn('▶ Làm tiếp', '', () => act(it, 'pomo-next')), btn('☕ Nghỉ', '', () => act(it, 'done'))]
      : [btn('Ok ✓', 'main', () => act(it, 'done'))]));
    else if (it.kind === 'mail') acts.append(
      btn('Mở mail', 'main', () => act(it, 'open')),
      btn('Đã xem ✓', '', () => act(it, 'done'))
    );
    else if (it.url) acts.append(
      btn('🛒 Săn deal', 'main', () => act(it, 'deal')),
      btn('Xong rồi ✓', '', () => act(it, 'done'))
    );
    else acts.append(
      btn('Xong rồi ✓', 'main', () => act(it, 'done')),
      btn('10 phút nữa', '', () => act(it, 'snooze', 10)),
      btn('30 phút nữa', '', () => act(it, 'snooze', 30))
    );
    c.append(t, x, acts); L.append(c);
  }
  L.querySelector('button.main')?.focus();
}
function btn(text, cls, fn) { const b = document.createElement('button'); b.textContent = text; b.className = cls; b.addEventListener('click', fn); return b; }
function act(it, action, minutes) {
  unlockAudio();
  chrome.runtime.sendMessage({ type: 'desk-act', id: it.id, action, minutes }).catch(() => {});
}

async function knock() {
  if (closing) return;
  knocks++;
  document.body.classList.remove('knock'); void document.body.offsetWidth; document.body.classList.add('knock');
  playKnock();
  try {
    const w = await chrome.windows.getCurrent();
    await chrome.windows.update(w.id, { focused: true, drawAttention: true });
    const x = w.left;
    if (typeof x === 'number') {
      for (const dx of [16, -16, 12, -12, 8, -8, 4, 0]) { await chrome.windows.update(w.id, { left: x + dx }); await sleep(40); }
    }
  } catch {}
}

function unlockAudio() { try { ac = ac || new AudioContext(); if (ac.state === 'suspended') ac.resume(); } catch {} }
function playKnock() {
  if (!soundOn) return;
  try {
    unlockAudio();
    const t = ac.currentTime + 0.05;
    // hai tiếng gõ "cốc cốc"
    [0, 0.24].forEach(d => {
      const len = 0.14, buf = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 5);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.2;
      const g = ac.createGain(); g.gain.value = 2.2;
      src.connect(f).connect(g).connect(ac.destination); src.start(t + d);
      const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(190, t + d); o.frequency.exponentialRampToValueAtTime(90, t + d + .12);
      og.gain.setValueAtTime(0.5, t + d); og.gain.exponentialRampToValueAtTime(0.001, t + d + .14);
      o.connect(og).connect(ac.destination); o.start(t + d); o.stop(t + d + .15);
    });
    // chuông nhẹ sau khi gõ
    [880, 1175, 1320].forEach((fq, i) => {
      const s0 = t + 0.7 + i * 0.15, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.18, s0 + .02); g.gain.exponentialRampToValueAtTime(0.0001, s0 + .7);
      o.connect(g).connect(ac.destination); o.start(s0); o.stop(s0 + .75);
    });
  } catch {}
}

document.addEventListener('pointerdown', unlockAudio, { once: true });
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'session' && ch.deskQueue) load(); });
setInterval(() => { if (items.length && knocks < MAX_KNOCKS) knock(); }, KNOCK_EVERY);
load();
