#!/bin/bash
# Chạy toàn bộ bài thử HaoHao Convert (HaoHao V1). Cần: python3 + playwright (Chromium). Xem README.md.
cd "$(dirname "$0")" || exit 1
OUT="${1:-/tmp/haohao-kiem-thu}"; rm -rf "$OUT"; mkdir -p "$OUT"
python3 -m http.server 8765 --directory ../haohao-chrome >/dev/null 2>&1 & SV=$!; trap 'kill $SV 2>/dev/null' EXIT; sleep 1
loc() { grep -v "agent-proxy\|connect_rejected\|Allowed domains\|For details\|and [0-9] more"; }
chay() { echo; echo "═══ $1"; shift; python3 "$@" 2>&1 | loc; }
chay "01 Đổi định dạng (mong đợi: 24 dòng OK, không FAIL)"        01-doi-dinh-dang.py mau "$OUT/01"
chay "02 Gộp / Tách gọi thẳng (PDF 7 trang, tách 3 file, 12 trang → zip)" 02-gop-tach.py mau "$OUT/02"
chay "03 Gộp / Tách bằng kéo thả (5 file tải về, errors [])"     03-gop-tach-keo-tha.py mau
chay "04 Excel (12 dòng; 1 lỗi 'chỉ có 1 sheet' là đúng)"         04-excel.py mau "$OUT/04"
chay "05 8 công cụ ảnh (10 file tải về, errors [])"               05-cong-cu-anh.py mau "$OUT/05"
chay "06 Excel → PDF giống Excel in"                               06-excel-ra-pdf.py mau "$OUT/06"
chay "07 Hộp Xuất PDF từ Excel (1 file, Vừa gọn 1 trang)"          07-hop-xuat-pdf-excel.py mau "$OUT/07"
chay "08 PDF → Word 2 kiểu"                                        08-pdf-ra-word.py mau "$OUT/08" hop-dong.pdf,hop-dong-chrome.pdf,bao-gia-in.pdf
chay "09 Hộp PDF → Word (1 file .docx tải về)"                     09-hop-pdf-ra-word.py mau "$OUT/09"
chay "10 Scan: tìm góc + bộ lọc"                                   10-scan-bo-loc.py mau "$OUT/10" chup-the.jpg,chup-hop-dong.jpg
chay "11 Scan từ vòng tròn (dialog: Scan giấy tờ)"                 11-scan-tu-vong-tron.py mau "$OUT/11"
chay "12 Bấm HaoHao Convert trong Tiện ích (mở doifile.html)"      12-mo-convert-tu-tien-ich.py "$OUT/12"
chay "13 Sức khoẻ tiện ích (không có lỗi JS)"                      13-suc-khoe-tien-ich.py "$OUT/13"
echo; echo "Xong. File kết quả: $OUT"
