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
  const [tree, setTree] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(true);
  const gridColumns = navOpen ? "260px 1fr 340px" : "0 1fr 340px";
  const pathname = usePathname();
  const slug = pathname.split("/").filter(Boolean)[1] || null;

  useEffect(() => {
    setLoading(true);
    fetch("/api/pages")
      .then(res => {
        if (!res.ok) throw new Error("Error al cargar el árbol de temas");
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

  // Encuentra el nodo seleccionado por slug
  const selected = findNodeBySlug(tree, slug);

  // Debug logs temporales
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("Árbol cargado:", tree);
    // eslint-disable-next-line no-console
    console.log("Slug extraído:", slug);
    // eslint-disable-next-line no-console
    console.log("Nodo seleccionado:", selected);
  }

  return (
    <div className={`wiki-layout ${geistSans.variable} ${geistMono.variable} antialiased`} style={{ gridTemplateColumns: gridColumns }}>
      <aside className={`wiki-nav${navOpen ? "" : " nav-hidden"}`} style={{ position: "relative" }}>
        <button
          className="wiki-nav-toggle"
          aria-label={navOpen ? "Hide navigation" : "Show navigation"}
          onClick={() => setNavOpen(!navOpen)}
          style={{
            position: "absolute",
            top: 12,
            left: navOpen ? "100%" : 8,
            transform: navOpen ? "translateX(-100%)" : "none",
            zIndex: 50,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            cursor: "pointer",
            boxShadow: "0 1px 4px 0 #0001",
            transition: "left 0.3s, background 0.2s, color 0.2s"
          }}
        >
          {navOpen ? "←" : "→"}
        </button>
        <div style={{ display: navOpen ? "block" : "none" }}>
          <ThemeToggle />
          <nav aria-label="Wiki Topics">
            <h2 style={{ fontSize: "1.1em", marginBottom: 12, fontWeight: 600 }}>Topics y Subtopics</h2>
            {loading ? (
              <div style={{ padding: 12, color: "#888" }}>Cargando árbol de temas...</div>
            ) : error ? (
              <div style={{ padding: 12, color: "#c00" }}>Error: {error}</div>
            ) : tree && tree.length > 0 ? (
              <TreeList nodes={tree} selectedSlug={slug} />
            ) : (
              <div style={{ padding: 12, color: "#888" }}>No hay temas disponibles.</div>
            )}
          </nav>
        </div>
      </aside>
      <main className="wiki-main">
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#888" }}>Cargando contenido...</div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: "center", color: "#c00" }}>Error: {error}</div>
        ) : slug && !selected ? (
          <div style={{ padding: 32, textAlign: "center", color: "#c00" }}>Tema no encontrado para el slug: <b>{slug}</b></div>
        ) : slug && selected ? (
          <div>
            <h3>{selected.label}</h3>
            {selected.content
              ? <RichTextRenderer data={selected.content} />
              : <em>Sin contenido</em>
            }
          </div>
        ) : (
          children
        )}
      </main>
      <aside className="wiki-graph">
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