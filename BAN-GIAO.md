# Bàn giao HaoHao

Cập nhật: 13/10/2026 · **Bản V1.0** (số kỹ thuật 1.10.255)

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

## Hướng giảm giá (anh Nhật chốt 13/10)
- Giá web Shopee đã tự tối ưu mã shop + Shopee Voucher → HaoHao KHÔNG tìm/tính lại.
- App rẻ hơn nhờ ưu tiên mã vận chuyển (+ mã app hằng ngày). Mỗi đơn chỉ 1 mã vận chuyển.
- Săn voucher chỉ vào ngày sale đặc biệt. Nguồn mã: anh cập nhật tay (coupons.json) + mã cộng đồng (Chợ voucher).

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
| 1.10.255 | Mô tả app trong Tiện ích: Thị trường "Bật theo dõi giá vàng, chứng khoán, crypto"; Chặn quảng cáo "Ẩn quảng cáo phim, kể cả YouTube"; Transfer "iPhone hết dung lượng, chuyển ảnh, video lên PC"; chữ mô tả nhỏ lại (11px) |
| 1.10.254 | "Thay đổi giao diện tuỳ chọn": Ô 1 và Ô 2 nằm chung 1 hàng |
| 1.10.253 | Cài đặt Tiện ích: "📌 2 ô tuỳ chọn trên mục chính" đổi tên "📌 Thay đổi giao diện tuỳ chọn", mỗi ô là danh sách thả xuống chọn đủ app: Pomodoro, Thông tin, Thị trường, Chặn quảng cáo, HaoHao Transfer (2 app mới thành nhánh/tab riêng khi được chọn, vẫn cần mở khoá như Thị trường) |
| 1.10.252 | Tab ❤️ Đã lưu gọn 1 kiểu: 2 phần "❤️ Món đã lưu" và "⭐ Shop theo dõi" bấm Ẩn/Hiện được. Shop là thẻ giống món (🏪 tên · "N mã · tốt nhất …" · nút Mở shop · ⋯ bỏ theo dõi), hiện 2 mã, còn lại "Xem thêm". Bấm mã = chép mã + mở shop qua link HaoHao (link tiếp thị) |
| 1.10.251 | Tab ❤️ Đã lưu có khung "⭐ Theo dõi shop": dán link shop/sản phẩm Shopee hoặc bấm ⭐ Theo dõi ở trang shop/sản phẩm. Mã của shop lấy từ kho Ưu đãi máy chủ (/hot?q=tên shop, 1 giờ/lần) – có mã mới thì báo; mở trang shop/sản phẩm của shop đó thì đọc thêm "Mã giảm giá của shop" (lưu 7 ngày). Tối đa 30 shop |
| 1.10.250 | Soi sản phẩm mặc định cho mọi khách: ô 🔎 Tìm gọi máy chủ `/search` (Shopee: kho `sp` máy chủ nạp từ AccessTrade, chỉ 3 nhóm Thời trang · Gia dụng · Mẹ và bé; TikTok: RioHub). Khoá chỉ trên máy chủ, bỏ khung 🔑 nhập khoá. Máy chủ mới phải Deploy |
| 1.10.249 | BỎ chế độ Săn live: không còn khung "📺 Săn live" ở tab Voucher, tắt canh mã trên trang live, tắt kiểm tra shop TikTok 10 phút/lần (Shopee Live chỉ xem trên app) |
| 1.10.248 | Tab Voucher ở trang sản phẩm: khung "📺 Săn live" hiện lại, nằm cuối cùng |
| 1.10.247 | Chợ voucher: mã mình đăng có nút 🗑️ Xoá; HaoHao tự đọc thông báo Shopee khi dán mã chép từ Chợ ở giỏ/thanh toán (sai → báo hỏng, áp được → 👍); 2 lần báo hỏng → máy chủ tự xoá. Cần dán `server/haohao-gia-worker.js` mới lên Cloudflare |
| 1.10.246 | Bỏ khung "📒 Ví voucher của bạn" (sửa do một phiên Claude khác trên cùng máy ghi vào) |
| 1.10.245 | Đổi tên "🏷️ Top 10 mã shop thương hiệu" → "🏷️ Ưu đãi" |
| 1.10.244 | Bỏ khung "🔎 Tìm mã theo nhu cầu" (không ra mã giảm) |
| 1.10.243 | Lịch săn mã: đang tung mã → cả dòng thành nút đỏ "🔥 … [Lưu ngay ›]" (Extra → trang Mã giảm giá, thứ 4 → Ví voucher); chưa tới giờ → chỉ hiện giờ tiếp theo, không nút. Bỏ nút chung của 1.10.242. Lịch vẫn cố định – tự quét: chờ anh duyệt |
| 1.10.242 | Khung Lịch săn mã Shopee có nút cam "🎟️ Săn mã ngay ›" (giờ tung mã) / "Mở trang săn mã Shopee ›" → shopee.vn/m/ma-giam-gia qua link HaoHao. Lịch vẫn là lịch cố định (chưa tự quét) |
| 1.10.241 | Tab Voucher: bỏ luôn khung "Kết quả" tìm mã |
| 1.10.240 | Tab Voucher ở trang sản phẩm: bỏ khung "Giá đang báo đã gồm" và "Gộp thêm mã cho món này" |
| 1.10.239 | Món rủi ro: dòng "💬 Shop phản hồi X%" nằm cuối danh sách cảnh báo (dòng thứ 4) |
| 1.10.238 | Bong bóng có dòng "💬 Shop phản hồi X% · trong vài giờ" ngay dưới dòng Đã bán (xanh ≥90%, cam, đỏ <70%); không lặp trong cảnh báo |
| 1.10.237 | Bong bóng không hiện "Shop mới có N lượt đánh giá" và "Chỉ N người theo dõi shop" (vẫn có trong Kiểm tra chi tiết) |
| 1.10.236 | Cảnh báo ⚠ trong bong bóng (món rủi ro) mỗi ý 1 dòng; nút Kiểm tra chi tiết xuống dòng riêng |
| 1.10.235 | Khung ưu đãi mua nhiều hiện tối đa 3 dòng ✅ (mua thêm gần như miễn phí → Combo ≤3 cái → mua thêm có tốn → Mua Kèm Deal Sốc) |
| 1.10.234 | Khung ưu đãi mua nhiều: dấu ➕ đổi thành ✅ |
| 1.10.233 | Combo chỉ xét mua tối đa 3 cái; sửa dứt điểm chữ dính trong khung ➕ |
| 1.10.232 | Khung ➕ mua nhiều: tự đọc Combo Khuyến Mãi ("Mua 2 giảm 5%"), mã shop có đơn tối thiểu (mã giảm ≥70% số tiền mua thêm, bỏ khi Flash Sale), Mua Kèm Deal Sốc → chọn 1 ưu đãi lời nhất. Ưu tiên "Thêm món ~Xk → giảm Yk" khi gần như không tốn thêm; không có thì ẩn. Hiện cả khi không đọc được bảng giá. Sửa chữ dính 2 dòng. |
| 1.10.231 | Khung giá gọn: bỏ "Xem cách tính giá chi tiết", "Nhập giá app thật", "Bấm Mua Với Voucher…". Web: giá + "+ phí ship" + nút Tìm voucher. App: giá + "có mã vận chuyển · ship giảm" + nút Mở trên app. |
| 1.10.230 | Nút "🎟️ Tìm voucher" = săn **1 mã Freeship tốt nhất** (mỗi đơn chỉ 1 mã vận chuyển) + ngày sale thêm mã đợt sale (link trong coupons.json / trang sự kiện). KHÔNG săn mã shop / Shopee Voucher (web Shopee đã tự tối ưu). Báo: "🚚 Đã lưu mã Freeship…", "🚚 Ví đã có mã Freeship tốt nhất", "🎉 Ngày sale: đã lưu N mã". |
| 1.10.229 | Nút Tìm voucher LUÔN báo kết quả (đã lưu N mã / không có mã mới / lỗi). Giá app = ước tính Voucher Shopee −15% tối đa 60k (mã app hằng ngày, web không đọc được – đã kiểm: ví web của anh không có mã này); nút "✏️ Nhập giá app thật" lưu theo món 3 ngày. TẮT tự mở cửa sổ đọc ví (1.10.228). |
| 1.10.228 | TỰ ĐỌC VÍ VOUCHER 1 lần/ngày: cửa sổ nhỏ mở shopee.vn/cart#hh-wallet, bấm "Chọn hoặc nhập mã", đọc bảng "Chọn Shopee Voucher" (mã web + mã có dòng "mua hàng trên ứng dụng"), bấm Trở lại, đóng – không chọn mã. Bỏ mã Đơn đầu tiên/Khách mới. Giá web/app tự trừ Voucher Shopee từ ví. Nút "🎟️ Tìm voucher" bấm là săn + lưu mã ngay (vh-hunt), không chuyển trang. Bản lưu: ../content.1.10.227.bak.js, ../background.1.10.227.bak.js |
| 1.10.227 | Không đọc được bảng giá (vd Flash Sale): tự trừ mã shop đọc trên trang ("Mã Giảm Giá Của Shop" / "Shop Vouchers") ở khung web/app; Flash Sale ghi "mã shop không áp"; dòng "Mã đang áp" không treo "đang đọc…" |
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
