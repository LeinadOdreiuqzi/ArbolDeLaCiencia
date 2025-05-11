'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import HierarchicalNavigation from './HierarchicalNavigation';
import { TopicNode } from '@/lib/notes-graph-util';

// Importamos la función fetchPageHierarchy desde el servicio
import { fetchPageHierarchy, revalidatePageHierarchy } from '@/lib/page-hierarchy-service';

interface PageHierarchyNavigationProps {
  selectedSlug?: string | null;
}

/**
 * Componente que carga la jerarquía de páginas desde la API
 * y las muestra utilizando el componente HierarchicalNavigation
 */
const PageHierarchyNavigation: React.FC<PageHierarchyNavigationProps> = ({ selectedSlug = null }) => {
  const [nodes, setNodes] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme as 'dark' | 'light') || 'light';
  
  // Función para cargar la jerarquía de páginas
  const loadHierarchy = useCallback(async (forceRevalidate = false) => {
    try {
      setLoading(true);
      
      // Si se solicita una revalidación forzada, llamamos primero al endpoint de revalidación
      if (forceRevalidate) {
        await revalidatePageHierarchy();
      }
      
      const hierarchyData = await fetchPageHierarchy();
      
      // Verificar que los datos sean válidos antes de guardarlos
      if (!hierarchyData || !Array.isArray(hierarchyData)) {
        console.error("[NavComponent] Los datos recibidos no son válidos:", hierarchyData);
        setError("Los datos recibidos no tienen el formato esperado");
        setLoading(false);
        return;
      }
      
      // Verificar la estructura jerárquica
      console.log("[NavComponent] Datos jerárquicos recibidos:", {
        nodos_raiz: hierarchyData.length,
        primer_nodo: hierarchyData.length > 0 ? {
          id: hierarchyData[0].id,
          label: hierarchyData[0].label,
          hijos: hierarchyData[0].children?.length || 0
        } : null
      });
      
      setNodes(hierarchyData);
      setError(null);
    } catch (err) {
      console.error('[NavComponent] Error al cargar la jerarquía:', err);
      setError('No se pudo cargar la estructura de páginas');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Cargar la jerarquía de páginas al montar el componente
  useEffect(() => {
    // Forzamos revalidación al inicio para garantizar datos actualizados
    loadHierarchy(true);
    
    // Configurar un intervalo para actualizar la jerarquía
    const intervalId = setInterval(() => {
      loadHierarchy(true);
    }, 2 * 60 * 1000); // Cada 2 minutos
    
    return () => {
      clearInterval(intervalId);
    };
  }, [loadHierarchy]);
  
  // Función para reintentar la carga manualmente
  const handleRetry = () => {
    loadHierarchy(true);
  };
  
  // Verificar si hay jerarquía real (nodos con hijos)
  const hasRealHierarchy = React.useMemo(() => {
    let hasChildren = false;
    
    const checkForChildren = (nodeList: TopicNode[]) => {
      for (const node of nodeList) {
        if (node.children && node.children.length > 0) {
          hasChildren = true;
          return;
        }
      }
    };
    
    checkForChildren(nodes);
    
    if (!hasChildren && nodes.length > 0) {
      console.warn("[NavComponent] La jerarquía no tiene estructura de árbol (ningún nodo tiene hijos)");
    }
    
    return hasChildren || nodes.length > 0;
  }, [nodes]);
  
  if (loading && nodes.length === 0) {
    return (
      <div className="loading-container" style={{ padding: '20px', textAlign: 'center' }}>
        <div className="loading-spinner" style={{ 
          width: '40px', 
          height: '40px', 
          margin: '0 auto',
          border: '4px solid rgba(0, 0, 0, 0.1)',
          borderLeftColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Cargando estructura de páginas...
        </p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container" style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: 'var(--text-error)',
        backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
        borderRadius: '8px',
        margin: '10px'
      }}>
        <p style={{ fontSize: '0.9rem' }}>
          <span style={{ marginRight: '8px' }}>⚠️</span>
          {error}
        </p>
        <button 
          onClick={handleRetry}
          style={{
            marginTop: '10px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            color: theme === 'dark' ? '#60a5fa' : '#2563eb',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }
  
  if (!hasRealHierarchy) {
    return (
      <div className="empty-hierarchy" style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem'
      }}>
        <p>No hay páginas para mostrar.</p>
        <button 
          onClick={handleRetry}
          style={{
            marginTop: '10px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            color: theme === 'dark' ? '#60a5fa' : '#2563eb',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Actualizar
        </button>
      </div>
    );
  }
  
  // Mostrar mensaje de carga superpuesto durante actualizaciones
  const loadingOverlay = loading && nodes.length > 0 ? (
    <div style={{
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      padding: '5px',
      backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(226, 232, 240, 0.7)',
      textAlign: 'center',
      fontSize: '0.7rem',
      color: theme === 'dark' ? '#94a3b8' : '#475569',
      borderRadius: '0 0 5px 5px',
      zIndex: 5
    }}>
      Actualizando...
    </div>
  ) : null;
  
  console.log(`[NavComponent] Renderizando navegación con ${nodes.length} nodos raíz`);
  
  return (
    <div style={{ position: 'relative' }}>
      {loadingOverlay}
      <HierarchicalNavigation 
        nodes={nodes} 
        selectedSlug={selectedSlug} 
        theme={theme} 
      />
    </div>
  );
};

export default PageHierarchyNavigation;