// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
(() => {
  if (window.top !== window || document.getElementById('hattieu-host')) return;

  const HOST = location.hostname.replace(/^www\./, '');
  const MAX_MARKS = 300;
  let rules = [], settings = { mascotEnabled: true, hiddenSites: [] };
  let alerts = [];        // cảnh báo nhận từ background trong phiên này
  let todos = [], watch = [], quotes = {}, quoteTimer = null;
  let presetOpen = false, bellCfgOpen = false, mailOpen = false;
  let tab = 'todo', infoSub = 'dich', toolsSub = 'crypto', subOpen = false, menuOpen = false, bellEdit = null, mailStatus = null, msAccount = '';
  let readState = null, readReady = false, lastSel = { text: '', at: 0 }, ignoreSel = false;
  const aiOpen = new Set();
  let ideas = [], ideaFilter = 'all', ideaQuery = '', openIdea = null, ideaCfgOpen = false;
  let dichState = null;
  let pomo = null, pomoStats = {}, pomoCfgOpen = false, lastNudge = 0;
  let explainState = null, products = [], shopAlert = false, dueEditId = null, editId = null;
  const DISTRACT = 'facebook.com, tiktok.com, youtube.com, x.com, instagram.com, reddit.com';
  const pageTr = { map: new Map(), tr: new Map(), running: false, stop: false, done: 0, total: 0, lang: '', showing: 'tr', error: '' };
  let bubbleTimer = null, lastBubble = 0;
  let ui = null;

  // ---------- chuẩn hoá tiếng Việt ----------
  const norm = (s, accentless) => {
    let x = s.toLowerCase();
    if (accentless) x = x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    return x;
  };
  const isWordChar = c => !!c && /[\p{L}\p{N}]/u.test(c);
  function normMap(text, accentless) {
    let out = ''; const map = [];
    for (let i = 0; i < text.length; i++) {
      const n = norm(text[i], accentless);
      for (let k = 0; k < n.length; k++) { out += n[k]; map.push(i); }
    }
    return { out, map };
  }

  // ---------- lấy các đoạn chữ trên trang (dùng cho Dịch) ----------
  function textNodes(root) {
    const out = [];
    if (!document.body) return out;
    const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.data.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || p.closest('#hattieu-host, script, style, noscript, textarea, code, pre, svg, [contenteditable=""], [contenteditable="true"]'))
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (w.nextNode() && out.length < 30000) out.push(w.currentNode);
    return out;
  }

  const active = () => settings.mascotEnabled !== false && !(settings.hiddenSites || []).includes(HOST);

  // ---------- giao diện mascot ----------
  const PET_SVG = `
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <ellipse class="shadow" cx="50" cy="95" rx="28" ry="4"/>
    <g class="body">
      <circle cx="28" cy="24" r="11" fill="#D98E1F"/><circle cx="72" cy="24" r="11" fill="#D98E1F"/>
      <circle cx="28" cy="24" r="5.5" fill="#FFC2AE"/><circle cx="72" cy="24" r="5.5" fill="#FFC2AE"/>
      <ellipse cx="50" cy="56" rx="42" ry="38" fill="#F2B544"/>
      <path d="M44 20 q6 -8 12 0" fill="none" stroke="#D98E1F" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="50" cy="66" rx="26" ry="22" fill="#FFF3DC"/>
      <g class="eyes">
        <circle cx="37" cy="50" r="5.5" fill="#23305E"/><circle cx="63" cy="50" r="5.5" fill="#23305E"/>
        <circle cx="38.8" cy="48.2" r="1.8" fill="#fff"/><circle cx="64.8" cy="48.2" r="1.8" fill="#fff"/>
      </g>
      <ellipse cx="28" cy="62" rx="6.5" ry="4.2" fill="#FF9F8E" opacity=".85"/><ellipse cx="72" cy="62" rx="6.5" ry="4.2" fill="#FF9F8E" opacity=".85"/>
      <ellipse cx="50" cy="59" rx="3" ry="2.2" fill="#23305E"/>
      <path class="mouth" d="M45 63.5 q5 4.5 10 0" fill="none" stroke="#23305E" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="39" cy="89" rx="7" ry="4" fill="#D98E1F"/><ellipse cx="61" cy="89" rx="7" ry="4" fill="#D98E1F"/>
    </g>
  </svg>`;

  // 4 nhánh theo sơ đồ: Todolist, Nhắc nhở, Crypto, Lọc (góc tính như hình vẽ, tự lật khi HaoHao nằm ở cạnh khác)
  const BRANCHES = [
    { id: 'bell', label: 'Nhắc', color: '#F0455A', angle: -90,
      menuIcon: '<path fill="#fff" d="M12 2.6c-.9 0-1.6.7-1.6 1.6v.5A6.1 6.1 0 006 10.7v3.5l-1.7 2.7c-.3.6.1 1.3.8 1.3h13.8c.7 0 1.1-.7.8-1.3L18 14.2v-3.5a6.1 6.1 0 00-4.4-6v-.5c0-.9-.7-1.6-1.6-1.6z"/><path fill="#fff" d="M9.5 19.5h5a2.5 2.5 0 01-5 0z"/>',
      icon: '<path d="M12 3.5a5.5 5.5 0 00-5.5 5.5v3.2L5 15.5h14l-1.5-3.3V9A5.5 5.5 0 0012 3.5zM10 18.5a2 2 0 004 0" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" fill="none"/>' },
    { id: 'todo', label: 'Todo', color: '#1DB394', angle: -75,
      menuIcon: '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.5" fill="#fff"/><path d="M7.8 12.4l2.9 2.9 5.6-6.1" style="stroke:var(--c)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
      icon: '<rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 12.5l2.7 2.7L16.5 9" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
    { id: 'idea', label: 'Note', color: '#F5A524', angle: -60,
      menuIcon: '<path fill="#fff" d="M6.6 2.6h7.7l5 5v12a1.8 1.8 0 01-1.8 1.8H6.6a1.8 1.8 0 01-1.8-1.8V4.4a1.8 1.8 0 011.8-1.8z"/><path d="M14.3 2.6v3.6c0 .8.6 1.4 1.4 1.4h3.6z" fill="#000" opacity=".13"/><path d="M8.3 11.6h7.4M8.3 14.6h7.4M8.3 17.6h4.4" style="stroke:var(--c)" stroke-width="1.8" stroke-linecap="round"/>',
      icon: '<path d="M6 3.5h9l3.5 3.5V20.5H6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/><path d="M9 11h6M9 15h6M14.5 3.5V7.5h4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none"/>' },
    { id: 'focus', label: 'Pomodoro', color: '#F0472D', angle: -45,
      menuIcon: '<circle cx="12" cy="13.6" r="7.6" fill="#fff"/><path d="M12 6V3.2M9.4 4.3L12 5.8l2.6-1.5" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 9.8v4.1l2.7 1.8" style="stroke:var(--c)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
      icon: '<path d="M12 7.5c-4.4 0-7.5 2.7-7.5 6.3S7.8 20.5 12 20.5s7.5-3.1 7.5-6.7S16.4 7.5 12 7.5z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 7.5V4.5M9 5.5c1 1.2 2 1.8 3 2 1-.2 2-.8 3-2M12 7.5c-1.3.6-2.6 1.6-3.2 2.8M12 7.5c1.3.6 2.6 1.6 3.2 2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>' },
    { id: 'info', label: 'Thông tin', color: '#6A48F0', angle: -30,
      menuIcon: '<path d="M12 2.8a6.5 6.5 0 00-3.9 11.7c.6.5 1 1.2 1 2v.6h5.8v-.6c0-.8.4-1.5 1-2A6.5 6.5 0 0012 2.8z" fill="none" stroke="#fff" stroke-width="2.3" stroke-linejoin="round"/><path d="M9.3 19.2h5.4M10.2 21.6h3.6" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/><circle cx="14.1" cy="7.3" r="1.3" fill="#fff"/>',
      icon: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0012 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/>' },
    { id: 'shop', label: 'Mua sắm', color: '#EC4A68', angle: -15,
      menuIcon: '<path d="M8.6 8.4V6.9a3.4 3.4 0 016.8 0v1.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/><path fill="#fff" d="M5 7.6h14l-.9 12.1a1.9 1.9 0 01-1.9 1.8H7.8a1.9 1.9 0 01-1.9-1.8z"/><circle cx="9" cy="10.6" r="1" style="fill:var(--c)"/><circle cx="15" cy="10.6" r="1" style="fill:var(--c)"/><path d="M9.3 16.4h5.4" style="stroke:var(--c)" stroke-width="1.8" stroke-linecap="round"/>',
      icon: '<path d="M5 8h14l-1.2 11.5H6.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/><path d="M9 10V7a3 3 0 016 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>' },
    { id: 'tools', label: 'Tiện ích', color: '#F2A71B', angle: 0,
      menuIcon: '<rect x="3.4" y="3.4" width="7.4" height="8.2" rx="2.2" fill="#fff"/><rect x="13.2" y="3.4" width="7.4" height="10.4" rx="2.2" fill="#fff"/><rect x="3.4" y="14" width="7.4" height="6.6" rx="2.2" fill="#fff"/><rect x="13.2" y="16.2" width="7.4" height="4.4" rx="2.2" fill="#fff"/>',
      icon: '<rect x="4" y="4" width="7" height="7" rx="1.8" stroke="currentColor" stroke-width="2" fill="none"/><rect x="13" y="4" width="7" height="7" rx="1.8" stroke="currentColor" stroke-width="2" fill="none"/><rect x="4" y="13" width="7" height="7" rx="1.8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16.5 13v7M13 16.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' }
  ];
  // Tiện ích con của nhánh 🧰 Tiện ích. Thêm tiện ích mới: thêm 1 dòng ở đây và 1 hàm render.
  const TOOLS = [
    { id: 'crypto', label: 'Crypto', emoji: '₿', color: '#D98E1F', desc: 'Theo dõi giá coin, cảnh báo giá',
      icon: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M9.5 8h4a2 2 0 010 4h-4h4.5a2 2 0 010 4H9.5V8M11 6v2M11 16v2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>' },
    { id: 'adblock', label: 'Chặn quảng cáo', emoji: '🛡️', color: '#2E9E6B', desc: 'Ẩn quảng cáo, trang nhẹ hơn',
      icon: '<path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6z" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linejoin="round"/><path d="M8.5 8.5l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' }
  ];
  const DIST = 244, SAT = 58, C = 38, SUB = 46, SUBD = 92, STAG = 46; // STAG: vòng xen kẽ đẩy ra xa hơn cho nhãn khỏi chồng nhau // khoảng cách nhánh, cỡ vòng tròn nhánh, tâm HaoHao

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
  .wrap { position: fixed; z-index: 2147483647; width: 76px; height: 76px; }
  .pet { all: unset; cursor: grab; width: 76px; height: 76px; display: block; position: relative; touch-action: none; z-index: 3; }
  .pet:focus-visible { outline: 3px solid #23305E; outline-offset: 3px; border-radius: 50%; }
  .pet svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 4px 6px rgba(35,48,94,.25)); }
  .shadow { fill: rgba(35,48,94,.18); }
  .eyes { transform-origin: 50px 50px; animation: blink 5s infinite; }
  @keyframes blink { 0%,94%,100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
  .pet.happy .body { animation: hop .5s ease 2; transform-origin: 50px 90px; }
  .pet.alert .body { animation: wiggle .4s ease 3; transform-origin: 50px 90px; }
  .pet.remind .body { animation: hop .6s ease 3; transform-origin: 50px 90px; }
  @keyframes hop { 50% { transform: translateY(-9px) scaleY(1.04); } }
  @keyframes wiggle { 25% { transform: rotate(-9deg); } 75% { transform: rotate(9deg); } }
  .badge { position: absolute; top: -2px; right: -2px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px;
    background: #E85D5D; color: #fff; font: 700 12px/22px "Segoe UI", system-ui, sans-serif; text-align: center; border: 2px solid #fff; }
  .badge[hidden] { display: none; }
  .pomo-pill { all: unset; cursor: pointer; position: absolute; left: 50%; top: -24px; transform: translateX(-50%); z-index: 4; white-space: nowrap;
    background: #E85D5D; color: #fff; font: 800 12px/1 "Segoe UI", system-ui, sans-serif; padding: 5px 9px; border-radius: 999px; border: 2px solid #fff; box-shadow: 0 3px 8px rgba(35,48,94,.25); font-variant-numeric: tabular-nums; }
  .pomo-pill.brk { background: #2F9E7E; } .pomo-pill.pz { background: #6B7394; }
  .pomo-pill[hidden] { display: none; }
  .pomo { margin: 6px 10px 2px; padding: 8px 10px; border-radius: 14px; background: #FFF1EE; border: 1.5px solid #F6C5BC; }
  .pomo.brk { background: #E8F7F1; border-color: #B5E3D3; }
  .pomo .ptop { display: flex; align-items: center; gap: 10px; }
  .pomo .clock { font: 800 24px/1 "Segoe UI", system-ui, sans-serif; color: #E85D5D; font-variant-numeric: tabular-nums; min-width: 72px; }
  .pomo.brk .clock { color: #2F9E7E; }
  .pomo .pinfo { flex: 1; min-width: 0; font-size: 12.5px; color: #3A4470; line-height: 1.35; }
  .pomo .pinfo b { display: block; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pomo .pbar { height: 6px; background: rgba(35,48,94,.1); border-radius: 3px; overflow: hidden; margin: 8px 0 6px; }
  .pomo .pbar i { display: block; height: 100%; background: #E85D5D; }
  .pomo.brk .pbar i { background: #2F9E7E; }
  .pomo .line { gap: 6px; }
  .tomato { all: unset; cursor: pointer; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-size: 14px; flex: none; opacity: .55; }
  .tomato:hover, .tomato:focus-visible { opacity: 1; background: #FFF1EE; }
  .tomato.on { opacity: 1; }
  .todo .tx { cursor: text; }

  /* các nhánh */
  .links { position: absolute; left: -${DIST + STAG + SAT}px; top: -${DIST + STAG + SAT}px; width: ${2 * (DIST + STAG + SAT) + 76}px; height: ${2 * (DIST + STAG + SAT) + 76}px; pointer-events: none; overflow: visible; z-index: 1; }
  .links line { stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 420; stroke-dashoffset: 420; transition: stroke-dashoffset .3s ease; }
  .links circle { r: 3.6px; opacity: 0; transition: opacity .2s .15s; }
  .menu-open .links line { stroke-dashoffset: 0; }
  .menu-open .links circle:not(.sub) { opacity: 1; }
  .sat { all: unset; position: absolute; width: ${SAT}px; height: ${SAT}px; border-radius: 50%; cursor: pointer; z-index: 2; color: #fff;
    background: radial-gradient(circle at 50% 22%, color-mix(in srgb, var(--c) 55%, #fff) 0%, var(--c) 58%, color-mix(in srgb, var(--c) 82%, #000) 100%);
    border: 3px solid #fff; display: grid; place-items: center;
    box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--c) 45%, transparent), 0 0 18px color-mix(in srgb, var(--c) 45%, transparent), 0 6px 14px rgba(35,48,94,.18);
    transform: scale(0); opacity: 0; transition: transform .25s cubic-bezier(.3,1.5,.6,1), opacity .2s, box-shadow .2s; }
  .sat svg { width: 28px; height: 28px; margin-top: -8px; filter: drop-shadow(0 1px 1px rgba(0,0,0,.15)); }
  .sat b { position: absolute; left: 50%; top: calc(100% - 15px); transform: translateX(-50%); white-space: nowrap;
    background: #fff; color: #23305E; font-size: 11px; font-weight: 800; letter-spacing: -.01em; line-height: 1; padding: 5px 10px; border-radius: 999px;
    border: 1.5px solid color-mix(in srgb, var(--c) 50%, transparent); box-shadow: 0 2px 10px color-mix(in srgb, var(--c) 30%, transparent); }
  .menu-open .sat { transform: scale(1); opacity: 1; }
  .menu-open .sat:nth-of-type(2) { transition-delay: .04s; } .menu-open .sat:nth-of-type(3) { transition-delay: .08s; } .menu-open .sat:nth-of-type(4) { transition-delay: .12s; }
  .menu-open .sat:nth-of-type(7) { transition-delay: .24s; }
  .fy .sat svg { margin-top: 8px; } .fy .sat b { top: auto; bottom: calc(100% - 15px); }
  .fy .sat .n { top: auto; bottom: -7px; }
  .fy .sat.child svg { margin-top: 6px; } .fy .sat.child b { top: auto; bottom: calc(100% - 12px); }
  .sat.child { width: ${SUB}px; height: ${SUB}px; border-width: 2.5px; }
  .sat.child svg { width: 20px; height: 20px; margin-top: -6px; } .sat.child b { font-size: 9.5px; padding: 4px 8px; top: calc(100% - 12px); }
  .menu-open .sat.child { transform: scale(0); opacity: 0; transition-delay: 0s; }
  .menu-open.sub-open .sat.child { transform: scale(1); opacity: 1; }
  .links line.sub { stroke-dasharray: 4 5; stroke-dashoffset: 0; opacity: 0; transition: opacity .2s; }
  .sub-open .links line.sub, .sub-open .links circle.sub { opacity: 1; }
  .up-row { display: grid; grid-template-columns: 20px 1fr auto; gap: 8px; align-items: center; padding: 5px 2px; border-bottom: 1px solid #F0F2F7; font-size: 13px; }
  .up-row .ut { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .up-row .uw { font-size: 11.5px; color: #6B7394; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .bell-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 10px 6px; border-bottom: 1px dashed #C9CEDF; }
  .bell-bar .moon { font-size: 12px; color: #6B7394; }
  .pre-tg { all: unset; cursor: pointer; font-size: 12.5px; font-weight: 700; color: #E85D5D; padding: 4px 10px; border-radius: 999px; border: 1.5px solid #F4B4B4; white-space: nowrap; }
  .pre-tg:hover, .pre-tg.on { background: #FDE3E3; }
  .pre-tg:focus-visible, .pc:focus-visible { outline: 2px solid #23305E; outline-offset: 2px; }
  .pre-box { padding: 8px 12px 10px; background: #FFF8F6; border-bottom: 1px dashed #C9CEDF; display: flex; flex-direction: column; gap: 6px; }
  .pre-g { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .pre-t { font-size: 11px; font-weight: 800; color: #9AA1BE; text-transform: uppercase; width: 66px; flex: none; }
  .pc { all: unset; cursor: pointer; font-size: 12px; font-weight: 600; padding: 4px 9px; border-radius: 8px; background: #fff; border: 1px solid #E3E6F0; white-space: nowrap; }
  .pc:hover { border-color: #E85D5D; background: #FFF1EE; }
  .pc.own { align-self: flex-start; color: #6B7394; border-style: dashed; }
  .when-hint { display: flex; gap: 6px; padding: 0 10px 6px; flex-wrap: wrap; }
  .when-hint[hidden] { display: none; }
  .srcl { all: unset; cursor: pointer; display: block; font-size: 11.5px; color: #2E7DD7; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
  .srcl:hover { text-decoration: underline; }
  .tool-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #EEF0F6; }
  .tb-back { all: unset; cursor: pointer; font-size: 12.5px; font-weight: 700; color: #6B7394; padding: 3px 8px; border-radius: 8px; }
  .tb-back:hover, .tb-back:focus-visible { background: #EEF0F6; color: #23305E; }
  .tb-name { font-weight: 800; font-size: 14px; }
  .cry-add { gap: 6px; } .cry-add select { max-width: 120px; } .cry-add .b { min-width: 18px; text-align: center; }
  .cry { display: grid; grid-template-columns: 1fr auto auto auto; gap: 10px; align-items: center; padding: 7px 4px; border-bottom: 1px solid #F0F2F7; font-size: 13.5px; }
  .cry .sym { font-weight: 800; letter-spacing: .02em; }
  .cry .px { font-variant-numeric: tabular-nums; font-weight: 600; }
  .cry .ch { font-size: 11.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; font-variant-numeric: tabular-nums; min-width: 58px; text-align: center; }
  .cry .err2 { grid-column: 2 / 4; font-size: 11.5px; color: #C23B3B; text-align: right; }
  .cry-hd { all: unset; cursor: pointer; display: block; width: 100%; box-sizing: border-box; margin-top: 10px; padding: 8px 10px; border-radius: 10px; background: #FFF6E5; font-size: 12.5px; font-weight: 700; color: #8A5A00; }
  .cry-hd:hover, .cry-hd:focus-visible { background: #FFEBC2; }
  .rule .ic { margin-left: auto; }
  .mail-hd { background: #EEF5FF !important; color: #1F5FAF !important; }
  .mail-hd:hover, .mail-hd.on { background: #DCEBFF !important; }
  .mail-in { padding: 6px 2px 2px; }
  .foot { font-size: 11px; color: #9AA1BE; text-align: center; margin-top: 10px; }
  .tools-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px; }
  .tool { all: unset; cursor: pointer; border: 1.5px solid #E6E9F2; border-radius: 16px; padding: 14px 12px; background: #fff; display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
    box-shadow: 0 2px 8px rgba(35,48,94,.06); transition: transform .15s, box-shadow .15s, border-color .15s; }
  .tool:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 8px 20px color-mix(in srgb, var(--c) 22%, transparent); }
  .tool .ti { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; color: #fff;
    background: radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--c) 55%, #fff) 0%, var(--c) 60%, color-mix(in srgb, var(--c) 82%, #000) 100%);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--c) 40%, transparent); }
  .tool .ti svg { width: 24px; height: 24px; }
  .tool b { display: block; font-size: 15.5px; font-weight: 800; color: #23305E; line-height: 1.25; }
  .tool span.td { display: block; font-size: 12.5px; color: #6B7394; line-height: 1.4; margin-top: 3px; }
  .tool:focus-visible { outline: 2px solid #D98E1F; outline-offset: 2px; }
  .menu-open .sat:nth-of-type(5) { transition-delay: .16s; } .menu-open .sat:nth-of-type(6) { transition-delay: .2s; }
  .menu-open .sat:hover { transform: scale(1.08); box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--c) 60%, transparent), 0 0 26px color-mix(in srgb, var(--c) 60%, transparent), 0 8px 18px rgba(35,48,94,.22); }
  .sat:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
  .sat .n { position: absolute; top: -7px; right: -7px; z-index: 1; min-width: 24px; height: 24px; border-radius: 12px; background: #F0293E; color: #fff; font: 800 12.5px/20px "Segoe UI", system-ui, sans-serif; text-align: center; padding: 0 6px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(240,41,62,.4); }
  .sat .n[hidden] { display: none; }

  .bubble { position: absolute; width: 270px; padding: 12px 14px; background: #fff; color: #23305E; border: 2px solid #23305E;
    border-radius: 16px; font-size: 14px; line-height: 1.45; cursor: pointer; box-shadow: 4px 4px 0 #F2B544; z-index: 4; }
  .bubble .t { font-weight: 700; display: block; margin-bottom: 2px; }
  .bubble .note { display: block; margin-top: 6px; padding: 6px 8px; border-radius: 10px; background: #FFF0C7; font-size: 12.5px; color: #3A4470; }
  .bubble .note.late { background: #FDE3E3; color: #9B2C2C; }
  .bubble.tb { width: 272px; padding: 10px 12px; cursor: default; box-shadow: 4px 4px 0 var(--k); border-color: var(--k); }
  .tb-top { display: flex; align-items: center; gap: 10px; }
  .tb-sc { width: 40px; height: 40px; border-radius: 50%; flex: none; display: grid; place-items: center; background: var(--k); color: #fff; font: 800 15px/1 "Segoe UI", system-ui, sans-serif; }
  .tb-lv { font-weight: 800; font-size: 15px; line-height: 1.2; color: var(--k); }
  .tb-lv small { display: block; font-weight: 600; font-size: 11px; color: #6B7394; margin-top: 2px; }
  .tb-x { all: unset; cursor: pointer; margin-left: auto; align-self: flex-start; width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; color: #9AA1BE; font-size: 13px; }
  .tb-x:hover, .tb-x:focus-visible { background: #EEF0F6; color: #23305E; }
  .tb-why { font-size: 12px; color: #3A4470; margin-top: 7px; line-height: 1.4; }
  .tb-cp { margin-top: 6px; font-size: 12px; font-weight: 800; color: #D0391B; background: #FFF1EE; border-radius: 8px; padding: 4px 8px; }
  .tb-rv { margin-top: 7px; padding: 6px 9px; border-radius: 10px; font-size: 12px; line-height: 1.4; }
  .tb-rv > b { display: block; font-size: 11.5px; margin-bottom: 2px; }
  .tb-rv.bad { background: #FFF4F5; border: 1px solid #F6C3CA; } .tb-rv.bad > b { color: #B42336; }
  .tb-rv.good { background: #F2FBF7; border: 1px solid #BFE6D6; } .tb-rv.good > b { color: #1E7A5F; }
  .tb-rs { display: block; font-size: 10.5px; color: #8A91AE; margin: -1px 0 3px; }
  .tb-rl { margin-top: 3px; } .tb-rl em { font-style: normal; font-weight: 800; color: #B42336; margin-right: 4px; }
  .tb-q { font-style: italic; color: #3A4470; } .tb-q mark { background: #FFD6DB; color: #B42336; font-weight: 800; font-style: normal; border-radius: 3px; padding: 0 2px; }
  .tb-hook { all: unset; display: block; box-sizing: border-box; width: 100%; margin-top: 6px; padding: 6px 9px; border-radius: 10px; font-size: 12px; line-height: 1.35; }
  .tb-hook.wait { background: #F1F4FA; color: #6B7394; }
  .tb-hook.ok { background: #E8F7F1; color: #1E7A5F; font-weight: 700; }
  .tb-hook.hot { cursor: pointer; background: linear-gradient(135deg, #FFF1EE, #FFE3D6); border: 1.5px solid #F7A48F; color: #3A4470; }
  .tb-hook.hot b { display: block; color: #D0391B; font-size: 13px; } .tb-hook.hot span { font-size: 11.5px; }
  .tb-hook.hot:hover { border-color: #EE4D2D; } .tb-hook.hot:focus-visible { outline: 2px solid #EE4D2D; }
  .tb-go2.pulse { animation: tbp 1.6s ease-in-out infinite; }
  @keyframes tbp { 50% { box-shadow: 0 0 0 5px rgba(46,125,215,.25); } }
  .tb-acts { display: flex; gap: 6px; margin-top: 8px; } .tb-acts .tb-go { margin-top: 0; flex: 1; padding: 9px 4px; font-size: 12.5px; white-space: nowrap; } .tb-acts .tb-go:first-child { flex: 0 0 92px; } .tb-acts .tb-go:only-child { flex: 1; }
  .tb-go2 { background: #2E7DD7 !important; } .tb-go2:hover { background: #2567B5 !important; }
  .tb-go { all: unset; cursor: pointer; display: block; box-sizing: border-box; width: 100%; text-align: center; margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: #EE4D2D; color: #fff; font-weight: 800; font-size: 13px; }
  .tb-go:hover { background: #D73F21; } .tb-go:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
  .tb-aff { font-size: 10px; color: #9AA1BE; margin-top: 5px; text-align: center; }
  .panel { position: absolute; width: 380px; max-width: calc(100vw - 24px); max-height: min(440px, 58vh); display: flex; flex-direction: column; z-index: 4;
    background: #FFFDF6; color: #23305E; border: 2px solid #23305E; border-radius: 18px; box-shadow: 6px 6px 0 var(--tc, #F2B544); overflow: hidden; }
  [hidden] { display: none !important; }
  .up { bottom: calc(100% + 10px); } .down { top: calc(100% + 10px); }
  .al { right: 0; } .ar { left: 0; }
  .tabs { display: flex; align-items: flex-end; background: #23305E; padding: 5px 5px 0; gap: 1px; }
  .tabs button { all: unset; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 7px 7px 6px; border-radius: 10px 10px 0 0; color: #AEB5CF; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
  .tabs button svg { width: 16px; height: 16px; color: var(--c); flex: none; }
  .tabs button span { display: none; }
  .tabs button.on { background: #FFFDF6; color: #23305E; padding-right: 9px; }
  .tabs button.on span { display: inline; }
  .tabs button:hover:not(.on) { background: rgba(255,255,255,.08); }
  .tabs button:focus-visible { outline: 2px solid #F2B544; outline-offset: -2px; }
  .tabs .big, .tabs .x { margin-left: auto; padding: 7px 6px; font-size: 13px; color: #AEB5CF; }
  .tabs .x { margin-left: 0; }
  .panel.bigp { width: 520px; max-height: min(680px, 82vh); }
  .sub { padding: 10px 14px 0; font-size: 12.5px; color: #6B7394; }
  .row { display: flex; gap: 6px; padding: 10px 12px; border-bottom: 1px dashed #C9CEDF; flex-wrap: wrap; }
  input, select { font: inherit; font-size: 13.5px; color: #23305E; background: #fff; border: 1.5px solid #23305E; border-radius: 10px; padding: 7px 9px; min-width: 0; }
  input:focus, select:focus { outline: none; box-shadow: 0 0 0 3px rgba(242,181,68,.5); }
  .grow { flex: 1; }
  .full { flex-basis: 100%; }
  button.b { all: unset; cursor: pointer; padding: 7px 11px; border-radius: 10px; font-size: 13px; font-weight: 600; background: #23305E; color: #fff; white-space: nowrap; }
  button.b.ghost { background: transparent; color: #23305E; border: 1.5px solid #23305E; padding: 5.5px 9.5px; }
  button.b:focus-visible, button.ic:focus-visible { outline: 2px solid #D98E1F; outline-offset: 2px; }
  button.ic { all: unset; cursor: pointer; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; color: #6B7394; font-size: 16px; flex: none; }
  button.ic:hover { background: #FFF0C7; color: #23305E; }
  .view { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .view > * { flex-shrink: 0; }
  .view > .body-list, .view > .fm { flex: 1 1 auto; flex-shrink: 1; min-height: 0; }
  .body-list { overflow-y: auto; padding: 4px 10px 8px; flex: 1; min-height: 0; }
  .askbox { border-top: 2px solid #2E7DD7; background: #EEF5FF; }
  .askbox input { border-color: #2E7DD7; }
  .grp { margin-top: 8px; }
  .grp h3 { margin: 0 0 4px; font-size: 13px; font-weight: 800; display: flex; justify-content: space-between; }
  .grp h3 span { font-weight: 600; color: #6B7394; }
  .it { all: unset; display: block; width: 100%; cursor: pointer; padding: 6px 8px; margin: 2px 0; border-radius: 8px; font-size: 12.5px; line-height: 1.4; color: #3A4470; }
  .it:hover, .it:focus-visible { background: #FFF0C7; }
  .it b { background: #FFE08A; color: #23305E; padding: 0 2px; border-radius: 3px; }
  .empty { font-size: 13px; color: #6B7394; padding: 10px 2px; line-height: 1.5; }
  .al-item { font-size: 12.5px; padding: 6px 8px; border-left: 3px solid #E85D5D; background: #fff; margin: 4px 0; border-radius: 0 8px 8px 0; }
  .pf { display: flex; gap: 6px; padding: 7px 10px; border-top: 1px dashed #C9CEDF; flex-wrap: wrap; }

  .today { display: flex; align-items: center; gap: 10px; margin: 8px 10px 2px; padding: 6px 10px; border-radius: 14px; background: linear-gradient(135deg, #E8F7F1, #FFF6DD); }
  .today .big { font: 800 24px/1 "Segoe UI", system-ui, sans-serif; color: #2F9E7E; min-width: 38px; text-align: center; }
  .today .tinfo { display: flex; flex-direction: column; font-size: 13px; line-height: 1.35; flex: 1; min-width: 0; }
  .today .tinfo span { color: #6B7394; font-size: 12.5px; }
  .today em { font-style: normal; font-size: 11.5px; font-weight: 800; color: #fff; background: #E85D5D; border-radius: 999px; padding: 3px 9px; white-space: nowrap; }
  .addtodo { align-items: center; }
  .ic2 { all: unset; cursor: pointer; width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid #23305E; display: grid; place-items: center; font-size: 15px; flex: none; }
  .ic2:hover { background: #FFF0C7; } .ic2:focus-visible { outline: 2px solid #D98E1F; outline-offset: 2px; }
  .duebox { flex-basis: 100%; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .duebox .dl { font-size: 12px; color: #2F9E7E; font-weight: 700; }
  .gh { font-size: 11.5px; font-weight: 800; color: #6B7394; text-transform: uppercase; letter-spacing: .03em; margin: 10px 0 2px; }
  .gh.late { color: #E85D5D; } .gh.dn { color: #9AA1BE; }
  .lk2 { all: unset; cursor: pointer; font-size: 12px; color: #6B7394; text-decoration: underline; margin: 6px 4px; }
  .lk2:hover { color: #E85D5D; }
  .todo { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px solid #EEF0F6; }
  .todo input[type=checkbox] { width: 18px; height: 18px; accent-color: #2F9E7E; padding: 0; flex: none; }
  .todo .tx { flex: 1; font-size: 13.5px; line-height: 1.35; word-break: break-word; }
  .todo .tm { display: block; font-size: 11.5px; color: #6B7394; }
  .todo .tm.late { color: #E85D5D; font-weight: 700; }
  .todo.done .tx { text-decoration: line-through; color: #9AA1BE; }

  .coin { display: grid; grid-template-columns: 1fr auto auto auto; gap: 8px; align-items: center; padding: 8px 4px; border-bottom: 1px solid #EEF0F6; font-size: 13.5px; }
  .coin .sym { font-weight: 800; }
  .coin .src { display: block; font-size: 11px; color: #9AA1BE; font-weight: 400; }
  .coin .px { font-variant-numeric: tabular-nums; font-weight: 600; }
  .coin .ch { font-size: 12px; font-weight: 700; padding: 2px 6px; border-radius: 6px; font-variant-numeric: tabular-nums; }
  .ch.up { background: #DDF3EB; color: #1E7A5F; } .ch.down { background: #FDE3E3; color: #C23B3B; }
  .coin .err { grid-column: 2 / 4; font-size: 11.5px; color: #C23B3B; }
  .rule { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 6px 4px; }
  .rule input { width: 16px; height: 16px; accent-color: #D98E1F; padding: 0; }
  .rule span { flex: 1; }
  .acts { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .presets { display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 12px; border-bottom: 1px dashed #C9CEDF; }
  .chip { all: unset; cursor: pointer; padding: 6px 10px; border-radius: 999px; border: 1.5px solid #23305E; font-size: 13px; font-weight: 600; background: #fff; }
  .chip:hover { background: #FFF0C7; } .chip:focus-visible { outline: 2px solid #D98E1F; outline-offset: 2px; }
  .chip.on { background: #23305E; color: #fff; }
  .rem { display: grid; grid-template-columns: auto 1fr auto auto auto; gap: 8px; align-items: center; padding: 8px 4px; border-bottom: 1px solid #EEF0F6; }
  .rem .ico { font-size: 20px; width: 28px; text-align: center; }
  .rem .nm { font-weight: 700; font-size: 13.5px; }
  .rem .ds { display: block; font-size: 11.5px; color: #6B7394; font-weight: 400; }
  .rem .nx { display: block; font-size: 11.5px; color: #C23B3B; font-weight: 600; }
  .rem.off { opacity: .5; }
  .rem input[type=checkbox] { width: 18px; height: 18px; accent-color: #E85D5D; padding: 0; }
  .fm { padding: 10px 12px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .fm .lb { font-size: 12px; font-weight: 700; color: #6B7394; margin-bottom: 4px; display: block; }
  .fm .line { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .icons { flex-wrap: nowrap !important; overflow: hidden; }
  .icons button { all: unset; cursor: pointer; font-size: 19px; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; border: 1.5px solid transparent; }
  .icons button.on { border-color: #23305E; background: #FFF0C7; }
  .icons button:focus-visible { outline: 2px solid #D98E1F; }
  .tchip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 10px; border-radius: 999px; background: #FDE3E3; color: #23305E; font-weight: 700; font-size: 13px; }
  .days button { all: unset; cursor: pointer; width: 34px; height: 30px; text-align: center; line-height: 30px; border-radius: 8px; border: 1.5px solid #C9CEDF; font-size: 12.5px; font-weight: 700; }
  .days button.on { background: #E85D5D; border-color: #E85D5D; color: #fff; }
  .days button:focus-visible { outline: 2px solid #23305E; }
  .snd { display: flex; gap: 8px; align-items: center; font-size: 12.5px; flex-basis: 100%; }
  .snd input { width: 16px; height: 16px; padding: 0; accent-color: #E85D5D; }
  .src { display: flex; gap: 8px; align-items: center; padding: 10px 12px 0; font-size: 12.5px; color: #3A4470; }
  .src b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .md { font-size: 13.5px; line-height: 1.55; color: #23305E; }
  .md p { margin: 6px 0; } .md ul { margin: 4px 0 8px; padding-left: 18px; } .md li { margin: 3px 0; }
  .ts { all: unset; cursor: pointer; background: #DCEBFF; color: #1F5FAF; font-weight: 800; font-size: 12px; padding: 0 6px; border-radius: 6px; margin-right: 4px; }
  .ts:hover, .ts:focus-visible { background: #2E7DD7; color: #fff; }
  .qa { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #C9CEDF; }
  .qa .q { font-weight: 800; font-size: 13px; margin-bottom: 2px; }
  .loading { display: flex; gap: 10px; align-items: center; padding: 18px 4px; color: #3A4470; font-size: 13.5px; }
  .dots i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #2E7DD7; margin-right: 3px; animation: dot 1s infinite; }
  .dots i:nth-child(2) { animation-delay: .15s; } .dots i:nth-child(3) { animation-delay: .3s; }
  @keyframes dot { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-4px); } }
  .err { background: #FDE3E3; color: #9B2C2C; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin: 8px 0; }
  .setup ol { margin: 6px 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
  .selchip { position: fixed; z-index: 2147483647; pointer-events: auto; display: flex; background: #23305E; border-radius: 999px; box-shadow: 0 6px 16px rgba(35,48,94,.35); overflow: hidden; }
  .selchip button { all: unset; cursor: pointer; color: #fff; font: 700 12.5px/1 "Segoe UI", system-ui, sans-serif; padding: 8px 11px; white-space: nowrap; }
  .selchip button + button { border-left: 1px solid rgba(255,255,255,.25); }
  .selchip button:hover { background: #7C5CFF; } .selchip button.sv:hover { background: #C0A000; }
  .selchip button:focus-visible { outline: 3px solid #F2B544; outline-offset: -3px; }
  .plink { all: unset; cursor: pointer; font-weight: 700; color: #23305E; display: block; }
  .plink:hover { color: #EE4D2D; text-decoration: underline; }
  .saved { display: inline-block; background: #E8F7F1; color: #1E7A5F; font-weight: 800; font-size: 12px; border-radius: 999px; padding: 3px 10px; margin: 4px 0; }
  .subtabs { display: flex; gap: 5px; padding: 8px 10px 2px; }
  .subtabs .chip { padding: 5px 6px; font-size: 12px; }
  .subtabs .chip { flex: 1; text-align: center; }
  .row:has(+ .shopbar), .web:has(+ .shopbar) { border-bottom: 0; }
  .shopbar { display: flex; gap: 5px; flex-wrap: wrap; padding: 0 12px 8px; border-bottom: 1px dashed #C9CEDF; align-items: center; }
  .shopbar .lb2 { font-size: 11.5px; font-weight: 800; color: #6B7394; margin-right: 2px; }
  .shopbar .chip, .cmp .chip { padding: 4px 9px; font-size: 12px; }
  .pcard { border: 1.5px solid #F4C9D2; background: #FFF7F9; border-radius: 14px; padding: 10px 12px; margin: 8px 0; }
  .pcard .pt { font-weight: 700; font-size: 13.5px; line-height: 1.35; }
  .pcard .pp { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 6px 0; }
  .pcard .now { font: 800 18px/1 "Segoe UI", system-ui, sans-serif; color: #EC4A68; }
  .vd { display: inline-block; font-size: 11.5px; font-weight: 800; border-radius: 999px; padding: 3px 9px; }
  .vd.good { background: #DDF3EB; color: #1E7A5F; } .vd.ok, .vd.na { background: #EEF0F6; color: #5B648A; }
  .vd.warn { background: #FFF1D6; color: #9A6200; } .vd.bad { background: #FDE3E3; color: #C23B3B; }
  .spark { display: block; width: 100%; height: 34px; margin: 2px 0 4px; }
  .pcard .line { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 6px; }
  .pcard .lb { font-size: 12px; color: #6B7394; font-weight: 700; }
  .cmp { margin-top: 6px; }
  .cmp .ch3 { font-size: 11.5px; font-weight: 800; color: #6B7394; margin-bottom: 4px; }
  .trust-pill { all: unset; cursor: pointer; position: absolute; left: -14px; top: -8px; z-index: 4; font: 800 12px/1 "Segoe UI", system-ui, sans-serif; color: #fff;
    padding: 5px 8px; border-radius: 999px; border: 2px solid #fff; box-shadow: 0 3px 8px rgba(35,48,94,.25); background: #6B7394; white-space: nowrap; }
  .trust-pill.good { background: #1E9E6F; } .trust-pill.ok { background: #2E7DD7; } .trust-pill.warn { background: #E08A00; } .trust-pill.bad { background: #E0344B; }
  .trust-pill[hidden] { display: none; }
  .menu-open .trust-pill { opacity: 0; pointer-events: none; }
  .tcard { border-radius: 14px; padding: 12px; margin: 8px 0; background: #fff; border: 1.5px solid #E3E6F0; --tc: #2E7DD7; }
  .tcard.good { --tc: #1E9E6F; background: #F2FBF7; border-color: #BFE6D6; } .tcard.warn { --tc: #E08A00; background: #FFF9EE; border-color: #F5DDB0; }
  .tcard.bad { --tc: #E0344B; background: #FFF4F5; border-color: #F6C3CA; } .tcard.ok { background: #F4F8FF; border-color: #C9DCF7; }
  .ttop { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
  .tring { width: 54px; height: 54px; border-radius: 50%; flex: none; display: grid; place-items: center;
    background: radial-gradient(closest-side, #fff 76%, transparent 78% 100%), conic-gradient(var(--tc) calc(var(--v) * 1%), #E6E9F2 0); }
  .tring b.k3 { font-size: 15px !important; }
  .tring b { font: 800 18px/1 "Segoe UI", system-ui, sans-serif; color: var(--tc); }
  .tlv { font-size: 17px; font-weight: 800; color: var(--tc); }
  .tsub { font-size: 11.5px; color: #6B7394; }
  .tsec { font-size: 12px; font-weight: 800; color: #3A4470; margin: 10px 0 4px; }
  .tli { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; line-height: 1.4; padding: 2px 0; }
  .tli i { font-style: normal; flex: none; width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; font-size: 10.5px; font-weight: 900; color: #fff; margin-top: 1px; }
  .tli.ok i { background: #1E9E6F; } .tli.warn i { background: #E08A00; } .tli.bad i { background: #E0344B; }
  .tgo { margin-top: 10px; width: 100%; box-sizing: border-box; text-align: center; }
  .rvi { background: #FFF6F6; border: 1px solid #F6D3D7; border-radius: 10px; padding: 7px 9px; margin: 5px 0; }
  .rvh { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #B42336; }
  .rvn { margin-left: auto; font-size: 11px; font-weight: 800; background: #FDE3E3; border-radius: 999px; padding: 1px 7px; }
  .rvq { font-size: 12px; color: #3A4470; font-style: italic; margin-top: 4px; line-height: 1.4; }
  .rvq mark { background: #FFD6DB; color: #B42336; font-style: normal; font-weight: 800; border-radius: 3px; padding: 0 2px; }
  .tnote2 { font-size: 11.5px; color: #6B7394; margin: 4px 0; }
  .tnote { font-size: 11px; color: #8A91AE; margin-top: 8px; line-height: 1.4; }
  .buybox { border-radius: 14px; padding: 12px; margin: 6px 0 8px; background: linear-gradient(135deg, #FFF1EE, #FFF8E8); border: 1.5px solid #F7B5A5; }
  .buybox .bt { font-size: 15px; font-weight: 800; color: #D0391B; }
  .buybox .big2 { display: block; text-align: center; margin: 10px 0 2px; padding: 10px 12px; font-size: 14px; background: #EE4D2D; }
  .samebox { border-radius: 14px; padding: 10px 12px; margin: 6px 0 8px; background: #F4F8FF; border: 1.5px solid #C9DCF7; }
  .same { padding: 8px 0; border-bottom: 1px solid #DDE7F7; } .same:last-of-type { border-bottom: 0; }
  .same.pick { background: #FFF8E1; border: 1.5px solid #F2B544; border-radius: 12px; padding: 8px 10px; margin: 4px -4px; }
  .same .spk { font-size: 11.5px; font-weight: 800; color: #9A6200; margin-bottom: 3px; }
  .same .sl1 { display: flex; align-items: center; gap: 8px; }
  .same .sl1 b { font-size: 15px; color: #1E7A5F; font-variant-numeric: tabular-nums; }
  .same .sl1 em { font-style: normal; font-size: 11px; font-weight: 800; background: #DDF3EB; color: #1E7A5F; border-radius: 999px; padding: 2px 7px; }
  .same .sl1 .b { margin-left: auto; padding: 3px 12px; font-size: 12px; }
  .same .snm { font-size: 12.5px; color: #3A4470; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 3px; }
  .same .stg { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
  .same .st { font-size: 11px; font-weight: 700; border-radius: 6px; padding: 1px 6px; background: #EEF0F6; color: #5B648A; }
  .same .st.ok { background: #DDF3EB; color: #1E7A5F; } .same .st.warn { background: #FFF1D6; color: #9A6200; }
  .tb-2 { all: unset; cursor: pointer; display: block; width: 100%; box-sizing: border-box; text-align: center; margin-top: 6px; padding: 6px; border-radius: 10px; border: 1.5px solid #2E7DD7; color: #2E7DD7; font-weight: 800; font-size: 12.5px; }
  .tb-2:hover { background: #EEF5FF; }
  .stabs { display: flex; gap: 4px; margin: 10px 12px 2px; padding: 4px; background: #F1EEF4; border-radius: 12px; }
  .stabs button { all: unset; cursor: pointer; flex: 1; text-align: center; padding: 8px 6px; border-radius: 9px; font-size: 13px; font-weight: 800; color: #5B648A; }
  .stabs button.on { background: #fff; color: #EE4D2D; box-shadow: 0 1px 4px rgba(35,48,94,.15); }
  .stabs button:focus-visible { outline: 2px solid #EE4D2D; }
  .optwait { text-align: center; padding: 22px 12px; font-size: 13px; color: #3A4470; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .optwait small { color: #8A91AE; font-size: 11.5px; } .optwait.ok { color: #1E7A5F; font-weight: 800; }
  .spin { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #F4D2CA; border-top-color: #EE4D2D; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .opt { --k: #2E7DD7; display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 10px; margin: 8px 0; border-radius: 14px; background: #fff; border: 1.5px solid #E6E9F2; }
  .opt.good { --k: #1E9E6F; } .opt.warn { --k: #E08A00; } .opt.bad { --k: #E0344B; background: #FFF8F8; }
  .oring { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(closest-side, #fff 74%, transparent 76% 100%), conic-gradient(var(--k) calc(var(--v) * 1%), #E6E9F2 0); }
  .oring b { font: 800 14px/1 "Segoe UI", system-ui, sans-serif; color: var(--k); }
  .othumb { position: relative; width: 56px; height: 56px; border-radius: 10px; overflow: hidden; background: #F1F4FA; }
  .othumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .othumb .osc { position: absolute; left: 3px; bottom: 3px; min-width: 22px; padding: 1px 5px; border-radius: 999px; background: var(--k); color: #fff; font: 800 11px/16px "Segoe UI", system-ui, sans-serif; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
  .omid { min-width: 0; }
  .oshop { display: flex; align-items: center; gap: 5px; }
  .oshop .on { font-weight: 800; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .oshop em { font-style: normal; flex: none; font-size: 10px; font-weight: 800; color: #fff; border-radius: 4px; padding: 1px 5px; } .oshop .om { background: #D0011B; } .oshop .op { background: #EE4D2D; }
  .ometa { font-size: 11.5px; color: #6B7394; margin-top: 2px; display: flex; flex-wrap: wrap; column-gap: 6px; } .ometa span { white-space: nowrap; } .olv { font-weight: 800; color: var(--k); }
  .row.fbox { border-bottom: 0; padding-bottom: 6px; margin: 0; }
  .fsug { flex: 1 0 100%; box-sizing: border-box; background: #fff; border: 1.5px solid #23305E; border-radius: 12px; box-shadow: 0 8px 20px rgba(35,48,94,.18); padding: 4px; }
  .fsi { all: unset; display: block; box-sizing: border-box; width: 100%; cursor: pointer; padding: 7px 10px; border-radius: 8px; font-size: 13px; color: #23305E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fsi:hover, .fsi.on { background: #EEF1FA; }
  .fchips, .fhist { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; padding: 0 12px 8px; }
  .fchips .chip, .fmore .chip { padding: 4px 8px; font-size: 12px; }
  .fhist { border-bottom: 1px dashed #C9CEDF; } .fhist .lb2 { font-size: 11.5px; font-weight: 800; color: #6B7394; }
  .chip.sm { padding: 3px 8px; font-size: 11.5px; font-weight: 500; border-width: 1px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fclr { all: unset; cursor: pointer; color: #9AA1BE; font-size: 12px; padding: 2px 6px; margin-left: auto; } .fclr:hover { color: #D0011B; }
  .fhead { font-size: 12.5px; font-weight: 800; color: #23305E; margin: 2px 2px 8px; } .fhead.alt { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #C9CEDF; }
  .fmore { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
  .otitle { font-size: 12px; color: #23305E; line-height: 1.35; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ttcard { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 8px 12px 10px; padding: 9px 12px; border-radius: 12px; background: linear-gradient(90deg, #111 0%, #2B2B2B 100%); color: #fff; width: calc(100% - 24px); }
  .ttcard:hover { filter: brightness(1.15); } .ttcard:focus-visible { outline: 3px solid #25F4EE; }
  .ttcard .ttx { flex: 1; display: flex; flex-direction: column; min-width: 0; } .ttcard b { font-size: 13px; } .ttcard small { font-size: 11px; color: #C9CEDF; }
  .ttcard .tth { font-size: 12px; font-weight: 800; color: #25F4EE; white-space: nowrap; }
  .spcard { background: linear-gradient(90deg, #EE4D2D 0%, #FF7337 100%); margin-bottom: 0; } .spcard small { color: #FFE3D6 !important; } .spcard .tth { color: #fff; }
  .spcard + .ttcard { margin-top: 8px; }
  .rpick { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #E3E6F0; border-radius: 12px; background: #fff; margin-bottom: 6px; font-size: 12.5px; color: #23305E; }
  .rpick .rimg { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex: none; }
  .rpick span { flex: 1; min-width: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } .rpick i { font-style: normal; }
  .oprog { font-size: 11.5px; color: #6B7394; background: #F1F4FA; border-radius: 8px; padding: 5px 9px; margin: 2px 0 6px; }
  .cry-err { font-size: 12px; color: #C62839; padding: 0 12px 8px; }
  .copyr { display: block; text-align: center; font-size: 11px; color: #8A91AD; padding: 8px 12px 10px; text-decoration: none; } .copyr:hover { color: #23305E; text-decoration: underline; }
  .adb { padding: 10px 12px; }
  .adsw { all: unset; cursor: pointer; display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; padding: 12px; border-radius: 12px; background: #F1F4FA; font-size: 14px; color: #23305E; }
  .adsw .knob { width: 38px; height: 22px; border-radius: 999px; background: #C9CEDF; position: relative; flex: none; transition: background .2s; }
  .adsw .knob::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .2s; }
  .adsw.on .knob { background: #2E9E6B; } .adsw.on .knob::after { left: 19px; }
  .adsw:focus-visible { outline: 3px solid #23305E; }
  .adsite { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 10px 2px 4px; font-size: 12.5px; color: #23305E; flex-wrap: wrap; }
  .adsite .chip { padding: 4px 10px; font-size: 12px; }
  .adcnt { font-size: 12.5px; color: #2E9E6B; font-weight: 700; margin: 4px 2px 8px; }
  .osame { font-size: 11px; font-weight: 700; color: #0E9F6E; margin-top: 2px; }
  .otags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 0; grid-column: 1 / -1; }
  .ot { font-size: 10.5px; font-weight: 800; border-radius: 999px; padding: 1px 7px; background: #EEF0F6; color: #5B648A; }
  .ot.best { background: #FFF1D6; color: #9A6200; } .ot.cheap { background: #DDF3EB; color: #1E7A5F; } .ot.trust { background: #E8F0FF; color: #2E5FB7; }
  .oright { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
  .opr { font-size: 14.5px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .osave { font-size: 10.5px; font-weight: 800; color: #1E7A5F; white-space: nowrap; }
  button.b.ogo { padding: 4px 14px; font-size: 12px; background: #EE4D2D; }
  .obtns { display: flex; gap: 5px; align-items: center; }
  .oshield { all: unset; cursor: pointer; width: 28px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-size: 14px; border: 1.5px solid #D5DAE8; background: #fff; }
  .oshield:hover, .oshield.on { border-color: var(--k); background: color-mix(in srgb, var(--k) 12%, #fff); }
  .oshield:focus-visible { outline: 2px solid var(--k); outline-offset: 1px; }
  .odet { grid-column: 1 / -1; border-top: 1px dashed #E3E6F0; padding-top: 6px; margin-top: 2px; }
  .odet .tli { font-size: 12px; padding: 1px 0; }
  .oiss { font-size: 11.5px; margin-top: 5px; line-height: 1.35; } .oiss b { color: #B42336; margin-right: 4px; } .oiss span { font-style: italic; color: #3A4470; }
  .onote { font-size: 11px; color: #8A91AE; text-align: center; margin: 4px 0 6px; }
  .cbox { border-radius: 12px; padding: 10px 12px; margin: 6px 0; background: #FFF6E5; border: 1.5px dashed #F2B544; }
  .cbox .ct { font-size: 12.5px; font-weight: 800; margin-bottom: 6px; }
  .cchips { display: flex; gap: 5px; flex-wrap: wrap; }
  .cchip { font-size: 12px; font-weight: 700; color: #EE4D2D; background: #fff; border: 1.5px solid #F7B5A5; border-radius: 6px; padding: 3px 8px; }
  .cchip.off { color: #9AA1BE; border-color: #E3E6F0; }
  .cbest { margin-top: 8px; font-size: 13px; font-weight: 800; color: #1E7A5F; }
  .cnote { font-size: 11.5px; color: #6B7394; margin-top: 4px; line-height: 1.4; }
  .coupon { position: relative; border-radius: 12px; padding: 9px 12px 10px; margin: 6px 0; background: #fff; border: 1.5px solid #EEF0F6; border-left: 5px solid #EC4A68; }
  .coupon.fit { border-color: #BFE6D6; border-left-color: #1E9E6F; background: #F6FCF9; }
  .coupon .cl1 { display: flex; align-items: center; gap: 8px; font-size: 11.5px; }
  .coupon .sh { display: flex; align-items: center; gap: 5px; font-weight: 800; }
  .coupon .dot, .hubs .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #9AA1BE; }
  .cnew { font-style: normal; font-size: 10px; font-weight: 800; background: #EC4A68; color: #fff; border-radius: 999px; padding: 1px 6px; }
  .cexp { margin-left: auto; color: #6B7394; } .cexp.soon { color: #E0344B; font-weight: 800; }
  .coupon .cti { font-size: 14px; font-weight: 800; margin-top: 4px; }
  .cfit { font-size: 12px; font-weight: 800; color: #1E7A5F; margin-top: 4px; }
  .cacts { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .ccode { font: 800 13px/1 ui-monospace, Consolas, monospace; letter-spacing: .06em; padding: 6px 10px; border-radius: 8px; border: 1.5px dashed #23305E; background: #FFFDF6; }
  .hubs { margin: 6px 0 4px; } .hubs .chip { padding: 5px 10px; font-size: 12px; }
  .ptable { display: flex; flex-direction: column; border: 1.5px solid #F1E2E6; border-radius: 12px; overflow: hidden; background: #fff; }
  .pr { display: grid; grid-template-columns: 78px 1fr 46px; align-items: center; gap: 8px; padding: 7px 10px; font-size: 12.5px; border-top: 1px solid #F4EEF0; }
  .pr:first-child { border-top: 0; }
  .pr.here { background: #FAF8FF; }
  .pr.best { background: #EAF8F2; }
  .pr .sh { display: flex; align-items: center; gap: 6px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pr .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; background: #9AA1BE; }
  .dot.shopee { background: #EE4D2D; } .dot.tiktok { background: #111; box-shadow: 1.5px 0 0 #25F4EE, -1.5px 0 0 #FE2C55; }
  .pr .pv { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
  .pr .pv .l1 { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .pr .pv b { font-size: 14px; font-variant-numeric: tabular-nums; }
  .pr.best .pv b { color: #1E7A5F; }
  .pr .na2 { color: #9AA1BE; }
  .pr .tg em { font-style: normal; font-size: 10.5px; font-weight: 800; border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
  .pr .tg em.best { background: #1E7A5F; color: #fff; } .pr .tg em.hr { background: #EDE8FF; color: #5B3FD6; }
  .pr .tg em.dn2 { background: #DDF3EB; color: #1E7A5F; } .pr .tg em.up2 { background: #F1F2F6; color: #6B7394; }
  .pr .sim { font-style: normal; font-size: 10px; color: #9A6200; background: #FFF1D6; border-radius: 5px; padding: 1px 4px; white-space: nowrap; }
  .pr button.go { padding: 4px 0; font-size: 12px; text-align: center; }
  .pr button.go.ghost { padding: 2.5px 0; }
  .cmp .ci { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 12.5px; }
  .cmp .ci .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cmp .ci b { font-variant-numeric: tabular-nums; }
  .cmp .ci .dn2 { color: #1E7A5F; font-weight: 800; } .cmp .ci .up2 { color: #9AA1BE; }
  .cmp .ci .sim { font-size: 10.5px; color: #9A6200; background: #FFF1D6; border-radius: 6px; padding: 1px 5px; }
  button.b.buy { background: #EC4A68; }
  .sp { display: flex; align-items: center; gap: 8px; padding: 8px 4px; border-bottom: 1px solid #EEF0F6; }
  .sp .tx { flex: 1; min-width: 0; }
  .sp .plink { font-size: 13.5px; line-height: 1.35; }
  .sp .vd { margin-top: 3px; }
  .sp .spark { width: 70px; height: 26px; flex: none; margin: 0; }
  .sp .tm { display: block; font-size: 11.5px; color: #6B7394; }
  .sp .tm.late { color: #1E7A5F; font-weight: 800; }
  .affnote { font-size: 10.5px; color: #9AA1BE; padding: 6px 12px 8px; border-top: 1px dashed #C9CEDF; line-height: 1.4; }
  .trbox { background: #F3F0FF; border-radius: 12px; padding: 10px 12px; margin: 8px 0; }
  .trbox .lg { font-size: 11.5px; font-weight: 800; color: #5B3FD6; margin-bottom: 4px; }
  .trsrc { font-size: 12px; color: #6B7394; margin: 6px 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .prog { height: 8px; background: #E6E2FF; border-radius: 4px; overflow: hidden; margin: 8px 0 4px; }
  .prog i { display: block; height: 100%; background: #7C5CFF; transition: width .3s; }
  textarea.tin { width: 100%; min-height: 38px; resize: vertical; transition: min-height .15s; font: 13.5px/1.45 "Segoe UI", system-ui, sans-serif; color: #23305E; border: 1.5px solid #23305E; border-radius: 10px; padding: 8px 10px; background: #fff; }
  textarea.tin:focus { outline: none; box-shadow: 0 0 0 3px rgba(124,92,255,.35); }
  .idea { background: #fff; border: 1.5px solid #E3E6F0; border-radius: 12px; padding: 10px 12px; margin: 8px 0; }
  .view .row { padding: 6px 10px; }
  .idea .ih { display: flex; gap: 6px; align-items: center; font-size: 11.5px; color: #6B7394; }
  .idea .ih a, .idea .ih button.lk { all: unset; cursor: pointer; color: #2E7DD7; font-weight: 700; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .idea .ih span.tm { margin-left: auto; white-space: nowrap; }
  .idea .it2 { font-size: 13.5px; line-height: 1.5; margin: 6px 0; white-space: pre-wrap; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .idea.open .it2 { display: block; }
  .idea .ai { background: #FFF9DB; border-radius: 10px; padding: 8px 10px; margin: 6px 0; font-size: 13px; }
  .idea .ai .lb2 { font-size: 11.5px; font-weight: 800; color: #8A7300; margin: 4px 0 2px; }
  .cp { all: unset; cursor: pointer; display: block; padding: 3px 6px; margin: 1px -6px; border-radius: 6px; }
  .cp:hover, .cp:focus-visible { background: #FFEFA8; }
  .cp::after { content: " ⧉"; color: #B39A2B; font-size: 11px; }
  .idea .acts2 { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .idea .acts2 button { all: unset; cursor: pointer; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 8px; border: 1.5px solid #C9CEDF; }
  .idea .acts2 button:hover { background: #FFF0C7; border-color: #23305E; }
  .idea .acts2 button:focus-visible { outline: 2px solid #D98E1F; }
  .idea .acts2 button.sug { color: #8A7300; border-color: #EAD98A; background: #FFFBEA; }
  .idea .acts2 button.sug.on { background: #FFEFA8; }
  .mic { all: unset; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; background: #E85D5D; display: grid; place-items: center; flex: none; }
  .mic:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .eyes, .pet .body { animation: none !important; } .sat, .links line { transition: none !important; } }
  `;

  const PAGE_CSS = `
  mark.ht-mark { background: #FFE08A !important; color: inherit !important; border-radius: 3px; box-shadow: 0 0 0 1px #F2B544; padding: 0 1px; }
  mark.ht-mark.ht-focus { background: #FF9F7A !important; box-shadow: 0 0 0 3px #E85D5D; transition: box-shadow .2s; }`;

  const $$ = s => ui.root.querySelector(s);

  function buildUI() {
    if (ui || !document.body) return;
    if (!document.getElementById('ht-page-style')) {
      const st = document.createElement('style'); st.id = 'ht-page-style'; st.textContent = PAGE_CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    const host = document.createElement('div'); host.id = 'hattieu-host';
    const root = host.attachShadow({ mode: 'open' });
    HT.i18nWatch(root);          // giao diện tiếng Anh (nếu đã chọn English)
    const sats = BRANCHES.map(b => `<button class="sat" data-b="${b.id}" style="--c:${b.color}" aria-label="Mở ${b.label}" tabindex="-1">
        <svg viewBox="0 0 24 24" aria-hidden="true">${b.menuIcon || b.icon}</svg><b>${b.label}</b><span class="n" hidden></span></button>`).join('');
    const tabs = BRANCHES.map(b => `<button role="tab" data-t="${b.id}" style="--c:${b.color}" title="${b.label}" aria-label="${b.label}"><svg viewBox="0 0 24 24" aria-hidden="true">${b.icon}</svg><span>${b.label}</span></button>`).join('');
    root.innerHTML = `<style>${CSS}</style>
      <div class="wrap">
        <svg class="links" aria-hidden="true">${BRANCHES.map(b => `<line style="stroke:${b.color}"/>`).join('')}${TOOLS.map(t => `<line class="sub" style="stroke:${t.color}"/>`).join('')}${BRANCHES.map(b => `<circle class="d0" style="fill:${b.color}"/><circle class="d1" style="fill:${b.color}"/>`).join('')}</svg>
        ${TOOLS.map(t => `<button class="sat child" data-tool="${t.id}" style="--c:${t.color}" aria-label="Mở tiện ích ${t.label}" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg><b>${t.label}</b></button>`).join('')}
        ${sats}
        <div class="bubble" hidden role="status"></div>
        <div class="panel" hidden role="dialog" aria-label="HaoHao">
          <div class="tabs" role="tablist">${tabs}<button class="big" aria-label="Phóng to hoặc thu nhỏ bảng" title="Phóng to / thu nhỏ">⤢</button><button class="x" aria-label="Đóng">✕</button></div>
          <div class="view"></div>
        </div>
        <button class="pomo-pill" hidden></button>
        <button class="pet" aria-label="HaoHao, bấm để mở các nhánh. Bấm giữ để ghi chú bằng giọng nói" aria-expanded="false">${PET_SVG}<span class="badge" hidden></span></button>
      </div>`;
    document.documentElement.appendChild(host);
    ui = { host, root, pill: root.querySelector('.pomo-pill'), wrap: root.querySelector('.wrap'), pet: root.querySelector('.pet'), badge: root.querySelector('.badge'),
           bubble: root.querySelector('.bubble'), panel: root.querySelector('.panel'), view: root.querySelector('.view') };
    placeWrap();
    setupDrag();
    root.querySelectorAll('.sat[data-b]').forEach(s => s.addEventListener('click', () => {
      // bấm Tiện ích lần đầu: bung các tiện ích con; bấm lần nữa: mở bảng Tiện ích
      if (s.dataset.b === 'tools' && !subOpen) { subOpen = true; ui.wrap.classList.add('sub-open'); ui.root.querySelectorAll('.sat.child').forEach(c => c.tabIndex = 0); return; }
      if (s.dataset.b === 'tools') toolsSub = null;
      openTab(s.dataset.b);
    }));
    root.querySelectorAll('.sat.child').forEach(s => s.addEventListener('click', () => { toolsSub = s.dataset.tool; openTab('tools'); }));
    root.querySelectorAll('.tabs [data-t]').forEach(t => t.addEventListener('click', () => openTab(t.dataset.t)));
    $$('.tabs .x').addEventListener('click', () => { closePanel(); ui.pet.focus(); });
    $$('.tabs .big').addEventListener('click', () => { settings.panelBig = !settings.panelBig; ui.panel.classList.toggle('bigp', !!settings.panelBig); chrome.storage.local.get('settings').then(({ settings: s0 = {} }) => chrome.storage.local.set({ settings: { ...s0, panelBig: settings.panelBig } })); });
    ui.panel.classList.toggle('bigp', !!settings.panelBig);
    ui.bubble.addEventListener('click', () => { if (ui.bubble.dataset.kind === 'trust') return goCheck(); hideBubble(); openTab(ui.bubble.dataset.tab || tab); });
    ui.pill.addEventListener('click', () => openTab('focus'));
    pomoPill();
    root.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { if (!ui.panel.hidden) closePanel(); else toggleMenu(false); ui.pet.focus(); }
    });
    root.addEventListener('keyup', e => e.stopPropagation());
    root.addEventListener('keypress', e => e.stopPropagation());
    window.addEventListener('resize', placeWrap);
    updateBadge();
  }

  function destroyUI() {
    if (!ui) return;
    clearInterval(quoteTimer);
    ui.host.remove(); ui = null;
    if (pageTr.map.size) restorePage();
  }

  function placeWrap() {
    if (!ui) return;
    // mặc định: sát cạnh phải, cao hơn góc dưới ~1/4 màn hình (không che nút Chat của Shopee ở góc)
    const p = settings.pos || { r: 24, b: Math.round(Math.min(300, Math.max(150, innerHeight * 0.26))) };
    const r = Math.min(Math.max(4, p.r), innerWidth - 80), b = Math.min(Math.max(4, p.b), innerHeight - 80);
    Object.assign(ui.wrap.style, { right: r + 'px', bottom: b + 'px' });
    const upper = b > innerHeight / 2, lefter = r > innerWidth / 2;
    for (const el of [ui.panel, ui.bubble]) {
      el.classList.toggle('up', !upper); el.classList.toggle('down', upper);
      el.classList.toggle('al', !lefter); el.classList.toggle('ar', lefter);
    }
    // Nhánh: như hình vẽ là toả sang phải và lên trên; lật lại cho vừa màn hình.
    const flipX = !lefter, flipY = upper;
    ui.wrap.classList.toggle('fy', flipY);
    const O = DIST + STAG + SAT; // gốc của lớp đường nối
    const lines = ui.root.querySelectorAll('.links line'), dots = ui.root.querySelectorAll('.links circle');
    BRANCHES.forEach((br, i) => {
      let a = br.angle; if (flipX) a = 180 - a; if (flipY) a = -a;
      const rad = a * Math.PI / 180, dx = Math.cos(rad), dy = Math.sin(rad);
      const R = DIST + (i % 2 ? STAG : 0);   // xen kẽ gần/xa như hình mẫu
      const sx = C + R * dx, sy = C + R * dy;
      const sat = ui.root.querySelector(`.sat[data-b="${br.id}"]`);
      sat.style.left = (sx - SAT / 2) + 'px';
      sat.style.top = (sy - SAT / 2) + 'px';
      const L = lines[i], r0 = 44, r1 = R - SAT / 2 - 8;
      L.setAttribute('x1', O + C + r0 * dx); L.setAttribute('y1', O + C + r0 * dy);
      L.setAttribute('x2', O + C + r1 * dx); L.setAttribute('y2', O + C + r1 * dy);
      dots[2 * i].setAttribute('cx', O + C + r0 * dx); dots[2 * i].setAttribute('cy', O + C + r0 * dy);
      dots[2 * i + 1].setAttribute('cx', O + C + r1 * dx); dots[2 * i + 1].setAttribute('cy', O + C + r1 * dy);
      if (br.id === 'tools') {
        // tiện ích con: tiếp tục toả ra ngoài từ vòng Tiện ích, xoè dần về phía có chỗ
        const subLines = ui.root.querySelectorAll('.links line.sub');
        TOOLS.forEach((t, j) => {
          // xếp thẳng hàng ra ngoài theo hướng của vòng Tiện ích, nối tiếp nhau
          const d = SUBD + j * (SUB + 46), pd = j ? SUBD + (j - 1) * (SUB + 46) : 0, pr = j ? SUB / 2 : SAT / 2;
          const ch = ui.root.querySelector(`.sat.child[data-tool="${t.id}"]`);
          ch.style.left = (sx + d * dx - SUB / 2) + 'px'; ch.style.top = (sy + d * dy - SUB / 2) + 'px';
          const l2 = subLines[j];
          l2.setAttribute('x1', O + sx + (pd + pr + 4) * dx); l2.setAttribute('y1', O + sy + (pd + pr + 4) * dy);
          l2.setAttribute('x2', O + sx + (d - SUB / 2 - 4) * dx); l2.setAttribute('y2', O + sy + (d - SUB / 2 - 4) * dy);
        });
      }
    });
  }

  function setupDrag() {
    let start = null, moved = false, held = false, holdTimer = null;
    ui.pet.addEventListener('pointerdown', e => {
      start = { x: e.clientX, y: e.clientY, r: parseFloat(ui.wrap.style.right), b: parseFloat(ui.wrap.style.bottom) };
      moved = false; held = false; ui.pet.setPointerCapture(e.pointerId); ui.pet.style.cursor = 'grabbing';
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { if (!moved) { held = true; setMood('happy'); chrome.runtime.sendMessage({ type: 'voice-open', target: 'idea' }).catch(() => {}); } }, 650);
    });
    ui.pet.addEventListener('pointermove', e => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) { if (!moved) { clearTimeout(holdTimer); toggleMenu(false); closePanel(); } moved = true; }
      if (moved) { settings.pos = { r: start.r - dx, b: start.b - dy }; placeWrap(); }
    });
    ui.pet.addEventListener('pointerup', () => {
      ui.pet.style.cursor = '';
      clearTimeout(holdTimer);
      if (!start) return;
      start = null;
      if (held) { held = false; return; }
      if (moved) chrome.storage.local.get('settings').then(({ settings: s = {} }) =>
        chrome.storage.local.set({ settings: { ...s, pos: settings.pos } }));
      else if (!ui.panel.hidden) closePanel();
      else toggleMenu();
    });
    ui.pet.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); } });
  }

  function toggleMenu(force) {
    if (!ui) return;
    menuOpen = force ?? !menuOpen;
    ui.wrap.classList.toggle('menu-open', menuOpen);
    if (!menuOpen) { subOpen = false; ui.wrap.classList.remove('sub-open'); setTimeout(showTrustBubble, 300); }
    ui.pet.setAttribute('aria-expanded', menuOpen);
    ui.root.querySelectorAll('.sat[data-b]').forEach(s => s.tabIndex = menuOpen ? 0 : -1);
    ui.root.querySelectorAll('.sat.child').forEach(s => s.tabIndex = -1);
    if (menuOpen) { hideBubble(); updateBadge(); ui.root.querySelector('.sat').focus({ preventScroll: true }); }
  }

  function openTab(t) {
    if (t === 'read' || t === 'dich' || t === 'explain') { infoSub = t; t = 'info'; }
    if (t === 'crypto') { t = 'tools'; toolsSub = 'crypto'; }
    tab = t; toggleMenu(false); hideBubble();
    if (t === 'info' && infoSub === 'read') readReady = false;
    ui.panel.hidden = false;
    ui.panel.style.setProperty('--tc', BRANCHES.find(b => b.id === t).color);
    ui.root.querySelectorAll('.tabs [data-t]').forEach(b => { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); });
    clearInterval(quoteTimer);
    if (t === 'tools') { loadQuotes(); quoteTimer = setInterval(loadQuotes, 60000); }
    renderPanel();
    ui.view.querySelector('input')?.focus({ preventScroll: true });
  }
  function closePanel() { if (!ui) return; ui.panel.hidden = true; clearInterval(quoteTimer); setTimeout(showTrustBubble, 300); }

  function setMood(m) {
    if (!ui) return;
    ui.pet.classList.remove('happy', 'alert', 'remind');
    void ui.pet.offsetWidth;
    if (m) ui.pet.classList.add(m);
  }

  const isSub = x => tab === 'info' && infoSub === x;
  function say(text, mood = 'happy', title = '', toTab = 'todo', actions = null) {
    if (!ui) return;
    if (!actions && (!ui.panel.hidden || menuOpen)) { setMood(mood); return; }
    if (actions) { toggleMenu(false); closePanel(); }
    lastBubble = Date.now();
    ui.bubble.innerHTML = ''; ui.bubble.dataset.tab = toTab; ui.bubble.dataset.kind = ''; ui.bubble.classList.remove('tb');
    if (title) ui.bubble.appendChild(el('span', 't', title));
    ui.bubble.appendChild(document.createTextNode(text));
    if (actions) {
      const row = el('div', 'acts');
      actions.forEach(a => {
        const b = el('button', 'b' + (a.ghost ? ' ghost' : ''), a.label);
        b.addEventListener('click', e => { e.stopPropagation(); hideBubble(); a.fn(); });
        row.append(b);
      });
      ui.bubble.appendChild(row);
    }
    ui.bubble.hidden = false; setMood(mood);
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hideBubble, actions ? 120000 : mood === 'remind' ? 20000 : 9000);
  }

  function chime() {
    if (settings.sound === false) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), t = ac.currentTime;
      [880, 1175, 1320].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), s0 = t + i * .16;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.2, s0 + .02); g.gain.exponentialRampToValueAtTime(0.0001, s0 + .7);
        o.connect(g).connect(ac.destination); o.start(s0); o.stop(s0 + .75);
      });
      setTimeout(() => ac.close(), 1800);
    } catch {}
  }
  function hideBubble() { if (!ui) return; const wasTrust = ui.bubble.dataset.kind === 'trust'; ui.bubble.hidden = true; if (!wasTrust) setTimeout(showTrustBubble, 400); }

  const alertsOf = k => alerts.filter(a => a.tab === k);
  function counts() {
    const now = Date.now();
    return {
      todo: todos.filter(t => !t.done && t.due && new Date(t.due).getTime() <= now).length + alertsOf('todo').length,
      bell: alertsOf('bell').length,
      idea: 0, focus: 0, shop: (shopAlert ? 1 : 0) + couponNew(),
      info: readReady ? 1 : 0,
      tools: alertsOf('tools').length
    };
  }
  function updateBadge() {
    if (!ui) return;
    const c = counts(), n = c.todo + c.crypto + c.loc;
    ui.badge.hidden = !n; ui.badge.textContent = n > 99 ? '99+' : n;
    for (const k in c) {
      const s = ui.root.querySelector(`.sat[data-b="${k}"] .n`);
      s.hidden = !c[k]; s.textContent = c[k] > 99 ? '99+' : c[k];
    }
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  const escAttr = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderPanel() {
    if (!ui || ui.panel.hidden) { updateBadge(); return; }
    const V = ui.view; V.innerHTML = '';
    ({ todo: renderTodo, idea: renderIdea, bell: renderBell, focus: renderFocus, info: renderInfo, shop: renderShop, tools: renderTools }[tab] || renderTodo)(V);
    updateBadge();
  }

  function alertBlock(k) {
    const list = alertsOf(k); if (!list.length) return null;
    const g = el('div', 'grp'); const hd = el('h3'); hd.append('Vừa báo'); 
    const clr = el('button', 'ic', '✕'); clr.title = 'Xoá thông báo'; clr.setAttribute('aria-label', 'Xoá thông báo');
    clr.addEventListener('click', () => { alerts = alerts.filter(a => a.tab !== k); renderPanel(); });
    hd.append(clr); g.append(hd);
    list.slice(0, 5).forEach(a => g.append(el('div', 'al-item', `${a.title}: ${a.text}`)));
    return g;
  }

  // ---------- nhánh Todolist ----------
  const saveTodos = () => chrome.storage.local.set({ todos });
  // Ngày dương + âm gọn một dòng
  const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const canChi = y => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;
  const dd2 = n => String(n).padStart(2, '0');
  const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  function dueLabel(due) {
    const d = new Date(due), now = new Date(), l = HT.lunar.of(d);
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000);
    const day = diff === 0 ? 'Hôm nay' : diff === 1 ? 'Mai' : diff === -1 ? 'Hôm qua' : `${WD[d.getDay()]} ${dd2(d.getDate())}/${dd2(d.getMonth() + 1)}`;
    return `${dd2(d.getHours())}:${dd2(d.getMinutes())} · ${day} · ${l.day}/${l.month} ÂL`;
  }
  function renderTodo(V) {
    // thẻ ngày hôm nay
    const now = new Date(), lt = HT.lunar.of(now);
    const special = lt.day === 1 ? 'Mùng 1' : (lt.day === 14 || lt.day === 15) ? 'Rằm' : HT.lunar.isLastDay(now) ? 'Cuối tháng âm' : '';
    const today = h(`<div class="today">
        <div class="big">${now.getDate()}</div>
        <div class="tinfo"><b>${['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][now.getDay()]}, ${dd2(now.getDate())}/${dd2(now.getMonth() + 1)}/${now.getFullYear()}</b>
          <span>🌙 ${lt.day}/${lt.month}${lt.leap ? ' nhuận' : ''} âm lịch · năm ${canChi(lt.year)}</span></div>
        ${special ? `<em>${special}</em>` : ''}
      </div>`);
    V.append(today);
    // ô thêm việc
    const form = h(`<div class="row addtodo">
        <input class="grow" placeholder="Thêm việc cần làm…" aria-label="Việc cần làm" maxlength="200">
        <button class="ic2" title="Hẹn giờ nhắc" aria-label="Hẹn giờ nhắc">⏰</button>
        <button class="b">Thêm</button>
        <div class="duebox" hidden><input type="datetime-local" aria-label="Nhắc lúc"><span class="dl"></span></div></div>`);
    const txt = form.querySelector('input.grow'), due = form.querySelector('input[type=datetime-local]'), box = form.querySelector('.duebox'), dl = form.querySelector('.dl');
    form.querySelector('.ic2').addEventListener('click', () => { box.hidden = !box.hidden; if (!box.hidden) due.focus(); });
    due.addEventListener('input', () => { dl.textContent = due.value ? dueLabel(due.value) : ''; });
    const add = () => {
      const t = txt.value.trim(); if (!t) return txt.focus();
      todos.push({ id: 't' + Date.now().toString(36), text: t, done: false, due: due.value || '', notified: false });
      txt.value = ''; due.value = ''; saveTodos(); renderPanel(); ui.view.querySelector('.addtodo input').focus();
    };
    form.querySelector('.b').addEventListener('click', add);
    txt.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    V.append(form);
    // danh sách, chia nhóm gọn
    const list = el('div', 'body-list');
    const ab = alertBlock('todo'); if (ab) list.append(ab);
    const nowMs = Date.now(), tk = dayKey(now);
    const open = todos.filter(t => !t.done).sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || (a.due || '9').localeCompare(b.due || '9'));
    const done = todos.filter(t => t.done);
    const groups = [
      ['Quá hạn', open.filter(t => t.due && new Date(t.due).getTime() <= nowMs), 'late'],
      ['Hôm nay', open.filter(t => t.due && new Date(t.due).getTime() > nowMs && dayKey(new Date(t.due)) === tk), ''],
      ['Sắp tới', open.filter(t => t.due && new Date(t.due).getTime() > nowMs && dayKey(new Date(t.due)) !== tk), ''],
      ['Chưa hẹn giờ', open.filter(t => !t.due), ''],
      [`Đã xong (${done.length})`, done, 'dn']
    ];
    if (!todos.length) list.append(el('div', 'empty', 'Chưa có việc nào. Gõ việc ở trên. Mỗi việc có ⭐ quan trọng, 🔔 nhắc giờ, 🍅 Pomodoro.'));
    for (const [name, items, cls] of groups) {
      if (!items.length) continue;
      list.append(el('div', 'gh ' + cls, name));
      for (const t of items) {
        const row = el('div', 'todo' + (t.done ? ' done' : ''));
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = t.done; cb.setAttribute('aria-label', 'Đánh dấu xong: ' + t.text);
        cb.addEventListener('change', () => { t.done = cb.checked; saveTodos(); renderPanel(); });
        let tx;
        if (editId === t.id) {
          tx = el('div', 'tx'); const ei = document.createElement('input'); ei.value = t.text; ei.style.width = '100%'; ei.setAttribute('aria-label', 'Sửa việc');
          const done2 = ok => { if (editId !== t.id) return; if (ok && ei.value.trim()) t.text = ei.value.trim(); editId = null; saveTodos(); renderPanel(); };
          ei.addEventListener('keydown', e => { if (e.key === 'Enter') done2(true); if (e.key === 'Escape') done2(false); });
          ei.addEventListener('blur', () => done2(true));
          tx.append(ei); setTimeout(() => ei.focus(), 0);
        } else {
          tx = el('div', 'tx', (t.star ? '⭐ ' : '') + t.text); tx.title = 'Bấm để sửa';
          if (!t.done) tx.addEventListener('click', () => { editId = t.id; renderPanel(); });
        }
        if (t.due) {
          const late = !t.done && new Date(t.due).getTime() <= nowMs;
          tx.append(el('span', 'tm' + (late ? ' late' : ''), '🔔 ' + dueLabel(t.due)));
        }
        if (dueEditId === t.id) {
          const db = h(`<div class="duebox" style="margin-top:4px"><input type="datetime-local" aria-label="Nhắc lúc"><button class="b">Đặt nhắc</button><button class="b ghost">Bỏ giờ</button></div>`);
          const di = db.querySelector('input'); di.value = t.due || HT.localISO(new Date(Date.now() + 3600e3));
          const [ok, clr] = db.querySelectorAll('button');
          db.addEventListener('click', e => e.stopPropagation());
          ok.addEventListener('click', () => { t.due = di.value; t.notified = false; dueEditId = null; saveTodos(); renderPanel(); });
          clr.addEventListener('click', () => { t.due = ''; dueEditId = null; saveTodos(); renderPanel(); });
          tx.append(db);
        }
        const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Xoá việc ' + t.text);
        del.addEventListener('click', () => { todos = todos.filter(x => x !== t); saveTodos(); renderPanel(); });
        if (t.url) {
          const lk = el('button', 'srcl', '🔗 ' + (t.src || t.url.replace(/^https?:\/\/(www\.)?/, '')).slice(0, 40));
          lk.title = t.url; lk.addEventListener('click', e => { e.stopPropagation(); window.open(t.url, '_blank'); });
          tx.append(lk);
        }
        if (!t.done) {
          const st = el('button', 'tomato' + (t.star ? ' on' : ''), '⭐'); st.title = t.star ? 'Bỏ quan trọng' : 'Đánh dấu quan trọng';
          st.addEventListener('click', () => { t.star = !t.star; saveTodos(); renderPanel(); });
          const al = el('button', 'tomato', '🔔'); al.title = 'Nhắc tôi lúc…';
          al.addEventListener('click', () => { dueEditId = dueEditId === t.id ? null : t.id; renderPanel(); });
          const tm = el('button', 'tomato', '🍅'); tm.title = 'Pomodoro: tập trung làm việc này';
          tm.addEventListener('click', () => { pomoSend('pomo-start', { task: t.text }); openTab('focus'); });
          row.append(cb, tx, st, al, tm, del);
        } else row.append(cb, tx, del);
        list.append(row);
      }
      if (cls === 'dn') {
        const b = el('button', 'lk2', 'Xoá hết việc đã xong');
        b.addEventListener('click', () => { todos = todos.filter(t => !t.done); saveTodos(); renderPanel(); });
        list.append(b);
      }
    }
    V.append(list);
  }

  // ---------- nhánh Nhắc nhở ----------
  const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const WEEK = [1, 2, 3, 4, 5, 6, 0];
  const ICONS = ['🔔', '💊', '💧', '🧒', '🍚', '🏃', '📞', '🛏️', '🐶'];
  const PRESETS = [
    { icon: '💊', name: 'Uống thuốc', kind: 'daily', times: ['08:00', '20:00'], days: [], message: 'Đến giờ uống thuốc rồi' },
    { icon: '💧', name: 'Uống nước', kind: 'interval', minutes: 60, from: '08:00', to: '21:00', message: 'Uống một ly nước nhé!' },
    { icon: '🧒', name: 'Đón con', kind: 'daily', times: ['16:30'], days: [1, 2, 3, 4, 5], message: 'Tới giờ đi đón con rồi!' }
  ];
  const LUNAR_PRESETS = [
    { icon: '🥗', name: 'Ăn chay', kind: 'lunar', lunarDays: [1, 30], times: ['06:00'], message: 'Hôm nay ăn chay nhé', prep: { on: true, time: '20:00' }, prepMessage: 'Mai ăn chay, nhớ chuẩn bị đồ chay' },
    { icon: '🙏', name: 'Cúng mùng 1 & rằm', kind: 'lunar', lunarDays: [1, 14, 15], times: ['06:00'], message: 'Thắp nhang, dâng cúng', prep: { on: true, time: '17:00' }, prepMessage: 'Mai là ngày cúng, nhớ mua hoa quả, nhang đèn' },
    { icon: '🌑', name: 'Cúng cuối tháng', kind: 'lunar', lunarDays: [30], times: ['17:00'], message: 'Cuối tháng âm lịch, dâng cúng', prep: { on: true, time: '17:00' }, prepMessage: 'Mai là cuối tháng âm, nhớ chuẩn bị đồ cúng' }
  ];
  const CHAY = { 'Chay 2 ngày': [1, 30], 'Chay 4 ngày': [1, 30, 14, 15], 'Chay 10 ngày': [1, 8, 14, 15, 18, 23, 24, 28, 29, 30] };
  const L = HT.lunar;
  const timesOf = r => (r.times && r.times.length) ? r.times : (r.time ? [r.time] : []);
  function daysLabel(d) {
    if (!d || !d.length || d.length === 7) return 'Mỗi ngày';
    const x = [...d].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b));
    if (x.join() === '1,2,3,4,5') return 'Thứ 2 đến thứ 6';
    if (x.join() === '6,0') return 'Cuối tuần';
    return x.map(i => DAY_NAMES[i]).join(', ');
  }
  function describeRem(r) {
    if (r.kind === 'daily') return `${daysLabel(r.days)} lúc ${timesOf(r).join(', ')}`;
    if (r.kind === 'lunar') return `Âm lịch: ${[...(r.lunarDays || [])].sort((a, b) => a - b).map(L.dayName).join(', ')}, lúc ${timesOf(r).join(', ')}` + (r.prep && r.prep.on ? ` · nhắc trước 1 ngày ${r.prep.time}` : '');
    if (r.kind === 'interval') return `Cứ ${r.minutes} phút` + (r.from && r.to ? `, từ ${r.from} đến ${r.to}` : '');
    return r.datetime ? 'Một lần, ' + new Date(r.datetime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
  }
  function nextFire(r) {
    const now = new Date();
    if (r.kind === 'once') { const t = new Date(r.datetime); return t > now ? t : null; }
    if (r.kind === 'lunar') {
      for (let add = 0; add < 62; add++) {
        const d = new Date(now); d.setDate(d.getDate() + add);
        if (!L.matches(d, r.lunarDays)) continue;
        const cands = timesOf(r).map(t => { const [hh, mm] = t.split(':').map(Number); const c = new Date(d); c.setHours(hh, mm, 0, 0); return c; }).filter(c => c > now).sort((a, b) => a - b);
        if (cands.length) return cands[0];
      }
      return null;
    }
    if (r.kind !== 'daily') return null;
    let best = null;
    for (let add = 0; add < 8 && !best; add++) {
      const d = new Date(now); d.setDate(d.getDate() + add);
      if (r.days && r.days.length && !r.days.includes(d.getDay())) continue;
      for (const t of timesOf(r)) {
        const [h, m] = t.split(':').map(Number); const c = new Date(d); c.setHours(h, m, 0, 0);
        if (c > now && (!best || c < best)) best = c;
      }
    }
    return best;
  }
  function whenLabel(d) {
    const now = new Date(), hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
    const diff = Math.floor((new Date(d).setHours(0, 0, 0, 0) - day0) / 86400000);
    return `Lần tới: ${hm} ${diff === 0 ? 'hôm nay' : diff === 1 ? 'ngày mai' : DAY_NAMES[d.getDay()]}`;
  }

  function renderBell(V) {
    if (bellEdit) return renderBellForm(V);
    const qr = h(`<div class="row"><input class="grow" placeholder="🔔 Nhắc tôi… (vd: 15h mai gửi báo giá, 30 phút nữa gọi anh Nam)" aria-label="Nhắc tôi"><button class="b">Nhắc</button></div>`);
    const qi = qr.querySelector('input');
    const go = async () => { const t = qi.value.trim(); if (!t) return qi.focus(); qi.value = ''; await quickRemind(t); renderPanel(); };
    qr.querySelector('button').addEventListener('click', go);
    qi.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    V.append(qr);
    // dòng âm lịch + nút mẫu: gọn 1 dòng, bấm mới xổ mẫu
    const today = new Date(), lt = L.of(today);
    let toRam = 0; for (let i = 0; i < 31; i++) { const dd = L.of(L.addDays(today, i)).day; if (dd === 14 || dd === 15) { toRam = i; break; } }
    const bar = el('div', 'bell-bar');
    bar.append(el('span', 'moon', `🌙 ${lt.day}/${lt.month} ÂL · ${toRam === 0 ? 'hôm nay rằm' : `rằm còn ${toRam} ngày`}`));
    const tg = el('button', 'pre-tg' + (presetOpen ? ' on' : ''), presetOpen ? '✕ Đóng mẫu' : '＋ Mẫu có sẵn');
    tg.setAttribute('aria-expanded', presetOpen);
    tg.addEventListener('click', () => { presetOpen = !presetOpen; renderPanel(); });
    bar.append(tg);
    V.append(bar);
    if (presetOpen) {
      const pick = p => { presetOpen = false; bellEdit = JSON.parse(JSON.stringify(p)); renderPanel(); };
      const box = el('div', 'pre-box');
      const grp = (title, arr) => {
        const g = el('div', 'pre-g'); g.append(el('span', 'pre-t', title));
        arr.forEach(p => { const c = el('button', 'pc', `${p.icon} ${p.name}`); c.addEventListener('click', () => pick(p)); g.append(c); });
        return g;
      };
      box.append(grp('Hằng ngày', PRESETS), grp('Âm lịch', LUNAR_PRESETS));
      const own = el('button', 'pc own', '✏️ Tự tạo lịch nhắc');
      own.addEventListener('click', () => pick({ icon: '🔔', name: '', kind: 'daily', times: ['09:00'], days: [], message: '' }));
      box.append(own);
      V.append(box);
    }
    const list = el('div', 'body-list');
    const ab = alertBlock('bell'); if (ab) list.append(ab);
    const up = upcoming();
    if (up.length) {
      const ug = el('div', 'grp'); ug.append(h('<h3>📅 Sắp tới</h3>'));
      for (const u of up) {
        const d = new Date(u.at), l = HT.lunar.of(d);
        const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
        const day = diff === 0 ? 'Hôm nay' : diff === 1 ? 'Mai' : `${WD[d.getDay()]} ${dd2(d.getDate())}/${dd2(d.getMonth() + 1)}`;
        const r2 = el('div', 'up-row');
        r2.append(el('span', 'ui', u.icon), el('span', 'ut', u.text));
        const tm = el('span', 'uw', `${dd2(d.getHours())}:${dd2(d.getMinutes())} · ${day}`); tm.title = `${l.day}/${l.month} âm lịch`;
        r2.append(tm); ug.append(r2);
      }
      list.append(ug);
    }
    const rems = rules.filter(r => r.type === 'reminder');
    const g = el('div', 'grp'); g.append(h(`<h3>Lịch nhắc <span>${rems.filter(r => r.enabled).length} đang bật</span></h3>`));
    if (!rems.length) g.append(el('div', 'empty', 'Chọn một mẫu ở trên (uống thuốc, uống nước, đón con) hoặc tự tạo lịch nhắc riêng.'));
    for (const r of rems) {
      const row = el('div', 'rem' + (r.enabled ? '' : ' off'));
      row.append(el('span', 'ico', r.icon || '🔔'));
      const info = el('div', 'nm', r.name);
      info.append(el('span', 'ds', describeRem(r)));
      const nx = r.enabled && nextFire(r); if (nx) info.append(el('span', 'nx', whenLabel(nx)));
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = r.enabled; cb.setAttribute('aria-label', 'Bật hoặc tắt ' + r.name);
      cb.addEventListener('change', () => { r.enabled = cb.checked; chrome.storage.local.set({ rules }); });
      const ed = el('button', 'ic', '✎'); ed.setAttribute('aria-label', 'Sửa ' + r.name);
      ed.addEventListener('click', () => { bellEdit = JSON.parse(JSON.stringify(r)); if (!bellEdit.times) bellEdit.times = timesOf(r); renderPanel(); });
      const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Xoá ' + r.name);
      del.addEventListener('click', () => { rules = rules.filter(x => x !== r); chrome.storage.local.set({ rules }); renderPanel(); });
      row.append(info, cb, ed, del); g.append(row);
    }
    list.append(g);
    list.append(mailBlock());
    // tuỳ chỉnh chuông / ra màn hình: thu gọn
    const cfgBtn = el('button', 'cry-hd', `⚙ Tuỳ chỉnh cách nhắc ${bellCfgOpen ? '▴' : '▾'}`);
    cfgBtn.style.background = '#F3F4F8'; cfgBtn.style.color = '#3A4470';
    cfgBtn.addEventListener('click', () => { bellCfgOpen = !bellCfgOpen; renderPanel(); });
    list.append(cfgBtn);
    if (bellCfgOpen) {
      const snd = el('label', 'snd'); const sc = document.createElement('input'); sc.type = 'checkbox'; sc.checked = settings.sound !== false;
      sc.addEventListener('change', () => { settings.sound = sc.checked; chrome.storage.local.set({ settings }); if (sc.checked) chime(); });
      snd.append(sc, 'Có tiếng chuông khi nhắc');
      const dk = el('label', 'snd'); const dc = document.createElement('input'); dc.type = 'checkbox'; dc.checked = settings.desktop !== false;
      dc.addEventListener('change', () => { settings.desktop = dc.checked; chrome.storage.local.set({ settings }); });
      dk.append(dc, 'Ra màn hình gõ cửa khi nhắc');
      const test = el('button', 'b ghost', 'Thử ngay');
      test.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'desk-test' }).catch(() => {}));
      const cf = el('div', 'fm'); cf.style.padding = '8px 2px'; cf.style.gap = '8px';
      cf.append(snd, dk, test); list.append(cf);
    }
    V.append(list);
  }

  function mailBlock() {
    const m = settings.mail || {}, prov = m.provider || 'gmail', isMs = prov === 'outlook';
    const save = patch => { settings.mail = { ...(settings.mail || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    const recheck = () => chrome.runtime.sendMessage({ type: 'mail-check-now' }).catch(() => {});
    const g = el('div', 'grp');
    // thu gọn: 1 dòng tóm tắt, bấm mới mở cài đặt
    const ms0 = mailStatus && (mailStatus.provider || 'gmail') === prov ? mailStatus : null;
    const sum = !m.enabled ? 'đang tắt' : ms0 && ms0.ok ? `${isMs ? 'Outlook' : 'Gmail'} · ${ms0.count} chưa đọc` : ms0 ? `${isMs ? 'Outlook' : 'Gmail'} · ⚠ cần kiểm tra` : `${isMs ? 'Outlook' : 'Gmail'} · đang bật`;
    const hd = el('button', 'cry-hd mail-hd' + (mailOpen ? ' on' : ''), `📧 Canh email · ${sum} ${mailOpen ? '▴' : '▾'}`);
    hd.setAttribute('aria-expanded', mailOpen);
    hd.addEventListener('click', () => { mailOpen = !mailOpen; renderPanel(); });
    g.append(hd);
    if (!mailOpen) return g;
    const inner = el('div', 'mail-in'); g.append(inner);
    const on = el('label', 'rule'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!m.enabled;
    cb.addEventListener('change', async () => {
      await chrome.storage.local.set({ mailSeen: null });   // chỉ báo thư đến SAU lúc bật
      await save({ enabled: cb.checked });
      if (cb.checked) recheck();
    });
    on.append(cb, el('span', '', 'Có email mới là HaoHao chạy ra báo'));
    inner.append(on);
    // chọn hộp thư
    const pv = el('div', 'line');
    [['gmail', 'Gmail'], ['outlook', 'Outlook / Hotmail']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + (prov === k ? ' on' : ''), lb);
      c.addEventListener('click', async () => { if (k === prov) return; await chrome.storage.local.set({ mailSeen: null, mailStatus: null }); await save({ provider: k }); recheck(); });
      pv.append(c);
    });
    inner.append(pv);
    // trạng thái đăng nhập
    const st = el('div', 'empty'), ms = mailStatus && (mailStatus.provider || 'gmail') === prov ? mailStatus : null;
    const hm = x => new Date(x).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (isMs && !m.msClientId) st.textContent = 'Outlook cần thiết lập 1 lần (khoảng 3 phút) trong trang Cài đặt.';
    else if (ms && ms.ok) st.textContent = `✓ Đã kết nối${isMs && msAccount ? ' ' + msAccount : ''}: ${ms.count} thư chưa đọc (lúc ${hm(ms.at)}).`;
    else if (ms && ms.error === 'login') st.textContent = isMs ? '⚠ Chưa đăng nhập Outlook, hoặc phiên đã hết hạn.' : '⚠ Chưa đăng nhập Gmail trên Chrome này, hoặc sai số thứ tự tài khoản.';
    else if (ms) st.textContent = '⚠ Không lấy được hộp thư (mất mạng?). HaoHao sẽ thử lại sau 1 phút.';
    else st.textContent = isMs && !msAccount ? 'Chưa đăng nhập Outlook.' : 'Chưa kiểm tra lần nào.';
    inner.append(st);
    const acts = el('div', 'line');
    if (isMs && !m.msClientId) {
      const b = el('button', 'b', 'Thiết lập Outlook');
      b.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-options', hash: 'outlook' }).catch(() => {}));
      acts.append(b);
    } else if (isMs) {
      const b = el('button', 'b', msAccount ? 'Đăng nhập tài khoản khác' : 'Đăng nhập Outlook');
      b.addEventListener('click', async () => {
        b.textContent = 'Đang mở cửa sổ đăng nhập…';
        try { const r = await chrome.runtime.sendMessage({ type: 'ms-login' }); if (r && !r.ok) say('Đăng nhập chưa được: ' + r.error, 'alert', '', 'bell'); if (r && r.status) mailStatus = r.status; } catch {}
        renderPanel();
      });
      acts.append(b);
      if (msAccount) { const o = el('button', 'b ghost', 'Đăng xuất'); o.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'ms-logout' }).catch(() => {})); acts.append(o); }
    } else if (ms && ms.error === 'login') {
      const b = el('button', 'b', 'Mở Gmail để đăng nhập');
      b.addEventListener('click', () => window.open('https://mail.google.com/', '_blank'));
      acts.append(b);
    }
    if (acts.childNodes.length) inner.append(acts);
    if (!m.enabled) return g;
    const fm = el('div', 'fm'); fm.style.padding = '4px 0'; fm.style.gap = '8px';
    if (!isMs) {
      const acc = h(`<div class="line"><span class="lb" style="margin:0">Tài khoản:</span>
          <select aria-label="Tài khoản Gmail"><option value="0">Gmail thứ 1</option><option value="1">Gmail thứ 2</option><option value="2">Gmail thứ 3</option><option value="3">Gmail thứ 4</option></select></div>`);
      const as = acc.querySelector('select'); as.value = String(m.account || 0);
      as.addEventListener('change', async () => { await chrome.storage.local.set({ mailSeen: null }); await save({ account: Number(as.value) }); recheck(); });
      fm.append(acc);
    }
    const pr = el('label', 'snd'); const pc = document.createElement('input'); pc.type = 'checkbox'; pc.checked = m.primary !== false;
    pc.addEventListener('change', async () => { await chrome.storage.local.set({ mailSeen: null }); await save({ primary: pc.checked }); });
    pr.append(pc, isMs ? 'Chỉ hộp thư Ưu tiên (Focused), bỏ qua thư Khác' : 'Chỉ hộp thư Chính (bỏ qua Quảng cáo, Mạng xã hội)');
    fm.append(pr);
    const modes = el('div', 'line');
    [['all', 'Mọi thư mới'], ['filter', 'Chỉ thư khớp điều kiện']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + ((m.mode || 'all') === k ? ' on' : ''), lb);
      c.addEventListener('click', () => save({ mode: k }));
      modes.append(c);
    });
    fm.append(modes);
    if (m.mode === 'filter') {
      const f1 = h(`<label><span class="lb">Người gửi (tên hoặc email, cách nhau dấu phẩy)</span><input style="width:100%" placeholder="ngân hàng, @congty.vn, anh Tùng"></label>`);
      const f2 = h(`<label><span class="lb">Hoặc có từ khoá trong tiêu đề / nội dung</span><input style="width:100%" placeholder="báo giá, hợp đồng, xây nhà"></label>`);
      const i1 = f1.querySelector('input'), i2 = f2.querySelector('input');
      i1.value = (m.senders || []).join(', '); i2.value = (m.words || []).join(', ');
      const split = v => v.split(',').map(x => x.trim()).filter(Boolean);
      i1.addEventListener('change', () => save({ senders: split(i1.value) }));
      i2.addEventListener('change', () => save({ words: split(i2.value) }));
      fm.append(f1, f2, el('div', 'empty', 'Báo khi thư khớp người gửi HOẶC có từ khoá. Không cần gõ dấu.'));
    }
    const chk = el('button', 'b ghost', 'Kiểm tra ngay');
    chk.addEventListener('click', async () => {
      chk.textContent = 'Đang kiểm tra…';
      try { const r = await chrome.runtime.sendMessage({ type: 'mail-check-now' }); if (r) mailStatus = r; } catch {}
      renderPanel();
    });
    const line = el('div', 'line'); line.append(chk); fm.append(line);
    inner.append(fm);
    return g;
  }

  function renderBellForm(V) {
    const e = bellEdit;
    e.times = e.times || []; e.days = e.days || [];
    const fm = el('div', 'fm');
    // biểu tượng + tên
    const ic = el('div', 'line icons');
    ICONS.forEach(x => {
      const b = el('button', x === e.icon ? 'on' : '', x); b.setAttribute('aria-label', 'Biểu tượng ' + x);
      b.addEventListener('click', () => { e.icon = x; renderPanel(); });
      ic.append(b);
    });
    fm.append(ic);
    const nm = h(`<label><span class="lb">Tên lịch nhắc</span><input style="width:100%" placeholder="Ví dụ: Uống thuốc huyết áp"></label>`);
    nm.querySelector('input').value = e.name || ''; nm.querySelector('input').addEventListener('input', ev => e.name = ev.target.value);
    fm.append(nm);
    // kiểu nhắc
    const kinds = el('div', 'line');
    [['daily', 'Hằng ngày'], ['lunar', '🌙 Âm lịch'], ['interval', 'Lặp lại'], ['once', 'Một lần']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + (e.kind === k ? ' on' : ''), lb);
      c.addEventListener('click', () => {
        e.kind = k;
        if (k === 'interval' && !e.minutes) { e.minutes = 60; e.from = '08:00'; e.to = '21:00'; }
        if (k === 'lunar' && !e.lunarDays) { e.lunarDays = [1, 14, 15]; e.prep = e.prep || { on: false, time: '17:00' }; }
        renderPanel();
      });
      kinds.append(c);
    });
    fm.append(kinds);
    if (e.kind === 'lunar') {
      e.lunarDays = e.lunarDays || [1, 14, 15]; e.prep = e.prep || { on: false, time: '17:00' };
      const dw = el('div'); dw.append(el('span', 'lb', 'Ngày âm lịch'));
      const dl = el('div', 'line days');
      [[[1], 'Mùng 1'], [[14, 15], 'Rằm (14, 15)'], [[30], 'Cuối tháng']].forEach(([ds, lb]) => {
        const on = ds.every(d => e.lunarDays.includes(d));
        const b = el('button', on ? 'on' : '', lb); b.style.width = 'auto'; b.style.padding = '0 10px';
        b.setAttribute('aria-pressed', on);
        b.addEventListener('click', () => { e.lunarDays = on ? e.lunarDays.filter(x => !ds.includes(x)) : [...new Set([...e.lunarDays, ...ds])]; renderPanel(); });
        dl.append(b);
      });
      dw.append(dl);
      const ql = el('div', 'line'); ql.style.marginTop = '6px';
      Object.entries(CHAY).forEach(([lb, arr]) => {
        const c = el('button', 'chip' + (JSON.stringify([...e.lunarDays].sort((a, b) => a - b)) === JSON.stringify([...arr].sort((a, b) => a - b)) ? ' on' : ''), lb);
        c.addEventListener('click', () => { e.lunarDays = [...arr]; renderPanel(); });
        ql.append(c);
      });
      dw.append(ql);
      const other = h(`<label style="display:block;margin-top:6px"><span class="lb">Ngày âm khác (cách nhau dấu phẩy, 30 = cuối tháng)</span><input style="width:100%" placeholder="ví dụ 8, 18, 23"></label>`);
      const oi = other.querySelector('input'); oi.value = e.lunarDays.filter(d => ![1, 14, 15, 30].includes(d)).sort((a, b) => a - b).join(', ');
      oi.addEventListener('change', () => {
        const extra = oi.value.split(/[,\s]+/).map(Number).filter(n => n >= 1 && n <= 30);
        e.lunarDays = [...new Set([...e.lunarDays.filter(d => [1, 14, 15, 30].includes(d)), ...extra])]; renderPanel();
      });
      dw.append(other);
      const nx = nextFire({ ...e, kind: 'lunar', times: e.times && e.times.length ? e.times : ['06:00'] });
      if (nx) dw.append(el('div', 'empty', `Lần tới: ${nx.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })} (${L.label(nx)})`));
      fm.append(dw);
    }
    if (e.kind === 'daily' || e.kind === 'lunar') {
      const tw = el('div'); tw.append(el('span', 'lb', 'Giờ nhắc (thêm được nhiều giờ)'));
      const line = el('div', 'line');
      e.times.sort().forEach((t, i) => {
        const c = el('span', 'tchip', t); const x = el('button', 'ic', '✕'); x.setAttribute('aria-label', 'Bỏ giờ ' + t);
        x.addEventListener('click', () => { e.times.splice(i, 1); renderPanel(); });
        c.append(x); line.append(c);
      });
      const ti = document.createElement('input'); ti.type = 'time'; ti.value = '12:00'; ti.setAttribute('aria-label', 'Giờ mới');
      const add = el('button', 'b ghost', 'Thêm giờ');
      add.addEventListener('click', () => { if (ti.value && !e.times.includes(ti.value)) e.times.push(ti.value); renderPanel(); });
      line.append(ti, add); tw.append(line); fm.append(tw);
      if (e.kind === 'lunar') {
        const pw = el('div');
        const pl = el('label', 'snd'); const pc = document.createElement('input'); pc.type = 'checkbox'; pc.checked = !!e.prep.on;
        pc.addEventListener('change', () => { e.prep.on = pc.checked; renderPanel(); });
        pl.append(pc, 'Nhắc trước 1 ngày (để mua đồ cúng, chuẩn bị đồ chay)');
        pw.append(pl);
        if (e.prep.on) {
          const pr = h(`<div class="line" style="margin-top:6px">Lúc <input type="time" aria-label="Giờ nhắc trước"> <input class="grow" placeholder="Lời nhắc hôm trước" aria-label="Lời nhắc hôm trước"></div>`);
          const [pt, pm] = pr.querySelectorAll('input'); pt.value = e.prep.time || '17:00'; pm.value = e.prepMessage || '';
          pt.addEventListener('input', () => e.prep.time = pt.value); pm.addEventListener('input', () => e.prepMessage = pm.value);
          pw.append(pr);
        }
        fm.append(pw);
      }
    }
    if (e.kind === 'daily') {
      const dw = el('div'); dw.append(el('span', 'lb', 'Những ngày trong tuần (không chọn là mọi ngày)'));
      const dl = el('div', 'line days');
      WEEK.forEach(d => {
        const b = el('button', e.days.includes(d) ? 'on' : '', DAY_NAMES[d]);
        b.setAttribute('aria-pressed', e.days.includes(d));
        b.addEventListener('click', () => { e.days = e.days.includes(d) ? e.days.filter(x => x !== d) : [...e.days, d]; renderPanel(); });
        dl.append(b);
      });
      dw.append(dl); fm.append(dw);
    } else if (e.kind === 'interval') {
      const w = h(`<div><span class="lb">Nhắc lặp lại</span>
          <div class="line">Cứ <input type="number" min="5" style="width:70px" aria-label="Số phút"> phút, từ <input type="time" aria-label="Từ giờ"> đến <input type="time" aria-label="Đến giờ"></div></div>`);
      const [mi, fr, to] = w.querySelectorAll('input');
      mi.value = e.minutes || 60; fr.value = e.from || '08:00'; to.value = e.to || '21:00';
      mi.addEventListener('input', () => e.minutes = Number(mi.value)); fr.addEventListener('input', () => e.from = fr.value); to.addEventListener('input', () => e.to = to.value);
      fm.append(w);
    } else if (e.kind === 'once') {
      const w = h(`<label><span class="lb">Ngày giờ nhắc</span><input type="datetime-local"></label>`);
      const di = w.querySelector('input'); di.value = e.datetime || ''; di.addEventListener('input', () => e.datetime = di.value);
      fm.append(w);
    }
    const ms = h(`<label><span class="lb">Lời nhắc HaoHao sẽ nói</span><input style="width:100%" placeholder="Tới giờ đi đón con rồi!"></label>`);
    ms.querySelector('input').value = e.message || ''; ms.querySelector('input').addEventListener('input', ev => e.message = ev.target.value);
    fm.append(ms);
    V.append(fm);
    const pf = el('div', 'pf');
    const save = el('button', 'b', 'Lưu lịch nhắc'), cancel = el('button', 'b ghost', 'Huỷ');
    cancel.addEventListener('click', () => { bellEdit = null; renderPanel(); });
    save.addEventListener('click', () => {
      if ((e.kind === 'daily' || e.kind === 'lunar') && !e.times.length) return say('Thêm ít nhất một giờ nhắc nhé.', 'alert', '', 'bell');
      if (e.kind === 'lunar' && !(e.lunarDays || []).length) return say('Chọn ít nhất một ngày âm lịch nhé.', 'alert', '', 'bell');
      if (e.kind === 'interval' && !(e.minutes >= 5)) return say('Khoảng lặp tối thiểu 5 phút.', 'alert', '', 'bell');
      if (e.kind === 'once' && !e.datetime) return say('Chọn ngày giờ nhắc nhé.', 'alert', '', 'bell');
      const r = { ...e, type: 'reminder', name: (e.name || '').trim() || 'Nhắc nhở', enabled: true, id: e.id || 'r' + Date.now().toString(36) };
      delete r.time;
      const i = rules.findIndex(x => x.id === r.id);
      if (i >= 0) rules[i] = r; else rules.push(r);
      bellEdit = null;
      chrome.storage.local.set({ rules });
      renderPanel();
      const nx = nextFire(r);
      say(`Đã đặt: ${r.icon || '🔔'} ${r.name}. ${nx ? whenLabel(nx) : describeRem(r)}`, 'happy', '', 'bell');
    });
    pf.append(save, cancel); V.append(pf);
  }

  // ---------- nhánh Đọc hộ (Gemini) ----------
  document.addEventListener('mouseup', () => {
    const t = (window.getSelection() || '').toString().trim();
    if (t.length >= 30) { lastSel = { text: t, at: Date.now() }; ignoreSel = false; }
  }, true);
  const ytId = () => location.hostname.endsWith('youtube.com') &&
    (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : (location.pathname.match(/^\/shorts\/([\w-]{6,})/) || [])[1]);
  const isPdf = () => document.contentType === 'application/pdf' || /\.pdf$/i.test(location.pathname);
  const MAIL_SITES = /mail\.google\.com|outlook\.(live|office|office365)\.com/;
  function srcInfo() {
    const sel = !ignoreSel && lastSel.text && Date.now() - lastSel.at < 180000 ? lastSel.text : '';
    const id = ytId();
    if (sel) return { kind: 'text', sub: 'sel', key: location.href + '#sel' + sel.length, url: location.href, title: document.title, label: `✂ Đoạn bạn bôi đen (${sel.split(/\s+/).length} chữ)`, sel };
    if (id) return { kind: 'youtube', key: 'yt:' + id, url: 'https://www.youtube.com/watch?v=' + id, title: document.title.replace(/ - YouTube$/, ''), label: '📺 Video YouTube' };
    if (isPdf()) return { kind: 'pdf', key: location.href, url: location.href, title: decodeURIComponent(location.pathname.split('/').pop() || 'PDF'), label: '📄 File PDF' };
    return { kind: 'text', key: location.href, url: location.href, title: document.title, label: MAIL_SITES.test(location.hostname) ? '📧 Email đang mở' : '📰 Trang web' };
  }
  function pageText() {
    const cands = [...document.querySelectorAll('article, main, [role="main"]')].filter(e => !(ui && ui.host.contains(e)));
    let best = cands.sort((a, b) => b.innerText.length - a.innerText.length)[0];
    if (!best || best.innerText.length < 400) best = document.body;
    return best.innerText.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 60000);
  }
  async function pdfBase64(url) {
    const r = await fetch(url); const buf = await r.arrayBuffer();
    if (buf.byteLength > 18e6) throw new Error('File PDF lớn quá (hơn 18 MB)');
    const u = new Uint8Array(buf); let bin = '';
    for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  async function srcFull(info) {
    const src = { kind: info.kind, sub: info.sub, url: info.url, title: info.title };
    if (info.kind === 'pdf') src.pdf = await pdfBase64(info.url);
    else if (info.kind === 'text') src.text = info.sub === 'sel' ? info.sel.slice(0, 60000) : pageText();
    if (info.kind === 'text' && (src.text || '').length < 80) throw new Error('Trang này gần như không có chữ để đọc.');
    return src;
  }
  const errText = e => ({
    nokey: 'Chưa có mã Gemini.', badkey: 'Mã Gemini không đúng. Kiểm tra lại trong Cài đặt.',
    quota: 'Hết lượt miễn phí của Gemini lúc này. Đợi ít phút (hoặc tới mai) rồi thử lại.',
    busy: 'Gemini của Google đang quá tải (nhiều người dùng cùng lúc). Đợi 1–2 phút rồi bấm lại nhé.',
    blocked: 'Gemini từ chối đọc nội dung này.', empty: 'Gemini không trả lời gì, thử lại nhé.'
  }[e] || e);
  async function readCache(key, val) {
    const { readCache: c = {} } = await chrome.storage.local.get('readCache');
    if (val === undefined) return c[key];
    c[key] = val;
    const keys = Object.keys(c).sort((a, b) => c[b].at - c[a].at).slice(0, 30);
    await chrome.storage.local.set({ readCache: Object.fromEntries(keys.map(k => [k, c[k]])) });
  }
  async function doSummary(auto) {
    const info = srcInfo();
    const ai = settings.ai || {};
    readState = { key: info.key, label: info.label, title: info.title, loading: true, qa: [] };
    renderPanel(); if (!auto) setMood('happy');
    try {
      const src = await srcFull(info);
      const r = await chrome.runtime.sendMessage({ type: 'ai-read', mode: 'summary', src, length: ai.length || 'vua' });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      if (!readState || readState.key !== info.key) return;
      readState.result = r.text; readState.src = src; readState.at = Date.now();
      const v = document.querySelector('video');
      readState.saved = src.kind === 'youtube' ? (v && v.duration ? Math.max(1, Math.round(v.duration / 60 - 1)) : 0)
        : src.text ? Math.max(1, Math.round(src.text.split(/\s+/).length / 220 - 0.5)) : 0;
      readCache(info.key, { text: r.text, at: Date.now(), title: info.title });
      if (ui && (ui.panel.hidden || !isSub('read'))) { readReady = true; say('Đọc xong rồi! Bấm vào đây để xem tóm tắt.', 'happy', info.label, 'read'); }
    } catch (e) {
      if (readState && readState.key === info.key) readState.error = errText(e.message);
    }
    if (readState) readState.loading = false;
    renderPanel();
  }
  async function doAsk(q) {
    if (!readState || !readState.result || readState.asking) return;
    const item = { q, a: null }; readState.qa.push(item); readState.asking = true; renderPanel();
    try {
      if (!readState.src) readState.src = await srcFull(srcInfo());
      const r = await chrome.runtime.sendMessage({ type: 'ai-read', mode: 'ask', src: readState.src, summary: readState.result, qa: readState.qa.slice(0, -1), question: q, length: (settings.ai || {}).length });
      item.a = r && r.ok ? r.text : '⚠ ' + errText(r ? r.error : 'Không kết nối được');
    } catch (e) { item.a = '⚠ ' + errText(e.message); }
    readState.asking = false; renderPanel();
  }
  function seek(ts) {
    const sec = ts.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
    const v = document.querySelector('video');
    if (v) { v.currentTime = sec; if (v.paused) v.play().catch(() => {}); }
  }
  function mdInline(p, str) {
    const re = /\*\*(.+?)\*\*|\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]/g; let last = 0, m;
    while ((m = re.exec(str))) {
      p.append(str.slice(last, m.index));
      if (m[1]) p.append(el('b', '', m[1]));
      else { const ts = m[2]; const b = el('button', 'ts', ts); b.title = 'Tua tới ' + ts; b.addEventListener('click', () => seek(ts)); p.append(b); }
      last = re.lastIndex;
    }
    p.append(str.slice(last));
  }
  function md(text) {
    const box = el('div', 'md');
    for (const raw of text.split('\n')) {
      const l = raw.trim().replace(/^#+\s*/, ''); if (!l) continue;
      const li = /^([-*•]|\d+[.)])\s+/.test(l);
      const node = el(li ? 'li' : 'p'); mdInline(node, l.replace(/^([-*•]|\d+[.)])\s+/, ''));
      if (li) { let ul = box.lastElementChild; if (!ul || ul.tagName !== 'UL') { ul = el('ul'); box.append(ul); } ul.append(node); }
      else box.append(node);
    }
    return box;
  }
  function renderRead(V) {
    const ai = settings.ai || {};
    const saveAi = patch => { settings.ai = { ...(settings.ai || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    if (!ai.key) { geminiSetup(V, 'Đọc hộ'); return; }
    const info = srcInfo();
    if (readState && readState.key !== info.key && !readState.loading) readState = null;
    const top = el('div', 'src'); top.append(el('span', '', info.label)); top.append(el('b', '', info.title || ''));
    if (info.sub === 'sel') { const x = el('button', 'b ghost', 'Đọc cả trang'); x.addEventListener('click', () => { ignoreSel = true; readState = null; renderPanel(); }); top.append(x); }
    V.append(top);
    const row = el('div', 'row');
    [['ngan', '⚡ Ngắn'], ['vua', '📋 Thường'], ['chitiet', '🧠 Chi tiết']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + ((ai.length || 'vua') === k ? ' on' : ''), lb);
      c.addEventListener('click', () => saveAi({ length: k }));
      row.append(c);
    });
    const go = el('button', 'b', readState && readState.result ? 'Tóm tắt lại' : 'Tóm tắt trang này');
    go.style.marginLeft = 'auto';
    if (readState && readState.loading) go.setAttribute('disabled', '');
    go.addEventListener('click', () => { if (!(readState && readState.loading)) doSummary(false); });
    row.append(go); V.append(row);
    const L = el('div', 'body-list');
    if (!readState) {
      L.append(el('div', 'empty', info.kind === 'youtube'
        ? 'Bấm "Tóm tắt trang này": HaoHao xem video rồi tóm lại ý chính và các mốc thời gian (bấm vào mốc để tua tới).'
        : 'Bấm "Tóm tắt trang này" để HaoHao đọc và tóm lại ý chính. Mẹo: bôi đen một đoạn trước khi mở HaoHao để chỉ tóm tắt đoạn đó.'));
      readCache(info.key).then(c => {
        if (c && !readState && isSub('read') && srcInfo().key === info.key) {
          readState = { key: info.key, label: info.label, title: info.title, result: c.text, at: c.at, qa: [], cached: true };
          renderPanel();
        }
      });
    } else if (readState.loading) {
      L.append(h(`<div class="loading"><span class="dots"><i></i><i></i><i></i></span>${info.kind === 'youtube' ? 'HaoHao đang xem video (video dài có thể mất 30 giây)…' : 'HaoHao đang đọc…'}</div>`));
    } else if (readState.error) {
      L.append(el('div', 'err', '⚠ ' + readState.error));
    }
    if (readState && readState.result) {
      if (readState.cached) L.append(el('div', 'empty', `Tóm tắt đã lưu lúc ${new Date(readState.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}.`));
      if (readState.saved) L.append(el('div', 'saved', `⏱️ Tiết kiệm khoảng ${readState.saved} phút ${info.kind === 'youtube' ? 'xem' : 'đọc'}`));
      L.append(md(readState.result));
      if (readState.qa.length) {
        const q = el('div', 'qa');
        for (const x of readState.qa) {
          q.append(el('div', 'q', '🙋 ' + x.q));
          if (x.a) q.append(md(x.a)); else q.append(h('<div class="loading" style="padding:6px 0"><span class="dots"><i></i><i></i><i></i></span>Đang nghĩ…</div>'));
        }
        L.append(q);
      }
    }
    V.append(L);
    if (readState && readState.qa.length) requestAnimationFrame(() => { L.scrollTop = L.scrollHeight; });
    if (readState && readState.result) {
      const ask = h(`<div class="row askbox"><input class="grow" placeholder="💬 Gõ câu hỏi về nội dung này rồi bấm Enter…" aria-label="Câu hỏi"><button class="b">Hỏi</button></div>`);
      const qi = ask.querySelector('input');
      const send = () => { const q = qi.value.trim(); if (q) { qi.value = ''; doAsk(q); } };
      ask.querySelector('button').addEventListener('click', send);
      qi.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
      V.append(ask);
    }
    const pf = el('div', 'pf');
    if (readState && readState.result) {
      const cp = el('button', 'b ghost', 'Sao chép');
      cp.addEventListener('click', async () => {
        const all = readState.result + readState.qa.filter(x => x.a).map(x => `\n\nHỏi: ${x.q}\n${x.a}`).join('');
        try { await navigator.clipboard.writeText(all); cp.textContent = 'Đã chép ✓'; } catch { cp.textContent = 'Không chép được'; }
      });
      const sv = el('button', 'b ghost', '📝 Lưu Note');
      sv.addEventListener('click', () => saveIdea({ type: info.kind === 'youtube' ? 'video' : 'summary', text: readState.result, title: info.title, url: info.url }));
      const tr = el('button', 'b ghost', '🌐 Dịch trang'); tr.addEventListener('click', () => { infoSub = 'dich'; renderPanel(); });
      const ex2 = el('button', 'b ghost', '💡 Giải thích'); ex2.addEventListener('click', () => { infoSub = 'explain'; renderPanel(); });
      pf.append(cp, sv, tr, ex2);
    }
    const au = el('label', 'snd'); const ac = document.createElement('input'); ac.type = 'checkbox'; ac.checked = !!ai.autoYoutube;
    ac.addEventListener('change', () => saveAi({ autoYoutube: ac.checked }));
    au.append(ac, 'Tự tóm tắt mỗi khi mở video YouTube');
    pf.append(au); V.append(pf);
  }
  // tự tóm tắt YouTube khi đổi video (YouTube không tải lại trang khi chuyển video)
  let lastHref = location.href, autoTimer = null;
  setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href; ignoreSel = false;
    if (readState && !readState.loading) readState = null;
    clearTimeout(autoTimer);
    const ai = settings.ai || {};
    if (ai.key && ai.autoYoutube && ytId() && active()) {
      autoTimer = setTimeout(async () => {
        const info = srcInfo();
        if (info.kind !== 'youtube' || (readState && readState.key === info.key)) return;
        if (await readCache(info.key)) return;
        doSummary(true);
      }, 4000);
    }
    if (isSub('read')) renderPanel();
  }, 1200);
  setTimeout(() => {   // mở thẳng một video YouTube
    const ai = settings.ai || {};
    if (ai.key && ai.autoYoutube && ytId() && active()) readCache(srcInfo().key).then(c => { if (!c) doSummary(true); });
  }, 4000);

  // ---------- nhánh Ý tưởng ----------
  const IDEA_ICON = { text: '✂', video: '📺', page: '🔖', voice: '🎤', summary: '📖' };
  // Note → Todo → Nhắc: tạo việc có giờ gắn link trang
  async function noteToReminder(text, url, title) {
    const r = HT.parseWhen(text);
    const { todos: tds = [] } = await chrome.storage.local.get('todos');
    const id = 't' + Date.now().toString(36);
    const due = r.due || new Date(Date.now() + 3600e3);
    tds.push({ id, text: (r.task || text).slice(0, 150), done: false, due: HT.localISO(due), notified: false, url: url || '', src: title || '' });
    await chrome.storage.local.set({ todos: tds });
    return { id, due, parsed: !!r.due };
  }
  async function saveIdea(item, opt = {}) {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'idea-add', item });
      if (!r || !r.ok) throw new Error(r ? r.error : '');
      if (opt.remind) {
        const t = await noteToReminder(item.text || item.title, item.url, item.title);
        say(`${t.due.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' })}: ${(HT.parseWhen(item.text).task || item.text).slice(0, 60)}`, 'happy', '📝 Đã lưu note + 🔔 đặt nhắc', 'todo');
        return;
      }
      if (ui && (ui.panel.hidden || tab !== 'idea')) {
        const txt = item.text || '';
        say('Đã lưu note kèm link trang.', 'happy', '📝 Note', 'idea', [
          { label: '🔔 Nhắc tôi', fn: async () => { const t = await noteToReminder(txt || item.title, item.url, item.title); dueEditId = t.parsed ? null : t.id; openTab('todo'); } },
          { label: 'Ok', ghost: true, fn: () => {} }
        ]);
      }
    } catch { say('Chưa lưu được, thử lại nhé.', 'alert', '', 'idea'); }
  }
  // nút nổi "Lưu ý tưởng" khi bôi đen chữ
  let selChip = null;
  function hideChip() { if (selChip) { selChip.remove(); selChip = null; } }
  document.addEventListener('mouseup', e => {
    if (!ui || !active() || ((settings.ideas || {}).chip === false && (settings.dich || {}).chip === false)) return;
    if (e.composedPath && e.composedPath().includes(ui.host)) return;
    setTimeout(() => {
      const sel = window.getSelection(); const t = (sel || '').toString().trim();
      hideChip();
      if (t.length < 15 || !sel.rangeCount) return;
      const rc = sel.getRangeAt(0).getBoundingClientRect();
      if (!rc || (!rc.width && !rc.height)) return;
      selChip = el('div', 'selchip');
      if ((settings.dich || {}).chip !== false) {
        const d = el('button', '', '🌐 Dịch'); d.addEventListener('click', () => { hideChip(); translateText(t, 'sel'); });
        const x = el('button', '', '💡 Giải thích'); x.addEventListener('click', () => { hideChip(); doExplain(t); });
        selChip.append(d, x);
      }
      if ((settings.ideas || {}).chip !== false) {
        const sv = el('button', 'sv', '📝 Note'); sv.title = 'Lưu Note (kèm link trang)';
        sv.addEventListener('click', () => { hideChip(); saveIdea({ type: 'text', text: t, title: document.title, url: location.href }); });
        const rm = el('button', 'sv', '🔔 Nhắc'); rm.title = 'Nhắc tôi (hiểu câu kiểu "15h mai gửi báo giá")';
        rm.addEventListener('click', () => { hideChip(); quickRemind(t); });
        selChip.append(sv, rm);
      }
      selChip.style.left = Math.min(innerWidth - 330, Math.max(8, rc.right - 300)) + 'px';
      selChip.style.top = Math.min(innerHeight - 44, rc.bottom + 8) + 'px';
      selChip.addEventListener('mousedown', ev => ev.preventDefault());
      ui.root.append(selChip);
    }, 10);
  }, true);
  document.addEventListener('mousedown', e => { if (selChip && !(e.composedPath && e.composedPath().includes(ui.host))) hideChip(); }, true);
  window.addEventListener('scroll', hideChip, { passive: true });

  const fmtSec = x => { x = Math.floor(x); const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s2 = x % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s2).padStart(2, '0'); };
  async function copyText(t, btn) {
    try { await navigator.clipboard.writeText(t); if (btn) { const o = btn.textContent; btn.textContent = 'Đã chép ✓'; setTimeout(() => { if (btn.isConnected) btn.textContent = o; }, 1200); } }
    catch { say('Không chép được, bấm vào trang rồi thử lại.', 'alert', '', 'idea'); }
  }
  function renderIdea(V) {
    const cfg = settings.ideas || {}, hasAi = !!(settings.ai || {}).key;
    const saveCfg = patch => { settings.ideas = { ...(settings.ideas || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    // ghi nhanh
    const row = h(`<div class="row"><button class="mic" aria-label="Ghi chú bằng giọng nói" title="Ghi chú bằng giọng nói (hoặc bấm giữ HaoHao)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/></svg></button>
        <input class="grow" placeholder="Ghi nhanh một note…" aria-label="Note mới"><button class="b">Lưu</button></div>`);
    const qi = row.querySelector('input');
    row.querySelector('.mic').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'voice-open', target: 'idea' }).catch(() => {}));
    // gõ có thời gian ("sáng mai", "15h thứ 6"...) thì gợi ý đặt nhắc luôn
    const hint = el('div', 'when-hint'); hint.hidden = true;
    const noteItem = t => ({ type: 'text', text: t, title: document.title, url: location.href });
    const add = remind => {
      const t = qi.value.trim(); if (!t) return qi.focus(); qi.value = ''; hint.hidden = true;
      saveIdea(noteItem(t), remind ? { remind: true } : { quiet: false });
    };
    const upd = () => {
      const t = qi.value.trim(); const r = t.length > 3 ? HT.parseWhen(t) : { due: null };
      hint.innerHTML = '';
      if (!r.due) { hint.hidden = true; return; }
      const when = r.due.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' });
      const b1 = el('button', 'b', `🔔 Lưu + nhắc ${when}`); b1.addEventListener('click', () => add(true));
      const b2 = el('button', 'b ghost', 'Chỉ lưu note'); b2.addEventListener('click', () => add(false));
      hint.append(b1, b2); hint.hidden = false;
    };
    qi.addEventListener('input', upd);
    row.querySelector('.b').addEventListener('click', () => add(!hint.hidden));
    qi.addEventListener('keydown', e => { if (e.key === 'Enter') add(!hint.hidden); });
    V.append(row, hint);
    // lưu trang / video đang xem
    const src = el('div', 'row');
    const id = ytId();
    if (id) {
      const v = document.querySelector('video'); const sec = v ? v.currentTime : 0;
      const b = el('button', 'b ghost', `📺 Lưu video này (tại ${fmtSec(sec)})`);
      b.addEventListener('click', () => {
        const s0 = (document.querySelector('video') || {}).currentTime || 0;
        saveIdea({ type: 'video', title: document.title.replace(/ - YouTube$/, ''), url: 'https://www.youtube.com/watch?v=' + id + (s0 > 5 ? '&t=' + Math.floor(s0) + 's' : ''), sec: s0, text: '' });
      });
      src.append(b);
    } else {
      const b = el('button', 'b ghost', '🔖 Lưu trang này');
      b.addEventListener('click', () => {
        const desc = (document.querySelector('meta[name="description"],meta[property="og:description"]') || {}).content || '';
        saveIdea({ type: 'page', title: document.title, url: location.href, text: desc });
      });
      src.append(b);
    }
    const sq = document.createElement('input'); sq.className = 'grow'; sq.placeholder = '🔍 Tìm note…'; sq.value = ideaQuery; sq.setAttribute('aria-label', 'Tìm ý tưởng');
    sq.addEventListener('input', () => { ideaQuery = sq.value; drawList(); });
    src.append(sq);
    V.append(src);
    // lọc
    const fl = el('div', 'row');
    [['all', 'Tất cả'], ['text', 'Chữ'], ['video', 'Video'], ['voice', 'Giọng nói']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + (ideaFilter === k ? ' on' : ''), lb);
      c.addEventListener('click', () => { ideaFilter = k; renderPanel(); });
      fl.append(c);
    });
    V.append(fl);
    const L = el('div', 'body-list'); V.append(L);
    function drawList() {
      L.innerHTML = '';
      const q = norm(ideaQuery.trim(), true);
      const list = ideas.filter(it => (ideaFilter === 'all' || (ideaFilter === 'text' ? ['text', 'page', 'summary'].includes(it.type) : it.type === ideaFilter))
        && (!q || norm(`${it.text} ${it.title} ${(it.ai && it.ai.titles || []).join(' ')}`, true).includes(q)));
      if (!ideas.length) { L.append(el('div', 'empty', 'Chưa có note. Bôi đen chữ ở bất kỳ trang nào rồi bấm 📝 Note (tự lưu cả link trang). Hoặc bấm 🎤 để nói.')); return; }
      if (!list.length) { L.append(el('div', 'empty', 'Không có ý tưởng nào khớp.')); return; }
      L.append(el('div', 'empty', `${list.length} note`));
      for (const it of list.slice(0, 100)) L.append(ideaCard(it, hasAi));
    }
    drawList();
    // chân: gọn một dòng, bấm Tuỳ chỉnh mới hiện cài đặt
    const pf = el('div', 'pf');
    const tg = el('button', 'b ghost', ideaCfgOpen ? '⚙ Ẩn tuỳ chỉnh' : '⚙ Tuỳ chỉnh');
    tg.addEventListener('click', () => { ideaCfgOpen = !ideaCfgOpen; renderPanel(); });
    pf.append(tg);
    if (ideas.length) {
      const ex = el('button', 'b ghost', 'Sao chép tất cả');
      ex.addEventListener('click', () => copyText(ideas.map(ideaAsText).join('\n\n────────\n\n'), ex));
      pf.append(ex);
    }
    V.append(pf);
    if (!ideaCfgOpen) return;
    const pf2 = el('div', 'pf');
    const pl = el('div', 'line'); pl.append(el('span', 'lb', 'Caption cho:'));
    [['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['chung', 'Chung']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + ((cfg.platform || 'chung') === k ? ' on' : ''), lb);
      c.addEventListener('click', () => saveCfg({ platform: k }));
      pl.append(c);
    });
    pf2.append(pl);
    const au = el('label', 'snd'); const ac = document.createElement('input'); ac.type = 'checkbox'; ac.checked = cfg.autoAI === true; ac.disabled = !hasAi;
    ac.addEventListener('change', () => saveCfg({ autoAI: ac.checked }));
    au.append(ac, hasAi ? 'Tự tạo sẵn gợi ý khi lưu (vẫn ẩn, bấm ✨ mới hiện)' : 'Gợi ý tiêu đề và caption cần mã Gemini (nhập ở nhánh Đọc hộ)');
    pf2.append(au);
    const ch = el('label', 'snd'); const cc = document.createElement('input'); cc.type = 'checkbox'; cc.checked = cfg.chip !== false;
    cc.addEventListener('change', () => saveCfg({ chip: cc.checked }));
    ch.append(cc, 'Hiện nút 💡 Lưu khi bôi đen chữ');
    pf2.append(ch);
    V.append(pf2);
  }
  function ideaAsText(it) {
    let t = `${IDEA_ICON[it.type] || '💡'} ${it.title || ''}\n${it.url || ''}\n${it.text || ''}`.trim();
    if (it.ai && it.ai.titles) t += `\n\nTiêu đề gợi ý:\n${it.ai.titles.map(x => '- ' + x).join('\n')}\n\nCaption:\n${it.ai.caption}\n${(it.ai.hashtags || []).join(' ')}`;
    return t;
  }
  function ideaCard(it, hasAi) {
    const c = el('div', 'idea' + (openIdea === it.id ? ' open' : ''));
    const hd = el('div', 'ih');
    hd.append(el('span', '', IDEA_ICON[it.type] || '💡'));
    if (it.url) {
      const a = el('button', 'lk', it.title || it.url); a.title = it.url;
      a.addEventListener('click', () => window.open(it.url, '_blank'));
      hd.append(a);
      if (it.type === 'video' && it.sec > 5) hd.append(el('span', '', '▶ ' + fmtSec(it.sec)));
    } else hd.append(el('span', '', it.title || 'Ý tưởng'));
    hd.append(el('span', 'tm', new Date(it.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })));
    c.append(hd);
    if (it.text) {
      const tx = el('div', 'it2', it.text); tx.title = 'Bấm để xem đủ';
      tx.addEventListener('click', () => { openIdea = openIdea === it.id ? null : it.id; c.classList.toggle('open'); });
      c.append(tx);
    }
    const ai = it.ai;
    const shown = aiOpen.has(it.id);
    if (shown && ai && ai.pending) c.append(h('<div class="ai"><span class="dots"><i></i><i></i><i></i></span> Đang nghĩ tiêu đề và caption…</div>'));
    else if (shown && ai && ai.error) c.append(el('div', 'err', '⚠ Chưa gợi ý được: ' + errText(ai.error)));
    else if (shown && ai && ai.titles) {
      const box = el('div', 'ai');
      box.append(el('div', 'lb2', 'Tiêu đề gợi ý (bấm để chép)'));
      ai.titles.forEach(t => { const b = el('button', 'cp', t); b.addEventListener('click', () => copyText(t, b)); box.append(b); });
      if (ai.caption) {
        box.append(el('div', 'lb2', 'Caption'));
        const full = ai.caption + (ai.hashtags && ai.hashtags.length ? '\n\n' + ai.hashtags.join(' ') : '');
        const b = el('button', 'cp', full); b.style.whiteSpace = 'pre-wrap'; b.addEventListener('click', () => copyText(full, b)); box.append(b);
      }
      const again = el('button', 'lk2', '↻ Gợi ý lại'); again.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'idea-ai', id: it.id }).catch(() => {}));
      box.append(again);
      c.append(box);
    }
    const acts = el('div', 'acts2');
    if (hasAi) {
      const has = ai && ai.titles;
      const g = el('button', 'sug' + (shown ? ' on' : ''), shown ? '✨ Ẩn gợi ý' : has ? '✨ Xem gợi ý' : '✨ Gợi ý');
      g.title = 'Tiêu đề, caption, hashtag cho bài đăng';
      g.addEventListener('click', () => {
        if (shown) aiOpen.delete(it.id);
        else { aiOpen.add(it.id); if (!has && !(ai && ai.pending)) chrome.runtime.sendMessage({ type: 'idea-ai', id: it.id }).catch(() => {}); }
        renderPanel();
      });
      acts.append(g);
    }
    const cp = el('button', '', 'Sao chép'); cp.addEventListener('click', () => copyText(ideaAsText(it), cp));
    const rm = el('button', '', '🔔 Nhắc');
    rm.addEventListener('click', async () => {
      const t = await noteToReminder(it.text || it.title, it.url, it.title);
      dueEditId = t.id; openTab('todo');
    });
    const td = el('button', '', '☑️ Todo');
    td.addEventListener('click', async () => {
      const { todos: tds = [] } = await chrome.storage.local.get('todos');
      tds.push({ id: 't' + Date.now().toString(36), text: (it.ai && it.ai.titles && it.ai.titles[0]) || (it.text || it.title).slice(0, 150), done: false, due: '', notified: false });
      await chrome.storage.local.set({ todos: tds }); td.textContent = 'Đã thêm ✓';
    });
    const del = el('button', '', 'Xoá');
    del.addEventListener('click', async () => {
      if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'Bấm lần nữa để xoá'; return; }
      const { ideas: all = [] } = await chrome.storage.local.get('ideas');
      await chrome.storage.local.set({ ideas: all.filter(x => x.id !== it.id) });
    });
    acts.append(cp, rm, td, del);
    c.append(acts);
    return c;
  }

  // ---------- nhập mã Gemini (dùng chung cho Đọc hộ, Dịch) ----------
  function geminiSetup(V, what) {
    const box = el('div', 'fm setup');
    box.append(h(`<div><b>${what} cần mã Gemini (miễn phí, làm 1 lần)</b>
      <ol><li>Bấm nút bên dưới để mở Google AI Studio, đăng nhập Gmail.</li><li>Bấm <b>Create API key</b> rồi sao chép mã.</li><li>Dán mã vào ô dưới và bấm Lưu.</li></ol></div>`));
    const open = el('button', 'b ghost', 'Mở trang lấy mã');
    open.addEventListener('click', () => window.open('https://aistudio.google.com/apikey', '_blank'));
    const row = el('div', 'line'); const inp = document.createElement('input'); inp.type = 'password'; inp.className = 'grow'; inp.placeholder = 'Dán mã Gemini (AIza…)'; inp.setAttribute('aria-label', 'Mã Gemini');
    const sv = el('button', 'b', 'Lưu');
    sv.addEventListener('click', () => { const k = inp.value.trim(); if (k.length < 20) return inp.focus(); settings.ai = { ...(settings.ai || {}), key: k }; chrome.storage.local.set({ settings }); });
    row.append(inp, sv); box.append(open, row); V.append(box);
  }

  // ---------- nhánh Dịch ----------
  const TARGETS = { vi: '🇻🇳 Tiếng Việt', en: '🇬🇧 English', zh: '🇨🇳 中文', ja: '🇯🇵 日本語', ko: '🇰🇷 한국어' };
  const target = () => (settings.dich || {}).target || 'vi';
  async function translateText(text, from) {
    text = String(text || '').trim(); if (!text) return;
    dichState = { mode: 'text', from, src: text.slice(0, 20000), loading: true };
    if (ui) { if (ui.panel.hidden || !isSub('dich')) openTab('dich'); else renderPanel(); }
    try {
      const r = await chrome.runtime.sendMessage({ type: 'ai-translate', mode: 'text', text: dichState.src, target: target() });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      Object.assign(dichState, { lang: r.lang, same: r.same, result: r.translation });
    } catch (e) { dichState.error = errText(e.message); }
    dichState.loading = false; renderPanel();
  }
  async function translatePdf(more) {
    if (!more) dichState = { mode: 'pdf', loading: true, parts: [] }; else { dichState.loading = true; dichState.error = ''; }
    renderPanel();
    try {
      if (!dichState.pdf) dichState.pdf = await pdfBase64(location.href);
      const r = await chrome.runtime.sendMessage({ type: 'ai-translate', mode: 'pdf', pdf: dichState.pdf, target: target(), prev: dichState.parts });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      dichState.parts.push(r.translation); dichState.more = r.truncated; dichState.lang = r.lang || dichState.lang;
    } catch (e) { dichState.error = errText(e.message); }
    dichState.loading = false; renderPanel();
  }
  // Dịch cả trang ngay tại chỗ (giữ bố cục trang, thay chữ)
  const hasLetters = t => /[\p{L}]{2,}/u.test(t);
  async function translatePage() {
    if (pageTr.running) return;
    const nodes = textNodes().filter(n => !pageTr.map.has(n) && hasLetters(n.data) && n.data.trim().length > 1).slice(0, 2500);
    if (!nodes.length) { pageTr.error = pageTr.map.size ? 'Đã dịch hết phần chữ trên trang.' : 'Trang này không có chữ để dịch.'; renderPanel(); return; }
    Object.assign(pageTr, { running: true, stop: false, done: 0, total: nodes.length, error: '', showing: 'tr' });
    renderPanel();
    // nhóm thành từng lô ~3500 ký tự để gửi Gemini
    const batches = []; let cur = [], len = 0;
    for (const n of nodes) {
      const t = n.data.trim();
      if (cur.length && (len + t.length > 3500 || cur.length >= 60)) { batches.push(cur); cur = []; len = 0; }
      cur.push(n); len += t.length;
    }
    if (cur.length) batches.push(cur);
    for (const batch of batches) {
      if (pageTr.stop) break;
      try {
        const r = await chrome.runtime.sendMessage({ type: 'ai-translate', mode: 'batch', segments: batch.map(n => n.data.trim()), target: target() });
        if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
        if (!pageTr.lang && r.lang) pageTr.lang = r.lang;
        batch.forEach((n, i) => {
          const tr = r.items[i]; if (typeof tr !== 'string' || !n.isConnected) return;
          const orig = n.data, lead = orig.match(/^\s*/)[0], trail = orig.match(/\s*$/)[0];
          pageTr.map.set(n, orig); pageTr.tr.set(n, lead + tr + trail);
          if (pageTr.showing === 'tr') n.data = lead + tr + trail;
        });
      } catch (e) { pageTr.error = errText(e.message); break; }
      pageTr.done += batch.length;
      if (isSub('dich')) renderPanel();
    }
    pageTr.running = false; renderPanel();
    if (ui && (ui.panel.hidden || !isSub('dich')) && !pageTr.error) say('Dịch xong trang này rồi!', 'happy', '', 'dich');
  }
  function restorePage() { for (const [n, o] of pageTr.map) if (n.isConnected) n.data = o; pageTr.showing = 'orig'; }
  function showTranslated() { for (const [n, t] of pageTr.tr) if (n.isConnected) n.data = t; pageTr.showing = 'tr'; }

  function renderDich(V) {
    const ai = settings.ai || {};
    if (!ai.key) { geminiSetup(V, 'Dịch'); return; }
    const saveD = patch => { settings.dich = { ...(settings.dich || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    // dịch sang
    const tg = el('div', 'row'); tg.append(el('span', 'lb', 'Tự nhận ngôn ngữ, dịch sang'));
    const ts = document.createElement('select'); ts.setAttribute('aria-label', 'Dịch sang');
    Object.entries(TARGETS).forEach(([k, lb]) => { const o = document.createElement('option'); o.value = k; o.textContent = lb; ts.append(o); });
    ts.value = target(); ts.addEventListener('change', () => saveD({ target: ts.value }));
    tg.append(ts);
    V.append(tg);
    // 3 cách dịch
    const acts = el('div', 'row');
    const sel = lastSel.text && Date.now() - lastSel.at < 180000 ? lastSel.text : '';
    const bSel = el('button', 'b' + (sel ? '' : ' ghost'), sel ? `✂ Dịch đoạn bôi đen (${sel.split(/\s+/).length} chữ)` : '✂ Dịch đoạn bôi đen');
    bSel.addEventListener('click', () => sel ? translateText(sel, 'sel') : say('Bôi đen một đoạn trên trang trước nhé (hoặc dán chữ vào ô bên dưới).', 'alert', '', 'dich'));
    acts.append(bSel);
    if (isPdf()) {
      const bp = el('button', 'b', '📄 Dịch file PDF này');
      bp.addEventListener('click', () => translatePdf(false));
      acts.append(bp);
    } else if (pageTr.running) {
      const st = el('button', 'b ghost', '⏹ Dừng dịch'); st.addEventListener('click', () => { pageTr.stop = true; });
      acts.append(st);
    } else if (pageTr.map.size) {
      const tgl = el('button', 'b ghost', pageTr.showing === 'tr' ? '↩ Xem bản gốc' : '🌐 Xem bản dịch');
      tgl.addEventListener('click', () => { pageTr.showing === 'tr' ? restorePage() : showTranslated(); renderPanel(); });
      const more = el('button', 'b ghost', 'Dịch phần mới tải thêm');
      more.addEventListener('click', translatePage);
      acts.append(tgl, more);
    } else {
      const bp = el('button', 'b', '📰 Dịch cả trang');
      bp.addEventListener('click', () => {
        if ((document.documentElement.lang || '').toLowerCase().startsWith(target()) && bp.dataset.sure !== '1') {
          bp.dataset.sure = '1'; bp.textContent = `Trang đã là ${TARGETS[target()]}? Bấm lần nữa để vẫn dịch`; return;
        }
        translatePage();
      });
      acts.append(bp);
    }
    V.append(acts);
    const L = el('div', 'body-list');
    // tiến độ dịch trang
    if (pageTr.running || pageTr.map.size || pageTr.error) {
      const box = el('div', 'trbox');
      box.append(el('div', 'lg', pageTr.lang ? `Trang: ${pageTr.lang} → ${TARGETS[target()]}` : 'Dịch cả trang'));
      if (pageTr.running) {
        box.append(h(`<div class="prog"><i style="width:${Math.round(pageTr.done / Math.max(1, pageTr.total) * 100)}%"></i></div>`));
        box.append(el('div', 'empty', `Đang dịch ${pageTr.done}/${pageTr.total} đoạn… Chữ trên trang đổi dần.`));
      } else if (pageTr.map.size) box.append(el('div', 'empty', `Đã dịch ${pageTr.map.size} đoạn ngay trên trang, giữ nguyên bố cục.`));
      if (pageTr.error) box.append(el('div', 'err', '⚠ ' + pageTr.error));
      L.append(box);
    }
    // kết quả dịch đoạn / PDF
    const d = dichState;
    if (d) {
      const box = el('div', 'trbox');
      if (d.loading) box.append(h(`<div class="loading"><span class="dots"><i></i><i></i><i></i></span>${d.mode === 'pdf' ? 'HaoHao đang dịch PDF (file dài có thể mất 1 phút)…' : 'HaoHao đang dịch…'}</div>`));
      if (d.lang) box.append(el('div', 'lg', d.same ? `Đoạn này đã là ${TARGETS[target()]}` : `${d.lang} → ${TARGETS[target()]}`));
      if (d.mode === 'text' && d.src) box.append(el('div', 'trsrc', d.src));
      const out = d.mode === 'pdf' ? (d.parts || []).join('\n\n') : d.result;
      if (out) box.append(md(out));
      if (d.error) box.append(el('div', 'err', '⚠ ' + d.error));
      if (out && !d.loading) {
        const a2 = el('div', 'line');
        const cp = el('button', 'b ghost', 'Sao chép bản dịch'); cp.addEventListener('click', () => copyText(out, cp));
        const sv = el('button', 'b ghost', '📝 Lưu Note'); sv.addEventListener('click', () => saveIdea({ type: 'text', text: out, title: 'Bản dịch: ' + document.title, url: location.href }));
        a2.append(cp, sv);
        if (d.mode === 'pdf' && d.more) { const mo = el('button', 'b', 'Dịch tiếp phần sau'); mo.addEventListener('click', () => translatePdf(true)); a2.append(mo); }
        box.append(a2);
      }
      L.append(box);
    } else if (!pageTr.map.size && !pageTr.running) {
      L.append(el('div', 'empty', 'Mẹo: bôi đen chữ ở bất kỳ trang nào là hiện nút 🌐 Dịch ngay cạnh.'));
    }
    V.append(L);
    // dán chữ để dịch
    const pf = el('div', 'row');
    const ta = document.createElement('textarea'); ta.className = 'tin grow'; ta.rows = 1; ta.placeholder = 'Hoặc dán chữ cần dịch vào đây…'; ta.setAttribute('aria-label', 'Chữ cần dịch');
    ta.addEventListener('focus', () => { ta.style.minHeight = '90px'; });
    ta.addEventListener('blur', () => { if (!ta.value) ta.style.minHeight = ''; });
    const go = el('button', 'b', 'Dịch');
    go.addEventListener('click', () => { const t = ta.value.trim(); if (t) translateText(t, 'paste'); else ta.focus(); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go.click(); });
    pf.append(ta, go);
    const ch = el('label', 'snd'); const cc = document.createElement('input'); cc.type = 'checkbox'; cc.checked = (settings.dich || {}).chip !== false;
    cc.addEventListener('change', () => saveD({ chip: cc.checked }));
    ch.append(cc, 'Hiện nút 🌐 Dịch khi bôi đen chữ');
    ch.style.flexBasis = '100%';
    pf.append(ch);
    V.append(pf);
  }

  // ---------- 🍅 Pomodoro ----------
  function renderFocus(V) {
    V.append(pomoCard());
    const L = el('div', 'body-list');
    const open = todos.filter(t => !t.done).sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0));
    const ab = alertBlock('focus'); if (ab) L.append(ab);
    L.append(el('div', 'gh', 'Chọn việc để tập trung'));
    if (!open.length) L.append(el('div', 'empty', 'Todo đang trống. Thêm việc ở nhánh Todo, hoặc bấm ▶ Bắt đầu để tập trung tự do.'));
    for (const t of open.slice(0, 20)) {
      const row = el('div', 'todo');
      row.append(el('div', 'tx', (t.star ? '⭐ ' : '') + t.text));
      const go = el('button', 'b ghost', '🍅 Bắt đầu');
      go.addEventListener('click', () => pomoSend('pomo-start', { task: t.text }));
      row.append(go); L.append(row);
    }
    V.append(L);
  }

  // ---------- 🧠 Thông tin: Dịch · Tóm tắt · Giải thích ----------
  function renderInfo(V) {
    const st = el('div', 'subtabs');
    [['dich', '🌐 Dịch'], ['read', '✨ Tóm tắt'], ['explain', '💡 Giải thích']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + (infoSub === k ? ' on' : ''), lb);
      c.addEventListener('click', () => { infoSub = k; if (k === 'read') readReady = false; renderPanel(); });
      st.append(c);
    });
    V.append(st);
    if (infoSub === 'read') renderRead(V); else if (infoSub === 'explain') renderExplain(V); else renderDich(V);
  }
  async function doExplain(text, mode) {
    text = String(text || '').trim(); if (!text) { infoSub = 'explain'; if (ui) openTab('info'); return; }
    const m = mode || (settings.explain || {}).mode || 'de';
    explainState = { text: text.slice(0, 2000), mode: m, loading: true };
    infoSub = 'explain';
    if (ui) { if (ui.panel.hidden || tab !== 'info') openTab('info'); else renderPanel(); }
    try {
      const r = await chrome.runtime.sendMessage({ type: 'ai-explain', text: explainState.text, mode: m, context: document.title });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      explainState.result = r.text;
    } catch (e) { explainState.error = errText(e.message); }
    explainState.loading = false; renderPanel();
  }
  function renderExplain(V) {
    if (!(settings.ai || {}).key) { geminiSetup(V, 'Giải thích'); return; }
    const row = h(`<div class="row"><input class="grow" placeholder="Nhập hoặc bôi đen cụm cần giải thích (vd: CAGR, thép mũ)" aria-label="Cụm cần giải thích"><button class="b">💡 Giải thích</button></div>`);
    const qi = row.querySelector('input'); const sel = lastSel.text && Date.now() - lastSel.at < 180000 ? lastSel.text : '';
    qi.value = explainState ? explainState.text : sel.slice(0, 200);
    const go = () => { if (qi.value.trim()) doExplain(qi.value); else qi.focus(); };
    row.querySelector('button').addEventListener('click', go);
    qi.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    V.append(row);
    const md2 = el('div', 'row');
    const cur = (explainState && explainState.mode) || (settings.explain || {}).mode || 'de';
    [['de', '👶 Dễ hiểu'], ['chitiet', '🧠 Chi tiết'], ['vidu', '📌 Ví dụ']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + (cur === k ? ' on' : ''), lb);
      c.addEventListener('click', () => { settings.explain = { mode: k }; chrome.storage.local.set({ settings }); if (explainState && explainState.text) doExplain(explainState.text, k); else renderPanel(); });
      md2.append(c);
    });
    V.append(md2);
    const L = el('div', 'body-list');
    const e = explainState;
    if (!e) L.append(el('div', 'empty', 'Bôi đen một thuật ngữ trên trang rồi bấm 💡 Giải thích. Hợp khi đọc tài liệu kỹ thuật, tài chính, tiếng Anh.'));
    else {
      const box = el('div', 'trbox');
      if (e.loading) box.append(h('<div class="loading"><span class="dots"><i></i><i></i><i></i></span>HaoHao đang nghĩ cách giải thích…</div>'));
      if (e.result) box.append(md(e.result));
      if (e.error) box.append(el('div', 'err', '⚠ ' + e.error));
      if (e.result && !e.loading) {
        const a2 = el('div', 'line');
        const cp = el('button', 'b ghost', 'Sao chép'); cp.addEventListener('click', () => copyText(e.result, cp));
        const sv = el('button', 'b ghost', '📝 Lưu Note'); sv.addEventListener('click', () => saveIdea({ type: 'text', text: e.result, title: 'Giải thích: ' + e.text.slice(0, 60), url: location.href }));
        a2.append(cp, sv); box.append(a2);
      }
      L.append(box);
    }
    V.append(L);
  }

  // ---------- 🔔 Nhắc nhanh bằng câu ----------
  async function quickRemind(text) {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'quick-remind', text });
      if (!r || !r.ok) throw new Error();
      if (r.due) say(`${new Date(r.due).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' })}: ${r.item.text}`, 'happy', '🔔 Đã đặt nhắc', 'bell');
      else { dueEditId = r.item.id; say(`Đã thêm "${r.item.text}" vào Todo. Chưa thấy giờ trong câu, bấm vào đây để hẹn giờ.`, 'happy', '🔔 Nhắc', 'todo'); }
      return r;
    } catch { say('Chưa đặt được nhắc, thử lại nhé.', 'alert'); }
  }
  // Nhắc "Sắp tới": việc có giờ + lịch lặp
  function upcoming() {
    const now = Date.now(), out = [];
    for (const t of todos) if (!t.done && t.due && new Date(t.due).getTime() > now) out.push({ at: new Date(t.due).getTime(), text: t.text, icon: '☑️' });
    for (const r of rules) if (r.type === 'reminder' && r.enabled) { const n = nextFire(r); if (n) out.push({ at: n.getTime(), text: r.name, icon: r.icon || '🔔' }); }
    return out.sort((a, b) => a.at - b.at).slice(0, 5);
  }

  // ---------- 🛒 Mua sắm ----------
  const cleanUrl = u => { try { const x = new URL(u); return x.origin + x.pathname; } catch { return u; } };
  const vnd = n => n ? Number(n).toLocaleString('vi-VN') + 'đ' : '?';
  const isShopHost = () => /(^|\.)(shopee\.vn|tiktok\.com)$/.test(location.hostname);
  function detectProduct() {
    if (!isShopHost()) return null;
    let p = null;
    for (const sc of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const j = JSON.parse(sc.textContent); const arr = [].concat(j['@graph'] || j);
        const prod = arr.find(x => x && (x['@type'] === 'Product' || (Array.isArray(x['@type']) && x['@type'].includes('Product'))));
        if (prod) {
          const of = [].concat(prod.offers || [])[0] || {};
          p = { title: prod.name, price: Number(of.price || of.lowPrice || (of.priceSpecification || {}).price || 0) };
          break;
        }
      } catch {}
    }
    if (!p) {
      const mp = document.querySelector('meta[property="product:price:amount"],meta[property="og:price:amount"],meta[itemprop="price"]');
      if (mp) p = { title: (document.querySelector('meta[property="og:title"]') || {}).content || document.title, price: Number(mp.content) || 0 };
    }
    if (!p) {
      const cand = [...document.querySelectorAll('[class*="price" i]')].map(e => (e.innerText || '').trim()).find(t => /\d[\d.,]{3,}\s*(₫|đ|VND)|(₫|đ)\s*\d[\d.,]{3,}/i.test(t));
      const price = cand ? Number((cand.match(/\d[\d.,]{3,}/) || [''])[0].replace(/[.,]/g, '')) : 0;
      const title = ((document.querySelector('h1') || {}).innerText || document.title).trim();
      if (price) p = { title: title.slice(0, 150), price };
    }
    if (p && p.title) { p.title = p.title.replace(/^\s*(Yêu thích\+?|Mall|Shopee Mall|Chính hãng|Xu Hướng)\s*/i, '').trim(); p.url = cleanUrl(location.href); }
    return p && p.title ? p : null;
  }
  function trackPrice() {   // mỗi lần mở lại trang sản phẩm đã lưu: ghi giá, báo nếu đạt mức
    const p = detectProduct(); if (!p || !p.price) return;
    const it = products.find(x => x.url === p.url); if (!it) return;
    const last = it.history[it.history.length - 1];
    if (!last || last.p !== p.price || Date.now() - last.t > 6 * 3600e3) it.history.push({ t: Date.now(), p: p.price });
    it.history = it.history.slice(-60);
    const before = it.price; it.price = p.price;
    if (it.target && p.price <= it.target && !it.hit) {
      it.hit = true; shopAlert = true; updateBadge();
      say(`${it.title.slice(0, 60)}: ${vnd(before)} → ${vnd(p.price)}`, 'alert', '🛒 GIẢM GIÁ RỒI!', 'shop', buyActs(it));
    }
    chrome.storage.local.set({ products });
  }
  // mở link qua background để luôn đi qua link tiếp thị (chỉ khi người dùng bấm)
  const openDeal = url => chrome.runtime.sendMessage({ type: 'open-deal', url }).catch(() => window.open(HT.aff(url), '_blank'));
  const buyActs = it => [{ label: '🛒 Mua ngay', fn: () => openDeal(it.url) }, { label: 'Để sau', ghost: true, fn: () => {} }];
  const SHOP_NAME = { shopee: 'Shopee', tiktok: 'TikTok Shop' };
  function sparkline(history) {
    const pts = (history || []).filter(x => x.p && Date.now() - x.t <= 30 * 86400e3);
    if (pts.length < 2) return null;
    const W = 120, H = 30, t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1, ps = pts.map(x => x.p), lo = Math.min(...ps), hi = Math.max(...ps);
    const X = t => 2 + (W - 4) * (t1 === t0 ? 1 : (t - t0) / (t1 - t0)), Y = p => hi === lo ? H / 2 : 3 + (H - 6) * (1 - (p - lo) / (hi - lo));
    const d = pts.map((x, i) => `${i ? 'L' : 'M'}${X(x.t).toFixed(1)} ${Y(x.p).toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    return h(`<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Giá 30 ngày: thấp nhất ${vnd(lo)}, cao nhất ${vnd(hi)}">
      <path d="${d} L${X(last.t).toFixed(1)} ${H} L${X(pts[0].t).toFixed(1)} ${H} Z" fill="#EC4A68" opacity=".1"/>
      <path d="${d}" fill="none" stroke="#EC4A68" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <path d="M${X(last.t).toFixed(1)} ${Y(last.p).toFixed(1)}h0" stroke="#EC4A68" stroke-width="6" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`);
  }
  let shopSub = 'check';
  function renderShop(V) {
    shopAlert = false;
    const p = detectProduct(), item = isItemPage(), shopPg = !item && isShopeeShop();
    if (item || shopPg) {
      if (settings.shopTrust !== false) analyzeShopee(true);
      const canFind = item && p && p.price;
      if (canFind) {
        const tabs2 = el('div', 'stabs');
        [['check', '🛡️ Kiểm tra'], ['cheaper', '🔍 Tìm shop rẻ hơn']].forEach(([k, lb]) => {
          const b = el('button', shopSub === k ? 'on' : '', lb); b.setAttribute('aria-pressed', shopSub === k);
          b.addEventListener('click', () => { shopSub = k; renderPanel(); }); tabs2.append(b);
        });
        V.append(tabs2);
      }
      const L = el('div', 'body-list');
      if (canFind && shopSub === 'cheaper') renderCheaper(L, p);
      else if (trust) L.append(trustCard());
      else L.append(el('div', 'optwait', 'HaoHao đang đọc trang… kéo xuống một chút để Shopee tải thông tin shop và đánh giá.'));
      V.append(L);
      if (isTikTokItem() && !HT.ttLink(location.href)) { const tc = ttCard(); if (tc) V.append(tc); }
      else if (!isTikTokItem()) { const sc = spCard(); if (sc) V.append(sc); }
      return;
    }
    // trang khác: 🔎 tìm sản phẩm, HaoHao lọc sẵn 3 món đáng mua ngay trong bảng
    renderFind(V);
  }

  // Hỏi background (tìm shop rẻ hơn / tìm sản phẩm) nhưng không chờ quá 90 giây
  const askBg = (msg, ms = 90000) => Promise.race([chrome.runtime.sendMessage(msg).catch(() => null), new Promise(r => setTimeout(() => r({ ok: false, error: 'slow' }), ms))]);
  // Tiến độ: kết quả nhanh từ trang tìm kiếm, rồi "đang kiểm tra kỹ 1/3…"
  const stepText = st => st.step === 'check' ? `Đang kiểm tra kỹ từng shop (${st.done || 0}/${st.of || 0})…` : st.step === 'search' ? 'Đang đọc kết quả tìm kiếm Shopee…' : 'Đang mở Shopee…';
  function waitBox(st, first) { const box = el('div', 'optwait'); box.append(el('div', 'spin'), el('div', '', first), el('small', '', stepText(st))); return box; }
  const quickOf = st => st && st.loading && st.quick && st.quick.options && st.quick.options.length ? st.quick.options : null;
  const progLine = st => el('div', 'oprog', '⏳ Kết quả nhanh · ' + stepText(st));
  function slowBox(msg, retry, q) {
    const box = el('div', 'optwait'); box.append(el('div', '', msg));
    const row = el('div', 'fmore'); const b = el('button', 'b', '🔄 Thử lại'); b.addEventListener('click', retry); row.append(b);
    if (q) { const a = el('button', 'chip', 'Xem trên Shopee ›'); a.addEventListener('click', () => openDeal(HT.shopeeSearchUrl(q))); row.append(a); }
    box.append(row); return box;
  }
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type !== 'same-progress' || !ui) return;
    const k = itemKey(), up = st => ({ ...st, step: msg.step, done: msg.done, of: msg.of, quick: msg.quick || st.quick });
    let hit = false;
    if (msg.key === k && sameState && sameState.loading) { sameState = up(sameState); hit = true; }
    if (msg.key === 'tt:' + k && shopeeState && shopeeState.loading) { shopeeState = up(shopeeState); hit = true; }
    if (findState && findState.loading && msg.key === 'ps:' + HT.fold(findState.q)) { findState = up(findState); hit = true; }
    if (!hit) return;
    const typing = ui.root.activeElement && /INPUT|TEXTAREA/.test(ui.root.activeElement.tagName);
    if (tab === 'shop' && !ui.panel.hidden && !typing) renderPanel();
    if (ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
  });
  // ---------- 🔎 Tìm sản phẩm ----------
  let findQ = '', findRange = '', findMall = false, findState = null, findHist = [];
  const FIND_RANGES = [['lt100', 'Dưới 100k'], ['100-300', '100–300k'], ['gt300', 'Trên 300k']];
  chrome.storage.local.get('shopHist').then(r => { findHist = r.shopHist || []; }).catch(() => {});
  async function doFind(q) {
    q = String(q || '').replace(/\s+/g, ' ').trim().slice(0, 100); if (!q) return;
    findQ = q;
    findHist = [q, ...findHist.filter(x => HT.fold(x) !== HT.fold(q))].slice(0, 5);
    chrome.storage.local.set({ shopHist: findHist }).catch(() => {});
    const my = findState = { q, range: findRange, mall: findMall, loading: true, tok: {} };
    if (tab === 'shop' && !ui.panel.hidden) renderPanel();
    const r = await askBg({ type: 'prod-search', q, range: findRange, mall: findMall });
    if (!findState || findState.tok !== my.tok) return;           // đã tìm từ khác
    findState = { ...my, loading: false, error: r && r.ok ? '' : (r && r.error === 'slow' ? 'slow' : 'fail'), total: (r && r.total) || 0, safe: (r && r.safe) || 0, options: (r && r.options) || [] };
    if (tab === 'shop' && !ui.panel.hidden) renderPanel();
  }
  // Lối vào trang TikTok của bạn (phòng trưng bày): hàng HaoHao tuyển chọn
  function ttCard() {
    const url = HT.ttShowcase(); if (!url) return null;
    const b = el('button', 'ttcard'); b.setAttribute('aria-label', 'Mở hàng HaoHao tuyển chọn trên TikTok');
    const tx = el('span', 'ttx'); tx.append(el('b', '', '🛍️ Hàng HaoHao tuyển chọn'), el('small', '', 'Món đã kiểm tra, bán trên TikTok Shop'));
    b.append(tx, el('span', 'tth', '@' + (HT.TT.creator || 'TikTok') + ' ›'));
    b.addEventListener('click', () => openDeal(url));
    return b;
  }
  // Lối vào trang trưng bày Shopee của bạn
  function spCard() {
    const url = HT.SP.showcase; if (!url) return null;
    const b = el('button', 'ttcard spcard'); b.setAttribute('aria-label', 'Mở cửa hàng HaoHao trên Shopee');
    const tx = el('span', 'ttx'); tx.append(el('b', '', '🧡 Cửa hàng HaoHao trên Shopee'), el('small', '', 'Món đã chọn lọc, mua qua Shopee'));
    b.append(tx, el('span', 'tth', 'Xem ›'));
    b.addEventListener('click', () => openDeal(url));
    return b;
  }
  function renderFind(V) {
    const sr = h(`<form class="row fbox" role="search"><input class="grow" placeholder="🔎 Tìm sản phẩm trên Shopee" aria-label="Tìm sản phẩm" autocomplete="off"><button class="b">Tìm</button></form>`);
    const si = sr.querySelector('input'); si.value = findQ;
    // gợi ý khi đang gõ: tìm gần đây trước, rồi từ khoá hay tìm
    const sug = el('div', 'fsug'); sug.hidden = true; sug.setAttribute('role', 'listbox'); sr.append(sug);
    let sel = -1, items = [];
    const showSug = () => {
      items = HT.suggest(si.value, findHist); sel = -1; sug.textContent = '';
      items.forEach((x, i) => { const b = el('button', 'fsi', (x.hist ? '🕘 ' : '🔎 ') + x.t); b.type = 'button'; b.setAttribute('role', 'option');
        b.addEventListener('mousedown', e => { e.preventDefault(); si.value = x.t; sug.hidden = true; doFind(x.t); }); sug.append(b); });
      sug.hidden = !items.length || ui.root.activeElement !== si;
    };
    si.addEventListener('input', showSug); si.addEventListener('focus', showSug);
    si.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 150));
    si.addEventListener('keydown', e => {
      if (sug.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; [...sug.children].forEach((c, i) => c.classList.toggle('on', i === sel)); }
      else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); si.value = items[sel].t; sug.hidden = true; doFind(items[sel].t); }
      else if (e.key === 'Escape') { e.stopPropagation(); sug.hidden = true; }
    });
    sr.addEventListener('submit', e => { e.preventDefault(); sug.hidden = true; const q = si.value.trim(); if (q) doFind(q); else si.focus(); });
    // lọc nhanh: khoảng giá + chỉ Mall
    const fl = el('div', 'fchips');
    FIND_RANGES.forEach(([k, lb]) => { const c = el('button', 'chip' + (findRange === k ? ' on' : ''), lb); c.setAttribute('aria-pressed', findRange === k);
      c.addEventListener('click', () => { findRange = findRange === k ? '' : k; if (findQ) doFind(findQ); else renderPanel(); }); fl.append(c); });
    const cm = el('button', 'chip' + (findMall ? ' on' : ''), '🏬 Mall'); cm.setAttribute('aria-pressed', findMall);
    cm.addEventListener('click', () => { findMall = !findMall; if (findQ) doFind(findQ); else renderPanel(); }); fl.append(cm);
    V.append(sr, fl);
    // tìm gần đây
    if (findHist.length) {
      const hb = el('div', 'fhist'); hb.append(el('span', 'lb2', 'Gần đây:'));
      findHist.forEach(t => { const c = el('button', 'chip sm', t); c.addEventListener('click', () => doFind(t)); hb.append(c); });
      const x = el('button', 'fclr', '✕'); x.title = 'Xoá lịch sử tìm'; x.setAttribute('aria-label', 'Xoá lịch sử tìm');
      x.addEventListener('click', () => { findHist = []; chrome.storage.local.set({ shopHist: [] }).catch(() => {}); renderPanel(); }); hb.append(x);
      V.append(hb);
    }
    const L = el('div', 'body-list'), st = findState;
    if (st && st.loading && quickOf(st)) {
      L.append(el('div', 'fhead', `Lựa chọn cho “${st.q}”`), progLine(st));
      quickOf(st).forEach(o => L.append(optRow(o, 0, true)));
    } else if (st && st.loading) {
      L.append(waitBox(st, `Đang tìm “${st.q}” trên Shopee…`));
    } else if (st && st.error) {
      L.append(slowBox(st.error === 'slow' ? 'Shopee phản hồi quá chậm lần này.' : 'Chưa tìm được lần này (Shopee tải chậm hoặc cần đăng nhập).', () => doFind(st.q), st.q));
    } else if (st) {
      if (!st.options.length) L.append(el('div', 'optwait', st.total ? `Có ${st.total} món nhưng đều là shop rủi ro (mới mở, bán ít, hàng nước ngoài). Xem trên Shopee để tự chọn.` : `Chưa thấy món nào đúng “${st.q}”${findRange || findMall ? ' với bộ lọc này' : ''}.`));
      else {
        L.append(el('div', 'fhead', `3 lựa chọn cho “${st.q}”`));
        st.options.forEach(o => L.append(optRow(o, 0, true)));
        L.append(el('div', 'onote', `Lọc từ ${st.total} món: đã bỏ ${st.total - st.safe} shop rủi ro, kiểm tra kỹ các shop còn lại.`));
      }
      relatedPicks(L, st.q);
      const more = el('div', 'fmore');
      const a1 = el('button', 'chip', 'Xem tất cả trên Shopee ›'); a1.addEventListener('click', () => openDeal(HT.shopeeFindUrl(st.q, findRange)));
      const a2 = el('button', 'chip', 'Tìm trên TikTok Shop ›'); a2.addEventListener('click', () => openDeal(HT.SHOPS[1].search + encodeURIComponent(st.q)));
      more.append(a1, a2); L.append(more);
    }
    if (L.children.length) V.append(L);
    const sc = spCard(); if (sc) V.append(sc);
    const tc = ttCard(); if (tc) V.append(tc);
  }

  // ---------- 🔍 Cùng món, shop khác rẻ hơn (Shopee) ----------
  let sameState = null;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Đọc các thẻ sản phẩm trên trang tìm kiếm Shopee (theo chữ hiện trên thẻ)
  // Hình sản phẩm trong 1 thẻ: ảnh thật (bỏ ảnh chờ tải, icon nhỏ, ảnh nhúng data:)
  function cardImg(card) {
    for (const im of card.querySelectorAll('img')) {
      const u = im.currentSrc || im.src || im.getAttribute('data-src') || '';
      if (/^https:\/\//.test(u) && !/\.svg(\?|$)/i.test(u) && !(im.naturalWidth && im.naturalWidth < 60)) return u;
    }
    return '';
  }
  const pageImg = () => { const m = document.querySelector('meta[property="og:image"], meta[name="og:image"]'); const u = m && m.content || ''; return /^https:\/\//.test(u) ? u : ''; };
  function readSearchCards() {
    const seen = new Set(), out = [];
    for (const a of document.querySelectorAll('a[href*="-i."]')) {
      const m = a.href.match(/-i\.(\d+)\.(\d+)/); if (!m) continue;
      const key = m[1] + '.' + m[2]; if (seen.has(key)) continue;
      const card = a.closest('li') || a;
      const lines = (card.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
      const flat = lines.join(' ').replace(/Giảm\s*₫\s*[\d.,]+\s*k?/gi, ' ');
      const prices = [...flat.matchAll(/₫\s*([\d.]{3,})|([\d.]{4,})\s*₫/g)].map(x => HT.num(x[1] || x[2])).filter(n => n >= 1000);
      const title = lines.filter(l => l.length > 15 && !/₫|đã bán/i.test(l)).sort((x, y) => y.length - x.length)[0];
      if (!prices.length || !title) continue;
      seen.add(key);
      const sold = HT.num((flat.match(/Đã bán\s*([\d.,]+\s*k?\+?)/i) || flat.match(/([\d.,]+\s*k?\+?)\s*đã bán/i) || [])[1]);
      const rt = lines.find(l => /^\d[.,]\d$/.test(l)) || (flat.match(/★\s*(\d[.,]\d)/) || [])[1];
      out.push({ key, url: 'https://shopee.vn' + new URL(a.href).pathname, image: cardImg(card), title: title.replace(/^(Yêu thích\+?|Mall)\s*/i, ''), price: Math.min(...prices),
        sold: isNaN(sold) ? null : sold, rating: rt ? parseFloat(String(rt).replace(',', '.')) : null,
        mall: /(^|\s)Mall(\s|$)/.test(flat), preferred: /Yêu thích/i.test(flat), overseas: /nước ngoài|quốc tế/i.test(flat) });
    }
    return out;
  }
  // Chạy trong tab ẩn: đợi Shopee tải danh sách, cuộn cho tải thêm, rồi gửi kết quả về
  async function runScan() {
    const t0 = Date.now(); let last = -1, stable = 0;
    while (Date.now() - t0 < 20000) {
      await wait(1200); window.scrollBy(0, 1400);
      const n = readSearchCards().length;
      if (n >= 40) break;
      if (n > 0 && n === last) { if (++stable >= 2) break; } else stable = 0;
      last = n;
    }
    chrome.runtime.sendMessage({ type: 'scan-result', result: readSearchCards().slice(0, 60) }).catch(() => {});
  }
  // Chạy trong tab ẩn trên 1 trang sản phẩm: cuộn cho Shopee tải phần shop + đánh giá, đọc rồi gửi về
  async function runItemScan() {
    const t0 = Date.now(); let info = null;
    while (Date.now() - t0 < 10000) {
      await wait(1000); window.scrollBy(0, 900);
      info = readShopee();
      if ((info.rating || info.ratingCount) && (info.responseRate != null || info.joinedMonths != null) && info.dist) break;
    }
    const lines = (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
    const oi = lines.findIndex(l => /^(Online|Đang hoạt động|Hoạt động)\b/i.test(l));
    let shopName = oi > 0 ? lines[oi - 1] : '';
    if (/^(Mall|Yêu thích\+?)$/i.test(shopName) && oi > 1) shopName = lines[oi - 2];
    const p = detectProduct();
    chrome.runtime.sendMessage({ type: 'scan-result', result: { info, shopName: (shopName || '').slice(0, 40), price: p && p.price, title: p && p.title, image: pageImg() } }).catch(() => {});
  }
  // Mở sản phẩm Shopee: tự so giá với các shop khác ở nền, để bong bóng mời "Có shop bán rẻ hơn …"
  function autoFindSame() {
    if (settings.shopAuto === false || !isItemPage()) return;
    const href = location.href;
    if (isTikTokItem()) {       // TikTok: chờ mục gợi ý cuối trang tải xong (thử lại vài lần)
      let n = 0, sp = false; const tick = () => {
        if (location.href !== href) return; const p = detectProduct();
        if (p && p.price && !sp) { sp = true; findShopee(p); }      // cùng món trên Shopee (qua link Shopee của bạn)
        if (p && p.price && readTikTokCards().length) return findSame(p); if (++n < 8) setTimeout(tick, 3000); };
      return setTimeout(tick, 2500);
    }
    setTimeout(() => {
      const p = detectProduct();
      if (location.href !== href || !p || !p.price || (sameState && sameState.url === p.url)) return;
      findSame(p);
    }, 2500);
  }
  // Trang TikTok: tìm đúng cùng sản phẩm trên Shopee (tab ẩn, như "Tìm shop rẻ hơn" của Shopee)
  let shopeeState = null;
  async function findShopee(p, inRender) {
    if (shopeeState && shopeeState.url === p.url && (shopeeState.loading || !shopeeState.error)) return;
    const my = shopeeState = { url: p.url, loading: true, tok: {} };
    if (!inRender && tab === 'shop' && !ui.panel.hidden) renderPanel();
    const q = HT.cleanTitle(p.title).split(' ').slice(0, 8).join(' ');
    const r = await askBg({ type: 'same-find', q, key: 'tt:' + itemKey(), title: p.title, price: p.price });
    if (!shopeeState || shopeeState.tok !== my.tok) return;     // đã chuyển sang món khác
    shopeeState = { url: p.url, loading: false, error: r && r.ok ? '' : (r && r.error === 'slow' ? 'slow' : 'fail'), total: (r && r.total) || 0, options: ((r && r.options) || []).map(o => ({ ...o, plat: 'shopee' })) };
    if (tab === 'shop' && !ui.panel.hidden) renderPanel();
    if (ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
  }
  function renderShopeeAlt(L, p) {
    let st = shopeeState && shopeeState.url === p.url ? shopeeState : null;
    if (!st) { findShopee(p, true); st = shopeeState; }
    L.append(el('div', 'fhead alt', '🟠 Cùng sản phẩm trên Shopee'));
    if (st.loading && quickOf(st)) { L.append(progLine(st)); quickOf(st).slice(0, 2).forEach(o => L.append(optRow({ ...o, plat: 'shopee' }, p.price - o.price))); return; }
    if (st.loading) return L.append(waitBox(st, 'Đang tìm đúng món này trên Shopee…'));
    if (st.error) return L.append(slowBox('Chưa tìm được trên Shopee lần này.', () => { shopeeState = null; findShopee(p); }, HT.cleanTitle(p.title).split(' ').slice(0, 8).join(' ')));
    if (!st.options.length) return L.append(el('div', 'optwait ok', st.total ? `👍 Giá TikTok đang rẻ hơn ${st.total} shop Shopee bán cùng món` : 'Chưa thấy Shopee bán đúng sản phẩm này.'));
    st.options.slice(0, 2).forEach(o => L.append(optRow(o, p.price - o.price)));
  }
  async function findSame(p, inRender) {
    if (isTikTokItem()) {       // TikTok: so ngay trên trang, không cần tab ẩn
      const self = itemKey(), cards = readTikTokCards();
      // bỏ sản phẩm của chính shop này ("Khám phá thêm sản phẩm từ …"), chỉ giữ đúng CÙNG sản phẩm ở shop khác
      const seller = HT.fold(((document.body.innerText || '').match(/(?:^|\n)\s*Do\s+(.{2,40}?)\s+bán\s*(?:\n|$)/i) || [])[1] || '');
      const same = cards.filter(x => x.key !== self && !(seller && HT.fold(x.shopName) === seller))
        .map(x => ({ ...x, ...HT.sameProduct(p.title, x.title) })).filter(x => x.same && x.price >= p.price * 0.5);
      const cheaper = same.filter(x => x.price < p.price * 0.99).map(x => ({ ...x, ...HT.listingScore(x), issues: [] }));
      sameState = { url: p.url, loading: false, error: cards.length ? '' : 'nocards', total: same.length, options: HT.pickOptions(cheaper) };
      if (!inRender && tab === 'shop' && !ui.panel.hidden) renderPanel();
      if (ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
      return;
    }
    sameState = { url: p.url, loading: true };
    if (!inRender && tab === 'shop' && !ui.panel.hidden) renderPanel();
    if (!inRender && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
    const q = HT.cleanTitle(p.title).split(' ').slice(0, 8).join(' ');
    const r = await askBg({ type: 'same-find', q, key: itemKey(), title: p.title, price: p.price });
    sameState = { url: p.url, loading: false, error: r && r.ok ? '' : (r && r.error === 'slow' ? 'slow' : 'fail'), total: (r && r.total) || 0, options: (r && r.options) || [] };
    if (tab === 'shop' && !ui.panel.hidden) renderPanel();
    if (ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
  }
  const kShort = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '').replace('.', ',') + 'tr' : n >= 1000 ? Math.round(n / 1000) + 'k' : n + 'đ';
  const OPT_TAG = { best: '⭐ Đáng mua nhất', cheap: '💰 Rẻ nhất', trust: '🏬 Uy tín nhất' };
  // 1 dòng lựa chọn: điểm, tên shop, mức tin cậy, giá, 🛡️ xem kiểm tra, Xem (link tiếp thị)
  function optRow(o, save, withTitle) {
    const row = el('div', 'opt ' + o.cls);
    const ring = el('div', 'oring'); ring.style.setProperty('--v', o.score); ring.append(el('b', '', o.score));
    let lead = ring;
    if (o.image && /^(https:\/\/|data:image\/)/.test(o.image)) {
      // có hình: hình sản phẩm + điểm nhỏ ở góc; hình lỗi thì quay về vòng điểm
      lead = el('div', 'othumb'); const im = document.createElement('img'); im.src = o.image; im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer';
      im.addEventListener('error', () => lead.replaceWith(ring));
      lead.append(im, el('b', 'osc', o.score));
    }
    const mid = el('div', 'omid');
    const nm = el('div', 'oshop'); nm.append(el('span', 'on', o.shopName || (o.plat !== 'shopee' && isTikTokItem() ? 'Shop khác trên TikTok' : 'Shop trên Shopee'))); nm.title = o.shopName || '';
    if (o.mall) nm.append(el('em', 'om', 'Mall')); else if (o.preferred) nm.append(el('em', 'op', 'Yêu thích'));
    const meta = el('div', 'ometa'); meta.append(el('span', 'olv', o.level));
    if (o.rating) meta.append(el('span', '', `★${o.rating}`));
    if (o.sold != null) meta.append(el('span', '', `Đã bán ${o.sold >= 1000 ? (o.sold / 1000).toFixed(o.sold >= 10000 ? 0 : 1).replace('.', ',') + 'k' : o.sold}`));
    if (withTitle && o.title) { const tt = el('div', 'otitle', o.title); tt.title = o.title; mid.append(tt); }
    mid.append(nm, meta);
    if (o.sim) mid.append(el('div', 'osame', `✓ Cùng sản phẩm${o.sim ? ' ' + Math.round(o.sim * 100) + '%' : ''}`));
    let tg = null; if (o.tags.length) { tg = el('div', 'otags'); o.tags.forEach(t => tg.append(el('span', 'ot ' + t, OPT_TAG[t]))); }
    const right = el('div', 'oright');
    right.append(el('b', 'opr', vnd(o.price))); if (save > 0) right.append(el('span', 'osave', `rẻ hơn ${kShort(save)}`));
    const btns = el('div', 'obtns');
    const sh = el('button', 'oshield', '🛡️'); sh.title = 'Xem kiểm tra shop này'; sh.setAttribute('aria-label', 'Xem kiểm tra ' + (o.shopName || 'shop này'));
    const go = el('button', 'b ogo', 'Xem'); go.addEventListener('click', () => openDeal(o.url));
    btns.append(sh, go); right.append(btns);
    row.append(lead, mid, right); if (tg) row.append(tg);
    // bấm 🛡️: mở bản kiểm tra gọn ngay dưới
    const det = el('div', 'odet'); det.hidden = true;
    if (o.reasons && o.reasons.length) o.reasons.forEach(x => { const r = el('div', 'tli ' + x.s); r.append(el('i', '', x.s === 'ok' ? '✓' : x.s === 'warn' ? '!' : '✕'), el('span', '', x.t)); det.append(r); });
    else det.append(el('div', 'tnote2', 'Chưa đọc được đủ thông tin shop này.'));
    (o.issues || []).forEach(i => { const q = el('div', 'oiss'); q.append(el('b', '', `💬 ${i.label} (${i.n})`)); if (i.quote) q.append(el('span', '', `“${i.quote}”`)); det.append(q); });
    row.append(det);
    sh.addEventListener('click', () => { det.hidden = !det.hidden; sh.classList.toggle('on', !det.hidden); });
    return row;
  }
  function renderCheaper(L, p) { renderCheaper0(L, p); if (isTikTokItem()) renderShopeeAlt(L, p); relatedPicks(L, p.title, HT.ttId(location.href)); }
  // 🛍️ Món tương tự trong danh sách HaoHao tuyển chọn (link TikTok của bạn)
  function relatedPicks(L, text, skipId) {
    const rs = HT.related(text, 2, skipId); if (!rs.length) return;
    L.append(el('div', 'fhead alt', '🛍️ HaoHao tuyển chọn: món tương tự'));
    rs.forEach(x => { const r = el('div', 'rpick'); const t = el('span', '', x.title); t.title = x.title;
      const b = el('button', 'b ogo', 'Xem'); b.addEventListener('click', () => openDeal(x.url));
      let ic = el('i', '', '🛍️');
      if (x.image) { const im = document.createElement('img'); im.src = x.image; im.alt = ''; im.className = 'rimg'; im.referrerPolicy = 'no-referrer'; im.addEventListener('error', () => im.replaceWith(el('i', '', '🛍️'))); ic = im; }
      r.append(ic, t, b); L.append(r); });
  }
  function renderCheaper0(L, p) {
    let st = sameState && sameState.url === p.url ? sameState : null;
    if (!st || (st.error === 'nocards' && isTikTokItem())) { findSame(p, true); st = sameState; }   // đang vẽ bảng: bắt đầu tìm, không vẽ lại lồng nhau
    if (st.loading && quickOf(st)) { L.append(progLine(st)); quickOf(st).forEach(o => L.append(optRow(o, p.price - o.price))); return; }
    if (st.loading) return L.append(waitBox(st, 'Đang tìm các shop bán cùng món…'));
    if (st.error === 'nocards') {
      const box = el('div', 'optwait'); box.append(el('div', '', 'Kéo xuống cuối trang để TikTok tải mục "Bạn cũng có thể thích", rồi bấm Thử lại.'));
      const b = el('button', 'b', '🔄 Thử lại'); b.addEventListener('click', () => findSame(p)); box.append(b);
      return L.append(box);
    }
    if (st.error) return L.append(slowBox(st.error === 'slow' ? 'Shopee phản hồi quá chậm lần này.' : 'Chưa tìm được lần này (Shopee tải chậm hoặc cần đăng nhập).', () => { sameState = null; findSame(p); }, HT.cleanTitle(p.title).split(' ').slice(0, 8).join(' ')));
    if (!st.options.length) return L.append(el('div', 'optwait ok', st.total ? `👍 Giá ở đây đang rẻ nhất trong ${st.total + 1} shop bán cùng món` : 'Chưa thấy shop khác bán đúng sản phẩm này (HaoHao bỏ qua món chỉ na ná).'));
    st.options.forEach(o => L.append(optRow(o, p.price - o.price)));
    L.append(el('div', 'onote', `So trong ${st.total + 1} shop bán đúng cùng sản phẩm (cùng hãng, mã, dung lượng, phiên bản). Giá chưa gồm mã giảm và phí ship.`));
  }

  // ---------- 🎟️ Mã giảm giá ----------
  let couponFeed = null, couponSeen = [];
  const couponNew = () => couponFeed ? couponFeed.coupons.filter(c => HT.couponLive(c) && !couponSeen.includes(c.id)).length : 0;
  async function copyText(t, btn) {
    try { await navigator.clipboard.writeText(t); }
    catch { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    if (btn) { const o = btn.textContent; btn.textContent = 'Đã copy ✓'; setTimeout(() => { if (btn.isConnected) btn.textContent = o; }, 1500); }
  }
  // mã của shop hiện ngay trên trang Shopee đang xem ("Mã Giảm Giá Của Shop: Giảm ₫5k …")
  function pageVouchers() {
    if (!isShopeeItem()) return [];
    const t = (document.body.innerText || '').replace(/\s+/g, ' ');
    const i = t.search(/Mã Giảm Giá (?:Của )?Shop/i);
    return i < 0 ? [] : HT.parseVouchers(t.slice(i, i + 600));
  }
  // Trang đang xem đã được mở lại qua link HaoHao chưa (để khỏi chuyển trang lần nữa)
  const itemKey = () => { const m = location.pathname.match(/-i\.(\d+\.\d+)|\/product\/(\d+\/\d+)|\/product\/(\d+)|\/pdp\/[^/]*?(\d{8,})/); return m ? (m[1] || m[2] || 'tt' + (m[3] || m[4])) : location.pathname; };
  // Link TikTok của bạn chuyển sang tên miền khác (shop.tiktok.com) nên sessionStorage không theo sang:
  // ghi tạm vào chrome.storage để trang đích biết "đã qua link HaoHao" (khỏi chuyển lần nữa) và tự mở bảng
  function markJump(sub) { if (isTikTokItem()) chrome.storage.local.set({ hhJump: { key: itemKey(), sub, at: Date.now() } }).catch(() => {}); }
  function viaHaoHao() { if (HT.hasOurAff(location.href)) return true; try { return sessionStorage.getItem('hh-aff') === itemKey(); } catch { return false; } }
  // Khách tự bấm lấy mã: copy mã rồi mở lại đúng món này qua link tiếp thị (chỉ khi có mã thật cho món này)
  async function useCoupon(p, code) {
    if (code) await copyText(code);
    if (viaHaoHao() || !HT.isAff(p.url)) return say(code ? `Đã copy mã ${code}. Dán ở bước thanh toán nhé.` : 'Bấm "Lưu" mã trên trang rồi đặt hàng nhé.', 'happy', '🎟️ Mã giảm giá', 'shop');
    try { sessionStorage.setItem('hh-aff', itemKey()); } catch {}
    markJump('');
    goAff(p.url);
  }
  function renderCoupons(L, p) {
    const shopHere = p ? HT.shopOf(p.url) : (isShopeeShop() ? 'shopee' : '');
    const price = p && p.price;
    const newN = couponNew();
    const hd = el('div', 'gh cphd', `🎟️ Mã giảm giá${newN ? ` · ${newN} mã mới` : ''}`); L.append(hd);

    // 1) mã của shop ngay trên trang
    const pv = pageVouchers();
    if (pv.length) {
      const box = el('div', 'cbox here');
      box.append(el('div', 'ct', '🏷️ Mã của shop trên trang này'));
      const chips = el('div', 'cchips');
      let best = 0, bestC = null;
      for (const c of pv) {
        const v = HT.couponValue(c, price);
        if (v != null && v > best) { best = v; bestC = c; }
        chips.append(el('span', 'cchip' + (v == null ? ' off' : ''), HT.couponLabel(c)));
      }
      box.append(chips);
      if (best) box.append(el('div', 'cbest', `Giá sau mã tốt nhất ≈ ${vnd(price - best)} (${HT.couponLabel(bestC)})`));
      else if (price) box.append(el('div', 'cnote', 'Món này chưa đủ đơn tối thiểu của các mã trên. Mua kèm thêm để dùng được mã.'));
      box.append(el('div', 'cnote', 'Bấm "Lưu" mã ngay trên trang Shopee, mã tự áp khi thanh toán.'));
      L.append(box);
    }

    const list = (couponFeed ? couponFeed.coupons : []).filter(c => HT.couponLive(c));

    // Trên trang sản phẩm Shopee: 1 nút mua với mã tốt nhất, mở lại đúng món này qua link tiếp thị (chỉ khi khách tự bấm)
    if (p && shopHere === 'shopee' && isShopeeItem()) {
      let best = null;
      for (const c of pv) { const v = HT.couponValue(c, price); if (v && (!best || v > best.v)) best = { c, v, page: true }; }
      for (const c of list.filter(x => x.shop === 'shopee')) { const v = HT.couponValue(c, price); if (v && (!best || v > best.v)) best = { c, v }; }
      const box = el('div', 'buybox');
      box.append(el('div', 'bt', best ? `🛒 Mua món này chỉ còn ≈ ${vnd(price - best.v)}` : '🛒 Chưa có mã giảm giá cho món này'));
      if (best) box.append(el('div', 'cnote', `Dùng mã: ${best.c.code ? best.c.code + ' · ' : ''}${HT.couponLabel(best.c)}${best.page ? ' (mã của shop, bấm Lưu trên trang)' : ''}`));
      if (best) {
        const b = el('button', 'b buy big2', best.c.code ? '🎟️ Copy mã & mua ngay' : '🎟️ Lấy mã & mua ngay');
        b.addEventListener('click', () => useCoupon(p, best.c.code));
        box.append(b);
      }
      box.append(el('div', 'cnote', '🔗 ' + HT.AFF_NOTE));
      L.append(box);
    }

    // 2) kho mã của HaoHao
    const scored = list.map(c => ({ c, v: shopHere && c.shop === shopHere ? HT.couponValue(c, price) : null }))
      .sort((a, b) => (b.c.shop === shopHere) - (a.c.shop === shopHere) || (b.v || 0) - (a.v || 0) || (couponSeen.includes(a.c.id) - couponSeen.includes(b.c.id)) || new Date(a.c.expires || 8e15) - new Date(b.c.expires || 8e15));
    for (const { c, v } of scored.slice(0, 8)) {
      const card = el('div', 'coupon' + (v ? ' fit' : ''));
      const top = el('div', 'cl1');
      const nm = el('span', 'sh'); nm.append(el('i', 'dot ' + c.shop), document.createTextNode(SHOP_NAME[c.shop] || c.shop)); top.append(nm);
      if (!couponSeen.includes(c.id)) top.append(el('em', 'cnew', 'Mới'));
      if (c.expires) { const d = Math.ceil((new Date(c.expires) - Date.now()) / 86400e3); top.append(el('span', 'cexp' + (d <= 1 ? ' soon' : ''), d <= 1 ? 'Hết hạn hôm nay' : `HSD ${new Date(c.expires).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`)); }
      card.append(top, el('div', 'cti', c.title || HT.couponLabel(c)));
      if (c.title && (c.discount || c.percent)) card.append(el('div', 'cnote', HT.couponLabel(c)));
      if (v) card.append(el('div', 'cfit', `✓ Dùng được cho món này: còn ${vnd(price - v)}`));
      else if (price && shopHere === c.shop && c.minOrder && price < c.minOrder) card.append(el('div', 'cnote', `Cần mua thêm ${vnd(c.minOrder - price)} để dùng mã`));
      if (c.note) card.append(el('div', 'cnote', c.note));
      const acts = el('div', 'cacts');
      if (c.code) {
        const code = el('span', 'ccode', c.code);
        const cp = el('button', 'b ghost', 'Copy mã'); cp.addEventListener('click', () => copyText(c.code, cp));
        acts.append(code, cp);
      }
      const onItem = p && isShopeeItem() && c.shop === 'shopee';
      if (c.url || onItem) {
        const go = el('button', 'b buy', c.code ? 'Dùng ngay' : 'Lấy mã');
        go.addEventListener('click', async () => {
          if (!onItem) { if (c.code) await copyText(c.code); return openDeal(c.url); }
          if (HT.couponValue(c, price) || !c.minOrder) return useCoupon(p, c.code);
          if (c.code) await copyText(c.code);
          say(`Đã copy mã. Món này chưa đủ đơn tối thiểu ${vnd(c.minOrder)}, mua kèm thêm để dùng mã nhé.`, 'happy', '🎟️ Mã giảm giá', 'shop');
        });
        acts.append(go);
      }
      card.append(acts); L.append(card);
    }
    if (!scored.length && !pv.length) L.append(el('div', 'empty', 'Chưa có mã mới trong kho HaoHao. Xem nhanh kho mã của các sàn:'));

    // 3) lối tắt kho mã các sàn
    const hubs = couponFeed && couponFeed.hubs && couponFeed.hubs.length ? couponFeed.hubs : [{ shop: 'shopee', label: 'Kho mã Shopee', url: 'https://shopee.vn/m/ma-giam-gia' }];
    const hb = el('div', 'line hubs');
    hubs.forEach(hh => { const c = el('button', 'chip'); c.append(el('i', 'dot ' + hh.shop), document.createTextNode(' ' + hh.label)); c.addEventListener('click', () => openDeal(hh.url)); hb.append(c); });
    L.append(hb);

    // đã xem thì bỏ số "mới" trên nhánh Mua sắm (để lần sau vẫn thấy nhãn "Mới" trên thẻ)
    if (newN) setTimeout(() => { couponSeen = [...new Set([...couponSeen, ...list.map(c => c.id)])].slice(-400); chrome.storage.local.set({ couponSeen }); updateBadge(); }, 1500);
  }

  // ---------- 🛡️ Kiểm tra sản phẩm & shop trên Shopee ----------
  // Đọc theo chữ hiện trên trang (không theo mã ẩn của Shopee) để ít hỏng khi Shopee đổi giao diện.
  const isShopeeItem = () => /(^|\.)shopee\.vn$/.test(location.hostname) && /-i\.\d+\.\d+|\/product\/\d+\/\d+/.test(location.pathname);
  // trang sản phẩm TikTok Shop trên web (vd tiktok.com/view/product/1729…, shop.tiktok.com/…/pdp/…)
  const isTikTokItem = () => /(^|\.)tiktok\.com$/.test(location.hostname) && /\/(view\/)?product\/\d+|\/pdp\//.test(location.pathname);
  const isItemPage = () => isShopeeItem() || isTikTokItem();
  let trust = null, trustUrl = '', trustLen = 0;
  const NUMK = '([\\d.,]+\\s*(?:k|tr)?\\+?)';
  // Thông tin shop, đọc được cả 2 kiểu Shopee đang dùng:
  //   trang sản phẩm: "Đánh Giá 233,2k Tỉ Lệ Phản Hồi 89% Tham Gia 9 năm trước … Người Theo Dõi 154,2k"
  //   trang shop:     "Người Theo Dõi: 154,2k Đánh Giá: 4.8 (233,2k Đánh Giá) Tỉ Lệ Phản Hồi Chat: 89% (Trong Vài Giờ) Tham Gia: 9 Năm Trước"
  function readShopStats(t) {
    const m = (re, i = 1) => { const x = t.match(re); return x ? x[i] : null; }, o = {};
    const rr = m(/(?:T[ỉỷ] Lệ Phản Hồi(?: Chat)?|Response rate)\s*:?\s*(\d{1,3})\s*%/i); if (rr) o.responseRate = +rr;
    const rt = m(/Tỉ Lệ Phản Hồi(?: Chat)?\s*:?\s*\d{1,3}\s*%\s*\((trong [^)]{2,20})\)/i) || m(/Thời Gian Phản Hồi\s*:?\s*(trong (?:vài )?(?:phút|giờ|ngày)(?: lát)?)/i);
    o.responseTime = rt ? rt.toLowerCase() : '';
    const jg = m(/Tham Gia\s*:?\s*(\d+\s*(?:năm|tháng|tuần|ngày|giờ)\s*trước)/i); if (jg) o.joinedMonths = HT.monthsAgo(jg);
    const fl = m(new RegExp('Người Theo Dõi\\s*:?\\s*' + NUMK, 'i')); if (fl) o.followers = HT.num(fl);
    const sp = t.match(new RegExp('Đánh Giá\\s*:\\s*(\\d[.,]\\d)\\s*\\(\\s*' + NUMK + '\\s*Đánh Giá\\s*\\)', 'i'));
    if (sp) { o.shopStar = parseFloat(sp[1].replace(',', '.')); o.shopRatings = HT.num(sp[2]); }
    else { const sr = m(new RegExp('Đánh Giá\\s*:?\\s*' + NUMK + '\\s*(?:Tỉ Lệ Phản Hồi|Tham Gia|Sản Phẩm|Người Theo Dõi)', 'i')); if (sr) o.shopRatings = HT.num(sr); }
    return o;
  }
  // trang shop (vd shopee.vn/ten_shop): có "Người Theo Dõi:" và "Tham Gia:" ở đầu trang
  const isShopeeShop = () => /(^|\.)shopee\.vn$/.test(location.hostname) && !isShopeeItem() && /^\/[\w.-]+\/?$/.test(location.pathname)
    && /Người Theo Dõi\s*:/i.test(document.body.innerText.slice(0, 4000)) && /Tham Gia\s*:/i.test(document.body.innerText.slice(0, 4000));
  function readShopeeShop() {
    const raw = document.body.innerText || '', t = raw.replace(/\s+/g, ' ');
    const info = { shopOnly: true, ...readShopStats(t) };
    const hi = t.search(/Sản Phẩm\s*:/i), near = hi > 0 ? t.slice(Math.max(0, hi - 500), hi) : '';
    info.preferred = /Yêu thích\+?/i.test(near);
    info.mall = /\bMall\b/.test(near) || !!document.querySelector('img[alt*="mall" i]');
    const nm = (document.querySelector('h1') || {}).innerText; info.shopName = nm ? nm.trim().slice(0, 60) : '';
    return info;
  }
  // ---------- Đọc toàn bộ đánh giá ----------
  // 1) lấy thẳng danh sách đánh giá từ Shopee (như trang Shopee tự tải khi lật trang đánh giá)
  // 2) không được thì nhờ background mở tab ẩn, bấm lọc 1★/2★/3★ và lật từng trang để đọc
  const fullRev = new Map();
  const findChip = re => [...document.querySelectorAll('div,button,span,a,li')].filter(e => re.test((e.textContent || '').trim()) && (e.textContent || '').trim().length < 24).sort((a, b) => a.textContent.length - b.textContent.length)[0];
  async function reviewsViaApi() {
    const m = location.pathname.match(/-i\.(\d+)\.(\d+)|\/product\/(\d+)\/(\d+)/); if (!m) return null;
    const shop = m[1] || m[3], item = m[2] || m[4];
    const get = async (type, offset) => {
      const r = await fetch(`/api/v2/item/get_ratings?exclude_filter=1&filter=0&flag=1&itemid=${item}&limit=50&offset=${offset}&shopid=${shop}&type=${type}`,
        { credentials: 'include', headers: { 'x-api-source': 'pc', 'x-shopee-language': 'vi', 'x-requested-with': 'XMLHttpRequest' } });
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json(); if (j.error) throw new Error('err ' + j.error);
      return ((j.data || {}).ratings || []).map(x => ({ t: String(x.comment || '').replace(/\s+/g, ' ').trim(), star: +x.rating_star || 0 }));
    };
    const out = [];
    for (const [type, max] of [[1, 300], [2, 300], [3, 150], [0, 100]]) {
      for (let off = 0; off < max; off += 50) { const b = await get(type, off); out.push(...b.filter(x => x.t)); if (b.length < 50) break; await wait(200); }
    }
    return out;
  }
  async function loadAllReviews() {
    if (!isShopeeItem() || settings.shopTrust === false) return;
    const key = itemKey(); if (fullRev.has(key)) return;
    fullRev.set(key, { state: 'loading', items: [] }); analyzeShopee(false, true);
    let items = null;
    try { items = await reviewsViaApi(); } catch { items = null; }
    if (!items || !items.length) {
      const r = await chrome.runtime.sendMessage({ type: 'reviews-scan', url: cleanUrl(location.href), key }).catch(() => null);
      items = r && r.items;
    }
    fullRev.set(key, items && items.length ? { state: 'done', items } : { state: 'fail', items: [] });
    if (itemKey() === key) analyzeShopee(false, true);
  }
  // Chạy trong tab ẩn: bấm lọc 1★, 2★, 3★ (và Tất Cả) rồi lật từng trang đánh giá
  async function runReviewScan() {
    const out = [];
    for (let t0 = Date.now(); Date.now() - t0 < 15000 && !/ĐÁNH GIÁ SẢN PHẨM/i.test(document.body.innerText); ) { window.scrollBy(0, 1200); await wait(800); }
    const readPage = star => {
      const lines = (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
      const ri = lines.findIndex(l => /^ĐÁNH GIÁ SẢN PHẨM$/i.test(l));
      if (ri >= 0) for (const t of reviewTexts(lines.slice(ri + 1))) out.push({ t, star });
    };
    // nút sang trang: nút số ngay sau trang đang chọn, hoặc nút mũi tên phải trong phần đánh giá
    const nextBtn = () => {
      const head = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^ĐÁNH GIÁ SẢN PHẨM$/i.test((e.textContent || '').trim()));
      const btns = [...document.querySelectorAll('button')].filter(b => !head || (head.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
      const cur = btns.find(b => /^\d+$/.test(b.textContent.trim()) && (/active|solid|current|primary/i.test(b.className) || b.getAttribute('aria-current')));
      if (cur) { const nx = btns.find(b => b.textContent.trim() === String(+cur.textContent.trim() + 1)); if (nx) return nx; }
      return btns.find(b => /(right|next)/i.test(b.className + ' ' + (b.getAttribute('aria-label') || '')) && !b.disabled) || null;
    };
    for (const [n, pages] of [[1, 40], [2, 40], [3, 8], [0, 2]]) {
      const c = n ? findChip(new RegExp('^' + n + ' Sao\\s*\\((?!0\\))', 'i')) : findChip(/^(Tất Cả|All)$/i);
      if (!c) continue;
      c.click(); await wait(1400);
      let last = '';
      for (let pg = 0; pg < pages; pg++) {
        readPage(n || 0);
        const b = nextBtn(); if (!b) break;
        const sig = out.length + ':' + (out[out.length - 1] || {}).t;
        b.click(); await wait(900);
        if (sig === last) break; last = sig;
      }
    }
    // bỏ trùng (1 trang có thể bị đọc 2 lần khi lật trang)
    const uniq = [...new Map(out.map(x => [x.star + '|' + x.t, x])).values()];
    chrome.runtime.sendMessage({ type: 'scan-result', result: uniq.slice(0, 1500) }).catch(() => {});
  }

  // Lấy các câu đánh giá từ phần "ĐÁNH GIÁ SẢN PHẨM" (dừng khi sang mục khác của trang)
  const reviewPool = new Map(), lowRead = new Set();
  function reviewTexts(lines) {
    const out = [];
    for (const l of lines.slice(0, 500)) {
      if (/^(CÓ THỂ BẠN CŨNG THÍCH|SẢN PHẨM KHÁC CỦA SHOP|TOP SẢN PHẨM|SẢN PHẨM TƯƠNG TỰ|Xem tất cả|You may also like|More from this shop|Sản phẩm khác|Khám phá thêm sản phẩm|Bạn cũng có thể thích)/i.test(l)) break;
      if (l.length < 4 || l.length > 400) continue;
      if (/^[\d\s›‹<>«»…./|-]+$/.test(l)) continue;
      if (/₫|^Do .{2,40} bán$|^(Mua ngay|Thêm vào giỏ|Phí vận chuyển|Số lượng|Kích cỡ|Màu sắc|Tải ứng dụng|Đăng nhập|Xu Hướng)/i.test(l)) continue;   // chữ của phần mua hàng (TikTok)
      if (/Đã xác minh mua hàng|\*\*|^(Xem thêm|Ảnh từ đánh giá|Xem tất cả ảnh|Sắp xếp theo|Lọc theo|Đề xuất|Có ảnh\/video|Đặt lại bộ lọc|Đang hiển thị)/i.test(l)) continue;             // thanh chuyển trang "1 2 3 … ›"
      if (/\||\d{4}-\d{2}-\d{2}|^Phân loại|Sao\s*\(|^Tất Cả$|Có Bình Luận|Có Hình Ảnh|Trong Nước|Hữu ích|^\d[.,]?\d*\s*(trên 5)?$|^\d+$|trên 5|Phản Hồi Của Người Bán/i.test(l)) continue;
      if (/^[^:]{1,30}:/.test(l)) continue;                 // "Chất liệu: jean", "Màu sắc: xanh"…
      if (!/\s/.test(l) && !/[^\x00-\x7F]/.test(l)) continue; // tên tài khoản kiểu diemhuong_1308
      out.push(l);
    }
    return out;
  }
  // Khách bấm: HaoHao tự bấm bộ lọc "1 Sao", "2 Sao" trên trang để đọc đúng các đánh giá chê, rồi trả về "Tất Cả"
  async function readLowStars() {
    const chip = findChip;
    const key = itemKey(), got = reviewPool.get(key) || [];
    for (const n of [1, 2]) {
      const c = chip(new RegExp('^' + n + ' Sao\\s*\\((?!0\\))', 'i'));
      if (!c) continue;
      c.click(); await wait(1800);
      const lines = (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
      const ri = lines.findIndex(l => /^ĐÁNH GIÁ SẢN PHẨM$/i.test(l));
      if (ri >= 0) for (const t of reviewTexts(lines.slice(ri + 1))) got.push({ t, low: true });
    }
    const all = chip(/^Tất Cả$/i); if (all) all.click();
    reviewPool.set(key, got); lowRead.add(key);
    trustUrl = ''; analyzeShopee(true);
    if (tab === 'shop' && ui && !ui.panel.hidden) renderPanel();
  }
  // Trang sản phẩm TikTok Shop (theo bố cục thật):
  //   "4.6★ (2.8K) | 27.0K đã được bán" · "Do BIG3BOY bán" · "4.6 ★ 2750 đánh giá toàn cầu" + 5★ 2178 … 1★ 84
  //   đánh giá nằm sau "Đang hiển thị 2750/2750 đánh giá"; cuối trang có "Khám phá thêm sản phẩm từ …", "Bạn cũng có thể thích"
  function readTikTok() {
    const raw = document.body.innerText || '', t = raw.replace(/\s+/g, ' ');
    const lines = raw.split('\n').map(x => x.trim()).filter(Boolean);
    const info = { platform: 'tiktok' }, K = '([\\d.,]+\\s*[KkMm]?\\+?)';
    for (const sc of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const arr = [].concat((j => j['@graph'] || j)(JSON.parse(sc.textContent)));
        const ar = (arr.find(x => x && x.aggregateRating) || {}).aggregateRating;
        if (ar) { info.rating = parseFloat(ar.ratingValue) || null; info.ratingCount = HT.num(String(ar.ratingCount || ar.reviewCount || '')); }
      } catch {}
    }
    const h = t.match(new RegExp('(\\d[.,]\\d)\\s*★?\\s*\\(\\s*' + K + '\\s*\\)')) || t.match(new RegExp('(\\d[.,]\\d)\\s*(?:/\\s*5)?[\\s★☆|(]*' + K + '\\s*\\)?\\s*(?:lượt\\s*)?(?:đánh giá|reviews?|ratings?)', 'i'));
    if (h) { info.rating = info.rating || parseFloat(h[1].replace(',', '.')); info.ratingCount = info.ratingCount || HT.num(h[2]); }
    const g = t.match(/(\d[.,]\d)\s*★?\s*([\d.,]+)\s*đánh giá toàn cầu/i);
    if (g) { info.rating = info.rating || parseFloat(g[1].replace(',', '.')); info.ratingCount = HT.num(g[2]) || info.ratingCount; }
    const sold = t.match(new RegExp(K + '\\s*đã (?:được )?bán', 'i')) || t.match(new RegExp('(?:Đã bán|sold)\\s*' + K, 'i')) || t.match(new RegExp(K + '\\s*sold', 'i'));
    if (sold) info.sold = HT.num(sold[1]);
    // phân bố sao: sau "đánh giá toàn cầu" là các cặp "5" "2178" … (hoặc "5 sao (1.9K)")
    const dist = {}; let dn = 0;
    const gi = lines.findIndex(l => /đánh giá toàn cầu/i.test(l));
    if (gi >= 0) for (let k = gi + 1; k < Math.min(lines.length, gi + 20); k++) {
      let m = lines[k].match(/^([1-5])\s*★?\s+([\d.,]+\s*[KkMm]?)$/);
      if (!m && /^[1-5]★?$/.test(lines[k]) && /^[\d.,]+\s*[KkMm]?$/.test(lines[k + 1] || '')) m = [0, lines[k][0], lines[k + 1]];
      if (m && dist[m[1]] == null) { dist[m[1]] = HT.num(m[2]); dn++; }
    }
    if (dn < 3) for (const x of t.matchAll(/([1-5])\s*(?:sao|stars?)\s*\(([\d.,]+\s*[KkMm]?)\)/gi)) { dist[x[1]] = HT.num(x[2]); dn++; }
    if (dn >= 3) info.dist = dist;
    const sn = lines.find(l => /^Do\s+.{2,40}\s+bán$/i.test(l)); if (sn) info.shopName = sn.replace(/^Do\s+|\s+bán$/gi, '');
    Object.assign(info, readShopStats(t));
    const hi = h ? t.indexOf(h[0]) : -1, near = hi > 0 ? t.slice(Math.max(0, hi - 400), hi) : '';
    info.mall = /\bMall\b/.test(near);
    const sl = lines.find(l => /^(Gửi từ|Giao từ|Ships from)(?=[\s:]|$)/i.test(l));
    if (sl) { const v = sl.replace(/^(Gửi từ|Giao từ|Ships from)\s*:?\s*/i, '').trim(); const v2 = v || lines[lines.indexOf(sl) + 1] || ''; if (v2.length <= 30) info.shipFrom = v2; }
    // phần đánh giá: sau "Đang hiển thị x/y đánh giá" (hoặc sau tiêu đề đánh giá)
    let ri = lines.findIndex(l => /^Đang hiển thị\s*[\d.,]+\s*\/\s*[\d.,]+\s*đánh giá/i.test(l));
    if (ri < 0) ri = lines.findIndex(l => /^(Đánh giá của khách hàng|Đánh giá sản phẩm|Customer reviews|Product reviews|Reviews)(\s*\(.*\))?$/i.test(l));
    if (ri < 0) ri = gi;
    if (ri >= 0) {
      const pt = HT.fold((detectProduct() || {}).title || '');
      const texts = reviewTexts(lines.slice(ri + 1)).filter(l => !pt || !pt.includes(HT.fold(l).replace(/^xu huong\s*/, ''))), cnt = {};
      for (const l of texts) if (l.length >= 15 && l.split(' ').length >= 4) { const k = HT.fold(l); cnt[k] = (cnt[k] || 0) + 1; }
      info.dupReviews = Math.max(0, ...Object.values(cnt));
      info.reviewsLoaded = true;
      info.reviewsNormal = HT.reviewIssues(texts); info.reviews = HT.reviewIssues(texts); info.goodReview = HT.goodReview(texts);
    }
    const p = detectProduct(); if (p) info.price = p.price;
    return info;
  }
  // Thẻ sản phẩm ở cuối trang TikTok ("Khám phá thêm sản phẩm từ …", "Bạn cũng có thể thích")
  function readTikTokCards() {
    const out = [], seen = new Set();
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,div,span,p')].filter(e => e.children.length === 0 && /^Khám phá thêm sản phẩm từ\s+/i.test((e.textContent || '').trim()));
    for (const a of document.querySelectorAll('a[href*="/product/"], a[href*="/pdp/"]')) {
      const m = a.href.match(/\/product\/(\d+)|\/pdp\/[^?#]*?(\d{8,})/); if (!m) continue;
      const key = 'tt' + (m[1] || m[2]); if (seen.has(key)) continue;
      // thẻ = khung nhỏ nhất chứa đủ chữ nhưng chỉ 1 sản phẩm
      // (ảnh và tên thường là 2 link riêng tới cùng 1 sản phẩm: đếm theo mã sản phẩm)
      const ids = e => new Set([...e.querySelectorAll('a[href*="/product/"], a[href*="/pdp/"]')].map(x => (x.href.match(/\/product\/(\d+)|(\d{8,})/) || [])[0]));
      let card = a;
      for (let up = 0; up < 4 && (card.innerText || '').length < 30 && card.parentElement && ids(card.parentElement).size <= 1; up++) card = card.parentElement;
      const lines = (card.innerText || '').split('\n').map(x => x.trim()).filter(Boolean), flat = lines.join(' ');
      const prices = [...flat.matchAll(/([\d.]{4,})\s*₫|₫\s*([\d.]{4,})/g)].map(x => HT.num(x[1] || x[2])).filter(n => n >= 1000);
      const title = lines.filter(l => l.length > 12 && !/₫|đã (?:được )?bán|^-?\d+%/.test(l)).sort((x, y) => y.length - x.length)[0];
      if (!prices.length || !title) continue;
      seen.add(key);
      let shopName = '';
      for (const hd of heads) { const sec = hd.closest('section') || (hd.parentElement && hd.parentElement.parentElement); if (sec && sec.contains(a)) { shopName = hd.textContent.trim().replace(/^Khám phá thêm sản phẩm từ\s+/i, ''); break; } }
      const sold = HT.num((flat.match(/([\d.,]+\s*[KkMm]?\+?)\s*đã (?:được )?bán/i) || [])[1]);
      const rt = (flat.match(/(?:^|\s)(\d[.,]\d)(?=\s|$)/) || [])[1];
      out.push({ key, url: a.href.split('?')[0], image: cardImg(card), title: title.replace(/^(Xu Hướng|Deal|Mall)\s*/i, ''), price: Math.min(...prices),
        sold: isNaN(sold) ? null : sold, rating: rt ? parseFloat(rt.replace(',', '.')) : null, shopName, mall: /(^|\s)Mall(\s|$)/.test(flat) });
    }
    return out;
  }
  function readShopee() {
    const raw = document.body.innerText || '';
    const t = raw.replace(/\s+/g, ' ');
    const lines = raw.split('\n').map(x => x.trim()).filter(Boolean);
    const m = (re, i = 1) => { const x = t.match(re); return x ? x[i] : null; };
    const info = {};
    // dòng đầu sản phẩm: "4.8 16,1k Đánh Giá Đã Bán 60k+"
    const head = t.match(new RegExp('(\\d[.,]\\d)[\\s★☆]+' + NUMK + '\\s*Đánh Giá', 'i'));
    if (head) { info.rating = parseFloat(head[1].replace(',', '.')); info.ratingCount = HT.num(head[2]); }
    info.sold = HT.num(m(new RegExp('Đã Bán\\s*' + NUMK, 'i')));
    // JSON-LD (nếu có) bổ sung khi chưa đọc được
    for (const sc of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const arr = [].concat((j => j['@graph'] || j)(JSON.parse(sc.textContent)));
        const ar = (arr.find(x => x && x.aggregateRating) || {}).aggregateRating;
        if (ar) { info.rating = info.rating || parseFloat(ar.ratingValue); info.ratingCount = info.ratingCount || HT.num(String(ar.ratingCount || ar.reviewCount || '')); }
      } catch {}
    }
    // nhãn Mall / Yêu thích nằm ngay trước tên sản phẩm
    const hi = head ? t.indexOf(head[0]) : -1, near = hi > 0 ? t.slice(Math.max(0, hi - 400), hi) : '';
    info.preferred = /Yêu thích\+?/i.test(near);
    info.mall = /\bMall\b/.test(near) || !!document.querySelector('h1 img[alt*="mall" i], [class*="official" i] img[alt*="mall" i]');
    // phần đánh giá: "5 Sao (15,2k) … Có Hình Ảnh / Video (3,2k)"
    const dist = {}; let dn = 0;
    for (const x of t.matchAll(/([1-5]) Sao\s*\(([\d.,]+\s*(?:k|tr)?)\)/gi)) { dist[x[1]] = HT.num(x[2]); dn++; }
    if (dn >= 3) info.dist = dist;
    info.photos = HT.num(m(/Có Hình Ảnh\s*\/\s*Video\s*\(([\d.,]+\s*(?:k|tr)?)\)/i));
    const avg = m(/(\d[.,]\d)\s*trên\s*5/i); if (avg && !info.rating) info.rating = parseFloat(avg.replace(',', '.'));
    if (!info.ratingCount && info.dist) info.ratingCount = Object.values(dist).reduce((a, b) => a + b, 0);
    Object.assign(info, readShopStats(t));
    // chi tiết sản phẩm: "Gửi từ" → dòng sau
    const gi = lines.findIndex(l => /^Gửi từ$/i.test(l));
    info.shipFrom = gi >= 0 ? lines[gi + 1] : (m(/Gửi từ\s*(Nước ngoài|[A-ZĐ][\p{L}. ]{2,25}?)(?=\s[A-ZĐ][\p{L}]+\s|$)/iu) || '');
    if (info.shipFrom && info.shipFrom.length > 30) info.shipFrom = '';
    // phần đánh giá: đọc từng câu đánh giá (bỏ tên người, ngày, "Chất liệu: …", nút lọc…)
    const ri = lines.findIndex(l => /^ĐÁNH GIÁ SẢN PHẨM$/i.test(l));
    if (ri >= 0) {
      const texts = reviewTexts(lines.slice(ri + 1)), cnt = {};
      for (const l of texts) if (l.length >= 15 && l.split(' ').length >= 4) { const k = HT.fold(l); cnt[k] = (cnt[k] || 0) + 1; }
      info.dupReviews = Math.max(0, ...Object.values(cnt));
      info.reviewsLoaded = true;
      const pool = reviewPool.get(itemKey()) || [];
      info.reviewsNormal = HT.reviewIssues(texts);
      info.reviews = HT.reviewIssues([...texts, ...pool]);
      info.goodReview = HT.goodReview(texts);
      info.lowRead = lowRead.has(itemKey());
    }
    const fr = fullRev.get(itemKey());
    if (fr && fr.state === 'done') {
      info.reviews = HT.reviewIssues(fr.items.map(x => ({ t: x.t, low: x.star > 0 && x.star <= 2 })));
      info.fullRead = { read: info.reviews.read, low: fr.items.filter(x => x.star > 0 && x.star <= 2).length, expect: info.dist ? (info.dist[1] || 0) + (info.dist[2] || 0) : 0 };
      info.fullRead.lowLabel = info.fullRead.expect && info.fullRead.low < info.fullRead.expect * 0.95 ? `${info.fullRead.low}/${info.fullRead.expect}` : `toàn bộ ${info.fullRead.low}`;
      info.goodReview = HT.goodReview(fr.items.filter(x => x.star === 5 || x.star === 0).map(x => x.t)) || info.goodReview;
      info.reviewsNormal = null; info.reviewsLoaded = true;
    } else if (fr && fr.state === 'loading') info.reviewsReading = true;
    const p = detectProduct(); if (p) info.price = p.price;
    return info;
  }
  function analyzeShopee(inRender, force) {
    const item = isItemPage(), shopPage = !item && isShopeeShop();
    if (settings.shopTrust === false || (!item && !shopPage)) { if (trust) { trust = null; trustPill(); } return; }
    const len = (document.body.textContent || '').length;
    if (!force && trustUrl === location.href && Math.abs(len - trustLen) < 200) return;
    const info = isTikTokItem() ? readTikTok() : item ? readShopee() : readShopeeShop();
    if (item ? (!info.rating && !info.ratingCount && !info.sold) : (info.joinedMonths == null && info.followers == null)) return;   // trang chưa tải xong
    const first = trustUrl !== location.href;
    trustUrl = location.href; trustLen = len;
    trust = { ...HT.trustScore(info), info };
    trustPill();
    if (!inRender && tab === 'shop' && ui && !ui.panel.hidden && !(ui.root.activeElement && /INPUT/.test(ui.root.activeElement.tagName))) renderPanel();
    if (first && !inRender) {
      let pend = ''; try { pend = sessionStorage.getItem('hh-open'); } catch {}
      const [pk, psub] = (pend || '').split('|');
      if (pk && pk === itemKey()) { try { sessionStorage.removeItem('hh-open'); } catch {} shopSub = psub === 'cheaper' ? 'cheaper' : 'check'; openTab('shop'); }
      else showTrustBubble();
      autoFindSame();
      setTimeout(loadAllReviews, 1200);
    } else if (!inRender && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
    else if (force && !inRender && ui.bubble.hidden && ui.panel.hidden && trustClosed !== location.href) showTrustBubble();
  }
  // Mở sản phẩm Shopee: HaoHao chủ động hỏi để khách biết có kiểm tra chất lượng + mã giảm giá
  function bestCouponFor(p) {
    if (!p || !p.price) return null;
    let best = null;
    for (const c of pageVouchers()) { const v = HT.couponValue(c, p.price); if (v && (!best || v > best.v)) best = { c, v }; }
    for (const c of (couponFeed ? couponFeed.coupons : []).filter(x => x.shop === (isTikTokItem() ? 'tiktok' : 'shopee') && HT.couponLive(x))) { const v = HT.couponValue(c, p.price); if (v && (!best || v > best.v)) best = { c, v }; }
    return best;
  }
  // Bong bóng kết quả kiểm tra: nằm yên trên trang Shopee, chỉ tắt khi khách bấm ✕
  let trustClosed = '';
  const goAff = url => location.assign(HT.aff(url));
  const trustTarget = () => { const p = detectProduct(); return p ? p.url : cleanUrl(location.href); };
  // Bấm "Xem kiểm tra": mở lại trang qua link tiếp thị (nếu chưa), rồi tự mở bảng kiểm tra
  function goCheck(sub = 'check') {
    const url = trustTarget();
    if (!viaHaoHao() && HT.isAff(url)) {
      try { sessionStorage.setItem('hh-aff', itemKey()); sessionStorage.setItem('hh-open', itemKey() + '|' + sub); } catch {}
      markJump(sub);
      return goAff(url);
    }
    ui.bubble.hidden = true; shopSub = sub; openTab('shop');
  }
  function showTrustBubble() {
    if (!trust || !ui || !ui.panel.hidden || menuOpen || trustClosed === location.href) return;
    if (settings.shopAsk === false && trust.score >= 60) return;
    const bad = trust.score < 60, shopOnly = !!trust.info.shopOnly;
    const all = [...trust.shop, ...trust.product];
    const pick = (bad ? all.filter(x => x.s === 'bad').concat(all.filter(x => x.s === 'warn')) : all.filter(x => x.s === 'ok')).slice(0, 2);
    const B = ui.bubble;
    B.innerHTML = ''; B.dataset.tab = 'shop'; B.dataset.kind = 'trust'; B.classList.add('tb'); B.style.setProperty('--k', { good: '#1E9E6F', ok: '#2E7DD7', warn: '#E08A00', bad: '#E0344B' }[trust.cls]);
    const top = el('div', 'tb-top');
    const lv = el('div', 'tb-lv', trust.level); lv.append(el('small', '', shopOnly ? 'HaoHao đã kiểm tra shop này' : 'HaoHao đã kiểm tra món này'));
    const x = el('button', 'tb-x', '✕'); x.title = 'Ẩn trên trang này'; x.setAttribute('aria-label', 'Ẩn');
    x.addEventListener('click', e => { e.stopPropagation(); trustClosed = location.href; B.hidden = true; });
    top.append(el('span', 'tb-sc', trust.score), lv, x); B.append(top);
    // dòng đánh giá nổi bật: có lời chê thì hiện ngay; không thì 1 đánh giá khen tiêu biểu
    const rv = trust.info.reviews, quote = (q, w) => {
      const d = el('span', 'tb-q'); const i = w ? q.toLowerCase().indexOf(w) : -1;
      if (i >= 0) d.append('“' + q.slice(0, i), el('mark', '', q.slice(i, i + w.length)), q.slice(i + w.length) + '”'); else d.append('“' + q + '”');
      return d;
    };
    if (rv && rv.issues.length) {
      const fr = trust.info.fullRead;
      const box = el('div', 'tb-rv bad'); box.append(el('b', '', fr ? `💬 Người mua chê · ${rv.bad} đánh giá` : `💬 Người mua chê (${rv.bad}/${rv.read} đánh giá)`));
      if (fr) box.append(el('small', 'tb-rs', `Đã đọc ${fr.read} đánh giá, gồm ${fr.lowLabel} đánh giá 1–2★`));
      // tối đa 2 câu chê khác nhau, đủ ý (bỏ mẩu quá ngắn như "Thất vọng" nếu có câu khác rõ hơn)
      const pairs = [];
      for (const it of rv.issues) for (const q of it.quotes) if (!pairs.some(x => x.q === q)) pairs.push({ it, q });
      const pick2 = [...pairs.filter(x => x.q.length >= 12), ...pairs.filter(x => x.q.length < 12)].slice(0, 2);
      let lastLabel = '';
      for (const { it, q: full } of pick2) {
        const q = full.slice(0, 90), row = el('div', 'tb-rl');
        if (it.label !== lastLabel) row.append(el('em', '', `${it.label} (${it.n})`));
        lastLabel = it.label;
        row.append(quote(q, (it.words || []).find(w => q.toLowerCase().includes(w))));
        box.append(row);
      }
      B.append(box);
    } else if (trust.info.reviewsReading) B.append(el('div', 'tb-hook wait', '💬 Đang đọc toàn bộ đánh giá…'));
    else if (bad && pick.length) B.append(el('div', 'tb-why', pick.map(i => '⚠ ' + i.t.split(':')[0]).join(' · ')));
    else if (trust.info.goodReview) {
      const box = el('div', 'tb-rv good'); box.append(el('b', '', `💬 Đánh giá nổi bật · ${rv ? rv.read : 0} đánh giá không thấy lời chê`), quote(trust.info.goodReview));
      B.append(box);
    } else if (pick.length) B.append(el('div', 'tb-why', pick.map(i => (i.s === 'ok' ? '✓ ' : '⚠ ') + i.t.split(':')[0]).join(' · ')));
    const p = shopOnly ? null : detectProduct(), best = p && bestCouponFor(p);
    if (best) B.append(el('div', 'tb-cp', `🎟️ Có mã: còn ≈ ${vnd(p.price - best.v)}`));
    // câu mời từ kết quả tự so giá
    const st = p && sameState && sameState.url === p.url ? sameState : null;
    let hookSave = 0;
    // trang TikTok: món rẻ hơn trên Shopee (điểm tin cậy từ 60 trở lên)
    function altBest(p) { const a = isTikTokItem() && shopeeState && shopeeState.url === p.url && !shopeeState.loading && shopeeState.options; if (!a) return null; return [...a].filter(x => x.score >= 60 && x.price < p.price).sort((x, y) => x.price - y.price)[0] || null; }
    const so = st && !st.error ? (st.loading ? quickOf(st) : st.options && st.options.length ? st.options : null) : null;
    if (st && st.loading && !so && !altBest(p)) B.append(el('div', 'tb-hook wait', '🔍 Đang so giá với các shop khác…'));
    else if (so || altBest(p)) {
      const o0 = so ? so.find(x => x.tags.includes('best')) || so[0] : null, oa = altBest(p);
      const o = oa && (!o0 || oa.price < o0.price) ? oa : o0;
      hookSave = p.price - o.price;
      const hk = el('button', 'tb-hook hot');
      hk.append(el('b', '', o.plat === 'shopee' ? `🟠 Shopee bán rẻ hơn ${kShort(hookSave)}` : `🔥 Có shop bán rẻ hơn ${kShort(hookSave)}`), el('span', '', `${o.shopName || (o.plat !== 'shopee' && isTikTokItem() ? 'Shop khác trên TikTok' : 'Shop trên Shopee')} · ${o.level} ${o.score}/100`));
      hk.addEventListener('click', e => { e.stopPropagation(); goCheck('cheaper'); });
      B.append(hk);
    } else if (st && !st.error && st.total) B.append(el('div', 'tb-hook ok', `👍 Giá này đang rẻ nhất trong ${st.total + 1} shop`));
    // 2 nút giống 2 tab trong bảng Mua sắm
    const acts = el('div', 'tb-acts');
    const go = el('button', 'tb-go', bad ? '⚠ Kiểm tra' : '🛡️ Kiểm tra');
    go.addEventListener('click', e => { e.stopPropagation(); goCheck('check'); });
    acts.append(go);
    if (p && p.price && isItemPage()) { const go2 = el('button', 'tb-go tb-go2' + (hookSave ? ' pulse' : ''), hookSave ? `🔥 Rẻ hơn ${kShort(hookSave)}` : '🔍 Tìm shop rẻ hơn'); go2.addEventListener('click', e => { e.stopPropagation(); goCheck('cheaper'); }); acts.append(go2); }
    B.append(acts);
    if (!viaHaoHao() && HT.isAff(trustTarget())) B.append(el('div', 'tb-aff', 'Mở qua link tiếp thị của HaoHao'));
    B.hidden = false; clearTimeout(bubbleTimer);
  }
  function trustPill() {
    if (!ui) return;
    let pl = ui.root.querySelector('.trust-pill');
    if (!trust) { if (pl) pl.hidden = true; return; }
    if (!pl) {
      pl = el('button', 'trust-pill'); pl.addEventListener('click', () => openTab('shop'));
      ui.wrap.append(pl);
    }
    pl.hidden = false; pl.className = 'trust-pill ' + trust.cls;
    pl.textContent = `🛡️ ${trust.score}`; pl.title = `Kiểm tra sản phẩm & shop: ${trust.score}/100 · ${trust.level}. Bấm để xem`;
  }
  function trustCard() {
    const c = el('div', 'tcard ' + trust.cls);
    const top = el('div', 'ttop');
    const shopOnly = !!trust.info.shopOnly;
    const ring = el('div', 'tring'); ring.style.setProperty('--v', trust.score); ring.append(el('b', trust.score >= 100 ? 'k3' : '', trust.score));
    const tx = el('div'); tx.append(el('div', 'tlv', trust.level), el('div', 'tsub', shopOnly ? `Điểm uy tín shop${trust.info.shopName ? ' · ' + trust.info.shopName : ''}` : 'Điểm tin cậy sản phẩm & shop'));
    top.append(ring, tx); c.append(top);
    const sec = (title, list) => {
      if (!list.length) return;
      c.append(el('div', 'tsec', title));
      for (const x of list) { const r = el('div', 'tli ' + x.s); r.append(el('i', '', x.s === 'ok' ? '✓' : x.s === 'warn' ? '!' : '✕'), el('span', '', x.t)); c.append(r); }
    };
    sec('📦 Chất lượng sản phẩm', trust.product);
    if (!shopOnly && !trust.info.reviewsLoaded) c.append(el('div', 'tnote', '👇 Kéo xuống phần Đánh giá sản phẩm để HaoHao đọc thêm (tỉ lệ sao, đánh giá có ảnh, đánh giá ảo).'));
    if (!shopOnly && (trust.info.reviews || trust.info.reviewsReading)) {
      if (!trust.info.reviews) { c.append(el('div', 'tsec', '💬 Người mua chê gì'), el('div', 'tnote2', '⏳ Đang đọc toàn bộ đánh giá…')); } else {
      const rv = trust.info.reviews;
      c.append(el('div', 'tsec', '💬 Người mua chê gì'));
      if (!rv.issues.length) c.append(el('div', 'tnote2', `Chưa thấy lời chê trong ${rv.read} đánh giá HaoHao đọc được.`));
      for (const it of rv.issues) {
        const box = el('div', 'rvi');
        const hd = el('div', 'rvh'); hd.append(el('b', '', it.label), el('span', 'rvn', `${it.n} đánh giá`)); box.append(hd);
        for (const q of it.quotes) {
          const qd = el('div', 'rvq');
          // tô đậm đúng chữ chê trong câu trích
          const w = (it.words || []).find(x => q.toLowerCase().includes(x));
          if (w) { const i = q.toLowerCase().indexOf(w); qd.append('“' + q.slice(0, i), el('mark', '', q.slice(i, i + w.length)), q.slice(i + w.length) + '”'); }
          else qd.append('“' + q + '”');
          box.append(qd);
        }
        c.append(box);
      }
      const n1 = rv.read, fr = trust.info.fullRead;
      c.append(el('div', 'tnote2', fr ? `HaoHao đã đọc ${fr.read} đánh giá, gồm ${fr.lowLabel} đánh giá 1–2★.` : trust.info.reviewsReading ? '⏳ Đang đọc toàn bộ đánh giá…' : `HaoHao đọc ${n1} đánh giá${trust.info.lowRead ? ' (gồm các đánh giá 1–2★)' : ' đang hiện trên trang'}.`));
      if (!fr && !trust.info.reviewsReading && !trust.info.lowRead && trust.info.platform !== 'tiktok') {
        const b = el('button', 'b ghost tgo', '🔎 Đọc thêm đánh giá 1–2★');
        b.addEventListener('click', async () => { b.disabled = true; b.textContent = '⏳ Đang đọc đánh giá 1–2★…'; await readLowStars(); });
        c.append(b);
      }
    } }
    sec('🏪 Uy tín shop', trust.shop);
    if (trust.info.platform !== 'tiktok' && trust.info.responseRate == null && trust.info.joinedMonths == null) c.append(el('div', 'tnote', '👇 Kéo xuống phần thông tin shop để HaoHao chấm uy tín shop.'));
    if (!shopOnly && trust.score < 60 && detectProduct()) {
      const b = el('button', 'b buy tgo', '🔍 Tìm shop khác uy tín hơn');
      b.addEventListener('click', () => { shopSub = 'cheaper'; renderPanel(); });
      c.append(b);
    }
    c.append(el('div', 'tnote', 'Đánh giá tham khảo, dựa trên thông tin công khai trên trang.'));
    return c;
  }

  // ---------- 🧰 Tiện ích ----------
  const TOOL_RENDER = { crypto: V => renderCrypto(V), adblock: V => renderAdblock(V) };
  // ---------- 🛡️ Chặn quảng cáo ----------
  const adCount = () => new Promise(res => {
    const on = e => { window.removeEventListener('hh-ad-count-reply', on); res(e.detail || { n: 0 }); };
    window.addEventListener('hh-ad-count-reply', on); window.dispatchEvent(new Event('hh-ad-count'));
    setTimeout(() => { window.removeEventListener('hh-ad-count-reply', on); res({ n: 0 }); }, 300);
  });
  const saveSet = patch => chrome.storage.local.get('settings').then(({ settings: s0 = {} }) => chrome.storage.local.set({ settings: { ...s0, ...patch } }));
  function renderAdblock(V) {
    const on = settings.adBlock !== false, allow = settings.adAllow || [], here = HOST, offHere = allow.includes(here);
    const exempt = /(^|\.)(shopee\.vn|tiktok\.com|collshp\.com)$/.test(here);
    const L = el('div', 'body-list adb');
    const sw = el('button', 'adsw' + (on ? ' on' : '')); sw.setAttribute('aria-pressed', on);
    sw.append(el('span', 'knob'), el('b', '', on ? 'Chặn quảng cáo: Đang bật' : 'Chặn quảng cáo: Đang tắt'));
    sw.addEventListener('click', () => saveSet({ adBlock: !on }));
    L.append(sw);
    if (on && here) {
      const row = el('div', 'adsite');
      row.append(el('span', '', exempt ? `${here}: không chặn (trang mua sắm của HaoHao)` : offHere ? `${here}: đã tắt chặn` : `${here}: đang chặn`));
      if (!exempt) {
        const b = el('button', 'chip', offHere ? 'Bật lại trên trang này' : 'Tắt trên trang này');
        b.addEventListener('click', () => saveSet({ adAllow: offHere ? allow.filter(x => x !== here) : [...allow, here] }));
        row.append(b);
      }
      L.append(row);
      const cnt = el('div', 'adcnt', '…'); L.append(cnt);
      adCount().then(r => { cnt.textContent = !r.on ? 'Tải lại trang (F5) để áp dụng' : r.yt ? `YouTube: đã bỏ qua ${r.skipped || 0} quảng cáo video, ẩn ${r.n} ô quảng cáo` : r.n ? `Đã ẩn ${r.n} khung quảng cáo trên trang này` : 'Trang này không còn khung quảng cáo nào'; });
    }
    L.append(el('div', 'foot', 'Chặn tận gốc các mạng quảng cáo (Google Ads, Taboola, Admicro…) và ẩn khung quảng cáo còn sót. YouTube: tự bỏ qua quảng cáo video và ẩn ô quảng cáo. Trang nào bị lỗi thì bấm "Tắt trên trang này". Bật/tắt xong nên tải lại trang (F5).'));
    V.append(L);
  }
  function renderTools(V) {
    const cur = TOOLS.find(t => t.id === toolsSub);
    if (cur) {
      // đang dùng 1 tiện ích: chỉ hiện tiện ích đó, thanh đầu gọn 1 dòng
      const bar = el('div', 'tool-bar');
      const back = el('button', 'tb-back', '‹ Tiện ích'); back.title = 'Về danh sách tiện ích';
      back.addEventListener('click', () => { toolsSub = null; renderPanel(); });
      bar.append(back, el('span', 'tb-name', `${cur.emoji} ${cur.label}`));
      V.append(bar);
      TOOL_RENDER[cur.id](V);
      return;
    }
    const g = el('div', 'tools-grid');
    TOOLS.forEach(t => {
      const b = el('button', 'tool'); b.style.setProperty('--c', t.color);
      const ti = el('span', 'ti'); ti.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg>`;
      const tx = el('div'); tx.append(el('b', '', t.label), el('span', 'td', t.desc)); b.append(ti, tx);
      b.addEventListener('click', () => { toolsSub = t.id; if (t.id === 'crypto') loadQuotes(); renderPanel(); });
      g.append(b);
    });
    V.append(g);
    const cp = el('a', 'copyr', HT.COPYRIGHT); cp.href = HT.OWNER.tel; cp.title = 'Liên hệ ' + HT.OWNER.name;
    V.append(cp);
  }


  // ---------- nhánh Crypto ----------
  const qKey = it => it.source === 'dexscreener' ? 'dx:' + it.coin.trim() : 'cg:' + it.coin.trim().toLowerCase();
  const fmt = p => { if (p == null || isNaN(p)) return '?'; p = +p; if (p === 0) return '0'; if (Math.abs(p) < 0.01) return p.toPrecision(4); return p.toLocaleString('en-US', { maximumFractionDigits: 2 }); };
  async function loadQuotes() {
    const items = [...watch, ...rules.filter(r => r.type === 'price' && r.coin).map(r => ({ source: r.source, coin: r.coin }))];
    if (!items.length) return;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'get-quotes', items });
      if (res) { quotes = { ...quotes, ...res }; if (tab === 'tools') renderPanel(); }
    } catch {}
  }
  let cryAlertOpen = false;
  // tên hiển thị: ký hiệu (BTC) thay cho mã CoinGecko (bitcoin)
  const coinSym = (w, q) => w.source === 'dexscreener' ? (q && q.label && !q.error ? String(q.label).toUpperCase() : w.coin.slice(0, 6) + '…') : (w.sym || HT.cgSymOf(w.coin) || String(w.coin).toUpperCase());
  function renderCrypto(V) {
    // thêm coin: 1 dòng gọn
    const form = h(`<div class="row cry-add">
        <select aria-label="Nguồn giá"><option value="coingecko">Ký hiệu</option><option value="dexscreener">Địa chỉ token</option></select>
        <input class="grow" placeholder="BTC, ETH, SOL, BNB…" aria-label="Ký hiệu coin hoặc địa chỉ token" autocapitalize="characters">
        <button class="b" aria-label="Theo dõi">＋</button></div>`);
    const src = form.querySelector('select'), inp = form.querySelector('input');
    src.addEventListener('change', () => inp.placeholder = src.value === 'dexscreener' ? 'Dán địa chỉ token meme…' : 'BTC, ETH, SOL, BNB…');
    const add = async () => {
      let coin = inp.value.trim(); if (!coin) return inp.focus();
      let sym = '';
      if (src.value === 'coingecko') {
        // ký hiệu (BTC) → mã CoinGecko (bitcoin); coin lạ thì tra CoinGecko
        inp.disabled = true;
        const r = await chrome.runtime.sendMessage({ type: 'cg-resolve', q: coin }).catch(() => null);
        inp.disabled = false;
        if (!r || !r.ok) { inp.focus(); err.hidden = false; err.textContent = r && r.error === 'notfound' ? `Không tìm thấy coin "${coin}". Thử ký hiệu khác (vd: BTC, ETH).` : 'Chưa tra được CoinGecko, thử lại sau.'; return; }
        coin = r.id; sym = r.sym;
      }
      const it = { source: src.value, coin, ...(sym ? { sym } : {}) };
      if (!watch.some(w => qKey(w) === qKey(it))) { watch.push(it); chrome.storage.local.set({ watch }); }
      inp.value = ''; loadQuotes(); renderPanel();
    };
    form.querySelector('button').addEventListener('click', add);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    inp.addEventListener('input', () => { err.hidden = true; });
    const err = el('div', 'cry-err'); err.hidden = true; err.setAttribute('role', 'alert');
    V.append(form, err);

    const list = el('div', 'body-list');
    const ab = alertBlock('tools'); if (ab) list.append(ab);
    if (!watch.length) list.append(el('div', 'empty', 'Nhập ký hiệu coin (vd: BTC, ETH, SOL) hoặc dán địa chỉ token meme để theo dõi giá.'));
    for (const w of watch) {
      const q = quotes[qKey(w)];
      const row = el('div', 'cry');
      const sym = el('span', 'sym', coinSym(w, q));
      sym.title = w.source === 'dexscreener' ? 'DexScreener · ' + w.coin : 'CoinGecko · ' + w.coin;
      row.append(sym);
      if (q && !q.error) {
        row.append(el('span', 'px', '$' + fmt(q.price)));
        row.append(el('span', 'ch ' + (q.change >= 0 ? 'up' : 'down'), (q.change >= 0 ? '▲ ' : '▼ ') + Math.abs(Number(q.change)).toFixed(1) + '%'));
      } else row.append(el('span', 'err2', q ? q.error : 'đang lấy giá…'));
      const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Bỏ theo dõi');
      del.addEventListener('click', () => { watch = watch.filter(x => x !== w); chrome.storage.local.set({ watch }); renderPanel(); });
      row.append(del); list.append(row);
    }

    // cảnh báo giá: thu gọn thành 1 dòng, bấm mới mở
    const pr = rules.filter(r => r.type === 'price');
    const on = pr.filter(r => r.enabled).length;
    const hd = el('button', 'cry-hd', `🔔 Cảnh báo giá · ${on}/${pr.length} đang bật ${cryAlertOpen ? '▴' : '▾'}`);
    hd.setAttribute('aria-expanded', cryAlertOpen);
    hd.addEventListener('click', () => { cryAlertOpen = !cryAlertOpen; renderPanel(); });
    list.append(hd);
    if (cryAlertOpen) {
      for (const r of pr) {
        const row = el('label', 'rule');
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = r.enabled;
        cb.addEventListener('change', () => { r.enabled = cb.checked; chrome.storage.local.set({ rules }); });
        const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Xoá cảnh báo');
        del.addEventListener('click', ev => { ev.preventDefault(); rules = rules.filter(x => x !== r); chrome.storage.local.set({ rules }); renderPanel(); });
        row.append(cb, el('span', '', r.name), del);
        list.append(row);
      }
      if (watch.length) {
        const f2 = h(`<div class="row cry-add" style="padding:6px 0;border:0">
            <select aria-label="Coin">${watch.map((w, i) => `<option value="${i}">${escAttr(coinSym(w, quotes[qKey(w)]))}</option>`).join('')}</select>
            <select aria-label="Điều kiện"><option value="above">giá ≥</option><option value="below">giá ≤</option><option value="up">tăng ≥ %</option><option value="down">giảm ≥ %</option></select>
            <input type="number" step="any" placeholder="mốc" style="width:84px" aria-label="Mốc">
            <button class="b">Đặt</button></div>`);
        const [cSel, oSel] = f2.querySelectorAll('select'), v = f2.querySelector('input');
        f2.querySelector('button').addEventListener('click', () => {
          if (v.value === '') return v.focus();
          const w = watch[+cSel.value], op = oSel.value, val = Number(v.value);
          const label = { above: '≥ $', below: '≤ $', up: 'tăng ≥ ', down: 'giảm ≥ ' }[op];
          const name = `${coinSym(w, quotes[qKey(w)])} ${label}${op === 'up' || op === 'down' ? val + '%' : fmt(val)}`;
          rules.push({ id: 'r' + Date.now().toString(36), type: 'price', name, enabled: true, source: w.source, coin: w.coin, op, value: val });
          chrome.storage.local.set({ rules }); say('Đã đặt cảnh báo: ' + name, 'happy', '', 'tools');
        });
        list.append(f2);
      }
    }
    list.append(el('div', 'foot', 'Giá cập nhật mỗi phút · CoinGecko / DexScreener'));
    V.append(list);
  }


  const onOpen = msg => {
    if (msg.type !== 'hh-open' || !ui) return;
    if (msg.search) { findRange = ''; findMall = false; openTab('shop'); doFind(msg.search); return; }
    if (msg.sub === 'dich' && msg.text) return translateText(msg.text, 'sel');
    if (msg.sub === 'dich') { infoSub = 'dich'; openTab('info'); return; }
    if (msg.sub === 'explain') return doExplain(msg.text);
    if (msg.sub === 'read') { infoSub = 'read'; openTab('info'); if (msg.run && (settings.ai || {}).key) doSummary(false); return; }
    openTab(msg.tab);
  };
  chrome.runtime.onMessage.addListener(onOpen);
  // Tab mới của HaoHao (trang của chính tiện ích): nút nhanh mở mục bằng sự kiện trên trang
  if (location.protocol === 'chrome-extension:') window.addEventListener('hh-open', e => onOpen({ type: 'hh-open', ...(e.detail || {}) }));

  // ---------- nhận tin từ background ----------
  chrome.runtime.onMessage.addListener(async msg => {
    if (msg.type !== 'shop-hit' || !active()) return;
    const { products: ps = [] } = await chrome.storage.local.get('products'); products = ps;
    const it = products.find(x => x.id === msg.id); if (!it) return;
    shopAlert = true; updateBadge(); chime();
    say(`${it.title.slice(0, 60)} còn ${vnd(it.price)}`, 'alert', '🛒 GIẢM GIÁ RỒI!', 'shop', buyActs(it));
  });
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type !== 'ht-alert' || !active()) return;
    const t = msg.kind === 'price' ? 'tools' : (msg.kind === 'reminder' || msg.kind === 'mail') ? 'bell' : msg.kind === 'pomo' ? 'focus' : 'todo';
    if (msg.kind === 'pomo') {
      alerts.unshift({ title: msg.title, text: msg.text, tab: 'focus' }); alerts = alerts.slice(0, 10); chime();
      const acts = msg.next ? [{ label: '▶ Vào phiên tiếp', fn: () => pomoSend('pomo-start', {}) }, { label: 'Để sau', ghost: true, fn: () => {} }]
        : msg.end ? [{ label: '✅ Hoàn thành việc', fn: () => pomoSend('pomo-done', { task: msg.task }) }, { label: '▶ Làm tiếp', ghost: true, fn: () => pomoSend('pomo-start', {}) }, { label: '☕ Nghỉ', ghost: true, fn: () => {} }]
        : [{ label: 'Ok ✓', fn: () => {} }];
      say(msg.text, 'remind', '🍅 Pomodoro', 'focus', acts);
      renderPanel(); return;
    }
    alerts.unshift({ title: msg.title, text: msg.text, tab: t });
    alerts = alerts.slice(0, 10);
    if (msg.kind === 'mail') {
      chime();
      say(msg.text, 'alert', msg.title, t, [
        { label: 'Mở mail', fn: () => chrome.runtime.sendMessage({ type: 'open-mail', url: msg.url }).catch(() => {}) },
        { label: 'Đã xem ✓', ghost: true, fn: () => {} }
      ]);
    } else if (t === 'bell' && msg.ruleId) {
      chime();
      say(msg.text, 'remind', msg.title, t, [
        ...(msg.url ? [{ label: '🛒 Săn deal', fn: () => { openDeal(msg.url); chrome.runtime.sendMessage({ type: 'rem-done', ruleId: msg.ruleId }).catch(() => {}); } }] : []),
        { label: 'Xong rồi ✓', ...(msg.url ? { ghost: true } : {}), fn: () => chrome.runtime.sendMessage({ type: 'rem-done', ruleId: msg.ruleId }).catch(() => {}) },
        { label: 'Nhắc lại 10 phút', ghost: true, fn: () => { chrome.runtime.sendMessage({ type: 'snooze', ruleId: msg.ruleId, minutes: 10 }).catch(() => {}); say('Được, 10 phút nữa HaoHao nhắc lại nhé.', 'happy', '', 'bell'); } }
      ]);
    } else say(msg.text, msg.mood || 'alert', msg.title, t);
    renderPanel();
  });

  // ---------- Tập trung (Pomodoro) ----------
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  const pomoLeft = () => !pomo ? 0 : pomo.paused ? (pomo.remain || 0) : Math.max(0, pomo.endAt - Date.now());
  const pomoActive = () => pomo && pomo.phase && pomo.phase !== 'idle';
  const pomoToday = () => { const d = new Date(); return pomoStats[`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`] || 0; };
  function pomoPill() {
    if (!ui) return;
    const on = pomoActive();
    ui.pill.hidden = !on;
    if (!on) return;
    ui.pill.className = 'pomo-pill' + (pomo.paused ? ' pz' : pomo.phase !== 'focus' ? ' brk' : '');
    ui.pill.textContent = `${pomo.paused ? '⏸' : pomo.phase === 'focus' ? '🍅' : '☕'} ${mmss(pomoLeft())}`;
    ui.pill.title = pomo.phase === 'focus' ? 'Đang tập trung' + (pomo.task ? ': ' + pomo.task : '') : 'Đang nghỉ';
  }
  setInterval(() => {
    if (!pomoActive()) return;
    pomoPill();
    if (tab === 'focus' && ui && !ui.panel.hidden) {
      const c = ui.view.querySelector('.pomo .clock'), bar = ui.view.querySelector('.pomo .pbar i');
      if (c) c.textContent = mmss(pomoLeft());
      if (bar && pomo.total) bar.style.width = (100 - pomoLeft() / pomo.total * 100) + '%';
    }
  }, 1000);
  function focusNudge() {
    if (!ui || !active() || !pomo || pomo.phase !== 'focus' || pomo.paused) return;
    const cfg = settings.pomo || {};
    if (cfg.nudge === false) return;
    const sites = (cfg.sites ?? DISTRACT).split(/[,\s]+/).map(x => x.trim().replace(/^www\./, '')).filter(Boolean);
    if (!sites.some(x => HOST === x || HOST.endsWith('.' + x))) return;
    if (Date.now() - lastNudge < 4 * 60e3) return;
    lastNudge = Date.now();
    say(`Đang trong giờ tập trung, còn ${mmss(pomoLeft())}${pomo.task ? ` cho "${pomo.task}"` : ''}. Quay lại làm tiếp nhé!`, 'alert', '🍅 Ơ kìa!', 'focus', [
      { label: 'Ok, quay lại', fn: () => {} },
      { label: 'Dừng tập trung', ghost: true, fn: () => chrome.runtime.sendMessage({ type: 'pomo-stop' }).catch(() => {}) }
    ]);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') focusNudge(); });
  const pomoSend = (type, extra) => chrome.runtime.sendMessage({ type, ...(extra || {}) }).catch(() => {});
  function pomoCard() {
    const cfg = { focus: 25, brk: 5, lng: 15, ...(settings.pomo || {}) };
    const saveP = patch => { settings.pomo = { ...(settings.pomo || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    const n = pomoToday();
    const stat = n ? `Hôm nay ${n} phiên ${'🍅'.repeat(Math.min(n, 8))}` : 'Hôm nay chưa có phiên nào';
    const box = el('div', 'pomo' + (pomoActive() && pomo.phase !== 'focus' ? ' brk' : ''));
    if (!pomoActive()) {
      const top = el('div', 'ptop');
      top.append(el('div', 'clock', `${cfg.focus}:00`));
      const info = el('div', 'pinfo'); info.append(el('b', '', '🍅 Pomodoro')); info.append(document.createTextNode(stat));
      top.append(info);
      const go = el('button', 'b', '▶ Bắt đầu'); go.addEventListener('click', () => pomoSend('pomo-start', { task: '' }));
      const gear = el('button', 'ic2', '⚙'); gear.title = 'Tuỳ chỉnh giờ nghỉ, trang xao nhãng'; gear.setAttribute('aria-label', 'Tuỳ chỉnh Pomodoro');
      gear.addEventListener('click', () => { pomoCfgOpen = !pomoCfgOpen; renderPanel(); });
      top.append(go, gear); box.append(top);
      const line = el('div', 'line'); line.style.marginTop = '8px';
      [25, 45, 60].forEach(m => {
        const c = el('button', 'chip' + (Number(cfg.focus) === m ? ' on' : ''), m + ' phút');
        c.addEventListener('click', () => saveP({ focus: m }));
        line.append(c);
      });
      box.append(line);
      if (pomoCfgOpen) {
        const f = h(`<div class="fm" style="padding:8px 0 0;gap:8px">
            <div class="line">Nghỉ ngắn <input type="number" min="1" max="30" style="width:56px"> phút · nghỉ dài <input type="number" min="5" max="60" style="width:56px"> phút sau mỗi 4 phiên</div>
            <label class="snd"><input type="checkbox"> Hết giờ nghỉ thì tự vào phiên mới</label>
            <label class="snd"><input type="checkbox"> Nhắc khi lỡ mở trang gây xao nhãng</label>
            <label><span class="lb">Các trang gây xao nhãng</span><input style="width:100%"></label></div>`);
        const [b1, b2, c1, c2, st] = f.querySelectorAll('input');
        b1.value = cfg.brk; b2.value = cfg.lng; c1.checked = !!cfg.autoNext; c2.checked = cfg.nudge !== false; st.value = cfg.sites ?? DISTRACT;
        b1.addEventListener('change', () => saveP({ brk: Math.max(1, Number(b1.value) || 5) }));
        b2.addEventListener('change', () => saveP({ lng: Math.max(5, Number(b2.value) || 15) }));
        c1.addEventListener('change', () => saveP({ autoNext: c1.checked }));
        c2.addEventListener('change', () => saveP({ nudge: c2.checked }));
        st.addEventListener('change', () => saveP({ sites: st.value }));
        box.append(f);
      }
      return box;
    }
    const focus = pomo.phase === 'focus';
    const total = (focus ? (pomo.focusMin || cfg.focus) : pomo.phase === 'long' ? cfg.lng : cfg.brk) * 60000;
    pomo.total = total;
    const top = el('div', 'ptop');
    top.append(el('div', 'clock', mmss(pomoLeft())));
    const info = el('div', 'pinfo');
    info.append(el('b', '', focus ? (pomo.task ? '🍅 ' + pomo.task : '🍅 Đang tập trung') : pomo.phase === 'long' ? '☕ Nghỉ dài' : '☕ Nghỉ giải lao'));
    info.append(document.createTextNode(pomo.paused ? 'Đang tạm dừng' : focus ? `Phiên ${(pomo.round || 0) + 1} · ${stat}` : 'Đứng dậy, uống nước, cho mắt nghỉ'));
    top.append(info); box.append(top);
    box.append(h(`<div class="pbar"><i style="width:${Math.min(100, 100 - pomoLeft() / total * 100)}%"></i></div>`));
    const line = el('div', 'line');
    if (pomo.paused) { const b = el('button', 'b', '▶ Tiếp tục'); b.addEventListener('click', () => pomoSend('pomo-resume')); line.append(b); }
    else { const b = el('button', 'b ghost', '⏸ Tạm dừng'); b.addEventListener('click', () => pomoSend('pomo-pause')); line.append(b); }
    if (!focus) { const sk = el('button', 'b ghost', 'Bỏ qua nghỉ'); sk.addEventListener('click', () => pomoSend('pomo-skip')); line.append(sk); }
    const stp = el('button', 'b ghost', '⏹ Dừng'); stp.addEventListener('click', () => pomoSend('pomo-stop')); line.append(stp);
    box.append(line);
    return box;
  }

  // ---------- lời chào + việc đang chờ ----------
  async function greet() {
    if (!ui || !active() || settings.greet === false || !ui.panel.hidden || menuOpen || trust) return;
    const { greetAt = 0 } = await chrome.storage.local.get('greetAt');
    const now = Date.now();
    const pend = todos.filter(t => !t.done);
    const late = pend.filter(t => t.due && new Date(t.due).getTime() <= now);
    const soon = pend.filter(t => t.due && new Date(t.due).getTime() > now && new Date(t.due).getTime() - now <= 3600e3);
    const urgent = late.length || soon.length;
    // chào tối đa 3 tiếng/lần; nếu có việc gấp thì nhắc lại sau mỗi 30 phút
    if (now - greetAt < 3 * 3600e3 && !(urgent && now - greetAt > 30 * 60e3)) return;
    await chrome.storage.local.set({ greetAt: now });
    const hr = new Date().getHours();
    const hi = hr < 5 ? 'Khuya rồi' : hr < 11 ? 'Chào buổi sáng' : hr < 14 ? 'Chào buổi trưa' : hr < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    let note = '', cls = '';
    if (late.length) { note = `⚠ ${late.length} việc quá hạn chưa xử lý: ${late[0].text}`; cls = 'late'; }
    else if (soon.length) note = `⏰ Sắp tới giờ: ${soon[0].text} (${new Date(soon[0].due).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})` + (soon.length > 1 ? ` và ${soon.length - 1} việc khác` : '');
    else if (pend.length) note = `📝 Bạn có ${pend.length} việc đang chờ trong Todolist`;
    lastBubble = now;
    ui.bubble.innerHTML = ''; ui.bubble.dataset.tab = 'todo'; ui.bubble.dataset.kind = ''; ui.bubble.classList.remove('tb');
    ui.bubble.append(el('span', 't', `Xin chào, tôi là trợ lý HaoHao 👋`));
    ui.bubble.append(document.createTextNode(`${hi}! Bấm vào tôi khi cần nhé.`));
    if (note) { const n = el('span', 'note ' + cls, note); if (note.length > 90) n.textContent = note.slice(0, 88) + '…'; ui.bubble.append(n); }
    ui.bubble.hidden = false; setMood(urgent ? 'alert' : 'happy');
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hideBubble, note ? 12000 : 7000);
  }

  // ---------- khởi động ----------
  async function load() {
    const d = await chrome.storage.local.get(['rules', 'settings', 'todos', 'watch', 'mailStatus', 'msAccount', 'ideas', 'pomo', 'pomoStats', 'products', 'couponFeed', 'couponSeen', 'hhJump']);
    const j = d.hhJump;
    if (j && j.key === itemKey() && Date.now() - j.at < 120e3) {
      try { sessionStorage.setItem('hh-aff', j.key); if (j.sub) sessionStorage.setItem('hh-open', j.key + '|' + j.sub); } catch {}
      chrome.storage.local.remove('hhJump').catch(() => {});
    }
    couponFeed = d.couponFeed || null; couponSeen = d.couponSeen || []; HT.setTikTok(couponFeed && couponFeed.tiktok); HT.setShopee(couponFeed && couponFeed.shopee);
    products = d.products || [];
    pomo = d.pomo || null; pomoStats = d.pomoStats || {};
    ideas = d.ideas || [];
    mailStatus = d.mailStatus || null; msAccount = d.msAccount || '';
    rules = d.rules || []; todos = d.todos || []; watch = d.watch || [];
    settings = { mascotEnabled: true, hiddenSites: [], ...(d.settings || {}) };
    HT.setLang(settings.lang);
  }

  chrome.storage.onChanged.addListener(async (ch, area) => {
    if (area !== 'local') return;
    if ((ch.couponFeed || ch.couponSeen) && !(ch.rules || ch.settings || ch.todos || ch.watch)) {
      if (ch.couponFeed) { couponFeed = ch.couponFeed.newValue || null; HT.setTikTok(couponFeed && couponFeed.tiktok); HT.setShopee(couponFeed && couponFeed.shopee); }
      if (ch.couponSeen) couponSeen = ch.couponSeen.newValue || [];
      updateBadge();
      if (ch.couponFeed && tab === 'shop' && ui && !ui.panel.hidden) renderPanel();
      return;
    }
    if ((ch.pomo || ch.pomoStats) && !(ch.rules || ch.settings || ch.todos || ch.watch)) {
      const was = pomo && pomo.phase;
      if (ch.pomo) pomo = ch.pomo.newValue || null;
      if (ch.pomoStats) pomoStats = ch.pomoStats.newValue || {};
      pomoPill();
      if ((tab === 'focus' || tab === 'todo') && ui && !ui.panel.hidden) renderPanel();
      if (pomo && pomo.phase === 'focus' && was !== 'focus') setTimeout(focusNudge, 800);
      return;
    }
    if (ch.ideas && !(ch.rules || ch.settings || ch.todos || ch.watch)) {
      ideas = ch.ideas.newValue || [];
      const typing = ui && ui.root.activeElement && /INPUT|TEXTAREA/.test(ui.root.activeElement.tagName);
      if (tab === 'idea' && !typing) renderPanel();
      return;
    }
    if ((ch.mailStatus || ch.msAccount) && !(ch.rules || ch.settings || ch.todos || ch.watch)) {
      if (ch.mailStatus) mailStatus = ch.mailStatus.newValue;
      if (ch.msAccount) msAccount = ch.msAccount.newValue || '';
      const typing = ui && ui.root.activeElement && /INPUT|SELECT/.test(ui.root.activeElement.tagName);
      if (tab === 'bell' && !bellEdit && !typing) renderPanel();
      return;
    }
    if (!(ch.rules || ch.settings || ch.todos || ch.watch)) return;
    const wasActive = active();
    const onlyPos = ch.settings && !ch.rules &&
      JSON.stringify({ ...ch.settings.newValue, pos: 0 }) === JSON.stringify({ ...(ch.settings.oldValue || {}), pos: 0 });
    const langWas = HT.lang;
    await load();
    if (!active()) { destroyUI(); return; }
    if (!ui) { buildUI(); return; }
    if (HT.lang !== langWas) { destroyUI(); buildUI(); return; }   // đổi ngôn ngữ: vẽ lại toàn bộ
    if (onlyPos) { placeWrap(); return; }
    if (ch.watch || ch.rules) loadQuotes();
    renderPanel();
  });

  // nhắc việc quá hạn cũng cập nhật số trên nhánh Todolist
  setInterval(updateBadge, 60000);

  load().then(async () => {
    if (/(^|\.)shopee\.vn$/.test(location.hostname)) {
      const r = await chrome.runtime.sendMessage({ type: 'scan-me' }).catch(() => null);
      if (r && r.scan === 'search') return runScan();
      if (r && r.scan === 'item') return runItemScan();
      if (r && r.scan === 'reviews') return runReviewScan();
    }
    if (!active()) return;
    buildUI();
    setTimeout(greet, 1500);
    setTimeout(focusNudge, 2000);
    setTimeout(trackPrice, 3000);
    let lastHref = location.href;
    setInterval(() => {
      if (!ui) return;
      if (location.href !== lastHref) {
        lastHref = location.href; trust = null; trustPill(); if (ui.bubble.dataset.kind === 'trust') ui.bubble.hidden = true;
        setTimeout(trackPrice, 2500);
        if (tab === 'shop' && !ui.panel.hidden) setTimeout(renderPanel, 2600);
      }
      if (document.visibilityState === 'visible') analyzeShopee();
    }, 2500);
  });
  // có việc sắp tới giờ trong lúc đang mở trang thì cũng nhắc nhẹ
  setInterval(() => { if (document.visibilityState === 'visible') greet(); }, 5 * 60e3);
})();
