-- Development fixtures; update descriptive content before publishing to users.
INSERT INTO dbo.Pois (Id, Slug, Name, Description, Address, Latitude, Longitude, Category, IsPublished)
SELECT v.* FROM (VALUES
    (CAST('11111111-1111-4111-8111-111111111111' AS UNIQUEIDENTIFIER), N'cho-ben-thanh', N'Chợ Bến Thành', N'Khu chợ nổi tiếng tại trung tâm Thành phố Hồ Chí Minh.', N'Phường Bến Thành, TP. Hồ Chí Minh', 10.7725, 106.6980, N'market', 1),
    (CAST('22222222-2222-4222-8222-222222222222' AS UNIQUEIDENTIFIER), N'dinh-doc-lap', N'Dinh Độc Lập', N'Địa điểm tham quan về lịch sử và kiến trúc.', N'135 Nam Kỳ Khởi Nghĩa, TP. Hồ Chí Minh', 10.7770, 106.6953, N'history', 1),
    (CAST('33333333-3333-4333-8333-333333333333' AS UNIQUEIDENTIFIER), N'buu-dien-trung-tam', N'Bưu điện Trung tâm Sài Gòn', N'Công trình kiến trúc tại khu vực trung tâm thành phố.', N'2 Công xã Paris, TP. Hồ Chí Minh', 10.7799, 106.6999, N'architecture', 1)
) AS v (Id, Slug, Name, Description, Address, Latitude, Longitude, Category, IsPublished)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Pois AS p WHERE p.Id = v.Id);

-- Fill only missing fixture photos; preserve images subsequently edited by admins.
UPDATE p SET ImageUrl = v.ImageUrl, ImageCredit = v.ImageCredit,
    ImageSourceUrl = v.ImageSourceUrl, ImageLicenseUrl = v.ImageLicenseUrl,
    UpdatedAt = SYSUTCDATETIME()
FROM dbo.Pois AS p
INNER JOIN (VALUES
    (N'cho-ben-thanh', N'/images/pois/ben-thanh.jpg', N'Riza · CC BY 2.0', N'https://commons.wikimedia.org/wiki/File:Ben_Thanh_market_2.jpg', N'https://creativecommons.org/licenses/by/2.0/'),
    (N'dinh-doc-lap', N'/images/pois/independence-palace.jpg', N'P. Hughes · CC BY 4.0', N'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City_-_Independence_Palace.jpg', N'https://creativecommons.org/licenses/by/4.0/'),
    (N'buu-dien-trung-tam', N'/images/pois/central-post-office.jpg', N'Prenn · CC BY-SA 3.0', N'https://commons.wikimedia.org/wiki/File:Clock_and_exterior_of_Saigon_Central_Post_Office.JPG', N'https://creativecommons.org/licenses/by-sa/3.0/')
) AS v (Slug, ImageUrl, ImageCredit, ImageSourceUrl, ImageLicenseUrl) ON p.Slug = v.Slug
WHERE p.ImageUrl IS NULL;
