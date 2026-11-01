// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🔐 V1.3.0: ĐỒNG BỘ trang Công trình theo tài khoản Google (dùng chung: nền HaoHao + trang điện thoại).
//   • Máy chủ giữ 1 bản + số phiên bản (rev). Mỗi máy nhớ "bản gốc" lần đồng bộ trước (base).
//   • Hai nơi cùng sửa → GỘP 3 CHIỀU theo từng dòng (id): sửa khác dòng thì giữ cả hai, xoá một bên thì xoá,
//     cùng sửa 1 ô thì lấy bản đang sửa trên máy này. Không đè mất dữ liệu của bên kia.
//   • Ảnh nhật ký: tải lên riêng (/sbp), trong dữ liệu chỉ còn mã ảnh "p_<băm>" – nhẹ, mở được ở mọi máy.
(() => {
  const g = typeof self !== 'undefined' ? self : window;
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const stable = x => JSON.stringify(x, (k, v) => isObj(v) ? Object.keys(v).sort().reduce((o, kk) => (o[kk] = v[kk], o), {}) : v);
  const eq = (a, b) => stable(a) === stable(b);
  const idArr = a => Array.isArray(a) && a.every(x => isObj(x) && x.id != null);
  // gộp 3 chiều: b = bản gốc (lần đồng bộ trước), l = máy này, r = máy chủ
  function m3(b, l, r) {
    if (eq(l, r)) return l;
    if (b !== undefined && eq(l, b)) return r;
    if (b !== undefined && eq(r, b)) return l;
    if (isObj(l) && isObj(r)) {
      const B = isObj(b) ? b : {}, o = {};
      for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
        const inL = k in l, inR = k in r, inB = k in B;
        if (inL && inR) o[k] = m3(inB ? B[k] : undefined, l[k], r[k]);
        else if (inL) { if (!(inB && eq(B[k], l[k]))) o[k] = l[k]; }      // bên kia xoá khoá mà máy này không sửa → bỏ
        else { if (!(inB && eq(B[k], r[k]))) o[k] = r[k]; }
      }
      return o;
    }
    if (Array.isArray(l) && Array.isArray(r) && (idArr(l) || !l.length) && (idArr(r) || !r.length) && (l.length || r.length)) {
      const B = new Map((idArr(b) ? b : []).map(x => [String(x.id), x])), L = new Map(l.map(x => [String(x.id), x])), R = new Map(r.map(x => [String(x.id), x]));
      const out = [], seen = new Set();
      const take = id => {
        if (seen.has(id)) return; seen.add(id);
        const bi = B.get(id), li = L.get(id), ri = R.get(id);
        if (li && ri) out.push(m3(bi, li, ri));
        else if (li) { if (!(bi && eq(bi, li))) out.push(li); }          // bên kia xoá: giữ nếu máy này vừa sửa dòng đó
        else if (ri) { if (!(bi && eq(bi, ri))) out.push(ri); }
      };
      l.forEach(x => take(String(x.id))); r.forEach(x => take(String(x.id)));
      return out;
    }
    if (Array.isArray(l) && Array.isArray(r) && l.every(x => typeof x === 'string') && r.every(x => typeof x === 'string')) {   // danh sách mã ảnh
      const Bs = new Set(Array.isArray(b) ? b : []), out = [];
      for (const x of [...l, ...r]) if (!out.includes(x) && !((Bs.has(x)) && (!l.includes(x) || !r.includes(x)))) out.push(x);
      return out;
    }
    if (l == null) return r;
    return l;   // cùng sửa 1 ô: lấy bản máy này
  }
  const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const photoCache = new Map();

  g.SBSync = function (o) {
    const api = o.api.replace(/\/$/, '');
    const P0 = o.path || '/sb';   // V1.4.0: '/sb?ns=todo' = Todo + Nhắc nhở
    let busy = null, again = false;
    const st = { at: 0, err: '', rev: 0, email: '' };
    const req = async (method, path, body) => {
      const tok = await o.token(); if (!tok) { const e = new Error('chưa đăng nhập'); e.auth = false; throw e; }
      const r = await fetch(api + path, { method, headers: { authorization: 'Bearer ' + tok, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
      const j = await r.json().catch(() => ({ ok: false, error: 'HTTP ' + r.status }));
      if (r.status === 401) { const e = new Error(j.error || 'hết phiên đăng nhập'); e.auth = false; throw e; }
      j._status = r.status; return j;
    };
    async function uploadPhotos(doc) {   // dataURL → mã ảnh p_…; trả về true nếu doc đổi
      let ch = false;
      for (const S of (doc && doc.sites) || []) for (const L of S.logs || []) {
        if (!Array.isArray(L.photos)) continue;
        for (let i = 0; i < L.photos.length; i++) {
          const d = L.photos[i]; if (typeof d !== 'string' || !d.startsWith('data:')) continue;
          let id = photoCache.get(d.length + ':' + d.slice(-64));
          if (!id) { id = 'p_' + (await hex(d)).slice(0, 32); const j = await req('POST', '/sbp', { id, d }); if (!j.ok) throw new Error(j.error || 'lỗi tải ảnh'); photoCache.set(d.length + ':' + d.slice(-64), id); }
          L.photos[i] = id; ch = true;
        }
      }
      return ch;
    }
    async function run() {
      const raw = await o.getLocal(); let seen = stable(raw);
      let local = raw || (o.empty ? o.empty() : { sites: [], cur: null }); if (!o.path && !Array.isArray(local.sites)) local.sites = [];
      const put = async v => {   // ghi máy này chỉ khi không ai sửa chen vào trong lúc đồng bộ (trang vừa lưu → làm lại vòng sau)
        if (stable(await o.getLocal()) !== seen) { const e = new Error('retry'); e.retry = true; throw e; }
        await o.setLocal(v); seen = stable(v);
      };
      if (await uploadPhotos(local)) await put(local);
      const base = (await o.getBase()) || { rev: 0, doc: undefined };
      let R = await req('GET', P0); if (!R.ok) throw new Error(R.error || 'lỗi máy chủ');
      st.email = R.email || st.email;
      let rv = R.v, rrev = R.rev || 0;
      for (let k = 0; k < 4; k++) {
        let merged;
        if (!rv) merged = local;
        else if (rrev === base.rev && base.doc !== undefined) merged = local;
        else merged = m3(base.doc, local, rv);
        if (!eq(merged, local)) { await put(merged); local = merged; }
        if (rv && eq(merged, rv)) { base.rev = rrev; base.doc = merged; await o.setBase({ rev: rrev, doc: merged }); st.rev = rrev; return 'same'; }
        const P = await req('PUT', P0, { base: rrev, v: merged });
        if (P.ok) { await o.setBase({ rev: P.rev, doc: merged }); st.rev = P.rev; return 'pushed'; }
        if (!P.conflict) throw new Error(P.error || 'lỗi lưu');
        if (P.rev === -1 || !P.v) { R = await req('GET', P0); rv = R.v; rrev = R.rev || 0; } else { rv = P.v; rrev = P.rev; }
      }
      throw new Error('đang có máy khác lưu liên tục – thử lại sau');
    }
    async function sync() {
      if (busy) { again = true; return busy; }
      busy = (async () => {
        try { let r; for (let i = 0; ; i++) { try { r = await run(); break; } catch (e) { if (!e.retry || i >= 4) throw e; await new Promise(z => setTimeout(z, 400)); } } st.at = Date.now(); st.err = ''; return { ok: true, r }; }
        catch (e) { if (e.retry) { again = true; return { ok: true, r: 'retry' }; } st.err = String(e.message || e); return { ok: false, err: st.err, auth: e.auth !== false }; }
        finally { busy = null; if (again) { again = false; setTimeout(sync, 300); } }
      })();
      return busy;
    }
    return { sync, st, req };
  };
  g.SBSync.m3 = m3; g.SBSync.eq = eq;
})();
