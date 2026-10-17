# Đóng gói bản Chrome Web Store: haohao-chrome/ -> haohao-store/HaoHao-Store.zip
#  - KHÔNG làm rối mã (Store cấm mã bị làm rối), file nằm ngay gốc zip (Store yêu cầu manifest.json ở gốc)
#  - bật HT.STORE = true (common.js): xem kiểm tra không gắn link tiếp thị, lấy mã chỉ gắn link khi có mã thật,
#    báo link tiếp thị trong giao diện, không khoá Tiện ích, không tự cập nhật, không có ô khoá soi sản phẩm của chủ app
#  - manifest: bỏ quyền geolocation, bỏ cổng app HaoHao 3D (127.0.0.1:47321) chưa phát hành
#  Chạy: python3 haohao-store/dong-goi-store.py   (từ gốc kho)
import json, os, zipfile, re
here = os.path.dirname(os.path.abspath(__file__)); src = os.path.join(os.path.dirname(here), 'haohao-chrome')
out = os.path.join(here, 'HaoHao-Store.zip')
SKIP_DIRS = {'server-cloudflare', '.git', 'node_modules'}
n = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for r, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in sorted(files):
            if '.bak' in f or f.endswith('.md'): continue
            p = os.path.join(r, f); rel = os.path.relpath(p, src).replace(os.sep, '/')
            data = open(p, 'rb').read()
            if rel == 'common.js':
                t = data.decode('utf-8'); assert 'HT.STORE = false;' in t; data = t.replace('HT.STORE = false;', 'HT.STORE = true;', 1).encode('utf-8')
            elif rel == 'manifest.json':
                m = json.loads(data.decode('utf-8'))
                m['permissions'] = [x for x in m['permissions'] if x != 'geolocation']
                m['host_permissions'] = [x for x in m['host_permissions'] if '127.0.0.1:47321' not in x]
                data = (json.dumps(m, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
            z.writestr(rel, data); n += 1
print(n, 'file ->', out, os.path.getsize(out), 'byte')
