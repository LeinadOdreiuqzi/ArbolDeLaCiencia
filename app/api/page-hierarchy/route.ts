import { NextRequest, NextResponse } from "next/server";
import db from "../../../lib/db";
import { buildHierarchyFromPages, PageData } from "@/lib/page-hierarchy-service";
import { TopicNode } from "@/lib/notes-graph-util";

/**
 * GET: Obtiene todas las páginas y las devuelve en formato jerárquico
 * para ser utilizadas por el componente PageHierarchyNavigation
 * 
 * Este endpoint se encarga de:
 * 1. Consultar todas las páginas necesarias para la navegación jerárquica
 * 2. Transformar los datos a formato compatible con TopicNode
 * 3. Construir la jerarquía de páginas ordenada por nivel y título
 */
export async function GET() {
  try {
    console.log("[API] Iniciando consulta de jerarquía de páginas");
    
    // Consultar todas las páginas con los campos necesarios para la estructura jerárquica
    // Ordenamos por level primero y luego por title para mantener orden consistente
    const result = await db.query(`
      SELECT 
        id, 
        title, 
        slug, 
        parent_id, 
        level,
        content,
        created_at
      FROM pages
      ORDER BY level ASC, title ASC
    `);

    console.log(`[API] Obtenidas ${result.rows.length} páginas de la base de datos`);
    
    // Verificación adicional de registros para detectar problemas
    if (result.rows.length > 0) {
      // Loguear algunos registros para diagnóstico
      console.log("[API] Muestra de datos (primeros 3 registros):");
      result.rows.slice(0, 3).forEach((row: any, idx: number) => {
        console.log(`[API] Registro ${idx + 1}: ID=${row.id}, Título=${row.title}, ParentID=${row.parent_id}, Level=${row.level}`);
      });
      
      // Verificar si hay padres que no existen
      const allIds = new Set(result.rows.map((row: any) => row.id));
      const parentIds = new Set(result.rows.filter((row: any) => row.parent_id !== null).map((row: any) => row.parent_id));
      const missingParents = [...parentIds].filter(id => !allIds.has(id));
      
      if (missingParents.length > 0) {
        console.warn(`[API] Advertencia: Se encontraron ${missingParents.length} referencias a padres que no existen: ${missingParents.join(', ')}`);
      }
    }

    // Transformar los datos en el formato esperado por buildHierarchyFromPages
    const pages: PageData[] = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      parent_id: row.parent_id,
      level: row.level,
      content: row.content ? JSON.parse(row.content) : null,
      // Incluimos timestamp para posible uso en caché o para mostrar info de "actualizado recientemente"
      created_at: row.created_at
    }));

    // Si no hay páginas, devolver un array vacío en lugar de error
    if (pages.length === 0) {
      console.log("[API] No se encontraron páginas en la base de datos");
      return NextResponse.json([], { status: 200 });
    }

    // Construir la jerarquía de páginas utilizando la función del servicio
    const hierarchy = buildHierarchyFromPages(pages);
    console.log(`[API] Jerarquía construida con ${hierarchy.length} nodos raíz`);
    
    // Verificar la estructura jerárquica
    let totalNodes = 0;
    let maxDepth = 0;
    
    const countNodes = (nodes: TopicNode[], depth = 1) => {
      totalNodes += nodes.length;
      maxDepth = Math.max(maxDepth, depth);
      
      nodes.forEach((node: TopicNode) => {
        if (node.children && node.children.length > 0) {
          countNodes(node.children, depth + 1);
        }
      });
    };
    
    countNodes(hierarchy);
    console.log(`[API] Estadísticas de jerarquía: ${totalNodes} nodos totales, profundidad máxima: ${maxDepth}`);

    // Establecer encabezados de caché para mejorar rendimiento
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    return NextResponse.json(hierarchy, { 
      status: 200,
      headers
    });
  } catch (err) {
    console.error("[API] GET /api/page-hierarchy error:", err);
    return NextResponse.json(
      { error: "Error al obtener la jerarquía de páginas", details: (err as Error).message }, 
      { status: 500 }
    );
  }
}

/**
 * Agregamos soporte para revalidación con POST para actualizar la caché
 * cuando se agregan, modifican o eliminan páginas
 */
export async function POST(request: NextRequest) {
  try {
    // Esta ruta solo debe ser llamada desde el servidor o con autorización
    // Se podría agregar validación de token/sesión aquí

    // Responder con 200 para confirmar que los datos de jerarquía se recargarán
    return NextResponse.json({ revalidated: true }, { status: 200 });
  } catch (error) {
    console.error("[API] POST /api/page-hierarchy error:", error);
    return NextResponse.json({ revalidated: false }, { status: 500 });
  }
}