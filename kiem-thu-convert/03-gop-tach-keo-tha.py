# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
import importlib.util
spec=importlib.util.spec_from_file_location('t3',os.path.join(os.path.dirname(os.path.abspath(__file__)),'t3.py'))
FX=sys.argv[1]
JS_DRAG='''async ([names,datas,types,x,y,drop])=>{ const dt=new DataTransfer(); names.forEach((n,i)=>{ const u=Uint8Array.from(atob(datas[i]),c=>c.charCodeAt(0)); dt.items.add(new File([u],n,{type:types[i]})); });
  const ev=(t)=>document.elementFromPoint(x,y).dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,dataTransfer:dt}));
  ev('dragenter'); ev('dragover'); if(drop) ev('drop'); }'''
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':1280,'height':800},accept_downloads=True); pg=await ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); dls=[]; pg.on('download',lambda d: dls.append(d.suggested_filename))
    await pg.goto('http://localhost:8765/doifile.html'); await pg.wait_for_function('window.HHDoi')
    for names,types,idx,n in [(['tai-lieu.pdf','anh-gps.jpg','logo.png'],['application/pdf','image/jpeg','image/png'],5,6),(['tai-lieu.pdf'],['application/pdf'],5,6),(['anh-gps.jpg','logo.png'],['image/jpeg','image/png'],6,8)]:
      datas=[base64.b64encode(open(os.path.join(FX,x),'rb').read()).decode() for x in names]
      a=-math.pi/2+idx*2*math.pi/n; x,y=640+math.cos(a)*137,400+math.sin(a)*137
      await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
      for _ in range(3): await pg.evaluate(JS_DRAG,[names,datas,types,640,400,False]); await pg.wait_for_timeout(100)
      for _ in range(3): await pg.evaluate(JS_DRAG,[names,datas,types,x,y,False]); await pg.wait_for_timeout(100)
      print('before', await pg.evaluate("(()=>{const h=document.querySelector('.hhd-seg.hot text'); return h&&h.textContent})()"))
      await pg.evaluate(JS_DRAG,[names,datas,types,x,y,True]); await pg.wait_for_timeout(2500)
      print('after', await pg.evaluate("(()=>{const o=document.querySelector('.hhd-ov'); const t=document.querySelector('.hhd-toast'); return [o.className,o.hidden,t&&!t.hidden&&t.textContent, document.querySelector('.hhd-tip').textContent]})()"))
    print('downloads',dls); print('errors',errs); await b.close()
asyncio.run(main())
