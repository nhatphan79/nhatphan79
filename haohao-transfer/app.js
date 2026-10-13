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

let stats = { files: 0, bytes: 0, recent: [] };
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
  fs.mkdirSync(dir, { recursive: true });

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
    if (size && seen[k]) { file.resume(); result = { skip: true, name }; return; }
    const finalPath = uniquePath(dir, name);
    const tmp = finalPath + '.dang-tai';
    const ws = fs.createWriteStream(tmp);
    let got = 0;
    file.on('data', c => (got += c.length));
    file.pipe(ws);
    ws.on('finish', () => {
      if (size && got !== size) { fs.unlink(tmp, () => {}); result = { error: 'thiếu dữ liệu' }; return finish(); }
      if (!size) {
        const k2 = keyOf(segs.length ? sub + path.sep + name : name, got);
        if (seen[k2]) { fs.unlink(tmp, () => {}); result = { skip: true, name }; return finish(); }
        k = k2;
      }
      fs.renameSync(tmp, finalPath);
      if (q.get('mtime')) { try { fs.utimesSync(finalPath, d, d); } catch {} }
      seen[k] = path.relative(ROOT, finalPath); saveIndex();
      stats.files++; stats.bytes += got;
      stats.recent.unshift({ name: path.basename(finalPath), size: got, sub });
      stats.recent = stats.recent.slice(0, 30);
      console.log(`  ✓ ${sub}\\${path.basename(finalPath)}  (${fmt(got)})`);
      result = { ok: true, name: path.basename(finalPath) };
      finish();
    });
    ws.on('error', e => { result = { error: e.message }; finish(); });
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
const PHONE_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Chuyển ảnh lên PC</title>
<style>
:root{--bg:#F5F6F8;--card:#fff;--tx:#111;--mu:#6B7280;--ac:#2563EB;--ok:#16A34A;--er:#DC2626;--ln:#E5E7EB}
@media(prefers-color-scheme:dark){:root{--bg:#0B0C0E;--card:#17181B;--tx:#F3F4F6;--mu:#9CA3AF;--ln:#2A2C31}}
*{box-sizing:border-box}body{margin:0;font:16px -apple-system,system-ui,sans-serif;background:var(--bg);color:var(--tx);padding:20px 16px 40px}
h1{font-size:20px;margin:0 0 4px}.mu{color:var(--mu);font-size:14px}
.card{background:var(--card);border:1px solid var(--ln);border-radius:14px;padding:16px;margin-top:16px}
.btn{display:block;width:100%;padding:16px;border:0;border-radius:12px;background:var(--ac);color:#fff;font-size:17px;font-weight:600;text-align:center}
.bar{height:8px;background:var(--ln);border-radius:4px;overflow:hidden;margin:10px 0 6px}.bar i{display:block;height:100%;width:0;background:var(--ac);transition:width .2s}
.row{display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-top:1px solid var(--ln)}
.row:first-child{border-top:0}.ok{color:var(--ok)}.er{color:var(--er)}.sk{color:var(--mu)}
input.hid{display:none}.b2{background:transparent;color:var(--ac);border:1.5px solid var(--ac);margin-top:10px}
.tx{width:100%;padding:12px;border:1px solid var(--ln);border-radius:10px;font-size:16px;background:var(--bg);color:var(--tx);margin:8px 0 12px}.lb{font-size:14px;font-weight:600}.pct{font-size:36px;font-weight:700;margin-top:14px;font-variant-numeric:tabular-nums}code.cp{display:inline-block;word-break:break-all;background:var(--bg);border:1px solid var(--ln);padding:6px 8px;border-radius:8px;font-size:12px;margin:6px 0;color:var(--tx)}.mini{border:1px solid var(--ac);background:none;color:var(--ac);border-radius:8px;padding:5px 10px;font-size:13px}li{margin-bottom:8px}#list{max-height:45vh;overflow:auto}
.tip{font-size:13px;color:var(--mu);line-height:1.5}
</style></head><body>
<h1>📲 Chuyển ảnh lên PC</h1><div class="mu">Đã kết nối với máy tính</div>
<div class="card">
  <div class="lb">Lưu vào thư mục trên máy tính <span class="mu">(bỏ trống = tự chia theo tháng)</span></div>
  <input id="fd" class="tx" placeholder="VD: Công trình Hoà Xuân" autocomplete="off">
  <label class="btn" for="f">🖼️ Chọn từ thư viện Ảnh</label>
  <input id="f" class="hid" type="file" multiple accept="image/heic,image/heif,image/*,video/*">
  <div id="st" style="display:none">
    <div class="pct" id="pct">0%</div>
    <div class="bar"><i id="pb"></i></div>
    <div class="mu" id="sum"></div>
  </div>
</div>
<div class="card" id="lc" style="display:none"><div id="list"></div></div>
<div class="card tip">• Giữ màn hình sáng, không tắt Safari khi đang gửi.<br>
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
['f'].forEach(id=>{const el=document.getElementById(id);el.onchange=()=>send(el)});
async function send(inp){
  const files=[...inp.files].filter(x=>!/^[.]/.test(x.name));if(!files.length||busy)return;busy=true;
  document.getElementById('st').style.display='block';document.getElementById('lc').style.display='block';
  wake();
  const total=files.reduce((s,x)=>s+x.size,0);let doneB=0,ok=0,sk=0,er=0;const t0=Date.now();pc.textContent='0%';pb.style.width='0%';
  list.innerHTML='';
  const rows=files.map(x=>{const d=document.createElement('div');d.className='row';d.innerHTML='<span>'+x.name+'</span><span class="mu">'+fmt(x.size)+'</span>';list.appendChild(d);return d});
  for(let i=0;i<files.length;i++){
    const x=files[i],row=rows[i];row.lastChild.textContent='0%';
    const upd=l=>{const fp=x.size?Math.min(100,Math.floor(l/x.size*100)):0;row.lastChild.textContent=fp+'%';
      const bytes=doneB+Math.min(l,x.size);const p=total?Math.min(100,bytes/total*100):100;
      pb.style.width=p+'%';pc.textContent=Math.floor(p)+'%';
      const sec=(Date.now()-t0)/1000;const sp=sec>2?bytes/sec:0;let eta='';
      if(sp>0){const r=Math.max(0,(total-bytes)/sp);eta=' · còn ~'+(r>=90?Math.ceil(r/60)+' phút':Math.ceil(r)+' giây')}
      sum.textContent='File '+(i+1)+'/'+files.length+' · '+fmt(bytes)+' / '+fmt(total)+(sp?' · '+fmt(sp)+'/s':'')+eta};
    let res;for(let t=0;t<3;t++){res=await up(x,upd,'&tot='+total+'&pre='+doneB+'&n='+files.length+'&i='+(i+1));if(!res.error)break;}
    doneB+=x.size;
    if(res.ok){ok++;row.lastChild.textContent='✓';row.lastChild.className='ok'}
    else if(res.skip){sk++;row.lastChild.textContent='đã có';row.lastChild.className='sk'}
    else{er++;row.lastChild.textContent='lỗi';row.lastChild.className='er'}
  }
  pb.style.width='100%';pc.textContent='100%';
  sum.innerHTML='Xong: <b class="ok">'+ok+' đã gửi</b>'+(sk?' · '+sk+' đã có':'')+(er?' · <b class="er">'+er+' lỗi</b>':'')+' · '+fmt(total);
  try{lock&&lock.release()}catch(e){}inp.value='';busy=false;
}
</script></body></html>`;

// ---- trang trên máy tính (mã QR) ----
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  if (p === '/info' && ctl) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ url: URL_PHONE, host: os.hostname(), up: 1 })); }
  if (p === '/tt' && ctl) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let lv = null;
    if (live && Date.now() - live.t < 20000) {
      const cur = live.size ? Math.min(live.got, live.size) : live.got;
      lv = { name: live.name, n: live.n, i: live.idx, done: live.done,
        file: live.size ? Math.min(100, Math.floor(cur / live.size * 100)) : 0,
        all: live.tot ? Math.min(100, Math.floor((live.pre + cur) / live.tot * 100)) : null,
        got: fmt(live.pre + cur), tot: live.tot ? fmt(live.tot) : '' };
    }
    return res.end(JSON.stringify({ root: ROOT, live: lv, files: stats.files, size: fmt(stats.bytes), recent: stats.recent.map(x => ({ ...x, size: fmt(x.size) })) }));
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
  await new Promise((ok, no) => exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force -LiteralPath ${q(z)} -DestinationPath ${q(tmp)}; Copy-Item -Recurse -Force -Path (Join-Path ${q(tmp)} '*') -Destination ${q(dir)}"`, { windowsHide: true }, e => e ? no(e) : ok()));
  return { ok: true, dir, v: j.name };
}
