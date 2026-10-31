"use client";
import { useEffect, useState } from "react";
import { Download, Plus, Trash2, Save, Check, RefreshCw } from "lucide-react";
import {
  cities,
  movies,
  venues,
  snacks,
  blueprints,
  dates,
  showsFor,
} from "@/lib/catalog";
import { api } from "@/lib/client";
import {
  catalogSchema,
  assertCatalog,
  type Catalog,
} from "@/lib/catalog-config";
export default function CatalogEditor({
  kind,
  notify,
}: {
  kind: string;
  notify: (s: string) => void;
}) {
  const key =
    (
      {
        Cities: "cities",
        Cinemas: "venues",
        Movies: "movies",
        Snacks: "snacks",
      } as const
    )[kind as "Cities"] || "cities";
  const [catalog, setCatalog] = useState<Catalog>({
    cities: [...cities],
    movies: [...movies],
    venues: [...venues],
    snacks: [...snacks],
    blueprints: [...blueprints],
  });
  const [index, setIndex] = useState(0);
  const [editor, setEditor] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    api<Catalog>("catalog")
      .then(setCatalog)
      .catch((e) => notify(e.message));
  }, []);
  useEffect(() => {
    setIndex(0);
  }, [kind]);
  useEffect(() => {
    setEditor(JSON.stringify(catalog[key][index] ?? {}, null, 2));
  }, [catalog, key, index]);
  function apply() {
    try {
      const row = JSON.parse(editor);
      const next = {
        ...catalog,
        [key]: catalog[key].map((r, i) => (i === index ? row : r)),
      };
      const parsed = catalogSchema.parse(next);
      assertCatalog(parsed);
      setCatalog({ ...parsed, blueprints: catalog.blueprints });
      setDirty(true);
      notify(
        "Record validated and applied to the draft. Publish to save it for all visitors.",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Invalid record.");
    }
  }
  return (
    <div className="catalog-editor">
      <div className="admin-data-heading">
        <h2>Manage {kind.toLowerCase()}</h2>
        <div className="admin-buttons">
          <button
            className="btn btn-outline"
            onClick={() => {
              const link = document.createElement("a");
              link.href = URL.createObjectURL(
                new Blob([JSON.stringify(catalog, null, 2)], {
                  type: "application/json",
                }),
              );
              link.download = "movieverse-catalog.json";
              link.click();
              setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            }}
          >
            <Download size={14} />
            Export
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              const first = catalog[key][0] as any;
              if (!first) {
                notify("Add the first product through a full catalog import.");
                return;
              }
              const row = {
                ...first,
                id: `new-${key}-${Date.now()}`,
                ...("title" in first
                  ? { title: "New movie" }
                  : { name: `New ${kind.slice(0, -1).toLowerCase()}` }),
              };
              setCatalog((c) => ({ ...c, [key]: [...c[key], row] }));
              setIndex(catalog[key].length);
              setDirty(true);
            }}
          >
            <Plus size={14} />
            Add record
          </button>
        </div>
      </div>
      <div className="catalog-editor-columns">
        <div className="catalog-record-list">
          {catalog[key].map((record: any, i) => (
            <button
              key={record.id}
              className={i === index ? "selected" : ""}
              onClick={() => setIndex(i)}
            >
              <strong>{record.title || record.name}</strong>
              <small>{record.id}</small>
            </button>
          ))}
        </div>
        <div className="catalog-record-editor">
          <div className="record-editor-heading">
            <span className="small-label">EDIT RECORD · JSON</span>
            <button
              className="text-link"
              onClick={() => {
                if (catalog[key].length <= 1) {
                  notify("Keep at least one record.");
                  return;
                }
                setCatalog((c) => ({
                  ...c,
                  [key]: c[key].filter((_, i) => i !== index),
                }));
                setIndex(0);
                setDirty(true);
              }}
            >
              <Trash2 size={13} />
              Remove from draft
            </button>
          </div>
          <textarea
            spellCheck={false}
            aria-label={`${kind} record JSON`}
            rows={23}
            value={editor}
            onChange={(e) => setEditor(e.target.value)}
          />
          <div className="admin-buttons">
            <button className="btn btn-gold" onClick={apply}>
              <Check size={14} />
              Validate & apply record
            </button>
            <button
              className="btn btn-outline"
              onClick={() =>
                setEditor(JSON.stringify(catalog[key][index] ?? {}, null, 2))
              }
            >
              <RefreshCw size={13} />
              Reset editor
            </button>
          </div>
          <p className="fine-print">
            Movie imagery, trailer URLs, languages, formats and metadata are
            configurable. Venue records configure their city, films, price,
            auditorium assignments and optional <code>times</code> array.
            References and IDs are validated before publishing.
          </p>
        </div>
      </div>
      <div className="catalog-publish">
        <div>
          <h3>
            {dirty
              ? "Draft changes ready to publish"
              : "Publish catalog changes"}
          </h3>
          <p>
            Publishing requires ADMIN_TOKEN. Active seat holds must finish
            first. Existing tickets retain their original booking details.
          </p>
        </div>
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
          className="btn btn-gold"
          disabled={!dirty || !token || busy}
          onClick={async () => {
            setBusy(true);
            try {
              const input = catalogSchema.parse(catalog);
              assertCatalog(input);
              const r = await fetch("/api/catalog", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(input),
              });
              const result = (await r.json()) as { error?: string };
              if (!r.ok) throw new Error(result.error);
              notify("Catalog saved. Reloading the updated demo.");
              window.location.reload();
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={15} />
          {busy ? "Publishing…" : "Publish draft"}
        </button>
      </div>
    </div>
  );
}
export function InventoryEditor({ notify }: { notify: (s: string) => void }) {
  const [venue, setVenue] = useState(venues[0].id);
  const [movie, setMovie] = useState(venues[0].movieIds[0]);
  const [date, setDate] = useState(dates()[0]);
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<any>(null);
  const [seatIds, setSeatIds] = useState("");
  const [status, setStatus] = useState("blocked");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const v = venues.find((x) => x.id === venue)!;
  const shows = showsFor(v, movie, date);
  const show = shows[index] || shows[0];
  const load = () => {
    if (show)
      api(`inventory?show=${encodeURIComponent(show.id)}`)
        .then(setData)
        .catch((e) => notify(e.message));
  };
  useEffect(() => {
    setMovie(v.movieIds[0]);
    setIndex(0);
    setData(null);
  }, [venue]);
  return (
    <div className="inventory-editor">
      <h2>Manage a screening’s inventory</h2>
      <p className="fine-print">
        Seat inventory belongs to one showtime. Confirmed booking seats and
        active holds cannot be changed here.
      </p>
      <div className="inventory-filters">
        <label>
          Cinema
          <select value={venue} onChange={(e) => setVenue(e.target.value)}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.cityId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Movie
          <select value={movie} onChange={(e) => setMovie(e.target.value)}>
            {movies
              .filter((m) => v.movieIds.includes(m.id))
              .map((m) => (
                <option value={m.id} key={m.id}>
                  {m.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          Date
          <select value={date} onChange={(e) => setDate(e.target.value)}>
            {dates().map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Showtime
          <select
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {shows.map((s, i) => (
              <option key={s.id} value={i}>
                {s.time} · {s.blueprintId}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-outline" onClick={load}>
          Load inventory
        </button>
      </div>
      {data && (
        <>
          <div className="inventory-stat-grid">
            {["available", "held", "booked", "blocked"].map((s) => (
              <div key={s}>
                <strong>
                  {
                    Object.values(data.inventory).filter(
                      (x: any) => x.status === s,
                    ).length
                  }
                </strong>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {data.seats.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.category}</td>
                    <td>{data.inventory[s.id]?.status}</td>
                    <td>
                      {s.x.toFixed(1)}, {s.y.toFixed(1)}, {s.z.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="inventory-filters">
        <label>
          Seat IDs (comma separated)
          <input
            value={seatIds}
            onChange={(e) => setSeatIds(e.target.value.toUpperCase())}
            placeholder="A1, A2"
          />
        </label>
        <label>
          State
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="blocked">Blocked</option>
            <option value="available">Available</option>
            <option value="booked">Seeded booked</option>
          </select>
        </label>
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
          className="btn btn-gold"
          disabled={!token || !seatIds || busy || !show}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch("/api/manage-inventory", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  showId: show.id,
                  seats: seatIds
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  status,
                }),
              });
              const result = (await r.json()) as { error?: string };
              if (!r.ok) throw new Error(result.error);
              notify("Screening inventory updated.");
              load();
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={14} />
          Update seats
        </button>
      </div>
    </div>
  );
}
