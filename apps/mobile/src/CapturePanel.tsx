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
    await announceMessage(copy.cameraProcessingAnnouncement, language);
    await onCapture(picture.uri);
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
          accessibilityRole="button"
          accessibilityLabel={copy.cameraPermissionTitle}
          onPress={() => void requestPermission()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>{copy.continuePermission}</Text>
        </Pressable>
      </View>
    );
  }

  if (!cameraOpen) {
    return (
      <View style={styles.panel}>
        <View style={styles.stepTag}>
          <Text style={styles.stepTagText}>{copy.cameraClosed}</Text>
        </View>
        <Text style={styles.help}>{purpose}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.cameraOpenLabel}
          accessibilityHint={copy.cameraOpenHint}
          disabled={busy}
          onPress={() => setCameraOpen(true)}
          style={({ pressed }) => [
            styles.primaryButton,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{busy ? copy.processing : copy.openCamera}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraPanel}>
      <View accessibilityLiveRegion="polite" style={styles.cameraStatus}>
        <Text style={styles.cameraStatusTitle}>
          {cameraReady ? copy.cameraReady : copy.cameraStarting}
        </Text>
        <Text style={styles.cameraStatusText}>{copy.cameraPositionHelp}</Text>
      </View>
      <CameraView
        accessibilityElementsHidden
        facing={facing}
        importantForAccessibility="no-hide-descendants"
        onCameraReady={handleCameraReady}
        ref={camera}
        style={styles.camera}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityHint={copy.captureHint}
        accessibilityLabel={copy.captureLandmark}
        disabled={!cameraReady || busy}
        onPress={() => void capture()}
        style={({ pressed }) => [
          styles.captureButton,
          (!cameraReady || busy) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {cameraReady ? copy.captureLandmark : copy.cameraStartingButton}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={copy.closeCamera}
        accessibilityRole="button"
        onPress={() => {
          setCameraOpen(false);
          setCameraReady(false);
        }}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryButtonText}>{copy.closeCamera}</Text>
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
  stepTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.tealSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepTagText: { color: colors.tealDark, fontSize: 13, fontWeight: "800" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  captureButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderColor: colors.navy,
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
    borderColor: colors.blue,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 52,
    padding: 12,
  },
  secondaryButtonText: { color: colors.blueDark, fontSize: 17, fontWeight: "700" },
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
    gap: 4,
    padding: 14,
  },
  cameraStatusTitle: { color: colors.infoText, fontSize: 17, fontWeight: "800" },
  cameraStatusText: { color: colors.navy, fontSize: 15, lineHeight: 23 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
