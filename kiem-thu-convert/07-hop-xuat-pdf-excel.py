# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, math
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS_DRAG='''async ([names,datas,type,x,y,drop])=>{ const dt=new DataTransfer(); names.forEach((n,i)=>{ const u=Uint8Array.from(atob(datas[i]),c=>c.charCodeAt(0)); dt.items.add(new File([u],n,{type})); });
  const ev=(t)=>document.elementFromPoint(x,y).dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,dataTransfer:dt}));
  ev('dragenter'); ev('dragover'); if(drop) ev('drop'); }'''
cx,cy=640,400; XT='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
async def drag(pg,names,x,y,drop=False):
  datas=[base64.b64encode(open(os.path.join(FX,n),'rb').read()).decode() for n in names]; await pg.evaluate(JS_DRAG,[names,datas,XT,x,y,drop])
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':900},accept_downloads=True)
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    dls=[]
    async def ondl(d): await d.save_as(os.path.join(OUT,'dl-'+d.suggested_filename)); dls.append(d.suggested_filename)
    pg.on('download',lambda d: asyncio.ensure_future(ondl(d)))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    n=['bao-gia-nt.xlsx']
    for _ in range(3): await drag(pg,n,cx,cy); await pg.wait_for_timeout(100)
    x,y=cx,cy-137
    for _ in range(3): await drag(pg,n,x,y); await pg.wait_for_timeout(100)
    await drag(pg,n,x,y,True); await pg.wait_for_selector('.hhd-dlg',timeout=15000); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'{OUT}/d1.png')
    await pg.select_option('.hhd-dlg select >> nth=1','p1'); await pg.wait_for_timeout(800); await pg.screenshot(path=f'{OUT}/d2.png')
    await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(4000)
    print('downloads',dls,'errors',errs[:4]); await ctx.close()
asyncio.run(main())
