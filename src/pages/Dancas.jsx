import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const SERIES = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º", "1EM", "2EM", "3EM"];

export default function Dancas({ user, isAdmin }) {
  const ROWS = SERIES.length;
  const COLS = 3; // Série | Início | Fim

  const CELL_WIDTH = 90;
  const CELL_HEIGHT = 58;
  const CELL_FONT = 12;

  const ref = useMemo(() => doc(db, "dancas", "quadro"), []);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [cells, setCells] = useState(() => Array(ROWS * COLS).fill(""));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const idx = (r, c) => r * COLS + c;

  function emptyCells() {
    const base = Array(ROWS * COLS).fill("");

    SERIES.forEach((serie, r) => {
      base[idx(r, 0)] = serie;
    });

    return base;
  }

  function cleanCells(value) {
    const arr = Array.isArray(value) ? value : [];
    const fixed = emptyCells();

    for (let i = 0; i < fixed.length; i++) {
      const v = arr[i];

      if (typeof v === "string") fixed[i] = v;
      else if (v === null || v === undefined) fixed[i] = "";
      else fixed[i] = String(v);
    }

    SERIES.forEach((serie, r) => {
      fixed[idx(r, 0)] = serie;
    });

    return fixed;
  }

  function normalizeFromFirestore(data) {
    if (Array.isArray(data?.cells)) {
      return cleanCells(data.cells);
    }

    return emptyCells();
  }

  async function load() {
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setCells(normalizeFromFirestore(snap.data()));
      } else {
        setCells(emptyCells());
      }
    } catch (e) {
      console.error(e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function saveNow(nextCells = cells) {
    if (!isAdmin) return;

    setError("");
    setStatus("");

    try {
      const safeCells = cleanCells(nextCells);

      await setDoc(
        ref,
        {
          rows: ROWS,
          cols: COLS,
          cells: safeCells,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email ?? null,
        },
        { merge: true }
      );

      setCells(safeCells);
      setEditing(false);
      setStatus("Salvo!");
      setTimeout(() => setStatus(""), 1200);
    } catch (e) {
      console.error(e);
      setError(String(e?.message || e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;

  return (
    <div style={{ paddingTop: 8 }}>
      <h1 style={{ fontSize: 42, margin: "8px 0 10px" }}>Danças</h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        {isAdmin && !editing && (
          <button
            onClick={() => {
              setStatus("");
              setEditing(true);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Editar
          </button>
        )}

        {isAdmin && editing && (
          <button
            onClick={() => saveNow()}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #1f3a8a",
              background: "#1f3a8a",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Salvar
          </button>
        )}

        <button
          onClick={() => load()}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Recarregar
        </button>

        {status ? <span style={{ fontSize: 13, color: "#1f3a8a", fontWeight: 800 }}>{status}</span> : null}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          overflow: "hidden",
          background: "#fff",
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_WIDTH}px)`,
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
        <div style={headerCell}>Série</div>
        <div style={headerCell}>Início</div>
        <div style={headerCell}>Fim</div>

        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((__, c) => {
            const i = idx(r, c);
            const value = cells[i] ?? "";
            const isSerieCol = c === 0;

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  borderRight: c === COLS - 1 ? "none" : "1px solid #e5e7eb",
                  borderBottom: r === ROWS - 1 ? "none" : "1px solid #e5e7eb",
                  width: CELL_WIDTH,
                  height: CELL_HEIGHT,
                  padding: 6,
                  boxSizing: "border-box",
                  background: isSerieCol ? "#f9fafb" : "#fff",
                  fontWeight: isSerieCol ? 900 : 400,
                }}
              >
                {editing && isAdmin && !isSerieCol ? (
                  <input
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCells((prev) => {
                        const next = cleanCells(prev);
                        next[i] = v;
                        return next;
                      });
                    }}
                    placeholder={c === 1 ? "13:00" : "13:30"}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: CELL_FONT,
                      fontFamily: "system-ui",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: CELL_FONT,
                      fontFamily: "system-ui",
                      lineHeight: 1.2,
                      color: "#111827",
                      display: "grid",
                      placeItems: isSerieCol ? "center" : "start",
                      height: "100%",
                    }}
                  >
                    {value}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {error ? (
        <div style={{ marginTop: 10, color: "#dc2626", fontWeight: 800 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

const headerCell = {
  width: 90,
  height: 38,
  padding: 6,
  boxSizing: "border-box",
  borderRight: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
  background: "#f3f4f6",
  fontWeight: 900,
  display: "grid",
  placeItems: "center",
};