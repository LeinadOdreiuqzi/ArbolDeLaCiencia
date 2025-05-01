import React, { useEffect, useState, useRef } from "react";
import RichTextEditor from "./RichTextEditor";
import RichTextRenderer from "./RichTextRenderer";

function buildTree(pages: any[]) {
  const map = new Map();
  pages.forEach(page => map.set(page.id, { ...page, children: [] }));
  const tree: any[] = [];
  map.forEach(page => {
    if (page.parent_id) {
      map.get(page.parent_id)?.children.push(page);
    } else {
      tree.push(page);
    }
  });
  return tree;
}

function getTypeByLevel(level: number) {
  switch(level) {
    case 1: return "Área";
    case 2: return "Especialidad";
    case 3: return "Tema";
    case 4: return "Contenido";
    default: return `Nivel ${level}`;
  }
}

function TreeNode({ node, onSelect, selectedId }: { node: any, onSelect: (n: any) => void, selectedId: number }) {
  return (
    <div style={{ marginLeft: 18 }}>
      <div
        style={{
          cursor: "pointer",
          fontWeight: node.id === selectedId ? "bold" : undefined,
          color: node.id === selectedId ? "#1976d2" : undefined,
          background: node.id === selectedId ? "#e3f2fd" : undefined,
          borderRadius: 5,
          padding: "2px 6px",
          marginBottom: 2
        }}
        onClick={() => onSelect(node)}
      >
        {node.title}
      </div>
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageManager() {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const selectedPage = pages.find(p => p.id === selectedId);
  const [draftContent, setDraftContent] = useState<any>(selectedPage?.content || {blocks:[]});
  const [draftChanged, setDraftChanged] = useState(false);
  const [showSaveNotice, setShowSaveNotice] = useState(false);
  const [showErrorNotice, setShowErrorNotice] = useState<string | false>(false);
  const draftRef = useRef<any>(null); // Para comparar y restaurar
  const selectedLevel = selectedPage?.level ?? 0;
  const autosaveTimer = useRef<NodeJS.Timeout|null>(null);

  // Cargar jerarquía desde la API REAL
  useEffect(() => {
    setLoading(true);
    fetch("/api/pages")
      .then(res => res.json())
      .then(data => {
        setPages(data);
        setSelectedId(data[0]?.id ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar las páginas");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setDraftContent(selectedPage?.content || {blocks:[]});
    setDraftChanged(false);
    setShowSaveNotice(false);
    setShowErrorNotice(false);
    draftRef.current = selectedPage?.content || {blocks:[]};
  }, [selectedPage]);

  // --- AUTOSAVE cada 1 minuto si hay cambios ---
  useEffect(() => {
    if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    autosaveTimer.current = setInterval(() => {
      if (draftChanged && !loading && selectedPage) {
        handleSaveClick();
      }
    }, 60000); // 1 minuto
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftChanged, loading, selectedPage]);

  // Detecta cambios en el editor
  function handleDraftChange(data: any) {
    setDraftContent(data);
    setDraftChanged(JSON.stringify(data) !== JSON.stringify(draftRef.current));
    setShowSaveNotice(false);
    setShowErrorNotice(false);
  }

  // Guardado manual
  async function handleSaveClick() {
    if (!selectedPage) return;
    setLoading(true);
    const updated = { ...selectedPage, content: draftContent, title: editTitle || selectedPage.title };
    const res = await fetch("/api/pages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    if (res.ok) {
      setPages(pages => pages.map(p => p.id === updated.id ? updated : p));
      setDraftChanged(false);
      setShowSaveNotice(true);
      setTimeout(() => setShowSaveNotice(false), 2000);
      draftRef.current = draftContent;
    } else {
      setShowErrorNotice("Ocurrió un error al guardar. Intenta de nuevo.");
      setTimeout(() => setShowErrorNotice(false), 3000);
    }
    setLoading(false);
  }

  function handleUndoDraft() {
    setDraftContent(draftRef.current);
    setDraftChanged(false);
    setShowSaveNotice(false);
    setShowErrorNotice(false);
  }

  // --- Modal de confirmación al cambiar de página si hay cambios sin guardar ---
  function handleSelectNodeWithGuard(node: any) {
    if (draftChanged) {
      setShowUnsavedModal(node);
    } else {
      setSelectedId(node.id);
    }
  }
  function confirmChangePage() {
    if (showUnsavedModal && typeof showUnsavedModal === 'object' && showUnsavedModal.id) {
      setSelectedId(showUnsavedModal.id);
    }
    setShowUnsavedModal(false);
  }
  function cancelChangePage() {
    setShowUnsavedModal(false);
  }
  // --- FIN lógica edición controlada ---

  const [showUnsavedModal, setShowUnsavedModal] = useState<false | any>(false);

  const handleCreateArea = async () => {
    await handleCreate(null, 1);
  };
  const handleCreateEspecialidad = async () => {
    if (!selectedPage || selectedLevel !== 1) {
      alert("Selecciona un Área para agregar una Especialidad.");
      return;
    }
    await handleCreate(selectedPage, 2);
  };
  const handleCreateTema = async () => {
    if (!selectedPage || selectedLevel !== 2) {
      alert("Selecciona una Especialidad para agregar un Tema.");
      return;
    }
    await handleCreate(selectedPage, 3);
  };
  const handleCreateContenido = async () => {
    if (!selectedPage || selectedLevel !== 3) {
      alert("Selecciona un Tema para agregar un Contenido.");
      return;
    }
    await handleCreate(selectedPage, 4);
  };

  const handleCreate = async (parent?: any, levelOverride?: number) => {
    let tipo = getTypeByLevel(levelOverride ?? (parent ? parent.level + 1 : 1));
    const title = prompt(`Título del nuevo ${tipo}:`);
    if (!title) return;
    const slug = title.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9\-]/g, "");
    const level = levelOverride ?? (parent ? parent.level + 1 : 1);
    const parent_id = parent ? parent.id : null;
    const newPage = { title, slug, level, parent_id, content: { blocks: [] } };
    setLoading(true);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPage)
    });
    if (res.ok) {
      const created = await res.json();
      setPages(pages => [...pages, created]);
      setSelectedId(created.id);
    }
    setLoading(false);
  };

  const handleDelete = async (page: any) => {
    if (!window.confirm(`¿Eliminar la página "${page.title}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res = await fetch("/api/pages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: page.id })
    });
    if (res.ok) {
      setPages(pages => pages.filter(p => p.id !== page.id));
      setSelectedId(pages[0]?.id ?? null);
    }
    setLoading(false);
  };

  const tree = buildTree(pages);

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start", minHeight: 400 }}>
      <div style={{ minWidth: 280 }}>
        <h2>Jerarquía de Páginas</h2>
        <div style={{ marginBottom: 16 }}>
          <button onClick={handleCreateArea} disabled={loading} style={{ marginRight: 6 }}>+ Área</button>
          <button onClick={handleCreateEspecialidad} disabled={loading} style={{ marginRight: 6 }}>+ Especialidad</button>
          <button onClick={handleCreateTema} disabled={loading} style={{ marginRight: 6 }}>+ Tema</button>
          <button onClick={handleCreateContenido} disabled={loading}>+ Contenido</button>
        </div>
        {loading && <div style={{ color: "#888" }}>Cargando...</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}
        <div>
          {tree.map((node: any) => (
            <TreeNode key={node.id} node={node} onSelect={handleSelectNodeWithGuard} selectedId={selectedId ?? -1} />
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 320 }}>
        {selectedPage ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder={selectedPage.title}
                style={{ fontSize: 20, fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, padding: '4px 10px', marginRight: 12 }}
              />
              <span style={{ color: '#888', fontSize: 14 }}>
                [{getTypeByLevel(selectedPage.level)}]
              </span>
              <button onClick={() => handleDelete(selectedPage)} style={{ color: 'red', border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', marginLeft: 8 }}>🗑️</button>
            </div>
            <RichTextEditor key={selectedPage?.id} data={draftContent} onChange={handleDraftChange} />
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={handleSaveClick} disabled={loading || !draftChanged} style={{marginRight:8}}>Guardar cambios</button>
              <button onClick={handleUndoDraft} disabled={loading || !draftChanged}>Deshacer cambios</button>
              {/* AVISO DE CAMBIOS SIN GUARDAR ELIMINADO PARA NO INTERRUMPIR EL FOCO DE ESCRITURA */}
              {showSaveNotice && <span style={{color:'#27ae60',marginLeft:8}}>¡Cambios guardados!</span>}
              {showErrorNotice && <span style={{color:'#c00',marginLeft:8}}>{showErrorNotice}</span>}
            </div>
            {/* Vista previa eliminada para evitar pérdida de foco y mejorar la experiencia de edición */}
            {/* <div style={{ marginTop: 18, background: "#fafafa", padding: 18, borderRadius: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>Vista previa</div>
              <RichTextRenderer data={draftContent} />
            </div> */}
          </div>
        ) : (
          <div style={{ color: '#888' }}>Selecciona una página para editar</div>
        )}
      </div>
      {/* Modal de confirmación para cambios sin guardar */}
      {showUnsavedModal && (
        <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'#0009', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', padding:32, borderRadius:12, minWidth:320, boxShadow:'0 4px 24px #0002', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:18 }}>Tienes cambios sin guardar.<br/>¿Deseas descartarlos y cambiar de página?</div>
            <button onClick={confirmChangePage} style={{marginRight:16}}>Descartar cambios</button>
            <button onClick={cancelChangePage}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
