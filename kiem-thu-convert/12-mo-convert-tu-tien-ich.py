# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, sys
from playwright.async_api import async_playwright
import sys as _s; EXT=_s.argv[2] if len(_s.argv)>2 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); OUT=sys.argv[1]
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':800})
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]
    nt=await ctx.new_page(); errs=[]; nt.on('pageerror',lambda e: errs.append(str(e)))
    await nt.goto(f'chrome-extension://{eid}/newtab.html'); await nt.wait_for_timeout(2500)
    await nt.evaluate("window.dispatchEvent(new CustomEvent('hh-open',{detail:{tab:'tools'}}))"); await nt.wait_for_timeout(1500)
    await nt.evaluate("document.getElementById('hattieu-host').shadowRoot.querySelector('.tb-back').click()"); await nt.wait_for_timeout(800)
    await nt.screenshot(path=f'{OUT}/nt-tools.png')
    host=nt.locator('#hattieu-host')
    names=await nt.evaluate("(()=>{const r=document.getElementById('hattieu-host').shadowRoot; return [...r.querySelectorAll('.tools-grid .tool b')].map(b=>b.textContent)})()")
    print('tools grid:',names)
    # bấm Đổi file trong bảng → mở tab doifile
    n0=len(ctx.pages)
    await nt.evaluate("(()=>{const r=document.getElementById('hattieu-host').shadowRoot; [...r.querySelectorAll('.tools-grid .tool')].find(b=>b.textContent.includes('HaoHao Convert')).click()})()")
    await nt.wait_for_timeout(1500); print('pages', n0,'->',len(ctx.pages), [pg.url.split('/')[-1] for pg in ctx.pages])
    print('errors',errs[:5]); await ctx.close()
asyncio.run(main())
