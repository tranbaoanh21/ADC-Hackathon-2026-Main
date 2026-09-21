# Web client

React/Vite là secondary client nhỏ cho human admin/buddy review; không phải bản sao đầy đủ của mobile.

MVP web chỉ cần list/edit/reorder/delete/verify tối đa ba landmark, publish route và mark route outdated. Mọi control/status phải dùng được bằng keyboard và screen reader.

Web chỉ gọi public Express API. Không đặt model key, database credential hoặc private service URL trong `VITE_*`.
