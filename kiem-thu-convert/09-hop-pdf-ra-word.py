# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS_DRAG='''async ([names,datas,type,x,y,drop])=>{ const dt=new DataTransfer(); names.forEach((n,i)=>{ const u=Uint8Array.from(atob(datas[i]),c=>c.charCodeAt(0)); dt.items.add(new File([u],n,{type})); });
  const ev=(t)=>document.elementFromPoint(x,y).dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,dataTransfer:dt}));
  ev('dragenter'); ev('dragover'); if(drop) ev('drop'); }'''
import math
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':900},accept_downloads=True)
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    dls=[]
    async def ondl(d): await d.save_as(os.path.join(OUT,'dl-'+d.suggested_filename)); dls.append(d.suggested_filename)
    pg.on('download',lambda d: asyncio.ensure_future(ondl(d)))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    n=['hop-dong.pdf']; d=[base64.b64encode(open(os.path.join(FX,x),'rb').read()).decode() for x in n]
    for _ in range(3): await pg.evaluate(JS_DRAG,[n,d,'application/pdf',640,400,False]); await pg.wait_for_timeout(100)
    a=-math.pi/2+4*2*math.pi/6; x,y=640+math.cos(a)*137,400+math.sin(a)*137   # ô DOCX (thứ 5/6)
    for _ in range(3): await pg.evaluate(JS_DRAG,[n,d,'application/pdf',x,y,False]); await pg.wait_for_timeout(100)
    await pg.evaluate(JS_DRAG,[n,d,'application/pdf',x,y,True]); await pg.wait_for_selector('.hhd-dlg',timeout=8000); await pg.wait_for_timeout(500)
    await pg.screenshot(path=f'{OUT}/dlg.png'); await pg.click('.hhd-mode >> nth=1'); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(6000)
    print('downloads',dls,'errors',errs[:3]); await ctx.close()
asyncio.run(main())
