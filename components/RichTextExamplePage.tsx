"use client";
import React, { useState } from "react";
import RichTextEditor from "./RichTextEditor";
import RichTextRenderer from "./RichTextRenderer";

export default function RichTextExamplePage() {
  const [data, setData] = useState<any>({
    time: Date.now(),
    blocks: [],
    version: "2.31.0-rc.7"
  });
  const [showJson, setShowJson] = useState(false);

  return (
    <div style={{ display: "flex", gap: 40, minHeight: 400, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <h2 style={{marginBottom: 8}}>Editor visual de página</h2>
        <div style={{color:'#666',fontSize:13,marginBottom:8}}>Crea tu contenido usando las herramientas visuales. Al terminar, copia el JSON y pégalo en la base de datos.</div>
        <RichTextEditor data={data} onChange={setData} />
        <button
          style={{ marginTop: 16, alignSelf: "flex-start", padding: "6px 14px", borderRadius: 6, border: "1px solid #bbb", background: "#f9f9f9", cursor: "pointer", fontSize: 14 }}
          onClick={() => setShowJson(j => !j)}
        >
          {showJson ? "Ocultar JSON" : "Ver/Copy JSON"}
        </button>
        {showJson && (
          <textarea
            style={{ width: "100%", minHeight: 120, marginTop: 8, fontFamily: "monospace", fontSize: 13, background: "#f6f8fa", border: "1px solid #ddd", borderRadius: 6, padding: 8 }}
            readOnly
            value={JSON.stringify(data, null, 2)}
            onFocus={e => e.target.select()}
          />
        )}
      </div>
      <div style={{ flex: 1, background: "#fafafa", padding: 32, borderRadius: 12, minHeight: 340, boxShadow: "0 2px 8px #0001", overflowX: 'auto' }}>
        <h2 style={{marginBottom: 8}}>Vista previa de la página</h2>
        <RichTextRenderer data={data} />
      </div>
    </div>
  );
}
