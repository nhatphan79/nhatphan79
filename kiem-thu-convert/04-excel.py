# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, subprocess, zipfile
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS='''async ([fn,names,datas,to])=>{ const fs=names.map((n,i)=>new File([Uint8Array.from(atob(datas[i]),c=>c.charCodeAt(0))],n));
 try{ const res= fn==='gop' ? await HHDoi._t.gopTach(fs,undefined,()=>{}) : await HHDoi.convert(fs,to,()=>{}); const out=[]; for(const x of res){ const b=new Uint8Array(await x.blob.arrayBuffer()); let s=''; for(let i=0;i<b.length;i+=32768) s+=String.fromCharCode(...b.subarray(i,i+32768)); out.push([x.name,btoa(s)]); } return out; }catch(e){ return 'ERR '+(e.stack||e) } }'''
CASES=[('cv',['bao-gia.xlsx'],'PDF'),('cv',['bao-gia.xlsx'],'PNG'),('cv',['bao-gia.xlsx'],'CSV'),('cv',['bg-copy.xls'],'XLSX'),('cv',['bg-copy.xls'],'PDF'),('cv',['bang-rong.xlsx'],'PDF'),('cv',['danh-sach.csv'],'JPG'),('cv',['danh-sach.csv'],'XLSX'),
 ('gop',['bao-gia.xlsx','danh-sach.csv','bg-copy.xls'],None),('gop',['bao-gia.xlsx'],None),('gop',['danh-sach.csv'],None),('gop',['tai-lieu.pdf','bao-gia.xlsx','anh-gps.jpg'],None)]
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':800})
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    for fn,names,to in CASES:
      datas=[base64.b64encode(open(os.path.join(FX,n),'rb').read()).decode() for n in names]
      r=await pg.evaluate(JS,[fn,names,datas,to])
      if isinstance(r,str): print(fn,names,to,'->',r[:200]); continue
      outs=[]
      for name,b in r:
        fp=os.path.join(OUT,f'{fn}-{to}-{name}'); open(fp,'wb').write(base64.b64decode(b)); outs.append(name)
      print(fn,names,to,'->',outs)
    print('errors',errs); await ctx.close()
asyncio.run(main())
