import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { buildNotesTree } from "@/lib/notes-graph-util";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const notesDir = path.join(process.cwd(), "app", "notes");
  const tree = buildNotesTree(notesDir);
  res.status(200).json(tree);
}
