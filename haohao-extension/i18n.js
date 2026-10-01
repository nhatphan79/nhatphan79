// © 2026 HaoHao – Bản quyền thuộc Phan Thanh Nhật (0366.159.790). Mọi quyền được bảo lưu.
// 🌐 Giao diện tiếng Anh: mặc định tiếng Việt; chọn English thì thay chữ giao diện bằng tiếng Anh ngay trên trang
// (chỉ thay đúng các câu của HaoHao, không đụng tới việc cần làm, ghi chú hay nội dung trang web).
(() => {
  const HT = self.HT; if (!HT) return;
  const D = {
"Chặn quảng cáo": "Ad blocker",
"Ẩn quảng cáo, trang nhẹ hơn": "Hide ads, lighter pages",
"Chặn quảng cáo: Đang bật": "Ad blocker: On",
"Chặn quảng cáo: Đang tắt": "Ad blocker: Off",
"Bật lại trên trang này": "Turn back on for this site",
"Tắt trên trang này": "Turn off for this site",
"Trang này không còn khung quảng cáo nào": "No ad boxes left on this page",
"Tải lại trang (F5) để áp dụng": "Reload the page (F5) to apply",
"Chặn tận gốc các mạng quảng cáo (Google Ads, Taboola, Admicro…) và ẩn khung quảng cáo còn sót. YouTube: tự bỏ qua quảng cáo video và ẩn ô quảng cáo. Trang nào bị lỗi thì bấm \"Tắt trên trang này\". Bật/tắt xong nên tải lại trang (F5).": "Blocks ad networks at the source (Google Ads, Taboola, Admicro…) and hides leftover ad boxes. YouTube: skips video ads automatically and hides ad slots. If a site breaks, click \"Turn off for this site\". Reload the page (F5) after switching.",
"🧡 Cửa hàng HaoHao trên Shopee": "🧡 HaoHao store on Shopee",
"Món đã chọn lọc, mua qua Shopee": "Hand-picked items, buy on Shopee",
"Mở cửa hàng HaoHao trên Shopee": "Open the HaoHao store on Shopee",
"Xem ›": "View ›",
"Trời quang": "Clear sky",
"Ít mây": "Mostly clear",
"Có mây": "Partly cloudy",
"Nhiều mây": "Cloudy",
"Sương mù": "Fog",
"Mưa phùn": "Drizzle",
"Có mưa": "Rain",
"Có tuyết": "Snow",
"Có dông": "Thunderstorm",
"Nắng nóng, nhớ uống nước": "Very hot, stay hydrated",
"Có dông, cẩn thận nhé": "Thunderstorms, take care",
"Nhớ mang ô nhé": "Don't forget an umbrella",
"Trời lạnh, mặc ấm nhé": "Cold out, dress warmly",
"Trời đẹp hôm nay": "Nice weather today",
"Chúc bạn ngày tốt lành": "Have a great day",
"Hình ảnh": "Images",
"Ứng dụng Google": "Google apps",
"Tìm trên Google hoặc gõ địa chỉ": "Search Google or type a URL",
"Tìm trên Google": "Google Search",
"Tìm bằng giọng nói": "Search by voice",
"Tìm bằng hình ảnh (Google Lens)": "Search by image (Google Lens)",
"Tìm bằng hình ảnh": "Search by image",
"✨ Chế độ AI": "✨ AI Mode",
"Hỏi Google bằng Chế độ AI": "Ask Google in AI Mode",
"Xem trang đầu tiên tìm được": "I'm Feeling Lucky",
"Đang nghe… hãy nói": "Listening… speak now",
"Không nghe được, bấm 🎤 thử lại": "Didn't catch that, click 🎤 to retry",
"Tìm kiếm": "Search",
"Dịch": "Translate",
"Lịch": "Calendar",
"Ảnh": "Photos",
"Tin tức": "News",
"Tài liệu": "Docs",
"Trang tính": "Sheets",
"Lối tắt": "Shortcuts",
"Tên (vd: Gmail)": "Name (e.g. Gmail)",
"Địa chỉ (vd: mail.google.com)": "Address (e.g. mail.google.com)",
"Tên lối tắt": "Shortcut name",
"Địa chỉ lối tắt": "Shortcut address",
"Xoá lối tắt": "Remove shortcut",
"Thêm lối tắt": "Add shortcut",
"đang bật": "on",
"(Không có tiêu đề)": "(No title)",
"(nhắc lại)": "(repeat)",
") dán vào ô dưới.": ") into the box below.",
"), mỗi link một dòng. HaoHao tự lấy mã và tên sản phẩm, rồi cập nhật cho mọi người dùng (trong vòng 6 giờ).": "), one link per line. HaoHao reads the product ID and name, then updates it for all users (within 6 hours).",
", bấm": ", click",
", dán vào ô dưới rồi bấm Lưu.": ", paste it into the box below and click Save.",
", dán địa chỉ này vào:": ", paste this address into:",
", nghỉ ngơi nhé": ", get some rest",
", sao chép": ", copy",
", sao chép mã (bắt đầu bằng": ", copy the token (starts with",
", tick ô": ", tick",
", đăng nhập bằng tài khoản Outlook, bấm": ", sign in with your Outlook account, click",
". Expiration: chọn 1 năm.": ". Expiration: pick 1 year.",
". Mã chỉ lưu trong Chrome của bạn.": ". The key is stored only in your Chrome.",
". Supported account types: chọn dòng": ". Supported account types: choose",
"10 phút nữa": "In 10 minutes",
"30 phút nữa": "In 30 minutes",
"App HaoHao 3D chưa chạy: đang dùng cửa sổ nhắc nhỏ. Bấm đúp biểu tượng HaoHao trên Desktop để bật con hamster 3D.": "HaoHao 3D app is not running: using the small reminder window. Double-click the HaoHao icon on your Desktop to start the 3D hamster.",
"BTC vượt 120k": "BTC above 120k",
"Biểu tượng": "Icon",
"Báo khi": "Notify when",
"Báo khi thư khớp người gửi HOẶC có từ khoá. Không cần gõ dấu.": "Notify when an email matches a sender OR contains a keyword. Accents not required.",
"Bôi đen một thuật ngữ trên trang rồi bấm 💡 Giải thích. Hợp khi đọc tài liệu kỹ thuật, tài chính, tiếng Anh.": "Highlight a term on the page then click 💡 Explain. Great for technical, finance or English documents.",
"Bôi đen một đoạn trên trang trước nhé (hoặc dán chữ vào ô bên dưới).": "Highlight some text on the page first (or paste text into the box below).",
"Bản dịch:": "Translation:",
"Bấm": "Click",
"Bấm \"Lưu\" mã ngay trên trang Shopee, mã tự áp khi thanh toán.": "Click \"Save\" on the voucher on the Shopee page; it applies automatically at checkout.",
"Bấm \"Lưu\" mã trên trang rồi đặt hàng nhé.": "Click \"Save\" on the voucher on the page, then place your order.",
"Bấm \"Tóm tắt trang này\" để HaoHao đọc và tóm lại ý chính. Mẹo: bôi đen một đoạn trước khi mở HaoHao để chỉ tóm tắt đoạn đó.": "Click \"Summarize this page\" and HaoHao reads it and sums up the key points. Tip: highlight a passage before opening HaoHao to summarize only that part.",
"Bấm \"Tóm tắt trang này\": HaoHao xem video rồi tóm lại ý chính và các mốc thời gian (bấm vào mốc để tua tới).": "Click \"Summarize this page\": HaoHao watches the video and sums up key points and timestamps (click a timestamp to jump).",
"Bấm lần nữa để xoá": "Click again to delete",
"Bấm nút bên dưới để mở Google AI Studio, đăng nhập Gmail.": "Click the button below to open Google AI Studio and sign in with Gmail.",
"Bấm nút micro để nói.": "Click the mic button to speak.",
"Bấm để sửa": "Click to edit",
"Bấm để xem đủ": "Click to see all",
"Bật hoặc tắt": "Turn on or off",
"Bắt đầu hoặc dừng nghe": "Start or stop listening",
"Bỏ giờ": "Remove time",
"Bỏ qua nghỉ": "Skip break",
"Bỏ quan trọng": "Unmark important",
"Bỏ theo dõi": "Stop tracking",
"Cao hơn bình thường, nên chờ thêm": "Higher than usual, better wait",
"Chay 10 ngày": "Vegetarian 10 days",
"Chay 2 ngày": "Vegetarian 2 days",
"Chay 4 ngày": "Vegetarian 4 days",
"Chrome chưa cho phép nhận giọng nói. Bấm nút micro để thử lại.": "Chrome has not allowed speech recognition. Click the mic button to try again.",
"Chrome này không hỗ trợ nhận giọng nói. Bạn gõ tay vào ô bên dưới nhé.": "This Chrome does not support speech recognition. Please type in the box below.",
"Chào buổi chiều": "Good afternoon",
"Chào buổi sáng": "Good morning",
"Chào buổi trưa": "Good noon",
"Chào buổi tối": "Good evening",
"Chào bạn": "Hello",
"Chê khác (1–2★)": "Other complaints (1–2★)",
"Chú hamster canh tin, canh giá và nhắc việc cho bạn trong Chrome.": "A hamster that watches your inbox, prices and reminders inside Chrome.",
"Chưa cho phép dùng micro. Bấm vào biểu tượng ổ khoá hoặc micro ở đầu cửa sổ, chọn Cho phép, rồi bấm nút micro lại.": "Microphone not allowed. Click the lock or mic icon at the top of the window, choose Allow, then click the mic button again.",
"Chưa có link nào.": "No links yet.",
"Chưa có lần báo nào.": "No alerts yet.",
"Chưa có mã Gemini.": "No Gemini key yet.",
"Chưa có mã mới trong kho HaoHao. Xem nhanh kho mã của các sàn:": "No new vouchers in HaoHao yet. Browse the shops' voucher pages:",
"Chưa có mã ứng dụng.": "No app ID yet.",
"Chưa có mã.": "No key yet.",
"Chưa có note. Bôi đen chữ ở bất kỳ trang nào rồi bấm 📝 Note (tự lưu cả link trang). Hoặc bấm 🎤 để nói.": "No notes yet. Highlight text on any page and click 📝 Note (the page link is saved too). Or click 🎤 to speak.",
"Chưa có việc nào. Gõ việc ở trên. Mỗi việc có ⭐ quan trọng, 🔔 nhắc giờ, 🍅 Pomodoro.": "No tasks yet. Type one above. Each task has ⭐ important, 🔔 reminder, 🍅 Pomodoro.",
"Chưa có điều kiện nào. Bấm “Thêm điều kiện” để HaoHao bắt đầu làm việc.": "No conditions yet. Click “Add condition” to get HaoHao working.",
"Chưa có điểm đánh giá": "No rating yet",
"Chưa có đánh giá nào, chưa ai kiểm chứng": "No reviews yet, nobody has verified it",
"Chưa hẹn giờ": "No time set",
"Chưa kiểm tra lần nào.": "Not checked yet.",
"Chưa lưu được, thử lại nhé.": "Could not save, please try again.",
"Chưa rõ số đã bán": "Sold count unknown",
"Chưa thấy Shopee bán đúng sản phẩm này.": "Shopee does not seem to sell this exact product.",
"Chưa thấy shop khác bán đúng sản phẩm này (HaoHao bỏ qua món chỉ na ná).": "No other shop sells this exact product (HaoHao skips look-alikes).",
"Chưa tra được CoinGecko, thử lại sau.": "Could not reach CoinGecko, try again later.",
"Chưa tìm được lần này (Shopee tải chậm hoặc cần đăng nhập).": "Could not search this time (Shopee is slow or needs you to sign in).",
"Chưa tìm được trên Shopee lần này.": "Could not search Shopee this time.",
"Chưa đăng nhập Outlook.": "Not signed in to Outlook.",
"Chưa đặt được nhắc, thử lại nhé.": "Could not set the reminder, please try again.",
"Chưa đọc được đủ thông tin shop này.": "Could not read enough about this shop.",
"Chưa đủ dữ liệu, HaoHao đang theo dõi thêm": "Not enough data yet, HaoHao keeps watching",
"Chất liệu: jean": "Material: jean",
"Chất lượng kém": "Poor quality",
"Chỉ hộp thư Chính (bỏ qua Quảng cáo, Mạng xã hội)": "Primary inbox only (skip Promotions, Social)",
"Chỉ hộp thư Ưu tiên (Focused), bỏ qua thư Khác": "Focused inbox only, skip Other",
"Chỉ lưu note": "Save note only",
"Chỉ thư khớp điều kiện": "Only matching emails",
"Chọn một mẫu ở trên (uống thuốc, uống nước, đón con) hoặc tự tạo lịch nhắc riêng.": "Pick a template above (medicine, water, school pick-up) or create your own reminder.",
"Chọn ngày giờ nhắc nhé.": "Pick a date and time for the reminder.",
"Chọn ngày giờ nhắc.": "Pick a date and time.",
"Chọn việc để tập trung": "Pick a task to focus on",
"Chọn ít nhất một ngày âm lịch nhé.": "Pick at least one lunar day.",
"Chủ Nhật": "Sunday",
"Chữ": "Text",
"Chữ cần dịch": "Text to translate",
"CoinGecko (coin lớn, nhập mã như bitcoin, solana)": "CoinGecko (big coins, enter a code like bitcoin, solana)",
"CoinGecko trả lỗi": "CoinGecko error",
"Copy mã": "Copy code",
"Cuối tháng": "End of month",
"Cuối tháng âm": "End of lunar month",
"Cuối tháng âm lịch, dâng cúng": "End of lunar month, make offerings",
"Cuối tuần": "Weekends",
"Cài đặt chung": "General settings",
"Các giờ nhắc, cách nhau dấu phẩy": "Reminder times, separated by commas",
"Các trang gây xao nhãng": "Distracting sites",
"Cân nhắc": "Consider",
"Câu hỏi": "Question",
"Có email mới là HaoHao chạy ra báo": "HaoHao pops up when a new email arrives",
"Có tiếng chuông khi nhắc": "Chime on reminders",
"Có tiếng gõ và tiếng chuông": "Knock and chime sounds",
"Cúng cuối tháng": "End-of-month offering",
"Cúng mùng 1 & rằm": "Offerings on the 1st & full moon",
"Cần link rút gọn vt.tiktok.com (Chia sẻ → Sao chép liên kết)": "A vt.tiktok.com short link is needed (Share → Copy link)",
"Cốc cốc! Có thư mới": "Knock knock! New email",
"Cốc cốc! Tới giờ rồi": "Knock knock! It's time",
"Cốc! Cốc!": "Knock! Knock!",
"Cụm cần giải thích": "Term to explain",
"Cứ": "Every",
"Cứ nói tự nhiên bằng tiếng Việt. Nói xong bấm Lưu.": "Just speak naturally. Click Save when done.",
"DexScreener (meme coin, dán địa chỉ token)": "DexScreener (meme coins, paste the token address)",
"DexScreener trả lỗi": "DexScreener error",
"Dán link sản phẩm từ phòng trưng bày TikTok (Chia sẻ → Sao chép liên kết, dạng": "Paste product links from your TikTok showcase (Share → Copy link, like",
"Dán mã Gemini (AIza…)": "Paste your Gemini key (AIza…)",
"Dán mã vào ô dưới và bấm Lưu.": "Paste the key into the box below and click Save.",
"Dán địa chỉ token (contract)": "Paste the token address (contract)",
"Dán địa chỉ token meme…": "Paste a meme token address…",
"Dùng ngay": "Use now",
"Dưới 100k": "Under 100k",
"Dịch": "Translate",
"Dịch cả trang": "Translate whole page",
"Dịch phần mới tải thêm": "Translate newly loaded part",
"Dịch sang": "Translate to",
"Dịch tiếp phần sau": "Translate the next part",
"Dịch xong trang này rồi!": "This page is fully translated!",
"Dừng tập trung": "Stop focus",
"Email mới": "New email",
"File PDF lớn quá (hơn 18 MB)": "The PDF is too large (over 18 MB)",
"File không đúng định dạng sao lưu của HaoHao.": "This is not a HaoHao backup file.",
"Gemini của Google đang quá tải (nhiều người dùng cùng lúc). Đợi 1–2 phút rồi bấm lại nhé.": "Google's Gemini is overloaded (too many users right now). Wait 1–2 minutes and try again.",
"Gemini không trả lời gì, thử lại nhé.": "Gemini gave no answer, please try again.",
"Gemini trả thiếu đoạn, bấm dịch lại nhé": "Gemini returned an incomplete part, please translate again",
"Gemini từ chối đọc nội dung này.": "Gemini refused to read this content.",
"Gemini đang quá tải, đợi 1–2 phút rồi thử lại": "Gemini is overloaded, wait 1–2 minutes and try again",
"Ghi chú bằng giọng nói": "Voice note",
"Ghi chú bằng giọng nói (hoặc bấm giữ HaoHao)": "Voice note (or press and hold HaoHao)",
"Ghi chú giọng nói": "Voice note",
"Ghi nhanh một note…": "Quick note…",
"Giao hàng, đóng gói": "Shipping, packaging",
"Giá bình thường": "Normal price",
"Giá cập nhật mỗi phút · CoinGecko / DexScreener": "Prices update every minute · CoinGecko / DexScreener",
"Giá không đổi trong 30 ngày": "Price unchanged for 30 days",
"Giá lớn hơn hoặc bằng ($)": "Price at or above ($)",
"Giá nhỏ hơn hoặc bằng ($)": "Price at or below ($)",
"Giá thấp nhất 30 ngày 👍": "Lowest price in 30 days 👍",
"Giá tốt, thấp hơn bình thường": "Good price, below usual",
"Giá được kiểm tra mỗi phút. Mỗi lần điều kiện chuyển từ sai sang đúng, bạn được báo một lần.": "Prices are checked every minute. You are notified once each time a condition turns from false to true.",
"Giải thích": "Explain",
"Giải thích:": "Explanation:",
"Giảm ít nhất (% trong 24h)": "Drop at least (% in 24h)",
"Giọng nói": "Voice",
"Giờ mới": "New time",
"Giờ nhắc (thêm được nhiều giờ)": "Reminder times (you can add several)",
"Giờ nhắc trước": "Reminder time the day before",
"Gmail thứ 1": "Gmail account 1",
"Gmail thứ 2": "Gmail account 2",
"Gmail thứ 3": "Gmail account 3",
"Gmail thứ 4": "Gmail account 4",
"Gần đây:": "Recent:",
"Gợi ý tiêu đề và caption cần mã Gemini (nhập ở nhánh Đọc hộ)": "Title and caption ideas need a Gemini key (set it in Read for me)",
"HaoHao chào và báo việc đang chờ khi mở trang": "HaoHao greets you and shows pending tasks when a page opens",
"⏱️ HaoHao chào lại sau mỗi": "⏱️ HaoHao greets again every",
"10 phút": "10 minutes", "15 phút": "15 minutes", "30 phút": "30 minutes", "1 tiếng": "1 hour", "3 tiếng": "3 hours",
"💡 Bôi đen chữ bất kỳ để tôi dịch hoặc giải thích.": "💡 Highlight any text and I'll translate or explain it.",
"🛍️ Mở sản phẩm Shopee, TikTok: tôi tìm shop rẻ hơn cho bạn.": "🛍️ Open a Shopee or TikTok product: I'll find a cheaper shop.",
"📝 Có việc cần nhớ? Bấm vào tôi để thêm vào Todolist.": "📝 Something to remember? Click me to add it to your to-do list.",
"🍅 Cần tập trung? Thử chế độ Tập trung 25 phút nhé.": "🍅 Need to focus? Try a 25-minute Focus session.",
"🔎 Bấm vào tôi, chọn Mua sắm để tìm hàng uy tín trên Shopee.": "🔎 Click me and pick Shopping to find trusted items on Shopee.",
"⏰ Bấm vào tôi để đặt nhắc nhở uống nước, nghỉ mắt.": "⏰ Click me to set reminders to drink water or rest your eyes.",
"HaoHao nhắc bạn": "HaoHao reminder",
"HaoHao nhắc bạn nè": "HaoHao is reminding you",
"HaoHao đang nghe…": "HaoHao is listening…",
"HaoHao đang nghĩ cách giải thích…": "HaoHao is thinking how to explain…",
"HaoHao đang đọc trang… kéo xuống một chút để Shopee tải thông tin shop và đánh giá.": "HaoHao is reading the page… scroll down a bit so Shopee loads shop info and reviews.",
"HaoHao đã kiểm tra món này": "HaoHao has checked this item",
"HaoHao đã kiểm tra shop này": "HaoHao has checked this shop",
"HaoHao, bấm để mở các nhánh. Bấm giữ để ghi chú bằng giọng nói": "HaoHao, click to open the branches. Press and hold for a voice note",
"Hiện HaoHao trên các trang web": "Show HaoHao on websites",
"Hiện lại": "Show again",
"Hiện nút 🌐 Dịch khi bôi đen chữ": "Show the 🌐 Translate button when text is highlighted",
"Hiện nút 💡 Lưu khi bôi đen chữ": "Show the 💡 Save button when text is highlighted",
"Hoàn thành việc": "Task done",
"Hoặc có từ khoá trong tiêu đề / nội dung": "Or a keyword in the subject / body",
"Hoặc dán chữ cần dịch vào đây…": "Or paste text to translate here…",
"Huỷ": "Cancel",
"Hôm nay": "Today",
"Hôm nay chưa có phiên nào": "No sessions today",
"Hôm nay ăn chay nhé": "Vegetarian day today",
"Hôm qua": "Yesterday",
"Hằng ngày": "Daily",
"Hằng ngày, vào các giờ cố định": "Daily, at fixed times",
"Hẹn giờ nhắc": "Set reminder",
"Hết giờ nghỉ thì tự vào phiên mới": "Start a new session automatically after the break",
"Hết hạn hôm nay": "Expires today",
"Hết lượt miễn phí của Gemini lúc này. Đợi ít phút (hoặc tới mai) rồi thử lại.": "Gemini's free quota is used up for now. Wait a few minutes (or until tomorrow) and try again.",
"Hỏi": "Ask",
"Khi nhắc nhở, HaoHao ra hẳn màn hình và gõ cửa (đè lên cả ứng dụng khác)": "For reminders, HaoHao comes out on screen and knocks (on top of other apps)",
"Khi điều kiện đúng, HaoHao nhảy ra báo và gửi thông báo. Todolist, lịch nhắc và danh sách coin cũng chỉnh được ngay trong HaoHao trên trang web.": "When a condition is met, HaoHao pops up and sends a notification. Todos, reminders and the coin list can also be edited right in HaoHao on any web page.",
"Kho mã Shopee": "Shopee vouchers",
"Khoảng lặp tối thiểu 5 phút.": "Minimum repeat interval is 5 minutes.",
"Khuya rồi": "It's late",
"Khá ổn": "Fairly good",
"Không chép được": "Could not copy",
"Không chép được, bấm vào trang rồi thử lại.": "Could not copy, click the page and try again.",
"Không có mã \"": "No code \"",
"Không có mã này trên CoinGecko": "This code is not on CoinGecko",
"Không có trang nào.": "No sites.",
"Không có ý tưởng nào khớp.": "No matching ideas.",
"Không kết nối được": "Could not connect",
"Không nghe thấy gì. Bấm nút micro rồi nói lại nhé.": "Heard nothing. Click the mic button and speak again.",
"Không thấy link TikTok": "No TikTok link found",
"Không tìm thấy micro trên máy.": "No microphone found on this computer.",
"Không tìm thấy token với địa chỉ này": "No token found at this address",
"Không đọc được mã sản phẩm: dán thêm mã (dãy số sau /pdp/) cùng dòng": "Could not read the product ID: add the ID (the digits after /pdp/) on the same line",
"Kiểm tra ngay": "Check now",
"Kiểu dịch không hợp lệ": "Invalid translation mode",
"Kiểu nhắc": "Reminder type",
"Kéo xuống cuối trang để TikTok tải mục \"Bạn cũng có thể thích\", rồi bấm Thử lại.": "Scroll to the bottom so TikTok loads \"You may also like\", then click Retry.",
"Ký hiệu": "Symbol",
"Ký hiệu coin hoặc địa chỉ token": "Coin symbol or token address",
"Link sản phẩm (mỗi dòng một link)": "Product links (one per line)",
"Link tiếp thị: HaoHao có thể nhận hoa hồng khi bạn mua, bạn không phải trả thêm.": "Affiliate links: HaoHao may earn a commission when you buy, at no extra cost to you.",
"Liên hệ": "Contact",
"Loại điều kiện": "Condition type",
"Làm xong việc nào thì bấm việc đó nhé": "Click a task when you finish it",
"Lúc": "At",
"Lưu": "Save",
"Lưu Note (kèm link trang)": "Save note (with page link)",
"Lưu lịch nhắc": "Save reminder",
"Lưu mã": "Save key",
"Lưu điều kiện": "Save condition",
"Lấy mã": "Get code",
"Lấy mã miễn phí tại": "Get a free key at",
"Lặp lại": "Repeat",
"Lặp lại sau mỗi X phút": "Repeat every X minutes",
"Lịch nhắc": "Reminders",
"Lịch nhắc âm lịch sửa trong HaoHao: bấm HaoHao trên trang web > nhánh Nhắc nhở > nút ✎.": "Edit lunar reminders in HaoHao: click HaoHao on a web page > Reminders > the ✎ button.",
"Lọc": "Filter",
"Lỗi:": "Error:",
"Lời bạn nói sẽ hiện ở đây, sửa được trước khi lưu…": "What you say shows up here, you can edit it before saving…",
"Lời nhắc": "Reminder",
"Lời nhắc HaoHao sẽ nói": "What HaoHao will say",
"Lời nhắc hôm trước": "Day-before reminder",
"Mai là cuối tháng âm, nhớ chuẩn bị đồ cúng": "Tomorrow is the end of the lunar month, prepare the offerings",
"Mai là ngày cúng, nhớ mua hoa quả, nhang đèn": "Tomorrow is an offering day, buy fruit and incense",
"Mai ăn chay, nhớ chuẩn bị đồ chay": "Vegetarian day tomorrow, prepare vegetarian food",
"Mall: hàng chính hãng": "Mall: genuine goods",
"Microsoft bắt mỗi phần mềm tự đăng ký một \"mã ứng dụng\" miễn phí. Làm 1 lần là xong, dùng được cho cả Outlook cá nhân (hotmail, outlook.com) và Outlook công ty.": "Microsoft requires each app to register a free \"app ID\". Do it once and it works for personal Outlook (hotmail, outlook.com) and work Outlook.",
"Mua sắm": "Shopping",
"Màu sắc: xanh": "Color: blue",
"Mã Gemini": "Gemini key",
"Mã Gemini không đúng. Kiểm tra lại trong Cài đặt.": "Wrong Gemini key. Check it in Settings.",
"Mã GitHub": "GitHub token",
"Mã chỉ lưu trong Chrome của bạn, không nằm trong code.": "The token is stored only in your Chrome, not in the code.",
"Mã coin hoặc địa chỉ token": "Coin code or token address",
"Mã có dạng xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 ký tự).": "The ID looks like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 characters).",
"Món này chưa đủ đơn tối thiểu của các mã trên. Mua kèm thêm để dùng được mã.": "This item is below the minimum order of these vouchers. Add more items to use them.",
"Món đã kiểm tra, bán trên TikTok Shop": "Checked items sold on TikTok Shop",
"Mô hình": "Model",
"Mùi khó chịu": "Bad smell",
"Mùng": "Day",
"Mùng 1": "1st day",
"Mẹo: bôi đen chữ ở bất kỳ trang nào là hiện nút 🌐 Dịch ngay cạnh.": "Tip: highlight text on any page and a 🌐 Translate button appears next to it.",
"Mọi thư mới": "All new emails",
"Mốc": "Level",
"Mỗi ngày": "Every day",
"Một lần": "Once",
"Một lần vào ngày giờ cụ thể": "Once at a specific date and time",
"Một lần,": "Once,",
"Mới": "New",
"Mở": "Open",
"Mở Gmail để đăng nhập": "Open Gmail to sign in",
"Mở hàng HaoHao tuyển chọn trên TikTok": "Open HaoHao's picks on TikTok",
"Mở mail": "Open mail",
"Mở qua link tiếp thị của HaoHao": "Open via HaoHao's affiliate link",
"Mở sản phẩm Shopee hoặc TikTok là HaoHao tự so giá với shop khác, món TikTok so thêm với Shopee (mở ngầm 1 tab vài giây)": "When you open a Shopee or TikTok product, HaoHao compares prices with other shops, and TikTok items with Shopee too (a hidden tab opens for a few seconds)",
"Mở trang lấy mã": "Open the voucher page",
"Nghi hàng giả, nhái": "Suspected fake or counterfeit",
"Nghỉ ngắn": "Short break",
"Nguồn giá": "Price source",
"Ngày": "Date",
"Ngày giờ": "Date & time",
"Ngày giờ nhắc": "Reminder date & time",
"Ngày trong tuần (không chọn là mọi ngày):": "Weekdays (none selected = every day):",
"Ngày âm khác (cách nhau dấu phẩy, 30 = cuối tháng)": "Other lunar days (comma separated, 30 = end of month)",
"Ngày âm lịch": "Lunar days",
"Người gửi (tên hoặc email, cách nhau dấu phẩy)": "Sender (name or email, comma separated)",
"Nhận giọng nói cần có mạng Internet.": "Speech recognition needs an Internet connection.",
"Nhập hoặc bôi đen cụm cần giải thích (vd: CAGR, thép mũ)": "Type or highlight a term to explain (e.g. CAGR, EBITDA)",
"Nhập ký hiệu coin (vd: BTC, ETH, SOL) hoặc dán địa chỉ token meme để theo dõi giá.": "Enter a coin symbol (e.g. BTC, ETH, SOL) or paste a meme token address to track its price.",
"Nhập mã coin và mốc giá.": "Enter a coin code and a price level.",
"Nhập ít nhất một giờ, ví dụ 08:00.": "Enter at least one time, e.g. 08:00.",
"Nhập ít nhất một từ khoá.": "Enter at least one keyword.",
"Nhật ký": "Log",
"Nhắc": "Remind",
"Nhắc khi lỡ mở trang gây xao nhãng": "Remind me when I open a distracting site",
"Nhắc lúc": "Remind at",
"Nhắc lại 10 phút": "Remind again in 10 min",
"Nhắc lại sau 10 phút": "Remind again in 10 minutes",
"Nhắc lặp lại": "Repeating reminder",
"Nhắc nhở": "Reminders",
"Nhắc nhở 🔔": "Reminders 🔔",
"Nhắc trước 1 ngày (để mua đồ cúng, chuẩn bị đồ chay)": "Remind 1 day before (to buy offerings, prepare vegetarian food)",
"Nhắc tôi": "Remind me",
"Nhắc tôi (hiểu câu kiểu \"15h mai gửi báo giá\")": "Remind me (understands \"3pm tomorrow send the quote\")",
"Nhắc tôi lúc…": "Remind me at…",
"Những lần HaoHao đã báo cho bạn.": "Times HaoHao has notified you.",
"Những ngày trong tuần (không chọn là mọi ngày)": "Days of the week (none selected = every day)",
"Note mới": "New note",
"Nói lại": "Say it again",
"Nước ngoài": "Overseas",
"Nạp file sao lưu": "Load backup file",
"Nội dung ghi chú": "Note content",
"Ok, quay lại": "OK, go back",
"Outlook cần thiết lập 1 lần (khoảng 3 phút) trong trang Cài đặt.": "Outlook needs a one-time setup (about 3 minutes) in Settings.",
"Phóng to / thu nhỏ": "Enlarge / shrink",
"Phóng to hoặc thu nhỏ bảng": "Enlarge or shrink the panel",
"Pomodoro: tập trung làm việc này": "Pomodoro: focus on this task",
"Quay lại": "Back",
"Quá hạn": "Overdue",
"Ra màn hình gõ cửa khi nhắc": "Come out on screen and knock for reminders",
"Redirect URI: chọn": "Redirect URI: choose",
"Rất nhiều người đã mua và đánh giá": "Many people have bought and reviewed it",
"Rất ít đánh giá có ảnh thật": "Very few reviews with real photos",
"Rằm": "Full moon",
"Rằm (14, 15)": "Full moon (14, 15)",
"Rằm (15)": "Full moon (15)",
"Rủi ro": "Risky",
"Sai size, không vừa": "Wrong size, poor fit",
"Sao chép": "Copy",
"Sao chép bản dịch": "Copy translation",
"Sao chép tất cả": "Copy all",
"Sao lưu": "Backup",
"Shop Yêu Thích: bán tốt, ít bị phàn nàn": "Preferred shop: sells well, few complaints",
"Shop khác trên TikTok": "Another shop on TikTok",
"Shop thường, không phải Mall hay Yêu Thích": "Regular shop, not Mall or Preferred",
"Shop trên Shopee": "Shop on Shopee",
"Shop, đổi trả": "Shop, returns",
"Shopee Mall: hàng chính hãng, được đổi trả": "Shopee Mall: genuine goods, returns accepted",
"Shopee phản hồi quá chậm lần này.": "Shopee responded too slowly this time.",
"Sản phẩm": "Product",
"Sắp tới": "Upcoming",
"Số phút": "Minutes",
"Số đánh giá gần bằng số đã bán, có thể có đánh giá ảo": "Almost as many reviews as sales, may include fake reviews",
"Sửa": "Edit",
"Sửa việc": "Edit task",
"Tab mới": "New tab",
"Theo dõi": "Track",
"Theo dõi giá coin, cảnh báo giá": "Track coin prices, price alerts",
"Thiết lập Outlook": "Set up Outlook",
"Thêm": "Add",
"Thêm giờ": "Add time",
"Thêm việc cần làm…": "Add a task…",
"Thêm ít nhất một giờ nhắc nhé.": "Add at least one reminder time.",
"Thêm điều kiện": "Add condition",
"Thông tin": "Info",
"Thất vọng": "Disappointed",
"Thắp nhang, dâng cúng": "Light incense, make offerings",
"Thứ 2 đến thứ 6": "Monday to Friday",
"Thứ Ba": "Tuesday",
"Thứ Bảy": "Saturday",
"Thứ Hai": "Monday",
"Thứ Năm": "Thursday",
"Thứ Sáu": "Friday",
"Thứ Tư": "Wednesday",
"Thử HaoHao": "Try HaoHao",
"Thử HaoHao ra màn hình": "Try HaoHao on screen",
"Thử kết nối": "Test connection",
"Thử ngay": "Try now",
"TikTok Shop Mall: hàng chính hãng": "TikTok Shop Mall: genuine goods",
"Tiêu đề gợi ý (bấm để chép)": "Suggested titles (click to copy)",
"Tiêu đề, caption, hashtag cho bài đăng": "Titles, captions and hashtags for posts",
"Tiện ích": "Tools",
"Todo đang trống. Thêm việc ở nhánh Todo, hoặc bấm ▶ Bắt đầu để tập trung tự do.": "Your todo list is empty. Add tasks in the Todo branch, or click ▶ Start for a free focus session.",
"Trang có một trong các từ:": "Page contains any of the words:",
"Trang có đủ các từ:": "Page contains all of the words:",
"Trang này gần như không có chữ để đọc.": "This page has almost no text to read.",
"Trang này không có chữ để dịch.": "This page has no text to translate.",
"Trang đang ẩn HaoHao": "Sites where HaoHao is hidden",
"Trên 300k": "Over 300k",
"Trên Shopee, HaoHao chấm điểm tin cậy sản phẩm và shop": "On Shopee, HaoHao scores product and shop trust",
"Trên Shopee, luôn hiện bong bóng kết quả kiểm tra (tắt thì chỉ còn điểm nhỏ trên đầu HaoHao)": "On Shopee, always show the check result bubble (off = only the small score above HaoHao)",
"Tua tới": "Jump to",
"Tuỳ chỉnh Pomodoro": "Pomodoro settings",
"Tuỳ chỉnh giờ nghỉ, trang xao nhãng": "Customize breaks, distracting sites",
"Tài khoản Gmail": "Gmail account",
"Tài khoản:": "Account:",
"Tên gợi nhớ": "Nickname",
"Tên lịch nhắc": "Reminder name",
"Tìm": "Search",
"Tìm sản phẩm": "Find products",
"Tìm trên TikTok Shop ›": "Search on TikTok Shop ›",
"Tìm trên web": "Search the web",
"Tìm trên web hoặc gõ địa chỉ": "Search the web or type an address",
"Tìm ý tưởng": "Search ideas",
"Tóm tắt lại": "Summarize again",
"Tóm tắt trang này": "Summarize this page",
"Tăng ít nhất (% trong 24h)": "Rise at least (% in 24h)",
"Tạo mã GitHub (làm 1 lần)": "Create a GitHub token (one time)",
"Tải file sao lưu": "Download backup file",
"Tất cả": "All",
"Tới giờ đi đón con rồi!": "Time to pick up the kids!",
"Từ giờ": "From",
"Tự nhận ngôn ngữ, dịch sang": "Auto-detect language, translate to",
"Tự tóm tắt mỗi khi mở video YouTube": "Auto-summarize when opening a YouTube video",
"Tự tạo sẵn gợi ý khi lưu (vẫn ẩn, bấm ✨ mới hiện)": "Prepare suggestions when saving (hidden until you click ✨)",
"Uống một ly nước nhé!": "Have a glass of water!",
"Uống nước": "Drink water",
"Uống thuốc": "Take medicine",
"Việc cần làm": "To-do",
"Vào mục": "Go to",
"Ví dụ: Kèo meme Solana": "e.g. Solana meme play",
"Ví dụ: Uống thuốc huyết áp": "e.g. Blood pressure pills",
"Về danh sách tiện ích": "Back to tools",
"Vừa báo": "Just notified",
"Xem giá hiện tại": "See current price",
"Xem kiểm tra": "View check",
"Xem kiểm tra shop này": "View this shop's check",
"Xem trên Shopee ›": "View on Shopee ›",
"Xem tất cả trên Shopee ›": "See all on Shopee ›",
"Xin chào, tôi là trợ lý HaoHao 👋": "Hi, I'm HaoHao, your assistant 👋",
"Xong rồi ✓": "Done ✓",
"Xong. Sửa lại nếu cần rồi bấm Lưu.": "Done. Edit if needed, then click Save.",
"Xoá": "Delete",
"Xoá cảnh báo": "Delete alert",
"Xoá hết việc đã xong": "Clear finished tasks",
"Xoá lịch sử tìm": "Clear search history",
"Xoá nhật ký": "Clear log",
"Xoá thông báo": "Clear notifications",
"Xoá việc": "Delete task",
"Xấu, không giống hình": "Ugly, not as pictured",
"Yêu thích": "Preferred",
"bài đăng Facebook": "Facebook post",
"báo giá, hợp đồng, xây nhà": "quote, contract, building a house",
"bảy": "Saturday",
"chi tiết (khoảng 400 đến 600 chữ)": "detailed (about 400 to 600 words)",
"chiều": "afternoon",
"chưa có mã (bấm Lưu trước)": "no key yet (click Save first)",
"chưa có mã GitHub (dán mã rồi bấm Lưu mã)": "no GitHub token yet (paste it and click Save token)",
"chưa lưu mã ứng dụng.": "app ID not saved yet.",
"chưa thấy file coupons.json trên nhánh main": "coupons.json not found on the main branch",
"chưa tới 1 tháng": "less than 1 month",
"cuối tháng": "end of month",
"giá ≤": "price ≤",
"giá ≥": "price ≥",
"giảm ≥": "drop ≥",
"giảm ≥ %": "drop ≥ %",
"giờ": "hour",
"hết lượt miễn phí, thử lại sau": "free quota used up, try again later",
"khác dung lượng/khối lượng": "different capacity/weight",
"khác loại (": "different type (",
"khác loại hàng": "different product type",
"khác mã model": "different model code",
"khác phiên bản": "different version",
"khác số hiệu": "different number",
"khác số lượng trong gói": "different pack size",
"khác thương hiệu": "different brand",
"không ghi rõ dung lượng": "capacity not stated",
"không đọc được tên": "could not read the name",
"lỗi": "error",
"lỗi không rõ": "unknown error",
"mã GitHub chưa có quyền ghi (Contents: Read and write)": "GitHub token lacks write access (Contents: Read and write)",
"mã GitHub không đúng hoặc đã hết hạn": "GitHub token is wrong or expired",
"mã không đúng": "wrong key",
"mùng": "day",
"mùng 1": "1st day",
"mạng xã hội": "social media",
"mốc": "level",
"ngày": "day",
"ngân hàng, @congty.vn, anh Tùng": "bank, @company.com, Mr. Tung",
"năm": "year",
"nội dung trang web này": "this web page",
"phút": "min",
"phút sau mỗi 4 phiên": "min after every 4 sessions",
"phút · nghỉ dài": "min · long break",
"phút, từ": "min, from",
"phụ kiện khác món": "different item (accessory)",
"r.enabled).length} đang bật": "{1} on",
"rất ngắn (khoảng 80 chữ)": "very short (about 80 words)",
"rằm (14)": "full moon (14)",
"rằm (15)": "full moon (15)",
"rồi bấm": "then click",
"rồi sao chép mã.": "then copy the key.",
"shop này": "this shop",
"sáng": "morning",
"sáu": "Friday",
"tháng": "month",
"tiếng Anh (English)": "English",
"tiếng Hàn (한국어)": "Korean (한국어)",
"tiếng Nhật (日本語)": "Japanese (日本語)",
"tiếng Trung giản thể (中文)": "Simplified Chinese (中文)",
"tiếng Việt": "Vietnamese",
"trang App registrations của Microsoft": "Microsoft App registrations page",
"trưa": "noon",
"tuần": "week",
"tài liệu PDF này": "this PDF document",
"tên khác nhiều": "names differ too much",
"tăng ≥": "rise ≥",
"tăng ≥ %": "rise ≥ %",
"tư": "Wednesday",
"tối": "evening",
"video YouTube này": "this YouTube video",
"ví dụ 8, 18, 23": "e.g. 8, 18, 23",
"vừa phải (khoảng 150 đến 250 chữ)": "medium (about 150 to 250 words)",
"© 2026 HaoHao · Bản quyền thuộc": "© 2026 HaoHao · Copyright",
"© 2026 HaoHao · Bản quyền thuộc Phan Thanh Nhật ·": "© 2026 HaoHao · Copyright Phan Thanh Nhật ·",
"· Liên hệ:": "· Contact:",
"Âm lịch": "Lunar calendar",
"Ít đánh giá, chưa đủ để tin": "Few reviews, not enough to trust",
"Ý tưởng": "Ideas",
"Ăn chay": "Vegetarian",
"Đang bỏ…": "Removing…",
"Đang kiểm tra…": "Checking…",
"Đang lấy giá…": "Getting price…",
"Đang mở Shopee…": "Opening Shopee…",
"Đang mở cửa sổ đăng nhập Microsoft…": "Opening the Microsoft sign-in window…",
"Đang mở cửa sổ đăng nhập…": "Opening the sign-in window…",
"Đang nghĩ tiêu đề và caption…": "Thinking of a title and caption…",
"Đang nghĩ…": "Thinking…",
"Đang nghỉ": "On break",
"Đang thử…": "Testing…",
"Đang tìm các shop bán cùng món…": "Finding shops selling the same item…",
"Đang tìm đúng món này trên Shopee…": "Finding this exact item on Shopee…",
"Đang tạm dừng": "Paused",
"Đang tập trung": "Focusing",
"Đang đọc kết quả tìm kiếm Shopee…": "Reading Shopee search results…",
"Đang đọc link và cập nhật…": "Reading links and updating…",
"Điều kiện": "Conditions",
"Điểm tin cậy sản phẩm & shop": "Product & shop trust score",
"Đáng tin": "Trustworthy",
"Đánh dấu quan trọng": "Mark as important",
"Đánh dấu xong:": "Mark done:",
"Đánh giá tham khảo, dựa trên thông tin công khai trên trang.": "Reference rating, based on public information on the page.",
"Đã chép ✓": "Copied ✓",
"Đã copy ✓": "Copied ✓",
"Đã có mã.": "Key saved.",
"Đã dịch hết phần chữ trên trang.": "All text on the page is translated.",
"Đã dừng nghe": "Stopped listening",
"Đã lưu mã GitHub.": "GitHub token saved.",
"Đã lưu mã. Bấm \"Đăng nhập Outlook\".": "Key saved. Click \"Sign in to Outlook\".",
"Đã lưu note kèm link trang.": "Note saved with the page link.",
"Đã lưu vào kho ý tưởng 💡": "Saved to your ideas 💡",
"Đã lưu.": "Saved.",
"Đã lưu. Bấm \"Đăng nhập Outlook\".": "Saved. Click \"Sign in to Outlook\".",
"Đã nạp": "Loaded",
"Đã thêm vào Todolist ✅": "Added to your to-do list ✅",
"Đã thêm ✓": "Added ✓",
"Đã xem ✓": "Viewed ✓",
"Đã xong": "Done",
"Đã xong ✓": "Done ✓",
"Đã đặt cảnh báo:": "Alert set:",
"Đón con": "School pick-up",
"Đóng": "Close",
"Đăng nhập Outlook": "Sign in to Outlook",
"Đăng nhập chưa được:": "Sign-in failed:",
"Đăng nhập tài khoản khác": "Sign in with another account",
"Đăng xuất": "Sign out",
"Đưa HaoHao về góc phải": "Move HaoHao back to the right",
"Được, 10 phút nữa HaoHao nhắc lại nhé.": "OK, HaoHao will remind you again in 10 minutes.",
"Đặt": "Set",
"Đặt nhắc": "Set reminder",
"Đến giờ": "Due",
"Đến giờ uống thuốc rồi": "Time to take your medicine",
"Để sau": "Later",
"Để trống: tự chọn": "Leave empty: auto",
"Địa chỉ token": "Token address",
"Đọc cả trang": "Read whole page",
"Đọc hộ": "Read for me",
"Đọc xong rồi! Bấm vào đây để xem tóm tắt.": "Done reading! Click here to see the summary.",
"Đủ nhiều đánh giá để tham khảo": "Enough reviews to go on",
"Đứng dậy, uống nước, cho mắt nghỉ": "Stand up, drink water, rest your eyes",
"đ": "₫",
"đang lấy giá…": "getting price…",
"đang tắt": "off",
"điều kiện.": "conditions.",
"đoạn văn bản này": "this passage",
"đêm": "night",
"đến": "to",
"Ưu đãi": "Deals",
"Ẩn": "Hide",
"Ẩn trên trang này": "Hide on this site",
"‹ Tiện ích": "‹ Tools",
"→ chọn": "→ choose",
"↩ Xem bản gốc": "↩ Show original",
"↻ Gợi ý lại": "↻ Suggest again",
"⏳ Kết quả nhanh ·": "⏳ Quick results ·",
"⏳ Đang đọc toàn bộ đánh giá…": "⏳ Reading all reviews…",
"⏳ Đang đọc đánh giá 1–2★…": "⏳ Reading 1–2★ reviews…",
"⏸ Tạm dừng": "⏸ Pause",
"⏹ Dừng": "⏹ Stop",
"⏹ Dừng dịch": "⏹ Stop translating",
"▶ Bắt đầu": "▶ Start",
"▶ Làm tiếp": "▶ Continue",
"▶ Tiếp tục": "▶ Resume",
"▶ Vào phiên tiếp": "▶ Next session",
"☑️ Thêm vào Todo": "☑️ Add to Todo",
"☑️ Việc cần làm": "☑️ To-do",
"☕ Nghỉ": "☕ Break",
"☕ Nghỉ dài": "☕ Long break",
"☕ Nghỉ giải lao": "☕ Take a break",
"⚙ Tuỳ chỉnh": "⚙ Customize",
"⚙ Ẩn tuỳ chỉnh": "⚙ Hide settings",
"⚠ Chưa gợi ý được:": "⚠ Could not suggest:",
"⚠ Chưa rõ số bán": "⚠ Sold count unknown",
"⚠ Chưa đăng nhập Gmail trên Chrome này, hoặc sai số thứ tự tài khoản.": "⚠ Not signed in to Gmail on this Chrome, or wrong account number.",
"⚠ Chưa đăng nhập Outlook, hoặc phiên đã hết hạn.": "⚠ Not signed in to Outlook, or the session expired.",
"⚠ Chưa đăng nhập được:": "⚠ Could not sign in:",
"⚠ Chưa được:": "⚠ Not yet:",
"⚠ Không lấy được hộp thư (mất mạng?). HaoHao sẽ thử lại sau 1 phút.": "⚠ Could not load the inbox (offline?). HaoHao will retry in 1 minute.",
"⚠ Kiểm tra": "⚠ Check",
"⚡ Ngắn": "⚡ Short",
"✂ Dịch đoạn bôi đen": "✂ Translate highlighted text",
"✅ Hoàn thành việc": "✅ Task done",
"✅ Thêm vào Todolist": "✅ Add to to-do list",
"✈ Hàng nước ngoài": "✈ Overseas item",
"✏️ Tự tạo lịch nhắc": "✏️ Create your own reminder",
"✓ Đang đăng nhập:": "✓ Signed in:",
"✓ Đã bỏ.": "✓ Removed.",
"✕ Đóng mẫu": "✕ Close templates",
"✨ Gợi ý": "✨ Suggest",
"✨ Tóm tắt": "✨ Summarize",
"✨ Tóm tắt trang này": "✨ Summarize this page",
"✨ Xem gợi ý": "✨ See suggestions",
"✨ Ẩn gợi ý": "✨ Hide suggestions",
"❤ Yêu thích": "❤ Preferred",
"➕ Thêm vào HaoHao": "➕ Add to HaoHao",
"⭐ Đáng mua nhất": "⭐ Best buy",
"＋ Mẫu có sẵn": "＋ Templates",
"🇻🇳 Tiếng Việt": "🇻🇳 Vietnamese",
"🌐 Dịch": "🌐 Translate",
"🌐 Dịch trang": "🌐 Translate page",
"🌐 Xem bản dịch": "🌐 Show translation",
"🌙 Âm lịch": "🌙 Lunar calendar",
"🍅 Bắt đầu": "🍅 Start",
"🍅 Tập trung": "🍅 Focus",
"🍅 Đang tập trung": "🍅 Focusing",
"🍅 Ơ kìa!": "🍅 Oops!",
"🎟️ Copy mã & mua ngay": "🎟️ Copy code & buy now",
"🎟️ Lấy mã & mua ngay": "🎟️ Get code & buy now",
"🎟️ Mã giảm giá": "🎟️ Vouchers",
"🏪 Uy tín shop": "🏪 Shop trust",
"🏬 Uy tín nhất": "🏬 Most trusted",
"🏷️ Mã của shop trên trang này": "🏷️ Shop vouchers on this page",
"🐹 App HaoHao 3D đang chạy: nhắc nhở sẽ do con hamster 3D gõ cửa.": "🐹 HaoHao 3D app is running: the 3D hamster will knock for reminders.",
"🐹 Đã đặt nhắc": "🐹 Reminder set",
"👇 Kéo xuống phần thông tin shop để HaoHao chấm uy tín shop.": "👇 Scroll down to the shop info so HaoHao can rate the shop.",
"👇 Kéo xuống phần Đánh giá sản phẩm để HaoHao đọc thêm (tỉ lệ sao, đánh giá có ảnh, đánh giá ảo).": "👇 Scroll down to Product Ratings so HaoHao can read more (star mix, photo reviews, fake reviews).",
"👶 Dễ hiểu": "👶 Simple",
"💡 Giải thích": "💡 Explain",
"💡 Lưu vào kho ý tưởng": "💡 Save to ideas",
"💧 Uống một ly nước nhé!": "💧 Have a glass of water!",
"💬 Gõ câu hỏi về nội dung này rồi bấm Enter…": "💬 Type a question about this content and press Enter…",
"💬 Người mua chê gì": "💬 What buyers complain about",
"💬 Đang đọc toàn bộ đánh giá…": "💬 Reading all reviews…",
"💰 Rẻ nhất": "💰 Cheapest",
"📄 Dịch file PDF này": "📄 Translate this PDF",
"📅 Sắp tới": "📅 Upcoming",
"📋 Thường": "📋 Normal",
"📌 Ví dụ": "📌 Examples",
"📖 Đọc hộ (Gemini)": "📖 Read for me (Gemini)",
"📝 Lưu Note": "📝 Save note",
"📝 Đã lưu note + 🔔 đặt nhắc": "📝 Note saved + 🔔 reminder set",
"📦 Chất lượng sản phẩm": "📦 Product quality",
"📧 Email đang mở": "📧 Open emails",
"📧 Đăng nhập Outlook / Hotmail (thiết lập 1 lần)": "📧 Sign in to Outlook / Hotmail (one-time setup)",
"📰 Dịch cả trang": "📰 Translate whole page",
"🔄 Thử lại": "🔄 Retry",
"🔍 Tìm note…": "🔍 Search notes…",
"🔍 Tìm shop khác uy tín hơn": "🔍 Find a more trusted shop",
"🔍 Tìm shop rẻ hơn": "🔍 Find a cheaper shop",
"🔍 Đang so giá với các shop khác…": "🔍 Comparing prices with other shops…",
"🔎 Tìm sản phẩm trên Shopee": "🔎 Search products on Shopee",
"🔎 Đọc thêm đánh giá 1–2★": "🔎 Read more 1–2★ reviews",
"🔔 Nhắc": "🔔 Remind",
"🔔 Nhắc nhở": "🔔 Reminders",
"🔔 Nhắc tôi": "🔔 Remind me",
"🔔 Nhắc tôi: “%s”": "🔔 Remind me: “%s”",
"🔔 Nhắc tôi… (vd: 15h mai gửi báo giá, 30 phút nữa gọi anh Nam)": "🔔 Remind me… (e.g. 3pm tomorrow send the quote, in 30 minutes call Nam)",
"🔔 Đã đặt nhắc": "🔔 Reminder set",
"🔖 Lưu trang này": "🔖 Save this page",
"🔗 Nút mua, lấy mã và tìm trên Shopee, TikTok Shop dùng link tiếp thị: HaoHao có thể nhận hoa hồng khi bạn mua, bạn không phải trả thêm.": "🔗 Buy, voucher and Shopee/TikTok Shop search buttons use affiliate links: HaoHao may earn a commission when you buy, at no extra cost to you.",
"🛍️ HaoHao tuyển chọn: món tương tự": "🛍️ HaoHao picks: similar items",
"🛍️ Hàng HaoHao tuyển chọn": "🛍️ HaoHao picks",
"🛍️ Link TikTok của tôi (dành cho chủ app)": "🛍️ My TikTok links (for the app owner)",
"🛍️ Mua sắm": "🛍️ Shopping",
"🛒 Chưa có mã giảm giá cho món này": "🛒 No vouchers for this item yet",
"🛒 GIẢM GIÁ RỒI!": "🛒 PRICE DROP!",
"🛒 Săn deal": "🛒 Deal hunting",
"🛒 Tìm trên Shopee: “%s”": "🛒 Search on Shopee: “%s”",
"🛡️ Kiểm tra": "🛡️ Check",
"🟠 Cùng sản phẩm trên Shopee": "🟠 Same product on Shopee",
"🧠 Chi tiết": "🧠 Detailed",
"với bộ lọc này": "with these filters",
"(gồm các đánh giá 1–2★)": "(including 1–2★ reviews)",
"đang hiện trên trang": "shown on the page",
"nhuận": "leap",
"hôm nay": "today",
"ngày mai": "tomorrow",
"xem": "watching",
"đọc": "reading",
"nghỉ dài": "a long break",
"nghỉ": "a break",
"(mã của shop, bấm Lưu trên trang)": "(shop voucher, click Save on the page)",
"Chủ nhật": "Sunday",
"Thứ hai": "Monday",
"Thứ ba": "Tuesday",
"Thứ tư": "Wednesday",
"Thứ năm": "Thursday",
"Thứ sáu": "Friday",
"Thứ bảy": "Saturday",
"Tập trung": "Focus",
"Kiểm tra": "Check",
"Tìm shop rẻ hơn": "Find a cheaper shop",
"Tìm kiếm": "Search",
"Đang theo dõi": "Tracking",
"Giá": "Price",
"Cài đặt": "Settings",
"Ghi chú": "Notes",
"Mã giảm giá": "Vouchers"
};
  const P = [["^📝 Todolist của bạn \\((\\d+) việc\\)$", "📝 Your to-do list ({1} tasks)"],
["^và (\\d+) việc khác$", "and {1} more"],
["^YouTube: đã bỏ qua (\\d+) quảng cáo video, ẩn (\\d+) ô quảng cáo$", "YouTube: skipped {1} video ads, hid {2} ad slots"],
["^(.+): không chặn \\(trang mua sắm của HaoHao\\)$", "{1}: not blocked (HaoHao shopping site)"],
["^(.+): đã tắt chặn$", "{1}: blocking off"],
["^(.+): đang chặn$", "{1}: blocking"],
["^Đã ẩn (\\d+) khung quảng cáo trên trang này$", "Hid {1} ad boxes on this page"],
["^🌙 (\\d+)/(\\d+) ÂL · hôm nay rằm$", "🌙 {1}/{2} lunar · full moon today"],
["^🌙 (\\d+)/(\\d+) ÂL · rằm còn (\\d+) ngày$", "🌙 {1}/{2} lunar · full moon in {3} days"],
["^(\\d+) đang bật$", "{1} on"],
["^Cứ (\\d+) phút, từ (.+) đến (.+)$", "Every {1} min, from {2} to {3}"],
["^Cứ (\\d+) phút một lần, từ (.+) đến (.+)$", "Every {1} minutes, from {2} to {3}"],
["^📧 Canh email · (đang tắt|đang bật)(.*)$", "📧 Email watch · {1}{2}"],
["^Sửa (.+)$", "Edit {1}"],
["^Xoá (.+)$", "Delete {1}"],
["^(Chủ nhật|Thứ hai|Thứ ba|Thứ tư|Thứ năm|Thứ sáu|Thứ bảy), ([\\d/]+)$", "{1}, {2}"],
["^(.+) giá ([≥≤]) (.+)$", "{1} price {2} {3}"],
["^(.+) · (Đáng tin|Khá ổn|Cân nhắc|Rủi ro) (\\d+)/100$", "{1} · {2} {3}/100"],
[
"^So\\ trong\\ (.*?)\\ shop\\ bán\\ đúng\\ cùng\\ sản\\ phẩm\\ \\(cùng\\ hãng,\\ mã,\\ dung\\ lượng,\\ phiên\\ bản\\)\\.\\ Giá\\ chưa\\ gồm\\ mã\\ giảm\\ và\\ phí\\ ship\\.$",
"Compared across {1} shops selling the exact same product (same brand, model, capacity, version). Prices exclude vouchers and shipping."
],
[
"^Có\\ (.*?)\\ món\\ nhưng\\ đều\\ là\\ shop\\ rủi\\ ro\\ \\(mới\\ mở,\\ bán\\ ít,\\ hàng\\ nước\\ ngoài\\)\\.\\ Xem\\ trên\\ Shopee\\ để\\ tự\\ chọn\\.$",
"{1} items found but all from risky shops (new, few sales, overseas). Browse on Shopee to choose yourself."
],
[
"^Đã\\ copy\\ mã\\.\\ Món\\ này\\ chưa\\ đủ\\ đơn\\ tối\\ thiểu\\ (.*?),\\ mua\\ kèm\\ thêm\\ để\\ dùng\\ mã\\ nhé\\.$",
"Code copied. This item is below the minimum order {1}, add more items to use it."
],
[
"^Đã\\ thêm\\ \"(.*?)\"\\ vào\\ Todo\\.\\ Chưa\\ thấy\\ giờ\\ trong\\ câu,\\ bạn\\ bấm\\ ⏰\\ để\\ hẹn\\ giờ\\ nhé\\.$",
"Added \"{1}\" to Todo. No time found in the sentence, click ⏰ to set one."
],
[
"^Đã\\ thêm\\ \"(.*?)\"\\ vào\\ Todo\\.\\ Chưa\\ thấy\\ giờ\\ trong\\ câu,\\ bấm\\ vào\\ đây\\ để\\ hẹn\\ giờ\\.$",
"Added \"{1}\" to Todo. No time found in the sentence, click here to set one."
],
[
"^Lọc\\ từ\\ (.*?)\\ món:\\ đã\\ bỏ\\ (.*?)\\ shop\\ rủi\\ ro,\\ kiểm\\ tra\\ kỹ\\ các\\ shop\\ còn\\ lại\\.$",
"Filtered from {1} items: dropped {2} risky shops, checked the rest carefully."
],
[
"^Không\\ tìm\\ thấy\\ coin\\ \"(.*?)\"\\.\\ Thử\\ ký\\ hiệu\\ khác\\ \\(vd:\\ BTC,\\ ETH\\)\\.$",
"Coin \"{1}\" not found. Try another symbol (e.g. BTC, ETH)."
],
[
"^Chưa\\ thấy\\ lời\\ chê\\ trong\\ (.*?)\\ đánh\\ giá\\ HaoHao\\ đọc\\ được\\.$",
"No complaints in the {1} reviews HaoHao could read."
],
[
"^👍\\ Giá\\ TikTok\\ đang\\ rẻ\\ hơn\\ (.*?)\\ shop\\ Shopee\\ bán\\ cùng\\ món$",
"👍 TikTok price is cheaper than {1} Shopee shops selling the same item"
],
[
"^Đã\\ dịch\\ (.*?)\\ đoạn\\ ngay\\ trên\\ trang,\\ giữ\\ nguyên\\ bố\\ cục\\.$",
"Translated {1} parts right on the page, layout kept."
],
[
"^👍\\ Giá\\ ở\\ đây\\ đang\\ rẻ\\ nhất\\ trong\\ (.*?)\\ shop\\ bán\\ cùng\\ món$",
"👍 This is the cheapest price among {1} shops selling the same item"
],
[
"^💬\\ Đánh\\ giá\\ nổi\\ bật\\ ·\\ (.*?)\\ đánh\\ giá\\ không\\ thấy\\ lời\\ chê$",
"💬 Highlighted reviews · {1} reviews without complaints"
],
[
"^Kiểm\\ tra\\ sản\\ phẩm\\ \\&\\ shop:\\ (.*?)/100\\ ·\\ (.*?)\\.\\ Bấm\\ để\\ xem$",
"Product & shop check: {1}/100 · {2}. Click to view"
],
[
"^HaoHao\\ đã\\ đọc\\ (.*?)\\ đánh\\ giá,\\ gồm\\ (.*?)\\ đánh\\ giá\\ 1–2★\\.$",
"HaoHao read {1} reviews, including {2} 1–2★ reviews."
],
[
"^(.*?)%\\ đánh\\ giá\\ 1–2★,\\ nhiều\\ người\\ không\\ hài\\ lòng$",
"{1}% 1–2★ reviews, many unhappy buyers"
],
[
"^Chỉ\\ (.*?)★\\ \\((.*?)\\ đánh\\ giá\\),\\ thấp\\ hơn\\ mặt\\ bằng\\ Shopee$",
"Only {1}★ ({2} reviews), below the Shopee average"
],
[
"^Đọc\\ (.*?)\\ đánh\\ giá\\ đang\\ hiện:\\ không\\ thấy\\ lời\\ chê$",
"Read {1} visible reviews: no complaints found"
],
[
"^☕\\ Hết\\ giờ\\ nghỉ!\\ Tự\\ vào\\ phiên\\ (.*?),\\ cố\\ lên\\ nhé\\ 💪$",
"☕ Break over! Starting session {1}, you've got this 💪"
],
[
"^(.*?)\\ đánh\\ giá\\ giống\\ hệt\\ nhau,\\ nghi\\ đánh\\ giá\\ ảo$",
"{1} identical reviews, possibly fake"
],
[
"^(.*?)★\\ nhưng\\ chỉ\\ (.*?)\\ đánh\\ giá,\\ điểm\\ cao\\ bất\\ thường$",
"{1}★ but only {2} reviews, unusually high"
],
[
"^Đang\\ dịch\\ (.*?)/(.*?)\\ đoạn…\\ Chữ\\ trên\\ trang\\ đổi\\ dần\\.$",
"Translating {1}/{2} parts… The text on the page changes gradually."
],
[
"^☕\\ Hết\\ giờ\\ nghỉ!\\ Sẵn\\ sàng\\ vào\\ phiên\\ (.*?)\\ chưa\\?$",
"☕ Break over! Ready for session {1}?"
],
[
"^Đã\\ copy\\ mã\\ (.*?)\\.\\ Dán\\ ở\\ bước\\ thanh\\ toán\\ nhé\\.$",
"Copied code {1}. Paste it at checkout."
],
[
"^📝\\ Bạn\\ có\\ (.*?)\\ việc\\ đang\\ chờ\\ trong\\ Todolist$",
"📝 You have {1} tasks waiting in your to-do list"
],
[
"^Trang\\ đã\\ là\\ (.*?)\\?\\ Bấm\\ lần\\ nữa\\ để\\ vẫn\\ dịch$",
"The page is already in {1}? Click again to translate anyway"
],
[
"^(.*?)\\ cần\\ mã\\ Gemini\\ \\(miễn\\ phí,\\ làm\\ 1\\ lần\\)$",
"{1} needs a Gemini key (free, one-time setup)"
],
[
"^Đã\\ đọc\\ (.*?)\\ đánh\\ giá,\\ gồm\\ (.*?)\\ đánh\\ giá\\ 1–2★$",
"Read {1} reviews, including {2} 1–2★ reviews"
],
[
"^Hàng\\ gửi\\ từ\\ (.*?):\\ giao\\ lâu,\\ khó\\ đổi\\ trả$",
"Ships from {1}: slow delivery, hard to return"
],
[
"^✓\\ Đã\\ kết\\ nối(.*?):\\ (.*?)\\ thư\\ chưa\\ đọc\\ \\(lúc\\ (.*?)\\)\\.$",
"✓ Connected{1}: {2} unread emails (at {3})."
],
[
"^Giá\\ 30\\ ngày:\\ thấp\\ nhất\\ (.*?),\\ cao\\ nhất\\ (.*?)$",
"30-day price: lowest {1}, highest {2}"
],
[
"^👍\\ Giá\\ này\\ đang\\ rẻ\\ nhất\\ trong\\ (.*?)\\ shop$",
"👍 This is the cheapest price among {1} shops"
],
[
"^(.*?)/(.*?)\\ đánh\\ giá\\ đang\\ hiện\\ có\\ lời\\ chê:\\ (.*?)$",
"{1}/{2} visible reviews have complaints: {3}"
],
[
"^Đọc\\ (.*?)\\ đánh\\ giá:\\ không\\ thấy\\ lời\\ chê$",
"Read {1} reviews: no complaints found"
],
[
"^©\\ (.*?)\\ HaoHao\\ ·\\ Bản\\ quyền\\ thuộc\\ (.*?)\\ ·\\ (.*?)$",
"© {1} HaoHao · Copyright {2} · {3}"
],
[
"^Đang\\ kiểm\\ tra\\ kỹ\\ từng\\ shop\\ \\((.*?)/(.*?)\\)…$",
"Checking each shop carefully ({1}/{2})…"
],
[
"^(.*?)\\ đang\\ ở\\ \\$(.*?)\\ \\(24h\\ (.*?)\\)\\.\\ Điều\\ kiện:\\ (.*?)$",
"{1} is at ${2} (24h {3}). Condition: {4}"
],
[
"^✓\\ Dùng\\ được\\ cho\\ món\\ này:\\ còn\\ (.*?)$",
"✓ Works for this item: now {1}"
],
[
"^✓\\ Kết\\ nối\\ Gemini\\ được\\ \\(mẫu\\ (.*?)\\)\\.$",
"✓ Connected to Gemini (model {1})."
],
[
"^Đã\\ bán\\ (.*?),\\ rất\\ nhiều\\ người\\ mua$",
"Sold {1}, very popular"
],
[
"^⚠\\ (.*?)\\ việc\\ quá\\ hạn\\ chưa\\ xử\\ lý:\\ (.*?)$",
"⚠ {1} overdue tasks: {2}"
],
[
"^💬\\ Người\\ mua\\ chê\\ \\((.*?)/(.*?)\\ đánh\\ giá\\)$",
"💬 Buyer complaints ({1}/{2} reviews)"
],
[
"^🔔\\ Cảnh\\ báo\\ giá\\ ·\\ (.*?)/(.*?)\\ đang\\ bật\\ (.*?)$",
"🔔 Price alerts · {1}/{2} on {3}"
],
[
"^(.*?)\\ đánh\\ giá\\ có\\ ảnh/video\\ thật$",
"{1} reviews with real photos/videos"
],
[
"^💬\\ Người\\ mua\\ chê\\ ·\\ (.*?)\\ đánh\\ giá$",
"💬 Buyer complaints · {1} reviews"
],
[
"^(.*?)!\\ Bấm\\ vào\\ tôi\\ khi\\ cần\\ nhé\\.$",
"{1}! Click me whenever you need."
],
[
"^Chưa\\ thấy\\ món\\ nào\\ đúng\\ “(.*?)”(.*?)\\.$",
"Nothing matches “{1}”{2}."
],
[
"^Shop\\ mới\\ có\\ (.*?)\\ lượt\\ đánh\\ giá$",
"Shop has only {1} ratings"
],
[
"^⏱️\\ Tiết\\ kiệm\\ khoảng\\ (.*?)\\ phút\\ (.*?)$",
"⏱️ Saved about {1} minutes of {2}"
],
[
"^Giá\\ sau\\ mã\\ tốt\\ nhất\\ ≈\\ (.*?)\\ \\((.*?)\\)$",
"Best price after voucher ≈ {1} ({2})"
],
[
"^,\\ nhắc\\ trước\\ 1\\ ngày\\ lúc\\ (.*?)$",
", reminder 1 day before at {1}"
],
[
"^Chỉ\\ (.*?)\\ người\\ theo\\ dõi\\ shop$",
"Only {1} shop followers"
],
[
"^Cần\\ mua\\ thêm\\ (.*?)\\ để\\ dùng\\ mã$",
"Buy {1} more to use this voucher"
],
[
"^Đang\\ bị\\ đẩy\\ giá\\ trước\\ (.*?)\\ ⚠$",
"Price pushed up before {1} ⚠"
],
[
"^Đang\\ tìm\\ “(.*?)”\\ trên\\ Shopee…$",
"Searching “{1}” on Shopee…"
],
[
"^Điểm\\ thấp:\\ (.*?)★\\ \\((.*?)\\ đánh\\ giá\\)$",
"Low rating: {1}★ ({2} reviews)"
],
[
"^🛒\\ Mua\\ món\\ này\\ chỉ\\ còn\\ ≈\\ (.*?)$",
"🛒 Buy this for only ≈ {1}"
],
[
"^Chỉ\\ phản\\ hồi\\ (.*?)%\\ tin\\ nhắn$",
"Replies to only {1}% of messages"
],
[
"^Mới\\ bán\\ (.*?),\\ ít\\ người\\ mua$",
"Only {1} sold, few buyers"
],
[
"^Âm\\ lịch:\\ (.*?)\\ tháng\\ (.*?)(.*?)\\ năm\\ (.*?)\\ (.*?)$",
"Lunar: {1} of month {2}{3}, year {4} {5}"
],
[
"^⚙\\ Tuỳ\\ chỉnh\\ cách\\ nhắc\\ (.*?)$",
"⚙ Reminder settings {1}"
],
[
"^📺\\ Lưu\\ video\\ này\\ \\(tại\\ (.*?)\\)$",
"📺 Save this video (at {1})"
],
[
"^Cốc\\ cốc!\\ Có\\ (.*?)\\ lời\\ nhắc$",
"Knock knock! {1} reminders"
],
[
"^HaoHao\\ đọc\\ (.*?)\\ đánh\\ giá(.*?)\\.$",
"HaoHao read {1} reviews{2}."
],
[
"^🔥\\ Có\\ shop\\ bán\\ rẻ\\ hơn\\ (.*?)$",
"🔥 A shop sells it {1} cheaper"
],
[
"^Tóm\\ tắt\\ đã\\ lưu\\ lúc\\ (.*?)\\.$",
"Summary saved at {1}."
],
[
"^·\\ nhắc\\ trước\\ 1\\ ngày\\ (.*?)$",
"· reminder 1 day before {1}"
],
[
"^🟠\\ Shopee\\ bán\\ rẻ\\ hơn\\ (.*?)$",
"🟠 Shopee sells it {1} cheaper"
],
[
"^(.*?)\\ lượt\\ đánh\\ giá\\ shop$",
"{1} shop ratings"
],
[
"^(.*?)\\ đánh\\ giá\\ chê\\ \\((.*?)%\\):\\ (.*?)$",
"{1} negative reviews ({2}%): {3}"
],
[
"^(.*?)★\\ điểm\\ đánh\\ giá\\ cao$",
"{1}★ high rating"
],
[
"^Chỉ\\ (.*?)%\\ đánh\\ giá\\ 1–2★$",
"Only {1}% 1–2★ reviews"
],
[
"^Sale\\ giữa\\ tháng\\ 15\\.(.*?)$",
"Mid-month sale 15.{1}"
],
[
"^📧\\ Và\\ (.*?)\\ email\\ mới\\ nữa$",
"📧 And {1} more new emails"
],
[
"^Shop\\ mới\\ tham\\ gia\\ (.*?)$",
"Shop joined {1} ago"
],
[
"^⏰\\ Sắp\\ tới\\ giờ:\\ (.*?)\\ \\((.*?)\\)$",
"⏰ Coming up: {1} ({2})"
],
[
"^🌙\\ (.*?)/(.*?)(.*?)\\ âm\\ lịch\\ ·\\ năm\\ (.*?)$",
"🌙 {1}/{2}{3} lunar · year {4}"
],
[
"^(.*?)\\ ·\\ ⚠\\ cần\\ kiểm\\ tra$",
"{1} · ⚠ needs checking"
],
[
"^(\\d+)\\ lựa\\ chọn\\ cho\\ “(.*?)”$",
"{1} picks for “{2}”"
],
[
"^Sale\\ lương\\ về\\ 25\\.(.*?)$",
"Payday sale 25.{1}"
],
[
"^Xoá\\ điều\\ kiện\\ “(.*?)”\\?$",
"Delete condition “{1}”?"
],
[
"^(.*?)\\ link\\ chưa\\ được:$",
"{1} links failed:"
],
[
"^Cứ\\ (.*?)\\ phút\\ một\\ lần$",
"Every {1} minutes"
],
[
"^Shop\\ được\\ chấm\\ (.*?)★$",
"Shop rated {1}★"
],
[
"^Điểm\\ uy\\ tín\\ shop(.*?)$",
"Shop trust score{1}"
],
[
"^🎟️\\ Có\\ mã:\\ còn\\ ≈\\ (.*?)$",
"🎟️ With voucher: ≈ {1}"
],
[
"^(.*?)%\\ đánh\\ giá\\ 1–2★$",
"{1}% 1–2★ reviews"
],
[
"^Hôm\\ nay\\ (.*?)\\ phiên\\ (.*?)$",
"Today {1} sessions {2}"
],
[
"^Lựa\\ chọn\\ cho\\ “(.*?)”$",
"Picks for “{1}”"
],
[
"^Shop\\ chỉ\\ được\\ (.*?)★$",
"Shop rated only {1}★"
],
[
"^Shop\\ hoạt\\ động\\ (.*?)$",
"Shop active for {1}"
],
[
"^Âm\\ lịch:\\ (.*?),\\ lúc\\ (.*?)$",
"Lunar: {1}, at {2}"
],
[
"^Đoạn\\ này\\ đã\\ là\\ (.*?)$",
"This text is already in {1}"
],
[
"^✓\\ Cùng\\ sản\\ phẩm(.*?)$",
"✓ Same product{1}"
],
[
"^✓\\ Đã\\ thêm\\ (.*?)\\ món\\.$",
"✓ Added {1} items."
],
[
"^(.*?)★\\ từ\\ (.*?)\\ đánh\\ giá$",
"{1}★ from {2} reviews"
],
[
"^Âm\\ lịch:\\ (.*?)\\ lúc\\ (.*?)$",
"Lunar: {1} at {2}"
],
[
"^Bật\\ hoặc\\ tắt\\ (.*?)$",
"Turn {1} on or off"
],
[
"^Một\\ lần,\\ lúc\\ (.*?)$",
"Once, at {1}"
],
[
"^và\\ (.*?)\\ việc\\ khác$",
"and {1} more tasks"
],
[
"^🔔\\ Lưu\\ \\+\\ nhắc\\ (.*?)$",
"🔔 Save + remind {1}"
],
[
"^(.*?)\\ ·\\ (.*?)\\ chưa\\ đọc$",
"{1} · {2} unread"
],
[
"^\\(Hôm\\ nay\\ (.*?),\\ (.*?)\\)$",
"(Today is {1}, {2})"
],
[
"^Lần\\ tới:\\ (.*?)\\ \\((.*?)\\)$",
"Next: {1} ({2})"
],
[
"^Mở\\ tiện\\ ích\\ (.*?)$",
"Open the {1} tool"
],
[
"^(.*?):(.*?)\\ ·\\ (.*?)\\ ·\\ (.*?)/(.*?)\\ ÂL$",
"{1}:{2} · {3} · {4}/{5} lunar"
],
[
"^(.*?)\\ ·\\ đang\\ bật$",
"{1} · on"
],
[
"^\\(Mai\\ là\\ (.*?),\\ (.*?)\\)$",
"(Tomorrow is {1}, {2})"
],
[
"^\\(chỉ\\ trên\\ (.*?)\\)$",
"(only on {1})"
],
[
"^Người\\ bán:\\ (.*?)$",
"Seller: {1}"
],
[
"^Đã\\ đặt:\\ (.*?)\\ (.*?)\\.\\ (.*?)$",
"Set: {1} {2}. {3}"
],
[
"^,\\ từ\\ (.*?)\\ đến\\ (.*?)$",
", from {1} to {2}"
],
[
"^Lần\\ tới:\\ (.*?)\\ (.*?)$",
"Next: {1} {2}"
],
[
"^Phản\\ hồi\\ (.*?)%(.*?)$",
"Replies {1}%{2}"
],
[
"^Đã\\ xong\\ \\((.*?)\\)$",
"Done ({1})"
],
[
"^⚠\\ Mới\\ bán\\ (.*?)$",
"⚠ Only {1} sold"
],
[
"^(.*?),\\ (.*?)\\ tháng\\ (.*?)$",
"{1}, {2}/{3}"
],
[
"^(.*?)\\ đánh\\ giá$",
"{1} reviews"
],
[
"^(.*?)/(.*?)\\ âm\\ lịch$",
"{1}/{2} lunar"
],
[
"^(.*?)/(.*?)(.*?)\\ âm\\ lịch$",
"{1}/{2}{3} lunar"
],
[
"^Dùng\\ mã:\\ (.*?)(.*?)(.*?)$",
"Use code: {1}{2}{3}"
],
[
"^Phiên\\ (.*?)\\ ·\\ (.*?)$",
"Session {1} · {2}"
],
[
"^·\\ đơn\\ từ\\ (.*?)$",
"· orders from {1}"
],
[
"^🔥\\ Rẻ\\ hơn\\ (.*?)$",
"🔥 {1} cheaper"
],
[
"^Cứ\\ (.*?)\\ phút$",
"Every {1} min"
],
[
"^toàn\\ bộ\\ (.*?)$",
"all {1}"
],
[
"^Gửi\\ từ\\ (.*?)$",
"Ships from {1}"
],
[
"^rẻ\\ hơn\\ (.*?)$",
"{1} cheaper"
],
[
"^Đã\\ bán\\ (.*?)$",
"Sold {1}"
],
[
"^Đã\\ bán\\ (.*?)$",
"Sold {1}"
],
[
"^Đã\\ bán\\ (.*?)$",
"Sold {1}"
],
[
"^Đã\\ bán\\ (.*?)$",
"Sold {1}"
],
[
"^(.*?)\\ tháng$",
"{1} months"
],
[
"^Giảm\\ (.*?)%(.*?)$",
"{1}% off{2}"
],
[
"^tối đa (.+)$",
"up to {1}"
],
[
"^Đã bán (.+)$",
"Sold {1}"
],
[
"^(.*?)\\ lúc\\ (.*?)$",
"{1} at {2}"
],
[
"^(.*?)\\ lúc\\ (.*?)$",
"{1} at {2}"
],
[
"^(.+) còn ([\\d.,]+ ?[đ₫])$",
"{1} now {2}"
],
[
"^Chỉ\\ (.*?)★$",
"Only {1}★"
],
[
"^Giảm\\ (.*?)$",
"{1} off"
],
[
"^(.*?)\\ năm$",
"{1} years"
],
[
"^Ngày (\\d+)$",
"Day {1}"
],
[
"^Mùng (\\d+)$",
"Day {1}"
],
[
"^(\\d+) phút$",
"{1} min"
],
[
"^Mở\\ (.*?)$",
"Open {1}"
],
[
"^(\\d+) giờ$",
"{1} h"
],
[
"^Còn (.+)$",
"{1} left"
]
].map(([r, t]) => [new RegExp(r, 's'), t]);
  HT.lang = HT.lang || 'vi';
  const one = (core, depth) => {
    if (!core) return null;
    if (Object.prototype.hasOwnProperty.call(D, core)) return D[core];
    if (depth > 1 || !/[^\x00-\x7F]/.test(core)) return null;
    for (const [re, t] of P) {
      const m = core.match(re); if (!m) continue;
      return t.replace(/\{(\d+)\}/g, (_, n) => { const g = m[+n] || ''; const c = g.trim(); const x = one(c, depth + 1); return x == null ? g : g.replace(c, x); });
    }
    return null;
  };
  // dịch 1 chuỗi (giữ khoảng trắng hai đầu); không có trong từ điển thì giữ nguyên
  HT.tr = s => { if (HT.lang !== 'en' || typeof s !== 'string') return s; const c = s.trim(); const x = one(c, 0); return x == null ? s : s.replace(c, x); };
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const fixNode = n => {
    if (n.nodeType === 3) { const v = n.nodeValue, t = HT.tr(v); if (t !== v) n.nodeValue = t; return; }
    if (n.nodeType !== 1) return;
    if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.isContentEditable) return;
    for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const t = HT.tr(v); if (t !== v) n.setAttribute(a, t); } }
    if ((n.tagName === 'INPUT' && /^(button|submit)$/i.test(n.type))) { const t = HT.tr(n.value); if (t !== n.value) n.value = t; }
  };
  const walk = root => {
    if (HT.lang !== 'en' || !root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    if (root.nodeType === 1) fixNode(root);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3 && n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)) continue;
      fixNode(n);
    }
  };
  HT.i18nApply = walk;
  // theo dõi 1 vùng (shadow root của HaoHao, hoặc cả trang Cài đặt / Tab mới): phần nào mới vẽ là dịch luôn
  HT.i18nWatch = root => {
    if (!root || root.__hhI18n) return; root.__hhI18n = true;
    walk(root);
    new MutationObserver(ms => {
      if (HT.lang !== 'en') return;
      for (const m of ms) {
        if (m.type === 'characterData') fixNode(m.target);
        else if (m.type === 'attributes') fixNode(m.target);
        else m.addedNodes.forEach(n => n.nodeType === 3 ? fixNode(n) : walk(n));
      }
    }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  HT.setLang = l => { HT.lang = l === 'en' ? 'en' : 'vi'; if (typeof document !== 'undefined' && document.documentElement) document.documentElement.lang = HT.lang; };
})();
