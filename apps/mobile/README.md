# Mobile client

Expo/React Native là primary client của landmark-graph MVP.

Mobile chỉ gọi public Express HTTPS URL. Không đặt model token trong `EXPO_PUBLIC_*`.

Mobile phải hỗ trợ Learn, screen-reader origin/destination selection, camera confirmation of the selected origin, TTS for human-reviewed edge cues, stale-response suppression và accessible loading/error/status. Client không hard-code số landmark, không tính path/toạ độ, không quyết định match và không tuyên bố safety navigation. Người dùng tiếp tục dùng gậy, chó dẫn đường hoặc kỹ năng O&M để phát hiện chướng ngại và di chuyển an toàn.
