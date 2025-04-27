"use client";
import dynamic from "next/dynamic";
import MdxPage from "../../../components/MdxPage";

const Content = dynamic(() => import("./content.mdx"));

export default function PhysicsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
      {/* Main Content Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <MdxPage>
          <Content />
        </MdxPage>
      </div>
      {/* Sidebar Right: Knowledge Graph */}
      {/* <div style={{ width: 340, marginLeft: 32, minWidth: 320 }}>
        <KnowledgeGraph />
      </div> */}
    </div>
  );
}
