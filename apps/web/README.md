# Web client

React/Vite là secondary client nhỏ cho human admin/buddy review; không phải bản sao đầy đủ của mobile.

MVP web cần list/edit/reorder/delete/verify landmark; cấu hình directed edge bằng dropdown `GO_STRAIGHT`, `TURN_LEFT`, `TURN_RIGHT` hoặc lựa chọn liên quan; chỉnh spoken cue; publish route và mark route outdated. Demo đầu tiên chỉ hiển thị ba landmark nhưng UI/data model không hard-code giới hạn đó. Mọi control/status phải dùng được bằng keyboard và screen reader.

Web chỉ gọi public Express API. Không đặt model key, database credential hoặc private service URL trong `VITE_*`.
