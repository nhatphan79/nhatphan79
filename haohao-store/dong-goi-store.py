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
                t = data.decode('utf-8'); assert 'HT.STORE = true;' in t or 'HT.STORE = false;' in t; data = t.replace('HT.STORE = false;', 'HT.STORE = true;', 1).encode('utf-8')   # V1.78: mã chính đã là bản Store
            elif rel == 'manifest.json':
                m = json.loads(data.decode('utf-8'))
                m['name'] = 'HaoHao – Trợ lý cá nhân'   # V1.76: khớp tên trên trang Store
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
