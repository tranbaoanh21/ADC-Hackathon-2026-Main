import { type FormEvent, useCallback, useEffect, useId, useState } from "react";

import {
  type Landmark,
  type LandmarkType,
  landmarkTypes,
  ProductApiError,
  productApi,
  type RelativeManeuver,
  relativeManeuvers,
  type WorkplaceGraph,
  type WorkplaceSummary,
} from "./api";
import {
  type Language,
  landmarkTypeLabels,
  maneuverLabels,
  statusLabels,
  type WebCopy,
  webCopy,
} from "./i18n";

interface EdgeDraft {
  readonly key: string;
  readonly fromLandmarkId: string;
  readonly toLandmarkId: string;
  readonly maneuver: RelativeManeuver;
}

function errorMessage(error: unknown, language: Language, copy: WebCopy): string {
  if (error instanceof ProductApiError) {
    const details = error.details.map((item) => `${item.field}: ${item.issue}`).join("; ");
    const message = language === "en" ? copy.couldNotComplete : error.message;
    return `${message}${details ? ` ${details}` : ""}`;
  }
  if (error instanceof Error) return error.message;
  return copy.unknownError;
}

function PathMemoryMark() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path
        d="M18 64 C35 64 34 30 49 30 C64 30 62 64 78 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="18" cy="64" r="9" className="logo-node logo-node-start" />
      <circle cx="49" cy="30" r="9" className="logo-node logo-node-middle" />
      <circle cx="78" cy="64" r="11" className="logo-node logo-node-end" />
      <path
        d="M73 64l4 4 8-10"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusBadge({ status, language }: { status: string; language: Language }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {statusLabels[language][status] ?? status}
    </span>
  );
}

function LandmarkForm({
  graph,
  landmark,
  busy,
  defaultExpanded,
  language,
  copy,
  onSaved,
  onError,
}: {
  graph: WorkplaceGraph;
  landmark: Landmark;
  busy: boolean;
  defaultExpanded: boolean;
  language: Language;
  copy: WebCopy;
  onSaved: (graph: WorkplaceGraph, message: string) => void;
  onError: (message: string) => void;
}) {
  const descriptionId = useId();
  const contentId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const disabled = busy || saving;

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setSaved(false);
    try {
      await productApi.reviewLandmark(graph.id, landmark.id, {
        name: String(data.get("name") ?? ""),
        description: String(data.get("description") ?? ""),
        type: String(data.get("type")) as LandmarkType,
        displayOrder: landmark.displayOrder,
        reviewStatus: String(data.get("reviewStatus")) as "AI_DRAFT" | "BUDDY_VERIFIED",
      });
      const refreshed = await productApi.getRoute(graph.id);
      setSaved(true);
      onSaved(refreshed, copy.savedLandmark(landmark.name));
    } catch (caught) {
      onError(errorMessage(caught, language, copy));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`landmark-card${saved ? " is-saved" : ""}`}>
      <div className="landmark-head">
        <div>
          <p className="landmark-kicker">{copy.landmarkNumber(landmark.displayOrder + 1)}</p>
          <h3 id={`landmark-${landmark.id}`}>{landmark.name}</h3>
        </div>
        <div className="landmark-head-actions">
          <StatusBadge language={language} status={landmark.status} />
          <button
            className="disclosure-button"
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? copy.collapse : copy.openToReview}
            <span className="chevron" aria-hidden="true">
              {expanded ? "−" : "+"}
            </span>
          </button>
        </div>
      </div>

      {expanded ? (
        <form
          id={contentId}
          className="landmark-content disclosure-content"
          onSubmit={submit}
          aria-labelledby={`landmark-${landmark.id}`}
        >
          <div className="ai-box">
            <div className="ai-label">
              <span>{copy.cameraObservation}</span>
              <span>{copy.needsReview}</span>
            </div>
            <dl className="ai-grid">
              <div>
                <dt>{copy.visibleText}</dt>
                <dd>{landmark.visibleText.join(", ") || copy.none}</dd>
              </div>
              <div>
                <dt>{copy.stableFeatures}</dt>
                <dd>{landmark.stableFeatures.join(", ") || copy.none}</dd>
              </div>
              <div className="ai-description">
                <dt>{copy.capturedDescription}</dt>
                <dd>{landmark.description || copy.noDescription}</dd>
              </div>
            </dl>
          </div>

          <p className="human-label">{copy.buddyDetails}</p>
          <div className="form-grid">
            <label>
              {copy.landmarkName}
              <input
                name="name"
                defaultValue={landmark.name}
                required
                maxLength={100}
                disabled={disabled}
              />
            </label>
            <label>
              {copy.landmarkType}
              <select name="type" defaultValue={landmark.type} disabled={disabled}>
                {landmarkTypes.map((type) => (
                  <option key={type} value={type}>
                    {landmarkTypeLabels[language][type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field-full" htmlFor={descriptionId}>
              {copy.recognizableDescription}
              <textarea
                id={descriptionId}
                name="description"
                defaultValue={landmark.description}
                maxLength={300}
                rows={3}
                disabled={disabled}
              />
            </label>
            <label>
              {copy.reviewStatus}
              <select name="reviewStatus" defaultValue={landmark.status} disabled={disabled}>
                <option value="AI_DRAFT">{copy.draftOption}</option>
                <option value="BUDDY_VERIFIED">{copy.verifiedOption}</option>
                <option value="PUBLISHED" disabled>
                  {copy.publishedOption}
                </option>
                <option value="OUTDATED" disabled>
                  {copy.outdatedOption}
                </option>
              </select>
            </label>
          </div>

          <div className="card-footer">
            <span className={`save-state${landmark.status === "AI_DRAFT" ? " pending" : ""}`}>
              {saved
                ? copy.savedChanges
                : landmark.status === "AI_DRAFT"
                  ? copy.awaitingReview
                  : copy.reviewed}
            </span>
            <button className="button button-secondary" type="submit" disabled={disabled}>
              {saving ? copy.saving : copy.saveReview}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function EdgeEditor({
  edge,
  index,
  graph,
  busy,
  language,
  copy,
  onUpdate,
  onRemove,
}: {
  edge: EdgeDraft;
  index: number;
  graph: WorkplaceGraph;
  busy: boolean;
  language: Language;
  copy: WebCopy;
  onUpdate: (key: string, patch: Partial<EdgeDraft>) => void;
  onRemove: (key: string) => void;
}) {
  const contentId = useId();
  const [expanded, setExpanded] = useState(index === 0);
  const from =
    graph.landmarks.find((item) => item.id === edge.fromLandmarkId)?.name ?? copy.notSelected;
  const to =
    graph.landmarks.find((item) => item.id === edge.toLandmarkId)?.name ?? copy.notSelected;
  const generatedCue = copy.movementCue(edge.maneuver, from, to);

  return (
    <article className="edge-card">
      <div className="edge-head">
        <div>
          <p className="edge-kicker">{copy.directionNumber(index + 1)}</p>
          <h3>
            {from} <span aria-hidden="true">→</span> {to}
          </h3>
          <span className="direction-badge">{maneuverLabels[language][edge.maneuver]}</span>
        </div>
        <button
          className="disclosure-button"
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? copy.collapse : copy.edit}
          <span className="chevron" aria-hidden="true">
            {expanded ? "−" : "+"}
          </span>
        </button>
      </div>

      {expanded ? (
        <div id={contentId} className="edge-content disclosure-content">
          <fieldset disabled={busy || graph.status !== "DRAFT"}>
            <legend className="sr-only">{copy.editDirection(index + 1)}</legend>
            <div className="edge-grid">
              <label>
                {copy.fromLandmark}
                <select
                  value={edge.fromLandmarkId}
                  onChange={(event) => onUpdate(edge.key, { fromLandmarkId: event.target.value })}
                >
                  {graph.landmarks.map((landmark) => (
                    <option key={landmark.id} value={landmark.id}>
                      {landmark.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.toLandmark}
                <select
                  value={edge.toLandmarkId}
                  onChange={(event) => onUpdate(edge.key, { toLandmarkId: event.target.value })}
                >
                  {graph.landmarks.map((landmark) => (
                    <option key={landmark.id} value={landmark.id}>
                      {landmark.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.relativeDirection}
                <select
                  value={edge.maneuver}
                  onChange={(event) =>
                    onUpdate(edge.key, { maneuver: event.target.value as RelativeManeuver })
                  }
                >
                  {relativeManeuvers.map((maneuver) => (
                    <option key={maneuver} value={maneuver}>
                      {maneuverLabels[language][maneuver]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="edge-instruction generated-instruction">
                <span className="generated-instruction-label">{copy.spokenInstruction}</span>
                <p>{generatedCue}</p>
                <small>{copy.generatedInstructionHelp}</small>
              </div>
            </div>
          </fieldset>
          <div className="button-row edge-actions">
            <button
              className="button button-danger-quiet"
              type="button"
              disabled={busy || graph.status !== "DRAFT"}
              onClick={() => onRemove(edge.key)}
            >
              {copy.deleteDirection}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function App() {
  const [language, setLanguage] = useState<Language>(() =>
    window.localStorage.getItem("pathmemory-language") === "vi" ? "vi" : "en",
  );
  const copy = webCopy[language];
  const [initialRouteId] = useState(
    () => new URLSearchParams(window.location.search).get("routeId") ?? "",
  );
  const [routeId, setRouteId] = useState(initialRouteId);
  const [graph, setGraph] = useState<WorkplaceGraph | null>(null);
  const [workplaces, setWorkplaces] = useState<readonly WorkplaceSummary[]>([]);
  const [workplacesLoading, setWorkplacesLoading] = useState(false);
  const [edgeDrafts, setEdgeDrafts] = useState<EdgeDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(copy.ready);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.documentTitle;
    window.localStorage.setItem("pathmemory-language", language);
  }, [copy.documentTitle, language]);

  const applyGraph = useCallback((next: WorkplaceGraph, message: string) => {
    setGraph(next);
    setRouteId(next.id);
    setEdgeDrafts(
      next.edges.map((edge) => ({
        key: edge.id,
        fromLandmarkId: edge.fromLandmarkId,
        toLandmarkId: edge.toLandmarkId,
        maneuver: edge.maneuver,
      })),
    );
    setWorkplaces((current) => {
      const summary: WorkplaceSummary = {
        id: next.id,
        name: next.name,
        status: next.status,
        landmarkCount: next.landmarks.length,
        createdAt: next.createdAt,
      };
      return [summary, ...current.filter((item) => item.id !== next.id)];
    });
    window.history.replaceState(null, "", `?routeId=${encodeURIComponent(next.id)}`);
    setError("");
    setNotice(message);
  }, []);

  const loadGraph = useCallback(
    async (requestedId: string) => {
      setBusy(true);
      setError("");
      setNotice(copy.loadingMap);
      try {
        const loaded = await productApi.getRoute(requestedId.trim());
        applyGraph(loaded, copy.loadedMap(loaded.name));
      } catch (caught) {
        setGraph(null);
        setEdgeDrafts([]);
        setError(errorMessage(caught, language, copy));
        setNotice("");
      } finally {
        setBusy(false);
      }
    },
    [applyGraph, copy, language],
  );

  const loadWorkplaces = useCallback(async () => {
    setWorkplacesLoading(true);
    setError("");
    try {
      const available = await productApi.listRoutes();
      setWorkplaces(available);
      const selectedId = available.some((item) => item.id === routeId)
        ? routeId
        : (available[0]?.id ?? "");
      if (selectedId !== routeId) {
        setRouteId(selectedId);
        setGraph(null);
        setEdgeDrafts([]);
      }
      if (!selectedId) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      setNotice(available.length > 0 ? copy.workplaceListUpdated : copy.noWorkplaces);
    } catch (caught) {
      setError(errorMessage(caught, language, copy));
      setNotice("");
    } finally {
      setWorkplacesLoading(false);
    }
  }, [copy, language, routeId]);

  // Bootstrap once from the shared database. Language changes must not switch the admin
  // back to a different workplace while edits are in progress.
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial database selection runs once per page load.
  useEffect(() => {
    let active = true;

    async function initialiseFromDatabase() {
      setBusy(true);
      setWorkplacesLoading(true);
      setError("");
      setNotice(copy.loadingWorkplaces);
      try {
        const available = await productApi.listRoutes();
        if (!active) return;
        setWorkplaces(available);

        const selected =
          available.find((item) => item.id === initialRouteId) ?? available[0] ?? null;
        if (!selected) {
          setRouteId("");
          setGraph(null);
          setEdgeDrafts([]);
          window.history.replaceState(null, "", window.location.pathname);
          setNotice(copy.noWorkplaces);
          return;
        }

        const loaded = await productApi.getRoute(selected.id);
        if (!active) return;
        applyGraph(loaded, copy.loadedMap(loaded.name));
      } catch (caught) {
        if (!active) return;
        setGraph(null);
        setEdgeDrafts([]);
        setError(errorMessage(caught, language, copy));
        setNotice("");
      } finally {
        if (active) {
          setBusy(false);
          setWorkplacesLoading(false);
        }
      }
    }

    void initialiseFromDatabase();
    return () => {
      active = false;
    };
  }, []);

  async function runAction(action: () => Promise<void>, loadingMessage: string) {
    setBusy(true);
    setError("");
    setNotice(loadingMessage);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught, language, copy));
      setNotice("");
    } finally {
      setBusy(false);
    }
  }

  function updateEdge(key: string, patch: Partial<EdgeDraft>) {
    setEdgeDrafts((current) =>
      current.map((edge) => (edge.key === key ? { ...edge, ...patch } : edge)),
    );
  }

  function addEdge() {
    if (!graph || graph.landmarks.length < 2) {
      setError(copy.minimumTwoError);
      return;
    }
    const [from, to] = graph.landmarks;
    if (!from || !to) return;
    setEdgeDrafts((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        fromLandmarkId: from.id,
        toLandmarkId: to.id,
        maneuver: "GO_STRAIGHT",
      },
    ]);
    setError("");
    setNotice(copy.directionAdded);
  }

  const verifiedLandmarks =
    graph?.landmarks.filter(
      (item) => item.status === "BUDDY_VERIFIED" || item.status === "PUBLISHED",
    ).length ?? 0;
  const unverifiedLandmarks = graph ? graph.landmarks.length - verifiedLandmarks : 0;
  const hasMinimumLandmarks = (graph?.landmarks.length ?? 0) >= 2;
  const allLandmarksVerified = Boolean(graph?.landmarks.length) && unverifiedLandmarks === 0;
  const hasSavedEdges = (graph?.edges.length ?? 0) > 0;
  const canPublish =
    graph?.status === "DRAFT" && hasMinimumLandmarks && allLandmarksVerified && hasSavedEdges;
  const connectionLabel = busy
    ? copy.connecting
    : error
      ? copy.connectionProblem
      : graph
        ? copy.connected
        : copy.noMapLoaded;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {copy.skip}
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#main-content" aria-label={copy.brandAria}>
            <PathMemoryMark />
            <span className="brand-copy">
              <strong>PathMemory</strong>
              <small>{copy.slogan}</small>
            </span>
          </a>
          <div className="topbar-actions">
            <fieldset className="language-switch">
              <legend className="sr-only">{copy.language}</legend>
              <button
                aria-pressed={language === "en"}
                className={language === "en" ? "is-active" : ""}
                onClick={() => setLanguage("en")}
                type="button"
              >
                EN<span className="sr-only"> — {copy.english}</span>
              </button>
              <button
                aria-pressed={language === "vi"}
                className={language === "vi" ? "is-active" : ""}
                onClick={() => setLanguage("vi")}
                type="button"
              >
                VI<span className="sr-only"> — {copy.vietnamese}</span>
              </button>
            </fieldset>
            <div
              className={`connection${error ? " connection-error" : ""}`}
              role="status"
              aria-live="polite"
            >
              <span className="connection-dot" aria-hidden="true" />
              {connectionLabel}
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="page-shell">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <h1 id="page-title">{copy.title}</h1>
            <p className="lede">{copy.lede}</p>
          </div>
          <aside className="workflow-card" aria-label={copy.workflowAria}>
            <h2>{copy.workflowTitle}</h2>
            <ol>
              {copy.workflowSteps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </aside>
        </section>

        <section className="panel" aria-labelledby="route-loader-title">
          <div className="panel-header">
            <h2 id="route-loader-title">{copy.openRouteTitle}</h2>
            <p id="workplace-help">{copy.openRouteHelp}</p>
          </div>
          <div className="panel-body">
            <form
              className="route-id-form"
              onSubmit={(event) => {
                event.preventDefault();
                void loadGraph(routeId);
              }}
            >
              <label>
                {copy.workplaceLabel}
                <select
                  value={routeId}
                  onChange={(event) => setRouteId(event.target.value)}
                  aria-describedby="workplace-help"
                  required
                  disabled={workplacesLoading || workplaces.length === 0}
                >
                  <option value="" disabled>
                    {workplacesLoading ? copy.opening : copy.selectWorkplace}
                  </option>
                  {workplaces.map((workplace) => (
                    <option key={workplace.id} value={workplace.id}>
                      {copy.workplaceOption(workplace.name, workplace.landmarkCount)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button button-primary"
                type="submit"
                disabled={busy || workplacesLoading || !routeId}
                aria-busy={busy}
              >
                {busy ? copy.opening : copy.openMap}
              </button>
              <button
                className="button button-secondary"
                type="button"
                disabled={workplacesLoading}
                onClick={() => void loadWorkplaces()}
              >
                {copy.refreshWorkplaces}
              </button>
            </form>
            {!workplacesLoading && workplaces.length === 0 ? (
              <p className="empty-inline">{copy.noWorkplaces}</p>
            ) : null}
            <div className="live-message" aria-live="polite" aria-atomic="true">
              {notice}
            </div>
            {error ? (
              <div className="error-banner" role="alert">
                <strong>{copy.couldNotComplete}</strong> {error}
              </div>
            ) : null}
          </div>
        </section>

        {graph ? (
          <>
            <section className="panel summary-panel" aria-labelledby="summary-title">
              <div className="panel-header">
                <h2 id="summary-title">{copy.summaryTitle}</h2>
                <p>{copy.summaryHelp}</p>
              </div>
              <div className="panel-body summary-grid">
                <article className="summary-item summary-name">
                  <span>{copy.workplaceMap}</span>
                  <strong>{graph.name}</strong>
                  <StatusBadge language={language} status={graph.status} />
                </article>
                <article className="summary-item">
                  <span>{copy.landmarks}</span>
                  <strong>{graph.landmarks.length}</strong>
                  <small>{copy.reviewedCount(verifiedLandmarks)}</small>
                </article>
                <article className="summary-item">
                  <span>{copy.directions}</span>
                  <strong>{graph.edges.length}</strong>
                  <small>{copy.directionCountHelp}</small>
                </article>
              </div>
            </section>

            <nav className="step-navigation" aria-label={copy.reviewNavigation}>
              <a href="#landmarks-section">
                <span className="step-nav-number">1</span>
                {copy.reviewLandmarks}
              </a>
              <a href="#edges-section">
                <span className="step-nav-number">2</span>
                {copy.setDirections}
              </a>
              <a href="#publish-section">
                <span className="step-nav-number">3</span>
                {copy.reviewAndPublish}
              </a>
            </nav>

            <section
              id="landmarks-section"
              className="panel workflow-section"
              aria-labelledby="landmarks-title"
            >
              <div className="panel-header section-step">
                <span className="step-number" aria-hidden="true">
                  1
                </span>
                <div className="section-title-wrap">
                  <h2 id="landmarks-title">{copy.reviewLandmarks}</h2>
                  <p>{copy.reviewLandmarksHelp}</p>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void loadGraph(graph.id)}
                >
                  {copy.refreshFromMobile}
                </button>
              </div>
              <div className="panel-body">
                {unverifiedLandmarks > 0 ? (
                  <div className="callout callout-warning" role="status">
                    <span className="callout-icon" aria-hidden="true">
                      !
                    </span>
                    <p>
                      <strong>{copy.unverifiedWarning(unverifiedLandmarks)}</strong>{" "}
                      {copy.finishBeforePublish}
                    </p>
                  </div>
                ) : (
                  <div className="callout callout-success" role="status">
                    <span className="callout-icon" aria-hidden="true">
                      ✓
                    </span>
                    <p>
                      <strong>{copy.allVerified}</strong> {copy.continueDirections}
                    </p>
                  </div>
                )}

                {graph.landmarks.length === 0 ? (
                  <div className="empty-state">
                    <h3>{copy.noLandmarks}</h3>
                    <p>{copy.noLandmarksHelp}</p>
                  </div>
                ) : (
                  <div className="landmark-grid">
                    {graph.landmarks.map((landmark, index) => (
                      <LandmarkForm
                        key={landmark.id}
                        graph={graph}
                        landmark={landmark}
                        busy={busy || graph.status !== "DRAFT"}
                        copy={copy}
                        defaultExpanded={landmark.status === "AI_DRAFT" || index === 0}
                        language={language}
                        onSaved={applyGraph}
                        onError={(message) => {
                          setError(message);
                          setNotice("");
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section
              id="edges-section"
              className="panel workflow-section"
              aria-labelledby="edges-title"
            >
              <div className="panel-header section-step">
                <span className="step-number" aria-hidden="true">
                  2
                </span>
                <div className="section-title-wrap">
                  <h2 id="edges-title">{copy.directionsTitle}</h2>
                  <p>{copy.directionsHelp}</p>
                </div>
              </div>
              <div className="panel-body">
                {edgeDrafts.length > 0 ? (
                  <div className="edge-list">
                    {edgeDrafts.map((edge, index) => (
                      <EdgeEditor
                        key={edge.key}
                        edge={edge}
                        index={index}
                        graph={graph}
                        busy={busy}
                        copy={copy}
                        language={language}
                        onUpdate={updateEdge}
                        onRemove={(key) =>
                          setEdgeDrafts((current) => current.filter((item) => item.key !== key))
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <h3>{copy.noDirections}</h3>
                    <p>{copy.noDirectionsHelp}</p>
                  </div>
                )}

                <div className="button-row section-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={addEdge}
                    disabled={busy || graph.status !== "DRAFT"}
                  >
                    {copy.addDirection}
                  </button>
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={busy || graph.status !== "DRAFT" || edgeDrafts.length === 0}
                    onClick={() =>
                      void runAction(async () => {
                        const saved = await productApi.replaceEdges(
                          graph.id,
                          edgeDrafts.map(({ fromLandmarkId, toLandmarkId, maneuver }, index) => ({
                            displayOrder: index,
                            fromLandmarkId,
                            toLandmarkId,
                            maneuver,
                          })),
                        );
                        applyGraph(saved, copy.directionsSaved);
                      }, copy.savingDirections)
                    }
                  >
                    {busy ? copy.saving : copy.saveAllDirections}
                  </button>
                </div>
              </div>
            </section>

            <section
              id="publish-section"
              className="panel workflow-section"
              aria-labelledby="publish-title"
            >
              <div className="panel-header section-step">
                <span className="step-number" aria-hidden="true">
                  3
                </span>
                <div className="section-title-wrap">
                  <h2 id="publish-title">{copy.publishTitle}</h2>
                  <p>{copy.publishHelp}</p>
                </div>
              </div>
              <div className="panel-body">
                <ul className="validation-list" aria-label={copy.publishRequirements}>
                  <li className={hasMinimumLandmarks ? "validation-ok" : "validation-blocked"}>
                    <span className="validation-icon" aria-hidden="true">
                      {hasMinimumLandmarks ? "✓" : "!"}
                    </span>
                    <p>
                      <strong>{copy.minimumLandmarks}:</strong>{" "}
                      {copy.currentCount(graph.landmarks.length)}.
                    </p>
                  </li>
                  <li className={allLandmarksVerified ? "validation-ok" : "validation-blocked"}>
                    <span className="validation-icon" aria-hidden="true">
                      {allLandmarksVerified ? "✓" : "!"}
                    </span>
                    <p>
                      <strong>{copy.allLandmarksReviewed}:</strong>{" "}
                      {copy.completedCount(verifiedLandmarks, graph.landmarks.length)}.
                    </p>
                  </li>
                  <li className={hasSavedEdges ? "validation-ok" : "validation-blocked"}>
                    <span className="validation-icon" aria-hidden="true">
                      {hasSavedEdges ? "✓" : "!"}
                    </span>
                    <p>
                      <strong>{copy.savedDirectionRequired}:</strong>{" "}
                      {copy.savedCount(graph.edges.length)}.
                    </p>
                  </li>
                </ul>

                <div className="publish-box">
                  <div>
                    <strong>
                      {graph.status === "PUBLISHED"
                        ? copy.mapInUse
                        : canPublish
                          ? copy.publishReady
                          : copy.publishBlocked}
                    </strong>
                    <p>
                      {graph.status === "PUBLISHED"
                        ? copy.markOutdatedHelp
                        : canPublish
                          ? copy.listenBeforePublish
                          : copy.completeBlockedItems}
                    </p>
                  </div>
                  <div className="button-row publish-actions">
                    {graph.status === "DRAFT" ? (
                      <button
                        className="button button-primary"
                        type="button"
                        disabled={busy || !canPublish}
                        onClick={() => {
                          if (!window.confirm(copy.confirmPublish)) return;
                          void runAction(async () => {
                            const published = await productApi.publishRoute(graph.id);
                            applyGraph(published, copy.mapPublished);
                          }, copy.publishingMap);
                        }}
                      >
                        {copy.publishMap}
                      </button>
                    ) : null}
                    {graph.status === "PUBLISHED" ? (
                      <button
                        className="button button-danger-quiet"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(copy.confirmOutdated)) return;
                          void runAction(async () => {
                            const outdated = await productApi.markOutdated(graph.id);
                            applyGraph(outdated, copy.mapOutdated);
                          }, copy.updatingMap);
                        }}
                      >
                        {copy.markOutdated}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>

      <footer className="footer">{copy.footer}</footer>
    </div>
  );
}
