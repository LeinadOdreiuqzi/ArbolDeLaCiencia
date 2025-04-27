import { NextRequest } from "next/server";
import path from "path";
import { buildNotesTree } from "@/lib/notes-graph-util";

export async function GET(req: NextRequest) {
  const notesDir = path.join(process.cwd(), "app", "notes");
  const tree = buildNotesTree(notesDir);
  return new Response(JSON.stringify(tree), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
