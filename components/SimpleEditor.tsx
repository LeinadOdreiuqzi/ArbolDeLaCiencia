import React, { useState, useRef, useEffect } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react' // Added BubbleMenu
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { PasteRule } from '@tiptap/core'
import { EmbedFrameExtension } from './EmbedNode' // Import the new EmbedFrameExtension
import { CitationMark } from './CitationMark' // Import the new CitationMark
import ResizableImageNodeView from './ResizableImageNodeView' // Import the custom node view
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import AutoJoiner from 'tiptap-extension-auto-joiner';

// Estilos para el editor
import './SimpleEditor.css'

// Helper function to convert video URLs to embeddable format
function getVideoEmbedUrl(url: string): string | null {
  let embedUrl = url;
  if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else {
      return null; // Not a valid YouTube URL for embedding
    }
  } else if (url.includes('vimeo.com')) {
    const videoIdMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    if (videoId) {
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    } else {
      return null; // Not a valid Vimeo URL for embedding
    }
  } else {
    return null; // Not a YouTube or Vimeo URL
  }
  return embedUrl;
}

// Componente para insertar videos embebidos
const VideoComponent = (props: any) => {
  return (
    <NodeViewWrapper className="video-wrapper">
      <div className="video-container">
        <iframe
          src={props.node.attrs.src}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </NodeViewWrapper>
  )
}

// Extensión personalizada para videos embebidos
const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'iframe[src*="youtube.com"], iframe[src*="vimeo.com"]', // For parsing existing iframes if any
      },
      {
        tag: 'div[data-type="video"]', // For custom representation
      }
    ]
  },
  renderHTML({ HTMLAttributes }) {
    // Return an iframe for semantic HTML, but our NodeView will take over rendering
    return ['iframe', { ...HTMLAttributes, 'data-type': 'video', frameBorder: 0, allowfullscreen: '' }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoComponent)
  },
  addPasteRules() {
    return [
      new PasteRule({
        find: /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)\S+/g,
        handler: ({ state, range, match }) => {
          const url = match[0];
          const embedUrl = getVideoEmbedUrl(url);

          if (embedUrl) {
            const { tr } = state;
            const node = state.schema.nodes.video.create({ src: embedUrl });
            tr.replaceWith(range.from, range.to, node);
          }
        },
      }),
    ]
  },
})

const MenuBar = ({ editor }: { editor: any }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const citationData = useRef({
    sources: new Map<string, string>(),
    nextId: 1
  })

  if (!editor) {
    return null
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()

    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        editor.chain().focus().setImage({ src: result }).run()
      }
    }

    reader.readAsDataURL(file)
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const insertVideo = () => {
    const url = window.prompt('Ingresa la URL del video (YouTube, Vimeo, etc.)')
    if (url) {
      const embedUrl = getVideoEmbedUrl(url);
      if (embedUrl) {
        editor.chain().focus().insertContent({
          type: 'video',
          attrs: { src: embedUrl }
        }).run()
      } else {
        alert("URL de video no válida o no soportada.");
      }
    }
  }

  return (
    <div className="menu-bar">
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handleImageUpload} 
      />
      <div className="menu-section">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Negrita"
        >
          <span className="icon">B</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Cursiva"
        >
          <span className="icon">I</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Tachado"
        >
          <span className="icon">S</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
          title="Código"
        >
          <span className="icon">{'</>'}</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={editor.isActive('subscript') ? 'is-active' : ''}
          title="Subíndice"
        >
          <span className="icon">ₓ</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={editor.isActive('superscript') ? 'is-active' : ''}
          title="Superíndice"
        >
          <span className="icon">ˣ</span>
        </button>
      </div>

      <div className="menu-section">
        <button onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Limpiar formato">
          <span className="icon">Clear</span>
        </button>
        <button onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive('paragraph') ? 'is-active' : ''}
          title="Párrafo"
        >
          <span className="icon">P</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          title="Encabezado 1"
        >
          <span className="icon">H1</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="Encabezado 2"
        >
          <span className="icon">H2</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
          title="Encabezado 3"
        >
          <span className="icon">H3</span>
        </button>
      </div>

      <div className="menu-section">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Lista con viñetas"
        >
          <span className="icon">•</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Lista numerada"
        >
          <span className="icon">1.</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="Bloque de código"
        >
          <span className="icon">{'{ }'}</span>
        </button>
        {/* Indent and Outdent Buttons */}
        <button
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          disabled={!editor.can().sinkListItem('listItem')}
          title="Aumentar sangría"
        >
          <span className="icon">→</span>
        </button>
        <button
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          disabled={!editor.can().liftListItem('listItem')}
          title="Disminuir sangría"
        >
          <span className="icon">←</span>
        </button>
      </div>

      <div className="menu-section">
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Subir imagen desde el equipo"
        >
          <span className="icon">📤</span>
        </button>
        <button
          onClick={() => {
            const url = window.prompt('URL de la imagen')
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
          }}
          title="Insertar imagen por URL"
        >
          <span className="icon">🖼️</span>
        </button>
        <button
          onClick={insertVideo}
          title="Insertar video"
        >
          <span className="icon">🎬</span>
        </button>
        <button
          onClick={() => {
            const url = window.prompt('URL')
            if (url) {
              editor.chain().focus().toggleLink({ href: url }).run()
            }
          }}
          className={editor.isActive('link') ? 'is-active' : ''}
          title="Insertar enlace"
        >
          <span className="icon">🔗</span>
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Ingresa la URL SRC del iframe a embeber:')
            if (url) {
              if (!url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://')) {
                alert('URL inválida. Debe comenzar con http:// o https://');
                return;
              }
              editor.chain().focus().insertContent({
                type: 'embedFrame', // Name of the EmbedFrameExtension node
                attrs: { src: url },
              }).run()
            }
          }}
          title="Embeber Iframe"
        >
          <span className="icon">{'{...}'}</span>
        </button>
        <button
          onClick={() => {
            if (!editor) return;
            const { from, to, empty } = editor.state.selection;
            if (empty) {
              alert('Por favor, selecciona el texto que deseas citar.');
              return;
            }

            const sourceText = window.prompt('Ingresa el texto fuente de la cita (ej: Autor, Año, Título):');
            if (!sourceText) return;

            let citationId = citationData.current.sources.get(sourceText);
            if (!citationId) {
              citationId = String(citationData.current.nextId++);
              citationData.current.sources.set(sourceText, citationId);
            }
            
            // The toggleCitation command was defined in CitationMark.ts
            editor.chain().focus().toggleMark('citation', { citationId, sourceText }).run();
          }}
          className={editor?.isActive('citation') ? 'is-active' : ''}
          title="Añadir/Quitar Cita"
        >
          <span className="icon">[1]</span>
        </button>
      </div>

      <div className="menu-section">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title="Alinear a la izquierda"
        >
          <span className="icon">⟵</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title="Centrar"
        >
          <span className="icon">⟷</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title="Alinear a la derecha"
        >
          <span className="icon">⟶</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
          title="Justificar"
        >
          <span className="icon">☰</span>
        </button>
      </div>

      <div className="menu-section">
        <button onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
          <span className="icon">↩️</span>
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
          <span className="icon">↪️</span>
        </button>
      </div>
    </div>
  )
}

interface SimpleEditorProps {
  content: any;
  onChange: (content: any) => void;
  initialContent?: any;
  onEditorReady?: (editor: any) => void; // Changed 'Editor' to 'any' to avoid import issues here, Tiptap Editor type
}

const SimpleEditor = ({ content, onChange, initialContent, onEditorReady }: SimpleEditorProps) => {
  const [isReady, setIsReady] = useState(false);
  const citationData = useRef<{ sources: Map<string, string>; nextId: number }>({
    sources: new Map(),
    nextId: 1,
  });
  
  // Usar useEffect para manejar la carga inicial del contenido desde la BD
  useEffect(() => {
    if (initialContent && !isReady) {
      setIsReady(true)
    }
  }, [initialContent, isReady])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Ensure headings have levels needed for ToC
        heading: {
          levels: [1, 2, 3, 4], 
        },
      }),
      Placeholder.configure({
        placeholder: 'Escribe algo…',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        allowBase64: true,
        inline: true, // Keep images inline
        // HTMLAttributes are used by renderHTML for the main <img> tag
        HTMLAttributes: {
          class: 'tiptap-image', // Added a class for general styling if needed
        },
      }).extend({
        // First, extend to add custom attributes for width and height
        addAttributes() {
          return {
            ...this.parent?.(), // Retain existing attributes (src, alt, title)
            width: {
              default: null,
              parseHTML: element => element.style.width || element.getAttribute('width'),
              renderHTML: attributes => {
                if (!attributes.width) return {};
                return { width: attributes.width };
              },
            },
            height: {
              default: null,
              parseHTML: element => element.style.height || element.getAttribute('height'),
              renderHTML: attributes => {
                if (!attributes.height) return {};
                return { height: attributes.height };
              },
            },
            // style attribute to allow floating and other styles if needed in future
            style: {
                default: null,
                parseHTML: element => element.getAttribute('style'),
                renderHTML: attributes => {
                    if (!attributes.style) return {};
                    return { style: attributes.style };
                }
            },
            float: {
              default: 'none', // Values: 'none', 'left', 'right'
              parseHTML: element => element.style.float || 'none',
              renderHTML: attributes => {
                if (attributes.float === 'none' || !attributes.float) {
                  return {};
                }
                // This will be applied to the main <img> tag if renderHTML is used,
                // but ResizableImageNodeView will also use this attribute directly.
                return { style: `float: ${attributes.float};` }; 
              },
            },
          };
        },
        // Then, extend again to add the paste rules (if this chaining is problematic, combine extends)
      }).extend({
        addPasteRules() {
          return [
            new PasteRule({
              find: /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|svg|tiff|ico)\S*/g,
              handler: ({ state, range, match }) => {
                const url = match[0];
                const pastedText = state.doc.textBetween(range.from, range.to, " ");
                if (url.trim() === pastedText.trim()) {
                  // Create node with src, let NodeView handle initial size via natural dimensions if w/h not set
                  state.tr.replaceWith(range.from, range.to, this.type.create({ src: url }));
                }
              },
            }),
          ];
        },
        // Finally, extend to add the custom node view
      }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(ResizableImageNodeView);
        },
        // Ensure renderHTML from the base Image extension is still somewhat respected
        // The NodeView will take over rendering, but this can be a fallback or for static output
        renderHTML({ node, HTMLAttributes }) {
            // HTMLAttributes from addAttributes will include width/height if they exist
            // The default Image extension's renderHTML is ['img', HTMLAttributes]
            // We need to ensure our width/height are included
            const { width, height, style } = node.attrs;
            const attrs = { ...HTMLAttributes };
            if (width) attrs.width = String(width); // Ensure it's string for HTML
            if (height) attrs.height = String(height);
            if (style) attrs.style = style;
            
            // If inline, Tiptap often wraps in a span. Our NodeView uses span as wrapper.
            // For static HTML, just outputting 'img' is fine.
            return ['img', attrs];
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Subscript,
      Superscript,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      VideoExtension,
      EmbedFrameExtension, // Add the new extension here
      CitationMark, // Add the new citation mark here
      // Drag and Drop Extensions
      GlobalDragHandle.configure({
        // Add any specific configurations here if needed
      }),
      AutoJoiner,
    ],
    content: initialContent || content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  // Call onEditorReady when editor is initialized
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
    // Optional: Cleanup if onEditorReady needs to be recalled if editor instance changes
    // return () => { if (editor) { /* editor.destroy() or similar if needed */ } }
  }, [editor, onEditorReady]);

  // Populate citation data from existing content when editor is created or content changes.
  useEffect(() => {
    if (editor && (content || initialContent)) {
      const newSources = new Map<string, string>();
      let maxId = 0;
      editor.state.doc.descendants((node, pos) => {
        node.marks.forEach(mark => {
          if (mark.type.name === 'citation') {
            const { citationId, sourceText } = mark.attrs;
            if (citationId && sourceText) {
              newSources.set(sourceText, citationId);
              const numericId = parseInt(citationId, 10);
              if (!isNaN(numericId) && numericId > maxId) {
                maxId = numericId;
              }
            }
          }
        });
      });
      citationData.current.sources = newSources;
      citationData.current.nextId = maxId + 1;
    }
  }, [editor, content, initialContent]);


  // Actualizar el contenido del editor cuando cambia externamente
  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      // Solo actualizar si el contenido es diferente al actual
      const currentContent = JSON.stringify(editor.getJSON())
      const newContent = JSON.stringify(content)
      
      if (currentContent !== newContent) {
        // Prevent re-triggering onUpdate by providing a different transaction source
        editor.commands.setContent(content, false, { preserveWhitespace: 'full' })
      }
    }
  }, [editor, content])

  return (
    <div className="simple-editor" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MenuBar editor={editor} />
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100, placement: 'top', appendTo: 'parent' }}
          className="image-bubble-menu" // Use class for styling from SimpleEditor.css
          shouldShow={({ editor: currentEditor }) => currentEditor.isActive('image')}
        >
          <button
            onClick={() => editor.chain().focus().updateAttributes('image', { float: 'left' }).run()}
            className={editor.isActive('image', { float: 'left' }) ? 'is-active' : ''}
          >
            Float Left
          </button>
          <button
            onClick={() => editor.chain().focus().updateAttributes('image', { float: 'right' }).run()}
            className={editor.isActive('image', { float: 'right' }) ? 'is-active' : ''}
          >
            Float Right
          </button>
          <button
            onClick={() => editor.chain().focus().updateAttributes('image', { float: 'none' }).run()}
            className={editor.isActive('image', { float: 'none' }) ? 'is-active' : ''}
          >
            No Float
          </button>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} style={{ flexGrow: 1, overflowY: 'auto' }}/>
    </div>
  )
}

export default SimpleEditor