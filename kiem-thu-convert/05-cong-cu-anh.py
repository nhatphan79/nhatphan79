# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, math
from playwright.async_api import async_playwright
EXT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','haohao-chrome'); FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
JS_DRAG='''async ([names,datas,type,x,y,drop])=>{ const dt=new DataTransfer(); names.forEach((n,i)=>{ const u=Uint8Array.from(atob(datas[i]),c=>c.charCodeAt(0)); dt.items.add(new File([u],n,{type})); });
  const ev=(t)=>document.elementFromPoint(x,y).dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,dataTransfer:dt}));
  ev('dragenter'); ev('dragover'); if(drop) ev('drop'); }'''
cx,cy=640,400
async def drag(pg,names,type,x,y,drop=False):
  datas=[base64.b64encode(open(os.path.join(FX,n),'rb').read()).decode() for n in names]; await pg.evaluate(JS_DRAG,[names,datas,type,x,y,drop])
async def keep(pg,names,type,x,y,ms):
  for _ in range(max(1,ms//100)): await drag(pg,names,type,x,y); await pg.wait_for_timeout(100)
def seg(i,n=8,r=137):
  a=-math.pi/2+i*2*math.pi/n; return cx+math.cos(a)*r, cy+math.sin(a)*r
async def open_tool(pg,i,names,type='image/jpeg'):
  await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
  await keep(pg,names,type,cx,cy,200); await keep(pg,names,type,cx+130,cy,200); await keep(pg,names,type,cx,cy,900)
  x,y=seg(i); await keep(pg,names,type,x,y,200); await drag(pg,names,type,x,y,True); await pg.wait_for_selector('.hhd-dlg',timeout=8000); await pg.wait_for_timeout(500)
async def main():
  async with async_playwright() as p:
    ctx=await p.chromium.launch_persistent_context(OUT+'/prof',headless=True,channel='chromium',args=[f'--disable-extensions-except={EXT}',f'--load-extension={EXT}'],viewport={'width':1280,'height':800},accept_downloads=True)
    sw=ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker',timeout=15000)
    eid=sw.url.split('/')[2]; pg=await ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    dls=[]
    async def ondl(d):
      path=os.path.join(OUT,'dl-'+d.suggested_filename); await d.save_as(path); dls.append(d.suggested_filename)
    pg.on('download',lambda d: asyncio.ensure_future(ondl(d)))
    await pg.goto(f'chrome-extension://{eid}/doifile.html'); await pg.wait_for_function('window.HHDoi')
    await keep(pg,['anh-gps.jpg'],'image/jpeg',cx,cy,300); await keep(pg,['anh-gps.jpg'],'image/jpeg',cx+130,cy,200); await keep(pg,['anh-gps.jpg'],'image/jpeg',cx,cy,900)
    await pg.screenshot(path=f'{OUT}/w-tools.png',clip={'x':420,'y':180,'width':440,'height':440})
    one=['anh-gps.jpg']
    # 0 Chỉnh sửa: cắt 1:1 → thẻ Nền chọn gradient → thẻ xoay phải → lưu
    await open_tool(pg,0,one); await pg.click('.hhd-dlg-b .hhd-seg2:not(.hhd-tabs) button:has-text("1:1")'); await pg.screenshot(path=f'{OUT}/e1-crop.png')
    await pg.click('.hhd-tabs button:has-text("Nền")'); await pg.click('.hhd-sw button >> nth=2'); await pg.screenshot(path=f'{OUT}/e2-bg.png')
    await pg.click('.hhd-tabs button:has-text("Xoay")'); await pg.click('button:has-text("↻ Phải")'); await pg.wait_for_timeout(200); await pg.click('.hhd-tabs button:has-text("Cắt")'); await pg.screenshot(path=f'{OUT}/e4-crop-after-rot.png'); await pg.click('.hhd-tabs button:has-text("Xoay")'); await pg.screenshot(path=f'{OUT}/e3-adj.png'); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1200)
    # 1 Kích thước: 1080x1920 nền mờ, 2 ảnh
    two=['anh-gps.jpg','anh.webp']
    await open_tool(pg,1,two); await pg.select_option('.hhd-dlg select','1080x1920'); await pg.click('button:has-text("Nền mờ từ ảnh")'); await pg.screenshot(path=f'{OUT}/s1-size.png'); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1500)
    # 2 Xoá nền
    await open_tool(pg,2,['coffee.jpg']); await pg.locator('.hhd-dlg .hhd-btn.pri:not([disabled])').wait_for(timeout=60000); await pg.wait_for_timeout(500)
    await pg.screenshot(path=f'{OUT}/x1-xnen.png'); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(2000)
    # 3 Đóng logo: chữ, lặp chéo
    await open_tool(pg,3,one); await pg.fill('.hhd-dlg input[type=text]','HaoHao Shop 0366159790'); await pg.click('button:has-text("Lặp chéo")'); await pg.screenshot(path=f'{OUT}/l1-logo.png'); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1200)
    # logo bằng ảnh
    await open_tool(pg,3,one); await pg.click('button:has-text("Ảnh logo")')
    async with pg.expect_file_chooser() as fc: await pg.click('button:has-text("Chọn ảnh logo")')
    await (await fc.value).set_files(os.path.join(FX,'logo.png')); await pg.wait_for_timeout(800); await pg.click('button:has-text("Một chỗ")'); await pg.screenshot(path=f'{OUT}/l2-logo-anh.png'); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1000)
    # 4 Nén, 5 Che, 6 Ghi chú, 7 Thông tin ẩn
    await open_tool(pg,4,one); await pg.wait_for_timeout(500); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1000)
    await open_tool(pg,5,one); bb=await pg.locator('.hhd-dlg canvas').bounding_box(); await pg.mouse.move(bb['x']+50,bb['y']+50); await pg.mouse.down(); await pg.mouse.move(bb['x']+150,bb['y']+120,steps=4); await pg.mouse.up(); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1000)
    await open_tool(pg,6,one); bb=await pg.locator('.hhd-dlg canvas').bounding_box(); await pg.mouse.move(bb['x']+40,bb['y']+40); await pg.mouse.down(); await pg.mouse.move(bb['x']+200,bb['y']+150,steps=4); await pg.mouse.up(); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1000)
    await open_tool(pg,7,one); await pg.click('.hhd-btn.pri'); await pg.wait_for_timeout(1000)
    print('downloads',dls); print('errors',errs[:6]); await ctx.close()
asyncio.run(main())
