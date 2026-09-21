import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { announceMessage, stopSpeaking } from "./src/accessible-speech";
import {
  API_BASE_URL,
  createRoute,
  finishSession,
  getReachableDestinations,
  getRoute,
  observeFrame,
  ProductApiError,
  saveLandmarkDraft,
  startLearnSession,
  startNavigateSession,
} from "./src/api";
import { CapturePanel } from "./src/CapturePanel";
import { presentNavigationObservation, shouldApplyObservation } from "./src/mobile-state";
import { colors } from "./src/theme";
import type {
  CandidateLandmark,
  LandmarkSummary,
  ObservationResponse,
  RouteSession,
  WorkplaceGraph,
} from "./src/types";

const DEMO_ROUTE_ID = "7fbd42a3-356f-4ad7-b3f5-68b79a1154b7";

type Screen =
  | "HOME"
  | "LEARN_SETUP"
  | "LEARN_SCAN"
  | "LEARN_REVIEW"
  | "NAV_SETUP"
  | "NAV_SCAN"
  | "COMPLETE";

function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  hint,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly secondary?: boolean;
  readonly hint?: string;
}) {
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={secondary ? styles.buttonSecondaryText : styles.buttonPrimaryText}>{label}</Text>
    </Pressable>
  );
}

function Choice({
  item,
  selected,
  onPress,
}: {
  readonly item: LandmarkSummary;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={item.name}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.choiceName, selected && styles.choiceNameSelected]}>{item.name}</Text>
      <Text style={[styles.choiceMeta, selected && styles.choiceMetaSelected]}>
        {selected ? "Đã chọn" : "Nhấn để chọn"}
      </Text>
    </Pressable>
  );
}

function SafetyNotice() {
  return (
    <View accessibilityRole="summary" style={styles.safetyNotice}>
      <Text style={styles.safetyTitle}>Giới hạn an toàn</Text>
      <Text style={styles.safetyText}>
        PathMemory chỉ xác nhận landmark đã được buddy duyệt và đọc chỉ dẫn tương đối. Ứng dụng
        không phát hiện chướng ngại, không khẳng định đường đi an toàn và không thay thế gậy, chó
        dẫn đường hoặc kỹ năng định hướng và di chuyển.
      </Text>
    </View>
  );
}

function LogoMark() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.logoMark}
    >
      <View style={styles.logoPathVertical} />
      <View style={styles.logoPathHorizontal} />
      <View style={[styles.logoNode, styles.logoNodeStart]} />
      <View style={[styles.logoNode, styles.logoNodeMiddle]} />
      <View style={[styles.logoNode, styles.logoNodeEnd]} />
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("HOME");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Sẵn sàng.");

  const [workplaceName, setWorkplaceName] = useState("Văn phòng demo PathMemory");
  const [routeId, setRouteId] = useState(DEMO_ROUTE_ID);
  const [graph, setGraph] = useState<WorkplaceGraph | null>(null);
  const [session, setSession] = useState<RouteSession | null>(null);
  const [candidate, setCandidate] = useState<CandidateLandmark | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateObservationId, setCandidateObservationId] = useState("");
  const [savedLandmarks, setSavedLandmarks] = useState(0);

  const [origin, setOrigin] = useState<LandmarkSummary | null>(null);
  const [destinations, setDestinations] = useState<readonly LandmarkSummary[]>([]);
  const [destination, setDestination] = useState<LandmarkSummary | null>(null);
  const [expectedLandmark, setExpectedLandmark] = useState<LandmarkSummary | null>(null);
  const [lastObservation, setLastObservation] = useState<ObservationResponse | null>(null);
  const latestRequestId = useRef("");
  const requestCounter = useRef(0);

  useEffect(() => () => void stopSpeaking(), []);

  function clearFeedback() {
    setError("");
    setStatus("");
  }

  function describeError(value: unknown): string {
    return value instanceof ProductApiError
      ? value.message
      : "Đã xảy ra lỗi ngoài dự kiến. Hãy thử lại.";
  }

  function goHome() {
    void stopSpeaking();
    setScreen("HOME");
    setSession(null);
    setCandidate(null);
    setOrigin(null);
    setDestination(null);
    setDestinations([]);
    setExpectedLandmark(null);
    setLastObservation(null);
    setError("");
    setStatus("Sẵn sàng.");
  }

  async function beginLearn() {
    const name = workplaceName.trim();
    if (!name) {
      setError("Hãy nhập tên khu vực làm việc.");
      return;
    }
    clearFeedback();
    setBusy(true);
    try {
      const newGraph = await createRoute(name);
      const newSession = await startLearnSession(newGraph.id);
      setGraph(newGraph);
      setRouteId(newGraph.id);
      setSession(newSession);
      setSavedLandmarks(0);
      setStatus(`Đã tạo bản nháp ${newGraph.name}. Bắt đầu quét landmark đầu tiên.`);
      setScreen("LEARN_SCAN");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  function newRequestId(): string {
    requestCounter.current += 1;
    return `mobile-${Date.now()}-${requestCounter.current}`;
  }

  async function captureLearnFrame(uri: string) {
    if (session?.mode !== "LEARN") {
      setError("Phiên ghi nhận landmark không còn hoạt động.");
      return;
    }
    clearFeedback();
    setBusy(true);
    const requestId = newRequestId();
    latestRequestId.current = requestId;
    try {
      const response = await observeFrame(session.id, uri, requestId);
      if (!shouldApplyObservation(latestRequestId.current, response.requestId)) return;
      setLastObservation(response);
      setStatus(response.spokenMessage);
      await announceMessage(response.spokenMessage);
      if (response.candidateLandmark) {
        setCandidate(response.candidateLandmark);
        setCandidateName(response.candidateLandmark.proposedName);
        setCandidateObservationId(response.observationId);
        setScreen("LEARN_REVIEW");
      }
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function saveCandidate() {
    if (!session || !candidateObservationId || !candidateName.trim()) {
      setError("Tên landmark và bằng chứng quan sát là bắt buộc.");
      return;
    }
    clearFeedback();
    setBusy(true);
    try {
      const saved = await saveLandmarkDraft(
        session.id,
        candidateObservationId,
        candidateName.trim(),
      );
      const message = `Đã lưu ${saved.name} ở trạng thái chờ buddy duyệt.`;
      setSavedLandmarks((count) => count + 1);
      setCandidate(null);
      setCandidateName("");
      setCandidateObservationId("");
      setLastObservation(null);
      setStatus(message);
      await announceMessage(message);
      setScreen("LEARN_SCAN");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function endLearn() {
    if (!session) return;
    clearFeedback();
    setBusy(true);
    try {
      await finishSession(session.id);
      setStatus(`Đã kết thúc. ${savedLandmarks} landmark đang chờ buddy duyệt trên admin web.`);
      setScreen("COMPLETE");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function loadPublishedRoute() {
    const trimmedRouteId = routeId.trim();
    if (!trimmedRouteId) {
      setError("Hãy nhập mã mạng landmark.");
      return;
    }
    clearFeedback();
    setBusy(true);
    try {
      const loaded = await getRoute(trimmedRouteId);
      if (loaded.status !== "PUBLISHED") {
        throw new ProductApiError(
          "Mạng landmark này chưa được buddy duyệt và xuất bản.",
          "INVALID_STATE",
          false,
        );
      }
      setGraph(loaded);
      setOrigin(null);
      setDestination(null);
      setDestinations([]);
      setStatus(`Đã tải ${loaded.name}, gồm ${loaded.landmarks.length} landmark đã duyệt.`);
    } catch (value) {
      setGraph(null);
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function chooseOrigin(item: LandmarkSummary) {
    if (!graph) return;
    setOrigin(item);
    setDestination(null);
    setDestinations([]);
    clearFeedback();
    setBusy(true);
    try {
      const reachable = await getReachableDestinations(graph.id, item.id);
      setDestinations(reachable.destinations);
      setStatus(`Từ ${item.name} có ${reachable.destinations.length} điểm đến khả dụng.`);
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function beginNavigation() {
    if (!graph || !origin || !destination) {
      setError("Hãy chọn điểm xuất phát và điểm đến.");
      return;
    }
    clearFeedback();
    setBusy(true);
    try {
      const newSession = await startNavigateSession(graph.id, origin.id, destination.id);
      setSession(newSession);
      setExpectedLandmark(origin);
      setLastObservation(null);
      const message = `Trước tiên hãy quét để xác nhận bạn đang đứng tại ${origin.name}.`;
      setStatus(message);
      await announceMessage(message);
      setScreen("NAV_SCAN");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function captureNavigationFrame(uri: string) {
    if (session?.mode !== "NAVIGATE") {
      setError("Phiên định hướng không còn hoạt động.");
      return;
    }
    clearFeedback();
    setBusy(true);
    const requestId = newRequestId();
    latestRequestId.current = requestId;
    try {
      const response = await observeFrame(session.id, uri, requestId);
      if (!shouldApplyObservation(latestRequestId.current, response.requestId)) return;
      setLastObservation(response);
      setExpectedLandmark(response.expectedLandmark);
      const presentation = presentNavigationObservation(response);
      setStatus(presentation.message);
      await announceMessage(presentation.message);
      if (presentation.completed) setScreen("COMPLETE");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <LogoMark />
            <View style={styles.flex}>
              <Text accessibilityRole="header" style={styles.brand}>
                PathMemory
              </Text>
              <Text style={styles.tagline}>Verified landmarks. Familiar journeys.</Text>
            </View>
          </View>

          {screen !== "HOME" ? (
            <Button label="Về màn hình chính" onPress={goHome} secondary />
          ) : null}

          {error ? (
            <View
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorBox}
            >
              <Text style={styles.errorTitle}>Không thể tiếp tục</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {status ? (
            <View accessibilityLiveRegion="polite" style={styles.statusBox}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          ) : null}

          {busy ? (
            <View accessibilityLiveRegion="polite" style={styles.busyRow}>
              <ActivityIndicator color="#006D77" />
              <Text style={styles.busyText}>Đang xử lý, vui lòng đứng yên…</Text>
            </View>
          ) : null}

          {screen === "HOME" ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Bạn muốn làm gì?
              </Text>
              <Text style={styles.body}>
                Ngày đầu dùng chế độ Ghi nhận cùng buddy. Những ngày sau dùng chế độ Đi theo tuyến
                đã được buddy duyệt.
              </Text>
              <Button
                hint="Tạo bản nháp landmark để buddy duyệt sau"
                label="Ghi nhận landmark ngày đầu"
                onPress={() => {
                  clearFeedback();
                  setScreen("LEARN_SETUP");
                }}
              />
              <Button
                hint="Chọn điểm đầu và điểm đến trong mạng landmark đã xuất bản"
                label="Đi theo tuyến đã duyệt"
                onPress={() => {
                  clearFeedback();
                  setRouteId(DEMO_ROUTE_ID);
                  setGraph(null);
                  setScreen("NAV_SETUP");
                }}
                secondary
              />
              <SafetyNotice />
              <Text style={styles.apiNote}>Product API: {API_BASE_URL}</Text>
            </View>
          ) : null}

          {screen === "LEARN_SETUP" ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Tạo bản nháp nơi làm việc
              </Text>
              <Text style={styles.body}>
                Đi cùng buddy. Mỗi lần chỉ quét một biển hoặc lối vào ổn định; AI đề xuất, còn buddy
                duyệt trên web trước khi xuất bản.
              </Text>
              <Text style={styles.label}>Tên khu vực</Text>
              <TextInput
                accessibilityLabel="Tên khu vực làm việc"
                editable={!busy}
                onChangeText={setWorkplaceName}
                style={styles.input}
                value={workplaceName}
              />
              <Button
                disabled={busy}
                label="Tạo bản nháp và bắt đầu"
                onPress={() => void beginLearn()}
              />
            </View>
          ) : null}

          {screen === "LEARN_SCAN" ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Quét landmark ổn định
              </Text>
              <Text style={styles.counter}>{savedLandmarks} landmark đã lưu chờ duyệt</Text>
              <Text selectable style={styles.routeCode}>
                Mã bản nháp: {routeId}
              </Text>
              <CapturePanel
                busy={busy}
                onCapture={captureLearnFrame}
                purpose="Đứng yên trước một biển, cửa phòng hoặc khu vực thang máy. Mở camera rồi chụp một frame rõ nét."
              />
              <Button
                disabled={busy}
                label="Kết thúc phiên ghi nhận"
                onPress={() => void endLearn()}
                secondary
              />
            </View>
          ) : null}

          {screen === "LEARN_REVIEW" && candidate ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Kiểm tra đề xuất AI
              </Text>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Loại landmark</Text>
                <Text style={styles.cardValue}>{candidate.type}</Text>
                <Text style={styles.cardLabel}>Mô tả nháp</Text>
                <Text style={styles.cardValue}>{candidate.draftDescription}</Text>
                <Text style={styles.cardLabel}>Chữ nhìn thấy</Text>
                <Text style={styles.cardValue}>
                  {candidate.visibleText.join(", ") || "Không có"}
                </Text>
              </View>
              <Text style={styles.label}>Tên landmark muốn lưu</Text>
              <TextInput
                accessibilityLabel="Tên landmark muốn lưu"
                editable={!busy}
                onChangeText={setCandidateName}
                style={styles.input}
                value={candidateName}
              />
              <Button
                disabled={busy}
                label="Lưu bản nháp để buddy duyệt"
                onPress={() => void saveCandidate()}
              />
              <Button
                disabled={busy}
                label="Bỏ kết quả và quét lại"
                onPress={() => {
                  setCandidate(null);
                  setCandidateObservationId("");
                  setScreen("LEARN_SCAN");
                }}
                secondary
              />
            </View>
          ) : null}

          {screen === "NAV_SETUP" ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Chọn tuyến đã duyệt
              </Text>
              <Text style={styles.body}>
                Mặc định là mạng demo bốn landmark. Chỉ mạng đã xuất bản mới có thể dùng để định
                hướng.
              </Text>
              <Text style={styles.label}>Mã mạng landmark</Text>
              <TextInput
                accessibilityLabel="Mã mạng landmark đã xuất bản"
                autoCapitalize="none"
                editable={!busy}
                onChangeText={setRouteId}
                style={styles.input}
                value={routeId}
              />
              <Button
                disabled={busy}
                label="Tải mạng landmark"
                onPress={() => void loadPublishedRoute()}
              />

              {graph ? (
                <View style={styles.subsection}>
                  <Text accessibilityRole="header" style={styles.subheading}>
                    1. Chọn điểm xuất phát
                  </Text>
                  {graph.landmarks.map((item) => (
                    <Choice
                      item={item}
                      key={item.id}
                      onPress={() => void chooseOrigin(item)}
                      selected={origin?.id === item.id}
                    />
                  ))}
                </View>
              ) : null}

              {origin ? (
                <View style={styles.subsection}>
                  <Text accessibilityRole="header" style={styles.subheading}>
                    2. Chọn điểm đến có thể tới
                  </Text>
                  {destinations.map((item) => (
                    <Choice
                      item={item}
                      key={item.id}
                      onPress={() => setDestination(item)}
                      selected={destination?.id === item.id}
                    />
                  ))}
                </View>
              ) : null}

              {origin && destination ? (
                <Button
                  disabled={busy}
                  label={`Bắt đầu từ ${origin.name} đến ${destination.name}`}
                  onPress={() => void beginNavigation()}
                />
              ) : null}
              <SafetyNotice />
            </View>
          ) : null}

          {screen === "NAV_SCAN" ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Xác nhận landmark
              </Text>
              <View style={styles.expectedCard}>
                <Text style={styles.cardLabel}>Landmark cần xác nhận</Text>
                <Text style={styles.expectedName}>{expectedLandmark?.name ?? "Đang cập nhật"}</Text>
              </View>
              {lastObservation ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={
                    lastObservation.routeState === "STOP_AND_RESCAN" ||
                    lastObservation.routeState === "AWAITING_START_CONFIRMATION"
                      ? styles.warningCard
                      : styles.instructionCard
                  }
                >
                  <Text style={styles.instructionHeading}>
                    {presentNavigationObservation(lastObservation).heading}
                  </Text>
                  <Text style={styles.instructionText}>{lastObservation.spokenMessage}</Text>
                  <Button
                    label="Đọc lại hướng dẫn"
                    onPress={() => void announceMessage(lastObservation.spokenMessage)}
                    secondary
                  />
                </View>
              ) : null}
              <CapturePanel
                busy={busy}
                onCapture={captureNavigationFrame}
                purpose={`Đứng yên và hướng camera về dấu hiệu của ${expectedLandmark?.name ?? "landmark cần xác nhận"}.`}
              />
              <SafetyNotice />
            </View>
          ) : null}

          {screen === "COMPLETE" ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.heading}>
                Hoàn tất
              </Text>
              <Text style={styles.body}>{status}</Text>
              {graph?.status === "DRAFT" ? (
                <Text selectable style={styles.routeCode}>
                  Gửi mã {graph.id} cho buddy để mở trên admin web, duyệt landmark và tạo chỉ dẫn
                  tương đối.
                </Text>
              ) : null}
              <Button label="Về màn hình chính" onPress={goHome} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  flex: { flex: 1 },
  container: { gap: 18, padding: 22, paddingBottom: 48 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  logoPathVertical: {
    backgroundColor: colors.surface,
    height: 34,
    left: 17,
    position: "absolute",
    top: 11,
    width: 4,
  },
  logoPathHorizontal: {
    backgroundColor: colors.surface,
    height: 4,
    left: 19,
    position: "absolute",
    top: 14,
    width: 21,
  },
  logoNode: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    height: 11,
    position: "absolute",
    width: 11,
  },
  logoNodeStart: { left: 13, top: 7 },
  logoNodeMiddle: { left: 35, top: 10 },
  logoNodeEnd: { left: 13, top: 38 },
  brand: { color: colors.navy, fontSize: 26, fontWeight: "800" },
  tagline: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  section: { gap: 16 },
  subsection: { gap: 10, marginTop: 8 },
  heading: { color: colors.navy, fontSize: 30, fontWeight: "800", lineHeight: 37 },
  subheading: { color: colors.navy, fontSize: 22, fontWeight: "700", lineHeight: 29 },
  body: { color: "#334E68", fontSize: 18, lineHeight: 27 },
  label: { color: "#102A43", fontSize: 17, fontWeight: "700" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#627D98",
    borderRadius: 12,
    borderWidth: 2,
    color: "#102A43",
    fontSize: 18,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    alignItems: "center",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonPrimary: { backgroundColor: colors.teal },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.teal,
    borderWidth: 2,
  },
  buttonPrimaryText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", textAlign: "center" },
  buttonSecondaryText: { color: "#005760", fontSize: 18, fontWeight: "700", textAlign: "center" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  statusBox: { backgroundColor: "#E7F5F5", borderRadius: 12, padding: 14 },
  statusText: { color: "#17494D", fontSize: 16, lineHeight: 24 },
  errorBox: {
    backgroundColor: "#FDECEC",
    borderColor: "#B42318",
    borderRadius: 12,
    borderWidth: 2,
    padding: 14,
  },
  errorTitle: { color: "#7A271A", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  errorText: { color: "#7A271A", fontSize: 16, lineHeight: 24 },
  busyRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  busyText: { color: "#334E68", fontSize: 16 },
  safetyNotice: {
    backgroundColor: "#FFF3CD",
    borderColor: "#D8A900",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  safetyTitle: { color: "#5C4200", fontSize: 17, fontWeight: "800" },
  safetyText: { color: "#5C4200", fontSize: 15, lineHeight: 23 },
  apiNote: { color: "#627D98", fontSize: 12 },
  counter: { color: "#087F5B", fontSize: 18, fontWeight: "700" },
  routeCode: {
    backgroundColor: "#E8EEF3",
    borderRadius: 10,
    color: "#243B53",
    fontSize: 15,
    lineHeight: 22,
    padding: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BCCCDC",
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    padding: 16,
  },
  cardLabel: {
    color: "#52606D",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
    textTransform: "uppercase",
  },
  cardValue: { color: "#102A43", fontSize: 18, lineHeight: 26 },
  choice: {
    backgroundColor: "#FFFFFF",
    borderColor: "#829AB1",
    borderRadius: 12,
    borderWidth: 2,
    gap: 3,
    minHeight: 64,
    padding: 14,
  },
  choiceSelected: { backgroundColor: "#006D77", borderColor: "#FFD166", borderWidth: 3 },
  choiceName: { color: "#102A43", fontSize: 18, fontWeight: "700" },
  choiceNameSelected: { color: "#FFFFFF" },
  choiceMeta: { color: "#627D98", fontSize: 14 },
  choiceMetaSelected: { color: "#E7F5F5" },
  expectedCard: { backgroundColor: "#102A43", borderRadius: 14, gap: 6, padding: 18 },
  expectedName: { color: "#FFFFFF", fontSize: 25, fontWeight: "800" },
  instructionCard: {
    backgroundColor: "#E7F5F5",
    borderColor: "#006D77",
    borderRadius: 14,
    borderWidth: 2,
    gap: 10,
    padding: 16,
  },
  warningCard: {
    backgroundColor: "#FFF3CD",
    borderColor: "#D8A900",
    borderRadius: 14,
    borderWidth: 2,
    gap: 10,
    padding: 16,
  },
  instructionHeading: { color: "#102A43", fontSize: 20, fontWeight: "800" },
  instructionText: { color: "#243B53", fontSize: 18, lineHeight: 27 },
});
