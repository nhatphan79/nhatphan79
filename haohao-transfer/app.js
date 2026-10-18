//
//
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const Busboy = require('busboy');
const QRCode = require('qrcode');

process.on('uncaughtException', e => {
  console.log('\n  LỖI: ' + (e && e.stack || e));
  try { require('fs').writeFileSync(require('path').join(process.cwd(), 'loi.txt'), String(e && e.stack || e)); } catch {}
  console.log('\n  Nhấn Enter để đóng...'); process.stdin.resume(); process.stdin.once('data', () => process.exit(1));
});
const PORT = 8686;
//
const CFG_DIR = path.join(process.env.APPDATA || os.homedir(), 'ChuyenAnh-iPhone');
const CFG = path.join(CFG_DIR, 'cai-dat.json');
const DEFAULT_ROOT = path.join(os.homedir(), 'Pictures', 'Tu iPhone');
let ROOT = DEFAULT_ROOT;
try { const c = JSON.parse(fs.readFileSync(CFG, 'utf8')); if (c.root && fs.existsSync(path.parse(c.root).root)) ROOT = c.root; } catch {}
try { fs.mkdirSync(ROOT, { recursive: true }); } catch { ROOT = DEFAULT_ROOT; fs.mkdirSync(ROOT, { recursive: true }); }

function presets() {
  const out = [{ id: 'pictures', label: '🖼️ Thư mục Ảnh (Pictures)', path: DEFAULT_ROOT }];
  if (process.platform === 'win32') {
    for (const L of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
      for (const n of ['My Drive', 'Drive của tôi', 'Mon Drive']) {
        const pth = `${L}:\\${n}`;
        try { if (fs.statSync(pth).isDirectory()) out.push({ id: 'gdrive' + L, label: `☁️ Google Drive (${L}:)`, path: path.join(pth, 'Tu iPhone') }); } catch {}
      }
    }
  }
  const od = process.env.OneDrive || process.env.OneDriveConsumer;
  if (od) { try { if (fs.statSync(od).isDirectory()) out.push({ id: 'onedrive', label: '☁️ OneDrive', path: path.join(od, 'Tu iPhone') }); } catch {} }
  return out;
}
function setRoot(r) {
  fs.mkdirSync(r, { recursive: true });
  ROOT = r;
  INDEX = path.join(ROOT, '.da-nhan.json');
  seen = {}; try { seen = JSON.parse(fs.readFileSync(INDEX, 'utf8')); } catch {}
  try { fs.mkdirSync(CFG_DIR, { recursive: true }); fs.writeFileSync(CFG, JSON.stringify({ root: r })); } catch {}
  console.log('\n  >> Đổi nơi lưu: ' + r + '\n');
}
function pickFolder() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve('');
    const ps = "[Console]::OutputEncoding=[Text.Encoding]::UTF8;Add-Type -AssemblyName System.Windows.Forms;" +
      "$o=New-Object System.Windows.Forms.Form -Property @{TopMost=$true};" +
      "$f=New-Object System.Windows.Forms.FolderBrowserDialog;$f.Description='Chon noi luu anh tu iPhone';$f.ShowNewFolderButton=$true;" +
      "if($f.ShowDialog($o) -eq 'OK'){$f.SelectedPath}";
    const enc = Buffer.from(ps, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -STA -EncodedCommand ${enc}`, { encoding: 'utf8', windowsHide: true, timeout: 600000 },
      (e, out) => resolve((out || '').trim()));
  });
}

//
function lanIPs() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/^169\.254\./.test(a.address)) continue;
      const bad = /vmware|virtual|vbox|hyper-v|vethernet|loopback|tailscale|zerotier|wsl/i.test(name);
      const pri = /^192\.168\./.test(a.address) ? 0 : /^10\./.test(a.address) ? 1 : 2;
      out.push({ ip: a.address, name, score: (bad ? 10 : 0) + pri });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}
const IPS = lanIPs();
const IP = IPS.length ? IPS[0].ip : '127.0.0.1';
const TK = require('crypto').randomBytes(8).toString('hex');   // mã ghép nối: mỗi lần bật app 1 mã mới, nằm trong QR
const URL_PHONE = `http://${IP}:${PORT}/?k=${TK}`;

//
let INDEX = path.join(ROOT, '.da-nhan.json');
let seen = {};
try { seen = JSON.parse(fs.readFileSync(INDEX, 'utf8')); } catch {}
const saveIndex = () => { try { fs.writeFileSync(INDEX, JSON.stringify(seen)); } catch {} };
const keyOf = (name, size) => `${name}|${size}`;

let stats = { files: 0, bytes: 0, recent: [], skip: 0, err: '' };
// V1.53: ổ Google Drive / OneDrive hay khoá file đang đồng bộ → file tạm ghi ở thư mục Temp của máy, xong mới chuyển vào nơi lưu
//        (đổi tên trước, lỗi thì chép sang rồi xoá file tạm, thử lại vài lần)
const TMP_DIR = path.join(os.tmpdir(), 'haohao-transfer'); try { fs.mkdirSync(TMP_DIR, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function moveIn(tmp, dest) {
  let last;
  for (let i = 0; i < 6; i++) {
    try { await fs.promises.rename(tmp, dest); return; } catch (e) { last = e; if (e.code === 'EXDEV') break; }
    await sleep(300 * (i + 1));
  }
  for (let i = 0; i < 6; i++) {
    try { await fs.promises.copyFile(tmp, dest); fs.unlink(tmp, () => {}); return; } catch (e) { last = e; }
    await sleep(500 * (i + 1));
  }
  throw last;
}
const errVi = e => { const c = e && e.code; return c === 'ENOSPC' ? 'Ổ đĩa đầy' : c === 'EPERM' || c === 'EACCES' || c === 'EBUSY' ? 'Thư mục lưu đang bị khoá (Google Drive / OneDrive đang đồng bộ?)' : c === 'ENOENT' ? 'Không thấy thư mục lưu' : (e && e.message) || 'lỗi ghi file'; };
let live = null;

function safeName(n) {
  n = (n || 'file').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim();
  return n.slice(0, 180) || 'file';
}
function uniquePath(dir, name) {
  let p = path.join(dir, name);
  if (!fs.existsSync(p)) return p;
  const ext = path.extname(name), base = path.basename(name, ext);
  for (let i = 2; ; i++) { p = path.join(dir, `${base} (${i})${ext}`); if (!fs.existsSync(p)) return p; }
}
function fmt(b) {
  if (b > 1e9) return (b / 1e9).toFixed(2) + ' GB';
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1e3)) + ' KB';
}

//
function handleUpload(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const size = +q.get('size') || 0;
  const mtime = +q.get('mtime') || Date.now();
  const d = new Date(mtime);
  // thư mục đích: tên thư mục người dùng nhập 
  const segs = [q.get('folder') || '', q.get('rel') || '']
    .join('/').split(/[\\/]+/)
    .filter(s => s.trim()).map(s => safeName(s).replace(/^\.+/, '').trim()).filter(Boolean);
  const sub = segs.length ? segs.join(path.sep)
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const dir = path.join(ROOT, sub);
  if (!dir.startsWith(ROOT)) { res.writeHead(400); return res.end('{}'); }
  try { fs.mkdirSync(dir, { recursive: true }); }
  catch (e) { stats.err = errVi(e); req.resume(); res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: stats.err })); }

  let bb;
  try { bb = Busboy({ headers: req.headers, limits: { files: 1 }, defParamCharset: 'utf8' }); }
  catch (e) { res.writeHead(400); return res.end('bad'); }

  const L = { name: '', got: 0, size, tot: +q.get('tot') || 0, pre: +q.get('pre') || 0, n: +q.get('n') || 0, idx: +q.get('i') || 0, t: Date.now(), done: false };
  live = L;
  let done = false, result = null;
  bb.on('file', (_f, file, info) => {
    const name = safeName(info.filename);
    L.name = name;
    file.on('data', c => { L.got += c.length; L.t = Date.now(); });
    let k = keyOf(segs.length ? sub + path.sep + name : name, size);
    if (size && seen[k]) { file.resume(); stats.skip++; result = { skip: true, name }; return; }
    const tmp = path.join(TMP_DIR, Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.dang-tai');
    const ws = fs.createWriteStream(tmp);
    let got = 0;
    file.on('data', c => (got += c.length));
    file.pipe(ws);
    ws.on('finish', async () => {
      if (size && got !== size) { fs.unlink(tmp, () => {}); result = { error: 'thiếu dữ liệu' }; return finish(); }
      if (!size) {
        const k2 = keyOf(segs.length ? sub + path.sep + name : name, got);
        if (seen[k2]) { fs.unlink(tmp, () => {}); stats.skip++; result = { skip: true, name }; return finish(); }
        k = k2;
      }
      if (q.get('mtime')) { try { fs.utimesSync(tmp, d, d); } catch {} }   // đặt ngày chụp trước khi chuyển (ổ đám mây hay không cho sửa sau)
      let finalPath; L.saving = true; L.t = Date.now(); const ka = setInterval(() => { L.t = Date.now(); }, 5000);   // chép video lớn vào ổ Drive lâu: giữ trạng thái "đang lưu" trên bảng HaoHao
      try { finalPath = uniquePath(dir, name); await moveIn(tmp, finalPath); }
      catch (e) { clearInterval(ka); L.saving = false; fs.unlink(tmp, () => {}); stats.err = errVi(e); result = { error: stats.err }; return finish(); }
      clearInterval(ka); L.saving = false;
      if (q.get('mtime')) { try { fs.utimesSync(finalPath, d, d); } catch {} }
      stats.err = '';
      seen[k] = path.relative(ROOT, finalPath); saveIndex();
      stats.files++; stats.bytes += got;
      stats.recent.unshift({ name: path.basename(finalPath), size: got, sub });
      stats.recent = stats.recent.slice(0, 30);
      console.log(`  ✓ ${sub}\\${path.basename(finalPath)}  (${fmt(got)})`);
      result = { ok: true, name: path.basename(finalPath) };
      finish();
    });
    ws.on('error', e => { stats.err = errVi(e); result = { error: stats.err }; finish(); });
    req.on('aborted', () => { ws.destroy(); fs.unlink(tmp, () => {}); });
  });
  bb.on('close', () => { if (result && (result.skip || result.error)) finish(); });
  function finish() {
    if (done) return; done = true;
    L.t = Date.now(); if (L.n && L.idx >= L.n) L.done = true;
    res.writeHead(result && result.error ? 500 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result || { error: 'không có file' }));
  }
  req.pipe(bb);
}

// ---- trang trên iPhone ----
// V1.51: giao diện trang iPhone đồng bộ HaoHao (nền kem, viền xanh đậm, bóng lệch vàng cam, linh vật)
const HH_ICON = 'data:image/png;base64,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';
const HH_CSS = `body{background:#FFF6E3!important;color:#23305E!important}
.hh-top{display:flex;align-items:center;gap:10px;margin:-4px 0 14px}.hh-top img{width:46px;height:46px;flex:none;filter:drop-shadow(2px 2px 0 #23305E)}
.hh-top b{display:block;font-size:19px;font-weight:800;color:#23305E;line-height:1.15}.hh-top small{display:block;font-size:13px;color:#2E7DD7;font-weight:700;font-style:italic}
.hh-sw{position:relative;display:flex;background:#23305E;border-radius:999px;padding:4px;margin:0 0 14px;box-shadow:4px 4px 0 #F2B544}
.hh-sw a{flex:1;text-align:center;font-size:14px;font-weight:800;padding:10px 4px;border-radius:999px;color:#C9CEDF;text-decoration:none}
.hh-sw a.on{background:#FFFDF6;color:#23305E}
.hh-ok{font-size:13px;color:#2E9E6B;font-weight:700;margin:-6px 0 4px}`;
const HH_TOP = on => `<div class="hh-top"><img src="${HH_ICON}" alt=""><div><b>HaoHao Transfer</b><small>iPhone nhẹ tênh, kỷ niệm vẫn còn nguyên</small></div></div>
<nav class="hh-sw"><a href="/"${on === 'up' ? ' class="on"' : ''}>⬆️ Gửi lên máy tính</a><a href="/nhan"${on === 'nhan' ? ' class="on"' : ''}>⬇️ Nhận từ máy tính</a></nav>`;

const PHONE_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Chuyển ảnh lên PC</title>
<style>
:root{--bg:#FFF6E3;--card:#FFFDF6;--tx:#23305E;--mu:#6B7394;--ac:#23305E;--ok:#2E9E6B;--er:#DC2626;--ln:#E3DCC8;color-scheme:light}
*{box-sizing:border-box}body{margin:0;font:16px -apple-system,system-ui,sans-serif;background:var(--bg);color:var(--tx);padding:20px 16px 40px}
h1{font-size:20px;margin:0 0 4px}.mu{color:var(--mu);font-size:14px}
.card{background:var(--card);border:2px solid #23305E;border-radius:18px;padding:16px;margin-top:16px;box-shadow:5px 5px 0 #F2B544}
.btn{display:block;width:100%;padding:16px;border:0;border-radius:14px;background:#23305E;color:#fff;font-size:17px;font-weight:800;text-align:center;box-shadow:3px 3px 0 #F2B544}
.bar{height:8px;background:var(--ln);border-radius:4px;overflow:hidden;margin:10px 0 6px}.bar i{display:block;height:100%;width:0;background:var(--ac);transition:width .2s}
.row{display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-top:1px solid var(--ln)}
.row:first-child{border-top:0}.ok{color:var(--ok)}.er{color:var(--er)}.sk{color:var(--mu)}
input.hid{display:none}.b2{background:transparent;color:var(--ac);border:1.5px solid var(--ac);margin-top:10px}
.tx{width:100%;padding:12px;border:1px solid var(--ln);border-radius:10px;font-size:16px;background:var(--bg);color:var(--tx);margin:8px 0 12px}.lb{font-size:14px;font-weight:600}.pct{font-size:36px;font-weight:700;margin-top:14px;font-variant-numeric:tabular-nums}code.cp{display:inline-block;word-break:break-all;background:var(--bg);border:1px solid var(--ln);padding:6px 8px;border-radius:8px;font-size:12px;margin:6px 0;color:var(--tx)}.mini{border:1px solid var(--ac);background:none;color:var(--ac);border-radius:8px;padding:5px 10px;font-size:13px}li{margin-bottom:8px}#list{max-height:45vh;overflow:auto}
.tip{font-size:13px;color:var(--mu);line-height:1.5}
.prep{position:relative;margin-top:12px;padding:12px 34px 12px 12px;border-radius:14px;background:#FFF1D6;border:1.5px dashed #F2B544;font-size:14px;line-height:1.45}
.prep b{display:block;font-size:15px}.prep small{display:block;color:var(--mu);margin-top:4px}.prep button{all:unset;position:absolute;top:8px;right:10px;font-size:16px;color:var(--mu);padding:4px}
.ind{height:8px;background:var(--ln);border-radius:4px;overflow:hidden;margin-top:8px;position:relative}.ind i{position:absolute;top:0;bottom:0;width:35%;background:#F2B544;border-radius:4px;animation:ind 1.2s ease-in-out infinite}
@keyframes ind{0%{left:-35%}100%{left:100%}}
${HH_CSS}
</style></head><body>
${HH_TOP('up')}<div class="hh-ok">🟢 Đã kết nối với máy tính</div>
<div class="card">
  <div class="lb">Lưu vào thư mục trên máy tính <span class="mu">(bỏ trống = tự chia theo tháng)</span></div>
  <input id="fd" class="tx" placeholder="VD: Công trình Hoà Xuân" autocomplete="off">
  <label class="btn" for="f">🖼️ Chọn từ thư viện Ảnh</label>
  <input id="f" class="hid" type="file" multiple accept="image/heic,image/heif,image/*,video/*">
  <div class="prep" id="prep" hidden><b id="prt">⏳ iPhone đang chuẩn bị file…</b><div class="ind"><i></i></div><small>Video nặng hoặc ảnh nằm trên iCloud: iPhone phải tải về / nén xong mới gửi, có thể mất vài phút. Giữ màn hình sáng nhé.</small><button type="button" id="prx" aria-label="Ẩn">✕</button></div>
  <div id="st" style="display:none">
    <div class="pct" id="pct">0%</div>
    <div class="bar"><i id="pb"></i></div>
    <div class="mu" id="sum"></div>
  </div>
</div>
<div class="card" id="lc" style="display:none"><div id="list"></div></div>
<div class="card tip"><b style="color:#C2410C">• Giữ màn hình sáng, không tắt Safari khi đang gửi.</b><br>
• Gửi xong: vào Ảnh → chọn các ảnh đã gửi → Xoá, rồi xoá trong "Đã xoá gần đây" để lấy lại dung lượng.<br>
• File đã gửi rồi sẽ tự bỏ qua.</div>
<script>
const fd=document.getElementById('fd'),f=document.getElementById('f'),pb=document.getElementById('pb'),sum=document.getElementById('sum'),pc=document.getElementById('pct'),list=document.getElementById('list');
let lock=null;
async function wake(){try{lock=await navigator.wakeLock.request('screen')}catch(e){}}
const fmt=b=>b>1e9?(b/1e9).toFixed(2)+' GB':b>1e6?(b/1e6).toFixed(1)+' MB':Math.max(1,Math.round(b/1e3))+' KB';
function up(file,onp,extra){return new Promise(r=>{
  const x=new XMLHttpRequest(),fm=new FormData();fm.append('f',file,file.name);
  const rp=(file.webkitRelativePath||'').split('/').slice(0,-1).join('/');
  x.open('POST','/up?size='+file.size+'&mtime='+(file.lastModified||Date.now())+'&folder='+encodeURIComponent(fd.value.trim())+'&rel='+encodeURIComponent(rp)+(extra||''));
  x.upload.onprogress=e=>onp(e.loaded);
  x.onload=()=>{try{r(JSON.parse(x.responseText))}catch(e){r({error:'lỗi máy tính'})}};
  x.onerror=()=>r({error:'mất kết nối'});x.send(fm);})}
try{fd.value=localStorage.getItem('fd')||''}catch(e){}
fd.oninput=()=>{try{localStorage.setItem('fd',fd.value)}catch(e){}};
let busy=false;
// V1.53: từ lúc bấm chọn tới khi iPhone đưa file cho Safari (tải iCloud, nén video) trang không biết %, nên hiện "đang chuẩn bị" + đếm giây
const prep=document.getElementById('prep'),prt=document.getElementById('prt');let prT=null,pr0=0;
function prepOn(){if(busy)return;pr0=Date.now();prep.hidden=false;prt.textContent='⏳ Chọn ảnh / video xong, iPhone sẽ chuẩn bị file…';clearInterval(prT);
  prT=setInterval(()=>{const s=Math.floor((Date.now()-pr0)/1000);if(s>=3)prt.textContent='⏳ iPhone đang chuẩn bị file… '+(s>=60?Math.floor(s/60)+' phút '+(s%60)+' giây':s+' giây')},1000);wake();}
function prepOff(){clearInterval(prT);prep.hidden=true;}
document.querySelector('label[for=f]').addEventListener('click',prepOn);
document.getElementById('prx').onclick=prepOff;
f.addEventListener('cancel',prepOff);
['f'].forEach(id=>{const el=document.getElementById(id);el.onchange=()=>{prepOff();send(el)}});
async function send(inp){
  const files=[...inp.files].filter(x=>!/^[.]/.test(x.name));if(!files.length||busy)return;busy=true;
  document.getElementById('st').style.display='block';document.getElementById('lc').style.display='block';
  wake();
  const total=files.reduce((s,x)=>s+x.size,0);let doneB=0,ok=0,sk=0,er=0;const t0=Date.now();pc.textContent='0%';pb.style.width='0%';
  list.innerHTML='';
  const rows=files.map(x=>{const d=document.createElement('div');d.className='row';d.innerHTML='<span>'+x.name+'</span><span class="mu">'+fmt(x.size)+'</span>';list.appendChild(d);return d});
  for(let i=0;i<files.length;i++){
    const x=files[i],row=rows[i];row.lastChild.textContent='0%';
    const upd=l=>{const fp=x.size?Math.min(100,Math.floor(l/x.size*100)):0;row.lastChild.textContent=fp>=100?'💾 đang lưu':fp+'%';
      const bytes=doneB+Math.min(l,x.size);const p=total?Math.min(100,bytes/total*100):100;
      pb.style.width=p+'%';pc.textContent=Math.floor(p)+'%';
      const sec=(Date.now()-t0)/1000;const sp=sec>2?bytes/sec:0;let eta='';
      if(sp>0){const r=Math.max(0,(total-bytes)/sp);eta=' · còn ~'+(r>=90?Math.ceil(r/60)+' phút':Math.ceil(r)+' giây')}
      sum.textContent=(fp>=100?'💾 Máy tính đang lưu file '+(i+1)+'/'+files.length+'…':'File '+(i+1)+'/'+files.length+' · '+fmt(bytes)+' / '+fmt(total)+(sp?' · '+fmt(sp)+'/s':'')+eta)};
    let res;for(let t=0;t<3;t++){res=await up(x,upd,'&tot='+total+'&pre='+doneB+'&n='+files.length+'&i='+(i+1));if(!res.error)break;}
    doneB+=x.size;
    if(res.ok){ok++;row.lastChild.textContent='✓';row.lastChild.className='ok'}
    else if(res.skip){sk++;row.lastChild.textContent='đã có';row.lastChild.className='sk'}
    else{er++;row.lastChild.textContent='lỗi';row.lastChild.className='er';if(res.error)row.title=res.error;if(res.error&&!document.getElementById('erm')){const m=document.createElement('div');m.id='erm';m.style.cssText='color:#C2410C;font-weight:700;margin:8px 0';m.textContent='⚠️ '+res.error;list.before(m)}}
  }
  pb.style.width='100%';pc.textContent='100%';
  sum.innerHTML='Xong: <b class="ok">'+ok+' đã gửi</b>'+(sk?' · '+sk+' đã có':'')+(er?' · <b class="er">'+er+' lỗi</b>':'')+' · '+fmt(total);
  try{lock&&lock.release()}catch(e){}inp.value='';busy=false;
}
</script></body></html>`;

// ---- trang trên máy tính (mã QR) ----
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 📤 GỬI SANG iPHONE (V1.46): máy tính chọn 1 video hoặc vài ảnh → lưu tạm → iPhone quét QR mở /nhan → xem / tải về
const GUI_DIR = path.join(os.tmpdir(), 'haohao-gui');
let GUI = [];   // [{id, name, size, type, file}]
const URL_NHAN = `http://${IP}:${PORT}/nhan?k=${TK}`;
function guiClear() { GUI = []; try { fs.rmSync(GUI_DIR, { recursive: true, force: true }); } catch {} try { fs.mkdirSync(GUI_DIR, { recursive: true }); } catch {} }
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.heic': 'image/heic', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.webm': 'video/webm' };
function guiPut(req, res) {
  const q = new URL(req.url, 'http://x').searchParams, name = safeName(q.get('name') || 'file'), id = require('crypto').randomBytes(5).toString('hex');
  if (GUI.length >= 30) { res.writeHead(400); return res.end('{"error":"Tối đa 30 file mỗi lần"}'); }
  try { fs.mkdirSync(GUI_DIR, { recursive: true }); } catch {}
  const file = path.join(GUI_DIR, id + path.extname(name).toLowerCase()), out = fs.createWriteStream(file); let got = 0;
  req.on('data', c => { got += c.length; }); req.pipe(out);
  out.on('finish', () => { GUI.push({ id, name, size: got, type: MIME[path.extname(name).toLowerCase()] || 'application/octet-stream', file }); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, id })); });
  out.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); });
}
function guiGet(req, res, id, dl) {
  const f = GUI.find(x => x.id === id); if (!f) { res.writeHead(404); return res.end(); }
  let st; try { st = fs.statSync(f.file); } catch { res.writeHead(404); return res.end(); }
  const h = { 'Content-Type': f.type, 'Accept-Ranges': 'bytes', 'Content-Disposition': (dl ? 'attachment' : 'inline') + "; filename*=UTF-8''" + encodeURIComponent(f.name) };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) { const a = m[1] ? +m[1] : Math.max(0, st.size - (+m[2] || 0)), b = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;   // video trên iPhone cần tải từng đoạn
    res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 }); return fs.createReadStream(f.file, { start: a, end: b }).pipe(res); }
  res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(f.file).pipe(res);
}
function nhanHtml() {
  const it = GUI.map(f => { const u = '/tai/' + f.id, img = /^image\//.test(f.type), vid = /^video\//.test(f.type);
    return `<div class="it">${img ? `<img src="${u}" alt="">` : vid ? `<video src="${u}" controls playsinline preload="metadata"></video>` : '<div class="fi">📄</div>'}
<div class="nm">${esc(f.name)} <span>${fmt(f.size)}</span></div><a class="b" href="${u}?dl=1" download="${esc(f.name)}">⬇️ Tải về</a></div>`; }).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nhận từ máy tính</title>
<style>body{margin:0;font:16px -apple-system,system-ui,sans-serif;background:#FFF6E3;color:#23305E;padding:20px 16px 40px;color-scheme:light}.mu{color:#6B7394;font-size:14px;font-weight:700;margin:-4px 0 12px}
.it{background:#FFFDF6;border:2px solid #23305E;border-radius:18px;padding:10px;margin-bottom:16px;box-shadow:5px 5px 0 #F2B544}.it img,.it video{width:100%;border-radius:10px;display:block;background:#000}
.fi{font-size:48px;text-align:center;padding:20px}.nm{font-size:14px;margin:8px 2px;word-break:break-all}.nm span{color:#6B7394}
.b{display:block;text-align:center;background:#23305E;color:#fff;text-decoration:none;font-weight:800;padding:13px;border-radius:12px;box-shadow:3px 3px 0 #F2B544}
.tip{background:#FFFDF6;border:1.5px dashed #F2B544;border-radius:14px;padding:12px;font-size:14px;line-height:1.5;margin-bottom:16px}.e{text-align:center;color:#6B7394;margin-top:18vh;line-height:1.6}
${HH_CSS}</style></head><body>
${HH_TOP('nhan')}<div class="mu">${GUI.length ? GUI.length + ' file · ' + fmt(GUI.reduce((a, f) => a + f.size, 0)) : ''}</div>
${GUI.length ? `<div class="tip">🖼 <b>Ảnh:</b> chạm giữ vào ảnh → <b>Lưu vào Ảnh</b>.<br>🎬 <b>Video:</b> bấm <b>Tải về</b> → khi tải xong mở app <b>Tệp</b> → chạm giữ video → <b>Chia sẻ → Lưu video</b>.</div>${it}`
  : '<div class="e">Máy tính chưa gửi file nào.<br>Trên máy tính: kéo thả ảnh / video vào <b>linh vật HaoHao</b>.</div>'}
</body></html>`;
}

async function pcHtml() {
  const svg = await QRCode.toString(URL_PHONE, { type: 'svg', margin: 1, width: 260 });
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Chuyển Ảnh iPhone</title>
<style>body{margin:0;font:15px system-ui,'Segoe UI',sans-serif;background:#F5F6F8;color:#111;display:flex;justify-content:center;padding:32px}
.w{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:28px;width:420px;text-align:center}
h1{font-size:20px;margin:0 0 6px}.mu{color:#6B7280;font-size:13px}.qr{width:260px;margin:18px auto}
code{background:#F3F4F6;padding:4px 8px;border-radius:6px;font-size:15px}
button{margin-top:14px;padding:10px 16px;border:1px solid #D1D5DB;border-radius:8px;background:#fff;font-size:14px;cursor:pointer}

.nl{margin-top:18px;text-align:left;border-top:1px solid #E5E7EB;padding-top:14px}.nlh{font-weight:600;margin-bottom:6px}
.cur{background:#F3F4F6;border-radius:8px;padding:8px 10px;font-size:13px;word-break:break-all;margin-top:14px;text-align:left}
.opts{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}.op{margin:0;text-align:left}.op.on{border-color:#2563EB;background:#EFF6FF;color:#1D4ED8;font-weight:600}
.bar{height:10px;background:#E5E7EB;border-radius:5px;overflow:hidden;margin:6px 0}.bar i{display:block;height:100%;width:0;background:#2563EB;transition:width .3s}
table{width:100%;margin-top:16px;border-collapse:collapse;font-size:13px;text-align:left}td{padding:5px 0;border-top:1px solid #F0F0F0}td:last-child{text-align:right;color:#6B7280}
</style></head><body><div class="w">
<h1>📲 Quét mã bằng Camera iPhone</h1>
<div class="mu">iPhone và máy tính phải cùng 1 mạng Wi-Fi</div>
<div class="qr">${svg}</div>
<div>hoặc gõ vào Safari: <code>${URL_PHONE}</code></div>
<div id="s" class="mu" style="margin-top:14px"></div>
<div id="lv" style="display:none;margin-top:10px;text-align:left"><div style="display:flex;justify-content:space-between;font-size:14px"><b id="lp">0%</b><span class="mu" id="lt"></span></div><div class="bar"><i id="lb"></i></div><div class="mu" id="ln" style="word-break:break-all"></div></div>
<div class="cur" title="${esc(ROOT)}">Lưu tại: <b>${esc(ROOT)}</b></div>
<button onclick="fetch('/mo',{headers:{'x-haohao':'1'}})">📂 Mở thư mục ảnh</button>
<button id="khac">🔁 Đổi thư mục lưu</button>
<table id="t"></table>
<div class="nl" id="gui"><div class="nlh">📤 Gửi sang iPhone</div><div class="mu">Chọn 1 video hoặc vài ảnh. iPhone quét mã là xem và tải về được.</div>
<input type="file" id="gf" multiple accept="image/*,video/*" style="display:none"><button id="gb">📤 Chọn file để gửi</button>
<div id="gp" style="display:none;margin-top:10px"><div class="mu" id="gt"></div><div class="bar"><i id="gbar"></i></div></div>
<div id="gq" style="display:none;text-align:center"><div class="qr" id="gqr"></div><div class="mu">iPhone quét mã này bằng Camera để nhận file</div><div id="gl" class="mu" style="margin-top:6px"></div></div></div>

</div><script>
async function r(){try{const j=await (await fetch('/tt',{headers:{'x-haohao':'1'}})).json();
const lv=document.getElementById('lv');
if(j.live){lv.style.display='block';const a=j.live.all!=null?j.live.all:j.live.file;
 document.getElementById('lp').textContent=j.live.done?'✓ Xong đợt này':a+'%';
 document.getElementById('lb').style.width=(j.live.done?100:a)+'%';
 document.getElementById('lt').textContent=(j.live.n?'File '+j.live.i+'/'+j.live.n:'')+(j.live.tot?' · '+j.live.got+' / '+j.live.tot:'');
 document.getElementById('ln').textContent=j.live.done?'':'Đang nhận: '+j.live.name+' ('+j.live.file+'%)';}else lv.style.display='none';
document.getElementById('s').textContent=j.files?('Đã nhận '+j.files+' file · '+j.size):'Đang chờ iPhone…';
document.getElementById('t').innerHTML=j.recent.map(x=>'<tr><td>'+x.sub+' / '+x.name.replace(/</g,'')+'</td><td>'+x.size+'</td></tr>').join('');}catch(e){}}
r();setInterval(r,1000);
const gf=document.getElementById('gf');document.getElementById('gb').onclick=()=>gf.click();
if(location.hash==='#gui')setTimeout(()=>{document.getElementById('gui').scrollIntoView({behavior:'smooth'});},300);
gf.onchange=async()=>{const fs=[...gf.files];if(!fs.length)return;const tot=fs.reduce((a,f)=>a+f.size,0);let done=0;
 document.getElementById('gp').style.display='block';document.getElementById('gq').style.display='none';
 await fetch('/gui-moi',{method:'POST',headers:{'x-haohao':'1'}});
 for(const [i,f] of fs.entries()){await new Promise((ok,no)=>{const x=new XMLHttpRequest();x.open('POST','/gui?name='+encodeURIComponent(f.name));x.setRequestHeader('x-haohao','1');
  x.upload.onprogress=e=>{const a=Math.floor((done+e.loaded)/tot*100);document.getElementById('gbar').style.width=a+'%';document.getElementById('gt').textContent='Đang chuẩn bị '+(i+1)+'/'+fs.length+' · '+a+'%';};
  x.onload=()=>x.status==200?ok():no(new Error(x.responseText));x.onerror=()=>no(new Error('Mất kết nối'));x.send(f);});done+=f.size;}
 document.getElementById('gt').textContent='✓ Sẵn sàng '+fs.length+' file';document.getElementById('gbar').style.width='100%';
 const j=await (await fetch('/gui-ds',{headers:{'x-haohao':'1'}})).json();document.getElementById('gqr').innerHTML=j.qr;
 document.getElementById('gl').textContent=j.files.map(f=>f.name).join(' · ');document.getElementById('gq').style.display='block';gf.value='';};
async function dat(p){const j=await (await fetch('/noi-luu?path='+encodeURIComponent(p),{method:'POST',headers:{'x-haohao':'1'}})).json();if(j.error)alert(j.error);else location.reload();}
document.getElementById('khac').onclick=async e=>{e.target.textContent='Đang mở hộp chọn thư mục…';
 const j=await (await fetch('/chon-thu-muc',{method:'POST',headers:{'x-haohao':'1'}})).json();if(j.path)dat(j.path);else e.target.textContent='🔁 Đổi thư mục lưu';};
</script></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const p = req.url.split('?')[0];
  const ck = (req.headers.cookie || '').match(/(?:^|;\s*)hk=([0-9a-f]+)/), kq = new URL(req.url, 'http://x').searchParams.get('k'), paired = (ck && ck[1] === TK) || kq === TK;
  if (req.method === 'POST' && p === '/up') { if (!paired) { res.writeHead(403); return res.end('{"error":"Quét lại mã QR trên máy tính"}'); } return handleUpload(req, res); }
  const isLocal = /^(::ffff:)?127\.0\.0\.1$|^::1$/.test(req.socket.remoteAddress)
    && (!req.headers.origin || req.headers.origin === `http://127.0.0.1:${PORT}` || /^chrome-extension:\/\//.test(req.headers.origin));
  const ctl = isLocal && req.headers['x-haohao'] === '1';   // lệnh điều khiển: chỉ HaoHao / trang /pc (trang web lạ không gửi được header này)
  if (p === '/pc' && isLocal) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(await pcHtml()); }
  if (p === '/info' && ctl) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ url: URL_PHONE, host: os.hostname(), up: 1, gui: 1 })); }
  if (p === '/tt' && ctl) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let lv = null;
    if (live && Date.now() - live.t < 20000) {
      const cur = live.size ? Math.min(live.got, live.size) : live.got;
      lv = { name: live.name, n: live.n, i: live.idx, done: live.done, saving: !!live.saving,
        file: live.size ? Math.min(100, Math.floor(cur / live.size * 100)) : 0,
        all: live.tot ? Math.min(100, Math.floor((live.pre + cur) / live.tot * 100)) : null,
        got: fmt(live.pre + cur), tot: live.tot ? fmt(live.tot) : '' };
    }
    return res.end(JSON.stringify({ root: ROOT, live: lv, files: stats.files, size: fmt(stats.bytes), recent: stats.recent.map(x => ({ ...x, size: fmt(x.size) })), skip: stats.skip, err: stats.err }));
  }
  if (p === '/noi-luu' && req.method === 'POST' && ctl) {
    const np = new URL(req.url, 'http://x').searchParams.get('path') || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (!np || !path.isAbsolute(np)) return res.end(JSON.stringify({ error: 'Đường dẫn không hợp lệ' }));
    try { setRoot(np); return res.end(JSON.stringify({ ok: true })); }
    catch (e) { return res.end(JSON.stringify({ error: 'Không ghi được vào thư mục này: ' + e.message })); }
  }
  if (p === '/chon-thu-muc' && req.method === 'POST' && ctl) {
    const r = await pickFolder();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ path: r }));
  }
  if (p === '/capnhat' && ctl) { let r; try { r = await capNhat(new URL(req.url, 'http://x').searchParams.get('id') || ''); } catch (e) { r = { error: String(e && e.message || e) }; } res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(r)); }
  if (p === '/thoat' && ctl) { res.writeHead(200); res.end('{}'); setTimeout(() => process.exit(0), 200); return; }
  if (p === '/gui-moi' && req.method === 'POST' && ctl) { guiClear(); res.writeHead(200); return res.end('{}'); }
  if (p === '/gui' && req.method === 'POST' && ctl) return guiPut(req, res);
  if (p === '/gui-ds' && ctl) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ url: URL_NHAN, qr: await QRCode.toString(URL_NHAN, { type: 'svg', margin: 1, width: 240 }), files: GUI.map(f => ({ id: f.id, name: f.name, size: fmt(f.size) })) })); }
  if (p === '/nhan') { if (!paired) { res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<meta name=viewport content="width=device-width"><h3 style="font-family:system-ui;text-align:center;margin-top:40vh">🔒 Quét lại mã QR trên máy tính nhé</h3>'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `hk=${TK}; Path=/; HttpOnly; SameSite=Strict`, 'Cache-Control': 'no-store' }); return res.end(nhanHtml()); }
  if (p.startsWith('/tai/')) { if (!paired && !isLocal) { res.writeHead(403); return res.end(); } return guiGet(req, res, p.slice(5).replace(/[^0-9a-f]/g, ''), new URL(req.url, 'http://x').searchParams.get('dl') === '1'); }
  if (p === '/mo' && ctl) { exec(`explorer "${ROOT}"`); res.writeHead(204); return res.end(); }
  if (p === '/') { if (!paired) { res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<meta name=viewport content="width=device-width"><h3 style="font-family:system-ui;text-align:center;margin-top:40vh">🔒 Quét lại mã QR trên máy tính nhé</h3>'); } res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `hk=${TK}; Path=/; HttpOnly; SameSite=Strict` }); return res.end(PHONE_HTML); }
  res.writeHead(404); res.end();
});
server.requestTimeout = 0; server.timeout = 0; // video lớn không bị cắt

server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log('\n  Chương trình đang chạy rồi. Mở trình duyệt: http://127.0.0.1:' + PORT + '/pc'); process.exit(0); }
  else console.log('Lỗi:', e.message);
});

function openPc() { if (process.platform === 'win32') exec(`start "" "http://127.0.0.1:${PORT}/pc"`); }

server.listen(PORT, '0.0.0.0', async () => {
  console.log('\n  ===== CHUYỂN ẢNH iPHONE → MÁY TÍNH =====\n');
  console.log(await QRCode.toString(URL_PHONE, { type: 'terminal', small: true }));
  console.log('  Quét mã trên bằng Camera iPhone, hoặc gõ vào Safari:');
  console.log('  ' + URL_PHONE + '\n');
  if (IPS.length > 1) console.log('  (Nếu không vào được, thử: ' + IPS.slice(1).map(x => `http://${x.ip}:${PORT}/`).join('  ') + ')\n');
  console.log('  Ảnh lưu tại: ' + ROOT);
  console.log('  Lần đầu Windows hỏi "Allow access" → bấm Cho phép (tick cả Private).');
  console.log('  Đóng cửa sổ này = tắt chương trình.\n');
  regProto();
});
function regProto() {
if (process.platform !== 'win32') return;
const k = 'HKCU\\Software\\Classes\\haohao-transfer', x = process.execPath.replace(/"/g, '');
exec(`reg add "${k}" /ve /d "URL:HaoHao Transfer" /f & reg add "${k}" /v "URL Protocol" /d "" /f & reg add "${k}\\shell\\open\\command" /ve /d "\\"${x}\\"" /f`, { windowsHide: true }, () => {});
}

// HaoHao tự cập nhật (V1): tải bản mới từ GitHub, ghi đè thư mục HaoHao (bản cài giải nén) → HaoHao tự nạp lại
const https = require('https');
function dl(u, f, n = 0) {
  return new Promise((ok, no) => {
    https.get(u, { headers: { 'User-Agent': 'HaoHao' } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && n < 5) { r.resume(); return dl(new URL(r.headers.location, u).href, f, n + 1).then(ok, no); }
      if (r.statusCode !== 200) { r.resume(); return no(new Error('HTTP ' + r.statusCode)); }
      const b = []; r.on('data', c => b.push(c)); r.on('end', () => { const d = Buffer.concat(b); if (f) fs.writeFileSync(f, d); ok(d); });
    }).on('error', no);
  });
}
function extDir(id) {
  const L = process.env.LOCALAPPDATA || '';
  for (const b of ['Google\\Chrome', 'CocCoc\\Browser', 'Microsoft\\Edge', 'BraveSoftware\\Brave-Browser']) {
    const ud = path.join(L, b, 'User Data'); let ds = []; try { ds = fs.readdirSync(ud); } catch { continue; }
    for (const d of ds) for (const n of ['Secure Preferences', 'Preferences']) {
      try { const j = JSON.parse(fs.readFileSync(path.join(ud, d, n), 'utf8')), s = j.extensions && j.extensions.settings && j.extensions.settings[id];
        if (s && s.path && path.isAbsolute(s.path) && fs.existsSync(path.join(s.path, 'manifest.json'))) return s.path; } catch {}
    }
  }
  return '';
}
const UPD = 'https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/';
async function capNhat(id) {
  if (process.platform !== 'win32') return { error: 'Chỉ chạy trên Windows' };
  if (!/^[a-p]{32}$/.test(id)) return { error: 'id' };
  const dir = extDir(id); if (!dir) return { error: 'Không tìm thấy thư mục HaoHao' };
  if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, '..', 'content.1.10.199.bak.js'))) return { error: 'Máy chủ app: không tự ghi đè' };
  const j = JSON.parse((await dl(UPD + 'haohao-latest.json')).toString());
  if (!/^[\w.-]+\.zip$/.test(j.file || '')) return { error: 'file' };
  const tmp = path.join(os.tmpdir(), 'haohao-up'), z = tmp + '.zip';
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  await dl(UPD + j.file, z);
  // chữ ký số: chỉ cài gói do chủ app ký (khoá riêng nằm trên máy chủ app, không có trên GitHub)
  const crypto = require('crypto'), PUB = crypto.createPublicKey({ key: Buffer.from('MCowBQYDK2VwAyEAvmkfSaXXZjW5QtfkhMfELl9V8ikDkTGfXL4Qkm5mSb8=', 'base64'), format: 'der', type: 'spki' });
  if (!j.sig || !crypto.verify(null, fs.readFileSync(z), PUB, Buffer.from(String(j.sig), 'base64'))) return { error: 'Chữ ký gói không đúng – không cài' };
  const q = x => "'" + x.replace(/'/g, "''") + "'";
  await new Promise((ok, no) => exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force -LiteralPath ${q(z)} -DestinationPath ${q(tmp)}; $s = (Get-ChildItem -LiteralPath ${q(tmp)} -Recurse -Filter manifest.json | Select-Object -First 1).DirectoryName; if (!$s) { $s = ${q(tmp)} }; Copy-Item -Recurse -Force -Path (Join-Path $s '*') -Destination ${q(dir)}"`, { windowsHide: true }, e => e ? no(e) : ok()));
  return { ok: true, dir, v: j.name };
}
