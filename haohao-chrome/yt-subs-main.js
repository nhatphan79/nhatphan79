// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🈯 Phụ đề song ngữ YouTube (MAIN world): bắt file phụ đề trình phát YouTube tải về, và bật/tắt phụ đề theo lệnh của HaoHao (subs.js).
(() => {
  const TAG = '__hhsub';
  const cache = new Map();   // videoId → { url, body } (file phụ đề gốc gần nhất)
  const vid = u => { try { return new URL(u, location.href).searchParams.get('v') || ''; } catch { return ''; } };
  const grab = (url, body) => {
    if (!body || !/\/api\/timedtext/.test(url) || /[?&]tlang=/.test(url)) return;   // bỏ bản YouTube tự dịch
    const v = vid(url); if (!v) return;
    cache.set(v, { url, body }); if (cache.size > 5) cache.delete(cache.keys().next().value);
    window.postMessage({ [TAG]: 'data', v, url, body }, '*');
  };
  // 1) fetch
  const of = window.fetch;
  window.fetch = function (input, init) {
    const p = of.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/api\/timedtext/.test(url)) p.then(r => r.clone().text().then(t => grab(url, t))).catch(() => {});
    } catch {}
    return p;
  };
  // 2) XMLHttpRequest
  const oo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, url) {
    try { if (/\/api\/timedtext/.test(String(url))) this.addEventListener('load', () => { try { grab(String(url), this.responseText); } catch {} }); } catch {}
    return oo.apply(this, arguments);
  };
  const player = () => document.getElementById('movie_player');
  let weTurnedOn = false;
  window.addEventListener('message', e => {
    const d = e.data; if (e.source !== window || !d || d[TAG] !== 'cmd') return;
    const p = player(); if (!p || !p.getPlayerResponse) return;
    try {
      const pr = p.getPlayerResponse() || {}, v = (pr.videoDetails || {}).videoId || '';
      const tracks = (((pr.captions || {}).playerCaptionsTracklistRenderer || {}).captionTracks || [])
        .map(t => ({ lang: t.languageCode, asr: t.kind === 'asr', name: (t.name && (t.name.simpleText || (t.name.runs || []).map(x => x.text).join(''))) || '' }));
      if (d.act === 'tracks') { window.postMessage({ [TAG]: 'tracks', v, tracks, title: (pr.videoDetails || {}).title || '' }, '*'); return; }
      if (d.act === 'on') {
        const c = cache.get(v); if (c && (!d.lang || c.url.includes('lang=' + d.lang))) window.postMessage({ [TAG]: 'data', v, url: c.url, body: c.body }, '*');
        let cur = {}; try { cur = p.getOption('captions', 'track') || {}; } catch {}
        if (!cur.languageCode) weTurnedOn = true;
        try { p.loadModule('captions'); } catch {}
        const tr = { languageCode: d.lang }; if (d.asr) tr.kind = 'asr';
        setTimeout(() => { try { p.setOption('captions', 'track', tr); } catch {} }, 150);
      }
      if (d.act === 'off' && weTurnedOn) { weTurnedOn = false; try { p.unloadModule('captions'); } catch {} }
    } catch {}
  });
})();
