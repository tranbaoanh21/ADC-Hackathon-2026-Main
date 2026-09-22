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
import { type Language, landmarkTypeLabels, mobileCopy } from "./src/i18n";
import {
  Button,
  Choice,
  LanguageSwitch,
  LogoMark,
  ModeCard,
  PageHeading,
  SafetyNotice,
  SummaryRow,
  Surface,
} from "./src/MobileUI";
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
  const [showRouteCodeInput, setShowRouteCodeInput] = useState(false);

  const [workplaceName, setWorkplaceName] = useState(copy.demoWorkplace);
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

  function describeError(value: unknown): string {
    if (value instanceof ProductApiError) {
      return language === "en" ? copy.genericApiError : value.message;
    }
    return copy.unknownError;
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
    setGraph(null);
    setError("");
    setStatus("");
    setShowRouteCodeInput(false);
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
      setRouteId(newGraph.id);
      setSession(newSession);
      setSavedLandmarks(0);
      setStatus(copy.draftCreated(newGraph.name));
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
    latestRequestId.current = requestId;
    try {
      const response = await observeFrame(session.id, uri, requestId, language);
      if (!shouldApplyObservation(latestRequestId.current, response.requestId)) return;
      setLastObservation(response);
      setStatus(response.spokenMessage);
      await announceMessage(response.spokenMessage, language);
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
      setError(copy.nameEvidenceRequired);
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
      const message = copy.savedDraft(saved.name);
      setSavedLandmarks((count) => count + 1);
      setCandidate(null);
      setCandidateName("");
      setCandidateObservationId("");
      setLastObservation(null);
      setStatus(message);
      await announceMessage(message, language);
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
      setStatus(copy.learnFinished(savedLandmarks));
      setScreen("COMPLETE");
    } catch (value) {
      setError(describeError(value));
    } finally {
      setBusy(false);
    }
  }

  async function loadPublishedRoute(requestedRouteId = routeId) {
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
      setStatus(copy.mapOpened(loaded.name, loaded.landmarks.length));
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
        setError(copy.noReachableDestination(item.name));
        return;
      }
      setStatus(copy.originSelected(item.name));
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
      const message = copy.confirmOrigin(origin.name);
      setStatus(message);
      await announceMessage(message, language);
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
    screen !== "LEARN_REVIEW" &&
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
          <LanguageSwitch language={language} onChange={setLanguage} />
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

          {busy ? (
            <View accessibilityLiveRegion="polite" style={styles.busyRow}>
              <ActivityIndicator color={colors.blue} size="small" />
              <Text style={styles.busyText}>{copy.processing}</Text>
            </View>
          ) : null}

          {screen === "HOME" ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.homeDescription}
                eyebrow={copy.homeEyebrow}
                headingRef={screenHeadingRef}
                title={copy.homeTitle}
              />
              <ModeCard
                description={copy.everydayDescription}
                label={copy.everydayLabel}
                language={language}
                onPress={() => {
                  clearFeedback();
                  setRouteId(DEMO_ROUTE_ID);
                  setGraph(null);
                  setShowRouteCodeInput(false);
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
              <SafetyNotice compact language={language} />
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
                <Text style={styles.surfaceTitle}>{copy.buddyRole}</Text>
                <Text style={styles.body}>{copy.buddyRoleDescription}</Text>
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
              <Surface>
                <Text style={styles.routeCodeLabel}>{copy.draftCodeForBuddy}</Text>
                <Text
                  accessibilityLabel={copy.draftCodeLabel(routeId)}
                  selectable
                  style={styles.routeCode}
                >
                  {routeId}
                </Text>
              </Surface>
              <Button
                disabled={busy}
                label={copy.finishRecording}
                onPress={() => void endLearn()}
                variant="secondary"
              />
            </View>
          ) : null}

          {screen === "LEARN_REVIEW" && candidate ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.reviewProposalDescription}
                eyebrow={copy.learnStep3}
                headingRef={screenHeadingRef}
                title={copy.reviewProposalTitle}
              />
              <Surface>
                <View style={styles.aiDraftTag}>
                  <Text style={styles.aiDraftTagText}>{copy.capturedSuggestion}</Text>
                </View>
                <SummaryRow
                  label={copy.placeType}
                  value={landmarkTypeLabels[language][candidate.type]}
                />
                <SummaryRow label={copy.capturedDescription} value={candidate.draftDescription} />
                <SummaryRow
                  label={copy.visibleText}
                  value={candidate.visibleText.join(", ") || copy.noReadableText}
                />
              </Surface>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{copy.placeNameToSave}</Text>
                <TextInput
                  accessibilityLabel={copy.placeNameToSave}
                  editable={!busy}
                  onChangeText={setCandidateName}
                  selectTextOnFocus
                  style={styles.input}
                  value={candidateName}
                />
              </View>
              <Button
                disabled={busy}
                label={copy.saveForBuddy}
                onPress={() => void saveCandidate()}
              />
              <Button
                disabled={busy}
                label={copy.discardAndRescan}
                onPress={() => {
                  setCandidate(null);
                  setCandidateObservationId("");
                  setScreen("LEARN_SCAN");
                }}
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

              {showRouteCodeInput ? (
                <Surface>
                  <Text style={styles.surfaceTitle}>{copy.useAnotherCode}</Text>
                  <Text style={styles.body}>{copy.codeHelp}</Text>
                  <TextInput
                    accessibilityLabel={copy.workplaceCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                    onChangeText={setRouteId}
                    placeholder={copy.codePlaceholder}
                    placeholderTextColor={colors.disabledText}
                    style={styles.input}
                    value={routeId}
                  />
                  <Button
                    disabled={busy}
                    label={copy.openWithCode}
                    onPress={() => void loadPublishedRoute()}
                    variant="secondary"
                  />
                </Surface>
              ) : (
                <Button
                  label={copy.useAnotherCode}
                  onPress={() => {
                    setRouteId("");
                    setShowRouteCodeInput(true);
                  }}
                  variant="quiet"
                />
              )}
            </View>
          ) : null}

          {screen === "NAV_ORIGIN" && graph ? (
            <View style={styles.screen}>
              <PageHeading
                description={copy.chooseOriginDescription(graph.name)}
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
                description={copy.chooseDestinationDescription(origin.name)}
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
                <SummaryRow label={copy.startingPoint} value={origin.name} />
                <SummaryRow label={copy.destination} value={destination.name} />
                <SummaryRow label={copy.guidance} value={copy.guidanceValue} />
              </Surface>
              <SafetyNotice language={language} />
              <Button
                disabled={busy}
                hint={copy.startJourneyHint(origin.name)}
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
                title={expectedLandmark?.name ?? copy.scanTitleFallback}
              />
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
                  <Text style={styles.instructionEyebrow}>
                    {presentNavigationObservation(lastObservation, language).heading}
                  </Text>
                  <Text style={styles.instructionText}>{lastObservation.spokenMessage}</Text>
                  <Button
                    label={copy.replayGuidance}
                    onPress={() => void announceMessage(lastObservation.spokenMessage, language)}
                    variant="secondary"
                  />
                </View>
              ) : (
                <View style={styles.instructionCard}>
                  <Text style={styles.instructionEyebrow}>{copy.firstConfirmation}</Text>
                  <Text style={styles.instructionText}>{status}</Text>
                  <Button
                    label={copy.replayGuidance}
                    onPress={() => void announceMessage(status, language)}
                    variant="secondary"
                  />
                </View>
              )}
              <CapturePanel
                busy={busy}
                language={language}
                onCapture={captureNavigationFrame}
                purpose={copy.navCapturePurpose(expectedLandmark?.name ?? copy.scanTitleFallback)}
              />
              <SafetyNotice compact language={language} />
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
                  <Text style={styles.surfaceTitle}>{copy.handoffCode}</Text>
                  <Text
                    accessibilityLabel={copy.draftCodeLabel(graph.id)}
                    selectable
                    style={styles.routeCode}
                  >
                    {graph.id}
                  </Text>
                  <Text style={styles.body}>{copy.handoffHelp}</Text>
                </Surface>
              ) : (
                <Surface>
                  <Text style={styles.completionMark}>✓</Text>
                  <Text style={styles.completionText}>{copy.completionHelp}</Text>
                </Surface>
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
  routeCodeLabel: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  routeCode: {
    backgroundColor: colors.canvas,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    lineHeight: 21,
    padding: 12,
  },
  aiDraftTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.infoSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiDraftTagText: { color: colors.infoText, fontSize: 13, fontWeight: "800" },
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
  completionText: {
    color: colors.navy,
    fontSize: 18,
    lineHeight: 27,
    textAlign: "center",
  },
});
