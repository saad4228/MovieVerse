"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import CatalogEditor, { InventoryEditor } from "./CatalogEditor";
import {
  Download,
  Save,
  Box,
  Settings2,
  Film,
  Building2,
  MapPin,
  Armchair,
  Info,
} from "lucide-react";
import {
  blueprints,
  cities,
  movies,
  venues,
  makeSeats,
  type Blueprint,
} from "@/lib/catalog";
import { seededUnavailable } from "@/lib/booking";
const Scene = lazy(() => import("./SeatScene"));
export default function Admin({ notify }: { notify: (s: string) => void }) {
  const [tab, setTab] = useState("Auditoriums");
  const [draft, setDraft] = useState<Blueprint>({ ...blueprints[0] });
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [map, setMap] = useState("{}");
  const [model, setModel] = useState("");
  const [preview, setPreview] = useState(false);
  const [localUrl, setLocalUrl] = useState("");
  useEffect(
    () => () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl],
  );
  function update(key: keyof Blueprint, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value, rowLengths: undefined }));
  }
  const seats = makeSeats(draft);
  const inventory = Object.fromEntries(
    seats.map((s) => [s.id, { status: seededUnavailable("admin-preview", s) }]),
  );
  function download(data: unknown, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <main className="admin-page section-container">
      <div className="page-intro">
        <span className="eyebrow">BEHIND THE SCREENS</span>
        <h1>
          MovieVerse <span>Demo Studio.</span>
        </h1>
        <p>Explore the catalog. Shape a space. Preview the possibilities.</p>
      </div>
      <div className="admin-notice">
        <Info size={18} />
        <p>
          Development tools for illustrative layouts. Edit cities, films,
          venues, snacks, screening inventory and auditorium blueprints. Seed
          data starts in <code>lib/catalog.ts</code>; published configuration is
          saved in D1. Publishing requires a server-configured administrator
          token.
        </p>
      </div>
      <div className="ticket-tabs">
        {[
          "Auditoriums",
          "Cities",
          "Cinemas",
          "Movies",
          "Snacks",
          "Inventory",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Auditoriums" ? (
        <div className="admin-columns">
          <section className="blueprint-editor">
            <label>
              Start with a layout
              <select
                value={draft.id}
                onChange={(e) => {
                  setDraft({
                    ...blueprints.find((b) => b.id === e.target.value)!,
                  });
                  setPreview(false);
                }}
              >
                {blueprints.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Auditorium name
              <input
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </label>
            <div className="blueprint-fields">
              {[
                ["width", "Width (m)", 18, 50, 0.5],
                ["depth", "Depth (m)", 20, 50, 0.5],
                ["height", "Height (m)", 8, 24, 0.5],
                ["rows", "Rows", 4, 20, 1],
                ["columns", "Seats per row", 8, 30, 1],
                ["spacing", "Seat spacing (m)", 0.9, 1.8, 0.05],
                ["rowSpacing", "Row spacing (m)", 1.3, 2.5, 0.05],
                ["slope", "Rise per row (m)", 0.1, 0.4, 0.01],
                ["screenWidth", "Screen width (m)", 10, 40, 0.5],
              ].map(([key, label, min, max, step]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={draft[key as keyof Blueprint] as number}
                    onChange={(e) => {
                      const value = Math.min(
                        Number(max),
                        Math.max(Number(min), Number(e.target.value)),
                      );
                      if (Number.isFinite(value))
                        update(key as keyof Blueprint, value);
                    }}
                  />
                </label>
              ))}
            </div>
            <label>
              Aisles after seat columns
              <input
                value={draft.aisles.join(",")}
                onChange={(e) =>
                  update(
                    "aisles",
                    e.target.value
                      .split(",")
                      .map(Number)
                      .filter(
                        (n) =>
                          Number.isInteger(n) && n > 0 && n < draft.columns,
                      )
                      .slice(0, 3),
                  )
                }
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.balcony}
                onChange={(e) => update("balcony", e.target.checked)}
              />
              Include an elevated balcony
            </label>
            <label>
              Architectural style
              <select
                value={draft.style}
                onChange={(e) => update("style", e.target.value)}
              >
                <option value="grand">Grand cinema</option>
                <option value="classic">Classic studio</option>
                <option value="luxury">Luxury lounge</option>
              </select>
            </label>
            <details className="model-config">
              <summary>Custom GLB / GLTF model</summary>
              <p className="fine-print">
                Model meshes map to physical seat IDs using a JSON object. A
                public HTTPS model URL is needed for a persistent deployment.
                Local files are previewed on this device only.
              </p>
              <label>
                HTTPS model URL
                <input
                  placeholder="https://your-assets.example/cinema.glb"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </label>
              <label>
                Preview a local .glb file
                <input
                  type="file"
                  accept=".glb"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 30 * 1024 * 1024) {
                      notify("Choose a model smaller than 30 MB.");
                      return;
                    }
                    const url = URL.createObjectURL(file);
                    setLocalUrl(url);
                    setModel(url);
                  }}
                />
              </label>
              <label>
                Mesh name â†’ seat ID mapping
                <textarea
                  rows={4}
                  value={map}
                  onChange={(e) => setMap(e.target.value)}
                  placeholder={'{"Seat_001":"A1"}'}
                />
              </label>
              <button
                className="btn btn-outline"
                onClick={() => {
                  try {
                    const mapping = JSON.parse(map);
                    if (
                      Object.values(mapping).some(
                        (id) => !seats.some((s) => s.id === id),
                      )
                    )
                      throw new Error(
                        "Every mapped ID must exist in this blueprint.",
                      );
                    if (
                      model &&
                      !model.startsWith("https://") &&
                      !model.startsWith("blob:")
                    )
                      throw new Error("Use an HTTPS URL or a local file.");
                    setDraft((d) => ({
                      ...d,
                      modelUrl: model || undefined,
                      seatMap: mapping,
                    }));
                    setPreview(false);
                    notify("Model configuration applied to the draft.");
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Apply model configuration
              </button>
            </details>
            <div className="admin-buttons">
              <button className="btn btn-gold" onClick={() => setPreview(true)}>
                <Box size={16} />
                Preview in 3D
              </button>
              <button
                className="btn btn-outline"
                onClick={() =>
                  download(draft, `movieverse-${draft.id}-blueprint.json`)
                }
              >
                <Download size={15} />
                Export JSON
              </button>
            </div>
            <details>
              <summary>Publish blueprint configuration</summary>
              <p className="fine-print">
                Requires ADMIN_TOKEN on the server. Existing screening layouts
                are preserved. Use a new blueprint version for structural
                changes once bookings exist.
              </p>
              <label>
                Administrator token
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </label>
              <button
                className="btn btn-outline"
                disabled={busy || !token || draft.modelUrl?.startsWith("blob:")}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await fetch("/api/blueprint", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ ...draft, verified: false }),
                    });
                    const data = (await r.json()) as { error?: string };
                    if (!r.ok) throw new Error(data.error);
                    notify("Blueprint configuration published.");
                  } catch (e) {
                    notify((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Save size={15} />
                {busy ? "Savingâ€¦" : "Publish configuration"}
              </button>
            </details>
          </section>
          <section className="blueprint-preview">
            <div className="blueprint-stats">
              <span>
                <strong>{seats.length}</strong>seats
              </span>
              <span>
                <strong>{draft.rows}</strong>rows
              </span>
              <span>
                <strong>
                  {draft.width} Ã— {draft.depth}
                </strong>
                metres
              </span>
            </div>
            <div className="admin-scene">
              {preview ? (
                <Suspense
                  fallback={
                    <div className="scene-loading">Loading previewâ€¦</div>
                  }
                >
                  <Scene
                    key={JSON.stringify(draft)}
                    blueprint={draft}
                    seats={seats}
                    inventory={inventory}
                    selected={[]}
                    onSelect={(id) => notify(`Physical seat ${id}`)}
                    movie={movies.find((m) => m.id === "sintel")!}
                    preset="Overview"
                    lights
                    hd
                    muted
                    paused={false}
                    preview={null}
                    onMediaStatus={() => {}}
                  />
                </Suspense>
              ) : (
                <div className="blueprint-diagram">
                  <div className="diagram-screen">
                    SCREEN Â· {draft.screenWidth} m
                  </div>
                  {Array.from({ length: draft.rows }, (_, r) => (
                    <div key={r}>
                      {seats
                        .filter((s) => s.row === String.fromCharCode(65 + r))
                        .map((s, i, arr) => (
                          <i
                            key={s.id}
                            style={{
                              background: s.accessible
                                ? "#f4bd49"
                                : s.category === "balcony"
                                  ? "#ac88ff"
                                  : s.category === "recliner"
                                    ? "#f4bd49"
                                    : "#4da8aa",
                              marginLeft:
                                i > 0 &&
                                s.x - arr[i - 1].x > draft.spacing * 1.2
                                  ? 10
                                  : 0,
                            }}
                          />
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="fine-print">
              Illustrative procedural model Â· Not verified cinema architecture.
              Units are metres. Exported coordinates preserve individual seat
              identities.
            </p>
            <button
              className="text-link"
              onClick={() => download(seats, `${draft.id}-seats.json`)}
            >
              Export individual seat coordinates
              <Download size={14} />
            </button>
          </section>
        </div>
      ) : tab === "Inventory" ? (
        <InventoryEditor notify={notify} />
      ) : (
        <CatalogEditor kind={tab} notify={notify} />
      )}
    </main>
  );
}
