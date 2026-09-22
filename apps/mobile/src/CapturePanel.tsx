import { type CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { announceMessage } from "./accessible-speech";
import { type Language, mobileCopy } from "./i18n";
import { colors } from "./theme";

interface CapturePanelProps {
  readonly busy: boolean;
  readonly language: Language;
  readonly purpose: string;
  readonly onCapture: (uri: string) => Promise<void>;
}

export function CapturePanel({ busy, language, purpose, onCapture }: CapturePanelProps) {
  const copy = mobileCopy[language];
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facing] = useState<CameraType>("back");

  const captureDisabled = !cameraReady || busy || capturing;

  async function captureFrame() {
    if (captureDisabled) return;

    setCapturing(true);
    setCameraError("");
    await announceMessage(copy.captureProcessing, language);
    try {
      const picture = await camera.current?.takePictureAsync({
        quality: 0.65,
        exif: false,
        base64: false,
        skipProcessing: false,
      });
      if (!picture?.uri) throw new Error("Camera returned no temporary photo.");
      await onCapture(picture.uri);
    } catch {
      const message = copy.cameraCaptureError;
      setCameraError(message);
      await announceMessage(message, language);
    } finally {
      setCapturing(false);
    }
  }

  function handleCameraReady() {
    if (cameraReady) return;
    setCameraReady(true);
    void announceMessage(copy.cameraReadyAnnouncement, language);
  }

  if (!permission) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.panel}>
        <ActivityIndicator color={colors.blue} />
        <Text style={styles.help}>{copy.cameraChecking}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.panelTitle}>
          {copy.cameraPermissionTitle}
        </Text>
        <Text style={styles.help}>{copy.cameraPermissionHelp}</Text>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={copy.cameraPermissionTitle}
          focusable
          importantForAccessibility="yes"
          onPress={() => void requestPermission()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>{copy.continuePermission}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraPanel}>
      <View
        accessible
        accessibilityLabel={`${cameraReady ? copy.cameraReady : copy.cameraStarting}. ${purpose}. ${copy.cameraPositionHelp}`}
        style={styles.cameraStatus}
      >
        <View style={styles.statusHeading}>
          {!cameraReady ? (
            <ActivityIndicator
              accessibilityElementsHidden
              color={colors.blue}
              importantForAccessibility="no"
              size="small"
            />
          ) : null}
          <Text style={styles.cameraStatusTitle}>
            {cameraReady ? copy.cameraReady : copy.cameraStarting}
          </Text>
        </View>
        <Text style={styles.cameraStatusText}>{purpose}</Text>
        <Text style={styles.cameraStatusMeta}>{copy.cameraPositionHelp}</Text>
      </View>

      {cameraError ? (
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{cameraError}</Text>
        </View>
      ) : null}

      <CameraView
        accessibilityElementsHidden
        facing={facing}
        importantForAccessibility="no-hide-descendants"
        onCameraReady={handleCameraReady}
        ref={camera}
        style={styles.camera}
      />

      <Pressable
        accessible
        accessibilityHint={copy.captureLandmarkHint}
        accessibilityLabel={copy.captureLandmark}
        accessibilityRole="button"
        accessibilityState={{ busy: busy || capturing, disabled: captureDisabled }}
        disabled={captureDisabled}
        focusable
        importantForAccessibility="yes"
        onPress={() => void captureFrame()}
        style={({ pressed }) => [
          styles.primaryButton,
          captureDisabled && styles.disabled,
          pressed && !captureDisabled && styles.pressed,
        ]}
      >
        {busy || capturing ? <ActivityIndicator color={colors.surface} size="small" /> : null}
        <Text style={styles.primaryButtonText}>
          {busy || capturing ? copy.captureProcessing : copy.captureLandmark}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  panelTitle: { color: colors.navy, fontSize: 22, fontWeight: "700" },
  help: { color: colors.muted, fontSize: 17, lineHeight: 26 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: { color: colors.surface, fontSize: 18, fontWeight: "700" },
  cameraPanel: { gap: 12 },
  camera: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.navy,
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
  },
  cameraStatus: {
    backgroundColor: colors.infoSoft,
    borderColor: "#B2DDFF",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  statusHeading: { alignItems: "center", flexDirection: "row", gap: 9 },
  cameraStatusTitle: { color: colors.infoText, fontSize: 17, fontWeight: "800" },
  cameraStatusText: { color: colors.navy, fontSize: 16, lineHeight: 24 },
  cameraStatusMeta: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  errorText: { color: colors.errorText, fontSize: 15, lineHeight: 22 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
});
