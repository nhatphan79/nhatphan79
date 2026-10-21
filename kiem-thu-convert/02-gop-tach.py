# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, subprocess, zipfile
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS='''async ([names,datas])=>{ const fs=names.map((n,i)=>new File([Uint8Array.from(atob(datas[i]),c=>c.charCodeAt(0))],n));
 try{ const res=await HHDoi._t.gopTach(fs,undefined,()=>{}); const out=[]; for(const x of res){ const b=new Uint8Array(await x.blob.arrayBuffer()); let s=''; for(let i=0;i<b.length;i+=32768) s+=String.fromCharCode(...b.subarray(i,i+32768)); out.push([x.name,btoa(s)]); } return out; }catch(e){ return 'ERR '+e.message } }'''
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':800})
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    for case in [['tai-lieu.pdf','anh-gps.jpg','logo.png','iphone.heic','xoay.jpg'],['tai-lieu.pdf'],['dai-12-trang.pdf'],['anh-gps.jpg']]:
      datas=[base64.b64encode(open(os.path.join(FX,n),'rb').read()).decode() for n in case]
      r=await pg.evaluate(JS,[case,datas])
      if isinstance(r,str): print(case,'->',r); continue
      for name,b in r:
        fp=os.path.join(OUT,name); open(fp,'wb').write(base64.b64decode(b))
        if name.endswith('.pdf'):
          info=subprocess.run(['pdfinfo',fp],capture_output=True,text=True).stdout
          pages=[l.split()[-1] for l in info.splitlines() if l.startswith('Pages')]
          sizes=subprocess.run(['pdfinfo','-f','1','-l','99',fp],capture_output=True,text=True).stdout
          ps=[l.split(':',1)[1].strip() for l in sizes.splitlines() if l.startswith('Page') and 'size' in l]
          print(case[0] if len(case)==1 else 'GỘP','->',name,'pages',pages,ps if len(ps)<9 else '')
        else: print(case,'->',name,len(zipfile.ZipFile(fp).namelist()),'file trong zip')
    print('errors',errs); await ctx.close()
asyncio.run(main())
