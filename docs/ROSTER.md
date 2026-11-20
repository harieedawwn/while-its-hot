# ROSTER — 4 families × 15 forms (round 3)

Forms change every 3 levels from +3 to +45. Each row lists the form's FULL effect set (not cumulative:
`passivesOf` returns the row's own list). Every active effect has a cooldown (cd) so fights stay readable.
Numbers are starting values; phase 29/30 tunes them in `balance.ts`. Family base traits: docs/ROUND3.md §4.

Weapon lab: copy one whole row (from `kiem |` to the end) into the "Dòng roster" field of
`weapon-lab/PROMPT_FREE_CLAUDE.md`. Rows marked `có` already have a model in the game.
Rows +30 and up are built by Claude Code (phase 28b); free chats do +3 to +27.

Nhánh | Cấp | id | Tên | Hình dáng & chất liệu | Hiệu ứng | Mẫu
---|---|---|---|---|---|---
kiem | 3 | kiem_tho | Kiếm thô | thép xám thô, lưỡi thẳng hơi mẻ, chuôi quấn vải | — | có
kiem | 6 | kiem_thep | Kiếm thép | lưỡi thẳng sạch, chắn tay chữ thập | đòn 3 combo +20% | có
kiem | 9 | kiem_ban_rong | Kiếm bản rộng | lưỡi rộng, rãnh máu sâu | đòn 3 +20%; đỡ chuẩn +30 ms | có
kiem | 12 | truong_kiem | Trường kiếm | dài, chuôi hai tay, quả chuôi tròn | đòn 3 +20%; đỡ chuẩn +30 ms; đâm nặng xuyên đỡ | có
kiem | 15 | kiem_toi_lua | Kiếm tôi lửa | thép đen, vân tôi đỏ cam dọc lưỡi | như trên + trúng đòn đốt 3/s trong 2 s | có
kiem | 18 | kiem_rang_cua | Kiếm răng cưa | lưỡi răng cưa một bên, gáy dày có đinh tán | đốt 4/s; trúng đòn làm chậm 20% 1.5 s; đâm nặng xuyên đỡ | cần
kiem | 21 | kiem_song_nhan | Song nhận | hai lưỡi song song cách nhau 3 cm, nối bằng chốt đồng | đòn nặng phóng vệt chém bay 10 m (14, cd 3 s); đốt; chậm | cần
kiem | 24 | kiem_dong_xanh | Kiếm đồng xanh | đồng rỉ lục, hoa văn trống đồng khắc chìm, chuôi tròn | đỡ chuẩn tự phóng vệt chém trả (cd 2 s); vệt chém nặng 18; đốt | cần
kiem | 27 | kiem_xich | Kiếm xích | lưỡi chia 6 khúc nối xích, mở ra như roi | đòn nặng quật roi 6 m kéo mục tiêu về 3 m (cd 4 s); đòn nhẹ tầm +0.5 m; vệt chém | cần
kiem | 30 | kiem_hac_thach | Kiếm hắc thạch | đá núi lửa đen bóng, cạnh mẻ sắc, khe nứt cam như dung nham | mỗi đòn trúng để lại vết nứt dung nham 3 s (5/s); vệt chém bay đốt | cần
kiem | 33 | kiem_bang | Kiếm băng | lưỡi băng trắng xanh đục, tinh thể nhô ra, chuôi bạc | đòn 3 đóng băng 0.8 s (cd 5 s mỗi mục tiêu); vệt chém để lại băng trơn trên đất 3 s | cần
kiem | 36 | kiem_thien_thach | Kiếm thiên thạch | khối đá vũ trụ xám đen đốm kim loại, lơ lửng tách khỏi chuôi | đòn nặng gọi thiên thạch rơi chỗ nhắm sau 0.8 s (r 3 m, 30, cd 6 s); vệt chém | cần
kiem | 39 | kiem_van_kiem | Vạn kiếm | một chuôi, 5 lưỡi nhỏ xòe như quạt, lơ lửng | 3 lưỡi nhỏ bay quanh người tự chém địch trong 2.5 m (6 mỗi 0.5 s); thiên thạch | cần
kiem | 42 | kiem_nhat_thuc | Kiếm nhật thực | lưỡi đen tuyền, vành vàng quanh một lỗ tròn giữa lưỡi | đòn nặng xé ra lỗ đen 2 s ở mũi kiếm hút người trong 5 m (cd 8 s); 3 lưỡi bay | cần
kiem | 45 | kiem_mat_troi | Kiếm mặt trời | lưỡi là tấm kim loại trắng vàng rất sáng, đĩa tròn sau chắn tay | mọi đòn chém phóng vệt chém; đòn nặng bắn cột lửa thẳng 15 m (35 + đốt, cd 7 s) | cần
bua | 3 | bua_ren | Búa rèn | búa thợ rèn thường, cán gỗ | — | có
bua | 6 | bua_ta | Búa tạ | đầu khối vuông to, đai sắt | đòn nhẹ phá đỡ | có
bua | 9 | chuy_gai | Chùy gai | đầu tròn gai nhọn | phá đỡ; nặng choáng +0.4 s | có
bua | 12 | bua_chien | Búa chiến | một mặt phẳng, một mỏ nhọn, cán bọc da | phá đỡ; choáng; slam đáp đất 20 trong 3 m | có
bua | 15 | bua_de | Búa đe | đầu là một cái đe nhỏ | như trên + đòn nặng hất tung kèm sóng đẩy | có
bua | 18 | bua_piston | Búa piston | đầu trụ thép, ống piston lộ, đinh tán | đòn nặng nổ piston: sóng chấn 4 m, 18 (cd 3 s); phá đỡ; choáng; slam | cần
bua | 21 | bua_nam_cham | Búa nam châm | đầu chữ U sơn đỏ, hai cực xám | đòn nặng hút mọi người trong 6 m về trước mặt (cd 5 s); piston; slam | cần
bua | 24 | bua_dung_nham | Búa dung nham | đá đen nứt, lõi cam chảy, đai thép cháy sém | đập đất để lại vũng dung nham r 2.5 m 4 s (8/s); slam để vũng to; hút | cần
bua | 27 | bua_chuong | Búa chuông | đầu là chuông đồng lớn nằm ngang, cán dài | đòn trúng: tiếng chuông làm địch lắc camera + chậm 30% 2 s; đòn nặng sóng âm r 5 m; dung nham | cần
bua | 30 | bua_cao_su | Búa cao su | đầu cao su vàng quá khổ, dây thừng quấn cán | đòn nặng bắn địch bay 15 m, nảy trên tường như bóng bàn; đòn nhẹ đẩy 4 m | cần
bua | 33 | bua_sam | Búa sấm | đầu đá có cọc đồng, cuộn dây đồng quấn quanh | đòn nặng phóng sét lan 3 mục tiêu trong 8 m (15); bắn bay; đẩy | cần
bua | 36 | bua_mo_neo | Búa mỏ neo | mỏ neo tàu khổng lồ gỉ sét, xích to quấn cán | đòn nặng ném neo 14 m: trúng tường/đất kéo bạn bay tới, trúng người kéo họ về (cd 5 s); sét | cần
bua | 39 | bua_trong_luc | Búa trọng lực | khối lập phương đen lơ lửng giữa hai càng đồng | đập đất: mọi người trong 8 m dính đất 2 s (không nhảy được); slam mạnh gấp đôi; neo | cần
bua | 42 | bua_nui | Búa núi | đầu là một tảng núi nhỏ có tuyết trên đỉnh và vài cây thông tí hon | đòn nặng tạo khe nứt chạy thẳng 14 m hất tung mọi người trên đường (30, cd 6 s); trọng lực | cần
bua | 45 | bua_sao_lun | Búa sao lùn | quả cầu sao nén trắng cam kẹp trong lồng kim loại ba càng | đòn nặng: hố đen 3 s r 8 m hút mọi thứ rồi nổ 40 (cd 10 s); mọi đòn nhẹ có sóng đẩy | cần
dao | 3 | dao_gam | Dao găm | lưỡi ngắn thẳng, chuôi gỗ quấn dây | — | cần
dao | 6 | dao_phay | Dao phay | dao chặt thịt bản vuông, lỗ treo ở góc | đòn 4 combo +25% | cần
dao | 9 | dao_moc | Dao móc | lưỡi cong như móng vuốt, vòng xỏ ngón ở chuôi | đòn 4 +25%; đánh từ sau lưng +50% | cần
dao | 12 | dao_hai_luoi | Dao hai lưỡi | lưỡi ở cả hai đầu, cầm ở giữa | trượt dài thêm 30%; đòn đầu sau khi trượt +30%; đánh lưng +50% | cần
dao | 15 | dao_nem | Dao ném | dao mỏng cân bằng, chuôi có vòng | đòn nặng ném dao 15 m (12), dao tự bay về sau 1 s (cd 1.5 s); đánh lưng | cần
dao | 18 | dao_doc | Dao độc | lưỡi lục sẫm có rãnh chứa độc, chuôi xương | trúng đòn độc 2/s 4 s, cộng dồn 3; dao ném gây độc; đánh lưng | cần
dao | 21 | dao_bong | Dao bóng | lưỡi đen mờ như khói, không có chắn tay | hạ gục hoặc đánh lưng: tàng hình 2 s (đánh là hiện); độc; ném | cần
dao | 24 | dao_liem | Dao liềm | liềm cong lớn, cán ngắn quấn vải | đòn nặng móc: lao tới mục tiêu trong 7 m (cd 3 s); độc; tàng hình | cần
dao | 27 | dao_guong | Dao gương | lưỡi như gương bạc phản chiếu, chuôi đen | đỡ chuẩn: dịch chuyển ra sau lưng người đánh + tàng hình 1 s; móc; độc | cần
dao | 30 | dao_lua | Dao lửa | lưỡi hình ngọn lửa uốn lượn, thép đỏ sẫm | trượt để lại vệt lửa 2 s (6/s); dao ném đốt; dịch chuyển khi đỡ | cần
dao | 33 | dao_ngoc | Dao ngọc | lưỡi đá ngọc bích xanh, chuôi vàng chạm rồng | mỗi đòn trúng +6% tốc chạy 3 s, cộng dồn 5; nhảy 3 lần; vệt lửa | cần
dao | 36 | dao_dong_ho | Dao đồng hồ | lưỡi là kim đồng hồ to, chuôi bánh răng lộ | đòn nặng: vùng chậm thời gian r 4 m 2 s, ai trong đó (trừ bạn) chậm 50% (cd 8 s); tốc cộng dồn | cần
dao | 39 | dao_phan_than | Dao phân thân | hai lưỡi tách đôi lơ lửng song song | trượt để lại bản sao đứng yên 3 s, ai chém bản sao bị nổ 10 (cd 4 s); vùng chậm | cần
dao | 42 | dao_nghin_luoi | Dao nghìn lưỡi | chuôi ngắn, vòng 8 lưỡi nhỏ xoay quanh | đòn nặng: bão dao quanh người 2 s r 2.5 m (8 mỗi 0.25 s, cd 7 s); bản sao | cần
dao | 45 | dao_khe_nut | Dao rạch không gian | lưỡi là một khe nứt đen viền trắng xám như kính vỡ | đòn nặng: dịch chuyển 12 m theo hướng nhắm, chém mọi người trên đường 25 (cd 4 s); nhảy 3 lần; bão dao | cần
tay | 3 | gang_sat | Găng sắt | găng giáp tấm cơ bản, đốt ngón chồng lớp | — | cần
tay | 6 | gang_dinh | Găng đinh | đốt ngón gắn đinh tán nhọn | đòn 4 combo hất văng 3 m | cần
tay | 9 | gang_xich | Găng xích | xích quấn cổ tay, móc treo | mỗi đòn trúng hồi 1 máu; đòn 4 hất văng | cần
tay | 12 | gang_piston | Găng piston | piston thép trên mu bàn tay | đòn nặng sạc nhanh 40%, đẩy 6 m; hồi máu; hất văng | cần
tay | 15 | gang_lua | Găng lửa | găng đen, lỗ thông lửa đỏ trên đốt ngón | đòn nặng bắn cầu lửa 14 m (16, nổ r 2 m, cd 2 s); hồi máu | cần
tay | 18 | gang_bang | Găng băng | găng phủ tinh thể băng trắng xanh | đòn 4 đóng băng chân 0.7 s; đòn nặng bắn cầu băng làm chậm (cd 2 s); hồi máu | cần
tay | 21 | gang_set | Găng sét | cuộn đồng quanh cổ tay, cọc sét trên đốt ngón | mỗi đòn trúng nảy sét sang 1 địch gần (8); đòn nặng sét 3 mục tiêu; đóng băng | cần
tay | 24 | gang_da | Găng đá | găng to bằng đá tảng thô, rêu ở khe | đòn nặng nhìn xuống đất dựng tường đá chắn 4 s (cd 6 s); đòn nặng thường đẩy 8 m; sét | cần
tay | 27 | gang_tu | Găng từ | nam châm móng ngựa trên lòng bàn tay, sơn đỏ | đòn nặng kéo địch 8 m về trước mặt rồi tự đấm (cd 4 s); tường đá; sét | cần
tay | 30 | gang_ten_lua | Găng tên lửa | nắm đấm có ống phản lực sau cổ tay | đòn nặng: nắm đấm bay ra như tên lửa 20 m, nổ r 3 m 25 (cd 4 s); kéo; sét | cần
tay | 33 | gang_xuong | Găng xương | xương trắng, móng đen, khớp bạc | hạ gục hồi đầy máu; mỗi đòn hồi 2; tên lửa | cần
tay | 36 | gang_khong_lo | Găng khổng lồ | găng to gấp 3, đinh tán to bằng nắm tay | đòn nặng: bàn tay khổng lồ hiện ra đập xuống r 4 m (30, cd 6 s); hồi máu; tên lửa | cần
tay | 39 | gang_trong_luc | Găng trọng lực | quả cầu đen lơ lửng trong lòng bàn tay, vành đồng | đòn nặng ném hố đen 2.5 s r 6 m (cd 8 s); đòn nhẹ hút nhẹ; bàn tay khổng lồ | cần
tay | 42 | gang_thien_thach | Găng thiên thạch | đá vũ trụ xanh đen, mảnh kim loại cắm vào | mỗi đòn 4 gọi thiên thạch nhỏ trên đầu mục tiêu (20); đòn nặng mưa 5 thiên thạch (cd 8 s) | cần
tay | 45 | gang_troi | Tay trời | găng đồng vàng khắc hoa văn mây, vòng kim loại sau cổ tay | đòn nặng: bàn tay khổng lồ từ trời ấn xuống r 7 m, 50 (cd 9 s); mọi đòn nhẹ đẩy 4 m; đánh trúng hồi máu | cần
