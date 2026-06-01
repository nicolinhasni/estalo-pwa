// src/pages/Login.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      let email = usuario.trim().toLowerCase();

      // apelidos
      if (email === "admin") {
        email = "admin@estalo.local";
      } else if (email === "estalo") {
        email = "equipe@estalo.local";
      }

      await signInWithEmailAndPassword(auth, email, senha);
    } catch (err) {
      setErro("Usuário ou senha incorretos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Estalo 2026</h2>

        <form onSubmit={entrar} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button style={styles.button} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {erro ? <div style={styles.error}>{erro}</div> : null}
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f3f4f6",
    padding: 16,
  },

  card: {
    width: "min(420px, 100%)",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
  },

  title: {
    margin: "0 0 14px",
    textAlign: "center",
  },

  form: {
    display: "grid",
    gap: 10,
  },

  input: {
    padding: "12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
  },

  button: {
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: "#1f3a8a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  error: {
    color: "#b91c1c",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
};