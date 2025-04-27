import fs from "fs";
import path from "path";

export type TopicNode = {
  id: string;
  label: string;
  url: string;
  children?: TopicNode[];
};

function scanTopic(dir: string, baseUrl: string): TopicNode {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const children: TopicNode[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subdir = path.join(dir, entry.name);
      children.push(scanTopic(subdir, `${baseUrl}/${entry.name}`));
    } else if (entry.isFile() && entry.name.endsWith(".mdx") && entry.name !== "content.mdx") {
      const id = entry.name.replace(/\.mdx$/, "");
      children.push({
        id,
        label: id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        url: `${baseUrl}/${id}`,
      });
    }
  }

  // Use folder name as topic label
  const topicId = path.basename(dir);
  return {
    id: topicId,
    label: topicId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    url: baseUrl,
    children: children.length ? children : undefined,
  };
}

// Always generate a single root node ("Science Tree") with all topics as children
export function buildNotesTree(notesDir: string, baseUrl = "/notes"): TopicNode[] {
  const entries = fs.readdirSync(notesDir, { withFileTypes: true });
  const topics: TopicNode[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== "science-tree") {
      topics.push(scanTopic(path.join(notesDir, entry.name), `${baseUrl}/${entry.name}`));
    }
  }
  // Only add the science-tree node if it exists as a directory or content.mdx file
  let hasScienceTree = entries.some(e => e.name === "science-tree" && e.isDirectory());
  if (!hasScienceTree) {
    hasScienceTree = entries.some(e => e.name === "science-tree" && e.isFile());
  }
  return [{
    id: "science-tree",
    label: "Science Tree",
    url: `${baseUrl}/science-tree`,
    children: topics.length ? topics : undefined,
  }];
}
