"use client";
import dynamic from "next/dynamic";
import MdxPage from "../../../components/MdxPage";
const Content = dynamic(() => import("./content.mdx"));

export default function BiologyPage() {
  return (
    <MdxPage>
      <Content />
    </MdxPage>
  );
}
