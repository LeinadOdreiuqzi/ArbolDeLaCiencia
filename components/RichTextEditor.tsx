"use client";
import React, { useEffect, useRef } from "react";

export default function RichTextEditor({ data, onChange }: { data?: any, onChange: (data: any) => void }) {
  const editorRef = useRef<any>(null);
  const isFirstInit = useRef(true);
  const lastBlocks = useRef<string>("");

  useEffect(() => {
    let EditorJS: any, Header: any, List: any, Image: any, Quote: any, Code: any, Table: any, Attaches: any, Embed: any, Raw: any;
    let instance: any;

    (async () => {
      EditorJS = (await import("@editorjs/editorjs")).default;
      Header = (await import("@editorjs/header")).default;
      List = (await import("@editorjs/list")).default;
      Image = (await import("@editorjs/image")).default;
      Quote = (await import("@editorjs/quote")).default;
      Code = (await import("@editorjs/code")).default;
      Table = (await import("@editorjs/table")).default;
      Attaches = (await import("@editorjs/attaches")).default;
      Embed = (await import("@editorjs/embed")).default;
      Raw = (await import("@editorjs/raw")).default;

      if (!isFirstInit.current && editorRef.current && typeof editorRef.current.destroy === 'function') {
        await editorRef.current.destroy();
        editorRef.current = null;
      }
      isFirstInit.current = false;

      instance = new EditorJS({
        holder: "editorjs",
        data,
        tools: {
          header: Header,
          list: List,
          image: {
            class: Image,
            config: {
              uploader: {
                byUrl(url: string) {
                  return Promise.resolve({
                    success: 1,
                    file: { url }
                  });
                },
                byFile(file: File) {
                  return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      resolve({
                        success: 1,
                        file: { url: reader.result }
                      });
                    };
                    reader.readAsDataURL(file);
                  });
                }
              }
            }
          },
          attaches: {
            class: Attaches,
            config: {
              uploader: {
                byFile(file: File) {
                  return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      resolve({
                        success: 1,
                        file: {
                          url: reader.result,
                          name: file.name,
                          size: file.size
                        }
                      });
                    };
                    reader.readAsDataURL(file);
                  });
                }
              }
            }
          },
          quote: Quote,
          code: Code,
          table: Table,
          embed: Embed,
          raw: Raw,
        },
        onChange: async () => {
          if (instance) {
            const savedData = await instance.save();
            const blocksStr = JSON.stringify(savedData.blocks);
            if (blocksStr !== lastBlocks.current) {
              lastBlocks.current = blocksStr;
              if (savedData.blocks && savedData.blocks.length > 0) {
                onChange(savedData);
              }
            }
          }
        },
      });
      editorRef.current = instance;
      lastBlocks.current = JSON.stringify((data && data.blocks) ? data.blocks : []);
    })();

    return () => {
      if (editorRef.current && typeof editorRef.current.destroy === "function") {
        editorRef.current.destroy();
      }
      editorRef.current = null;
    };
  }, [data]);

  return (
    <div
      id="editorjs"
      style={{
        minHeight: 340,
        border: "1px solid #ddd",
        background: "#fff",
        borderRadius: 8,
        padding: 16,
        boxShadow: "0 2px 8px #0001",
        marginTop: 8
      }}
    />
  );
}
