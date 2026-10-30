# Bổ sung 10 POI khu vực phía tây TP.HCM

Phân bố: Quận 5 (3), Quận 10 (3), Tân Phú (2), Tân Bình (2). Tên quận dùng để mô tả khu vực quen thuộc, không khẳng định địa giới hành chính hiện hành. Tọa độ là điểm đại diện trên OSM; chưa khảo sát cửa vào.

| Địa điểm | Khu vực | Nguồn thông tin | Nguồn tọa độ | Ảnh minh họa |
|---|---|---|---|---|
| Hội quán Nghĩa An | Quận 5 | [Nguồn](https://hoiquannghiaan.com/) | [OSM](https://www.openstreetmap.org/way/1499809233) | Có |
| Hội quán Hà Chương | Quận 5 | [Nguồn](https://tphcm.chinhphu.vn/du-xuan-check-in-ngay-5-dia-diem-an-choi-o-cho-lon-chi-trong-buoi-sang-101220211182119225.htm) | [OSM](https://www.openstreetmap.org/way/1489994542) | Có |
| Chợ An Đông | Quận 5 | [Nguồn](https://thuhungandong.com/vi/lien-he) | [OSM](https://www.openstreetmap.org/way/152990635) | Có |
| Việt Nam Quốc Tự | Quận 10 | [Nguồn](https://tphcm.chinhphu.vn/khanh-thanh-ngoi-chua-dat-xa-loi-trai-tim-hoa-thuong-thich-quang-duc-10117079.htm) | [OSM](https://www.openstreetmap.org/way/230796620) | Có |
| Chùa Ấn Quang | Quận 10 | [Nguồn](https://phatgiao.org.vn/dia-chi-lien-lac-cac-don-vi-thuoc-giao-hoi-phat-giao-viet-nam-dia-phuong-trong-ca-nuoc-d34317.html) | [OSM](https://www.openstreetmap.org/way/585932824) | Có |
| Bảo tàng Y học cổ truyền Việt Nam – FITO | Quận 10 | [Nguồn](https://fitomuseum.com.vn/bao-tang-y-hoc-co-truyen-viet-nam/) | [OSM](https://www.openstreetmap.org/node/4110078089) | Có |
| Địa đạo Phú Thọ Hòa | Tân Phú | [Nguồn](https://tuoitre.vn/phunuonline/phuong-phu-tho-hoa-tphcm-goi-ten-dia-dao-trong-thanh-pho-1101554722.htm) | [OSM](https://www.openstreetmap.org/node/4131725789) | Có |
| AEON MALL Tân Phú Celadon | Tân Phú | [Nguồn](https://corp.aeon.com.vn/aeon-mall-tan-phu-celadon/) | [OSM](https://www.openstreetmap.org/relation/20675274) | Có |
| Chùa Phổ Quang | Tân Bình | [Nguồn](https://pgtphcm.vn/chuyen-muc/tu-vien/chua-pho-quang/) | [OSM](https://www.openstreetmap.org/way/493174173) | Có |
| Bảo tàng Không quân phía Nam | Tân Bình | [Nguồn](https://thanhnien.vn/bao-tang-o-tphcm-nhung-chien-dau-co-gan-tan-son-nhat-it-nguoi-biet-185250402192614215.htm) | [OSM](https://www.openstreetmap.org/way/197995330) | Có |

Chạy: npm run content:import-west-saigon -w @tourism/translation-service. Script tạo mới, không ghi đè POI đã chỉnh sửa, không tạo trùng khi chạy lại.

Mỗi điểm có giới thiệu tiếng Việt và nội dung hướng dẫn được biên soạn bằng 16 ngôn ngữ (bản gốc + 15 bản dịch), theo bộ mẫu hướng dẫn tham quan đã dùng trong dự án. Đây là hướng dẫn tham quan, không phải bài nghiên cứu lịch sử riêng cho từng địa điểm. Tên riêng giữ nguyên. Audio chưa tạo sẵn; dùng luồng thuyết minh hiện tại.

Ảnh được lưu nhị phân vào poi_images; ghi công, URL nguồn và giấy phép nằm trong manifest ảnh và trường metadata của POI. Cả 10 điểm đã có ảnh. Ảnh FITO lấy từ website chính thức, chưa có thông tin giấy phép mở; không gán giấy phép Creative Commons cho ảnh này.

## Ghi công ảnh

- hoi-quan-nghia-an: Gary Todd from Xinzheng, China · CC0 · [Nguồn](https://commons.wikimedia.org/wiki/File:Nghia_An_Hoi_Quan_Pagoda_(10018249835).jpg) · [Giấy phép](http://creativecommons.org/publicdomain/zero/1.0/deed.en)
- hoi-quan-ha-chuong: Channel Giải trí tổng hợp · CC BY 3.0 · [Nguồn](https://commons.wikimedia.org/wiki/File:H%C3%A0_Ch%C6%B0%C6%A1ng_2018.png) · [Giấy phép](https://creativecommons.org/licenses/by/3.0)
- viet-nam-quoc-tu: Nguyễn Thanh Quang · CC BY-SA 3.0 · [Nguồn](https://commons.wikimedia.org/wiki/File:Vi%E1%BB%87t_Nam_Qu%E1%BB%91c_T%E1%BB%B1.JPG) · [Giấy phép](https://creativecommons.org/licenses/by-sa/3.0)
- dia-dao-phu-tho-hoa: Phương Huy · CC BY-SA 4.0 · [Nguồn](https://commons.wikimedia.org/wiki/File:%C4%90%E1%BB%8Ba_%C4%91%E1%BA%A1o_Ph%C3%BA_Th%E1%BB%8D_H%C3%B2a,_th%C3%A1ng_4_n%C4%83m_2021_(6).jpg) · [Giấy phép](https://creativecommons.org/licenses/by-sa/4.0)
- aeon-mall-tan-phu-celadon: Lehuuphatlhp · CC0 · [Nguồn](https://commons.wikimedia.org/wiki/File:Aeon-mall-celadon-tan-phu.jpg) · [Giấy phép](http://creativecommons.org/publicdomain/zero/1.0/deed.en)
- chua-an-quang: Gary Todd from Xinzheng, China · CC0 · [Nguồn](https://commons.wikimedia.org/wiki/File:An_Quang_Pagoda_(10017886424).jpg) · [Giấy phép](http://creativecommons.org/publicdomain/zero/1.0/deed.en)

- cho-an-dong: Christopher from Shanghai, China · CC BY 2.0 · [Nguồn](https://commons.wikimedia.org/wiki/File:An_Dong_market.jpg) · [Giấy phép](https://creativecommons.org/licenses/by/2.0)
- chua-pho-quang: Christophe95 · CC BY-SA 4.0 · [Nguồn](https://commons.wikimedia.org/wiki/File:Ph%E1%BB%95_Quang_Pagoda,_Ho_Chi_Minh_City.jpg) · [Giấy phép](https://creativecommons.org/licenses/by-sa/4.0)
- bao-tang-khong-quan-phia-nam: Alec Wilson from Khon Kaen, Thailand · CC BY-SA 2.0 · [Nguồn](https://commons.wikimedia.org/wiki/File:Bell_Helicopters_UH1-H_0372_(40055045255).jpg) · [Giấy phép](https://creativecommons.org/licenses/by-sa/2.0)
- bao-tang-fito: Bảo tàng FITO · Ảnh từ website chính thức · [Nguồn](https://fitomuseum.com.vn/bao-tang-y-hoc-co-truyen-viet-nam/)
