# POI API — giai đoạn 1

Base URL qua gateway: `http://localhost:4000/api`.

## GET /pois

Query: `q` (tối đa 200 ký tự), `category` (market/history/architecture hoặc danh mục khác),
`page` (1–100000, mặc định 1), `limit` (1–100, mặc định 20).
Tìm theo tên hoặc địa chỉ. Chỉ trả POI được xuất bản.

```json
{
  "data": [{
    "id": "11111111-1111-4111-8111-111111111111",
    "slug": "cho-ben-thanh",
    "name": "Chợ Bến Thành",
    "description": "Khu chợ nổi tiếng tại trung tâm Thành phố Hồ Chí Minh.",
    "address": "Phường Bến Thành, TP. Hồ Chí Minh",
    "latitude": 10.7725,
    "longitude": 106.698,
    "category": "market",
    "sourceLanguage": "vi",
    "imageUrl": "/api/pois/11111111-1111-4111-8111-111111111111/image",
    "imageCredit": "Riza · CC BY 2.0",
    "imageSourceUrl": "https://commons.wikimedia.org/wiki/File:Ben_Thanh_market_2.jpg",
    "imageLicenseUrl": "https://creativecommons.org/licenses/by/2.0/"
  }],
  "pagination": { "page": 1, "limit": 20, "total": 3 }
}
```

## GET /pois/:id

Các trường ảnh có thể là `null`. Ảnh lưu trong database có URL `/api/pois/:id/image`; HTTPS vẫn dùng được cho ảnh trên media host.
Chạy migration và seed sau khi cập nhật code để bổ sung ảnh mẫu vào database đã có.

Trả `{ "data": { ... } }`. UUID sai trả 400, không tìm thấy trả 404.
Query sai trả 400; database lỗi trả 503 từ POI Service.
Gateway trả 502 khi không liên lạc được upstream. Các method ghi chưa được hỗ trợ.

## GET /pois/:id/image

Trả bytes ảnh gốc từ `PoiDb.dbo.PoiImages.Content` (VARBINARY(MAX)), cùng Content-Type, ETag và Cache-Control.
Gateway chuyển tiếp nguyên bytes; không dùng JSON/base64 cho nội dung ảnh.
Nếu `If-None-Match` trùng ETag thì trả 304. UUID sai trả 400, POI chưa xuất bản hoặc chưa có ảnh trả 404.
Hiện hỗ trợ một ảnh chính trên mỗi POI, tối đa 5 MiB, JPEG/PNG/WebP.
Ảnh mẫu được nhập vào database khi chạy `npm run db:seed`; file fixture chỉ dùng để khởi tạo, không phục vụ trực tiếp từ frontend.

## Health

Cả gateway và POI Service có `/health/live` và `/health/ready`.
Live xác nhận tiến trình hoạt động; ready kiểm tra dependency, trả 503 nếu chưa sẵn sàng.
