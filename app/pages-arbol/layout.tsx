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
  // Verificar si el contenido es válido
  if (!content || !content.content || !Array.isArray(content.content)) {
    return content;
  }
  
  // Análisis más detallado del contenido para determinar si necesita paginación
  const contentLength = content.content.length;
  
  // Calculamos la complejidad y el tamaño en caracteres de cada elemento individualmente
  const itemComplexities: number[] = [];
  const itemCharCounts: number[] = [];
  let totalComplexity = 0;
  let totalCharCount = 0;
  
  // Función para contar caracteres en un elemento de contenido
  const countCharsInItem = (item: any): number => {
    let charCount = 0;
    
    // Contar caracteres en el texto del elemento
    if (item.text) {
      charCount += item.text.length;
    }
    
    // Contar caracteres en el contenido anidado
    if (item.content && Array.isArray(item.content)) {
      item.content.forEach((nestedItem: any) => {
        charCount += countCharsInItem(nestedItem);
      });
    }
    
    return charCount;
  };
  
  // Recorremos los elementos para evaluar su complejidad y contar caracteres
  content.content.forEach((item: any, index: number) => {
    let itemComplexity = 0;
    const charCount = countCharsInItem(item);
    itemCharCounts[index] = charCount;
    totalCharCount += charCount;
    
    // Si el elemento tiene contenido anidado, calculamos su complejidad
    if (item.content && Array.isArray(item.content) && item.content.length > 0) {
      // Damos más peso a elementos con contenido anidado extenso
      itemComplexity += item.content.length * 1.5;
      
      // Analizamos también la complejidad del contenido anidado
      item.content.forEach((nestedItem: any) => {
        if (nestedItem.text && nestedItem.text.length > 50) {
          itemComplexity += Math.floor(nestedItem.text.length / 50);
        }
      });
    } else {
      // Para elementos simples, asignamos un valor base
      itemComplexity += 1;
    }
    
    // Si el elemento tiene texto extenso, aumentamos la complejidad
    if (item.text && item.text.length > 50) {
      itemComplexity += Math.floor(item.text.length / 50);
    }
    
    // Consideramos el tipo de elemento para ajustar la complejidad
    if (item.type === 'heading') {
      // Los encabezados suelen indicar secciones nuevas, les damos más peso
      itemComplexity += 2;
    } else if (item.type === 'image') {
      // Las imágenes ocupan más espacio visual
      itemComplexity += 3;
    }
    
    itemComplexities[index] = itemComplexity;
    totalComplexity += itemComplexity;
  });
  
  // Umbral de paginación basado en caracteres (15,000 caracteres por página)
  const charThreshold = 15000;
  
  // También mantenemos un umbral de complejidad como respaldo
  const complexityThreshold = pageSize * 25; // Aumentamos significativamente el umbral
  
  if (contentLength <= 5 || totalCharCount < charThreshold && totalComplexity < complexityThreshold) {
    // Contenido pequeño o simple, no lo paginamos
    return content;
  }
  
  // Calculamos el número ideal de páginas basado en el conteo de caracteres
  const idealPageCount = Math.max(1, Math.ceil(totalCharCount / charThreshold));
  
  // Distribuimos el contenido de manera más equilibrada
  const pagesComplexity: number[] = new Array(idealPageCount).fill(0);
  const pagesCharCount: number[] = new Array(idealPageCount).fill(0);
  const pagesContent: any[][] = new Array(idealPageCount).fill(null).map(() => []);
  
  // Identificamos los tipos de elementos que indican el inicio de una sección
  const isSectionStart = (item: any): boolean => {
    return item.type === 'heading';
  };
  
  // Identificamos los tipos de elementos que no deberían cortarse
  const shouldKeepWithNext = (item: any, nextItem: any): boolean => {
    // No separar un encabezado del contenido que le sigue
    if (item.type === 'heading') return true;
    
    // No separar elementos que forman parte de una lista
    if (item.type === 'bulletList' || item.type === 'orderedList') {
      return nextItem && (nextItem.type === 'bulletList' || nextItem.type === 'orderedList');
    }
    
    // No separar párrafos cortos (menos de 200 caracteres) del siguiente elemento
    if (item.type === 'paragraph') {
      const charCount = itemCharCounts[content.content.indexOf(item)];
      return charCount < 200;
    }
    
    return false;
  };
  
  // Asignamos elementos a páginas intentando equilibrar el conteo de caracteres
  // y respetando los límites naturales del contenido
  let currentPageIndex = 0;
  let lastSectionStartIndex = 0;
  
  content.content.forEach((item: any, index: number) => {
    const isLastItem = index === content.content.length - 1;
    const nextItem = !isLastItem ? content.content[index + 1] : null;
    
    // Si encontramos el inicio de una nueva sección, lo marcamos
    if (isSectionStart(item)) {
      lastSectionStartIndex = index;
    }
    
    // Verificamos si debemos cambiar de página
    const wouldExceedThreshold = 
      pagesCharCount[currentPageIndex] + itemCharCounts[index] > charThreshold &&
      pagesContent[currentPageIndex].length > 0;
    
    // Solo cambiamos de página si:
    // 1. Excederíamos el umbral de caracteres
    // 2. No estamos en medio de una sección que debería mantenerse junta
    // 3. No es el último elemento (siempre incluimos el último elemento en la última página)
    if (wouldExceedThreshold && !isLastItem && !shouldKeepWithNext(item, nextItem)) {
      // Si hay un inicio de sección reciente y no estamos muy lejos de él,
      // retrocedemos para comenzar la nueva página desde ese punto
      if (lastSectionStartIndex > 0 && 
          index - lastSectionStartIndex < 5 && 
          lastSectionStartIndex > pagesContent[currentPageIndex][0]) {
        
        // Movemos los elementos desde el inicio de la sección a la siguiente página
        const elementsToMove = content.content.slice(lastSectionStartIndex, index + 1);
        
        // Eliminamos estos elementos de la página actual
        pagesContent[currentPageIndex] = pagesContent[currentPageIndex].filter(
          (_, i) => content.content.indexOf(_) < lastSectionStartIndex
        );
        
        // Actualizamos los contadores de la página actual
        pagesCharCount[currentPageIndex] = pagesContent[currentPageIndex].reduce(
          (sum, item) => sum + itemCharCounts[content.content.indexOf(item)], 0
        );
        pagesComplexity[currentPageIndex] = pagesContent[currentPageIndex].reduce(
          (sum, item) => sum + itemComplexities[content.content.indexOf(item)], 0
        );
        
        // Avanzamos a la siguiente página
        currentPageIndex++;
        
        // Agregamos los elementos movidos a la nueva página
        elementsToMove.forEach((movedItem: any) => {
          const movedItemIndex = content.content.indexOf(movedItem);
          pagesContent[currentPageIndex].push(movedItem);
          pagesCharCount[currentPageIndex] += itemCharCounts[movedItemIndex];
          pagesComplexity[currentPageIndex] += itemComplexities[movedItemIndex];
        });
      } else {
        // Simplemente avanzamos a la siguiente página
        currentPageIndex++;
        pagesContent[currentPageIndex].push(item);
        pagesCharCount[currentPageIndex] += itemCharCounts[index];
        pagesComplexity[currentPageIndex] += itemComplexities[index];
      }
    } else {
      // Agregamos el elemento a la página actual
      pagesContent[currentPageIndex].push(item);
      pagesCharCount[currentPageIndex] += itemCharCounts[index];
      pagesComplexity[currentPageIndex] += itemComplexities[index];
    }
  });
  
  // Eliminamos páginas vacías si las hay
  const filteredPagesContent = pagesContent.filter(page => page.length > 0);
  
  // Obtenemos el contenido para la página solicitada
  const pageIndex = Math.min(currentPage - 1, filteredPagesContent.length - 1);
  
  // Crear una copia del contenido con solo los elementos de la página actual
  const paginatedContent = {
    ...content,
    content: filteredPagesContent[pageIndex] || []
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Pagination] Content length: ${contentLength}, Total chars: ${totalCharCount}, Total complexity: ${totalComplexity}`);
    console.log(`[Pagination] Char threshold: ${charThreshold}, Ideal page count: ${idealPageCount}, Current page: ${currentPage}`);
    console.log(`[Pagination] Page char counts:`, pagesCharCount.filter((_, i) => filteredPagesContent[i]?.length > 0));
    console.log(`[Pagination] Page complexities:`, pagesComplexity.filter((_, i) => filteredPagesContent[i]?.length > 0));
    console.log(`[Pagination] Items per page:`, filteredPagesContent.map(p => p.length));
  }
  
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
    if (selected && selected.content && selected.content.content && Array.isArray(selected.content.content)) {
      const contentLength = selected.content.content.length;
      
      // Función para contar caracteres en un elemento de contenido
      const countCharsInItem = (item: any): number => {
        let charCount = 0;
        
        // Contar caracteres en el texto del elemento
        if (item.text) {
          charCount += item.text.length;
        }
        
        // Contar caracteres en el contenido anidado
        if (item.content && Array.isArray(item.content)) {
          item.content.forEach((nestedItem: any) => {
            charCount += countCharsInItem(nestedItem);
          });
        }
        
        return charCount;
      };
      
      // Calculamos la complejidad y el tamaño en caracteres de cada elemento
      const itemComplexities: number[] = [];
      const itemCharCounts: number[] = [];
      let totalComplexity = 0;
      let totalCharCount = 0;
      
      // Recorremos los elementos para evaluar su complejidad y contar caracteres
      selected.content.content.forEach((item: any, index: number) => {
        let itemComplexity = 0;
        const charCount = countCharsInItem(item);
        itemCharCounts[index] = charCount;
        totalCharCount += charCount;
        
        // Si el elemento tiene contenido anidado, calculamos su complejidad
        if (item.content && Array.isArray(item.content) && item.content.length > 0) {
          // Damos más peso a elementos con contenido anidado extenso
          itemComplexity += item.content.length * 1.5;
          
          // Analizamos también la complejidad del contenido anidado
          item.content.forEach((nestedItem: any) => {
            if (nestedItem.text && nestedItem.text.length > 50) {
              itemComplexity += Math.floor(nestedItem.text.length / 50);
            }
          });
        } else {
          // Para elementos simples, asignamos un valor base
          itemComplexity += 1;
        }
        
        // Si el elemento tiene texto extenso, aumentamos la complejidad
        if (item.text && item.text.length > 50) {
          itemComplexity += Math.floor(item.text.length / 50);
        }
        
        // Consideramos el tipo de elemento para ajustar la complejidad
        if (item.type === 'heading') {
          // Los encabezados suelen indicar secciones nuevas, les damos más peso
          itemComplexity += 2;
        } else if (item.type === 'image') {
          // Las imágenes ocupan más espacio visual
          itemComplexity += 3;
        }
        
        itemComplexities[index] = itemComplexity;
        totalComplexity += itemComplexity;
      });
      
      // Umbral de paginación basado en caracteres (15,000 caracteres por página)
      const charThreshold = 15000;
      
      // También mantenemos un umbral de complejidad como respaldo
      const complexityThreshold = pageSize * 25; // Aumentamos significativamente el umbral
      
      if (contentLength <= 5 || (totalCharCount < charThreshold && totalComplexity < complexityThreshold)) {
        // Contenido pequeño o simple, no lo paginamos
        setTotalPages(1);
      } else {
        // Calculamos el número ideal de páginas basado en el conteo de caracteres
        const idealPageCount = Math.max(1, Math.ceil(totalCharCount / charThreshold));
        setTotalPages(idealPageCount);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Layout] Content length: ${contentLength}, Total chars: ${totalCharCount}, Total complexity: ${totalComplexity}`);
          console.log(`[Layout] Char threshold: ${charThreshold}, Ideal page count: ${idealPageCount}`);
        }
      }
      
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
            {/* Botón para ir a la página principal */}
            <Link 
              href="/pages-arbol"
              style={{
                //display: "block",
                padding: "10px 14px",
                margin: "0 0 16px 0",
                background: "var(--primary-color-light, #e0f2fe)",
                color: "var(--primary-color, #2563eb)",
                borderRadius: "8px",
                textDecoration: "none",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "0.95rem",
                letterSpacing: "0.3px",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                border: "1px solid var(--primary-color-lighter, #bfdbfe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--primary-color-lighter, #bfdbfe)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--primary-color-light, #e0f2fe)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Inicio Wiki
            </Link>
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