# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, subprocess
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS='''async ([n,d,mode])=>{ const f=new File([Uint8Array.from(atob(d),c=>c.charCodeAt(0))],n);
 try{ const m=await HHDoi._t.pdfWord(), doc=await HHDoi._t.openPDF(f); const blob=await m.pdfToDocx(doc,mode); const b=new Uint8Array(await blob.arrayBuffer()); let s=''; for(let i=0;i<b.length;i+=32768) s+=String.fromCharCode(...b.subarray(i,i+32768)); return btoa(s) }catch(e){ return 'ERR '+(e.stack||e) } }'''
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':800})
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    for n in sys.argv[3].split(','):
      for mode in ['flow','exact']:
        d=base64.b64encode(open(os.path.join(FX,n),'rb').read()).decode(); r=await pg.evaluate(JS,[n,d,mode])
        if r.startswith('ERR'): print(n,mode,r[:500]); continue
        fp=f'{OUT}/{n[:-4]}-{mode}.docx'; open(fp,'wb').write(base64.b64decode(r)); print('ok',fp, os.path.getsize(fp))
    print('errors',errs[:5]); await ctx.close()
asyncio.run(main())
