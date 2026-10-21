# Bài thử tự động HaoHao Convert – xem README.md
import asyncio, os, base64, os, sys, json
from playwright.async_api import async_playwright
FX=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
CASES=[('anh-gps.jpg',['JPG','PNG','WEBP','PDF','DOCX','TIFF']),('logo.png',['JPG','WEBP']),('iphone.heic',['JPG','PNG']),('anh.tif',['PNG']),('anh.webp',['JPG']),('anh.bmp',['PNG']),('anh.gif',['PNG']),
 ('tai-lieu.pdf',['JPG','PNG','TXT','DOCX']),('van-ban.docx',['TXT','PDF','PNG']),('ghi-chu.txt',['PDF','DOCX','JPG'])]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await b.new_page()
    logs=[]; pg.on('console',lambda m: logs.append(m.type+': '+m.text)); pg.on('pageerror',lambda e: logs.append('PAGEERR '+str(e)))
    await pg.goto('http://localhost:8765/doifile.html'); await pg.wait_for_function('window.HHDoi')
    for fn,tos in CASES:
      data=base64.b64encode(open(os.path.join(FX,fn),'rb').read()).decode()
      for to in tos:
        r=await pg.evaluate('''async ([fn,data,to])=>{ const u=Uint8Array.from(atob(data),c=>c.charCodeAt(0)); const f=new File([u],fn);
          try{ const t0=performance.now(); const res=await HHDoi.convert([f],to,()=>{}); const out=[]; for(const x of res){ const b=new Uint8Array(await x.blob.arrayBuffer()); let s=''; for(let i=0;i<b.length;i+=32768) s+=String.fromCharCode(...b.subarray(i,i+32768)); out.push([x.name,btoa(s),x.blob.type]); } return {ok:true,out,ms:Math.round(performance.now()-t0)}; }catch(e){ return {ok:false,err:String(e&&e.stack||e)} } }''',[fn,data,to])
        if not r['ok']: print('FAIL',fn,to,r['err'][:300]); continue
        for name,b64,typ in r['out']:
          open(os.path.join(OUT,f'{fn}__{to}__{name}'),'wb').write(base64.b64decode(b64))
        print('OK',fn,'->',to,[x[0] for x in r['out']],r['ms'],'ms')
    print('\n'.join(l for l in logs if 'error' in l.lower() or 'ERR' in l)[:2000])
    await b.close()
asyncio.run(main())
