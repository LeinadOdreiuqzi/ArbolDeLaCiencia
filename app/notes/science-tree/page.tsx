"use client";
import dynamic from "next/dynamic";
import MdxPage from "../../../components/MdxPage";
const Content = dynamic(() => import("./content.mdx"));

export default function ScienceTreePage() {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
      {/* Main Content Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <MdxPage>
          <Content />
        </MdxPage>
      </div>
      {/* Sidebar Right is now globally handled in layout.tsx */}
    </div>
  );
}
