// © 2026 HaoHao – ghép chrome.storage / chrome.runtime (giả lập từ preload) vào window.chrome cho code tiện ích chạy nguyên văn
(() => { const s = window.hhChrome; try { window.chrome = s; } catch {} if (window.chrome !== s) { for (const k of Object.keys(s)) try { window.chrome[k] = s[k]; } catch {} } })();
