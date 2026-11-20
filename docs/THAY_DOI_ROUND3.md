# Thay đổi Round 3 (sau buổi chơi thử thứ 2)

Trạng thái: đã xong tới **phase 27b**. Còn lại: 28, 29 (hiệu ứng vũ khí), 30 (lá bài), 31 (tối ưu + con quay).
Ký hiệu: **[YC]** = người chơi yêu cầu · **[TQ]** = Claude tự quyết hoặc chỉnh thêm · **[CHƯA]** = chưa làm.

---

## 1. Điều khiển, cài đặt, HUD (phase 24)
- [YC] Độ nhạy cao hơn: tối đa **3 → 6**. [TQ] Con quay cũng nâng **3 → 5**.
- [YC] Sửa các cài đặt không chạy. [TQ] Lỗi gốc: menu tạm dừng dùng một bản cài đặt riêng nên kéo thanh trượt không có tác dụng tới khi đổi màn. Giờ chỉ còn một bản dùng chung, chỉnh là có tác dụng ngay. Hai nút trước đây chết hẳn là **hỗ trợ ngắm** và **Giữ/Chạm để đỡ**, giờ đã chạy.
- [YC] Bỏ cài đặt góc nhìn thứ 3. [TQ] Vẫn giữ trong cảnh dev để test hoạt ảnh.
- [YC] Chỉnh nút trong trận bị đè lên nút gốc → trình chỉnh giờ có **nền đen đặc**. [TQ] Bố cục chỉnh trong lúc tạm dừng được nạp lại ngay khi chơi tiếp.
- [YC] Thanh máu xấu chỗ → máu, thể lực, mạng chuyển xuống **giữa dưới**, không đè nút ở cả 3 kiểu 2/3/4 ngón.
- [YC] Nút Thoát trong trận hoạt động được (thoát là đóng phòng).
- [YC] Đổi vũ khí chạy được, nút hiện **1 / 2**. [TQ] Đổi mất **0,3 s**, không đánh được trong lúc đổi. Nút mờ đi khi tay kia trống.
- [YC] Ở bàn rèn: nút Đánh thành **ngọn lửa**, nút Đỡ thành **con mắt** (Nhập thần), xám khi thanh chưa đầy.
- [YC] Tốc độ tối đa giảm còn 75%:

| | Trước | Sau |
|---|---|---|
| Chạy | 9 m/s | 6,75 m/s |
| Trượt | 14 → 9 | 10,5 → 6,75 |
| Bật tường | 7,5 | 6 |

  [TQ] Khe nhảy trong sân tập thu từ 7,5 m còn 5,6 m để vẫn qua được. Đã kiểm tra map đấu, không có chỗ nào bị kẹt.

## 2. Vòng lửa (phase 24, 26)
- [YC] Bo co lại kiểu giật cục → giờ **co mượt**, kích thước cập nhật mỗi khung hình. [TQ] Lỗi gốc: kích thước bo bị làm tròn theo bước 0,25 m.
- [YC] Ra ngoài bo thì màn hình có **viền đỏ mờ**, kêu **tiếng Minecraft** liên tục, **màn hình giật và nghiêng** giống khi đứng trong lava.
  [TQ] Bị trừ máu theo nhịp **mỗi 0,5 s**, mỗi nhịp kêu một tiếng, máy nghiêng **±6°** và chúi xuống 1,5°. Người khác nghe nhỏ hơn và có hướng (3D).

## 3. Rèn (phase 25)
- [YC] Bỏ cooldown, cho đập nhanh tùy thích → đập ngay khi **chạm xuống**, chữ Trúng/Trượt hiện tức thì. [TQ] Nguyên nhân bị trễ trước đây: có cooldown 0,5 s giữa hai nhát, và phải chờ server trả lời mới thấy búa đập.
- [YC] Vòng quay chậm lại: 1 vòng **1,1 s → 1,5 s**.
- [YC] Kết quả mới:

| Đập | Trước | Sau |
|---|---|---|
| Trúng vùng trắng | Tuyệt +2 / Lên +1 / Giữ / Hỏng theo bảng | **Lên +1** hoặc **Giữ** (ngẫu nhiên) |
| Trượt | như trên | **Vỡ −2**, chắc chắn |
| Gãy (mất vũ khí) | có | **bỏ**, cấp thấp nhất là 0 |

- [TQ] Cấp càng cao càng khó:
  - Tỉ lệ được Lên khi đập trúng giảm từ **75% (+0) xuống 38% (+44)**.
  - Vùng trắng nhỏ dần từ **22% vòng xuống 10%**.
  - Thép nguội hoặc quá nóng thì vùng trắng nhỏ hơn.
  - Mỗi lần đập trúng, vùng trắng nhảy sang chỗ khác ở phía trước kim.
- [YC] Cấp tối đa **20 → 45**.
- [YC] Nhập thần mới: vùng trắng to bằng **nửa vòng**, đập liên tục được, tỉ lệ Giữ cao hơn một chút, có hiệu ứng dữ dội, hết thì trở lại bình thường. [TQ] Các con số cụ thể:
  - Thanh nhập thần đầy sau 10 lần Lên. Kéo dài **4 s**, vòng quay nhanh hơn (0,9 s/vòng).
  - Vùng trắng giữ nửa vòng tới giây 2,4, sau đó co dần còn 12%, nên cố spam tới cuối sẽ bị trừ.
  - Đập trúng: tỉ lệ Lên thấp hơn bình thường 10%. Đập trượt: 30% Vỡ, 70% Giữ.
  - Hiệu ứng: góc nhìn dồn vào, viền màn hình ấm, tia lửa gấp 3, rung mạnh hơn. Hết là trả lại hết.
- [TQ] Kết quả mô phỏng một lần Nhập thần từ +10:

| Kiểu chơi | Kết quả |
|---|---|
| Spam mù | −1,2 |
| Spam có canh | +4,3 |
| Siêu giỏi | +5,3 (22% số lần đạt +7) |

## 4. Chết, hồn ma, qua round (phase 26)
- [YC] Chết **không bị trừ cấp** nữa (trước đây −2).
- [YC] Chết thì hiện **"Bạn đã chết"** 2,5 s, rồi đứng dậy thành **hồn ma**, có thời gian chạy đi, không đánh được. [TQ] Chi tiết hồn ma:
  - Kéo dài từ giây 2,5 tới giây 6,5 (đúng 4 s), chạy nhanh hơn 15%, không bị đánh, không bị bo đốt.
  - Nút Đánh, Đỡ, Rèn, Đặt đe, Đổi đều ẩn. Viền màn hình trắng, người khác thấy bạn nhạt và trong suốt.
  - Hết hồn ma mà vẫn ở ngoài bo thì được đưa vào trong bo 2 m. Có 0,5 s bảo vệ, mất ngay khi bạn ra đòn.
- [YC] Âm thanh **gãy xương** khi chết, to hơn tiếng đánh thường.
- [YC] Qua round không reset mà trừ cấp: hết round 1 **−2**, round 2 **−4**, round 3 **−6**…
  - [TQ] Giáp cũng giữ qua round, bị trừ 1/2/3… mỗi round.
  - [TQ] Bảng kết quả round hiện số cấp bị trừ cạnh từng vũ khí.
  - [TQ] Dạng vũ khí chỉ đổi khi sang round, không bị tụt dạng giữa trận.

## 5. Vũ khí (phase 27, 27b)
- [YC] Bỏ **Thương**. Bốn nhánh giờ là **Kiếm, Búa, Dao, Tay**.
- [YC] Mỗi 3 cấp là một vũ khí khác, tới +45 → mỗi nhánh 15 dạng, tổng **60 dạng** (`docs/ROSTER.md`). [TQ] Claude tự nghĩ tên, hình dáng, chất liệu và hiệu ứng cho từng dạng. Cấp càng cao càng dị: kiếm hắc thạch, búa cao su, búa sao lùn, găng tên lửa, dao rạch không gian…
- [YC] Đặc điểm từng nhánh (con số do [TQ] chọn):

| Nhánh | Đánh thường | Chuỗi đòn | Đòn nặng | Tầm | Tốc chạy | Ghi chú |
|---|---|---|---|---|---|---|
| Kiếm | 12 | 3 × 0,40 s | 30 | 2,3 m | ×1,0 | cân bằng, đẩy lùi nhẹ |
| Búa | 15 | 2 × 0,70 s | 40 | 2,0 m | ×0,92 | đẩy mạnh; sát thương tăng vọt về sau; đánh nhanh dần từ +12 tới +30 |
| Dao | 7 | 4 × 0,24 s | đâm lao 3 m, 18 | 1,6 m | ×1,2 | nhảy 2 lần, trượt nhanh và dài hơn |
| Tay (găng) | 6 | 4 × 0,26 s | đấm nạp, 20 | 1,5 m | ×1,12 | chịu thêm 10% sát thương; mạnh nhờ hiệu ứng ở cấp cao |

- [TQ] Dao cầm **xuôi** chứ không cầm ngược, vì ở độ phân giải thấp nhìn rõ hơn.
- [TQ] Tay có đủ **hai nắm đấm** (găng trái là bản lật của găng phải). Lúc rèn, găng nằm trên đe.
- [TQ] Dạng nào chưa có model thì tạm mượn model cấp thấp gần nhất cùng nhánh, chỉnh màu sáng hơn một chút.
- [TQ] Dao và tay tạm dùng lại tiếng vung có sẵn, chỉnh cao độ lên.
- [TQ] Đã làm model cho **24 dạng từ +30 đến +45** (kế hoạch ghi nhầm là 16), cộng model tạm cho dao găm và găng sắt.
- [TQ] Prompt làm model cho AI free có luật mới: lên cấp phải có **ý tưởng mới**, chỉ to hơn hay dài hơn là không đạt.

## 6. Âm thanh
- [YC] Thêm 2 file của người chơi (Minecraft hurt, bone crack). [TQ] Đã cắt khoảng lặng, chuyển mono, đánh dấu để công cụ tạo âm thanh không ghi đè lên.
- [TQ] Lưu ý: tiếng Minecraft là của Mojang. Chơi với bạn bè thì không sao, phát hành công khai thì phải thay.

---

## Chưa làm
- [CHƯA] **Hiệu ứng vũ khí cấp cao** (phase 28 cho kiếm/búa, phase 29 cho dao/tay). Hiện chỉ có hiệu ứng cơ bản: đòn chuỗi mạnh hơn, đỡ chuẩn rộng hơn, xuyên đỡ, đốt, phá đỡ, choáng, slam, hất tung. Các hiệu ứng còn lại đã có tên trong dữ liệu nhưng chưa có tác dụng.
- [CHƯA] **Lá bài** (phase 30): đầu mỗi round chọn 1 trong 3 lá đen, gồm lá Vũ khí và lá Cơ thể, thay cho di vật. Đã thiết kế sẵn 34 lá trong `docs/ROUND3.md` §5.
- [CHƯA] **Tối ưu FPS, âm thanh giật, con quay quay ngang khi ngửa máy** (phase 31). Để cuối vì phải tối ưu sau khi đã có hết hiệu ứng.
- [CHƯA] **Ghép model từ weapon-lab** vào game: đang cất ở `weapon-lab/IMPORT_PHASE.md`, khi cần thì thêm lại.
- [CHƯA] Tự đổi sang tay đang cầm vũ khí khi vào bàn rèn mà tay hiện tại trống. Hiện chưa cần, vì tay đang cầm không bao giờ trống.
