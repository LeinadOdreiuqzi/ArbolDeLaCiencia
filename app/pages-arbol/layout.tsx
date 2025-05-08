"use client";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LargeKnowledgeGraph from "../../components/LargeKnowledgeGraph";
import ThemeToggle from "../../components/ThemeToggle";
import WikiHeadingsLinks from "../../components/WikiHeadingsLinks";
import ReadingProgressBar from "../../components/ReadingProgressBar";
import Pagination from "../../components/Pagination";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pagesToTree, TopicNode } from "@/lib/notes-graph-util";
import RichTextRenderer from "@/components/RichTextRenderer";

/**
 * Función auxiliar para paginar el contenido
 * @param content - El contenido completo en formato JSON
 * @param currentPage - La página actual
 * @param pageSize - El tamaño de página (elementos por página)
 * @returns Una porción del contenido correspondiente a la página actual
 */
function getPaginatedContent(content: any, currentPage: number, pageSize: number) {
  // Esta es una implementación simplificada
  // En una implementación real, se dividiría el contenido de manera más inteligente
  // por ejemplo, por párrafos o secciones
  
  if (!content || !content.content || !Array.isArray(content.content)) {
    return content;
  }
  
  // Dividir el contenido en "páginas" basadas en el número de nodos de nivel superior
  const totalItems = content.content.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  // Crear una copia del contenido con solo los elementos de la página actual
  const paginatedContent = {
    ...content,
    content: content.content.slice(startIndex, endIndex)
  };
  
  return paginatedContent;
}

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
  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Número de elementos por página
  const router = useRouter();
  
  // Define grid columns based on graph panel state
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
  
  // Calcular el número total de páginas cuando cambia el contenido seleccionado
  useEffect(() => {
    if (selected && selected.content) {
      // Estimación simple: si el contenido tiene más de X caracteres, dividirlo en páginas
      // Esto es una aproximación, en una implementación real se podría usar un enfoque más sofisticado
      const contentLength = JSON.stringify(selected.content).length;
      const estimatedPages = Math.max(1, Math.ceil(contentLength / 10000)); // 10000 caracteres por página
      setTotalPages(estimatedPages);
      setCurrentPage(1); // Resetear a la primera página cuando cambia el contenido
    } else {
      setTotalPages(1);
    }
  }, [selected]);

  // Development debug logs
  if (process.env.NODE_ENV === 'development' && typeof window !== "undefined") {
    console.log("[Layout] Tree loaded:", tree);
    console.log("[Layout] Extracted slug:", slug);
    console.log("[Layout] Selected node:", selected);
  }

  return (
    <div className={`wiki-layout ${geistSans.variable} ${geistMono.variable} antialiased`} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        display: 'grid',
        gridTemplateColumns: `${navOpen ? '260px' : '0'} 1fr ${graphOpen ? '340px' : '0'}`,
        gridTemplateAreas: '"nav main graph"',
        minHeight: '100vh',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
      <ReadingProgressBar />
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
          gridArea: 'nav',
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: navOpen ? "260px" : "0",
          overflow: navOpen ? "auto" : "hidden",
          opacity: navOpen ? 1 : 0,
          visibility: navOpen ? "visible" : "hidden",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 10, 
          background: 'var(--nav-bg)',
          boxShadow: navOpen ? '2px 0 8px rgba(0,0,0,0.15)' : 'none'
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
      <main className="wiki-main" style={{ 
          gridArea: 'main',
          padding: '1rem 40px',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
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
              ? <RichTextRenderer 
                  content={getPaginatedContent(selected.content, currentPage, pageSize)} 
                /> 
              : <em>No content available</em>
            }
            {/* Componente de paginación para contenido extenso */}
            {selected.content && totalPages > 1 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={(page) => {
                  setCurrentPage(page);
                  // Aquí se podría implementar la lógica para cargar solo una parte del contenido
                  // basado en la página actual
                  window.scrollTo(0, 0); // Resetear scroll para que la barra de progreso funcione correctamente
                }}
              />
            )}
          </div>
        ) : (
          children
        )}
      </main>
      <button 
        onClick={() => setGraphOpen(!graphOpen)}
        style={{
          position: 'fixed',
          top: '12px',
          right: graphOpen ? '350px' : '10px',
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
          gridArea: 'graph',
          position: 'fixed',
          top: '0',
          right: '0',
          height: '100vh',
          width: graphOpen ? '340px' : '0',
          overflow: graphOpen ? 'auto' : 'hidden',
          padding: graphOpen ? '50px 15px 15px 15px' : '0',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          visibility: graphOpen ? 'visible' : 'hidden',
          opacity: graphOpen ? '1' : '0',
          zIndex: 50,
          boxShadow: graphOpen ? '-2px 0 8px rgba(0,0,0,0.1)' : 'none'
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