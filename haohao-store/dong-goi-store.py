# Đóng gói bản Chrome Web Store: haohao-chrome/ -> haohao-store/HaoHao-Store.zip
#  - KHÔNG làm rối mã (Store cấm mã bị làm rối), file nằm ngay gốc zip (Store yêu cầu manifest.json ở gốc)
#  - bật HT.STORE = true (common.js): xem kiểm tra không gắn link tiếp thị, lấy mã chỉ gắn link khi có mã thật,
#    báo link tiếp thị trong giao diện, không khoá Tiện ích, không tự cập nhật, không có ô khoá soi sản phẩm của chủ app
#  - manifest: tên 'HaoHao – Trợ lý cá nhân', bỏ quyền geolocation, bỏ cổng app HaoHao 3D (127.0.0.1:47321) chưa phát hành
#  - V1.87: mỗi lần chạy cất thêm haohao-store/da-nop/HaoHao-Store-<version_name>.zip (bản đã nộp, không ghi đè)
#  Chạy: python3 haohao-store/dong-goi-store.py   (từ gốc kho)
import json, os, zipfile, re
here = os.path.dirname(os.path.abspath(__file__)); src = os.path.join(os.path.dirname(here), 'haohao-chrome')
out = os.path.join(here, 'HaoHao-Store.zip')
NO_SITE = {'site.js', 'site.css', 'khtc.html', 'khtc.js', 'khtc-boot.js', 'khtc.css', 'cover.html', 'cover.js', 'cover.css', 'cover-logo.js'}   # 08/11: anh Nhật – tab Công trình KHÔNG gửi lên Store (sitebot.js giữ: còn lo đồng bộ Todo / Dự án)
SKIP_DIRS = {'server-cloudflare', '.git', 'node_modules', '_metadata', 'khtc', 'khtc-mau'}   # V1.8.0: Quản lý chi phí (lib/khtc, khtc-mau) cũng là phần riêng   # V1.2.2: _metadata do Chrome tự sinh, Store không nhận
n = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for r, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in sorted(files):
            if '.bak' in f or f.endswith('.md'): continue
            if r == src and f in NO_SITE: continue   # 08/11: KHÔNG gửi tab 🏗️ Công trình (phần riêng của anh Nhật)
            p = os.path.join(r, f); rel = os.path.relpath(p, src).replace(os.sep, '/')
            data = open(p, 'rb').read()
            if rel == 'common.js':
                t = data.decode('utf-8'); assert 'HT.STORE = true;' in t or 'HT.STORE = false;' in t; data = t.replace('HT.STORE = false;', 'HT.STORE = true;', 1).encode('utf-8')   # V1.78: mã chính đã là bản Store
            elif rel == 'newtab.html':   # 08/11: bỏ tab Công trình khỏi Tab mới
                t = data.decode('utf-8')
                for x in ['<link rel="stylesheet" href="site.css">\n', '  <script src="site.js"></script>\n',
                          '<button type="button" class="pgsw-o" role="tab" data-pg="2" aria-selected="false" title="Điều hành công trình – SITE BRAIN">🏗️ Công trình</button>',
                          '  <section class="sbx" id="site" hidden aria-label="Điều hành công trình"></section>\n']:
                    assert x in t, 'newtab.html đổi rồi – sửa lại dong-goi-store.py: ' + x[:40]; t = t.replace(x, '', 1)
                data = t.encode('utf-8')
            elif rel == 'newtab.js':
                t = data.decode('utf-8'); x = 'set(n0 > 2 ? 0 : n0);'; assert x in t; data = t.replace(x, 'set(n0 > 1 ? 0 : n0);', 1).encode('utf-8')
            elif rel == 'manifest.json':
                m = json.loads(data.decode('utf-8'))
                # V1.2.1: dùng đúng tên trong manifest (tên mới tối ưu tìm kiếm), không ép tên cũ nữa
                m['permissions'] = [x for x in m['permissions'] if x != 'geolocation']
                m['host_permissions'] = [x for x in m['host_permissions'] if '127.0.0.1:47321' not in x]
                data = (json.dumps(m, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
            z.writestr(rel, data); n += 1
print(n, 'file ->', out, os.path.getsize(out), 'byte')
# V1.87: cất thêm 1 bản theo tên phiên bản vào haohao-store/da-nop/ (không bao giờ ghi đè bản đã có)
import shutil
vn = json.loads(open(os.path.join(src, 'manifest.json'), encoding='utf-8').read()).get('version_name', 'V1.x')
keep = os.path.join(here, 'da-nop', f'HaoHao-Store-{vn}.zip'); os.makedirs(os.path.dirname(keep), exist_ok=True)
if os.path.exists(keep): print('⚠️ đã có', keep, '– không ghi đè (đổi version_name trước khi nộp bản mới)')
else: shutil.copy2(out, keep); print('đã cất bản lưu ->', keep)
