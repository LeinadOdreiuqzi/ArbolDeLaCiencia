import { NextRequest, NextResponse } from "next/server";
import db from "../../../lib/db"; 

// --- GET: Obtener todas las páginas ---
export async function GET() {
  try {
    const result = await db.query(`
      SELECT id, title, slug, parent_id, level, content, created_at
      FROM pages
      ORDER BY level ASC, id ASC
    `);
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Error al obtener páginas" }, { status: 500 });
  }
}

// --- POST: Crear nueva página ---
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await db.query(
      `INSERT INTO pages (title, slug, parent_id, level, content) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.title, data.slug, data.parent_id, data.level, JSON.stringify(data.content)]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Error al crear página" }, { status: 500 });
  }
}

// --- PUT: Editar página ---
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await db.query(
      `UPDATE pages SET title = $1, slug = $2, parent_id = $3, level = $4, content = $5 WHERE id = $6 RETURNING *`,
      [data.title, data.slug, data.parent_id, data.level, JSON.stringify(data.content), data.id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: "Error al editar página" }, { status: 500 });
  }
}

// --- DELETE: Eliminar página ---
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await db.query(`DELETE FROM pages WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Error al eliminar página" }, { status: 500 });
  }
}
