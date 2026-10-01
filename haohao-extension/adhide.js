// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🛡️ Chặn quảng cáo (phần trên trang): ẩn khung quảng cáo còn sót lại sau khi đã chặn tận gốc.
// Không chạy trên Shopee, TikTok, trang trưng bày và các trang làm việc của Google.
(() => {
  const host = location.hostname.replace(/^www\./, '');
  if (/(^|\.)(shopee\.vn|tiktok\.com|collshp\.com|mail\.google\.com|docs\.google\.com|drive\.google\.com|youtube\.com)$/.test(host)) return;
  const SEL = [
    'ins.adsbygoogle', '.adsbygoogle', '[id^="google_ads_iframe"]', '[id^="div-gpt-ad"]', '[data-google-query-id]', '[data-ad-slot]',
    'iframe[src*="doubleclick.net"]', 'iframe[src*="googlesyndication.com"]', 'iframe[src*="amazon-adsystem.com"]', 'a[href*="doubleclick.net"]',
    '[id^="taboola-"]', '.trc_related_container', '.OUTBRAIN', '[data-widget-id^="outbrain"]', '[id^="admzone"]', '[id^="adm-slot"]',
    '.ad-slot', '.ad-banner', '.ads-banner', '.banner-ads', '.adsbox', '.advertisement', '[aria-label="Advertisement"]', '[aria-label="Quảng cáo"]',
    '.quang-cao', '.quangcao', '[class*="box-quangcao"]', '[id*="quangcao"]'
  ].join(',\n');
  let style = null;
  const apply = on => {
    if (on && !style) { style = document.createElement('style'); style.id = 'hh-adhide'; style.textContent = SEL + ' { display: none !important; }'; (document.head || document.documentElement).appendChild(style); }
    if (!on && style) { style.remove(); style = null; }
  };
  const decide = s => apply(s.adBlock !== false && !(s.adAllow || []).includes(host));
  chrome.storage.local.get('settings').then(({ settings = {} }) => decide(settings)).catch(() => {});
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.settings) decide(ch.settings.newValue || {}); });
  // đếm cho bảng HaoHao
  window.addEventListener('hh-ad-count', () => {
    let n = 0; try { n = style ? document.querySelectorAll(SEL).length : 0; } catch {}
    window.dispatchEvent(new CustomEvent('hh-ad-count-reply', { detail: { n, on: !!style } }));
  });
})();
