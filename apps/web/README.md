# Web client

React/Vite là secondary client nhỏ cho human admin/buddy review; không phải bản sao đầy đủ của mobile.

MVP web cần list/edit/reorder/delete/verify các draft đã tồn tại trong PostgreSQL; cấu hình directed edge bằng các dropdown from-landmark, to-landmark và maneuver (`GO_STRAIGHT`, `TURN_LEFT`, `TURN_RIGHT` hoặc lựa chọn liên quan); chỉnh spoken cue; publish graph và mark graph outdated. `displayOrder` chỉ sắp xếp danh sách, không biểu diễn vị trí. Demo hiển thị bốn landmark có một nhánh nhưng UI/data model không hard-code giới hạn. Mọi control/status phải dùng được bằng keyboard và screen reader.

Web chỉ gọi public Express API. Không đặt model key, database credential hoặc private service URL trong `VITE_*`.

Chạy local cùng Express:

```bash
npm run dev:web
```

Đặt `VITE_API_URL` thành public/local Express URL. Web đã có:

- mở hoặc tạo graph;
- xem landmark evidence và trạng thái bằng text, không chỉ bằng màu;
- edit/verify từng landmark draft;
- tạo, xóa và chỉnh directed edge với `from`, `to`, maneuver và spoken cue rõ ràng;
- phát lại spoken cue bằng browser speech synthesis;
- publish graph đủ điều kiện hoặc mark published graph outdated;
- live-region status, alert error, visible focus và responsive layout.

Seeded demo graph đã published nên được hiển thị read-only. Để thử review flow, tạo graph draft rồi dùng mobile Learn flow để thêm `AI_DRAFT` landmark vào cùng route ID.
