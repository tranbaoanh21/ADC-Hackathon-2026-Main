import { type CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { announceMessage } from "./accessible-speech";
import { type Language, mobileCopy } from "./i18n";
import { colors } from "./theme";

const FIRST_CAPTURE_DELAY_MS = 900;
const NEXT_CAPTURE_DELAY_MS = 2200;
const BUSY_RETRY_DELAY_MS = 500;

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

  const mounted = useRef(true);
  const ready = useRef(false);
  const running = useRef(false);
  const busyRef = useRef(busy);
  const captureHandler = useRef(onCapture);
  const copyRef = useRef(copy);
  const languageRef = useRef(language);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    busyRef.current = busy;
    captureHandler.current = onCapture;
    copyRef.current = copy;
    languageRef.current = language;
  }, [busy, copy, language, onCapture]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ready.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function scheduleCapture(delay: number) {
    if (!mounted.current || !ready.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void captureFrame(), delay);
  }

  async function captureFrame() {
    if (!mounted.current || !ready.current || running.current) return;
    if (busyRef.current) {
      scheduleCapture(BUSY_RETRY_DELAY_MS);
      return;
    }

    running.current = true;
    setCapturing(true);
    setCameraError("");
    try {
      const picture = await camera.current?.takePictureAsync({
        quality: 0.65,
        exif: false,
        base64: false,
        skipProcessing: false,
      });
      if (picture?.uri) await captureHandler.current(picture.uri);
    } catch {
      if (mounted.current) {
        const message = copyRef.current.cameraCaptureError;
        setCameraError(message);
        await announceMessage(message, languageRef.current);
      }
    } finally {
      running.current = false;
      if (mounted.current) {
        setCapturing(false);
        scheduleCapture(NEXT_CAPTURE_DELAY_MS);
      }
    }
  }

  function handleCameraReady() {
    if (ready.current) return;
    ready.current = true;
    setCameraReady(true);
    void announceMessage(copy.cameraReadyAnnouncement, language);
    scheduleCapture(FIRST_CAPTURE_DELAY_MS);
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

  return (
    <View style={styles.cameraPanel}>
      <View
        accessible
        accessibilityLabel={`${cameraReady ? copy.cameraReady : copy.cameraStarting}. ${purpose}`}
        style={styles.cameraStatus}
      >
        <View style={styles.statusHeading}>
          <ActivityIndicator
            accessibilityElementsHidden
            color={colors.blue}
            importantForAccessibility="no"
            size="small"
          />
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

      {capturing ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.capturePulse}
        >
          <ActivityIndicator color={colors.tealDark} size="small" />
        </View>
      ) : null}
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
    justifyContent: "center",
    minHeight: 56,
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
  capturePulse: {
    alignItems: "center",
    backgroundColor: colors.tealSoft,
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 36,
  },
  pressed: { opacity: 0.75 },
});
