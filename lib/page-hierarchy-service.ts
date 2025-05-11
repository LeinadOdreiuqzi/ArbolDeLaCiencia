// lib/page-hierarchy-service.ts
import { TopicNode } from './notes-graph-util';

// Interfaz para los datos de la página tal como vienen de la base de datos
export interface PageData {
  id: number;
  title: string;
  slug: string;
  parent_id: number | null;
  level: number;
  content?: any;
  created_at?: string;
  // No hay updated_at en la base de datos
}

// Extendemos la interfaz de metadatos para los nodos
export interface NodeMetadata {
  level: number;
  type: string;
  createdAt?: string;
  isRecent?: boolean;
}

/**
 * Convierte los datos planos de la tabla pages en una estructura jerárquica
 * para ser utilizada por el componente HierarchicalNavigation
 */
export function buildHierarchyFromPages(pages: PageData[]): TopicNode[] {
  console.log("[Service] Iniciando construcción de jerarquía con", pages.length, "páginas");
  
  // Verificación inicial de datos
  if (!pages || pages.length === 0) {
    console.warn("[Service] No hay páginas para construir la jerarquía");
    return [];
  }

  // Eliminar duplicados por ID si existieran
  const uniquePages = Array.from(
    new Map(pages.map(page => [page.id, page])).values()
  );
  
  if (uniquePages.length !== pages.length) {
    console.warn(`[Service] Se eliminaron ${pages.length - uniquePages.length} páginas duplicadas`);
  }
  
  // Mapa para acceder rápidamente a los nodos por ID
  const nodeMap = new Map<number, TopicNode>();
  const rootNodes: TopicNode[] = [];
  
  // PASO 1: Primero creamos todos los nodos sin establecer relaciones
  uniquePages.forEach(page => {
    // Determinar el tipo de nodo basado en su nivel
    let nodeType = '';
    switch (page.level) {
      case 1: nodeType = 'area'; break;
      case 2: nodeType = 'especialidad'; break;
      case 3: nodeType = 'tema'; break;
      case 4: nodeType = 'contenido'; break;
      default: nodeType = `nivel-${page.level}`;
    }
    
    const node: TopicNode = {
      id: String(page.id),
      label: page.title,
      slug: page.slug,
      url: `/pages-arbol/${page.slug}`,
      children: [],
      content: page.content,
      // Añadir metadatos adicionales para facilitar la visualización
      metadata: {
        level: page.level,
        type: nodeType,
        createdAt: page.created_at,
        // Como no hay updated_at, usamos created_at para determinar si es reciente
        isRecent: page.created_at ? isRecent(page.created_at) : false
      } as NodeMetadata
    };
    
    nodeMap.set(page.id, node);
  });
  
  console.log(`[Service] Creados ${nodeMap.size} nodos únicos en el mapa`);
  
  // PASO 2: Establecer las relaciones jerárquicas usando el nodeMap completo
  uniquePages.forEach(page => {
    const node = nodeMap.get(page.id);
    if (!node) {
      console.warn(`[Service] No se encontró nodo para la página con id ${page.id}`);
      return;
    }
    
    if (page.parent_id === null) {
      // Es un nodo raíz
      rootNodes.push(node);
      console.log(`[Service] Agregado nodo raíz: ${node.label} (ID: ${node.id})`);
    } else {
      // Es un nodo hijo
      const parentNode = nodeMap.get(page.parent_id);
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(node);
        console.log(`[Service] Agregado ${node.label} (ID: ${node.id}) como hijo de ${parentNode.label} (ID: ${parentNode.id})`);
      } else {
        // Si el padre no existe, lo agregamos como nodo raíz
        console.warn(`[Service] No se encontró padre con ID ${page.parent_id} para el nodo ${node.label} (ID: ${node.id}). Agregando como raíz.`);
        rootNodes.push(node);
      }
    }
  });
  
  console.log(`[Service] Estructura jerárquica inicial con ${rootNodes.length} nodos raíz`);
  
  // PASO 3: Ordenar todos los nodos
  // Ordenar los nodos raíz por nivel y luego por título
  rootNodes.sort((a, b) => {
    const aMetadata = a.metadata as NodeMetadata;
    const bMetadata = b.metadata as NodeMetadata;
    if (aMetadata?.level === bMetadata?.level) {
      return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
    }
    return (aMetadata?.level || 0) - (bMetadata?.level || 0);
  });
  
  // Ordenar recursivamente los hijos de cada nodo
  const sortChildren = (node: TopicNode) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => {
        const aMetadata = a.metadata as NodeMetadata;
        const bMetadata = b.metadata as NodeMetadata;
        if (aMetadata?.level === bMetadata?.level) {
          return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
        }
        return (aMetadata?.level || 0) - (bMetadata?.level || 0);
      });
      
      node.children.forEach(sortChildren);
    }
  };
  
  rootNodes.forEach(sortChildren);
  
  // PASO 4: Verificar la estructura final
  let totalNodes = 0;
  const countNodes = (nodes: TopicNode[]) => {
    totalNodes += nodes.length;
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        countNodes(node.children);
      }
    });
  };
  
  countNodes(rootNodes);
  console.log(`[Service] Estructura jerárquica final: ${rootNodes.length} nodos raíz, ${totalNodes} nodos totales`);
  
  if (totalNodes !== nodeMap.size) {
    console.warn(`[Service] Advertencia: Hay una discrepancia entre el número total de nodos (${totalNodes}) y el número de nodos en el mapa (${nodeMap.size})`);
  }
  
  return rootNodes;
}

/**
 * Determina si una fecha de creación es reciente (dentro de los últimos 7 días)
 */
function isRecent(dateString: string): boolean {
  const creationDate = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - creationDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Usamos un período más largo (7 días) ya que solo tenemos created_at
  return diffDays <= 7;
}

/**
 * Obtiene la jerarquía de páginas desde la API con soporte para revalidación
 */
export async function fetchPageHierarchy(): Promise<TopicNode[]> {
  try {
    console.log("[Client] Solicitando jerarquía de páginas desde la API");
    
    // Añadimos timestamp para evitar caché del navegador
    const timestamp = Date.now();
    const response = await fetch(`/api/page-hierarchy?_t=${timestamp}`, {
      // Utilizamos no-store para asegurar que siempre obtenemos la versión más reciente
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = `Error al cargar la jerarquía de páginas: ${errorData.error || response.statusText}`;
      console.error("[Client]", errorMsg);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn('[Client] La respuesta de la API no es un array:', data);
      return [];
    }
    
    console.log(`[Client] Jerarquía recibida con ${data.length} nodos raíz`);
    
    return data;
  } catch (error) {
    console.error('[Client] Error al obtener la jerarquía de páginas:', error);
    return [];
  }
}

/**
 * Función para forzar la revalidación de la caché de jerarquía
 * Útil después de agregar/editar/eliminar páginas
 */
export async function revalidatePageHierarchy(): Promise<boolean> {
  try {
    console.log("[Client] Solicitando revalidación de jerarquía");
    
    const response = await fetch('/api/page-hierarchy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ revalidate: true })
    });
    
    const data = await response.json();
    
    if (data.revalidated) {
      console.log("[Client] Revalidación exitosa");
    } else {
      console.warn("[Client] Revalidación fallida");
    }
    
    return data.revalidated === true;
  } catch (error) {
    console.error('[Client] Error al revalidar la jerarquía:', error);
    return false;
  }
}