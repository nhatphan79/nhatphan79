# Bài thử tự động – HaoHao Convert (HaoHao V1)

Nằm **ngoài** `haohao-chrome/` nên không bị đóng gói cho khách. Tạo ngày 21/10/2026 (V1.99).

## Chạy
```bash
pip install playwright && playwright install chromium   # máy Claude đã có sẵn
bash kiem-thu-convert/chay-tat-ca.sh                      # kết quả vào /tmp/haohao-kiem-thu
```
Các bài nạp **tiện ích thật** (`--load-extension=haohao-chrome`) vào Chromium chạy ngầm; 01 và 03 dùng máy chủ tạm `localhost:8765`.

## Có gì
| Bài | Thử |
|---|---|
| 01 | 24 kiểu đổi định dạng (ảnh, HEIC, TIFF, PDF, Word, TXT) |
| 02, 03 | Gộp PDF (ảnh + PDF), tách trang, tách 12 trang → zip; kéo thả vào ô Gộp/Tách |
| 04 | Excel: PDF, ảnh, CSV, XLSX, Gộp Excel, Tách sheet, gộp lẫn PDF |
| 05 | Vòng Công cụ 8 ô: Chỉnh sửa (3 thẻ), Kích thước, Xoá nền AI, Đóng logo (chữ + ảnh), Nén, Che, Ghi chú, Thông tin ẩn |
| 06, 07 | Excel → PDF giống Excel in; hộp chỉnh trước khi xuất |
| 08, 09 | PDF → Word (Dễ sửa / Giữ nguyên bố cục); hộp chọn kiểu |
| 10, 11 | Scan: tìm 4 góc, làm phẳng, bộ lọc; mở từ ô Scan |
| 12 | Bấm HaoHao Convert trong Tiện ích mở được trang |
| 13 | Sức khoẻ: Tab mới, Convert, Cài đặt, trang web thường – không lỗi JS |

## File mẫu (`mau/`)
Toàn file tự tạo hoặc ảnh mẫu công khai (scikit-image), **không có giấy tờ thật**. `bao-gia-in.pdf` là PDF LibreOffice dùng 2 phông ghép (pdf.js đọc sai vài chữ – giới hạn đã biết).

Sửa HaoHao Convert xong → chạy lại toàn bộ trước khi đẩy lên.
