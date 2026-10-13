# Bàn giao HaoHao

Cập nhật: 13/10/2026 · **Bản V1.0** (số kỹ thuật 1.10.226)

## Sang tài khoản Claude khác thì làm gì
1. Trong Claude: liên kết GitHub (Settings → Connectors → GitHub), cho phép kho `nhatphan79/nhatphan79`.
2. Mở chat mới, nhắn: **"làm tiếp HaoHao, đọc BAN-GIAO.md trong kho nhatphan79"**.
3. Nếu chat đó nối được máy tính: code đang chạy nằm ở `D:\4 .Phần mềm tự viết  - Nhật\HaoHao-V1-1.9.58\HaoHao`. Không nối được: dùng thư mục `haohao-chrome/` trong kho này (luôn là bản mới nhất).

## Đang ở đâu
| Phần | Ở đâu | Ghi chú |
| --- | --- | --- |
| Code HaoHao đang chạy | máy anh: `D:\4 .Phần mềm tự viết  - Nhật\HaoHao-V1-1.9.58\HaoHao` | Chrome nạp thẳng thư mục này |
| Bản sao code | kho này: `haohao-chrome/` | đẩy lên sau MỖI lần sửa |
| Xưởng code (giả lập, sửa, tải zip) | kho này: `haohao-workbench.html` | cùng bản với `haohao-chrome/` |
| App chuyển ảnh iPhone → máy tính | máy anh: `D:\4 .Phần mềm tự viết  - Nhật\HaoHao-Transfer-Windows\HaoHao-Transfer.exe` | chạy ngầm; bản gốc `ChuyenAnh-iPhone.goc.exe` |
| Gói tải app cho khách | kho này: `downloads/HaoHao-Transfer-Windows.zip` | link nằm trong coupons.json mục `transfer` |
| Mã giảm giá / link cho máy khách | kho này: `haohao-extension/coupons.json` | máy khách tự đọc; KHÔNG xoá thư mục này |
| Máy chủ Cloudflare | `server/haohao-gia-worker.js` | key AT_KEY, RH_KEY, GEMINI_KEY anh tự dán, Claude không gõ key |

- HaoHao **tự nạp lại** khi số phiên bản trong `manifest.json` đổi (background.js kiểm tra mỗi 3–30 giây). Không cần bấm ↻, chỉ F5 trang.
- Thư mục `haohao-extension/` trên kho là dòng cũ 2.30.2, chỉ còn dùng cho `coupons.json`.

## Luật làm việc với anh
1. **Trước khi sửa: gợi ý ngắn sẽ làm gì → anh đồng ý mới làm.** Anh nói thẳng "làm X" thì làm đúng X, không bày thêm.
2. **Mỗi lần sửa xong:** tăng số phiên bản, đẩy `haohao-chrome/` + `haohao-workbench.html` + file này lên GitHub, cập nhật trang giả lập HaoHao V1.
3. **Tin nhắn anh chưa rõ: nói lại ý mình hiểu + hỏi "đúng chưa anh Nhật?" trước khi làm.**
4. Trả lời ngắn, báo ✅ / ⚠️ / ❌. Cần anh làm gì thì nói đúng 1 dòng.
5. Anh nói "dừng" là dừng hết.
6. Tự tìm file trên máy anh, không hỏi đường dẫn.
7. Chrome: Claude chỉ xem màn hình, không bấm, không mở được `chrome://extensions`. Tab Shopee do Claude mở bị trắng → anh mở tab thường, Claude chụp màn hình.
8. Shopee của anh hay hiện **giao diện tiếng Anh** → khi đọc trang luôn tính cả chữ tiếng Anh.

## Đã làm (mới nhất trước)
| Bản | Đã sửa |
| --- | --- |
| V1.0 (1.10.225) | Đặt tên hiển thị "V1.0" (version_name), số kỹ thuật vẫn tăng để HaoHao tự nạp lại |
| 1.10.226 | Trả phần đánh giá về như 1.10.223 (anh không muốn nút "Đọc đánh giá 1–2★"); giữ tên V1.0 |
| 1.10.223 | Đọc đánh giá Shopee tiếng Anh: PRODUCT RATINGS, "5 Star (…)", out of 5, With Media |
| 1.10.222 | Nút "🎟️ Tìm voucher" cùng kiểu nút "📱 Mở trên app" |
| 1.10.221 | Tab Voucher ở trang sản phẩm thêm Lịch săn mã, Top 10, Tìm mã, Ví voucher, Chợ voucher |
| 1.10.219–220 | Bỏ dòng thông số "Shopee Mall · Phản hồi…"; luôn có "📊 Đã bán X · Y lời chê" (chữ xanh lá khi ít lỗi); chưa bán → "⚠ Chưa bán được hàng nào, cẩn thận"; lời chê theo nhóm + câu trích |
| 1.10.218 | Bỏ nút "Mua trên web qua HaoHao" → nút tìm voucher |
| 1.10.216–217 | Trang không đọc được bảng giá vẫn hiện đủ 2 khung web/app, tự đọc lại 4 lần |
| 1.10.215 | Đọc Sold / Ratings / Buy Now tiếng Anh |
| 1.10.212–213 | Khung "📱 Mua trên app" giống "Mua trên web" (nút mở app → mã QR) |
| 1.10.210–211 | Top 10 mã shop: 1 hàng "Shop · Giảm … · MÃ", mã xanh lá |
| 1.10.203–209 | HaoHao Transfer quản lý trong HaoHao; app chạy ngầm; nút Bật app (haohao-transfer://); QR tab mới; báo khi chuyển xong |
| 1.10.202 | Menu Tiện ích tự chia chỗ, không đè nút |

Bỏ, không làm: gửi ảnh từ máy tính sang iPhone.

## Việc đang chờ anh duyệt
- [ ] Làm gọn khung Voucher trang sản phẩm (gộp 2 khung đầu thành 1 dòng, rút chữ giải thích, kết quả 1 dòng/mã, mỗi phần 3 mã + Xem thêm)
- [ ] Phần đọc toàn bộ đánh giá (Kiểm tra chi tiết) cho Shopee tiếng Anh
- [ ] Mở `HaoHao.rar` (anh nén 22:39 tối 12/10) so với bản hiện tại
