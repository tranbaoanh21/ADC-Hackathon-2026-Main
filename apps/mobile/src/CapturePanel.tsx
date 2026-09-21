import { type CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";

interface CapturePanelProps {
  readonly busy: boolean;
  readonly purpose: string;
  readonly onCapture: (uri: string) => Promise<void>;
}

export function CapturePanel({ busy, purpose, onCapture }: CapturePanelProps) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facing] = useState<CameraType>("back");

  async function capture() {
    if (!camera.current || !cameraReady || busy) return;
    const picture = await camera.current.takePictureAsync({
      quality: 0.65,
      exif: false,
      base64: false,
      skipProcessing: false,
    });
    if (!picture?.uri) return;
    setCameraOpen(false);
    setCameraReady(false);
    await onCapture(picture.uri);
  }

  if (!permission) {
    return (
      <View style={styles.panel} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.help}>Đang kiểm tra quyền camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.panelTitle}>
          Cần quyền camera
        </Text>
        <Text style={styles.help}>
          Camera chỉ chụp khi bạn nhấn nút. Ảnh tạm bị xóa sau khi Express xử lý.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cho phép PathMemory dùng camera"
          onPress={() => void requestPermission()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Cho phép camera</Text>
        </Pressable>
      </View>
    );
  }

  if (!cameraOpen) {
    return (
      <View style={styles.panel}>
        <Text style={styles.help}>{purpose}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở camera để quét một landmark"
          accessibilityHint="Camera sau sẽ mở. Ảnh chỉ được chụp khi nhấn nút chụp."
          disabled={busy}
          onPress={() => setCameraOpen(true)}
          style={({ pressed }) => [
            styles.primaryButton,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{busy ? "Đang xử lý…" : "Mở camera"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraPanel}>
      <Text accessibilityLiveRegion="polite" style={styles.cameraStatus}>
        Camera đang mở. Hướng camera về biển hoặc lối vào landmark rồi đứng yên.
      </Text>
      <CameraView
        accessibilityLabel="Khung xem trước camera sau"
        facing={facing}
        onCameraReady={() => setCameraReady(true)}
        ref={camera}
        style={styles.camera}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chụp một frame để xác nhận landmark"
        disabled={!cameraReady || busy}
        onPress={() => void capture()}
        style={({ pressed }) => [
          styles.captureButton,
          (!cameraReady || busy) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {cameraReady ? "Chụp và phân tích" : "Đang khởi động camera…"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setCameraOpen(false);
          setCameraReady(false);
        }}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryButtonText}>Đóng camera</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.tealSoft,
    borderColor: "#8BC6C9",
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  panelTitle: { color: colors.navy, fontSize: 22, fontWeight: "700" },
  help: { color: "#243B53", fontSize: 17, lineHeight: 25 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  captureButton: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderColor: colors.focus,
    borderRadius: 12,
    borderWidth: 3,
    justifyContent: "center",
    minHeight: 60,
    padding: 14,
  },
  primaryButtonText: { color: colors.surface, fontSize: 18, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.teal,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
    padding: 12,
  },
  secondaryButtonText: { color: "#005760", fontSize: 17, fontWeight: "700" },
  cameraPanel: { gap: 12 },
  camera: { aspectRatio: 3 / 4, borderRadius: 16, overflow: "hidden", width: "100%" },
  cameraStatus: {
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    color: colors.warningText,
    fontSize: 16,
    lineHeight: 23,
    padding: 12,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
