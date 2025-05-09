'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import HierarchicalNavigation from './HierarchicalNavigation';
import { TopicNode } from '@/lib/notes-graph-util';

// Importamos la función fetchPageHierarchy desde el servicio
import { fetchPageHierarchy } from '@/lib/page-hierarchy-service';



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
  
  // Cargar la jerarquía de páginas al montar el componente
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        setLoading(true);
        const hierarchyData = await fetchPageHierarchy();
        setNodes(hierarchyData);
        setError(null);
      } catch (err) {
        console.error('Error al cargar la jerarquía:', err);
        setError('No se pudo cargar la estructura de páginas');
      } finally {
        setLoading(false);
      }
    };
    
    loadHierarchy();
  }, []);
  
  if (loading) {
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
          onClick={() => window.location.reload()}
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
  
  return (
    <HierarchicalNavigation 
      nodes={nodes} 
      selectedSlug={selectedSlug} 
      theme={theme} 
    />
  );
};

export default PageHierarchyNavigation;