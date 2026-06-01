import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Horarios({ user, isAdmin }) {
  const ROWS = 14;
  const COLS = 6;

  const ref = useMemo(() => doc(db, "horarios", "quadro"), []);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [cells, setCells] = useState(() => Array(ROWS * COLS).fill(""));

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const idx = (r, c) => r * COLS + c;

  function emptyCells() {
    return Array(ROWS * COLS).fill("");
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

    return fixed;
  }

  function normalizeFromFirestore(data) {
    if (Array.isArray(data?.cells)) {
      return cleanCells(data.cells);
    }

    if (Array.isArray(data?.quadro) && Array.isArray(data.quadro[0])) {
      const flat = [];

      for (let r = 0; r < Math.min(ROWS, data.quadro.length); r++) {
        for (let c = 0; c < Math.min(COLS, data.quadro[r].length); c++) {
          const v = data.quadro[r][c];
          flat.push(typeof v === "string" ? v : "");
        }
      }

      return cleanCells(flat);
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
        const data = snap.data();
        setCells(normalizeFromFirestore(data));
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

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando...</div>;
  }

  const cellSize = editing ? 42 : 55;
  const cellFont = editing ? 10 : 12;

  return (
    <div style={{ paddingTop: 8 }}>
      <h1 style={{ fontSize: 42, margin: "8px 0 10px" }}>Horarios</h1>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
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
              color: "#000",
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

        {isAdmin && !editing && (
          <button
            onClick={() => saveNow()}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Salvar agora
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

        {status ? (
          <span style={{ fontSize: 13, color: "#1f3a8a", fontWeight: 800 }}>
            {status}
          </span>
        ) : null}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          overflow: "hidden",
          background: "#fff",
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((__, c) => {
            const i = idx(r, c);
            const value = cells[i] ?? "";

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  borderRight: c === COLS - 1 ? "none" : "1px solid #e5e7eb",
                  borderBottom: r === ROWS - 1 ? "none" : "1px solid #e5e7eb",
                  width: cellSize,
                  height: cellSize,
                  padding: 6,
                  boxSizing: "border-box",
                }}
              >
                {editing && isAdmin ? (
                  <textarea
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCells((prev) => {
                        const next = cleanCells(prev);
                        next[i] = v;
                        return next;
                      });
                    }}
                    placeholder=""
                    style={{
                      width: "100%",
                      height: "100%",
                      resize: "none",
                      border: "none",
                      outline: "none",
                      fontSize: cellFont,
                      fontFamily: "system-ui",
                      lineHeight: 1.2,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: cellFont,
                      fontFamily: "system-ui",
                      lineHeight: 1.2,
                      color: "#111827",
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