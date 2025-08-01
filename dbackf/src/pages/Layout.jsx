import React, { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      {sidebarOpen && (
        <Sidebar onClose={() => setSidebarOpen(false)} />
      )}
      {/* Botón para abrir el sidebar en móvil */}
      {!sidebarOpen && (
        <button
          className="btn btn-primary position-fixed"
          style={{ top: 16, left: 16, zIndex: 2000 }}
          onClick={() => setSidebarOpen(true)}
        >
          <span className="bi bi-list"></span>
        </button>
      )}
      <main style={{ marginLeft: sidebarOpen ? 260 : 0, transition: "margin-left 0.2s" }}>
        {children}
      </main>
    </>
  );
}