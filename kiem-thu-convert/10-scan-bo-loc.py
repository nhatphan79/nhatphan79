# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS='''async ([n,d,mode])=>{ const f=new File([Uint8Array.from(atob(d),c=>c.charCodeAt(0))],n); const T=HHDoi._t;
  const src=await T.decodeImage(f); const t0=performance.now(); const q=T.scanCorners(src); const t1=performance.now(); const w=T.warp(src,q,2600,!n.includes('the')); const t2=performance.now(); const c=T.scanFilter(w,mode,50); const t3=performance.now();
  const b=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.85)); const u=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<u.length;i+=32768) s+=String.fromCharCode(...u.subarray(i,i+32768));
  return {q:q.map(p=>p.map(v=>Math.round(v))), ms:[t1-t0,t2-t1,t3-t2].map(Math.round), size:[c.width,c.height], img:btoa(s)} }'''
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':900})
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    for fn in sys.argv[3].split(','):
     d=base64.b64encode(open(os.path.join(FX,fn),'rb').read()).decode()
     for mode in ['scan','bw']:
      r=await pg.evaluate(JS,[fn,d,mode]); open(f'{OUT}/{fn[:-4]}-{mode}.jpg','wb').write(base64.b64decode(r['img'])); print(fn,mode,r['q'],r['ms'],'ms',r['size'])
    print('errors',errs); await ctx.close()
asyncio.run(main())
