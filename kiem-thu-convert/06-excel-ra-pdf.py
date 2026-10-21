# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, subprocess
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS='''async ([n,d,ov])=>{ const f=new File([Uint8Array.from(atob(d),c=>c.charCodeAt(0))],n);
 try{ const {m,book}=await HHDoi._t.xlsBook(f); const o=ov?{paper:'file',orient:'file',fit:'file',pct:100,margin:'file',hc:'file',area:'file',titles:'',skip:new Set(),...ov}:undefined; const plan=HHDoi._t.xlsPlan(m,book,o); const b=new Uint8Array(await (await HHDoi._t.xlsPdfBlob(m,plan)).arrayBuffer());
  let s=''; for(let i=0;i<b.length;i+=32768) s+=String.fromCharCode(...b.subarray(i,i+32768)); return {pages:plan.length, s:plan.map(p=>p.L.s.toFixed(3)+' '+p.L.pw.toFixed(0)+'x'+p.L.ph.toFixed(0)+' rows'+p.pg.rows.length).join(' | '), pdf:btoa(s)} }catch(e){ return {err:String(e.stack||e)} } }'''
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':800})
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type in('error','warning') and errs.append(m.text))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    for n,ov,tag in [('bao-gia-nt.xlsx',None,'file'),('bao-gia-nt.xlsx',{'fit':'p1'},'p1'),('bao-gia.xlsx',None,'bg'),('bg-copy.xls',None,'xls'),('danh-sach.csv',None,'csv')]:
      d=base64.b64encode(open(os.path.join(FX,n),'rb').read()).decode(); r=await pg.evaluate(JS,[n,d,ov])
      if 'err' in r: print(tag,'ERR',r['err'][:400]); continue
      fp=f'{OUT}/{tag}.pdf'; open(fp,'wb').write(base64.b64decode(r['pdf'])); print(tag,r['pages'],'trang',r['s'][:200])
    print('errors',errs[:5]); await ctx.close()
asyncio.run(main())
