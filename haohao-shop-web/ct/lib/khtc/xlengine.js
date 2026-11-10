/* Chuyển công thức Excel -> công thức cho HyperFormula (giữ nguyên công thức hiển thị cho người dùng) */
(function(root){
function splitArgs(s){ // s = nội dung giữa ngoặc
  const out=[]; let d=0, q=null, cur='';
  for(let i=0;i<s.length;i++){const ch=s[i];
    if(q){cur+=ch; if(ch===q){ if(s[i+1]===q){cur+=s[++i];} else q=null;} continue;}
    if(ch==='"'||ch==="'"){q=ch;cur+=ch;continue}
    if(ch==='('||ch==='{'){d++;cur+=ch;continue}
    if(ch===')'||ch==='}'){d--;cur+=ch;continue}
    if(ch===','&&d===0){out.push(cur);cur='';continue}
    cur+=ch;}
  out.push(cur); return out;
}
// tìm lời gọi hàm NAME( ... ) và thay bằng fn(args) ; xử lý từ trong ra ngoài
function rewriteCalls(f,name,fn){
  const re=new RegExp('(^|[^A-Za-z0-9_.])('+name+')\\(','gi');
  let guard=0; const skipped=[];
  while(guard++<500){
    re.lastIndex=0; let m, last=null;
    while((m=re.exec(f))){ // bỏ qua khi nằm trong chuỗi
      const pre=f.slice(0,m.index+m[1].length);
      if(((pre.match(/"/g)||[]).length)%2) continue;
      last=m;
    }
    if(!last) break;
    const start=last.index+last[1].length, open=start+last[2].length;
    let d=0,q=null,end=-1;
    for(let i=open;i<f.length;i++){const ch=f[i];
      if(q){if(ch===q)q=null;continue}
      if(ch==='"'||ch==="'"){q=ch;continue}
      if(ch==='(')d++; else if(ch===')'){d--; if(d===0){end=i;break}}}
    if(end<0) break;
    const args=splitArgs(f.slice(open+1,end));
    const rep=fn(args.map(a=>a.trim()));
    if(rep==null){ // đánh dấu đã xử lý bằng tên tạm để không lặp
      skipped.push(f[start]); f=f.slice(0,start)+'\u0001'+f.slice(start+1); continue; }
    f=f.slice(0,start)+rep+f.slice(end+1);
  }
  let k=0; f=f.replace(/\u0001/g,()=>skipped[k++]);
  return f;
}
const RNG=/^((?:'(?:[^']|'')+'|[A-Za-z0-9_.À-ỹ]+)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?$/;
const colNum=s=>{let n=0;for(const ch of s)n=n*26+ch.charCodeAt(0)-64;return n};
const colStr=n=>{let s='';while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26)}return s};
function parseRange(t){const m=RNG.exec(t);if(!m)return null;
  const r={sheet:m[1]||'',c1:colNum(m[3]),r1:+m[5],c2:m[7]?colNum(m[7]):colNum(m[3]),r2:m[9]?+m[9]:+m[5],abs:[m[2],m[4],m[6]||m[2],m[8]||m[4]]};
  return r;}
function fmtRange(r){return r.sheet+r.abs[0]+colStr(r.c1)+r.abs[1]+r.r1+':'+r.abs[2]+colStr(r.c2)+r.abs[3]+r.r2}
function sheetName(prefix,cur){if(!prefix)return cur;let s=prefix.slice(0,-1);if(s[0]==="'")s=s.slice(1,-1).replace(/''/g,"'");return s}

function toEngine(f,ctx){ // ctx: {sheet, isSubtotal(sheetName,row1,col1)}
  if(typeof f!=='string'||f[0]!=='=') return f;
  let g=f;
  g=g.replace(/(?:'(?:[^']|'')+'|[A-Za-z0-9_.À-ỹ]+)!#REF!/g,'#REF!');
  // VLOOKUP(x, range, k, 0) -> INDEX(cột k, MATCH(x, cột 1, 0))
  g=rewriteCalls(g,'VLOOKUP',a=>{
    if(a.length<3) return null;
    const exact=a.length>=4&&/^(0|FALSE)$/i.test(a[3]);
    const r=parseRange(a[1]); const k=+a[2];
    if(!r||!exact||!(k>=1)) return null;
    const col=r.c1+k-1;
    // Tra trực tiếp ô khớp (tránh vòng lặp giả do tham chiếu cả bảng)
    const lr=parseRange(a[0]);
    if(ctx&&ctx.valueOf&&lr&&lr.r1===lr.r2&&lr.c1===lr.c2){
      const lsh=sheetName(lr.sheet,ctx.sheet), tsh=sheetName(r.sheet,ctx.sheet);
      const key=ctx.valueOf(lsh,lr.r1,lr.c1);
      if(key!=null&&key!==''){
        const K=String(key).toLowerCase();
        for(let rr=r.r1;rr<=r.r2;rr++){const kv=ctx.valueOf(tsh,rr,r.c1);
          if(kv!=null&&String(kv).toLowerCase()===K){
            const pre=r.sheet;
            return 'IF('+a[0]+'='+pre+'$'+colStr(r.c1)+'$'+rr+','+pre+'$'+colStr(col)+'$'+rr+',NA())';}}
      }
    }
    const rc={...r,c1:col,c2:col,abs:[r.abs[0],r.abs[1],r.abs[0],r.abs[3]]};
    const rk={...r,c2:r.c1,abs:[r.abs[0],r.abs[1],r.abs[0],r.abs[3]]};
    return 'INDEX('+fmtRange(rc)+',MATCH('+a[0]+','+fmtRange(rk)+',0))';
  });
  // SUMIF(range, crit, sum_range): sum_range cùng kích thước range (như Excel)
  g=rewriteCalls(g,'SUMIF',a=>{
    if(a.length!==3) return null;
    const r=parseRange(a[0]), s=parseRange(a[2]);
    if(!r||!s) return null;
    const h=r.r2-r.r1, w=r.c2-r.c1;
    if(s.r2-s.r1===h&&s.c2-s.c1===w) return null;
    const s2={...s,r2:s.r1+h,c2:s.c1+w};
    return 'SUMIF('+a[0]+','+a[1]+','+fmtRange(s2)+')';
  });
  // Tiêu chí SUMIF/COUNTIF là ô tham chiếu: so sánh bằng (tránh ký tự < > = trong tên vật tư bị hiểu sai)
  const crit=(a,i)=>{const t=a[i]; if(t&&parseRange(t)&&!/:/.test(t)) a[i]='IF(ISBLANK('+t+'),0,"="&'+t+')'; return a;};
  g=rewriteCalls(g,'SUMIF',a=>{ if(a.length<2||!parseRange(a[1])||/:/.test(a[1])) return null; return '\u0003UMIF('+crit(a,1).join(',')+')';});
  g=rewriteCalls(g,'COUNTIF',a=>{ if(a.length!==2||!parseRange(a[1])||/:/.test(a[1])) return null; return '\u0004OUNTIF('+crit(a,1).join(',')+')';});
  // ROUND: bù sai số dấu phẩy động như Excel (15 chữ số)
  g=rewriteCalls(g,'ROUND',a=>{ if(a.length!==2) return null; return '\u0005OUND(('+a[0]+')*(1+SIGN('+a[0]+')*0.0000000000001),'+a[1]+')';});
  g=g.replace(/\u0003/g,'S').replace(/\u0004/g,'C').replace(/\u0005/g,'R');
  // SUBTOTAL(9,...) bỏ qua các SUBTOTAL lồng bên trong (như Excel)
  if(ctx&&ctx.isSubtotal) g=rewriteCalls(g,'SUBTOTAL',a=>{
    if(!/^(9|109)$/.test(a[0])) return null;
    const sub=[];
    for(const t of a.slice(1)){const r=parseRange(t); if(!r) return null;
      const sh=sheetName(r.sheet,ctx.sheet);
      for(let rr=r.r1;rr<=r.r2;rr++)for(let cc=r.c1;cc<=r.c2;cc++)
        if(ctx.isSubtotal(sh,rr,cc)) sub.push(r.sheet+colStr(cc)+rr);}
    const base='SUM('+a.slice(1).join(',')+')';
    return sub.length?'('+base+'-SUM('+sub.join(',')+'))':base;
  });
  return g;
}
// sau khi đánh dấu \u0001 thay chữ cái đầu tên hàm, phải khôi phục: lưu tên gốc
function toEngineSafe(f,ctx){
  // rewriteCalls dùng \u0001 thay ký tự đầu của tên hàm đã bỏ qua; khôi phục bằng cách thay lại
  const marks=[];
  const out=toEngine(f.replace(/\u0001/g,''),ctx);
  return out;
}
root.XLEngine={toEngine,parseRange,colStr,colNum,splitArgs};
})(typeof window!=='undefined'?window:module.exports);
