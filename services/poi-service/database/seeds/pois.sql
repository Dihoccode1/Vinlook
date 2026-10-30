-- Development fixtures; update descriptive content before publishing to users.
INSERT INTO dbo.pois ( slug, name, description, address, latitude, longitude, category, is_published)
SELECT v.* FROM (VALUES
    (N'cho-ben-thanh', N'Chợ Bến Thành', N'Khu chợ nổi tiếng tại trung tâm Thành phố Hồ Chí Minh.', N'Phường Bến Thành, TP. Hồ Chí Minh', 10.7725, 106.6980, N'market', 1),
    (N'dinh-doc-lap', N'Dinh Độc Lập', N'Địa điểm tham quan về lịch sử và kiến trúc.', N'135 Nam Kỳ Khởi Nghĩa, TP. Hồ Chí Minh', 10.7770, 106.6953, N'history', 1),
    (N'buu-dien-trung-tam', N'Bưu điện Trung tâm Sài Gòn', N'Công trình kiến trúc tại khu vực trung tâm thành phố.', N'2 Công xã Paris, TP. Hồ Chí Minh', 10.7799, 106.6999, N'architecture', 1)
) AS v ( slug, name, description, address, latitude, longitude, category, is_published)
WHERE NOT EXISTS (SELECT 1 FROM dbo.pois AS p WHERE p.slug = v.slug);

-- Fill only missing fixture photos; preserve images subsequently edited by admins.
UPDATE p SET image_url = v.image_url, image_credit = v.image_credit,
    image_source_url = v.image_source_url, image_license_url = v.image_license_url,
    updated_at = SYSUTCDATETIME()
FROM dbo.pois AS p
INNER JOIN (VALUES
    (N'cho-ben-thanh', N'/images/pois/ben-thanh.jpg', N'Riza · CC BY 2.0', N'https://commons.wikimedia.org/wiki/File:Ben_Thanh_market_2.jpg', N'https://creativecommons.org/licenses/by/2.0/'),
    (N'dinh-doc-lap', N'/images/pois/independence-palace.jpg', N'P. Hughes · CC BY 4.0', N'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City_-_Independence_Palace.jpg', N'https://creativecommons.org/licenses/by/4.0/'),
    (N'buu-dien-trung-tam', N'/images/pois/central-post-office.jpg', N'Prenn · CC BY-SA 3.0', N'https://commons.wikimedia.org/wiki/File:Clock_and_exterior_of_Saigon_Central_Post_Office.JPG', N'https://creativecommons.org/licenses/by-sa/3.0/')
) AS v (slug, image_url, image_credit, image_source_url, image_license_url) ON p.slug = v.slug
WHERE p.image_url IS NULL;
