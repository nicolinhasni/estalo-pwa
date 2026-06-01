import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./firebase";

import DrawerMenu from "./components/DrawerMenu";

// Pages
import Avisos from "./pages/Avisos";
import CriarAviso from "./pages/CriarAviso";
import Serenatas from "./pages/Serenatas";
import Dancas from "./pages/Dancas";
import Horarios from "./pages/Horarios";
import Login from "./pages/Login";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [page, setPage] = useState("avisos"); // avisos = home
  const [isAdmin, setIsAdmin] = useState(false);

  // Sub-telas de avisos
  const [subPageAvisos, setSubPageAvisos] = useState("lista"); // lista | criar

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setCheckingAuth(false);

      if (!u) {
        setIsAdmin(false);
        return;
      }

      // ✅ Admin por UID: admins/{uid} com role == "admin"
      try {
        const adminSnap = await getDoc(doc(db, "admins", u.uid));
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          setIsAdmin(data?.role === "admin");
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        console.error("Erro ao checar admin:", e);
        setIsAdmin(false);
      }
    });

    return () => unsub();
  }, []);

  const title = useMemo(() => "Estalo 2026", []);

  if (checkingAuth) {
    return <div style={{ padding: 24, fontFamily: "system-ui" }}>Carregando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  // Conteúdo da página atual
  let content = null;

  if (page === "avisos") {
    content =
      subPageAvisos === "criar" ? (
        <CriarAviso
          user={user}
          isAdmin={isAdmin}
          onBack={() => setSubPageAvisos("lista")}
        />
      ) : (
        <Avisos
          user={user}
          isAdmin={isAdmin}
          onCriarAviso={() => setSubPageAvisos("criar")}
        />
      );
  }

  if (page === "serenatas") {
    content = <Serenatas user={user} isAdmin={isAdmin} />;
  }

  if (page === "dancas") {
    content = <Dancas user={user} isAdmin={isAdmin} />;
  }

  if (page === "horarios") {
    content = <Horarios user={user} isAdmin={isAdmin} />;
  }

  return (
    <div style={{ fontFamily: "system-ui" }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
              }}
              title="Menu"
            >
              ☰
            </button>

            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Logado: <b>{user.email}</b> {isAdmin ? " • admin" : ""}
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut(auth)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Drawer */}
      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        current={page}
        onNavigate={(next) => {
          setDrawerOpen(false);
          setPage(next);

          // voltar pro "lista" quando voltar pra avisos
          if (next === "avisos") setSubPageAvisos("lista");
        }}
      />

      {/* Page */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px" }}>
        {content}
      </div>
    </div>
  );
}