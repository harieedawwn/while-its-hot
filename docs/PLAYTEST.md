# Thử nghiệm đầu tiên với bạn bè

Cần 2–4 điện thoại Android đã cài APK mới nhất (Release `latest`), cùng Wi‑Fi hoặc 4G đều được.

## Chuẩn bị (5 phút)
1. Một người vào **Chơi mạng**, tạo phòng, đọc mã 4 chữ cho mọi người.
2. Mọi người nhập mã, chọn tên và màu. Bật **Hiện FPS** trong Cài đặt.
3. Chủ phòng đặt hưu chiến 30 s, bắt đầu.

## Thử theo thứ tự
1. **Ván 1 – chỉ chơi**: đừng nghĩ nhiều. Lấy phôi, đặt đe, rèn, đánh nhau. Chơi hết trận (ai thắng 3 ván).
2. **Rèn**: nung tới khi lưỡi đỏ rực rồi mới đập. Có chỗ nào không hiểu vòng đập, nhiệt, Nhập thần không?
3. **Đỡ đòn**: thử đỡ đúng lúc (gạt) và giữ đỡ. Đối thủ có thể gạt mình dễ hay khó quá?
4. **Vòng lửa**: có kịp chạy vào không, có bị chết oan không?
5. **Chọn di vật** ở lồng: thẻ có dễ đọc không, có di vật nào quá mạnh hoặc vô dụng?
6. **Chơi một ván với lag**: để một người dùng 4G, xem đánh trúng có bị lệch không.

## Ghi lại (mỗi người 3 dòng sau trận)
Mở `docs/PLAYTEST_NOTES.md`, thêm một mục theo mẫu:

```
## <ngày> – <số người> – <máy>
- FPS thấp nhất / nóng máy sau bao lâu:
- Khoảnh khắc vui nhất:
- Khoảnh khắc bực nhất (lỗi, khó hiểu, không công bằng):
- Rèn lên được tối đa +? ; Gãy mấy lần:
- Vũ khí / di vật thấy quá mạnh hoặc yếu:
```

Lỗi cụ thể thì ghi: màn hình nào, đang làm gì, mã phòng nếu có. Ảnh chụp màn hình càng tốt.

## Mốc cân bằng để so sánh (mô phỏng)
Không Nhập thần, người đập trúng vùng sáng 35% / 60% / 85% thường dừng quanh +10 / +13 / +16 sau 60 s rèn liên tục.
Trong trận thật còn phải chạy và né, nên +8 đến +12 là bình thường, +18 trở lên rất hiếm.
Nếu bạn bè thường xuyên chạm +18 trong ván thứ hai, rèn đang quá dễ; nếu hầu như không ai qua +6, quá khó.
Chạy lại mô phỏng: `node tools/forge-sim.mjs --n 4000`. Số chỉnh nằm ở `shared/src/balance.ts` (`forge`).
