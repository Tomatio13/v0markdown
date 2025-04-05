"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Save,
  Printer,
  Heading1,
  Heading2,
  Heading3,
  Table,
  CheckSquare,
  Moon,
  Sun,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import CodeMirror from "@uiw/react-codemirror"
import { markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { EditorView } from "@codemirror/view"
import { markdown } from "@codemirror/lang-markdown"

export default function MarkdownEditor() {
  const [markdownContent, setMarkdownContent] = useState("# Hello, World!\n\nStart typing your markdown here...")
  const previewRef = useRef<HTMLDivElement>(null)
  const splitPreviewRef = useRef<HTMLDivElement>(null)
  const tabPreviewRef = useRef<HTMLDivElement>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const insertText = (before: string, after = "") => {
    // For CodeMirror, we'll need to use the editor's API
    // This is a simplified approach - in a real app, you might want to use a ref
    const selection = window.getSelection()?.toString() || ""
    const newText = before + selection + after

    // Insert at cursor position or replace selection
    setMarkdownContent((prev) => {
      if (selection && window.getSelection) {
        const selectionStart = prev.indexOf(selection)
        if (selectionStart !== -1) {
          return prev.substring(0, selectionStart) + newText + prev.substring(selectionStart + selection.length)
        }
      }
      // If no selection or selection not found, append to end
      return prev + newText
    })
  }

  const handleSave = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "document.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    // 表示中のプレビュー要素を取得
    const currentPreviewContent = 
      document.querySelector('.tabs-content[data-state="active"] .prose')?.innerHTML || 
      splitPreviewRef.current?.innerHTML ||
      tabPreviewRef.current?.innerHTML ||
      ""

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Markdown Preview</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          pre {
            background-color: #1E1E1E;
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
            color: #D4D4D4;
          }
          code {
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
          }
          /* VS Code-like syntax highlighting */
          .token.comment { color: #6A9955; }
          .token.string { color: #CE9178; }
          .token.keyword { color: #569CD6; }
          .token.function { color: #DCDCAA; }
          .token.number { color: #B5CEA8; }
          .token.operator { color: #D4D4D4; }
          .token.class-name { color: #4EC9B0; }
          /* Other styles remain the same */
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px 12px;
            text-align: left;
          }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #666;
          }
          img {
            max-width: 100%;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          h1 {
            font-size: 2em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
          }
          h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
          }
          h3 {
            font-size: 1.25em;
          }
          ul, ol {
            padding-left: 2em;
          }
          hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: #e1e4e8;
            border: 0;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .task-list-item {
            list-style-type: none;
          }
          .task-list-item input {
            margin: 0 0.2em 0.25em -1.6em;
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        <div id="content">
          ${currentPreviewContent}
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      <div className="flex flex-wrap items-center justify-between">
        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-2">
            {/* Headings */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("# ", "\n")}>
                    <Heading1 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 1</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("## ", "\n")}>
                    <Heading2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 2</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("### ", "\n")}>
                    <Heading3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 3</TooltipContent>
              </Tooltip>
            </div>

            {/* Text formatting */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("**", "**")}>
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("*", "*")}>
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- ", "\n")}>
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("1. ", "\n")}>
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- [ ] ", "\n")}>
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Task List</TooltipContent>
              </Tooltip>
            </div>

            {/* Block elements */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("> ", "\n")}>
                    <Quote className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quote</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("```\n", "\n```")}>
                    <Code className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Code Block</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("|  |  |\n|--|--|\n|  |  |\n")}>
                    <Table className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Table</TooltipContent>
              </Tooltip>
            </div>

            {/* Links and images */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("[", "](url)")}>
                    <Link className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Link</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("![", "](url)")}>
                    <Image className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Image</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSave} className="h-8 gap-1">
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Markdown</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1">
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Preview</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={toggleDarkMode} className="h-8 gap-1">
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isDarkMode ? "Light" : "Dark"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="split" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-[300px]">
          <TabsTrigger value="split">Split</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="split" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="h-full">
              <CardContent className="p-4 h-full">
                <CodeMirror
                  value={markdownContent}
                  onChange={(value) => setMarkdownContent(value)}
                  height="calc(100vh - 230px)"
                  extensions={[markdown({ base: markdownLanguage, codeLanguages: languages }), EditorView.lineWrapping]}
                  theme={vscodeDark}
                  className="border-none"
                />
              </CardContent>
            </Card>
            <Card className="h-full">
              <CardContent className="p-4 h-full">
                <div ref={splitPreviewRef} className="prose prose-gray dark:prose-invert max-w-none h-[calc(100vh-230px)] overflow-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "")
                        return !inline && match ? (
                          <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <CodeMirror
                value={markdownContent}
                onChange={(value) => setMarkdownContent(value)}
                height="calc(100vh - 230px)"
                extensions={[markdown({ base: markdownLanguage, codeLanguages: languages }), EditorView.lineWrapping]}
                theme={vscodeDark}
                className="border-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <div ref={tabPreviewRef} className="prose prose-gray dark:prose-invert max-w-none h-[calc(100vh-230px)] overflow-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "")
                      return !inline && match ? (
                        <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    },
                  }}
                >
                  {markdownContent}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

