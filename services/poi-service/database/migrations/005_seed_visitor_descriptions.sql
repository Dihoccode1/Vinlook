-- Short visitor-facing introductions; never replace the narration source.
-- Only fill empty introductions, preserving any admin-authored content.
UPDATE p SET VisitorDescription = v.Introduction
FROM dbo.Pois p INNER JOIN (VALUES
 (N'cho-ben-thanh', N'Điểm dừng để khám phá không gian chợ, tìm quà lưu niệm và trải nghiệm nhịp mua bán của thành phố. Hãy hỏi giá trước khi mua hàng và giữ đồ dùng cá nhân khi di chuyển trong khu đông người.'),
 (N'dinh-doc-lap', N'Điểm tham quan lịch sử tại trung tâm thành phố. Bạn có thể tìm hiểu không gian di tích qua các khu vực được mở cho khách; hãy xem sơ đồ và hướng dẫn tại điểm đến trước khi bắt đầu.'),
 (N'buu-dien-trung-tam', N'Công trình kiến trúc nằm trong cụm tham quan trung tâm Sài Gòn. Bạn có thể ghé quan sát không gian bưu điện, chụp ảnh và kết hợp khám phá các điểm đến xung quanh.'),
 (N'nha-tho-duc-ba', N'Điểm đến kiến trúc và tôn giáo trong khu vực trung tâm thành phố. Hãy giữ trật tự, quan sát biển hướng dẫn và chỉ tham quan những khu vực đang được phép tiếp cận.'),
 (N'nha-hat-thanh-pho', N'Điểm dừng dành cho người yêu kiến trúc và nghệ thuật biểu diễn. Bạn có thể quan sát mặt ngoài công trình; nếu muốn vào xem chương trình, hãy kiểm tra lịch biểu diễn và vé với đơn vị tổ chức.'),
 (N'tru-so-ubnd-thanh-pho', N'Công trình hành chính tại khu vực trung tâm thành phố. Khi ghé thăm, hãy tuân thủ hướng dẫn về khu vực được tiếp cận và lựa chọn vị trí quan sát, chụp ảnh phù hợp.'),
 (N'pho-di-bo-nguyen-hue', N'Không gian đi bộ để dạo phố và cảm nhận nhịp sống trung tâm thành phố. Nên mang giày thoải mái, chuẩn bị nước uống và chú ý phương tiện khi băng qua các đường giao cắt.'),
 (N'bao-tang-chung-tich-chien-tranh', N'Bảo tàng dành cho hành trình tìm hiểu lịch sử chiến tranh qua tư liệu và hiện vật. Một số nội dung có thể gây xúc động; hãy cân nhắc khi đi cùng trẻ nhỏ và đọc hướng dẫn tại từng khu trưng bày.'),
 (N'bao-tang-thanh-pho', N'Điểm tham quan để tìm hiểu về Thành phố Hồ Chí Minh qua không gian bảo tàng. Bạn có thể đi theo sơ đồ trưng bày, đọc chú thích và dành thời gian cho các chủ đề mình quan tâm.'),
 (N'bao-tang-my-thuat', N'Điểm đến dành cho người yêu hội họa, điêu khắc và kiến trúc. Khám phá các phòng trưng bày, quan sát chất liệu và bố cục của tác phẩm; không chạm vào hiện vật và tuân thủ quy định chụp ảnh của bảo tàng.'),
 (N'bao-tang-lich-su', N'Không gian tìm hiểu lịch sử thông qua các phòng trưng bày và hiện vật. Hãy bắt đầu từ sơ đồ tham quan, đọc bảng giới thiệu theo từng chủ đề và giữ khoảng cách với hiện vật.'),
 (N'ben-nha-rong', N'Điểm đến kết hợp tham quan bảo tàng và tìm hiểu về Chủ tịch Hồ Chí Minh. Bạn có thể quan sát công trình, đọc tư liệu tại các khu trưng bày và theo hướng dẫn của đơn vị quản lý.'),
 (N'nha-tho-tan-dinh', N'Điểm dừng tìm hiểu kiến trúc và sinh hoạt tôn giáo. Hãy chọn trang phục phù hợp, giữ yên lặng và kiểm tra hướng dẫn tham quan để không ảnh hưởng đến hoạt động hành lễ.'),
 (N'chua-ngoc-hoang', N'Điểm tham quan văn hóa và tín ngưỡng. Khi vào chùa, hãy ăn mặc lịch sự, di chuyển nhẹ nhàng và hỏi trước nếu muốn chụp ảnh tại khu vực thờ tự.'),
 (N'chua-ba-thien-hau', N'Điểm dừng tìm hiểu không gian tín ngưỡng và kiến trúc chùa. Hãy dành thời gian quan sát các chi tiết trang trí, giữ trật tự và tuân thủ hướng dẫn tại khu vực thờ tự.'),
 (N'cho-binh-tay', N'Điểm đến để quan sát không gian chợ và hoạt động mua bán. Hãy hỏi rõ giá, số lượng và cách giao nhận trước khi mua; tránh đứng lâu tại lối vận chuyển hàng hóa.'),
 (N'cho-tan-dinh', N'Điểm dừng khám phá sinh hoạt chợ và các quầy hàng. Hãy đi chậm tại lối nhỏ, hỏi giá trước khi mua và giữ đồ dùng cá nhân trong tầm quan sát.'),
 (N'duong-sach-nguyen-van-binh', N'Không gian dạo bộ dành cho người yêu sách. Bạn có thể ghé các gian sách, tìm đầu sách yêu thích và xem thông báo sự kiện tại điểm đến.'),
 (N'ben-bach-dang', N'Điểm dừng dạo bộ và ngắm không gian ven sông Sài Gòn. Hãy chú ý thời tiết, giữ khoảng cách an toàn với mép nước và kiểm tra thông tin tại bến nếu muốn sử dụng dịch vụ đường thủy.'),
 (N'chua-giac-lam', N'Điểm đến dành cho hành trình tìm hiểu kiến trúc và văn hóa Phật giáo. Khi tham quan, hãy ăn mặc lịch sự, giữ yên lặng và đi theo lối được hướng dẫn.')
) v(Slug, Introduction) ON v.Slug = p.Slug
WHERE p.VisitorDescription = N'';
