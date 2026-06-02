import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

const SERIES = ["1º","2º","3º","4º","5º","6º","7º","8º","9º","1EM","2EM","3EM","adulto"];
const MUSICAS = ["Música 1", "Música 2", "Música 3"];

function formatTs(ts) {
  try {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function reduzirImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 500;

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Serenatas() {
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState("1º");
  const [foto, setFoto] = useState("");
  const [musica, setMusica] = useState("Música 1");
  const [err, setErr] = useState("");

  const [fila, setFila] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [detalhes, setDetalhes] = useState(null);

  const [qtdFila, setQtdFila] = useState(0);
  const [qtdHistorico, setQtdHistorico] = useState(0);

  useEffect(() => {
    const qFila = query(collection(db, "serenatas"), orderBy("pos", "asc"));
    const unsubFila = onSnapshot(
      qFila,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFila(arr);
        setQtdFila(arr.length);
      },
      (e) => setErr(e?.message || "Erro ao carregar fila.")
    );

    const qHist = query(collection(db, "historico_serenatas"), orderBy("concluidoAt", "asc"));
    const unsubHist = onSnapshot(
      qHist,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistorico(arr);
        setQtdHistorico(arr.length);
      },
      (e) => setErr(e?.message || "Erro ao carregar histórico.")
    );

    return () => {
      unsubFila();
      unsubHist();
    };
  }, []);

  const nextPos = useMemo(() => {
    if (!fila.length) return 1;
    const max = Math.max(...fila.map((x) => Number(x.pos || 0)));
    return max + 1;
  }, [fila]);

  async function pegarFoto(e) {
    setErr("");

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = await reduzirImagem(file);
      setFoto(img);
    } catch {
      setErr("Erro ao carregar a foto.");
    }
  }

  async function adicionar() {
    setErr("");

    const n = nome.trim();
    if (!n) {
      setErr("Digite o nome.");
      return;
    }

    try {
      await addDoc(collection(db, "serenatas"), {
        nome: n,
        serie,
        fotoUrl: foto,
        musica,
        pedidoAt: serverTimestamp(),
        pos: nextPos,
      });

      setNome("");
      setSerie("1º");
      setFoto("");
      setMusica("Música 1");

      const input = document.getElementById("foto-serenata-input");
      if (input) input.value = "";
    } catch (e) {
      setErr(e?.message || "Erro ao adicionar.");
    }
  }

  async function excluirDaFila(item) {
    setErr("");
    try {
      await deleteDoc(doc(db, "serenatas", item.id));
    } catch (e) {
      setErr(e?.message || "Erro ao excluir.");
    }
  }

  async function descerNaFila(item) {
    setErr("");

    const idx = fila.findIndex((x) => x.id === item.id);
    if (idx === -1) return;
    if (idx === fila.length - 1) return;

    const atual = fila[idx];
    const prox = fila[idx + 1];

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "serenatas", atual.id), { pos: Number(prox.pos || 0) });
      batch.update(doc(db, "serenatas", prox.id), { pos: Number(atual.pos || 0) });
      await batch.commit();
    } catch (e) {
      setErr(e?.message || "Erro ao descer na fila.");
    }
  }

  async function concluir(item) {
    setErr("");
    try {
      const batch = writeBatch(db);

      const filaRef = doc(db, "serenatas", item.id);
      const histRef = doc(db, "historico_serenatas", item.id);

      batch.set(
        histRef,
        {
          nome: item.nome,
          serie: item.serie,
          fotoUrl: item.fotoUrl || "",
          musica: item.musica || "Música 1",
          pedidoAt: item.pedidoAt || serverTimestamp(),
          concluidoAt: serverTimestamp(),
        },
        { merge: true }
      );

      batch.delete(filaRef);

      await batch.commit();
    } catch (e) {
      setErr(e?.message || "Erro ao concluir.");
    }
  }

  async function restaurarParaFila(item) {
    setErr("");
    try {
      const q = query(collection(db, "serenatas"), orderBy("pos", "desc"), limit(1));
      const snap = await getDocs(q);
      const maxPos = snap.empty ? 0 : Number(snap.docs[0].data().pos || 0);
      const newPos = maxPos + 1;

      const batch = writeBatch(db);

      const filaRef = doc(db, "serenatas", item.id);
      const histRef = doc(db, "historico_serenatas", item.id);

      batch.set(
        filaRef,
        {
          nome: item.nome,
          serie: item.serie,
          fotoUrl: item.fotoUrl || "",
          musica: item.musica || "Música 1",
          pedidoAt: item.pedidoAt || serverTimestamp(),
          pos: newPos,
          restauradoAt: serverTimestamp(),
        },
        { merge: true }
      );

      batch.delete(histRef);

      await batch.commit();
    } catch (e) {
      setErr(e?.message || "Erro ao restaurar.");
    }
  }

  const styles = {
    card: {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 20,
  padding: 18,
  background: "rgba(255,255,255,.92)",
  boxShadow: "0 10px 30px rgba(0,0,0,.08)",
},
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      outline: "none",
      boxSizing: "border-box"
    },
    btn: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 700,
    },
    primaryBtn: {
      padding: "12px 12px",
      borderRadius: 10,
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
    row: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 18,
  padding: 14,
  background: "rgba(255,255,255,.95)",
  boxShadow: "0 6px 18px rgba(0,0,0,.07)",
},
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 12,
      objectFit: "cover",
      border: "1px solid #e5e7eb",
      background: "#f3f4f6",
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "grid",
      placeItems: "center",
      padding: 16,
      zIndex: 50,
    },
    modal: {
      width: "min(720px, 100%)",
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      padding: 14,
    },
    miniDash: {
      display: "flex",
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap",
      maxWidth: "100%"
    },
    miniCard: {
  background: "rgba(255,255,255,.95)",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 18,
  padding: "16px 22px",
  minWidth: 140,
  boxShadow: "0 6px 18px rgba(0,0,0,.08)",
},
  };

  return (
  <div
  style={{
    minHeight: "100vh",
    padding: 20,
    backgroundColor: "#f5f1eb",
    backgroundImage:
      "radial-gradient(circle at 15% 20%, rgba(128,0,0,.08), transparent 220px), radial-gradient(circle at 85% 70%, rgba(80,0,80,.08), transparent 220px)",
  }}
>
  <div
  style={{
    display: "flex",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 20,
    flexWrap: "wrap",
  }}
><div
  style={{
    display: "grid",
    gap: 10,
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
  }}
><div
  style={{
    display: "grid",
    gap: 10,
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
  }}
>
  <input placeholder="Nome" />

  <select>
    <option>1º</option>
  </select>

  <select>
    <option>Música 1</option>
  </select>

  <button>Escolher foto</button>
</div>
  
    <h1
  style={{
    fontSize: "clamp(28px, 8vw, 42px)",
    fontWeight: 900,
  }}
>
  Fila de Serenatas
</h1>

    <img
  src="/logo-estalo.png"
  alt="Estalo"
  style={{
    width: "min(120px, 35vw)",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(0,0,0,.2)",
    border: "3px solid white",
  }}
/>
  </div>

      <div style={styles.miniDash}>
        <div style={styles.miniCard}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Na fila</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{qtdFila}</div>
        </div>

        <div style={styles.miniCard}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Concluídas</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{qtdHistorico}</div>
        </div>
      </div>

      <div style={{ ...styles.card, marginBottom: 18 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome"
            style={styles.input}
          />

          <select value={serie} onChange={(e) => setSerie(e.target.value)} style={styles.input}>
            {SERIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select value={musica} onChange={(e) => setMusica(e.target.value)} style={styles.input}>
            {MUSICAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <label style={{ ...styles.btn, textAlign: "center" }}>
            📷 Tirar / escolher foto
            <input
              id="foto-serenata-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={pegarFoto}
              style={{ display: "none" }}
            />
          </label>

          {foto ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={foto} alt="prévia" style={styles.avatar} />
              <button type="button" style={styles.dangerBtn} onClick={() => setFoto("")}>
                Remover foto
              </button>
            </div>
          ) : null}

          <button onClick={adicionar} style={styles.primaryBtn}>
            Adicionar serenata
          </button>

          {err ? (
            <div style={{ color: "#dc2626", fontWeight: 800 }}>{err}</div>
          ) : null}
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 10px" }}>Na fila</h2>

      {fila.length === 0 ? (
        <div style={{ color: "#6b7280" }}>Nenhuma serenata na fila.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          {fila.map((it, i) => (
            <div key={it.id} style={styles.row}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 34, fontWeight: 900 }}>#{i + 1}</div>

                {it.fotoUrl ? (
                  <img src={it.fotoUrl} alt="foto" style={styles.avatar} />
                ) : (
                  <div
                    style={{
                      ...styles.avatar,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10,
                      color: "#6b7280",
                    }}
                  >
                    sem foto
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.nome} — <span style={{ fontWeight: 700 }}>{it.serie}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    música: {it.musica || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    pedido: {formatTs(it.pedidoAt)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button style={styles.btn} onClick={() => setDetalhes({ ...it, tipo: "fila" })}>
                  Detalhes
                </button>

                <button style={styles.btn} onClick={() => concluir(it)}>
                  Concluído
                </button>

                <button
                  style={{ ...styles.btn, opacity: i === fila.length - 1 ? 0.5 : 1 }}
                  onClick={() => descerNaFila(it)}
                  disabled={i === fila.length - 1}
                >
                  Descer na fila
                </button>

                <button style={styles.dangerBtn} onClick={() => excluirDaFila(it)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 10px" }}>
        Histórico (Concluídas)
      </h2>

      {historico.length === 0 ? (
        <div style={{ color: "#6b7280" }}>Nenhuma serenata concluída.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {historico.map((it, i) => (
            <div key={it.id} style={styles.row}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 34, fontWeight: 900 }}>#{i + 1}</div>

                {it.fotoUrl ? (
                  <img src={it.fotoUrl} alt="foto" style={styles.avatar} />
                ) : (
                  <div
                    style={{
                      ...styles.avatar,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10,
                      color: "#6b7280",
                    }}
                  >
                    sem foto
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.nome} — <span style={{ fontWeight: 700 }}>{it.serie}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    música: {it.musica || "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    concluído: {formatTs(it.concluidoAt)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button style={styles.btn} onClick={() => setDetalhes({ ...it, tipo: "hist" })}>
                  Detalhes
                </button>
                <button style={styles.btn} onClick={() => restaurarParaFila(it)}>
                  Restaurar para a fila
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalhes && (
        <div style={styles.modalOverlay} onClick={() => setDetalhes(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  {detalhes.nome} — {detalhes.serie}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Música: <b>{detalhes.musica || "—"}</b>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {detalhes.tipo === "hist" ? (
                    <>Concluído em: {formatTs(detalhes.concluidoAt)}</>
                  ) : (
                    <>Pedido em: {formatTs(detalhes.pedidoAt)}</>
                  )}
                </div>
              </div>

              <button style={styles.btn} onClick={() => setDetalhes(null)}>
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {detalhes.fotoUrl ? (
                <img
                  src={detalhes.fotoUrl}
                  alt="foto grande"
                  style={{
                    width: "100%",
                    maxHeight: 420,
                    objectFit: "contain",
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    background: "#f3f4f6",
                    display: "grid",
                    placeItems: "center",
                    color: "#6b7280",
                    fontWeight: 800,
                  }}
                >
                  Sem foto
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}