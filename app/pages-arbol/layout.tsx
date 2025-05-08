"use client";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LargeKnowledgeGraph from "../../components/LargeKnowledgeGraph";
import ThemeToggle from "../../components/ThemeToggle";
import WikiHeadingsLinks from "../../components/WikiHeadingsLinks";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { pagesToTree, TopicNode } from "@/lib/notes-graph-util";
import RichTextRenderer from "@/components/RichTextRenderer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Recursively searches for a node in the topic tree by its slug
 * @param tree - Array of topic nodes to search through
 * @param slug - URL slug to match against node slugs
 * @returns Matching TopicNode or null if not found
 */
function findNodeBySlug(tree: TopicNode[], slug: string | null): TopicNode | null {
  if (!slug) return null;
  for (const node of tree) {
    if (node.slug === slug) return node;
    if (node.children) {
      const found = findNodeBySlug(node.children, slug);
      if (found) return found;
    }
  }
  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [graphOpen, setGraphOpen] = useState(true);
  const [tree, setTree] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Control state for navigation panel visibility
  const [navOpen, setNavOpen] = useState(true);
  
  // Define grid columns based on graph panel state
  const gridColumns = `1fr ${graphOpen ? '340px' : '0'}`; // Main content + Graph panel width
  const pathname = usePathname();
  const slug = pathname.split("/").filter(Boolean)[1] || null;

  // Fetch and build the topic tree when pathname changes
  useEffect(() => {
    setLoading(true);
    fetch("/api/pages")
      .then(res => {
        if (!res.ok) throw new Error("Failed to load topic tree");
        return res.json();
      })
      .then(data => {
        setTree(pagesToTree(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [pathname]);

  // Find the selected node based on the current URL slug
  const selected = findNodeBySlug(tree, slug);

  // Development debug logs
  if (process.env.NODE_ENV === 'development' && typeof window !== "undefined") {
    console.log("[Layout] Tree loaded:", tree);
    console.log("[Layout] Extracted slug:", slug);
    console.log("[Layout] Selected node:", selected);
  }

  return (
    <div className={`wiki-layout ${geistSans.variable} ${geistMono.variable} antialiased`} style={{ gridTemplateColumns: gridColumns, position: 'relative' }}>
      {/* Botón de toggle para el panel izquierdo, ahora fuera del aside */}
      <button
        className="wiki-nav-toggle-fixed"
        aria-label={navOpen ? "Hide navigation" : "Show navigation"}
        onClick={() => setNavOpen(!navOpen)}
        style={{
          position: "fixed",
          top: 12,
          left: navOpen ? "230px" : "20px",
          zIndex: 100,
          background: "var(--nav-bg)",
          border: "1px solid var(--border)",
          borderRadius: "50%",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          cursor: "pointer",
          boxShadow: "0 1px 4px 0 #0001",
          transition: "left 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, color 0.3s"
        }}
      >
        {navOpen ? "←" : "→"}
      </button>
      <aside 
        className={`wiki-nav scrollable-fixed-panel`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "260px",
          transform: navOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 10, 
          overflowY: 'auto',
          background: 'var(--nav-bg)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ paddingTop: '20px' }}> {/* Reducido el padding superior ya que el botón está fuera */}
          <ThemeToggle />
          <nav aria-label="Wiki Topics">
            <h2 style={{ fontSize: "1.1em", marginBottom: 12, fontWeight: 600 }}>Topics y Subtopics</h2>
            {loading ? (
              <div style={{ padding: 12, color: "#888" }}>Loading topic tree...</div>
            ) : error ? (
              <div style={{ padding: 12, color: "#c00" }}>Error: {error}</div>
            ) : tree && tree.length > 0 ? (
              <TreeList nodes={tree} selectedSlug={slug} />
            ) : (
              <div style={{ padding: 12, color: "#888" }}>No topics available.</div>
            )}
          </nav>
        </div>
      </aside>
      <main className="wiki-main" style={{ paddingTop: '1rem', width: '100%', marginLeft: '0' /* El contenido principal ahora ocupa todo el ancho disponible */ }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#888" }}>Loading content...</div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: "center", color: "#c00" }}>Error: {error}</div>
        ) : slug && !selected ? (
          <div style={{ padding: 32, textAlign: "center", color: "#c00" }}>Topic not found for slug: <b>{slug}</b></div>
        ) : slug && selected ? (
          <div>
            <h3>{selected.label}</h3>
            {/* Pass the entire content object if it's the Tiptap JSON */}
            {selected.content
              ? <RichTextRenderer content={selected.content} /> 
              : <em>No content available</em>
            }
          </div>
        ) : (
          children
        )}
      </main>
      {/* Botón para toggle del panel derecho */}
      <button 
        onClick={() => setGraphOpen(!graphOpen)}
        style={{
          position: 'fixed',
          top: '12px',
          right: graphOpen ? '350px' : '10px', // Ajustar posición basado en si el panel está abierto
          zIndex: 100,
          background: "var(--nav-bg)",
          border: "1px solid var(--border)",
          borderRadius: "50%",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          cursor: "pointer",
          boxShadow: "0 1px 4px 0 #0001",
          transition: "right 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, color 0.3s"
        }}
        aria-label={graphOpen ? "Hide graph panel" : "Show graph panel"}
      >
        {graphOpen ? "→" : "←"}
      </button>
      <aside 
        className="wiki-graph scrollable-sticky-panel" 
        style={{
          position: 'sticky',
          top: '0', // Para que sea sticky desde la parte superior
          height: '100vh', // Ocupa toda la altura de la ventana
          overflowY: 'auto',
          width: graphOpen ? '340px' : '0',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          visibility: graphOpen ? 'visible' : 'hidden',
          paddingTop: '50px' // Espacio para el botón de toggle si se quiere dentro
        }}
      >
        <LargeKnowledgeGraph />
        <div className="wiki-related">
          <WikiHeadingsLinks />
        </div>
      </aside>
    </div>
  );
}

function TreeList({ nodes, selectedSlug }: { nodes: TopicNode[]; selectedSlug: string | null }) {
  const [open, setOpen] = useState<{ [id: string]: boolean }>({});
  if (!nodes || !nodes.length) return null;
  return (
    <ul style={{ listStyle: "none", paddingLeft: 12 }}>
      {nodes.map(node => (
        <li key={node.id}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {node.children && node.children.length > 0 && (
              <button
                style={{
                  marginRight: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onClick={() => setOpen(o => ({ ...o, [node.id]: !o[node.id] }))}
              >
                {open[node.id] ? "▼" : "▶"}
              </button>
            )}
            <Link
              href={`/pages-arbol/${node.slug}`}
              style={{
                cursor: "pointer",
                color: selectedSlug === node.slug ? "#1d4ed8" : "#2563eb",
                fontWeight: selectedSlug === node.slug ? 700 : 400,
                textDecoration: "none"
              }}
            >
              {node.label}
            </Link>
          </div>
          {node.children && node.children.length > 0 && open[node.id] && (
            <TreeList nodes={node.children} selectedSlug={selectedSlug} />
          )}
        </li>
      ))}
    </ul>
  );
}