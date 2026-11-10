// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 💼 V1.8.0: khởi động tab Quản lý chi phí (chạy trong khung của trang Công trình).
//   File Excel KHTC lưu trên máy (IndexedDB, theo công trình) · ô đã sửa lưu trong dữ liệu công trình qua trang mẹ (SB_KHTC).
(() => {
  const $ = s => document.querySelector(s);
  const sid = new URLSearchParams(location.search).get('s') || '';
  const HOSTP = (() => { try { return window.parent && window.parent !== window && window.parent.SB_KHTC; } catch { return null; } })();
  const HOST = {
    set: (k, e) => HOSTP && HOSTP.set(sid, k, e),
    snap: x => HOSTP && HOSTP.snap(sid, x),
  };
  const info = (HOSTP && HOSTP.info(sid)) || { code: '', name: '' };
  const RO = !!(HOSTP && HOSTP.ro); window.KHTC_RO = RO;   // V1.8.7: trang web (điện thoại) chỉ xem
  if (RO) {   // V1.8.8: web – khung tự cao bằng nội dung, cuộn bằng trang ngoài (không phải cuộn trong khung nhỏ)
    document.documentElement.classList.add('kro');
    let lh = 0; const fit = () => { const h = Math.ceil(document.body.getBoundingClientRect().height) + 4;   /* đo thân trang (không đo cửa sổ khung) → co lại được khi đổi sheet */ if (Math.abs(h - lh) > 2 && HOSTP.fit) { lh = h; HOSTP.fit(sid, h); } };
    new ResizeObserver(fit).observe(document.body); setTimeout(fit, 300);
  }
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = t => { const b = atob(t); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  // V1.8.7: file KHTC cất trên máy chủ HaoHao (theo Gmail + công trình) → máy khác, điện thoại tự lấy về
  const srvMeta = async () => { try { return HOSTP && HOSTP.api ? await HOSTP.api('GET', sid, { meta: 1 }) : null; } catch { return null; } };
  const srvGet = async () => { try { return HOSTP && HOSTP.api ? await HOSTP.api('GET', sid) : null; } catch { return null; } };
  const srvPut = async (name, bytes) => { try { return HOSTP && HOSTP.api && !RO ? await HOSTP.api('PUT', sid, null, { name, b64: b64(bytes) }) : null; } catch { return null; } };
  if ($('#kBrand')) $('#kBrand').textContent = (info.code ? info.code + ' · ' : '') + (info.name || 'Công trình') + ' · Quản lý chi phí';
  // ---- IndexedDB: hhKhtc / wb (khoá = mã công trình) ----
  const idb = () => new Promise((ok, no) => { const r = indexedDB.open('hhKhtc', 1); r.onupgradeneeded = () => r.result.createObjectStore('wb'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const get = async k => { const d = await idb(); return new Promise((ok, no) => { const q = d.transaction('wb').objectStore('wb').get(k); q.onsuccess = () => ok(q.result || null); q.onerror = () => no(q.error); }); };
  const put = async (k, v) => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('wb', 'readwrite'); t.objectStore('wb').put(v, k); t.oncomplete = ok; t.onerror = () => no(t.error); }); };
  const POLARIS = { url: 'khtc-mau/polaris.xlsx', name: '26.11.06 KHTC_Polaris_P.DA_CLEAN.xlsx' };   // file KHTC Polaris có sẵn (chuyển từ trang Polaris – Quản lý chi phí)
  const isPol = /polaris/i.test((info.code || '') + ' ' + (info.name || ''));
  async function load(name, bytes, fresh, srvAt) {
    const data = await XLRead.read(JSZip, bytes);
    if (!data.sheets.length) throw new Error('file không có sheet nào');
    if (fresh) { const r = await srvPut(name, bytes); if (r && r.ok) srvAt = r.at; }
    await put(sid, { name, at: Date.now(), bytes, data, srvAt: srvAt || 0 });
    if (fresh && HOSTP && !RO) HOSTP.file(sid, { src: name, at: Date.now() });
    return { name, bytes, data };
  }
  function pick() {
    return new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx,.xlsm'; i.onchange = () => ok(i.files[0] || null); i.click(); });
  }
  async function fromFile() {
    const f = await pick(); if (!f) return;
    busy('⏳ Đang đọc ' + f.name + '…');
    try { await load(f.name, new Uint8Array(await f.arrayBuffer()), true); location.reload(); }
    catch (e) { busy(''); alert('Chưa đọc được file: ' + (e && e.message || e)); }
  }
  function busy(t) { $('#kHint').textContent = t || 'File Excel chỉ lưu trên máy này. Các ô anh sửa thì lưu theo công trình và tự đồng bộ sang máy khác cùng Gmail (máy khác cần nạp file 1 lần).'; }
  $('#kPick').addEventListener('click', fromFile);
  $('#btnLoad').addEventListener('click', () => { if (confirm('Nạp file KHTC khác thay cho file "' + (window.KHTC_SRC || '') + '"?\nCác ô đã sửa vẫn giữ theo tên sheet và địa chỉ ô.')) fromFile(); });
  window.KHTCPrint = title => { const t0 = document.title; document.title = title || t0; document.body.classList.add('kprint'); setTimeout(() => { window.print(); setTimeout(() => { document.body.classList.remove('kprint'); document.title = t0; }, 800); }, 50); };
  (async () => {
    let rec = null; try { rec = await get(sid); } catch {}
    const meta = await srvMeta();
    if (meta && meta.ok && meta.at && (!rec || rec.srvAt !== meta.at)) {   // máy chủ có file mới hơn → lấy về
      busy('⏳ Đang tải file KHTC từ máy chủ…');
      const f = await srvGet(); if (f && f.ok && f.b64) { try { await load(f.name, unb64(f.b64), false, f.at); rec = await get(sid); } catch {} }
    } else if (rec && meta && meta.ok && !meta.at && !RO) srvPut(rec.name, rec.bytes instanceof Uint8Array ? rec.bytes : new Uint8Array(rec.bytes)).then(r => { if (r && r.ok) put(sid, { ...rec, srvAt: r.at }); });   // file đã nạp trước V1.8.7 → gửi lên máy chủ 1 lần
    if (!rec) {
      if (RO) { $('#kEmpty').hidden = false; $('#kPick').hidden = true; busy('Chưa có file KHTC trên máy chủ. Mở HaoHao trên máy tính → tab 💼 Quản lý chi phí → nạp file; điện thoại tự thấy.'); return; }
      $('#kEmpty').hidden = false;
      const want = HOSTP && HOSTP.src(sid);
      if (want) busy('Công trình này đã dùng file "' + want + '" trên máy khác – nạp đúng file đó để thấy các ô đã sửa.');
      if (isPol) { const b = $('#kDemo'); b.hidden = false; b.textContent = '📂 Dùng file KHTC Polaris có sẵn'; b.title = POLARIS.name;
        b.addEventListener('click', async () => { busy('⏳ Đang mở file Polaris…'); try { const r = await fetch(POLARIS.url); await load(POLARIS.name, new Uint8Array(await r.arrayBuffer()), true); location.reload(); } catch (e) { busy(''); alert('Chưa mở được: ' + (e && e.message || e)); } }); }
      return;
    }
    $('#kMain').hidden = false; if (RO) $('#btnLoad').hidden = true;
    window.KHTC_SRC = rec.name;
    if ($('#kSub')) $('#kSub').textContent = 'Nguồn: ' + rec.name + ' · nạp ' + new Date(rec.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const bytes = rec.bytes instanceof Uint8Array ? rec.bytes : new Uint8Array(rec.bytes);
    window.KHTCStart(rec.data, rec.name, bytes, (HOSTP && HOSTP.edits(sid)) || {}, HOST);
  })();
})();
