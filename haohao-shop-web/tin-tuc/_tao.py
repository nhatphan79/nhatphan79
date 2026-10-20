# Tạo trang Tin tức (HTML thật cho Google) từ bai.json · chạy: python3 haohao-shop-web/tin-tuc/_tao.py
# Thêm bài: thêm 1 mục vào bai.json (slug, niche, title, desc, date dd/mm/yyyy, read, blocks) rồi chạy lại, đẩy GitHub. Không cần Deploy.
import json, os, html
D = os.path.dirname(os.path.abspath(__file__)); W = os.path.dirname(D)
BASE = 'https://haohao-gia.nhatphan79.workers.dev'
A = json.load(open(os.path.join(D, 'bai.json'), encoding='utf-8'))
e = lambda s: html.escape(str(s), quote=True)
NI = {'Thời trang': ('#FFF0DC', '#E8962E', 'thoi-trang'), 'Mẹ & Bé': ('#FFE6E2', '#F28C82', 'me-be'), 'Nhà cửa & Gia dụng': ('#FFF4D6', '#E0A31E', 'gia-dung'), 'Xây dựng': ('#FFEBD1', '#E8760C', 'xay-dung'), 'Quà tặng': ('#FFE1D2', '#E5653A', 'qua-tang')}
SH = {'thoi-trang': 'M40 8 H60 L63 22 L57 30 L78 86 H22 L43 30 L37 22 Z', 'me-be': 'M42 6 H58 V16 L66 28 V82 A6 6 0 0 1 60 88 H40 A6 6 0 0 1 34 82 V28 L42 16 Z', 'gia-dung': 'M18 40 H82 V70 A14 14 0 0 1 68 84 H32 A14 14 0 0 1 18 70 Z M10 38 H90 V46 H10 Z M42 28 H58 V36 H42 Z', 'xay-dung': 'M14 66 A36 36 0 0 1 86 66 Z M8 66 H92 V76 H8 Z M44 26 H56 V44 H44 Z', 'qua-tang': 'M18 42 H82 V86 H18 Z M12 28 H88 V42 H12 Z M46 28 H54 V86 H46 Z M50 28 C40 10 26 14 34 26 Z M50 28 C60 10 74 14 66 26 Z'}
def art(n, w='34%'):
    bg, ink, nid = NI[n]; return '<span class="art" style="background:%s"><svg viewBox="0 0 100 94" width="%s" aria-hidden="true"><path d="%s" fill="%s"/></svg></span>' % (bg, w, SH[nid], ink)
def iso(d): dd, mm, yy = d.split('/'); return '%s-%s-%s' % (yy, mm, dd)
CSS = """*{box-sizing:border-box}body{margin:0;font-family:'Be Vietnam Pro',system-ui,sans-serif;color:#1E1A17;background:#fff}a{color:#D9480F}
.wrap{max-width:1280px;margin:0 auto;padding:0 24px}.topbar{background:#1E1A17;color:#fff;font-size:13px}.topbar .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 20px;padding-block:9px}.topbar b{color:#F59A5C}.topbar a{color:#fff;text-decoration:none}
header{border-bottom:1px solid #EEE6DF}header .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:8px 28px;min-height:72px}.logo{display:flex;align-items:center;gap:8px;font-size:24px;font-weight:900;text-decoration:none;color:#1E1A17}.logo em{font-style:normal;color:#D9480F}
nav.m{display:flex;flex-wrap:wrap;align-items:center}nav.m a{display:flex;align-items:center;gap:6px;height:72px;padding:0 12px;font-size:15px;font-weight:500;text-decoration:none;color:#1E1A17}nav.m a.on{box-shadow:inset 0 -3px 0 #D9480F}nav.m a.sale{color:#D9480F}nav.m a.hh{color:#E8760C;font-weight:800}
.art{display:flex;align-items:center;justify-content:center;border-radius:14px}.crumb{font-size:13px;color:#6B5D53}.crumb a{color:inherit;text-decoration:none}
.hero{background:#FBF6F2;border-bottom:1px solid #EEE6DF}.hero .wrap{padding-block:36px 40px;display:flex;flex-direction:column;gap:14px}h1{margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:700;letter-spacing:-.5px}.hero h1{font-size:clamp(36px,6vw,60px);line-height:1.05}h1 i{font-weight:600;color:#D9480F}.lead{margin:0;font-size:17px;line-height:1.6;max-width:640px;color:#5A4E46}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips button{height:40px;padding:0 16px;border-radius:20px;border:1.5px solid #1E1A17;background:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}.chips button[aria-pressed=true]{background:#1E1A17;color:#fff}
.grid{margin-top:40px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:36px 24px}.card{display:flex;flex-direction:column;gap:10px;text-decoration:none;color:#1E1A17}.card .art{height:190px}.k{font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#D9480F}.card h2{margin:0;font-size:19px;line-height:1.35}.card p{margin:0;font-size:14px;line-height:1.6;color:#5A4E46}.meta{font-size:13px;color:#6B5D53}
.post{display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start;margin-top:32px}.post article{flex:999 1 620px;min-width:0;max-width:780px}.post h1{margin-top:16px;font-size:clamp(30px,4.5vw,44px);line-height:1.15}.post .art{margin-top:24px;height:300px;border-radius:18px}.aff{margin:24px 0 0;padding:14px 18px;border-radius:12px;background:#FFF7F0;font-size:14px;line-height:1.6;color:#5A4E46}
.body{font-size:17px;line-height:1.75;color:#2E2723}.body h2{margin:32px 0 0;font-size:24px;line-height:1.3}.body p,.body ul{margin:14px 0 0}.body ul{padding-left:22px}.body li{margin-top:8px}
.sp{margin-top:44px;padding:24px;border-radius:18px;border:1px solid #EEE6DF}.sp h2{margin:0;font-size:20px}.sp .row{margin-top:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}.sp a{display:flex;flex-direction:column;gap:8px;text-decoration:none;color:#1E1A17;font-size:14px;font-weight:600;line-height:1.4}.sp img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;background:#F2F0EE}.sp b{color:#D9480F;font-size:16px}
aside{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:18px}aside h2{margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px}aside a{display:flex;gap:14px;text-decoration:none;color:#1E1A17}aside .art{flex:0 0 84px;height:84px;border-radius:12px}aside b{font-size:15px;line-height:1.35}
footer{margin-top:72px;background:#1E1A17;color:#D8CCC2;font-size:14px}footer .wrap{display:flex;flex-wrap:wrap;gap:24px 48px;padding-block:40px}footer .c{flex:0 1 200px;display:flex;flex-direction:column;gap:10px}footer .f2{flex:1 1 560px;display:flex;flex-wrap:wrap;gap:20px 40px}footer .f2>div{flex:1 1 240px;display:flex;flex-direction:column;gap:10px}footer p{margin:0;line-height:1.7}footer a{color:#D8CCC2;text-decoration:none}footer b{color:#fff}
.ft-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}.ft-h b{font-size:16px;line-height:1.4}a.ft-go{height:32px;padding:0 14px;border-radius:16px;background:#E8760C;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;white-space:nowrap}.copy{border-top:1px solid #3A302A;font-size:12px;color:#A8998D;padding-block:16px 28px!important}
@media(max-width:700px){nav.m a{height:44px;font-size:14px}}"""
NAV = [('/tin-tuc/', 'TIN TỨC', 'tin'), ('/shop/#sale', 'SALE', 'sale'), ('/shop/#thoi-trang', 'THỜI TRANG', ''), ('/shop/#me-be', 'MẸ &amp; BÉ', ''), ('/shop/#gia-dung', 'NHÀ CỬA &amp; GIA DỤNG', ''), ('/shop/#xay-dung', 'XÂY DỰNG', ''), ('/shop/#qua-tang', 'QUÀ TẶNG', '')]
def page(title, desc, url, body, ld, og='website'):
    nav = ''.join('<a href="%s"%s>%s</a>' % (h, ' class="on" aria-current="page"' if k == 'tin' else (' class="sale"' if k == 'sale' else ''), l) for h, l, k in NAV)
    nav += '<a class="hh" href="https://haohao.ai.studio/" target="_blank" rel="noopener"><img src="/shop/logo.webp" alt="" width="24" height="25">HAOHAO</a>'
    return f"""<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><link rel="canonical" href="{url}">
<meta property="og:type" content="{og}"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{BASE}/shop/logo.webp"><meta property="og:locale" content="vi_VN">
<link rel="icon" href="/shop/logo.webp"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&amp;family=Playfair+Display:ital,wght@0,700;1,600&amp;display=swap" rel="stylesheet">
<style>{CSS}</style><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script></head><body>
<div class="topbar"><div class="wrap"><span><b>Cẩm nang mua sắm</b> · chọn kỹ trước khi mua</span><a href="tel:+84366159790">Hotline +84 366.159.790</a></div></div>
<header><div class="wrap"><a class="logo" href="/shop/"><img src="/shop/logo.webp" alt="" width="36" height="38"><span><em>Hao</em>Hao</span></a><nav class="m" aria-label="Danh mục chính">{nav}</nav></div></header>
{body}
<footer><div class="wrap"><div class="f2"><div><a class="logo" href="/shop/" style="color:#fff"><img src="/shop/logo.webp" alt="" width="40" height="42"><span><em style="color:#F59A5C">Hao</em>Hao</span></a><p>HaoHao dùng link tiếp thị liên kết (Affiliate): bạn mua qua link, HaoHao nhận hoa hồng nhỏ, bạn không trả thêm.</p></div>
<div><div class="ft-h"><b>Tiện ích HaoHao cho Chrome: trợ lý cá nhân của bạn</b><a class="ft-go" href="https://haohao.ai.studio/" target="_blank" rel="noopener">Tải HaoHao miễn phí</a></div><p>Nhắc việc đúng giờ, ghi chú nhanh, Pomodoro ngay trên Tab mới. So giá Shopee, xem lịch sử giá 30 ngày, báo khi giảm giá thật. Kèm chặn quảng cáo.</p></div></div>
<div class="c"><b>5 NGÁCH</b><a href="/shop/#thoi-trang">Thời trang</a><a href="/shop/#me-be">Mẹ &amp; Bé</a><a href="/shop/#gia-dung">Nhà cửa &amp; Gia dụng</a><a href="/shop/#xay-dung">Xây dựng</a><a href="/shop/#qua-tang">Quà tặng</a></div>
<div class="c"><b>KẾT NỐI</b><a href="https://www.tiktok.com/@haohaomall" target="_blank" rel="noopener">TikTok @haohaomall</a><a href="https://www.facebook.com/trolyHaoHao" target="_blank" rel="noopener">Fanpage trolyHaoHao</a><a href="https://zalo.me/84366159790" target="_blank" rel="noopener">Zalo 0366.159.790</a></div></div>
<div class="wrap copy">© 2026 HaoHao Official</div></footer>
</body></html>
"""
A.sort(key=lambda a: iso(a['date']), reverse=True)
# danh sách
cards = ''.join(f'<a class="card" href="/tin-tuc/{a["slug"]}" data-n="{e(a["niche"])}">{art(a["niche"])}<span class="k">{e(a["niche"])}</span><h2>{e(a["title"])}</h2><p>{e(a["desc"])}</p><span class="meta">{e(a["date"])} · {e(a["read"])}</span></a>' for a in A)
chips = ''.join(f'<button type="button" aria-pressed="{"true" if i == 0 else "false"}">{e(x)}</button>' for i, x in enumerate(['Tất cả'] + list(NI)))
lst = f"""<section class="hero"><div class="wrap"><nav class="crumb" aria-label="Đường dẫn"><a href="/shop/">Trang chủ</a> / <b>Tin tức</b></nav><h1>Cẩm nang <i>mua sắm</i></h1><p class="lead">Kinh nghiệm chọn đồ thật, viết từ việc mua và dùng hằng ngày. Đọc trước khi mua để chọn đúng món, đúng giá.</p><div class="chips" role="group" aria-label="Lọc theo ngách">{chips}</div></div></section>
<main class="wrap"><div class="grid" id="g">{cards}</div></main>
<script>document.querySelector('.chips').addEventListener('click',function(e){{var b=e.target.closest('button');if(!b)return;var v=b.textContent;this.querySelectorAll('button').forEach(function(x){{x.setAttribute('aria-pressed',x===b?'true':'false');}});document.querySelectorAll('#g .card').forEach(function(c){{c.hidden=!(v==='Tất cả'||c.dataset.n===v);}});}});</script>"""
ld = {'@context': 'https://schema.org', '@type': 'Blog', 'name': 'Cẩm nang mua sắm HaoHao', 'url': BASE + '/tin-tuc/', 'blogPost': [{'@type': 'BlogPosting', 'headline': a['title'], 'url': BASE + '/tin-tuc/' + a['slug'], 'datePublished': iso(a['date'])} for a in A]}
open(os.path.join(D, 'index.html'), 'w', encoding='utf-8').write(page('Cẩm nang mua sắm – Tin tức HaoHao', 'Kinh nghiệm chọn đồ thời trang, mẹ & bé, gia dụng, xây dựng, quà tặng: đọc trước khi mua để chọn đúng món, đúng giá.', BASE + '/tin-tuc/', lst, ld))
for a in A:
    b = ''
    for x in a['blocks']:
        if 'h' in x: b += '<h2>%s</h2>' % e(x['h'])
        elif 'p' in x: b += '<p>%s</p>' % e(x['p'])
        elif 'list' in x: b += '<ul>%s</ul>' % ''.join('<li>%s</li>' % e(t) for t in x['list'])
    nid = NI[a['niche']][2]
    oth = ''.join(f'<a href="/tin-tuc/{o["slug"]}">{art(o["niche"], "50%")}<span><span class="k">{e(o["niche"])}</span><br><b>{e(o["title"])}</b></span></a>' for o in A if o is not a)
    body = f"""<main class="wrap"><div class="post"><article><nav class="crumb" aria-label="Đường dẫn"><a href="/shop/">Trang chủ</a> / <a href="/tin-tuc/">Tin tức</a> / <b>{e(a['niche'])}</b></nav>
<h1>{e(a['title'])}</h1><p class="meta" style="margin:14px 0 0">HaoHao · <time datetime="{iso(a['date'])}">{e(a['date'])}</time> · {e(a['read'])}</p>{art(a['niche'], '26%')}
<p class="aff">Bài viết có link giới thiệu sản phẩm (Affiliate). Bạn mua qua link, HaoHao có thể nhận hoa hồng nhỏ, bạn không trả thêm gì.</p><div class="body">{b}</div>
<section class="sp" id="sp" hidden><h2>Sản phẩm HaoHao gợi ý</h2><div class="row" id="spr"></div></section></article>
<aside aria-label="Bài khác"><h2>Bài khác</h2>{oth}</aside></div></main>
<script>fetch('/store').then(function(r){{return r.json();}}).then(function(d){{var l=(d.items||[]).filter(function(x){{return x.niche==='{nid}'&&!x.soldOut&&x.price>0&&x.img;}}).sort(function(a,b){{return (b.sold||0)-(a.sold||0);}}).slice(0,4);if(!l.length)return;var E=function(s){{return String(s).replace(/[&<>"]/g,function(c){{return{{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[c];}});}};document.getElementById('spr').innerHTML=l.map(function(x){{return '<a href="/shop/#sp/'+E(x.id)+'"><img src="'+E(x.img)+'" alt="" loading="lazy">'+E(x.n.slice(0,70))+'<b>'+x.price.toLocaleString('vi-VN')+'đ</b></a>';}}).join('');document.getElementById('sp').hidden=false;}}).catch(function(){{}});</script>"""
    ld = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': a['title'], 'description': a['desc'], 'datePublished': iso(a['date']), 'inLanguage': 'vi', 'author': {'@type': 'Organization', 'name': 'HaoHao'}, 'publisher': {'@type': 'Organization', 'name': 'HaoHao', 'logo': {'@type': 'ImageObject', 'url': BASE + '/shop/logo.webp'}}, 'mainEntityOfPage': BASE + '/tin-tuc/' + a['slug']}
    open(os.path.join(D, a['slug'] + '.html'), 'w', encoding='utf-8').write(page(a['title'] + ' – HaoHao', a['desc'], BASE + '/tin-tuc/' + a['slug'], body, ld, 'article'))
urls = [(BASE + '/shop/', None), (BASE + '/tin-tuc/', iso(A[0]['date']))] + [(BASE + '/tin-tuc/' + a['slug'], iso(a['date'])) for a in A]
open(os.path.join(W, 'sitemap.xml'), 'w', encoding='utf-8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join('  <url><loc>%s</loc>%s</url>\n' % (u, '<lastmod>%s</lastmod>' % d if d else '') for u, d in urls) + '</urlset>\n')
open(os.path.join(W, 'robots.txt'), 'w', encoding='utf-8').write('User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n' % BASE)
print('ok', len(A), 'bài')
