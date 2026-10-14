# Đóng gói bản phát hành cho khách: HaoHao/ -> _release/HaoHao-V1.zip
#  - bỏ server-cloudflare, file .bak
#  - V1.8: file .js được NÉN + LÀM RỐI (esbuild --minify) trong gói; thư mục HaoHao gốc của anh giữ nguyên để đọc/sửa
#  - nén xong tự KÝ (ky.js) cho app Transfer kiểm tra
import zipfile, os, subprocess
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
src = os.path.join(root, 'HaoHao'); out = os.path.join(here, 'HaoHao-V1.zip'); E = os.path.join(here, 'tools', 'esbuild')
BANNER = '// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu. Không sao chép, chỉnh sửa khi chưa được phép.'
n = m = 0; b0 = b1 = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for r, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in ('server-cloudflare', '.git', 'node_modules')]
        for f in files:
            if '.bak.' in f: continue
            p = os.path.join(r, f); rel = os.path.join('HaoHao-V1', os.path.relpath(p, src)); n += 1   # V1.11: mọi file nằm trong thư mục HaoHao-V1/ của gói zip
            if f.endswith('.js'):
                data = open(p, 'rb').read()
                res = subprocess.run([E, '--minify', '--charset=utf8', '--target=chrome110', '--loader=js', '--banner=' + BANNER], input=data, capture_output=True)
                if res.returncode != 0: raise SystemExit('Lỗi nén ' + rel + ': ' + res.stderr.decode()[:300])
                z.writestr(rel, res.stdout); m += 1; b0 += len(data); b1 += len(res.stdout)
            else:
                z.write(p, rel)
print(n, 'file,', m, 'file js đã nén', b0, '->', b1, '·', os.path.getsize(out), 'byte')
subprocess.run(['node', os.path.join(here, 'ky.js')], check=True)
