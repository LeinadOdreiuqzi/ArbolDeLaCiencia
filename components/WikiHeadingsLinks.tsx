"use client";
import React, { useEffect, useState } from "react";

// Utility to extract headings from rendered MDX content
type Heading = { id: string; text: string; level: number };

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function WikiHeadingsLinks() {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    // Find all h1, h2, h3 in the main content area (after MDX rendered)
    const contentRoot = document.querySelector(".prose") || document.body;
    const nodes = Array.from(contentRoot.querySelectorAll("h1, h2, h3"));
    const hs: Heading[] = nodes.map(node => {
      const text = node.textContent || "";
      let id = node.id;
      if (!id) {
        id = slugify(text);
        node.id = id;
      }
      const level = node.tagName === "H1" ? 1 : node.tagName === "H2" ? 2 : 3;
      return { id, text, level };
    });
    setHeadings(hs);
  }, []);

  if (!headings.length) return null;

  return (
    <div className="wiki-related" style={{ padding: "0.5em 1em" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>On this page</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {headings.map(h => (
          <li key={h.id} style={{ marginBottom: 4, marginLeft: (h.level - 1) * 12 }}>
            <a
              href={`#${h.id}`}
              className={h.level === 1 ? "wiki-anchor-main" : "wiki-anchor-secondary"}
              style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 500 }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
