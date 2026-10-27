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
    "sourceLanguage": "vi"
  }],
  "pagination": { "page": 1, "limit": 20, "total": 3 }
}
```

## GET /pois/:id

Trả `{ "data": { ... } }`. UUID sai trả 400, không tìm thấy trả 404.
Query sai trả 400; database lỗi trả 503 từ POI Service.
Gateway trả 502 khi không liên lạc được upstream. Các method ghi chưa được hỗ trợ.

## Health

Cả gateway và POI Service có `/health/live` và `/health/ready`.
Live xác nhận tiến trình hoạt động; ready kiểm tra dependency, trả 503 nếu chưa sẵn sàng.
