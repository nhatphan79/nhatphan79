/* Ghi chỉnh sửa vào file xlsx gốc ở mức XML (giữ nguyên toàn bộ định dạng) */
(function(root){
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const unesc=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const colNum=s=>{let n=0;for(const ch of s)n=n*26+ch.charCodeAt(0)-64;return n};
const colStr=n=>{let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// dịch công thức shared sang vị trí khác (dời tham chiếu tương đối)
function shiftFormula(f,dr,dc){
  let out='',i=0;
  while(i<f.length){
    const ch=f[i];
    if(ch==='"'){let j=i+1;while(j<f.length){if(f[j]==='"'){if(f[j+1]==='"'){j+=2;continue}break}j++}out+=f.slice(i,j+1);i=j+1;continue}
    if(ch==="'"){let j=i+1;while(j<f.length){if(f[j]==="'"){if(f[j+1]==="'"){j+=2;continue}break}j++}out+=f.slice(i,j+1);i=j+1;continue}
    const m=/^(\$?)([A-Z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/.exec(f.slice(i));
    const prev=i>0?f[i-1]:'';
    if(m&&!/[A-Za-z0-9_.]/.test(prev)){
      const c=m[1]?m[2]:colStr(colNum(m[2])+dc), r=m[3]?m[4]:String(+m[4]+dr);
      out+=m[1]+c+m[3]+r; i+=m[0].length; continue;
    }
    // bỏ qua tên hàm/định danh nguyên khối
    const w=/^[A-Za-z_][A-Za-z0-9_.]*/.exec(f.slice(i));
    if(w){out+=w[0];i+=w[0].length;continue}
    out+=ch;i++;
  }
  return out;
}

function cellXml(addr,attrs,val){ // attrs: chuỗi thuộc tính giữ lại (s=...)
  attrs=attrs.replace(/\s+t="[^"]*"/,'').replace(/\s+cm="[^"]*"/,'').replace(/\s+vm="[^"]*"/,'');
  if(val.formula!=null){
    const f='<f>'+esc(val.formula.replace(/^=/,''))+'</f>';
    const r=val.result;
    if(typeof r==='number'&&isFinite(r)) return `<c r="${addr}"${attrs}>${f}<v>${r}</v></c>`;
    if(typeof r==='boolean') return `<c r="${addr}"${attrs} t="b">${f}<v>${r?1:0}</v></c>`;
    if(typeof r==='string') return `<c r="${addr}"${attrs} t="str">${f}<v>${esc(r)}</v></c>`;
    if(r&&r.err) return `<c r="${addr}"${attrs} t="e">${f}<v>${esc(r.err)}</v></c>`;
    return `<c r="${addr}"${attrs}>${f}</c>`;
  }
  const v=val.value;
  if(v==null||v==='') return `<c r="${addr}"${attrs}/>`;
  if(typeof v==='number') return `<c r="${addr}"${attrs}><v>${v}</v></c>`;
  if(typeof v==='boolean') return `<c r="${addr}"${attrs} t="b"><v>${v?1:0}</v></c>`;
  return `<c r="${addr}"${attrs} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}
const CELLRE=addr=>new RegExp('<c r="'+addr+'"((?:\\s+[a-zA-Z:]+="[^"]*")*)\\s*(?:/>|>([\\s\\S]*?)</c>)');

// tách các ô clone của shared formula có master tại addr
function explodeShared(xml,addr){
  const m=CELLRE(addr).exec(xml); if(!m||!m[2]) return xml;
  const fm=/<f t="shared"([^>]*)>([^<]*)<\/f>/.exec(m[2]); if(!fm) return xml;
  const si=/si="(\d+)"/.exec(fm[1]); if(!si) return xml;
  const base=unesc(fm[2]); const mr=/([A-Z]+)(\d+)/.exec(addr); const r0=+mr[2], c0=colNum(mr[1]);
  const re=new RegExp('<c r="([A-Z]+)(\\d+)"([^>]*)>((?:(?!</c>|<c )[\\s\\S])*?)<f t="shared" si="'+si[1]+'"\\s*/>','g');
  return xml.replace(re,(all,col,row,attrs,pre)=>{
    const f=shiftFormula(base,+row-r0,colNum(col)-c0);
    return `<c r="${col}${row}"${attrs}>${pre}<f>${esc(f)}</f>`;
  });
}

function setCell(xml,addr,val){
  xml=explodeShared(xml,addr);
  const re=CELLRE(addr); const m=re.exec(xml);
  if(m){ const s=/\s+s="\d+"/.exec(m[1]); {const nx=cellXml(addr,s?s[0]:'',val); return xml.replace(re,()=>nx);} }
  // ô chưa tồn tại: chèn vào dòng đúng thứ tự
  const mr=/([A-Z]+)(\d+)/.exec(addr); const row=+mr[2], col=colNum(mr[1]);
  const rowRe=new RegExp('<row r="'+row+'"([^>]*?)(/>|>([\\s\\S]*?)</row>)');
  const rm=rowRe.exec(xml);
  const nc=cellXml(addr,'',val);
  if(rm){
    if(rm[2]==='/>'){const nx=`<row r="${row}"${rm[1]}>${nc}</row>`; return xml.replace(rowRe,()=>nx);}
    const inner=rm[3]; let pos=inner.length;
    const cre=/<c r="([A-Z]+)\d+"/g; let k;
    while((k=cre.exec(inner))){ if(colNum(k[1])>col){pos=k.index;break} }
    const ni=inner.slice(0,pos)+nc+inner.slice(pos);
    {const nx=`<row r="${row}"${rm[1]}>${ni}</row>`; return xml.replace(rowRe,()=>nx);}
  }
  // dòng chưa tồn tại
  const rows=/<row r="(\d+)"/g; let k, at=-1;
  while((k=rows.exec(xml))){ if(+k[1]>row){at=k.index;break} }
  const nr=`<row r="${row}">${nc}</row>`;
  if(at<0){ if(/<sheetData\s*\/>/.test(xml)) return xml.replace(/<sheetData\s*\/>/,()=>`<sheetData>${nr}</sheetData>`); return xml.replace('</sheetData>',()=>nr+'</sheetData>'); }
  return xml.slice(0,at)+nr+xml.slice(at);
}
// chỉ cập nhật giá trị đệm (cached) của ô công thức
function setCached(xml,addr,result){
  const re=CELLRE(addr); const m=re.exec(xml); if(!m||!m[2]||!/<f[\s>/]/.test(m[2])) return xml;
  let attrs=m[1].replace(/\s+t="[^"]*"/,''); let inner=m[2].replace(/<v>[\s\S]*?<\/v>/,'');
  let t='',v='';
  if(typeof result==='number'&&isFinite(result)){v=`<v>${result}</v>`}
  else if(typeof result==='string'){t=' t="str"';v=`<v>${esc(result)}</v>`}
  else if(typeof result==='boolean'){t=' t="b"';v=`<v>${result?1:0}</v>`}
  else if(result&&result.err){t=' t="e"';v=`<v>${esc(result.err)}</v>`}
  {const nx=`<c r="${addr}"${attrs}${t}>${inner}${v}</c>`; return xml.replace(re,()=>nx);}
}

async function patchWorkbook(JSZip,data,sheetEdits,cachedUpdates){
  // sheetEdits: {sheetName:{A1:{formula|value,result}}}, cachedUpdates: {sheetName:{A1:result}}
  const zip=await JSZip.loadAsync(data);
  const wb=await zip.file('xl/workbook.xml').async('string');
  const rels=await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const map={};
  const sre=/<sheet\b[^>]*?name="([^"]*)"[^>]*?r:id="([^"]*)"[^>]*\/>/g; let m;
  while((m=sre.exec(wb))){ const rid=m[2]; const t=new RegExp('<Relationship[^>]*Id="'+reEsc(rid)+'"[^>]*Target="([^"]*)"').exec(rels)||new RegExp('<Relationship[^>]*Target="([^"]*)"[^>]*Id="'+reEsc(rid)+'"').exec(rels);
    if(t) map[unesc(m[1])]='xl/'+t[1].replace(/^\/?xl\//,'').replace(/^\//,''); }
  const names=new Set([...Object.keys(sheetEdits||{}),...Object.keys(cachedUpdates||{})]);
  for(const name of names){
    const p=map[name]; if(!p||!zip.file(p)) continue;
    let xml=await zip.file(p).async('string');
    const cu=(cachedUpdates||{})[name]||{}; for(const a in cu) xml=setCached(xml,a,cu[a]);
    const ed=(sheetEdits||{})[name]||{}; for(const a in ed) xml=setCell(xml,a,ed[a]);
    zip.file(p,xml);
  }
  let wb2=wb;
  if(/<calcPr\b[^>]*\/>/.test(wb2)) wb2=wb2.replace(/<calcPr\b([^>]*?)\s*\/>/,(a,b)=>'<calcPr'+b.replace(/\s+fullCalcOnLoad="[^"]*"/,'')+' fullCalcOnLoad="1"/>');
  else wb2=wb2.replace('</workbook>','<calcPr fullCalcOnLoad="1"/></workbook>');
  zip.file('xl/workbook.xml',wb2);
  if(zip.file('xl/calcChain.xml')){
    zip.remove('xl/calcChain.xml');
    zip.file('xl/_rels/workbook.xml.rels',rels.replace(/<Relationship[^>]*calcChain[^>]*\/>/,''));
    const ct=await zip.file('[Content_Types].xml').async('string');
    zip.file('[Content_Types].xml',ct.replace(/<Override PartName="\/xl\/calcChain.xml"[^>]*\/>/,''));
  }
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
}
root.XLPatch={patchWorkbook,shiftFormula,setCell,setCached};
})(typeof window!=='undefined'?window:module.exports);
