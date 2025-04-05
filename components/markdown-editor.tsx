"use client"

import { useState, useRef, useEffect } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import CodeMirror from '@uiw/react-codemirror'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { xcodeLight } from '@uiw/codemirror-theme-xcode'
import { javascript } from '@codemirror/lang-javascript'
import { EditorView } from '@codemirror/view'

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(
    "# Hello, World!\n\nStart typing your markdown here...\n\n```javascript\nconsole.log(\"Hello, highlighter!\");\n```"
  )
  const previewRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const insertText = (before: string, after = "") => {
    setMarkdown((prev) => {
      return prev + before + after;
    });
  }

  const handleSave = () => {
    const blob = new Blob([markdown], { type: "text/markdown" })
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
              background-color: #f6f8fa;
              border-radius: 3px;
              padding: 16px;
              overflow: auto;
            }
            code {
              background-color: #f6f8fa;
              border-radius: 3px;
              padding: 0.2em 0.4em;
              font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
            }
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
            ${previewRef.current?.innerHTML || ""}
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

  // CodeMirrorの拡張機能
  const extensions = [
    EditorView.lineWrapping,
    javascript()
  ]

  return (
    <div className="flex flex-col gap-4">
      <style jsx global>{`
        /* コードブロックの枠を強制的に削除するスタイル */
        .prose {
          overflow: visible;
        }
        .prose pre {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }
        .prose pre > div {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          border-radius: 0 !important;
        }
        .prose pre > div > pre {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          border-radius: 0 !important;
        }
        .prose div[class*="language-"] {
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: transparent !important;
        }
        .prose pre.prism-code {
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: transparent !important;
        }
        /* コード自体の背景色だけを設定 */
        .prose .syntax-highlighter-pre {
          background: ${theme === 'dark' ? '#1E1E1E' : '#FFFFFF'} !important;
          border-radius: 4px !important;
          margin: 0 !important;
          padding: 16px !important;
        }
      `}</style>
      
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md" role="toolbar" aria-label="見出しツール">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("# ", "\n")} aria-label="見出し1">
                  <Heading1 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>見出し1</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("## ", "\n")} aria-label="見出し2">
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>見出し2</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("### ", "\n")} aria-label="見出し3">
                  <Heading3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>見出し3</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md" role="toolbar" aria-label="テキスト書式ツール">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("**", "**")} aria-label="太字">
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>太字</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("*", "*")} aria-label="斜体">
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>斜体</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md" role="toolbar" aria-label="リストツール">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("- ", "\n")} aria-label="箇条書きリスト">
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>箇条書きリスト</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("1. ", "\n")} aria-label="番号付きリスト">
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>番号付きリスト</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("- [ ] ", "\n")} aria-label="タスクリスト">
                  <CheckSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>タスクリスト</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md" role="toolbar" aria-label="特殊要素ツール">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("> ", "\n")} aria-label="引用">
                  <Quote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>引用</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("```javascript\n", "\n```")} aria-label="コードブロック">
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>コードブロック</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("|  |  |\n|--|--|\n|  |  |\n")} aria-label="表">
                  <Table className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>表</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md" role="toolbar" aria-label="リンクツール">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("[", "](url)")} aria-label="リンク">
                  <Link className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>リンク</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("![", "](url)")} aria-label="画像">
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>画像</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 ml-auto" role="toolbar" aria-label="ドキュメント操作">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSave} className="gap-1" aria-label="保存">
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>マークダウンを保存</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1" aria-label="印刷">
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>プレビュー印刷</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
                >
                  {isMounted ? (
                    theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  <span className="sr-only">テーマ切り替え</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>テーマ切り替え</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="split" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="split" aria-label="分割表示">Split</TabsTrigger>
          <TabsTrigger value="edit" aria-label="編集のみ表示">Edit</TabsTrigger>
          <TabsTrigger value="preview" aria-label="プレビューのみ表示">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="split" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <CodeMirror
                  value={markdown}
                  onChange={(value) => setMarkdown(value)}
                  height="calc(100vh - 250px)"
                  className="min-h-[calc(100vh-250px)]"
                  theme={theme === 'dark' ? vscodeDark : xcodeLight}
                  extensions={extensions}
                  aria-label="マークダウンエディタ"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 h-full">
                <div ref={previewRef} className="prose prose-gray max-w-none min-h-[calc(100vh-250px)] overflow-auto h-full">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const style = theme === 'dark' ? vscDarkPlus : vs
                        
                        if (!match) {
                          return <code className={className} {...props}>{children}</code>
                        }
                        
                        // ReactMarkdownから渡されるpropsからrefを除外
                        const { ref, ...syntaxProps } = props
                        
                        return (
                          <div style={{ 
                            border: 'none', 
                            background: 'none', 
                            padding: 0, 
                            margin: 0, 
                            boxShadow: 'none',
                            borderRadius: 0
                          }}>
                            <SyntaxHighlighter
                              language={match[1]}
                              style={theme === 'dark' ? vscDarkPlus : vs}
                              PreTag="div"
                              wrapLines={false}
                              showLineNumbers={false}
                              customStyle={{
                                border: 'none',
                                borderRadius: 0,
                                padding: '16px',
                                margin: '0',
                                background: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                                boxShadow: 'none'
                              }}
                              codeTagProps={{
                                style: {
                                  border: 'none',
                                  background: 'transparent',
                                  boxShadow: 'none'
                                }
                              }}
                              {...syntaxProps}
                            >
                              {children ? children.toString() : ''}
                            </SyntaxHighlighter>
                          </div>
                        )
                      }
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <CodeMirror
                value={markdown}
                onChange={(value) => setMarkdown(value)}
                height="calc(100vh - 250px)"
                className="min-h-[calc(100vh-250px)]"
                theme={theme === 'dark' ? vscodeDark : xcodeLight}
                extensions={extensions}
                aria-label="マークダウンエディタ"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardContent className="p-4 h-full">
              <div ref={previewRef} className="prose prose-gray max-w-none min-h-[calc(100vh-250px)] overflow-auto h-full">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const style = theme === 'dark' ? vscDarkPlus : vs
                      
                      if (!match) {
                        return <code className={className} {...props}>{children}</code>
                      }
                      
                      // ReactMarkdownから渡されるpropsからrefを除外
                      const { ref, ...syntaxProps } = props
                      
                      return (
                        <div style={{ 
                          border: 'none', 
                          background: 'none', 
                          padding: 0, 
                          margin: 0, 
                          boxShadow: 'none',
                          borderRadius: 0
                        }}>
                          <SyntaxHighlighter
                            language={match[1]}
                            style={theme === 'dark' ? vscDarkPlus : vs}
                            PreTag="div"
                            wrapLines={false}
                            showLineNumbers={false}
                            customStyle={{
                              border: 'none',
                              borderRadius: 0,
                              padding: '16px',
                              margin: '0',
                              background: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                              boxShadow: 'none'
                            }}
                            codeTagProps={{
                              style: {
                                border: 'none',
                                background: 'transparent',
                                boxShadow: 'none'
                              }
                            }}
                            {...syntaxProps}
                          >
                            {children ? children.toString() : ''}
                          </SyntaxHighlighter>
                        </div>
                      )
                    }
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

