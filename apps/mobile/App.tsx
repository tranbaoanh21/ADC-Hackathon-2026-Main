import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
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
import { type Language, localizeLandmarkName, mobileCopy } from "./src/i18n";
import {
  Button,
  Choice,
  LanguageSwitch,
  LogoMark,
  ModeCard,
  PageHeading,
  SummaryRow,
  Surface,
} from "./src/MobileUI";
import { presentNavigationObservation, shouldApplyObservation } from "./src/mobile-state";
import { colors } from "./src/theme";
import type {
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
  | "NAV_ROUTE"
  | "NAV_ORIGIN"
  | "NAV_DESTINATION"
  | "NAV_CONFIRM"
  | "NAV_SCAN"
  | "COMPLETE";

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const copy = mobileCopy[language];
  const [screen, setScreen] = useState<Screen>("HOME");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [workplaceName, setWorkplaceName] = useState(copy.demoWorkplace);
  const [graph, setGraph] = useState<WorkplaceGraph | null>(null);
  const [session, setSession] = useState<RouteSession | null>(null);
  const [savedLandmarks, setSavedLandmarks] = useState(0);

  const [origin, setOrigin] = useState<LandmarkSummary | null>(null);
  const [destinations, setDestinations] = useState<readonly LandmarkSummary[]>([]);
  const [destination, setDestination] = useState<LandmarkSummary | null>(null);
  const [expectedLandmark, setExpectedLandmark] = useState<LandmarkSummary | null>(null);
  const [lastObservation, setLastObservation] = useState<ObservationResponse | null>(null);

  const latestRequestId = useRef("");
  const requestCounter = useRef(0);
  const savedCandidateKeys = useRef(new Set<string>());
  const scrollRef = useRef<ScrollView>(null);
  const screenHeadingRef = useRef<View>(null);

  useEffect(() => () => void stopSpeaking(), []);

  // Each state-machine screen is a new page for screen-reader users, even though no router is used.
  // biome-ignore lint/correctness/useExhaustiveDependencies: screen changes must reset scroll and focus.
  useEffect(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
    const focusTimer = setTimeout(() => {
      const headingHandle = findNodeHandle(screenHeadingRef.current);
      if (headingHandle) AccessibilityInfo.setAccessibilityFocus(headingHandle);
    }, 180);
    return () => clearTimeout(focusTimer);
  }, [screen]);

  function clearFeedback() {
    setError("");
    setStatus("");
  }

  function changeLanguage(nextLanguage: Language) {
    setWorkplaceName((currentName) =>
      currentName === mobileCopy[language].demoWorkplace
        ? mobileCopy[nextLanguage].demoWorkplace
        : currentName,
    );
    setLanguage(nextLanguage);
  }

  function describeError(value: unknown): string {
    if (value instanceof ProductApiError) return copy.genericApiError;
    return copy.unknownError;
  }

  function goHome() {
    void stopSpeaking();
    setScreen("HOME");
    setSession(null);
    setOrigin(null);
    setDestination(null);
    setDestinations([]);
    setExpectedLandmark(null);
    setLastObservation(null);
    setGraph(null);
    setError("");
    setStatus("");
    savedCandidateKeys.current.clear();
  }

  async function beginLearn() {
    const name = workplaceName.trim();
    if (!name) {
      setError(copy.workplaceRequired);
      return;
    }
    clearFeedback();
    setBusy(true);
    try {
      const newGraph = await createRoute(name);
      const newSession = await startLearnSession(newGraph.id);
      setGraph(newGraph);
      setSession(newSession);
      setSavedLandmarks(0);
      savedCandidateKeys.current.clear();
      setStatus(copy.draftCreated(localizeLandmarkName(newGraph.name, language)));
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
      setError(copy.learnInactive);
      return;
    }
    clearFeedback();
    setBusy(true);
    const requestId = newRequestId();
    let candidateKey = "";
    latestRequestId.current = requestId;
    try {
      const response = await observeFrame(session.id, uri, requestId, language);
      if (!shouldApplyObservation(latestRequestId.current, response.requestId)) return;
      setLastObservation(response);
      const candidate = response.candidateLandmark;
      if (!candidate) return;

      candidateKey = candidate.proposedName.trim().toLocaleLowerCase();
      if (!candidateKey || savedCandidateKeys.current.has(candidateKey)) return;

      const saved = await saveLandmarkDraft(
        session.id,
        response.observationId,
        candidate.proposedName,
      );
      savedCandidateKeys.current.add(candidateKey);
      const message = copy.savedDraft(localizeLandmarkName(saved.name, language));
      setSavedLandmarks((count) => count + 1);
      setStatus(message);
      await announceMessage(message, language);
    } catch (value) {
      if (value instanceof ProductApiError && value.code === "DUPLICATE_LANDMARK") {
        if (candidateKey) savedCandidateKeys.current.add(candidateKey);
        setStatus(copy.duplicateLandmarkSkipped);
        return;
      }
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
      setStatus(copy.learnFinished(savedLandmarks));
      setScreen("COMPLETE");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function loadPublishedRoute(requestedRouteId: string) {
    const trimmedRouteId = requestedRouteId.trim();
    if (!trimmedRouteId) {
      setError(copy.codeRequired);
      return;
    }
    clearFeedback();
    setBusy(true);
    try {
      const loaded = await getRoute(trimmedRouteId);
      if (loaded.status !== "PUBLISHED") {
        throw new ProductApiError(copy.mapNotPublished, "INVALID_STATE", false);
      }
      setGraph(loaded);
      setOrigin(null);
      setDestination(null);
      setDestinations([]);
      setStatus(
        copy.mapOpened(localizeLandmarkName(loaded.name, language), loaded.landmarks.length),
      );
      setScreen("NAV_ORIGIN");
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
      if (reachable.destinations.length === 0) {
        setError(copy.noReachableDestination(localizeLandmarkName(item.name, language)));
        return;
      }
      setStatus(copy.originSelected(localizeLandmarkName(item.name, language)));
      setScreen("NAV_DESTINATION");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  function chooseDestination(item: LandmarkSummary) {
    clearFeedback();
    setDestination(item);
    setScreen("NAV_CONFIRM");
  }

  async function beginNavigation() {
    if (!graph || !origin || !destination) {
      setError(copy.selectionRequired);
      return;
    }
    clearFeedback();
    setBusy(true);
    try {
      const newSession = await startNavigateSession(graph.id, origin.id, destination.id);
      setSession(newSession);
      setExpectedLandmark(origin);
      setLastObservation(null);
      setStatus("");
      setScreen("NAV_SCAN");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function captureNavigationFrame(uri: string) {
    if (session?.mode !== "NAVIGATE") {
      setError(copy.navigationInactive);
      return;
    }
    clearFeedback();
    setBusy(true);
    const requestId = newRequestId();
    latestRequestId.current = requestId;
    try {
      const response = await observeFrame(session.id, uri, requestId, language);
      if (!shouldApplyObservation(latestRequestId.current, response.requestId)) return;
      setLastObservation(response);
      setExpectedLandmark(response.expectedLandmark);
      const presentation = presentNavigationObservation(response, language);
      setStatus(presentation.message);
      await announceMessage(presentation.message, language);
      if (presentation.completed) setScreen("COMPLETE");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  const showGlobalStatus =
    Boolean(status) &&
    screen !== "HOME" &&
    screen !== "LEARN_SCAN" &&
    screen !== "NAV_SCAN" &&
    screen !== "COMPLETE";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View style={styles.appHeader}>
        <View style={styles.brandRow}>
          <View accessibilityLabel={copy.brandLabel} accessible style={styles.brandIdentity}>
            <LogoMark />
            <View style={styles.flex}>
              <Text style={styles.brand}>PathMemory</Text>
              <Text style={styles.tagline}>{copy.tagline}</Text>
            </View>
          </View>
          <LanguageSwitch language={language} onChange={changeLanguage} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
        >
          {screen !== "HOME" ? (
            <View style={styles.topAction}>
              <Button label={`← ${copy.home}`} onPress={goHome} variant="quiet" />
            </View>
          ) : null}

          {error ? (
            <View
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.errorBox}
            >
              <Text style={styles.errorTitle}>{copy.couldNotContinue}</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {showGlobalStatus ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusTitle}>{copy.update}</Text>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          ) : null}

          {busy && screen !== "LEARN_SCAN" && screen !== "NAV_SCAN" ? (
            <View accessibilityLiveRegion="polite" style={styles.busyRow}>
              <ActivityIndicator color={colors.blue} size="small" />
              <Text style={styles.busyText}>{copy.processing}</Text>
            </View>
          ) : null}

          {screen === "HOME" ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.homeDescription}
                headingRef={screenHeadingRef}
                title={copy.homeTitle}
              />
              <ModeCard
                description={copy.everydayDescription}
                label={copy.everydayLabel}
                language={language}
                onPress={() => {
                  clearFeedback();
                  setGraph(null);
                  setScreen("NAV_ROUTE");
                }}
                primary
                title={copy.everydayTitle}
              />
              <ModeCard
                description={copy.dayOneDescription}
                label={copy.dayOneLabel}
                language={language}
                onPress={() => {
                  clearFeedback();
                  setScreen("LEARN_SETUP");
                }}
                title={copy.dayOneTitle}
              />
            </View>
          ) : null}

          {screen === "LEARN_SETUP" ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.learnSetupDescription}
                eyebrow={copy.learnStep1}
                headingRef={screenHeadingRef}
                title={copy.learnSetupTitle}
              />
              <Surface>
                <Text style={styles.surfaceTitle}>{copy.supportRole}</Text>
                <Text style={styles.body}>{copy.supportRoleDescription}</Text>
              </Surface>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{copy.workplaceName}</Text>
                <TextInput
                  accessibilityLabel={copy.workplaceName}
                  editable={!busy}
                  onChangeText={setWorkplaceName}
                  placeholder={copy.workplacePlaceholder}
                  placeholderTextColor={colors.disabledText}
                  returnKeyType="done"
                  style={styles.input}
                  value={workplaceName}
                />
              </View>
              <Button
                disabled={busy}
                hint={copy.createDraftHint}
                label={copy.createDraft}
                onPress={() => void beginLearn()}
              />
            </View>
          ) : null}

          {screen === "LEARN_SCAN" ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.learnScanDescription}
                eyebrow={copy.learnStep2}
                headingRef={screenHeadingRef}
                title={copy.learnScanTitle}
              />
              <View style={styles.countCard}>
                <Text style={styles.countValue}>{savedLandmarks}</Text>
                <Text style={styles.countLabel}>{copy.savedForReview}</Text>
              </View>
              <CapturePanel
                busy={busy}
                language={language}
                onCapture={captureLearnFrame}
                purpose={copy.learnCapturePurpose}
              />
              <Button
                disabled={busy}
                label={copy.finishRecording}
                onPress={() => void endLearn()}
                variant="secondary"
              />
            </View>
          ) : null}

          {screen === "NAV_ROUTE" ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.openWorkplaceDescription}
                eyebrow={copy.navStep1}
                headingRef={screenHeadingRef}
                title={copy.openWorkplaceTitle}
              />
              <Surface>
                <Text style={styles.routeCardLabel}>{copy.savedWorkplace}</Text>
                <Text style={styles.routeCardTitle}>{copy.demoWorkplace}</Text>
                <Text style={styles.body}>{copy.demoWorkplaceDescription}</Text>
                <Button
                  disabled={busy}
                  label={copy.openDemo}
                  onPress={() => void loadPublishedRoute(DEMO_ROUTE_ID)}
                />
              </Surface>
            </View>
          ) : null}

          {screen === "NAV_ORIGIN" && graph ? (
            <View style={styles.screen}>
              <PageHeading
                eyebrow={copy.navStep2}
                headingRef={screenHeadingRef}
                title={copy.chooseOriginTitle}
              />
              <View accessibilityRole="radiogroup" style={styles.choiceList}>
                {graph.landmarks.map((item, index) => (
                  <Choice
                    index={index}
                    item={item}
                    key={item.id}
                    language={language}
                    onPress={() => void chooseOrigin(item)}
                    selected={origin?.id === item.id}
                  />
                ))}
              </View>
              <Button
                label={copy.backToWorkplace}
                onPress={() => setScreen("NAV_ROUTE")}
                variant="quiet"
              />
            </View>
          ) : null}

          {screen === "NAV_DESTINATION" && origin ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.chooseDestinationDescription(
                  localizeLandmarkName(origin.name, language),
                )}
                eyebrow={copy.navStep3}
                headingRef={screenHeadingRef}
                title={copy.chooseDestinationTitle}
              />
              <View accessibilityRole="radiogroup" style={styles.choiceList}>
                {destinations.map((item, index) => (
                  <Choice
                    index={index}
                    item={item}
                    key={item.id}
                    language={language}
                    onPress={() => chooseDestination(item)}
                    selected={destination?.id === item.id}
                  />
                ))}
              </View>
              <Button
                label={copy.chooseOriginAgain}
                onPress={() => setScreen("NAV_ORIGIN")}
                variant="quiet"
              />
            </View>
          ) : null}

          {screen === "NAV_CONFIRM" && origin && destination ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.confirmJourneyDescription}
                eyebrow={copy.navStep4}
                headingRef={screenHeadingRef}
                title={copy.confirmJourneyTitle}
              />
              <Surface>
                <SummaryRow
                  label={copy.startingPoint}
                  value={localizeLandmarkName(origin.name, language)}
                />
                <SummaryRow
                  label={copy.destination}
                  value={localizeLandmarkName(destination.name, language)}
                />
                <SummaryRow label={copy.guidance} value={copy.guidanceValue} />
              </Surface>
              <Button
                disabled={busy}
                hint={copy.startJourneyHint(localizeLandmarkName(origin.name, language))}
                label={copy.startJourney}
                onPress={() => void beginNavigation()}
              />
              <Button
                label={copy.chooseDestinationAgain}
                onPress={() => setScreen("NAV_DESTINATION")}
                variant="quiet"
              />
            </View>
          ) : null}

          {screen === "NAV_SCAN" ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.scanDescription}
                eyebrow={copy.navigating}
                headingRef={screenHeadingRef}
                title={
                  expectedLandmark
                    ? localizeLandmarkName(expectedLandmark.name, language)
                    : copy.scanTitleFallback
                }
              />
              {lastObservation ? (
                <View
                  style={
                    lastObservation.routeState === "STOP_AND_RESCAN" ||
                    lastObservation.routeState === "AWAITING_START_CONFIRMATION"
                      ? styles.warningCard
                      : styles.instructionCard
                  }
                >
                  <Text style={styles.instructionEyebrow}>
                    {presentNavigationObservation(lastObservation, language).heading}
                  </Text>
                  <Text style={styles.instructionText}>
                    {presentNavigationObservation(lastObservation, language).message}
                  </Text>
                </View>
              ) : null}
              <CapturePanel
                busy={busy}
                language={language}
                onCapture={captureNavigationFrame}
                purpose={copy.navCapturePurpose(
                  expectedLandmark
                    ? localizeLandmarkName(expectedLandmark.name, language)
                    : copy.scanTitleFallback,
                )}
              />
              <Button label={copy.stopJourney} onPress={goHome} variant="danger" />
            </View>
          ) : null}

          {screen === "COMPLETE" ? (
            <View style={styles.screen}>
              <PageHeading
                description={status}
                eyebrow={
                  graph?.status === "DRAFT"
                    ? copy.learnCompleteEyebrow
                    : copy.journeyCompleteEyebrow
                }
                headingRef={screenHeadingRef}
                title={graph?.status === "DRAFT" ? copy.sentForReview : copy.arrived}
              />
              {graph?.status === "DRAFT" ? (
                <Surface>
                  <Text style={styles.surfaceTitle}>{copy.readyForReview}</Text>
                  <Text style={styles.body}>{copy.reviewOnWeb}</Text>
                </Surface>
              ) : (
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Text style={styles.completionMark}>✓</Text>
                </View>
              )}
              <Button label={copy.returnHome} onPress={goHome} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.navy, flex: 1 },
  flex: { flex: 1 },
  appHeader: {
    backgroundColor: colors.navy,
    borderBottomColor: "rgba(255,255,255,0.14)",
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  brandIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12 },
  brand: { color: colors.surface, fontSize: 21, fontWeight: "800", letterSpacing: -0.35 },
  tagline: { color: "#D7E5F4", fontSize: 12, lineHeight: 17 },
  container: {
    backgroundColor: colors.canvas,
    flexGrow: 1,
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topAction: { alignItems: "flex-start" },
  screen: { gap: 18 },
  choiceList: { gap: 12 },
  fieldGroup: { gap: 8 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 25 },
  label: { color: colors.navy, fontSize: 17, fontWeight: "700" },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.inputLine,
    borderRadius: 12,
    borderWidth: 1.5,
    color: colors.navy,
    fontSize: 18,
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  surfaceTitle: { color: colors.navy, fontSize: 19, fontWeight: "800", lineHeight: 25 },
  statusBox: {
    backgroundColor: colors.successSoft,
    borderColor: "#ABEFC6",
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  statusTitle: { color: colors.success, fontSize: 14, fontWeight: "800" },
  statusText: { color: "#085D3A", fontSize: 16, lineHeight: 23 },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 2,
    gap: 4,
    padding: 14,
  },
  errorTitle: { color: colors.errorText, fontSize: 18, fontWeight: "800" },
  errorText: { color: colors.errorText, fontSize: 16, lineHeight: 24 },
  busyRow: {
    alignItems: "center",
    backgroundColor: colors.infoSoft,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  busyText: { color: colors.infoText, flex: 1, fontSize: 16, fontWeight: "600" },
  countCard: {
    alignItems: "baseline",
    backgroundColor: colors.tealSoft,
    borderColor: "#99E4DF",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    padding: 16,
  },
  countValue: { color: colors.tealDark, fontSize: 30, fontWeight: "800" },
  countLabel: { color: colors.tealText, flexShrink: 1, fontSize: 16, fontWeight: "600" },
  routeCardLabel: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  routeCardTitle: { color: colors.navy, fontSize: 23, fontWeight: "800", lineHeight: 29 },
  instructionCard: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.blue,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    padding: 18,
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    padding: 18,
  },
  instructionEyebrow: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.25,
    textTransform: "uppercase",
  },
  instructionText: { color: colors.navy, fontSize: 21, fontWeight: "700", lineHeight: 31 },
  completionMark: {
    alignSelf: "center",
    color: colors.success,
    fontSize: 48,
    fontWeight: "800",
  },
});
