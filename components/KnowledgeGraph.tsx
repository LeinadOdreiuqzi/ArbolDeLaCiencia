"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ExpandedKnowledgeGraph from "./ExpandedKnowledgeGraph";
import Link from "next/link";

const NODE_SIZES: Record<string, number> = {
  "science-tree": 16,
  chemistry: 12,
  biology: 12,
  physics: 12,
};
const WIDTH = 320;
const HEIGHT = 280;
const PHYSICS_ITER = 2;

function getTheme() {
  if (typeof window === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") || "light");
}

const KnowledgeGraph: React.FC = () => {
  // Fallback: static node/page list for client-side rendering
  const notePages = ["science-tree", "chemistry", "biology", "physics"];
  const titles: Record<string, string> = {
    "science-tree": "Science Tree",
    chemistry: "Chemistry",
    biology: "Biology",
    physics: "Physics",
  };
  const relateds: Record<string, string[]> = {
    "science-tree": ["chemistry", "biology", "physics"],
    chemistry: ["biology", "physics"],
    biology: ["chemistry", "physics"],
    physics: ["chemistry", "biology"],
  };
  const edgesFromRelated = (pages: string[], relateds: Record<string, string[]>) => {
    const edges: { from: string; to: string }[] = [];
    for (const [from, rels] of Object.entries(relateds)) {
      for (const to of rels) {
        if (pages.includes(to)) {
          edges.push({ from, to });
        }
      }
    }
    return edges;
  };
  const initialNodes = notePages.map(id => ({ id, label: titles[id] || id, color: id === "science-tree" ? "#2463eb" : id === "chemistry" ? "#f59e42" : id === "biology" ? "#22c55e" : id === "physics" ? "#f43f5e" : "#666" }));
  const edges = edgesFromRelated(notePages, relateds);

  const [hovered, setHovered] = useState<string | null>(null);
  const [theme, setTheme] = useState("light");
  const [dragged, setDragged] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [mouseMoved, setMouseMoved] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; vx: number; vy: number }>>(() => {
    const cx = WIDTH / 2, cy = HEIGHT / 2, r = 90; // Increased radius for more spacing
    const obj: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
    initialNodes.forEach((n, i) => {
      if (n.id === "science-tree") {
        obj[n.id] = { x: cx, y: cy, vx: 0, vy: 0 };
      } else {
        const idx = i - 1;
        const angleStep = (2 * Math.PI) / (initialNodes.length - 1);
        obj[n.id] = {
          x: cx + r * Math.cos(idx * angleStep),
          y: cy + r * Math.sin(idx * angleStep),
          vx: 0,
          vy: 0,
        };
      }
    });
    return obj;
  });
  const router = useRouter();

  // Hydration fix: Only render SVG and related topics after client-side mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const update = () => setTheme(getTheme() as "dark" | "light");
    update();
    window.addEventListener("storage", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true });
    return () => {
      window.removeEventListener("storage", update);
      observer.disconnect();
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    let animation: number;
    function step() {
      setPositions(prev => {
        let next = { ...prev };
        for (let i = 0; i < initialNodes.length; ++i) {
          for (let j = i + 1; j < initialNodes.length; ++j) {
            const a = initialNodes[i], b = initialNodes[j];
            const dx = next[a.id].x - next[b.id].x;
            const dy = next[a.id].y - next[b.id].y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const minDist = (NODE_SIZES[a.id] || 10) + (NODE_SIZES[b.id] || 10) + 18; // Increased minDist for more spacing
            if (dist < minDist) {
              const force = 0.12 * (minDist - dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              next[a.id].vx += fx;
              next[a.id].vy += fy;
              next[b.id].vx -= fx;
              next[b.id].vy -= fy;
            }
          }
        }
        for (const edge of edges) {
          const a = next[edge.from], b = next[edge.to];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const desired = 64; // Increased desired edge length
          if (dist > 0.1) {
            const force = 0.03 * (dist - desired);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
          }
        }
        for (const n of initialNodes) {
          if (dragged === n.id) continue;
          next[n.id].vx *= 0.7;
          next[n.id].vy *= 0.7;
          next[n.id].x += next[n.id].vx;
          next[n.id].y += next[n.id].vy;
          next[n.id].x = Math.max(NODE_SIZES[n.id] || 10, Math.min(WIDTH - (NODE_SIZES[n.id] || 10), next[n.id].x));
          next[n.id].y = Math.max(NODE_SIZES[n.id] || 10, Math.min(HEIGHT - (NODE_SIZES[n.id] || 10), next[n.id].y));
        }
        return next;
      });
      animation = requestAnimationFrame(step);
    }
    for (let i = 0; i < PHYSICS_ITER; ++i) step();
    return () => cancelAnimationFrame(animation);
  }, [dragged, initialNodes.length, mounted]);

  function handlePointerDown(e: React.PointerEvent, id: string) {
    setDragged(id);
    setMouseMoved(false);
    setOffset({
      x: positions[id].x - e.nativeEvent.offsetX,
      y: positions[id].y - e.nativeEvent.offsetY,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragged) return;
    setMouseMoved(true);
    setPositions(prev => ({
      ...prev,
      [dragged]: {
        ...prev[dragged],
        x: e.nativeEvent.offsetX + offset.x,
        y: e.nativeEvent.offsetY + offset.y,
        vx: 0,
        vy: 0,
      },
    }));
  }
  function handlePointerUp(e?: React.PointerEvent) {
    setDragged(null);
    setTimeout(() => setMouseMoved(false), 0);
  }

  const related = hovered
    ? [
        hovered,
        ...edges
          .filter(e => e.from === hovered || e.to === hovered)
          .map(e => (e.from === hovered ? e.to : e.from)),
      ]
    : [];

  const bg = theme === "dark" ? "#232329" : "#f0f0f0";
  const edgeColor = theme === "dark" ? "#444" : "#bbb";
  const highlightEdge = theme === "dark" ? "#60a5fa" : "#2463eb";
  const textColor = theme === "dark" ? "#eee" : "#222";

  function handleNodeClick(id: string) {
    if (!dragged && !mouseMoved) {
      setSelected(id);
      router.push(`/notes/${id}`);
    }
  }

  // Related topics for the currently selected or hovered node
  const currentNode = hovered || selected || "science-tree";
  const relatedTopics = relateds[currentNode]?.filter(t => t !== currentNode) || [];

  // Render related topics as a sidebar fragment (not in the center, not under the graph)
  const RelatedTopicsSidebar = (
    <>
      {relatedTopics.length > 0 && (
        <>
          <span style={{ fontWeight: 500 }}>Related topics:</span>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {relatedTopics.map(topic => (
              <li key={topic} style={{ marginBottom: 6 }}>
                <Link href={`/notes/${topic}`}>{titles[topic] || topic}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ width: "100%", height: HEIGHT, background: bg, borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", minWidth: WIDTH, position: "relative" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Expand button */}
          <button
            type="button"
            aria-label="Expand graph"
            onClick={() => setExpanded(true)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 2,
              width: 26,
              height: 26,
              border: "none",
              borderRadius: 6,
              background: theme === "dark" ? "#232329" : "#f0f0f0",
              boxShadow: "0 1px 4px 0 #0002",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            tabIndex={0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke={theme === "dark" ? "#eee" : "#222"} strokeWidth="1.5" />
              <path d="M5 5h6v6H5z" stroke={theme === "dark" ? "#eee" : "#222"} strokeWidth="1.2" fill="none" />
            </svg>
          </button>
          {mounted && (
            <svg width={WIDTH} height={HEIGHT} style={{ display: "block", touchAction: "none" }}>
              {/* Edges */}
              {edges.map((edge, i) => {
                const from = positions[edge.from];
                const to = positions[edge.to];
                const isRelated = hovered && (related.includes(edge.from) && related.includes(edge.to));
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isRelated ? highlightEdge : edgeColor}
                    strokeWidth={isRelated ? 2.2 : 1}
                    opacity={hovered && !isRelated ? 0.18 : 1}
                  />
                );
              })}
              {/* Nodes */}
              {initialNodes.map(node => {
                const pos = positions[node.id];
                const isActive = hovered === node.id || selected === node.id;
                const isRelated = related.includes(node.id);
                const r = NODE_SIZES[node.id] || 10;
                return (
                  <g
                    key={node.id}
                    tabIndex={0}
                    style={{ cursor: dragged === node.id ? "grabbing" : "pointer" }}
                    onClick={() => handleNodeClick(node.id)}
                    onPointerDown={e => handlePointerDown(e, node.id)}
                    onMouseOver={() => setHovered(node.id)}
                    onFocus={() => setHovered(node.id)}
                    onMouseOut={() => setHovered(null)}
                    onBlur={() => setHovered(null)}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={r}
                      fill={isActive ? node.color : isRelated ? node.color + "88" : theme === "dark" ? "#18181b" : "#fff"}
                      stroke={isActive || isRelated ? node.color : edgeColor}
                      strokeWidth={isActive ? 3 : 1.5}
                      opacity={hovered && !isRelated ? 0.16 : 1}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + r + 2}
                      textAnchor="middle"
                      fontWeight={isActive ? "bold" : 500}
                      fontSize={r >= 16 ? 13 : r >= 12 ? 11 : 9}
                      fill={isActive || isRelated ? textColor : theme === "dark" ? "#aaa" : "#888"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        {expanded && (
          <ExpandedKnowledgeGraph onClose={() => setExpanded(false)} />
        )}
      </div>
      {/* Related topics sidebar now only on the right */}
      <aside className="wiki-related" style={{ width: 260, marginLeft: 24 }}>
        {RelatedTopicsSidebar}
      </aside>
    </div>
  );
};

export default KnowledgeGraph;
