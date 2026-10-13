const Q=require("http"),P=require("os"),r=require("fs"),a=require("path"),{exec:F}=require("child_process"),X=require("busboy"),A=require("qrcode");process.on("uncaughtException",t=>{console.log(`
  LỖI: `+(t&&t.stack||t));try{require("fs").writeFileSync(require("path").join(process.cwd(),"loi.txt"),String(t&&t.stack||t))}catch{}console.log(`
  Nhấn Enter để đóng...`),process.stdin.resume(),process.stdin.once("data",()=>process.exit(1))});const k=8686,R=a.join(process.env.APPDATA||P.homedir(),"ChuyenAnh-iPhone"),U=a.join(R,"cai-dat.json"),I=a.join(P.homedir(),"Pictures","Tu iPhone");let u=I;try{const t=JSON.parse(r.readFileSync(U,"utf8"));t.root&&r.existsSync(a.parse(t.root).root)&&(u=t.root)}catch{}try{r.mkdirSync(u,{recursive:!0})}catch{u=I,r.mkdirSync(u,{recursive:!0})}function lt(){const t=[{id:"pictures",label:"🖼️ Thư mục Ảnh (Pictures)",path:I}];if(process.platform==="win32")for(const n of"DEFGHIJKLMNOPQRSTUVWXYZ")for(const o of["My Drive","Drive của tôi","Mon Drive"]){const l=`${n}:\\${o}`;try{r.statSync(l).isDirectory()&&t.push({id:"gdrive"+n,label:`☁️ Google Drive (${n}:)`,path:a.join(l,"Tu iPhone")})}catch{}}const e=process.env.OneDrive||process.env.OneDriveConsumer;if(e)try{r.statSync(e).isDirectory()&&t.push({id:"onedrive",label:"☁️ OneDrive",path:a.join(e,"Tu iPhone")})}catch{}return t}function _(t){r.mkdirSync(t,{recursive:!0}),u=t,H=a.join(u,".da-nhan.json"),v={};try{v=JSON.parse(r.readFileSync(H,"utf8"))}catch{}try{r.mkdirSync(R,{recursive:!0}),r.writeFileSync(U,JSON.stringify({root:t}))}catch{}console.log(`
  >> Đổi nơi lưu: `+t+`
`)}function Y(){return new Promise(t=>{if(process.platform!=="win32")return t("");const n=Buffer.from("[Console]::OutputEncoding=[Text.Encoding]::UTF8;Add-Type -AssemblyName System.Windows.Forms;$o=New-Object System.Windows.Forms.Form -Property @{TopMost=$true};$f=New-Object System.Windows.Forms.FolderBrowserDialog;$f.Description='Chon noi luu anh tu iPhone';$f.ShowNewFolderButton=$true;if($f.ShowDialog($o) -eq 'OK'){$f.SelectedPath}","utf16le").toString("base64");F(`powershell -NoProfile -STA -EncodedCommand ${n}`,{encoding:"utf8",windowsHide:!0,timeout:6e5},(o,l)=>t((l||"").trim()))})}function V(){const t=[];for(const[e,n]of Object.entries(P.networkInterfaces()))for(const o of n||[]){if(o.family!=="IPv4"||o.internal||/^169\.254\./.test(o.address))continue;const l=/vmware|virtual|vbox|hyper-v|vethernet|loopback|tailscale|zerotier|wsl/i.test(e),i=/^192\.168\./.test(o.address)?0:/^10\./.test(o.address)?1:2;t.push({ip:o.address,name:e,score:(l?10:0)+i})}return t.sort((e,n)=>e.score-n.score)}const z=V(),Z=z.length?z[0].ip:"127.0.0.1",D=require("crypto").randomBytes(8).toString("hex"),E=`http://${Z}:${k}/?k=${D}`;let H=a.join(u,".da-nhan.json"),v={};try{v=JSON.parse(r.readFileSync(H,"utf8"))}catch{}const tt=()=>{try{r.writeFileSync(H,JSON.stringify(v))}catch{}},J=(t,e)=>`${t}|${e}`;let y={files:0,bytes:0,recent:[]},d=null;function G(t){return t=(t||"file").replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").trim(),t.slice(0,180)||"file"}function et(t,e){let n=a.join(t,e);if(!r.existsSync(n))return n;const o=a.extname(e),l=a.basename(e,o);for(let i=2;;i++)if(n=a.join(t,`${l} (${i})${o}`),!r.existsSync(n))return n}function B(t){return t>1e9?(t/1e9).toFixed(2)+" GB":t>1e6?(t/1e6).toFixed(1)+" MB":Math.max(1,Math.round(t/1e3))+" KB"}function nt(t,e){const n=new URL(t.url,"http://x").searchParams,o=+n.get("size")||0,l=+n.get("mtime")||Date.now(),i=new Date(l),h=[n.get("folder")||"",n.get("rel")||""].join("/").split(/[\\/]+/).filter(C=>C.trim()).map(C=>G(C).replace(/^\.+/,"").trim()).filter(Boolean),c=h.length?h.join(a.sep):`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,"0")}`,s=a.join(u,c);if(!s.startsWith(u))return e.writeHead(400),e.end("{}");r.mkdirSync(s,{recursive:!0});let p;try{p=X({headers:t.headers,limits:{files:1},defParamCharset:"utf8"})}catch{return e.writeHead(400),e.end("bad")}const m={name:"",got:0,size:o,tot:+n.get("tot")||0,pre:+n.get("pre")||0,n:+n.get("n")||0,idx:+n.get("i")||0,t:Date.now(),done:!1};d=m;let L=!1,f=null;p.on("file",(C,$,K)=>{const g=G(K.filename);m.name=g,$.on("data",x=>{m.got+=x.length,m.t=Date.now()});let N=J(h.length?c+a.sep+g:g,o);if(o&&v[N]){$.resume(),f={skip:!0,name:g};return}const b=et(s,g),j=b+".dang-tai",T=r.createWriteStream(j);let w=0;$.on("data",x=>w+=x.length),$.pipe(T),T.on("finish",()=>{if(o&&w!==o)return r.unlink(j,()=>{}),f={error:"thiếu dữ liệu"},S();if(!o){const x=J(h.length?c+a.sep+g:g,w);if(v[x])return r.unlink(j,()=>{}),f={skip:!0,name:g},S();N=x}if(r.renameSync(j,b),n.get("mtime"))try{r.utimesSync(b,i,i)}catch{}v[N]=a.relative(u,b),tt(),y.files++,y.bytes+=w,y.recent.unshift({name:a.basename(b),size:w,sub:c}),y.recent=y.recent.slice(0,30),console.log(`  ✓ ${c}\\${a.basename(b)}  (${B(w)})`),f={ok:!0,name:a.basename(b)},S()}),T.on("error",x=>{f={error:x.message},S()}),t.on("aborted",()=>{T.destroy(),r.unlink(j,()=>{})})}),p.on("close",()=>{f&&(f.skip||f.error)&&S()});function S(){L||(L=!0,m.t=Date.now(),m.n&&m.idx>=m.n&&(m.done=!0),e.writeHead(f&&f.error?500:200,{"Content-Type":"application/json"}),e.end(JSON.stringify(f||{error:"không có file"})))}t.pipe(p)}const ot=`<!doctype html><html lang="vi"><head><meta charset="utf-8">
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
</script></body></html>`,W=t=>String(t).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);async function it(){return`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Chuyển Ảnh iPhone</title>
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
<div class="qr">${await A.toString(E,{type:"svg",margin:1,width:260})}</div>
<div>hoặc gõ vào Safari: <code>${E}</code></div>
<div id="s" class="mu" style="margin-top:14px"></div>
<div id="lv" style="display:none;margin-top:10px;text-align:left"><div style="display:flex;justify-content:space-between;font-size:14px"><b id="lp">0%</b><span class="mu" id="lt"></span></div><div class="bar"><i id="lb"></i></div><div class="mu" id="ln" style="word-break:break-all"></div></div>
<div class="cur" title="${W(u)}">Lưu tại: <b>${W(u)}</b></div>
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
</script></body></html>`}const O=Q.createServer(async(t,e)=>{const n=t.url.split("?")[0],o=(t.headers.cookie||"").match(/(?:^|;\s*)hk=([0-9a-f]+)/),l=new URL(t.url,"http://x").searchParams.get("k"),i=o&&o[1]===D||l===D;if(t.method==="POST"&&n==="/up")return i?nt(t,e):(e.writeHead(403),e.end('{"error":"Quét lại mã QR trên máy tính"}'));const h=/^(::ffff:)?127\.0\.0\.1$|^::1$/.test(t.socket.remoteAddress)&&(!t.headers.origin||t.headers.origin===`http://127.0.0.1:${k}`||/^chrome-extension:\/\//.test(t.headers.origin)),c=h&&t.headers["x-haohao"]==="1";if(n==="/pc"&&h)return e.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}),e.end(await it());if(n==="/info"&&c)return e.writeHead(200,{"Content-Type":"application/json"}),e.end(JSON.stringify({url:E,host:P.hostname(),up:1}));if(n==="/tt"&&c){e.writeHead(200,{"Content-Type":"application/json"});let s=null;if(d&&Date.now()-d.t<2e4){const p=d.size?Math.min(d.got,d.size):d.got;s={name:d.name,n:d.n,i:d.idx,done:d.done,file:d.size?Math.min(100,Math.floor(p/d.size*100)):0,all:d.tot?Math.min(100,Math.floor((d.pre+p)/d.tot*100)):null,got:B(d.pre+p),tot:d.tot?B(d.tot):""}}return e.end(JSON.stringify({root:u,live:s,files:y.files,size:B(y.bytes),recent:y.recent.map(p=>({...p,size:B(p.size)}))}))}if(n==="/noi-luu"&&t.method==="POST"&&c){const s=new URL(t.url,"http://x").searchParams.get("path")||"";if(e.writeHead(200,{"Content-Type":"application/json"}),!s||!a.isAbsolute(s))return e.end(JSON.stringify({error:"Đường dẫn không hợp lệ"}));try{return _(s),e.end(JSON.stringify({ok:!0}))}catch(p){return e.end(JSON.stringify({error:"Không ghi được vào thư mục này: "+p.message}))}}if(n==="/chon-thu-muc"&&t.method==="POST"&&c){const s=await Y();return e.writeHead(200,{"Content-Type":"application/json"}),e.end(JSON.stringify({path:s}))}if(n==="/capnhat"&&c){let s;try{s=await ct(new URL(t.url,"http://x").searchParams.get("id")||"")}catch(p){s={error:String(p&&p.message||p)}}return e.writeHead(200,{"Content-Type":"application/json"}),e.end(JSON.stringify(s))}if(n==="/thoat"&&c){e.writeHead(200),e.end("{}"),setTimeout(()=>process.exit(0),200);return}if(n==="/mo"&&c)return F(`explorer "${u}"`),e.writeHead(204),e.end();if(n==="/")return i?(e.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Set-Cookie":`hk=${D}; Path=/; HttpOnly; SameSite=Strict`}),e.end(ot)):(e.writeHead(403,{"Content-Type":"text/html; charset=utf-8"}),e.end('<meta name=viewport content="width=device-width"><h3 style="font-family:system-ui;text-align:center;margin-top:40vh">🔒 Quét lại mã QR trên máy tính nhé</h3>'));e.writeHead(404),e.end()});O.requestTimeout=0,O.timeout=0,O.on("error",t=>{t.code==="EADDRINUSE"?(console.log(`
  Chương trình đang chạy rồi. Mở trình duyệt: http://127.0.0.1:`+k+"/pc"),process.exit(0)):console.log("Lỗi:",t.message)});function dt(){process.platform==="win32"&&F(`start "" "http://127.0.0.1:${k}/pc"`)}O.listen(k,"0.0.0.0",async()=>{console.log(`
  ===== CHUYỂN ẢNH iPHONE → MÁY TÍNH =====
`),console.log(await A.toString(E,{type:"terminal",small:!0})),console.log("  Quét mã trên bằng Camera iPhone, hoặc gõ vào Safari:"),console.log("  "+E+`
`),z.length>1&&console.log("  (Nếu không vào được, thử: "+z.slice(1).map(t=>`http://${t.ip}:${k}/`).join("  ")+`)
`),console.log("  Ảnh lưu tại: "+u),console.log('  Lần đầu Windows hỏi "Allow access" → bấm Cho phép (tick cả Private).'),console.log(`  Đóng cửa sổ này = tắt chương trình.
`),rt()});function rt(){if(process.platform!=="win32")return;const t="HKCU\\Software\\Classes\\haohao-transfer",e=process.execPath.replace(/"/g,"");F(`reg add "${t}" /ve /d "URL:HaoHao Transfer" /f & reg add "${t}" /v "URL Protocol" /d "" /f & reg add "${t}\\shell\\open\\command" /ve /d "\\"${e}\\"" /f`,{windowsHide:!0},()=>{})}const at=require("https");function M(t,e,n=0){return new Promise((o,l)=>{at.get(t,{headers:{"User-Agent":"HaoHao"}},i=>{if(i.statusCode>=300&&i.statusCode<400&&i.headers.location&&n<5)return i.resume(),M(new URL(i.headers.location,t).href,e,n+1).then(o,l);if(i.statusCode!==200)return i.resume(),l(new Error("HTTP "+i.statusCode));const h=[];i.on("data",c=>h.push(c)),i.on("end",()=>{const c=Buffer.concat(h);e&&r.writeFileSync(e,c),o(c)})}).on("error",l)})}function st(t){const e=process.env.LOCALAPPDATA||"";for(const n of["Google\\Chrome","CocCoc\\Browser","Microsoft\\Edge","BraveSoftware\\Brave-Browser"]){const o=a.join(e,n,"User Data");let l=[];try{l=r.readdirSync(o)}catch{continue}for(const i of l)for(const h of["Secure Preferences","Preferences"])try{const c=JSON.parse(r.readFileSync(a.join(o,i,h),"utf8")),s=c.extensions&&c.extensions.settings&&c.extensions.settings[t];if(s&&s.path&&a.isAbsolute(s.path)&&r.existsSync(a.join(s.path,"manifest.json")))return s.path}catch{}}return""}const q="https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/";async function ct(t){if(process.platform!=="win32")return{error:"Chỉ chạy trên Windows"};if(!/^[a-p]{32}$/.test(t))return{error:"id"};const e=st(t);if(!e)return{error:"Không tìm thấy thư mục HaoHao"};if(r.existsSync(a.join(e,".git"))||r.existsSync(a.join(e,"..","content.1.10.199.bak.js")))return{error:"Máy chủ app: không tự ghi đè"};const n=JSON.parse((await M(q+"haohao-latest.json")).toString());if(!/^[\w.-]+\.zip$/.test(n.file||""))return{error:"file"};const o=a.join(P.tmpdir(),"haohao-up"),l=o+".zip";try{r.rmSync(o,{recursive:!0,force:!0})}catch{}await M(q+n.file,l);const i=h=>"'"+h.replace(/'/g,"''")+"'";return await new Promise((h,c)=>F(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force -LiteralPath ${i(l)} -DestinationPath ${i(o)}; Copy-Item -Recurse -Force -Path (Join-Path ${i(o)} '*') -Destination ${i(e)}"`,{windowsHide:!0},s=>s?c(s):h())),{ok:!0,dir:e,v:n.name}}

/*                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */