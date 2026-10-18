# Hồ sơ nộp Chrome Web Store – HaoHao

Chép từng mục vào trang **Chrome Web Store Developer Dashboard** (chrome.google.com/webstore/devconsole) → *Thêm mục mới* → tải `HaoHao-Store.zip`.

## 1. Gói tải lên
- File: `haohao-store/HaoHao-Store.zip` (làm lại bằng `python3 haohao-store/dong-goi-store.py` mỗi khi sửa code).
- Mã KHÔNG làm rối. `manifest.json` nằm ở gốc zip.

## 2. Trang giới thiệu (Store listing)
- **Tên:** HaoHao – Trợ lý cá nhân
- **Mô tả ngắn (≤132 ký tự):** Chú hamster trợ lý trên Chrome: việc cần làm, nhắc nhở, ghi chú, dự án, tập trung, dịch nhanh. Bớt quên, bớt rối.
- **Danh mục:** Năng suất (Productivity) · **Ngôn ngữ:** Tiếng Việt
- **Mô tả chi tiết:**

```
HaoHao là chú hamster trợ lý nhỏ ngay trên Chrome, giúp bạn bớt quên, bớt rối mỗi ngày.

✅ Việc cần làm – ghi nhanh, gõ "9h mai gặp khách" là tự hẹn giờ nhắc.
🔔 Nhắc nhở – uống nước, nghỉ mắt, lịch âm, rằm, mùng 1, nhắc theo giờ.
📝 Note – ghi chú, lưu trang, nói bằng giọng, lấy chữ từ ảnh; lưu note vào dự án.
📋 Dự án – Tab mới thành bảng dự án: mảng việc, thư mục con, việc cần làm, thu chi, lãi lỗ, biểu đồ.
🍅 Tập trung – Pomodoro 25/45/60 phút, nhạc nền.
🌐 Thông tin – dịch nhanh, tóm tắt trang, giải thích chữ bôi đen, phụ đề YouTube.
🛍️ Mua sắm – chấm điểm shop Shopee / TikTok Shop, so giá, lịch sử giá, mã giảm giá.
🧩 Tiện ích – giá vàng, chứng khoán, crypto; chặn quảng cáo; chuyển ảnh iPhone ⇄ máy tính (app HaoHao Transfer).

Không cần tài khoản. Dữ liệu của bạn nằm trong Chrome trên máy bạn.

⭐ 2 tháng đầu mở khoá toàn bộ. Sau đó Nhắc, Todo, Note, Mua sắm, Thông tin, Tập trung vẫn miễn phí; Tiện ích (Thị trường, Chặn quảng cáo, HaoHao Transfer) và trang Dự án cần gói HaoHao Pro: 1 tháng 20.000đ · 3 tháng 50.000đ · 6 tháng 90.000đ · 1 năm 199.000đ · trọn đời 499.000đ (chuyển khoản, nhận mã kích hoạt).

🛍️ Trong cửa hàng HaoHao có link tiếp thị, giá không đổi so với khi bạn tự mua sắm. Link chỉ dùng khi bạn tự bấm "Mua qua HaoHao" hoặc lấy mã giảm giá có thật.

Liên hệ: Phan Thanh Nhật – +84 366.159.790
```

- **Ảnh chụp (1280×800):** `haohao-store/anh/1-viec-can-lam.png` … `5-du-an.png`
- **Ô quảng bá nhỏ (440×280):** `haohao-store/anh/promo-440x280.png`
- **Biểu tượng 128×128:** có sẵn trong gói (`icons/icon128.png`)

## 3. Quyền riêng tư (Privacy practices)
- **Mục đích duy nhất (Single purpose):**
  `HaoHao là trợ lý cá nhân trên Chrome giúp người dùng bớt quên, bớt rối: quản lý việc cần làm, nhắc nhở, ghi chú và dự án, kèm các trợ giúp nhỏ ngay trên trang đang xem (dịch, tóm tắt, kiểm tra hàng khi mua sắm).`
- **Lý do từng quyền:**

| Quyền | Lý do (dán vào ô tương ứng) |
|---|---|
| storage, unlimitedStorage | Lưu việc cần làm, nhắc nhở, ghi chú, dự án và cài đặt ngay trên máy người dùng; dự án có thể nhiều dữ liệu nên cần không giới hạn. |
| alarms | Hẹn giờ nhắc việc, nhắc uống nước, Pomodoro, cập nhật giá định kỳ. |
| notifications | Hiện thông báo khi đến giờ nhắc việc. |
| tabs | Biết trang đang mở để ghi note kèm link trang, mở lại trang việc cần làm, mở trang Dự án / cài đặt. |
| activeTab | Đọc trang đang xem khi người dùng bấm dịch, tóm tắt, lưu trang. |
| contextMenus | Menu chuột phải: lưu chữ bôi đen vào Note, dịch, thêm việc. |
| declarativeNetRequest | Chặn quảng cáo (danh sách luật có sẵn trong gói), người dùng bật/tắt được. |
| offscreen | Phát nhạc nền Pomodoro và âm báo nhắc nhở. |
| identity | Đăng nhập Outlook chính thức của Microsoft để đếm thư chưa đọc (người dùng tự bật). |
| search | Ô tìm kiếm trên Tab mới dùng công cụ tìm kiếm mặc định của người dùng. |
| topSites | Hiện các trang hay vào trên Tab mới. |
| favicon | Hiện biểu tượng trang web trong Tab mới, link nhanh của dự án. |
| system.display | Đặt cửa sổ ghi chú nổi / nhắc việc vừa màn hình. |
| Truy cập mọi trang (`<all_urls>`, content scripts) | Linh vật HaoHao và bảng trợ lý hiện trên mọi trang người dùng mở: ghi note, nhắc, dịch chữ bôi đen, kiểm tra hàng khi mua sắm. |
| Các máy chủ trong host_permissions | Lấy giá vàng (sjc, vnappmob), chứng khoán (SSI, VNDirect), crypto (CoinGecko, DexScreener), thời tiết (open-meteo, ipwho.is, bigdatacloud), Gemini do người dùng tự dán khoá, Outlook (graph.microsoft.com), Gmail (đếm thư chưa đọc), ảnh sản phẩm Shopee/TikTok, máy chủ HaoHao (workers.dev: giá, mã giảm giá), app HaoHao Transfer trên máy người dùng (127.0.0.1:8686). |

- **Mã từ xa (Remote code):** *Không* – mọi mã nằm trong gói; chỉ tải dữ liệu JSON (giá, danh sách mã giảm giá).
- **Dữ liệu thu thập (tick):** Website content (giá sản phẩm đang xem, nội dung gửi Gemini khi người dùng yêu cầu) · User activity (từ khoá tìm kiếm trên trang mua sắm, ẩn danh) · Location (vị trí gần đúng theo IP cho thời tiết).
- **Cam kết (tick cả 3):** không bán/chuyển dữ liệu cho bên thứ ba ngoài mục đích đã nêu; không dùng cho mục đích không liên quan; không dùng để xét tín dụng/cho vay.
- **URL chính sách quyền riêng tư:** `https://github.com/nhatphan79/nhatphan79/blob/HEAD/haohao-store/CHINH-SACH-RIENG-TU.md`

## 3b. Tính năng trả phí
- Trong mục khai báo, chọn **có tính năng trả phí / mua trong ứng dụng** (in-app purchases) và ghi: *"Tiện ích và trang Dự án cần HaoHao Pro sau 2 tháng dùng thử; thanh toán bằng chuyển khoản ngân hàng, nhận mã kích hoạt."*
- Chrome Web Store không thu tiền hộ – HaoHao tự thu, mã kích hoạt kiểm tra ngay trên máy (không gửi đi đâu).

## 4. Anh tự điền
- Email hỗ trợ (hiện công khai) – sửa luôn trong CHINH-SACH-RIENG-TU.md mục 6.
- Khu vực phát hành: Việt Nam (hoặc tất cả).
- Phí đăng ký 5 USD (nếu tài khoản chưa đóng).
