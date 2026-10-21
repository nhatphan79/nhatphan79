# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, math
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS='''async ([names,datas,type,x,y,drop])=>{ clearInterval(window._k); const dt=new DataTransfer(); names.forEach((n,i)=>{ const u=Uint8Array.from(atob(datas[i]),c=>c.charCodeAt(0)); dt.items.add(new File([u],n,{type})); });
  const el=document.elementFromPoint(x,y); const ev=(t)=>el.dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,dataTransfer:dt}));
  ev('dragenter'); ev('dragover'); if(drop) ev('drop'); else window._k=setInterval(()=>ev('dragover'),60); }'''
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':900},accept_downloads=True)
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    n=['chup-hop-dong.jpg']; d=[base64.b64encode(open(os.path.join(FX,x),'rb').read()).decode() for x in n]
    await pg.evaluate(JS,[n,d,'image/jpeg',640,400,False]); await pg.wait_for_timeout(400)
    a=-math.pi/2+4*2*math.pi/8; x,y=640+math.cos(a)*137,400+math.sin(a)*137
    await pg.evaluate(JS,[n,d,'image/jpeg',x,y,False]); await pg.wait_for_timeout(400)
    await pg.screenshot(path=f'{OUT}/wheel-scan.png',clip={'x':420,'y':180,'width':440,'height':440})
    await pg.evaluate(JS,[n,d,'image/jpeg',x,y,True]); await pg.wait_for_selector('.hhd-dlg',timeout=8000); await pg.wait_for_timeout(800)
    print('dialog:', await pg.locator('.hhd-dlg-h b').text_content(), 'errors', errs); await ctx.close()
asyncio.run(main())
