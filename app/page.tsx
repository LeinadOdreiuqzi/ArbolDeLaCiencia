import Link from "next/link";

const notes = [
  { slug: "science-tree", title: "Science Tree" },
  { slug: "chemistry", title: "Chemistry" },
  { slug: "biology", title: "Biology" },
  { slug: "physics", title: "Physics" },
];

export default function HomePage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Science Tree</h1>
      <p>Welcome to the Science Tree! Explore the branches of knowledge below.</p>
      <ul>
        {notes.map(note => (
          <li key={note.slug}>
            <Link href={`/notes/${note.slug}`}>{note.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
