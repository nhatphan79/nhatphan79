# V2.0.0: đóng gói bản RIÊNG của anh Nhật (đủ Công trình / Quản lý chi phí / Cover) cho kênh tự cập nhật downloads/nhat/
#  Chạy: python3 haohao-store/dong-goi-nhat.py  → downloads/nhat/HaoHao-nhat.zip (thư mục HaoHao/ bên trong)
#  Sau đó KÝ trên máy bàn bằng khoá _release/khoa-ky/rieng.pem (ed25519, khoá không rời máy, không lên GitHub):
#     openssl pkeyutl -sign -inkey rieng.pem -rawin -in HaoHao-nhat.zip | base64 -w0
#  rồi ghi downloads/nhat/haohao-latest.json: {"name","version","file":"HaoHao-nhat.zip","sig","notes"}
import os, zipfile, json
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here); src = os.path.join(root, 'haohao-chrome')
out_dir = os.path.join(root, 'downloads', 'nhat'); os.makedirs(out_dir, exist_ok=True); out = os.path.join(out_dir, 'HaoHao-nhat.zip')
SKIP = {'_metadata', 'server-cloudflare', '.git', 'node_modules'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for r, ds, fs in os.walk(src):
        ds[:] = sorted(d for d in ds if d not in SKIP)
        for f in sorted(fs):
            if '.bak' in f: continue
            p = os.path.join(r, f); rel = os.path.relpath(p, src).replace(os.sep, '/')
            zi = zipfile.ZipInfo('HaoHao/' + rel, (2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16
            z.writestr(zi, open(p, 'rb').read())
m = json.load(open(os.path.join(src, 'manifest.json'), encoding='utf-8'))
print(out, os.path.getsize(out), m['version_name'], m['version'])
