# Mobile client

Expo/React Native là primary client của unique-landmark MVP.

Mobile chỉ gọi public Express HTTPS URL. Không đặt model token trong `EXPO_PUBLIC_*`.

Mobile phải hỗ trợ Learn và Navigate cho một route tối đa ba landmark, camera sampling, TTS, stale-response suppression và accessible loading/error/status. Mobile không tính tọa độ, không quyết định landmark match và không tuyên bố safety navigation.
