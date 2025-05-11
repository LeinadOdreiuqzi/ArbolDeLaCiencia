"use client";
import React, { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LargeKnowledgeGraph from "../../components/LargeKnowledgeGraph";
import ThemeToggle from "../../components/ThemeToggle";
import WikiHeadingsLinks from "../../components/WikiHeadingsLinks";
import ReadingProgressBar from "../../components/ReadingProgressBar";
import Pagination from "../../components/Pagination";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { pagesToTree, TopicNode } from "@/lib/notes-graph-util";
import RichTextRenderer from "@/components/RichTextRenderer";
import PageHierarchyNavigation from "@/components/PageHierarchyNavigation";

/**
 * Función auxiliar para paginar el contenido
 * @param content - El contenido completo en formato JSON
 * @param currentPage - La página actual
 * @param pageSize - El tamaño de página (elementos por página)
 * @returns Una porción del contenido correspondiente a la página actual
 */
function getPaginatedContent(content: any, currentPage: number, pageSize: number) {
  if (!content || !content.content || !Array.isArray(content.content)) {
    return content;
  }
  
  // Simplificar la paginación para evitar problemas
  const contentLength = content.content.length;
  const itemsPerPage = Math.max(10, Math.ceil(contentLength / Math.min(5, Math.ceil(contentLength / 10))));
  
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, contentLength);
  
  // Crear una copia simplificada del contenido
  return {
    ...content,
    content: content.content.slice(startIdx, endIdx)
  };
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
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const router = useRouter();
  
  // Detectar el tema actual
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
      if (storedTheme) setTheme(storedTheme);
      
      // Observar cambios en el tema
      const handleThemeChange = () => {
        const currentTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light";
        setTheme(currentTheme || "light");
      };
      
      window.addEventListener("storage", handleThemeChange);
      const observer = new MutationObserver(handleThemeChange);
      observer.observe(document.documentElement, { attributes: true });
      
      return () => {
        window.removeEventListener("storage", handleThemeChange);
        observer.disconnect();
      };
    }
  }, []);
  
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
    if (selected && selected.content && selected.content.content && Array.isArray(selected.content.content)) {
      const contentLength = selected.content.content.length;
      // Usar un cálculo simplificado para determinar el número de páginas
      const estimatedPages = Math.ceil(contentLength / 20); // Aproximadamente 20 elementos por página
      setTotalPages(estimatedPages > 0 ? estimatedPages : 1);
      setCurrentPage(1); // Resetear a la primera página cuando cambia el contenido
    } else {
      setTotalPages(1);
    }
  }, [selected, pageSize]);

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
        width: '100%'
      }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: `${navOpen ? '260px' : '0'} 1fr ${graphOpen ? '340px' : '0'}`,
        gridTemplateAreas: '"nav main graph"',
        minHeight: '100vh',
        transition: 'all 0.3s ease',
        backgroundColor: 'var(--background)'
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
          <div style={{ paddingTop: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0 12px 16px 12px' }}>
              <ThemeToggle />
              <h2 style={{ fontSize: "1.1em", marginBottom: 12, fontWeight: 600, padding: '0 8px' }}>Topics y Subtopics</h2>
              {/* Botón para ir a la página principal */}
              <Link 
                href="/pages-arbol"
                className="home-wiki-button"
                style={{
                  padding: "10px 14px",
                  margin: "0 0 16px 8px",
                  background: theme === "dark" ? "var(--primary-color-dark, #1e3a8a)" : "var(--primary-color-light, #e0f2fe)",
                  color: theme === "dark" ? "var(--text-on-dark, #e0f2fe)" : "var(--primary-color, #2563eb)",
                  borderRadius: "8px",
                  textDecoration: "none",
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  letterSpacing: "0.3px",
                  transition: "all 0.3s ease",
                  boxShadow: theme === "dark" ? "0 2px 4px rgba(0,0,0,0.2)" : "0 2px 4px rgba(0,0,0,0.05)",
                  border: theme === "dark" ? "1px solid var(--primary-color-dark, #1e40af)" : "1px solid var(--primary-color-lighter, #bfdbfe)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  maxWidth: "100%",
                  width: "fit-content"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme === "dark" 
                    ? "var(--primary-color-darker, #1e40af)" 
                    : "var(--primary-color-lighter, #bfdbfe)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = theme === "dark" 
                    ? "0 4px 8px rgba(0,0,0,0.3)" 
                    : "0 4px 8px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme === "dark" 
                    ? "var(--primary-color-dark, #1e3a8a)" 
                    : "var(--primary-color-light, #e0f2fe)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = theme === "dark" 
                    ? "0 2px 4px rgba(0,0,0,0.2)" 
                    : "0 2px 4px rgba(0,0,0,0.05)";
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Inicio Wiki
              </Link>
            </div>
            
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 12, color: "#888" }}>Cargando temas...</div>
              ) : error ? (
                <div style={{ padding: 12, color: "#c00" }}>Error: {error}</div>
              ) : tree && tree.length > 0 ? (
                <PageHierarchyNavigation selectedSlug={slug} />
              ) : (
                <div style={{ padding: 12, color: "#888" }}>No hay temas disponibles.</div>
              )}
            </div>
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
    </div>
  );
}

// El componente TreeList ha sido reemplazado por HierarchicalNavigation