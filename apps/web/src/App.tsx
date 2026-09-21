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
} from "./api";

const defaultRouteId =
  (import.meta.env.VITE_DEMO_ROUTE_ID as string | undefined) ??
  "7fbd42a3-356f-4ad7-b3f5-68b79a1154b7";

const statusLabels = {
  DRAFT: "Bản nháp — cần buddy duyệt",
  PUBLISHED: "Đã xuất bản — sẵn sàng cho mobile",
  OUTDATED: "Hết hiệu lực — không cho tạo hành trình mới",
  AI_DRAFT: "AI đề xuất — chưa xác minh",
  BUDDY_VERIFIED: "Buddy đã xác minh",
} as const;

const maneuverLabels: Record<RelativeManeuver, string> = {
  GO_STRAIGHT: "Đi thẳng",
  TURN_LEFT: "Rẽ trái",
  TURN_RIGHT: "Rẽ phải",
  TAKE_ELEVATOR: "Đi thang máy",
  ENTER_DOOR: "Đi qua cửa",
  OTHER: "Hướng dẫn khác",
};

interface EdgeDraft {
  readonly key: string;
  readonly displayOrder: number;
  readonly fromLandmarkId: string;
  readonly toLandmarkId: string;
  readonly maneuver: RelativeManeuver;
  readonly spokenCue: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof ProductApiError) {
    const details = error.details.map((item) => `${item.field}: ${item.issue}`).join("; ");
    return `${error.message}${details ? ` ${details}` : ""}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Đã xảy ra lỗi không xác định.";
}

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabels[status]}</span>
  );
}

function LandmarkForm({
  graph,
  landmark,
  busy,
  onSaved,
  onError,
}: {
  graph: WorkplaceGraph;
  landmark: Landmark;
  busy: boolean;
  onSaved: (graph: WorkplaceGraph, message: string) => void;
  onError: (message: string) => void;
}) {
  const descriptionId = useId();
  const [saving, setSaving] = useState(false);
  const disabled = busy || saving;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await productApi.reviewLandmark(graph.id, landmark.id, {
        name: String(data.get("name") ?? ""),
        description: String(data.get("description") ?? ""),
        type: String(data.get("type")) as LandmarkType,
        displayOrder: Number(data.get("displayOrder")),
        reviewStatus: String(data.get("reviewStatus")) as "AI_DRAFT" | "BUDDY_VERIFIED",
      });
      const refreshed = await productApi.getRoute(graph.id);
      onSaved(refreshed, `Đã lưu landmark ${landmark.name}.`);
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="landmark-card" onSubmit={submit} aria-labelledby={`landmark-${landmark.id}`}>
      <div className="card-heading-row">
        <div>
          <p className="item-index">Landmark {landmark.displayOrder + 1}</p>
          <h3 id={`landmark-${landmark.id}`}>{landmark.name}</h3>
        </div>
        <StatusBadge status={landmark.status} />
      </div>

      <div className="form-grid">
        <label>
          Tên landmark
          <input
            name="name"
            defaultValue={landmark.name}
            required
            maxLength={100}
            disabled={disabled}
          />
        </label>
        <label>
          Loại landmark
          <select name="type" defaultValue={landmark.type} disabled={disabled}>
            {landmarkTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Thứ tự trong danh sách
          <input
            name="displayOrder"
            type="number"
            min={0}
            defaultValue={landmark.displayOrder}
            disabled={disabled}
          />
          <span className="field-hint">
            Chỉ sắp xếp danh sách; không phải tọa độ hay thứ tự tuyến.
          </span>
        </label>
        <label>
          Trạng thái duyệt
          <select name="reviewStatus" defaultValue={landmark.status} disabled={disabled}>
            <option value="AI_DRAFT">AI đề xuất — chưa xác minh</option>
            <option value="BUDDY_VERIFIED">Buddy đã xác minh tại chỗ</option>
            <option value="PUBLISHED" disabled>
              Đã xuất bản
            </option>
            <option value="OUTDATED" disabled>
              Hết hiệu lực
            </option>
          </select>
        </label>
      </div>

      <label htmlFor={descriptionId}>
        Mô tả dễ nhận biết
        <textarea
          id={descriptionId}
          name="description"
          defaultValue={landmark.description}
          maxLength={300}
          rows={3}
          disabled={disabled}
        />
      </label>

      <dl className="evidence-list">
        <div>
          <dt>Chữ nhìn thấy</dt>
          <dd>{landmark.visibleText.join(", ") || "Không có"}</dd>
        </div>
        <div>
          <dt>Dấu hiệu ổn định</dt>
          <dd>{landmark.stableFeatures.join(", ") || "Không có"}</dd>
        </div>
      </dl>

      <button className="button button-secondary" type="submit" disabled={disabled}>
        {saving ? "Đang lưu…" : "Lưu xác minh landmark"}
      </button>
    </form>
  );
}

export function App() {
  const [initialRouteId] = useState(
    () => new URLSearchParams(window.location.search).get("routeId") ?? defaultRouteId,
  );
  const [routeId, setRouteId] = useState(initialRouteId);
  const [graph, setGraph] = useState<WorkplaceGraph | null>(null);
  const [edgeDrafts, setEdgeDrafts] = useState<EdgeDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Sẵn sàng tải graph.");
  const [error, setError] = useState("");

  const applyGraph = useCallback((next: WorkplaceGraph, message: string) => {
    setGraph(next);
    setRouteId(next.id);
    setEdgeDrafts(
      next.edges.map((edge) => ({
        key: edge.id,
        displayOrder: edge.displayOrder,
        fromLandmarkId: edge.fromLandmarkId,
        toLandmarkId: edge.toLandmarkId,
        maneuver: edge.maneuver,
        spokenCue: edge.spokenCue,
      })),
    );
    window.history.replaceState(null, "", `?routeId=${encodeURIComponent(next.id)}`);
    setError("");
    setNotice(message);
  }, []);

  const loadGraph = useCallback(
    async (requestedId: string) => {
      setBusy(true);
      setError("");
      setNotice("Đang tải graph…");
      try {
        const loaded = await productApi.getRoute(requestedId.trim());
        applyGraph(loaded, `Đã tải ${loaded.name}.`);
      } catch (caught) {
        setGraph(null);
        setEdgeDrafts([]);
        setError(errorMessage(caught));
        setNotice("");
      } finally {
        setBusy(false);
      }
    },
    [applyGraph],
  );

  useEffect(() => {
    void loadGraph(initialRouteId);
  }, [initialRouteId, loadGraph]);

  async function runAction(action: () => Promise<void>, loadingMessage: string) {
    setBusy(true);
    setError("");
    setNotice(loadingMessage);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
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
      setError("Cần ít nhất hai landmark trước khi tạo hướng đi.");
      return;
    }
    const [from, to] = graph.landmarks;
    if (!from || !to) return;
    setEdgeDrafts((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        displayOrder: current.length,
        fromLandmarkId: from.id,
        toLandmarkId: to.id,
        maneuver: "GO_STRAIGHT",
        spokenCue: `Từ ${from.name}, đi thẳng và tìm ${to.name}.`,
      },
    ]);
    setError("");
    setNotice("Đã thêm một hướng đi nháp. Hãy kiểm tra hai đầu landmark và câu đọc.");
  }

  function speakCue(cue: string) {
    if (!("speechSynthesis" in window)) {
      setError("Trình duyệt này không hỗ trợ phát lại giọng nói.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cue);
    utterance.lang = "vi-VN";
    window.speechSynthesis.speak(utterance);
    setNotice("Đang phát lại câu chỉ dẫn.");
  }

  const canPublish =
    graph?.status === "DRAFT" &&
    graph.landmarks.length >= 2 &&
    graph.landmarks.every((landmark) => landmark.status === "BUDDY_VERIFIED") &&
    graph.edges.length > 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="PathMemory Admin — về nội dung chính">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-path brand-path-vertical" />
            <span className="brand-path brand-path-horizontal" />
            <span className="brand-node brand-node-start" />
            <span className="brand-node brand-node-middle" />
            <span className="brand-node brand-node-end" />
          </span>
          <span>
            <strong>PathMemory</strong>
            <small>Admin review</small>
          </span>
        </a>
        <p className="tagline">Verified landmarks. Familiar journeys.</p>
      </header>

      <main id="main-content" className="page-shell">
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">Stage 4 · Workplace onboarding</p>
          <h1 id="page-title">Duyệt bản đồ landmark tương đối</h1>
          <p>
            Mobile tạo bản nháp trong chuyến đi cùng buddy. Tại đây, buddy xác minh landmark, thiết
            lập từng hướng đi và xuất bản trước khi nhân viên sử dụng lại. PathMemory không lưu tọa
            độ và không phát hiện vật cản.
          </p>
        </section>

        <div className="announcement" aria-live="polite" aria-atomic="true">
          {notice}
        </div>
        {error ? (
          <div className="error-banner" role="alert">
            <strong>Không thể hoàn tất.</strong> {error}
          </div>
        ) : null}

        <section className="panel route-loader" aria-labelledby="route-loader-title">
          <div>
            <p className="section-kicker">Graph workspace</p>
            <h2 id="route-loader-title">Mở bản nháp từ mobile</h2>
            <p className="route-workflow-note" id="route-id-help">
              Mobile Learn tạo graph và hiển thị Route ID. Dán mã đó để buddy xem cùng dữ liệu đã
              lưu trong Express/PostgreSQL.
            </p>
          </div>
          <form
            className="route-id-form"
            onSubmit={(event) => {
              event.preventDefault();
              void loadGraph(routeId);
            }}
          >
            <label>
              Route ID từ mobile Learn
              <input
                value={routeId}
                onChange={(event) => setRouteId(event.target.value)}
                aria-describedby="route-id-help"
                required
              />
            </label>
            <button className="button button-primary" type="submit" disabled={busy}>
              Mở graph
            </button>
          </form>
        </section>

        {graph ? (
          <>
            <section className="summary-grid" aria-label="Tổng quan graph">
              <article className="summary-card summary-primary">
                <span>Graph</span>
                <strong>{graph.name}</strong>
                <code>{graph.id}</code>
              </article>
              <article className="summary-card">
                <span>Trạng thái</span>
                <StatusBadge status={graph.status} />
              </article>
              <article className="summary-card">
                <span>Landmark</span>
                <strong>{graph.landmarks.length}</strong>
                <small>
                  {
                    graph.landmarks.filter(
                      (item) => item.status === "BUDDY_VERIFIED" || item.status === "PUBLISHED",
                    ).length
                  }{" "}
                  đã duyệt
                </small>
              </article>
              <article className="summary-card">
                <span>Hướng đi có chiều</span>
                <strong>{graph.edges.length}</strong>
                <small>Không tự suy ra chiều ngược lại</small>
              </article>
            </section>

            <section className="content-section" aria-labelledby="landmarks-title">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Bước 1</p>
                  <h2 id="landmarks-title">Xác minh landmark</h2>
                </div>
                <div className="section-heading-support">
                  <p>
                    Kiểm tra tên, dấu hiệu ổn định và thứ tự hiển thị. AI chỉ tạo bản nháp; buddy
                    chịu trách nhiệm xác minh.
                  </p>
                  <button
                    className="button button-quiet"
                    type="button"
                    disabled={busy}
                    onClick={() => void loadGraph(graph.id)}
                  >
                    Làm mới landmark từ mobile
                  </button>
                </div>
              </div>
              {graph.landmarks.length === 0 ? (
                <div className="empty-state">
                  <h3>Chưa có landmark</h3>
                  <p>
                    Tiếp tục đúng phiên Learn trên mobile, lưu candidate, rồi nhấn “Làm mới landmark
                    từ mobile”.
                  </p>
                </div>
              ) : (
                <div className="card-list">
                  {graph.landmarks.map((landmark) => (
                    <LandmarkForm
                      key={landmark.id}
                      graph={graph}
                      landmark={landmark}
                      busy={busy || graph.status !== "DRAFT"}
                      onSaved={applyGraph}
                      onError={(message) => {
                        setError(message);
                        setNotice("");
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="content-section" aria-labelledby="edges-title">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Bước 2</p>
                  <h2 id="edges-title">Thiết lập hướng đi tương đối</h2>
                </div>
                <p>
                  Mỗi dòng là một cạnh có hướng được buddy xác nhận. Muốn đi chiều ngược lại phải
                  tạo thêm một dòng; thay đổi chỉ vào database khi nhấn “Lưu tất cả hướng đi”.
                </p>
              </div>
              <div className="edge-list">
                {edgeDrafts.map((edge, index) => (
                  <fieldset
                    className="edge-card"
                    key={edge.key}
                    disabled={busy || graph.status !== "DRAFT"}
                  >
                    <legend>Hướng đi {index + 1}</legend>
                    <div className="form-grid edge-fields">
                      <label>
                        Từ landmark
                        <select
                          value={edge.fromLandmarkId}
                          onChange={(event) =>
                            updateEdge(edge.key, { fromLandmarkId: event.target.value })
                          }
                        >
                          {graph.landmarks.map((landmark) => (
                            <option key={landmark.id} value={landmark.id}>
                              {landmark.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Đến landmark
                        <select
                          value={edge.toLandmarkId}
                          onChange={(event) =>
                            updateEdge(edge.key, { toLandmarkId: event.target.value })
                          }
                        >
                          {graph.landmarks.map((landmark) => (
                            <option key={landmark.id} value={landmark.id}>
                              {landmark.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Hướng tương đối
                        <select
                          value={edge.maneuver}
                          onChange={(event) =>
                            updateEdge(edge.key, {
                              maneuver: event.target.value as RelativeManeuver,
                            })
                          }
                        >
                          {relativeManeuvers.map((maneuver) => (
                            <option key={maneuver} value={maneuver}>
                              {maneuverLabels[maneuver]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Thứ tự ưu tiên cạnh
                        <input
                          type="number"
                          min={0}
                          value={edge.displayOrder}
                          onChange={(event) =>
                            updateEdge(edge.key, { displayOrder: Number(event.target.value) })
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Câu chỉ dẫn sẽ được đọc trên mobile
                      <textarea
                        value={edge.spokenCue}
                        onChange={(event) =>
                          updateEdge(edge.key, { spokenCue: event.target.value })
                        }
                        required
                        maxLength={300}
                        rows={3}
                      />
                    </label>
                    <div className="button-row">
                      <button
                        className="button button-quiet"
                        type="button"
                        onClick={() => speakCue(edge.spokenCue)}
                      >
                        Phát lại câu đọc
                      </button>
                      <button
                        className="button button-danger-quiet"
                        type="button"
                        onClick={() =>
                          setEdgeDrafts((current) =>
                            current.filter((item) => item.key !== edge.key),
                          )
                        }
                      >
                        Xóa hướng đi
                      </button>
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="button-row sticky-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={addEdge}
                  disabled={busy || graph.status !== "DRAFT"}
                >
                  Thêm hướng đi
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={busy || graph.status !== "DRAFT" || edgeDrafts.length === 0}
                  onClick={() =>
                    void runAction(async () => {
                      const saved = await productApi.replaceEdges(
                        graph.id,
                        edgeDrafts.map(
                          ({
                            displayOrder,
                            fromLandmarkId,
                            toLandmarkId,
                            maneuver,
                            spokenCue,
                          }) => ({
                            displayOrder,
                            fromLandmarkId,
                            toLandmarkId,
                            maneuver,
                            spokenCue,
                          }),
                        ),
                      );
                      applyGraph(saved, "Đã lưu toàn bộ hướng đi có chiều.");
                    }, "Đang kiểm tra và lưu hướng đi…")
                  }
                >
                  Lưu tất cả hướng đi
                </button>
              </div>
            </section>

            <section className="publish-panel" aria-labelledby="publish-title">
              <div>
                <p className="section-kicker">Bước 3</p>
                <h2 id="publish-title">Xuất bản cho mobile</h2>
                <p>
                  Chỉ xuất bản sau khi buddy đã kiểm tra mọi landmark và câu chỉ dẫn tại nơi làm
                  việc. Mobile ngày sau chỉ cho chọn đường từ graph đã xuất bản.
                </p>
              </div>
              <div className="button-row">
                {graph.status === "DRAFT" ? (
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={busy || !canPublish}
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Xác nhận mọi landmark và hướng đi đã được buddy kiểm tra tại chỗ?",
                        )
                      )
                        return;
                      void runAction(async () => {
                        const published = await productApi.publishRoute(graph.id);
                        applyGraph(published, "Graph đã xuất bản và sẵn sàng cho mobile.");
                      }, "Đang xuất bản graph…");
                    }}
                  >
                    Xuất bản graph
                  </button>
                ) : null}
                {graph.status === "PUBLISHED" ? (
                  <button
                    className="button button-danger"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Đánh dấu graph hết hiệu lực? Mobile sẽ không tạo hành trình mới.",
                        )
                      )
                        return;
                      void runAction(async () => {
                        const outdated = await productApi.markOutdated(graph.id);
                        applyGraph(outdated, "Graph đã được đánh dấu hết hiệu lực.");
                      }, "Đang cập nhật trạng thái graph…");
                    }}
                  >
                    Đánh dấu hết hiệu lực
                  </button>
                ) : null}
              </div>
              {graph.status === "DRAFT" && !canPublish ? (
                <p className="publish-requirements" role="status">
                  Cần ít nhất hai landmark đã được buddy xác minh và một hướng đi đã lưu.
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </main>

      <footer>
        <strong>PathMemory</strong> hỗ trợ ghi nhớ landmark và hướng tương đối. Sản phẩm không thay
        thế gậy, chó dẫn đường hoặc kỹ năng định hướng và di chuyển.
      </footer>
    </div>
  );
}
