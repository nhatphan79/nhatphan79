# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, sys
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); OUT=sys.argv[1]
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT,headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':800})
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; errs={}
    def watch(pg,tag): pg.on('pageerror',lambda e: errs.setdefault(tag,[]).append('PE '+str(e)[:160])); pg.on('console',lambda m: m.type=='error' and 'ERR_TUNNEL' not in m.text and 'Failed to load resource' not in m.text and errs.setdefault(tag,[]).append(m.text[:160]))
    for tag,url in [('newtab',f'chrome-extension://{eid}/newtab.html'),('convert',f'chrome-extension://{eid}/doifile.html'),('options',f'chrome-extension://{eid}/options.html'),('web','http://localhost:8765/doifile.html')]:
      pg=await ctx.new_page(); watch(pg,tag); await pg.goto(url); await pg.wait_for_timeout(3500)
      if tag=='web': print('hamster trên trang web:', await pg.evaluate("!!document.getElementById('hattieu-host')"))
      if tag=='newtab':
        await pg.evaluate("window.dispatchEvent(new CustomEvent('hh-open',{detail:{tab:'todo'}}))"); await pg.wait_for_timeout(800)
        print('bảng hamster mở:', await pg.evaluate("!!document.getElementById('hattieu-host').shadowRoot.querySelector('.panel:not([hidden])')"))
    print('phiên bản chạy:', await sw.evaluate('chrome.runtime.getManifest().version_name'))
    for k,v in errs.items(): print('LỖI',k,v[:5])
    if not errs: print('không có lỗi JS')
    await ctx.close()
asyncio.run(main())
