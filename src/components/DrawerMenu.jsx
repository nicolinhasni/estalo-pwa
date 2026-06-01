import { useState } from "react";

export default function DrawerMenu({
  open,
  onClose,
  active,
  onNavigate,
  title = "Estalo 2026",
}) {
  const items = [
    { key: "avisos", label: "Avisos", icon: "📌" },
    { key: "serenatas", label: "Serenatas", icon: "🎶" },
    { key: "dancas", label: "Danças", icon: "💃" },
    { key: "horarios", label: "Horarios", icon: "🕒" },
  ];

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 50,
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: 280,
          background: "#fff",
          zIndex: 60,
          transform: open ? "translateX(0)" : "translateX(-110%)",
          transition: "transform 180ms ease",
          borderRight: "1px solid #e5e7eb",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900 }}>Menu</div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 900,
            }}
            aria-label="Fechar menu"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        <div style={{ borderTop: "1px solid #eee", marginTop: 6 }} />

        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => {
                onNavigate(it.key);
                onClose();
              }}
              style={{
                textAlign: "left",
                width: "100%",
                padding: "12px 12px",
                borderRadius: 12,
                border: isActive ? "1px solid #1f3a8a" : "1px solid #e5e7eb",
                background: isActive ? "rgba(31,58,138,0.08)" : "#fff",
                cursor: "pointer",
                fontWeight: isActive ? 900 : 700,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span style={{ width: 22 }}>{it.icon}</span>
              {it.label}
            </button>
          );
        })}
      </div>
    </>
  );
}