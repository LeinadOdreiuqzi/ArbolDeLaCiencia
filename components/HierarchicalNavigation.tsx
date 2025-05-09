'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { TopicNode } from '@/lib/notes-graph-util';

interface HierarchicalNavigationProps {
  nodes: TopicNode[];
  selectedSlug: string | null;
  theme: 'dark' | 'light';
}

// Función para obtener el nivel de profundidad de un nodo
const getNodeLevel = (node: TopicNode): number => {
  // Si el nodo tiene metadatos con nivel, usamos ese valor
  if (node.metadata?.level) {
    return node.metadata.level;
  }
  
  // Como fallback, extraemos el nivel del nodo basado en la estructura de la URL
  const urlParts = node.url.split('/');
  return urlParts.length - 2; // Ajustar según la estructura real
};

// Función para obtener el tipo de nodo basado en su nivel o metadatos
const getNodeType = (node: TopicNode): string => {
  // Si el nodo tiene metadatos con tipo, usamos ese valor
  if (node.metadata?.type) {
    // Convertir primera letra a mayúscula
    const type = node.metadata.type;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  
  // Como fallback, determinamos el tipo basado en el nivel
  const level = getNodeLevel(node);
  switch (level) {
    case 1: return 'Área';
    case 2: return 'Especialidad';
    case 3: return 'Tema';
    case 4: return 'Contenido';
    default: return `Nivel ${level}`;
  }
};

const HierarchicalNavigation: React.FC<HierarchicalNavigationProps> = ({ nodes, selectedSlug, theme }) => {
  // Estado para nodos expandidos
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // Estado para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TopicNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Estado para favoritos
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Referencia al contenedor para scroll
  const navContainerRef = useRef<HTMLDivElement>(null);
  
  // Expandir automáticamente los nodos padres del nodo seleccionado
  useEffect(() => {
    if (!selectedSlug) return;
    
    const expandPathToNode = (nodeList: TopicNode[], path: string[] = []): string[] | null => {
      for (const node of nodeList) {
        if (node.slug === selectedSlug) {
          return [...path, node.id];
        }
        
        if (node.children && node.children.length > 0) {
          const foundPath = expandPathToNode(node.children, [...path, node.id]);
          if (foundPath) return foundPath;
        }
      }
      
      return null;
    };
    
    const nodePath = expandPathToNode(nodes);
    
    if (nodePath) {
      const newExpandedNodes = { ...expandedNodes };
      nodePath.forEach(id => {
        newExpandedNodes[id] = true;
      });
      setExpandedNodes(newExpandedNodes);
    }
  }, [nodes, selectedSlug]);
  
  // Cargar favoritos desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFavorites = localStorage.getItem('wiki-favorites');
      if (storedFavorites) {
        try {
          setFavorites(JSON.parse(storedFavorites));
        } catch (e) {
          console.error('Error parsing favorites:', e);
        }
      }
    }
  }, []);
  
  // Guardar favoritos en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined' && favorites.length > 0) {
      localStorage.setItem('wiki-favorites', JSON.stringify(favorites));
    }
  }, [favorites]);
  
  // Función para alternar la expansión de un nodo
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  // Función para alternar un nodo como favorito
  const toggleFavorite = (nodeId: string) => {
    setFavorites(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };
  
  // Función para buscar nodos
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // Función recursiva para buscar en el árbol
    const searchInTree = (nodeList: TopicNode[]): TopicNode[] => {
      let results: TopicNode[] = [];
      
      for (const node of nodeList) {
        // Buscar en el título del nodo
        if (node.label.toLowerCase().includes(term.toLowerCase())) {
          results.push(node);
        }
        
        // Buscar en los hijos
        if (node.children && node.children.length > 0) {
          results = [...results, ...searchInTree(node.children)];
        }
      }
      
      return results;
    };
    
    // Limitar a 50 resultados para evitar sobrecarga
    const results = searchInTree(nodes).slice(0, 50);
    setSearchResults(results);
  };
  
  // Renderizar un nodo individual
  const renderNode = (node: TopicNode, depth: number = 0, isLastChild: boolean = false, parentId: string | null = null) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];
    const isFavorite = favorites.includes(node.id);
    const isSelected = node.slug === selectedSlug;
    const nodeLevel = getNodeLevel(node);
    const nodeType = getNodeType(node);
    
    // Determinar si este nodo debe mostrarse basado en la profundidad y el estado de expansión
    // Para nodos de nivel superior (Áreas), siempre mostrarlos
    // Para nodos más profundos, mostrarlos solo si su padre está expandido
    const shouldDisplay = depth === 0 || (depth > 0 && parentId && expandedNodes[parentId]);
    
    if (!shouldDisplay && !isSearching) return null;
    
    return (
      <li 
        key={node.id}
        className={`nav-node ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''} depth-${depth}`}
        style={{
          marginLeft: depth > 0 ? `${depth * 12}px` : '0',
          position: 'relative',
          paddingBottom: isLastChild && depth > 0 ? '8px' : '4px',
          borderLeft: depth > 0 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` : 'none',
          paddingLeft: depth > 0 ? '12px' : '0',
        }}
      >
        <div 
          className="node-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            borderRadius: '6px',
            backgroundColor: isSelected 
              ? theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' 
              : 'transparent',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}
        >
          {/* Indicador de tipo de nodo */}
          <span 
            className="node-type-indicator"
            style={{
              fontSize: '10px',
              padding: '2px 4px',
              borderRadius: '4px',
              marginRight: '6px',
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              display: 'inline-block',
              minWidth: '16px',
              textAlign: 'center',
            }}
          >
            {nodeType.charAt(0)}
          </span>
          
          {/* Botón de expansión para nodos con hijos */}
          {hasChildren && (
            <button
              className="expand-button"
              onClick={() => toggleNodeExpansion(node.id)}
              aria-label={isExpanded ? 'Contraer' : 'Expandir'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                marginRight: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              }}
            >
              <span 
                style={{
                  transition: 'transform 0.2s ease',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                  display: 'inline-block',
                  fontSize: '10px',
                }}
              >
                ▶
              </span>
            </button>
          )}
          
          {/* Enlace al nodo */}
          <Link
            href={node.url}
            className="node-link"
            style={{
              textDecoration: 'none',
              color: isSelected 
                ? theme === 'dark' ? '#60a5fa' : '#2563eb'
                : theme === 'dark' ? '#e5e7eb' : '#374151',
              fontWeight: isSelected ? 600 : 400,
              fontSize: depth === 0 ? '0.95rem' : '0.9rem',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              padding: '2px 0',
            }}
          >
            {node.label}
          </Link>
          
          {/* Contador de hijos */}
          {hasChildren && (
            <span 
              className="children-count"
              style={{
                fontSize: '10px',
                padding: '1px 4px',
                borderRadius: '10px',
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                marginLeft: '4px',
              }}
            >
              {node.children?.length || 0}
            </span>
          )}
          
          {/* Botón de favorito */}
          <button
            className={`favorite-button ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(node.id);
            }}
            aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              marginLeft: '4px',
              opacity: isFavorite ? 1 : 0.3,
              color: isFavorite ? (theme === 'dark' ? '#fbbf24' : '#f59e0b') : 'inherit',
              transition: 'all 0.2s ease',
            }}
          >
            {isFavorite ? '★' : '☆'}
          </button>
        </div>
        
        {/* Renderizar hijos si el nodo está expandido */}
        {hasChildren && isExpanded && (
          <ul 
            className="node-children"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              marginTop: '4px',
            }}
          >
            {node.children?.map((child, index) => 
              renderNode(child, depth + 1, index === (node.children?.length || 0) - 1, node.id)
            )}
          </ul>
        )}
      </li>
    );
  };
  
  // Renderizar la lista de nodos favoritos
  const renderFavorites = () => {
    if (favorites.length === 0) return null;
    
    // Función para encontrar un nodo por su ID
    const findNodeById = (nodeList: TopicNode[], id: string): TopicNode | null => {
      for (const node of nodeList) {
        if (node.id === id) return node;
        
        if (node.children && node.children.length > 0) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // Obtener los nodos favoritos
    const favoriteNodes = favorites
      .map(id => findNodeById(nodes, id))
      .filter((node): node is TopicNode => node !== null);
    
    if (favoriteNodes.length === 0) return null;
    
    return (
      <div className="favorites-section">
        <h3 
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            margin: '16px 0 8px 0',
            padding: '0 8px',
            color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
          }}
        >
          Favoritos
        </h3>
        <ul 
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {favoriteNodes.map(node => (
            <li 
              key={`fav-${node.id}`}
              style={{
                margin: '4px 0',
              }}
            >
              <Link
                href={node.url}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: theme === 'dark' ? '#e5e7eb' : '#374151',
                  backgroundColor: node.slug === selectedSlug 
                    ? theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' 
                    : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <span 
                  style={{
                    color: theme === 'dark' ? '#fbbf24' : '#f59e0b',
                    marginRight: '6px',
                  }}
                >
                  ★
                </span>
                {node.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  // Renderizar los resultados de búsqueda
  const renderSearchResults = () => {
    if (!isSearching || searchResults.length === 0) return null;
    
    return (
      <div className="search-results">
        <h3 
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            margin: '16px 0 8px 0',
            padding: '0 8px',
            color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
          }}
        >
          Resultados ({searchResults.length})
        </h3>
        <ul 
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {searchResults.map(node => (
            <li 
              key={`search-${node.id}`}
              style={{
                margin: '4px 0',
              }}
            >
              <Link
                href={node.url}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: theme === 'dark' ? '#e5e7eb' : '#374151',
                  backgroundColor: node.slug === selectedSlug 
                    ? theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' 
                    : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <span 
                  style={{
                    fontSize: '10px',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    marginRight: '6px',
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  }}
                >
                  {getNodeType(node).charAt(0)}
                </span>
                {node.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  return (
    <div 
      className="hierarchical-navigation"
      ref={navContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Barra de búsqueda */}
      <div 
        className="search-bar"
        style={{
          padding: '0 8px 12px 8px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: theme === 'dark' ? 'var(--nav-bg)' : 'var(--nav-bg)',
        }}
      >
        <div 
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder="Buscar temas..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: '6px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              color: theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
          />
          <span 
            style={{
              position: 'absolute',
              left: '10px',
              color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          {searchTerm && (
            <button
              onClick={() => handleSearch('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Contenido principal */}
      <div 
        className="navigation-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px',
        }}
      >
        {/* Mostrar resultados de búsqueda si está buscando */}
        {renderSearchResults()}
        
        {/* Mostrar favoritos si no está buscando */}
        {!isSearching && renderFavorites()}
        
        {/* Árbol principal si no está buscando */}
        {!isSearching && (
          <div className="main-tree">
            {favorites.length > 0 && (
              <h3 
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  margin: '16px 0 8px 0',
                  padding: '0 8px',
                  color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                }}
              >
                Todos los temas
              </h3>
            )}
            <ul 
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              {nodes.map((node, index) => renderNode(node, 0, index === nodes.length - 1, null))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchicalNavigation;