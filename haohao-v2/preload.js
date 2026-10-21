// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// Cầu nối cửa sổ ↔ app: dựng sẵn "chrome.storage / chrome.runtime" giống tiện ích,
// nhờ vậy trang Dự án (proj.js) của tiện ích chạy nguyên văn trong HaoHao V2, dữ liệu là của app.
const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Set();
ipcRenderer.on('storage-changed', (_e, changes) => { for (const f of listeners) { try { f(changes, 'local'); } catch (err) { console.error(err); } } });

const cb = (p, f) => { if (typeof f === 'function') p.then(f); return p; };
contextBridge.exposeInMainWorld('hhChrome', {   // Electron đã có sẵn window.chrome → đặt tên khác, shim.js ghép vào
  storage: {
    local: {
      get: (keys, f) => cb(ipcRenderer.invoke('st-get', keys === undefined ? null : keys), f),
      set: (obj, f) => cb(ipcRenderer.invoke('st-set', obj), f),
      remove: (keys, f) => cb(ipcRenderer.invoke('st-remove', keys), f)
    },
    onChanged: { addListener: f => { listeners.add(f); }, removeListener: f => { listeners.delete(f); } }
  },
  runtime: {
    id: 'haohao-v2',
    getURL: p => String(p || ''),
    sendMessage: m => ipcRenderer.invoke('msg', m),
    onMessage: { addListener() {} }
  },
  tabs: { create: o => ipcRenderer.invoke('open', o && o.url) },
  extension: { isAllowedFileSchemeAccess: f => { if (typeof f === 'function') f(true); return Promise.resolve(true); } }
});

contextBridge.exposeInMainWorld('hhApp', {
  info: () => ipcRenderer.invoke('app-info'),
  setAuto: on => ipcRenderer.invoke('set-auto', on),
  testNotify: () => ipcRenderer.invoke('test-notify'),
  updateGet: () => ipcRenderer.invoke('update-get'),
  updateCheck: () => ipcRenderer.invoke('update-check'),
  updateInstall: () => ipcRenderer.invoke('update-install'),
  onUpdate: f => { ipcRenderer.on('update-status', (_e, u) => { try { f(u); } catch (err) { console.error(err); } }); },
  open: url => ipcRenderer.invoke('open', url)
});
