"use client";
import React, { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { TopicNode } from "../lib/notes-graph-util";

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// --- Utility: Get current page id from pathname ---
function getCurrentPageId(pathname: string | null) {
  if (pathname === null) return "science-tree";
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts[0] === "notes" && pathParts[1]) return pathParts[1];
  return "science-tree";
}

// --- Types ---
type GraphNode = {
  id: string;
  label: string;
  level: number;
  url?: string;
  color?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  children?: GraphNode[];
};

type GraphLink = {
  source: string;
  target: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

// --- Flatten tree to graph ---
function flattenTreeToGraph(tree: TopicNode[], parentId: string | null = null, level: number = 0, nodes: GraphNode[] = [], links: GraphLink[] = []): GraphData {
  for (const node of tree) {
    nodes.push({ id: node.id, label: node.label, url: node.url, level });
    if (parentId) links.push({ source: parentId, target: node.id });
    if (node.children) flattenTreeToGraph(node.children, node.id, level + 1, nodes, links);
  }
  return { nodes, links };
}

function getNodeLabel(node: { [key: string]: any }): string {
  return typeof node.label === "string" ? node.label : "";
}
function getNodeLevel(node: { [key: string]: any }): number {
  return typeof node.level === "number" ? node.level : 0;
}
function getNodeRadius(node: { [key: string]: any }) {
  const level = getNodeLevel(node);
  if (level === 0) return 16;
  if (level === 1) return 10;
  if (level === 2) return 7;
  return 6;
}

// Helper to get neutral node color based on theme
function getNeutralNodeColor(theme: 'light' | 'dark', highlight: boolean) {
  if (highlight) return theme === 'dark' ? '#fbbf24' : '#2563eb'; // highlight: yellow or blue
  return theme === 'dark' ? '#bbb' : '#888'; // neutral node color
}
// Helper to get connection color based on theme and highlight
function getLinkColor(theme: 'light' | 'dark', highlight: boolean) {
  if (highlight) return theme === 'dark' ? '#fbbf24' : '#2563eb'; // highlight: yellow or blue
  return theme === 'dark' ? '#555' : '#bbb'; // dimmed
}

const minimizedWidth = 320;
const minimizedHeight = 260;
const expandedWidth = 900;
const expandedHeight = 600;

// THEME CONTEXT HOOK
function useThemeFromDocument(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    typeof window !== 'undefined'
      ? (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light'
      : 'light'
  );
  useEffect(() => {
    const updateTheme = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setTheme(t === 'dark' ? 'dark' : 'light');
    };
    updateTheme();
    window.addEventListener('storage', updateTheme);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      window.removeEventListener('storage', updateTheme);
      observer.disconnect();
    };
  }, []);
  return theme;
}

// Enhanced highlighting: highlight all related topics and subtopics recursively
function getHighlightState(nodeId: string | null, graphData: GraphData) {
  if (!nodeId) return { neighborNodes: new Set(), neighborLinks: new Set() };

  // 1. Science Tree node highlights everything
  if (nodeId === "science-tree") {
    return {
      neighborNodes: new Set(graphData.nodes.map(n => n.id)),
      neighborLinks: new Set(graphData.links.map((_, i) => i)),
    };
  }

  // 2. Recursively collect all descendants and ancestors of the node
  const neighborNodes = new Set<string>([nodeId]);
  const neighborLinks = new Set<number>();

  // Build adjacency lists for traversal
  const childMap: Record<string, string[]> = {};
  const parentMap: Record<string, string[]> = {};
  graphData.links.forEach((l, idx) => {
    if (!childMap[l.source]) childMap[l.source] = [];
    childMap[l.source].push(l.target);
    if (!parentMap[l.target]) parentMap[l.target] = [];
    parentMap[l.target].push(l.source);
  });

  // Traverse descendants
  function collectDescendants(id: string) {
    if (!childMap[id]) return;
    for (const child of childMap[id]) {
      if (!neighborNodes.has(child)) {
        neighborNodes.add(child);
        collectDescendants(child);
      }
    }
  }
  collectDescendants(nodeId);

  // Traverse ancestors (for main topic relationships)
  function collectAncestors(id: string) {
    if (!parentMap[id]) return;
    for (const parent of parentMap[id]) {
      if (!neighborNodes.has(parent)) {
        neighborNodes.add(parent);
        collectAncestors(parent);
      }
    }
  }
  collectAncestors(nodeId);

  // Collect all links between highlighted nodes
  graphData.links.forEach((l, idx) => {
    if (neighborNodes.has(l.source as string) && neighborNodes.has(l.target as string)) {
      neighborLinks.add(idx);
    }
  });

  return { neighborNodes, neighborLinks };
}

const LargeKnowledgeGraph: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const fgRef = useRef<any>(null); // Use correct ForceGraph2D ref type if available
  const theme = useThemeFromDocument();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchGraph() {
      const res = await fetch("/api/notes-graph");
      const tree = await res.json();
      const currentPageId = getCurrentPageId(pathname);
      let subTree = tree;
      function findNodeById(nodes: any[], id: string): any | null {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNodeById(node.children, id);
            if (found) return found;
          }
        }
        return null;
      }
      if (currentPageId !== "science-tree") {
        const topicNode = findNodeById(tree, currentPageId);
        if (topicNode) subTree = [topicNode];
      }
      setGraphData(flattenTreeToGraph(subTree, null, 0));
    }
    fetchGraph();
  }, [pathname]);

  useEffect(() => {
    // Center the graph on the root/main node when on a main topic page or subtopic page
    if (fgRef.current && graphData.nodes.length > 0 && !showModal) {
      // Find the root node for this subgraph (should be first node in graphData.nodes)
      const rootNodeId = graphData.nodes[0]?.id;
      // Use the ref's 'centerAt' and 'zoom' only, don't try to access graphData via the ref
      // Wait for layout to finish
      setTimeout(() => {
        if (fgRef.current) {
          // Try to find the root node's coordinates
          const nodes = fgRef.current._fg ? fgRef.current._fg.graphData().nodes : [];
          const rootNode = nodes.find((n: GraphNode) => n.id === rootNodeId);
          if (rootNode && typeof rootNode.x === 'number' && typeof rootNode.y === 'number') {
            fgRef.current.centerAt(rootNode.x, rootNode.y, 400);
            fgRef.current.zoom(1.0, 400);
          } else {
            // fallback: fit to graph
            fgRef.current.zoomToFit(350, 40, (n: GraphNode) => true);
            setTimeout(() => {
              if (fgRef.current) {
                const currZoom = fgRef.current.zoom();
                if (currZoom > 1.0) fgRef.current.zoom(1.0, 400);
              }
            }, 400);
          }
        }
      }, 400);
    }
  }, [graphData, showModal]);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 1) {
      // Fit to graph with padding, but don't zoom in too close
      fgRef.current.zoomToFit(400, 40, (n: GraphNode) => true);
      setTimeout(() => {
        if (fgRef.current) {
          // If zoom is too close, set a reasonable zoom level
          const currZoom = fgRef.current.zoom();
          if (currZoom > 1.2) fgRef.current.zoom(1.2, 400);
        }
      }, 500);
    }
  }, [showModal, graphData]);

  // Use enhanced highlight logic
  const { neighborNodes, neighborLinks } = getHighlightState(hoveredNode, graphData);

  const bgColor = theme === 'dark' ? '#18181b' : '#f0f0f0';
  const buttonStyle = {
    margin: 12,
    padding: "4px 12px",
    borderRadius: 6,
    border: "none",
    background: theme === 'dark' ? '#23232b' : '#eee',
    color: theme === 'dark' ? '#eee' : '#222',
    cursor: "pointer",
    fontWeight: 500,
    transition: 'background 0.2s, color 0.2s',
  };

  return (
    <div style={{ width: "100%", maxWidth: minimizedWidth, margin: "0 auto" }}>
      <ForceGraph2D
        key={theme}
        ref={fgRef}
        graphData={graphData}
        width={minimizedWidth}
        height={minimizedHeight}
        nodeLabel={getNodeLabel}
        nodeAutoColorBy={undefined}
        backgroundColor={bgColor}
        enablePanInteraction={true}
        enableZoomInteraction={true}
        nodeCanvasObject={(node: { [key: string]: any }, ctx, globalScale) => {
          const label = getNodeLabel(node);
          const x = typeof node.x === "number" ? node.x : 0;
          const y = typeof node.y === "number" ? node.y : 0;
          ctx.save();
          ctx.beginPath();
          let r = getNodeRadius(node);
          ctx.arc(x, y, r, 0, 2 * Math.PI, false);
          ctx.globalAlpha = 0.01; // invisible but catches pointer events
          ctx.fillStyle = '#000';
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI, false);
          let highlight = neighborNodes.has(node.id);
          ctx.fillStyle = highlight ? (theme === 'dark' ? '#fbbf24' : '#2563eb') : (theme === 'dark' ? '#bbb' : '#888');
          ctx.globalAlpha = hoveredNode ? (highlight ? 1 : 0.35) : 1;
          ctx.shadowColor = highlight ? (theme === 'dark' ? '#fbbf24' : '#2563eb') : "rgba(0,0,0,0.18)";
          ctx.shadowBlur = highlight ? 12 : 6;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;

          // Draw label, but keep it inside the node if possible, or truncate if too long
          ctx.font = `bold ${Math.max(r + 1, 10)}px Arial`;
          ctx.fillStyle = theme === 'dark' ? '#eee' : '#222';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let displayLabel = label;
          const maxLabelLength = Math.floor(r * 1.6); // proportional to node size
          if (label.length > maxLabelLength) {
            displayLabel = label.slice(0, maxLabelLength - 2) + '…';
          }
          ctx.fillText(displayLabel, x, y);

          // Optionally, show full label on hover as tooltip
          if (highlight && label.length > maxLabelLength) {
            ctx.font = '12px Arial';
            ctx.fillStyle = theme === 'dark' ? '#fbbf24' : '#2563eb';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(label, x + r + 7, y + 3);
          }

          ctx.restore();
        }}
        linkColor={(linkObj) => {
          const idx = graphData.links.findIndex(l => l === linkObj);
          return neighborLinks.has(idx) ? (theme === 'dark' ? '#fbbf24' : '#2563eb') : (theme === 'dark' ? '#555' : '#bbb');
        }}
        linkWidth={(linkObj) => {
          const idx = graphData.links.findIndex(l => l === linkObj);
          return neighborLinks.has(idx) ? 2.5 : 1.2;
        }}
        linkDirectionalParticles={0}
        linkDirectionalArrowLength={0}
        linkCanvasObjectMode={() => undefined}
        onNodeHover={(node: any | null, prevNode: any | null) => setHoveredNode(node && node.id ? String(node.id) : null)}
        onNodeClick={(node: any, event) => {
          if (node && node.url) router.push(node.url);
        }}
      />
      <button
        type="button"
        aria-label="Expand graph"
        style={buttonStyle}
        onClick={() => setShowModal(true)}
      >
        Expand
      </button>
      {showModal && (
        <div
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: theme === 'dark' ? '#18181bcc' : '#0007', zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{ background: theme === 'dark' ? '#23232b' : '#fff', borderRadius: 12, boxShadow: "0 2px 16px #0003", padding: 24, position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close graph"
              style={{ ...buttonStyle, position: "absolute", top: 12, right: 12 }}
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
            <ForceGraph2D
              key={theme}
              graphData={graphData}
              width={expandedWidth}
              height={expandedHeight}
              nodeLabel={getNodeLabel}
              nodeAutoColorBy={undefined}
              backgroundColor={bgColor}
              enablePanInteraction={true}
              enableZoomInteraction={true}
              nodeCanvasObject={(node: { [key: string]: any }, ctx, globalScale) => {
                const label = getNodeLabel(node);
                const x = typeof node.x === "number" ? node.x : 0;
                const y = typeof node.y === "number" ? node.y : 0;
                ctx.save();
                ctx.beginPath();
                let r = getNodeRadius(node);
                ctx.arc(x, y, r, 0, 2 * Math.PI, false);
                ctx.globalAlpha = 0.01; // invisible but catches pointer events
                ctx.fillStyle = '#000';
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, r, 0, 2 * Math.PI, false);
                let highlight = neighborNodes.has(node.id);
                ctx.fillStyle = highlight ? (theme === 'dark' ? '#fbbf24' : '#2563eb') : (theme === 'dark' ? '#bbb' : '#888');
                ctx.globalAlpha = hoveredNode ? (highlight ? 1 : 0.35) : 1;
                ctx.shadowColor = highlight ? (theme === 'dark' ? '#fbbf24' : '#2563eb') : "rgba(0,0,0,0.18)";
                ctx.shadowBlur = highlight ? 12 : 6;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;

                // Draw label, but keep it inside the node if possible, or truncate if too long
                ctx.font = `bold ${Math.max(r + 1, 10)}px Arial`;
                ctx.fillStyle = theme === 'dark' ? '#eee' : '#222';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                let displayLabel = label;
                const maxLabelLength = Math.floor(r * 1.6); // proportional to node size
                if (label.length > maxLabelLength) {
                  displayLabel = label.slice(0, maxLabelLength - 2) + '…';
                }
                ctx.fillText(displayLabel, x, y);

                // Optionally, show full label on hover as tooltip
                if (highlight && label.length > maxLabelLength) {
                  ctx.font = '12px Arial';
                  ctx.fillStyle = theme === 'dark' ? '#fbbf24' : '#2563eb';
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'top';
                  ctx.fillText(label, x + r + 7, y + 3);
                }

                ctx.restore();
              }}
              linkColor={(linkObj) => {
                const idx = graphData.links.findIndex(l => l === linkObj);
                return neighborLinks.has(idx) ? (theme === 'dark' ? '#fbbf24' : '#2563eb') : (theme === 'dark' ? '#555' : '#bbb');
              }}
              linkWidth={(linkObj) => {
                const idx = graphData.links.findIndex(l => l === linkObj);
                return neighborLinks.has(idx) ? 2.5 : 1.2;
              }}
              linkDirectionalParticles={0}
              linkDirectionalArrowLength={0}
              linkCanvasObjectMode={() => undefined}
              onNodeHover={(node: any | null, prevNode: any | null) => setHoveredNode(node && node.id ? String(node.id) : null)}
              onNodeClick={(node: any, event) => {
                if (node && node.url) router.push(node.url);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LargeKnowledgeGraph;
