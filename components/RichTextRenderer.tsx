import React from "react";

function renderBlock(block: any, idx: number) {
  if (!block || typeof block !== "object" || !block.type || !block.data) return null;
  switch (block.type) {
    case "header": {
      const level = String(block.data.level);
      const Tag = (["1","2","3","4","5","6"].includes(level) ? ("h" + level) : "h2");
      return React.createElement(Tag, { key: idx }, block.data.text);
    }
    case "paragraph":
      return <p key={idx}>{block.data.text}</p>;
    case "list":
      if (Array.isArray(block.data.items)) {
        return block.data.style === "unordered"
          ? <ul key={idx}>{block.data.items.map((item: any, i: number) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul>
          : <ol key={idx}>{block.data.items.map((item: any, i: number) => <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ol>;
      }
      return null;
    case "image":
      return <div key={idx} style={{margin: '18px 0'}}><img src={block.data.file?.url} alt={block.data.caption || ""} style={{maxWidth: '100%'}} /><div style={{fontSize:12,color:'#888'}}>{block.data.caption}</div></div>;
    case "quote":
      return <blockquote key={idx} style={{borderLeft:'3px solid #aaa',margin:'18px 0',padding:'8px 16px',background:'#f9f9f9'}}><div>{block.data.text}</div><footer style={{fontSize:12,color:'#888'}}>{block.data.caption}</footer></blockquote>;
    case "code":
      return <pre key={idx} style={{background:'#272822',color:'#f8f8f2',padding:'12px',borderRadius:6,overflowX:'auto'}}><code>{block.data.code}</code></pre>;
    case "table":
      if (Array.isArray(block.data.content)) {
        return (
          <table key={idx} style={{margin:'18px 0',borderCollapse:'collapse',width:'100%'}}>
            <tbody>
              {block.data.content.map((row: any[], i: number) => (
                <tr key={i}>{row.map((cell, j) => <td key={j} style={{border:'1px solid #ccc',padding:'6px 10px'}}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        );
      }
      return null;
    default:
      return <pre key={idx} style={{color: '#888', fontSize: 12}}>{JSON.stringify(block, null, 2)}</pre>;
  }
}

export default function RichTextRenderer({ data }: { data: any }) {
  if (!data || !Array.isArray(data.blocks)) return null;
  return <div>{data.blocks.map((block: any, idx: number) => renderBlock(block, idx))}</div>;
}
