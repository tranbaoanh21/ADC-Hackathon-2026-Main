# Mobile client

Expo/React Native là primary client của unique-landmark MVP.

Mobile chỉ gọi public Express HTTPS URL. Không đặt model token trong `EXPO_PUBLIC_*`.

Mobile phải hỗ trợ Learn và Navigate theo ordered landmarks/edges, camera sampling, TTS, stale-response suppression và accessible loading/error/status. Demo đầu tiên dùng ba landmark nhưng client không được hard-code số này. Mobile không tính tọa độ, không quyết định landmark match và không tuyên bố safety navigation.
