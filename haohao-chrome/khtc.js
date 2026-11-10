
// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 💼 V1.8.0: Quản lý chi phí (KHTC) trong tab Công trình – chuyển từ trang "Polaris – Quản lý chi phí".
//   Bảng tính kiểu Excel (HyperFormula tính công thức), lưu ô đã sửa theo công trình (đồng bộ qua tài khoản Google), tải Excel giữ định dạng.
window.KHTCStart=function(D,SRC_NAME,ORIG,EDIT0,HOST){
"use strict";
const SHEETS=D.sheets, STY=D.styles;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const {toEngine,colStr,colNum}=window.XLEngine;
const SI={}; SHEETS.forEach((s,i)=>SI[s.name]=i);
const NK=(si,r,c)=>SHEETS[si].name+'|'+r+'|'+c;   // khoá lưu: tên sheet|dòng|cột (0-based)

/* ---------------- routing ---------------- */
const VIEWS=['ke-hoach'];   // V1.8.2: chỉ giữ Kế hoạch thi công (bỏ Thanh toán / Tạm ứng / Mẫu đề nghị thanh toán)
function route(){let h=location.hash.replace('#','');if(!VIEWS.includes(h))h='ke-hoach';
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+h));
  document.querySelectorAll('nav a').forEach(a=>{a.classList.toggle('on',a.dataset.v===h);a.toggleAttribute('aria-current',a.dataset.v===h)});}
addEventListener('hashchange',route); route();

/* ---------------- styles -> CSS ---------------- */
(function(){
  const out=[];
  const B=w=>w===3?'3px double #000':w===2?'2px solid #000':'1px solid #000';
  STY.forEach((s,i)=>{let c='';
    if(s.b)c+='font-weight:700;'; if(s.i)c+='font-style:italic;'; if(s.u)c+='text-decoration:underline;';
    if(s.c)c+='color:'+s.c+';'; if(s.bg)c+='background-color:'+s.bg+';background-image:none;';
    if(s.fn)c+='font-family:"'+s.fn.replace(/"/g,'')+'",Calibri,Arial,sans-serif;'; if(s.sz)c+='font-size:'+s.sz+'pt;';
    if(s.a)c+='text-align:'+({c:'center',r:'right',l:'left'}[s.a]||'left')+';';
    if(s.va)c+='vertical-align:'+(s.va==='m'?'middle':'top')+';';
    if(s.w)c+='white-space:normal;word-break:break-word;';
    if(s.ind)c+='padding-left:'+(3+s.ind*9)+'px;';
    if(s.bl)c+='border-left:'+B(s.bl)+';'; if(s.br)c+='border-right:'+B(s.br)+';';
    if(s.bt)c+='border-top:'+B(s.bt)+';'; if(s.bb)c+='border-bottom:'+B(s.bb)+';';
    if(c) out.push('table.xl td.s'+i+'{'+c+'}');});
  $('#xlstyles').textContent=out.join('\n');
})();

/* ---------------- định dạng số như Excel ---------------- */
const ERR={DIV_BY_ZERO:'#DIV/0!',NA:'#N/A',REF:'#REF!',VALUE:'#VALUE!',NAME:'#NAME?',NUM:'#NUM!',CYCLE:'#CYCLE!',ERROR:'#ERROR!',SPILL:'#SPILL!',LIC:'#LIC!'};
const isErr=v=>v&&typeof v==='object'&&'type' in v;
const errText=v=>ERR[v.type]||('#'+v.type);
const nf=(v,d)=>v.toLocaleString('vi-VN',{minimumFractionDigits:d,maximumFractionDigits:d});
function fmt(v,code){
  if(v==null||v==='') return '';
  if(isErr(v)) return errText(v);
  if(typeof v==='boolean') return v?'TRUE':'FALSE';
  if(typeof v!=='number') return String(v);
  code=code||'g';
  const k=code[0], d=parseInt(code.slice(1))||0, fl=code.replace(/^[a-z]\d*/,'');
  if(v===0&&fl.includes('-')) return '-';
  if(v===0&&fl.includes('z')) return '';
  if(k==='p') return nf(v*100,d)+'%';
  if(k==='n'){ if(v<0&&fl.includes('(')) return '('+nf(-v,d)+')'; return nf(v,d); }
  if(k==='d'){ const dt=new Date(Date.UTC(1899,11,30)+Math.round(v)*864e5); return String(dt.getUTCDate()).padStart(2,'0')+'/'+String(dt.getUTCMonth()+1).padStart(2,'0')+'/'+dt.getUTCFullYear(); }
  if(k==='t') return String(v);
  // General
  if(Number.isInteger(v)&&Math.abs(v)<1e11) return String(v);
  const a=Math.abs(v); if(a>=1e11||a<1e-9) return v.toExponential(5).replace('.',',');
  const intDigits=Math.max(1,Math.floor(Math.log10(a))+1);
  return String(+v.toFixed(Math.max(0,10-intDigits))).replace('.',',');
}

/* ---------------- mô hình ô ---------------- */
const cellOf=(si,r,c)=>{const row=SHEETS[si].rows[r];return row?row[2][c]||0:0};
const origInput=(si,r,c)=>{const x=cellOf(si,r,c);if(!x)return null;return x[2]!=null?x[2]:x[0]};
const keyOf=(si,r,c)=>si+'-'+colStr(c+1)+(r+1);
const EDITS=new Map(); // key -> {si,r,c,v}
let hf=null, ready=false;
const isSub={};
SHEETS.forEach((s,si)=>s.rows.forEach((row,ri)=>row[2].forEach((x,ci)=>{if(x&&x[2]&&/^=\s*SUBTOTAL\(\s*(9|109)\s*,/i.test(x[2])) isSub[s.name+'|'+(ri+1)+'|'+(ci+1)]=1})));
const curInput=(si,r,c)=>{const e=EDITS.get(keyOf(si,r,c));return e?e.v:origInput(si,r,c)};
function valueOf(si,r,c){
  if(ready){const v=hf.getCellValue({sheet:si,row:r,col:c}); return v}
  const x=cellOf(si,r,c); return x?x[0]:null;
}
const ctxFor=si=>({sheet:SHEETS[si].name,isSubtotal:(sh,r,c)=>!!isSub[sh+'|'+r+'|'+c],
  valueOf:(sh,r,c)=>{const i=SI[sh];if(i==null)return null;const v=valueOf(i,r-1,c-1);return isErr(v)?null:v}});
function engineContent(si,input){
  if(typeof input==='string'&&input[0]==='='){ if(/\[\d+\]/.test(input)) return null; return toEngine(input,ctxFor(si)); }
  return input==null?null:input;
}

/* ---------------- KPI (tính trực tiếp từ sheet 1. THKHTC) ---------------- */
const KPI=[
  {label:'Giá hợp đồng sau VAT',a:'I7',note:()=>'Trước thuế '+fmt(kv('I11'),'n0')},
  {label:'Chi phí sản xuất (VL+NC+M+BPTC)',a:'I14',note:()=>pct(kv('I14')/kv('I11'))+' giá trước thuế'},
  {label:'Chi phí chung',a:'I32',note:()=>pct(kv('I32')/kv('I11'))+' giá trước thuế'},
  {label:'Chi phí tài chính',a:'I36',note:()=>'Bảo lãnh, lãi vay, chuyển đổi thuế'},
  {label:'Hiệu quả trước thuế',a:'I48',good:1,note:()=>pct(kv('I48')/kv('I11'))+' · theo 1. THKHTC'},
];
const KSI=SI['1. THKHTC']; const HASK=KSI!=null;   // file khác mẫu (không có sheet 1. THKHTC) → bỏ thẻ số liệu + tóm tắt, chỉ còn danh mục sheet
const addrRC=a=>{const m=/^([A-Z]+)(\d+)$/.exec(a);return [+m[2]-1,colNum(m[1])-1]};
function kv(a){if(!HASK)return 0;const [r,c]=addrRC(a);const v=valueOf(KSI,r,c);return typeof v==='number'?v:0}
const pct=x=>isFinite(x)?(x*100).toLocaleString('vi-VN',{maximumFractionDigits:1})+'%':'–';
const KPI0=KPI.map(k=>{if(!HASK)return 0;const [r,c]=addrRC(k.a);const x=cellOf(KSI,r,c);return x?x[0]:0});
function renderKPI(){
  if(!HASK){$('#kpis').hidden=true;return}
  snapLater();
  $('#kpis').innerHTML=KPI.map((k,i)=>{const v=kv(k.a);const chg=Math.abs(v-KPI0[i])>0.5;
    return `<div class="kpi${k.good?' good':''}${chg?' chg':''}" title="${chg?'Đã thay đổi so với file gốc: '+fmt(KPI0[i],'n0'):'Ô '+k.a+' sheet 1. THKHTC'}"><small>${esc(k.label)}</small><b>${fmt(Math.round(v),'n0')}</b><em>${esc(k.note())}${chg?' · gốc '+fmt(KPI0[i],'n0'):''}</em></div>`}).join('');
}

/* ---------------- lưới ---------------- */
let cur=-1, sel={r:0,c:0}, widthOv={}; // -1 = trang Tóm tắt
try{widthOv=JSON.parse(localStorage.getItem('polaris-colw')||'{}')}catch(e){}
const grid=$('#grid');
let LAYOUT=null; // {vr:[rows], vc:[cols], anchor:{}, covered:Set}
function colW(si,c){const o=widthOv[SHEETS[si].name+'|'+c];if(o)return o;const w=SHEETS[si].cols[c];return w}
function setMode(){$('#v-ke-hoach').classList.toggle('mode-sum',cur<0)}
function render(keepScroll){
  setMode();
  if(cur<0){ renderSummary(); renderTabs(); return; }
  const sh=SHEETS[cur], si=cur, q=$('#q').value.trim().toLowerCase(), only=$('#onlyHit').checked, showH=$('#showHidden').checked, showF=$('#showF').checked;
  const nc=sh.nc;
  const vc=[]; for(let c=0;c<nc;c++) if(showH||sh.cols[c]>0) vc.push(c);
  const rowTxt=ri=>{const row=sh.rows[ri];let t='';for(let c=0;c<nc;c++){const x=row[2][c];if(x){const v=valueOf(si,ri,c);t+=' '+(v==null?'':String(v))}}return t.toLowerCase()};
  const vr=[]; let hits=0;
  sh.rows.forEach((row,ri)=>{ if(row[0]&&!showH) return; let hit=false; if(q){hit=rowTxt(ri).includes(q); if(hit)hits++;} if(q&&only&&!hit) return; vr.push(ri);});
  const vrSet=new Set(vr), vcSet=new Set(vc);
  const anchor={}, covered=new Set(), origin=new Map();
  if(!(q&&only)) sh.m.forEach(([r,c,h,w])=>{
    let ar=-1,ac=-1,rs=0,cs=0;
    for(let i=r;i<r+h;i++) if(vrSet.has(i)){if(ar<0)ar=i;rs++}
    for(let j=c;j<c+w;j++) if(vcSet.has(j)){if(ac<0)ac=j;cs++}
    if(ar<0||ac<0) return;
    let hpx=0; for(let i=r;i<r+h;i++) if(vrSet.has(i)) hpx+=sh.rows[i][1];
    anchor[ar+','+ac]=[rs,cs,hpx,r,c,h,w];
    for(let i=r;i<r+h;i++)for(let j=c;j<c+w;j++) origin.set(i+','+j,[r,c]);
    for(let i=r;i<r+h;i++)for(let j=c;j<c+w;j++) if(!(i===ar&&j===ac)) covered.add(i+','+j);
  });
  LAYOUT={vr,vc,anchor,covered,origin};
  let tw=46; vc.forEach(c=>tw+=Math.max(colW(si,c),showH&&!sh.cols[c]?24:0)||0);
  let h=`<table class="xl" style="width:${tw}px"><colgroup><col style="width:46px">`+vc.map(c=>`<col style="width:${Math.max(colW(si,c),sh.cols[c]?0:24)}px">`).join('')+'</colgroup>';
  h+='<thead><tr><th class="rh"></th>'+vc.map(c=>`<th data-c="${c}" class="${sh.cols[c]?'':'hidc'}">${colStr(c+1)}<span class="rz" data-c="${c}"></span></th>`).join('')+'</tr></thead><tbody>';
  for(const ri of vr){
    const row=sh.rows[ri], cells=row[2];
    const hit=q&&rowTxt(ri).includes(q);
    h+=`<tr style="height:${row[1]}px" class="${hit?'hit':''}${row[0]?' hid':''}"><th class="rh" data-r="${ri}">${ri+1}</th>`;
    for(let k=0;k<vc.length;k++){
      const ci=vc[k], key=ri+','+ci;
      if(covered.has(key)) continue;
      const an=anchor[key]; const R=an?an[3]:ri, C=an?an[4]:ci; // ô gốc của vùng gộp
      const x=cellOf(si,R,C);
      const st=x?STY[x[1]]||{}:{};
      let cls=x?'s'+x[1]:''; let attrs='';
      let maxh=row[1];
      if(an){ if(an[0]>1) attrs+=` rowspan="${an[0]}"`; if(an[1]>1) attrs+=` colspan="${an[1]}"`; maxh=an[2]; }
      const input=curInput(si,R,C);
      const isF=typeof input==='string'&&input[0]==='=';
      let txt='', v=null;
      if(showF&&isF){ txt=esc(input); cls+=' fm'; }
      else { v=(x||EDITS.has(keyOf(si,R,C)))?valueOf(si,R,C):null; if(v===null&&isF) v=0; txt=esc(fmt(v,st.nf)); if(typeof v==='number'&&!st.a) cls+=' num'; if(isErr(v)&&!st.a) cls+=' num'; }
      // tràn chữ sang ô trống bên phải như Excel
      if(!an&&!st.w&&typeof v==='string'&&v.length&&(!st.a||st.a==='l')){ const nx=k+1<vc.length?cells[vc[k+1]]:0; const nxi=k+1<vc.length?curInput(si,ri,vc[k+1]):null; if(nxi==null||nxi==='') cls+=' spill'; }
      if(EDITS.has(keyOf(si,R,C))) cls+=' ed';
      h+=`<td data-r="${R}" data-c="${C}"${attrs}${cls?` class="${cls.trim()}"`:''}><div class="v" style="max-height:${maxh}px">${txt}</div></td>`;
    }
    h+='</tr>';
  }
  h+='</tbody></table>';
  const sx=grid.scrollLeft, sy=grid.scrollTop;
  grid.innerHTML=h;
  if(keepScroll){grid.scrollLeft=sx;grid.scrollTop=sy}
  $('#sheetTitle').innerHTML=`${esc(sh.name)}${sh.state!=='visible'?' <span class="pill">sheet ẩn</span>':''}<small>Nguồn: ${esc(SRC_NAME)} · ${sh.rows.length} dòng</small>`;
  msg(q?`${hits} dòng khớp “${$('#q').value.trim()}”`:'');
  renderTabs(); markSel(false);
}
/* ---------------- menu nhóm sheet ---------------- */
const DESC={'1. THKHTC':'Bảng tổng thu – chi – hiệu quả','01 PL TH':'Tổng hợp giá trị hợp đồng','01 A.THGT':'Tổng hợp giá trị, tách VL/NC/máy','PL GIA':'Bảng giá 26 công tác (phụ lục HĐ)','02.BPTC':'Giàn giáo bao che, mâm thao tác','03.TL kien truc':'Đơn giá chi tiết từng công tác','03.1 DGCT ':'Phân tích đơn giá theo định mức','06.DMVT':'Danh mục vật tư CĐT / nhà thầu','3. PTVT':'Hao phí vật tư theo định mức','4. TH Vật tư':'Giá vật tư đến chân công trình','2.KHVT':'Kế hoạch vật tư: KL, giá, NCC','3. KH NC-MTC':'Đơn giá khoán nhân công, máy','2.1 BC+ Mâm (CĐT trả CP)':'Giàn giáo bao che + mâm','2.2.TB khác':'Xe nâng, máy laser, thiết bị khác','4. CPC':'Chi phí chung + chi phí khác','4.1 Luong BCH':'Lương & bảo hiểm Ban chỉ huy','5. Lai Vay - TC':'Bảo lãnh, lãi vay, dòng tiền','KH DU THAU':'Dự án khác – không dùng','DMVT':'Dự án khác – không dùng','PL_A_BOQ':'Dự án khác – không dùng'};
const GROUPS=[
 {t:'I. Tổng hợp',q:'Lãi bao nhiêu?',amt:()=>kv('I48'),items:[['','1. THKHTC']]},
 {t:'II. Doanh thu – Hợp đồng',q:'Thu từ CĐT bao nhiêu, cho việc gì?',amt:()=>kv('I11'),items:[['','01 PL TH'],['','01 A.THGT'],['','02.BPTC'],['','03.TL kien truc'],['','03.1 DGCT '],['','06.DMVT'],['','PL GIA']]},
 {t:'III. Chi phí trực tiếp',q:'Vật tư, nhân công, máy, thiết bị',amt:()=>kv('I14'),items:[['1. Vật tư','2.KHVT'],['1. Vật tư','3. PTVT'],['1. Vật tư','4. TH Vật tư'],['2. Nhân công – máy','3. KH NC-MTC'],['3. Thiết bị – biện pháp','2.1 BC+ Mâm (CĐT trả CP)'],['3. Thiết bị – biện pháp','2.2.TB khác']]},
 {t:'IV. Chi phí gián tiếp',q:'Ban chỉ huy, văn phòng, tài chính',amt:()=>kv('I32')+kv('I36')+kv('I40'),items:[['','4. CPC'],['','4.1 Luong BCH'],['','5. Lai Vay - TC']]},
 {t:'V. Lưu trữ',q:'Sheet ẩn còn sót từ dự án khác',hidden:1,items:[['','DMVT'],['','KH DU THAU'],['','PL_A_BOQ']]},
];
{ const used=new Set(); GROUPS.forEach(g=>g.items.forEach(([,n])=>used.add(n)));
  const rest=SHEETS.filter(s=>!used.has(s.name)).map(s=>['',s.name]);
  GROUPS.forEach(g=>{g.items=g.items.filter(([,n])=>SI[n]!=null); if(!HASK) delete g.amt;});
  for(let i=GROUPS.length-1;i>=0;i--) if(!GROUPS[i].items.length) GROUPS.splice(i,1);
  const rv=rest.filter(([,n])=>SHEETS[SI[n]].state==='visible'), rh=rest.filter(([,n])=>SHEETS[SI[n]].state!=='visible');
  if(rv.length) GROUPS.splice(HASK?4:0,0,{t:HASK?'Các sheet khác':'Danh mục sheet',q:rv.length+' sheet trong file',items:rv});
  if(rh.length) GROUPS.push({t:'Sheet ẩn',q:'Đang ẩn trong file Excel',hidden:1,items:rh}); }
const openG=new Set(GROUPS.map((g,i)=>i).filter(i=>!GROUPS[i].hidden));
const ty=v=>(v/1e9).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2})+' tỷ';
function renderTabs(){
  const showH=$('#showHidden').checked; const cnt={};
  EDITS.forEach(e=>cnt[e.si]=(cnt[e.si]||0)+1);
  let h=HASK?`<button class="home${cur<0?' on':''}" data-i="-1">★ Tóm tắt KHTC</button>`:'';
  GROUPS.forEach((g,gi)=>{ if(g.hidden&&!showH) return;
    h+=`<details data-g="${gi}"${openG.has(gi)?' open':''}><summary><span>${esc(g.t)}<span class="q">${esc(g.q)}${g.amt?` · <b>${ty(g.amt())}</b>`:''}</span></span></summary>`;
    let lastSub=null; h+='<div class="kids">';
    g.items.forEach(([sub,nm])=>{const i=SI[nm]; if(i==null) return;
      if(sub&&sub!==lastSub){h+=`<div class="sub">${esc(sub)}</div>`;lastSub=sub}
      h+=`<button class="sh${sub?' deep':''}${i===cur?' on':''}${SHEETS[i].state!=='visible'?' hiddensheet':''}" data-i="${i}" aria-current="${i===cur}"><span>${esc(nm.trim())}${cnt[i]?`<span class="n" title="Số ô đã sửa">${cnt[i]}</span>`:''}</span><small>${esc(DESC[nm]||'')}</small></button>`;});
    h+='</div></details>';});
  $('#snav').innerHTML=h;
  $('#nEd').textContent=EDITS.size;
}
$('#snav').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(!b)return;if(editor)commitEdit();cur=+b.dataset.i;sel={r:0,c:0};grid.scrollTo(0,0);$('#summary').scrollTo(0,0);render()});
$('#snav').addEventListener('toggle',e=>{const d=e.target;if(d.tagName!=='DETAILS')return;const g=+d.dataset.g;d.open?openG.add(g):openG.delete(g)},true);

/* ---------------- trang Tóm tắt KHTC ---------------- */
const TV=(r,c)=>{const v=valueOf(KSI,r-1,c);return typeof v==='number'?v:0}; // r: số dòng Excel, c: chỉ số cột
const TL=(r)=>{const v=valueOf(KSI,r-1,3);return v==null?'':String(v).trim()};
const ALLOC=[
 {k:'base',lbl:'Giá trị hợp đồng (trước VAT)',r:11},
 {lbl:'Vật liệu',r:15,sub:[16,17],go:['2.KHVT',44,10]},
 {lbl:'Nhân công',r:21,sub:[22,23,24],go:['3. KH NC-MTC',47,12]},
 {lbl:'Máy thi công',r:25,sub:[26,27],go:['3. KH NC-MTC',47,13]},
 {lbl:'Biện pháp thi công – thiết bị',r:28,sub:[29,30,31],go:['2.1 BC+ Mâm (CĐT trả CP)',0,0]},
 {lbl:'Chi phí chung (Ban chỉ huy, văn phòng)',r:32,sub:[33,34,35],go:['4. CPC',5,9]},
 {lbl:'Chi phí tài chính',r:36,sub:[37,38,39],go:['5. Lai Vay - TC',7,11]},
 {lbl:'Chi phí khác',r:40,sub:[41,42],go:['4. CPC',65,9]},
 {lbl:'Dự phòng',r:43,sub:[44,45,46,47],go:['1. THKHTC',42,8]},
 {lbl:'Nộp công ty quản lý',r:12,go:['1. THKHTC',11,8]},
 {k:'res',lbl:'HIỆU QUẢ TRƯỚC THUẾ',r:48,go:['1. THKHTC',47,8]},
];
const openA=new Set();
function chip(d,isCost){ if(Math.abs(d)<0.5) return '<span class="chip n">bằng</span>';
  const good=isCost?d<0:d>0; return `<span class="chip ${good?'g':'w'}">${good?'▼ ':'▲ '}${d>0?'+':'−'}${fmt(Math.round(Math.abs(d)),'n0')}</span>`; }
function bar(p){const w=Math.max(0,Math.min(100,p*100));return `<div class="barc"><div class="tr"><div class="fl" style="width:${w}%"></div></div><span>${pct(p)}</span></div>`}
function renderSummary(){
  if(cur>=0||!HASK) return;
  const base=TV(11,8)||1, baseDT=TV(11,6)||1;
  let rows='', sumCost=0;
  ALLOC.forEach((a,ai)=>{
    const v=TV(a.r,8), dt=TV(a.r,6), isCost=!a.k;
    if(isCost) sumCost+=v;
    const go=a.go?`<a href="#ke-hoach" data-go="${SI[a.go[0]]},${a.go[1]},${a.go[2]}">${esc(a.go[0].trim())} →</a>`:'';
    const tg=a.sub?`<button class="tg" data-a="${ai}" aria-expanded="${openA.has(ai)}">${openA.has(ai)?'▾':'▸'}</button>`:'';
    const cls=a.k==='base'?'base':a.k==='res'?'res':'top';
    rows+=`<tr class="${cls}"><td class="lbl">${tg}${esc(a.lbl)}</td><td>${fmt(Math.round(v),'n0')}</td><td>${a.k==='base'?pct(1):bar(v/base)}</td><td>${dt?fmt(Math.round(dt),'n0'):'–'}</td><td>${a.k==='base'?'':chip(v-dt,isCost)}</td><td>${go}</td></tr>`;
    if(a.sub&&openA.has(ai)) a.sub.forEach(r=>{const sv=TV(r,8);rows+=`<tr class="subr"><td class="lbl">${esc(TL(r))}</td><td>${fmt(Math.round(sv),'n0')}</td><td>${pct(sv/base)}</td><td>${TV(r,6)?fmt(Math.round(TV(r,6)),'n0'):'–'}</td><td></td><td><a href="#ke-hoach" data-go="${KSI},${r-1},8">ô I${r}</a></td></tr>`});
  });
  const check=base-sumCost-TV(48,8);
  // Top vật tư (2.KHVT)
  const VSI=SI['2.KHVT'], vs=SHEETS[VSI]||{rows:[]}; const mats=[];
  vs.rows.forEach((row,ri)=>{const A=valueOf(VSI,ri,0), C=valueOf(VSI,ri,2), nm=valueOf(VSI,ri,3), k=valueOf(VSI,ri,10);
    if(typeof C==='number'&&typeof k==='number'&&k>0&&nm&&ri<44) mats.push({ri,nm:String(nm),k,kl:valueOf(VSI,ri,8),dv:valueOf(VSI,ri,4),dg:valueOf(VSI,ri,9),ncc:valueOf(VSI,ri,11)})});
  mats.sort((a,b)=>b.k-a.k); const vlTot=TV(15,8)||1; const vmax=mats.length?mats[0].k:1;
  // Top nhân công (3. KH NC-MTC)
  const NSI=SI['3. KH NC-MTC'], ns=SHEETS[NSI]||{rows:[]}; const labs=[];
  ns.rows.forEach((row,ri)=>{const B=valueOf(NSI,ri,1), nm=valueOf(NSI,ri,2); const m=valueOf(NSI,ri,12), n=valueOf(NSI,ri,13);
    const t=(typeof m==='number'?m:0)+(typeof n==='number'?n:0);
    if(typeof B==='number'&&nm&&t>0&&ri<47) labs.push({ri,nm:String(nm),t,kl:valueOf(NSI,ri,9),dv:valueOf(NSI,ri,3),dg:valueOf(NSI,ri,10)})});
  labs.sort((a,b)=>b.t-a.t); const ncTot=TV(21,8)+TV(25,8)||1; const lmax=labs.length?labs[0].t:1;
  const li=(x,val,max,tot,sub,go)=>`<li data-go="${go}" title="Bấm để mở dòng này trong sheet nguồn"><span class="nm">${esc(x)}</span><span class="vl">${fmt(Math.round(val),'n0')}</span><span class="bx"><span class="tr"><span class="fl" style="display:block;width:${val/max*100}%"></span></span><span>${pct(val/tot)} · ${esc(sub)}</span></span></li>`;
  const fl=(nm,t)=>`<span class="n" data-sh="${SI[nm]}" title="${esc(DESC[nm]||'')}">${esc(t)}</span>`;
  $('#summary').innerHTML=`
  <h2>Tóm tắt kế hoạch thi công</h2>
  <p class="lead">Mỗi đồng giá trị hợp đồng được phân bổ ra sao. Số liệu tính trực tiếp từ sheet 1. THKHTC: sửa bất kỳ ô nào trong các sheet chi tiết thì trang này cập nhật ngay. Bấm ▸ để xem chi tiết, bấm tên sheet để mở nguồn.</p>
  <div class="scard"><h3>Phân bổ giá trị hợp đồng</h3><p class="hint">Cột “Chênh lệch” = KHTC Phòng Dự án − Dự thầu. ▼ xanh: chi phí giảm hoặc hiệu quả tăng; ▲ cam: chi phí tăng hoặc hiệu quả giảm.</p>
  <div style="overflow-x:auto"><table class="alloc"><thead><tr><th>Khoản mục</th><th>KHTC P. Dự án (đ)</th><th>% giá trước thuế</th><th>Dự thầu (đ)</th><th>Chênh lệch</th><th>Sheet nguồn</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="hint" style="margin-top:8px">${Math.abs(check)<1e6?'✓ Kiểm tra: các khoản chi phí + hiệu quả = giá trị hợp đồng'+(Math.abs(check)>=1?' (chênh '+fmt(Math.round(check),'n0')+' đ do ô hiệu quả được làm tròn).':'.'):'⚠ Các khoản chi phí + hiệu quả lệch giá trị hợp đồng '+fmt(Math.round(check),'n0')+' đ – kiểm tra lại sheet 1. THKHTC.'}</p></div>
  <div class="two">
   <div class="scard"><h3>10 vật tư tốn tiền nhất</h3><p class="hint">Theo sheet 2.KHVT · % trên tổng vật liệu ${fmt(Math.round(vlTot),'n0')} đ</p><ol class="top">${mats.slice(0,10).map(m=>li(m.nm,m.k,vmax,vlTot,`${fmt(m.kl,'n0')} ${m.dv||''} × ${fmt(m.dg,'n0')}${m.ncc?' · '+m.ncc:''}`,`${VSI},${m.ri},9`)).join('')}</ol></div>
   <div class="scard"><h3>10 công tác nhân công – máy lớn nhất</h3><p class="hint">Theo sheet 3. KH NC-MTC · % trên tổng nhân công + máy ${fmt(Math.round(ncTot),'n0')} đ</p><ol class="top">${labs.slice(0,10).map(m=>li(m.nm,m.t,lmax,ncTot,`${m.kl!=null?fmt(m.kl,'n2'):''} ${m.dv||''} × ${fmt(m.dg,'n0')} đ NC`,`${NSI},${m.ri},10`)).join('')}</ol></div>
  </div>
  <div class="scard"><h3>Luồng số liệu giữa các sheet</h3><p class="hint">Số chạy từ trái sang phải rồi về bảng tổng. Bấm vào tên để mở sheet.</p>
   <div class="flow">${fl('PL GIA','PL GIA (giá HĐ)')}<i>→</i>${fl('03.1 DGCT ','03.1 DGCT (phân tích đơn giá)')}<i>→</i>${fl('3. PTVT','3. PTVT (hao phí vật tư)')}<i>→</i>${fl('2.KHVT','2.KHVT (KL, giá mua)')}<i>⇄</i>${fl('4. TH Vật tư','4. TH Vật tư')}<i>→</i><b>${fl('1. THKHTC','1. THKHTC')}</b></div>
   <div class="flow" style="margin-top:6px">${fl('03.TL kien truc','03.TL kiến trúc')}<i>→</i>${fl('3. KH NC-MTC','3. KH NC-MTC (khoán NC, máy)')}<i>→</i><b>${fl('1. THKHTC','1. THKHTC')}</b></div>
   <div class="flow" style="margin-top:6px">${fl('4.1 Luong BCH','4.1 Lương BCH')}<i>→</i>${fl('4. CPC','4. CPC (chi phí chung)')}<i>→</i><b>${fl('1. THKHTC','1. THKHTC')}</b><i>→</i>${fl('5. Lai Vay - TC','5. Lãi vay – TC')}</div>
  </div>`;
  $('#sheetTitle').innerHTML='Tóm tắt KHTC<small>Nguồn: '+esc(SRC_NAME)+' · '+SHEETS.length+' sheet, xếp theo nhóm ở menu bên trái</small>';
}
$('#summary').addEventListener('click',e=>{
  const t=e.target.closest('[data-go],[data-a],[data-sh]'); if(!t) return;
  if(t.dataset.a!=null){const a=+t.dataset.a;openA.has(a)?openA.delete(a):openA.add(a);renderSummary();return}
  e.preventDefault();
  if(t.dataset.sh!=null){cur=+t.dataset.sh;sel={r:0,c:0};render();grid.scrollTo(0,0);return}
  const [si,r,c]=t.dataset.go.split(',').map(Number); goTo(si,r,c); grid.focus();
});
let sumT=null; const sumLater=()=>{ if(cur>=0) return; clearTimeout(sumT); sumT=setTimeout(renderSummary,120) };
function tdAt(r,c){
  const o=LAYOUT&&LAYOUT.origin.get(r+','+c); if(o){r=o[0];c=o[1];}
  return grid.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
}
function markSel(scroll=true){
  if(cur<0) return;
  grid.querySelectorAll('td.sel').forEach(t=>t.classList.remove('sel'));
  grid.querySelectorAll('th.on').forEach(t=>t.classList.remove('on'));
  const td=tdAt(sel.r,sel.c);
  if(td){ td.classList.add('sel'); sel={r:+td.dataset.r,c:+td.dataset.c};
    const th=grid.querySelector(`thead th[data-c="${sel.c}"]`); th&&th.classList.add('on');
    const rh=grid.querySelector(`th.rh[data-r="${sel.r}"]`); rh&&rh.classList.add('on');
    if(scroll){ const g=grid.getBoundingClientRect(), t=td.getBoundingClientRect();
      if(t.top<g.top+24) grid.scrollTop-=g.top+24-t.top; else if(t.bottom>g.bottom) grid.scrollTop+=t.bottom-g.bottom+4;
      if(t.left<g.left+46) grid.scrollLeft-=g.left+46-t.left; else if(t.right>g.right) grid.scrollLeft+=t.right-g.right+4; } }
  $('#nameBox').value=colStr(sel.c+1)+(sel.r+1);
  const inp=curInput(cur,sel.r,sel.c);
  const fi=$('#fInput'); fi.value=inp==null?'':(typeof inp==='number'?String(inp).replace('.',','):String(inp));
  const ext=typeof inp==='string'&&/\[\d+\]/.test(inp);
  fi.title=ext?'Công thức liên kết file ngoài – chỉ xem':'';
}
function updateCells(changes){ // cập nhật ô thay đổi mà không vẽ lại toàn bộ
  const showF=$('#showF').checked; const sh=SHEETS[cur];
  for(const ch of changes){
    const a=ch.address; if(!a||a.sheet!==cur) continue;
    const td=grid.querySelector(`td[data-r="${a.row}"][data-c="${a.col}"]`); if(!td) continue;
    const x=cellOf(cur,a.row,a.col); const st=x?STY[x[1]]||{}:{};
    const input=curInput(cur,a.row,a.col); const isF=typeof input==='string'&&input[0]==='=';
    let v=valueOf(cur,a.row,a.col); if(v===null&&isF) v=0;
    td.firstChild.textContent=showF&&isF?input:fmt(v,st.nf);
    td.classList.toggle('num',(typeof v==='number'||isErr(v))&&!st.a&&!(showF&&isF));
  }
}

/* ---------------- bộ tính công thức ---------------- */
function buildEngine(){
  const data={};
  SHEETS.forEach((s,si)=>{const ctx=ctxFor(si);
    data[s.name]=s.rows.map(row=>{const a=[];for(let c=0;c<s.nc;c++){const x=row[2][c];a.push(!x?null:(x[2]&&!/\[\d+\]/.test(x[2])?toEngine(x[2],ctx):x[0]))}return a});});
  hf=HyperFormula.buildFromSheets(data,{licenseKey:'gpl-v3',evaluateNullToZero:true,leapYear1900:true,nullDate:{year:1899,month:12,day:30},maxColumns:200,maxRows:20000});
  ready=true;
}
function setEngine(si,r,c,input){
  if(typeof input==='string'&&/^=\s*SUBTOTAL\(\s*(9|109)\s*,/i.test(input)) isSub[SHEETS[si].name+'|'+(r+1)+'|'+(c+1)]=1;
  else delete isSub[SHEETS[si].name+'|'+(r+1)+'|'+(c+1)];
  const ec=engineContent(si,input);
  try{ return hf.setCellContents({sheet:si,row:r,col:c},[[ec]]); }
  catch(e){ return hf.setCellContents({sheet:si,row:r,col:c},[[typeof input==='string'?input.replace(/^=/,"'="):input]]); }
}

/* ---------------- sửa ô ---------------- */
function parseInput(t){
  if(t==null) return null; t=String(t);
  if(t.trim()==='') return null;
  if(t[0]==='=') return t.trim();
  const s=t.trim().replace(/\s/g,'');
  let m;
  if((m=/^(-?)([\d.]*\d)(?:,(\d+))?(%?)$/.exec(s))){
    const intp=m[2]; const dots=(intp.match(/\./g)||[]).length;
    let n;
    if(dots===0) n=parseFloat(intp+(m[3]?'.'+m[3]:''));
    else if(/^\d{1,3}(\.\d{3})+$/.test(intp)) n=parseFloat(intp.replace(/\./g,'')+(m[3]?'.'+m[3]:''));
    else if(dots===1&&!m[3]) n=parseFloat(intp);
    else n=NaN;
    if(!isNaN(n)){ if(m[1]) n=-n; if(m[4]) n=n/100; return n; }
  }
  return t;
}
const undoS=[], redoS=[];
const same=(a,b)=>a===b||(a==null&&b==null);
function applyInput(si,r,c,input,opts={}){
  // input: giá trị/công thức mới (undefined = trả về giá trị gốc)
  const key=keyOf(si,r,c), orig=origInput(si,r,c);
  const before=EDITS.has(key)?EDITS.get(key).v:undefined;
  let eff=input===undefined?orig:input;
  if(same(eff,curInput(si,r,c))&&!opts.force) return;
  if(same(eff,orig)) EDITS.delete(key); else EDITS.set(key,{si,r,c,v:eff,t:Date.now()});
  if(!opts.fromRemote){ undoS.push({si,r,c,before,after:same(eff,orig)?undefined:eff}); if(!opts.redo) redoS.length=0; persist(key); }
  let changes=[];
  if(ready) changes=setEngine(si,r,c,eff)||[];
  if(si===cur){ const td=grid.querySelector(`td[data-r="${r}"][data-c="${c}"]`); if(td) td.classList.toggle('ed',EDITS.has(key));
    updateCells([{address:{sheet:si,row:r,col:c}},...changes]); if(sel.r===r&&sel.c===c) markSel(false); }
  renderKPI(); renderTabs(); sumLater(); updUndo(); if(!$('#edPanel').hidden) renderPanel();
}
function updUndo(){$('#btnUndo').disabled=!undoS.length;$('#btnRedo').disabled=!redoS.length}
function undo(){const u=undoS.pop();if(!u)return;redoS.push(u);goTo(u.si,u.r,u.c);applyInput(u.si,u.r,u.c,u.before,{redo:true,force:true});undoS.pop();updUndo()}
function redo(){const u=redoS.pop();if(!u)return;goTo(u.si,u.r,u.c);applyInput(u.si,u.r,u.c,u.after,{redo:true,force:true});updUndo()}
function goTo(si,r,c){ if(si!==cur){cur=si;render()} sel={r,c}; markSel(true); }

/* ---- trình sửa trong ô ---- */
let editor=null;
function startEdit(initial){
  const td=tdAt(sel.r,sel.c); if(!td) return;
  const inp=curInput(cur,sel.r,sel.c);
  if(typeof inp==='string'&&/\[\d+\]/.test(inp)){msg('Ô này lấy số từ file Excel khác, không sửa trên app được.',true);return}
  endEdit(false);
  const el=document.createElement('input'); el.className='ced'; el.type='text'; el.spellcheck=false;
  el.value=initial!=null?initial:$('#fInput').value;
  td.appendChild(el); el.focus(); el.setSelectionRange(el.value.length,el.value.length);
  editor={el,r:sel.r,c:sel.c};
  el.addEventListener('input',()=>{$('#fInput').value=el.value});
  el.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();commitEdit();move(e.shiftKey?-1:1,0)}
    else if(e.key==='Tab'){e.preventDefault();commitEdit();move(0,e.shiftKey?-1:1)}
    else if(e.key==='Escape'){e.preventDefault();endEdit(false);markSel(false);grid.focus()}
  });
  el.addEventListener('blur',()=>{ if(editor&&editor.el===el) setTimeout(()=>{ if(editor&&editor.el===el){commitEdit()} },0) });
}
function commitEdit(){ if(!editor) return; const {el,r,c}=editor; const val=el.value; endEdit(true); applyInput(cur,r,c,parseInput(val)); grid.focus(); }
function endEdit(){ if(!editor) return; const el=editor.el; editor=null; el.remove(); }
function move(dr,dc){
  if(!LAYOUT) return; const {vr,vc}=LAYOUT;
  // đứng trên vùng gộp thì nhảy qua hết vùng
  let r=sel.r,c=sel.c; const td=tdAt(r,c);
  const span=td?[+td.rowSpan||1,+td.colSpan||1]:[1,1];
  const near=(arr,x)=>{let i=arr.indexOf(x);if(i<0){i=arr.findIndex(y=>y>x);if(i<0)i=arr.length-1}return i};
  let ri=near(vr,r), ci=near(vc,c);
  if(dr>0) ri+=span[0]; else if(dr<0) ri-=1;
  if(dc>0) ci+=span[1]; else if(dc<0) ci-=1;
  ri=Math.max(0,Math.min(vr.length-1,ri)); ci=Math.max(0,Math.min(vc.length-1,ci));
  sel={r:vr[ri],c:vc[ci]}; markSel(true);
}

/* ---- sự kiện ---- */
grid.addEventListener('mousedown',e=>{
  const rz=e.target.closest('.rz'); if(rz){startResize(e,+rz.dataset.c);return}
  const td=e.target.closest('td'); if(!td||e.target.classList.contains('ced')) return;
  if(editor) commitEdit();
  sel={r:+td.dataset.r,c:+td.dataset.c}; markSel(false); grid.focus({preventScroll:true});
});
grid.addEventListener('dblclick',e=>{const td=e.target.closest('td');if(td&&!e.target.classList.contains('ced'))startEdit()});
grid.addEventListener('keydown',e=>{
  if(editor) return;
  const k=e.key;
  if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='z'){e.preventDefault();undo();return}
  if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='y'){e.preventDefault();redo();return}
  if((e.ctrlKey||e.metaKey)&&k==='`'){e.preventDefault();$('#showF').checked=!$('#showF').checked;render(true);return}
  if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='c'){const v=$('#fInput').value;try{navigator.clipboard.writeText(v).then(()=>msg('Đã chép: '+v.slice(0,60)),()=>{})}catch(_){}return}
  if(k==='ArrowDown'||k==='Enter'){e.preventDefault();move(e.shiftKey&&k==='Enter'?-1:1,0)}
  else if(k==='ArrowUp'){e.preventDefault();move(-1,0)}
  else if(k==='ArrowRight'||k==='Tab'&&!e.shiftKey){e.preventDefault();move(0,1)}
  else if(k==='ArrowLeft'||k==='Tab'&&e.shiftKey){e.preventDefault();move(0,-1)}
  else if(k==='F2'){e.preventDefault();startEdit()}
  else if(k==='Delete'||k==='Backspace'){e.preventDefault();const inp=curInput(cur,sel.r,sel.c);if(typeof inp==='string'&&/\[\d+\]/.test(inp))return;applyInput(cur,sel.r,sel.c,null)}
  else if(k.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();startEdit(k)}
});
$('#fInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();const inp=curInput(cur,sel.r,sel.c);if(typeof inp==='string'&&/\[\d+\]/.test(inp)){msg('Ô này lấy số từ file Excel khác, không sửa trên app được.',true);return}
    applyInput(cur,sel.r,sel.c,parseInput(e.target.value));grid.focus();move(1,0)}
  else if(e.key==='Escape'){markSel(false);grid.focus()}
});
$('#fInput').addEventListener('input',e=>{ if(editor) editor.el.value=e.target.value; });
$('#nameBox').addEventListener('keydown',e=>{
  if(e.key!=='Enter') return; e.preventDefault();
  let t=e.target.value.trim().toUpperCase(), si=cur;
  const bang=t.lastIndexOf('!'); if(bang>0){const nm=e.target.value.trim().slice(0,bang).replace(/^'|'$/g,'');const i=SHEETS.findIndex(s=>s.name.toUpperCase()===nm.toUpperCase());if(i>=0)si=i;t=t.slice(bang+1)}
  const m=/^\$?([A-Z]{1,3})\$?(\d+)$/.exec(t); if(!m){msg('Địa chỉ không hợp lệ. Ví dụ: I15 hoặc 2.KHVT!F11',true);return}
  goTo(si,+m[2]-1,colNum(m[1])-1); grid.focus();
});

let tq; $('#q').addEventListener('input',()=>{clearTimeout(tq);tq=setTimeout(()=>render(),250)});
['#onlyHit','#showHidden','#showF'].forEach(s=>$(s).addEventListener('change',()=>render(true)));
$('#btnUndo').addEventListener('click',undo); $('#btnRedo').addEventListener('click',redo);

/* ---- kéo đổi độ rộng cột ---- */
/* ---- V1.8.4: thu phóng bảng (50–200%, nhớ theo máy) ---- */
let ZM=1; try{ZM=Math.min(2,Math.max(.5,+localStorage.getItem('khtc-zoom')||1))}catch(_){}
function setZoom(z){ ZM=Math.round(Math.min(2,Math.max(.5,z))*10)/10; grid.style.setProperty('--zm',ZM); $('#zVal').textContent=Math.round(ZM*100)+'%'; try{localStorage.setItem('khtc-zoom',String(ZM))}catch(_){} }
$('#zIn').addEventListener('click',()=>setZoom(ZM+.1)); $('#zOut').addEventListener('click',()=>setZoom(ZM-.1)); $('#zVal').addEventListener('click',()=>setZoom(1));
grid.addEventListener('wheel',e=>{ if(!(e.ctrlKey||e.metaKey)) return; e.preventDefault(); setZoom(ZM+(e.deltaY<0?.1:-.1)); },{passive:false});
setZoom(ZM);
function startResize(e,c){
  e.preventDefault(); const sh=SHEETS[cur]; const x0=e.clientX; const w0=colW(cur,c)||24;
  const col=grid.querySelectorAll('col')[LAYOUT.vc.indexOf(c)+1]; const tbl=grid.querySelector('table'); const tw0=tbl.offsetWidth;
  const mv=ev=>{const w=Math.max(16,w0+(ev.clientX-x0)/ZM);col.style.width=w+'px';tbl.style.width=(tw0+w-w0)+'px'};
  const up=ev=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up);const w=Math.max(16,w0+(ev.clientX-x0)/ZM);widthOv[sh.name+'|'+c]=Math.round(w);try{localStorage.setItem('polaris-colw',JSON.stringify(widthOv))}catch(_){}render(true)};
  addEventListener('mousemove',mv); addEventListener('mouseup',up);
}

/* ---------------- lưu chỉnh sửa: theo công trình trong dữ liệu HaoHao (tự đồng bộ qua tài khoản Google) ---------------- */
function persist(key){ const e=EDITS.get(key), [si,r,c]=(()=>{const m=/^(\d+)-([A-Z]+)(\d+)$/.exec(key);return [+m[1],+m[3]-1,colNum(m[2])-1]})();
  try{ HOST.set(NK(si,r,c), e?{v:e.v===undefined?null:e.v,t:e.t}:null); setStat('ok','Đã lưu theo công trình · '+EDITS.size+' ô đã sửa'); }catch(err){ setStat('warn','Chưa lưu được – thử lại'); } }
function setStat(kind,text){$('#eDot').className='dot '+(kind==='ok'?'ok':'busy');$('#eStat').textContent=text}
function applyRemote(all){   // all: { 'sheet|r|c': {v,t} } – bản đã gộp từ HaoHao
  if(!ready) return; const want=new Map();
  Object.entries(all||{}).forEach(([k,e])=>{const p=k.split('|'), c=+p.pop(), r=+p.pop(), si=SI[p.join('|')]; if(si==null||!e) return; want.set(keyOf(si,r,c),{si,r,c,v:e.v});});
  want.forEach((w,k)=>{const l=EDITS.get(k); if(!l||!same(l.v,w.v)) applyInput(w.si,w.r,w.c,w.v==null?null:w.v,{fromRemote:true,force:true});});
  [...EDITS.keys()].forEach(k=>{ if(!want.has(k)){const e=EDITS.get(k); applyInput(e.si,e.r,e.c,undefined,{fromRemote:true,force:true});} });
  setStat('ok','Đã lưu theo công trình · '+EDITS.size+' ô đã sửa');
}
window.KHTCRemote=applyRemote;
/* ảnh chụp số liệu cho điện thoại (chỉ xem): 5 thẻ + bảng phân bổ */
let snapT=null; function snapLater(){ if(!HASK||!ready) return; clearTimeout(snapT); snapT=setTimeout(()=>{ try{
  const base=TV(11,8)||1;
  HOST.snap({src:SRC_NAME,n:EDITS.size,kpi:KPI.map(k=>({l:k.label,v:Math.round(kv(k.a)),n:k.note(),g:k.good?1:0})),
    alloc:ALLOC.map(a=>({l:a.lbl,v:Math.round(TV(a.r,8)),p:a.k==='base'?1:TV(a.r,8)/base,dt:Math.round(TV(a.r,6)),k:a.k||''}))}); }catch(e){} },1500); }

/* ---------------- danh sách ô đã sửa ---------------- */
function renderPanel(){
  const list=[...EDITS.values()].sort((a,b)=>a.si-b.si||a.r-b.r||a.c-b.c);
  const show=v=>v==null?'(trống)':typeof v==='number'?fmt(v,'g'):String(v);
  $('#edPanel').innerHTML=`<button class="x" id="pClose">Đóng</button><h3>Ô đã sửa (${list.length})</h3>`+
   (list.length?`<table><tbody>${list.map(e=>{const o=origInput(e.si,e.r,e.c);return `<tr><td><a href="#ke-hoach" data-go="${e.si},${e.r},${e.c}">${esc(SHEETS[e.si].name)}!${colStr(e.c+1)}${e.r+1}</a></td><td>Gốc: <code>${esc(show(o))}</code><br>Mới: <code>${esc(show(e.v))}</code></td><td><button data-rv="${e.si},${e.r},${e.c}">Trả gốc</button></td></tr>`}).join('')}</tbody></table>
   <p><button id="pReset">Trả tất cả về file gốc</button></p>`:'<p>Chưa sửa ô nào. Chọn một ô rồi gõ để sửa.</p>');
}
$('#btnEdits').addEventListener('click',()=>{const p=$('#edPanel');p.hidden=!p.hidden;if(!p.hidden)renderPanel()});
$('#edPanel').addEventListener('click',e=>{
  const t=e.target;
  if(t.id==='pClose'){$('#edPanel').hidden=true;return}
  if(t.dataset.go){e.preventDefault();const [si,r,c]=t.dataset.go.split(',').map(Number);goTo(si,r,c);grid.focus();return}
  if(t.dataset.rv){const [si,r,c]=t.dataset.rv.split(',').map(Number);applyInput(si,r,c,undefined);return}
  if(t.id==='pReset'){confirmBox(`Trả toàn bộ ${EDITS.size} ô đã sửa về giá trị trong file gốc? Áp dụng cho mọi máy đang dùng công trình này.`,()=>{[...EDITS.values()].forEach(x=>applyInput(x.si,x.r,x.c,undefined));render(true)})}
});
function confirmBox(text,yes){const m=$('#modal');$('#mText').textContent=text;m.hidden=false;$('#mYes').focus();
  const close=()=>{m.hidden=true;$('#mYes').onclick=$('#mNo').onclick=null};$('#mNo').onclick=close;$('#mYes').onclick=()=>{close();yes()};}

/* ---------------- tải Excel ---------------- */
function msg(s,err){const m=$('#msg');m.textContent=s||'';m.className='msg'+(err?' err':'')}
const b64bytes=()=>ORIG;
const toResult=v=>isErr(v)?{err:errText(v)}:v;
$('#btnXlsx').addEventListener('click',async()=>{
  const btn=$('#btnXlsx'); btn.disabled=true; msg('Đang tạo file Excel…');
  try{
    const edits={}, cached={};
    if(ready){
      SHEETS.forEach((s,si)=>s.rows.forEach((row,r)=>row[2].forEach((x,c)=>{
        if(!x||!x[2]||EDITS.has(keyOf(si,r,c))) return;
        const v=hf.getCellValue({sheet:si,row:r,col:c}); const o=x[0];
        const diff=typeof o==='number'&&typeof v==='number'?Math.abs(o-v)>Math.max(1e-9,Math.abs(o)*1e-12):!same(o,isErr(v)?errText(v):v)&&!(o==null&&(v===0||v===''));
        if(diff)(cached[s.name]=cached[s.name]||{})[colStr(c+1)+(r+1)]=toResult(v);
      })));
    }
    EDITS.forEach(e=>{const nm=SHEETS[e.si].name, a=colStr(e.c+1)+(e.r+1);
      const val=(typeof e.v==='string'&&e.v[0]==='=')?{formula:e.v,result:ready?toResult(hf.getCellValue({sheet:e.si,row:e.r,col:e.c})):null}:{value:e.v};
      (edits[nm]=edits[nm]||{})[a]=val;});
    const out=await XLPatch.patchWorkbook(JSZip,b64bytes(),edits,cached);
    const d=new Date(), p=n=>String(n).padStart(2,'0');
    const base0=SRC_NAME.replace(/\.xls[xm]?$/i,''); const fn=EDITS.size?`${base0} (sua ${p(d.getDate())}-${p(d.getMonth()+1)} ${p(d.getHours())}h${p(d.getMinutes())}).xlsx`:base0+'.xlsx';
    {const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=fn;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);} msg('Đã tải: '+fn+(EDITS.size?` (kèm ${EDITS.size} ô đã sửa)`:''));
  }catch(e){msg(e&&e.code==='declined'?'Đã hủy tải file.':'Không tạo được file Excel: '+(e&&(e.code||e.message)||'lỗi'),true)}
  finally{btn.disabled=false}
});

/* ---------------- khởi động ---------------- */
if(!HASK) cur=SHEETS.findIndex(x=>x.state==='visible'); if(cur<-1) cur=0;
renderKPI(); render();
setTimeout(()=>{
  try{ const t0=performance.now(); buildEngine();
    for(const [k,e] of Object.entries(EDIT0||{})){ const p=k.split('|'), c=+p.pop(), r=+p.pop(), si=SI[p.join('|')]; if(si!=null&&e) applyInput(si,r,c,e.v==null?null:e.v,{fromRemote:true,force:true}); }
    render(true); renderKPI();
    setStat('ok','Bộ tính sẵn sàng ('+Math.round(performance.now()-t0)+' ms) · '+EDITS.size+' ô đã sửa · lưu theo công trình');
  }catch(e){ setStat('warn','Không nạp được bộ tính công thức: '+e.message); }
},30);
};
