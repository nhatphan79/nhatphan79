// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// Trang của tiện ích (Cài đặt, Tab mới, cửa sổ nhắc): đọc ngôn ngữ đã chọn rồi dịch cả trang
(() => {
  const go = () => { HT.i18nWatch(document.body); if (HT.lang === 'en') document.title = HT.tr(document.title); };
  chrome.storage.local.get('settings').then(({ settings = {} }) => { HT.setLang(settings.lang); go(); }).catch(go);
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.settings && ((ch.settings.newValue || {}).lang || 'vi') !== ((ch.settings.oldValue || {}).lang || 'vi')) location.reload();
  });
})();
