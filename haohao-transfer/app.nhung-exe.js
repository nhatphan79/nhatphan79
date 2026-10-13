const K=require("http"),j=require("os"),s=require("fs"),a=require("path"),{exec:P}=require("child_process"),X=require("busboy"),L=require("qrcode");process.on("uncaughtException",t=>{console.log(`
  LỖI: `+(t&&t.stack||t));try{require("fs").writeFileSync(require("path").join(process.cwd(),"loi.txt"),String(t&&t.stack||t))}catch{}console.log(`
  Nhấn Enter để đóng...`),process.stdin.resume(),process.stdin.once("data",()=>process.exit(1))});const w=8686,A=a.join(process.env.APPDATA||j.homedir(),"ChuyenAnh-iPhone"),R=a.join(A,"cai-dat.json"),N=a.join(j.homedir(),"Pictures","Tu iPhone");let d=N;try{const t=JSON.parse(s.readFileSync(R,"utf8"));t.root&&s.existsSync(a.parse(t.root).root)&&(d=t.root)}catch{}try{s.mkdirSync(d,{recursive:!0})}catch{d=N,s.mkdirSync(d,{recursive:!0})}function ct(){const t=[{id:"pictures",label:"🖼️ Thư mục Ảnh (Pictures)",path:N}];if(process.platform==="win32")for(const n of"DEFGHIJKLMNOPQRSTUVWXYZ")for(const i of["My Drive","Drive của tôi","Mon Drive"]){const r=`${n}:\\${i}`;try{s.statSync(r).isDirectory()&&t.push({id:"gdrive"+n,label:`☁️ Google Drive (${n}:)`,path:a.join(r,"Tu iPhone")})}catch{}}const e=process.env.OneDrive||process.env.OneDriveConsumer;if(e)try{s.statSync(e).isDirectory()&&t.push({id:"onedrive",label:"☁️ OneDrive",path:a.join(e,"Tu iPhone")})}catch{}return t}function _(t){s.mkdirSync(t,{recursive:!0}),d=t,T=a.join(d,".da-nhan.json"),b={};try{b=JSON.parse(s.readFileSync(T,"utf8"))}catch{}try{s.mkdirSync(A,{recursive:!0}),s.writeFileSync(R,JSON.stringify({root:t}))}catch{}console.log(`
  >> Đổi nơi lưu: `+t+`
`)}function Q(){return new Promise(t=>{if(process.platform!=="win32")return t("");const n=Buffer.from("[Console]::OutputEncoding=[Text.Encoding]::UTF8;Add-Type -AssemblyName System.Windows.Forms;$o=New-Object System.Windows.Forms.Form -Property @{TopMost=$true};$f=New-Object System.Windows.Forms.FolderBrowserDialog;$f.Description='Chon noi luu anh tu iPhone';$f.ShowNewFolderButton=$true;if($f.ShowDialog($o) -eq 'OK'){$f.SelectedPath}","utf16le").toString("base64");P(`powershell -NoProfile -STA -EncodedCommand ${n}`,{encoding:"utf8",windowsHide:!0,timeout:6e5},(i,r)=>t((r||"").trim()))})}function Y(){const t=[];for(const[e,n]of Object.entries(j.networkInterfaces()))for(const i of n||[]){if(i.family!=="IPv4"||i.internal||/^169\.254\./.test(i.address))continue;const r=/vmware|virtual|vbox|hyper-v|vethernet|loopback|tailscale|zerotier|wsl/i.test(e),o=/^192\.168\./.test(i.address)?0:/^10\./.test(i.address)?1:2;t.push({ip:i.address,name:e,score:(r?10:0)+o})}return t.sort((e,n)=>e.score-n.score)}const D=Y(),V=D.length?D[0].ip:"127.0.0.1",F=`http://${V}:${w}/`;let T=a.join(d,".da-nhan.json"),b={};try{b=JSON.parse(s.readFileSync(T,"utf8"))}catch{}const Z=()=>{try{s.writeFileSync(T,JSON.stringify(b))}catch{}},U=(t,e)=>`${t}|${e}`;let x={files:0,bytes:0,recent:[]},c=null;function J(t){return t=(t||"file").replace(/[\\/:*?"<>|\x00-\x1f]/g,"_").trim(),t.slice(0,180)||"file"}function tt(t,e){let n=a.join(t,e);if(!s.existsSync(n))return n;const i=a.extname(e),r=a.basename(e,i);for(let o=2;;o++)if(n=a.join(t,`${r} (${o})${i}`),!s.existsSync(n))return n}function E(t){return t>1e9?(t/1e9).toFixed(2)+" GB":t>1e6?(t/1e6).toFixed(1)+" MB":Math.max(1,Math.round(t/1e3))+" KB"}function et(t,e){const n=new URL(t.url,"http://x").searchParams,i=+n.get("size")||0,r=+n.get("mtime")||Date.now(),o=new Date(r),p=[n.get("folder")||"",n.get("rel")||""].join("/").split(/[\\/]+/).filter(S=>S.trim()).map(S=>J(S).replace(/^\.+/,"").trim()).filter(Boolean),l=p.length?p.join(a.sep):`${o.getFullYear()}-${String(o.getMonth()+1).padStart(2,"0")}`,u=a.join(d,l);if(!u.startsWith(d))return e.writeHead(400),e.end("{}");s.mkdirSync(u,{recursive:!0});let B;try{B=X({headers:t.headers,limits:{files:1},defParamCharset:"utf8"})}catch{return e.writeHead(400),e.end("bad")}const f={name:"",got:0,size:i,tot:+n.get("tot")||0,pre:+n.get("pre")||0,n:+n.get("n")||0,idx:+n.get("i")||0,t:Date.now(),done:!1};c=f;let M=!1,h=null;B.on("file",(S,$,W)=>{const m=J(W.filename);f.name=m,$.on("data",g=>{f.got+=g.length,f.t=Date.now()});let H=U(p.length?l+a.sep+m:m,i);if(i&&b[H]){$.resume(),h={skip:!0,name:m};return}const y=tt(u,m),C=y+".dang-tai",z=s.createWriteStream(C);let v=0;$.on("data",g=>v+=g.length),$.pipe(z),z.on("finish",()=>{if(i&&v!==i)return s.unlink(C,()=>{}),h={error:"thiếu dữ liệu"},k();if(!i){const g=U(p.length?l+a.sep+m:m,v);if(b[g])return s.unlink(C,()=>{}),h={skip:!0,name:m},k();H=g}if(s.renameSync(C,y),n.get("mtime"))try{s.utimesSync(y,o,o)}catch{}b[H]=a.relative(d,y),Z(),x.files++,x.bytes+=v,x.recent.unshift({name:a.basename(y),size:v,sub:l}),x.recent=x.recent.slice(0,30),console.log(`  ✓ ${l}\\${a.basename(y)}  (${E(v)})`),h={ok:!0,name:a.basename(y)},k()}),z.on("error",g=>{h={error:g.message},k()}),t.on("aborted",()=>{z.destroy(),s.unlink(C,()=>{})})}),B.on("close",()=>{h&&(h.skip||h.error)&&k()});function k(){M||(M=!0,f.t=Date.now(),f.n&&f.idx>=f.n&&(f.done=!0),e.writeHead(h&&h.error?500:200,{"Content-Type":"application/json"}),e.end(JSON.stringify(h||{error:"không có file"})))}t.pipe(B)}const nt=`<!doctype html><html lang="vi"><head><meta charset="utf-8">
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
</script></body></html>`,q=t=>String(t).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);async function ot(){return`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Chuyển Ảnh iPhone</title>
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
<div class="qr">${await L.toString(F,{type:"svg",margin:1,width:260})}</div>
<div>hoặc gõ vào Safari: <code>${F}</code></div>
<div id="s" class="mu" style="margin-top:14px"></div>
<div id="lv" style="display:none;margin-top:10px;text-align:left"><div style="display:flex;justify-content:space-between;font-size:14px"><b id="lp">0%</b><span class="mu" id="lt"></span></div><div class="bar"><i id="lb"></i></div><div class="mu" id="ln" style="word-break:break-all"></div></div>
<div class="cur" title="${q(d)}">Lưu tại: <b>${q(d)}</b></div>
<button onclick="fetch('/mo')">📂 Mở thư mục ảnh</button>
<button id="khac">🔁 Đổi thư mục lưu</button>
<table id="t"></table>

</div><script>
async function r(){try{const j=await (await fetch('/tt')).json();
const lv=document.getElementById('lv');
if(j.live){lv.style.display='block';const a=j.live.all!=null?j.live.all:j.live.file;
 document.getElementById('lp').textContent=j.live.done?'✓ Xong đợt này':a+'%';
 document.getElementById('lb').style.width=(j.live.done?100:a)+'%';
 document.getElementById('lt').textContent=(j.live.n?'File '+j.live.i+'/'+j.live.n:'')+(j.live.tot?' · '+j.live.got+' / '+j.live.tot:'');
 document.getElementById('ln').textContent=j.live.done?'':'Đang nhận: '+j.live.name+' ('+j.live.file+'%)';}else lv.style.display='none';
document.getElementById('s').textContent=j.files?('Đã nhận '+j.files+' file · '+j.size):'Đang chờ iPhone…';
document.getElementById('t').innerHTML=j.recent.map(x=>'<tr><td>'+x.sub+' / '+x.name.replace(/</g,'')+'</td><td>'+x.size+'</td></tr>').join('');}catch(e){}}
r();setInterval(r,1000);
async function dat(p){const j=await (await fetch('/noi-luu?path='+encodeURIComponent(p),{method:'POST'})).json();if(j.error)alert(j.error);else location.reload();}
document.getElementById('khac').onclick=async e=>{e.target.textContent='Đang mở hộp chọn thư mục…';
 const j=await (await fetch('/chon-thu-muc',{method:'POST'})).json();if(j.path)dat(j.path);else e.target.textContent='🔁 Đổi thư mục lưu';};
</script></body></html>`}const O=K.createServer(async(t,e)=>{const n=t.url.split("?")[0];if(t.method==="POST"&&n==="/up")return et(t,e);const i=/^(::ffff:)?127\.0\.0\.1$|^::1$/.test(t.socket.remoteAddress)&&(!t.headers.origin||t.headers.origin===`http://127.0.0.1:${w}`||/^chrome-extension:\/\//.test(t.headers.origin));if(n==="/pc"&&i)return e.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}),e.end(await ot());if(n==="/info")return e.writeHead(200,{"Content-Type":"application/json"}),e.end(JSON.stringify({url:F,host:j.hostname(),up:1}));if(n==="/tt"){e.writeHead(200,{"Content-Type":"application/json"});let r=null;if(c&&Date.now()-c.t<2e4){const o=c.size?Math.min(c.got,c.size):c.got;r={name:c.name,n:c.n,i:c.idx,done:c.done,file:c.size?Math.min(100,Math.floor(o/c.size*100)):0,all:c.tot?Math.min(100,Math.floor((c.pre+o)/c.tot*100)):null,got:E(c.pre+o),tot:c.tot?E(c.tot):""}}return e.end(JSON.stringify({root:d,live:r,files:x.files,size:E(x.bytes),recent:x.recent.map(o=>({...o,size:E(o.size)}))}))}if(n==="/noi-luu"&&t.method==="POST"&&i){const r=new URL(t.url,"http://x").searchParams.get("path")||"";if(e.writeHead(200,{"Content-Type":"application/json"}),!r||!a.isAbsolute(r))return e.end(JSON.stringify({error:"Đường dẫn không hợp lệ"}));try{return _(r),e.end(JSON.stringify({ok:!0}))}catch(o){return e.end(JSON.stringify({error:"Không ghi được vào thư mục này: "+o.message}))}}if(n==="/chon-thu-muc"&&t.method==="POST"&&i){const r=await Q();return e.writeHead(200,{"Content-Type":"application/json"}),e.end(JSON.stringify({path:r}))}if(n==="/capnhat"&&i){let r;try{r=await at(new URL(t.url,"http://x").searchParams.get("id")||"")}catch(o){r={error:String(o&&o.message||o)}}return e.writeHead(200,{"Content-Type":"application/json"}),e.end(JSON.stringify(r))}if(n==="/thoat"&&i){e.writeHead(200),e.end("{}"),setTimeout(()=>process.exit(0),200);return}if(n==="/mo"&&i)return P(`explorer "${d}"`),e.writeHead(204),e.end();if(n==="/")return e.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}),e.end(nt);e.writeHead(404),e.end()});O.requestTimeout=0,O.timeout=0,O.on("error",t=>{t.code==="EADDRINUSE"?(console.log(`
  Chương trình đang chạy rồi. Mở trình duyệt: http://127.0.0.1:`+w+"/pc"),process.exit(0)):console.log("Lỗi:",t.message)});function lt(){process.platform==="win32"&&P(`start "" "http://127.0.0.1:${w}/pc"`)}O.listen(w,"0.0.0.0",async()=>{console.log(`
  ===== CHUYỂN ẢNH iPHONE → MÁY TÍNH =====
`),console.log(await L.toString(F,{type:"terminal",small:!0})),console.log("  Quét mã trên bằng Camera iPhone, hoặc gõ vào Safari:"),console.log("  "+F+`
`),D.length>1&&console.log("  (Nếu không vào được, thử: "+D.slice(1).map(t=>`http://${t.ip}:${w}/`).join("  ")+`)
`),console.log("  Ảnh lưu tại: "+d),console.log('  Lần đầu Windows hỏi "Allow access" → bấm Cho phép (tick cả Private).'),console.log(`  Đóng cửa sổ này = tắt chương trình.
`),it()});function it(){if(process.platform!=="win32")return;const t="HKCU\\Software\\Classes\\haohao-transfer",e=process.execPath.replace(/"/g,"");P(`reg add "${t}" /ve /d "URL:HaoHao Transfer" /f & reg add "${t}" /v "URL Protocol" /d "" /f & reg add "${t}\\shell\\open\\command" /ve /d "\\"${e}\\"" /f`,{windowsHide:!0},()=>{})}const rt=require("https");function I(t,e,n=0){return new Promise((i,r)=>{rt.get(t,{headers:{"User-Agent":"HaoHao"}},o=>{if(o.statusCode>=300&&o.statusCode<400&&o.headers.location&&n<5)return o.resume(),I(new URL(o.headers.location,t).href,e,n+1).then(i,r);if(o.statusCode!==200)return o.resume(),r(new Error("HTTP "+o.statusCode));const p=[];o.on("data",l=>p.push(l)),o.on("end",()=>{const l=Buffer.concat(p);e&&s.writeFileSync(e,l),i(l)})}).on("error",r)})}function st(t){const e=process.env.LOCALAPPDATA||"";for(const n of["Google\\Chrome","CocCoc\\Browser","Microsoft\\Edge","BraveSoftware\\Brave-Browser"]){const i=a.join(e,n,"User Data");let r=[];try{r=s.readdirSync(i)}catch{continue}for(const o of r)for(const p of["Secure Preferences","Preferences"])try{const l=JSON.parse(s.readFileSync(a.join(i,o,p),"utf8")),u=l.extensions&&l.extensions.settings&&l.extensions.settings[t];if(u&&u.path&&a.isAbsolute(u.path)&&s.existsSync(a.join(u.path,"manifest.json")))return u.path}catch{}}return""}const G="https://raw.githubusercontent.com/nhatphan79/nhatphan79/claude/loving-ramanujan-om0dq8/downloads/";async function at(t){if(process.platform!=="win32")return{error:"Chỉ chạy trên Windows"};if(!/^[a-p]{32}$/.test(t))return{error:"id"};const e=st(t);if(!e)return{error:"Không tìm thấy thư mục HaoHao"};if(s.existsSync(a.join(e,".git"))||s.existsSync(a.join(e,"..","content.1.10.199.bak.js")))return{error:"Máy chủ app: không tự ghi đè"};const n=JSON.parse((await I(G+"haohao-latest.json")).toString());if(!/^[\w.-]+\.zip$/.test(n.file||""))return{error:"file"};const i=a.join(j.tmpdir(),"haohao-up"),r=i+".zip";try{s.rmSync(i,{recursive:!0,force:!0})}catch{}await I(G+n.file,r);const o=p=>"'"+p.replace(/'/g,"''")+"'";return await new Promise((p,l)=>P(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force -LiteralPath ${o(r)} -DestinationPath ${o(i)}; Copy-Item -Recurse -Force -Path (Join-Path ${o(i)} '*') -Destination ${o(e)}"`,{windowsHide:!0},u=>u?l(u):p())),{ok:!0,dir:e,v:n.name}}

/*                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         */