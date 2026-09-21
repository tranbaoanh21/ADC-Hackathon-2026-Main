# Web client

React/Vite là secondary client nhỏ cho human admin/buddy review; không phải bản sao đầy đủ của mobile.

MVP web cần list/edit/reorder/delete/verify các draft đã tồn tại trong PostgreSQL; cấu hình directed edge bằng các dropdown from-landmark, to-landmark và maneuver (`GO_STRAIGHT`, `TURN_LEFT`, `TURN_RIGHT` hoặc lựa chọn liên quan); chỉnh spoken cue; publish graph và mark graph outdated. `displayOrder` chỉ sắp xếp danh sách, không biểu diễn vị trí. Demo hiển thị bốn landmark có một nhánh nhưng UI/data model không hard-code giới hạn. Mọi control/status phải dùng được bằng keyboard và screen reader.

Web chỉ gọi public Express API. Không đặt model key, database credential hoặc private service URL trong `VITE_*`.

Scaffold hiện tại chạy bằng:

```bash
npm run dev:web
```

Hiện chỉ có accessible placeholder shell; admin review flow chưa được implement.
