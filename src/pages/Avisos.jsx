import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function formatTs(ts) {
  try {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

export default function Avisos({ user, isAdmin, onCriarAviso }) {
  const [avisos, setAvisos] = useState([]);
  const [err, setErr] = useState("");

  // estado de edição
  const [editId, setEditId] = useState(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editTexto, setEditTexto] = useState("");

  useEffect(() => {
    const qAvisos = query(collection(db, "avisos"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qAvisos,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAvisos(arr);
        setErr("");
      },
      (e) => setErr(e?.message || "Erro ao carregar avisos.")
    );
    return () => unsub();
  }, []);

  function startEdit(a) {
    setEditId(a.id);
    setEditTitulo(a.titulo || "");
    setEditTexto(a.texto || "");
  }

  function cancelEdit() {
    setEditId(null);
    setEditTitulo("");
    setEditTexto("");
  }

  async function salvarEdicao(id) {
    setErr("");
    try {
      const titulo = editTitulo.trim();
      const texto = editTexto.trim();
      if (!titulo || !texto) {
        setErr("Preencha título e texto.");
        return;
      }

      await updateDoc(doc(db, "avisos", id), {
        titulo,
        texto,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || "—",
      });

      cancelEdit();
    } catch (e) {
      setErr(e?.message || "Erro ao salvar edição.");
    }
  }

  async function excluirAviso(id) {
    setErr("");
    const ok = window.confirm("Tem certeza que quer excluir este aviso?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "avisos", id));
    } catch (e) {
      setErr(e?.message || "Erro ao excluir aviso.");
    }
  }

  const styles = {
    btn: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 800,
    },
    primaryBtn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #1f3a8a",
      background: "#1f3a8a",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 900,
    },
    dangerBtn: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #ef4444",
      background: "#fff",
      color: "#ef4444",
      cursor: "pointer",
      fontWeight: 900,
    },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      outline: "none",
    },
    card: {
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 14,
      background: "#fff",
    },
  };

  return (
    <div>
      <h1 style={{ fontSize: 34, fontWeight: 900, margin: "6px 0 6px" }}>Avisos</h1>

      {isAdmin && (
        <button style={styles.primaryBtn} onClick={onCriarAviso}>
          + Criar aviso
        </button>
      )}

      {err ? (
        <div style={{ color: "#dc2626", fontWeight: 900, marginTop: 10 }}>{err}</div>
      ) : null}

      <div style={{ height: 14 }} />

      {avisos.length === 0 ? (
        <div style={{ color: "#6b7280" }}>Nenhum aviso ainda.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {avisos.map((a) => {
            const editing = editId === a.id;

            return (
              <div key={a.id} style={styles.card}>
                {/* topo do card com ações no canto direito */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    {editing ? (
                      <input
                        style={styles.input}
                        value={editTitulo}
                        onChange={(e) => setEditTitulo(e.target.value)}
                        placeholder="Título"
                      />
                    ) : (
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{a.titulo}</div>
                    )}
                  </div>

                  {/* ações */}
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {editing ? (
                        <>
                          <button style={styles.btn} onClick={() => salvarEdicao(a.id)}>
                            Salvar
                          </button>
                          <button style={styles.btn} onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button style={styles.btn} onClick={() => startEdit(a)}>
                            Editar
                          </button>
                          <button style={styles.dangerBtn} onClick={() => excluirAviso(a.id)}>
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ height: 10 }} />

                {editing ? (
                  <textarea
                    style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    placeholder="Texto do aviso"
                  />
                ) : (
                  <div style={{ whiteSpace: "pre-wrap" }}>{a.texto}</div>
                )}

                <div style={{ height: 10 }} />

                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Por: {a.autorNome || a.autorEmail || "—"} • {formatTs(a.createdAt)}
                  {a.updatedAt ? (
                    <>
                      {" "}
                      • <b>Editado</b>: {formatTs(a.updatedAt)}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}