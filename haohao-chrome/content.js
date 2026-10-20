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
  let ocrState = null, ocrMenu = false, miniMode = false;
  let pomo = null, pomoStats = {}, pomoCfgOpen = false, lastNudge = 0, musicYt = null, musAddOpen = false, musEdit = false;
  let explainState = null, products = [], shopAlert = false, dueEditId = null, editId = null;
  const DISTRACT = 'facebook.com, tiktok.com, youtube.com, x.com, instagram.com, reddit.com';
  const pageTr = { map: new Map(), tr: new Map(), skip: new WeakSet(), running: false, stop: false, done: 0, total: 0, lang: '', src: '', showing: 'tr', error: '', bar: false, obs: null, engine: '', note: '' };
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
    { id: 'market', label: 'Thị trường', color: '#D98E1F', angle: -20,
      menuIcon: '<path d="M3.5 3.5v17h17" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="12" width="3.4" height="6" rx="1" fill="#fff"/><rect x="12" y="8.5" width="3.4" height="9.5" rx="1" fill="#fff"/><rect x="17" y="5" width="3.4" height="13" rx="1" fill="#fff"/>',
      icon: '<path d="M4 4v16h16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="12" width="3" height="5" rx="1" fill="currentColor"/><rect x="12" y="9" width="3" height="8" rx="1" fill="currentColor"/><rect x="17" y="6" width="3" height="11" rx="1" fill="currentColor"/>' },
    { id: 'shop', label: 'Mua sắm', color: '#EC4A68', angle: -15,
      menuIcon: '<path d="M8.6 8.4V6.9a3.4 3.4 0 016.8 0v1.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/><path fill="#fff" d="M5 7.6h14l-.9 12.1a1.9 1.9 0 01-1.9 1.8H7.8a1.9 1.9 0 01-1.9-1.8z"/><circle cx="9" cy="10.6" r="1" style="fill:var(--c)"/><circle cx="15" cy="10.6" r="1" style="fill:var(--c)"/><path d="M9.3 16.4h5.4" style="stroke:var(--c)" stroke-width="1.8" stroke-linecap="round"/>',
      icon: '<path d="M5 8h14l-1.2 11.5H6.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/><path d="M9 10V7a3 3 0 016 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>' },
    { id: 'tools', label: 'Tiện ích', color: '#F2A71B', angle: 0,
      menuIcon: '<rect x="3.4" y="3.4" width="7.4" height="8.2" rx="2.2" fill="#fff"/><rect x="13.2" y="3.4" width="7.4" height="10.4" rx="2.2" fill="#fff"/><rect x="3.4" y="14" width="7.4" height="6.6" rx="2.2" fill="#fff"/><rect x="13.2" y="16.2" width="7.4" height="4.4" rx="2.2" fill="#fff"/>',
      icon: '<rect x="4" y="4" width="7" height="7" rx="1.8" stroke="currentColor" stroke-width="2" fill="none"/><rect x="13" y="4" width="7" height="7" rx="1.8" stroke="currentColor" stroke-width="2" fill="none"/><rect x="4" y="13" width="7" height="7" rx="1.8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16.5 13v7M13 16.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' }
  ];
  // Tiện ích con của nhánh 🧰 Tiện ích. Thêm tiện ích mới: thêm 1 dòng ở đây và 1 hàm render.
  const TOOLS = [
    { id: 'crypto', label: 'Thị trường', emoji: '📊', color: '#D98E1F', desc: 'Bật theo dõi giá vàng, chứng khoán, crypto',
      icon: '<path d="M4 4v16h16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="12" width="3" height="5" rx="1" fill="currentColor"/><rect x="12" y="9" width="3" height="8" rx="1" fill="currentColor"/><rect x="17" y="6" width="3" height="11" rx="1" fill="currentColor"/>' },
    { id: 'adblock', label: 'Chặn quảng cáo', emoji: '🛡️', color: '#2E9E6B', desc: 'Ẩn quảng cáo phim, kể cả YouTube',
      icon: '<path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6z" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linejoin="round"/><path d="M8.5 8.5l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' }
  ];
  { const fb = BRANCHES.find(b => b.id === 'focus'), ib = BRANCHES.find(b => b.id === 'info');
    TOOLS.push({ id: 'focus', label: 'Pomodoro', emoji: '🍅', color: fb.color, desc: 'Tập trung, nghỉ giải lao, nhạc nền', icon: fb.icon },
               { id: 'info', label: 'Thông tin', emoji: '💡', color: ib.color, desc: 'Dịch, tóm tắt, giải thích', icon: ib.icon },
               { id: 'transfer', label: 'HaoHao Transfer', emoji: '📲', color: '#2E7DD7', desc: 'Chuyển ảnh, video iPhone ⇄ máy tính',
                 icon: '<rect x="3" y="4" width="7" height="13" rx="1.8" stroke="currentColor" stroke-width="2" fill="none"/><rect x="13" y="7" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 20h8M12 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' }); }
  // 📌 Mục chính cố định 7 nhánh: Nhắc · Todo · Note · [ô 1] · [ô 2] · Mua sắm · Tiện ích.
  //    Chỉ 2 ô giữa đổi được, chọn trong Pomodoro / Thông tin / Thị trường; mục không được chọn nằm trong Tiện ích.
  // V1.64: Góp ý chuyển sang trang Giới thiệu (Cài đặt) – không còn trong Tiện ích
  if (false) TOOLS.push({ id: 'gopy', label: 'Góp ý', emoji: '💬', color: '#7C3AED', desc: 'Gửi mong muốn của bạn cho HaoHao', icon: '<path d="M4 5h16v11H9l-5 4z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M8 9.5h8M8 12.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' });   // V1.8
  const LAYOUT_OPT = ['focus', 'info', 'market', 'adblock', 'transfer'];   // 1.10.253: thêm Chặn quảng cáo, HaoHao Transfer
  for (const id of ['adblock', 'transfer']) { const t = TOOLS.find(x => x.id === id); if (t && !BRANCHES.some(b => b.id === id)) BRANCHES.splice(BRANCHES.findIndex(b => b.id === 'shop'), 0, { id, label: id === 'transfer' ? 'Transfer' : 'Chặn QC', color: t.color, angle: -18, icon: t.icon, menuIcon: t.icon.replace(/currentColor/g, '#fff') }); }
  const slots = () => { const s = settings && settings.slots; return Array.isArray(s) && s.length === 2 && s[0] !== s[1] && s.every(x => LAYOUT_OPT.includes(x)) ? s : ['focus', 'info']; };
  const lay = () => { const S = slots(), o = {}; LAYOUT_OPT.forEach(id => { o[id] = S.includes(id) ? 'out' : 'in'; }); return o; };
  const toolKey = id => id === 'crypto' ? 'market' : id;
  const visBranches = () => ['bell', 'todo', 'idea', ...slots(), 'shop', 'tools'].map(id => BRANCHES.find(b => b.id === id));
  const visTools = () => { const L = lay(); return TOOLS.filter(t => (t.id !== 'unl' || (typeof spyKeys !== 'undefined' && spyKeys && (spyKeys.at || spyKeys.rh))) && (!LAYOUT_OPT.includes(toolKey(t.id)) || L[toolKey(t.id)] === 'in')); };
  const DIST = 244, SAT = 58, C = 38, SUB = 46, SUBD = 92, STAG = 46; // STAG: vòng xen kẽ đẩy ra xa hơn cho nhãn khỏi chồng nhau // khoảng cách nhánh, cỡ vòng tròn nhánh, tâm HaoHao

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
  .wrap { position: fixed; z-index: 2147483647; width: 76px; height: 76px; }
  .pet { all: unset; cursor: grab; width: 76px; height: 76px; display: block; position: relative; touch-action: none; z-index: 3; }
  .storebtn { all: unset; cursor: pointer; position: absolute; left: 50%; top: calc(100% + 6px); transform: translateX(-50%); z-index: 3; white-space: nowrap;
    padding: 6px 12px; border-radius: 999px; background: linear-gradient(135deg, #FF8A3D, #EE4D2D); color: #fff; font: 800 12px/1 "Segoe UI", system-ui, sans-serif; box-shadow: 0 6px 16px rgba(238,77,45,.35); animation: hhpop .25s ease-out; }
  .storebtn[hidden] { display: none; }
  .storebtn:hover { filter: brightness(1.06); } .storebtn:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
  .fy .storebtn { top: auto; bottom: calc(100% + 6px); }
  @keyframes hhpop { from { transform: translateX(-50%) scale(.6); opacity: 0; } }
  .wrap.tired .pet svg { filter: saturate(.55) brightness(.97) drop-shadow(0 4px 6px rgba(35,48,94,.25)); transform: rotate(-8deg) translateY(3px); transition: transform .4s; }
  .wrap.tired .pet::after { content: '💤'; position: absolute; right: -6px; top: -10px; font-size: 18px; animation: hop 1.6s ease-in-out infinite; }
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
  /* 🎵 thanh nhạc mini trên đầu hamster: đang phát nhạc nền + HaoHao rảnh → tạm dừng / tắt ngay tại đây */
  .mus-bar { position: absolute; left: 50%; top: -30px; transform: translateX(-50%); z-index: 4; display: flex; align-items: center; gap: 2px; white-space: nowrap;
    height: 26px; padding: 0 3px 0 8px; border-radius: 999px; background: linear-gradient(135deg, #FF8A6B, #E85D5D); color: #fff; border: 2px solid #fff;
    box-shadow: 0 3px 8px rgba(35,48,94,.25); font: 700 12px/1 "Segoe UI", system-ui, sans-serif; }
  .mus-bar.up { top: -58px; }
  .mus-bar.ar { left: auto; right: -4px; transform: none; } .mus-bar.al { left: -4px; transform: none; }   /* sát mép màn hình: canh theo mép hamster */   /* đang có viên 🍅 Pomodoro thì nằm trên nó */
  .mus-bar.pz { background: #6B7394; }
  .mus-bar[hidden] { display: none; }
  .mus-bar .eq { display: inline-flex; align-items: flex-end; gap: 1.5px; height: 11px; margin-right: 5px; }
  .mus-bar .eq i { width: 2.5px; background: #fff; border-radius: 1px; animation: hheq .9s ease-in-out infinite; }
  .mus-bar .eq i:nth-child(1) { height: 5px; } .mus-bar .eq i:nth-child(2) { height: 11px; animation-delay: -.3s; } .mus-bar .eq i:nth-child(3) { height: 7px; animation-delay: -.6s; }
  .mus-bar.pz .eq i { animation: none; height: 3px; }
  @keyframes hheq { 50% { transform: scaleY(.35); } } .mus-bar .eq i { transform-origin: bottom; }
  .mus-bar .mn { all: unset; cursor: pointer; max-width: 110px; overflow: hidden; text-overflow: ellipsis; padding: 4px 4px 4px 0; }
  .mus-bar .mn:hover { text-decoration: underline; }
  .mus-bar .mb { all: unset; cursor: pointer; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 10.5px; }
  .mus-bar .mb:hover { background: rgba(255,255,255,.25); }
  .mus-bar .mn:focus-visible, .mus-bar .mb:focus-visible { outline: 2px solid #F2B544; outline-offset: 1px; }
  @media (prefers-reduced-motion: reduce) { .mus-bar .eq i { animation: none; } }
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
.pomo-wrap { display: flex; flex-direction: column; padding-top: 6px; }
.pomo.p2 { --pc: #E85D5D; --pc2: #FF8A6B; --pbg: #FFF6F3; margin: 4px 0 8px; padding: 10px 14px 12px; border: 0; border-radius: 20px;
  background: radial-gradient(120% 80% at 50% 0%, #FFFFFF 0%, var(--pbg) 70%); box-shadow: 0 1px 0 rgba(35,48,94,.06), 0 8px 24px -12px rgba(232,93,93,.35); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.pomo.p2.brk { --pc: #2F9E7E; --pc2: #5CC9A7; --pbg: #EFFAF5; box-shadow: 0 1px 0 rgba(35,48,94,.06), 0 8px 24px -12px rgba(47,158,126,.35); }
.pomo.p2.pz { --pc: #6B7394; --pc2: #9AA1BE; }
.p2hd { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.p2tag { font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--pc); background: color-mix(in srgb, var(--pc) 12%, transparent); padding: 4px 10px; border-radius: 999px; }
.p2ic { all: unset; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 15px; color: #3A4470; background: rgba(35,48,94,.06); transition: background .15s; }
.p2ic:hover { background: rgba(35,48,94,.12); } .p2ic:focus-visible { outline: 2px solid #D98E1F; outline-offset: 2px; }
.dial { position: relative; width: 148px; height: 148px; }
.dial .ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.dial .ring circle { fill: none; stroke-width: 9; }
.dial .ring .trk { stroke: color-mix(in srgb, var(--pc) 13%, transparent); }
.dial .ring .arc { stroke: var(--pc); stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
.dial .mid { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.pomo.p2 .clock { font: 800 36px/1 "Segoe UI", system-ui, sans-serif; letter-spacing: -.02em; color: #23305E; min-width: 0; font-variant-numeric: tabular-nums; }
.dial .sub { margin-top: 6px; font-size: 12px; font-weight: 600; color: #6B7394; }
.p2task { max-width: 100%; font-size: 13px; font-weight: 700; color: #23305E; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p2seg { display: flex; padding: 3px; gap: 2px; border-radius: 999px; background: rgba(35,48,94,.07); }
.p2seg button { all: unset; cursor: pointer; padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; color: #5B648A; transition: background .15s, color .15s; }
.p2seg button:hover { color: #23305E; }
.p2seg button.on { background: #fff; color: #23305E; box-shadow: 0 1px 3px rgba(35,48,94,.18); }
.p2seg button:focus-visible { outline: 2px solid #D98E1F; }
.p2ctl { display: flex; align-items: center; gap: 8px; }
.p2go { all: unset; cursor: pointer; padding: 10px 28px; border-radius: 999px; font-size: 14px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--pc2), var(--pc)); box-shadow: 0 6px 16px -6px var(--pc); transition: transform .12s, box-shadow .12s; }
.p2go:hover { transform: translateY(-1px); box-shadow: 0 8px 20px -6px var(--pc); }
.p2go:active { transform: translateY(0); }
.p2go.soft { background: #fff; color: #23305E; box-shadow: inset 0 0 0 1.5px rgba(35,48,94,.18); }
.p2go:focus-visible { outline: 2px solid #D98E1F; outline-offset: 3px; }
.p2stat { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6B7394; }
.p2stat b { color: #23305E; font-weight: 700; }
.p2stat .dots { display: inline-flex; gap: 4px; }
.p2stat .dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(35,48,94,.12); }
.p2stat .dots i.on { background: var(--pc); }
.row .ocrb { all: unset; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 16px; background: #EEF1FA; flex: none; }
.row .ocrb:hover { background: #FFF0C7; } .row .ocrb:focus-visible { outline: 2px solid #D98E1F; }
.ocrm { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; border-bottom: 1px dashed #C9CEDF; }
.ocrm .tip { flex-basis: 100%; font-size: 11.5px; color: #6B7394; line-height: 1.4; }
.ocrbox { margin: 8px 10px; padding: 10px; border-radius: 12px; background: #F3F6FF; border: 1.5px solid #D5DCF2; display: flex; flex-direction: column; gap: 8px; }
.ocrbox .oh { display: flex; align-items: center; gap: 10px; }
.ocrbox .oh img { width: 52px; height: 52px; object-fit: cover; border-radius: 8px; border: 1px solid #D5DCF2; background: #fff; flex: none; }
.ocrbox .ot { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: 12px; color: #6B7394; }
.ocrbox .ot b { font-size: 13.5px; color: #23305E; }
.ocrbox .ox { all: unset; cursor: pointer; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: #6B7394; }
.ocrbox .ox:hover { background: #E3E8F7; }
.ocrbox textarea { width: 100%; box-sizing: border-box; resize: vertical; font-family: inherit; font-size: 13.5px; line-height: 1.5; color: #23305E; border: 1.5px solid #C9CEDF; border-radius: 10px; padding: 8px 10px; background: #fff; outline: none; }
.ocrbox textarea:focus { border-color: #D98E1F; }
.panel.drop { outline: 3px dashed #7C5CFF; outline-offset: -6px; }
.ocrov { position: fixed; inset: 0; z-index: 2147483647; cursor: crosshair; background: rgba(20,26,50,.28); pointer-events: auto; }
.ocrov .rb { position: fixed; display: none; border: 2px solid #F2B544; background: rgba(242,181,68,.12); box-shadow: 0 0 0 9999px rgba(20,26,50,.25); }
.ocrov .otip { position: fixed; left: 50%; top: 18px; transform: translateX(-50%); background: #23305E; color: #fff; padding: 8px 14px; border-radius: 999px; font: 600 13px/1.2 "Segoe UI", system-ui, sans-serif; }
.dstrip { margin: 4px 0 2px; padding: 8px; border-radius: 12px; background: linear-gradient(135deg, #FFF4EC, #FFECEF); }
.dstrip .dhd { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #8A2B1D; }
.dlist { display: flex; flex-direction: column; gap: 4px; }
.dli { all: unset; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 4px 8px 4px 4px; border-radius: 10px; background: #fff; min-width: 0; }
.dli:hover { box-shadow: 0 2px 8px rgba(238,77,45,.2); } .dli:focus-visible { outline: 2px solid #EE4D2D; }
.dli img, .dli .dno { width: 38px; height: 38px; flex: none; border-radius: 8px; object-fit: cover; background: #F5F5F7; display: grid; place-items: center; font-size: 18px; }
.dli .dtx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dli .dt { font-size: 12.5px; color: #23305E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dli .dp { display: flex; align-items: baseline; gap: 5px; font-size: 10.5px; color: #8A91AD; }
.dli .dp b { font-size: 12.5px; color: #EE4D2D; }
.dli .doff { flex: none; padding: 2px 6px; border-radius: 6px; background: #EE4D2D; color: #fff; font-size: 10.5px; font-weight: 800; }
.dstrip .mlink { all: unset; cursor: pointer; font-size: 12px; font-weight: 800; color: #EE4D2D; } .dstrip .mlink:hover { text-decoration: underline; }
.dstrip .drow { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dcard { all: unset; cursor: pointer; position: relative; display: flex; flex-direction: column; gap: 4px; padding: 6px; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(35,48,94,.12); min-width: 0; }
.dcard:hover { box-shadow: 0 4px 12px rgba(238,77,45,.22); } .dcard:focus-visible { outline: 2px solid #EE4D2D; }
.dcard img, .dcard .dno { width: 100%; height: 92px; object-fit: cover; border-radius: 9px; background: #F5F5F7; display: grid; place-items: center; font-size: 24px; }
.dcard .doff { position: absolute; top: 10px; left: 10px; padding: 2px 6px; border-radius: 6px; background: #EE4D2D; color: #fff; font-size: 11px; font-weight: 800; }
.dcard .dt { font-size: 12px; line-height: 1.3; color: #23305E; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dcard .dp { display: flex; align-items: baseline; gap: 5px; flex-wrap: wrap; font-size: 11px; color: #8A91AD; }
.dcard .dp b { font-size: 13.5px; color: #EE4D2D; }
.dstrip .daff { margin-top: 4px; font-size: 10px; color: #8A91AD; text-align: right; }
.tb-buy { all: unset; cursor: pointer; display: block; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 9px 12px; border-radius: 12px; text-align: center; font-size: 13.5px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #FF8A3D, #EE4D2D); box-shadow: 0 6px 14px rgba(238,77,45,.3); }
.tb-buy:hover { filter: brightness(1.05); } .tb-buy:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
.vall { all: unset; cursor: pointer; display: block; text-align: center; margin: 6px 0; padding: 8px 12px; border-radius: 12px; font-size: 13px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #FF8A3D, #EE4D2D); box-shadow: 0 4px 12px rgba(238,77,45,.28); }
.vall:hover { filter: brightness(1.05); } .vall:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
.vprog { margin: 6px 0; } .vprog b { display: block; height: 6px; border-radius: 3px; background: #F1EEF4; overflow: hidden; } .vprog i { display: block; height: 100%; background: #EE4D2D; transition: width .3s; }
.vprog span { font-size: 12px; color: #6B7394; }
.vmsg { margin: 4px 0; padding: 6px 10px; border-radius: 10px; background: #E8F7F1; color: #1F7A5E; font-size: 12px; } .vmsg.warn { background: #FFF4D6; color: #8A5300; }
.vrow { display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin: 4px 0; border-radius: 10px; background: #fff; border: 1px dashed #F6C5BC; }
.vrow.ok { border-style: solid; border-color: #CDEBDD; background: #F6FCF9; }
.vrow .vic { font-size: 18px; flex: none; }
.vrow .vtx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.vrow .vtx b { font-size: 13px; color: #EE4D2D; } .vrow.ok .vtx b { color: #2F9E7E; }
.vrow .vtx small { font-size: 11px; color: #8A91AD; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vrow .vsv { all: unset; cursor: pointer; flex: none; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; color: #EE4D2D; box-shadow: inset 0 0 0 1.5px #EE4D2D; }
.vrow .vsv:hover { background: #FFF1EE; } .vrow .vsv[disabled] { opacity: .4; pointer-events: none; }
.svsec { margin-top: 10px; } .svsh { font-size: 12px; font-weight: 800; color: #6B7394; margin: 2px 2px 4px; }
.vrow.shop { border-style: solid; border-color: #E3E6F0; } .vrow.shop .vtx b { color: #23305E; font-size: 12.5px; }
.vrow .vok { flex: none; font-size: 11.5px; font-weight: 700; color: #2F9E7E; }
.svbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 8px 12px 0; padding: 6px; border-radius: 12px; background: #FFF1EE; }
.svbar .svb { all: unset; cursor: pointer; padding: 7px 12px; border-radius: 999px; font-size: 13px; font-weight: 800; color: #EE4D2D; background: #fff; box-shadow: inset 0 0 0 1.5px #F6C5BC; }
.svbar.on .svb { background: #EE4D2D; color: #fff; box-shadow: none; }
.svbar .svb:focus-visible { outline: 2px solid #D98E1F; }
.tgt { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #6B7394; }
.tgt input { width: 92px; padding: 4px 8px; border-radius: 8px; border: 1.5px solid #C9CEDF; font: inherit; font-size: 12.5px; color: #23305E; background: #fff; outline: none; text-align: right; }
.tgt input:focus { border-color: #EE4D2D; }
.svhd { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 2px 2px; font-size: 12px; color: #6B7394; }
.svhd .mlink { all: unset; cursor: pointer; font-weight: 700; color: #2E7DD7; } .svhd .mlink:hover { text-decoration: underline; }
.svc { display: flex; gap: 10px; padding: 10px; margin: 8px 0; border-radius: 12px; background: #fff; border: 1.5px solid #E3E6F0; }
.svc.hit { border-color: #2F9E7E; background: #F2FBF7; }
.svc > img, .svc .noimg { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; flex: none; background: #F3F4F8; display: grid; place-items: center; font-size: 24px; }
.svm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.svt { all: unset; cursor: pointer; font-size: 13px; font-weight: 700; color: #23305E; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.svt:hover { color: #EE4D2D; }
.svp { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; font-size: 12px; }
.svp b { font-size: 15px; color: #EE4D2D; }
.svp .dn { color: #2F9E7E; font-weight: 800; } .svp .up { color: #9B2C2C; font-weight: 800; } .svp .lo { color: #6B7394; }
.svr { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
.svr .b.sm { padding: 5px 10px; font-size: 12px; }
.svx { all: unset; cursor: pointer; margin-left: auto; font-size: 13px; padding: 4px 6px; border-radius: 8px; opacity: .6; }
.svc.c { display: block; padding: 8px 10px; margin: 6px 0; }
.svl { display: flex; align-items: center; gap: 8px; }
.svc.c .svl > img, .svc.c .svl .noimg { width: 42px; height: 42px; border-radius: 8px; object-fit: cover; flex: none; background: #F3F4F8; display: grid; place-items: center; font-size: 18px; }
.svc.c .svm { gap: 1px; }
.svc.c .svt { -webkit-line-clamp: 1; font-size: 12.5px; }
.svc.c .svp { gap: 2px 4px; flex-wrap: wrap; white-space: nowrap; } .svc.c .svp b { font-size: 14px; }
.svbt { display: flex; gap: 4px; flex: none; align-items: center; } .svbt .b.sm { padding: 5px 9px; font-size: 12px; margin: 0; }
.svd { margin: 8px 0 2px; padding-top: 8px; border-top: 1px dashed #E3E6F0; display: flex; flex-direction: column; gap: 6px; }
.svd .svr { justify-content: space-between; }
.svd .svx { margin-left: 0; font-size: 12px; opacity: .8; }
.svall { all: unset; cursor: pointer; font-weight: 800; font-size: 12.5px; color: #fff; background: #2E7DD7; padding: 6px 12px; border-radius: 999px; }
.svall:hover { background: #2369BA; } .svall:focus-visible { outline: 2px solid #23305E; outline-offset: 2px; }
.c3box { margin: 8px 0; padding: 10px 12px; border-radius: 14px; background: #fff; border: 1.5px solid #9ED9C4; }
.c3box .c3h { font-weight: 800; font-size: 14px; color: #0E7A57; } .c3box .c3n { font-size: 11.5px; color: #6B7394; margin-top: 2px; }
.c3r { border-top: 1px dashed #D8DCEA; padding: 8px 0 6px; } .c3r:first-of-type { border-top: 0; } .c3r.go { cursor: pointer; } .c3r.go:hover .c3t { text-decoration: underline; }
.c3r .c3l { font: 800 11.5px/1.3 "Segoe UI", system-ui, sans-serif; color: #0E7A57; } .c3r .c3t { font-size: 13px; font-weight: 700; line-height: 1.35; color: #23305E; }
.c3r .c3p { display: flex; align-items: center; gap: 6px; margin: 3px 0 1px; } .c3r .c3p b { font-size: 15px; color: #EE4D2D; } .c3r .c3p span { flex: 1; font-weight: 800; font-size: 15px; color: #1F7A60; }
.c3r .c3m { font-size: 11.5px; color: #6B7394; }
.c3box .dln { font-size: 9.5px; line-height: 1.2; color: #A3AAC0; text-align: center; margin-top: 4px; letter-spacing: .1px; }
.c3r .c3go { all: unset; cursor: pointer; background: #23305E; color: #fff; font: 700 12px/1 "Segoe UI", system-ui, sans-serif; padding: 7px 10px; border-radius: 8px; white-space: nowrap; }
.c3r .c3go:hover { background: #2f3f78; } .c3r .c3go:focus-visible { outline: 3px solid #F2B544; outline-offset: 2px; }
.cmpbox { margin: 8px 0; padding: 12px; border-radius: 14px; background: #fff; border: 1.5px solid #E3E6F0; display: flex; flex-direction: column; gap: 8px; }
.cmpbox .cmpt { font-weight: 800; font-size: 14px; color: #23305E; } .cmpbox .cmps { font-size: 12.5px; color: #5B6478; line-height: 1.45; }
.cmplg { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 11.5px; font-weight: 700; } .cmplg .g { color: #1E9E6F; } .cmplg .y { color: #B07800; } .cmplg .r { color: #E0344B; }
.cmpbox .cmpgo { align-self: stretch; text-align: center; padding: 9px; font-size: 14px; margin: 0; background: #EE4D2D; border-color: #EE4D2D; }
.svc.deal { border-color: #2F9E7E; box-shadow: 0 0 0 2px rgba(47,158,126,.15); }
.svdeal { font-size: 11.5px; font-weight: 800; color: #1F7A60; }
.svp s.old, .svp span.old { color: #8A92A6; font-size: 12px; } .svp .eq { color: #6B7394; font-weight: 700; font-size: 11.5px; }
.svag { font-size: 11px; color: #8A92A6; }
.svmsg { font-size: 12px; font-weight: 700; color: #23305E; background: #EEF7F3; border-radius: 8px; padding: 6px 8px; margin: 6px 0 0; }
.svu { all: unset; cursor: pointer; font-size: 13px; padding: 4px 7px; border-radius: 8px; border: 1.5px solid #C9CEDF; background: #fff; }
.svu:hover { border-color: #2E7DD7; background: #EEF5FF; } .svu:focus-visible { outline: 2px solid #2E7DD7; }
.svx:hover { opacity: 1; background: #FDECEC; } .svx[data-sure="1"] { opacity: 1; background: #E85D5D; color: #fff; font-size: 12px; font-weight: 700; }
.trbar { position: fixed; top: 10px; left: 0; right: 0; margin: 0 auto; width: max-content; z-index: 2147483646; pointer-events: auto; display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 24px);
  padding: 7px 8px 7px 12px; border-radius: 999px; background: #23305E; color: #fff; font: 600 13px/1.3 "Segoe UI", system-ui, sans-serif; box-shadow: 0 8px 24px rgba(20,26,50,.35); }
.trbar .tx { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.trbar .eng { font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 999px; background: #2F9E7E; color: #fff; flex: none; }
.trbar .eng.ai { background: #D98E1F; }
.trbar .pg { width: 80px; height: 5px; border-radius: 3px; background: rgba(255,255,255,.2); overflow: hidden; flex: none; }
.trbar .pg i { display: block; height: 100%; background: #F2B544; transition: width .3s; }
.trbar .tb { all: unset; cursor: pointer; flex: none; padding: 5px 11px; border-radius: 999px; background: rgba(255,255,255,.14); font-size: 12.5px; font-weight: 700; }
.trbar .tb:hover { background: rgba(255,255,255,.26); } .trbar .tb:focus-visible { outline: 2px solid #F2B544; }
.trbar .tb.x { width: 26px; height: 26px; padding: 0; display: grid; place-items: center; }
.trbox .lg .eng { margin-left: 8px; font-size: 10.5px; font-weight: 800; padding: 1px 7px; border-radius: 999px; background: #E3F5EE; color: #1F7A5E; vertical-align: 1px; }
.trbox .lg .eng.ai { background: #FFF4D6; color: #8A6400; }
.p2mus { width: 100%; padding-top: 8px; border-top: 1px dashed rgba(35,48,94,.15); display: flex; flex-direction: column; gap: 6px; }
.p2mus .mh { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.p2mus .lb { font-size: 12px; font-weight: 800; color: #23305E; }
.p2mus .mhint { font-size: 11px; color: #6B7394; }
.p2mus .ml { display: flex; flex-wrap: nowrap; gap: 4px; min-width: 0; overflow-x: auto; scrollbar-width: none; padding-bottom: 1px; }
.p2mus .ml::-webkit-scrollbar { display: none; }
.p2mus .ml .mc { flex: none; max-width: 140px; padding: 4px 9px; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p2mus .mc { all: unset; cursor: pointer; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #3A4470; background: rgba(35,48,94,.06); transition: background .15s, color .15s; }
.p2mus .mc:hover { background: rgba(35,48,94,.12); }
.p2mus .mc.on { background: #23305E; color: #fff; }
.p2mus .mc.play::after { content: ""; display: inline-block; width: 6px; height: 6px; margin-left: 6px; border-radius: 50%; background: #7CE0B9; vertical-align: middle; animation: hhpulse 1.2s infinite; }
.p2mus .mc:focus-visible { outline: 2px solid #D98E1F; outline-offset: 2px; }
@keyframes hhpulse { 50% { opacity: .3; } }
.p2mus .lb2 { font-size: 11.5px; font-weight: 700; color: #6B7394; margin-top: 2px; }
.p2mus .mlink { all: unset; cursor: pointer; font-size: 11.5px; font-weight: 700; color: #2E7DD7; }
.p2mus .mlink:hover { text-decoration: underline; } .p2mus .mlink:focus-visible { outline: 2px solid #D98E1F; }
.p2mus .mcw { display: inline-flex; align-items: center; max-width: 100%; }
.p2mus .mc.own { max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p2mus .mc.yt:not(.on) { color: #C4302B; }
.p2mus .mc.feat { max-width: 100%; background: linear-gradient(135deg, #FFF1E6, #FFE3EC); color: #8A2B3D; }
.p2mus .mc.feat:hover { background: linear-gradient(135deg, #FFE6D3, #FFD3E1); }
.p2mus .mc.feat.on { background: linear-gradient(135deg, #FF8A6B, #E85D5D); color: #fff; }
.p2mus .mx { all: unset; cursor: pointer; width: 20px; height: 20px; margin-left: -4px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 800; color: #fff; background: #E85D5D; }
.p2mus .mc.add { background: transparent; box-shadow: inset 0 0 0 1.5px rgba(35,48,94,.25); }
.p2mus .mc.add:hover { box-shadow: inset 0 0 0 1.5px #23305E; }
.p2mus .madd { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 12px; background: rgba(35,48,94,.05); }
.p2mus .madd input { box-sizing: border-box; width: 100%; min-width: 0; padding: 7px 10px; border-radius: 9px; border: 1.5px solid #C9CEDF; font: inherit; font-size: 12.5px; background: #fff; color: #23305E; outline: none; }
.p2mus .madd input:focus { border-color: #D98E1F; }
.p2mus .madd .line { display: flex; gap: 6px; } .p2mus .madd .line input { flex: 1; }
.p2mus .mmsg { font-size: 12px; color: #9B2C2C; } .p2mus .mmsg:empty { display: none; }
.p2mus .mtip { font-size: 11px; color: #6B7394; line-height: 1.4; }
.p2mus .mwarn { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; color: #8A5300; background: #FFF4D6; border-radius: 10px; padding: 6px 10px; }
.p2mus .vr { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.p2mus .vr input { flex: 1; accent-color: var(--pc); }
.p2cfg { width: 100%; padding: 10px 0 0 !important; gap: 8px; border-top: 1px dashed rgba(35,48,94,.15); font-size: 12.5px; }
@media (prefers-reduced-motion: reduce) { .dial .ring .arc, .p2go { transition: none; } }
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
  .up-row { display: grid; grid-template-columns: 20px 1fr auto auto auto; gap: 6px; align-items: center; padding: 5px 2px; border-bottom: 1px solid #F0F2F7; font-size: 13px; }
  .up-row .ut { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .up-row input[type=checkbox] { width: 16px; height: 16px; accent-color: #2F9E7E; margin: 0; }
  .up-row .ic { opacity: .35; } .up-row:hover .ic, .up-row .ic:focus-visible { opacity: 1; }
  .up-edit { display: flex; flex-direction: column; gap: 6px; padding: 6px 2px 8px; border-bottom: 1px solid #F0F2F7; }
  .up-edit input { font: inherit; font-size: 13px; padding: 6px 8px; border: 1.5px solid #C9CEDF; border-radius: 8px; min-width: 0; }
  .up-edit input:focus { outline: none; border-color: #23305E; }
  .up-eb { display: flex; gap: 6px; align-items: center; } .up-eb input { flex: 1; } .up-eb .b { padding: 6px 10px; }
  .up-row .uw { font-size: 11.5px; color: #6B7394; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .bell-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 10px 6px; border-bottom: 1px dashed #C9CEDF; }
  .bell-bar .moon { font-size: 12px; color: #6B7394; }
  .snd-sw { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #6B7393; white-space: nowrap; margin-left: auto; }
  .snd-sw .knob { position: relative; width: 34px; height: 20px; border-radius: 999px; background: #C9CEDF; transition: background .15s; flex: none; }
  .snd-sw .knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: left .15s; }
  .snd-sw.on { color: #2F9E7E; } .snd-sw.on .knob { background: #2F9E7E; } .snd-sw.on .knob::after { left: 16px; }
  .snd-sw:focus-visible { outline: 2px solid #2E7DD7; outline-offset: 2px; border-radius: 6px; }
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
  .tfx { display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; }
  .tfx-st { font-weight: 800; font-size: 13px; } .tfx-st.off { color: #6B7394; } .tfx-st.on { color: #2E9E6B; }
  .tfx-n { color: #6B7394; font-size: 12px; line-height: 1.45; }
  .tfx-steps { margin: 0; padding-left: 18px; color: #4A5275; font-size: 12px; line-height: 1.5; } .tfx-steps b { color: #23305E; }
:host([data-drop]) .wrap { filter: drop-shadow(0 0 12px rgba(46,125,215,.9)); }
.tfx-sw { position: relative; display: flex; margin: 4px 12px 6px; background: #E9EDF6; border-radius: 999px; padding: 3px; }
.tfx-sw::before { content: ''; position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); background: #23305E; border-radius: 999px; box-shadow: 0 2px 6px rgba(35,48,94,.25); transition: transform .25s ease; }
.tfx-sw[data-m=gui]::before { transform: translateX(100%); }
.tfx-sw button { all: unset; flex: 1; position: relative; z-index: 1; text-align: center; font-size: 12px; font-weight: 700; padding: 7px 4px; color: #4A5275; cursor: pointer; border-radius: 999px; transition: color .2s; }
.tfx-sw button.on { color: #fff; } .tfx-sw button:focus-visible { outline: 2px solid #2E7DD7; outline-offset: 1px; }
.tfx-if { display: block; width: 100%; height: 150px; border: 0; background: transparent; color-scheme: normal; }
.tfx-tip { margin: 4px 12px 0; font-size: 10.5px; font-style: italic; color: #8A90A8; line-height: 1.35; }
.tfx-slo { margin: -2px 12px 2px; text-align: center; font-size: 12px; font-style: italic; font-weight: 700; color: #2E7DD7; }
.tfx-slo { margin: -2px 12px 2px; text-align: center; font-size: 12px; font-style: italic; font-weight: 700; color: #2E7DD7; }
.tfx-dir { margin: 8px 12px 0; padding: 7px 10px; border-radius: 10px; background: #F3F4F6; font-size: 11.5px; color: #23305E; word-break: break-all; }
    .tfx-qr { display: flex; gap: 10px; align-items: center; } .tfx-qr img { width: 110px; height: 110px; image-rendering: pixelated; border-radius: 6px; flex: none; }
  .tfx-qr b { display: block; font-size: 12.5px; } .tfx-qr small { display: block; color: #6B7394; font-size: 11px; margin: 2px 0; } .tfx-qr code { font-size: 11px; color: #2E7DD7; word-break: break-all; }
  .tfx-ln { font-weight: 700; font-size: 12px; } .tfx-bar { height: 6px; background: #EEF0F6; border-radius: 4px; overflow: hidden; margin-top: 4px; } .tfx-bar i { display: block; height: 100%; background: #2E7DD7; transition: width .4s; }
  .tfx-sum { font-size: 12px; color: #23305E; }
  .tfx-it { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: #6B7394; } .tfx-it span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .tfx-it small { flex: none; }
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
  .stk { display: grid; grid-template-columns: 54px 1fr 1.25fr 24px; gap: 8px; align-items: center; padding: 7px 4px; border-bottom: 1px solid #F0F2F7; font-size: 13.5px; }
  .stk .px, .stk .ch { text-align: right; font-variant-numeric: tabular-nums; } .stk .px { font-weight: 700; }
  .stk .ch { font-size: 12.5px; font-weight: 700; } .stk .ch.ref { color: #C99700; }
  .stk-hd { font-size: 11px; color: #888; font-weight: 700; padding-top: 0; } .stk-hd span:nth-child(2), .stk-hd span:nth-child(3) { text-align: right; }
  .stk-add select { flex: 1; }
  .stk-in { position: relative; flex: 1 1 auto; min-width: 0; } .stk-in input { width: 100%; }
  .stk-sug { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 6; background: #fff; border: 1px solid #D5DAE6; border-radius: 8px; box-shadow: 0 8px 20px rgba(31,42,68,.14); max-height: 232px; overflow: auto; }
  .stk-sug button { all: unset; display: block; box-sizing: border-box; width: 100%; padding: 6px 10px; font-size: 12px; line-height: 1.35; cursor: pointer; color: #1F2A44; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stk-sug button:hover, .stk-sug button.on { background: #EEF0F5; } .stk-sug b { margin-right: 6px; } .stk-sug small { color: #8A90A6; margin-left: 4px; }
  .stk-sug .none { padding: 8px 10px; font-size: 12px; color: #8A90A6; }
  .mk-al { display: grid !important; grid-template-columns: minmax(0, 1fr) 78px 80px auto; gap: 6px; } .mk-al > * { min-width: 0; box-sizing: border-box; width: 100%; }
  .hold-ln { all: unset; cursor: pointer; display: block; box-sizing: border-box; width: 100%; padding: 1px 4px 6px; font-size: 11.5px; color: #6B7385; border-bottom: 1px solid #F0F2F7; }
  .hold-ln:hover { color: #23305E; } .hold-ln.add { color: #A0A7B8; }
.hold-wr { display: flex; align-items: center; gap: 4px; }
.hold-wr .hold-ln { flex: 1; min-width: 0; }
.hold-wr.locked .hold-ln { cursor: default; } .hold-wr.locked .hold-ln:hover { color: #6B7385; }
.hold-lk { all: unset; cursor: pointer; flex: none; font-size: 12px; padding: 1px 5px 4px; border-radius: 6px; opacity: .75; }
.hold-lk:hover { opacity: 1; background: #FFF3D6; } .hold-lk:focus-visible { outline: 2px solid #D98E1F; }
.hold-lk.nudge { animation: hhNudge .35s; } @keyframes hhNudge { 25% { transform: rotate(-15deg); } 75% { transform: rotate(15deg); } } .hold-ln b { font-weight: 800; }
  .gold .hold-ln { border-bottom: 1px dashed #EED9A0; padding-left: 0; }
  .hold-ln b.up { color: #1E9E5A; } .hold-ln b.down { color: #D93025; }
  .hold-ed { padding: 4px 2px 8px; border-bottom: 1px solid #F0F2F7; }
  .hold-lot { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #39425A; padding: 2px 0; }
  .hold-add { display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
  .hold-done { all: unset; cursor: pointer; font-size: 11.5px; color: #6B7385; margin-top: 4px; } .hold-done:hover { color: #23305E; }
  .hold-ed .hold-in { flex: 1 1 90px; min-width: 0; padding: 6px 8px; border: 1px solid #D5DAE6; border-radius: 8px; font: inherit; font-size: 12.5px; }
  .hold-ed .hold-u { padding: 6px 4px; border: 1px solid #D5DAE6; border-radius: 8px; font-size: 12.5px; }
  .hold-tot { margin: 8px 0 6px; padding: 9px 12px; border-radius: 12px; background: #1F2A44; color: #fff; font-size: 13px; font-weight: 700; line-height: 1.5; box-shadow: 0 2px 8px rgba(31,42,68,.18); }
  .hold-tot b { font-weight: 900; font-size: 14px; } .hold-tot b.up { color: #5CF09A; } .hold-tot b.down { color: #FF8A80; }
  .gold .hold-tot { margin: 6px 0 4px; }
  .sat[hidden], .tabs [data-t][hidden], .links [hidden] { display: none !important; }
  .tabs .big, .tabs .x { order: 99; }
  .lay { margin: 12px 2px 4px; padding: 10px 12px; border-radius: 12px; background: #F6F7FB; }
  .lay-h { font-weight: 800; font-size: 13px; color: #23305E; margin-bottom: 6px; }
  .lay-r { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 13px; font-weight: 700; }
  .lay-sw { display: flex; background: #E7E9F0; border-radius: 999px; padding: 2px; }
  .lay-sw button { all: unset; cursor: pointer; padding: 4px 8px; white-space: nowrap; border-radius: 999px; font-size: 11.5px; font-weight: 700; color: #5B6478; }
  .lay-sw button.on { background: #1F2A44; color: #fff; }
  .hh-tip { position: relative; margin: 6px 10px 4px; padding: 7px 28px 7px 10px; border-radius: 10px; background: #FFF8E1; border: 1px solid #F5D78E; font: 600 12px/1.45 system-ui; color: #5B4A12; } .hh-tip button { all: unset; cursor: pointer; position: absolute; top: 5px; right: 8px; font-size: 12px; color: #8A7430; }
  .gp-n { margin: 8px 10px 0; font-size: 12.5px; color: #5B6478; line-height: 1.45; } .gp-t { display: block; width: calc(100% - 20px); box-sizing: border-box; margin: 8px 10px; padding: 8px 10px; border: 1.5px solid #E3E6F0; border-radius: 10px; font: 13px/1.45 system-ui; color: #1F2A44; resize: vertical; } .gp-m { margin: 8px 10px; font: 600 12.5px system-ui; color: #15803D; }
  .lay-2 { justify-content: flex-start; gap: 6px; } .lay-2 > span { flex: none; }
  .lay-sel { flex: 1; min-width: 0; margin-left: 0; padding: 6px 10px; border: 1.5px solid #E3E6F0; border-radius: 10px; font: 700 12.5px system-ui; color: #23305E; background: #fff; cursor: pointer; }
  .lay-n { font-size: 11px; color: #8A92A6; margin-top: 4px; }
  .inf { font-size: 12.5px; display: flex; flex-direction: column; min-height: 0; }   /* 1.10.37: khung kết quả tự cuộn bên trong, không cuộn trang web */
  .itabs { display: flex; gap: 14px; padding: 2px 12px 0; border-bottom: 1px solid #ECEEF4; margin-bottom: 8px; }
  .itabs button { all: unset; cursor: pointer; padding: 6px 0 5px; font-size: 12px; font-weight: 700; color: #8A92A6; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .subcard { border: 1px solid #ECEEF4; border-radius: 12px; padding: 10px 12px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
  .subcard .sh { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #23305E; }
  .subcard .sd { font-size: 11.5px; color: #5B6478; line-height: 1.45; } .subcard .sd .y { color: #C99400; }
  .subcard .lb { font-size: 11.5px; color: #5B6478; margin-right: 6px; } .subcard select { font: inherit; font-size: 12px; padding: 3px 6px; border: 1px solid #DDE1EA; border-radius: 8px; }
  .subcard .ss { font-size: 11.5px; color: #23305E; background: #F6F4FF; border-radius: 8px; padding: 6px 9px; }
  .subcard .sw { all: unset; cursor: pointer; width: 38px; height: 22px; border-radius: 11px; background: #CCD1DC; position: relative; transition: background .2s; flex: none; }
  .subcard .sw i { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: left .2s; }
  .subcard .sw.on { background: #6A48F0; } .subcard .sw.on i { left: 19px; }
  .itabs button.on { color: #23305E; border-bottom-color: var(--tc, #6A48F0); } .itabs button:hover { color: #23305E; }
  .tin-row { display: flex; align-items: flex-end; gap: 6px; margin: 0 10px; padding: 4px 4px 4px 10px; border: 1px solid #D9DDE8; border-radius: 12px; background: #fff; }
  .tin-row:focus-within { border-color: var(--tc, #6A48F0); }
  .tin-row .tin { all: unset; flex: 1; min-width: 0; font-size: 12.5px; line-height: 1.45; padding: 5px 0; resize: none; white-space: pre-wrap; max-height: 140px; overflow-y: auto; }
  .tin-go { all: unset; cursor: pointer; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; background: var(--tc, #6A48F0); color: #fff; font-size: 13px; flex: none; }
  .iacts { display: flex; align-items: center; flex-wrap: wrap; gap: 2px 8px; margin: 6px 12px 4px; font-size: 11.5px; color: #8A92A6; }
  .iacts select { font-size: 11.5px; padding: 2px 4px; border: 1px solid #E1E4EC; border-radius: 6px; background: #fff; color: #23305E; max-width: 120px; }
  .iacts .lk { all: unset; cursor: pointer; color: #39425A; font-weight: 700; padding: 2px 4px; border-radius: 6px; } .iacts .lk:hover { background: #F0F2F7; }
  .iacts .lk.hot { color: var(--tc, #6A48F0); } .iacts .gear { margin-left: auto; color: #8A92A6; }
  .iopt { display: flex; align-items: center; gap: 6px; margin: 2px 12px 6px; font-size: 11.5px; color: #5B6478; } .iopt[hidden] { display: none; }
  .inf .chip { font-size: 11.5px; padding: 3px 9px; } .inf .b { font-size: 12px; padding: 5px 10px; }
  .inf .empty { font-size: 11.5px; padding: 8px 12px; } .inf .row { gap: 5px; } .inf .src { font-size: 11.5px; }
  .inf .trbox { font-size: 12.5px; } .inf .line { gap: 5px; } .inf .line .b { font-size: 11.5px; padding: 3px 9px; }
  .inf .snd { font-size: 11.5px; } .inf .row .chip { padding: 3px 8px; }
  .osame.like { color: #8A6D1F; background: #FFF6DC; display: inline-block; width: auto; padding: 0 6px; border-radius: 6px; }
  .vopen { background: #FFF6EC; border: 1.5px solid #F6C8A0; border-radius: 14px; padding: 12px; margin: 4px 2px 10px; }
  .vopen .vot { font-weight: 800; font-size: 14px; color: #23305E; }
  .vopen .vos { font-size: 12.5px; color: #5B6478; margin: 4px 0 10px; line-height: 1.4; }
  .vopen .vgo { width: 100%; text-align: center; }
  .dealc { background: #FFF8E8; border: 1.5px solid #F2C76A; border-radius: 14px; padding: 10px 12px; margin: 2px 0 10px; }
  .dealc .dct { font-weight: 800; font-size: 14px; color: #23305E; margin-bottom: 4px; }
  .dealc .dcl { font-size: 12.5px; color: #5B6478; }
  .dealc .dcb { font-size: 13.5px; font-weight: 800; color: #1E7B4C; margin-top: 3px; }
  .dealc .dcs { font-size: 12px; color: #B4541A; margin-top: 2px; }
  .dealc .dcg { width: 100%; text-align: center; margin-top: 8px; }
  .dealc .dcn { font-size: 11px; color: #8A92A6; margin-top: 6px; }
  .tb-deal { background: #FFF8E8; border: 1.5px solid #F2C76A; border-radius: 12px; padding: 7px 9px; margin: 6px 0; }
  .tb-deal .dcb { font-size: 13px; font-weight: 800; color: #1E7B4C; }
  .tb-deal .dcs { font-size: 11.5px; color: #5B6478; margin-top: 2px; line-height: 1.35; }
  .tb-deal .dcn { font-size: 10.5px; color: #8A92A6; margin-top: 3px; }
  .tb-deal .tb-g { width: 100%; text-align: center; margin-top: 6px; padding: 5px; font-size: 12px; }
  .tb-deal .dcd, .dealc .dcd { font-size: 11.5px; color: #5B6478; padding-left: 14px; line-height: 1.35; }
  .tb-deal .dcw, .dealc .dcw { font-size: 12.5px; font-weight: 800; color: #23305E; margin-top: 5px; }
  .dbtns { display: flex; gap: 6px; margin-top: 7px; } .dbtns .b { flex: 1 1 0; text-align: center; padding: 6px 4px; font-size: 12px; margin: 0; }
  .dbtns .ghost { background: #fff; color: #23305E; border: 1.5px solid #23305E; }
  .qrbox { position: fixed; inset: 0; z-index: 2147483647; background: rgba(20,24,40,.45); display: grid; place-items: center; }
  .qrc { background: #fff; border: 2px solid #23305E; border-radius: 18px; box-shadow: 5px 5px 0 #E85D5D; padding: 16px 18px; width: 300px; text-align: center; font: 13px/1.45 "Segoe UI", system-ui, sans-serif; color: #23305E; }
  .qrc .qrt { font-weight: 800; font-size: 15px; margin-bottom: 8px; } .qrc img { width: 200px; height: 200px; image-rendering: pixelated; }
  .qrc .qrs { font-size: 12.5px; color: #5B6478; margin: 8px 0 4px; } .qrc .qrn { font-size: 11px; color: #8A92A6; margin-bottom: 10px; }
  .spcard .splink { display: block; font-size: 11px; opacity: .9; text-decoration: underline; }
  .tb-store { all: unset; box-sizing: border-box; cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 7px; padding: 6px 10px; border-radius: 10px; background: linear-gradient(90deg, #FF7A3D, #F2542D); color: #fff; font-size: 12px; font-weight: 800; }
  .tb-store span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tb-store b { flex: none; white-space: nowrap; font-size: 11px; background: rgba(255,255,255,.22); border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
  .spaff { font-size: 10.5px; color: #A0A7B8; text-align: center; margin-top: 4px; }
  .dblk { background: #FFF8E8; border: 1.5px solid #F2C76A; border-radius: 12px; padding: 6px 8px; margin: 6px 0; }
  .dblk .drow { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
  .dblk .dwrap + .dwrap { border-top: 1px dashed #F2D79A; margin-top: 3px; padding-top: 2px; }
  .dblk .dl { flex: 1; min-width: 0; line-height: 1.2; }
  .dblk .dl .dlb { display: block; font-size: 11px; font-weight: 700; color: #5B6478; }
  .dblk .dl b { display: block; font-size: 15px; font-weight: 900; color: #1E7B4C; white-space: nowrap; }
  .dblk .drow + .drow .dl b { color: #23305E; }
  .dblk .dl small { display: block; font-size: 10.5px; color: #8A92A6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dblk .dbtn { flex: none; width: 104px; margin: 0; padding: 4px 6px; font-size: 11px; line-height: 1.2; border-radius: 9px; white-space: normal; text-align: center; }
  .dblk .dbtn.ghost { background: #fff; color: #23305E; border: 1.5px solid #23305E; }
  .dblk .dvia { flex: none; font-size: 11px; color: #1E7B4C; font-weight: 700; }
  .dblk .dft { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin: 0 0 3px; }
  .dblk .dtog { flex: none; }
  .dblk .dft span { font-size: 10px; color: #A0A7B8; }
  .dblk .dtog { all: unset; display: block; cursor: pointer; font-size: 11px; font-weight: 700; color: #D98E1F; margin-bottom: 3px; }
  .dblk .ddet { margin: 2px 0 4px; background: #fff; border-radius: 8px; padding: 4px 6px; }
  .dblk .dh { font-size: 11.5px; font-weight: 800; color: #23305E; margin-top: 3px; }
  .dblk .dcd { font-size: 11px; color: #5B6478; padding-left: 10px; line-height: 1.35; }
  .dblk .dtip { font-size: 11px; color: #B4541A; font-weight: 600; margin-bottom: 1px; }
  .dblk .dcn { font-size: 10.5px; color: #8A92A6; margin-top: 3px; }
  .tb-cp { all: unset; box-sizing: border-box; display: block; width: 100%; cursor: pointer; }
  .gring { position: fixed; z-index: 2147483646; border: 3px solid #F2B544; border-radius: 12px; box-shadow: 0 0 0 4000px rgba(20,24,40,.28), 0 0 18px #F2B544; pointer-events: none; transition: all .25s ease; animation: gpulse 1.4s ease-in-out infinite; }
  @keyframes gpulse { 50% { box-shadow: 0 0 0 4000px rgba(20,24,40,.28), 0 0 30px 6px #F2B544; } }
  .gpop { position: fixed; z-index: 2147483647; width: 290px; background: #fff; border: 2px solid #23305E; border-radius: 16px; padding: 10px 12px; box-shadow: 4px 4px 0 #E85D5D; font: 13px/1.4 "Segoe UI", system-ui, sans-serif; color: #23305E; transition: left .6s cubic-bezier(.3,1.4,.6,1), top .6s cubic-bezier(.3,1.4,.6,1); }
  .gpop.free { right: 20px; bottom: 120px; left: auto !important; top: auto !important; }
  .gpop .gph { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .gpop .gham { font-size: 26px; line-height: 1; display: inline-block; }
  .gpop.run .gham { animation: grun .35s ease-in-out 2; }
  @keyframes grun { 25% { transform: translateY(-5px) rotate(-8deg); } 75% { transform: translateY(-2px) rotate(8deg); } }
  .gpop .gstep { font-size: 11.5px; font-weight: 800; color: #D98E1F; background: #FFF3D6; border-radius: 999px; padding: 1px 8px; }
  .gpop .gtx { font-weight: 700; font-size: 13.5px; }
  .gpop .gbtn { display: flex; gap: 6px; align-items: center; margin-top: 9px; flex-wrap: wrap; }
  .gpop .gbtn .ghost { background: #fff; color: #23305E; border: 1.5px solid #23305E; }
  .gpop .gbtn .mlink { all: unset; cursor: pointer; font-size: 12px; color: #8A92A6; text-decoration: underline; margin-left: auto; }
  .mkt-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin: 0 10px 8px; box-sizing: border-box; }
  .mkt-t { all: unset; cursor: pointer; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; padding: 6px 2px; border-radius: 999px; background: #F3F4F8; font-size: 12.5px; font-weight: 700; color: #555; }
  .mkt-t.on { background: #1F2A44; color: #fff; } .mkt-t:not(.on):hover { background: #E7E9F0; }
  .gold { margin: 2px 0 10px; padding: 8px 10px 6px; border-radius: 12px; background: linear-gradient(135deg, #FFF8E1, #FFF1C9); border: 1px solid #F3D88B; }
  .g-row { display: grid; grid-template-columns: 1.35fr 1fr 1fr 1fr; gap: 6px; align-items: center; padding: 5px 0; font-size: 13px; border-bottom: 1px dashed #EED9A0; }
  .g-row b { font-weight: 700; white-space: nowrap; }
  .g-hd { font-size: 11px; color: #8A6A1F; font-weight: 700; padding-top: 0; }
  .g-hd span:not(:first-child), .gp, .gd { text-align: right; font-variant-numeric: tabular-nums; }
  .gp { font-weight: 700; } .gd { font-size: 12px; font-weight: 700; color: #888; } .gd.up { color: #1E9E5A; } .gd.down { color: #D93025; }
  .g-w { border-bottom: 0; } .g-x { grid-column: span 2; }
  .g-ft { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: #8A6A1F; }
  .g-rf { all: unset; cursor: pointer; margin-left: auto; padding: 0 6px; border-radius: 6px; font-size: 13px; } .g-rf:hover { background: #F7E2A8; }
  .rule .ic { margin-left: auto; }
  .mail-hd { background: #EEF5FF !important; color: #1F5FAF !important; }
  .mail-hd:hover, .mail-hd.on { background: #DCEBFF !important; }
  .mail-acc { font-size: 13px; color: #1F5FAF; word-break: break-all; }
  .mail-why { margin-top: 4px; font-size: 11.5px; color: #6B7393; line-height: 1.4; }
  .mail-list { display: flex; flex-direction: column; gap: 3px; margin: 2px 0 6px; } .mail-list > b { font-size: 12px; color: #3A4470; }
  .mail-it { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 4px; padding: 6px 6px 6px 8px; border-radius: 8px; background: #F4F7FD; font-size: 12px; color: #23305E; min-width: 0; }
  .mail-it:hover { background: #E6EEFB; } .mail-it.junk { opacity: .6; }
  .mail-it .mtx { min-width: 0; }
  .mail-it .ml1 { display: flex; align-items: center; gap: 5px; min-width: 0; }
  .mail-it .mno { color: #6B7393; font-weight: 700; flex: none; }
  .mail-it .mn { font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mail-it .mt { padding-left: 16px; color: #4A5272; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mail-it .mj { flex: none; font-style: normal; font-size: 10.5px; color: #6B7393; background: #E8EAF2; border-radius: 6px; padding: 1px 5px; }
  .mail-it .mj.otp { background: #FDE3E3; color: #9B2C2C; font-weight: 700; }
  .mail-it .ic { opacity: .5; } .mail-it:hover .ic, .mail-it .ic:focus-visible { opacity: 1; }
  .mail-top { align-items: center; gap: 6px; flex-wrap: wrap; } .mail-top .rule { margin: 0 auto 0 0; }
  .mail-st { padding: 4px 2px; font-size: 12px; }
  /* cỡ chữ đồng đều trong Canh email */
  .mail-in, .mail-in .lb, .mail-in .snd, .mail-in .rule, .mail-in .empty, .mail-in .mail-acc, .mail-in select, .mail-in input:not([type=checkbox]) { font-size: 12.5px !important; line-height: 1.4; }
  .mail-in .lb { font-weight: 600; color: #4A5272; }
  .mail-in .mail-acc { font-weight: 700; }
  .mail-in .snd, .mail-in .rule { display: flex !important; align-items: flex-start; gap: 8px; font-weight: 500 !important; padding: 2px 0 !important; margin: 0 !important; }
  .mail-in input[type=checkbox] { width: 15px !important; height: 15px !important; flex: none; margin: 1px 0 0 !important; accent-color: #E85D5D; }
  .mail-in .chip, .mail-in .b { font-size: 12.5px !important; padding: 5px 12px !important; }
  .mail-in .line { gap: 6px; align-items: center; }
  .mail-in { padding: 6px 2px 2px; }
  .tfx-err { color: #C2410C !important; font-weight: 700; }
  .gm-ask { margin: 6px 0; padding: 9px 10px; border-radius: 12px; background: #FFF8E1; border: 1px solid #F5D78E; font: 500 12px/1.5 system-ui; color: #5B4A12; display: grid; gap: 6px; } .gm-ask b { font-size: 12.5px; color: #23305E; }
  .foot { font-size: 11px; color: #9AA1BE; text-align: center; margin-top: 10px; }
  .tools-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 8px 10px; }   /* V1.9: ô gọn */
  .tool { all: unset; cursor: pointer; border: 1.5px solid #E6E9F2; border-radius: 12px; padding: 8px 9px; background: #fff; display: flex; flex-direction: row; gap: 8px; align-items: center; min-width: 0;
    box-shadow: 0 2px 8px rgba(35,48,94,.06); transition: transform .15s, box-shadow .15s, border-color .15s; }
  .tool:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--c) 45%, transparent); box-shadow: 0 8px 20px color-mix(in srgb, var(--c) 22%, transparent); }
  .tool .ti { flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff;
    background: radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--c) 55%, #fff) 0%, var(--c) 60%, color-mix(in srgb, var(--c) 82%, #000) 100%);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--c) 40%, transparent); }
  .tool .ti svg { width: 17px; height: 17px; } .tool > div { min-width: 0; }
  .tool b { display: block; font-size: 13px; font-weight: 800; color: #23305E; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tool span.td { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 10.5px; color: #6B7394; line-height: 1.3; margin-top: 1px; }
  .tool:focus-visible { outline: 2px solid #D98E1F; outline-offset: 2px; }
  .menu-open .sat:nth-of-type(5) { transition-delay: .16s; } .menu-open .sat:nth-of-type(6) { transition-delay: .2s; }
  .menu-open .sat:hover { transform: scale(1.08); box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--c) 60%, transparent), 0 0 26px color-mix(in srgb, var(--c) 60%, transparent), 0 8px 18px rgba(35,48,94,.22); }
  .sat:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
  .sat .n { position: absolute; top: -7px; right: -7px; z-index: 1; min-width: 24px; height: 24px; border-radius: 12px; background: #F0293E; color: #fff; font: 800 12.5px/20px "Segoe UI", system-ui, sans-serif; text-align: center; padding: 0 6px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(240,41,62,.4); }
  .sat .n[hidden] { display: none; }

  .bubble { position: absolute; width: 270px; padding: 12px 14px; background: #fff; color: #23305E; border: 2px solid #23305E;
    border-radius: 16px; font-size: 14px; line-height: 1.45; cursor: pointer; box-shadow: 4px 4px 0 #F2B544; z-index: 4; }
  .bubble .t { font-weight: 700; display: block; margin-bottom: 2px; }
  .bubble[data-kind="deal"], .bubble[data-kind="cmp"] { border-color: #2F9E7E; box-shadow: 4px 4px 0 #9ED9C4; }
  .bubble .dlt { font-size: 13px; font-weight: 700; line-height: 1.35; }
  .bubble .dls { font-size: 12px; color: #6B7394; }
  .bubble .dlp { margin: 4px 0 2px; font-size: 13px; } .bubble .dlp s { color: #8A92A6; } .bubble .dlp b { font-size: 17px; color: #EE4D2D; } .bubble .dlp .dlpc { font-weight: 800; color: #1F7A60; }
  .bubble .dln { font-size: 10.5px; color: #8A92A6; margin-top: 6px; text-align: center; }
  .bubble .note { display: block; margin-top: 6px; padding: 6px 8px; border-radius: 10px; background: #FFF0C7; font-size: 12.5px; color: #3A4470; }
  .bubble .note.late { background: #FDE3E3; color: #9B2C2C; }
  .bubble .note.todo { background: #EAF2FF; color: #23305E; } .bubble .note.todo.late { background: #FDE3E3; }
  .bubble .note.todo b { display: block; margin-bottom: 3px; font-size: 12.5px; } .bubble .note.todo .ti { line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bubble .note.todo .ti.l { color: #9B2C2C; font-weight: 600; } .bubble .note.todo .ti.more { color: #6B7393; font-style: italic; }
  .bubble.think { width: auto; min-width: 170px; max-width: 280px; padding: 8px 30px 8px 12px; border: 1.5px solid #E3E6F0; border-radius: 20px; box-shadow: 0 8px 22px rgba(35,48,94,.16); font-size: 12.5px; line-height: 1.35; }
  .bubble.think::before, .bubble.think::after { content: ""; position: absolute; background: #fff; border: 1.5px solid #E3E6F0; border-radius: 50%; }
  .bubble.think.up::before { width: 14px; height: 14px; bottom: -13px; } .bubble.think.up::after { width: 8px; height: 8px; bottom: -25px; }
  .bubble.think.down::before { width: 14px; height: 14px; top: -13px; } .bubble.think.down::after { width: 8px; height: 8px; top: -25px; }
  .bubble.think.al::before { right: 26px; } .bubble.think.al::after { right: 16px; }
  .bubble.think.ar::before { left: 26px; } .bubble.think.ar::after { left: 16px; }
  .bubble.think .th1 { display: block; color: #3A4470; font-weight: 600; }
  .bubble.think .thl { display: flex; align-items: baseline; gap: 6px; white-space: nowrap; padding: 1px 0; }
  .bubble.think .thl b { font-size: 12px; color: #2F9E7E; flex: none; }
  .bubble.think .thl.late b { color: #E85D5D; }
  .bubble.think[data-kind="ad"] { width: max-content; max-width: min(400px, calc(100vw - 40px)); cursor: pointer; } .bubble.think[data-kind="ad"] .thl { white-space: normal; } .bubble.think[data-kind="ad"] .thw { display: block; color: #E85D5D; font-size: 12.5px; white-space: nowrap; } .bubble.think[data-kind="ad"] .thx { overflow: visible; text-overflow: clip; font-weight: 600; color: #23305E; }
  .bubble.think[data-kind="ad"]:hover .thx { text-decoration: underline; }
  .bubble.think .thx { overflow: hidden; text-overflow: ellipsis; color: #23305E; }
  .bubble.think .thi { flex: none; }
  .bubble.think .thm { display: block; font-size: 11px; color: #8A91AD; margin-top: 2px; }
  .bubble.think .thc { all: unset; cursor: pointer; position: absolute; top: 6px; right: 8px; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; color: #9AA1BE; }
  .bubble.think .thc:hover { background: #F1F3F8; color: #23305E; }
  .bubble.tb { width: 272px; padding: 10px 12px; cursor: default; box-shadow: 4px 4px 0 var(--k); border-color: var(--k); }
  .tb-top { display: flex; align-items: center; gap: 10px; }
  .tb-sv { all: unset; cursor: pointer; margin-left: auto; flex: none; font-size: 12px; font-weight: 800; color: #E0344B; padding: 4px 9px; border-radius: 999px; border: 1.5px solid #F4B4BE; background: #fff; white-space: nowrap; transition: transform .15s; }
  .tb-sv:hover { background: #FFF0F2; } .tb-sv.on { background: #FFE7EB; border-color: #E0344B; } .tb-sv.full { color: #8A92A6; border-color: #C9CEDF; }
  .tb-sv.pop { transform: scale(1.15); } .tb-sv:focus-visible { outline: 2px solid #E0344B; outline-offset: 2px; }
  .tb-sv + .tb-x { margin-left: 0; }
  .tb-sc { width: 40px; height: 40px; border-radius: 50%; flex: none; display: grid; place-items: center; background: var(--k); color: #fff; font: 800 15px/1 "Segoe UI", system-ui, sans-serif; }
  .tb-lv { font-weight: 800; font-size: 15px; line-height: 1.2; color: var(--k); }
  .tb-lv small { display: block; font-weight: 600; font-size: 11px; color: #6B7394; margin-top: 2px; }
  .tb-x { all: unset; cursor: pointer; margin-left: auto; align-self: flex-start; width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; color: #9AA1BE; font-size: 13px; }
  .tb-x:hover, .tb-x:focus-visible { background: #EEF0F6; color: #23305E; }
  .tb-resp { margin-top: 5px; font-size: 12px; font-weight: 700; } .tb-resp.ok { color: #15803D; } .tb-resp.mid { color: #B45309; } .tb-resp.bad { color: #B91C1C; }
  .tb-why { font-size: 12px; color: #3A4470; margin-top: 7px; line-height: 1.4; } .tb-wl { padding: 1px 0; } .tb-why > button, .tb-why > .tb-go2 { margin-top: 5px; }
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
  .tb-hook > b, .tb-hook > span, .tb .tb-hook > b, .tb .tb-hook > span { display: block !important; } .tb-hook > span { font-weight: 500; font-size: 11.5px; opacity: .9; margin-top: 1px; }   /* 1.10.232: 2 dòng, không dính chữ */
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
  /* bảng gọn: chỉ Todo + Nhắc */
  .panel.mini, .panel.mini.bigp { width: 340px; max-height: min(420px, 60vh); }
  .panel.mini .tabs [data-t]:not([data-t="todo"]):not([data-t="bell"]) { display: none; }
  .panel.mini .tabs [data-t] span { display: inline; }
  .panel.mini .tabs [data-t] { padding: 7px 10px 6px; font-size: 12px; }
  .panel.mini .tabs .big { font-size: 11px; font-weight: 700; }
  .panel.mini .tabs .big::after { content: " Đầy đủ"; }
  .panel.mini .today { margin: 6px 8px 0; padding: 4px 10px; border-radius: 12px; }
  .panel.mini .today .big { font-size: 20px; min-width: 28px; }
  .panel.mini .today .tinfo { font-size: 12px; } .panel.mini .today .tinfo span { font-size: 11.5px; }
  .panel.mini .bell-bar { display: none; }
  .panel.mini .todo > button { display: none; }
  .panel.mini .todo:hover > button, .panel.mini .todo:focus-within > button { display: grid; }
  .panel.mini .todo { padding: 5px 4px; min-height: 30px; }
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
  .view > .inf { flex: 1 1 0%; min-height: 0; }
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
  .gh.pri { color: #B7791F; }
  .todo.pri { background: #FFF8E6; border-radius: 8px; } .todo.pri .tx { font-weight: 600; }
  /* nút nhỏ gọn bên phải, nhường chỗ cho nội dung việc */
  .todo .tacts { display: flex; align-items: center; gap: 0; flex: none; }
  .todo .tacts button { all: unset; cursor: pointer; width: 22px; height: 22px; display: grid; place-items: center; font-size: 12px; border-radius: 6px; opacity: .3; filter: grayscale(1); transition: opacity .12s; }
  .todo:hover .tacts button, .todo .tacts button:focus-visible { opacity: .85; filter: none; }
  .todo .tacts button:hover { background: #F1F2F7; opacity: 1; }
  .todo .tacts button.on { opacity: 1; filter: none; }
  .todo .tacts button:focus-visible { outline: 2px solid #23305E; }
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
  .rem { display: grid; grid-template-columns: auto 1fr auto auto auto; gap: 6px; align-items: center; padding: 6px 4px; border-bottom: 1px solid #EEF0F6; }
  .rem .ic { opacity: .35; transition: opacity .12s; } .rem:hover .ic, .rem .ic:focus-visible { opacity: 1; }
  .rem .ico { font-size: 17px; width: 24px; text-align: center; }
  .rem .nm { font-weight: 700; font-size: 13.5px; }
  .rem .ds { display: block; font-size: 11.5px; color: #6B7394; font-weight: 400; }
  .rem .nx { display: block; font-size: 11.5px; color: #C23B3B; font-weight: 600; }
  .snd-sw { font-size: 16px; padding: 2px 4px; border-radius: 8px; } .snd-sw:hover { background: #F1F2F7; }
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
  .aff-note { margin: 6px 12px 0; color: #B7791F; font-weight: 700; }
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
  .stabs { display: flex; gap: 3px; margin: 8px 10px 0; padding: 3px; background: #F1EEF4; border-radius: 10px; }
  .stabs button { all: unset; cursor: pointer; flex: 1 1 auto; text-align: center; padding: 5px 4px; border-radius: 8px; font-size: 12px; font-weight: 800; color: #5B648A; white-space: nowrap; }   /* V1.5: 1 hàng, không xuống dòng */
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
  .row.fbox { border-bottom: 0; padding: 6px 10px 4px !important; margin: 0; }
  .row.fbox input.grow { padding-top: 6px; padding-bottom: 6px; font-size: 13px; }
  .row.fbox .b { padding: 6px 12px; }
  .fsug { flex: 1 0 100%; box-sizing: border-box; background: #fff; border: 1.5px solid #23305E; border-radius: 12px; box-shadow: 0 8px 20px rgba(35,48,94,.18); padding: 4px; }
  .fsi { all: unset; display: block; box-sizing: border-box; width: 100%; cursor: pointer; padding: 7px 10px; border-radius: 8px; font-size: 13px; color: #23305E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fsi:hover, .fsi.on { background: #EEF1FA; }
  .fchips, .fhist { display: flex; gap: 4px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; align-items: center; padding: 0 10px 6px; }
  .fchips::-webkit-scrollbar, .fhist::-webkit-scrollbar { display: none; }
  .fchips .chip, .fmore .chip { padding: 3px 8px; font-size: 11.5px; flex: none; }
  .fhist .chip { flex: none; }
  .fhist { border-bottom: 1px dashed #C9CEDF; } .fhist .lb2 { font-size: 11.5px; font-weight: 800; color: #6B7394; }
  .chip.sm { padding: 3px 8px; font-size: 11.5px; font-weight: 500; border-width: 1px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fclr { all: unset; cursor: pointer; color: #9AA1BE; font-size: 12px; padding: 2px 6px; margin-left: auto; } .fclr:hover { color: #D0011B; }
  .fhead { font-size: 12.5px; font-weight: 800; color: #23305E; margin: 2px 2px 8px; } .fhead.alt { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #C9CEDF; }
  .fmore { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
  .otitle { font-size: 12px; color: #23305E; line-height: 1.35; margin-bottom: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ttcard { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 8px 12px 10px; padding: 9px 12px; border-radius: 12px; background: linear-gradient(90deg, #111 0%, #2B2B2B 100%); color: #fff; width: calc(100% - 24px); }
  .ttcard:hover { filter: brightness(1.15); }
.stores { margin: 8px 12px 6px; padding: 10px; border-radius: 14px; background: #fff; border: 1.5px solid #F1E3D3; }
.stores .sthd { font-size: 12.5px; font-weight: 800; color: #23305E; margin: 0 2px 8px; }
.strow { display: flex; gap: 8px; }
.stile { all: unset; box-sizing: border-box; cursor: pointer; flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 12px; transition: transform .15s, box-shadow .15s; }
.stile:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(35,48,94,.18); }
.stile:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
.stile .stt { display: flex; align-items: center; gap: 6px; } .stile .stt i { font-style: normal; font-size: 15px; } .stile .stt b { font-size: 13px; }
.stile .sth { font-size: 11.5px; font-weight: 700; opacity: .9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stile.sp { background: linear-gradient(135deg, #FF7A45 0%, #EE4D2D 100%); color: #fff; }
.stile.tt { background: linear-gradient(135deg, #1A1A1A 0%, #333 100%); color: #fff; } .stile.tt .sth { color: #25F4EE; opacity: 1; }
.stores .spaff { margin-top: 8px; } .ttcard:focus-visible { outline: 3px solid #25F4EE; }
  .ttcard .ttx { flex: 1; display: flex; flex-direction: column; min-width: 0; } .ttcard b { font-size: 13px; } .ttcard small { font-size: 11px; color: #C9CEDF; }
  .ttcard .tth { font-size: 12px; font-weight: 800; color: #25F4EE; white-space: nowrap; }
  .spcard { background: linear-gradient(90deg, #EE4D2D 0%, #FF7337 100%); margin-bottom: 0; } .spcard small { color: #FFE3D6 !important; } .spcard .tth { color: #fff; background: rgba(255,255,255,.18); padding: 3px 8px; border-radius: 999px; }
  .spcard:focus-visible { outline: 3px solid #FFD2C2; }
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
  .adstats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 2px 2px; }
  .adstats > div { border-radius: 14px; padding: 10px 12px; color: #fff; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 4px 12px rgba(0,0,0,.12); position: relative; overflow: hidden; }
  .adstats > div::after { content: ''; position: absolute; right: -18px; top: -18px; width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,.14); }
  .adstats .ads1 { background: linear-gradient(135deg, #FF5A5F, #C2185B); } .adstats .ads2 { background: linear-gradient(135deg, #2EC4A6, #1E7D6B); }
  .adstats b { font-size: 26px; font-weight: 900; line-height: 1.1; letter-spacing: -.5px; } .adstats span { font-size: 11px; font-weight: 700; opacity: .95; line-height: 1.3; }
  .adstats > div:only-child { grid-column: span 2; }
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
  .vtop .vhead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .vsub, .vtx { font-size: 11px; color: #6B7394; } .vtx { margin-top: 3px; line-height: 1.35; }
  .vtiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
  .vtile { border: 1.5px solid #EEF0F6; border-radius: 12px; padding: 8px 10px; background: #fff; display: flex; flex-direction: column; gap: 2px; }
  .vtile.win { border-color: #1E9E6F; background: #F2FBF6; }
  .vtile .vtn { font-size: 12px; font-weight: 700; color: #4A5272; }
  .vtile b { font-size: 18px; font-weight: 900; color: #23305E; } .vtile.win b { color: #1E7A5F; }
  .vtile .vqr { margin-top: 6px; padding: 6px 8px; font-size: 12px; }
  .vscan { width: 100%; margin-top: 8px; }
  .vwarn { margin-top: 8px; font-size: 12px; color: #C2410C; background: #FFF7ED; border-radius: 8px; padding: 6px 8px; line-height: 1.4; }
  .vfoot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #6B7394; }
  .vfoot .chip { padding: 3px 8px; font-size: 11.5px; }
  .vfold { margin: 8px 0 0; border: 1.5px solid #EEF0F6; border-radius: 12px; background: #fff; }
  .vfold summary { cursor: pointer; padding: 8px 12px; font-size: 13px; font-weight: 800; list-style: none; }
  .vfold summary::-webkit-details-marker { display: none; }
  .vfold summary::after { content: '▾'; float: right; color: #9AA1BE; } .vfold[open] summary::after { content: '▴'; }
  .vfb { padding: 0 12px 8px; } .vtip { font-size: 12.5px; padding: 5px 0; border-top: 1px dashed #EEF0F6; line-height: 1.4; }
  .vhrow { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; padding: 5px 0; border-top: 1px dashed #EEF0F6; }
  .vhrow b { font-weight: 800; white-space: nowrap; } .vhrow.ok b { color: #1E7A5F; } .vhrow.no b { color: #C2410C; }
  .vhrow .chip { padding: 3px 8px; font-size: 11.5px; }
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
  .idea .ih .acts2 { margin: 0 !important; gap: 0 !important; flex: none; } .idea .ih .acts2 button.ib { padding: 2px 4px !important; font-size: 12px !important; } .idea .ih .acts2 button.del { margin-left: 0 !important; }
  .idea .ih .lk { min-width: 0; flex: 1 1 auto; }
  .idea .cdot { all: unset; cursor: pointer; width: 12px; height: 12px; border-radius: 50%; flex: none; box-shadow: inset 0 0 0 1.5px rgba(0,0,0,.18); }
  .idea .cdot.c-none { background: #fff; box-shadow: inset 0 0 0 1.5px #C9CEDF; }
  .idea .cdot.c-yellow { background: #F2C230; } .idea .cdot.c-red { background: #E85D5D; } .idea .cdot.c-green { background: #2F9E7E; } .idea .cdot.c-blue { background: #2E7DD7; }
  .idea .cdot:hover { transform: scale(1.25); }
  .idea.c-yellow { background: #FFF8DA; border-color: #F2DA7A; border-left: 4px solid #F2C230; }
  .idea.c-red { background: #FFECEC; border-color: #F5B9B9; border-left: 4px solid #E85D5D; }
  .idea.c-green { background: #E9F7F1; border-color: #A9DDC8; border-left: 4px solid #2F9E7E; }
  .idea.c-blue { background: #EAF2FD; border-color: #A9C9F2; border-left: 4px solid #2E7DD7; }
  .idea .cdot.c-purple { background: #8B6FE0; } .idea .cdot.c-white { background: #fff; box-shadow: inset 0 0 0 1.5px #9AA1BE; } .idea .cdot.c-black { background: #22252C; box-shadow: inset 0 0 0 1.5px #555; }
  .idea.c-purple { background: #F2EDFF; border-color: #CDBDF5; border-left: 4px solid #8B6FE0; }
  .idea.c-white { background: #fff; border-color: #D5D9E6; border-left: 4px solid #9AA1BE; }
  .idea.c-black { background: #22252C; border-color: #3A3F4B; border-left: 4px solid #000; color: #EDEFF5; }
  .idea.c-black .nt, .idea.c-black .it2, .idea.c-black .ih, .idea.c-black .tm { color: #EDEFF5 !important; }
  .idea.c-black .ih .lk, .idea.c-black .lk { color: #9CC4FF !important; }
  .idea.c-black .no { background: #3A3F4B !important; color: #fff !important; }
  .idea.c-black .acts2 button { filter: invert(.85); }
  .idea.pgl { display: flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 12.5px; }
  .idea.pgl .no { font-weight: 800; color: #23305E; background: #EEF0F6; border-radius: 6px; padding: 0 5px; font-size: 11.5px; flex: none; }
  .idea.pgl .lk { all: unset; cursor: pointer; flex: 1; min-width: 0; color: #2E7DD7; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .idea.pgl .lk:hover { text-decoration: underline; }
  .idea.pgl .tm { font-size: 11px; color: #6B7394; white-space: nowrap; flex: none; }
  .idea.pgl .ib { all: unset; cursor: pointer; font-size: 12.5px; padding: 2px 5px; border-radius: 6px; opacity: .35; flex: none; }
  .idea.pgl:hover .ib { opacity: 1; } .idea.pgl .ib:hover { background: #F1F2F7; }
  .idea.pgl .ib.sure { opacity: 1; color: #fff; background: #E85D5D; font-size: 11.5px; }
  .idea .ih .stk { all: unset; cursor: pointer; font-size: 13px; line-height: 1; padding: 4px 6px; border-radius: 8px; background: #FFE680; box-shadow: 0 1px 3px rgba(217,142,31,.45); flex: none; transition: transform .12s; } .idea .ih .stk:hover { background: #FFD84D; transform: translateY(-1px) rotate(-6deg); } .idea .ih .stk:focus-visible { outline: 2px solid #23305E; }
  .ocrqa { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; } .ocrqa .chip { font-size: 12px; padding: 4px 10px; background: #EEF4FF; }
  .idea { padding: 8px 12px; margin: 6px 0; transition: border-color .12s; } .idea:hover { border-color: #C9CEDF; }
  .idea .ih .no { font-weight: 800; color: #23305E; background: #EEF0F6; border-radius: 6px; padding: 0 5px; }
  .idea .nt.empty { display: none; } .idea:hover .nt.empty { display: block; opacity: .5; font-size: 12px; font-weight: 600; }
  .idea .it2 { -webkit-line-clamp: 3 !important; margin: 4px 0 !important; color: #3A4470; }
  .idea .acts2 { opacity: .35; transition: opacity .12s; } .idea:hover .acts2, .idea .acts2:focus-within { opacity: 1; }
  .npf .cnt { margin-left: auto; font-size: 11.5px; color: #6B7394; }
  .idea .it2 { font-size: 13.5px; line-height: 1.5; margin: 6px 0; white-space: pre-wrap; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .idea.open .it2 { display: block; }
  .npj { display: flex; align-items: center; gap: 6px; margin: 6px 0 2px; font-size: 12px; color: #6B7394; font-weight: 700; }
  .npj select { flex: 1; min-width: 0; font: inherit; font-size: 12px; font-weight: 700; color: #23305E; background: #F4F6FB; border: 1px solid #DCE1EE; border-radius: 9px; padding: 4px 6px; cursor: pointer; }
  .npj.on select { background: #FFF6DE; border-color: #F2B544; } .npj.on { color: #B7791F; }
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
.idea { padding: 8px 10px; margin: 6px 0; }
.idea .it2 { -webkit-line-clamp: 3; margin: 4px 0; }
.idea .acts2 { flex-wrap: nowrap; align-items: center; gap: 4px; margin-top: 4px; }
.idea .acts2 button.ib { padding: 3px 7px; font-size: 13px; line-height: 1.2; border-color: transparent; }
.idea .acts2 button.ib:hover { border-color: #C9CEDF; }
.idea .acts2 button.del { margin-left: auto; opacity: .55; }
.idea .acts2 button.del:hover, .idea .acts2 button.del.sure { opacity: 1; }
.idea .acts2 button.del.sure { color: #fff; background: #E85D5D; border-color: #E85D5D; font-size: 12px; }
.idea .ih .no { flex: none; font-weight: 800; font-size: 11px; color: #fff; background: #23305E; border-radius: 6px; padding: 1px 6px; }
.idea .nt { all: unset; cursor: text; display: block; width: 100%; font-size: 14.5px; font-weight: 800; color: #23305E; line-height: 1.35; margin: 4px 0 0; word-break: break-word; }
.idea .nt:hover { color: #2E7DD7; } .idea .nt:focus-visible { outline: 2px solid #D98E1F; border-radius: 4px; }
.idea .nt.empty { font-size: 12px; font-weight: 600; color: #9AA1BE; }
.idea .it2.full { display: block !important; -webkit-line-clamp: unset !important; overflow: visible !important; }
.idea .fold { all: unset; display: inline-block; cursor: pointer; margin: -2px 0 4px; padding: 0 2px; font: 600 11.5px system-ui, sans-serif; color: #8A90A6; } .idea .fold:hover, .idea .fold:focus-visible { color: #23305E; } .idea .fold[hidden] { display: none; }
.idea .nti { width: 100%; box-sizing: border-box; margin: 4px 0 0; padding: 4px 8px; font-family: inherit; font-size: 14px; font-weight: 800; line-height: 1.35; color: #23305E; border: 1.5px solid #D98E1F; border-radius: 8px; outline: none; background: #fff; }
.idea .ai .tl { display: flex; gap: 6px; align-items: flex-start; }
.idea .ai .tl .cp { flex: 1; }
.idea .ai .tl .use { all: unset; cursor: pointer; flex: none; font-size: 11px; font-weight: 700; color: #2E7DD7; padding: 4px 2px; white-space: nowrap; }
.idea .ai .tl .use:hover { text-decoration: underline; }
.row.nbar { flex-wrap: nowrap; align-items: center; gap: 4px; }
.row.nbar .ic2 { width: 30px; height: 30px; font-size: 14px; }
.row.nbar input.grow { min-width: 0; flex: 1; }
.row.nbar .chip { padding: 4px 7px; font-size: 12px; flex: none; }
/* 1.9.91: thanh công cụ Note gọn, phẳng (không nền, không viền gạch) */
.row.nrow, .row.nbar { background: transparent; border-bottom: 0; padding: 6px 10px 2px; gap: 6px; flex-wrap: nowrap; align-items: center; }
.row.nbar { padding: 2px 10px 6px; border-bottom: 1px solid #EEF0F6; }
.row.nrow .mic { width: 30px; height: 30px; } .row.nrow .mic svg { width: 15px; height: 15px; }
.row.nrow input.grow, .row.nbar input.grow { flex: 1; min-width: 0; padding: 6px 10px; font-size: 13px; border-radius: 10px; }
.row.nrow .b { padding: 6px 12px; font-size: 13px; }
.row.nbar input.grow { background: #F5F6FA; border-color: transparent; }
.row.nbar input.grow:focus { background: #fff; border-color: #C9CEDF; }
.row.nbar .ic2 { all: unset; cursor: pointer; width: 28px; height: 28px; display: grid; place-items: center; font-size: 14px; border-radius: 8px; flex: none; }
.row.nbar .ic2:hover { background: #F1F2F7; }
.row.nrow .ic2 { all: unset; cursor: pointer; width: 30px; height: 30px; display: grid; place-items: center; font-size: 15px; border-radius: 50%; background: #F1F2F7; flex: none; }
.row.nrow .ic2:hover { background: #E6E8F0; }
.row.nrow { padding-bottom: 8px; border-bottom: 1px solid #EEF0F6; }
.pf.npf { align-items: center; padding: 5px 10px; }
.pf.npf .b { padding: 4px 10px; font-size: 12px; }
.pf.npf .cnt { margin-left: auto; font-size: 11.5px; color: #6B7394; }
  .mic { all: unset; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; background: #E85D5D; display: grid; place-items: center; flex: none; }
  .mic:focus-visible { outline: 3px solid #23305E; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .eyes, .pet .body { animation: none !important; } .sat, .links line { transition: none !important; } }
  /* 1.10.63 Thị trường: bảng giá chuyên nghiệp, xanh/đỏ trong ngày */
  .mkt-tabs { background: #EEF0F5; padding: 3px; border-radius: 999px; gap: 2px; }
  .mkt-t { background: transparent; color: #5B6280; padding: 6px 2px; }
  .mkt-t.on { background: #1F2A44; color: #fff; box-shadow: 0 1px 3px rgba(31,42,68,.25); } .mkt-t:not(.on):hover { background: #E2E5EE; }
  .gold { background: #fff; border: 1px solid #E4E7EF; padding: 2px 10px 6px; box-shadow: 0 1px 2px rgba(31,42,68,.05); }
  .g-row { grid-template-columns: 1.4fr 1fr 1fr 1.05fr; padding: 7px 0 7px 8px; border-bottom: 1px solid #F0F2F7; }
  .g-hd, .stk-hd, .cry-hd2 { font-size: 10px; letter-spacing: .05em; text-transform: uppercase; color: #8A90A6; font-weight: 800; padding: 7px 4px 6px 8px; border-bottom: 1px solid #E4E7EF; }
  .cry-hd2 span:not(:first-child) { text-align: right; } .stk-hd span:nth-child(3) { text-align: right; }
  .mk-nm { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
  .mk-nm b { font-weight: 800; color: #1F2A44; font-size: 13px; } .mk-nm small { font-size: 10px; color: #9AA1B5; font-weight: 600; }
  .mk-r { padding-left: 8px; box-shadow: inset 3px 0 0 transparent; }
  .mk-r.mk-up { box-shadow: inset 3px 0 0 #16A34A; } .mk-r.mk-dn { box-shadow: inset 3px 0 0 #DC2626; } .mk-r.mk-ref { box-shadow: inset 3px 0 0 #E0A400; }
  .gp, .stk .px, .cry .px { font-weight: 700; color: #1F2A44; font-variant-numeric: tabular-nums; }
  .gp.mk-up, .px.mk-up { color: #15803D; } .gp.mk-dn, .px.mk-dn { color: #DC2626; } .gp.mk-ref, .px.mk-ref { color: #B7791F; }
  .mk-ch { justify-self: end; display: inline-block; min-width: 60px; box-sizing: border-box; text-align: center; padding: 3px 7px; border-radius: 6px; font-size: 11.5px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .mk-ch.mk-up { background: #16A34A; color: #fff; } .mk-ch.mk-dn { background: #DC2626; color: #fff; } .mk-ch.mk-ref { background: #F6EED3; color: #8A6A00; }
  .stk { grid-template-columns: 50px 1fr auto 22px; padding-left: 8px; } .cry { padding-left: 8px; } .cry .px { text-align: right; }
  .gold .hold-ln { border-bottom: 1px solid #F0F2F7; padding-left: 8px; }
  .g-w { border-bottom: 1px solid #F0F2F7; }
  .g-ft { color: #8A90A6; padding: 6px 0 0 8px; }
  /* 1.10.65 cột ＋ cuối dòng */
  .g-row { grid-template-columns: 1.4fr 1fr 1fr 1.05fr 22px; }
  .stk { grid-template-columns: 46px 1fr auto 22px 20px; } .cry { grid-template-columns: 1fr auto auto 22px auto; gap: 8px; }
  .mk-add { all: unset; cursor: pointer; justify-self: center; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 6px; font-size: 13px; font-weight: 800; color: #8A90A6; }
  .mk-add:hover, .mk-add:focus-visible { background: #EEF0F5; color: #1F2A44; } .mk-add.on { background: #1F2A44; color: #fff; }
  /* 1.10.66 số thứ tự mỗi bảng */
  .gold, .body-list { counter-reset: mk; } .mk-r { counter-increment: mk; }
  .mk-r .mk-nm b::before, .stk.mk-r > .sym::before, .cry.mk-r > .sym::before { content: counter(mk); display: inline-block; min-width: 15px; height: 15px; line-height: 15px; margin-right: 6px; padding: 0 2px; box-sizing: border-box; border-radius: 4px; background: #EEF0F5; color: #5B6280; font-size: 9.5px; font-weight: 800; text-align: center; vertical-align: 1px; letter-spacing: 0; }
  .mk-r .mk-nm small { padding-left: 21px; }
  .stk { grid-template-columns: 62px 1fr auto 22px 20px; }
  /* 1.10.68 Thị trường: 1 cỡ chữ thống nhất, gọn, phẳng */
  .g-row, .stk, .cry { font-size: 12.5px; padding-top: 6px; padding-bottom: 6px; }
  .mk-nm b, .stk .sym, .cry .sym { font-size: 12.5px; font-weight: 700; color: #1F2A44; letter-spacing: 0; }
  .gp, .stk .px, .cry .px { font-size: 12.5px; font-weight: 700; }
  .mk-ch { font-size: 11px; font-weight: 700; padding: 2px 6px; min-width: 54px; border-radius: 5px; }
  .mk-r:has(+ .hold-wr), .mk-r:has(+ .hold-ln) { border-bottom: 0; padding-bottom: 2px; }
  .gold .hold-ln, .body-list .hold-ln { font-size: 11px; color: #6B7394; padding: 0 4px 6px 29px; border-bottom: 1px solid #F0F2F7; }
  .hold-wr { border-bottom: 1px solid #F0F2F7; } .hold-wr .hold-ln { border-bottom: 0 !important; }
  .hold-ln b { font-weight: 700; } .hold-ln b.up { color: #15803D; } .hold-ln b.down { color: #DC2626; }
  .hold-lk { font-size: 10px; opacity: .45; padding: 0 4px 4px; } .hold-lk:hover { background: #EEF0F5; opacity: 1; }
  .hold-tot, .gold .hold-tot { margin: 8px 0 4px; padding: 7px 10px; border-radius: 8px; background: #F5F6FA; border: 1px solid #E4E7EF; box-shadow: none; color: #5B6280; font-size: 11.5px; font-weight: 600; line-height: 1.45; }
  .hold-tot b { font-size: 11.5px; font-weight: 700; } .hold-tot b.up { color: #15803D; } .hold-tot b.down { color: #DC2626; }
  .cry-hd { background: #F5F6FA; color: #1F2A44; font-size: 11.5px; font-weight: 600; padding: 7px 10px; border-radius: 8px; border: 1px solid #E4E7EF; }
  .cry-hd:hover, .cry-hd:focus-visible { background: #EEF0F5; }
  .g-ft, .body-list .foot { font-size: 10px; color: #9AA1B5; }
  .hold-ed { padding-left: 29px; } .hold-lot, .hold-done { font-size: 11px; }
  /* 1.10.70 ô nhập giá mua: 1 hàng, cùng font, cùng chiều cao 28px */
  .hold-ed { padding: 2px 4px 8px 29px; border-bottom: 1px solid #F0F2F7; }
  .hold-lot { height: 24px; font-size: 12px; font-weight: 600; color: #1F2A44; padding: 0; }
  .hold-lot .ic { width: 22px; height: 22px; font-size: 12px; opacity: .5; } .hold-lot .ic:hover { opacity: 1; }
  .hold-add { flex-wrap: nowrap; gap: 6px; margin-top: 4px; }
  .hold-ed .hold-in, .hold-ed .hold-u, .hold-ed .hold-add .b { height: 28px; box-sizing: border-box; margin: 0; font-family: inherit; font-size: 12px; font-weight: 600; line-height: 26px; border-radius: 6px; }
  .hold-ed .hold-in { flex: 1 1 0; min-width: 0; padding: 0 8px; border: 1px solid #D5DAE6; color: #1F2A44; background: #fff; }
  .hold-ed .hold-in::placeholder { color: #9AA1B5; font-weight: 500; }
  .hold-ed .hold-in:focus { outline: none; border-color: #1F2A44; box-shadow: 0 0 0 2px rgba(31,42,68,.12); }
  .hold-ed .hold-u { flex: none; width: 62px; padding: 0 4px; border: 1px solid #D5DAE6; color: #1F2A44; background: #fff; }
  .hold-ed .hold-add .b { flex: none; padding: 0 12px; white-space: nowrap; background: #1F2A44; color: #fff; border: 0; }
  .hold-done { flex: none; display: inline-block; width: 24px; height: 28px; line-height: 28px; text-align: center; margin: 0; font-size: 12px; border-radius: 6px; opacity: .6; } .hold-done:hover { opacity: 1; background: #EEF0F5; }
  .hold-ed { padding-bottom: 6px; } .hold-ed .hold-u { width: 56px; }
  .hold-ed .hold-in::-webkit-inner-spin-button, .hold-ed .hold-in::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .hold-ed .hold-in { -moz-appearance: textfield; } .hold-ed .hold-u { width: 52px; } .hold-ed .hold-add .b { padding: 0 10px; }
  /* 1.10.73 thêm ô ngày mua – vẫn 1 hàng */
  .hold-ed { padding-left: 8px; } .hold-add { gap: 5px; }
  .hold-ed .hold-dt { flex: 0 0 66px; padding: 0 6px; text-align: center; } .hold-ed .hold-dt.bad { border-color: #DC2626; }
  .hold-ed .hold-u { width: 48px; } .hold-ed .hold-add .b { min-width: 30px; padding: 0 9px; font-size: 13px; }
  .hold-lot { padding-left: 2px; }
  .gold { padding-bottom: 2px; margin-bottom: 6px; } .gold > .hold-tot:last-child { margin-bottom: 6px; }
  /* 1.10.77 form cảnh báo: cùng chiều cao 28px như ô nhập giá mua */
  .mk-al select, .mk-al input, .mk-al .b, .body-list .cry-add select, .body-list .cry-add input, .body-list .cry-add .b { height: 28px; box-sizing: border-box; font-family: inherit; font-size: 12px; font-weight: 600; border-radius: 6px; }
  .mk-al select, .mk-al input, .body-list .cry-add select, .body-list .cry-add input { padding: 0 6px; border: 1px solid #D5DAE6; background: #fff; color: #1F2A44; }
  .mk-al .b, .body-list .cry-add .b { padding: 0 12px; line-height: 28px; background: #1F2A44; color: #fff; border: 0; }
  .gold .cry-hd { margin: 4px 0 6px; }
  /* 1.10.78 Thị trường – 1 hệ cỡ chữ & chiều cao: chữ chính 12px · chữ phụ 10.5px · tiêu đề cột 10px · mọi ô/nút/thanh 28px */
  .mkt-tabs { padding: 2px; } .mkt-t { height: 28px; line-height: 28px; padding: 0 4px; font-size: 12px; font-weight: 700; }
  .cry-add { gap: 6px; align-items: center; }
  .cry-add select, .cry-add input, .cry-add .b { height: 28px !important; box-sizing: border-box; margin: 0; font-family: inherit; font-size: 12px !important; font-weight: 600; border-radius: 6px !important; }
  .cry-add select, .cry-add input { padding: 0 8px !important; border: 1px solid #D5DAE6 !important; background: #fff; color: #1F2A44; box-shadow: none !important; }
  .cry-add input::placeholder { color: #9AA1B5; font-weight: 500; }
  .cry-add .b { padding: 0 12px !important; line-height: 28px !important; background: #1F2A44 !important; color: #fff !important; border: 0 !important; min-width: 28px; }
  .g-row, .stk, .cry { font-size: 12px; }
  .mk-nm b, .stk .sym, .cry .sym, .gp, .stk .px, .cry .px { font-size: 12px; }
  .mk-nm small, .gold .hold-ln, .body-list .hold-ln, .g-ft, .body-list .foot { font-size: 10.5px; }
  .mk-ch { font-size: 11px; height: 20px; line-height: 20px; padding: 0 6px; }
  .hold-tot, .gold .hold-tot, .cry-hd { display: flex; align-items: center; min-height: 28px; height: auto; padding: 0 10px; font-size: 12px; font-weight: 600; line-height: 1.3; border-radius: 6px; box-sizing: border-box; }
  .hold-tot b, .hold-tot span { font-size: 12px; }
  .hold-tot span { font-weight: 800; color: #1D4ED8; } .hold-tot b { font-weight: 800; }   /* 1.10.79 dòng Vốn · Hiện in đậm xanh */
  /* 1.10.82 quy chuẩn: 3 tab cùng 1 thẻ trắng, cột cố định thẳng hàng, bỏ màu mè */
  .gold { margin-left: 10px !important; margin-right: 10px !important; padding: 2px 10px 4px !important; }
  .body-list.mk-list { flex: 0 1 auto; margin: 0 10px 6px; padding: 2px 10px 4px; background: #fff; border: 1px solid #E4E7EF; border-radius: 12px; box-shadow: 0 1px 2px rgba(31,42,68,.05); }
  .cry-add.row { padding: 0 10px 8px; border-bottom: 0; } .stk-add select { flex: 1 1 auto; max-width: none; } .cry-add .grow { flex: 1 1 auto; min-width: 0; }
  .mk-r, .mk-r.mk-up, .mk-r.mk-dn, .mk-r.mk-ref { box-shadow: none !important; padding-left: 0 !important; }
  .g-hd, .stk-hd, .cry-hd2 { padding-left: 0 !important; }
  .g-row { grid-template-columns: minmax(0, 1fr) 62px 62px 76px 20px !important; gap: 6px !important; }
  .stk { grid-template-columns: minmax(0, 1fr) 64px 104px 20px 20px !important; gap: 6px !important; }
  .cry { grid-template-columns: minmax(0, 1fr) 84px 64px 20px 20px !important; gap: 6px !important; }
  .g-hd span:nth-child(2), .g-hd span:nth-child(3), .stk-hd span:nth-child(2), .cry-hd2 span:nth-child(2) { text-align: right !important; }
  .g-hd span:nth-child(4), .stk-hd span:nth-child(3), .cry-hd2 span:nth-child(3) { text-align: center !important; }
  .gp, .stk .px, .cry .px { text-align: right; }
  .mk-ch { width: 100%; min-width: 0 !important; justify-self: stretch; }
  .gp.mk-ref, .px.mk-ref { color: #1F2A44 !important; } .mk-ch.mk-ref { background: #F1F2F6 !important; color: #6B7394 !important; }
  .mk-r .mk-nm b::before, .stk.mk-r > .sym::before, .cry.mk-r > .sym::before { background: none !important; color: #9AA1B5 !important; min-width: 12px !important; margin-right: 4px !important; padding: 0 !important; text-align: left !important; }
  .mk-r .mk-nm small { padding-left: 16px !important; }
  .gold .hold-ln, .body-list .hold-ln { padding-left: 16px !important; }
  .g-ft.g-ft-end { display: flex; justify-content: center; padding: 2px 0 0 !important; margin: 0 !important; font-size: 10px !important; line-height: 16px; color: #9AA1B5; text-align: center; border: 0; }
  .g-ft-end .g-rf { font-size: 11px; padding: 0 4px; }
  /* 1.10.99 thẳng cột tuyệt đối: mọi dòng (giá, giá mua, tổng) cùng lề trái/phải = 0, cùng cỡ chữ 12px */
  .g-row, .stk, .cry, .hold-row, .tot-row { padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important; box-sizing: border-box; width: 100%; }
  .hold-row, .hold-row .hr-v, .hold-row .hr-lab, .hold-row .mk-ch, .tot-row, .tot-row .hr-v, .tot-row .hr-lab, .tot-row .mk-ch { font-size: 12px !important; line-height: 18px; }
  .g-row > *, .stk > *, .cry > * { min-width: 0; }
  .gp, .px, .hr-v, .mk-ch { justify-self: stretch; text-align: right !important; font-variant-numeric: tabular-nums; }
  .tot-row { background: #EFF6FF; box-shadow: -6px 0 0 #EFF6FF, 6px 0 0 #EFF6FF; border-radius: 0; padding-top: 6px !important; padding-bottom: 6px !important; }
  .tot-row { padding-top: 7px !important; padding-bottom: 7px !important; line-height: normal; }
  .tot-row .mk-nm b { color: #1D4ED8 !important; font-size: 12px !important; font-weight: 800; white-space: nowrap; }
  .tot-row .mk-nm b::before { content: none !important; } .tot-row .mk-nm small { padding-left: 0 !important; color: #6B7394; font-size: 10.5px !important; }
  .tot-row .tot-lab { padding-left: 16px !important; }
  /* 1.10.85 ô ± bỏ nền: chỉ chữ màu như cột giá */
  .mk-ch, .mk-ch.mk-up, .mk-ch.mk-dn, .mk-ch.mk-ref { background: none !important; padding: 0 !important; text-align: right !important; font-size: 12px !important; font-weight: 700 !important; height: auto !important; line-height: inherit !important; }
  .mk-ch.mk-up { color: #15803D !important; } .mk-ch.mk-dn { color: #DC2626 !important; } .mk-ch.mk-ref { color: #8A90A6 !important; }
  .g-hd span:nth-child(4), .stk-hd span:nth-child(3), .cry-hd2 span:nth-child(3) { text-align: right !important; }
  /* 1.10.86 cột chuẩn: Tên · Đơn vị · Giá… · % · ＋ (· ✕) – 3 mục cùng độ rộng cột */
  .g-row { grid-template-columns: minmax(0, 1fr) 40px 46px 46px 58px 16px !important; gap: 4px !important; }
  .stk { grid-template-columns: minmax(0, 1fr) 40px 46px 40px 58px 16px 16px !important; gap: 4px !important; }
  .cry { grid-template-columns: minmax(0, 1fr) 40px 64px 58px 16px 16px !important; gap: 4px !important; }
  .gu { font-size: 10.5px; color: #8A90A6; text-align: center; white-space: nowrap; }
  .g-hd span, .stk-hd span, .cry-hd2 span { text-align: right !important; white-space: nowrap; } .g-hd, .stk-hd, .cry-hd2 { letter-spacing: 0 !important; }
  .g-hd span:nth-child(1), .stk-hd span:nth-child(1), .cry-hd2 span:nth-child(1) { text-align: left !important; }
  .g-hd span:nth-child(2), .stk-hd span:nth-child(2), .cry-hd2 span:nth-child(2) { text-align: center !important; }
  .gp, .stk .px, .cry .px, .mk-ch { text-align: right !important; white-space: nowrap; }
  .cry .err2 { grid-column: 3 / 5; }
  .mk-add, .stk .ic, .cry .ic { width: 16px !important; height: 20px; padding: 0 !important; justify-self: center; }
  /* 1.10.89 dòng giá mua đúng cột */
  .hold-row { cursor: pointer; padding: 0 0 6px !important; font-size: 11px !important; color: #6B7394; border-bottom: 1px solid #F0F2F7; align-items: center; }
  .hold-row.locked { cursor: default; }
  .hold-row .hr-lab { padding-left: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #6B7394; font-weight: 600; }
  .hold-row .hr-v { text-align: right; white-space: nowrap; font-weight: 600; color: #4B5470; font-variant-numeric: tabular-nums; }
  .hold-row .hr-v.mk-up { color: #15803D; } .hold-row .hr-v.mk-dn { color: #DC2626; }
  .hold-row .mk-ch { font-size: 11px !important; }
  .hold-row .hold-lk { justify-self: center; width: 16px; padding: 0; font-size: 10px; }
  .mk-r:has(+ .hold-row) { border-bottom: 0 !important; padding-bottom: 2px !important; }
  .tot-row { cursor: default; margin-top: 2px; padding: 7px 0 !important; border-top: 1px solid #E4E7EF; border-bottom: 1px solid #E4E7EF; font-size: 12px !important; }
  .tot-row .hr-lab { padding-left: 0; color: #1D4ED8; font-weight: 800; } .tot-row .hr-v { color: #1D4ED8; font-weight: 800; } .tot-row .hr-v.mk-up { color: #15803D; } .tot-row .hr-v.mk-dn { color: #DC2626; }
  .tot-row .mk-ch { font-size: 12px !important; font-weight: 800 !important; }
  .tot-row .tot-lab { grid-column: span 2; overflow: visible; padding-left: 16px !important; }   /* thẳng hàng với tên SJC/Nhẫn (sau cột số thứ tự) */
  /* 1.10.96 chuẩn Vàng cho cả 3 mục: Tên · Đơn vị · Mua · Bán · % · ＋ ; ✕ nằm cuối ô tên, hiện khi rê chuột */
  .g-row, .stk, .cry { grid-template-columns: minmax(0, 1fr) 34px 50px 50px 64px 16px !important; gap: 4px !important; }   /* 1.10.100: cột % rộng đủ '▲ 13,44%' để không tràn lệch */
  .nmc { display: flex; align-items: center; justify-content: space-between; min-width: 0; gap: 2px; }
  .nmc .ic { flex: none; width: 16px !important; opacity: 0; transition: opacity .15s; } .mk-r:hover .nmc .ic, .nmc .ic:focus-visible { opacity: .6; }
  .stk.mk-r .nmc > .sym::before, .cry.mk-r .nmc > .sym::before { content: counter(mk); display: inline-block; min-width: 12px; margin-right: 4px; color: #9AA1B5; font-size: 9.5px; font-weight: 800; }
  .cry .err2 { grid-column: 3 / 6 !important; }
  .tot-row { background: #EFF6FF; border: 0 !important; border-radius: 6px; margin: 4px -6px 2px; padding: 7px 6px !important; }   /* 1.10.94 nền xanh nhẹ */
  /* 1.10.102 dòng Tổng: bỏ lề âm (làm lệch cột) – cột trùng khít dòng giá; nền xanh tràn 6px bằng box-shadow */
  .tot-row { margin: 4px 0 2px !important; padding: 7px 0 !important; width: 100% !important; border-radius: 0 !important; box-shadow: -6px 0 0 #EFF6FF, 6px 0 0 #EFF6FF !important; }
  .tot-row .mk-nm small { color: #1D4ED8 !important; font-weight: 700; }
  /* 1.10.108 Soi sản phẩm – 1 hàng / món, gọn */
  .spy-key { margin: 4px 0 8px; } .spy-kt { all: unset; cursor: pointer; font-size: 11.5px; color: #8A90A6; } .spy-kt:hover { color: #1F2A44; }
  .spy-kf { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; } .spy-kf .hold-in { height: 28px; box-sizing: border-box; padding: 0 8px; border: 1px solid #D5DAE6; border-radius: 6px; font: inherit; font-size: 12px; }
  .spy-kf .b { height: 28px; } .spy-kn { font-size: 10.5px; color: #9AA1B5; margin-top: 4px; }
  .spy-tabs { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin: 2px 0 6px; } .spy-sp { flex: 1; }
  .spy-row { all: unset; cursor: pointer; display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 8px; align-items: center; width: 100%; box-sizing: border-box; padding: 6px 2px; border-bottom: 1px solid #F0F2F7; font-size: 12px; }
  .spy-row:hover { background: #F7F8FB; } .spy-row img, .spy-noimg { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; background: #F1F2F6; display: grid; place-items: center; }
  .spy-mid { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .spy-t { font-weight: 600; color: #1F2A44; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .spy-m { display: flex; gap: 6px; font-size: 10.5px; color: #8A90A6; overflow: hidden; white-space: nowrap; }
  .spy-src { font-style: normal; font-weight: 800; } .spy-src.shopee { color: #EE4D2D; } .spy-src.tiktok { color: #111; }
  .spy-r { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; font-variant-numeric: tabular-nums; }
  .spy-r b { font-size: 12px; color: #1F2A44; } .spy-r s { font-size: 10px; color: #A0A7B8; } .spy-off { font-size: 10.5px; color: #DC2626; font-weight: 700; } .spy-hh { font-size: 10.5px; color: #15803D; font-weight: 700; }
.spy-none{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 8px;font-size:12px;color:#64748b}.spy-none .chip{flex:none}
  /* 1.10.148 ô tìm gọn + 2 nút kính lúp Shopee / TikTok */
  .fbox .fb-ic { all: unset; cursor: pointer; flex: none; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; width: 44px; height: 36px; border-radius: 10px; font-size: 13px; line-height: 1; }
  .fbox .fb-ic b { font-size: 9.5px; font-weight: 800; }
  .fbox .fb-ic.sp { background: #FFF1EC; color: #EE4D2D; } .fbox .fb-ic.tt { background: #F1F1F3; color: #111; }
  .fbox .fb-ic:hover { filter: brightness(.96); } .fbox .fb-ic:focus-visible { outline: 2px solid #23305E; outline-offset: 2px; }
  .fbox { gap: 6px; } .fbox input.grow { min-width: 0; }
  /* 1.10.150: ô tìm 1/2, 2 nút kính lúp chia đều 1/2 còn lại */
  .fbox input.grow { flex: 1 1 auto !important; width: auto; }
  .fbox .fb-ic { flex: 0 0 96px; width: auto; flex-direction: row; gap: 4px; font-size: 13px; }
  .fbox .fb-ic b { font-size: 12px; }
  /* 1.10.152 Cửa hàng HaoHao gọn 1 hàng + nút 🔍 Shopee nền cam */
  .hotv { margin: 6px 12px; padding: 8px 10px; border-radius: 12px; background: #FFF7F3; border: 1px solid #FBD5C8; }
  .hotv .hvh { display: flex; align-items: center; gap: 6px; font: 800 12.5px system-ui; color: #C2410C; } .hotv .hvh em { font-style: normal; font-size: 10.5px; background: #EE4D2D; color: #fff; border-radius: 6px; padding: 1px 6px; }
  .hotv .hvr { display: flex; align-items: center; gap: 8px; margin-top: 6px; } .hotv .hvr span { flex: 1; min-width: 0; font-size: 12px; color: #1F2A44; } .hotv .hvr small { display: block; color: #94A3B8; font-size: 10.5px; }
  .hotv .hvr button { all: unset; cursor: pointer; font: 800 11px system-ui; padding: 4px 10px; border-radius: 999px; background: #EE4D2D; color: #fff; white-space: nowrap; } .hotv .hvr button.tt { background: #111; }
  .hotv .hvlive { all: unset; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 7px 10px; border-radius: 10px; background: #FEE2E2; border: 1.5px solid #F87171; color: #B91C1C; font: 700 12px/1.35 system-ui; } .hotv .hvlive span { flex: 1; } .hotv .hvlive b { flex: none; padding: 4px 10px; border-radius: 999px; background: #EE4D2D; color: #fff; font: 800 11.5px system-ui; } .hotv .hvlive:hover { filter: brightness(.98); }
  .svsec { all: unset; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%; box-sizing: border-box; margin: 8px 0 2px; padding: 6px 4px; border-bottom: 1px solid #E3E6F0; font: 800 13px system-ui; color: #23305E; }
  .svsec em { font-style: normal; font-size: 11px; color: #6B7394; font-weight: 700; } .svsec span { flex: none; } .svsec b { margin-left: auto; font-size: 11px; color: #2E7DD7; }
  .flwb .flwadd { display: flex; align-items: center; gap: 6px; margin: 6px 0; } .flwb .flwcur { flex: 1; min-width: 0; font: 700 12px system-ui; color: #23305E; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .flwb .flwi { flex: 1; min-width: 0; padding: 6px 9px; border: 1px solid #E3E6F0; border-radius: 8px; font: 12px system-ui; background: #fff; color: #1F2A44; }
  .flwb .flc { display: flex; align-items: center; gap: 6px; margin-top: 5px; font-size: 12px; color: #15803D; font-weight: 600; } .flwb .flc span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .flwb .flc button { all: unset; cursor: pointer; font: 800 10.5px system-ui; padding: 2px 8px; border-radius: 999px; background: #EE4D2D; color: #fff; white-space: nowrap; }
  .flwb .flmore { all: unset; cursor: pointer; display: block; margin-top: 5px; font: 700 11.5px system-ui; color: #2E7DD7; }
  .hotv .hvgo { all: unset; cursor: pointer; display: inline-block; margin-top: 7px; padding: 5px 12px; border-radius: 999px; background: #EE4D2D; color: #fff; font: 800 12px system-ui; } .hotv .hvgo:hover { filter: brightness(1.07); }
  .hotv .hvm, .hotv .hvw { all: unset; cursor: pointer; display: block; margin-top: 6px; font-size: 11px; font-weight: 700; color: #64748B; } .hotv .hvw.soon { color: #DC2626; }
  .hotv > small { display: block; margin-top: 3px; font-size: 11.5px; color: #64748B; line-height: 1.4; }
  .hvl { display: flex; align-items: center; gap: 8px; margin-top: 5px; padding: 6px 8px; border-radius: 9px; background: #fff; border: 1px solid #FBD5C8; }
  .hvl span { flex: 1; min-width: 0; font: 600 12px/1.35 system-ui; color: #111; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.hvl span b { font-weight: 800; color: #111; }
.hvl span i { font-style: normal; color: #334155; }
.hvl span em { font-style: normal; font-weight: 800; color: #16A34A; }
  .hvl button { all: unset; cursor: pointer; flex: none; font: 800 10.5px system-ui; padding: 3px 9px; border-radius: 999px; background: #EE4D2D; color: #fff; } .hvl button.tt { background: #111; }
  .hvg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
  .hvg .hvc { min-width: 0; padding: 6px 8px; border-radius: 9px; background: #fff; border: 1px solid #FBD5C8; font-size: 12px; font-weight: 700; color: #1F2A44; line-height: 1.3; }
  .hvg .hvc small { display: block; font-weight: 500; font-size: 10.5px; color: #94A3B8; margin-top: 2px; } .hvg .hvc.soon { border-color: #FCA5A5; background: #FEF2F2; color: #DC2626; } .hvg .hvc.soon small { color: #DC2626; }
  .hvg .hvc button { all: unset; cursor: pointer; display: inline-block; margin-top: 4px; font: 800 10.5px system-ui; padding: 2px 8px; border-radius: 999px; background: #EE4D2D; color: #fff; } .hvg .hvc button.tt { background: #111; }
  .stores.mini { display: flex; align-items: center; gap: 6px; margin: 6px 12px; padding: 6px 8px; border-radius: 12px; }
  .stores.mini .sthd { margin: 0 auto 0 2px; font-size: 12px; white-space: nowrap; }
  .stores.mini .stile { flex: 0 0 auto; flex-direction: row; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px; }
  .stores.mini .stile i { font-style: normal; font-size: 13px; } .stores.mini .stile b { font-size: 12px; white-space: nowrap; }
  .fbox .fb-ic.sp { background: linear-gradient(135deg, #FF7A45 0%, #EE4D2D 100%) !important; color: #fff !important; }
  .dqr { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 8px; border: 1px dashed #F5B7A6; border-radius: 10px; background: #FFF7F3; cursor: zoom-in; }
  .dqr img { width: 128px; height: 128px; flex: none; border-radius: 6px; background: #fff; image-rendering: pixelated; }
  .dqr b { display: block; font-size: 12.5px; color: #EE4D2D; } .dqr small { display: block; font-size: 11px; color: #64748B; margin-top: 2px; line-height: 1.35; }
  .dapp { all: unset; cursor: pointer; display: block; margin-top: 6px; font-size: 11.5px; font-weight: 600; color: #475569; } .dapp:hover { color: #EE4D2D; }
  /* 1.10.159 nút Kiểm tra trong khung đánh giá */
  .tb-ck { all: unset; cursor: pointer; display: inline-block; margin-top: 6px; padding: 5px 10px; border-radius: 999px; background: #2E7DD7; color: #fff; font: 800 11.5px/1 inherit; }
  .tb-ck:hover { filter: brightness(1.08); }
  /* 1.10.158 đã bán · lời chê */
  .tb-sold { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; margin: 6px 0 2px; padding: 6px 9px; border-radius: 10px; font-size: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; }
  .tb-sold b { color: #1F2A44; font-size: 12px; } .tb-sold span { font-weight: 700; }
  .tb-sold.good span { color: #047857; } .tb-sold.ok span { color: #2563EB; } .tb-sold.warn span { color: #B45309; } .tb-sold.bad span { color: #B91C1C; } .tb-sold.na span { color: #64748B; }
  .tb-sold.good b, .tb-sold.ok b, .tb-sold.good span, .tb-sold.ok span { color: #15803D; font-weight: 800; } .tb-sold.warn b { color: #B45309; } .tb-sold.bad b { color: #B91C1C; }
  .tb-rv.good .tb-q { color: #15803D; font-weight: 600; }   /* 1.10.220: chữ xanh lá dễ đọc */
  /* 1.10.157 gợi ý size gọn trong bong bóng */
  .szq { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 6px 0 2px; padding: 7px 9px; border-radius: 10px; background: #F5F3FF; border: 1px solid #DDD6FE; font-size: 12px; }
  .szq.inpanel { margin: 8px 0; }
  .szq-t { flex: 1 1 100%; font-weight: 700; color: #4C1D95; line-height: 1.35; }
  .szq-a { display: flex; gap: 5px; flex-wrap: wrap; }
  .szq-go { all: unset; cursor: pointer; font-weight: 800; color: #5B21B6; font-size: 12.5px; }
  .szq .szf input { width: 46px; }
  /* 1.10.154 lời chê gom nhóm, gợi ý size */
  .tb-grp { font-size: 12px; font-weight: 700; color: #B91C1C; margin: 3px 0 2px; line-height: 1.4; }
  .szb { margin: 8px 0; padding: 9px 10px; border: 1px solid #E2E8F0; border-radius: 10px; background: #fff; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; }
  .szf { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: #64748B; }
  .szf input { width: 52px; padding: 5px 6px; border: 1px solid #CBD5E1; border-radius: 8px; font: inherit; color: #1F2A44; }
  .szr { font-size: 12.5px; color: #1F2A44; font-weight: 600; }
  /* 1.10.127 Mở khoá Tiện ích */
  .unl { padding: 12px 10px; display: flex; flex-direction: column; gap: 8px; }
  .pro-lock { padding: 14px 12px; display: flex; flex-direction: column; gap: 10px; text-align: center; }
  .pro-t { font-size: 17px; font-weight: 800; color: #23305E; } .pro-s { font-size: 12.5px; color: #4A5275; line-height: 1.5; }
  .pro-plans { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .pro-pl { background: #fff; border: 1.5px solid #E3E7F2; border-radius: 10px; padding: 7px 2px; display: flex; flex-direction: column; gap: 2px; }
  .pro-pl b { font-size: 11px; color: #23305E; } .pro-pl span { font-size: 11.5px; font-weight: 800; color: #D98E1F; }
  .pro-pl.hot { border-color: #F2B544; background: #FFF6DE; }
  .pro-n { font-size: 11px; color: #8A91AE; }
  .pro-trial { all: unset; cursor: pointer; display: block; margin: 6px 12px 0; padding: 6px 10px; border-radius: 10px; background: #FFF6DE; color: #B7791F; font-size: 11.5px; font-weight: 700; text-align: center; }
  .unl-t { font: 800 15px/1.3 inherit; color: #1F2A44; text-align: center; }
  .unl-s { font-size: 12px; color: #64748B; text-align: center; line-height: 1.45; margin-bottom: 4px; }
  .unl-r { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 12px; border: 1px solid #E2E8F0; border-radius: 12px; background: #fff; cursor: pointer; font: inherit; color: #1F2A44; }
  .unl-r:hover { border-color: #F2A71B; }
  .unl-r.ok { background: #F0FDF4; border-color: #BBF7D0; }
  .unl-n { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: #FFF4DB; color: #B26B00; font: 800 13px/1 inherit; }
  .unl-r.ok .unl-n { background: #16A34A; color: #fff; }
  .unl-x { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; } .unl-x b { font-size: 13px; } .unl-x small { font-size: 11px; color: #8A90A6; }
  .unl-go { flex: none; font-size: 11.5px; font-weight: 700; color: #B26B00; } .unl-r.ok .unl-go { color: #16A34A; }
  .unl-go-all { margin-top: 4px; padding: 12px; border: 0; border-radius: 12px; background: linear-gradient(180deg, #FFD15C, #F2A71B); color: #3A2A00; font: 800 14px/1 inherit; cursor: pointer; box-shadow: 0 3px 0 #C9820A; }
  .unl-go-all.off { background: #E5E7EB; color: #6B7280; box-shadow: none; cursor: default; }
  .unl-n2 { font-size: 10.5px; color: #94A3B8; text-align: center; }
  .unl-later { border: 0; background: none; color: #94A3B8; font: 600 12px/1 inherit; cursor: pointer; padding: 4px; }
  .unl-pv { display: flex; align-items: center; gap: 6px; } .unl-pv .tb-back { margin-right: auto; }
  /* 1.10.115 Mua không hớ: khung nhận xét giá */
  .ptb { display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin: 0 0 8px; border-radius: 10px; background: #F1F5F9; border: 1px solid #E2E8F0; }
  .ptb.inb { margin: 6px 0 4px; padding: 6px 9px; }
  .ptb.inb b { font-size: 12px; } .ptb.inb small { font-size: 10.5px; }
  .ptb .ptx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .ptb b { font-size: 12.5px; color: #1F2A44; } .ptb small { font-size: 11px; color: #64748B; line-height: 1.35; }
  .ptb.good { background: #ECFDF5; border-color: #A7F3D0; } .ptb.good b { color: #047857; }
  .ptb.bad { background: #FEF2F2; border-color: #FECACA; } .ptb.bad b { color: #B91C1C; }
  .ptb.warn { background: #FFFBEB; border-color: #FDE68A; } .ptb.warn b { color: #B45309; }
  .ptw { flex: none; border: 1px solid #CBD5E1; background: #fff; color: #1F2A44; font: 700 11.5px/1 inherit; padding: 6px 9px; border-radius: 999px; cursor: pointer; white-space: nowrap; }
  .ptw.on { background: #1F2A44; color: #fff; border-color: #1F2A44; }
  /* 1.10.103 thẻ Vàng cuộn được khi mở Cảnh báo giá (trước đây bị cắt, không kéo xuống được) */
  .gold { flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .hold-tot { gap: 4px; flex-wrap: nowrap; white-space: nowrap; overflow: hidden; } .mk-nm b, .stk .sym, .cry .sym { font-weight: 800 !important; }
  .hold-tot { margin: 6px 0 6px; } .cry-hd { margin: 0 0 6px; width: 100%; }
  .hold-ed .hold-in, .hold-ed .hold-u, .hold-ed .hold-add .b, .mk-al select, .mk-al input, .mk-al .b { font-size: 12px; }
  .hold-lot { font-size: 12px; } .gold > .hold-tot + .cry-hd { margin-top: 0; } .gold .mk-al { padding: 0 0 6px !important; }
  .gold { margin-bottom: 4px !important; } .gold .g-ft.g-ft-end { padding: 0 0 2px !important; margin: -2px 0 0 !important; font-size: 10px !important; line-height: 16px; }
  .gold .g-ft-end .g-rf { font-size: 11px; padding: 0 4px; }
  .g-ft.g-ft-end { justify-content: center; padding: 8px 0 0; margin-top: 2px; } .g-ft-end .g-rf { margin-left: 4px; }
  .g-row.g-hd, .stk.stk-hd, .cry.cry-hd2 { font-size: 10px; padding-top: 7px; padding-bottom: 6px; white-space: nowrap; } .g-rf { color: #5B6280; } .g-rf:hover { background: #EEF0F5; }
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
    const storeBtn = `<button class="storebtn" aria-label="Mở HaoHao Store trên Shopee" tabindex="-1" hidden>🧡 HaoHao Store</button>`;
    const sats = BRANCHES.map(b => `<button class="sat" data-b="${b.id}" style="--c:${b.color}" aria-label="Mở ${b.label}" tabindex="-1">
        <svg viewBox="0 0 24 24" aria-hidden="true">${b.menuIcon || b.icon}</svg><b>${b.label}</b><span class="n" hidden></span></button>`).join('');
    const tabs = BRANCHES.map(b => `<button role="tab" data-t="${b.id}" style="--c:${b.color}" title="${b.label}" aria-label="${b.label}"><svg viewBox="0 0 24 24" aria-hidden="true">${b.icon}</svg><span>${b.label}</span></button>`).join('');
    root.innerHTML = `<style>${CSS}</style>
      <div class="wrap">
        <svg class="links" aria-hidden="true">${BRANCHES.map(b => `<line style="stroke:${b.color}"/>`).join('')}${TOOLS.map(t => `<line class="sub" style="stroke:${t.color}"/>`).join('')}${BRANCHES.map(b => `<circle class="d0" style="fill:${b.color}"/><circle class="d1" style="fill:${b.color}"/>`).join('')}</svg>
        ${TOOLS.map(t => `<button class="sat child" data-tool="${t.id}" style="--c:${t.color}" aria-label="Mở tiện ích ${t.label}" tabindex="-1"><svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg><b>${t.label}</b></button>`).join('')}
        ${sats}
        ${storeBtn}
        <div class="bubble" hidden role="status"></div>
        <div class="panel" hidden role="dialog" aria-label="HaoHao">
          <div class="tabs" role="tablist">${tabs}<button class="big" aria-label="Phóng to hoặc thu nhỏ bảng" title="Phóng to / thu nhỏ">⤢</button><button class="x" aria-label="Đóng">✕</button></div>
          <div class="view"></div>
        </div>
        <button class="pomo-pill" hidden></button>
        <div class="mus-bar" hidden role="group" aria-label="Nhạc nền đang phát"></div>
        <button class="pet" aria-label="HaoHao, bấm để mở các nhánh. Bấm giữ để ghi chú bằng giọng nói" aria-expanded="false">${PET_SVG}<span class="badge" hidden></span></button>
      </div>`;
    document.documentElement.appendChild(host);
    ui = { host, root, pill: root.querySelector('.pomo-pill'), mus: root.querySelector('.mus-bar'), wrap: root.querySelector('.wrap'), pet: root.querySelector('.pet'), badge: root.querySelector('.badge'),
           bubble: root.querySelector('.bubble'), panel: root.querySelector('.panel'), view: root.querySelector('.view') };
    placeWrap();
    setupDrag();
    const sb = root.querySelector('.storebtn');
    sb.addEventListener('click', () => { toggleMenu(false); if (HT.SP.showcase) openDeal(HT.SP.showcase); });
    ui.panel.addEventListener('dragover', e => { return; if ([...(e.dataTransfer && e.dataTransfer.items || [])].some(i => i.kind === 'file' && /^image\//.test(i.type))) { e.preventDefault(); ui.panel.classList.add('drop'); } });
    ui.panel.addEventListener('dragleave', () => ui.panel.classList.remove('drop'));
    ui.panel.addEventListener('drop', e => { return; const f = [...(e.dataTransfer && e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); ui.panel.classList.remove('drop'); if (f) { e.preventDefault(); ocrFile(f); } });
    root.querySelectorAll('.sat[data-b]').forEach(s => s.addEventListener('click', () => {
      // bấm Tiện ích lần đầu: bung các tiện ích con; bấm lần nữa: mở bảng Tiện ích
      if (s.dataset.b === 'tools' && !isUnlocked()) { toolsSub = null; return openTab('tools'); }   // 1.10.138: chưa mở khoá → bấm Tiện ích hiện ngay bảng mở khoá
      if (s.dataset.b === 'tools' && !subOpen) { subOpen = true; ui.wrap.classList.add('sub-open'); ui.root.querySelectorAll('.sat.child').forEach(c => c.tabIndex = 0); return; }
      if (s.dataset.b === 'tools') toolsSub = null;
      openTab(s.dataset.b);
    }));
    root.querySelectorAll('.sat.child').forEach(s => s.addEventListener('click', () => { const id = s.dataset.tool; if (id === 'focus' || id === 'info') return openTab(id); toolsSub = id; openTab('tools'); }));
    // V1.49: kéo thả ảnh/video vào HaoHao (linh vật hoặc bảng) → mở 📤 Máy tính → iPhone và gửi luôn
    { const isF = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files'); let dz = 0;
      host.addEventListener('dragenter', e => { if (!isF(e)) return; e.preventDefault(); dz++; host.setAttribute('data-drop', ''); });
      host.addEventListener('dragover', e => { if (!isF(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      host.addEventListener('dragleave', e => { if (!isF(e)) return; if (--dz <= 0) { dz = 0; host.removeAttribute('data-drop'); } });
      host.addEventListener('drop', e => {
        if (!isF(e)) return; e.preventDefault(); e.stopPropagation(); dz = 0; host.removeAttribute('data-drop');
        const fs = [...e.dataTransfer.files]; if (!fs.length) return;
        tfPending = fs; tfMode = 'gui'; toolsSub = 'transfer'; openTab('tools'); tfFlush();
      }); }
    root.querySelectorAll('.tabs [data-t]').forEach(t => t.addEventListener('click', () => { helloMode = false; if (t.dataset.t === 'tools') toolsSub = null; openTab(t.dataset.t); }));   // bấm tab Tiện ích: về danh sách tiện ích
    $$('.tabs .x').addEventListener('click', () => { closePanel(); ui.pet.focus(); });
    $$('.tabs .big').addEventListener('click', e => { if (miniMode) { e.stopImmediatePropagation(); setMini(false); renderPanel(); } }, true);
    $$('.tabs .big').addEventListener('click', () => { settings.panelBig = !settings.panelBig; ui.panel.classList.toggle('bigp', !!settings.panelBig); chrome.storage.local.get('settings').then(({ settings: s0 = {} }) => chrome.storage.local.set({ settings: { ...s0, panelBig: settings.panelBig } })); });
    ui.panel.classList.toggle('bigp', !!settings.panelBig);
    ui.bubble.addEventListener('click', () => {
      if (ui.bubble.dataset.kind === 'trust') return goCheck();
      if (ui.bubble.dataset.kind === 'ad') { hideBubble(); return window.open(HT.WORK_AD.url, '_blank', 'noopener'); }
      const think = ui.bubble.dataset.kind === 'think'; ui.bubble.classList.remove('think'); ui.bubble.dataset.kind = '';
      hideBubble(); openTab(ui.bubble.dataset.tab || tab, think ? true : undefined);
    });
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

  let pagePos = null;   // 1.10.159: vị trí kéo chỉ giữ trên trang đang xem; sang trang mới về góc mặc định
  function placeWrap() {
    if (!ui) return;
    // mặc định: sát cạnh phải, cao hơn góc dưới ~1/4 màn hình (không che nút Chat của Shopee ở góc)
    const p = posOverride || pagePos || { r: 24, b: Math.round(Math.min(300, Math.max(150, innerHeight * 0.26))) };
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
    const lines = ui.root.querySelectorAll('.links line:not(.sub)'), dots = ui.root.querySelectorAll('.links circle');
    const VB = visBranches(), VT = visTools(), VBid = VB.map(b => b.id), VTid = VT.map(t => t.id);
    ui.root.querySelectorAll('.sat[data-b]').forEach(s => { s.hidden = !VBid.includes(s.dataset.b); });
    ui.root.querySelectorAll('.tabs [data-t]').forEach(s => { s.hidden = !VBid.includes(s.dataset.t); s.style.order = VBid.indexOf(s.dataset.t); });   // thanh tab theo đúng thứ tự nhánh
    ui.root.querySelectorAll('.sat.child').forEach(s => { s.hidden = !VTid.includes(s.dataset.tool); });
    lines.forEach((L, k) => { L.style.display = k < VB.length ? '' : 'none'; });
    dots.forEach((D, k) => { D.style.display = k < 2 * VB.length ? '' : 'none'; });
    ui.root.querySelectorAll('.links line.sub').forEach((L, k) => { L.style.display = k < VT.length ? '' : 'none'; if (VT[k]) L.style.stroke = VT[k].color; });
    VB.forEach((b, k) => { lines[k].style.stroke = b.color; dots[2 * k].style.fill = b.color; dots[2 * k + 1].style.fill = b.color; });
    VB.forEach((br, i) => {
      let a = VB.length > 1 ? -90 + 90 * i / (VB.length - 1) : -45; if (flipX) a = 180 - a; if (flipY) a = -a;
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
        // toả nhánh từ vòng Tiện ích: món đầu đi thẳng ra, món sau rẽ ra phía ngoài các nhánh (menu toả lên thì rẽ xuống), rồi luân phiên hai bên
        // 1.10.202: TỰ CHIA CHỖ theo vị trí đích (tính bằng hình học, không đo lúc nút đang chạy hiệu ứng).
        // Mỗi món con thử các hướng quanh hướng Tiện ích, từng nấc 10°, gần trước xa sau; hướng nào đè nút/nhãn nhánh,
        // HaoHao, nút Store, món đã đặt hoặc ra ngoài màn hình thì bỏ. Hết chỗ thì đẩy xa thêm 20px.
        const s0 = Math.sin((a + 58) * Math.PI / 180) > Math.sin((a - 58) * Math.PI / 180) ? 1 : -1, sgn = upper ? -s0 : s0;
        const PAD = 4, boxes = [];
        const lbW = (node, txt, small) => (node && node.offsetWidth) || Math.round(String(txt || '').length * (small ? 5.9 : 6.8) + (small ? 18 : 24));
        const lbH = small => small ? 19 : 22;
        const addCircle = (x, y, d) => boxes.push([x - d / 2, y - d / 2, x + d / 2, y + d / 2]);
        const labelBox = (x, y, d, w, h, off) => flipY ? [x - w / 2, y - d / 2 + off - h, x + w / 2, y - d / 2 + off] : [x - w / 2, y + d / 2 - off, x + w / 2, y + d / 2 - off + h];
        boxes.push([0, 0, 76, 76]);   // HaoHao
        { const sb = ui.root.querySelector('.storebtn'); if (sb && !sb.hidden) { const w = sb.offsetWidth || 120, h = sb.offsetHeight || 26; boxes.push(flipY ? [C - w / 2, -6 - h, C + w / 2, -6] : [C - w / 2, 82, C + w / 2, 82 + h]); } }
        VB.forEach((b2, k) => {   // mọi nhánh + nhãn của nhánh
          let a2 = VB.length > 1 ? -90 + 90 * k / (VB.length - 1) : -45; if (flipX) a2 = 180 - a2; if (flipY) a2 = -a2;
          const R2 = DIST + (k % 2 ? STAG : 0), x2 = C + R2 * Math.cos(a2 * Math.PI / 180), y2 = C + R2 * Math.sin(a2 * Math.PI / 180);
          addCircle(x2, y2, SAT);
          const nb = ui.root.querySelector(`.sat[data-b="${b2.id}"] b`);
          boxes.push(labelBox(x2, y2, SAT, lbW(nb, nb && nb.textContent || b2.label, false), lbH(false), 15));
        });
        // màn hình: toạ độ trong khung HaoHao (gốc = góc trên-trái của HaoHao)
        const wl = innerWidth - r - 76, wt = innerHeight - b - 76;
        const hit = q => boxes.some(z => q[0] < z[2] + PAD && q[2] > z[0] - PAD && q[1] < z[3] + PAD && q[3] > z[1] - PAD);
        const offScr = q => q[0] + wl < 2 || q[1] + wt < 2 || q[2] + wl > innerWidth - 2 || q[3] + wt > innerHeight - 2;
        const ORDER = [0]; for (let k = 10; k <= 180; k += 10) ORDER.push(sgn * k, -sgn * k);
        VT.forEach((t, j) => {
          const ch = ui.root.querySelector(`.sat.child[data-tool="${t.id}"]`), cb = ch && ch.querySelector('b');
          const w = lbW(cb, cb && cb.textContent || t.label, true), h = lbH(true);
          let best = null;
          for (let d = SUBD; d <= SUBD + 100 && !best; d += 20) {
            for (const off of ORDER) {
              const ra = (a + off) * Math.PI / 180, ex = Math.cos(ra), ey = Math.sin(ra);
              const cx = sx + d * ex, cy = sy + d * ey;
              const c1 = [cx - SUB / 2, cy - SUB / 2, cx + SUB / 2, cy + SUB / 2], l1 = labelBox(cx, cy, SUB, w, h, 12);
              if (hit(c1) || hit(l1) || offScr(c1) || offScr(l1)) continue;
              best = { ex, ey, d, c1, l1 }; break;
            }
          }
          if (!best) { const ra = (a + sgn * 50 * j) * Math.PI / 180, ex = Math.cos(ra), ey = Math.sin(ra), d = SUBD; best = { ex, ey, d, c1: null, l1: null }; }
          if (best.c1) boxes.push(best.c1, best.l1);
          const { ex, ey, d } = best;
          ch.style.left = (sx + d * ex - SUB / 2) + 'px'; ch.style.top = (sy + d * ey - SUB / 2) + 'px';
          const l2 = subLines[j], r0 = SAT / 2 + 4, r1 = d - SUB / 2 - 4;
          l2.setAttribute('x1', O + sx + r0 * ex); l2.setAttribute('y1', O + sy + r0 * ey);
          l2.setAttribute('x2', O + sx + r1 * ex); l2.setAttribute('y2', O + sy + r1 * ey);
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
      if (moved) { pagePos = { r: start.r - dx, b: start.b - dy }; placeWrap(); }
    });
    ui.pet.addEventListener('pointerup', () => {
      ui.pet.style.cursor = '';
      clearTimeout(holdTimer);
      if (!start) return;
      start = null;
      if (held) { held = false; return; }
      if (moved) {}
      else if (!ui.panel.hidden) closePanel();
      else if (!menuOpen && shopHello()) return;   // 1.10.141: Thứ Ba, lần bấm đầu trong ngày → chào 2 shop HaoHao
      else toggleMenu();
    });
    ui.pet.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); } });
  }

  // ☕ Thứ Ba: HaoHao "mệt" xin 1 ly cà phê – mọi tính năng vẫn chạy bình thường. Bong bóng ghi rõ: bấm HaoHao = ghé shop HaoHao + fanpage ủng hộ.
  //    Mỗi ngày Thứ Ba chỉ 1 lần (mọi tab). Khách bấm "Để sau" thì thôi trong ngày.
  let helloDay = '', helloMode = false, tired = false;
  chrome.storage.local.get('shopHelloDay').then(d => { helloDay = d.shopHelloDay || ''; }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.shopHelloDay) { helloDay = ch.shopHelloDay.newValue || ''; if (helloDay === new Date().toDateString()) setTired(false); } });
  const coffeeDue = () => false;   // V1.73: anh Nhật bỏ hẳn bong bóng cà phê Thứ Ba
  function setTired(on) {
    tired = !!on; if (!ui) return;
    ui.wrap.classList.toggle('tired', tired);
    ui.pet.setAttribute('aria-label', tired ? 'HaoHao mệt rồi – bấm để ghé shop HaoHao ủng hộ 1 ly cà phê' : 'HaoHao, bấm để mở các nhánh. Bấm giữ để ghi chú bằng giọng nói');
  }
  const doneCoffee = () => { helloDay = new Date().toDateString(); chrome.storage.local.set({ shopHelloDay: helloDay }).catch(() => {}); setTired(false); };
  async function tiredAsk(force) {
    return;   // V1.73: bỏ hẳn
    if (!ui || (!force && (!coffeeDue() || SHOP_SITE || !ui.panel.hidden || menuOpen))) return;
    setTired(true);
    const day = new Date().toDateString(), { coffeeAskDay = '' } = await chrome.storage.local.get('coffeeAskDay').catch(() => ({}));
    if (!force && coffeeAskDay === day) return;   // lời nhắn chỉ tự hiện 1 lần trong ngày; các trang sau chỉ còn HaoHao 💤
    chrome.storage.local.set({ coffeeAskDay: day }).catch(() => {});
    say('HaoHao hơi mệt rồi 😪 Bấm vào HaoHao để HaoHao có sức phục vụ tiếp nhé!', 'remind', '☕ Thứ Ba', 'shop');
    ui.bubble.dataset.kind = 'coffee';
  }
  function coffee() {
    const sp = HT.SP && HT.SP.showcase, tt = HT.ttShowcase();
    doneCoffee();
    if (sp) openDeal(sp);
    if (tt) setTimeout(() => openDeal(tt), 300);   // 1.10.147: Shopee + TikTok Shop HaoHao
    setTimeout(() => say('Cảm ơn bạn nhiều! HaoHao tỉnh như sáo rồi 🐹☕', 'happy', '☕ Cảm ơn', 'shop'), 600);
  }
  function shopHello() {   // đang mệt: bong bóng xin cà phê đang hiện → bấm HaoHao = ủng hộ; bong bóng đã tắt → hiện lại lời xin trước
    if (!tired) return false;
    if (!ui.bubble.hidden && ui.bubble.dataset.kind === 'coffee') { hideBubble(); coffee(); } else tiredAsk(true);
    return true;
  }
  // bảng mở khoá Thứ Ba: 1 nút ghi rõ "Ghé 2 shop" → khách bấm thì mở cả TikTok Shop + Shopee HaoHao
  function renderHello(V) {
    const tt = HT.ttShowcase(), sp = HT.SP && HT.SP.showcase, box = el('div', 'unl');
    box.append(el('div', 'unl-t', '🔓 Mở khoá HaoHao tuần này'), el('div', 'unl-s', 'Để HaoHao duy trì miễn phí, bạn ghé thăm shop ủng hộ nhé!'));
    const row = (ic, t, sub) => { const r = el('div', 'unl-r'); r.append(el('span', 'unl-n', ic)); const x = el('span', 'unl-x'); x.append(el('b', '', t), el('small', '', sub)); r.append(x); box.append(r); };
    if (tt) row('🛍️', 'TikTok Shop HaoHao', '@' + ((HT.TT && HT.TT.creator) || 'haohaomall'));
    if (sp) row('🧡', 'HaoHao Store trên Shopee', 'Hàng HaoHao tuyển chọn');
    const go = el('button', 'unl-go-all', '🎉 Ghé 2 shop & mở khoá');
    go.addEventListener('click', () => { if (tt) openDeal(tt); if (sp) setTimeout(() => openDeal(sp), 300); helloMode = false; closePanel(); });
    const later = el('button', 'unl-later', 'Để sau'); later.addEventListener('click', () => { helloMode = false; closePanel(); });
    box.append(go, later, el('div', 'unl-n2', 'ⓘ Link tiếp thị · Giá không đổi'));
    V.append(box);
  }
  function toggleMenu(force) {
    if (!ui) return;
    menuOpen = force ?? !menuOpen;
    ui.wrap.classList.toggle('menu-open', menuOpen);
    if (!menuOpen) { subOpen = false; ui.wrap.classList.remove('sub-open'); setTimeout(showTrustBubble, 300); }
    ui.pet.setAttribute('aria-expanded', menuOpen);
    ui.root.querySelectorAll('.sat[data-b]').forEach(s => s.tabIndex = menuOpen ? 0 : -1);
    ui.root.querySelectorAll('.sat.child').forEach(s => s.tabIndex = -1);
    const sb = ui.root.querySelector('.storebtn'); if (sb) { sb.hidden = !(menuOpen && HT.SP.showcase); sb.tabIndex = menuOpen ? 0 : -1; }
    if (menuOpen) { hideBubble(); updateBadge(); ui.root.querySelector('.sat').focus({ preventScroll: true }); }
  }

  // mini = bảng gọn chỉ có Todo + Nhắc (dùng ở Tab mới). Chuyển qua lại Todo/Nhắc vẫn gọn; mở nhánh khác thì về bảng đầy đủ.
  function setMini(on) { miniMode = !!on; if (ui) ui.panel.classList.toggle('mini', miniMode); }
  function openTab(t, mini) {
    if (t === 'read' || t === 'dich' || t === 'explain') { infoSub = t; t = 'info'; }
    if (t === 'crypto' || t === 'market') { if (lay().market === 'out') t = 'market'; else { t = 'tools'; toolsSub = 'crypto'; } }
    if (t === 'tools' && toolsSub === 'crypto' && lay().market === 'out') t = 'market';
    if (t === 'tools' && (toolsSub === 'adblock' || toolsSub === 'transfer') && lay()[toolsSub] === 'out') t = toolsSub;   // 1.10.253
    if ((t === 'adblock' || t === 'transfer') && lay()[t] !== 'out') { toolsSub = t; t = 'tools'; }
    setMini(mini === true || (mini === undefined && miniMode && (t === 'todo' || t === 'bell')));
    tab = t; toggleMenu(false); hideBubble();
    if (t === 'info' && infoSub === 'read') readReady = false;
    ui.panel.hidden = false;
    ui.panel.style.setProperty('--tc', BRANCHES.find(b => b.id === t).color);
    ui.root.querySelectorAll('.tabs [data-t]').forEach(b => { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); });
    clearInterval(quoteTimer);
    if (t === 'tools' || t === 'market') { loadQuotes(); quoteTimer = setInterval(loadQuotes, 60000); }
    renderPanel();
    ui.view.querySelector('input')?.focus({ preventScroll: true });
  }
  function closePanel() { if (!ui) return; helloMode = false; ui.panel.hidden = true; clearInterval(quoteTimer); setTimeout(showTrustBubble, 300); }

  function setMood(m) {
    if (!ui) return;
    ui.pet.classList.remove('happy', 'alert', 'remind');
    void ui.pet.offsetWidth;
    if (m) ui.pet.classList.add(m);
  }

  const isSub = x => tab === 'info' && infoSub === x;
  // 1.10.209: 🔔 HaoHao Transfer – chuyển xong thì HaoHao báo (chỉ tab đang xem hỏi app, 4 giây/lần)
  { let tfSeen = false;
    setInterval(() => {
      if (!ui || window !== window.top || document.visibilityState !== 'visible') return;
      chrome.runtime.sendMessage({ type: 'tf-st' }).then(r => {
        if (!r || !r.ok || !r.tt) return;
        const T = r.tt, busy = T.live && !T.live.done;
        if (busy) { tfSeen = true; return; }
        chrome.storage.local.get('tfNoti').then(({ tfNoti: k = 0 }) => {
          if (T.files < k) { chrome.storage.local.set({ tfNoti: T.files }); return; }   // app vừa bật lại
          if (T.files > k && (tfSeen || (T.live && T.live.done))) {
            const n = T.files - k; tfSeen = false; chrome.storage.local.set({ tfNoti: T.files });
            say(`Đã nhận xong ${n} file từ iPhone · tổng ${T.size}`, 'happy', '📲 HaoHao Transfer', 'tools',
              [{ label: 'Xem', fn: () => { toolsSub = 'transfer'; openTab('tools'); } }, { label: 'Mở thư mục', ghost: true, fn: () => chrome.runtime.sendMessage({ type: 'tf-mo' }) }]);
          }
        });
      }).catch(() => {});
    }, 4000);
  }
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
  // 🈯 YouTube nói tiếng nước ngoài → HaoHao mời bật phụ đề song ngữ (subs.js phát hiện, ở đây hiện bong bóng)
  // lời nhắn từ video trong khung nhúng (iframe) do nền chuyển lên
  const SHOP_SITE = /(^|\.)(shopee\.[a-z.]+|tiktok\.com|lazada\.[a-z.]+|tiki\.vn|sendo\.vn|amazon\.[a-z.]+|aliexpress\.[a-z.]+|temu\.com|shein\.com|taobao\.com|tmall\.com|1688\.com|ebay\.[a-z.]+|susercontent\.com|ibyteimg\.com|tiktokcdn[\w-]*\.com)$/.test(location.hostname);   // 1.10.116: trang mua bán → không mời / không báo song ngữ
  chrome.runtime.onMessage.addListener(msg => { if (!SHOP_SITE && msg && msg.type === 'subs-ev' && /^hh-subs-(offer|active|status|hint|nosub)$/.test(msg.ev)) window.dispatchEvent(new CustomEvent(msg.ev, { detail: msg.detail })); });
  // V1.69: bỏ bong bóng này (video tiếng Việt thường không có phụ đề / tắt CC → HaoHao không cần nhắc)
  if (false) window.addEventListener('hh-subs-nosub', () => say('Video này không có phụ đề nên HaoHao chưa dịch được. HaoHao đang nâng cấp tự nghe và dịch, hẹn bạn ở bản Pro sớm nhé! 😉', 'happy', '🎬 Song ngữ', 'info'));
  // V1.69: bỏ bong bóng này (video tiếng Việt thường không có phụ đề / tắt CC → HaoHao không cần nhắc)
  if (false) window.addEventListener('hh-subs-hint', () => say('Video này đang tắt phụ đề. Bấm nút CC (phụ đề) trên video, HaoHao sẽ dịch song ngữ ngay nhé!', 'happy', '🎬 Song ngữ', 'info'));
  if (!SHOP_SITE) window.addEventListener('hh-subs-active', e => {
    const d = e.detail || {}; const lo = x => String(x || '').replace(/^Tiếng/, 'tiếng');
    say(`Bạn đang được HaoHao dịch song ngữ ${lo(d.from)} – ${lo(d.to)} đấy, hehe 😄`, 'happy', '🈯 Phụ đề song ngữ', 'info');
  });
  if (!SHOP_SITE) window.addEventListener('hh-subs-offer', e => {
    const d = e.detail || {};
    chime();
    say(`Video đang nói ${String(d.from).replace(/^Tiếng/, 'tiếng')}. Bạn có muốn HaoHao dịch song ngữ qua ${String(d.to).replace(/^Tiếng/, 'tiếng')} không?`, 'happy', '🈯 Phụ đề song ngữ', 'info', [
      { label: '🈯 Bật song ngữ', fn: () => { window.dispatchEvent(new CustomEvent('hh-subs-turn', { detail: { on: true } })); setTimeout(() => say('Đã bật! Từ giờ video nước ngoài tự có song ngữ. Muốn tắt: bấm nút [Song ngữ] trên thanh video.', 'happy', '🈯 Phụ đề song ngữ', 'info'), 400); } },
      { label: 'Để sau', ghost: true, fn: () => {} }
    ]);
  });
  function hideBubble() { if (!ui) return; if (ui.bubble.dataset.kind === 'cmp') hamsterHome(); ui.bubble.classList.remove('think'); if (ui.bubble.dataset.kind === 'think') ui.bubble.dataset.kind = ''; const wasTrust = ui.bubble.dataset.kind === 'trust'; ui.bubble.hidden = true; if (!wasTrust) setTimeout(showTrustBubble, 400); }

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

  // 🔓 Mở khoá Tiện ích (1.10.127): 3 bước – mở TikTok Shop HaoHao, mở Cửa hàng HaoHao trên Shopee, thích fanpage → dùng miễn phí 30 ngày, hết hạn làm lại
  const UNLOCK_DAYS = 7;   // 1.10.134: mở khoá 7 ngày; hết hạn khách tự bấm lại TikTok Shop + Cửa hàng Shopee (fanpage chỉ 1 lần đầu)
  let unlockSt = { steps: {}, until: 0 };
  chrome.storage.local.get('unlock').then(d => { if (d.unlock) { unlockSt = d.unlock; if (unlockSt.until > Date.now() + UNLOCK_DAYS * 864e5) unlockSt.until = Date.now() + UNLOCK_DAYS * 864e5; } }).catch(() => {});
  // ⭐ V1.65: thay Bảng mở khoá bằng HaoHao Pro – 2 tháng đầu mở toàn bộ, sau đó Tiện ích + Dự án cần mã kích hoạt (nền kiểm tra chữ ký)
  let proSt = null;
  const proLoad = () => chrome.runtime.sendMessage({ type: 'pro-st' }).then(s => { if (s) proSt = s; }).catch(() => {});
  proLoad();
  chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && (ch.proLic || ch.proLock || ch.proStart)) proLoad().then(() => { if (ui && !ui.panel.hidden) renderPanel(); }); });
  const isUnlocked = () => !proSt || !!proSt.ok;
  function renderProLock(V) {
    const box = el('div', 'pro-lock');
    box.append(el('div', 'pro-t', '⭐ HaoHao Pro'), el('div', 'pro-s', 'Bạn đã dùng hết 2 tháng mở khoá toàn bộ. Tiện ích (Thị trường, Chặn quảng cáo, HaoHao Transfer) và trang Dự án cần gói Pro.'));
    const g = el('div', 'pro-plans');
    HT.PRO.plans.forEach(([k, l, p]) => { const c = el('div', 'pro-pl' + (k === 'y1' ? ' hot' : '')); c.append(el('b', '', l), el('span', '', p.toLocaleString('vi-VN') + 'đ')); g.append(c); });
    const b = el('button', 'b', '⭐ Mua / Kích hoạt Pro'); b.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-options', hash: 'pro' }).catch(() => {}));
    box.append(g, b, el('div', 'pro-n', 'Nhắc, Todo, Note, Mua sắm, Thông tin, Tập trung vẫn dùng miễn phí.'));
    V.append(box);
  }
  function unlockSteps() {
    const fb = (couponFeed && couponFeed.fanpage) || HT.FANPAGE || '';
    return [
      { id: 'tt', label: 'Ghé TikTok Shop HaoHao', sub: '@' + ((HT.TT && HT.TT.creator) || 'haohaomall'), url: HT.ttShowcase() || 'https://www.tiktok.com/@haohaomall' },
      { id: 'sp', label: 'Ghé HaoHao Store trên Shopee', sub: 'Hàng HaoHao tuyển chọn', url: (HT.SP && HT.SP.showcase) || 'https://collshp.com/haohaostore?view=storefront' },
      ...(fb ? [{ id: 'fb', label: 'Thích fanpage HaoHao', sub: 'Nhận tin deal & tính năng mới', url: fb }] : [])
    ];
  }
  // 🛍️ V1.73: 7 ngày 1 lần mời ghé HaoHao Store xem hàng mới (duy trì kinh phí HaoHao). Khách tự bấm mới mở, ghi rõ link tiếp thị.
  //    Tuần đầu sau khi cài chưa mời; tính chung giới hạn 1 bong bóng tự hiện / giờ (autoGate); không hiện trên trang mua sắm
  async function storeWeekly() {
    if (!ui || SHOP_SITE || !ui.panel.hidden || !ui.bubble.hidden) return;
    const sp = (HT.SP && HT.SP.showcase) || '', tt = HT.ttShowcase() || ''; if (!sp && !tt) return;
    { const ps = await chrome.runtime.sendMessage({ type: 'pro-st' }).catch(() => null); if (ps && ps.pro) return; }   // V1.77: khách đã mua Pro thì không mời
    const { ttWeekAt = 0 } = await chrome.storage.local.get('ttWeekAt').catch(() => ({}));
    if (!ttWeekAt) { await chrome.storage.local.set({ ttWeekAt: Date.now() }).catch(() => {}); return; }
    if (Date.now() - ttWeekAt < 7 * 864e5 || !(await autoGate())) return;
    await chrome.storage.local.set({ ttWeekAt: Date.now() }).catch(() => {});
    const acts = [...(sp ? [{ label: '🛍️ Shopee', fn: () => openDeal(sp) }] : []), ...(tt ? [{ label: '🎵 TikTok Shop', fn: () => openDeal(tt) }] : []), { label: 'Để sau', ghost: true, fn: () => {} }];
    say('HaoHao Store tuần này có hàng mới tuyển chọn, ghé xem nhé! Mua qua đây là góp kinh phí nuôi HaoHao, giá không đổi.' + (HT.STORE ? ' (link tiếp thị)' : ''), 'happy', '🛍️ HaoHao Store', 'shop', acts);
  }
  async function saveUnlock() { await chrome.storage.local.set({ unlock: unlockSt }).catch(() => {}); }
  let unlPrev = '';   // máy chủ app xem thử: '' = lần đầu, 'renew' = hết 7 ngày (vẫn mở link, không lưu)
  function renderUnlock(V) {
    const preview = tab === 'tools' && toolsSub === 'unl';
    if (!preview && unlockSt.until && !isUnlocked()) { unlockSt = unlockSt.trial ? { steps: {}, until: 0, trialEnd: true } : { steps: unlockSt.steps.fb ? { fb: unlockSt.steps.fb } : {}, until: 0, renew: true }; saveUnlock(); }   // V1.10: hết 7 ngày dùng thử → mời đủ 3 bước (có fanpage)   // hết 7 ngày: bấm lại TikTok + Shopee
    const st = preview ? (renderUnlock.fake = renderUnlock.fake && renderUnlock.fake.mode === unlPrev ? renderUnlock.fake : { mode: unlPrev, steps: unlPrev ? { fb: 1 } : {}, renew: !!unlPrev }) : unlockSt;
    const S = unlockSteps().filter(x => !(st.renew && x.id === 'fb')), done = S.filter(x => st.steps[x.id]).length;
    const box = el('div', 'unl');
    if (preview) {
      const bar = el('div', 'unl-pv'); const bk = el('button', 'tb-back', '‹ Tiện ích'); bk.addEventListener('click', () => { toolsSub = null; renderPanel(); }); bar.append(bk);
      [['', 'Lần đầu'], ['renew', 'Hết 7 ngày']].forEach(([k, t]) => { const c = el('button', 'chip sm' + (unlPrev === k ? ' on' : ''), t); c.addEventListener('click', () => { unlPrev = k; renderUnlock.fake = null; renderPanel(); }); bar.append(c); });
      box.append(bar);
    }
    box.append(el('div', 'unl-t', st.renew ? '⏰ Hết 7 ngày dùng miễn phí' : st.trialEnd ? '⏰ Hết 7 ngày dùng thử' : '🔓 Mở khoá Tiện ích miễn phí'),
      el('div', 'unl-s', st.renew ? 'Để HaoHao duy trì miễn phí, bạn ghé thăm shop ủng hộ nhé!' : st.trialEnd ? `Bạn thấy HaoHao hữu ích chứ? Hoàn thành ${S.length} bước để dùng tiếp miễn phí nhé!` : `Hoàn thành ${S.length} bước để dùng miễn phí.`));
    S.forEach((x, i) => {
      const ok = !!st.steps[x.id], r = el('button', 'unl-r' + (ok ? ' ok' : ''));
      r.append(el('span', 'unl-n', ok ? '✓' : String(i + 1)));
      const tx = el('span', 'unl-x'); tx.append(el('b', '', x.label), el('small', '', x.sub)); r.append(tx, el('span', 'unl-go', ok ? 'Đã xong' : 'Mở ›'));
      r.addEventListener('click', async () => { st.steps[x.id] = Date.now(); openDeal(x.url); if (!preview) await saveUnlock(); renderPanel(); });
      box.append(r);
    });
    const all = done === S.length, go = el('button', 'unl-go-all' + (all ? '' : ' off'), all ? (st.renew ? '🎉 Dùng tiếp 7 ngày' : '🎉 Mở khoá ngay') : `Còn ${S.length - done} bước`);
    go.disabled = !all;
    go.addEventListener('click', async () => { if (preview) { renderUnlock.fake = null; renderPanel(); return; } unlockSt.until = Date.now() + UNLOCK_DAYS * 864e5; unlockSt.renew = false; await saveUnlock(); chime && chime(); renderPanel(); });
    box.append(go, el('div', 'unl-n2', 'ⓘ Link tiếp thị · Giá không đổi'));
    V.append(box);
  }

  // 💡 V1.2: hướng dẫn trong 15 phút đầu dùng HaoHao (máy cài mới): bấm biểu tượng nào hiện 1 dòng gợi ý mục đó; hết 15 phút không hiện nữa
  let tipStart = 1; const tipHide = new Set();
  chrome.storage.local.get('tipStart').then(d => { if (d.tipStart != null) tipStart = d.tipStart; }).catch(() => {});
  const TIPS = { bell: '🔔 Cần nhớ giờ uống thuốc, họp, trả tiền… đặt ở đây, tới giờ HaoHao nhắc.', todo: '✅ Việc cần làm hôm nay ghi vào đây, xong thì bấm tick.',
    idea: '📝 Bạn có ý tưởng gì cần lưu thì vào mục Note này.', focus: '🍅 Bấm bắt đầu để tập trung 25 phút, HaoHao báo giờ nghỉ.',
    info: '💡 Bôi đen chữ trên web để dịch, tóm tắt hoặc giải thích.', market: '📊 Theo dõi giá vàng, chứng khoán, crypto, đặt báo khi giá chạm mức.',
    shop: '🛍️ Mở sản phẩm Shopee hoặc TikTok, HaoHao kiểm tra shop, so giá, tìm mã giảm.', tools: '🧰 Thêm app hay: chặn quảng cáo, chuyển ảnh iPhone, thị trường…',
    adblock: '🛡️ Bật là quảng cáo phim, kể cả YouTube, tự ẩn.', transfer: '📲 Chuyển ảnh, video iPhone ⇄ máy tính – kéo thả vào HaoHao để gửi sang iPhone.', gopy: '💬 Góp ý gì cũng được, chỉ chủ app đọc.' };
  function tipEl() {
    if (tipStart === -1) { tipStart = Date.now(); chrome.storage.local.set({ tipStart }).catch(() => {}); }
    if (!(tipStart > 1e12) || Date.now() - tipStart > 15 * 6e4) return null;
    const k = tab === 'tools' && toolsSub ? (toolsSub === 'crypto' ? 'market' : toolsSub) : tab;
    if (!TIPS[k] || tipHide.has(k)) return null;
    const d = el('div', 'hh-tip', TIPS[k]), x = el('button', '', '✕'); x.title = 'Ẩn gợi ý'; x.setAttribute('aria-label', 'Ẩn gợi ý');
    x.addEventListener('click', () => { tipHide.add(k); d.remove(); }); d.append(x); return d;
  }
  function renderPanel() {
    if (!ui || ui.panel.hidden) { updateBadge(); return; }
    const V = ui.view; V.innerHTML = '';
    if (helloMode) { renderHello(V); updateBadge(); return; }
    if ((tab === 'market' || tab === 'tools' || tab === 'adblock' || tab === 'transfer') && !isUnlocked()) { renderProLock(V); updateBadge(); return; }   // V1.65: hết dùng thử → gói Pro
    if (tab === 'tools' && toolsSub === 'unl') { renderUnlock(V); updateBadge(); return; }   // 1.10.127: Thị trường (vàng, chứng khoán, crypto) mở khoá bằng 3 bước
    ({ todo: renderTodo, idea: renderIdea, bell: renderBell, focus: renderFocus, info: renderInfo, shop: renderShop, tools: renderTools, market: renderCrypto, adblock: renderAdblock, transfer: renderTransfer }[tab] || renderTodo)(V);
    { const tp = tipEl(); if (tp) V.prepend(tp); }
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
        <input class="grow" placeholder="✍️ Việc cần làm… (vd: 9h mai gặp khách, 15h thứ 2 gửi báo giá)" title="Gõ kèm giờ là HaoHao tự hẹn nhắc: 9h mai…, 15h thứ 2…, 30 phút nữa…" aria-label="Việc cần làm" maxlength="200">
        <button class="ic2" title="Hẹn giờ nhắc" aria-label="Hẹn giờ nhắc">⏰</button>
        <button class="b">Thêm</button>
        <div class="duebox" hidden><input type="datetime-local" aria-label="Nhắc lúc"><span class="dl"></span></div></div>`);
    const txt = form.querySelector('input.grow'), due = form.querySelector('input[type=datetime-local]'), box = form.querySelector('.duebox'), dl = form.querySelector('.dl');
    form.querySelector('.ic2').addEventListener('click', () => { box.hidden = !box.hidden; if (!box.hidden) due.focus(); });
    due.addEventListener('input', () => { dl.textContent = due.value ? dueLabel(due.value) : ''; });
    const add = () => {
      let t = txt.value.trim(), dv = due.value || ''; if (!t) return txt.focus();
      // gõ kèm giờ ("gọi khách lúc 15h", "mai 8h họp") thì tự hẹn giờ nhắc
      if (!dv) { try { const r = HT.parseWhen(t); if (r && r.due && r.due.getTime() > Date.now() && r.task) { t = r.task; dv = HT.localISO(r.due); } } catch {} }
      todos.push({ id: 't' + Date.now().toString(36), text: t, done: false, due: dv, notified: false });
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
    // ⭐ việc ưu tiên: gom riêng lên đầu, không lặp ở nhóm dưới
    const star = open.filter(t => t.star), rest = open.filter(t => !t.star);
    const groups = [
      ['⭐ Ưu tiên', star, 'pri'],
      ['Quá hạn', rest.filter(t => t.due && new Date(t.due).getTime() <= nowMs), 'late'],
      ['Hôm nay', rest.filter(t => t.due && new Date(t.due).getTime() > nowMs && dayKey(new Date(t.due)) === tk), ''],
      ['Sắp tới', rest.filter(t => t.due && new Date(t.due).getTime() > nowMs && dayKey(new Date(t.due)) !== tk), ''],
      ['Chưa hẹn giờ', rest.filter(t => !t.due), ''],
      [`Đã xong (${done.length})`, done, 'dn']
    ];
    if (!todos.length) list.append(el('div', 'empty', 'Chưa có việc nào. Gõ việc ở trên. Mỗi việc có ⭐ quan trọng, 🔔 nhắc giờ.'));
    for (const [name, items, cls] of groups) {
      if (!items.length) continue;
      list.append(el('div', 'gh ' + cls, name));
      for (const t of items) {
        const row = el('div', 'todo' + (t.done ? ' done' : '') + (t.star && !t.done ? ' pri' : ''));
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
          tx = el('div', 'tx', t.text); tx.title = 'Bấm để sửa';
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
          const ta = el('div', 'tacts'); ta.append(st, al, del);
          row.append(cb, tx, ta);
        } else { const ta = el('div', 'tacts'); ta.append(del); row.append(cb, tx, ta); }
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
    if (r.kind === 'lunar') return HT.lang === 'en' ? HT.lunarDescEn(r, timesOf(r)) : `Âm lịch: ${[...(r.lunarDays || [])].sort((a, b) => a - b).map(L.dayName).join(', ')}, lúc ${timesOf(r).join(', ')}` + (r.prep && r.prep.on ? ` · nhắc trước 1 ngày ${r.prep.time}` : '');
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
    if (r.kind === 'interval') {   // canh theo giờ bắt đầu: 8:00, 9:30, 11:00…
      const step = Math.max(1, Number(r.minutes) || 60) * 60000, hm = s => (String(s || '').match(/^(\d{1,2}):(\d{2})$/) || []).slice(1).map(Number);
      const [fh = 0, fm = 0] = hm(r.from), [th = 23, tm = 59] = hm(r.to);
      for (let add = 0; add < 3; add++) {
        const b = new Date(now); b.setDate(b.getDate() + add); b.setHours(fh, fm, 0, 0);
        const e = new Date(b); e.setHours(th, tm, 59, 999); if (e <= b) e.setDate(e.getDate() + 1);
        let t = b.getTime(); if (t <= now) t += Math.ceil((now - t + 1) / step) * step;
        if (t <= e.getTime()) return new Date(t);
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

  let upEdit = null;
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
    // công tắc tiếng: gạt sang phải = có tiếng, gạt về = báo im lặng (vẫn hiện, chỉ không kêu)
    const loud = settings.sound !== false;
    const sw = el('button', 'snd-sw' + (loud ? ' on' : ''));
    sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', loud); sw.title = loud ? 'Đang báo có tiếng. Gạt về để báo im lặng' : 'Đang báo im lặng. Gạt sang để có tiếng';
    sw.textContent = loud ? '🔔' : '🔕'; sw.setAttribute('aria-label', loud ? 'Có tiếng' : 'Im lặng');
    sw.addEventListener('click', () => { settings.sound = !loud; chrome.storage.local.set({ settings }); if (settings.sound) chime(); renderPanel(); });
    bar.append(sw);
    const tg = el('button', 'pre-tg' + (presetOpen ? ' on' : ''), presetOpen ? '✕ Đóng' : '＋ Mẫu');
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
    const up = upcoming().filter(u => u.todo);
    if (up.length) {
      const ug = el('div', 'grp'); ug.append(h(`<h3>📋 Việc có giờ <span>${up.length} việc</span></h3>`));
      for (const u of up) {
        const d = new Date(u.at), l = HT.lunar.of(d);
        const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
        const day = diff === 0 ? 'Hôm nay' : diff === 1 ? 'Mai' : `${WD[d.getDay()]} ${dd2(d.getDate())}/${dd2(d.getMonth() + 1)}`;
        const td = todos.find(x => x.id === u.id);
        if (td && upEdit === td.id) {
          // ✎ chế độ sửa: đổi nội dung + giờ nhắc
          const f = el('div', 'up-edit');
          const ti = document.createElement('input'); ti.value = td.text; ti.className = 'grow'; ti.setAttribute('aria-label', 'Nội dung việc');
          const di = document.createElement('input'); di.type = 'datetime-local'; di.value = (td.due || '').slice(0, 16); di.setAttribute('aria-label', 'Nhắc lúc');
          const ok = el('button', 'b', 'Lưu'), no = el('button', 'b ghost', 'Huỷ');
          const save = () => { const t = ti.value.trim(); if (!t) return ti.focus(); td.text = t; td.due = di.value || ''; td.notified = false; td.mute = false; upEdit = null; saveTodos(); renderPanel(); };
          ok.addEventListener('click', save); no.addEventListener('click', () => { upEdit = null; renderPanel(); });
          ti.addEventListener('keydown', e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { upEdit = null; renderPanel(); } });
          const btns = el('div', 'up-eb'); btns.append(di, ok, no);
          f.append(ti, btns); ug.append(f); setTimeout(() => ti.focus(), 0);
          continue;
        }
        // cùng kiểu dòng với Lịch nhắc: biểu tượng · tên + giờ đỏ · ô tick (xong) · ✎ · ✕
        const r2 = el('div', 'rem' + (td && td.mute ? ' off' : ''));
        r2.title = `${day} · ${l.day}/${l.month} âm lịch`;
        r2.append(el('span', 'ico', '📋'));
        const info = el('div', 'nm', u.text); info.append(el('span', 'nx', whenLabel(d).replace(/^Lần tới:\s*/, '')));
        // giống Lịch nhắc: có tick = đang nhắc, bỏ tick = không nhắc nữa (việc vẫn còn trong Todo)
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !(td && td.mute); cb.setAttribute('aria-label', 'Bật hoặc tắt nhắc ' + u.text); cb.title = 'Bỏ tick là không nhắc nữa';
        cb.addEventListener('change', () => { if (td) { td.mute = !cb.checked; saveTodos(); renderPanel(); } });
        const tm = info;
        const ed = el('button', 'ic', '✎'); ed.setAttribute('aria-label', 'Sửa ' + u.text);
        ed.addEventListener('click', () => { upEdit = u.id; renderPanel(); });
        const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Xoá ' + u.text);
        del.addEventListener('click', () => { todos = todos.filter(x => x.id !== u.id); saveTodos(); renderPanel(); });
        r2.append(tm, cb, ed, del); ug.append(r2);
      }
      list.append(ug);
    }
    const rems = rules.filter(r => r.type === 'reminder');
    const g = el('div', 'grp'); g.append(h(`<h3>🔔 Lịch nhắc <span>${rems.filter(r => r.enabled).length}/${rems.length} bật</span></h3>`));
    if (!rems.length) g.append(el('div', 'empty', 'Chọn một mẫu ở trên (uống thuốc, uống nước, đón con) hoặc tự tạo lịch nhắc riêng.'));
    const nxOf = r => (r.enabled && nextFire(r)) || null;
    const sorted = rems.map(r => ({ r, nx: nxOf(r) })).sort((a, b) => (a.nx ? a.nx.getTime() : 9e15) - (b.nx ? b.nx.getTime() : 9e15));
    for (const { r, nx } of sorted) {
      const row = el('div', 'rem' + (r.enabled ? '' : ' off'));
      row.title = describeRem(r);
      row.append(el('span', 'ico', r.icon || '🔔'));
      const info = el('div', 'nm', r.name);
      info.append(el('span', nx ? 'nx' : 'ds', nx ? whenLabel(nx).replace(/^Lần tới:\s*/, '') : (r.enabled ? describeRem(r) : 'đang tắt')));
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

  let mailAccts = null, acctsBusy = false;
  const refreshAccts = () => {
    if (acctsBusy) return; acctsBusy = true;
    chrome.runtime.sendMessage({ type: 'mail-accounts' }).then(r => { acctsBusy = false; if (r) { mailAccts = r; renderPanel(); } }).catch(() => { acctsBusy = false; });
  };
  let gmAsk = false;   // V1.73: bản Store – hỏi khách đồng ý trước khi HaoHao đọc Gmail
  let mailHidden = []; chrome.storage.local.get('mailHidden').then(d => { mailHidden = d.mailHidden || []; }).catch(() => {});
  function mailBlock() {
    const m = settings.mail || {}, prov = m.provider || 'gmail', isMs = prov === 'outlook';
    const save = patch => { settings.mail = { ...(settings.mail || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    const recheck = () => chrome.runtime.sendMessage({ type: 'mail-check-now' }).catch(() => {});
    const g = el('div', 'grp');
    // thu gọn: 1 dòng tóm tắt, bấm mới mở cài đặt
    const ms0 = mailStatus && (mailStatus.provider || 'gmail') === prov ? mailStatus : null;
    const who0 = ms0 && ms0.ok ? (isMs ? msAccount : ms0.account) : '';
    const sum = !m.enabled ? 'đang tắt' : ms0 && ms0.ok ? `${who0 || (isMs ? 'Outlook' : 'Gmail')} · ${ms0.count} chưa đọc` : ms0 ? `${isMs ? 'Outlook' : 'Gmail'} · ⚠ cần kiểm tra` : `${isMs ? 'Outlook' : 'Gmail'} · đang bật`;
    const hd = el('button', 'cry-hd mail-hd' + (mailOpen ? ' on' : ''), `📧 Canh email · ${sum} ${mailOpen ? '▴' : '▾'}`);
    hd.setAttribute('aria-expanded', mailOpen);
    hd.addEventListener('click', () => { mailOpen = !mailOpen; if (mailOpen && mailAccts) mailAccts.at = 0; renderPanel(); });   // mở ra thì dò lại tài khoản
    g.append(hd);
    if (!mailOpen) return g;
    const inner = el('div', 'mail-in'); g.append(inner);
    const on = el('label', 'rule'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!m.enabled;
    cb.addEventListener('change', async () => {
      if (cb.checked && HT.STORE && !isMs && !m.gmOk) { cb.checked = false; gmAsk = true; return renderPanel(); }
      await chrome.storage.local.set({ mailSeen: null });   // chỉ báo thư đến SAU lúc bật
      await save({ enabled: cb.checked });
      if (cb.checked) recheck();
    });
    on.append(cb, el('span', '', 'Báo email mới'));
    // chọn hộp thư (cùng dòng với nút bật)
    const pv = el('div', 'line mail-top'); pv.append(on);
    [['gmail', 'Gmail'], ['outlook', 'Outlook']].forEach(([k, lb]) => {
      const c = el('button', 'chip' + (prov === k ? ' on' : ''), lb);
      c.addEventListener('click', async () => { if (k === prov) return; await chrome.storage.local.set({ mailSeen: null, mailStatus: null }); await save({ provider: k }); recheck(); });
      pv.append(c);
    });
    inner.append(pv);
    if (gmAsk && !isMs) {
      const ask = el('div', 'gm-ask');
      ask.append(el('b', '', '🔒 Cho phép HaoHao đọc Gmail?'),
        el('div', '', 'HaoHao đọc người gửi, tiêu đề và vài dòng đầu của thư CHƯA ĐỌC trong Gmail bạn đang đăng nhập trên Chrome, để báo thư mới và mã OTP. Việc đọc làm ngay trên máy bạn, không gửi nội dung thư đi đâu. Tắt lúc nào cũng được.'));
      const ln = el('div', 'line'), ok = el('button', 'b', 'Đồng ý, bật'), no = el('button', 'b ghost', 'Không');
      ok.addEventListener('click', async () => { gmAsk = false; await chrome.storage.local.set({ mailSeen: null, mailStatus: null }); await save({ enabled: true, provider: 'gmail', gmOk: Date.now() }); recheck(); renderPanel(); });
      no.addEventListener('click', () => { gmAsk = false; renderPanel(); });
      ln.append(ok, no); ask.append(ln); inner.append(ask);
    }
    // trạng thái đăng nhập
    const st = el('div', 'empty'), ms = mailStatus && (mailStatus.provider || 'gmail') === prov ? mailStatus : null;
    const hm = x => new Date(x).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (isMs && !m.msClientId) st.textContent = 'Outlook cần thiết lập 1 lần (khoảng 3 phút) trong trang Cài đặt.';
    else if (ms && ms.ok) {
      const who = isMs ? msAccount : ms.account;
      st.textContent = `✓ ${who || (isMs ? 'Outlook' : 'Gmail')} · ${ms.count} chưa đọc · ${hm(ms.at)}`; st.className = 'empty mail-st';
    }
    else if (ms && ms.error === 'perm') st.textContent = '🔒 Bạn chưa cho phép HaoHao đọc Gmail.';
    else if (ms && ms.error === 'login') st.textContent = isMs ? '⚠ Chưa đăng nhập Outlook, hoặc phiên đã hết hạn.' : '⚠ Chưa đăng nhập Gmail trên Chrome này, hoặc sai số thứ tự tài khoản.';
    else if (ms) st.textContent = '⚠ Không lấy được hộp thư (mất mạng?). HaoHao sẽ thử lại sau 1 phút.';
    else st.textContent = isMs && !msAccount ? 'Chưa đăng nhập Outlook.' : 'Chưa kiểm tra lần nào.';
    inner.append(st);
    // thư chưa đọc mới nhất: để thấy HaoHao đang đọc đúng hộp thư
    if (ms && ms.ok && (ms.latest || []).length) {
      const keyOf = x => x.url || ((x.name || '') + '|' + (x.title || ''));
      const shown = ms.latest.filter(x => !mailHidden.includes(keyOf(x)));
      const lt = el('div', 'mail-list'); lt.append(el('b', '', `Thư chưa đọc mới nhất (${shown.length})`));
      const JK = { social: 'MXH', promo: 'QC' };
      shown.forEach((x, i) => {
        const r = el('div', 'mail-it' + (x.junk ? ' junk' : '')); r.title = (x.name || '') + ': ' + (x.title || '');
        const tx = el('div', 'mtx');
        const l1 = el('div', 'ml1'); l1.append(el('span', 'mno', (i + 1) + '.'), el('span', 'mn', x.name || ''));
        if (x.junk) l1.append(el('em', 'mj', JK[x.junk])); else if (x.otp) l1.append(el('em', 'mj otp', '🔐 OTP'));
        tx.append(l1, el('div', 'mt', x.title || ''));
        const go = el('button', 'ic', '↗'); go.setAttribute('aria-label', 'Mở thư'); go.title = 'Mở thư';
        go.addEventListener('click', () => { if (/^https:\/\//.test(x.url || '')) window.open(x.url, '_blank'); else window.open(isMs ? 'https://outlook.live.com/mail/' : 'https://mail.google.com/', '_blank'); });
        const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Ẩn thư này'); del.title = 'Ẩn khỏi danh sách (không xoá trong hộp thư)';
        del.addEventListener('click', () => { mailHidden = [...mailHidden, keyOf(x)].slice(-100); chrome.storage.local.set({ mailHidden }); renderPanel(); });
        r.append(tx, go, del); lt.append(r);
      });
      if (ms.skipped) lt.append(el('div', 'mail-why', `🔕 Đã bỏ qua ${ms.skipped} thư mạng xã hội, khuyến mãi hôm nay.`));
      inner.append(lt);
    }
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
    } else if (ms && ms.error === 'perm' && !gmAsk) {
      const b = el('button', 'b', 'Cho phép đọc Gmail');
      b.addEventListener('click', () => { gmAsk = true; renderPanel(); });
      acts.append(b);
    } else if (ms && ms.error === 'login') {
      const b = el('button', 'b', 'Mở Gmail để đăng nhập');
      b.addEventListener('click', () => window.open('https://mail.google.com/', '_blank'));
      acts.append(b);
    }
    if (acts.childNodes.length) inner.append(acts);
    if (!m.enabled) return g;
    const fm = el('div', 'fm'); fm.style.padding = '4px 0'; fm.style.gap = '8px';
    if (!isMs) {
      // chỉ hiện các Gmail thật sự đang đăng nhập trên Chrome; 1 tài khoản thì chỉ ghi địa chỉ, nhiều tài khoản mới cho chọn
      const accs = (mailAccts && mailAccts.list) || [], cur = Number(m.account) || 0;
      const acc = el('div', 'line'); acc.append(el('span', 'lb', 'Đang báo email:')); acc.firstChild.style.margin = '0';
      if (accs.length > 1) {
        const as = document.createElement('select'); as.setAttribute('aria-label', 'Tài khoản Gmail');
        accs.forEach(x => { const o = document.createElement('option'); o.value = String(x.i); o.textContent = x.email; as.append(o); });
        as.value = String(cur);
        as.addEventListener('change', async () => { await chrome.storage.local.set({ mailSeen: null }); await save({ account: Number(as.value) }); recheck(); });
        acc.append(as);
      } else acc.append(el('b', 'mail-acc', (accs[0] && accs[0].email) || (ms && ms.ok && ms.account) || 'Gmail đang đăng nhập trên Chrome'));
      fm.append(acc);
      if (!mailAccts || Date.now() - mailAccts.at > 10 * 60e3) refreshAccts();
    }
    const pr = el('label', 'snd'); const pc = document.createElement('input'); pc.type = 'checkbox'; pc.checked = m.primary !== false;
    pc.addEventListener('change', async () => { await chrome.storage.local.set({ mailSeen: null }); await save({ primary: pc.checked }); });
    pr.append(pc, isMs ? 'Chỉ hộp thư Ưu tiên (Focused), bỏ qua thư Khác' : 'Chỉ hộp thư Chính (bỏ qua Quảng cáo, Mạng xã hội)');
    fm.append(pr);
    const jk = el('label', 'snd'); const jc = document.createElement('input'); jc.type = 'checkbox'; jc.checked = m.skipJunk !== false;
    jc.addEventListener('change', () => save({ skipJunk: jc.checked }));
    jk.append(jc, 'Không báo thư không quan trọng: mạng xã hội, khuyến mãi (mã OTP vẫn báo gấp)');
    fm.append(jk);
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

  // ---------- Cài đặt → Đọc hộ (Gemini) (Gemini) ----------
  document.addEventListener('mouseup', () => {
    const t = (window.getSelection() || '').toString().trim();
    if (t.length >= 30) { lastSel = { text: t, at: Date.now() }; ignoreSel = false; }
  }, true);
  const ytId = () => location.hostname.endsWith('youtube.com') &&
    (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : (location.pathname.match(/^\/shorts\/([\w-]{6,})/) || [])[1]);
  const isPdf = () => document.contentType === 'application/pdf' || /\.pdf$/i.test(location.pathname);
  const MAIL_SITES = /mail\.google\.com|outlook\.(live|office|office365)\.com/;
  function srcInfo() {
    // đoạn bôi đen ngắn (dưới ~250 ký tự) thì không đáng tóm tắt → tóm tắt cả trang (1.10.36)
    const sel = !ignoreSel && lastSel.text && lastSel.text.trim().length >= 250 && Date.now() - lastSel.at < 180000 ? lastSel.text : '';
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
  async function doSummary(auto, deep) {
    const info = srcInfo();
    const ai = settings.ai || {};
    readState = { key: info.key, label: info.label, title: info.title, loading: true, qa: [], sid: 'r' + Date.now() + Math.random() };
    renderPanel(); if (!auto) setMood('happy');
    try {
      const src = await srcFull(info);
      const r = await chrome.runtime.sendMessage({ type: 'ai-read', mode: 'summary', src, length: ai.length || 'vua', sid: readState && readState.sid, deep: !!deep });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      if (!readState || readState.key !== info.key) return;
      readState.result = r.text; readState.src = src; readState.at = Date.now(); readState.deep = !!deep;
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
    const go = el('button', 'b', readState && readState.result ? '↻ Tóm tắt lại' : '✨ Tóm tắt');
    go.style.marginLeft = 'auto';
    if (readState && readState.loading) go.setAttribute('disabled', '');
    go.addEventListener('click', () => { if (!(readState && readState.loading)) doSummary(false); });
    row.append(go); V.append(row);
    const L = el('div', 'body-list');
    if (!readState) {
      L.append(el('div', 'empty', info.kind === 'youtube'
        ? 'Bấm ✨ Tóm tắt: HaoHao xem video, tóm ý chính và các mốc thời gian (bấm mốc để tua tới).'
        : 'Bấm ✨ Tóm tắt để HaoHao đọc và tóm ý chính. Bôi đen trước thì chỉ tóm đoạn đó.'));
      readCache(info.key).then(c => {
        if (c && !readState && isSub('read') && srcInfo().key === info.key) {
          readState = { key: info.key, label: info.label, title: info.title, result: c.text, at: c.at, qa: [], cached: true };
          renderPanel();
        }
      });
    } else if (readState.loading && readState.partial) {
      const st = el('div', 'hh-stream'); st.append(md(readState.partial)); L.append(st);
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
      const cp = el('button', 'b ghost', '📋 Chép'); cp.title = 'Sao chép tóm tắt';
      cp.addEventListener('click', async () => {
        const all = readState.result + readState.qa.filter(x => x.a).map(x => `\n\nHỏi: ${x.q}\n${x.a}`).join('');
        try { await navigator.clipboard.writeText(all); cp.textContent = 'Đã chép ✓'; } catch { cp.textContent = 'Không chép được'; }
      });
      const sv = el('button', 'b ghost', '📝 Note'); sv.title = 'Lưu vào Note';
      sv.addEventListener('click', () => saveIdea({ type: info.kind === 'youtube' ? 'video' : 'summary', text: readState.result, title: info.title, url: info.url }));
      const tr = el('button', 'b ghost', '🌐 Dịch'); tr.title = 'Dịch trang'; tr.addEventListener('click', () => { infoSub = 'dich'; renderPanel(); });
      const ex2 = el('button', 'b ghost', '💡'); ex2.title = 'Giải thích'; ex2.addEventListener('click', () => { infoSub = 'explain'; renderPanel(); });
      pf.append(cp, sv, tr, ex2);
      if (info.kind !== 'youtube' && !readState.deep && !readState.loading) {
        const dp = el('button', 'b ghost', '✨ Kỹ hơn'); dp.title = 'Tóm tắt lại kỹ hơn bằng Gemini bản đầy đủ (chậm hơn vài giây)';
        dp.addEventListener('click', () => doSummary(false, true)); pf.append(dp);
      }
    }
    const au = el('label', 'snd'); const ac = document.createElement('input'); ac.type = 'checkbox'; ac.checked = !!ai.autoYoutube;
    ac.addEventListener('change', () => saveAi({ autoYoutube: ac.checked }));
    au.append(ac, 'Tự tóm tắt mỗi khi mở video YouTube');
    if (info.kind === 'youtube' || !(readState && readState.result)) pf.append(au);   // trang thường đã có kết quả: bỏ bớt dòng này cho rộng chỗ đọc
    else pf.style.flexWrap = 'nowrap';
    V.append(pf);
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
  const IDEA_ICON = { text: '✂', video: '📺', page: '🔖', voice: '🎤', summary: '📖', ocr: '🖼️' };
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
        say(`Đã lưu note${r.no ? ' #' + r.no : ''} kèm link trang.`, 'happy', '📝 Note', 'idea', [
          { label: '🔔 Nhắc tôi', fn: async () => { const t = await noteToReminder(txt || item.title, item.url, item.title); dueEditId = t.parsed ? null : t.id; openTab('todo'); } },
          { label: 'Ok', ghost: true, fn: () => {} }
        ]);
      }
    } catch (e) { console.warn('[HaoHao] saveIdea', e); say('Chưa lưu được, thử lại nhé.', 'alert', '', 'idea'); }
  }
  // 📋 đọc chữ vừa chép (dùng quyền clipboardRead của tiện ích, không cần hỏi trang)
  async function readClip() {
    let t = '';
    try { const ta = document.createElement('textarea'); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; (ui ? ui.root : document.body).append(ta); ta.focus(); if (document.execCommand('paste')) t = ta.value.trim(); ta.remove(); } catch {}
    if (!t) { const r = await chrome.runtime.sendMessage({ type: 'clip-read' }).catch(() => null); t = r && r.ok ? (r.text || '') : ''; }
    if (!t) { try { t = (await navigator.clipboard.readText() || '').trim(); } catch {} }
    return t;
  }
  // chuột phải → 🐹 HaoHao → 📋 Lưu chữ vừa chép vào Note
  chrome.runtime.onMessage.addListener(msg => {
    if (!msg || msg.type !== 'hh-clip-save' || !ui) return;
    (async () => {
      const t = await readClip();
      if (!t) return say('Chưa có chữ nào vừa chép. Chép chữ (vd. Google Ống kính → Sao chép văn bản) rồi thử lại nhé.', 'think', '📋 Note', 'idea');
      const self = location.protocol === 'chrome-extension:';
      await saveIdea({ type: 'text', text: t.slice(0, 5000), title: self ? '' : document.title, url: self ? '' : location.href });
      openTab('idea');
    })();
  });
  // nút nổi "Lưu ý tưởng" khi bôi đen chữ
  let selChip = null;
  function hideChip() { if (selChip) { selChip.remove(); selChip = null; } }
  // lấy chữ đang bôi đen: cả trong ô nhập (input, textarea) lẫn trên trang
  function selInfo(e) {
    const a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && /^(text|search|url|email)?$/i.test(a.type))) && a.selectionEnd > a.selectionStart) {
      const t = a.value.slice(a.selectionStart, a.selectionEnd).trim(), rc = a.getBoundingClientRect();
      return t ? { t, rc: e && e.clientX ? { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY } : rc } : null;
    }
    const sel = window.getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    const t = sel.toString().trim(); if (!t) return null;
    const rects = [...sel.getRangeAt(sel.rangeCount - 1).getClientRects()].filter(r => r.width || r.height);
    let rc = rects[rects.length - 1] || sel.getRangeAt(0).getBoundingClientRect();
    if ((!rc || (!rc.width && !rc.height)) && e && e.clientX) rc = { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY };
    if (!rc || (!rc.width && !rc.height && !rc.top)) return null;
    return { t, rc };
  }
  chrome.runtime.onMessage.addListener(msg => { if (msg && msg.type === 'hh-page-translate' && ui && !pageTr.running) translatePage(); });   // V1.85: chuột phải → Dịch cả trang
  function showChip(e) {
    if (!ui || !active() || ((settings.ideas || {}).chip === false && (settings.dich || {}).chip === false)) return;
    const s = selInfo(e); hideChip();
    if (!s || !/[\p{L}\p{N}]/u.test(s.t)) return;
    const t = s.t.slice(0, 20000), rc = s.rc;
    selChip = el('div', 'selchip');
    // từ 1 chữ trở lên: Dịch, Giải thích; đoạn dài (từ 15 ký tự) mới thêm Note, Nhắc
    if ((settings.dich || {}).chip !== false) {
      const dd = el('button', '', '🌐 Dịch'); dd.addEventListener('click', () => { hideChip(); translateText(t, 'sel'); });
      const x = el('button', '', '💡 Giải thích'); x.addEventListener('click', () => { hideChip(); doExplain(t); });
      const pg = el('button', '', '🌍 Cả trang'); pg.title = 'Dịch cả trang (Google Dịch)'; pg.addEventListener('click', () => { hideChip(); if (!pageTr.running) translatePage(); });   // V1.85
      selChip.append(dd, pg, x);
    }
    if ((settings.ideas || {}).chip !== false && t.length >= 15) {
      const sv = el('button', 'sv', '📝 Note'); sv.title = 'Lưu Note (kèm link trang)';
      sv.addEventListener('click', () => { hideChip(); saveIdea({ type: 'text', text: t, title: document.title, url: location.href }); });
      selChip.append(sv);   // 1.10.2: bỏ nút 🔔 Nhắc, chỉ còn Dịch · Giải thích · Note
    }
    if (!selChip.children.length) { selChip = null; return; }
    selChip.addEventListener('mousedown', ev => ev.preventDefault());
    ui.root.append(selChip);
    const w = selChip.offsetWidth || 300, hgt = selChip.offsetHeight || 34;
    const below = rc.bottom + 8 + hgt < innerHeight;
    selChip.style.left = Math.min(innerWidth - w - 8, Math.max(8, rc.right - w)) + 'px';
    selChip.style.top = (below ? rc.bottom + 8 : Math.max(8, rc.top - hgt - 8)) + 'px';
  }
  document.addEventListener('mouseup', e => {
    if (e.button !== 0) return;
    if (ui && e.composedPath && e.composedPath().includes(ui.host)) return;
    setTimeout(() => showChip(e), 10);
  }, true);
  // bôi đen bằng bàn phím (Shift + mũi tên, Ctrl+A)
  document.addEventListener('keyup', e => {
    const k = String(e.key || '').toLowerCase();
    if (!(e.shiftKey || k === 'shift' || ((e.ctrlKey || e.metaKey) && k === 'a'))) return;
    if (ui && e.composedPath && e.composedPath().includes(ui.host)) return;
    setTimeout(() => showChip(null), 10);
  }, true);
  document.addEventListener('mousedown', e => { if (selChip && !(e.composedPath && e.composedPath().includes(ui.host))) hideChip(); }, true);
  window.addEventListener('scroll', hideChip, { passive: true });

  const fmtSec = x => { x = Math.floor(x); const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s2 = x % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s2).padStart(2, '0'); };
  async function copyText(t, btn) {
    try { await navigator.clipboard.writeText(t); if (btn) { const o = btn.textContent; btn.textContent = 'Đã chép ✓'; setTimeout(() => { if (btn.isConnected) btn.textContent = o; }, 1200); } }
    catch { say('Không chép được, bấm vào trang rồi thử lại.', 'alert', '', 'idea'); }
  }
  // V1.52: note → dự án (V1.55: mọi người dùng có dự án)
  let pjBoard = null, pjAsked = false;
  const pjLoad = () => chrome.storage.local.get('projBoard').then(({ projBoard: b }) => { pjBoard = b || null; return pjBoard; }).catch(() => null);   // V1.55: mọi người dùng
  chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && ch.projBoard && pjAsked) pjLoad(); });
  const pjEsc = t => String(t).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  async function noteToProj(id, pid) {
    const { ideas: all = [], projBoard: B } = await chrome.storage.local.get(['ideas', 'projBoard']);
    const it = all.find(y => y.id === id); if (!it || !B) return;
    const uid = () => Math.random().toString(36).slice(2, 9);
    if (it.pj) {   // bỏ dòng cũ (chuyển dự án / bỏ khỏi dự án)
      const P = (B.projects || []).find(x => x.id === it.pj.p), F = P && (P.folders || []).find(x => x.id === it.pj.f);
      if (F) F.rows = (F.rows || []).filter(r => r.id !== it.pj.r);
      delete it.pj;
    }
    const [pp, ff] = String(pid || '').split('|');
    const P = pp && (B.projects || []).find(x => x.id === pp);
    if (P) {
      P.folders = P.folders || [];
      let F = (ff && P.folders.find(x => x.id === ff && !x.kind)) || P.folders.find(x => !x.kind && x.name === '📝 Ghi chú');
      if (!F) { F = { id: uid(), name: '📝 Ghi chú', rows: [], v28: 1, v29: 1 }; P.folders.push(F); }
      const txt = (it.text || '').trim(), t = (it.name || txt.split('\n')[0] || 'Ghi chú').slice(0, 90);
      const r = { id: uid(), t, done: false, html: pjEsc(txt).replace(/\n/g, '<br>') };
      if (it.url && /^https?:/.test(it.url)) r.link = it.url;
      F.rows.push(r); it.pj = { p: P.id, f: F.id, r: r.id };
    }
    pjBoard = B; await chrome.storage.local.set({ projBoard: B, ideas: all });
  }
  function renderIdea(V) {
    if (!pjAsked) { pjAsked = true; pjLoad().then(b => { if (b && tab === 'idea') renderPanel(); }); }
    const cfg = settings.ideas || {}, hasAi = !!(settings.ai || {}).key;
    const saveCfg = patch => { settings.ideas = { ...(settings.ideas || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    // ghi nhanh
    const row = h(`<div class="row nrow"><button class="mic" aria-label="Ghi chú bằng giọng nói" title="Ghi chú bằng giọng nói (hoặc bấm giữ HaoHao)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/></svg></button>
        <input class="grow" placeholder="Ghi note…" aria-label="Note mới"><button class="b">Lưu</button></div>`);
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
    // 🖼️ lấy chữ trong ảnh
    if (false && ocrMenu) {   // 1.9.89: bỏ lấy chữ từ ảnh
      const om = el('div', 'ocrm');
      const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.hidden = true;
      fi.addEventListener('change', () => { const f = fi.files && fi.files[0]; if (f) ocrFile(f); });
      const b1 = el('button', 'b ghost', '📁 Chọn ảnh từ máy'); b1.addEventListener('click', () => fi.click());
      const b2 = el('button', 'b ghost', '✂️ Quét vùng trên trang'); b2.addEventListener('click', () => { ocrMenu = false; ocrArea(); });
      om.append(fi, b1, b2, el('div', 'tip', 'Hoặc: dán ảnh vào ô note (Ctrl+V), kéo thả ảnh vào đây, hoặc quét vùng. Phím tắt quét vùng: Alt+Shift+O.'));
      V.append(om);
    }
    ocrState = null;
    const src = el('div', 'row nbar');
    const id = ytId();
    if (id) {
      const v = document.querySelector('video'); const sec = v ? v.currentTime : 0;
      const b = el('button', 'ic2', '📺'); b.title = `Lưu video này (tại ${fmtSec(sec)})`; b.setAttribute('aria-label', 'Lưu video này');
      b.addEventListener('click', () => {
        const s0 = (document.querySelector('video') || {}).currentTime || 0;
        saveIdea({ type: 'video', title: document.title.replace(/ - YouTube$/, ''), url: 'https://www.youtube.com/watch?v=' + id + (s0 > 5 ? '&t=' + Math.floor(s0) + 's' : ''), sec: s0, text: '' });
      });
      src.append(b);
    } else {
      const b = el('button', 'ic2', '🔖'); b.title = 'Lưu trang này'; b.setAttribute('aria-label', 'Lưu trang này');
      b.addEventListener('click', async () => {
        // trang Tab mới của HaoHao không có gì để lưu
        if (location.protocol === 'chrome-extension:') return say('Mở một trang web rồi bấm 🔖 để lưu trang đó nhé.', 'think', '📝 Note', 'idea');
        if (ideas.some(x => x.type === 'page' && x.url === location.href)) { b.textContent = '✓'; setTimeout(() => { b.textContent = '🔖'; }, 1500); return say('Trang này đã có trong Note rồi.', 'happy', '📝 Note', 'idea'); }
        await saveIdea({ type: 'page', title: document.title, url: location.href, text: '' });
        b.textContent = '✓'; setTimeout(() => { if (b.isConnected) b.textContent = '🔖'; }, 1500);
        say('Đã lưu trang này vào Note.', 'happy', '📝 Note', 'idea');
      });
      src.append(b);
    }
    const sq = document.createElement('input'); sq.className = 'grow'; sq.placeholder = '🔍 Tìm note…'; sq.value = ideaQuery; sq.setAttribute('aria-label', 'Tìm ý tưởng');
    sq.addEventListener('input', () => { ideaQuery = sq.value; drawList(); });
    src.append(sq);
    ideaFilter = 'all'; ideaQuery = '';
    // 1.9.93: bỏ ô tìm note; nút 🔖 lưu trang (📺 lưu video) đưa lên hàng ghi note
    row.insertBefore(src.firstChild, qi);
    // 1.10.20: bỏ nút 📋 lưu chữ vừa chép
    const L = el('div', 'body-list'); V.append(L);
    const cnt = el('span', 'cnt', '');
    function drawList() {
      L.innerHTML = ''; cnt.textContent = '';
      const q = norm(ideaQuery.trim(), true);
      const list = ideas.filter(it => (ideaFilter === 'all' || (ideaFilter === 'text' ? ['text', 'page', 'summary', 'ocr'].includes(it.type) : it.type === ideaFilter))
        && (!q || (/^#?\d+$/.test(q) ? String(it.no) === q.replace('#', '') || norm(`${it.name || ''} ${it.text} ${it.title}`, true).includes(q) : false) || norm(`${it.name || ''} ${it.text} ${it.title} ${(it.ai && it.ai.titles || []).join(' ')}`, true).includes(q)));
      if (!ideas.length) { L.append(el('div', 'empty', 'Chưa có note. Bôi đen chữ ở bất kỳ trang nào rồi bấm 📝 Note (tự lưu cả link trang). Hoặc bấm 🎤 để nói.')); return; }
      if (!list.length) { L.append(el('div', 'empty', 'Không có ý tưởng nào khớp.')); return; }
      cnt.textContent = `${list.length} note`;
      list.slice(0, 100).forEach((it, i) => L.append(ideaCard(it, false, i + 1)));   // số thứ tự theo danh sách đang hiện: 1, 2, 3…
    }
    drawList();
    // chân: gọn một dòng, bấm Tuỳ chỉnh mới hiện cài đặt
    const pf = el('div', 'pf npf');
    if (ideas.length) {
      const ex = el('button', 'b ghost', '📋 Chép tất cả'); ex.title = 'Sao chép tất cả note';
      ex.addEventListener('click', () => copyText(ideas.map(ideaAsText).join('\n\n────────\n\n'), ex));
      pf.append(ex);
    }
    pf.append(cnt);
    V.append(pf);
    return;
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
    au.append(ac, hasAi ? 'Tự tạo sẵn gợi ý khi lưu (vẫn ẩn, bấm ✨ mới hiện)' : 'Gợi ý tiêu đề và caption cần mã Gemini (nhập ở Cài đặt → Đọc hộ (Gemini))');
    pf2.append(au);
    const ch = el('label', 'snd'); const cc = document.createElement('input'); cc.type = 'checkbox'; cc.checked = cfg.chip !== false;
    cc.addEventListener('change', () => saveCfg({ chip: cc.checked }));
    ch.append(cc, 'Hiện nút 💡 Lưu khi bôi đen chữ');
    pf2.append(ch);
    V.append(pf2);
  }
  // ---------- 🖼️ Lấy chữ trong ảnh ----------
  // thu nhỏ ảnh (cạnh dài tối đa 2000px) rồi gửi Gemini đọc chữ
  function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Không mở được ảnh')); im.src = src; }); }
  async function shrink(src, crop) {
    const im = await loadImg(src);
    const sx = crop ? crop.x : 0, sy = crop ? crop.y : 0, sw = crop ? crop.w : im.naturalWidth, sh = crop ? crop.h : im.naturalHeight;
    if (sw < 4 || sh < 4) throw new Error('Vùng chọn nhỏ quá');
    const k = Math.min(1, 2000 / Math.max(sw, sh)), cv = document.createElement('canvas');
    cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.92);
  }
  const fileToUrl = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Không đọc được file')); r.readAsDataURL(f); });
  async function ocrFile(f) { try { ocrRun(await shrink(await fileToUrl(f))); } catch (e) { ocrFail(e.message); } }
  function ocrFail(msg) { ocrState = { error: msg }; ocrMenu = false; if (ui) { if (ui.panel.hidden || tab !== 'idea') openTab('idea'); else renderPanel(); } }
  async function ocrRun(img) {
    ocrMenu = false;
    if (!(settings.ai || {}).key) return ocrFail('Lấy chữ trong ảnh cần mã Gemini (miễn phí). Nhập ở nhánh Thông tin → Tóm tắt.');
    ocrState = { img, loading: true };
    if (ui) { if (ui.panel.hidden || tab !== 'idea') openTab('idea'); else renderPanel(); }
    try {
      const r = await chrome.runtime.sendMessage({ type: 'ocr', image: img });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      if (!ocrState || ocrState.img !== img) return;
      ocrState = { img, text: /^\(không có chữ\)$/i.test(r.text.trim()) ? '' : r.text, none: /^\(không có chữ\)$/i.test(r.text.trim()) };
    } catch (e) { if (ocrState && ocrState.img === img) ocrState = { img, error: errText(e.message) }; }
    renderPanel();
  }
  function ocrBox() {
    const s = ocrState, box = el('div', 'ocrbox');
    const hd = el('div', 'oh');
    if (s.img) { const im = document.createElement('img'); im.src = s.img; im.alt = 'Ảnh đang lấy chữ'; hd.append(im); }
    const ttl = el('div', 'ot'); ttl.append(el('b', '', '🖼️ Chữ trong ảnh'));
    ttl.append(el('span', '', s.loading ? 'HaoHao đang đọc chữ…' : s.error ? '' : s.none ? 'Không thấy chữ trong ảnh này' : `${s.text.length} ký tự · sửa được trước khi lưu`));
    hd.append(ttl);
    const x = el('button', 'ox', '✕'); x.title = 'Đóng'; x.setAttribute('aria-label', 'Đóng'); x.addEventListener('click', () => { ocrState = null; renderPanel(); });
    hd.append(x); box.append(hd);
    if (s.loading) box.append(h('<div class="loading"><span class="dots"><i></i><i></i><i></i></span> Đang nhận diện chữ…</div>'));
    if (s.error) box.append(el('div', 'err', '⚠ ' + s.error));
    if (s.text) {
      const ta = document.createElement('textarea'); ta.value = s.text; ta.rows = Math.min(8, Math.max(3, s.text.split('\n').length)); ta.setAttribute('aria-label', 'Chữ lấy từ ảnh');
      ta.addEventListener('input', () => { s.text = ta.value; });
      ta.addEventListener('keydown', e => e.stopPropagation());
      box.append(ta);
      // 🔍 giống Live Text iPhone: tách sẵn số tài khoản / số điện thoại / link / email, bấm là chép (link thì mở)
      const found = [], seen = new Set();
      const push = (kind, val, show) => { if (!val || seen.has(val)) return; seen.add(val); found.push({ kind, val, show }); };
      for (const m of s.text.matchAll(/https?:\/\/[^\s]+|www\.[^\s]+/gi)) push('link', m[0].startsWith('http') ? m[0] : 'https://' + m[0], m[0]);
      for (const m of s.text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) push('mail', m[0], m[0]);
      for (const m of s.text.matchAll(/(?:\+?84|0)(?:[\s.]?\d){8,10}\b|\b\d(?:[\s.-]?\d){7,19}\b/g)) {
        const d = m[0].replace(/[\s.-]/g, ''); if (d.length < 8) continue;
        const phone = /^(0|\+?84)\d{8,10}$/.test(d) && d.length <= 12;
        push(phone ? 'phone' : 'num', d, m[0].trim());
      }
      if (found.length) {
        const qa = el('div', 'ocrqa');
        const IC = { link: '🔗', mail: '✉️', phone: '📞', num: '🔢' };
        found.slice(0, 8).forEach(f => {
          const b = el('button', 'chip', `${IC[f.kind]} ${f.show.length > 26 ? f.show.slice(0, 24) + '…' : f.show}`);
          b.title = f.kind === 'link' ? 'Mở link' : 'Bấm để sao chép: ' + f.val;
          b.addEventListener('click', () => f.kind === 'link' ? window.open(f.val, '_blank') : copyText(f.val, b));
          qa.append(b);
        });
        box.append(qa);
      }
      const a = el('div', 'line');
      const sv = el('button', 'b', '📝 Lưu note');
      sv.addEventListener('click', () => { const t = s.text.trim(); if (!t) return; saveIdea({ type: 'ocr', text: t, title: 'Chữ từ ảnh · ' + document.title, url: location.href }); ocrState = null; renderPanel(); });
      const cp = el('button', 'b ghost', '📋 Sao chép'); cp.addEventListener('click', () => copyText(s.text, cp));
      const tr = el('button', 'b ghost', '🌐 Dịch'); tr.addEventListener('click', () => translateText(s.text, 'ocr'));
      a.append(sv, cp, tr); box.append(a);
    }
    return box;
  }
  // ✂️ kéo chọn 1 vùng trên màn hình → chụp → cắt → đọc chữ
  function ocrArea() {
    if (!ui) return;
    const ov = el('div', 'ocrov'), rb = el('div', 'rb'), tip = el('div', 'otip', 'Kéo chuột chọn vùng có chữ · Esc để huỷ');
    ov.append(rb, tip); ui.root.append(ov);
    const wasHidden = ui.panel.hidden;
    let x0 = 0, y0 = 0, on = false;
    const end = () => { ov.remove(); document.removeEventListener('keydown', esc, true); };
    const esc = e => { if (e.key === 'Escape') { e.preventDefault(); end(); } };
    document.addEventListener('keydown', esc, true);
    ov.addEventListener('mousedown', e => { e.preventDefault(); on = true; x0 = e.clientX; y0 = e.clientY; Object.assign(rb.style, { left: x0 + 'px', top: y0 + 'px', width: '0px', height: '0px', display: 'block' }); tip.hidden = true; });
    ov.addEventListener('mousemove', e => { if (!on) return; const x = Math.min(x0, e.clientX), y = Math.min(y0, e.clientY); Object.assign(rb.style, { left: x + 'px', top: y + 'px', width: Math.abs(e.clientX - x0) + 'px', height: Math.abs(e.clientY - y0) + 'px' }); });
    ov.addEventListener('mouseup', async e => {
      if (!on) return; on = false;
      const r = { x: Math.min(x0, e.clientX), y: Math.min(y0, e.clientY), w: Math.abs(e.clientX - x0), h: Math.abs(e.clientY - y0) };
      end();
      if (r.w < 8 || r.h < 8) return;
      await ocrShot(r, wasHidden);
    });
  }
  // chụp màn hình (ẩn HaoHao trong lúc chụp) rồi cắt vùng r (toạ độ CSS)
  async function ocrShot(r, keepHidden) {
    ui.wrap.style.visibility = 'hidden';
    await new Promise(z => requestAnimationFrame(() => requestAnimationFrame(z)));
    let res; try { res = await chrome.runtime.sendMessage({ type: 'ocr-capture' }); } catch (e) { res = { ok: false, error: e.message }; }
    ui.wrap.style.visibility = '';
    if (!res || !res.ok) return ocrFail(res && res.error === 'noperm' ? 'Chrome cần bạn cho phép chụp trang này: bấm Alt+Shift+O, hoặc chuột phải trên trang → 🐹 HaoHao → ✂️ Lấy chữ trong vùng chọn.' : 'Không chụp được màn hình: ' + ((res && res.error) || ''));
    try {
      const im = await loadImg(res.shot), k = im.naturalWidth / innerWidth;
      ocrRun(await shrink(res.shot, { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k }));
    } catch (e) { ocrFail(e.message); }
  }
  // tin từ background: ảnh (chuột phải vào ảnh) hoặc lệnh quét vùng
  // ---------- 🔍 Live Text: phủ chữ chọn được lên đúng chỗ trên ảnh (giống iPhone) ----------
  let lastImg = null;
  function liveStyle() {
    if (document.getElementById('hh-live-css')) return;
    const st = document.createElement('style'); st.id = 'hh-live-css';
    st.textContent = `.hh-live{position:absolute;z-index:2147483600;pointer-events:none}
.hh-live .hh-ln{position:absolute;pointer-events:auto;color:transparent;white-space:pre;line-height:1;cursor:text;user-select:text;-webkit-user-select:text;transform-origin:0 0;font-family:Arial,sans-serif;background:rgba(255,255,255,.001)}
.hh-live .hh-ln::selection{background:rgba(46,125,215,.45);color:transparent}
.hh-live.scan{background:linear-gradient(transparent 40%,rgba(242,181,68,.35) 50%,transparent 60%);background-size:100% 200%;animation:hhscan 1.2s linear infinite}
@keyframes hhscan{from{background-position:0 100%}to{background-position:0 -100%}}
.hh-live.ready .hh-ln{box-shadow:0 0 0 1px rgba(255,255,255,.0)}
.hh-live .hh-bar{position:absolute;right:6px;top:6px;display:flex;gap:6px;pointer-events:auto;font:600 12px/1 system-ui,Segoe UI,sans-serif}
.hh-live .hh-bar button{all:unset;cursor:pointer;background:rgba(35,48,94,.92);color:#fff;padding:6px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap}
.hh-live .hh-bar button:hover{background:#23305E}
.hh-live .hh-tip{position:absolute;left:6px;bottom:6px;pointer-events:none;background:rgba(35,48,94,.85);color:#fff;font:600 11.5px system-ui,Segoe UI,sans-serif;padding:5px 9px;border-radius:999px}`;
    document.head.append(st);
  }
  const liveCanvas = document.createElement('canvas').getContext('2d');
  function liveClose() { document.querySelectorAll('.hh-live').forEach(x => x.remove()); }
  async function liveText(img, dataUrl, rect) {
    liveClose(); liveStyle();
    const R = rect || img.getBoundingClientRect();
    const ov = document.createElement('div'); ov.className = 'hh-live scan';
    ov.style.cssText = `left:${R.left + scrollX}px;top:${R.top + scrollY}px;width:${R.width}px;height:${R.height}px`;
    const tip = document.createElement('div'); tip.className = 'hh-tip'; tip.textContent = '🐹 HaoHao đang đọc chữ…'; ov.append(tip);
    document.body.append(ov);
    let r;
    try { r = await chrome.runtime.sendMessage({ type: 'ocr-boxes', image: dataUrl }); } catch (e) { r = { ok: false, error: e.message }; }
    ov.classList.remove('scan');
    if (!r || !r.ok) { tip.textContent = '⚠ ' + (r && r.error === 'nokey' ? 'Cần mã Gemini (nhánh Thông tin → Tóm tắt)' : 'Chưa đọc được chữ: ' + ((r && r.error) || 'mất kết nối')); setTimeout(() => ov.remove(), 4000); return; }
    if (!r.lines.length) { tip.textContent = 'Không thấy chữ trong ảnh này'; setTimeout(() => ov.remove(), 2500); return; }
    for (const ln of r.lines) {
      const [y0, x0, y1, x1] = ln.b; const w = (x1 - x0) / 1000 * R.width, hgt = (y1 - y0) / 1000 * R.height;
      if (w < 2 || hgt < 2) continue;
      const fs = Math.max(6, hgt * 0.92);
      liveCanvas.font = `${fs}px Arial, sans-serif`;
      const tw = liveCanvas.measureText(ln.t).width || w;
      const sp = document.createElement('span'); sp.className = 'hh-ln'; sp.textContent = ln.t;
      sp.style.cssText = `left:${x0 / 10}%;top:${y0 / 10}%;height:${hgt}px;font-size:${fs}px;transform:scaleX(${(w / tw).toFixed(3)})`;
      ov.append(sp);
    }
    ov.classList.add('ready');
    tip.textContent = 'Kéo chuột bôi đen chữ trên ảnh rồi Ctrl+C';
    setTimeout(() => tip.remove(), 5000);
    const bar = document.createElement('div'); bar.className = 'hh-bar';
    const all = r.lines.map(x => x.t).join('\n');
    const cp = document.createElement('button'); cp.textContent = '📋 Chép tất cả'; cp.addEventListener('click', () => copyText(all, cp));
    const nt = document.createElement('button'); nt.textContent = '📝 Mở bảng'; nt.title = 'Mở bảng Note: sửa, lưu, dịch, tách số tài khoản / số điện thoại';
    nt.addEventListener('click', () => { ocrState = { img: dataUrl, text: all }; openTab('idea'); });
    const x = document.createElement('button'); x.textContent = '✕'; x.title = 'Tắt chữ trên ảnh'; x.addEventListener('click', liveClose);
    bar.append(cp, nt, x); ov.append(bar);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') liveClose(); });
  chrome.runtime.onMessage.addListener(msg => { (async () => {
    if (!ui || !msg) return;
    if (msg.type === 'hh-ocr-area') return ocrArea();
    if (msg.type !== 'hh-ocr') return;
    if (msg.error) return ocrFail(msg.error);
    try {
      const vis = lastImg && lastImg.isConnected && (() => { const q = lastImg.getBoundingClientRect(); return q.width > 30 && q.height > 20; })();
      if (msg.image) return ocrRun(await shrink(msg.image));
      if (msg.shot) {
        const img = [...document.images].find(i => i.currentSrc === msg.src || i.src === msg.src);
        const rc = img && img.getBoundingClientRect();
        if (!rc || rc.width < 4 || rc.bottom < 0 || rc.top > innerHeight) return ocrFail('Không thấy ảnh trên màn hình. Cuộn tới ảnh rồi dùng “Lấy chữ trong vùng chọn”.');
        const r = { x: Math.max(0, rc.left), y: Math.max(0, rc.top), w: Math.min(innerWidth, rc.right) - Math.max(0, rc.left), h: Math.min(innerHeight, rc.bottom) - Math.max(0, rc.top) };
        const im = await loadImg(msg.shot), k = im.naturalWidth / innerWidth;
        const cut = await shrink(msg.shot, { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k });
        ocrRun(cut);
      }
    } catch (e) { ocrFail(e.message); }
  })(); });

  function ideaAsText(it) {
    let t = `${it.no ? '#' + it.no + ' ' : ''}${it.name ? it.name + '\n' : it.no ? '\n' : ''}${IDEA_ICON[it.type] || '💡'} ${it.title || ''}\n${it.url || ''}\n${it.text || ''}`.trim();
    if (it.ai && it.ai.titles) t += `\n\nTiêu đề gợi ý:\n${it.ai.titles.map(x => '- ' + x).join('\n')}\n\nCaption:\n${it.ai.caption}\n${(it.ai.hashtags || []).join(' ')}`;
    return t;
  }
  // 🎨 màu note (vàng / đỏ / xanh) để dễ tìm: bấm chấm màu để đổi vòng
  const NOTE_COLORS = ['', 'yellow', 'red', 'green', 'blue', 'purple', 'white', 'black'];
  const NOTE_NAME = { '': 'Không màu', yellow: 'Vàng', red: 'Hồng', green: 'Xanh lá', blue: 'Xanh dương', purple: 'Tím', white: 'Trắng', black: 'Đen' };
  function colorDot(it) {
    const cur = NOTE_COLORS.includes(it.color) ? it.color : '';
    const b = el('button', 'cdot c-' + (cur || 'none')); b.title = 'Màu: ' + NOTE_NAME[cur] + ' (bấm để đổi)'; b.setAttribute('aria-label', 'Đổi màu note');
    b.addEventListener('click', async e => {
      e.stopPropagation();
      const nx = NOTE_COLORS[(NOTE_COLORS.indexOf(cur) + 1) % NOTE_COLORS.length];
      const { ideas: all = [] } = await chrome.storage.local.get('ideas');
      const x = all.find(y => y.id === it.id); if (!x) return;
      if (nx) x.color = nx; else delete x.color;
      await chrome.storage.local.set({ ideas: all });
    });
    return b;
  }
  function ideaCard(it, hasAi, pos) {
    if (it.type === 'page' && it.url && !it.name) {
      const c = el('div', 'idea pgl' + (it.color ? ' c-' + it.color : ''));
      c.append(colorDot(it));
      if (pos || it.no) c.append(el('span', 'no', '#' + (pos || it.no)));
      c.append(el('span', 'pi', '🔖'));
      const a = el('button', 'lk', it.title || it.url); a.title = it.url; a.addEventListener('click', () => window.open(it.url, '_blank')); c.append(a);
      c.append(el('span', 'tm', new Date(it.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })));
      const cp = el('button', 'ib', '📋'); cp.title = 'Chép link'; cp.setAttribute('aria-label', 'Chép link'); cp.addEventListener('click', () => copyText(it.url, cp));
      const del = el('button', 'ib del', '🗑'); del.title = 'Xoá'; del.setAttribute('aria-label', 'Xoá');
      del.addEventListener('click', async () => {
        if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'Xoá?'; del.classList.add('sure'); return; }
        const { ideas: all = [] } = await chrome.storage.local.get('ideas');
        await chrome.storage.local.set({ ideas: all.filter(x => x.id !== it.id) });
      });
      c.append(cp, del);
      return c;
    }
    const c = el('div', 'idea' + (openIdea === it.id ? ' open' : '') + (it.color ? ' c-' + it.color : ''));
    const hd = el('div', 'ih');
    hd.append(colorDot(it));
    if (pos || it.no) hd.append(el('span', 'no', '#' + (pos || it.no)));
    hd.append(el('span', '', IDEA_ICON[it.type] || '💡'));
    if (it.url) {
      const a = el('button', 'lk', it.title || it.url); a.title = it.url;
      a.addEventListener('click', () => window.open(it.url, '_blank'));
      hd.append(a);
      if (it.type === 'video' && it.sec > 5) hd.append(el('span', '', '▶ ' + fmtSec(it.sec)));
    } else hd.append(el('span', '', it.title || 'Ý tưởng'));
    hd.append(el('span', 'tm', new Date(it.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })));
    const sk = el('button', 'stk', '🗒'); sk.title = 'Mở thành giấy dán (cửa sổ riêng, sửa trực tiếp)'; sk.setAttribute('aria-label', 'Mở note thành giấy dán');
    sk.addEventListener('click', e => { e.stopPropagation(); chrome.runtime.sendMessage({ type: 'sticky-open', id: it.id }).catch(() => {}); });
    hd.append(sk);
    c.append(hd);
    // tiêu đề ghi chú (người dùng tự đặt), bấm để sửa
    const nt = el('button', 'nt' + (it.name ? '' : ' empty'), it.name || '＋ Thêm tiêu đề');
    nt.title = 'Bấm để đặt hoặc sửa tiêu đề';
    nt.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.className = 'nti'; inp.value = it.name || ''; inp.placeholder = 'Tiêu đề ghi chú…'; inp.maxLength = 120; inp.setAttribute('aria-label', 'Tiêu đề ghi chú');
      let done = false;
      const save = async keep => {
        if (done) return; done = true;
        const v = keep ? inp.value.trim() : (it.name || '');
        if (v === (it.name || '')) { inp.replaceWith(nt); return; }
        const { ideas: all = [] } = await chrome.storage.local.get('ideas');
        const x = all.find(y => y.id === it.id); if (x) { if (v) x.name = v; else delete x.name; }
        await chrome.storage.local.set({ ideas: all });
      };
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') save(true); else if (e.key === 'Escape') save(false); });
      inp.addEventListener('blur', () => save(true));
      nt.replaceWith(inp); inp.focus(); inp.select();
    });
    c.append(nt);
    if (it.text) {
      // 1.10.8: cố định 3 dòng, bấm không bung ra (xem đủ: bấm 🗒 mở giấy dán); vẫn bôi đen chép được
      // V1.14: note dài mặc định thu gọn 3 dòng, bấm ▾ Xem hết để hiện đủ như note nổi (nhớ theo từng note: it.unfold)
      const tx = el('div', 'it2' + (it.unfold ? ' full' : ''), it.text);
      const fb = el('button', 'fold', it.unfold ? '▴ Thu gọn' : '▾ Xem hết'); fb.hidden = true;
      fb.addEventListener('click', async e => {
        e.stopPropagation();
        const { ideas: all = [] } = await chrome.storage.local.get('ideas');
        const x = all.find(y => y.id === it.id); if (!x) return;
        if (x.unfold) delete x.unfold; else x.unfold = true; delete x.fold;
        await chrome.storage.local.set({ ideas: all });
      });
      c.append(tx, fb);
      requestAnimationFrame(() => { const lh = parseFloat(getComputedStyle(tx).lineHeight) || 20; if (tx.scrollHeight > lh * 3 + 4) fb.hidden = false; });
    }
    // V1.52: chọn dự án để lưu note (chỉ máy chủ app) → thêm 1 dòng vào mục "📝 Ghi chú" của dự án ở trang Dự án
    if (pjBoard && (pjBoard.projects || []).length) {
      const box = el('div', 'npj'), sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Lưu note vào dự án'); sel.title = 'Lưu note này vào dự án';
      sel.add(new Option(it.pj ? '✕ Bỏ khỏi dự án' : '📁 Lưu vào dự án…', ''));
      // V1.54: chọn tới thư mục con của dự án (nhóm = mảng · dự án, mục = thư mục con)
      const areas = pjBoard.areas || [];
      [...areas, { id: null, name: 'Khác' }].forEach(A => {
        const ps = (pjBoard.projects || []).filter(x => A.id ? x.area === A.id : !areas.some(z => z.id === x.area));
        ps.forEach(x => {
          const fs = (x.folders || []).filter(f => !f.kind);
          const g = document.createElement('optgroup'); g.label = ((A.icon || '') + ' ' + (x.name || 'Dự án')).trim();
          if (fs.length) fs.forEach((f, i) => g.append(new Option((i + 1) + '. ' + (f.name || 'Thư mục'), x.id + '|' + f.id)));
          else g.append(new Option('📝 Ghi chú (tạo mới)', x.id + '|'));
          sel.append(g);
        });
      });
      const curV = it.pj ? it.pj.p + '|' + it.pj.f : '';
      sel.value = curV; if (sel.value !== curV) sel.value = '';
      box.classList.toggle('on', !!(it.pj && sel.value));
      sel.addEventListener('click', e => e.stopPropagation()); sel.addEventListener('keydown', e => e.stopPropagation());
      sel.addEventListener('change', () => noteToProj(it.id, sel.value));
      if (it.pj && sel.value) { const o = sel.selectedOptions[0], g = o && o.parentNode; box.append(el('span', 'npj-i', '📁 Đã lưu:')); if (g && g.label) sel.title = g.label + ' › ' + o.text; o.text = (g && g.label ? g.label + ' › ' : '') + o.text; } box.append(sel); c.append(box);
    }
    const ai = it.ai;
    const shown = aiOpen.has(it.id);
    if (shown && ai && ai.pending) c.append(h('<div class="ai"><span class="dots"><i></i><i></i><i></i></span> Đang nghĩ tiêu đề và caption…</div>'));
    else if (shown && ai && ai.error) c.append(el('div', 'err', '⚠ Chưa gợi ý được: ' + errText(ai.error)));
    else if (shown && ai && ai.titles) {
      const box = el('div', 'ai');
      box.append(el('div', 'lb2', 'Tiêu đề gợi ý (bấm để chép)'));
      ai.titles.forEach(t => {
        const ln = el('div', 'tl');
        const b = el('button', 'cp', t); b.addEventListener('click', () => copyText(t, b));
        const u = el('button', 'use', 'Đặt làm tiêu đề'); u.addEventListener('click', async () => {
          const { ideas: all = [] } = await chrome.storage.local.get('ideas');
          const x = all.find(y => y.id === it.id); if (x) { x.name = t; await chrome.storage.local.set({ ideas: all }); }
        });
        ln.append(b, u); box.append(ln);
      });
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
    const ib = (ic, tt) => { const b = el('button', 'ib', ic); b.title = tt; b.setAttribute('aria-label', tt); return b; };
    const cp = ib('📋', 'Sao chép'); cp.addEventListener('click', () => copyText(ideaAsText(it), cp));
    const rm = ib('🔔', 'Đặt nhắc');
    rm.addEventListener('click', async () => {
      const t = await noteToReminder(it.name || it.text || it.title, it.url, it.title);
      dueEditId = t.id; openTab('todo');
    });
    const td = ib('☑️', 'Thêm vào Todo');
    td.addEventListener('click', async () => {
      const { todos: tds = [] } = await chrome.storage.local.get('todos');
      tds.push({ id: 't' + Date.now().toString(36), text: it.name || (it.ai && it.ai.titles && it.ai.titles[0]) || (it.text || it.title).slice(0, 150), done: false, due: '', notified: false });
      await chrome.storage.local.set({ todos: tds }); td.textContent = '✓'; td.title = 'Đã thêm vào Todo';
    });
    const del = ib('🗑', 'Xoá'); del.classList.add('del');
    del.addEventListener('click', async () => {
      if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'Xoá?'; del.classList.add('sure'); return; }
      const { ideas: all = [] } = await chrome.storage.local.get('ideas');
      await chrome.storage.local.set({ ideas: all.filter(x => x.id !== it.id) });
    });
    acts.append(cp, rm, td, del);
    hd.insertBefore(acts, hd.querySelector('.stk'));   // 1.10.5: 📋 🔔 ☑️ 🗑 lên cùng hàng với nút giấy dán
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
  // ⚡ Dịch nhanh bằng bộ dịch có sẵn trong Chrome (Translator API, chạy ngay trên máy, không cần mã Gemini).
  // Chrome chưa hỗ trợ (bản cũ, cặp ngôn ngữ chưa có, chưa tải được gói dịch) thì tự chuyển sang Gemini.
  const LANG_VI = { en: 'Tiếng Anh', vi: 'Tiếng Việt', zh: 'Tiếng Trung', 'zh-Hant': 'Tiếng Trung phồn thể', ja: 'Tiếng Nhật', ko: 'Tiếng Hàn', fr: 'Tiếng Pháp', de: 'Tiếng Đức',
    es: 'Tiếng Tây Ban Nha', ru: 'Tiếng Nga', th: 'Tiếng Thái', id: 'Tiếng Indonesia', ms: 'Tiếng Mã Lai', pt: 'Tiếng Bồ Đào Nha', it: 'Tiếng Ý', ar: 'Tiếng Ả Rập', hi: 'Tiếng Hindi',
    tr: 'Tiếng Thổ Nhĩ Kỳ', nl: 'Tiếng Hà Lan', pl: 'Tiếng Ba Lan', uk: 'Tiếng Ukraina', km: 'Tiếng Khmer', lo: 'Tiếng Lào', fil: 'Tiếng Philippines', sv: 'Tiếng Thuỵ Điển' };
  const hasChromeTr = () => typeof self.Translator !== 'undefined' && !!self.Translator.create;
  const trPool = new Map(); let langDet = null;
  // API của Chrome đôi khi treo (máy chưa có mô hình): luôn đặt giờ chờ tối đa, quá giờ thì chuyển sang Gemini
  const tmo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  async function detectLang(text) {
    const s = String(text || '').slice(0, 1200);
    try {
      if (typeof self.LanguageDetector !== 'undefined') {
        langDet = langDet || await tmo(self.LanguageDetector.create(), 2500);
        const r = await tmo(langDet.detect(s), 2500);
        if (r && r[0] && r[0].detectedLanguage && r[0].detectedLanguage !== 'und' && r[0].confidence > 0.35) return r[0].detectedLanguage;
      }
    } catch {}
    try { const r = await tmo(chrome.i18n.detectLanguage(s), 2500); const l = r && r.languages && r.languages[0]; if (l && l.language && l.language !== 'und') return l.language; } catch {}
    return '';
  }
  const baseLang = l => /^zh-(hant|tw|hk)/i.test(l) ? 'zh-Hant' : String(l || '').split('-')[0];
  async function chromeTranslator(src, to, onDownload) {
    if (!hasChromeTr() || !src) return null;
    const key = src + '>' + to;
    if (!trPool.has(key)) trPool.set(key, (async () => {
      const a = await tmo(self.Translator.availability({ sourceLanguage: src, targetLanguage: to }), 3000);
      if (a === 'unavailable') return null;
      if (a !== 'available' && onDownload) onDownload();
      return tmo(self.Translator.create({ sourceLanguage: src, targetLanguage: to }), a === 'available' ? 8000 : 90000);
    })().catch(() => { trPool.delete(key); return null; }));
    return trPool.get(key);
  }
  // giữ nguyên xuống dòng: dịch từng dòng có chữ
  async function trKeepLines(t, text) {
    const lines = String(text).split('\n');
    const out = await Promise.all(lines.map(l => /[\p{L}]/u.test(l) ? tmo(t.translate(l), 15000) : l));
    return out.join('\n');
  }
  // trả về { lang, same, items } hoặc null nếu Chrome không dịch được
  async function fastTranslate(texts, to, onDownload) {
    if (!hasChromeTr()) return null;
    const code = baseLang(await detectLang(texts.join('\n')));
    if (!code) return null;
    const lang = LANG_VI[code] || code.toUpperCase();
    if (code === to) return { lang, same: true, items: texts };
    const t = await chromeTranslator(code, to, onDownload);
    if (!t) return null;
    try {
      const items = [];
      for (let i = 0; i < texts.length; i += 20) items.push(...await Promise.all(texts.slice(i, i + 20).map(x => trKeepLines(t, x))));
      return { lang, same: false, items };
    } catch { return null; }
  }
  async function translateText(text, from, forceAi) {
    text = String(text || '').trim(); if (!text) return;
    dichState = { mode: 'text', from, src: text.slice(0, 20000), loading: true };
    if (ui) { if (ui.panel.hidden || !isSub('dich')) openTab('dich'); else renderPanel(); }
    try {
      // V1.86: bôi đen → Google Dịch trước (nhanh), có nút "Dịch lại bằng AI Gemini"
      let g = null;
      if (!forceAi) { const r = await chrome.runtime.sendMessage({ type: 'g-translate', q: [dichState.src], tl: target() }).catch(() => null); if (r && r.ok && r.items && typeof r.items[0] === 'string' && r.items[0].trim()) g = r; }
      if (g) { const code = baseLang(g.lang || ''); Object.assign(dichState, { lang: LANG_VI[code] || (code ? code.toUpperCase() : ''), same: code === target(), result: code === target() ? dichState.src : g.items[0], engine: 'google', note: '' }); }
      const fast = forceAi || g ? null : await fastTranslate([dichState.src], target(), () => { dichState.note = 'Lần đầu dùng: Chrome đang tải gói dịch, chờ chút nhé…'; renderPanel(); }).catch(() => null);
      if (g) {}
      else if (fast) Object.assign(dichState, { lang: fast.lang, same: fast.same, result: fast.items[0], engine: 'chrome', note: '' });
      else {
        if (!(settings.ai || {}).key) throw new Error(forceAi ? 'Chưa có mã Gemini. Thêm mã ở Cài đặt → Đọc hộ (Gemini) để dịch bằng AI.' : 'Chrome trên máy này chưa có bộ dịch sẵn cho ngôn ngữ này. Thêm mã Gemini ở Cài đặt → Đọc hộ (Gemini) để dịch bằng AI.');
        dichState.note = '';
        const r = await chrome.runtime.sendMessage({ type: 'ai-translate', mode: 'text', text: dichState.src, target: target() });
        if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
        Object.assign(dichState, { lang: r.lang, same: r.same, result: r.translation, engine: 'ai' });
      }
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
  // ---------- 🌐 Dịch cả trang: chữ trên trang đổi sang tiếng Việt ngay tại chỗ (giữ bố cục), thanh nhỏ phía trên để xem bản gốc ----------
  const hasLetters = t => /[\p{L}]{2,}/u.test(t);
  const VI_MARK = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  // nhận ngôn ngữ từng đoạn: trang trộn nhiều thứ tiếng (Việt + Anh) vẫn dịch đúng phần tiếng nước ngoài
  async function segLangs(segs) {
    const out = await Promise.all(segs.map(s => s.length >= 12 ? detectLang(s).then(baseLang).catch(() => '') : Promise.resolve('')));
    const cnt = {}; out.forEach((l, i) => { if (l) cnt[l] = (cnt[l] || 0) + segs[i].length; });
    if (!pageTr.main) pageTr.main = (Object.entries(cnt).sort((a, b) => b[1] - a[1])[0] || [])[0] || '';
    const foreign = (Object.entries(cnt).filter(([l]) => l !== target()).sort((a, b) => b[1] - a[1])[0] || [])[0] || pageTr.src || '';
    // đoạn ngắn (nút, menu, tiêu đề nhỏ) khó đoán ngôn ngữ: theo ngôn ngữ chính của trang
    const shortLang = pageTr.main === target() ? target() : (foreign || pageTr.main);
    return out.map((l, i) => l || (target() === 'vi' && VI_MARK.test(segs[i]) ? 'vi' : shortLang));
  }
  async function trSegments(segs) {
    if (pageTr.forceAi) {   // V1.86: khách bấm "Dịch lại bằng AI Gemini"
      if (!(settings.ai || {}).key) throw new Error('Chưa có mã Gemini. Thêm mã ở Cài đặt → Đọc hộ (Gemini) để dịch bằng AI.');
      const r = await chrome.runtime.sendMessage({ type: 'ai-translate', mode: 'batch', segments: segs, target: target() });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      pageTr.engine = 'ai'; if (!pageTr.lang && r.lang) pageTr.lang = r.lang;
      return segs.map((x, i) => typeof r.items[i] === 'string' && r.items[i].trim() ? r.items[i] : x);
    }
    // V1.85: ưu tiên Google Dịch (Google tự nhận ngôn ngữ, gửi cả gói 1 lần); lỗi thì quay về bộ dịch Chrome / Gemini như cũ
    if (!pageTr.noGoogle) {
      try {
        const r = await chrome.runtime.sendMessage({ type: 'g-translate', q: segs, tl: target() });
        if (r && r.ok && Array.isArray(r.items) && r.items.length === segs.length) {
          pageTr.engine = 'google'; if (!pageTr.lang && r.lang && r.lang !== target()) { pageTr.src = r.lang; pageTr.lang = LANG_VI[r.lang] || r.lang.toUpperCase(); }
          return r.items.map((x, i) => typeof x === 'string' && x.trim() ? x : segs[i]);
        }
        pageTr.noGoogle = true;
      } catch { pageTr.noGoogle = true; }
    }
    const to = target(), langs = await segLangs(segs), items = segs.slice(), groups = {};
    langs.forEach((l, i) => { if (l && l !== to) (groups[l] = groups[l] || []).push(i); });
    const left = [];   // đoạn Chrome không dịch được → nhờ Gemini
    for (const [l, idx] of Object.entries(groups)) {
      if (!pageTr.src) pageTr.src = l;
      const t = await chromeTranslator(l, to, () => { pageTr.note = 'Lần đầu dùng: Chrome đang tải gói dịch…'; trBar(); });
      if (!t) { left.push(...idx); continue; }
      try { const res = await Promise.all(idx.map(i => trKeepLines(t, segs[i]))); idx.forEach((i, k) => { items[i] = res[k]; }); pageTr.engine = pageTr.engine || 'chrome'; pageTr.note = ''; }
      catch { left.push(...idx); }
    }
    if (left.length) {
      if (!(settings.ai || {}).key) {
        const all = Object.values(groups).reduce((n, g) => n + g.length, 0);
        if (left.length === all && !pageTr.map.size) throw new Error('Chrome trên máy này chưa có bộ dịch sẵn cho ngôn ngữ này. Thêm mã Gemini ở Cài đặt → Đọc hộ (Gemini) để dịch bằng AI.');
        return items;
      }
      const r = await chrome.runtime.sendMessage({ type: 'ai-translate', mode: 'batch', segments: left.map(i => segs[i]), target: to });
      if (!r || !r.ok) throw new Error(r ? r.error : 'Không kết nối được');
      left.forEach((i, k) => { if (typeof r.items[k] === 'string') items[i] = r.items[k]; });
      pageTr.engine = 'ai'; if (!pageTr.lang && r.lang) pageTr.lang = r.lang;
    }
    if (!pageTr.lang && pageTr.src) pageTr.lang = LANG_VI[pageTr.src] || pageTr.src.toUpperCase();
    return items;
  }
  async function translatePage(auto) {
    if (pageTr.running) return;
    if (pageTr.showing === 'orig' && pageTr.map.size) showTranslated();
    const vh = innerHeight, posOf = n => { try { const r = n.parentElement.getBoundingClientRect(); return r.bottom < 0 ? 1e6 + Math.abs(r.top) : r.top > vh ? r.top : -1; } catch { return 1e7; } };   // V1.85: phần đang nhìn thấy dịch trước
    const nodes = textNodes().filter(n => !pageTr.map.has(n) && !pageTr.skip.has(n) && hasLetters(n.data) && n.data.trim().length > 1).slice(0, 2500).map(n => [n, posOf(n)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
    if (!nodes.length) { if (!auto) { pageTr.error = pageTr.map.size ? '' : 'Trang này không có chữ để dịch.'; trBar(); } return; }
    Object.assign(pageTr, { running: true, stop: false, done: 0, total: nodes.length, error: '', showing: 'tr', bar: true });
    trBar();
    const batches = []; let cur = [], len = 0;
    for (const n of nodes) {
      const t = n.data.trim();
      if (cur.length && (len + t.length > 3500 || cur.length >= 60)) { batches.push(cur); cur = []; len = 0; }
      cur.push(n); len += t.length;
    }
    if (cur.length) batches.push(cur);
    const runOne = async batch => {
      if (pageTr.stop) return;
      try {
        const segs = batch.map(n => n.data.trim());
        const items = await trSegments(segs);
        batch.forEach((n, i) => {
          const tr = items[i];
          if (typeof tr !== 'string' || tr === segs[i] || !n.isConnected) { pageTr.skip.add(n); return; }
          const orig = n.data, lead = orig.match(/^\s*/)[0], trail = orig.match(/\s*$/)[0];
          pageTr.map.set(n, orig); pageTr.tr.set(n, lead + tr + trail);
          if (pageTr.showing === 'tr') n.data = lead + tr + trail;
        });
      } catch (e) { pageTr.error = errText(e.message); pageTr.stop = true; }
      pageTr.done += batch.length; trBar();
    };
    // V1.85: gói đầu (phần đang nhìn thấy) dịch ngay, các gói sau chạy song song 4 gói một lúc
    if (batches.length) await runOne(batches[0]);
    let bi = 1; const worker = async () => { while (bi < batches.length && !pageTr.stop) { const b = batches[bi++]; await runOne(b); } };
    await Promise.all(pageTr.forceAi ? [worker()] : [worker(), worker(), worker(), worker()]);   // Gemini: chạy lần lượt cho đỡ hết lượt
    pageTr.running = false; trBar(); trWatch();
    if (isSub('dich') && ui && !ui.panel.hidden) renderPanel();
  }
  function restorePage() { for (const [n, o] of pageTr.map) if (n.isConnected) n.data = o; pageTr.showing = 'orig'; trBar(); }
  function showTranslated() { for (const [n, t] of pageTr.tr) if (n.isConnected) n.data = t; pageTr.showing = 'tr'; trBar(); }
  function pageAi() {   // V1.86: dịch lại cả trang bằng Gemini
    if (pageTr.running) return;
    restorePage(); pageTr.map.clear(); pageTr.tr.clear(); pageTr.skip = new WeakSet();
    Object.assign(pageTr, { forceAi: true, engine: '', error: '' }); translatePage();
  }
  function closeTrBar() { pageTr.forceAi = false; pageTr.stop = true; pageTr.main = ''; if (pageTr.map.size) restorePage(); pageTr.bar = false; if (pageTr.obs) { pageTr.obs.disconnect(); pageTr.obs = null; } trBar(); }
  // trang tải thêm nội dung (cuộn vô tận, bấm Xem thêm) trong lúc đang xem bản dịch → tự dịch phần mới
  function trWatch() {
    if (pageTr.obs || !pageTr.map.size || !document.body) return;
    let tm = null;
    pageTr.obs = new MutationObserver(ms => {
      if (pageTr.showing !== 'tr' || pageTr.running) return;
      if (!ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 ? !(n.id === 'hattieu-host') : n.nodeType === 3))) return;
      clearTimeout(tm); tm = setTimeout(() => translatePage(true), 900);
    });
    pageTr.obs.observe(document.body, { childList: true, subtree: true });
  }
  // thanh dịch trang: nằm giữa phía trên màn hình, giống thanh dịch của Chrome
  function trBar() {
    if (!ui) return;
    let b = ui.root.querySelector('.trbar');
    const show = pageTr.bar && (pageTr.running || pageTr.map.size || pageTr.error);
    if (!show) { if (b) b.remove(); if (pageTr.bar && !pageTr.running && !pageTr.map.size && !pageTr.error) { pageTr.bar = false; say(`Trang này đã là ${TARGETS[target()]} rồi.`, 'happy', '', 'dich'); } return; }
    if (!b) { b = el('div', 'trbar'); b.setAttribute('role', 'status'); ui.root.append(b); }
    b.innerHTML = '';
    b.append(el('span', 'ic', '🌐'));
    const tx = el('span', 'tx');
    if (pageTr.running) tx.textContent = pageTr.note || `Đang dịch trang sang ${TARGETS[target()]}… ${Math.round(pageTr.done / Math.max(1, pageTr.total) * 100)}%`;
    else if (pageTr.error && !pageTr.map.size) tx.textContent = '⚠ ' + pageTr.error;
    else tx.textContent = pageTr.showing === 'tr' ? `${pageTr.lang ? pageTr.lang + ' → ' : 'Đã dịch sang '}${TARGETS[target()]}` : 'Đang xem bản gốc';
    b.append(tx);
    if (!pageTr.running && pageTr.map.size && pageTr.engine) b.append(el('span', 'eng' + (pageTr.engine === 'ai' ? ' ai' : ''), (pageTr.engine === 'ai' ? '✨ AI' : pageTr.engine === 'google' ? '🌐 Google' : '⚡ Chrome')));
    if (pageTr.running) {
      b.append(h(`<span class="pg"><i style="width:${Math.round(pageTr.done / Math.max(1, pageTr.total) * 100)}%"></i></span>`));
      const st = el('button', 'tb', 'Dừng'); st.addEventListener('click', () => { pageTr.stop = true; }); b.append(st);
    } else if (pageTr.map.size) {
      const tg = el('button', 'tb', pageTr.showing === 'tr' ? 'Xem bản gốc' : 'Xem bản dịch');
      tg.addEventListener('click', () => { pageTr.showing === 'tr' ? restorePage() : showTranslated(); });
      b.append(tg);
      if (pageTr.engine !== 'ai') { const ag = el('button', 'tb', '✨ Dịch lại bằng AI Gemini'); ag.title = 'Gemini dịch lại cả trang: chậm hơn nhưng mượt, đúng ngữ cảnh hơn'; ag.addEventListener('click', pageAi); b.append(ag); }
    }
    const x = el('button', 'tb x', '✕'); x.title = 'Tắt dịch trang, trả lại bản gốc'; x.setAttribute('aria-label', 'Tắt dịch trang');
    x.addEventListener('click', closeTrBar); b.append(x);
  }

  function renderDich(V) {
    const ai = settings.ai || {};
    if (!ai.key && !hasChromeTr()) { geminiSetup(V, 'Dịch'); return; }
    const saveD = patch => { settings.dich = { ...(settings.dich || {}), ...patch }; return chrome.storage.local.set({ settings }); };
    // ô nhập 1 dòng: Enter là dịch (Shift+Enter xuống dòng)
    const pf = el('div', 'tin-row');
    const ta = document.createElement('textarea'); ta.className = 'tin'; ta.rows = 1; ta.placeholder = 'Dán hoặc gõ chữ cần dịch…'; ta.setAttribute('aria-label', 'Chữ cần dịch');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
    ta.addEventListener('input', grow);
    const go = el('button', 'tin-go', '➜'); go.title = 'Dịch'; go.setAttribute('aria-label', 'Dịch');
    go.addEventListener('click', () => { const t = ta.value.trim(); if (t) translateText(t, 'paste'); else ta.focus(); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go.click(); } });
    pf.append(ta, go); V.append(pf);
    // 1 hàng nút nhỏ: Sang [ngôn ngữ] · ✂ Đoạn bôi đen · 📰 Cả trang · ⚙
    const acts = el('div', 'iacts');
    acts.append(el('span', 'lb', 'Sang'));
    const ts = document.createElement('select'); ts.setAttribute('aria-label', 'Dịch sang');
    Object.entries(TARGETS).forEach(([k, lb]) => { const o = document.createElement('option'); o.value = k; o.textContent = lb; ts.append(o); });
    ts.value = target(); ts.addEventListener('change', () => saveD({ target: ts.value }));
    acts.append(ts);
    const sel = lastSel.text && Date.now() - lastSel.at < 180000 ? lastSel.text : '';
    const bSel = el('button', 'lk' + (sel ? ' hot' : ''), sel ? `✂ Bôi đen (${sel.split(/\s+/).length} chữ)` : '✂ Đoạn bôi đen');
    bSel.addEventListener('click', () => sel ? translateText(sel, 'sel') : say('Bôi đen một đoạn trên trang trước nhé (hoặc dán chữ vào ô trên).', 'alert', '', 'dich'));
    acts.append(bSel);
    if (isPdf()) {
      const bp = el('button', 'lk', '📄 Dịch PDF'); bp.addEventListener('click', () => translatePdf(false)); acts.append(bp);
    } else if (pageTr.map.size && pageTr.bar) {
      const tgl = el('button', 'lk', pageTr.showing === 'tr' ? '↩ Bản gốc' : '🌐 Bản dịch');
      tgl.addEventListener('click', () => { pageTr.showing === 'tr' ? restorePage() : showTranslated(); renderPanel(); });
      acts.append(tgl);
    } else {
      const bp = el('button', 'lk', pageTr.running ? '⏳ Đang dịch…' : '📰 Cả trang');
      bp.title = 'Đổi cả trang web sang ngôn ngữ đã chọn, giữ nguyên bố cục';
      bp.addEventListener('click', () => { if (pageTr.running) return; closePanel(); translatePage(); });
      acts.append(bp);
    }
    const gear = el('button', 'lk gear', '⚙'); gear.title = 'Cài đặt dịch'; gear.setAttribute('aria-label', 'Cài đặt dịch');
    acts.append(gear); V.append(acts);
    const opt = el('label', 'iopt'); opt.hidden = true;
    const cc = document.createElement('input'); cc.type = 'checkbox'; cc.checked = (settings.dich || {}).chip !== false;
    cc.addEventListener('change', () => saveD({ chip: cc.checked }));
    opt.append(cc, 'Hiện nút 🌐 Dịch khi bôi đen chữ');
    gear.addEventListener('click', () => { opt.hidden = !opt.hidden; });
    V.append(opt);
    const L = el('div', 'body-list');
    // kết quả dịch đoạn / PDF
    const d = dichState;
    if (d) {
      const box = el('div', 'trbox');
      if (d.loading) box.append(h(`<div class="loading"><span class="dots"><i></i><i></i><i></i></span>${d.mode === 'pdf' ? 'HaoHao đang dịch PDF (file dài có thể mất 1 phút)…' : d.note || 'HaoHao đang dịch…'}</div>`));
      if (d.lang) {
        const lg = el('div', 'lg', d.same ? `Đoạn này đã là ${TARGETS[target()]}` : `${d.lang} → ${TARGETS[target()]}`);
        if (d.engine && !d.loading) lg.append(el('span', 'eng' + (d.engine === 'ai' ? ' ai' : ''), (d.engine === 'ai' ? '✨ AI' : d.engine === 'google' ? '🌐 Google' : '⚡ Chrome')));
        box.append(lg);
      }
      if (d.mode === 'text' && d.src) box.append(el('div', 'trsrc', d.src));
      const out = d.mode === 'pdf' ? (d.parts || []).join('\n\n') : d.result;
      if (out) box.append(md(out));
      if (d.error) box.append(el('div', 'err', '⚠ ' + d.error));
      if (out && !d.loading) {
        const a2 = el('div', 'line');
        const cp = el('button', 'b ghost', 'Sao chép bản dịch'); cp.addEventListener('click', () => copyText(out, cp));
        const sv = el('button', 'b ghost', '📝 Lưu Note'); sv.addEventListener('click', () => saveIdea({ type: 'text', text: out, title: 'Bản dịch: ' + document.title, url: location.href }));
        a2.append(cp, sv);
        if (d.mode === 'text' && d.engine !== 'ai' && !d.same) {
          const deep = el('button', 'b ghost', '✨ Dịch lại bằng AI Gemini'); deep.title = 'Dịch lại bằng Gemini: chậm hơn nhưng mượt, đúng ngữ cảnh hơn';
          deep.addEventListener('click', () => translateText(d.src, d.from, true)); a2.append(deep);
        }
        if (d.mode === 'pdf' && d.more) { const mo = el('button', 'b', 'Dịch tiếp phần sau'); mo.addEventListener('click', () => translatePdf(true)); a2.append(mo); }
        box.append(a2);
      }
      L.append(box);
    }
    if (L.childElementCount) V.append(L);
  }

  // ---------- 🍅 Pomodoro ----------
  function renderFocus(V) {
    const L = el('div', 'body-list pomo-wrap');
    const ab = alertBlock('focus'); if (ab) L.append(ab);
    L.append(pomoCard());
    V.append(L);
  }

  // ---------- 🧠 Thông tin: Dịch · Tóm tắt · Giải thích ----------
  function renderInfo(V0) {
    const V = el('div', 'inf'); V0.append(V);   // khung gọn: chữ nhỏ, ít khoảng trống
    const st = el('div', 'itabs');
    [['dich', '🌐 Dịch'], ['read', '✨ Tóm tắt'], ['explain', '💡 Giải thích'], ['video', '🎬 Song ngữ']].forEach(([k, lb]) => {
      const c = el('button', infoSub === k ? 'on' : '', lb);
      c.addEventListener('click', () => { infoSub = k; if (k === 'read') readReady = false; renderPanel(); });
      st.append(c);
    });
    V.append(st);
    if (infoSub === 'read') renderRead(V); else if (infoSub === 'explain') renderExplain(V); else if (infoSub === 'video') renderSubs(V); else renderDich(V);
  }
  // 🎬 Phụ đề song ngữ cho video: nút bật/tắt + trạng thái video đang xem (subs.js báo về)
  let subsStatus = null;
  window.addEventListener('hh-subs-status', e => { subsStatus = e.detail || null; if (ui && !ui.panel.hidden && tab === 'info' && infoSub === 'video') renderPanel(); });
  function renderSubs(V) {
    const sub = settings.subs || {}, on = !!sub.on, to = target();
    const L = el('div', 'body-list');
    const card = h(`<div class="subcard">
      <div class="sh"><b>Phụ đề song ngữ cho video</b><button class="sw${on ? ' on' : ''}" aria-label="Bật tắt phụ đề song ngữ"><i></i></button></div>
      <div class="sd">Video nói tiếng nước ngoài sẽ có 2 dòng: <b>tiếng gốc</b> + <b class="y">bản dịch</b>. Gemini dịch chuẩn theo ngữ cảnh cả bài.</div>
      <div class="row"><span class="lb">Dịch sang</span><select aria-label="Dịch sang"></select></div>
      <div class="ss"></div></div>`);
    const sel = card.querySelector('select');
    [['vi', '🇻🇳 Tiếng Việt'], ['en', '🇬🇧 English'], ['zh', '🇨🇳 中文'], ['ja', '🇯🇵 日本語'], ['ko', '🇰🇷 한국어']].forEach(([k, lb]) => { const o = document.createElement('option'); o.value = k; o.textContent = lb; o.selected = k === to; sel.append(o); });
    sel.addEventListener('change', () => { settings.dich = { ...(settings.dich || {}), target: sel.value }; chrome.storage.local.set({ settings }); });
    card.querySelector('.sw').addEventListener('click', () => {
      settings.subs = { ...(settings.subs || {}), on: !on }; chrome.storage.local.set({ settings }); renderPanel();
      say(!on ? 'Đã bật phụ đề song ngữ. Mở video nói tiếng nước ngoài là HaoHao tự dịch.' : 'Đã tắt phụ đề song ngữ.', 'happy', '🎬 Song ngữ', 'info');
    });
    const ss = card.querySelector('.ss');
    const yt = /(^|\.)youtube\.com$/.test(location.hostname) && /[?&]v=/.test(location.search);
    if (yt) ss.textContent = on ? ('▶ Video này: ' + ((subsStatus && subsStatus.msg) || 'đang chuẩn bị…')) : '▶ Đang mở video YouTube: bật lên là có song ngữ ngay.';
    else if (subsStatus && subsStatus.web && subsStatus.msg) ss.textContent = '▶ Video trên trang này: ' + subsStatus.msg;
    else ss.textContent = on ? '▶ Mở video có phụ đề tiếng nước ngoài trên trang này, HaoHao sẽ tự dịch song ngữ.' : '▶ Chạy với YouTube và video có phụ đề trên các trang khác. Video không có phụ đề thì chưa dịch được.';
    L.append(card); V.append(L);
  }
  // ⚡ chữ hiện dần: nhận từng phần câu trả lời, chỉ vẽ lại ô kết quả (không vẽ lại cả bảng)
  chrome.runtime.onMessage.addListener(msg => {
    if (!msg || msg.type !== 'ai-chunk') return;
    const st = [explainState, readState].find(x => x && x.loading && x.sid === msg.sid); if (!st) return;
    const first = !st.partial; st.partial = msg.text;
    const box = !first && ui && ui.panel && ui.panel.querySelector('.hh-stream');
    if (box) { box.replaceChildren(md(msg.text)); } else if (ui && !ui.panel.hidden) renderPanel();
  });
  async function doExplain(text, mode, deep) {
    text = String(text || '').trim(); if (!text) { infoSub = 'explain'; if (ui) openTab('info'); return; }
    const m = mode || (settings.explain || {}).mode || 'de';
    explainState = { text: text.slice(0, 2000), mode: m, loading: true, sid: 'x' + Date.now() + Math.random(), deep: !!deep };
    infoSub = 'explain';
    if (ui) { if (ui.panel.hidden || tab !== 'info') openTab('info'); else renderPanel(); }
    try {
      const r = await chrome.runtime.sendMessage({ type: 'ai-explain', text: explainState.text, mode: m, context: document.title, sid: explainState.sid, deep: !!deep });
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
      if (e.loading && e.partial) { const st = el('div', 'hh-stream'); st.append(md(e.partial)); box.append(st); }
      else if (e.loading) box.append(h('<div class="loading"><span class="dots"><i></i><i></i><i></i></span>HaoHao đang nghĩ cách giải thích…</div>'));
      if (e.result) box.append(md(e.result));
      if (e.error) box.append(el('div', 'err', '⚠ ' + e.error));
      if (e.result && !e.loading) {
        const a2 = el('div', 'line');
        const cp = el('button', 'b ghost', 'Sao chép'); cp.addEventListener('click', () => copyText(e.result, cp));
        const sv = el('button', 'b ghost', '📝 Lưu Note'); sv.addEventListener('click', () => saveIdea({ type: 'text', text: e.result, title: 'Giải thích: ' + e.text.slice(0, 60), url: location.href }));
        a2.append(cp, sv);
        if (!e.deep) { const dp = el('button', 'b ghost', '✨ Kỹ hơn'); dp.title = 'Giải thích kỹ hơn bằng Gemini bản đầy đủ (chậm hơn vài giây)'; dp.addEventListener('click', () => doExplain(e.text, e.mode, true)); a2.append(dp); }
        box.append(a2);
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
    for (const t of todos) if (!t.done && t.due && new Date(t.due).getTime() > now) out.push({ at: new Date(t.due).getTime(), text: t.text, icon: '☑️', todo: true, id: t.id });
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
  // ❤️ lưu món đang xem để HaoHao theo dõi giá
  const savedOf = p => p && products.find(x => x.url === p.url);
  async function saveProduct(p, quiet) {
    if (!p || !p.price) return;
    const { products: ps = [] } = await chrome.storage.local.get('products');
    if (ps.some(x => x.url === p.url)) return;
    if (ps.length >= HT.SAVE_MAX) { if (quiet) return 'full'; say(`Theo dõi tối đa ${HT.SAVE_MAX} món. Bỏ bớt 1 món trong ❤️ Đã lưu để lưu món này nhé.`, 'remind', '❤️ Đã đủ ' + HT.SAVE_MAX + ' món', 'shop'); return; }
    ps.unshift({ id: 'p' + Date.now().toString(36), url: p.url, title: p.title.slice(0, 150), image: pageImg() || '', shop: isTikTokItem() ? 'tiktok' : 'shopee',
      price: p.price, saved: p.price, low: p.price, target: 0, at: Date.now(), checked: Date.now(), history: [{ t: Date.now(), p: p.price }] });
    products = ps.slice(0, 100);
    await chrome.storage.local.set({ products });
    if (!quiet) say(`Đã lưu giá ${vnd(p.price)}. Bấm 🔄 trong ❤️ Đã lưu để cập nhật giá mới.`, 'happy', '❤️ Theo dõi giá', 'shop');
    return 'ok';
  }
  async function unsaveProduct(id) {
    const { products: ps = [] } = await chrome.storage.local.get('products');
    products = ps.filter(x => x.id !== id); await chrome.storage.local.set({ products });
  }
  async function setTarget(id, v) {
    const { products: ps = [] } = await chrome.storage.local.get('products');
    const it = ps.find(x => x.id === id); if (!it) return;
    it.target = Math.max(0, Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0)); it.hit = false;
    products = ps; await chrome.storage.local.set({ products });
  }
  // thanh lưu trên trang sản phẩm
  function saveBar(p) {
    const it = savedOf(p), bar = el('div', 'svbar' + (it ? ' on' : ''));
    const b = el('button', 'svb', it ? '❤️ Đã lưu · đang theo dõi giá' : '🤍 Lưu & theo dõi giá');
    b.setAttribute('aria-pressed', !!it);
    b.addEventListener('click', async () => { if (it) await unsaveProduct(it.id); else await saveProduct(p); renderPanel(); });
    bar.append(b);
    if (it) {
      const tg = el('label', 'tgt'); tg.append(el('span', '', 'Báo khi ≤'));
      const inp = document.createElement('input'); inp.inputMode = 'numeric'; inp.placeholder = 'giá bất kỳ'; inp.value = it.target ? Number(it.target).toLocaleString('vi-VN') : ''; inp.setAttribute('aria-label', 'Báo khi giá xuống bằng hoặc dưới');
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
      inp.addEventListener('change', () => setTarget(it.id, inp.value));
      tg.append(inp, el('span', '', 'đ')); bar.append(tg);
    }
    return bar;
  }
  // danh sách món đã lưu
  const agoTxt = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'vừa xong' : m < 60 ? m + ' phút trước' : m < 1440 ? Math.round(m / 60) + ' giờ trước' : Math.round(m / 1440) + ' ngày trước'; };
  // 🔄 Cập nhật tất cả (tối đa 5 món Shopee, tab nền, khách tự bấm)
  async function updateAll() {
    if (prodChecking) return;
    const ids = products.filter(x => x.shop !== 'tiktok').slice(0, HT.SAVE_MAX).map(x => x.id);
    if (!ids.length) return;
    prodChecking = '0/' + ids.length; prodMsg = ''; renderPanel();
    const r = await chrome.runtime.sendMessage({ type: 'prod-update', ids }).catch(() => null);
    const { products: ps = [] } = await chrome.storage.local.get('products');
    let ok = 0, deals = 0;
    for (const x of (r && r.res) || []) {
      const it = ps.find(y => y.id === x.id); if (!it) continue;
      if (x.price || x.out) { ok++; if (HT.applyPrice(it, x.price, x.out)) deals++; if (x.image && !it.image) it.image = x.image; }
    }
    products = ps; await chrome.storage.local.set({ products });
    prodChecking = false;
    prodMsg = !r ? '⚠️ Chưa cập nhật được, thử lại sau nhé' : r.busy ? '⏳ Đang cập nhật ở cửa sổ khác' : `✅ Đã cập nhật ${ok}/${ids.length} món` + (deals ? ` · 🐹 ${deals} món giá ngon` : '') + (ok < ids.length ? ' · món lỗi bấm 🔄 riêng' : '');
    if (deals) chime();
    renderPanel();
  }
  // ⭐ 1.10.251: Theo dõi shop (tab ❤️ Đã lưu) – mã của shop trong kho Ưu đãi (AccessTrade, máy chủ /hot?q=tên shop) + mã shop đọc trên trang khi mở shop/sản phẩm của shop đó
  let follow = [], followIn = '', followMsg = '', followBusy = false, followTry = 0;
  chrome.storage.local.get('followShops').then(d => { follow = d.followShops || []; if (/(^|\.)shopee\.vn$/.test(location.hostname)) { setTimeout(followPageRead, 5000); setTimeout(followRefresh, 7000); } }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && ch.followShops) follow = ch.followShops.newValue || []; });
  const followSave = () => chrome.storage.local.set({ followShops: follow }).catch(() => {});
  const sameShop = (a, b) => !!((a.id && b.id && a.id === b.id) || (a.user && b.user && a.user.toLowerCase() === b.user.toLowerCase()));
  const shopUrl = s => s.user ? 'https://shopee.vn/' + s.user : 'https://shopee.vn/shop/' + s.id;
  const rawName = s => !s.name || /^Shop \d+$/.test(s.name) || s.name === s.user;
  function curShop() {
    if (!/(^|\.)shopee\.vn$/.test(location.hostname)) return null;
    if (isShopeeItem()) {
      const m = itemKey().match(/^(\d+)[./]/); if (!m) return null;
      const a = [...document.querySelectorAll('a[href]')].find(x => /^(Xem Shop|View Shop)$/i.test((x.innerText || '').trim()));
      let user = ''; try { const u = a && new URL(a.href); if (u && /^\/[\w.-]+\/?$/.test(u.pathname)) user = u.pathname.replace(/\//g, ''); } catch {}
      const lines = (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
      const oi = lines.findIndex(l => /^(Online|Đang hoạt động|Hoạt động|Active)\b/i.test(l));
      let name = oi > 0 ? lines[oi - 1] : ''; if (/^(Mall|Yêu thích\+?|Preferred\+?)$/i.test(name) && oi > 1) name = lines[oi - 2];
      return { id: m[1], user, name: (name || user || 'Shop ' + m[1]).slice(0, 40) };
    }
    if (isShopeeShop()) { const user = location.pathname.replace(/\//g, ''), nm = (document.querySelector('h1') || {}).innerText; return { id: '', user, name: String(nm || user).trim().slice(0, 40) }; }
    return null;
  }
  function followParse(s) {
    s = String(s || '').trim(); let u; try { u = new URL(/^https?:/i.test(s) ? s : 'https://' + s); } catch { return null; }
    if (!/(^|\.)shopee\.vn$/.test(u.hostname)) return null;
    let m = u.pathname.match(/-i\.(\d+)\.\d+/) || u.pathname.match(/^\/product\/(\d+)\/\d+/) || u.pathname.match(/^\/shop\/(\d+)/);
    if (m) return { id: m[1], user: '', name: 'Shop ' + m[1] };
    m = u.pathname.match(/^\/([\w.-]{2,40})\/?$/);
    if (m && !/^(cart|checkout|search|user|m|mall|daily_discover|flash_sale|buyer|verify|product|shop)$/i.test(m[1])) return { id: '', user: m[1], name: m[1] };
    return null;
  }
  function followAdd(s) {
    let f = follow.find(x => sameShop(x, s));
    if (f) { if (!f.id && s.id) f.id = s.id; if (!f.user && s.user) f.user = s.user; if (rawName(f) && !rawName(s)) f.name = s.name; }
    else { f = { id: s.id || '', user: s.user || '', name: s.name, at: Date.now() }; follow = [...follow, f].slice(-30); }
    followSave(); followRefresh(f); return f;
  }
  // mã của shop trong kho Ưu đãi máy chủ (tên mã AccessTrade có dạng "[Tên shop] Giảm …")
  const followHot = s => ((s.hot && s.hot.items) || []).filter(c => !c.expires || Date.parse(c.expires) > Date.now());
  async function followRefresh(only) {
    if (followBusy || !HT.PRICE_API) return; followBusy = true; followTry = Date.now(); let news = null;
    try {
      for (const s of (only ? [only] : follow)) {
        if (!only && s.hot && Date.now() - s.hot.at < 3600e3) continue;
        const q = rawName(s) ? String(s.user || '').replace(/[._-]+/g, ' ') : s.name; if (!q || q.length < 3) { s.hot = { at: Date.now(), items: [] }; continue; }
        const j = await fetch(HT.PRICE_API.replace(/\/$/, '') + '/hot?q=' + encodeURIComponent(q.slice(0, 50))).then(r => r.json()).catch(() => null); if (!j) continue;
        const nf = HT.fold(q).replace(/\s+/g, ' ').trim();
        const items = (j.items || []).filter(c => { const b = (String(c.title || '').match(/^\[([^\]]+)\]/) || [])[1]; return b ? HT.fold(b).includes(nf) || nf.includes(HT.fold(b)) : true; }).slice(0, 6);
        const first = !s.hot; s.hot = { at: Date.now(), items };
        const nw = items.filter(c => !(s.seen || []).includes(c.id)); s.seen = [...(s.seen || []), ...nw.map(c => c.id)].slice(-60);
        if (!first && nw.length && !news) news = { s, c: nw[0], n: nw.length };
      }
    } finally { followBusy = false; }
    followSave();
    if (news && ui) say(`⭐ ${news.s.name} có mã mới: ${news.c.title.replace(/^\[[^\]]+\]\s*/, '')}${news.c.code ? ' · mã ' + news.c.code : ''}${news.n > 1 ? ` (và ${news.n - 1} mã khác)` : ''}`, 'happy', '⭐ Theo dõi shop', 'shop',
      [{ label: '🏪 Mở shop', fn: () => openDeal(shopUrl(news.s)) }, { label: 'OK', ghost: true, fn: () => {} }]);
    if (tab === 'shop' && ui && !ui.panel.hidden && shopSub === 'saved') renderPanel();
  }
  // mở trang shop / sản phẩm của shop đang theo dõi → đọc "Mã giảm giá của shop" trên trang
  function followPageRead() {
    const cs = curShop(); if (!cs) return; const f = follow.find(x => sameShop(x, cs)); if (!f) return;
    if (!f.id && cs.id) f.id = cs.id; if (!f.user && cs.user) f.user = cs.user; if (rawName(f) && !rawName(cs)) f.name = cs.name;
    let vs = []; if (isShopeeItem()) vs = pageVouchers();
    else { const t = (document.body.innerText || '').replace(/\s+/g, ' '), i = t.search(/Mã Giảm Giá (?:Của )?Shop|Shop Vouchers?|Voucher/i); vs = i < 0 ? [] : HT.parseVouchers(t.slice(i, i + 800)); }
    if (vs.length || !f.page) f.page = { at: Date.now(), list: vs.slice(0, 6) };
    followSave();
  }
  const vTxt = v => `Giảm ${v.percent ? v.percent + '%' : kShort(v.discount)}${v.maxDiscount ? ' tối đa ' + kShort(v.maxDiscount) : ''}${v.minOrder ? ' · đơn từ ' + kShort(v.minOrder) : ''}`;
  // 1.10.252: Đã lưu gọn 1 kiểu – mỗi phần (Món / Shop) thu gọn được; shop là thẻ giống món, hiện 2 mã, còn lại "Xem thêm"
  let svHide = { p: false, s: false }; const flMore = new Set(), flDet = new Set();
  chrome.storage.local.get('svHide').then(d => { if (d.svHide) svHide = d.svHide; }).catch(() => {});
  function svSec(k, title, n) {
    const b = el('button', 'svsec' + (svHide[k] ? ' off' : '')); b.setAttribute('aria-expanded', !svHide[k]);
    b.append(el('span', '', title), el('em', '', n || ''), el('b', '', svHide[k] ? 'Hiện ▾' : 'Ẩn ▴'));
    b.addEventListener('click', () => { svHide = { ...svHide, [k]: !svHide[k] }; chrome.storage.local.set({ svHide }).catch(() => {}); renderPanel(); });
    return b;
  }
  const hotTxt = c => String(c.title || '').replace(/^\[[^\]]+\]\s*/, '');
  function followBox() {
    const W = el('div', 'flwb');
    W.append(svSec('s', '⭐ Shop theo dõi', follow.length ? String(follow.length) : ''));
    if (svHide.s) return W;
    const cs = curShop();
    if (cs && !follow.some(x => sameShop(x, cs))) {
      const r = el('div', 'flwadd'), b = el('button', 'b sm', '⭐ Theo dõi'); r.append(el('span', 'flwcur', '🏪 ' + cs.name), b);
      b.addEventListener('click', () => { followAdd(cs); followPageRead(); renderPanel(); }); W.append(r);
    } else if (cs) { const f = follow.find(x => sameShop(x, cs)); if (f && (!f.page || Date.now() - f.page.at > 60e3)) followPageRead(); }
    const r2 = el('div', 'flwadd'), inp = document.createElement('input'), ab = el('button', 'b sm', 'Thêm');
    inp.placeholder = 'Dán link shop hoặc sản phẩm Shopee'; inp.value = followIn; inp.className = 'flwi';
    inp.addEventListener('input', () => { followIn = inp.value; });
    const add = () => { const s = followParse(inp.value); if (!s) { followMsg = 'Link chưa đúng – dán link shop hoặc sản phẩm Shopee nhé.'; renderPanel(); return; } followAdd(s); followIn = ''; followMsg = ''; renderPanel(); };
    ab.addEventListener('click', add); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') add(); });
    r2.append(inp, ab); W.append(r2);
    if (followMsg) W.append(el('div', 'svmsg', followMsg));
    for (const s of follow) {
      const k = s.id || s.user, hs = followHot(s), pg = s.page && Date.now() - s.page.at < 7 * 864e5 ? s.page.list : [];
      const all = [...hs.map(c => ({ c })), ...pg.map(v => ({ v }))], open = flMore.has(k), det = flDet.has(k);
      const card = el('div', 'svc c'), top = el('div', 'svl'), mid = el('div', 'svm');
      top.append(el('div', 'noimg', '🏪'));
      const t = el('button', 'svt', s.name); t.title = 'Mở shop (link HaoHao)'; t.addEventListener('click', () => openDeal(shopUrl(s))); mid.append(t);
      mid.append(el('div', 'svag', all.length ? `${all.length} mã · tốt nhất ${all[0].c ? hotTxt(all[0].c) : vTxt(all[0].v)}` : s.hot ? 'Chưa thấy mã – mở shop để HaoHao đọc thêm' : 'Đang tìm mã…'));
      top.append(mid);
      const btns = el('div', 'svbt'), ob = el('button', 'b sm', '🏪 Mở shop'), mo = el('button', 'svu', '⋯');
      ob.addEventListener('click', () => openDeal(shopUrl(s)));
      mo.title = det ? 'Thu gọn' : 'Chi tiết'; mo.setAttribute('aria-expanded', det); mo.addEventListener('click', () => { det ? flDet.delete(k) : flDet.add(k); renderPanel(); });
      btns.append(ob, mo); top.append(btns); card.append(top);
      for (const x of (open ? all : all.slice(0, 2))) {
        const r = el('div', 'flc'), b = el('button', '', x.c && x.c.code ? '📋 ' + x.c.code : 'Lấy mã ›');
        r.append(el('span', '', '✅ ' + (x.c ? hotTxt(x.c) : 'Mã shop: ' + vTxt(x.v))));
        b.title = 'Chép mã + mở shop qua link HaoHao';
        b.addEventListener('click', () => { if (x.c && x.c.code) copyText(x.c.code, b); openDeal(x.c && !x.c.code && x.c.url ? x.c.url : shopUrl(s)); });
        r.append(b); card.append(r);
      }
      if (all.length > 2) { const mb = el('button', 'flmore', open ? 'Thu gọn ▴' : `Xem thêm ${all.length - 2} mã ▾`); mb.addEventListener('click', () => { open ? flMore.delete(k) : flMore.add(k); renderPanel(); }); card.append(mb); }
      if (det) {
        const d = el('div', 'svd'), row = el('div', 'svr'), rm = el('button', 'svx', '🗑 Bỏ theo dõi');
        d.append(el('div', 'svag', `Theo dõi ${agoTxt(s.at)}` + (pg.length ? ` · mã shop đọc trên trang ${agoTxt(s.page.at)}` : ' · mở trang shop để HaoHao đọc thêm mã shop')));
        rm.addEventListener('click', () => { if (rm.dataset.sure !== '1') { rm.dataset.sure = '1'; rm.textContent = 'Bỏ thật?'; return; } flDet.delete(k); follow = follow.filter(x => x !== s); followSave(); renderPanel(); });
        row.append(rm); d.append(row); card.append(d);
      }
      W.append(card);
    }
    if (!follow.length) W.append(el('div', 'empty', 'Dán link shop Shopee, hoặc mở trang shop / sản phẩm rồi bấm ⭐ Theo dõi. Shop có mã mới là HaoHao báo.'));
    else if (Date.now() - followTry > 60e3 && follow.some(s => !s.hot || Date.now() - s.hot.at > 3600e3)) setTimeout(() => followRefresh(), 300);
    return W;
  }
  function renderSaved(L) {
    const list = products;
    L.append(svSec('p', '❤️ Món đã lưu', list.length ? `${list.length}/${HT.SAVE_MAX}` : ''));   // 1.10.252
    if (prodMsg) L.append(el('div', 'svmsg', prodMsg));
    if (!svHide.p && !list.length) L.append(el('div', 'empty', `Chưa lưu món nào. Mở 1 sản phẩm Shopee hoặc TikTok Shop, bấm 🤍 Lưu & theo dõi giá (tối đa ${HT.SAVE_MAX} món).`));
    for (const it of (svHide.p ? [] : list)) {
      const pct = HT.dropPct(it), deal = it.dealNew && pct >= 5, more = svMore.has(it.id);
      const card = el('div', 'svc c' + (it.target && it.price <= it.target ? ' hit' : '') + (deal ? ' deal' : ''));
      const top = el('div', 'svl');
      if (it.image) { const im = document.createElement('img'); im.src = it.image; im.alt = ''; im.loading = 'lazy'; top.append(im); } else top.append(el('div', 'noimg', it.shop === 'tiktok' ? '🎵' : '🛍️'));
      const mid = el('div', 'svm');
      const t = el('button', 'svt', it.title); t.title = it.title; t.addEventListener('click', () => { if (deal) seenDeal(it.id); openDeal(it.url); }); mid.append(t);
      // giá lúc lưu → giá mới nhất, kèm tăng / giảm / không đổi
      const pr = el('div', 'svp'), upP = it.saved && it.price > it.saved ? Math.round((it.price - it.saved) / it.saved * 100) : 0;
      pr.append(el('span', 'old', 'Lưu ' + kShort(it.saved || it.price)), document.createTextNode('→'), el('b', '', vnd(it.price)));
      pr.append(pct ? el('span', 'dn', '▼' + pct + '%') : upP ? el('span', 'up', '▲' + upP + '%') : el('span', 'eq', '= không đổi'));
      mid.append(pr);
      mid.append(el('div', 'svag', it.upd ? 'Cập nhật ' + agoTxt(it.upd) : 'Chưa cập nhật giá mới'));
      top.append(mid);
      const btns = el('div', 'svbt');
      const buy = el('button', 'b sm', deal ? '🛒 Xem deal' : '🛒 Mua'); buy.addEventListener('click', () => { if (deal) seenDeal(it.id); openDeal(it.url); });
      const up = el('button', 'svu', '🔄'); up.title = 'Mở trang món này để cập nhật giá (link thường)'; up.setAttribute('aria-label', 'Cập nhật giá ' + it.title);
      up.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'prod-open', url: it.url }).catch(() => window.open(it.url, '_blank')));
      const mo = el('button', 'svu', '⋯'); mo.title = more ? 'Thu gọn' : 'Chi tiết'; mo.setAttribute('aria-expanded', more); mo.setAttribute('aria-label', 'Chi tiết ' + it.title);
      mo.addEventListener('click', () => { more ? svMore.delete(it.id) : svMore.add(it.id); renderPanel(); });
      btns.append(buy, up, mo); top.append(btns);
      card.append(top);
      if (more) {
        const det = el('div', 'svd');
        det.append(el('div', 'svag', `Lưu ${agoTxt(it.at)} giá ${vnd(it.saved)} · cập nhật ${agoTxt(it.checked || it.at)}` + (it.low && it.low < it.price ? ` · thấp nhất ${vnd(it.low)}` : '')));
        const sp = sparkline(it.history); if (sp) det.append(sp);
        const row = el('div', 'svr');
        const tg = el('label', 'tgt'); tg.append(el('span', '', 'Báo khi ≤'));
        const inp = document.createElement('input'); inp.inputMode = 'numeric'; inp.placeholder = 'giá bất kỳ'; inp.value = it.target ? Number(it.target).toLocaleString('vi-VN') : ''; inp.setAttribute('aria-label', 'Báo khi giá xuống bằng hoặc dưới');
        inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
        inp.addEventListener('change', () => setTarget(it.id, inp.value));
        tg.append(inp, el('span', '', 'đ'));
        const rm = el('button', 'svx', '🗑 Bỏ lưu'); rm.setAttribute('aria-label', 'Bỏ theo dõi ' + it.title);
        rm.addEventListener('click', async () => { if (rm.dataset.sure !== '1') { rm.dataset.sure = '1'; rm.textContent = 'Bỏ thật?'; return; } svMore.delete(it.id); await unsaveProduct(it.id); renderPanel(); });
        row.append(tg, rm); det.append(row);
        card.append(det);
      }
      L.append(card);
    }
    L.append(followBox());   // ⭐ Shop theo dõi (1.10.251)
    if (list.length && !svHide.p) L.append(el('div', 'tnote2', `Theo dõi tối đa ${HT.SAVE_MAX} món. Bấm 🔄 để mở trang món đó và cập nhật giá mới. Nút Mua / Xem deal: Link tiếp thị · Giá không đổi.`));
  }
  async function seenDeal(id) {
    const { products: ps = [] } = await chrome.storage.local.get('products');
    const it = ps.find(x => x.id === id); if (!it || !it.dealNew) return;
    it.dealNew = false; products = ps; await chrome.storage.local.set({ products });
  }
  // 🐹 Có giá ngon! (bong bóng; nút Xem deal mới đi qua link tiếp thị)
  function dealBubble(it, ev) {
    if (!ui) return;
    toggleMenu(false); closePanel();
    const Bb = ui.bubble, pct = HT.dropPct(it), days = Math.floor((Date.now() - (it.at || Date.now())) / 864e5);
    Bb.innerHTML = ''; Bb.dataset.tab = 'shop'; Bb.dataset.kind = 'deal'; Bb.classList.remove('tb', 'think');
    Bb.append(el('span', 't', ev === 'target' ? '🎯 Chạm giá bạn đặt!' : ev === 'back' ? '📦 Có hàng lại rồi!' : ev === 'up' ? '📈 Giá vừa tăng' : '🐹 Có giá ngon!'));
    Bb.append(el('div', 'dlt', it.title.slice(0, 70)));
    Bb.append(el('div', 'dls', days ? `Bạn lưu ${days} hôm trước` : 'Bạn lưu hôm nay'));
    const pr = el('div', 'dlp');
    if (pct) pr.append(el('s', '', vnd(it.saved)), document.createTextNode(' → '));
    pr.append(el('b', '', vnd(it.price)));
    if (pct) pr.append(el('span', 'dlpc', ` (-${pct}%)`));
    Bb.append(pr);
    if (it.low && it.price <= it.low) Bb.append(el('div', 'dls', 'Thấp nhất từ lúc bạn lưu'));
    const row = el('div', 'acts');
    const go = el('button', 'b', '🛒 Xem deal'); go.addEventListener('click', e => { e.stopPropagation(); hideBubble(); seenDeal(it.id); openDeal(it.url); });
    const later = el('button', 'b ghost', 'Để sau'); later.addEventListener('click', e => { e.stopPropagation(); hideBubble(); seenDeal(it.id); });
    row.append(go, later); Bb.append(row, el('div', 'dln', 'ⓘ ' + HT.AFF_NOTE));
    Bb.hidden = false; setMood('happy'); chime();
    lastBubble = Date.now(); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hideBubble, 120000);
  }
  // 🎟️ tab Voucher
  const vLabel = v => {
    const cap = v.maxDiscount ? ' tối đa ' + kShort(v.maxDiscount) : '';
    if (v.kind === 'ship') return 'Freeship' + cap;
    if (v.kind === 'coin') return `Hoàn xu ${v.percent ? v.percent + '%' : ''}${cap}`.trim();
    return v.discount ? `Giảm ${kShort(v.discount)}` : v.percent ? `Giảm ${v.percent}%${cap}` : (v.txt || '').slice(0, 40);
  };


  function shopTabs(V, list) {
    const t = el('div', 'stabs');
    list.forEach(([k, lb, on, fn]) => { const b = el('button', on ? 'on' : '', lb); b.setAttribute('aria-pressed', on); b.addEventListener('click', () => { fn(k); renderPanel(); }); t.append(b); });
    V.append(t);
  }
  // 🧾 sổ giá mọi món đã xem (1.10.115) – để nói thật "giá đáy" / "sale ảo"
  let plog = null; const plogReady = chrome.storage.local.get('plog').then(d => { plog = d.plog || {}; }).catch(() => { plog = {}; });
  const plogKey = () => (isTikTokItem() ? 'tt:' : 'sp:') + itemKey();
  const dealBefore = () => { try { const D = isShopeeItem() ? dealOf() : null; return (D && ((D.main && D.main.before) || (D.detail && D.detail.orig))) || 0; } catch { return 0; } };
  // mã sản phẩm cho kho giá chung: sp:<shopid>.<itemid> | tt:<productid>
  const srvKey = () => { const k = itemKey(); if (isTikTokItem()) { const m = String(k).match(/(\d{8,22})/); return m ? 'tt:' + m[1] : ''; } const m = String(k).match(/^(\d+)[./](\d+)$/); return m ? `sp:${m[1]}.${m[2]}` : ''; };
  const srvHist = new Map();   // srvKey → { pts:[[ngày,giá,giáGạch]], day } | 'wait'
  function loadSrvHist() {
    const k = srvKey(); if (!k || !HT.PRICE_API || srvHist.has(k)) return;
    srvHist.set(k, 'wait');
    chrome.runtime.sendMessage({ type: 'price-hist', k }).then(v => {
      srvHist.set(k, v || { pts: [] });
      if (!v || !v.pts || !v.pts.length || srvKey() !== k) return;
      if (ui && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
      if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel();
    }).catch(() => srvHist.delete(k));
  }
  // 🧾 1.10.124: trang tìm kiếm / danh mục / shop Shopee – ghi giá mọi món đang hiện (40–60 món/trang) vào kho chung, mỗi món 1 lần/trang
  const sentCards = new Set(); let cardTick = 0;
  function logCards() {
    const tt = /(^|\.)tiktok\.com$/.test(location.hostname);   // TikTok: AccessTrade không có kho sản phẩm → kho tự góp từ thẻ sản phẩm khách lướt qua
    if (!HT.PRICE_API || (!tt && (!/(^|\.)shopee\.vn$/.test(location.hostname) || isShopeeItem())) || document.visibilityState !== 'visible') return;
    if (++cardTick % 4) return;   // ~10 giây đọc 1 lần
    if (tt && !document.querySelector('a[href*="/product/"], a[href*="/pdp/"]')) return;   // trang video không có thẻ sản phẩm → khỏi đọc
    let list; try { list = tt ? readTikTokCards() : readSearchCards(); } catch { return; }
    const items = [];
    for (const x of list) {
      const k = tt ? (/^tt\d{8,22}$/.test(x.key) ? 'tt:' + x.key.slice(2) : '') : (/^\d+\.\d+$/.test(x.key) ? 'sp:' + x.key : '');
      if (!k || !(x.price >= 1000) || sentCards.has(k)) continue;
      sentCards.add(k); items.push({ k, p: x.price });
    }
    if (items.length) chrome.runtime.sendMessage({ type: 'price-log', items }).catch(() => {});
  }
  async function logPrice() {
    const p = detectProduct(); if (!p || !p.price || !isItemPage()) return;
    await plogReady; HT.plogAdd(plog, plogKey(), p.price, dealBefore());
    const sk = srvKey(); if (sk) { chrome.runtime.sendMessage({ type: 'price-log', item: { k: sk, p: p.price, b: dealBefore() } }).catch(() => {}); loadSrvHist(); }
    chrome.storage.local.set({ plog }).catch(() => {});
  }
  function truthOf(p) {
    const own = (plog && plog[plogKey()] && plog[plogKey()].pts) || [], it = savedOf(p);
    const pts = [...own, ...((it && it.history) || []).map(x => ({ t: x.t, p: x.p }))];
    const sv = srvHist.get(srvKey());
    if (sv && sv !== 'wait' && sv.pts) for (const x of sv.pts) if (x[0] !== sv.day) pts.push({ t: x[0] * 864e5 + 5 * 3600e3, p: x[1] });   // mốc của kho chung (trưa mỗi ngày giờ VN), bỏ hôm nay
    return HT.priceTruth(pts, p.price, dealBefore());
  }
  // khung "Mua không hớ": nhận xét giá + nút Canh giá
  function ptBox(p, inBubble) {
    const T = truthOf(p), box = el('div', 'ptb ' + T.cls + (inBubble ? ' inb' : ''));
    if (T.cls === 'new') return document.createDocumentFragment();   // chưa có giá cũ để so: không hiện khung (nút 🔔 Canh giá đã có ở trên)
    if (inBubble && T.cls !== 'good') T.sub = T.cls === 'new' ? '' : T.sub.replace(/\.? ?(Muốn rẻ nữa\? )?(Để|Đừng vội, để) HaoHao canh[^.]*$/, '');
    const tx = el('div', 'ptx'); tx.append(el('b', '', T.icon + ' ' + T.head)); if (T.sub) tx.append(el('small', '', T.sub)); box.append(tx);
    if (inBubble) return box;   // bong bóng đã có nút 🔔 Canh giá ở hàng trên, không lặp lại
    const it = savedOf(p), w = el('button', 'ptw' + (it ? ' on' : ''), it ? '🔔 Đang canh' : '🔔 Canh giá');
    w.title = it ? 'HaoHao đang canh giá món này · bấm để bỏ' : 'HaoHao ghi giá mỗi ngày, giảm là báo bạn';
    w.addEventListener('click', async e => {
      e.stopPropagation();
      const cur = savedOf(p);
      if (cur) await unsaveProduct(cur.id); else { const r = await saveProduct(p, true); if (r === 'full') { w.textContent = `Đủ ${HT.SAVE_MAX} món`; return; } }
      const n = ptBox(p, inBubble); box.replaceWith(n);
      const sv = ui && ui.root.querySelector('.tb-sv'); if (sv) sv.textContent = savedOf(p) ? '🔔 Đang canh' : '🔔 Canh giá';
    });
    box.append(w);
    return box;
  }
  async function trackPrice() {   // mở lại trang sản phẩm đã lưu (hoặc bấm 🔄): ghi giá, giá ngon / chạm mức thì báo
    const p = detectProduct(); if (!p || !p.price) return;
    logPrice().catch(() => {});
    const { products: ps = [] } = await chrome.storage.local.get('products');
    const it = ps.find(x => x.url === p.url); if (!it) return;
    const ev = HT.applyPrice(it, p.price, soldOutNow());
    products = ps; await chrome.storage.local.set({ products });
    if (ev) { shopAlert = true; updateBadge(); dealBubble(it, ev); }
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
  let shopSub = 'check', shopView = 'find', prodChecking = false, prodMsg = '';
  const svMore = new Set();
  function renderShop(V) {
    shopAlert = false;
    if (HT.STORE) V.append(el('div', 'tnote aff-note', HT.AFF_NOTE));   // V1.56: báo link tiếp thị trong giao diện (luật Chrome Web Store)
    const p = detectProduct(), item = isItemPage(), shopPg = !item && isShopeeShop();
    const nSaved = products.length ? ` (${products.length})` : '';
    if (item || shopPg) {
      if (settings.shopTrust !== false) analyzeShopee(true);
      const canFind = item && p && p.price;
      const tabs = [['check', '🛡️ Kiểm tra'], ...(canFind ? [['cheaper', '🔍 Rẻ hơn'], ['voucher', '🎟️ Voucher']] : []), ['saved', '❤️ Đã lưu' + nSaved]];
      shopTabs(V, tabs.map(([k, lb]) => [k, lb, shopSub === k, x => { shopSub = x; }]));
      if (item && p && p.price && shopSub === 'saved' && !savedOf(p)) V.append(saveBar(p));   // nút lưu chỉ còn ở bong bóng + tab Đã lưu (khi món đang xem chưa lưu)
      const L = el('div', 'body-list');
      if (shopSub === 'saved') renderSaved(L);
      else if (canFind && shopSub === 'cheaper') renderCheaper(L, p);
      else if (canFind && shopSub === 'voucher') renderVoucher(L, p);
      else if (trust) { if (item && p && p.price) L.append(ptBox(p)); L.append(trustCard()); const dc = dealCard(); if (dc) L.append(dc); const sz = item && sizeBubbleRow(); if (sz) { sz.classList.add('inpanel'); L.append(sz); } }
      else if (item && p && p.price) { L.append(ptBox(p)); L.append(el('div', 'optwait', 'HaoHao đang kiểm tra shop & đánh giá…')); }
      else L.append(el('div', 'optwait', 'HaoHao đang đọc trang… kéo xuống một chút để Shopee tải thông tin shop và đánh giá.'));
      V.append(L);
      if (shopSub === 'saved' || shopSub === 'voucher') return;
      if (isTikTokItem() && !HT.ttLink(location.href)) { const tc = ttCard(); if (tc) V.append(tc); }
      else if (!isTikTokItem()) { const sc = spCard(); if (sc) V.append(sc); }
      return;
    }
    // trang "Sản phẩm tương tự" đang so giá: tab 🔍 Rẻ hơn hiện 3 món HaoHao tìm ra
    if (cmp && isCmpPage()) {
      if (shopSub !== 'saved') shopSub = 'cheaper';
      shopTabs(V, [['cheaper', '🔍 Rẻ hơn', shopSub === 'cheaper', x => { shopSub = x; }], ['saved', '❤️ Đã lưu' + nSaved, shopSub === 'saved', x => { shopSub = x; }]]);
      const L = el('div', 'body-list');
      if (shopSub === 'saved') renderSaved(L);
      else L.append(c3Box({ key: cmp.base.key, n: cmp.list.length, price: cmp.base.price, rows: cmpRows() }, true));
      V.append(L); return;
    }
    // trang khác: 🔎 tìm sản phẩm, 🎟️ voucher, ❤️ danh sách đã lưu
    const onCart = pageKind() === 'cart';
    if (onCart && !cartSeen) { cartSeen = true; }   // 1.10.188: Shopee tự chọn mã tốt nhất ở giỏ → không tự nhảy sang tab Mã giỏ nữa
    if (!onCart) cartSeen = false;
    if (shopView === 'voucher' && !onCart) shopView = 'find';
    if (pageKind() === 'checkout') { const cb = checkoutVBox(); if (cb) V.append(cb); }
    if (shopView === 'voucher') shopView = 'vou';   // 1.10.188: bỏ tab Mã giỏ (Shopee tự chọn mã tốt nhất ở giỏ)
    shopTabs(V, [['find', '🔎 Tìm', shopView === 'find', x => { shopView = x; }], ['vou', '🎟️ Voucher', shopView === 'vou', x => { shopView = x; }], ['saved', '❤️ Đã lưu' + nSaved, shopView === 'saved', x => { shopView = x; }]]);
    if (shopView === 'saved') { const L = el('div', 'body-list'); renderSaved(L); V.append(L); return; }
    if (shopView === 'voucher') { const L = el('div', 'body-list'); renderCartVoucher(L); V.append(L); return; }
    if (shopView === 'vou') { const L = el('div', 'body-list'); renderHotVoucher(L); V.append(L); return; }
    renderFind(V);
  }

  // ---------- 🎟️ tab Voucher (trang sản phẩm Shopee) ----------
  let vhRun = null; const vhRes = {}; let vhLoaded = false, cartSeen = false;
  chrome.runtime.onMessage.addListener(m => {
    if (!m || (m.type !== 'vh-progress' && m.type !== 'vh-done')) return;
    if (m.type === 'vh-progress') vhRun = m; else { vhRun = null; vhRes[m.key] = m.res; if (m.key === itemKey() && m.res) { const ns = (m.res.saved || []).length, nh = (m.res.have || []).length;   // 1.10.229: luôn báo kết quả
      const sv = m.res.saved || [], hv = m.res.have || [], shipS = sv.find(x => x.kind === 'ship'), shipH = hv.find(x => x.kind === 'ship'), saleN = sv.filter(x => x.kind !== 'ship').length, OKA = [{ label: 'OK', fn: () => {} }];   // 1.10.230
      if (m.res.err) say(VH_ERR[m.res.err] || 'Chưa tìm được mã, thử lại sau nhé.', 'think', '🎟️ Voucher', 'shop', OKA);
      else if (ns || nh) say([shipS ? `🚚 Đã lưu mã Freeship ${shipS.label}` : shipH ? `🚚 Ví đã có mã Freeship tốt nhất (${shipH.label})` : '🚚 Chưa có mã Freeship dùng được cho món này', saleN ? `🎉 Ngày sale: đã lưu ${saleN} mã đợt sale` : ''].filter(Boolean).join(' · '), 'happy', '🎟️ Voucher', 'shop', OKA);
      else say('🚚 Chưa có mã Freeship dùng được cho món này lúc này.', 'happy', '🎟️ Voucher', 'shop', OKA); } }
    if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel();
  });
  const VH_ERR = { login: '🔑 Cần đăng nhập Shopee. Đăng nhập trong cửa sổ HaoHao vừa mở rồi bấm "Tìm mã" lại.', captcha: '🧩 Shopee hỏi xác minh. Bạn làm giúp trong cửa sổ đó rồi bấm "Tìm mã" lại.', stop: '■ Bạn đã dừng giữa chừng.', closed: 'Cửa sổ săn mã đã bị đóng giữa chừng.' };
  function renderVoucher(L, p) {
    const key = itemKey();
    if (!vhLoaded) { vhLoaded = true; chrome.storage.local.get('vhunt').then(d => { Object.assign(vhRes, d.vhunt || {}); if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel(); }).catch(() => {}); }
    loadDealData();
    const D = readDeal(), det = D && (D.main || D.detail);
    // 1) giá đang báo đã gồm mã gì
    const box = el('div', 'cbox here'); box.append(el('div', 'ct', `💰 Giá đang báo ${vnd(p.price)} đã gồm`));
    const row = (ic, name, ok, txt) => { const r = el('div', 'vhrow' + (ok ? ' ok' : ok === false ? ' no' : '')); r.append(el('span', '', ic + ' ' + name), el('b', '', txt)); box.append(r); };
    if (det) {
      row('🏷️', 'Mã của shop', !!det.shopOff, det.shopOff ? `✓ −${kShort(det.shopOff)}` : '✗ Chưa có');
      const sp = det.shopee;
      row('🛍️', 'Voucher Shopee', !!sp, sp ? `✓ ${sp.pct ? sp.pct + '%' : '−' + kShort(sp.off || 0)}` : '✗ Chưa có');
    } else {   // 1.10.227: không đọc được bảng giá → tự tính từ mã shop trên trang, không treo "đang đọc…"
      const pv = flashSale() ? [] : pageVouchers(), rr = pv.length ? HT.bestDeal({ base: p.price, vouchers: pv }) : null;
      if (flashSale()) row('⚡', 'Flash Sale', false, 'mã shop không áp');
      else if (rr && rr.best.v) row('🏷️', 'Mã của shop', true, `✓ −${kShort(rr.best.shopOff)} → ${vnd(rr.best.final)}`);
      else row('🏷️', 'Mã của shop', false, '✗ Chưa có mã áp được');
    }
    row('🚚', 'Freeship', false, '✗ Chưa tính (giá web chưa gồm ship)');
    // 1.10.240: bỏ khung "Giá đang báo đã gồm" khỏi tab Voucher
    // 2) đăng nhập + nút săn mã
    const res = vhRes[key], run = vhRun && vhRun.key === key ? vhRun : null;
    const act = el('div', 'cbox');
    if (spLoggedOut()) {
      act.append(el('div', 'ct', '🔑 Bạn chưa đăng nhập Shopee'), el('div', 'cnote', 'Mã được lưu vào tài khoản Shopee của bạn. HaoHao không hỏi, không lưu mật khẩu.'));
      const b = el('button', 'b', 'Đăng nhập Shopee'); b.addEventListener('click', () => { location.href = 'https://shopee.vn/buyer/login?next=' + encodeURIComponent(location.href); }); act.append(b);
    } else if (run) {
      act.append(el('div', 'optwait', `🐹 Đang săn mã… bước ${run.i}/${run.n} (${run.label}) · đã lưu ${run.saved} mã`));
      const s = el('button', 'b ghost', '■ Dừng'); s.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'vh-stop' }).catch(() => {})); act.append(s);
    } else {
      act.append(el('div', 'ct', '🔍 Gộp thêm mã cho món này'), el('div', 'cnote', 'HaoHao mở 1 cửa sổ nhỏ, tự lưu mã của shop, mã Shopee, Freeship hợp với món này vào tài khoản Shopee của bạn. Bạn xem được hết, bấm Dừng lúc nào cũng được.'));
      const b = el('button', 'b', res ? '🔄 Tìm mã lại' : '🔍 Tìm mã tốt nhất');
      b.addEventListener('click', async () => {
        b.disabled = true; vhRun = { key, i: 0, n: 1, label: 'mở cửa sổ', saved: 0 }; renderPanel();
        const r = await chrome.runtime.sendMessage({ type: 'vh-hunt', url: cleanUrl(location.href), price: p.price, key }).catch(() => null);
        if (!r || !r.ok) { vhRun = null; if (r && r.error === 'busy') say('HaoHao đang săn mã ở cửa sổ khác, đợi xíu nhé!', 'think', '🎟️ Voucher', 'shop'); renderPanel(); }
      });
      act.append(b);
    }
    // 1.10.240: bỏ khung "Gộp thêm mã cho món này" (nút Tìm voucher ở bong bóng đã làm việc này)
    // 3) kết quả lần săn gần nhất
    if (false && res && !run) {   // 1.10.241: bỏ khung "Kết quả" tìm mã khỏi tab Voucher
      const rb = el('div', 'cbox');
      const when = Math.round((Date.now() - res.at) / 60000);
      rb.append(el('div', 'ct', `🎟️ Kết quả (${when < 1 ? 'vừa xong' : when < 60 ? when + ' phút trước' : Math.round(when / 60) + ' giờ trước'})`));
      if (res.err && VH_ERR[res.err]) rb.append(el('div', 'cnote', VH_ERR[res.err]));
      const NAME = { off: 'Giảm giá', ship: 'Freeship', coin: 'Hoàn xu' }, SRC = { shop: 'shop', hub: 'Shopee' };
      const all = [...res.saved.map(x => ({ ...x, st: 'new' })), ...res.have.map(x => ({ ...x, st: 'had' }))];
      if (!all.length) rb.append(el('div', 'cnote', 'Chưa tìm thấy mã nào hợp với món này (đơn tối thiểu cao hơn giá, hoặc đã hết lượt).'));
      for (const kind of ['ship', 'off', 'coin']) for (const x of all.filter(y => y.kind === kind).sort((a, b) => b.v - a.v)) {
        const r = el('div', 'vhrow ok');
        r.append(el('span', '', `${kind === 'ship' ? '🚚' : kind === 'coin' ? '🪙' : '🏷️'} ${x.label}${x.min ? ' · đơn từ ' + kShort(x.min) : ''}${x.live ? ' · Live/Video' : ''}`),
          el('b', '', (x.st === 'new' ? '✓ Vừa lưu' : '✓ Đã có') + ' · ' + (SRC[x.src] || '')));
        rb.append(r);
      }
      if (!all.some(x => x.kind === 'ship')) rb.append(el('div', 'vhrow no', '🚚 Freeship: chưa có mã hợp với món này'));
      rb.append(el('div', 'cnote', 'Ở bước thanh toán, Shopee tự chọn mã tốt nhất trong các mã bạn đã lưu. Giá cuối xem ở trang thanh toán, HaoHao sẽ kiểm tra giúp.'));
      L.append(rb);
    }
    // 4) mã chủ app gửi (file HaoHao-chu-app.txt → coupons.json)
    const own = (couponFeed ? couponFeed.coupons : []).filter(c => c.shop === 'shopee' && HT.couponLive(c));
    if (own.length) {
      const ob = el('div', 'cbox'); ob.append(el('div', 'ct', '🎁 Mã HaoHao gửi bạn'));
      for (const c of own.slice(0, 8)) {
        const v = HT.couponValue(c, p.price), r = el('div', 'vhrow' + (v ? ' ok' : ''));
        r.append(el('span', '', HT.couponLabel(c) + (c.expires ? ' · HSD ' + String(c.expires).slice(5, 10).split('-').reverse().join('/') : '')));
        if (c.code) { const cb = el('button', 'chip', '📋 ' + c.code); cb.addEventListener('click', () => copyText(c.code, cb)); r.append(cb); }
        else if (c.url) { const ob2 = el('button', 'chip', 'Mở'); ob2.addEventListener('click', () => openDeal(c.url)); r.append(ob2); }
        ob.append(r);
      }
      L.append(ob);
    }
    // 1.10.221: trang sản phẩm cũng hiện đủ Top 10 mã, Ví voucher, Lịch săn mã, Tìm mã, Chợ voucher (bỏ khung Săn live)
    { const tmp = el('div'); renderHotVoucher(tmp); const kids = [...tmp.children]; kids.forEach(x => L.append(x)); }   // 1.10.249: bỏ Săn live
  }
  // ---------- 🎟️ Voucher ở giỏ hàng (1.9.62): đọc số Shopee đang hiện, ghi rõ cách tính + gợi ý ----------
  function readCart() {
    const t = document.body.innerText || '';
    const total = cartTotal(); if (!total) return null;
    const sum = re => [...t.matchAll(re)].reduce((a, m) => a + HT.money(m[1]), 0);
    const shopOff = sum(/Đã giảm\s*₫?\s*([\d.,]+\s*(?:k|tr)?)\s*₫?/g);
    const spM = t.match(/Shopee Voucher[\s\S]{0,60}?-\s*₫?\s*([\d.,]+\s*(?:k|tr)?)\s*₫?/);
    const shopeeOff = spM ? HT.money(spM[1]) : 0;
    const save = HT.money((t.match(/Tiết kiệm\s*\n?\s*₫?\s*([\d.,]+\s*(?:k|tr)?)\s*₫?/) || [])[1]);
    const xuM = t.match(/Dùng\s*([\d.,]+)\s*Shopee Xu/i);
    const n = +((t.match(/Tổng cộng \((\d+) sản phẩm\)/) || [])[1] || 0);
    const moreShop = /Xem thêm voucher/i.test(t), noShopee = !spM && /Shopee Voucher[\s\S]{0,40}?(Chọn hoặc nhập mã|Chọn Voucher)/i.test(t);
    const orig = save ? total + save : 0, prodOff = Math.max(0, save - shopOff - shopeeOff);
    return { total, shopOff, shopeeOff, save, orig, prodOff, xu: xuM ? HT.money(xuM[1]) : 0, n, moreShop, noShopee };
  }
  // ---------- 🎟️ 1.9.63: quét Ví Voucher trong giỏ (bảng "Chọn Shopee Voucher") → giá tốt nhất trên web / trên app ----------
  // Chỉ đọc bảng mã của Shopee (Shopee đã tự kiểm tra điều kiện từng mã), không chọn/đổi mã. Xong bấm "Trở lại".
  let wscan = null;
  // mã chỉ dùng trên app (đọc từ lần quét ví gần nhất) → bong bóng trang sản phẩm tính thêm giá trên app
  // walletApp = mã CHỈ dùng trên app (đọc từ bảng chọn mã lúc thanh toán) · walletMine = toàn bộ ví (đọc từ trang Ví voucher) – 1.10.192: tách riêng
  let walletApp = null, walletMine = null, walletWeb = null;
  chrome.storage.local.get('walletWeb').then(d => { walletWeb = d.walletWeb || null; }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, a) => { if (a !== 'local' || !ch.walletWeb) return; walletWeb = ch.walletWeb.newValue || null; setTimeout(() => { try { if (ui && ui.bubble && !ui.bubble.hidden && ui.bubble.dataset.kind === 'trust') showTrustBubble(); } catch {} }, 300); });   // đọc ví xong → vẽ lại giá
  // 1.10.228: mã Shopee dùng được trên WEB (đọc cùng lúc với mã app) → trừ vào giá "Mua trên web"
  function walletWebBest(a) {
    if (!walletWeb || Date.now() - walletWeb.at > 4 * 864e5 || !(a > 0)) return null;
    let best = null;
    for (const v of walletWeb.list || []) {
      if ((v.min && a < v.min)) continue;
      let x = v.pct ? Math.round(a * v.pct / 100) : v.off; if (v.cap) x = Math.min(x, v.cap); x = Math.min(x, a);
      if (x > 0 && (!best || x > best.v)) best = { ...v, v: x };
    }
    return best;
  }
  // 1.10.228: TỰ ĐỌC VÍ VOUCHER của khách 1 lần/ngày – HaoHao mở giỏ hàng trong cửa sổ nhỏ, mở bảng "Chọn Shopee Voucher", đọc rồi bấm Trở lại (không chọn/đổi mã)
  async function autoWalletAsk() {
    try {
      if (!/(^|\.)shopee\.vn$/.test(location.hostname) || /^\/cart/.test(location.pathname)) return;
      if (typeof isShopeeItem === 'function' && !isShopeeItem()) return;
      if (typeof spLoggedOut === 'function' && spLoggedOut()) return;
      const d = await chrome.storage.local.get(['walletApp', 'walletWeb', 'walletAutoAt']);
      const fresh = x => x && Date.now() - x.at < 20 * 3600e3;
      if (fresh(d.walletApp) && fresh(d.walletWeb)) return;
      if (Date.now() - (d.walletAutoAt || 0) < 3 * 3600e3) return;
      await chrome.storage.local.set({ walletAutoAt: Date.now() });
      chrome.runtime.sendMessage({ type: 'wallet-auto' }).catch(() => {});
    } catch {}
  }
  // 1.10.229: tắt tự đọc ví (ví web không có mã 15% của app) – giữ hàm để dùng sau
  if (/(^|\.)shopee\.vn$/.test(location.hostname) && /^\/cart/.test(location.pathname) && /hh-wallet/.test(location.hash)) setTimeout(async () => {   // chạy sau khi cả file nạp xong (wait/cartTotal khai báo phía dưới)
    const done = () => chrome.runtime.sendMessage({ type: 'wallet-auto-done' }).catch(() => {});
    try {
      const pick = () => [...document.querySelectorAll('button,div,span,a')].filter(e => !e.closest('#hattieu-host') && /^(Chọn Voucher khác|Chọn Voucher|Chọn hoặc nhập mã)$/.test((e.innerText || '').trim())).pop();
      let btn = null; for (let t = 0; t < 40 && !(btn = pick()); t++) await wait(500);
      if (!btn) return done();
      btn.click();
      let ok = false; for (let t = 0; t < 12000; t += 400) { await wait(400); if (/Giảm Giá & Hoàn Xu|Chọn Shopee Voucher/.test(document.body.innerText)) { ok = true; await wait(800); break; } }
      if (!ok) return done();
      for (let k = 0; k < 8; k++) { const sc = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50 && d.clientHeight < 800 && /Chọn Shopee Voucher|Giảm Giá & Hoàn Xu/.test(d.innerText || '')).pop(); if (sc) sc.scrollTop += 2500; await wait(500); }
      const r = parseWalletDialog(document.body.innerText || '', cartTotal() || 0);
      const now = Date.now();
      await chrome.storage.local.set({ walletApp: { at: now, list: (r && r.appList) || [] }, walletWeb: { at: now, list: (r && r.webList) || [] } });
      const back = [...document.querySelectorAll('button')].find(b => /^trở lại$/i.test((b.innerText || '').trim())); if (back) back.click();
    } catch {}
    done();
  }, 1500);
  chrome.storage.local.get(['walletApp', 'walletMine']).then(d => {
    walletApp = d.walletApp || null; walletMine = d.walletMine || null;
    if (walletApp && walletApp.src === 'wallet') { walletMine = walletMine || walletApp; walletApp = null; chrome.storage.local.set({ walletMine, walletApp: null }).catch(() => {}); }   // dọn dữ liệu bản 1.10.165–191
  }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, a) => { if (a !== 'local') return; if (ch.walletApp) walletApp = ch.walletApp.newValue || null; if (ch.walletMine) { walletMine = ch.walletMine.newValue || null; if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel(); } });   // 1.10.187: ví cập nhật ở tab khác → hiện ngay
  const hsdOk = u => { const m = (u || '').match(/HSD:\s*(\d{2})\.(\d{2})\.(\d{4})/); return !m || new Date(+m[3], +m[2] - 1, +m[1], 23, 59) > new Date(); };
  const soldOutNow = () => { try { return !!findText(/^(Hết hàng|Sản phẩm này đã hết hàng|Sản phẩm đã hết hàng|HẾT HÀNG)$/i); } catch { return false; } };
  // 🎟️ Nhắc mã trong ví Shopee sắp hết hạn (đọc từ lần quét ví gần nhất) – 1 lần/ngày
  async function voucherExpiryNudge() {
    const W = walletMine || walletApp; if (!ui || !W || Date.now() - W.at > 30 * 864e5 || !ui.panel.hidden || !ui.bubble.hidden || menuOpen) return;
    const day = new Date().toDateString(), { vexpDay = '' } = await chrome.storage.local.get('vexpDay').catch(() => ({}));
    if (vexpDay === day || !(await autoGate())) return;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const soon = (W.list || []).map(v => { const e = walletExp(v); if (!e || e < Date.now()) return null; const dd = Math.floor((e - d0) / 864e5); return dd >= 0 && dd <= 1 ? { v, dd } : null; }).filter(Boolean);
    if (!soon.length) return;
    await chrome.storage.local.set({ vexpDay: day }).catch(() => {});
    const x = soon.sort((a, b) => (b.v.pct ? b.v.pct * 1000 : b.v.off || 0) - (a.v.pct ? a.v.pct * 1000 : a.v.off || 0))[0], name = x.v.pct ? `giảm ${x.v.pct}%` : `giảm ${kShort(x.v.off || 0)}`;
    say(`Mã ${name}${soon.length > 1 ? ` và ${soon.length - 1} mã khác` : ''} hết hạn ${x.dd ? 'ngày mai' : 'hôm nay'}. Cần mua gì thì dùng trước khi hết nhé!`, 'remind', '🎟️ Mã sắp hết hạn', 'shop',
      [{ label: 'Mở giỏ hàng Shopee', fn: () => openDeal('https://shopee.vn/cart') }, { label: 'Để sau', ghost: true, fn: () => {} }]);
  }
  function walletAppBest(a) {
    if (!walletApp || Date.now() - walletApp.at > 4 * 864e5 || !(a > 0)) return null;
    let best = null;
    for (const v of walletApp.list || []) {
      if (!hsdOk(v.until) || (v.min && a < v.min)) continue;
      let x = v.pct ? Math.round(a * v.pct / 100) : v.off; if (v.cap) x = Math.min(x, v.cap); x = Math.min(x, a);
      if (x > 0 && (!best || x > best.v)) best = { ...v, v: x };
    }
    return best;
  }   // { at, base, cur, web, app, pay, n, err }
  const VH_PAY = /spaylater|shopeepay|mua trước trả sau|thẻ tín dụng|ngân hàng|napas|ví điện tử/i;
  function parseWalletDialog(txt, base) {
    const i = txt.indexOf('Giảm Giá & Hoàn Xu'); if (i < 0) return null;
    const j = txt.indexOf('Voucher không khả dụng', i);
    const tail = txt.indexOf('Đã hiển thị tất cả', i);
    const parse = (s, usable) => {
      const L = s.split('\n').map(x => x.trim()).filter(Boolean), out = []; let cur = null, prev = '';
      for (const l of L) {
        const g = l.replace(/^Số lượng có hạn/i, '');
        if (/^(Giảm|Hoàn)\s/.test(g) && /(\d+\s*%|[\d.,]+\s*(k|tr)?₫)/.test(g)) {
          cur = { head: prev, g, min: 0, why: '', usable, extra: '' }; out.push(cur);
        } else if (cur && /^Đơn Tối Thiểu/i.test(l)) cur.min = HT.money(l.replace(/Đơn Tối Thiểu/i, ''));
        else if (cur && /Vui lòng|không đáp ứng|không đủ điều kiện|chưa đạt|Mua thêm|Hết lượt|đã hết|không áp dụng/i.test(l)) { if (!cur.why) cur.why = l; }
        else if (cur) cur.extra += ' ' + l;
        prev = l;
      }
      return out;
    };
    const list = [...parse(txt.slice(i, j > 0 ? j : tail > 0 ? tail : undefined), true), ...(j > 0 ? parse(txt.slice(j, tail > j ? tail : undefined), false) : [])];
    const val = v => {
      if (/^Hoàn/i.test(v.g)) return 0;   // hoàn xu: không giảm giá trả
      const pct = +(v.g.match(/(\d+)\s*%/) || [])[1] || 0, cap = HT.money((v.g.match(/tối đa\s*([\d.,]+\s*(?:k|tr)?)/i) || [])[1]);
      const off = pct ? 0 : HT.money((v.g.match(/Giảm\s*([\d.,]+\s*(?:k|tr)?)₫/i) || [])[1]);
      if (v.min && base < v.min) return 0;
      let x = pct ? Math.round(base * pct / 100) : off; if (cap) x = Math.min(x, cap); return Math.min(x, base);
    };
    for (const v of list) {
      v.pct = +(v.g.match(/(\d+)\s*%/) || [])[1] || 0; v.cap = HT.money((v.g.match(/tối đa\s*([\d.,]+\s*(?:k|tr)?)/i) || [])[1]); v.off = v.pct ? 0 : HT.money((v.g.match(/Giảm\s*([\d.,]+\s*(?:k|tr)?)₫/i) || [])[1]);
      v.v = val(v); v.app = /ứng dụng Shopee/i.test(v.why); v.out = /Hết lượt|đã hết|Đã dùng 100%/i.test(v.why + v.extra);
      v.pay = VH_PAY.test(v.head + ' ' + v.extra); v.kol = /KOL|Video|Live|độc quyền|First To Launch|S Xử Lý|Xử lý/i.test(v.head + ' ' + v.extra);
      v.label = v.g.replace(/Giảm tối đa/i, 'tối đa') + (v.min ? ' · đơn từ ' + kShort(v.min) : '');
      v.until = ((v.extra.match(/HSD:\s*[\d.]+|Còn\s*\d+\s*(giờ|ngày)/i) || [])[0] || '').replace(/^Còn/i, 'còn');
    }
    const best = arr => arr.filter(v => v.v > 0 && !v.out).sort((a, b) => b.v - a.v)[0] || null;
    const first = v => /Đơn đầu tiên|Khách hàng mới|Người dùng mới/i.test(v.head + ' ' + v.extra);   // 1.10.228: mã khách mới → không tính
    const webList = list.filter(v => v.usable && !v.pay && !v.out && !v.kol && !first(v) && !/^Hoàn/i.test(v.g)).map(v => ({ g: v.g, pct: v.pct, cap: v.cap, off: v.off, min: v.min, until: v.until })).slice(0, 40);
    const appList = list.filter(v => !v.usable && v.app && !v.pay && !v.out && !v.kol && !first(v) && !/^Hoàn/i.test(v.g)).map(v => ({ g: v.g, pct: v.pct, cap: v.cap, off: v.off, min: v.min, until: v.until, kol: v.kol })).slice(0, 40);
    return {
      appList, webList,
      n: list.length,
      web: best(list.filter(v => v.usable)),
      app: best(list.filter(v => !v.usable && v.app && !v.pay && !v.kol)),
      appAlt: list.filter(v => !v.usable && v.app && !v.pay && !v.kol && !v.out && v.v > 0).sort((a, b) => b.v - a.v).slice(1, 3),
      pay: best(list.filter(v => !v.usable && v.pay && (v.app || !v.why)))
    };
  }
  async function scanWallet() {
    const c = readCart(); if (!c) return;
    wscan = { busy: true }; renderPanel();
    const base = c.total + c.shopeeOff;
    const btn = [...document.querySelectorAll('button,div,span,a')].filter(e => !e.closest('#hattieu-host') && /^(Chọn Voucher khác|Chọn Voucher|Chọn hoặc nhập mã)$/.test((e.innerText || '').trim())).pop();
    if (!btn) { wscan = { err: 'Không thấy nút chọn Shopee Voucher trong giỏ.' }; return renderPanel(); }
    btn.click();
    let ok = false;
    for (let t = 0; t < 8000; t += 400) { await wait(400); if (/Giảm Giá & Hoàn Xu/.test(document.body.innerText)) { ok = true; break; } }
    if (!ok) { wscan = { err: 'Bảng mã của Shopee chưa mở được. Thử lại sau vài giây.' }; return renderPanel(); }
    // cuộn hết danh sách cho chắc
    for (let k = 0; k < 6; k++) {
      const sc = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50 && d.clientHeight < 800 && /Giảm Giá & Hoàn Xu/.test(d.innerText || '')).pop();
      if (sc) sc.scrollTop += 2500; await wait(500);
    }
    const r = parseWalletDialog(document.body.innerText || '', base);
    // đóng bảng, không đổi mã
    const back = [...document.querySelectorAll('button')].find(b => /^trở lại$/i.test((b.innerText || '').trim()));
    if (back) back.click();
    if (!r) { wscan = { err: 'Chưa đọc được bảng mã.' }; return renderPanel(); }
    const prod = [...document.querySelectorAll('a[href*="-i."]')].find(a => !a.closest('#hattieu-host'));
    wscan = { at: Date.now(), base, cur: c.total, shopeeOff: c.shopeeOff, ...r, url: prod ? cleanUrl(prod.href) : '' };
    walletApp = { at: Date.now(), list: r.appList || [] }; chrome.storage.local.set({ walletApp }).catch(() => {});
    renderPanel();
  }
  function qrOpen(url, title, note) {
    ui.root.querySelectorAll('.qrbox').forEach(x => x.remove());
    const link = HT.isAff(url) ? HT.aff(url) : url;
    const box = el('div', 'qrbox'), card = el('div', 'qrc');
    card.append(el('div', 'qrt', title));
    try { const q = qrcode(0, 'M'); q.addData(link); q.make(); const im = document.createElement('img'); im.src = q.createDataURL(5, 2); im.alt = 'Mã QR mở trên app Shopee'; card.append(im); } catch { card.append(el('div', 'qrs', link)); }
    card.append(el('div', 'qrs', note));
    card.append(el('div', 'qrn', 'ⓘ Link tiếp thị HaoHao · Giá không đổi'));
    const x = el('button', 'b', 'Đóng'); x.addEventListener('click', () => box.remove()); card.append(x);
    box.append(card); box.addEventListener('click', e => { if (e.target === box) box.remove(); }); ui.root.append(box);
  }
  // 🎟️ Voucher ở giỏ (1.9.65 gọn): 1 thẻ "Giá tốt nhất" (web | app) + 2 mục thu gọn (Cách tính, Gợi ý)
  const vOpen = { calc: false, tips: false };
  function vFold(key, title, fill) {
    const d = document.createElement('details'); d.className = 'vfold'; d.open = vOpen[key];
    d.addEventListener('toggle', () => { vOpen[key] = d.open; });
    const s = document.createElement('summary'); s.textContent = title; d.append(s);
    const b = el('div', 'vfb'); fill(b); d.append(b); return d;
  }
  const vLine = (box, a, b, cls = '') => { const r = el('div', 'vhrow ' + cls); r.append(el('span', '', a), el('b', '', b)); box.append(r); };
  const shortV = g => (g || '').replace(/Giảm tối đa/i, 'tối đa').replace(/^Giảm\s*/i, '').replace(/₫/g, '');
  function renderCartVoucher(L) {
    const c = readCart();
    if (!c) { L.append(el('div', 'optwait', 'Tick chọn món trong giỏ để HaoHao đọc giá và mã nhé.')); return; }
    // ① Giá tốt nhất
    const top = el('div', 'cbox here vtop');
    const head = el('div', 'vhead'); head.append(el('span', 'ct', '💰 Giá tốt nhất'), el('span', 'vsub', `${c.n || 1} sản phẩm · chưa gồm ship`)); top.append(head);
    const ws = wscan && !wscan.busy && !wscan.err ? wscan : null;
    const tiles = el('div', 'vtiles');
    const tile = (ic, name, price, note, cls, btn) => { const t = el('div', 'vtile ' + (cls || '')); t.append(el('div', 'vtn', ic + ' ' + name), el('b', '', vnd(price))); if (note) t.append(el('div', 'vtx', note)); if (btn) t.append(btn); tiles.append(t); };
    if (ws) {
      const pw = ws.base - (ws.web ? ws.web.v : 0);
      const pa = ws.app ? ws.base - ws.app.v : 0, appWin = ws.app && pa < pw;
      tile('💻', 'Trên web', pw, ws.web ? 'mã ' + shortV(ws.web.g) : 'không có mã Shopee', appWin ? '' : 'win');
      if (appWin) {
        let q = null;
        if (ws.url) { q = el('button', 'b vqr', '📱 Mở trên app'); q.addEventListener('click', () => qrOpen(ws.url, '📱 Mở món này trên app Shopee', `Quét bằng Camera điện thoại → app Shopee mở đúng món. Thêm vào giỏ → Shopee Voucher → chọn mã ${shortV(ws.app.g)}.`)); }
        tile('📱', 'Trên app ≈', pa, `−${kShort(pw - pa)} · mã ${shortV(ws.app.g)}${ws.app.until ? ' · ' + ws.app.until : ''} · ước tính, giá chắc chắn xem trong app${ws.appAlt && ws.appAlt.length ? ' · mã khác: ' + ws.appAlt.map(x => shortV(x.g)).join(', ') : ''}`, 'win', q);
      } else tile('📱', 'Trên app', pw, 'không rẻ hơn web', '');
      top.append(tiles);
      if (c.total > pw + 1000) top.append(el('div', 'vwarn', `Giỏ đang ${vnd(c.total)}: bấm "Chọn hoặc nhập mã" ở dòng Shopee Voucher → chọn mã ${shortV(ws.web.g)} → Đồng ý.`));
      const ft = el('div', 'vfoot'); ft.append(el('span', '', `Đã đọc ${ws.n} mã trong ví`));
      const rq = el('button', 'chip', '🔄 Quét lại'); rq.addEventListener('click', scanWallet); ft.append(rq); top.append(ft);
    } else {
      tile('🛒', 'Giỏ đang tính', c.total, c.shopeeOff ? `đã áp Shopee Voucher −${kShort(c.shopeeOff)}` : 'chưa áp Shopee Voucher', '');
      top.append(tiles);
      if (wscan && wscan.busy) top.append(el('div', 'optwait', '🐹 Đang đọc bảng mã của Shopee…'));
      else {
        if (wscan && wscan.err) top.append(el('div', 'vwarn', wscan.err));
        const b = el('button', 'b vscan', '🔍 Quét mã trong ví – tìm giá thấp hơn'); b.addEventListener('click', scanWallet); top.append(b);
        top.append(el('div', 'vtx', 'Đọc bảng "Chọn Shopee Voucher" của Shopee, so giá web và app. Không đổi mã của bạn.'));
      }
    }
    L.append(top);
    // ② Cách Shopee tính (thu gọn)
    L.append(vFold('calc', '🧮 Cách Shopee tính', b => {
      if (c.orig) vLine(b, 'Giá gốc', vnd(c.orig));
      if (c.prodOff) vLine(b, '− Giảm giá sản phẩm', '−' + vnd(c.prodOff));
      vLine(b, '− Mã của shop', c.shopOff ? '−' + vnd(c.shopOff) : '✗ chưa áp', c.shopOff ? 'ok' : 'no');
      vLine(b, '− Shopee Voucher', c.shopeeOff ? '−' + vnd(c.shopeeOff) : '✗ chưa áp', c.shopeeOff ? 'ok' : 'no');
      vLine(b, '= Tổng cộng', vnd(c.total), 'ok');
      vLine(b, '+ Phí ship', 'xem ở trang thanh toán');
    }));
    // ③ Gợi ý (thu gọn)
    const tips = [];
    if (!c.shopOff && c.moreShop) tips.push('🏷️ Bấm "Xem thêm voucher" dưới tên shop → Lưu mã → giỏ tự áp.');
    if (!c.shopeeOff) tips.push('🛍️ Bấm "Chọn hoặc nhập mã" ở dòng Shopee Voucher → chọn mã lớn nhất → Đồng ý.');
    if (c.xu) tips.push(`🪙 Tick ô Shopee Xu để giảm thêm ${vnd(c.xu)}.`);
    tips.push('🚚 Freeship hiện ở trang thanh toán (dòng "Giảm giá phí vận chuyển").');
    L.append(vFold('tips', `💡 Gợi ý (${tips.length})`, b => tips.forEach(x => b.append(el('div', 'vtip', x)))));
  }
  // trang thanh toán: bảng kiểm mã (chỉ đọc số Shopee đang hiện)
  function checkoutVBox() {
    const k = readCheckout(); if (!k) return null;
    const t = document.body.innerText || '', mm = [...t.matchAll(/Giảm giá phí vận chuyển\s*\n\s*-?\s*₫?\s*([\d.,]+)/g)], shipOff = mm.length ? HT.money(mm[mm.length - 1][1]) : 0;
    const box = el('div', 'cbox here'); box.append(el('div', 'ct', '🎟️ HaoHao kiểm tra mã'));
    const row = (ok, a, b) => { const r = el('div', 'vhrow ' + (ok ? 'ok' : 'no')); r.append(el('span', '', a), el('b', '', b)); box.append(r); };
    row(k.vouch > 0, '🏷️ Voucher giảm giá', k.vouch > 0 ? `✓ −${vnd(k.vouch)}` : '✗ Chưa áp');
    row(!k.ship || shipOff > 0, '🚚 Phí vận chuyển', !k.ship ? '✓ Miễn phí' : shipOff > 0 ? `✓ giảm ${vnd(shipOff)}` : `✗ đang tính ${vnd(k.ship)}`);
    row(true, '💰 Tổng thanh toán', vnd(k.total));
    if (!(k.vouch > 0) || (k.ship && !shipOff)) box.append(el('div', 'cnote', 'Bấm "Chọn Voucher" ở dòng Shopee Voucher → chọn mã Freeship + mã giảm giá → Đồng ý. Chưa có mã thì về trang sản phẩm, tab 🎟️ Voucher, bấm "Tìm mã tốt nhất".'));
    return box;
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
    findQ = q; kwLog(q, 'hh');
    findHist = [q, ...findHist.filter(x => HT.fold(x) !== HT.fold(q))].slice(0, 5);
    chrome.storage.local.set({ shopHist: findHist }).catch(() => {});
    // 1.10.108: có máy chủ soi sản phẩm → hiện danh sách Shopee + TikTok ngay trong HaoHao
    if (spyOn()) { spyFind(q); return; }
    // tìm nhanh: mở thẳng trang kết quả Shopee ở tab mới (qua link tiếp thị), không lọc, không chờ
    findState = null;
    spyOpen('https://shopee.vn/search?keyword=' + encodeURIComponent(q));   // xếp theo Shopee (Liên quan); V1.73: bản Store mở link thường
    if (tab === 'shop' && ui && !ui.panel.hidden) renderPanel();
  }
  // ---------- 🔎 Soi sản phẩm (Shopee qua AccessTrade, TikTok qua RioHub – chỉ lấy dữ liệu, link mua là link của chủ app) ----------
  let spy = null, spySrc = 'all', spySort = 'hot', spyKeys = null, spyKeyOpen = false;
  chrome.storage.local.get('spyKeys').then(r => { spyKeys = r.spyKeys || null; }).catch(() => {});
  const spyOn = () => !!(HT.SPY_API || (spyKeys && (spyKeys.at || spyKeys.rh)));
  // V1.73: bản Store – Soi sản phẩm mở link thường (không gắn link tiếp thị), ẩn % hoa hồng
  const spyOpen = url => HT.STORE ? chrome.runtime.sendMessage({ type: 'prod-open', url }).catch(() => window.open(url, '_blank')) : openDeal(url);
  // 🔑 chủ app dán khoá 1 lần (lưu trong Chrome máy này, không gửi đi đâu ngoài AccessTrade/RioHub)
  function spyKeyBox() {
    const w = el('div', 'spy-key'); if (HT.STORE) return w;   // V1.56: bản Store không có ô khoá chủ app
    const t = el('button', 'spy-kt', '🔑 Bật soi sản phẩm (chủ app)'); t.addEventListener('click', () => { spyKeyOpen = !spyKeyOpen; renderPanel(); }); w.append(t);
    if (!spyKeyOpen) return w;
    const f = h(`<div class="spy-kf"><input type="password" class="hold-in" placeholder="Khoá AccessTrade (tài khoản phụ)" aria-label="Khoá AccessTrade" autocomplete="off">
      <input type="password" class="hold-in" placeholder="Khoá RioHub (rhk_…)" aria-label="Khoá RioHub" autocomplete="off">
      <input class="hold-in" placeholder="Kênh TikTok phụ" aria-label="Kênh TikTok phụ" value="nhanhimdaily">
      <button class="b">Lưu</button></div>`);
    const [a, r, c] = f.querySelectorAll('input');
    f.querySelector('button').addEventListener('click', () => {
      const k = { at: a.value.trim(), rh: r.value.trim(), creator: c.value.trim().replace(/^@/, '') || 'nhanhimdaily' };
      if (!k.at && !k.rh) return a.focus();
      spyKeys = k; spyKeyOpen = false; chrome.storage.local.set({ spyKeys: k }); say('Đã bật soi sản phẩm Shopee + TikTok 🔎', 'happy', '', 'shop'); renderPanel();
    });
    w.append(f, el('div', 'spy-kn', 'Khoá chỉ lưu trong Chrome máy này. Link mua vẫn là link tiếp thị của HaoHao.'));
    return w;
  }
  // 🔎 Kho key: từ khoá khách tìm (ô tìm HaoHao, trang tìm Shopee, trang tìm TikTok Shop) → máy chủ đếm, chủ app xem ở trang thống kê
  const kwLog = (q, src) => { try { chrome.runtime.sendMessage({ type: 'kw-log', q, src }).catch(() => {}); } catch {} };
  function kwFromUrl() {
    try {
      const u = new URL(location.href), h = u.hostname;
      if (/(^|\.)shopee\.vn$/.test(h) && u.pathname === '/search') { const q = u.searchParams.get('keyword'); if (q) kwLog(q, 'sp'); return; }
      if (/(^|\.)tiktok\.com$/.test(h)) {
        const m = u.pathname.match(/^\/shop\/s\/([^/?#]+)/); if (m) return kwLog(decodeURIComponent(m[1]).replace(/-/g, ' '), 'tt');
        if (/^shop\./.test(h) || /^\/shop\//.test(u.pathname)) { const q = u.searchParams.get('q') || u.searchParams.get('keyword'); if (q) kwLog(q, 'tt'); }
      }
    } catch {}
  }
  async function spyFind(q, more) {
    if (!more) spy = { q, loading: true, items: [], next: '', spPage: 1, spTotal: 0 };
    else { spy.loadingMore = true; spy.spPage++; }
    if (tab === 'shop' && ui && !ui.panel.hidden) renderPanel();
    const r = await chrome.runtime.sendMessage({ type: 'spy-search', q, src: 'tiktok',   // 1.10.120: Shopee mặc định tìm thẳng trên web Shopee (link tiếp thị), soi sản phẩm chỉ còn TikTok
 cursor: more ? spy.next : '', page: spy.spPage }).catch(e => ({ ok: false, error: e.message }));
    if (!spy || spy.q !== q) return;
    spy.loading = spy.loadingMore = false;
    if (!r || !r.ok) spy.error = (r && r.error) || 'lỗi';
    else {
      const add = [...((r.shopee && r.shopee.items) || []), ...((r.tiktok && r.tiktok.items) || [])];
      const seen = new Set(spy.items.map(x => x.src + x.id)); spy.items.push(...add.filter(x => !seen.has(x.src + x.id)));
      spy.next = (r.tiktok && r.tiktok.next) || ''; spy.spTotal = (r.shopee && r.shopee.total) || spy.spTotal;
      spy.errs = [r.shopee && r.shopee.error && 'Shopee: ' + r.shopee.error, r.tiktok && r.tiktok.error && 'TikTok: ' + r.tiktok.error, !r.tiktok && 'TikTok: chưa có khoá RioHub'].filter(Boolean);
    }
    if (tab === 'shop' && ui && !ui.panel.hidden) renderPanel();
  }
  const kfmt = n => !n ? '' : n >= 1e6 ? (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tr' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
  function spyList(L) {
    const s = spy;
    const tabs = el('div', 'spy-tabs');
    spySrc = 'tiktok';
    tabs.append(el('button', 'chip sm on', 'TikTok'));

    tabs.append(el('span', 'spy-sp'));
    if (HT.STORE && spySort === 'rate') spySort = 'hot';
    [['hot', 'Bán chạy'], ['cheap', 'Rẻ'], ...(HT.STORE ? [] : [['rate', '% HH']])].forEach(([k, t]) => { const b = el('button', 'chip sm' + (spySort === k ? ' on' : ''), t); b.addEventListener('click', () => { spySort = k; renderPanel(); }); tabs.append(b); });
    L.append(tabs);
    if (s.loading) { L.append(el('div', 'optwait', `Đang soi “${s.q}” trên TikTok…`)); return; }
    if (s.error) { L.append(el('div', 'optwait', s.error === 'off' ? 'Chưa bật máy chủ soi sản phẩm.' : 'Chưa soi được lần này: ' + s.error)); }
    let items = s.items.filter(x => spySrc === 'all' || x.src === spySrc);
    const sorter = { hot: (a, b) => (b.sold || 0) - (a.sold || 0) || (b.discount || 0) - (a.discount || 0), cheap: (a, b) => (a.price || 9e15) - (b.price || 9e15), rate: (a, b) => (b.rate || 0) - (a.rate || 0) }[spySort];
    items = items.slice().sort(sorter);
    L.append(el('div', 'fhead', `${items.length} món cho “${s.q}”` + (s.spTotal ? ` · Shopee có ${s.spTotal}` : '')));
    if (s.errs && s.errs.length) L.append(el('div', 'spy-kn', '⚠ ' + s.errs.join(' · ')));
    const spNone = spySrc !== 'tiktok' && !s.error && !s.items.some(x => x.src === 'shopee');
    if (spNone) {   // kho AccessTrade chỉ có hàng 1 số shop đối tác → mở thẳng Shopee (vẫn gắn mã tiếp thị)
      const w = el('div', 'spy-none'); w.append(el('span', '', `Kho soi Shopee chưa có “${s.q}”.`));
      const b = el('button', 'chip on', `Tìm “${s.q}” trên Shopee ›`); b.addEventListener('click', () => spyOpen('https://shopee.vn/search?keyword=' + encodeURIComponent(s.q)));
      w.append(b); L.append(w);
    }
    if (!items.length && !s.error && !spNone) L.append(el('div', 'optwait', 'Chưa thấy món nào. Thử từ khoá ngắn hơn.'));
    for (const x of items) {
      const r = el('button', 'spy-row'); r.title = x.title;
      if (x.image) { const im = document.createElement('img'); im.src = x.image; im.alt = ''; im.loading = 'lazy'; r.append(im); } else r.append(el('span', 'spy-noimg', '🛍️'));
      const mid = el('span', 'spy-mid'); mid.append(el('span', 'spy-t', x.title));
      const meta = el('span', 'spy-m'); meta.append(el('i', 'spy-src ' + x.src, x.src === 'tiktok' ? 'TikTok' : 'Shopee'));
      if (x.shop) meta.append(el('span', '', x.shop));
      if (x.sold) meta.append(el('span', '', 'Đã bán ' + kfmt(x.sold)));
      if (x.rating) meta.append(el('span', '', '★ ' + x.rating));
      mid.append(meta);
      const rt = el('span', 'spy-r'); rt.append(el('b', '', vnd(x.price)));
      if (x.oldPrice > x.price) rt.append(el('s', '', vnd(x.oldPrice)));
      if (x.discount) rt.append(el('span', 'spy-off', '-' + x.discount + '%'));
      if (x.rate && !HT.STORE) rt.append(el('span', 'spy-hh', 'HH ' + x.rate.toLocaleString('vi-VN') + '%'));
      r.append(mid, rt);
      r.addEventListener('click', () => spyOpen(x.url));   // Shopee: gắn mã tiếp thị của chủ app; TikTok: link @haohaomall nếu đã có
      L.append(r);
    }
  }
  // Lối vào trang TikTok của bạn (phòng trưng bày): hàng HaoHao tuyển chọn
  function ttCard() {
    const url = HT.ttShowcase(); if (!url) return null;
    const b = el('button', 'ttcard'); b.setAttribute('aria-label', 'Mở hàng HaoHao tuyển chọn trên TikTok');
    const tx = el('span', 'ttx'); tx.append(el('b', '', '🛍️ Hàng HaoHao tuyển chọn'));
    b.append(tx, el('span', 'tth', '@' + (HT.TT.creator || 'TikTok') + ' ›'));
    b.addEventListener('click', () => openDeal(url));
    return b;
  }
  // Lối vào trang trưng bày Shopee của bạn
  // 🔥 dải Deal hôm nay (chủ app chọn) – người dùng tự bấm, đi qua link tiếp thị
  function dealStrip() {
    const list = HT.pickDeals((couponFeed || {}).deals, 4);
    if (!list.length) return null;   // chưa có deal: ẩn hẳn khung, không để trống
    const box = el('div', 'dstrip');
    const hd = el('div', 'dhd'); hd.append(el('b', '', '🔥 Deal hôm nay'));
    box.append(hd);
    if (list.length) {
      const row = el('div', 'dlist');
      for (const x of list) {
        const c = el('button', 'dli'); c.title = x.title;
        if (x.image) { const im = document.createElement('img'); im.src = x.image; im.alt = ''; im.loading = 'lazy'; c.append(im); } else c.append(el('span', 'dno', '🛍️'));
        const tx = el('span', 'dtx'); tx.append(el('span', 'dt', x.title));
        const pr = el('span', 'dp'); if (x.price) pr.append(el('b', '', vnd(x.price))); if (x.orig > x.price) pr.append(el('s', '', vnd(x.orig))); tx.append(pr); c.append(tx);
        const off = HT.dealOff(x); if (off) c.append(el('span', 'doff', '-' + off + '%'));
        c.addEventListener('click', () => openDeal(x.url));
        row.append(c);
      }
      box.append(row);
    }
    box.title = 'Link tiếp thị · Giá không đổi';
    box.append(el('div', 'daff', 'ⓘ Link tiếp thị · Giá không đổi'));
    return box;
  }
  // 🧡 Cửa hàng HaoHao: 2 ô nhỏ cạnh nhau (Shopee · TikTok Shop)
  function storeTiles() {   // 1.10.152: gọn 1 hàng – nhãn + 2 nút nhỏ Shopee / TikTok Shop
    const sp = HT.SP.showcase, tt = HT.ttShowcase();
    if (!sp && !tt) return null;
    const box = el('div', 'stores mini');
    box.append(el('span', 'sthd', '🧡 HaoHao Store'));
    const tile = (cls, ico, name, url, label) => {
      const b = el('button', 'stile ' + cls); b.setAttribute('aria-label', label); b.title = label + ' · Link tiếp thị, giá không đổi';
      b.append(el('i', '', ico), el('b', '', name + ' ›'));
      b.addEventListener('click', () => openDeal(url)); return b;
    };
    if (sp) box.append(tile('sp', '🛍️', 'Shopee', sp, 'Mở cửa hàng HaoHao trên Shopee'));
    if (tt) box.append(tile('tt', '🎵', 'TikTok', tt, 'Mở hàng HaoHao tuyển chọn trên TikTok Shop'));
    return box;
  }
  // 🎟️ 1.10.165: Mã hot (chủ app cập nhật mỗi đợt sale qua coupons.json) + Ví voucher của khách (nhắc mã sắp hết hạn)
  let hotMore = false, walletMore = false;
  const cdTxt = ms => { if (ms <= 0) return 'Hết hạn'; const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return `⏳ còn ${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
  setInterval(() => { if (!ui || !ui.panel || ui.panel.hidden) return; ui.root.querySelectorAll('.cdn').forEach(e => { e.textContent = (e.dataset.pre || '') + cdTxt(+e.dataset.exp - Date.now()); }); }, 1000);
  const walletExp = v => v.exp || (() => { const m = String(v.until || '').match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1], 23, 59).getTime() : 0; })();
  let autoHot = [], autoHotAt = 0, hotAsk = 0; chrome.storage.local.get('autoHot').then(d => { autoHot = (d.autoHot && d.autoHot.items) || []; autoHotAt = (d.autoHot && d.autoHot.at) || 0; }).catch(() => {});
  chrome.storage.onChanged.addListener((ch, a) => { if (a === 'local' && ch.autoHot) { const v = ch.autoHot.newValue || {}; autoHot = v.items || []; autoHotAt = v.at || 0; if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel(); } });
  // mở tab Voucher mà mã hot cũ hơn 1 giờ (hoặc chưa có) → nhờ nền tải ngay từ máy chủ
  const hotFresh = () => { if ((Date.now() - autoHotAt > 3600e3 || !autoHot.length) && Date.now() - hotAsk > 20e3) { hotAsk = Date.now(); chrome.runtime.sendMessage({ type: 'hot-sync' }).catch(() => {}); } };
  // ⏰ 1.10.178: khung giờ mã Shopee (theo kinh nghiệm dân săn deal): Extra 20% lúc 0h, 9h, 12h, 15h, 18h, 21h; thứ 4 12h–15h mã 30–35% trong ví
  const EXTRA_H = [0, 9, 12, 15, 18, 21];
  function codeClock() {
    const now = new Date(), h = now.getHours(), m = now.getMinutes();
    const nextH = EXTRA_H.find(x => x > h || (x === h && m < 5)), nx = new Date(now); if (nextH == null) { nx.setDate(nx.getDate() + 1); nx.setHours(0, 0, 0, 0); } else nx.setHours(nextH, 0, 0, 0);
    const live = EXTRA_H.includes(h) && m < 30, wed = now.getDay() === 3, wedLive = wed && h >= 12 && h < 15, sale = (HT.saleDays(now, 1)[0] || {});
    const lines = [];
    lines.push(live ? `🔥 Mã Extra 20% đang tung (khung ${h}h) · lưu và dùng ngay` : `⏰ Mã Extra 20% tung lúc ${nx.getHours()}h · còn ${Math.max(1, Math.round((nx - now) / 6e4))} phút`);
    if (wedLive) lines.push('💥 Thứ 4: mã 30–35% đang có trong ví (12h–15h) · mở ví lưu ngay');
    else if (wed && h < 12) lines.push('💥 Hôm nay thứ 4: 12h–15h có mã 30–35% trong ví');
    if (sale.days === 0) lines.push(`🎉 Hôm nay ${sale.name}: Shopee thường tung mã toàn sàn lúc 0h · 12h · 20h, kèm Freeship 0đ và Flash Sale giá sốc · vào trang sự kiện lưu mã`);
    else if (sale.days != null && sale.days <= 3) lines.push(`🗓️ Còn ${sale.days} ngày nữa ${sale.name}: thêm món vào giỏ trước`);
    return { lines, live: live || wedLive, sale, evUrl: sale.days != null && sale.days <= 3 ? (sale.date && sale.date.getDate() === sale.date.getMonth() + 1 ? `https://shopee.vn/m/${sale.date.getDate()}-${sale.date.getMonth() + 1}` : 'https://shopee.vn/m/ma-giam-gia') : '' };
  }
  function hotVouchers(inTab) {
    const feed = couponFeed || {}, own = (feed.coupons || []).filter(c => HT.couponLive(c) && (c.shop === 'shopee' || c.shop === 'tiktok'));
    const list = [...own, ...autoHot.filter(c => HT.couponLive(c) && !own.some(o => (o.code && o.code === c.code)))];
    const ev = feed.hotEvent && (!feed.hotEvent.until || new Date(feed.hotEvent.until).getTime() > Date.now()) ? feed.hotEvent : null;
    const mine = (walletMine && walletMine.list || []).map(v => ({ v, exp: walletExp(v) })).filter(x => x.exp > Date.now());
    const soon = mine.filter(x => x.exp - Date.now() < 36 * 3600e3);
    const clk = codeClock();
    if (inTab && !list.length && !ev) { const box = el('div', 'hotv'); box.append(el('div', 'hvh', '🏷️ Ưu đãi')); box.append(el('small', '', Date.now() - hotAsk < 15e3 ? '⏳ Đang tải mã hot…' : 'Chưa tải được mã hot, mở lại tab sau ít phút nhé.')); return box; }
    if (!list.length && !ev && !mine.length) {
      const box = el('div', 'hotv'); const w = el('button', 'hvw', '📒 Mở Ví voucher Shopee để HaoHao nhắc mã sắp hết hạn ›');
      w.addEventListener('click', () => openDeal('https://shopee.vn/user/voucher-wallet')); box.append(w); return box;
    }
    const box = el('div', 'hotv'), hd = el('div', 'hvh', inTab ? '🏷️ Ưu đãi' : '🎟️ Mã hot'); if (ev) hd.append(el('em', '', ev.name || 'Sale'));
    box.append(hd);

    if (ev && ev.text) box.append(el('small', '', ev.text));
    const lim = inTab ? 4 : 3, show = hotMore ? list : list.slice(0, lim), grid = inTab ? el('div') : null; if (grid) box.append(grid);
    for (const c of show) {
      if (grid) {   // 1.10.190: tab Voucher – thanh ngang, chỉ 1 dòng chữ đen
        // 1.10.210: 2 dòng gọn – dòng 1 tên shop, dòng 2 mức giảm + mã (xanh lá)
        const full = c.title || HT.couponLabel(c), mm = /^\s*\[([^\]]+)\]\s*(.*)$/.exec(full);
        const shopN = mm ? mm[1].replace(/\s*(Official Store|Flagship Store|Official Shop|Official|Store|Mall)\s*$/i, '').trim() : '', deal = mm ? mm[2] : full;
        const cd = el('div', 'hvl'), t = el('span', ''); if (shopN) t.append(el('b', '', shopN), ' · ');
        const l2 = el('i', '', deal); if (c.code) l2.append(' · ', el('em', '', c.code)); t.append(l2); t.title = [c.title || HT.couponLabel(c), c.code ? 'Mã ' + c.code : '', c.expires ? 'HSD ' + new Date(c.expires).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''].filter(Boolean).join(' · ');
        const b = el('button', c.shop === 'tiktok' ? 'tt' : '', c.code ? 'Chép mã ›' : 'Lưu mã ›');
        b.addEventListener('click', async () => { if (c.code) await copyText(c.code, b); openDeal(c.url || (c.shop === 'tiktok' ? HT.ttShowcase() : 'https://shopee.vn/m/ma-giam-gia')); });
        cd.append(t, b); grid.append(cd); continue;
      }
      const r = el('div', 'hvr'), t = el('span', '', c.title || HT.couponLabel(c));
      const sub = [c.title ? HT.couponLabel(c) : '', c.code ? 'Mã ' + c.code : '', c.expires ? 'HSD ' + new Date(c.expires).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''].filter(Boolean).join(' · ');
      if (sub) t.append(el('small', '', sub));
      const b = el('button', c.shop === 'tiktok' ? 'tt' : '', c.code ? 'Chép mã ›' : 'Lưu mã ›');
      b.addEventListener('click', async () => { if (c.code) await copyText(c.code, b); openDeal(c.url || (c.shop === 'tiktok' ? HT.ttShowcase() : 'https://shopee.vn/m/ma-giam-gia')); });
      r.append(t, b); box.append(r);
    }
    if (list.length > lim) { const m = el('button', 'hvm', hotMore ? 'Thu gọn ▴' : `Xem thêm ${list.length - lim} mã ▾`); m.addEventListener('click', () => { hotMore = !hotMore; renderPanel(); }); box.append(m); }
    if (ev && ev.url) { const m = el('button', 'hvm', `🔥 Trang sự kiện ${ev.name || ''} ›`); m.addEventListener('click', () => openDeal(ev.url)); box.append(m); }
    if (inTab) return box;
    const w = el('button', 'hvw' + (soon.length ? ' soon' : ''), mine.length ? (soon.length ? `⏰ Ví của bạn: ${soon.length} mã sắp hết hạn · dùng ngay ›` : `📒 Ví của bạn: ${mine.length} mã còn hạn ›`) : '📒 Mở Ví voucher để HaoHao nhắc mã sắp hết hạn ›');
    w.addEventListener('click', () => openDeal(mine.length && soon.length ? 'https://shopee.vn/cart' : 'https://shopee.vn/user/voucher-wallet')); box.append(w);
    return box;
  }
  // 🎟️ 1.10.166: tab Voucher riêng (giữa Tìm và Đã lưu): mã hot + ví của khách
  // 📺 1.10.170: Săn live – đang xem live (TikTok / Shopee Live) thì mã vừa tung hiện ngay; theo dõi shop để được báo khi shop live
  const isLivePage = () => (/(^|\.)tiktok\.com$/.test(location.hostname) && /^\/@[\w.]+\/live/.test(location.pathname)) || /^live\.shopee\.vn$/.test(location.hostname) || (/(^|\.)shopee\.vn$/.test(location.hostname) && /^\/(live|universal-link\/live)/.test(location.pathname));
  const ttUser = () => { const m = /(^|\.)tiktok\.com$/.test(location.hostname) && location.pathname.match(/^\/@([\w.]{2,40})/); return m ? m[1] : ''; };
  let liveShops = [], liveStat = {}; chrome.storage.local.get(['liveShops', 'liveStat']).then(d => { liveShops = d.liveShops || []; liveStat = d.liveStat || {}; }).catch(() => {});
  const liveSeen = new Set(), liveCodes = []; let liveSayAt = 0;
  // 🎯 1.10.175: Sniper chốt live – mã vừa tung là HaoHao điền sẵn cú pháp ("X1", "CHỐT"…) vào ô bình luận + đặt con trỏ; khách chỉ bấm Enter
  //  (không tự gửi: TikTok/Shopee coi bình luận tự động là spam, dễ khoá nick)
  let sniper = { on: false, txt: 'X1' }; chrome.storage.local.get('liveSniper').then(d => { if (d.liveSniper) sniper = d.liveSniper; }).catch(() => {});
  function liveInput() {
    const cands = [...document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"], textarea, input[type="text"]')].filter(e => !e.closest('#hattieu-host') && e.getBoundingClientRect().width > 80);
    return cands.find(e => /bình luận|comment|chat|nói gì đó|say something|thêm/i.test((e.getAttribute('placeholder') || e.getAttribute('aria-label') || e.dataset.placeholder || e.parentElement && e.parentElement.innerText || '').slice(0, 80))) || cands[cands.length - 1] || null;
  }
  function sniperFill() {
    const box = liveInput(), t = (sniper.txt || 'X1').slice(0, 30); if (!box) return false;
    box.focus();
    if (box.isContentEditable) { document.execCommand('selectAll', false); document.execCommand('insertText', false, t); }
    else { const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), 'value'); set && set.set ? set.set.call(box, t) : (box.value = t); box.dispatchEvent(new Event('input', { bubbles: true })); }
    const o = box.style.outline; box.style.outline = '3px solid #EC4A68'; setTimeout(() => { box.style.outline = o; }, 4000);
    return true;
  }
  function liveWatch() {
    if (!isLivePage() || document.visibilityState !== 'visible') return;
    let cards = []; try { cards = voucherCards().filter(c => !/hết lượt|đã hết|hết mã/i.test(c.txt)); } catch { return; }
    const fresh = cards.filter(c => !liveSeen.has(c.id)); fresh.forEach(c => liveSeen.add(c.id));
    if (!fresh.length) return;
    for (const c of fresh) liveCodes.unshift({ id: c.id, label: vLabel(c), at: Date.now(), saved: c.saved, btn: c.btn });
    liveCodes.splice(30);
    const nw = fresh.filter(c => !c.saved); if (!nw.length || Date.now() - liveSayAt < 15000 || !ui) return;
    const filled = sniper.on && sniperFill();
    liveSayAt = Date.now();
    const c = nw[0];
    say(`Mã vừa tung trong live: ${vLabel(c)}${nw.length > 1 ? ` (và ${nw.length - 1} mã khác)` : ''}. ${filled ? `🎯 Đã điền “${sniper.txt}” vào ô bình luận, bấm Enter để chốt!` : 'Lưu ngay kẻo hết lượt!'}`, 'happy', '🔴 Mã live', 'shop',
      [{ label: '🎟️ Lưu ngay', fn: () => { try { c.btn.scrollIntoView({ block: 'center' }); c.btn.click(); } catch {} } }, { label: 'Bỏ qua', ghost: true, fn: () => {} }]);
    if (tab === 'shop' && ui && !ui.panel.hidden) renderPanel();
  }
  function liveBox() {
    const box = el('div', 'hotv'); box.append(el('div', 'hvh', '📺 Săn live'));
    if (isLivePage()) {
      const sr = el('div', 'hvr'), tg = el('button', sniper.on ? '' : 'tt', sniper.on ? '🎯 Sniper: Bật' : '🎯 Sniper: Tắt'), inp = document.createElement('input');
      inp.value = sniper.txt || 'X1'; inp.maxLength = 30; inp.placeholder = 'X1'; inp.style.cssText = 'width:70px;padding:3px 6px;border:1px solid #FBD5C8;border-radius:8px;font:700 12px system-ui';
      inp.addEventListener('change', () => { sniper.txt = inp.value.trim() || 'X1'; chrome.storage.local.set({ liveSniper: sniper }).catch(() => {}); });
      tg.addEventListener('click', () => { sniper.on = !sniper.on; chrome.storage.local.set({ liveSniper: sniper }).catch(() => {}); renderPanel(); });
      const tr = el('button', 'tt', 'Điền thử'); tr.addEventListener('click', () => { if (!sniperFill()) tr.textContent = 'Không thấy ô bình luận'; });
      sr.append(el('span', '', 'Cú pháp chốt:'), inp, tg, tr); box.append(sr);
      box.append(el('small', '', 'Sniper bật: mã vừa tung là HaoHao điền sẵn cú pháp vào ô bình luận, bạn chỉ cần bấm Enter. HaoHao không tự gửi để nick bạn không bị coi là spam.'));
      box.append(el('small', '', liveCodes.length ? `Mã đã tung trong live này (${liveCodes.length}):` : '🔴 HaoHao đang canh live này, có mã tung ra là báo ngay.'));
      const g = el('div', 'hvg'); if (liveCodes.length) box.append(g);
      for (const x of liveCodes.slice(0, 8)) {
        const cd = el('div', 'hvc', x.label); cd.append(el('small', '', `${Math.max(0, Math.round((Date.now() - x.at) / 6e4))} phút trước`));
        if (!x.saved && x.btn && x.btn.isConnected) { const b = el('button', '', 'Lưu ›'); b.addEventListener('click', () => { try { x.btn.click(); x.saved = true; b.textContent = 'Đã bấm ✓'; } catch {} }); cd.append(b); }
        g.append(cd);
      }
    }
    const u = ttUser();
    if (u && !liveShops.some(s => s.u === u)) {
      const r = el('div', 'hvr'), b = el('button', 'tt', '⭐ Theo dõi live'); r.append(el('span', '', `@${u}`), b);
      b.addEventListener('click', async () => { liveShops = [...liveShops, { u, at: Date.now() }].slice(-15); await chrome.storage.local.set({ liveShops }); renderPanel(); });
      box.append(r);
    }
    if (liveShops.length) {
      const g = el('div', 'hvg'); box.append(g);
      for (const s of liveShops) {
        const st = liveStat[s.u], on = st && st.live, cd = el('div', 'hvc' + (on ? ' soon' : ''), (on ? '🔴 ' : '') + '@' + s.u);
        cd.append(el('small', '', on ? 'Đang live' : st ? 'Chưa live' : 'Đang kiểm tra…'));
        const b = el('button', 'tt', on ? 'Vào live ›' : 'Xem ›'); b.addEventListener('click', () => openDeal(`https://www.tiktok.com/@${s.u}/live`));
        const x = el('button', '', '✕'); x.style.marginLeft = '4px'; x.title = 'Bỏ theo dõi'; x.addEventListener('click', async () => { liveShops = liveShops.filter(y => y.u !== s.u); await chrome.storage.local.set({ liveShops }); renderPanel(); });
        cd.append(b, x); g.append(cd);
      }
      box.append(el('small', '', 'HaoHao kiểm tra 10 phút/lần, shop vừa live là báo.'));
    } else if (!u) box.append(el('small', '', 'Mở trang TikTok của shop bạn thích (tiktok.com/@tênshop) rồi bấm ⭐ Theo dõi live: shop vừa live là HaoHao báo để vào săn mã.'));
    return box;
  }
  // 🤝 1.10.176: Chợ voucher cộng đồng – mã nhập tay mình không dùng thì tặng người khác; ai thử thấy hết thì báo, 3 lần báo là ẩn
  let cho = { at: 0, items: [], form: false, msg: '', busy: false }, choMore = false;
  async function choLoad(force) {
    if (cho.busy || (!force && Date.now() - cho.at < 120e3)) return; cho.busy = true;
    const r = await chrome.runtime.sendMessage({ type: 'cho', op: 'list' }).catch(() => null);
    cho.busy = false; if (r && r.ok) { cho.items = r.items || []; cho.at = Date.now(); if (!cho.form && tab === 'shop' && ui && !ui.panel.hidden) renderPanel(); }
  }
  // 1.10.247: TỰ KIỂM TRA mã chợ – khách chép mã rồi dán ở giỏ/thanh toán Shopee: Shopee báo lỗi → tự báo hỏng (2 máy báo → máy chủ xoá); áp được → 👍
  setTimeout(() => {
    if (!/(^|\.)shopee\.vn$/.test(location.hostname) || !/^\/(cart|checkout)/.test(location.pathname)) return;
    let n = 0; const iv = setInterval(async () => {
      if (++n > 400) return clearInterval(iv);
      const { choTry } = await chrome.storage.local.get('choTry').catch(() => ({})); if (!choTry || Date.now() - choTry.at > 30 * 6e4) return;
      const t = document.body.innerText || ''; if (!t.includes(choTry.code)) return;
      const badRe = /(Mã( voucher)?|Voucher)[^\n]{0,30}(không hợp lệ|không tồn tại|đã hết lượt|hết lượt sử dụng|đã hết hạn|không áp dụng|không đủ điều kiện)|Rất tiếc[^\n]{0,40}(hết|không)/i;
      const okRe = /(Áp dụng thành công|Đã áp dụng)/i;
      const v = badRe.test(t) ? 'bad' : okRe.test(t) ? 'ok' : '';
      if (!v) return;
      clearInterval(iv); await chrome.storage.local.remove('choTry').catch(() => {});
      chrome.runtime.sendMessage({ type: 'cho', op: 'vote', data: { vote: 1, id: choTry.id, v } }).catch(() => {});
    }, 1500);
  }, 2000);
  function choBox() {
    choLoad();
    const box = el('div', 'hotv'), hd = el('div', 'hvh', '🤝 Chợ voucher cộng đồng'); hd.append(el('em', '', cho.items.length + ' mã')); box.append(hd);
    box.append(el('small', '', 'Mã nhập tay bạn không dùng tới? Tặng cho người dùng HaoHao khác. Mã trong ví đã lưu thì không chuyển được.'));
    const k = n => n >= 1000 ? Math.round(n / 1000) + 'k' : n;
    const g = el('div', 'hvg'); if (cho.items.length) box.append(g);
    for (const x of cho.items.slice(0, choMore ? 20 : 4)) {
      const left = x.until - Date.now(), cd = el('div', 'hvc' + (left < 864e5 ? ' soon' : ''), (x.shop === 'tiktok' ? '🎵 ' : '🛍️ ') + x.label);
      cd.append(el('small', '', `Mã ${x.code} · ${left < 864e5 ? 'hết hạn hôm nay' : 'HSD ' + new Date(x.until).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}${x.ok ? ` · 👍 ${x.ok}` : ''}${x.used ? ` · ${k(x.used)} lượt lấy` : ''}`));
      const cp = el('button', x.shop === 'tiktok' ? 'tt' : '', 'Chép mã ›');
      cp.addEventListener('click', async () => { await copyText(x.code, cp); chrome.runtime.sendMessage({ type: 'cho', op: 'vote', data: { vote: 1, id: x.id, v: 'used' } }).catch(() => {}); chrome.storage.local.set({ choTry: { id: x.id, code: x.code, at: Date.now() } }).catch(() => {}); if (x.url) openDeal(x.url); });   // 1.10.247: nhớ mã vừa chép để tự kiểm tra lúc thanh toán
      const ok = el('button', 'tt', '👍'), bad = el('button', 'tt', 'Hết ✕'); ok.title = 'Mã dùng được'; bad.title = 'Báo mã hết lượt / không dùng được';
      for (const [b, v] of [[ok, 'ok'], [bad, 'bad']]) b.addEventListener('click', async () => { b.textContent = '✓'; await chrome.runtime.sendMessage({ type: 'cho', op: 'vote', data: { vote: 1, id: x.id, v } }).catch(() => {}); choLoad(true); });
      ok.style.marginLeft = bad.style.marginLeft = '4px'; cd.append(cp, ok, bad);
      if (x.mine) { const del = el('button', 'tt', '🗑️ Xoá'); del.title = 'Mã bạn đã đăng · gỡ khỏi chợ'; del.style.marginLeft = '4px'; del.addEventListener('click', async () => { del.textContent = '⏳'; await chrome.runtime.sendMessage({ type: 'cho', op: 'del', data: { del: 1, id: x.id } }).catch(() => {}); choLoad(true); }); cd.append(del); }   // 1.10.247
      g.append(cd);
    }
    if (cho.items.length > 4) { const m = el('button', 'hvm', choMore ? 'Thu gọn ▴' : `Xem thêm ${Math.min(20, cho.items.length) - 4} mã ▾`); m.addEventListener('click', () => { choMore = !choMore; renderPanel(); }); box.append(m); }
    if (!cho.form) { const a = el('button', 'hvm', '🎁 Tặng mã của bạn ›'); a.addEventListener('click', () => { cho.form = true; cho.msg = ''; renderPanel(); }); box.append(a); }
    else {
      const f = el('div'); f.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px';
      const inp = (ph, type) => { const i = document.createElement('input'); i.placeholder = ph; if (type) i.type = type; i.style.cssText = 'min-width:0;padding:5px 7px;border:1px solid #FBD5C8;border-radius:8px;font:600 12px system-ui'; return i; };
      const code = inp('Mã (vd SHOPABC10K)'), label = inp('Giảm gì (vd Giảm 20k đơn 99k)'), until = inp('', 'date'), url = inp('Link shop/món (không bắt buộc)');
      const shop = document.createElement('select'); shop.style.cssText = code.style.cssText; shop.innerHTML = '<option value="shopee">Shopee</option><option value="tiktok">TikTok</option>';
      const d = new Date(Date.now() + 3 * 864e5); until.value = d.toISOString().slice(0, 10);
      const send = el('button', 'b buy', '🎁 Đăng tặng'), cancel = el('button', 'b ghost', 'Huỷ');
      cancel.addEventListener('click', () => { cho.form = false; renderPanel(); });
      send.addEventListener('click', async () => {
        send.disabled = true;
        const r = await chrome.runtime.sendMessage({ type: 'cho', op: 'add', data: { code: code.value, label: label.value, shop: shop.value, url: url.value, until: new Date(until.value + 'T23:59:00').getTime() } }).catch(() => null);
        cho.msg = r && r.ok ? '✓ Cảm ơn bạn! Mã đã lên chợ.' : r && r.error === 'dup' ? 'Mã này đã có trên chợ rồi.' : r && r.error === 'limit' ? 'Mỗi ngày mỗi mạng chỉ tặng tối đa 2 mã nhé.' : 'Kiểm tra lại: mã 4–24 chữ/số, có mô tả, hạn dùng trong 120 ngày tới.';
        if (r && r.ok) { cho.form = false; choLoad(true); } else send.disabled = false;
        renderPanel();
      });
      f.append(code, shop, label, until, url, el('span'), send, cancel); box.append(f);
    }
    if (cho.msg) box.append(el('small', '', cho.msg));
    return box;
  }
  // 🔎 1.10.184: tìm mã theo từ khoá / nhóm hàng (thời trang, mẹ bé, gia dụng, mỹ phẩm, điện thoại hoặc tên shop)
  let hotQ = { q: '', busy: false, items: null };
  function hotSearchBox() {
    const box = el('div', 'hotv'); box.append(el('div', 'hvh', '🔎 Tìm mã theo nhu cầu'));
    const f = el('form', 'hvr'), inp = document.createElement('input'); inp.value = hotQ.q; inp.placeholder = 'vd thời trang, mẹ bé, gia dụng, tên shop…';
    inp.style.cssText = 'flex:1;min-width:0;padding:6px 8px;border:1px solid #FBD5C8;border-radius:9px;font:600 12px system-ui';
    const go = el('button', '', hotQ.busy ? '⏳' : 'Tìm ›'); f.append(inp, go);
    const run = async q => { q = (q || '').trim(); if (!q) return; hotQ = { q, busy: true, items: null }; renderPanel(); const r = await chrome.runtime.sendMessage({ type: 'hot-q', q }).catch(() => null); hotQ = { q, busy: false, items: (r && r.items) || [] }; renderPanel(); };
    f.addEventListener('submit', e => { e.preventDefault(); run(inp.value); });
    box.append(f);
    const chips = el('div', 'hvr'); for (const c of ['Thời trang', 'Mẹ bé', 'Gia dụng', 'Mỹ phẩm', 'Điện thoại']) { const b = el('button', 'tt', c); b.addEventListener('click', e => { e.preventDefault(); run(c); }); chips.append(b); }
    chips.style.flexWrap = 'wrap'; box.append(chips);
    if (hotQ.items) {
      if (!hotQ.items.length) box.append(el('small', '', `Chưa thấy mã cho “${hotQ.q}”. Thử từ khác hoặc tên shop nhé.`));
      else {
        box.append(el('small', '', `${hotQ.items.length} mã cho “${hotQ.q}”:`));
        const g = el('div'); box.append(g);
        for (const c of hotQ.items) {
          const cd = el('div', 'hvl'), t = el('span', '', c.title); t.title = [c.title, c.code ? 'Mã ' + c.code : '', c.expires ? 'HSD ' + new Date(c.expires).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''].filter(Boolean).join(' · ');
          const b = el('button', '', c.code ? 'Chép mã ›' : 'Lấy mã ›'); b.addEventListener('click', async () => { if (c.code) await copyText(c.code, b); if (c.url) openDeal(c.url); });
          cd.append(t, b); g.append(cd);
        }
      }
    }
    return box;
  }
  // 🗓️ 1.10.185: nhóm 1 – lịch & chính sách mã Shopee (ngày sale trong tháng, khung giờ mã, SVIP, mã Facebook)
  let calMore = false;
  function saleCalBox() {
    const clk = codeClock(), box = el('div', 'hotv'); box.append(el('div', 'hvh', '🗓️ Lịch săn mã Shopee'));
    for (const t of clk.lines) {
      if (clk.live && /^(🔥|💥)/.test(t)) {   // 1.10.243: đang tung mã → cả dòng là nút, khách bấm lưu luôn
        const b = el('button', 'hvlive'); b.append(el('span', '', t.replace(/ · lưu và dùng ngay| · mở ví lưu ngay/, '')), el('b', '', 'Lưu ngay ›')); b.addEventListener('click', () => openDeal(/^💥/.test(t) ? 'https://shopee.vn/user/voucher-wallet' : 'https://shopee.vn/m/ma-giam-gia')); box.append(b);
      } else box.append(el('small', '', t));
    }
    if (clk.evUrl) { const m = el('button', 'hvm', `🎉 Trang ưu đãi ${clk.sale.name} của Shopee ›`); m.addEventListener('click', () => openDeal(clk.evUrl)); box.append(m); }
    return box;
  }
  function renderHotVoucher(L) {
    hotFresh();
    // 1.10.249: bỏ chế độ Săn live (anh Nhật)
    L.append(saleCalBox());
    L.append(hotVouchers(true));
    // 1.10.244: bỏ "Tìm mã theo nhu cầu" (không ra mã giảm)   // 1.10.183: gọn 2 hàng, bấm Xem thêm
    const mine = (walletMine && walletMine.list || []).map(v => ({ v, exp: walletExp(v) })).filter(x => !x.exp || x.exp > Date.now()).sort((a, b) => (a.exp || 9e15) - (b.exp || 9e15));
    const box = el('div', 'hotv'); box.append(el('div', 'hvh', '📒 Ví voucher của bạn'));
    if (!mine.length) box.append(el('small', '', 'Mở trang Ví voucher Shopee (đã đăng nhập) một lần, HaoHao ghi lại mã và hạn dùng để nhắc trước khi hết hạn.'));
    const k = n => n >= 1000 ? Math.round(n / 1000) + 'k' : String(n);
    const grid = el('div', 'hvg'); if (mine.length) box.append(grid);
    for (const { v, exp } of mine.slice(0, walletMore ? 20 : 4)) {   // 1.10.171: gọn 2 hàng, bấm Xem thêm mới hiện hết
      const left = exp ? exp - Date.now() : 0;
      const name = v.pct ? `Giảm ${v.pct}%${v.cap ? ' tối đa ' + k(v.cap) : ''}` : v.off ? `Giảm ${k(v.off)}` : (v.txt || 'Mã giảm giá').slice(0, 40);
      const when = !exp ? (v.until || '') : left < 864e5 ? `⏰ còn ${Math.max(1, Math.round(left / 3600e3))} giờ` : `HSD ${new Date(exp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
      const cd = el('div', 'hvc' + (exp && left < 36 * 3600e3 ? ' soon' : ''), name);
      const sm = el('small', '', [v.min ? 'Đơn từ ' + k(v.min) : '', when].filter(Boolean).join(' · ')); cd.append(sm);
      if (exp && left < 864e5) { const c = el('small', 'cdn'); c.dataset.exp = exp; c.dataset.pre = v.min ? 'Đơn từ ' + k(v.min) + ' · ' : ''; c.textContent = c.dataset.pre + cdTxt(exp - Date.now()); sm.replaceWith(c); }   // 1.10.173: đếm ngược mã còn dưới 24 giờ
      grid.append(cd);
    }
    if (mine.length > 4) { const m = el('button', 'hvm', walletMore ? 'Thu gọn ▴' : `Xem thêm ${mine.length - 4} mã ▾`); m.addEventListener('click', () => { walletMore = !walletMore; renderPanel(); }); box.append(m); }
    if (walletMore && mine.length > 20) box.append(el('small', '', `… và ${mine.length - 20} mã khác`));
    const row = el('div', 'hvr'), a = el('button', 'tt', '🎟️ Lưu từng mã ›'), c = el('button', '', vhRun && vhRun.key === 'hot' ? `⏳ Đang lưu… (${vhRun.saved || 0})` : '💾 Lưu toàn bộ ›');
    a.title = 'Mở trang Mã giảm giá Shopee, bạn tự chọn mã muốn lưu'; c.title = 'HaoHao mở 1 cửa sổ nhỏ, tự bấm Lưu các mã đáng giá nhất rồi cập nhật ví. Cần đăng nhập Shopee.'; c.disabled = !!vhRun;
    c.addEventListener('click', async () => { c.disabled = true; c.textContent = '⏳ Đang mở…'; const ck = codeClock(); const r = await chrome.runtime.sendMessage({ type: 'vh-hunt', hot: true, extra: ck.evUrl ? [ck.evUrl] : [] }).catch(() => null); if (r && r.ok === false && r.error !== 'busy') { c.disabled = false; c.textContent = '💾 Lưu toàn bộ ›'; } });
    a.addEventListener('click', () => openDeal('https://shopee.vn/m/ma-giam-gia'));
    row.append(el('span', '', walletMine ? `Cập nhật ${new Date(walletMine.at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}` : ''), a, c); box.append(row);
    { const hr = vhRes.hot; if (hr) box.append(el('small', '', hr.err ? (VH_ERR[hr.err] || 'Chưa lưu được, thử lại sau nhé.') : `✓ Đã lưu thêm ${hr.saved.length} mã${hr.have.length ? `, ${hr.have.length} mã bạn đã có sẵn` : ''}.`)); }
    { const u = el('button', 'hvm', '🔄 Cập nhật ví (đọc lại Ví voucher Shopee) ›'); u.addEventListener('click', () => openDeal('https://shopee.vn/user/voucher-wallet')); box.append(u); }
    // 1.10.246: bỏ khung "📒 Ví voucher của bạn" (mã đã có trong ví, không cần hiện)
    L.append(choBox());   // 1.10.177: chợ voucher xuống cuối, ví của bạn lên trên
  }
  // Ví voucher (khách tự mở, đã đăng nhập): đọc các mã + hạn dùng, lưu trong máy để nhắc
  async function readVoucherWallet() {
    if (!/(^|\.)shopee\.vn$/.test(location.hostname) || !/^\/user\/voucher-wallet/.test(location.pathname)) return;
    for (let t = 0; t < 8 && !voucherCards().length; t++) await wait(1000);
    const now = Date.now(), list = voucherCards().filter(c => !/hết hạn rồi|đã hết hạn|đã dùng/i.test(c.txt)).map(c => {
      const h = c.txt.match(/Còn\s+(\d+)\s*(giờ|ngày|phút)/i), exp = h ? now + +h[1] * { 'giờ': 3600e3, 'ngày': 864e5, 'phút': 6e4 }[h[2].toLowerCase()] : 0;
      return { txt: c.txt.slice(0, 120), pct: c.percent || 0, off: c.discount || 0, min: c.minOrder || 0, cap: c.maxDiscount || 0, until: c.until || (c.txt.match(/\d{1,2}[./]\d{1,2}[./]\d{4}/) || [''])[0], exp };
    });
    if (!list.length) return;
    walletMine = { at: now, list }; chrome.storage.local.set({ walletMine }).catch(() => {});
    const soon = list.filter(v => { const e = walletExp(v); return e && e - now < 36 * 3600e3; }).length;
    say(`HaoHao đã ghi ${list.length} mã trong ví của bạn${soon ? `, ${soon} mã sắp hết hạn` : ''}. Mã nào sắp hết hạn HaoHao sẽ nhắc nhé!`, 'happy', '📒 Ví voucher');
  }
  function spCard(noNote) {
    const url = HT.SP.showcase; if (!url) return null;
    const wrap = el('div', 'spwrap');
    const b = el('button', 'ttcard spcard'); b.setAttribute('aria-label', 'Mở cửa hàng HaoHao trên Shopee');
    let link = url; try { const u = new URL(url); link = u.hostname.replace(/^www\./, '') + u.pathname; } catch {}
    const tx = el('span', 'ttx'); tx.append(el('b', '', '🧡 HaoHao Store'));
    b.append(tx, el('span', 'tth', (HT.spName ? '@' + HT.spName : 'Shopee') + ' ›'));
    b.addEventListener('click', () => openDeal(url));
    wrap.append(b); if (!noNote) wrap.append(el('div', 'spaff', 'ⓘ Link tiếp thị · Giá không đổi'));
    return wrap;
  }

  function renderFind(V) {
    const sr = h(`<form class="row fbox" role="search"><input class="grow" placeholder="Tìm sản phẩm… (Enter)" aria-label="Tìm sản phẩm, bấm Enter" autocomplete="off"><button type="button" class="fb-ic sp" title="Tìm trên Shopee (mở tab mới)" aria-label="Tìm trên Shopee">🔍<b>Shopee</b></button></form>`);
    const si = sr.querySelector('input'); si.value = findQ;
    // 1.10.148: 2 nút kính lúp mở thẳng Shopee / TikTok Shop với từ khoá đang gõ (qua link tiếp thị)
    const kw = () => si.value.trim() || findQ || '';
    sr.querySelector('.fb-ic.sp').addEventListener('click', () => { const q = kw(); if (!q) return si.focus(); kwLog(q, 'hh'); openDeal('https://shopee.vn/search?keyword=' + encodeURIComponent(q)); });

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
    const fl = el('div', 'fchips'); fl.hidden = true;   // đã bỏ bộ lọc: tìm là mở thẳng Shopee
    FIND_RANGES.forEach(([k, lb]) => { const c = el('button', 'chip' + (findRange === k ? ' on' : ''), lb); c.setAttribute('aria-pressed', findRange === k);
      c.addEventListener('click', () => { findRange = findRange === k ? '' : k; if (findQ) doFind(findQ); else renderPanel(); }); fl.append(c); });
    const cm = el('button', 'chip' + (findMall ? ' on' : ''), '🏬 Mall'); cm.setAttribute('aria-pressed', findMall);
    cm.addEventListener('click', () => { findMall = !findMall; if (findQ) doFind(findQ); else renderPanel(); }); fl.append(cm);
    V.append(sr);
    // tìm gần đây
    if (findHist.length) {
      const hb = el('div', 'fhist'); hb.append(el('span', 'lb2', 'Gần đây:'));
      findHist.forEach(t => { const c = el('button', 'chip sm', t); c.addEventListener('click', () => doFind(t)); hb.append(c); });
      const x = el('button', 'fclr', '✕'); x.title = 'Xoá lịch sử tìm'; x.setAttribute('aria-label', 'Xoá lịch sử tìm');
      x.addEventListener('click', () => { findHist = []; chrome.storage.local.set({ shopHist: [] }).catch(() => {}); renderPanel(); }); hb.append(x);
      V.append(hb);
    }
    const L = el('div', 'body-list'), st = findState;
    if (spy && spyOn()) { spyList(L); V.append(L); return; }
    if (!spyOn()) L.append(spyKeyBox());
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
        L.append(el('div', 'fhead', `${st.options.length} lựa chọn cho “${st.q}”`));
        st.options.forEach(o => L.append(optRow(o, 0, true)));
        L.append(el('div', 'onote', `Lọc từ ${st.total} món: đã bỏ ${st.total - st.safe} shop rủi ro, kiểm tra kỹ các shop còn lại.`));
      }
      relatedPicks(L, st.q);
      const more = el('div', 'fmore');
      const a1 = el('button', 'chip', 'Xem tất cả trên Shopee ›'); a1.addEventListener('click', () => openDeal(HT.shopeeFindUrl(st.q, findRange)));
      const a2 = el('button', 'chip', 'Tìm trên TikTok Shop ›'); a2.addEventListener('click', () => openDeal(HT.SHOPS[1].search + encodeURIComponent(st.q)));
      more.append(a1, a2); L.append(more);
    }
    // chưa tìm gì: hiện 🔥 Deal hôm nay (kèm nút Cửa hàng) ngay dưới ô tìm
    const ds = !st && dealStrip();
    if (ds) L.prepend(ds);
    if (L.children.length) V.append(L);
    { const st = storeTiles(); if (st) V.append(st); }   // 2 ô cửa hàng Shopee + TikTok cạnh nhau, 1 dòng "Link tiếp thị" chung
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
  // ⚡ Đọc dữ liệu Shopee qua chính API của trang (cùng phiên đăng nhập) – không phải chờ Shopee vẽ giao diện
  async function shopeeApi(path, body, ms = 8000) {
    const csrf = (document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/) || [])[1] || '';
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch('https://shopee.vn/api/v4/' + path, { method: body ? 'POST' : 'GET', credentials: 'include', signal: ac.signal,
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf, 'X-Requested-With': 'XMLHttpRequest', 'X-API-SOURCE': 'pc', 'X-Shopee-Language': 'vi' },
        body: body ? JSON.stringify(body) : undefined });
      if (!r.ok) return null; const j = await r.json(); return j && !j.error ? j : null;
    } catch { return null; } finally { clearTimeout(tm); }
  }
  // 1 món từ API → dạng thẻ HaoHao (giá Shopee nhân 100000)
  function apiCard(x) {
    if (!x || !x.itemid || !x.shopid || !x.name) return null;
    const price = Math.round((x.price_min || x.price || 0) / 1e5); if (!price) return null;
    const ir = x.item_rating || {}, slug = x.name.replace(/[\s\/?#%\\]+/g, '-').replace(/-+/g, '-').slice(0, 90);
    return { key: x.shopid + '.' + x.itemid, shopid: String(x.shopid), url: 'https://shopee.vn/' + encodeURIComponent(slug) + '-i.' + x.shopid + '.' + x.itemid,
      image: x.image ? 'https://down-vn.img.susercontent.com/file/' + x.image : '', title: x.name, price,
      rating: ir.rating_star ? Math.round(ir.rating_star * 10) / 10 : null, ratingCount: (ir.rating_count && ir.rating_count[0]) ?? x.cmt_count ?? null,
      sold: x.historical_sold ?? x.sold ?? null, mall: !!(x.is_official_shop || x.is_mart), preferred: !!(x.shopee_verified || x.is_preferred_plus_seller),
      shopName: (x.shop_name || '').slice(0, 40), shopRating: x.shop_rating || null, loc: x.shop_location || '',
      overseas: /nước ngoài|quốc tế|trung quốc|china|overseas|hàn quốc|nhật bản/i.test(x.shop_location || ''), ad: !!x.adsid };
  }
  // 🔁 "Tìm sản phẩm tương tự" của Shopee (đúng nút trên thẻ sản phẩm)
  async function apiSimilar(shopid, itemid) {
    const j = await shopeeApi('recommend/recommend_post', { offset: 0, limit: 50, section: 'find_similar_product_sc_sec', bundle: 'find_similar_product_sc', itemid: +itemid, shopid: +shopid, item_card: 2 });
    const s = j && j.data && j.data.sections && j.data.sections[0];
    return s && s.data && Array.isArray(s.data.item) ? s.data.item.map(apiCard).filter(Boolean) : null;
  }
  async function apiSearch(q) {
    const j = await shopeeApi('search/search_items?by=relevancy&keyword=' + encodeURIComponent(q) + '&limit=60&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2');
    return j && Array.isArray(j.items) ? j.items.map(x => apiCard(x.item_basic || x)).filter(Boolean) : null;
  }
  // Lọc: rẻ hơn + đánh giá ổn + shop uy tín → chấm điểm như nút Kiểm tra
  function trustCheaper(list, p, self, myShop) {
    return list.filter(x => x.key !== self && x.shopid !== myShop && !x.ad && x.price < p.price * 0.99 && x.price >= p.price * 0.4)
      .filter(x => x.rating >= 4.6 && x.ratingCount >= 10 && !x.overseas && (x.mall || x.preferred || (x.shopRating >= 4.7 && x.ratingCount >= 30)))
      .map(x => {
        const ts = HT.trustScore({ rating: x.rating, ratingCount: x.ratingCount, sold: x.sold, mall: x.mall, preferred: x.preferred, shipFrom: x.loc, shopStar: x.shopRating ? Math.round(x.shopRating * 10) / 10 : null });
        const reasons = [...ts.product, ...ts.shop].sort((a, b) => ({ bad: 0, warn: 1, ok: 2 }[a.s] - { bad: 0, warn: 1, ok: 2 }[b.s])).slice(0, 6);
        return { ...x, score: ts.score, level: ts.level, cls: ts.cls, reasons, issues: [], full: false };
      }).filter(x => x.score >= 60);
  }
  const similarUrl = () => { const m = itemKey().match(/^(\d+)[./](\d+)$/); return m ? `https://shopee.vn/find_similar_products?itemid=${m[2]}&shopid=${m[1]}` : ''; };
  // thẻ sản phẩm: <li> nếu có; trang "Sản phẩm tương tự" dùng <a style="display:contents"> (cao 0) → lấy khung con bên trong
  const cardOf = a => { const li = a.closest('li'); if (li) return li; return !a.getBoundingClientRect().height && a.firstElementChild ? a.firstElementChild : a; };
  function readSearchCards() {
    const seen = new Set(), out = [];
    for (const a of document.querySelectorAll('a[href*="-i."]')) {
      const m = a.href.match(/-i\.(\d+)\.(\d+)/); if (!m) continue;
      const key = m[1] + '.' + m[2]; if (seen.has(key)) continue;
      const card = cardOf(a);
      const lines = (card.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
      const flat = lines.join(' ').replace(/Giảm\s*₫\s*[\d.,]+\s*k?/gi, ' ');
      const prices = [...flat.matchAll(/₫\s*([\d.]{3,})|([\d.]{4,})\s*₫/g)].map(x => HT.num(x[1] || x[2])).filter(n => n >= 1000);
      const title = lines.filter(l => l.length > 15 && !/₫|đã bán/i.test(l)).sort((x, y) => y.length - x.length)[0];
      if (!prices.length || !title) continue;
      seen.add(key);
      // "4.9" và "812 đã bán" có khi dính liền ("4.9812 đã bán") hoặc cùng dòng: tách riêng sao + lượt bán
      const glue = flat.match(/(?:^|\s)([1-5][.,]\d)\s*(\d[\d.,]*\s*k?\+?)\s*đã bán/i);
      const sold = glue ? HT.num(glue[2]) : HT.num((flat.match(/Đã bán\s*([\d.,]+\s*k?\+?)/i) || flat.match(/([\d.,]+\s*k?\+?)\s*đã bán/i) || [])[1]);
      const rt = lines.find(l => /^\d[.,]\d$/.test(l)) || (flat.match(/★\s*(\d[.,]\d)/) || [])[1] || (glue && glue[1]);
      const CLR = /^(?:[^\p{L}]*)(Xử lý|Xả kho|Thanh lý)(\s|$)/iu;
      out.push({ key, url: 'https://shopee.vn' + new URL(a.href).pathname, image: cardImg(card), title: title.replace(/^[^\p{L}]*((Xử lý|Xả kho|Thanh lý|Yêu thích\+?|Mall)\s*)+/iu, ''), price: Math.min(...prices),
        clear: lines.some(l => CLR.test(l)),
        sold: isNaN(sold) ? null : sold, rating: rt ? parseFloat(String(rt).replace(',', '.')) : null,
        mall: /(^|\s)Mall(\s|$)/.test(flat), preferred: /Yêu thích/i.test(flat), overseas: /nước ngoài|quốc tế/i.test(flat) });
    }
    return out;
  }
  // Chạy trong tab ẩn: đợi Shopee tải danh sách, cuộn cho tải thêm, rồi gửi kết quả về
  async function runScan() {
    const kw = new URLSearchParams(location.search).get('keyword');
    if (kw) {
      const list = await apiSearch(kw);
      if (list && list.length) return chrome.runtime.sendMessage({ type: 'scan-result', result: list.filter(x => !x.ad).slice(0, 60) }).catch(() => {});
    }
    const t0 = Date.now(); let last = -1, stable = 0, k = 0;
    while (Date.now() - t0 < 12000) {
      await wait(400); if (++k % 2 === 0) window.scrollBy(0, 1600);
      const n = readSearchCards().length;
      if (n >= 30) break;
      if (n > 0 && n === last) { if (++stable >= 3) break; } else stable = 0;
      last = n;
    }
    chrome.runtime.sendMessage({ type: 'scan-result', result: readSearchCards().slice(0, 60) }).catch(() => {});
  }
  // Chạy trong tab ẩn trên 1 trang sản phẩm: cuộn cho Shopee tải phần shop + đánh giá, đọc rồi gửi về
  async function runItemScan() {
    const t0 = Date.now(); let info = null;
    while (Date.now() - t0 < 7000) {
      await wait(500); window.scrollBy(0, 900);
      info = readShopee();
      if ((info.rating || info.ratingCount) && (info.responseRate != null || info.joinedMonths != null) && (info.dist || Date.now() - t0 > 3000)) break;
    }
    const lines = (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
    const oi = lines.findIndex(l => /^(Online|Đang hoạt động|Hoạt động)\b/i.test(l));
    let shopName = oi > 0 ? lines[oi - 1] : '';
    if (/^(Mall|Yêu thích\+?)$/i.test(shopName) && oi > 1) shopName = lines[oi - 2];
    const p = detectProduct();
    chrome.runtime.sendMessage({ type: 'scan-result', result: { info, shopName: (shopName || '').slice(0, 40), price: p && p.price, title: p && p.title, image: pageImg(), url: cleanUrl(location.href) } }).catch(() => {});
  }
  // Tab nền của "Cập nhật tất cả": chờ trang hiện giá rồi gửi về (tối đa 12 giây)
  async function runPriceScan() {
    const t0 = Date.now(); let p = null;
    while (Date.now() - t0 < 12000) { await wait(600); p = detectProduct(); if (p && p.price) break; }
    chrome.runtime.sendMessage({ type: 'scan-result', result: { price: p && p.price || 0, image: pageImg(), out: soldOutNow() } }).catch(() => {});
  }
  const isCmpPage = () => window.__hhSimPage === 'similar' || (/(^|\.)shopee\.vn$/.test(location.hostname) && /^\/(find_similar_products|search)/.test(location.pathname));
  let cmp = null, cmpTimer = null, posOverride = null;
  const cardEl = key => { const a = document.querySelector(`a[href*="-i.${key}"]`); return a ? cardOf(a) : null; };
  const CMP_C = { g: ['#1E9E6F', '#fff'], y: ['#F2B544', '#3A2A00'], r: ['#E0344B', '#fff'] };
  function cmpPaint(x) {
    const ce = cardEl(x.key); if (!ce) return;
    const [bg, fg] = CMP_C[x.c];
    ce.style.outline = `3px solid ${bg}`; ce.style.outlineOffset = '-3px'; ce.style.borderRadius = '4px';
    if (getComputedStyle(ce).position === 'static') ce.style.position = 'relative';
    let bd = ce.querySelector(':scope > .hh-cmp');
    if (!bd) { bd = document.createElement('div'); bd.className = 'hh-cmp'; ce.append(bd); }
    bd.style.cssText = `position:absolute;top:6px;left:6px;right:6px;z-index:5;pointer-events:none;display:flex;flex-wrap:wrap;gap:3px`;
    bd.innerHTML = '';
    const tag = (t, b, f) => { const s = document.createElement('span'); s.textContent = t; s.style.cssText = `background:${b};color:${f};font:700 11.5px/1.3 "Segoe UI",system-ui,sans-serif;padding:3px 7px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.25)`; bd.append(s); };
    if (x.top) tag('🏆 HaoHao chọn · tốt nhất', '#0E7A57', '#fff');
    tag(x.lb, bg, fg); if (x.same) tag('✓ Giống y', '#23305E', '#fff');
    if (x.brand) tag('✓ Cùng hãng ' + cmp.base.brand.toUpperCase(), '#23305E', '#fff');
    let tint = ce.querySelector(':scope > .hh-top');
    if (x.top) {
      ce.style.outline = '4px solid #0E7A57';
      if (!tint) { tint = document.createElement('div'); tint.className = 'hh-top'; ce.append(tint); }
      tint.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;background:rgba(30,158,111,.22);border-radius:4px';
    } else if (tint) tint.remove();
  }
  // 1 món HaoHao chọn (từ 1.9.40):
  //  ① cùng thương hiệu được ưu tiên trước hết  ② bắt buộc cùng loại hàng (không combo, không phụ kiện, không lệch nam/nữ…)
  //  ③ bỏ hàng xả kho / thanh lý và món rẻ bất thường (< 55% giá gốc)  ④ món gốc là Mall thì ưu tiên Mall
  //  ⑤ cùng hạng thì xếp theo giá trị: bán nhiều + sao cao + tiết kiệm nhiều, không chỉ lấy món rẻ nhất
  function cmpPickBest() {
    const b = cmp.base;
    const tier = x => (x.brand ? 4 : 0) + (x.same ? 2 : 0) + (b.mall && x.mall ? 1 : 0);
    const val = x => Math.log10(Math.max(1, x.sold || 0)) * 10 + (x.rating || 0) * 10 + (b.price - x.price) / b.price * 60;
    cmp.best = cmp.list.filter(x => x.c === 'g' && x.kind && !x.clear && !x.odd).sort((p, q) => tier(q) - tier(p) || val(q) - val(p));
    const best = cmp.best[0];
    // 💸 rẻ nhất và 🔥 bán chạy nhất: cùng loại, không xả kho, không rẻ bất thường, shop ổn (bán chạy: rẻ hơn hoặc ngang giá)
    const pool = cmp.list.filter(x => x.kind && !x.clear && !x.odd && x.good);
    // luôn 3 món KHÁC nhau: món nào đã có ở dòng trên thì lấy món kế tiếp
    const cheap = pool.filter(x => x !== best && x.price <= b.price * 0.97).sort((p, q) => p.price - q.price || (q.sold || 0) - (p.sold || 0))[0];
    const hot = pool.filter(x => x !== best && x !== cheap && x.price <= b.price * 1.03).sort((p, q) => (q.sold || 0) - (p.sold || 0) || (q.rating || 0) - (p.rating || 0) || p.price - q.price)[0];
    cmp.picks = [[best, '🏆 HaoHao chọn · tốt nhất'], [cheap, '💸 Rẻ nhất'], [hot, '🔥 Bán chạy nhất']].filter(r => r[0]);
    const sig = cmp.picks.map(r => r[0].key).join();
    if (sig !== cmp.sig) { cmp.sig = sig; if (ui) { const upd = cmp.shown; cmp.shown = true; cmpShow(upd); } }
    const old = cmp.list.find(x => x.top);
    if (old === best) return;
    if (old) { old.top = false; cmpPaint(old); }
    if (best) { best.top = true; cmpPaint(best); }
  }
  function cmpMark(cards) {
    const base = cmp.base;
    for (const x of cards) {
      if (cmp.seen.has(x.key)) continue;
      // shop ổn theo những gì thẻ sản phẩm hiện: ⭐ và lượt bán (Mall / Yêu thích được nới chút)
      const save = base.price - x.price, pct = save / base.price, rt = x.rating || 0, sd = x.sold == null ? -1 : x.sold, badge = x.mall || x.preferred;
      const weak = (rt && rt < 4.5) || (sd >= 0 && sd < 20) || (!rt && sd < 0);
      const good = !weak && ((rt >= 4.7 && sd >= 100) || (badge && rt >= 4.5 && sd >= 20));
      const ts = { score: Math.round(rt * 20 + Math.min(20, Math.log10(Math.max(1, sd)) * 4)) };
      if (pct >= 0.03 && good) { x.c = 'g'; x.lb = `🟢 Rẻ hơn ${kShort(save)}`; }
      else if (pct >= 0.03) { x.c = weak ? 'r' : 'y'; x.lb = weak ? `⚠ Rẻ ${kShort(save)} · ít người mua` : `🟡 Rẻ hơn ${kShort(save)} · shop tạm`; }
      else if (pct <= -0.03) { x.c = 'r'; x.lb = `🔴 Đắt hơn ${kShort(-save)}`; }
      else { x.c = weak ? 'r' : 'y'; x.lb = weak ? '⚠ Ngang giá · ít người mua' : '🟡 Ngang giá'; }
      x.good = good; x.score = ts.score; x.same = HT.sameProduct(base.title, x.title).same && x.price >= base.price * 0.5;
      x.kind = HT.sameKind(base.title, x.title); x.brand = x.kind && HT.hasBrand(x.title, base.brand); x.odd = x.price < base.price * 0.55;
      cmp.seen.set(x.key, x); cmp.list.push(x); cmpPaint(x);
    }
  }
  function hamsterTo(ce) {
    if (!ui || !ce) return;
    const r = ce.getBoundingClientRect();
    ui.wrap.style.transition = 'right .6s ease, bottom .6s ease';
    posOverride = { r: Math.max(8, innerWidth - r.right - 24), b: Math.max(8, innerHeight - r.bottom + 6) };
    placeWrap();
  }
  function hamsterHome() {
    if (!posOverride || !ui) return;
    posOverride = null; placeWrap(); setTimeout(() => { if (ui && !posOverride) ui.wrap.style.transition = ''; }, 700);
  }
  // 3 món (🏆 HaoHao chọn · 💸 Rẻ nhất · 🔥 Bán chạy nhất) → gộp món trùng, hiện trong tab 🔍 Rẻ hơn (không bong bóng)
  function cmpRows() {
    const rows = [], b = cmp.base;
    for (const [x, lb] of cmp.picks || []) { const r = rows.find(r => r.key === x.key); if (r) r.lb.push(lb.replace(' · tốt nhất', '')); else rows.push({ key: x.key, lb: [lb], title: x.title, url: x.url, price: x.price, save: b.price - x.price, rating: x.rating, sold: x.sold, mall: x.mall, preferred: x.preferred, brand: x.brand ? b.brand.toUpperCase() : '', same: x.same }); }
    return rows;
  }
  function cmpShow(upd) {
    if (!ui || !cmp) return;
    const res = { key: cmp.base.key, at: Date.now(), n: cmp.list.length, price: cmp.base.price, rows: cmpRows() };
    chrome.storage.local.set({ hhCmpResult: res }).catch(() => {});
    if (!upd) { shopSub = 'cheaper'; openTab('shop'); }
    else if (!ui.panel.hidden && tab === 'shop') renderPanel();
  }
  // Vẽ khung kết quả (dùng ở trang Sản phẩm tương tự và ở tab Rẻ hơn của trang sản phẩm)
  function c3Box(res, onPage) {
    const box = el('div', 'c3box');
    const fk = v => v == null ? '' : (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + 'k' : v) + ' đã bán';
    if (!res.rows.length) {
      box.append(el('div', 'c3h', '👍 Giá bạn đang xem đã tốt'), el('div', 'c3n', `HaoHao xem ${res.n} món: chưa có món nào cùng loại, rẻ hơn mà shop ổn.`));
      return box;
    }
    box.append(el('div', 'c3h', '🐹 HaoHao tìm ra rồi!'), el('div', 'c3n', `So với giá bạn thấy ${vnd(res.price)} · đã xem ${res.n} món` + (onPage ? ' · bấm tên để tìm thẻ trên trang' : '')));
    for (const x of res.rows) {
      const r = el('div', 'c3r' + (onPage ? ' go' : ''));
      r.append(el('div', 'c3l', x.lb.join(' · ')));
      const t = el('div', 'c3t', x.title.slice(0, 80)); t.title = x.title; r.append(t);
      const pr = el('div', 'c3p'), go = el('button', 'c3go', '🛒 Xem');
      go.title = 'Mở món này (link tiếp thị · giá không đổi)';
      go.addEventListener('click', e => { e.stopPropagation(); openDeal(x.url); });
      pr.append(el('b', '', vnd(x.price)), el('span', '', x.save >= 1000 ? `rẻ hơn ${kShort(x.save)}` : 'ngang giá'), go); r.append(pr);
      const meta = [x.rating ? '⭐' + x.rating : '', fk(x.sold), x.mall ? 'Mall' : x.preferred ? 'Yêu thích' : '', x.brand ? 'Cùng hãng ' + x.brand : x.same ? '✓ Giống y' : ''].filter(Boolean).join(' · ');
      if (meta) r.append(el('div', 'c3m', meta));
      if (onPage) r.addEventListener('click', () => { const ce = cardEl(x.key); if (ce) { ce.scrollIntoView({ behavior: 'smooth', block: 'center' }); ce.animate([{ filter: 'brightness(1.25)' }, { filter: 'none' }], { duration: 900, iterations: 2 }); } });
      box.append(r);
    }
    box.append(el('div', 'dln', 'ⓘ ' + HT.AFF_NOTE));
    return box;
  }
  async function compareRun() {
    if (!isCmpPage() || !ui) return;
    const { hhCompare: base } = await chrome.storage.local.get('hhCompare');
    if (!base || !base.price || Date.now() - base.at > 3600e3) return;
    const sp = new URLSearchParams(location.search), sim = window.__hhSimPage === 'similar' || /^\/find_similar_products/.test(location.pathname);
    if (sim ? (window.__hhSimPage !== 'similar' && base.key.split('.')[1] !== sp.get('itemid')) : (sp.get('keyword') || '') !== base.q) return;
    const href = location.href;
    let cards = [];
    for (let i = 0; i < 20; i++) { cards = readSearchCards().filter(x => x.key !== base.key); if (cards.length >= 4 || location.href !== href) break; await wait(800); }
    if (location.href !== href) return;
    if (!cards.length) return say('Chưa đọc được danh sách trên trang này. Kéo xuống một chút để Shopee tải sản phẩm nhé.', 'remind', '🔍 So giá', 'shop');
    cmp = { base: { ...base, brand: HT.brandOf(base.title) }, seen: new Map(), list: [], i: 0, best: [] };
    cmpMark(cards); cmpPickBest();   // tô màu từng món + nền xanh món 🏆, mở tab 🔍 Rẻ hơn hiện 3 món
    clearInterval(cmpTimer);
    cmpTimer = setInterval(() => { if (!cmp || location.href !== href) return clearInterval(cmpTimer); if (document.visibilityState === 'visible') { cmpMark(readSearchCards().filter(x => x.key !== base.key)); cmpPickBest(); } }, 2500);
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
    const q = HT.cleanTitle(p.title).split(' ').slice(0, 6).join(' ');
    const r = await askBg({ type: 'same-find', q, key: 'tt:' + itemKey(), title: p.title, price: p.price, image: pageImg() });
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
    const q = HT.cleanTitle(p.title).split(' ').slice(0, 6).join(' ');
    let r = null;
    const km = itemKey().match(/^(\d+)[./](\d+)$/);
    if (km) {
      // 1) đúng danh sách "Tìm sản phẩm tương tự" của Shopee; 2) không có thì tìm theo tên (chỉ giữ đúng cùng món)
      let list = await apiSimilar(km[1], km[2]), src = 'similar';
      if (!list || !list.length) { list = await apiSearch(q); src = 'search'; if (list) list = list.filter(x => HT.sameProduct(p.title, x.title).same); }
      if (list) {
        let ok = trustCheaper(list, p, km[1] + '.' + km[2], km[1]);
        // ảnh gần như y hệt → đánh dấu "Cùng mẫu", xếp lên trước
        const img = pageImg();
        if (img && ok.length) {
          const dist = await Promise.race([askBg({ type: 'img-dist', base: img, list: ok.slice(0, 30).map(x => x.image) }), new Promise(s => setTimeout(() => s(null), 4000))]);
          if (dist && Array.isArray(dist.d)) ok.slice(0, 30).forEach((x, i) => { if (dist.d[i] != null && dist.d[i] <= 12) x.sim = 0.95; });
        }
        if (src === 'search') ok.forEach(x => { x.sim = x.sim || HT.sameProduct(p.title, x.title).sim; });
        ok.forEach(x => { if (!x.sim) x.like = true; });
        const options = HT.pickOptions(ok), more = ok.filter(x => !options.some(o => o.key === x.key)).sort((a, b) => (b.sim ? 1 : 0) - (a.sim ? 1 : 0) || a.price - b.price).slice(0, 6).map(x => ({ ...x, tags: [] }));
        r = { ok: true, total: list.length, options, more, src };
      }
    }
    if (!r) r = await askBg({ type: 'same-find', q, key: itemKey(), title: p.title, price: p.price, image: pageImg() });
    sameState = { url: p.url, loading: false, error: r && r.ok ? '' : (r && r.error === 'slow' ? 'slow' : 'fail'), total: (r && r.total) || 0, options: (r && r.options) || [], more: (r && r.more) || [], src: r && r.src };
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
    else if (o.like) mid.append(el('div', 'osame like', '≈ Mẫu tương tự'));
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
  function renderCheaper(L, p) {
    if (isTikTokItem()) { renderCheaper0(L, p); renderShopeeBtn(L, p); }
    else renderCompareEntry(L, p);
    relatedPicks(L, p.title, HT.ttId(location.href));
  }
  // 🔍 Rẻ hơn (Shopee): khách bấm → mở trang "Sản phẩm tương tự" của Shopee, HaoHao tô màu từng món + hamster chỉ món tốt nhất
  const cmpQuery = p => HT.cleanTitle(p.title).split(' ').slice(0, 6).join(' ');
  async function startCompare(p, q) {
    const url = q ? HT.shopeeSearchUrl(q) : similarUrl();
    if (!url) return;
    let mall = false; try { mall = !isTikTokItem() && !!readShopee().mall; } catch {}
    await chrome.storage.local.set({ hhCompare: { key: itemKey().replace('/', '.'), title: p.title, price: p.price, mall, image: pageImg() || '', q: q || '', at: Date.now() } });
    openDeal(url);
  }
  function renderCompareEntry(L, p) {
    const slot = el('div', ''); L.append(slot);
    chrome.storage.local.get('hhCmpResult').then(({ hhCmpResult: r }) => {
      if (r && r.key === itemKey().replace('/', '.') && Date.now() - r.at < 6 * 3600e3) slot.append(c3Box(r, false));
    }).catch(() => {});
    const box = el('div', 'cmpbox');
    box.append(el('div', 'cmpt', '🔍 So giá với shop khác'));
    box.append(el('div', 'cmps', 'HaoHao mở trang "Sản phẩm tương tự" của Shopee rồi tô màu từng món. Hamster chỉ món rẻ mà shop ổn.'));
    const lg = el('div', 'cmplg'); lg.append(el('span', 'g', '🟢 Rẻ hơn, shop ổn'), el('span', 'y', '🟡 Ngang giá'), el('span', 'r', '🔴 Đắt hơn / shop đáng ngờ')); box.append(lg);
    const b = el('button', 'b cmpgo', '🔍 Tìm shop rẻ hơn'); b.addEventListener('click', () => startCompare(p)); box.append(b);
    const q = cmpQuery(p), b2 = el('button', 'chip', `Hoặc tìm theo tên “${q}” ›`); b2.title = 'Mở tìm kiếm Shopee, sắp giá thấp → cao'; b2.addEventListener('click', () => startCompare(p, q));
    const r = el('div', 'fmore'); r.append(b2); box.append(r);
    L.append(box);
  }
  // TikTok: tìm cùng món trên Shopee (mở trang tìm kiếm, HaoHao tô màu giống trên)
  function renderShopeeBtn(L, p) {
    L.append(el('div', 'fhead alt', '🟠 So với Shopee'));
    const b = el('button', 'chip', `🔍 Tìm “${cmpQuery(p)}” trên Shopee ›`); b.addEventListener('click', () => startCompare(p, cmpQuery(p)));
    const r = el('div', 'fmore'); r.append(b); L.append(r);
  }
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
    const simBtn = () => { const u = similarUrl(); if (!u) return null; const a = el('button', 'chip', 'Mở "Sản phẩm tương tự" ›'); a.addEventListener('click', () => openDeal(u)); const r = el('div', 'fmore'); r.append(a); return r; };
    if (!st.options.length) {
      L.append(el('div', 'optwait ok', st.src === 'similar' ? `👍 Trong ${st.total} sản phẩm tương tự, chưa có shop uy tín nào bán rẻ hơn ở đây.` : st.total ? `👍 Giá ở đây đang rẻ nhất trong ${st.total + 1} shop bán cùng món` : 'Chưa thấy shop khác bán đúng sản phẩm này (HaoHao bỏ qua món chỉ na ná).'));
      const sb = simBtn(); if (sb) L.append(sb); return;
    }
    st.options.forEach(o => L.append(optRow(o, p.price - o.price, st.src === 'similar')));
    if (st.more && st.more.length) {
      const mb = el('button', 'chip', `Xem thêm ${st.more.length} món rẻ hơn ›`), box = el('div', ''); box.hidden = true;
      st.more.forEach(o => box.append(optRow(o, p.price - o.price, st.src === 'similar')));
      mb.addEventListener('click', () => { box.hidden = !box.hidden; mb.textContent = box.hidden ? `Xem thêm ${st.more.length} món rẻ hơn ›` : 'Thu gọn ‹'; });
      const r = el('div', 'fmore'); r.append(mb); L.append(r, box);
    }
    L.append(el('div', 'onote', st.src === 'similar'
      ? `Lọc từ ${st.total} món "Tìm sản phẩm tương tự" của Shopee: chỉ giữ món rẻ hơn, từ 4.6★, đủ đánh giá, shop Mall/Yêu thích hoặc shop điểm cao. "✓ Cùng sản phẩm" = ảnh gần như y hệt. Giá chưa gồm mã giảm và phí ship.`
      : `So trong ${st.total + 1} shop bán đúng cùng sản phẩm (cùng hãng, mã, dung lượng, phiên bản). Giá chưa gồm mã giảm và phí ship.`));
    const sb = simBtn(); if (sb) L.append(sb);
  }

  // ---------- 🎟️ Mã giảm giá ----------
  let couponFeed = null, couponSeen = [];
  // 📣 tin chủ app gửi (coupons.json → news): hiện 1 lần bằng bong bóng HaoHao, không hiện trên trang mua bán (để bong bóng kiểm tra)
  // ⬆️ V1.1: có bản HaoHao mới → báo (bấm "Để sau" thì 1 ngày sau mới báo lại). Máy có app Transfer bản mới: bấm Cập nhật ngay là tự cài
  async function updBubble() {
    if (!ui || SHOP_SITE || (ui.panel && !ui.panel.hidden)) return;
    const r = await chrome.runtime.sendMessage({ type: 'upd-st' }).catch(() => null), u = r && r.info;
    if (!u || !u.avail) return;
    const { updSnooze = {} } = await chrome.storage.local.get('updSnooze'); if (updSnooze.v === u.version && Date.now() - updSnooze.at < 864e5) return;
    const later = { label: 'Để sau', ghost: true, fn: () => chrome.storage.local.set({ updSnooze: { v: u.version, at: Date.now() } }).catch(() => {}) };
    const dl = { label: '⬇️ Tải về', fn: () => window.open(u.url, '_blank') };
    const run = { label: '⚡ Cập nhật ngay', fn: async () => {
      say(`Đang tải và cài bản ${u.name}…`, 'think', '⬆️ Cập nhật HaoHao', 'tools');
      const x = await chrome.runtime.sendMessage({ type: 'upd-run' }).catch(() => null);
      if (x && x.ok) say(`Đã cài xong ${u.name}! HaoHao tự khởi động lại, bạn F5 trang là dùng bản mới.`, 'happy', '⬆️ Cập nhật HaoHao', 'tools', [{ label: 'OK', fn: () => {} }]);
      else say(`Chưa tự cài được${x && x.error ? ' (' + x.error + ')' : ''}. Bấm Tải về, giải nén đè vào thư mục HaoHao cũ rồi F5 trang nhé.`, 'think', '⬆️ Cập nhật HaoHao', 'tools', u.url ? [dl, later] : null);
    } };
    say(`🎉 HaoHao có bản mới ${u.name}${u.notes ? ': ' + u.notes : ''}. ${r.tf ? 'Bấm Cập nhật ngay, HaoHao tự cài.' : 'Tải về, giải nén đè vào thư mục HaoHao cũ rồi F5 trang.'}`, 'happy', '⬆️ Bản mới', 'tools', r.tf ? [run, later] : u.url ? [dl, later] : null);
  }
  async function newsBubble() {
    if (!ui || !couponFeed || !(couponFeed.news || []).length || SHOP_SITE || (ui.panel && !ui.panel.hidden)) return;
    const { newsSeen = [] } = await chrome.storage.local.get('newsSeen');
    const n = couponFeed.news.find(x => !newsSeen.includes(x.id) && (!x.until || new Date(x.until).getTime() > Date.now())); if (!n) return;
    await chrome.storage.local.set({ newsSeen: [...newsSeen, n.id].slice(-100) });
    say(n.text || n.title, 'happy', n.title, 'shop', n.url ? [{ label: n.btn || 'Xem ngay', fn: () => openDeal(n.url) }, { label: 'Để sau', ghost: true, fn: () => {} }] : null);
  }
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
    const i = t.search(/Mã Giảm Giá (?:Của )?Shop|Shop Vouchers?/i);
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
    if (viaHaoHao() || !HT.isAff(p.url) || (HT.STORE && !code)) return say(code ? `Đã copy mã ${code}. Dán ở bước thanh toán nhé.` : 'Bấm "Lưu" mã trên trang rồi đặt hàng nhé.', 'happy', '🎟️ Mã giảm giá', 'shop');
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
      return ((j.data || {}).ratings || []).map(x => ({ t: String(x.comment || '').replace(/\s+/g, ' ').trim(), star: +x.rating_star || 0, at: +x.ctime || 0, img: ((x.images || []).length + (x.videos || []).length) > 0,
        model: String(((x.product_items || [])[0] || {}).model_name || '').trim().slice(0, 40), all: type === 0, imgs: (x.images || []).slice(0, 2) }));
    };
    // song song: trang đầu của 1★, 2★, 3★, Tất cả cùng lúc; loại nào còn tiếp thì tải các trang sau cùng lúc
    const plan = [[1, 150], [2, 100], [3, 50], [0, 50]], out = [];   // 1.10.162: gọn hơn → ~1 giây
    const firsts = await Promise.all(plan.map(([t]) => get(t, 0)));
    const more = [];
    plan.forEach(([t, max], i) => { out.push(...firsts[i].filter(x => x.t || t === 0)); if (firsts[i].length >= 50) for (let off = 50; off < max; off += 50) more.push([t, off]); });
    const rest = await Promise.all(more.map(([t, off]) => get(t, off).catch(() => [])));
    rest.forEach(b => out.push(...b.filter(x => x.t)));
    return out;
  }
  // 📸 1.10.172: so ảnh khách chụp với ảnh shop đăng (máy chủ HaoHao + AI), mỗi món chấm 1 lần cho mọi máy
  const anhRes = new Map();
  const spImg = u => (String(u || '').match(/https:\/\/down-[a-z0-9-]+\.img\.susercontent\.com\/file\/[\w-]+/) || [])[0] || '';
  async function anhCompare(key, items) {
    if (anhRes.has(key) || !HT.PRICE_API) return; anhRes.set(key, { wait: true });
    const sk = srvKey(); if (!/^sp:/.test(sk)) return;
    const shop = [...new Set([spImg((document.querySelector('meta[property="og:image"]') || {}).content), ...[...document.querySelectorAll('img')].filter(i => !i.closest('#hattieu-host') && i.naturalWidth >= 300).map(i => spImg(i.currentSrc || i.src))].filter(Boolean))].slice(0, 3);
    // ảnh khách: ưu tiên đánh giá mới nhất, có cả ảnh từ đánh giá thấp sao
    const pick = [...items.filter(x => x.all), ...items.filter(x => !x.all)].flatMap(x => (x.imgs || []).slice(0, 1));
    const real = [...new Set(pick)].slice(0, 5).map(id => 'https://down-vn.img.susercontent.com/file/' + id);
    if (!shop.length || real.length < 2) { anhRes.set(key, { none: true }); return; }
    const r = await chrome.runtime.sendMessage({ type: 'anh-cmp', k: sk, shop, real }).catch(() => null);
    anhRes.set(key, r && r.ok ? r : { none: true });
    if (r && r.ok && itemKey() === key) analyzeShopee(false, true);
  }
  async function loadAllReviews() {
    if (!isShopeeItem() || settings.shopTrust === false) return;
    const key = itemKey(); if (fullRev.has(key)) return;
    fullRev.set(key, { state: 'loading', items: [] }); analyzeShopee(false, true);
    let items = null;
    const ck = 'rvApi:' + key, c = await chrome.storage.session.get([ck, 'rvApiBad']).catch(() => ({}));
    if (c[ck] && Date.now() - c[ck].at < 6 * 3600e3) items = c[ck].items;
    else if (!c.rvApiBad) {
      try { items = await reviewsViaApi(); } catch { items = null; }
      // Shopee chặn (lỗi/captcha) → thôi gọi trong phiên này, quay về đọc chữ trên trang
      if (!items || !items.length) chrome.storage.session.set({ rvApiBad: Date.now() }).catch(() => {});
      else chrome.storage.session.set({ [ck]: { at: Date.now(), items } }).catch(() => {});
    }
    fullRev.set(key, items && items.length ? { state: 'done', items } : { state: 'fail', items: [] });
    if (itemKey() === key) analyzeShopee(false, true);
    if (items && items.length) anhCompare(key, items);
  }
  // ---------- 🎟️ Đọc thẻ voucher trên trang mã giảm giá Shopee ----------
  // Không dựa vào tên class (Shopee hay đổi): tìm nút "Lưu" / "Dùng" / "Đã lưu", leo lên khung thẻ có chữ "Giảm" / "Freeship"
  const V_BTN = /^(lưu|lưu ngay|lưu mã|dùng|dùng ngay|dùng sau|đã lưu|sử dụng|nhận|nhận ngay|lấy mã|đã nhận)$/i;
  const V_TXT = /giảm|freeship|miễn phí vận chuyển|hoàn\s*(xu|tiền)/i;
  const vHash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'v' + (h >>> 0).toString(36); };
  function voucherCards() {
    const out = [], seen = new Set();
    for (const btn of document.querySelectorAll('button, a, [role="button"], div, span')) {
      if (btn.children.length > 2) continue;
      const bt = (btn.innerText || btn.textContent || '').trim(); if (!bt || bt.length > 12 || !V_BTN.test(bt)) continue;
      // lấy phần tử trong cùng (chính cái nút), bỏ khung bọc ngoài có cùng chữ
      if ([...btn.querySelectorAll('*')].some(x => (x.innerText || x.textContent || '').trim() === bt)) continue;
      let card = btn.parentElement, txt = '';
      for (let k = 0; k < 7 && card; k++) { txt = (card.innerText || card.textContent || '').replace(/\s+/g, ' ').trim(); if (V_TXT.test(txt) && txt.length > 14) break; card = card.parentElement; }
      if (!card || !V_TXT.test(txt) || txt.length > 420 || seen.has(card)) continue;
      seen.add(card);
      // bỏ chữ trên nút (Lưu / Đã lưu…) để mã giữ nguyên dù đã lưu hay chưa
      const bi = txt.lastIndexOf(bt), base = bi >= 0 ? txt.slice(0, bi) + ' ' + txt.slice(bi + bt.length) : txt;
      const core = base.replace(/(^|\s)(đã lưu|lưu ngay|lưu mã|lưu|dùng ngay|dùng sau|dùng|sử dụng)(?=\s|$)/gi, ' ').replace(/\s+/g, ' ').trim();
      const v = HT.parseVouchers(core)[0] || {};
      const kind = /freeship|miễn phí vận chuyển/i.test(core) ? 'ship' : /hoàn\s*(xu|tiền)/i.test(core) ? 'coin' : 'off';
      const until = ((core.match(/Còn\s+\d+\s*(?:giờ|ngày|phút)|(?:HSD|Hết hạn|Có hiệu lực (?:đến|tới))[:\s]*[\d/:.\s-]{3,16}/i) || [])[0] || '').trim().replace(/^Còn/i, '⏰ Còn');
      const coin = (core.match(/hoàn\s*(?:xu|tiền)?\s*(\d{1,2})\s*%/i) || [])[1];
      if (coin && !v.percent && !v.discount) v.percent = +coin;
      const cap = (core.match(/(?:giảm tối đa|tối đa)\s*₫?\s*([\d.,]+\s*k?)/i) || [])[1];
      out.push({ id: vHash(core.slice(0, 160)), kind, txt: core.slice(0, 140), ...v, maxDiscount: v.maxDiscount || (cap ? HT.num(cap) : undefined), until, saved: /^(đã lưu|dùng|dùng ngay|dùng sau|sử dụng)$/i.test(bt), btn });
    }
    return out;
  }
  const needsLogin = () => /\/buyer\/login|\/login/.test(location.pathname) || !!document.querySelector('input[type="password"]');
  // ---------- 🎟️ Săn mã (1.9.61): chạy trong cửa sổ nhỏ hiện rõ do khách bấm "Tìm mã tốt nhất" ----------
  const vhCaptcha = () => /^\/verify\//.test(location.pathname) || /captcha/i.test(location.pathname);
  const spLoggedOut = () => !!findText(/^Đăng Nhập$/i) && !!findText(/^Đăng Ký$/i);
  function vhBar(d) {
    let b = document.getElementById('hh-vh-bar');
    if (!b) {
      b = document.createElement('div'); b.id = 'hh-vh-bar';
      b.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:2147483647;background:#23305E;color:#fff;border-radius:14px;padding:10px 12px;font:600 13px/1.4 system-ui,Segoe UI,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);display:flex;gap:10px;align-items:center';
      const t = document.createElement('div'); t.style.flex = '1'; t.className = 't';
      const s = document.createElement('button'); s.textContent = '■ Dừng';
      s.style.cssText = 'border:0;border-radius:999px;padding:6px 12px;font:800 12px system-ui;background:#EC4A68;color:#fff;cursor:pointer';
      s.addEventListener('click', () => { chrome.runtime.sendMessage({ type: 'vh-stop' }).catch(() => {}); t.textContent = '🐹 Đã dừng.'; });
      b.append(document.createTextNode('🐹'), t, s); document.documentElement.append(b);
    }
    return txt => { b.querySelector('.t').textContent = `HaoHao đang săn mã · bước ${d.i}/${d.n} (${d.label}) · ${txt}`; };
  }
  async function runVoucherHunt(d) {
    const done = r => chrome.runtime.sendMessage({ type: 'scan-result', result: r }).catch(() => {});
    const say2 = vhBar(d), price = d.price;
    say2('đang mở trang…');
    for (let t = 0; t < 15000 && document.readyState !== 'complete'; t += 300) await wait(300);
    await wait(1800);
    if (vhCaptcha()) { say2('Shopee hỏi xác minh: bạn làm giúp rồi bấm "Tìm mã" lại nhé.'); return done({ err: 'captcha' }); }
    if (needsLogin() || spLoggedOut()) { say2('chưa đăng nhập Shopee: bạn đăng nhập trong cửa sổ này rồi bấm "Tìm mã" lại nhé.'); return done({ err: 'login' }); }
    if (d.kind === 'shop' && isShopeeItem()) {
      // mã của shop: rê chuột vào dải mã cạnh giá để Shopee mở bảng mã (có nút Lưu)
      say2('đang đọc mã của shop…');
      let mv = null;
      for (let t = 0; t < 8000 && !(mv = document.querySelector('.mini-voucher-with-popover, .mini-vouchers')); t += 400) { window.scrollBy(0, 250); await wait(400); }
      if (mv) {
        mv.scrollIntoView({ block: 'center' }); await wait(500);
        for (const ev of ['pointerover', 'mouseover', 'mouseenter', 'mousemove']) mv.dispatchEvent(new MouseEvent(ev, { bubbles: ev !== 'mouseenter', cancelable: true, view: window }));
        await wait(1600);
      }
      if (!voucherCards().some(c => c.kind === 'off') && d.shopId) {
        // không mở được bảng mã → sang trang shop (có dải mã kèm nút Lưu)
        try { if (sessionStorage.getItem('hh-vh-shop') !== d.shopId) { sessionStorage.setItem('hh-vh-shop', d.shopId); location.href = 'https://shopee.vn/shop/' + d.shopId; return; } } catch {}
        return done({ saved: [], have: [] });
      }
    } else {
      say2('đang tải danh sách mã…');
      for (let k = 0; k < 8; k++) { window.scrollBy(0, 700); await wait(650); }
      window.scrollTo(0, 0); await wait(600);
    }
    // chấm từng mã cho đơn giá món đang xem
    const PAY = /shopeepay|spaylater|thẻ tín dụng|ngân hàng|vnpay|zalopay|momo|ví điện tử|khách hàng mới|người dùng mới|lần đầu/i;
    const OUT = /hết lượt|đã hết|hết hạn|hết mã/i;
    const valOf = c => {
      if (c.minOrder && price < c.minOrder) return null;
      if (c.kind === 'ship') return c.maxDiscount || c.discount || 1;
      return HT.couponValue({ discount: c.discount, percent: c.percent, maxDiscount: c.maxDiscount }, price);
    };
    const item = c => ({ id: c.id, kind: c.kind, label: vLabel(c), min: c.minOrder || 0, v: valOf(c) || 0, until: c.until || '', src: d.kind, live: /live|video/i.test(c.txt) });
    const cards = voucherCards().filter(c => !OUT.test(c.txt) && !PAY.test(c.txt) && (d.kind !== 'shop' || c.kind === 'off'));
    const have = [], todo = [];
    const LIM = d.ship ? { off: 0, ship: 1, coin: 0 } : d.sale ? { off: 3, ship: 1, coin: 1 } : d.hot ? { off: 8, ship: 4, coin: 2 } : { off: d.kind === 'shop' ? 3 : 2, ship: 2, coin: 1 };   // 1.10.230: Freeship chỉ 1 mã/đơn
    for (const kind of ['off', 'ship', 'coin']) {
      const list = cards.filter(c => c.kind === kind && valOf(c)).sort((a, b) => valOf(b) - valOf(a)).slice(0, LIM[kind]);
      for (const c of list) (c.saved ? have : todo).push(c);
    }
    const saved = [];
    for (const c of todo) {
      say2(`đang lưu ${vLabel(c)}… (đã lưu ${d.savedSoFar + saved.length})`);
      try { c.btn.scrollIntoView({ block: 'center' }); } catch {}
      const card = c.btn.parentElement; const old = card && card.style.outline; if (card) card.style.outline = '3px solid #1E9E6F';
      await wait(500 + Math.random() * 500);
      c.btn.click();
      await wait(1300 + Math.random() * 600);
      if (card) card.style.outline = old || '';
      if (vhCaptcha()) return done({ err: 'captcha', saved: saved.map(item), have: have.map(item) });
      if (needsLogin()) return done({ err: 'login', saved: saved.map(item), have: have.map(item) });
      const bt = c.btn.isConnected ? (c.btn.innerText || '').trim() : '';
      const ok = /^(đã lưu|dùng|dùng ngay|dùng sau|sử dụng)$/i.test(bt) || voucherCards().some(x => x.id === c.id && x.saved);
      if (ok) saved.push(c);
    }
    say2(`xong bước này · lưu thêm ${saved.length} mã`);
    try { sessionStorage.removeItem('hh-vh-shop'); } catch {}
    done({ saved: saved.map(item), have: have.map(item) });
  }
  // 🏪 gom mã của shop ở trang sản phẩm người dùng tự mở → mục "Mã của shop bạn vừa xem" trong tab Voucher
  function shopNameOnPage() {
    const lines = (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
    const oi = lines.findIndex(l => /^(Online|Đang hoạt động|Hoạt động)\b/i.test(l));
    let n = oi > 0 ? lines[oi - 1] : '';
    if (/^(Mall|Yêu thích\+?)$/i.test(n) && oi > 1) n = lines[oi - 2];
    return (n || '').slice(0, 40);
  }

  // tab ẩn: đọc danh sách voucher rồi gửi về

  // Chạy trong tab ẩn: bấm lọc 1★, 2★, 3★ (và Tất Cả) rồi lật từng trang đánh giá
  async function runReviewScan() {
    const out = [];
    const T0 = Date.now();
    for (let t0 = Date.now(); Date.now() - t0 < 12000 && !/ĐÁNH GIÁ SẢN PHẨM|PRODUCT RATINGS/i.test(document.body.innerText); ) { window.scrollBy(0, 1400); await wait(400); }
    // chờ phần đánh giá đổi nội dung (bấm lọc / sang trang) – tối đa ms, kiểm tra mỗi 100ms
    const revSig = () => { const t = document.body.innerText || ''; const i = t.search(/ĐÁNH GIÁ SẢN PHẨM|PRODUCT RATINGS/i); return i < 0 ? '' : t.slice(i, i + 1500); };
    const waitChange = async (before, ms) => { for (let t = 0; t < ms; t += 100) { await wait(100); if (revSig() !== before) { await wait(150); return; } } };
    const readPage = star => {
      const lines = (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean);
      const ri = lines.findIndex(l => /^(ĐÁNH GIÁ SẢN PHẨM|PRODUCT RATINGS)$/i.test(l));
      if (ri >= 0) for (const t of reviewTexts(lines.slice(ri + 1))) out.push({ t, star });
    };
    // nút sang trang: nút số ngay sau trang đang chọn, hoặc nút mũi tên phải trong phần đánh giá
    const nextBtn = () => {
      const head = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^(ĐÁNH GIÁ SẢN PHẨM|PRODUCT RATINGS)$/i.test((e.textContent || '').trim()));
      const btns = [...document.querySelectorAll('button')].filter(b => !head || (head.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
      const cur = btns.find(b => /^\d+$/.test(b.textContent.trim()) && (/active|solid|current|primary/i.test(b.className) || b.getAttribute('aria-current')));
      if (cur) { const nx = btns.find(b => b.textContent.trim() === String(+cur.textContent.trim() + 1)); if (nx) return nx; }
      return btns.find(b => /(right|next)/i.test(b.className + ' ' + (b.getAttribute('aria-label') || '')) && !b.disabled) || null;
    };
    for (const [n, pages] of [[1, 15], [2, 15], [3, 5], [0, 2]]) {
      if (Date.now() - T0 > 25000) break;   // đủ dùng rồi: trả kết quả, không bắt người dùng chờ
      const c = n ? findChip(new RegExp('^' + n + ' Sao\\s*\\((?!0\\))', 'i')) : findChip(/^(Tất Cả|All)$/i);
      if (!c) continue;
      let s0 = revSig(); c.click(); await waitChange(s0, 1500);
      let last = '';
      for (let pg = 0; pg < pages && Date.now() - T0 < 25000; pg++) {
        readPage(n || 0);
        const b = nextBtn(); if (!b) break;
        const sig = out.length + ':' + (out[out.length - 1] || {}).t;
        s0 = revSig(); b.click(); await waitChange(s0, 1200);
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
      if (/^(CÓ THỂ BẠN CŨNG THÍCH|SẢN PHẨM KHÁC CỦA SHOP|TOP SẢN PHẨM|SẢN PHẨM TƯƠNG TỰ|Xem tất cả|You may also like|More from this shop|Sản phẩm khác|Khám phá thêm sản phẩm|Bạn cũng có thể thích|FROM THE SAME SHOP|YOU MAY ALSO LIKE)/i.test(l)) break;
      if (l.length < 4 || l.length > 400) continue;
      if (/^[\d\s›‹<>«»…./|-]+$/.test(l)) continue;
      if (/₫|^Do .{2,40} bán$|^(Mua ngay|Thêm vào giỏ|Phí vận chuyển|Số lượng|Kích cỡ|Màu sắc|Tải ứng dụng|Đăng nhập|Xu Hướng)/i.test(l)) continue;   // chữ của phần mua hàng (TikTok)
      if (/Đã xác minh mua hàng|\*\*|^(Xem thêm|Ảnh từ đánh giá|Xem tất cả ảnh|Sắp xếp theo|Lọc theo|Đề xuất|Có ảnh\/video|Đặt lại bộ lọc|Đang hiển thị)/i.test(l)) continue;             // thanh chuyển trang "1 2 3 … ›"
      if (/\||\d{4}-\d{2}-\d{2}|^Phân loại|Sao\s*\(|^Tất Cả$|Có Bình Luận|Có Hình Ảnh|Trong Nước|Hữu ích|^\d[.,]?\d*\s*(trên 5)?$|^\d+$|trên 5|Phản Hồi Của Người Bán|Stars?\s*\(|^All$|With Comments|With Media|Local Review|Helpful|out of 5|Seller'?s Response|^Variation|^Report( Abuse)?$/i.test(l)) continue;   // 1.10.223: Shopee tiếng Anh
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
      const ri = lines.findIndex(l => /^(ĐÁNH GIÁ SẢN PHẨM|PRODUCT RATINGS)$/i.test(l));
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
    const head = t.match(new RegExp('(\\d[.,]\\d)[\\s★☆]+' + NUMK + '\\s*(?:Đánh Giá|Ratings?)', 'i'));
    if (head) { info.rating = parseFloat(head[1].replace(',', '.')); info.ratingCount = HT.num(head[2]); }
    info.sold = HT.num(m(new RegExp('Đã Bán\\s*' + NUMK, 'i')) || m(new RegExp(NUMK + '\\s*Sold\\b', 'i')) || m(new RegExp('Sold\\s*' + NUMK, 'i')));   // 1.10.215: Shopee giao diện tiếng Anh
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
    for (const x of t.matchAll(/([1-5]) (?:Sao|Stars?)\s*\(([\d.,]+\s*(?:k|tr)?)\)/gi)) { dist[x[1]] = HT.num(x[2]); dn++; }
    if (dn >= 3) info.dist = dist;
    info.photos = HT.num(m(/(?:Có Hình Ảnh\s*\/\s*Video|With Media)\s*\(([\d.,]+\s*(?:k|tr)?)\)/i));
    const avg = m(/(\d[.,]\d)\s*(?:trên|out of)\s*5/i); if (avg && !info.rating) info.rating = parseFloat(avg.replace(',', '.'));
    if (!info.ratingCount && info.dist) info.ratingCount = Object.values(dist).reduce((a, b) => a + b, 0);
    Object.assign(info, readShopStats(t));
    // chi tiết sản phẩm: "Gửi từ" → dòng sau
    const gi = lines.findIndex(l => /^Gửi từ$/i.test(l));
    info.shipFrom = gi >= 0 ? lines[gi + 1] : (m(/Gửi từ\s*(Nước ngoài|[A-ZĐ][\p{L}. ]{2,25}?)(?=\s[A-ZĐ][\p{L}]+\s|$)/iu) || '');
    if (info.shipFrom && info.shipFrom.length > 30) info.shipFrom = '';
    // phần đánh giá: đọc từng câu đánh giá (bỏ tên người, ngày, "Chất liệu: …", nút lọc…)
    const ri = lines.findIndex(l => /^(ĐÁNH GIÁ SẢN PHẨM|PRODUCT RATINGS)$/i.test(l));
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
      info.reviews = HT.reviewIssues(fr.items.filter(x => x.t).map(x => ({ t: x.t, low: x.star > 0 && x.star <= 2 })));
      Object.assign(info, HT.reviewDeep(fr.items));
      info.fullRead = { read: info.reviews.read, low: fr.items.filter(x => x.star > 0 && x.star <= 2).length, expect: info.dist ? (info.dist[1] || 0) + (info.dist[2] || 0) : 0 };
      info.fullRead.lowLabel = info.fullRead.expect && info.fullRead.low < info.fullRead.expect * 0.95 ? `${info.fullRead.low}/${info.fullRead.expect}` : `toàn bộ ${info.fullRead.low}`;
      info.goodReview = HT.goodReview(fr.items.filter(x => x.t && (x.star === 5 || x.star === 0)).map(x => x.t)) || info.goodReview;
      info.reviewsNormal = null; info.reviewsLoaded = true;
    } else if (fr && fr.state === 'loading') info.reviewsReading = true;
    { const a = anhRes.get(itemKey()); if (a && a.muc && a.muc !== 'khong_ro') info.anh = a; }
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
      // không tự dò shop rẻ hơn / không đọc đánh giá ngầm: chỉ đọc những gì đang hiện trên trang
      setTimeout(loadDealData, 1500);
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
    if (!HT.STORE && !viaHaoHao() && HT.isAff(url)) {   // V1.56 bản Store: xem kiểm tra không gắn link tiếp thị
      try { sessionStorage.setItem('hh-aff', itemKey()); sessionStorage.setItem('hh-open', itemKey() + '|' + sub); } catch {}
      markJump(sub);
      return goAff(url);
    }
    ui.bubble.hidden = true; shopSub = sub; openTab('shop');
  }

  // ---------- 💰 Giá tốt nhất + 🐹 hamster chỉ đường (chỉ ĐỌC chữ Shopee đang hiện, khách tự bấm) ----------
  let deal = null;   // { key, detail, vouchers, res }
  const dealOf = () => (deal && deal.key === itemKey() ? deal : (deal = { key: itemKey(), detail: null, vouchers: null, res: null }));
  const pageKind = () => window.__hhSimPage || (!/(^|\.)shopee\.vn$/.test(location.hostname) ? '' : /^\/cart/.test(location.pathname) ? 'cart' : /^\/checkout/.test(location.pathname) ? 'checkout' : isShopeeItem() ? 'item' : '');
  function readDeal() {
    if (!isShopeeItem()) return null;
    const D = dealOf(), t = document.body.innerText || '';
    if (D.main) { D.detail = { base: D.main.base, total: D.main.total, shopee: D.main.shopee }; D.vouchers = D.main.vouchers; }
    else {
      const det = HT.parsePriceDetail(t); if (det) D.detail = det;
      const vs = HT.parseShopVouchers(t); if (vs.length) D.vouchers = vs;
    }
    if (!D.detail && !document.querySelector('.mini-vouchers') && !/Giá Sau Voucher/i.test(t)) D.noVoucher = true;
    D.res = D.detail && D.vouchers ? HT.bestDeal({ base: D.detail.base, vouchers: D.vouchers, shopee: D.detail.shopee, total: D.detail.total }) : null;
    return D;
  }
  // lấy dữ liệu giá + mã mà trang Shopee đã nạp sẵn (shopee-main.js đọc trong trang, không gửi gì lên Shopee)
  function askPage() {
    return new Promise(res => {
      const id = Math.random().toString(36).slice(2);
      const on = e => { if (e.source !== window || !e.data || e.data.hh !== 'deal-res' || e.data.id !== id) return; window.removeEventListener('message', on); res(e.data.data); };
      window.addEventListener('message', on);
      window.postMessage({ hh: 'deal-req', id }, location.origin);
      setTimeout(() => { window.removeEventListener('message', on); res(null); }, 1500);
    });
  }
  async function loadDealData(n = 0) {
    if (!isShopeeItem()) return;
    const D = dealOf(); if (D.main || D.asking) return;
    D.asking = true; const r = await askPage().catch(() => null); D.asking = false;
    if (dealOf() !== D) return;
    if (r && r.base > 0 && r.total > 0) {
      D.main = r; readDeal(); logPrice().catch(() => {});
      if (ui && ui.panel.hidden && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
      if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel();
    } else if (n < 4) setTimeout(() => loadDealData(n + 1), 2000);
  }
  // dòng kết quả ngắn gọn: giảm được bao nhiêu + bước làm
  // 📱 app: tự áp mã shop tốt nhất + freeship + mã Shopee tốt nhất của từng người → giá HaoHao tính là mức "≈ hoặc rẻ hơn"
  // 💻 web: Shopee chỉ áp mã dùng được trên web (đúng số "Giá Sau Voucher" trên trang), thường tính phí ship, phải tự chọn Shopee Voucher
  // 🚚 phí ship Shopee ghi trên trang sản phẩm ("Phí ship 16.500₫" / "Phí ship 0₫"); không đọc được → null
  function shipFee() {
    const t = document.body.innerText || '', m = t.match(/Phí (?:ship|vận chuyển)\s*:?\s*(?:₫\s*)?(\d[\d.,]*\s*k?)\s*₫?/i);
    if (m) return HT.money(m[1]);
    return /Miễn phí vận chuyển|Freeship/i.test(t.slice(0, 6000)) ? 0 : null;
  }
  // ⚡ 1.10.169: Flash Sale SẮP diễn ra trên trang sản phẩm Shopee ("Bắt đầu lúc 21:00, Hôm nay" / "Sắp diễn ra" + giá flash) → "3 tiếng nữa giảm thêm 30k, đợi không?"
  function upcomingFlash() {
    if (!isShopeeItem() || flashSale()) return null;
    const t = (document.body.innerText || '').slice(0, 12000).replace(/\s+/g, ' ');
    const i = t.search(/flash ?sale/i); if (i < 0) return null;
    const seg = t.slice(i, i + 260);
    if (!/bắt đầu|sắp diễn ra|sắp mở bán|starts?/i.test(seg)) return null;
    const tm = seg.match(/(\d{1,2})[:h](\d{2})/); if (!tm) return null;
    const now = new Date(), at = new Date(now); at.setHours(+tm[1], +tm[2], 0, 0);
    const dm = seg.slice(tm.index, tm.index + 40).match(/(\d{1,2})\s*(?:\/|-|tháng|th)\s*(\d{1,2})/i);
    if (/ngày mai/i.test(seg)) at.setDate(at.getDate() + 1);
    else if (dm) { at.setMonth(+dm[2] - 1, +dm[1]); if (at < now - 864e5) at.setFullYear(at.getFullYear() + 1); }
    else if (at < now) at.setDate(at.getDate() + 1);
    if (at - now < 0 || at - now > 3 * 864e5) return null;
    const pm = seg.match(/₫\s*([\d.]{4,})|([\d.]{4,})\s*₫/), price = pm ? HT.num(pm[1] || pm[2]) : 0;
    return { at: at.getTime(), price: price >= 1000 ? price : 0 };
  }
  function flashHook(p) {
    const f = upcomingFlash(); if (!f) return null;
    const left = f.at - Date.now(), hrs = left < 3600e3 ? `${Math.max(1, Math.round(left / 6e4))} phút` : `${Math.round(left / 3600e3)} tiếng`;
    const save = f.price && p && p.price ? p.price - f.price : 0;
    const b = el('button', 'tb-hook hot');
    b.append(el('b', '', save >= 1000 ? `⚡ ${hrs} nữa Flash Sale giảm thêm ${kShort(save)}, đợi không?` : `⚡ ${hrs} nữa món này Flash Sale`),
      el('span', '', `${new Date(f.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${f.price ? ' · còn ' + vnd(f.price) : ''} · bấm để HaoHao nhắc trước 5 phút`));
    b.addEventListener('click', async e => {
      e.stopPropagation();
      await chrome.runtime.sendMessage({ type: 'fs-remind', at: f.at, url: cleanUrl(location.href), title: (p && p.title || document.title).slice(0, 70), price: f.price }).catch(() => {});
      b.querySelector('span').textContent = '🔔 Đã hẹn · HaoHao nhắc bạn trước 5 phút';
    });
    return b;
  }
  const flashSale = () => !!findText(/^FLASH ?SALE$/i) || /KẾT THÚC TRONG/i.test((document.body.innerText || '').slice(0, 8000));
  // 1.10.229: giá app – mã Voucher Shopee hằng ngày trên app (≈15%, tối đa 60k) web không thấy được → ước tính; khách gõ giá app thật thì dùng số đó
  let appManual = {};
  chrome.storage.local.get('appPriceMap').then(d => { appManual = d.appPriceMap || {}; }).catch(() => {});
  const appEst = a => Math.min(Math.round(a * 0.15), 60000);
  // V1.81 (20/10): gửi giá "Mua trên app" đang hiện về kho giá (khoá ap:sp:…) → web HaoHao Store hiện đúng con số này, sửa cách tính ở đây là web đổi theo
  const appSent = new Set();
  const appLog = v => { try { const sk = srvKey(); v = Math.round(Number(v) || 0); if (!sk || v < 1000 || appSent.has(sk + v)) return; appSent.add(sk + v); chrome.runtime.sendMessage({ type: 'price-log', item: { k: 'ap:' + sk, p: v } }).catch(() => {}); } catch {} };
  const appMan = () => { const x = appManual[itemKey()]; return x && Date.now() - x.at < 3 * 864e5 ? x.v : 0; };
  function appPriceInput() {
    const wrap = el('div', 'dtip'), b = el('button', 'dtog', '✏️ Nhập giá app thật'); wrap.append(b);
    b.addEventListener('click', e => {
      e.stopPropagation(); b.remove();
      const inp = document.createElement('input'); inp.type = 'number'; inp.placeholder = 'vd 166600'; inp.value = appMan() || '';
      inp.style.cssText = 'width:110px;padding:3px 6px;border:1px solid #F6D58A;border-radius:8px;font:700 12px system-ui';
      const ok = el('button', 'dtog', 'Lưu'); ok.style.marginLeft = '6px';
      const save = () => { const v = Math.round(+inp.value || 0); if (v > 0) appManual[itemKey()] = { v, at: Date.now() }; else delete appManual[itemKey()]; chrome.storage.local.set({ appPriceMap: appManual }).catch(() => {}); showTrustBubble(); };
      ok.addEventListener('click', ev => { ev.stopPropagation(); save(); }); inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') save(); });
      inp.addEventListener('click', ev => ev.stopPropagation());
      wrap.append(inp, ok); inp.focus();
    });
    return wrap;
  }
  function dealPrices(D) {
    const r = D.res, web = (D.main && D.main.total) || (D.detail && D.detail.total) || r.current;
    const fs = flashSale();   // 1.10.159: Flash Sale – mã shop hay không áp, chỉ tính mã trong ví (nếu có)
    let app = fs ? web : r.best.final, wv = null;
    const a = fs ? web : r.base - r.best.shopOff, w = walletAppBest(a);
    if (w && a - w.v < app) { app = a - w.v; wv = w; }
    const ship = shipFee(), webAll = web + (ship || 0);   // 1.10.154: giá về tay trên web = giá sau mã + phí ship
    let est = false, man = appMan();
    if (man) app = man; else if (!wv && a - appEst(a) < app) { app = a - appEst(a); est = true; }
    return { app, web, ship, webAll, v: r.best.v, wv, est, man: !!man, appBetter: app < webAll - 1000 };
  }
  function dealLines(D) {
    const P = dealPrices(D), out = [];
    if (P.appBetter) {
      out.push(['dcb', `📱 Mua trên app Shopee: ≈ ${vnd(P.app)} hoặc rẻ hơn`]);
      for (const x of dealDetail(D, 'app')) out.push(['dcd', x]);
      out.push(['dcw', `💻 Trên web: ≈ ${vnd(P.web)} + phí ship`]);
      for (const x of dealDetail(D, 'web')) out.push(['dcd', x]);
      out.push(['dcs', webTip()]);
    } else {
      out.push(['dcb', `💰 Giá tốt: ≈ ${vnd(P.web)} + phí ship`]);
      out.push(['dcs', webTip()]);
    }
    if (D.main && D.main.varies) out.push(['dcn', `Tính cho phân loại ${D.main.model || 'đang hiện'}; màu/size khác có giá khác (${vnd(D.main.minModel)} – ${vnd(D.main.maxModel)})`]);
    return out;
  }
  const buyBtn = () => findText(/^(Mua Với Voucher|Buy With Voucher)/i) || findText(/^(Mua Ngay|Mua ngay|Buy Now)/i);
  const buyLabel = () => (findText(/^Mua Với Voucher/i) ? 'Mua Với Voucher' : findText(/^Buy With Voucher/i) ? 'Buy With Voucher' : findText(/^Buy Now/i) ? 'Buy Now' : 'Mua ngay');
  // chi tiết từng khoản giảm (đúng thứ tự Shopee tính: mã shop trước, Voucher Shopee % sau)
  function dealDetail(D, kind) {
    // ghi đúng thứ tự Shopee tính: giá gốc → giảm giá sản phẩm → mã shop → Voucher Shopee % → ship
    const r = D.res, sp = D.detail && D.detail.shopee, base = r.base;
    const before = (D.main && D.main.before) || (D.detail && D.detail.orig) || 0, prodOff = before > base ? before - base : 0;
    const spOff = a => !sp || (sp.min && a < sp.min) ? 0 : Math.round(sp.pct ? Math.min(a * sp.pct / 100, sp.cap || Infinity) : (sp.off || 0));
    let spName = sp ? (sp.pct ? `Voucher Shopee ${sp.pct}%` : 'Voucher Shopee') : 'Voucher Shopee';
    const out = [];
    if (prodOff) out.push(`Giá gốc: ${vnd(before)}`, `− Giảm giá sản phẩm: −${vnd(prodOff)}`);
    else out.push(`Giá sản phẩm: ${vnd(base)}`);
    let shopOff, shopName, s2;
    if (kind === 'app') { const b = r.best, wv = dealPrices(D).wv; shopOff = b.shopOff; s2 = wv ? wv.v : b.spOff; if (wv) spName = `Mã trong ví (chỉ trên app) ${String(wv.g || (wv.pct ? 'Giảm ' + wv.pct + '%' : '')).replace(/Giảm tối đa/i, 'tối đa')}`; shopName = b.v ? `Mã shop ${b.v.label}${b.v.min ? ` (đơn từ ${kk(b.v.min)})` : ''}` : ''; }
    else { shopOff = (D.main && D.main.shopOff) || (D.detail && D.detail.shopOff) || 0; s2 = spOff(base - shopOff); shopName = 'Mã shop dùng được trên web'; }
    if (shopOff) out.push(`− ${shopName}: −${vnd(shopOff)}`);
    if (shopOff || prodOff) out.push(`= Tạm tính: ${vnd(base - shopOff)}`);
    if (s2) out.push(`− ${spName}: −${vnd(s2)}`);
    const save = prodOff + shopOff + s2;
    if (kind === 'app') {
      out.push('Ship: thường miễn phí (mã freeship trên app)');
      if (save > 0) out.push(`Tiết kiệm ≈ ${vnd(save)} so với giá gốc (chưa kể ship được miễn)`);
      out.push('App có thể có thêm mã riêng của bạn nên còn rẻ hơn');
    } else {
      out.push('+ Phí ship tính ở trang thanh toán');
      if (save > 0) out.push(`Tiết kiệm ≈ ${vnd(save)} so với giá gốc`);
    }
    return out;
  }

  const webTip = () => `💡 Bấm "${buyLabel()}" để Shopee áp sẵn mã. Nếu vào giỏ hàng: bấm "Chọn Voucher khác" ở dòng Shopee Voucher → Đồng ý`;
  function dealBlock(D) {
    const P = dealPrices(D), box = el('div', 'dblk');
    // mỗi cách mua: giá + nút + gợi ý + "Chi tiết giá" riêng
    const row = (icon, label, price, sub, btn, tip, kind) => {
      const w = el('div', 'dwrap'), r = el('div', 'drow'), l = el('div', 'dl');
      l.append(el('span', 'dlb', `${icon} ${label}`), el('b', '', `≈ ${vnd(price)}`), el('small', '', sub)); r.append(l); if (btn) r.append(btn);
      const det = el('div', 'ddet'); det.hidden = true;
      for (const x of dealDetail(D, kind)) det.append(el('div', 'dcd', x));
      if (kind === 'web' && D.main && D.main.varies) det.append(el('div', 'dcn', `Tính cho phân loại ${D.main.model || 'đang hiện'}; màu/size khác có giá khác (${vnd(D.main.minModel)} – ${vnd(D.main.maxModel)})`));
      const lb = '💡 Xem cách tính giá chi tiết ▾';
      const tg = el('button', 'dtog', lb); tg.addEventListener('click', e => { e.stopPropagation(); det.hidden = !det.hidden; tg.textContent = det.hidden ? lb : 'Thu gọn ▴'; });
      w.append(r); box.append(w);   // 1.10.231: bỏ gợi ý + "Xem cách tính giá chi tiết" cho gọn
    };
    if (P.appBetter) {
      const a = el('button', 'b dbtn', P.webAll - P.app >= 1000 ? `📱 Mở app rẻ hơn ${kShort(P.webAll - P.app)}` : '📱 Mở trên app'); a.addEventListener('click', e => { e.stopPropagation(); qrShow(); });
      row('📱', 'Mua trên app', P.app, P.man ? 'giá app bạn đã xem' : 'có mã vận chuyển · ship giảm', a, '', 'app'); appLog(P.app);
    }
    let w = null;
    w = el('button', 'b dbtn', '🎟️ Tìm voucher'); w.title = 'Săn 1 mã Freeship tốt nhất cho đơn này (ngày sale: thêm mã đợt sale)'; w.addEventListener('click', async e => { e.stopPropagation(); const pp = detectProduct(); if (!pp || !pp.price) return goCheck('voucher'); w.disabled = true; w.textContent = '⏳ Đang tìm mã…'; const saleNow = ((HT.saleDays(new Date(), 1)[0] || {}).days === 0), ck = saleNow ? codeClock() : null; const r = await chrome.runtime.sendMessage({ type: 'vh-hunt', url: cleanUrl(location.href), price: pp.price, key: itemKey(), ship: true, sale: saleNow, extra: ck && ck.evUrl ? [ck.evUrl] : [] }).catch(() => null); if (!r || !r.ok) { w.disabled = false; w.textContent = '🎟️ Tìm voucher'; if (r && r.error === 'busy') say('HaoHao đang tìm mã ở cửa sổ khác, đợi xíu nhé!', 'think', '🎟️ Voucher', 'shop'); } });   // 1.10.228: bấm là tự lưu mã rồi tính lại giá   // 1.10.218: thay nút Mua trên web qua HaoHao
    row('💻', 'Mua trên web', P.webAll, P.ship == null ? '+ phí ship' : P.ship ? `đã gồm ship ${kShort(P.ship)}` : 'miễn phí ship', w, `💡 Bấm "${buyLabel()}" để áp sẵn mã`, 'web');
    // 1.10.164: mã QR mở app hiện sẵn ngay trong khung (quét luôn, không phải bấm) · bấm để phóng to
    // 1.10.212: luôn có dòng 'Mua trên app' giống 'Mua trên web' (giá + nút mở app hiện mã QR)
    if (!P.appBetter) {
      const a2 = el('button', 'b dbtn', '📱 Mở trên app'); a2.title = 'Hiện mã QR to, mở Camera điện thoại quét'; a2.addEventListener('click', e => { e.stopPropagation(); qrShow(); });
      // 1.10.213: tự tính giá app khi đã đọc được mã riêng của app; chưa có thì chỉ cách để HaoHao tự tính
      const known = walletApp && Date.now() - walletApp.at <= 4 * 864e5;
      appLog(Math.min(P.app || P.webAll, P.webAll));
      row('📱', 'Mua trên app', Math.min(P.app || P.webAll, P.webAll), 'có mã vận chuyển · ship giảm', a2,
        known ? '💡 Quét mã QR bằng Camera điện thoại để mở đúng món' : '💡 Vào giỏ → bấm "Chọn Voucher" 1 lần, HaoHao tự tính giá app rẻ hơn', 'app');
    }
    return box;
  }
  // 1.10.216: chưa đọc được bảng giá chi tiết → khung gọn theo giá đang hiện, cùng kiểu với dealBlock
  function liteDeal(p) {
    const box = el('div', 'dblk'), ship = shipFee();
    const row = (icon, label, price, sub, btn, tip) => {
      const w = el('div', 'dwrap'), r = el('div', 'drow'), l = el('div', 'dl');
      l.append(el('span', 'dlb', `${icon} ${label}`), el('b', '', `≈ ${vnd(price)}`), el('small', '', sub)); r.append(l); if (btn) r.append(btn);
      w.append(r); box.append(w);   // 1.10.231: gọn, không gợi ý
    };
    let w = null;
    w = el('button', 'b dbtn', '🎟️ Tìm voucher'); w.title = 'Săn 1 mã Freeship tốt nhất cho đơn này (ngày sale: thêm mã đợt sale)'; w.addEventListener('click', async e => { e.stopPropagation(); const pp = detectProduct(); if (!pp || !pp.price) return goCheck('voucher'); w.disabled = true; w.textContent = '⏳ Đang tìm mã…'; const saleNow = ((HT.saleDays(new Date(), 1)[0] || {}).days === 0), ck = saleNow ? codeClock() : null; const r = await chrome.runtime.sendMessage({ type: 'vh-hunt', url: cleanUrl(location.href), price: pp.price, key: itemKey(), ship: true, sale: saleNow, extra: ck && ck.evUrl ? [ck.evUrl] : [] }).catch(() => null); if (!r || !r.ok) { w.disabled = false; w.textContent = '🎟️ Tìm voucher'; if (r && r.error === 'busy') say('HaoHao đang tìm mã ở cửa sổ khác, đợi xíu nhé!', 'think', '🎟️ Voucher', 'shop'); } });   // 1.10.228: bấm là tự lưu mã rồi tính lại giá   // 1.10.218: thay nút Mua trên web qua HaoHao
    const fs = flashSale(), pv = fs ? [] : pageVouchers(), rr = pv.length ? HT.bestDeal({ base: p.price, vouchers: pv }) : null;   // 1.10.227: tự áp mã shop đọc được trên trang
    const webP = rr && rr.best.v ? rr.best.final : p.price, webSub = fs ? 'Flash Sale · mã shop không áp' : rr && rr.best.v ? `đã trừ mã shop −${kShort(rr.best.shopOff)}` : 'chưa có mã áp được';
    // (giá web trừ thêm Voucher Shopee trong ví khách, nếu đọc được)
    const wwb = walletWebBest(webP);
    row('💻', 'Mua trên web', webP - (wwb ? wwb.v : 0) + (ship || 0), (ship == null ? '+ phí ship' : ship ? `gồm ship ${kShort(ship)}` : 'miễn ship'), w, `💡 Bấm "${buyLabel()}" để áp sẵn mã`);
    const a = el('button', 'b dbtn', '📱 Mở trên app'); a.title = 'Hiện mã QR to, mở Camera điện thoại quét'; a.addEventListener('click', e => { e.stopPropagation(); qrShow(); });
    const ww = walletWebBest(webP), wa0 = walletAppBest(webP), wa = wa0 && (!ww || wa0.v > ww.v) ? wa0 : ww;   // 1.10.228: app dùng được cả mã web lẫn mã chỉ-app
    const man = appMan(), offA = wa ? wa.v : appEst(webP);
    appLog(man || webP - offA);
    row('📱', 'Mua trên app', man || webP - offA, man ? 'giá app bạn đã xem' : 'có mã vận chuyển · ship giảm', a,
      '');
    return box;
  }
  // 📱 mã QR mở đúng món trên app Shopee (qua link tiếp thị) – 1.10.191: tách riêng, món nào (cả Flash Sale) cũng có
  function appQr(cheaper) {
    // 1.10.193: thu gọn thành nút nhỏ · bấm mới mở mã QR to (khung QR nhỏ quét không được)
    const q = el('button', 'b dbtn ghost', cheaper ? `📱 Mở app rẻ hơn ${kShort(cheaper)} · hiện mã QR` : '📱 Mở trên app Shopee · hiện mã QR');
    q.style.cssText = 'display:block;width:100%;margin-top:6px';
    q.title = 'Bấm để hiện mã QR to, mở Camera điện thoại quét'; q.addEventListener('click', e => { e.stopPropagation(); qrShow(); });
    return q;
  }

  // 🎟️ mã shop khách CHƯA lưu mà dùng được cho món này → "Lưu mã X để giảm thêm Yk" (giảm thật, không cần API mã)
  function saveHook(D) {
    const r = D && D.res, v = r && r.best && r.best.v; if (!v || v.saved || v.out) return null;
    if (flashSale() || !((HT.saleDays(new Date(), 1)[0] || {}).days === 0)) return null;   // 1.10.159: chỉ ngày sale
    const web = (D.main && D.main.total) || (D.detail && D.detail.total) || r.current || 0, extra = web - r.best.final;
    if (!(extra >= 1000)) return null;
    const unsaved = (D.vouchers || []).filter(x => !x.saved && !x.out && (!x.min || r.base >= x.min)).length;
    const b = el('button', 'tb-hook hot');
    b.append(el('b', '', `🎟️ Lưu ${unsaved > 1 ? unsaved + ' mã' : 'mã ' + v.label} để giảm thêm ${kShort(extra)}`), el('span', '', 'Mã của shop bạn chưa lưu · HaoHao lưu giúp'));
    b.addEventListener('click', e => { e.stopPropagation(); goCheck('voucher'); });
    return b;
  }
  // ➕ Thêm Xk là dùng được mã: mã shop có đơn tối thiểu cao hơn giá món một chút mà đáng giá
  // 1.10.232: ➕ ưu đãi MUA NHIỀU – HaoHao tự đọc trên trang (Combo Khuyến Mãi "Mua 2 giảm 5%", mã shop có đơn tối thiểu, Mua Kèm Deal Sốc), tự chọn cái lời nhất rồi gợi ý
  function comboOffers() {
    const t = (document.body.innerText || '').replace(/\s+/g, ' '), out = [];
    for (const m of t.matchAll(/Mua\s*(\d+)\s*(?:&|và|sản phẩm)?\s*(?:được\s*)?giảm\s*(\d{1,2})\s*%/gi)) out.push({ n: +m[1], pct: +m[2] });
    for (const m of t.matchAll(/Mua\s*(\d+)\s*(?:&|và|sản phẩm)?\s*(?:được\s*)?giảm\s*₫\s*([\d.,]+\s*k?)/gi)) out.push({ n: +m[1], off: HT.money(m[2]) });
    for (const m of t.matchAll(/Buy\s*(\d+)\s*(?:&|and)?\s*(?:get\s*)?(\d{1,2})\s*%\s*off/gi)) out.push({ n: +m[1], pct: +m[2] });
    return out.filter(x => x.n >= 2 && x.n <= 3 && (x.pct > 0 || x.off > 0));   // 1.10.233: tối đa mua 3 cái
  }
  function moreHook(price, D) {
    if (!(price > 0)) return null;
    const k1 = n => kShort(Math.round(n / 1000) * 1000);
    let fill = null, combo = null;
    // mã shop có đơn tối thiểu (Flash Sale: mã shop thường không áp → bỏ)
    if (!flashSale()) for (const v of ((D && D.vouchers) || pageVouchers())) {
      if (v.out || !v.min || v.min <= price) continue;
      const need = v.min - price, val = v.pct ? Math.min(Math.round(v.min * v.pct / 100), v.cap || Infinity) : (v.off || 0);
      if (!(val >= 5000) || val < need * 0.7 || need > Math.max(30000, price * 0.3)) continue;
      if (!fill || need - val < fill.need - fill.val) fill = { need, val };
    }
    for (const c of comboOffers()) {
      const tot = c.n * price, save = c.pct ? Math.round(tot * c.pct / 100) : c.off; if (!(save > 0)) continue;
      if (!combo || save / c.n > combo.save / combo.n) combo = { ...c, save, unit: (tot - save) / c.n };
    }
    // 1.10.235: hiện tối đa 3 ưu đãi, lời nhất trước
    const items = [];
    const fillItem = () => fill && [`✅ Thêm món ~${k1(fill.need)} cùng shop → giảm ${k1(fill.val)}`, fill.val >= fill.need ? 'có thêm món mà gần như không tốn thêm' : `chỉ tốn thêm ${k1(fill.need - fill.val)}`];
    if (fill && fill.need - fill.val <= 5000) items.push(fillItem());
    if (combo) items.push([`✅ Mua ${combo.n} ${combo.pct ? 'giảm ' + combo.pct + '%' : 'giảm ' + k1(combo.off)} → còn ${k1(combo.unit)}/cái`, 'Combo Khuyến Mãi của shop']);
    if (fill && fill.need - fill.val > 5000) items.push(fillItem());
    if (/Mua Kèm Deal Sốc/i.test(document.body.innerText || '')) items.push(['✅ Có Mua Kèm Deal Sốc', 'món mua kèm được giá sốc · xem ngay dưới giá']);
    if (!items.length) return null;
    const box = el('div', 'tb-more');
    for (const [h, sb] of items.slice(0, 3)) { const b = el('div', 'tb-hook ok'); b.append(el('b', '', h), el('span', '', sb)); box.append(b); }
    return box;
  }
  function needMoreHook(D) {
    const r = D && D.res; if (!r || !D.vouchers) return null;
    let best = null;
    for (const v of D.vouchers) {
      if (v.out || !v.min || v.min <= r.base) continue;
      const need = v.min - r.base; if (need > Math.max(30000, r.base * 0.3)) continue;
      const val = v.pct ? Math.min(Math.round(v.min * v.pct / 100), v.cap || Infinity) : v.off;
      if (!(val >= 5000) || val < need * 0.4) continue;
      if (!best || val - need * 0.4 > best.val - best.need * 0.4) best = { v, need, val };
    }
    if (!best) return null;
    const b = el('div', 'tb-hook ok');
    b.append(el('b', '', `✅ Thêm ${kShort(best.need)} nữa là dùng được mã ${best.v.label}`), el('span', '', `Giảm ${kShort(best.val)} · tăng số lượng hoặc mua thêm món nhỏ cùng shop`));
    return b;
  }
  // 🎵 So với TikTok Shop (chỉ khi có khoá soi sản phẩm): cùng món mà TikTok rẻ hơn → báo, bấm mở (qua link @haohaomall nếu có)
  const ttCmp = new Map();
  function ttCompare(p) {
    // 1.10.163: hỏi máy chủ HaoHao (mọi máy đều dùng được, không cần khoá RioHub) + 2 mức: cùng món / món giống
    const key = itemKey(); if (!p || !p.price || ttCmp.has(key) || !HT.PRICE_API || !isShopeeItem()) return;
    ttCmp.set(key, { loading: true });
    chrome.runtime.sendMessage({ type: 'tt-cmp', q: cmpQuery(p) }).then(r => {
      const ok = x => x.price > p.price * 0.4 && x.price <= p.price * 0.92 && p.price - x.price >= 5000;
      const all = ((r && r.items) || []).filter(ok).map(x => ({ ...x, url: `https://www.tiktok.com/view/product/${x.id}`, m: HT.sameProduct(p.title, x.title) }));
      const same = all.filter(x => x.m.same).sort((a, b) => a.price - b.price)[0];
      // món giống: cùng loại hàng, tên khá giống, có người mua thật
      const like = all.filter(x => !x.m.same && x.m.sim >= 0.55 && !/loại|thương hiệu|phụ kiện|dung lượng|số lượng|phiên bản/.test(x.m.why) && (x.sold >= 20 || x.rating >= 4.5)).sort((a, b) => a.price - b.price)[0];
      const best = same ? { ...same, like: false } : like ? { ...like, like: true } : null;
      ttCmp.set(key, { best });
      if (list[0] && ui && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
    }).catch(() => ttCmp.set(key, {}));
  }
  function ttHook(p) {
    const st = ttCmp.get(itemKey()), x = st && st.best; if (!x) return null;
    const b = el('button', 'tb-hook hot');
    b.append(el('b', '', x.like ? `🎵 TikTok có món giống, rẻ hơn ${kShort(p.price - x.price)}` : `🎵 TikTok bán rẻ hơn ${kShort(p.price - x.price)}`),
      el('span', '', `${x.shop || 'TikTok Shop'} · ${vnd(x.price)}${x.sold ? ' · đã bán ' + (x.sold >= 1000 ? (x.sold / 1000).toFixed(1).replace('.0', '').replace('.', ',') + 'k' : x.sold) : ''}`));
    b.title = x.title || '';
    b.addEventListener('click', e => { e.stopPropagation(); openDeal(x.url); });
    return b;
  }
  // 📏 Gợi ý size theo cân nặng / chiều cao khách tự nhập (lưu trong máy)
  const sizeRowsNow = () => { try { const t = document.body.innerText || '', a = HT.sizeTable(t); return a.length ? a : HT.sizeRows(t); } catch { return []; } };
  // 📏 1.10.157: tự kéo tới "Hướng Dẫn Chọn Size" của Shopee để trang tải bảng size rồi đọc; nhớ theo từng món
  const sizeCache = new Map(); let sizeUi = { key: '', open: false, busy: false, res: null, msg: '' };
  const hasSizeOpt = () => !!(findText(/^(Size|SIZE|Kích cỡ|Kích Cỡ|Kích thước|Size\s*\/\s*Kích cỡ)$/) || findText(/^Hướng dẫn chọn size$/i));
  async function loadSizeGuide() {
    const key = itemKey(); if (sizeCache.has(key) && sizeCache.get(key).length) return sizeCache.get(key);
    let rows = sizeRowsNow();
    if (!rows.length) {
      const y0 = window.scrollY, H = () => document.body.scrollHeight;
      for (let k = 0; k < 14 && !rows.length; k++) {
        const head = findText(/^Hướng Dẫn Chọn Size$/);
        if (head) { head.scrollIntoView({ block: 'center' }); await wait(900); rows = sizeRowsNow(); if (rows.length) break; }
        window.scrollBy(0, Math.round(innerHeight * 0.9)); await wait(450); rows = sizeRowsNow();
        if (window.scrollY + innerHeight >= H() - 5) break;
      }
      if (!rows.length) window.scrollTo({ top: y0 });
    }
    sizeCache.set(key, rows); return rows;
  }
  function sizeVerdict(rows) {
    const b = settings.body || {}, r = HT.pickSize2(rows, b.kg, b.cm); if (!r) return null;
    const rg = x => [x.hLo ? `${x.hLo}–${x.hHi}cm` : '', `${x.lo}–${x.hi}kg`].filter(Boolean).join(' · ');
    if (!r.ok) return { size: r.size, text: `📏 Ngoài bảng size, gần nhất: ${r.size} (${rg(r.row)})` };
    if (r.alt && r.alt !== r.size) return { size: r.size, alt: r.alt, text: `📏 Size ${r.size} hoặc ${r.alt}: ${r.why}. Thích rộng chọn size lớn hơn` };
    return { size: r.size, text: `📏 Size hợp với bạn: ${r.size} (${rg(r.row)})` };
  }
  // chọn giúp ô size trên trang Shopee (khách vẫn tự bấm Mua)
  function pickSizeOnPage(size) {
    const b = [...document.querySelectorAll('button')].find(x => !x.closest('#hattieu-host') && (x.innerText || '').trim().toUpperCase() === size && !x.disabled && x.getAttribute('aria-disabled') !== 'true');
    if (b) { b.click(); b.scrollIntoView({ block: 'center' }); return true; } return false;
  }
  async function runSize() {
    sizeUi = { ...sizeUi, key: itemKey(), busy: true, msg: '' }; refreshSizeUi();
    const rows = await loadSizeGuide(), v = rows.length ? sizeVerdict(rows) : null;
    sizeUi = { ...sizeUi, busy: false, res: v, msg: rows.length ? '' : 'Shop chưa có bảng size HaoHao đọc được (có thể là ảnh).' };
    refreshSizeUi();
  }
  function refreshSizeUi() {
    if (ui && ui.bubble.dataset.kind === 'trust' && !ui.bubble.hidden) showTrustBubble();
    if (ui && tab === 'shop' && !ui.panel.hidden) renderPanel();
  }
  // khối gọn trong bong bóng: nút "📏 Gợi ý size" → (chưa có số đo) ô kg/cm → kết quả + nút chọn size trên trang
  function sizeBubbleRow() {
    if (!isShopeeItem() || !hasSizeOpt()) return null;
    if (sizeUi.key !== itemKey()) sizeUi = { key: itemKey(), open: false, busy: false, res: null, msg: '' };
    const b = settings.body || {}, box = el('div', 'szq');
    if (sizeUi.busy) { box.append(el('span', 'szq-t', '📏 Đang đọc bảng size của shop…')); return box; }
    if (sizeUi.res || sizeUi.msg) {
      box.append(el('span', 'szq-t', sizeUi.res ? sizeUi.res.text : '📏 ' + sizeUi.msg));
      const acts = el('span', 'szq-a');
      if (sizeUi.res) [sizeUi.res.size, sizeUi.res.alt].filter(Boolean).forEach(z => { const c = el('button', 'chip sm on', 'Chọn ' + z); c.addEventListener('click', e => { e.stopPropagation(); if (!pickSizeOnPage(z)) c.textContent = 'Hết ' + z; }); acts.append(c); });
      const ed = el('button', 'chip sm', `✎ ${b.kg || '?'}kg${b.cm ? ' · ' + b.cm + 'cm' : ''}`); ed.title = 'Đổi số đo';
      ed.addEventListener('click', e => { e.stopPropagation(); sizeUi.open = true; sizeUi.res = null; sizeUi.msg = ''; refreshSizeUi(); }); acts.append(ed);
      box.append(acts); return box;
    }
    if (!sizeUi.open && b.kg > 0) { const go = el('button', 'szq-go', '📏 Gợi ý size cho bạn ›'); go.addEventListener('click', e => { e.stopPropagation(); runSize(); }); box.append(go); return box; }
    if (!sizeUi.open) { const go = el('button', 'szq-go', '📏 Gợi ý size ›'); go.addEventListener('click', e => { e.stopPropagation(); sizeUi.open = true; refreshSizeUi(); }); box.append(go); return box; }
    const f = el('div', 'szf');
    const kg = document.createElement('input'); kg.inputMode = 'decimal'; kg.placeholder = 'kg'; kg.value = b.kg || ''; kg.setAttribute('aria-label', 'Cân nặng (kg)');
    const cm = document.createElement('input'); cm.inputMode = 'numeric'; cm.placeholder = 'cm'; cm.value = b.cm || ''; cm.setAttribute('aria-label', 'Chiều cao (cm)');
    const ok = el('button', 'chip sm on', 'Chọn size');
    const save = async e => { e && e.stopPropagation(); const k = parseFloat(String(kg.value).replace(',', '.')) || 0; if (!k) return kg.focus(); settings.body = { kg: k, cm: parseInt(cm.value) || 0 }; await chrome.storage.local.set({ settings }).catch(() => {}); sizeUi.open = false; runSize(); };
    [kg, cm].forEach(i => { i.addEventListener('click', e => e.stopPropagation()); i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') save(); }); });
    ok.addEventListener('click', save);
    f.append(el('span', '', '📏'), kg, el('span', '', 'kg'), cm, el('span', '', 'cm'), ok); box.append(f);
    setTimeout(() => kg.focus(), 50);
    return box;
  }
  function sizeLine() {
    const b = settings.body || {}; if (!(b.kg > 0)) return null;
    const pick = HT.pickSize(sizeRowsNow(), b.kg, b.cm); if (!pick) return null;
    const r = pick.row, rg = `${r.lo}–${r.hi}kg` + (r.hLo ? ` · ${r.hLo}–${r.hHi}cm` : '');
    return { text: pick.exact ? `📏 Size hợp với bạn: ${r.size} (${rg})` : `📏 Gần nhất: ${r.size} (${rg}) – cân nặng bạn nằm ngoài bảng size`, exact: pick.exact };
  }
  function sizeBox() {
    if (!isShopeeItem() && !isTikTokItem()) return null;
    const rows = sizeRowsNow(), b = settings.body || {}, box = el('div', 'szb');
    box.append(el('b', '', '📏 Gợi ý size'));
    const f = el('div', 'szf');
    const kg = document.createElement('input'); kg.inputMode = 'decimal'; kg.placeholder = 'kg'; kg.value = b.kg || ''; kg.setAttribute('aria-label', 'Cân nặng (kg)');
    const cm = document.createElement('input'); cm.inputMode = 'numeric'; cm.placeholder = 'cm'; cm.value = b.cm || ''; cm.setAttribute('aria-label', 'Chiều cao (cm)');
    [kg, cm].forEach(i => i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') sv.click(); }));
    const sv = el('button', 'chip sm on', 'Lưu');
    sv.addEventListener('click', async () => { settings.body = { kg: parseFloat(String(kg.value).replace(',', '.')) || 0, cm: parseInt(cm.value) || 0 }; await chrome.storage.local.set({ settings }).catch(() => {}); renderPanel(); });
    f.append(el('span', '', 'Cân nặng'), kg, el('span', '', 'Cao'), cm, sv); box.append(f);
    const sl = sizeLine();
    box.append(el('div', 'szr', sl ? sl.text : rows.length ? 'Nhập cân nặng (và chiều cao) để HaoHao chọn size giúp.' : 'Shop chưa ghi bảng size bằng chữ trong mô tả (có thể là ảnh), HaoHao chưa đọc được.'));
    return box;
  }
  function dealButtons(D, cls) {
    const row = el('div', 'dbtns'), P = dealPrices(D);
    if (P.appBetter) { const a = el('button', 'b ' + cls, '📱 Mở trên app'); a.addEventListener('click', e => { e.stopPropagation(); qrShow(); }); row.append(a); }
    return row;
  }
  // 📱 mã QR mở đúng món này trên app (qua link tiếp thị, giá không đổi)
  function qrShow() {
    ui.root.querySelectorAll('.qrbox').forEach(x => x.remove());
    const url = HT.isAff(trustTarget()) ? HT.aff(trustTarget()) : trustTarget();
    const box = el('div', 'qrbox'), card = el('div', 'qrc');
    card.append(el('div', 'qrt', '📱 Mở món này trên app Shopee'));
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); const im = document.createElement('img'); im.src = q.createDataURL(5, 2); im.alt = 'Mã QR mở sản phẩm'; card.append(im); } catch { card.append(el('div', 'qrs', url)); }
    card.append(el('div', 'qrs', 'Mở Camera điện thoại quét mã → app Shopee mở đúng món này. App tự áp mã shop, freeship và mã Shopee tốt nhất của bạn.'));
    card.append(el('div', 'qrn', 'ⓘ Link tiếp thị HaoHao · Giá không đổi'));
    const x = el('button', 'b', 'Đóng'); x.addEventListener('click', () => box.remove()); card.append(x);
    box.append(card); box.addEventListener('click', e => { if (e.target === box) box.remove(); }); ui.root.append(box);
  }

  const kk = n => n >= 1000 ? Math.round(n / 1000) + 'k' : n + 'đ';
  // tìm phần tử nhỏ nhất đang hiện có chữ khớp
  function findText(re, root = document.body) {
    let best = null;
    for (const e of root.querySelectorAll('div,span,button,a,h2,h3,label,p,section')) {
      if (e.closest('#hattieu-host')) continue;
      const tx = (e.innerText || '').trim(); if (!tx || tx.length > 120 || !re.test(tx)) continue;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (!best || (best.contains(e))) best = e;
    }
    return best;
  }
  function dealCard() {
    if (!isShopeeItem()) return null;
    const D = readDeal(), box = el('div', 'dealc');
    box.append(el('div', 'dct', '💰 Giá tốt nhất'));
    if (D && D.res) {
      box.append(dealBlock(D));
    } else {
      loadDealData();
      box.append(el('div', 'dcl', 'HaoHao đọc mã giảm giá trên trang để tính cách mua rẻ nhất.'));
      box.append(el('div', 'dcs', '💡 Rê chuột vào mã giảm giá của shop và bấm 🎟️ cạnh giá, HaoHao sẽ tính được giá tốt nhất.'));
    }
    return box;
  }
  let guide = null;
  const GSTEP = {
    vch: { say: 'Rê chuột vào các mã giảm giá này để HaoHao đọc điều kiện nhé!', tgt: () => document.querySelector('.mini-vouchers') || findText(/^Mã Giảm Giá Của Shop/i),
      done: () => { const D = readDeal(); return !!(D && D.vouchers); } },
    det: { say: 'Giờ bấm vào biểu tượng 🎟️ cạnh giá để HaoHao xem chi tiết giá nha!', tgt: () => { const l = findText(/^Giá Sau Voucher$/i); return l ? l.parentElement : null; },
      done: () => { const D = readDeal(); return !!(D && D.detail); } },
    save: { say: () => { const v = deal.res.best.v; return `Rê vào mã ${v.label} rồi bấm Lưu nhé!${v.saved ? ' (Mã này đã có sẵn, bấm Tiếp)' : ''}`; },
      tgt: () => { const v = deal.res.best.v; return [...document.querySelectorAll('.mini-voucher-with-popover')].find(e => new RegExp('^' + v.label.replace('Giảm ', 'Giảm\\s*') + '\\s*₫?$', 'i').test((e.innerText || '').trim())) || document.querySelector('.mini-vouchers'); },
      done: () => { const D = readDeal(); const v = D && D.res && D.res.best.v; return !!(v && (D.vouchers || []).find(x => x.label === v.label && x.saved) && guide && guide.clicked); } },
    wpick: { say: 'Chọn màu và size bạn muốn, xong bấm Tiếp nha!', tgt: () => { const l = findText(/^(Màu Sắc|Phân Loại|Màu)$/i); return l ? l.parentElement : null; }, done: () => false },
    wbuy: { say: () => `Chọn màu, size rồi bấm "${buyLabel()}" nha, Shopee tự áp sẵn mã giảm cho bạn! Sang trang thanh toán HaoHao kiểm tra lại tổng tiền 🐾`, tgt: () => buyBtn(), done: () => !!(guide && guide.clicked) },
    ctick: { say: 'Tick chọn món này trong giỏ nha!', tgt: () => cartRow(), done: () => { const r = cartRow(); const cb = r && r.querySelector('input[type="checkbox"]'); return !!(cb && cb.checked); } },
    cspv: { say: 'Bấm "Chọn Voucher khác" ở dòng Shopee Voucher nha!', tgt: () => cartVoucherBtn(),
      done: () => !!findText(/^Chọn Shopee Voucher$/) },
    cok: { say: 'Shopee đã chọn sẵn mã tốt nhất, bấm "Đồng ý" để áp mã nha!', tgt: () => { const t = findText(/^Chọn Shopee Voucher$/); const dlg = t && t.closest('div[role="dialog"]') || (t && t.parentElement && t.parentElement.parentElement) || document.body; return [...dlg.querySelectorAll('button')].find(b => /^Đồng ý$/i.test((b.innerText || '').trim())) || findText(/^Đồng ý$/i); },
      done: () => !findText(/^Chọn Shopee Voucher$/) },
    cbuy: { say: () => cartVerdict(), tgt: () => findText(/^Mua [Hh]àng$/), done: () => !!(guide && guide.clicked) },
    kspv: { say: 'Bấm "Chọn Voucher" ở dòng Shopee Voucher, chọn mã giảm % lớn nhất (vd. Giảm 12%) rồi bấm Đồng ý nha!',
      tgt: () => { const l = findText(/^Shopee Voucher$/); const row = l && (l.closest('div[class]') || l).parentElement; return row ? ([...row.querySelectorAll('button,div,span,a')].find(e => /^(Chọn Voucher|Chọn hoặc nhập mã|Thay đổi)$/i.test((e.innerText || '').trim())) || row) : null; },
      done: () => { const k = readCheckout(); return !!(k && guide && guide.k0 != null && k.vouch > guide.k0 + 500); } },
    ktotal: { say: () => checkoutVerdict(), tgt: () => findText(/^Tổng thanh toán$/), done: () => false },
    pick: { say: 'Chọn màu và size bạn muốn, xong bấm Tiếp nha!', tgt: () => { const l = findText(/^(Màu Sắc|Phân Loại|Màu)$/i); return l ? l.parentElement : null; }, done: () => false },
    buy: { say: () => { const r = deal.res, v = r.best.v; return `Bấm Mua ngay. Ở trang thanh toán chọn mã ${v.label}${r.opts.find(o => o.v && o.v.saved && o.v.label !== v.label) ? ' thay cho mã đang chọn' : ''} → còn ≈ ${vnd(r.best.final)} 🎉`; },
      tgt: () => findText(/^(Mua Với Voucher|Mua Ngay|Mua ngay)/i), done: () => !!(guide && guide.clicked) }
  };
  // giỏ hàng: dòng có tên món đang hướng dẫn
  let gstate = null;
  function cartRow() {
    const t = gstate && HT.fold(gstate.title || '').slice(0, 28); if (!t) return null;
    for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
      let r = cb.parentElement; for (let i = 0; i < 7 && r; i++, r = r.parentElement) if (HT.fold(r.innerText || '').includes(t) && (r.innerText || '').length < 900) return r;
    }
    return null;
  }
  // giỏ hàng: nút chọn Shopee Voucher ở chân giỏ
  function cartVoucherBtn() {
    const l = findText(/^Shopee Voucher$/); let row = l; for (let i = 0; i < 4 && row; i++) { row = row.parentElement; if (row && /Chọn Voucher|Chọn hoặc nhập mã/i.test(row.innerText || '')) break; }
    return row ? ([...row.querySelectorAll('button,div,span,a')].reverse().find(e => /^(Chọn Voucher khác|Chọn Voucher|Chọn hoặc nhập mã)$/i.test((e.innerText || '').trim())) || row) : null;
  }
  const cartTotal = () => { const m = (document.body.innerText || '').match(/Tổng cộng \(\d+ sản phẩm\):?\s*\n?\s*([\d.,]+)\s*₫/); return m ? HT.money(m[1]) : 0; };
  function cartVerdict() {
    const t = cartTotal(), exp = gstate && gstate.web;
    if (!t || !exp) return 'Giờ bấm Mua Hàng để sang trang thanh toán!';
    if (Math.abs(t - exp) <= 1000) return `✅ Giá trong giỏ ${vnd(t)} đúng giá "Mua Với Voucher". Giờ bấm Mua Hàng nhé!`;
    if (t > exp) return `Giá trong giỏ ${vnd(t)}, cao hơn HaoHao tính ${vnd(t - exp)}: bấm lại "Chọn Voucher khác", chọn mã giảm % lớn nhất rồi Đồng ý nha. Xong bấm Mua Hàng.`;
    return `🎉 Giá trong giỏ ${vnd(t)}, còn rẻ hơn HaoHao tính! Giờ bấm Mua Hàng nhé!`;
  }
  // trang thanh toán: đọc tổng, phí ship, tổng voucher giảm
  function readCheckout() {
    const t = document.body.innerText || '', last = re => { const m = [...t.matchAll(re)]; return m.length ? HT.money(m[m.length - 1][1]) : 0; };
    const total = last(/Tổng thanh toán\s*\n\s*([\d.,]+)\s*₫/g); if (!total) return null;
    return { total, ship: last(/Tổng tiền phí vận chuyển\s*\n\s*([\d.,]+)\s*₫/g), vouch: last(/Tổng cộng Voucher giảm giá\s*\n\s*-?\s*([\d.,]+)\s*₫/g) };
  }
  function checkoutVerdict() {
    const k = readCheckout(), st = gstate; gsave(null);
    if (!k) return 'Chưa đọc được tổng tiền trên trang này.';
    const exp = st && st.web ? st.web + k.ship : 0, diff = exp ? k.total - exp : 0;
    const head = `Tổng thanh toán: ${vnd(k.total)}${k.ship ? ` (gồm ship ${vnd(k.ship)})` : ''}.`;
    if (!exp) return head + ' Ưng thì bấm Đặt hàng nhé, HaoHao không bấm thay.';
    if (Math.abs(diff) <= 1000) return `✅ ${head} Đúng như HaoHao tính! Ưng thì bấm Đặt hàng nhé.`;
    if (diff > 0) return `${head} Cao hơn HaoHao tính ${vnd(diff)}: bấm "Chọn Voucher" ở dòng Shopee Voucher, chọn mã giảm % lớn nhất rồi Đồng ý nha.`;
    return `🎉 ${head} Còn rẻ hơn HaoHao tính ${vnd(-diff)}! Ưng thì bấm Đặt hàng nhé.`;
  }
  // nhớ bước hướng dẫn khi chuyển trang (2 giờ)
  function gsave(st) { gstate = st; try { st ? chrome.storage.local.set({ hhGuide: st }) : chrome.storage.local.remove('hhGuide'); } catch {} }
  function webGuideStart() {
    const D = readDeal(); const p = detectProduct();
    gsave({ key: itemKey(), title: (p && p.title) || (document.querySelector('h1') || {}).innerText || '', web: D && D.res ? dealPrices(D).web : 0, at: Date.now() });
    guideBegin(['wbuy']);
  }
  async function resumeWebGuide() {
    const k = pageKind(); if (k !== 'cart' && k !== 'checkout') return;
    const { hhGuide: st } = await chrome.storage.local.get('hhGuide').catch(() => ({}));
    if (!st || Date.now() - st.at > 2 * 3600e3) return;
    gstate = st;
    guideBegin(k === 'cart' ? ['ctick', 'cspv', 'cok', 'cbuy'] : ['ktotal']);
  }
  function guideBegin(order) {
    guideStop();
    if (ui && !ui.panel.hidden) closePanel();
    if (ui) ui.bubble.hidden = true;
    guide = { order, i: 0, clicked: false };
    guideRun();
  }
  function guideStart(from) {
    guideStop();
    const D = readDeal(); if (!D) return;
    if (ui && !ui.panel.hidden) closePanel();
    ui.bubble.hidden = true;
    guide = { order: [], i: 0, clicked: false };
    if (!D.vouchers) guide.order.push('vch');
    if (!D.detail) guide.order.push('det');
    guide.order.push('calc');
    guideRun();
  }
  function guideStop() {
    if (!guide) return;
    clearInterval(guide.timer); document.removeEventListener('click', guide.onClick, true);
    ui.root.querySelectorAll('.gring,.gpop').forEach(x => x.remove()); guide = null;
  }
  function guideRun() {
    if (!guide) return;
    let k = guide.order[guide.i];
    if (k === 'calc') {
      const D = readDeal();
      if (!D || !D.res) return guideSay('Chưa đọc đủ mã trên trang. Rê chuột vào mã giảm giá rồi thử lại nhé!', null, true);
      if (!(D.res.save >= 1000 && D.res.best.v)) return guideSay(`👍 Giá đang hiện ${vnd(D.res.current)} đã là tốt nhất rồi, mua yên tâm nha!`, null, true);
      const p0 = detectProduct(); gsave({ key: itemKey(), title: (p0 && p0.title) || '', web: dealPrices(D).web, at: Date.now() });
      guide.order.splice(guide.i, 1, 'wbuy'); k = 'wbuy';
    }
    if (!k) return guideStop();
    const S = GSTEP[k]; guide.clicked = false; guide.k = k;
    if (k === 'kspv') { const k0 = readCheckout(); guide.k0 = k0 ? k0.vouch : 0; }
    const t = S.tgt();
    if (t) t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    guideSay(typeof S.say === 'function' ? S.say() : S.say, t);
    clearInterval(guide.timer);
    guide.timer = setInterval(() => {
      if (!guide) return;
      const tt = S.tgt(); placeGuide(tt);
      if (S.done()) { guide.i++; guideRun(); }
    }, 400);
  }
  function guideSay(text, target, last) {
    ui.root.querySelectorAll('.gring,.gpop').forEach(x => x.remove());
    const ring = el('div', 'gring'), pop = el('div', 'gpop');
    const steps = guide ? guide.order.filter(x => x !== 'calc') : [];
    const hd = el('div', 'gph'); hd.append(el('span', 'gham', '🐹'));
    if (steps.length && !last) hd.append(el('span', 'gstep', `Bước ${Math.min(guide.i + 1, steps.length)}/${steps.length}`));
    pop.append(hd, el('div', 'gtx', text));
    const row = el('div', 'gbtn');
    if (guide && guide.k === 'ktotal') last = true;
    if (!last && guide && guide.k && !['vch', 'det', 'ctick', 'cspv', 'cok'].includes(guide.k)) { const nx = el('button', 'b', ['buy', 'wbuy', 'cbuy'].includes(guide.k) ? 'Xong ✓' : 'Tiếp ›'); nx.addEventListener('click', () => { if (!guide) return; guide.i++; guideRun(); }); row.append(nx); }
    if (!last && guide && (guide.k === 'buy' || guide.k === 'wbuy') && !viaHaoHao() && HT.isAff(trustTarget())) { const aff = el('button', 'b ghost', '🛒 Mua qua HaoHao'); aff.title = HT.AFF_NOTE; aff.addEventListener('click', () => { try { sessionStorage.setItem('hh-aff', itemKey()); } catch {} goAff(trustTarget()); }); row.append(aff); if (HT.STORE) pop.append(el('div', 'tnote', HT.AFF_NOTE)); }
    const x = el('button', 'mlink', last ? 'Đóng' : 'Bỏ qua'); x.addEventListener('click', () => { if (!last) gsave(null); guideStop(); }); row.append(x);
    pop.append(row);
    ui.root.append(ring, pop);
    if (guide) {
      guide.onClick && document.removeEventListener('click', guide.onClick, true);
      guide.onClick = e => { const tt = guide && GSTEP[guide.k] && GSTEP[guide.k].tgt(); if (tt && (tt.contains(e.target) || (e.target.closest && e.target.closest('.mini-vouchers, [class*="popover" i]')))) guide.clicked = true; };
      document.addEventListener('click', guide.onClick, true);
    }
    placeGuide(target, true);
  }
  function placeGuide(t, first) {
    const ring = ui.root.querySelector('.gring'), pop = ui.root.querySelector('.gpop'); if (!pop) return;
    if (!t) { ring && (ring.hidden = true); pop.classList.add('free'); return; }
    const r = t.getBoundingClientRect(); ring.hidden = false; pop.classList.remove('free');
    Object.assign(ring.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    const W = 290, below = r.bottom + 14 + 150 < innerHeight;
    const left = Math.max(10, Math.min(innerWidth - W - 10, r.left));
    const top = below ? r.bottom + 14 : Math.max(10, r.top - 14 - pop.offsetHeight);
    if (first) pop.classList.add('run');
    Object.assign(pop.style, { left: left + 'px', top: top + 'px' });
    if (first) setTimeout(() => pop.classList.remove('run'), 700);
  }

  function showTrustBubble() {
    if (!trust || !ui || !ui.panel.hidden || menuOpen || trustClosed === location.href) return;
    if (settings.shopAsk === false && trust.score >= 60) return;
    const bad = trust.score < 60, shopOnly = !!trust.info.shopOnly;
    const all = [...trust.shop, ...trust.product];
    const minor = x => /^Shop mới có .*lượt đánh giá|người theo dõi|phản hồi/i.test(x.t);   // 1.10.237: để trong Kiểm tra chi tiết, không hiện ở bong bóng
    const pick = (bad ? all.filter(x => x.s === 'bad').concat(all.filter(x => x.s === 'warn')) : all.filter(x => x.s === 'ok')).filter(x => !minor(x)).slice(0, 5);   // 1.10.214: hiện tới 5 điểm kiểm tra (trước chỉ 2)
    const B = ui.bubble;
    B.innerHTML = ''; B.dataset.tab = 'shop'; B.dataset.kind = 'trust'; B.classList.add('tb'); B.style.setProperty('--k', { good: '#1E9E6F', ok: '#2E7DD7', warn: '#E08A00', bad: '#E0344B' }[trust.cls]);
    const top = el('div', 'tb-top');
    const lv = el('div', 'tb-lv', trust.level); lv.append(el('small', '', shopOnly ? 'HaoHao đã kiểm tra shop này' : 'HaoHao đã kiểm tra món này'));
    const x = el('button', 'tb-x', '✕'); x.title = 'Ẩn trên trang này'; x.setAttribute('aria-label', 'Ẩn');
    x.addEventListener('click', e => { e.stopPropagation(); trustClosed = location.href; B.hidden = true; });
    top.append(el('span', 'tb-sc', trust.score), lv);
    const pS = !shopOnly && detectProduct();
    if (pS && pS.price) {
      lv.querySelector('small').textContent = 'HaoHao đã kiểm tra';
      const sv = el('button', 'tb-sv');
      const paint = () => { const it = savedOf(pS); sv.textContent = it ? '🔔 Đang canh' : '🔔 Canh giá'; sv.classList.toggle('on', !!it); sv.setAttribute('aria-pressed', !!it);
        sv.title = it ? `Đã lưu giá ${vnd(it.saved)} · bấm để bỏ lưu` : 'Lưu món này, HaoHao theo dõi giá giúp bạn'; };
      paint();
      sv.addEventListener('click', async e => {
        e.stopPropagation();
        const it = savedOf(pS);
        if (it) { await unsaveProduct(it.id); paint(); return; }
        const r = await saveProduct(pS, true);
        if (r === 'full') { sv.textContent = `Đủ ${HT.SAVE_MAX} món`; sv.classList.add('full'); sv.title = `Theo dõi tối đa ${HT.SAVE_MAX} món. Bỏ bớt 1 món trong ❤️ Đã lưu nhé.`; setTimeout(() => { sv.classList.remove('full'); paint(); }, 2500); return; }
        paint(); sv.classList.add('pop'); setTimeout(() => sv.classList.remove('pop'), 400);
      });
      top.append(sv);
    }
    top.append(x); B.append(top);
    if (pS && pS.price && isItemPage()) B.append(ptBox(pS, true));
    { const sl = soldLine(trust.info); if (sl) B.append(sl); }
    const respLine = () => { const ri = trust.info, rr = ri.responseRate; return rr > 0 ? el('div', 'tb-resp ' + (rr >= 90 ? 'ok' : rr < 70 ? 'bad' : 'mid'), `💬 Shop phản hồi ${rr}%${ri.responseTime ? ' · ' + ri.responseTime : ''}`) : null; };
    { const ri = trust.info, rr = ri.responseRate; if (rr > 0 && !bad) {   // 1.10.238: phản hồi của shop đưa ra ngoài bong bóng (món rủi ro: nằm cuối danh sách cảnh báo)
      const d = el('div', 'tb-resp ' + (rr >= 90 ? 'ok' : rr < 70 ? 'bad' : 'mid'), `💬 Shop phản hồi ${rr}%${ri.responseTime ? ' · ' + ri.responseTime : ''}`); B.append(d); } }
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
      { const ti = trust.info, rc = ti.recent, bits = [];
        if (rc && rc.n >= 20) bits.push(rc.low / rc.n >= 0.06 ? `⚠ ${rc.low}/${rc.n} đánh giá mới nhất chê` : `✓ ${rc.n} đánh giá mới nhất ít chê`);
        if (ti.badVariant) bits.push(`Hay bị chê: ${ti.badVariant.name}`);
        if (bits.length) box.append(el('small', 'tb-rs', bits.join(' · '))); }
      // 1.10.154: gom lời chê thành nhóm "Size nhỏ (5) · Vải mỏng (3)" + 1 câu trích tiêu biểu
      box.append(el('div', 'tb-grp', rv.issues.slice(0, 4).map(it => `${it.label} (${it.n})`).join(' · ')));
      const top = rv.issues[0], q0 = (top.quotes || []).filter(q => q.length >= 12)[0] || (top.quotes || [])[0];
      if (q0) { const row = el('div', 'tb-rl'); row.append(quote(q0.slice(0, 90), (top.words || []).find(w => q0.toLowerCase().includes(w)))); box.append(row); }
      B.append(box);
    } else if (trust.info.reviewsReading) B.append(el('div', 'tb-hook wait', '💬 Đang đọc toàn bộ đánh giá…'));
    else if (bad && pick.length) { const wy = el('div', 'tb-why'); pick.forEach(i => wy.append(el('div', 'tb-wl', '⚠ ' + i.t.split(':')[0]))); const rl = respLine(); if (rl) wy.append(rl); B.append(wy); }   // 1.10.239: dòng thứ 4 = phản hồi shop   // 1.10.236: mỗi cảnh báo 1 dòng
    else if (trust.info.goodReview) {
      const box = el('div', 'tb-rv good'); box.append(el('b', '', `💬 Đánh giá nổi bật · ${rv ? rv.read : 0} đánh giá không thấy lời chê`), quote(trust.info.goodReview));
      B.append(box);
    }
    if (!B.querySelector('.tb-resp')) { const rl = respLine(); if (rl) B.append(rl); }   // món rủi ro có khung lời chê: vẫn có dòng phản hồi
    { const a = trust.info.anh; if (a) {   // 📸 ảnh thật vs ảnh mẫu
      const bx = el('div', 'tb-rv ' + (a.muc === 'giong' ? 'good' : 'bad'));
      bx.append(el('b', '', a.muc === 'khac_xa' ? '📸 Ảnh thật khác xa ảnh mẫu · cân nhắc kỹ' : a.muc === 'hoi_khac' ? '📸 Ảnh thật hơi khác ảnh mẫu' : '📸 Ảnh thật giống ảnh mẫu ✓'));
      if (a.y) bx.append(el('small', 'tb-rs', a.y + ` (so ${a.n || ''} ảnh khách chụp)`));
      B.append(bx); } }
    const p = shopOnly ? null : detectProduct(), best = p && bestCouponFor(p);
    const DR = isShopeeItem() ? readDeal() : null;
    if (DR && DR.res) {
      B.append(dealBlock(DR));
      const vh = saveHook(DR); if (vh) B.append(vh);
      const nm = moreHook((p && p.price) || (DR.res && DR.res.base), DR); if (nm) B.append(nm);
      if (p && p.price) { const fh = flashHook(p); if (fh) B.append(fh); ttCompare(p); const th = ttHook(p); if (th) B.append(th); }
    } else if (isShopeeItem() && !shopOnly) {   // chưa đọc được bảng giá (vd Flash Sale): vẫn có mã QR mua trên app
      B.append(p && p.price ? liteDeal(p) : appQr(0));   // 1.10.216: vẫn hiện đủ 2 khung Mua trên web / Mua trên app như bình thường
      // 1.10.217: trang tải chậm → thử đọc lại bảng giá, đọc được thì vẽ lại bong bóng đầy đủ (tối đa 4 lần)
      { const href = location.href; let k = 0; const again = () => { if (++k > 4 || location.href !== href || B.hidden || B.dataset.kind !== 'trust') return;
          const d2 = readDeal(); if (d2 && d2.res) showTrustBubble(); else setTimeout(again, 2000); }; setTimeout(again, 2000); }
      if (p && p.price) { const nm2 = moreHook(p.price, null); if (nm2) B.append(nm2); ttCompare(p); const th = ttHook(p); if (th) B.append(th); }
    }
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
    const go = el('button', 'tb-go' + (p && p.price && isItemPage() ? ' tb-go2' : ''), bad ? '⚠ Kiểm tra' : '🛡️ Kiểm tra');
    go.addEventListener('click', e => { e.stopPropagation(); goCheck('check'); });
    const rvBox = B.querySelector('.tb-rv, .tb-why');   // 1.10.159: có khung đánh giá → nút Kiểm tra nằm trong khung đó
    if (rvBox) { const ck = el('button', 'tb-ck', (bad ? '⚠' : '🛡️') + ' Kiểm tra chi tiết ›'); ck.addEventListener('click', e => { e.stopPropagation(); goCheck('check'); }); rvBox.append(ck); }
    else acts.append(go);
    if (p && p.price && isItemPage()) { const go2 = el('button', 'tb-go' + (hookSave ? ' pulse' : ''), hookSave ? `🔥 Rẻ hơn ${kShort(hookSave)}` : '🔍 Tìm shop rẻ hơn'); go2.addEventListener('click', e => { e.stopPropagation(); if (isTikTokItem()) goCheck('cheaper'); else startCompare(p); }); acts.prepend(go2); }
    B.append(acts);
    // 🧡 cửa hàng HaoHao: 1 dòng gọn dưới cùng bong bóng
    { const tt = isTikTokItem(), url = tt ? HT.ttShowcase() : HT.SP.showcase;
      if (url) {
        const s = el('button', 'tb-buy', tt ? '🛍️ Hàng HaoHao tuyển chọn' : '🧡 HaoHao Store'); s.title = 'Mở trang trưng bày hàng HaoHao tuyển chọn';
        s.addEventListener('click', e => { e.stopPropagation(); openDeal(url); }); B.append(s);
      } }
    if (!viaHaoHao() || (HT.SP.showcase || HT.ttShowcase())) B.append(el('div', 'tb-aff', 'ⓘ Link tiếp thị · Giá không đổi'));
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
  // 📊 1.10.158: đã bán bao nhiêu – trong đó bao nhiêu đánh giá chê (1–2★) → tỉ lệ lỗi trên số đã bán
  function soldLine(info) {
    if (!info || info.shopOnly) return null;
    const sold = info.sold || 0, d = info.dist || {}, fr = info.fullRead, rv = info.reviews;
    const low = (d[1] || 0) + (d[2] || 0) || (fr ? fr.expect || fr.low : 0) || (rv ? rv.bad : 0);
    if (!(sold > 0)) { const w = el('div', 'tb-sold bad'); w.append(el('b', '', '⚠ Chưa bán được hàng nào, cẩn thận'), el('span', '', 'chưa ai mua để kiểm chứng')); return w; }   // 1.10.219
    const pct = low / sold * 100, f = n => Number(n).toLocaleString('vi-VN'), p = pct < 0.1 ? '<0,1' : pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    let cls, verdict;
    if (sold < 30) { cls = 'na'; verdict = 'bán còn ít, chưa đủ để kết luận'; }
    else if (pct < 0.5) { cls = 'good'; verdict = 'lỗi rất ít ✓'; }
    else if (pct < 2) { cls = 'ok'; verdict = 'lỗi ít'; }
    else if (pct < 5) { cls = 'warn'; verdict = 'lỗi hơi nhiều, đọc kỹ lời chê'; }
    else { cls = 'bad'; verdict = 'lỗi nhiều ⚠'; }
    const box = el('div', 'tb-sold ' + cls);
    box.append(el('b', '', `📊 Đã bán ${f(sold)} · ${f(low)} lời chê (${p}%)`), el('span', '', verdict));
    box.title = 'Lời chê = số đánh giá 1–2★ Shopee ghi. Tỉ lệ = lời chê ÷ số đã bán (không phải ai mua cũng đánh giá)';
    return box;
  }
  function trustCard() {
    const c = el('div', 'tcard ' + trust.cls);
    const top = el('div', 'ttop');
    const shopOnly = !!trust.info.shopOnly;
    const ring = el('div', 'tring'); ring.style.setProperty('--v', trust.score); ring.append(el('b', trust.score >= 100 ? 'k3' : '', trust.score));
    const tx = el('div'); tx.append(el('div', 'tlv', trust.level), el('div', 'tsub', shopOnly ? `Điểm uy tín shop${trust.info.shopName ? ' · ' + trust.info.shopName : ''}` : 'Điểm tin cậy sản phẩm & shop'));
    top.append(ring, tx); c.append(top);
    { const sl = soldLine(trust.info); if (sl) c.append(sl); }
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
  const TOOL_RENDER = { crypto: V => renderCrypto(V), adblock: V => renderAdblock(V), unl: V => renderUnlock(V), transfer: V => renderTransfer(V), gopy: V => renderGopy(V) };
  // 💬 V1.8: Góp ý – khách gửi mong muốn, chỉ chủ app đọc (máy chủ /gopy, xem ở trang thống kê có mật khẩu)
  let gopyMsg = '', gopyTxt = '';
  function renderGopy(V) {
    const L = el('div', 'body-list');
    L.append(el('div', 'gp-n', 'Bạn muốn HaoHao có thêm gì, hay chỗ nào chưa tiện? Góp ý gửi thẳng cho chủ app, người khác không xem được.'));
    const ta = document.createElement('textarea'); ta.className = 'gp-t'; ta.rows = 5; ta.maxLength = 1000; ta.placeholder = 'Viết góp ý của bạn…'; ta.value = gopyTxt;
    ta.addEventListener('input', () => { gopyTxt = ta.value; }); ta.addEventListener('keydown', e => e.stopPropagation());
    const b = el('button', 'b', 'Gửi góp ý');
    b.addEventListener('click', async () => {
      const t = ta.value.trim(); if (t.length < 5) { gopyMsg = 'Viết thêm chút nữa nhé (ít nhất 5 chữ).'; return renderPanel(); }
      b.disabled = true; b.textContent = 'Đang gửi…';
      const r = await chrome.runtime.sendMessage({ type: 'gopy', txt: t }).catch(() => null);
      if (r && r.ok) { gopyTxt = ''; gopyMsg = '✓ Cảm ơn bạn! Chủ app đã nhận góp ý.'; } else gopyMsg = r && r.error === 'limit' ? 'Hôm nay bạn đã gửi nhiều góp ý rồi, mai gửi tiếp nhé.' : 'Chưa gửi được, thử lại sau nhé.';
      renderPanel();
    });
    L.append(ta, b); if (gopyMsg) L.append(el('div', 'gp-m', gopyMsg));
    V.append(L);
  }
  // ---------- 📲 HaoHao Transfer (1.10.195): dùng app ChuyenAnh-iPhone (.exe, cổng 8686) chạy trên máy ----------
  let tfMode = 'nhan';   // V1.48: thanh trượt 📥 iPhone → Máy tính / 📤 Máy tính → iPhone
  let tfPending = null, tfIfr = null, tfReady = false;   // V1.49: file kéo thả vào HaoHao, chờ khung gửi sẵn sàng
  const TFK = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const tfFlush = () => { if (!tfPending || !tfIfr || !tfReady || !tfIfr.isConnected) return; tfIfr.contentWindow.postMessage({ hhTfFiles: tfPending, k: TFK }, 'chrome-extension://' + chrome.runtime.id); tfPending = null; };
  function renderTransfer(V) {
    const L = el('div', 'body-list tfx'), SW = el('div', 'tfx-sw'), S = el('div', 'tfx-send');
    const bN = el('button', '', '📥 iPhone → Máy tính'), bG = el('button', '', '📤 Máy tính → iPhone');
    bN.type = bG.type = 'button'; SW.setAttribute('role', 'tablist'); SW.append(bN, bG); SW.style.display = 'none'; S.style.display = 'none';
    V.append(el('div', 'tfx-slo', 'iPhone nhẹ tênh, kỷ niệm vẫn còn nguyên'), SW, L, S);
    let ifr = null, canGui = false;
    const setMode = m => {
      tfMode = m; SW.dataset.m = m; bN.classList.toggle('on', m === 'nhan'); bG.classList.toggle('on', m === 'gui');
      bN.setAttribute('aria-selected', m === 'nhan'); bG.setAttribute('aria-selected', m === 'gui');
      L.style.display = m === 'gui' ? 'none' : ''; S.style.display = m === 'gui' ? '' : 'none';
      if (m === 'gui' && !ifr) {
        ifr = document.createElement('iframe'); ifr.className = 'tfx-if'; ifr.title = 'Gửi ảnh/video sang iPhone'; ifr.src = chrome.runtime.getURL('tfgui.html') + '#k=' + TFK;
        tfIfr = ifr; tfReady = false; ifr.addEventListener('load', () => { if (tfIfr === ifr) { tfReady = true; tfFlush(); } });
        const onMsg = e => { if (!ifr.isConnected) return window.removeEventListener('message', onMsg); if (e.source === ifr.contentWindow && e.data && e.data.hhTfH) ifr.style.height = e.data.hhTfH + 'px'; };
        window.addEventListener('message', onMsg); S.append(ifr);
      }
    };
    bN.addEventListener('click', () => setMode('nhan')); bG.addEventListener('click', () => setMode('gui'));
    let lastUrl = '', qrBox = null;
    const draw = r => {
      if (!L.isConnected) return false;
      canGui = !!(r && r.ok && r.info && r.info.gui);
      if (canGui) { if (SW.style.display === 'none') { SW.style.display = ''; setMode(tfMode); } }
      else { SW.style.display = 'none'; S.style.display = 'none'; L.style.display = ''; }
      if (!r || !r.ok) {
        L.replaceChildren();
        L.append(el('div', 'tfx-st off', '⚪ App chuyển ảnh chưa bật'));
        // 1.10.197: hướng dẫn khách tải app + chạy chế độ admin (link tải: coupons.json `transfer`, chủ app đổi được)
        const dl = (typeof couponFeed !== 'undefined' && couponFeed && couponFeed.transfer) || HT.TRANSFER_DL || '';
        const ol = el('ol', 'tfx-steps');
        [['Tải app ', dl ? 'HaoHao Transfer (Windows)' : '', ' về máy tính và giải nén.'],
         ['Chuột phải vào file ', 'HaoHao-Transfer.exe', ' → chọn "Run as administrator" (Chạy với quyền quản trị viên). Nếu hiện bảng xanh "Windows protected your PC" → bấm More info → Run anyway.'],
         ['Windows hỏi "Allow access" → bấm ', 'Cho phép', ' (tick cả Private).'],
         ['App chạy ngầm (không có cửa sổ). Từ lần sau chỉ cần bấm ', '▶️ Bật app', ' bên dưới (Chrome hỏi thì bấm Mở).']].forEach(([a, b, c]) => { const li = el('li'); li.append(a); if (b) li.append(el('b', '', b)); li.append(c); ol.append(li); });
        L.append(ol);
        const row = el('div', 'dbtns');
        if (dl) { const d = el('button', 'b', '⬇️ Tải app'); d.addEventListener('click', () => window.open(dl, '_blank')); row.append(d); }
        // 1.10.205: bật lại app ngay từ HaoHao (app đã chạy 1 lần sẽ tự đăng ký link haohao-transfer://)
        const on = el('button', 'b', '▶️ Bật app'); on.addEventListener('click', () => {
          const a = document.createElement('a'); a.href = 'haohao-transfer://bat'; a.style.display = 'none'; document.body.append(a); a.click(); a.remove();
          on.textContent = '⏳ Đang bật…'; let n = 0; const w = setInterval(() => { n++; tick(); if (n > 10 || !L.isConnected) { clearInterval(w); on.textContent = '▶️ Bật app'; } }, 1000);
        });
        const b = el('button', 'b ghost', '🔄 Kiểm tra lại'); b.addEventListener('click', () => tick()); row.prepend(on); row.append(b); L.append(row);
        lastUrl = ''; qrBox = null; return true;
      }
      const I = r.info || {}, T = r.tt || {};
      if (I.url !== lastUrl || !qrBox) {
        lastUrl = I.url; L.replaceChildren();
        L.append(el('div', 'tfx-st on', `🟢 Đang bật · ${I.host || 'máy tính'}`));
        qrBox = el('div', 'tfx-qr');
        try { const q = qrcode(0, 'M'); q.addData(I.url); q.make(); const im = document.createElement('img'); im.src = q.createDataURL(4, 2); im.alt = 'Mã QR mở trang chuyển ảnh trên iPhone'; qrBox.append(im); } catch {}
        const tx = el('div'); tx.append(el('b', '', 'iPhone quét mã bằng Camera'), el('small', '', 'iPhone và máy tính phải cùng Wi-Fi. Hoặc gõ vào Safari:'), el('code', '', I.url || ''));
        qrBox.append(tx); L.append(qrBox, el('div', 'tfx-live'), el('div', 'tfx-sum'), el('div', 'tfx-rc'));
        // 1.10.203: quản lý ngay trong HaoHao, không mở trang riêng
        L.append(el('div', 'tfx-tip', 'Mỗi lần chuyển nên dưới 500 ảnh, hoặc 5–10 video (tuỳ dung lượng)'));
        const dir = el('div', 'tfx-dir'); L.append(dir);
        const row = el('div', 'dbtns');
        const mo = el('button', 'b ghost', '📂 Mở thư mục ảnh'); mo.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'tf-mo' }));
        const doi = el('button', 'b ghost', '🔁 Đổi thư mục lưu'); doi.addEventListener('click', () => { doi.textContent = '⏳ Đang mở hộp chọn…'; chrome.runtime.sendMessage({ type: 'tf-doi' }).then(x => { doi.textContent = x && x.error ? '⚠️ ' + x.error : '🔁 Đổi thư mục lưu'; tick(); }).catch(() => { doi.textContent = '🔁 Đổi thư mục lưu'; }); });
        const off = el('button', 'b ghost', '⏻ Tắt app'); off.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'tf-thoat' }).then(() => setTimeout(tick, 600)));
        row.append(mo, doi, off); L.append(row);
      }
      { const dr = L.querySelector('.tfx-dir'); if (dr) { dr.replaceChildren(); if (T.root) { dr.append('📁 Lưu tại: ', el('b', '', T.root)); dr.title = T.root; } } }
      const lv = L.querySelector('.tfx-live'), sm = L.querySelector('.tfx-sum'), rc = L.querySelector('.tfx-rc');
      lv.replaceChildren();
      if (T.live && !T.live.done) {
        const pct = T.live.all != null ? T.live.all : T.live.file;
        lv.append(el('div', 'tfx-ln', T.live.saving ? `💾 Đang lưu file ${T.live.i || 1}/${T.live.n || 1} vào thư mục… (${T.live.name || ''})` : `⬆️ Đang nhận ${T.live.i || 1}/${T.live.n || 1} · ${pct}% · ${T.live.got}${T.live.tot ? ' / ' + T.live.tot : ''}`));   // V1.76
        const bar = el('div', 'tfx-bar'), f = el('i'); f.style.width = pct + '%'; bar.append(f); lv.append(bar);
      }
      sm.textContent = T.files ? `✅ Đã nhận ${T.files} file · ${T.size}` : 'Chưa nhận file nào trong lần bật này';
      if (T.skip) sm.textContent += ` · bỏ qua ${T.skip} file đã có`;   // V1.75
      if (T.err) { sm.textContent += ' · ⚠️ ' + T.err; sm.classList.add('tfx-err'); } else sm.classList.remove('tfx-err');
      rc.replaceChildren(); (T.recent || []).slice(0, 4).forEach(x => { const d = el('div', 'tfx-it'); d.append(el('span', '', x.name), el('small', '', x.size)); rc.append(d); });
      return true;
    };
    const tick = () => chrome.runtime.sendMessage({ type: 'tf-st' }).then(draw).catch(() => draw(null));
    tick(); const iv = setInterval(() => { if (!L.isConnected) return clearInterval(iv); tick(); }, 1500);
  }
  // ---------- 🛡️ Chặn quảng cáo ----------
  const adCount = () => new Promise(res => {
    const on = e => { window.removeEventListener('hh-ad-count-reply', on); res(e.detail || { n: 0 }); };
    window.addEventListener('hh-ad-count-reply', on); window.dispatchEvent(new Event('hh-ad-count'));
    setTimeout(() => { window.removeEventListener('hh-ad-count-reply', on); res({ n: 0 }); }, 300);
  });
  const saveSet = patch => chrome.storage.local.get('settings').then(({ settings: s0 = {} }) => chrome.storage.local.set({ settings: { ...s0, ...patch } }));
  function renderAdblock(V) {
    const on = settings.adBlock !== false, here = HOST;
    const exempt = /(^|\.)(shopee\.vn|shope\.ee|tiktok\.com|collshp\.com)$/.test(here), skip = HT.adSkipHit(here, settings);
    const L = el('div', 'body-list adb');
    const sw = el('button', 'adsw' + (on ? ' on' : '')); sw.setAttribute('aria-pressed', on);
    sw.append(el('span', 'knob'), el('b', '', on ? 'Chặn quảng cáo: Đang bật' : 'Chặn quảng cáo: Đang tắt'));
    sw.addEventListener('click', () => saveSet({ adBlock: !on }));
    L.append(sw);
    // 📊 thành tích chặn: số tab quảng cáo tự bật đã đóng (cộng dồn) + số quảng cáo ẩn trên trang này
    if (on) {
      const stats = el('div', 'adstats');
      const c1 = el('div', 'ads1'); c1.append(el('b', '', '…'), el('span', '', '🚫 tab quảng cáo tự bật đã đóng'));
      const c2 = el('div', 'ads2'); c2.append(el('b', '', '…'), el('span', '', '🛡️ quảng cáo đã ẩn trên trang này'));
      stats.append(c1, c2); L.append(stats);
      chrome.storage.local.get('popBlocked').then(({ popBlocked = 0 }) => { c1.querySelector('b').textContent = Number(popBlocked).toLocaleString('vi-VN'); });
      if (!here || exempt) c2.remove(); else adCount().then(r => { c2.querySelector('b').textContent = r.on ? Number(r.n || 0).toLocaleString('vi-VN') : '–'; });
    }
    if (on && here) {
      const hereName = location.protocol === 'chrome-extension:' ? 'Tab mới' : here;   // V1.58: Tab mới không hiện mã tiện ích
      L.append(el('div', 'adsite', exempt ? `${hereName}: không chặn (trang tiếp thị)` : skip ? `${hereName}: không chặn (Trang không chặn)` : `${hereName}: đang tự chặn`));
      if (!exempt && !skip) {
        const cnt = el('div', 'adcnt', '…'); L.append(cnt);
        adCount().then(r => { if (r.on && !r.yt) { cnt.remove(); return; } cnt.textContent = !r.on ? 'Tải lại trang (F5) để áp dụng' : `YouTube: đã bỏ qua ${r.skipped || 0} quảng cáo video, ẩn ${r.n} ô quảng cáo`; });
      }
    }
    // 🛡️ V1.82: Trang không chặn – mặc định haohaostore.com, người dùng tự thêm / bỏ
    if (on) {
      const box = el('div', 'adskip'); box.style.cssText = 'margin-top:10px;padding:10px;border:1px solid #EEE6DF;border-radius:12px;display:flex;flex-direction:column;gap:6px';
      box.append(el('b', '', '✅ Trang không chặn'));
      const mine = (settings.adSkip || []).map(HT.adHost).filter(Boolean);
      const setSkip = list => saveSet({ adSkip: [...new Set(list)].slice(0, 200) });
      for (const h of HT.adSkipList(settings).filter(h => !HT.AD_SKIP_DEF.includes(h))) {   // V1.84: trang mặc định (haohaostore.com…) chạy ngầm, không hiện
        const r = el('div', ''); r.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px';
        r.append(el('span', '', h));
        if (HT.AD_SKIP_DEF.includes(h)) { const t = el('small', '', 'mặc định'); t.style.color = '#8A7B70'; r.append(t); }
        else { const x = el('button', 'b', '✕'); x.title = 'Bỏ khỏi danh sách'; x.style.cssText = 'border:0;background:none;cursor:pointer;color:#B23A0B;font-weight:700'; x.addEventListener('click', e => { e.stopPropagation(); setSkip(mine.filter(v => v !== h)); }); r.append(x); }
        box.append(r);
      }
      const hh = HT.adHost(here);
      if (hh && !exempt && !skip && location.protocol !== 'chrome-extension:') {
        const add = el('button', 'b', `＋ Thêm trang này (${hh})`); add.style.cssText = 'align-self:flex-start;margin-top:2px';
        add.addEventListener('click', e => { e.stopPropagation(); setSkip([...mine, hh]); }); box.append(add);
      }
      const f = el('div', ''); f.style.cssText = 'display:flex;gap:6px';
      const inp = document.createElement('input'); inp.placeholder = 'vd: vnexpress.net'; inp.style.cssText = 'flex:1;min-width:0;padding:5px 8px;border:1px solid #D9D2CB;border-radius:8px;font:inherit;font-size:13px';
      const ok = el('button', 'b', 'Thêm');
      const doAdd = () => { const v = HT.adHost(inp.value); if (!v) { inp.style.borderColor = '#C8102E'; return; } setSkip([...mine, v]); };
      ok.addEventListener('click', e => { e.stopPropagation(); doAdd(); }); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') doAdd(); });
      f.append(inp, ok); box.append(f, el('small', '', 'Thêm rồi tải lại trang (F5) để áp dụng.'));
      L.append(box);
    }
    L.append(el('div', 'foot', 'Tự động hoàn toàn, mọi trang: chặn tận gốc mạng quảng cáo, tự ẩn banner cờ bạc, tự gỡ popup và đóng tab quảng cáo tự bật. Video, phim: tự bỏ qua quảng cáo trong trình phát. YouTube: gỡ quảng cáo trước khi phát. Không chặn trang tiếp thị Shopee, TikTok. Bật/tắt xong nên tải lại trang (F5).'));
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
    visTools().forEach(t => {
      const b = el('button', 'tool'); b.style.setProperty('--c', t.color);
      const ti = el('span', 'ti'); ti.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg>`;
      const tx = el('div'); tx.append(el('b', '', t.label), el('span', 'td', t.desc)); b.append(ti, tx);
      b.addEventListener('click', () => { if (t.id === 'focus' || t.id === 'info') return openTab(t.id); toolsSub = t.id; if (t.id === 'crypto') loadQuotes(); renderPanel(); });
      g.append(b);
    });
    if (!HT.STORE && spyKeys && (spyKeys.at || spyKeys.rh)) {   // chỉ máy chủ app: xem thử bảng mở khoá như khách
      const b = el('button', 'tool'); b.style.setProperty('--c', '#F2A71B');
      const ti = el('span', 'ti', '🔓'); const tx = el('div'); tx.append(el('b', '', 'Bảng mở khoá'), el('span', 'td', 'Xem thử như khách (chỉ máy chủ app)')); b.append(ti, tx);
      b.addEventListener('click', () => { toolsSub = 'unl'; renderPanel(); }); g.append(b);
    }
    V.append(g);
    // 📌 2 ô tuỳ chọn trên mục chính
    const S = slots(), box = el('div', 'lay');
    box.append(el('div', 'lay-h', '📌 Thay đổi giao diện tuỳ chọn'));
    const NAMES = { focus: '🍅 Pomodoro', info: '💡 Thông tin', market: '📊 Thị trường', adblock: '🛡️ Chặn quảng cáo', transfer: '📲 HaoHao Transfer' };
    const r = el('div', 'lay-r lay-2');   // 1.10.254: Ô 1 + Ô 2 chung 1 hàng
    [0, 1].forEach(k => {   // 1.10.253: chọn bằng danh sách thả xuống, đủ app trong Tiện ích
      const sel = document.createElement('select'); r.append(el('span', '', `Ô ${k + 1}`)); sel.className = 'lay-sel'; sel.setAttribute('aria-label', `Ô ${k + 1}`);
      LAYOUT_OPT.forEach(id => { const o = document.createElement('option'); o.value = id; o.textContent = NAMES[id]; o.selected = S[k] === id; sel.append(o); });
      sel.addEventListener('change', () => {
        const id = sel.value; if (S[k] === id) return;
        const ns = [...S]; if (ns[1 - k] === id) ns[1 - k] = S[k];   // chọn trùng ô kia thì đổi chỗ cho nhau
        ns[k] = id; settings.slots = ns; saveSet({ slots: ns }); placeWrap(); renderPanel();
      });
      r.append(sel);
    });
    box.append(r);
    V.append(box);
    const cp = el('a', 'copyr', HT.COPYRIGHT); cp.href = HT.OWNER.tel; cp.title = 'Liên hệ ' + HT.OWNER.name;
    V.append(cp);
  }


  // ---------- nhánh Crypto ----------
  const qKey = it => it.source === 'dexscreener' ? 'dx:' + it.coin.trim() : 'cg:' + it.coin.trim().toLowerCase();
  const fmt = p => { if (p == null || isNaN(p)) return '?'; p = +p; if (p === 0) return '0'; if (Math.abs(p) < 0.01) return p.toPrecision(4); return p.toLocaleString('en-US', { minimumFractionDigits: Math.abs(p) >= 1000 ? 0 : 2, maximumFractionDigits: 2 }); };
  // 1.10.63 màu trong ngày kiểu bảng giá: xanh tăng · đỏ giảm · vàng đứng giá (tham chiếu)
  const mkDir = v => { v = Number(v) || 0; return v > 0 ? 'mk-up' : v < 0 ? 'mk-dn' : 'mk-ref'; };
  // 📈 Chứng khoán: mọi mã HOSE, HNX, UPCoM (V1.12; trước đây chỉ rổ VN30)
  let stocks = ['FPT', 'TCB', 'VIC'], stockQ = null, vn30 = HT.VN30;
  // V1.12: đủ mã cổ phiếu HOSE, HNX, UPCoM (danh sách + tên công ty từ SSI, nền tải lại mỗi ngày)
  let stockAll = null, stockName = {}, stockListAsk = false;
  const stNorm = t => String(t || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  async function loadStockList() {
    if (stockAll || stockListAsk) return; stockListAsk = true;
    try {
      const r = await chrome.runtime.sendMessage({ type: 'stock-list' });
      if (r && r.L && r.L.length) { stockAll = r.L.map(x => ({ c: x[0], n: x[1] || '', ex: x[2] || '', k: stNorm(x[1]) })); stockAll.forEach(x => { stockName[x.c] = x; }); if ((tab === 'tools' || tab === 'market') && mktSub === 'stock' && !holdTyping()) renderPanel(); }
    } catch {} finally { stockListAsk = false; }
  }
  function stockFind(q) {
    q = String(q || '').trim(); if (!q || !stockAll) return [];
    const Q = q.toUpperCase(), n = stNorm(q), out = [], seen = new Set();
    const add = x => { if (!seen.has(x.c) && !stocks.includes(x.c)) { seen.add(x.c); out.push(x); } };
    for (const x of stockAll) if (x.c === Q) add(x);
    for (const x of stockAll) if (x.c.startsWith(Q)) add(x);
    if (n.length >= 2) for (const x of stockAll) if (x.k.includes(n)) add(x);
    return out.slice(0, 8);
  }
  async function loadStocks(force) {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'stock-get', codes: stocks, force: !!force });
      if (r) { stockQ = r; if (r.vn30 && r.vn30.length >= 20) vn30 = r.vn30; if ((tab === 'tools' || tab === 'market') && mktSub === 'stock' && !holdTyping()) renderPanel(); }
    } catch {}
  }
  const kd = v => v == null || isNaN(v) ? '–' : (+v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  function renderStock(V) {
    if (!stockQ) loadStocks();
    loadStockList();
    const form = h(`<div class="row cry-add stk-add"><div class="stk-in">
        <input class="grow hold-in" placeholder="Gõ mã hoặc tên công ty (VD: DGC, Đức Giang)" aria-label="Tìm mã cổ phiếu" autocomplete="off" spellcheck="false">
        <div class="stk-sug" hidden></div></div>
        <button class="b" aria-label="Theo dõi mã">＋ Thêm</button></div>`);
    const inp = form.querySelector('input'), sug = form.querySelector('.stk-sug');
    let hits = [];
    const addCode = c => {
      c = String(c || '').trim().toUpperCase(); if (!c || stocks.includes(c)) return;
      if (stockAll ? !stockName[c] : !/^[A-Z0-9]{3}$/.test(c)) { sug.hidden = false; sug.replaceChildren(el('div', 'none', 'Không thấy mã ' + c + ' trên HOSE, HNX, UPCoM')); return; }
      stocks.push(c); chrome.storage.local.set({ stocks }); inp.value = ''; inp.blur(); loadStocks(); renderPanel();
    };
    const draw = () => {
      hits = stockFind(inp.value); sug.replaceChildren();
      if (!inp.value.trim()) { sug.hidden = true; return; }
      if (!stockAll) sug.append(el('div', 'none', 'Đang tải danh sách mã…'));
      else if (!hits.length) sug.append(el('div', 'none', 'Không thấy mã phù hợp'));
      hits.forEach((x, k) => {
        const b = el('button', k ? '' : 'on'); b.append(el('b', '', x.c), x.n, el('small', '', '· ' + x.ex)); b.title = x.n;
        b.addEventListener('mousedown', e => e.preventDefault()); b.addEventListener('click', () => addCode(x.c)); sug.append(b);
      });
      sug.hidden = false;
    };
    inp.addEventListener('input', draw);
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); addCode(hits[0] ? hits[0].c : inp.value); } else if (e.key === 'Escape') { inp.value = ''; draw(); } });
    inp.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 150));
    form.querySelector('button.b').addEventListener('click', () => addCode(hits[0] ? hits[0].c : inp.value));
    V.append(form);
    const list = el('div', 'body-list mk-list');
    if (!stocks.length) list.append(el('div', 'empty', 'Gõ mã hoặc tên công ty ở ô trên (đủ HOSE, HNX, UPCoM) rồi bấm ＋ Thêm để theo dõi.'));
    const hd = el('div', 'stk stk-hd'); hd.append(el('span', '', 'Mã'), el('span', '', 'Đơn vị'), el('span', '', 'Mua'), el('span', '', 'Bán'), el('span', '', '%'), el('span', '', '')); if (stocks.length) list.append(hd);
    for (const c of stocks) {
      const q = stockQ && stockQ.q && stockQ.q[c];
      const d = q && q.price ? mkDir(q.chg) : '';
      const row = el('div', 'stk mk-r ' + d);
      const nmc = el('span', 'nmc'); nmc.append(el('b', 'sym', c)); if (stockName[c]) nmc.title = stockName[c].n + ' · ' + stockName[c].ex; row.append(nmc, unitCell('nghìn'));
      if (q && q.price) {
        const chg = Math.abs(q.chg) > q.price * 0.15 ? q.chg / 1000 : q.chg;   // nguồn có lúc trả ± theo đồng thay vì nghìn đ
        // 1.10.96: theo chuẩn Vàng – Mua · Bán (giá khớp, như Thế giới) · %; ± đồng ở tooltip
        const pc = pctCell(q.pct != null ? (chg < 0 ? -Math.abs(q.pct) : Math.abs(q.pct)) : 0); pc.title = `± ${(chg > 0 ? '+' : chg < 0 ? '−' : '') + kd(Math.abs(chg))} nghìn hôm nay`;
        row.append(el('span', 'px ' + d, kd(q.price)), el('span', 'px ' + d, kd(q.price)), pc);
      } else row.append(el('span', 'px', stockQ && stockQ.error ? '⚠' : '…'), el('span', 'px', ''), el('span', 'gd', ''));
      const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Bỏ theo dõi ' + c);
      del.addEventListener('click', () => { stocks = stocks.filter(x => x !== c); chrome.storage.local.set({ stocks }); renderPanel(); });
      nmc.append(del); row.append(holdAdd('st:' + c)); list.append(row, holdLine('st:' + c, q && q.price));
      if (holdEdit === 'st:' + c) list.append(holdEditor('st:' + c));
    }
    { const tot = holdTotal(stocks.map(c => 'st:' + c), k => { const q = stockQ && stockQ.q && stockQ.q[k.slice(3)]; return q && q.price; }, 'k'); if (tot) list.append(tot); }
    const t = stockQ && stockQ.at ? new Date(stockQ.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
    mktAlerts(list, 'stock', stocks.map(c => ({ coin: c, label: c })));
    const ft = el('div', 'g-ft g-ft-end', stockQ && stockQ.error && !Object.keys(stockQ.q || {}).length ? '⚠ Chưa lấy được giá, thử lại sau' : `Cập nhật ${t} · ${String((stockQ && stockQ.src) || 'SSI').split(' ')[0]}`);
    const rf = el('button', 'g-rf', '↻'); rf.title = 'Lấy giá mới'; rf.addEventListener('click', () => { rf.disabled = true; loadStocks(true); });
    ft.append(rf); list.append(ft);
    V.append(list);
  }
  let gold = null;
  async function loadGold(force) {
    try { const r = await chrome.runtime.sendMessage({ type: 'gold-get', force: !!force }); if (r) { gold = r; if ((tab === 'tools' || tab === 'market') && !holdTyping()) renderPanel(); } } catch {}
  }
  async function loadQuotes() {
    loadGold();
    const items = [...watch, ...rules.filter(r => r.type === 'price' && r.coin && !HT.isMkt(r)).map(r => ({ source: r.source, coin: r.coin }))];
    if (!items.length) return;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'get-quotes', items });
      if (res) { quotes = { ...quotes, ...res }; if ((tab === 'tools' || tab === 'market') && !holdTyping()) renderPanel(); }
    } catch {}
  }
  const alertOpen = {};
  // 🔔 dòng "Cảnh báo giá" dùng chung cho Crypto / Vàng / Chứng khoán; trả về true khi đang mở
  function alertHead(list, pr, grp) {
    const on = pr.filter(r => r.enabled).length, open = !!alertOpen[grp];
    const hd = el('button', 'cry-hd', `🔔 Cảnh báo giá · ${on}/${pr.length} đang bật ${open ? '▴' : '▾'}`);
    hd.setAttribute('aria-expanded', open);
    hd.addEventListener('click', () => { alertOpen[grp] = !open; renderPanel(); });
    list.append(hd);
    if (!open) return false;
    for (const r of pr) {
      const row = el('label', 'rule');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = r.enabled;
      cb.addEventListener('change', () => { r.enabled = cb.checked; chrome.storage.local.set({ rules }); });
      const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Xoá cảnh báo');
      del.addEventListener('click', ev => { ev.preventDefault(); rules = rules.filter(x => x !== r); chrome.storage.local.set({ rules }); renderPanel(); });
      row.append(cb, el('span', '', r.name), del);
      list.append(row);
    }
    return true;
  }
  // form đặt cảnh báo cho Vàng / Chứng khoán: targets = [{ coin, label }]
  function mktAlerts(list, grp, targets) {
    const pr = rules.filter(r => r.type === 'price' && r.source === grp);
    if (!alertHead(list, pr, grp) || !targets.length) return;
    const ph = c => grp === 'stock' ? 'nghìn đ' : c === 'xau' ? 'USDT' : 'triệu/chỉ';
    const f2 = h(`<div class="row cry-add mk-al" style="padding:6px 0;border:0">
        <select aria-label="Chọn">${targets.map((t, i) => `<option value="${i}">${escAttr(t.label)}</option>`).join('')}</select>
        <select aria-label="Điều kiện"><option value="above">giá ≥</option><option value="below">giá ≤</option><option value="up">tăng ≥ %</option><option value="down">giảm ≥ %</option></select>
        <input type="number" step="any" placeholder="${ph(targets[0].coin)}" aria-label="Mốc">
        <button class="b">Đặt</button></div>`);
    const [cSel, oSel] = f2.querySelectorAll('select'), v = f2.querySelector('input');
    const sync = () => { v.placeholder = /up|down/.test(oSel.value) ? '%' : ph(targets[+cSel.value].coin); };
    cSel.addEventListener('change', sync); oSel.addEventListener('change', sync);
    f2.querySelector('button').addEventListener('click', () => {
      if (v.value === '') return v.focus();
      const t = targets[+cSel.value], op = oSel.value, val = Number(v.value);
      const r = { id: 'r' + Date.now().toString(36), type: 'price', enabled: true, source: grp, coin: t.coin, op, value: val };
      r.name = HT.describe(r);
      rules.push(r); chrome.storage.local.set({ rules }); say('Đã đặt cảnh báo: ' + r.name, 'happy', '', 'tools'); renderPanel();
    });
    list.append(f2);
  }
  // tên hiển thị: ký hiệu (BTC) thay cho mã CoinGecko (bitcoin)
  const coinSym = (w, q) => w.source === 'dexscreener' ? (q && q.label && !q.error ? String(q.label).toUpperCase() : w.coin.slice(0, 6) + '…') : (w.sym || HT.cgSymOf(w.coin) || String(w.coin).toUpperCase());
  // 🥇 giá vàng: tính theo CHỈ như người Việt hay nói (1 lượng = 10 chỉ), triệu đồng; ± hôm nay theo giá bán
  const trieu = v => v ? (v / 1e7).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–';
  const dGold = v0 => { if (v0 == null || isNaN(v0)) return el('span', 'mk-ch mk-ref', '–'); const v = v0 / 10; return !v ? el('span', 'mk-ch mk-ref', '0') : el('span', 'mk-ch ' + mkDir(v), (v > 0 ? '▲ ' : '▼ ') + (Math.abs(v) >= 1e6 ? (Math.abs(v) / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + 'tr' : Math.round(Math.abs(v) / 1e3).toLocaleString('vi-VN') + 'k')); };
  // 1.10.63 cột tên: tên đậm + dòng phụ nhỏ (kiểu bảng giá)
  // 1.10.86 cột % chung cho 3 mục: ▲/▼ + 2 số lẻ, đứng giá = 0,00%
  const pctCell = v => { v = Number(v) || 0; const d = mkDir(+v.toFixed(2)); return el('span', 'mk-ch ' + d, (d === 'mk-up' ? '▲ ' : d === 'mk-dn' ? '▼ ' : '') + Math.abs(v).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'); };
  const unitCell = t => el('span', 'gu', t);
  const mkNm = (t, sub) => { const c = el('div', 'mk-nm'); c.append(el('b', '', t)); if (sub) c.append(el('small', '', sub)); return c; };
  function goldBlock() {
    const B = el('div', 'gold');
    const hd = el('div', 'g-row g-hd'); hd.append(el('span', '', 'Vàng'), el('span', '', 'Đơn vị'), el('span', '', 'Mua'), el('span', '', 'Bán'), el('span', '', '%'), el('span', '', '')); B.append(hd);
    // lãi/lỗ vàng trong nước tính theo giá tiệm MUA VÀO (giá bán lại được)
    const gCur = k => { const x = gold && gold[k.slice(3)]; return x && x.buy ? x.buy / 1e7 : 0; };
    const row = (name, sub, x, k) => {
      const d = x && x.sell ? mkDir(x.dSell) : '';
      const r = el('div', 'g-row mk-r ' + d); r.append(mkNm(name, sub), unitCell('tr/chỉ'));
      if (x && x.sell) r.append(el('span', 'gp ' + d, trieu(x.buy)), el('span', 'gp ' + d, trieu(x.sell)), pctCell(x.dSell && x.sell - x.dSell ? x.dSell / (x.sell - x.dSell) * 100 : 0));
      else r.append(el('span', 'gp', '…'), el('span', 'gp', '…'), el('span', 'gd', ''));
      r.append(holdAdd(k));
      B.append(r, holdLine(k, gCur(k)));
      if (holdEdit === k) B.append(holdEditor(k));
    };
    row('SJC', 'Vàng miếng', gold && gold.sjc, 'gd:sjc'); row('Nhẫn 9999', 'Nhẫn trơn', gold && gold.nhan, 'gd:nhan');
    const x = gold && gold.xau, xd = x && x.price ? mkDir(+(+x.change || 0).toFixed(2)) : '';
    const w = el('div', 'g-row g-w mk-r ' + xd); w.append(mkNm('Thế giới', 'XAU'), unitCell('USDT'));
    if (x && x.price) { const px = Math.round(x.price).toLocaleString('vi-VN'); w.append(el('span', 'gp ' + xd, px), el('span', 'gp ' + xd, px), pctCell(x.change)); }
    else w.append(el('span', 'gp', '…'), el('span', 'gp', '…'), el('span', 'gd', ''));
    w.append(holdAdd('gd:xau'));
    B.append(w, holdLine('gd:xau', x && x.price));
    if (holdEdit === 'gd:xau') B.append(holdEditor('gd:xau'));
    { const tot = goldTotal(gCur, x); if (tot) B.append(tot); }   // 1.10.93: Tổng vốn gồm SJC + Nhẫn + Thế giới (quy ra chỉ & triệu đồng)   // tổng vốn / lãi: dưới cùng, nổi bật
    const t = gold && gold.at ? new Date(gold.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
    const ft = el('div', 'g-ft', gold && gold.error && !gold.sjc ? '⚠ Chưa lấy được giá vàng, thử lại sau' : `Cập nhật ${t} · ${gold && gold.src || 'SJC'} · PAXG`);
    const rf = el('button', 'g-rf', '↻'); rf.title = 'Lấy giá mới'; rf.addEventListener('click', () => { rf.disabled = true; loadGold(true); });
    ft.append(rf); B.append(ft);
    return B;
  }
  // 💼 Giá mua của người dùng → lãi/lỗ. Lưu trong Chrome (holdings), không gửi đi đâu.
  //  Mỗi món có nhiều lần mua (lots); dòng chính tự tính giá trung bình.
  //  key: cg:bitcoin / dx:… (crypto, $) · gd:sjc, gd:nhan (triệu/chỉ, số chỉ hoặc lượng) · gd:xau (USDT, chỉ giá) · st:FPT (nghìn đ/cổ, số cổ)
  let holdings = {}, holdEdit = null;
  function holdTyping() { const ae = ui && ui.root.activeElement; return !!(ae && ae.classList && ae.classList.contains('hold-in')); }   // đang gõ giá mua: giá mới về thì chưa vẽ lại
  const nf = (v, d = 2) => Number(v).toLocaleString('vi-VN', { maximumFractionDigits: d });
  const saveHold = () => chrome.storage.local.set({ holdings });
  const KIND = k => k.startsWith('gd:xau') ? 'xau' : k.startsWith('gd:') ? 'gold' : k.startsWith('st:') ? 'stock' : 'crypto';
  const lotsOf = k => { const h = holdings[k]; if (!h) return []; if (Array.isArray(h.lots)) return h.lots; return h.buy > 0 ? [{ buy: h.buy, qty: h.qty || 0 }] : []; };
  // giá trung bình + tổng số lượng (có số lượng thì bình quân gia quyền, không thì trung bình cộng)
  function avgOf(k) {
    const L = lotsOf(k).filter(x => x.buy > 0); if (!L.length) return null;
    const qty = L.reduce((s, x) => s + (x.qty > 0 ? x.qty : 0), 0);
    const buy = L.every(x => x.qty > 0) && qty ? L.reduce((s, x) => s + x.buy * x.qty, 0) / qty : L.reduce((s, x) => s + x.buy, 0) / L.length;
    return { buy, qty, n: L.length, u: (holdings[k] || {}).u || 'chi' };
  }
  // { cost, val, pnl, pct, unit } theo đơn vị của mục; pnl = null khi chưa có số lượng (chỉ tính %)
  function pnlOf(k, cur) {
    const a = avgOf(k); if (!a || !(cur > 0)) return null;
    const kind = KIND(k), pct = (cur / a.buy - 1) * 100;
    const qty = kind === 'gold' ? a.qty * (a.u === 'luong' ? 10 : 1) : a.qty;   // vàng: quy hết ra chỉ
    if (!(qty > 0)) return { pct, pnl: null };
    const cost = a.buy * qty, val = cur * qty;
    return { cost, val, pnl: val - cost, pct, unit: kind === 'crypto' ? '$' : kind === 'gold' ? 'tr' : kind === 'xau' ? 'USDT' : 'k' };
  }
  const money = (v, unit) => unit === '$' ? nf(v) + '$' : unit === 'tr' ? (Math.abs(v) < 1 ? nf(v * 1000, 0) + ' nghìn' : nf(v, 2) + ' triệu') : unit === 'k' ? (Math.abs(v) >= 1000 ? nf(v / 1000, 2) + ' triệu' : nf(v, 1) + ' nghìn') : nf(v) + ' ' + unit;
  const sign = v => (v > 0 ? '+' : '');
  const priceTxt = (k, v) => { const kind = KIND(k); return kind === 'crypto' ? nf(v, v < 1 ? 8 : 2) + '$' : kind === 'gold' ? nf(v) + ' tr' : kind === 'xau' ? nf(v, 0) + ' USDT' : nf(v) + 'k'; };
  const qtyTxt = (k, q, sym) => { const kind = KIND(k), u = (holdings[k] || {}).u; return kind === 'crypto' ? nf(q, 8) + (sym ? ' ' + sym : '') : kind === 'gold' ? nf(q) + (u === 'luong' ? ' lượng' : ' chỉ') : kind === 'stock' ? nf(q, 0) + ' cổ' : kind === 'xau' ? nf(q) + ' XAU' : ''; };
  // dòng nhỏ dưới mỗi món: "Mua 95.000$ · 0,05 BTC → +1.170$ (+24,6%)"; nhiều lần mua thì "Giá TB …"; bấm để mở/sửa
  // 1.10.65 nút ＋ cuối dòng: thêm giá mua để xem lãi/lỗ (đã có giá mua thì để trống, dòng lãi/lỗ hiện bên dưới)
  function holdAdd(k) {
    if (avgOf(k)) return el('span', '');
    const b = el('button', 'mk-add' + (holdEdit === k ? ' on' : ''), holdEdit === k ? '−' : '＋');
    b.title = 'Nhập giá mua để xem lãi/lỗ'; b.setAttribute('aria-label', 'Nhập giá mua để xem lãi/lỗ');
    b.addEventListener('click', () => { holdEdit = holdEdit === k ? null : k; renderPanel(); });
    return b;
  }
  function holdLine(k, cur, sym) {
    const a = avgOf(k), p = pnlOf(k, cur);
    if (!a) return document.createComment('');   // 1.10.65: chưa nhập giá mua → không hiện dòng, dùng nút ＋ cuối dòng
    // 1.10.89: dòng giá mua xếp đúng cột của bảng: Mua/TB · số lượng | đơn vị | giá mua | giá bán ra (giá hiện tại) / lãi lỗ | % lợi nhuận | 🔒
    const kind = KIND(k);
    const locked = (holdings[k] || {}).locked !== false && holdEdit !== k;
    const cls = kind === 'stock' ? 'stk' : kind === 'crypto' ? 'cry' : 'g-row';
    const R = el('div', cls + ' hold-row' + (locked ? ' locked' : ''));
    const pf = v => !(v > 0) ? '…' : kind === 'gold' ? v.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : kind === 'xau' ? nf(v, 0) : kind === 'stock' ? kd(v) : fmt(v);
    const lab = (a.n > 1 ? 'TB' : 'Mua') + (a.qty > 0 ? ' · ' + qtyTxt(k, a.qty, sym) : '');
    const L = el('span', 'hr-lab', lab); L.title = `${a.n} lần mua · bấm 🔒 để mở khoá rồi sửa`;
    const unit = { gold: 'tr/chỉ', xau: 'USDT', stock: 'nghìn', crypto: 'USD' }[kind];
    const pc = p ? pctCell(p.pct) : el('span', 'mk-ch mk-ref', '…');
    if (p && p.pnl != null) pc.title = `${p.pnl >= 0 ? 'Lãi' : 'Lỗ'} ${sign(p.pnl)}${money(p.pnl, p.unit)}`;
    const lk = el('button', 'hold-lk', locked ? '🔒' : '🔓');
    lk.title = locked ? 'Đang khoá · bấm để mở khoá và sửa' : 'Bấm để khoá lại';
    lk.setAttribute('aria-label', locked ? 'Mở khoá để sửa giá mua' : 'Khoá giá mua');
    lk.addEventListener('click', e => {
      e.stopPropagation();
      if (locked) { holdings[k] = { ...(holdings[k] || {}), locked: false }; holdEdit = k; }
      else { holdings[k] = { ...(holdings[k] || {}), locked: true }; holdEdit = null; }
      saveHold(); renderPanel();
    });
    const amt = p && p.pnl != null ? el('span', 'hr-v ' + (p.pnl >= 0 ? 'mk-up' : 'mk-dn'), sign(p.pnl) + money(p.pnl, p.unit).replace(' triệu', 'tr').replace(' nghìn', 'k')) : el('span', 'hr-v', '');
    void amt;   // 1.10.96: 3 mục chung cột như Vàng (tiền lãi/lỗ xem ở tooltip %)
    R.append(L, unitCell(unit), el('span', 'hr-v', pf(a.buy)), el('span', 'hr-v', ''), pc, lk);   // 1.10.91: đang giữ (chỉ mua) → cột Bán để trống; khi có lệnh bán mới hiện
    R.addEventListener('click', () => {
      if (locked) { lk.classList.remove('nudge'); void lk.offsetWidth; lk.classList.add('nudge'); return; }
      holdEdit = holdEdit === k ? null : k; renderPanel();
    });
    return R;
  }
  // bảng các lần mua + ô thêm lần mua mới; thêm xong dòng chính tự cập nhật giá trung bình
  // 1.10.73 ngày mua: lưu 'YYYY-MM-DD', hiện dd/mm/yy; ô nhập nhận d/m, d/m/yy, d/m/yyyy (trống = không ghi ngày)
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : ''; };
  const parseDmy = t => {
    t = String(t || '').trim(); if (!t) return '';
    const m = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?$/.exec(t); if (!m) return null;
    const now = new Date(), y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : now.getFullYear(), mo = +m[2], d = +m[1];
    const dt = new Date(y, mo - 1, d); if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  function holdEditor(k, sym) {
    const kind = KIND(k), L = lotsOf(k);
    const lab = { crypto: ['Giá mua ($)', 'Số coin'], gold: ['Giá mua', 'Số lượng'], xau: ['Giá mua', 'Số XAU'], stock: ['Giá mua', 'Số cổ'] }[kind];
    const E = el('div', 'hold-ed');
    L.forEach((x, i) => {
      const r = el('div', 'hold-lot');
      r.append(el('span', '', `Lần ${i + 1}: ${priceTxt(k, x.buy)}${x.qty > 0 ? ' · ' + qtyTxt(k, x.qty, sym) : ''}${x.date ? ' · ' + dmy(x.date) : ''}`));
      const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Xoá lần mua ' + (i + 1));
      del.addEventListener('click', () => { const nl = L.filter((_, j) => j !== i); if (nl.length) holdings[k] = { ...(holdings[k] || {}), lots: nl }; else delete holdings[k]; delete (holdings[k] || {}).buy; delete (holdings[k] || {}).qty; saveHold(); renderPanel(); });
      r.append(del); E.append(r);
    });
    const row = el('div', 'hold-add');
    const b = document.createElement('input'); b.type = 'number'; b.step = 'any'; b.min = '0'; b.className = 'hold-in'; b.placeholder = lab[0]; b.setAttribute('aria-label', lab[0]);
    row.append(b);
    let q = null, u = null;
    if (lab[1]) {
      q = document.createElement('input'); q.type = 'number'; q.step = 'any'; q.min = '0'; q.className = 'hold-in'; q.placeholder = lab[1]; q.setAttribute('aria-label', lab[1]);
      row.append(q);
      if (kind === 'gold') { u = document.createElement('select'); u.className = 'hold-u'; u.innerHTML = '<option value="chi">chỉ</option><option value="luong">lượng</option>'; u.value = (holdings[k] || {}).u || 'chi'; if (L.length) u.disabled = true; row.append(u); }
    }
    const dIn = document.createElement('input'); dIn.type = 'text'; dIn.inputMode = 'numeric'; dIn.className = 'hold-in hold-dt'; dIn.placeholder = 'dd/mm/yy'; dIn.title = 'Ngày mua (dd/mm/yy)'; dIn.setAttribute('aria-label', 'Ngày mua');
    { const n = new Date(); dIn.value = dmy(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`); }
    dIn.addEventListener('input', () => dIn.classList.remove('bad'));
    row.append(dIn);
    const add = el('button', 'b', L.length ? '＋' : 'Lưu'); add.title = L.length ? 'Thêm lần mua' : 'Lưu'; add.setAttribute('aria-label', add.title);
    const save = () => {
      const buy = Number(b.value); if (!(buy > 0)) return b.focus();
      const date = parseDmy(dIn.value); if (date === null) { dIn.classList.add('bad'); return dIn.focus(); }
      const lot = { buy, ...(q && Number(q.value) > 0 ? { qty: Number(q.value) } : {}), ...(date ? { date } : {}) };
      holdings[k] = { lots: [...L, lot], ...(u ? { u: u.value } : {}) };
      saveHold(); b.blur(); renderPanel();
    };
    add.addEventListener('click', save);
    [b, q, dIn].forEach(x => x && x.addEventListener('keydown', e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { holdEdit = null; x.blur(); renderPanel(); } }));
    row.append(add); E.append(row);
    const done = el('button', 'hold-done', 'Xong 🔒'); done.addEventListener('click', () => { if (holdings[k]) { holdings[k].locked = true; saveHold(); } holdEdit = null; renderPanel(); });
    done.textContent = '🔒'; done.title = 'Xong · khoá lại'; done.setAttribute('aria-label', 'Xong, khoá giá mua'); row.append(done);   // 1.10.71: gộp vào cùng hàng cho gọn
    setTimeout(() => b.focus(), 0);
    return E;
  }
  // dòng tổng đầu mục: chỉ cộng món có đủ giá mua + số lượng
  // 1.10.93 dòng Tổng vốn vàng: Tổng · số chỉ (tràn qua cột đơn vị) | Mua = tổng tiền vốn (triệu) | Bán = tiền lời/lỗ | %
  function goldTotal(gCur, x) {
    let cost = 0, val = 0, chi = 0, n = 0, xauSkip = false;
    for (const k of ['gd:sjc', 'gd:nhan']) { const a = avgOf(k), p = pnlOf(k, gCur(k)); if (a && p && p.cost != null) { cost += p.cost; val += p.val; chi += a.qty * (a.u === 'luong' ? 10 : 1); n++; } }
    { const a = avgOf('gd:xau'), p = pnlOf('gd:xau', x && x.price); const r = x && x.vnd;
      if (a && p && p.cost != null) { if (r) { cost += p.cost * r / 1e6; val += p.val * r / 1e6; chi += a.qty * 31.1035 / 3.75; n++; } else xauSkip = true; } }
    if (!n) return null;
    const pnl = val - cost, pct = cost ? pnl / cost * 100 : 0;
    const f2 = v => v.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const T = el('div', 'g-row hold-row tot-row');
    T.title = `Vốn ${f2(cost)} tr · Hiện ${f2(val)} tr · ${pnl >= 0 ? 'Lãi' : 'Lỗ'} ${sign(pnl)}${f2(pnl)} tr` + (x && x.vnd ? ` · Thế giới quy đổi 1 oz = 8,29 chỉ, 1 USDT = ${Math.round(x.vnd).toLocaleString('vi-VN')} đ` : '') + (xauSkip ? ' · chưa có tỷ giá để cộng vàng thế giới' : '');
    // 1.10.101: 2 dòng như SJC/Nhẫn: "Tổng vốn 37tr" / "3 chỉ" | Mua = tiền hiện tại | Bán = lời/lỗ | %
    const lab = mkNm('Tổng vốn', `${nf(cost, 2)}tr · ${nf(chi, 2)} chỉ`); lab.classList.add('tot-lab');
    T.append(lab, el('span', 'hr-v ' + (pnl >= 0 ? 'mk-up' : 'mk-dn'), f2(val)), el('span', 'hr-v ' + (pnl >= 0 ? 'mk-up' : 'mk-dn'), sign(pnl) + f2(pnl)), pctCell(pct), el('span', ''));
    return T;
  }
  function holdTotal(keys, curOf, unit) {
    let cost = 0, val = 0, n = 0;
    for (const k of keys) { const p = pnlOf(k, curOf(k)); if (p && p.cost != null && p.unit === unit) { cost += p.cost; val += p.val; n++; } }
    if (!n) return null;
    const pnl = val - cost, pct = cost ? pnl / cost * 100 : 0;
    // 1.10.92: dòng Tổng xếp đúng cột như dòng giá mua: Tổng | đơn vị | vốn (cột Mua) | (CK: lãi/lỗ ở cột ±) | % lợi nhuận
    const sm = v => money(v, unit).replace(' triệu', 'tr').replace(' nghìn', 'k');
    const kind = unit === 'tr' ? 'gold' : unit === 'k' ? 'stock' : 'crypto';
    const T = el('div', (kind === 'stock' ? 'stk' : kind === 'crypto' ? 'cry' : 'g-row') + ' hold-row tot-row');
    T.title = `Vốn ${sm(cost)} · Hiện ${sm(val)} · ${pnl >= 0 ? 'Lãi' : 'Lỗ'} ${sign(pnl)}${sm(pnl)}`;
    const v = kind === 'gold' ? cost.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : kind === 'stock' ? nf(cost, 1) : fmt(cost);
    // 1.10.96: giống Vàng – "Tổng vốn · N cổ" | Mua = tổng tiền vốn | Bán = tiền lời/lỗ | %
    let qn = 0; if (kind === 'stock') for (const k of keys) { const a = avgOf(k); if (a && a.qty > 0) qn += a.qty; }
    const vNow = kind === 'gold' ? val.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : kind === 'stock' ? sm(val) : fmt(val);   // CK: cùng đơn vị với Vốn (k / tr)
    const L = mkNm('Tổng vốn', sm(cost) + (qn ? ` · ${nf(qn, 0)} cổ` : '')); L.classList.add('tot-lab'); void v;
    const C = el('span', 'hr-v ' + (pnl >= 0 ? 'mk-up' : 'mk-dn'), vNow), P = pctCell(pct);   // 1.10.104: tiền hiện tại xanh khi ≥ vốn, đỏ khi dưới vốn   // 1.10.101: cột Mua = tiền hiện tại
    const amt = el('span', 'hr-v ' + (pnl >= 0 ? 'mk-up' : 'mk-dn'), kind === 'stock' ? sign(pnl) + sm(pnl) : (pnl < 0 ? '−' : '+') + fmt(Math.abs(pnl)));
    T.append(L, C, amt, P, el('span', ''));
    return T;
  }

  // 🛡️ Bong bóng báo đã chặn quảng cáo: mỗi trang tối đa 1 lần / 30 phút (đóng tab tự bật thì báo lại sau 2 phút)
  let adToastAt = 0, adToastN = 0, adToastTimer = 0, adToastKind = 'page';
  function adToast() {
    if (!ui || !HOST || settings.adBlock === false || /(^|\.)(shopee\.vn|tiktok\.com|collshp\.com)$/.test(HOST) || HT.adSkipHit(HOST, settings)) return;
    const now = Date.now(), kind = adToastKind, n = adToastN; adToastN = 0; adToastKind = 'page';
    let last = 0; try { last = Number(sessionStorage.getItem('hh-adtoast')) || 0; } catch {}
    if (now - Math.max(last, adToastAt) < (kind === 'pop' ? 120000 : 1800000)) return;
    if (kind === 'page' && n < 2) return;   // 1 ô lẻ thì thôi, khỏi làm phiền
    adToastAt = now; try { sessionStorage.setItem('hh-adtoast', String(now)); } catch {}
    toolsSub = 'adblock';
    // câu nói dễ thương, hài hài, đổi ngẫu nhiên mỗi lần
    const LINES = {
      page: [`Hehe, HaoHao vừa dọn sạch ${n} quảng cáo rồi, xem phim thôi nào! 🍿`, `${n} quảng cáo bị HaoHao gặm sạch 🐹 Bạn cứ thong thả xem nhé!`,
             `${n} quảng cáo xin phép biến mất! Màn hình sạch bong rồi nè ✨`, `HaoHao đứng gác rồi, quảng cáo không lọt vào đâu, yên tâm xem nha! 💪`],
      pop: ['Có tab lạ định chen vào, HaoHao đá văng rồi! 🦶 Xem tiếp nhé', 'Tab cờ bạc vừa ló mặt là bị HaoHao đóng cửa luôn 🚪😤',
            'Hù! Tab quảng cáo bị HaoHao bắt quả tang và đóng rồi nha 🕵️'],
      video: ['Quảng cáo video hả? HaoHao tua vèo một cái là xong ⏩😎', 'HaoHao bỏ qua quảng cáo giúp bạn rồi, vào phim luôn thôi! 🎬',
              'Nhanh như sóc! Quảng cáo đã bị skip 🐹💨']
    };
    const L = LINES[kind === 'yt' ? 'video' : kind] || LINES.page, msg = L[Math.floor(Math.random() * L.length)];
    say(msg, 'happy', '🛡️ HAOHAO GÁC CỔNG', 'tools');
  }
  chrome.runtime.onMessage.addListener(m => {
    if (!m || m.type !== 'hh-ad-toast') return;
    if (m.kind === 'pop' || m.kind === 'yt' || m.kind === 'video') adToastKind = m.kind;
    adToastN = Math.max(adToastN, m.n || 0);
    clearTimeout(adToastTimer); adToastTimer = setTimeout(adToast, m.kind === 'pop' ? 300 : 2000);
  });

  // 📊 Thị trường: 3 mục con Crypto · Vàng · Chứng khoán
  let mktSub = 'gold';   // mở lên mặc định mục Vàng
  function renderCrypto(V) {
    const tb = el('div', 'mkt-tabs');
    if (tab === 'market') tb.style.marginTop = '10px';
    [['gold', '🥇 Vàng'], ['stock', '📈 Chứng khoán'], ['crypto', '🪙 Crypto']].forEach(([id, t]) => {
      const b = el('button', 'mkt-t' + (mktSub === id ? ' on' : ''), t); b.setAttribute('aria-pressed', mktSub === id);
      b.addEventListener('click', () => { mktSub = id; if (id === 'gold') loadGold(); if (id === 'stock') loadStocks(); renderPanel(); });
      tb.append(b);
    });
    V.append(tb);
    if (mktSub === 'gold') {
      if (!gold) loadGold(); const gb = goldBlock(); V.append(gb);
      const gl = el('div', 'body-list'); mktAlerts(gl, 'gold', [{ coin: 'sjc', label: '🥇 SJC' }, { coin: 'nhan', label: '💍 Nhẫn 9999' }, { coin: 'xau', label: '🌎 Thế giới' }]);
      { const ft = gb.querySelector('.g-ft'); if (ft) ft.remove(); gb.append(...gl.childNodes); if (ft) { ft.classList.add('g-ft-end'); gb.append(ft); } }   // 1.10.81: Cảnh báo + dòng cập nhật nhỏ đều nằm gọn trong thẻ
      return;
    }
    if (mktSub === 'stock') { renderStock(V); return; }
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

    const list = el('div', 'body-list mk-list');
    const ab = alertBlock('tools'); if (ab) list.append(ab);
    if (watch.length) { const ch = el('div', 'cry cry-hd2'); ch.append(el('span', '', 'Coin'), el('span', '', 'Đơn vị'), el('span', '', 'Mua'), el('span', '', 'Bán'), el('span', '', '% 24h'), el('span', '', '')); list.append(ch); }
    if (!watch.length) list.append(el('div', 'empty', 'Nhập ký hiệu coin (vd: BTC, ETH, SOL) hoặc dán địa chỉ token meme để theo dõi giá.'));
    for (const w of watch) {
      const q = quotes[qKey(w)];
      const d = q && !q.error ? mkDir(+(+q.change || 0).toFixed(1)) : '';
      const row = el('div', 'cry mk-r ' + d);
      const sym = el('span', 'sym', coinSym(w, q));
      sym.title = w.source === 'dexscreener' ? 'DexScreener · ' + w.coin : 'CoinGecko · ' + w.coin;
      const nmc = el('span', 'nmc'); nmc.append(sym); row.append(nmc, unitCell('USD'));
      if (q && !q.error) {
        row.append(el('span', 'px ' + d, fmt(q.price)), el('span', 'px ' + d, fmt(q.price)));
        row.append(pctCell(q.change));
      } else row.append(el('span', 'err2', q ? q.error : 'đang lấy giá…'));
      const del = el('button', 'ic', '✕'); del.setAttribute('aria-label', 'Bỏ theo dõi');
      del.addEventListener('click', () => { watch = watch.filter(x => x !== w); chrome.storage.local.set({ watch }); renderPanel(); });
      nmc.append(del); row.append(holdAdd(qKey(w))); list.append(row, holdLine(qKey(w), q && !q.error && q.price, coinSym(w, q)));
      if (holdEdit === qKey(w)) list.append(holdEditor(qKey(w), coinSym(w, q)));
    }
    { const tot = holdTotal(watch.map(qKey), k => { const q = quotes[k]; return q && !q.error && q.price; }, '$'); if (tot) list.append(tot); }

    // cảnh báo giá: thu gọn thành 1 dòng, bấm mới mở
    const pr = rules.filter(r => r.type === 'price' && !HT.isMkt(r));
    if (alertHead(list, pr, 'crypto')) {
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
    list.append(el('div', 'g-ft g-ft-end', 'Cập nhật mỗi phút · CoinGecko'));
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
  if (location.protocol === 'chrome-extension:') window.addEventListener('hh-open', e => { const t = (e.detail || {}).tab; if (t === 'todo' || t === 'bell') { if (ui) openTab(t, true); return; } setMini(false); onOpen({ type: 'hh-open', ...(e.detail || {}) }); });

  // ---------- nhận tin từ background ----------
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type !== 'prod-progress' || !prodChecking) return;
    prodChecking = msg.i + '/' + msg.n; if (ui && !ui.panel.hidden && tab === 'shop') renderPanel();
  });
  chrome.runtime.onMessage.addListener(msg => { (async () => {
    if (msg.type !== 'shop-hit' || !active()) return;
    const { products: ps = [] } = await chrome.storage.local.get('products'); products = ps;
    const it = products.find(x => x.id === msg.id); if (!it) return;
    chime();
    if (tab === 'shop' && ui && !ui.panel.hidden) { renderPanel(); return; }   // đang xem bảng Mua sắm: chỉ cập nhật, không bật bong bóng che bảng
    shopAlert = true; updateBadge();
    say(`${it.title.slice(0, 60)} còn ${vnd(it.price)}`, 'alert', '🛒 GIẢM GIÁ RỒI!', 'shop', buyActs(it));
  })(); });
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type !== 'ht-alert' || !active()) return;
    if (msg.kind === 'price') { toolsSub = 'crypto'; mktSub = /triệu\/(lượng|chỉ)|\d USD/.test(msg.text || '') ? 'gold' : /nghìn đ/.test(msg.text || '') ? 'stock' : 'crypto'; }
    const t = msg.kind === 'price' ? (lay().market === 'out' ? 'market' : 'tools') : (msg.kind === 'reminder' || msg.kind === 'mail') ? 'bell' : msg.kind === 'pomo' ? 'focus' : 'todo';
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
  // 🎵 Thanh nhạc mini trên đầu hamster: chỉ hiện khi đang có nhạc nền và HaoHao rảnh (bảng, menu, bong bóng đều đóng)
  let musSig = '';
  function musBar() {
    if (!ui || !ui.mus) return;
    const c = settings.pomo || {}, k = c.music || '';
    const t = k.startsWith('f:') && [...HT.BUILTIN_MUSIC, ...((couponFeed || {}).music || [])].find(x => 'f:' + x.id === k);
    const show = !!t && ui.panel.hidden && ui.bubble.hidden && !menuOpen;
    const sig = show ? [k, !!c.mpause, !ui.pill.hidden].join('|') : '';
    if (sig === musSig) return; musSig = sig;
    const B = ui.mus; B.hidden = !show; if (!show) return;
    B.className = 'mus-bar' + (c.mpause ? ' pz' : '') + (!ui.pill.hidden ? ' up' : '');
    B.innerHTML = '';
    const eq = el('span', 'eq'); eq.append(el('i'), el('i'), el('i')); eq.setAttribute('aria-hidden', 'true');
    const nm = el('button', 'mn', t.name); nm.title = 'Mở phần Nhạc nền: đổi bài, chỉnh âm lượng';
    nm.addEventListener('click', e => { e.stopPropagation(); openTab('focus'); });
    const save = patch => chrome.storage.local.get('settings').then(({ settings: s0 = {} }) => { const pomo = { ...(s0.pomo || {}), ...patch }; settings.pomo = pomo; return chrome.storage.local.set({ settings: { ...s0, pomo } }); });
    const pz = el('button', 'mb'); pz.innerHTML = c.mpause ? '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" fill="#fff"/></svg>' : '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1" width="2.5" height="8" rx=".6" fill="#fff"/><rect x="6" y="1" width="2.5" height="8" rx=".6" fill="#fff"/></svg>'; pz.title = c.mpause ? 'Phát tiếp' : 'Tạm dừng'; pz.setAttribute('aria-label', pz.title);
    pz.addEventListener('click', e => { e.stopPropagation(); save({ mpause: !c.mpause }).then(musBar); });
    const x = el('button', 'mb', '✕'); x.title = 'Tắt nhạc nền'; x.setAttribute('aria-label', 'Tắt nhạc nền');
    x.addEventListener('click', e => { e.stopPropagation(); save({ music: '', mpause: false }).then(musBar); chrome.runtime.sendMessage({ type: 'music-preview', kind: '' }).catch(() => {}); });
    B.append(eq, nm, pz, x);
    const r = B.getBoundingClientRect();
    if (r.right > innerWidth - 6) B.classList.add('ar'); else if (r.left < 6) B.classList.add('al');
  }
  setInterval(musBar, 700);
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
      const c = ui.view.querySelector('.pomo .clock'), arc = ui.view.querySelector('.pomo .ring .arc');
      if (c) c.textContent = mmss(pomoLeft());
      if (arc && pomo.total) arc.setAttribute('stroke-dashoffset', RING * (pomoLeft() / pomo.total));
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
  // vòng tiến độ: R = 70 → chu vi ≈ 439.8
  const RING = 2 * Math.PI * 70;
  const ringSvg = pct => `<svg class="ring" viewBox="0 0 160 160" aria-hidden="true"><circle class="trk" cx="80" cy="80" r="70"/><circle class="arc" cx="80" cy="80" r="70" stroke-dasharray="${RING}" stroke-dashoffset="${RING * (1 - Math.min(1, Math.max(0, pct)))}"/></svg>`;
  function pomoCard() {
    const cfg = { focus: 25, brk: 5, lng: 15, ...(settings.pomo || {}) };
    // đọc bản mới nhất trong máy rồi mới ghi: không đè mất nhạc vừa thêm (nền lưu) hay cài đặt khác
    const saveP = patch => chrome.storage.local.get('settings').then(({ settings: s0 = {} }) => { const pomo = { ...(s0.pomo || {}), ...patch }; settings.pomo = pomo; return chrome.storage.local.set({ settings: { ...s0, pomo } }); });
    const n = pomoToday();
    const on = pomoActive(), focus = on && pomo.phase === 'focus';
    const box = el('div', 'pomo p2' + (on && !focus ? ' brk' : '') + (on && pomo.paused ? ' pz' : ''));
    // thanh trên: tên chế độ + bánh răng
    const hd = el('div', 'p2hd');
    hd.append(el('span', 'p2tag', !on ? 'Pomodoro' : focus ? 'Đang tập trung' : pomo.phase === 'long' ? 'Nghỉ dài' : 'Nghỉ giải lao'));
    const gear = el('button', 'p2ic', '⚙'); gear.title = 'Tuỳ chỉnh giờ nghỉ, trang xao nhãng'; gear.setAttribute('aria-label', 'Tuỳ chỉnh Pomodoro');
    gear.addEventListener('click', () => { pomoCfgOpen = !pomoCfgOpen; renderPanel(); });
    hd.append(gear); box.append(hd);
    // vòng đồng hồ
    let total = cfg.focus * 60000;
    if (on) { total = (focus ? (pomo.focusMin || cfg.focus) : pomo.phase === 'long' ? cfg.lng : cfg.brk) * 60000; pomo.total = total; }
    const dial = el('div', 'dial');
    dial.innerHTML = ringSvg(on ? 1 - pomoLeft() / total : 0);
    const mid = el('div', 'mid');
    mid.append(el('div', 'clock', on ? mmss(pomoLeft()) : `${cfg.focus}:00`));
    mid.append(el('div', 'sub', !on ? 'Sẵn sàng' : pomo.paused ? 'Tạm dừng' : focus ? `Phiên ${(pomo.round || 0) + 1}` : 'Thư giãn mắt'));
    dial.append(mid); box.append(dial);
    if (on && focus && pomo.task) box.append(el('div', 'p2task', pomo.task));
    // chọn thời lượng (chỉ khi chưa chạy)
    if (!on) {
      const seg = el('div', 'p2seg'); seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Thời lượng');
      [25, 45, 60].forEach(m => {
        const sel = Number(cfg.focus) === m;
        const c = el('button', sel ? 'on' : '', m + ' phút'); c.setAttribute('role', 'radio'); c.setAttribute('aria-checked', sel);
        c.addEventListener('click', () => saveP({ focus: m }));
        seg.append(c);
      });
      box.append(seg);
    }
    // nút điều khiển
    const ctl = el('div', 'p2ctl');
    if (!on) { const go = el('button', 'p2go', '▶ Bắt đầu'); go.addEventListener('click', () => pomoSend('pomo-start', { task: '' })); ctl.append(go); }
    else {
      if (pomo.paused) { const b = el('button', 'p2go', '▶ Tiếp tục'); b.addEventListener('click', () => pomoSend('pomo-resume')); ctl.append(b); }
      else { const b = el('button', 'p2go soft', '⏸ Tạm dừng'); b.addEventListener('click', () => pomoSend('pomo-pause')); ctl.append(b); }
      if (!focus) { const sk = el('button', 'p2ic', '⏭'); sk.title = 'Bỏ qua nghỉ'; sk.setAttribute('aria-label', 'Bỏ qua nghỉ'); sk.addEventListener('click', () => pomoSend('pomo-skip')); ctl.append(sk); }
      const stp = el('button', 'p2ic', '⏹'); stp.title = 'Dừng'; stp.setAttribute('aria-label', 'Dừng'); stp.addEventListener('click', () => pomoSend('pomo-stop')); ctl.append(stp);
    }
    box.append(ctl);
    // 🎵 nhạc nền: 5 bản dựng sẵn + nhạc của bạn (link YouTube hoặc .mp3)
    const tracks = [];   // đã bỏ "Nhạc của bạn" (tự dán link YouTube): chỉ dùng nhạc HaoHao chọn sẵn
    let mus = cfg.music || ''; const vol = cfg.vol ?? 0.5;
    const feedMus = [...HT.BUILTIN_MUSIC, ...((couponFeed || {}).music || [])];
    if (mus.startsWith('u:') && !tracks.some(t => 'u:' + t.id === mus)) mus = '';
    if (mus.startsWith('f:') && !feedMus.some(t => 'f:' + t.id === mus)) mus = '';
    if (mus && !/^[uf]:/.test(mus)) mus = '';   // đã bỏ âm thanh dựng sẵn (piano, mưa…): coi như tắt
    const playing = !!mus;   // nhạc nền chạy độc lập với Pomodoro
    const pickMus = k => { saveP({ music: k, mpause: false }); pomoSend('music-preview', { kind: k, vol }); };
    const mb = el('div', 'p2mus');
    const mh = el('div', 'mh'); mh.append(el('span', 'lb', '🎵 Nhạc nền'));
    mh.append(el('span', 'mhint', !mus ? '🎧 HaoHao gợi ý · bấm để phát' : cfg.mpause ? '⏸ Đang tạm dừng' : '🎧 Đang phát'));
    mb.append(mh);
    const chip = (k, lb, cls = '') => {
      const c = el('button', 'mc ' + cls + (mus === k ? ' on' : '') + (k && mus === k && playing ? ' play' : ''), lb);
      c.setAttribute('aria-pressed', mus === k); c.addEventListener('click', () => pickMus(k)); return c;
    };
    // 🎧 HaoHao gợi ý (chủ app chọn, cập nhật từ xa): người dùng tự bấm mới phát
    const fl = el('div', 'ml'); fl.append(chip('', 'Tắt'));   // 1 hàng gọn: Tắt + các bản nhạc (nhiều bản thì vuốt ngang; tên dài cắt …, rê chuột xem đủ tên)
    fl.addEventListener('wheel', e => { if (fl.scrollWidth > fl.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); fl.scrollLeft += e.deltaY; } }, { passive: false });
    if (feedMus.length) {
      feedMus.forEach(t => { const c = chip('f:' + t.id, t.name, 'own feat'); c.title = t.name; fl.append(c); });
    }
    mb.append(fl);
    const tr = tracks.find(t => 'u:' + t.id === mus) || (feedMus.filter(t => 'f:' + t.id === mus).map(t => ({ type: /youtu\.?be/i.test(t.url) ? 'yt' : 'url' }))[0] || null);
    if (tr && tr.type === 'yt' && musicYt && musicYt.blocked && musicYt.cmd === 'play') {
      const w = el('div', 'mwarn'); w.append(document.createTextNode('YouTube chưa cho tự phát. Bấm vào tab 🎵 một lần là chạy.'));
      const b = el('button', 'mlink', 'Mở tab nhạc'); b.addEventListener('click', () => pomoSend('music-tab')); w.append(b); mb.append(w);
    }
    if (mus) {
      const vr = el('label', 'vr'); vr.append(el('span', '', '🔈'));
      const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(vol * 100); r.setAttribute('aria-label', 'Âm lượng nhạc nền');
      r.addEventListener('input', () => pomoSend('music-vol', { vol: r.value / 100 }));
      r.addEventListener('change', () => saveP({ vol: r.value / 100 }));
      vr.append(r, el('span', '', '🔊')); mb.append(vr);
    }
    box.append(mb);
    // thống kê hôm nay
    const st = el('div', 'p2stat');
    st.append(el('span', '', 'Hôm nay'));
    const dots = el('span', 'dots');
    for (let k = 0; k < Math.max(4, Math.min(n, 12)); k++) dots.append(el('i', k < n ? 'on' : ''));
    st.append(dots, el('b', '', n ? `${n} phiên` : 'chưa có phiên'));
    // 1.10.22: bỏ thanh thống kê "Hôm nay · chưa có phiên"
    if (pomoCfgOpen) {
      const f = h(`<div class="fm p2cfg">
          <div class="line">Nghỉ ngắn <input type="number" min="1" max="30" style="width:56px"> phút · nghỉ dài <input type="number" min="5" max="60" style="width:56px"> phút sau mỗi 4 phiên</div>
          <label class="snd"><input type="checkbox"> Hết giờ nghỉ thì tự vào phiên mới</label>
          <label class="snd"><input type="checkbox"> Nhắc khi lỡ mở trang gây xao nhãng</label>
          <label><span class="lb">Các trang gây xao nhãng</span><input style="width:100%"></label></div>`);
      const [b1, b2, c1, c2, si] = f.querySelectorAll('input');
      b1.value = cfg.brk; b2.value = cfg.lng; c1.checked = !!cfg.autoNext; c2.checked = cfg.nudge !== false; si.value = cfg.sites ?? DISTRACT;
      b1.addEventListener('change', () => saveP({ brk: Math.max(1, Number(b1.value) || 5) }));
      b2.addEventListener('change', () => saveP({ lng: Math.max(5, Number(b2.value) || 15) }));
      c1.addEventListener('change', () => saveP({ autoNext: c1.checked }));
      c2.addEventListener('change', () => saveP({ nudge: c2.checked }));
      si.addEventListener('change', () => saveP({ sites: si.value }));
      box.append(f);
    }
    return box;
  }

  // ---------- lời chào + việc đang chờ ----------
  // mẹo xoay vòng mỗi lần chào, để lời chào không lặp lại y hệt
  const GREET_TIPS = ['💡 Bôi đen chữ bất kỳ để tôi dịch hoặc giải thích.', '🛍️ Mở sản phẩm Shopee, TikTok: tôi tìm shop rẻ hơn cho bạn.', '📝 Có việc cần nhớ? Bấm vào tôi để thêm vào Todolist.',
    '🍅 Cần tập trung? Thử chế độ Tập trung 25 phút nhé.', '🔎 Bấm vào tôi, chọn Mua sắm để tìm hàng uy tín trên Shopee.', '⏰ Bấm vào tôi để đặt nhắc nhở uống nước, nghỉ mắt.'];
  // V1.69: bong bóng TỰ HIỆN (chào, nhắc nhẹ Tab mới, tin mới, bản mới, mời ghé shop, voucher sắp hết) tối đa 1 lần/giờ – chung mọi tab.
  //        Không áp cho: nhắc đúng giờ, Todo tới hạn, báo giá, Pomodoro, kiểm tra hàng Shopee, theo dõi giá món đã lưu, việc khách vừa bấm.
  async function autoGate() { const { autoBubbleAt = 0 } = await chrome.storage.local.get('autoBubbleAt').catch(() => ({})); if (Date.now() - autoBubbleAt < 3600e3) return false; await chrome.storage.local.set({ autoBubbleAt: Date.now() }).catch(() => {}); return true; }
  async function greet() {
    if (!ui || !active() || settings.greet === false || !ui.panel.hidden || menuOpen || trust) return;
    const { greetAt = 0 } = await chrome.storage.local.get('greetAt');
    const now = Date.now();
    const pend = todos.filter(t => !t.done);
    const late = pend.filter(t => t.due && new Date(t.due).getTime() <= now);
    const soon = pend.filter(t => t.due && new Date(t.due).getTime() > now && new Date(t.due).getTime() - now <= 3600e3);
    const urgent = late.length || soon.length;
    // chào lại theo cài đặt (mặc định 15 phút/lần) để người dùng khỏi quên HaoHao; có việc gấp thì nhắc ít nhất 30 phút/lần
    const gap = Math.max(5, +settings.greetMin || 15) * 60e3;
    if (now - greetAt < (urgent ? Math.min(gap, 30 * 60e3) : gap)) return;
    if (!(await autoGate())) return;
    await chrome.storage.local.set({ greetAt: now });
    const hr = new Date().getHours();
    const hi = hr < 5 ? 'Khuya rồi' : hr < 11 ? 'Chào buổi sáng' : hr < 14 ? 'Chào buổi trưa' : hr < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    // ưu tiên Todolist, gọn 2 dòng: 1 việc quá hạn gần nhất + 1 việc sắp tới giờ gần nhất; thiếu loại nào thì lấy việc kế tiếp bù vào
    const dueOf = t => t.due ? new Date(t.due).getTime() : Infinity;
    const lateNear = [...late].sort((a, b) => dueOf(b) - dueOf(a));
    const next = pend.filter(t => !late.includes(t)).sort((a, b) => dueOf(a) - dueOf(b));
    const order = [...new Set([lateNear[0], next[0], ...lateNear.slice(1), ...next.slice(1)].filter(Boolean))].slice(0, 2);
    let todoBox = null, note = '', cls = '';
    if (order.length) {
      todoBox = el('div', 'note todo' + (late.length ? ' late' : ''));
      todoBox.append(el('b', '', `📝 Todolist của bạn (${pend.length} việc)`));
      order.forEach(t => {
        const d = t.due ? new Date(t.due) : null, today = d && d.toDateString() === new Date().toDateString();
        const p2 = n => String(n).padStart(2, '0');
        const when = d ? (today ? `${p2(d.getHours())}:${p2(d.getMinutes())}` : `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`) + ' ' : '';
        const mark = late.includes(t) ? '⚠' : t.due ? '⏰' : '•';
        const txt = String(t.text || ''); const r = el('div', 'ti' + (late.includes(t) ? ' l' : ''), `${mark} ${when}${txt.length > 60 ? txt.slice(0, 58) + '…' : txt}`); r.title = txt; todoBox.append(r);
      });
    } else { note = GREET_TIPS[Math.floor(now / 60e3) % GREET_TIPS.length]; cls = 'tip'; }
    lastBubble = now;
    ui.bubble.innerHTML = ''; ui.bubble.dataset.tab = 'todo'; ui.bubble.dataset.kind = ''; ui.bubble.classList.remove('tb', 'think');
    ui.bubble.append(el('span', 't', `Xin chào, tôi là trợ lý HaoHao 👋`));
    // có việc trong Todolist thì đưa danh sách việc lên ngay dưới lời chào, bỏ câu chào chung cho gọn
    if (todoBox) ui.bubble.append(todoBox);
    else ui.bubble.append(document.createTextNode(`${hi}! Bấm vào tôi khi cần nhé.`));
    if (!todoBox && note) ui.bubble.append(el('span', 'note ' + cls, note));
    ui.bubble.hidden = false; setMood(urgent ? 'alert' : 'happy');
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hideBubble, todoBox ? 15000 : 8000);
  }

  // 💭 bong bóng suy nghĩ (Tab mới): tối đa 3 dòng việc/nhắc gần nhất, bấm vào mở bảng gọn Todo + Nhắc
  function thinkBubble(skipAd) {
    if (!ui || !ui.panel.hidden) return;
    if (!skipAd && adWindow()) adBubble(true);   // 16:30–17:00 lần đầu trong ngày: dòng 🏠 thay chỗ trong 5 phút
    const dl = products.find(x => x.dealNew && HT.dropPct(x) >= 5);
    if (dl) return dealBubble(dl, dl.dealNew);
    // Nhắc nhẹ theo giờ (1.9.41):
    //  • ban ngày: chỉ việc quá hạn + việc/nhắc sắp tới trong 3 giờ; chiều tối (từ 17h) nhìn thêm việc/hẹn riêng NGÀY MAI
    //  • ban đêm (22h–5h): không hiện nhắc lặp lại hằng ngày (uống nước, đón con, tan làm…), chỉ việc quá hạn + hẹn riêng sắp tới
    //  • từ 23h tới 5h: HaoHao nhắc đi ngủ trước tiên
    //  • nhắc chưa tới giờ thì hiện TÊN ngắn + "còn …", không dùng câu "Tới giờ … rồi!"
    const now = Date.now(), N = new Date(), H = N.getHours();
    const night = H >= 22 || H < 5, sleep = H >= 23 || H < 5, evening = H >= 17;
    const soon = now + 3 * 3600e3, dayEnd = new Date(N).setHours(23, 59, 59, 999);
    const nextDayEnd = H < 5 ? dayEnd : dayEnd + 864e5;   // sau nửa đêm: "sáng mai" chính là hôm nay
    const hm = d => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const left = ms => { const m = Math.max(1, Math.round((ms - now) / 60000)); return m < 60 ? `còn ${m} phút` : m < 600 ? `còn ${Math.floor(m / 60)} giờ${m % 60 >= 10 ? ' ' + (m % 60) + "'" : ''}` : ''; };
    const near = [], later = [];
    for (const t of todos) {
      if (t.done || !t.due) continue;
      const ms = new Date(t.due).getTime(), late = ms <= now;
      // 1.9.80: việc Todo có hạn còn dở được ưu tiên: hiện cả ngày hôm nay (không chỉ 3 giờ tới), đứng trước lịch nhắc
      const it = { at: ms, late, todo: true, star: !!t.star, icon: late ? '⚠' : t.star ? '⭐' : '⏰', txt: t.text, tab: 'todo' };
      if (late || (!night && ms <= dayEnd)) near.push(it);
      else if (ms <= nextDayEnd && (evening || night)) later.push(it);
    }
    for (const r of rules) {
      if (!r.enabled || r.type !== 'reminder') continue;
      const nx = nextFire(r); if (!nx) continue;
      const ms = nx.getTime(), routine = r.kind === 'daily' || r.kind === 'interval';
      if (routine) continue;   // V1.69: nhắc lặp lại (uống nước, tan làm…) chỉ báo đúng giờ, không nhắc trước trong bong bóng
      const it = { at: ms, icon: r.icon || '🔔', txt: r.name || r.message, tab: 'bell' };
      if (!night && ms <= soon) near.push(it);
      else if (!routine && ms <= nextDayEnd && (evening || night)) later.push(it);
    }
    near.sort((a, b) => (b.todo ? 1 : 0) - (a.todo ? 1 : 0) || (b.late ? 1 : 0) - (a.late ? 1 : 0) || (b.star ? 1 : 0) - (a.star ? 1 : 0) || a.at - b.at);
    later.sort((a, b) => a.at - b.at);
    const isTmr = ms => new Date(ms).toDateString() !== N.toDateString() || (H < 5 && new Date(ms).getHours() >= 5);   // sau nửa đêm: 8h sáng vẫn gọi là "mai"
    const items = [...near.map(x => ({ ...x, when: x.late ? 'Quá hạn' : hm(x.at), sub: x.late ? '' : left(x.at) })),
      ...later.map(x => ({ ...x, when: (isTmr(x.at) ? 'Mai ' : '') + hm(x.at), sub: '' }))];
    const B = ui.bubble;
    B.innerHTML = ''; B.dataset.kind = 'think'; B.dataset.tab = items[0] ? items[0].tab : 'todo'; B.classList.remove('tb'); B.classList.add('think');
    if (sleep) B.append(el('span', 'th1', '😴 Khuya rồi bro, đi ngủ đi! Mai HaoHao nhắc việc cho.'));
    if (!items.length) {
      const open = todos.filter(t => !t.done).length;
      B.dataset.tab = 'todo';
      if (!sleep) B.append(el('span', 'th1', night ? '💤 Khuya rồi, mai HaoHao nhắc nhé' : evening ? '💭 Mai có việc hay hẹn gì không? Bấm mình ghi lại, mai HaoHao nhắc nhé' : open ? `💭 Còn ${open} việc chưa xong…` : '💭 Hôm nay làm gì nhỉ? Bấm mình ghi việc nhé'));
    } else {
      const max = sleep ? 2 : 3;
      for (const it of items.slice(0, max)) {
        const r = el('div', 'thl' + (it.late ? ' late' : ''));
        r.append(el('span', 'thi', it.icon), el('b', '', it.when), el('span', 'thx', String(it.txt || '').slice(0, 60) + (it.sub ? ' · ' + it.sub : '')));
        B.append(r);
      }
      if (items.length > max) B.append(el('span', 'thm', `+${items.length - max} việc nữa`));
      else if (evening && !night && !later.length) B.append(el('span', 'thm', '💭 Mai có hẹn gì thì bấm mình ghi lại nhé'));
    }
    const x = el('button', 'thc', '✕'); x.title = 'Ẩn'; x.setAttribute('aria-label', 'Ẩn nhắc nhẹ');
    x.addEventListener('click', e => { e.stopPropagation(); B.hidden = true; });
    B.append(x);
    B.hidden = false; clearTimeout(bubbleTimer);
    setMood(items.some(i => i.late) ? 'alert' : sleep ? 'remind' : 'happy');
  }

  // 🏠 Dòng giới thiệu công việc của tác giả trong bong bóng suy nghĩ: chỉ từ 16:30 tới 17:00,
  // mỗi ngày 1 lần (trên 1 tab), hiện 5 phút rồi tự tắt; không chen ngang khi HaoHao đang bận (bảng/menu/bong bóng khác)
  let adTimer = null;
  const adWindow = () => { const N = new Date(), m = N.getHours() * 60 + N.getMinutes(); return m >= 16 * 60 + 30 && m < 17 * 60; };
  async function adBubble(onNewtab) {
    const free = () => ui.bubble.hidden || (onNewtab && ui.bubble.dataset.kind === 'think');   // Tab mới: được thay bong bóng nhắc nhẹ trong 5 phút
    if (!ui || document.visibilityState !== 'visible' || !ui.panel.hidden || !free() || menuOpen || !adWindow()) return false;
    const day = new Date().toDateString(), { hhAdDay } = await chrome.storage.local.get('hhAdDay');
    if (hhAdDay === day || !free()) return false;
    const B = ui.bubble;
    B.innerHTML = ''; B.dataset.kind = 'ad'; B.dataset.tab = ''; B.classList.remove('tb'); B.classList.add('think');
    const r = el('div', 'thl'); r.title = 'Bấm để nhắn Zalo ' + HT.WORK_AD.phone; const tx = el('span', 'thx', HT.WORK_AD.text); if (HT.WORK_AD.who) tx.append(el('b', 'thw', HT.WORK_AD.who)); r.append(el('span', 'thi', '🏠'), tx); B.append(r);
    const x = el('button', 'thc', '✕'); x.title = 'Ẩn'; x.setAttribute('aria-label', 'Ẩn');
    x.addEventListener('click', e => { e.stopPropagation(); B.hidden = true; });
    B.append(x);
    B.hidden = false; clearTimeout(bubbleTimer); setMood('happy');
    clearTimeout(adTimer); adTimer = setTimeout(() => { if (B.dataset.kind === 'ad' && !B.hidden) { B.hidden = true; if (onNewtab) thinkBubble(true); } }, 5 * 60e3);
    setTimeout(() => chrome.storage.local.set({ hhAdDay: day }).catch(() => {}), 50);   // ghi "hôm nay đã hiện" sau khi vẽ xong
    return true;
  }
  setInterval(adBubble, 30e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(adBubble, 2500); });

  // ---------- khởi động ----------
  async function load() {
    const d = await chrome.storage.local.get(['rules', 'settings', 'todos', 'watch', 'mailStatus', 'msAccount', 'ideas', 'pomo', 'pomoStats', 'musicYt', 'products', 'couponFeed', 'couponSeen', 'hhJump', 'stocks', 'holdings']);
    const j = d.hhJump;
    if (j && j.key === itemKey() && Date.now() - j.at < 120e3) {
      try { sessionStorage.setItem('hh-aff', j.key); if (j.sub) sessionStorage.setItem('hh-open', j.key + '|' + j.sub); } catch {}
      chrome.storage.local.remove('hhJump').catch(() => {});
    }
    couponFeed = d.couponFeed || null; couponSeen = d.couponSeen || []; HT.setTikTok(couponFeed && couponFeed.tiktok); HT.setShopee(couponFeed && couponFeed.shopee);
    products = d.products || [];
    pomo = d.pomo || null; pomoStats = d.pomoStats || {}; musicYt = d.musicYt || null;
    ideas = d.ideas || [];
    mailStatus = d.mailStatus || null; msAccount = d.msAccount || '';
    rules = d.rules || []; todos = d.todos || []; watch = d.watch || []; if (Array.isArray(d.stocks)) stocks = d.stocks; if (d.holdings && typeof d.holdings === 'object') { holdings = d.holdings; for (const k of ['gd:sjc', 'gd:nhan']) { const h = holdings[k]; if (h && Array.isArray(h.lots)) h.lots.forEach(x => { if (x.buy > 60) x.buy = Math.round(x.buy / 10 * 1e4) / 1e4; }); } }
    settings = { mascotEnabled: true, hiddenSites: [], ...(d.settings || {}) };
    HT.setLang(settings.lang);
  }

  chrome.storage.onChanged.addListener(async (ch, area) => {
    if (ch.hhAdDay && Object.keys(ch).length === 1) return;   // chỉ ghi ngày đã hiện dòng 🏠: không vẽ lại gì
    if (area !== 'local') return;
    if ((ch.couponFeed || ch.couponSeen) && !(ch.rules || ch.settings || ch.todos || ch.watch)) {
      if (ch.couponFeed) { couponFeed = ch.couponFeed.newValue || null; HT.setTikTok(couponFeed && couponFeed.tiktok); HT.setShopee(couponFeed && couponFeed.shopee); }
      if (ch.couponSeen) couponSeen = ch.couponSeen.newValue || [];
      updateBadge();
      if (ch.couponFeed && (tab === 'shop' || tab === 'focus') && ui && !ui.panel.hidden) renderPanel();
      return;
    }
    if (ch.products && !(ch.rules || ch.settings || ch.todos || ch.watch)) {
      products = ch.products.newValue || [];
      const typing = ui && ui.root.activeElement && /INPUT|TEXTAREA/.test(ui.root.activeElement.tagName);
      if (tab === 'shop' && ui && !ui.panel.hidden && !typing) renderPanel();
      if (Object.keys(ch).length === 1) return;
    }
    if (ch.musicYt && !(ch.rules || ch.settings || ch.todos || ch.watch)) {
      const was = !!(musicYt && musicYt.blocked); musicYt = ch.musicYt.newValue || null;
      if (was !== !!(musicYt && musicYt.blocked) && tab === 'focus' && ui && !ui.panel.hidden) renderPanel();
      if (!ch.pomo && !ch.pomoStats) return;
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
      // đang gõ dở (ô có chữ) thì chưa vẽ lại; ô trống (vừa bấm Lưu) thì vẽ lại và giữ con trỏ ở ô cũ
      const ae = ui && ui.root.activeElement, typing = ae && /INPUT|TEXTAREA/.test(ae.tagName) && ae.value;
      if (tab === 'idea' && !typing) {
        const inSearch = ae && ae.closest && ae.closest('.nbar'), inQuick = ae && ae.matches && ae.matches('input.grow');
        renderPanel();
        if (inQuick) { const n = ui.root.querySelector(inSearch ? '.nbar input.grow' : '.row:not(.nbar) input.grow'); if (n) n.focus(); }
      }
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
    placeWrap();
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
      if (r && r.scan === 'price') return runPriceScan();
      if (r && r.scan === 'reviews') return runReviewScan();
      if (r && r.scan === 'vhunt') return runVoucherHunt(r.data || {});
    }
    if (!active()) return;
    buildUI();
    // Tab mới: không mở bảng, HaoHao chỉ "nghĩ" 1 bong bóng nhỏ nhắc việc sắp tới; trang khác: chào như cũ
    const isNewtab = location.protocol === 'chrome-extension:' && /\/newtab\.html$/.test(location.pathname);
    setTimeout(isNewtab ? () => autoGate().then(ok => { if (ok) thinkBubble(); }) : greet, isNewtab ? 900 : 1500);
    setTimeout(focusNudge, 2000);
    setTimeout(() => autoGate().then(ok => { if (ok) newsBubble(); }), 4500); setTimeout(updBubble, 9000);   // V1.1
    setTimeout(voucherExpiryNudge, 12000);
    setTimeout(readVoucherWallet, 2500);
    // setInterval(liveWatch, 2500);   // 1.10.249: bỏ Săn live
    setTimeout(storeWeekly, 7000);   // V1.73: 7 ngày 1 lần mời ghé HaoHao Store xem hàng mới (thay cà phê Thứ Ba)
    setTimeout(trackPrice, 3000);
    setTimeout(loadAllReviews, 1500);   // 1.10.162: tự đọc đánh giá ngay (không cần kéo xuống)
    if (isCmpPage()) setTimeout(compareRun, 1200);
    window.addEventListener('hh-sim-page', () => { if (ui && pageKind() !== 'item' && ui.bubble.dataset.kind === 'trust') ui.bubble.hidden = true; });
    chrome.storage.local.remove('shopVouchers').catch(() => {});   // đã bỏ mục Voucher
    let lastHref = location.href;
    setTimeout(kwFromUrl, 1500);
    setInterval(() => {
      if (!ui) return;
      if (location.href !== lastHref) {
        lastHref = location.href; trust = null; trustPill(); if (ui.bubble.dataset.kind === 'trust') ui.bubble.hidden = true;
        setTimeout(trackPrice, 2500); kwFromUrl(); setTimeout(loadAllReviews, 1800);
        cmp = null; hamsterHome(); if (isCmpPage()) setTimeout(compareRun, 1500);
        if (tab === 'shop' && !ui.panel.hidden) setTimeout(renderPanel, 2600);
      }
      if (document.visibilityState === 'visible') analyzeShopee();
      logCards();
    }, 2500);
  });
  // có việc sắp tới giờ trong lúc đang mở trang thì cũng nhắc nhẹ
  setInterval(() => { if (document.visibilityState === 'visible') greet(); }, 60e3);
})();
