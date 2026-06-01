import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function CriarAviso({ user, isAdmin, onBack }) {
  const [titulo, setTitulo] = useState("");
  const [autorNome, setAutorNome] = useState("");
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function salvar() {
    setErr("");

    if (!isAdmin) {
      setErr("Apenas o admin pode criar avisos.");
      return;
    }

    const t = titulo.trim();
    const a = autorNome.trim();
    const x = texto.trim();

    if (!t || !a || !x) {
      setErr("Preencha Título, Nome e Texto.");
      return;
    }

    try {
      setSaving(true);

      await addDoc(collection(db, "avisos"), {
        titulo: t,
        texto: x,
        autorNome: a,
        autorEmail: user?.email || "",
        createdAt: serverTimestamp(),
        status: "ativo",
      });

      // volta pra lista
      onBack?.();
    } catch (e) {
      console.error("Erro ao salvar aviso:", e);
      setErr(e?.message || "Erro ao salvar aviso.");
    } finally {
      setSaving(false);
    }
  }

  // Modal igual ao seu estilo
  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "grid",
      placeItems: "center",
      padding: 16,
      zIndex: 50,
    },
    card: {
      width: "min(720px, 100%)",
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      padding: 14,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    close: {
      width: 36,
      height: 36,
      borderRadius: 10,
      border: "1px solid #d1d5db",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 900,
    },
    input: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      outline: "none",
      marginBottom: 10,
    },
    textarea: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 10,
      border: "1px solid #d1d5db",
      outline: "none",
      minHeight: 120,
      resize: "vertical",
      marginBottom: 10,
    },
    btn: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid #1f3a8a",
      background: "#1f3a8a",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 900,
      opacity: saving ? 0.7 : 1,
    },
    err: { color: "#dc2626", fontWeight: 900, marginTop: 10 },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Criar aviso</div>
          <button style={styles.close} onClick={onBack} title="Fechar">
            ✕
          </button>
        </div>

        <input
          style={styles.input}
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Nome de quem está avisando"
          value={autorNome}
          onChange={(e) => setAutorNome(e.target.value)}
        />

        <textarea
          style={styles.textarea}
          placeholder="Texto do aviso"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />

        <button style={styles.btn} onClick={salvar} disabled={saving}>
          {saving ? "Salvando..." : "Salvar aviso"}
        </button>

        {err ? <div style={styles.err}>{err}</div> : null}
      </div>
    </div>
  );
}