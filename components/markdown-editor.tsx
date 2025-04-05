"use client"

import { useState, useRef } from "react"
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

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState("# Hello, World!\n\nStart typing your markdown here...")
  const previewRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

  const insertText = (before: string, after = "") => {
    const textarea = document.querySelector("textarea")
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdown.substring(start, end)

    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end)
    setMarkdown(newText)

    // Set cursor position after the operation
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("# ", "\n")}>
                  <Heading1 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 1</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("## ", "\n")}>
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 2</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("### ", "\n")}>
                  <Heading3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 3</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("**", "**")}>
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("*", "*")}>
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("- ", "\n")}>
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bullet List</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("1. ", "\n")}>
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Numbered List</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("- [ ] ", "\n")}>
                  <CheckSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Task List</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("> ", "\n")}>
                  <Quote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Quote</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("```\n", "\n```")}>
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code Block</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("|  |  |\n|--|--|\n|  |  |\n")}>
                  <Table className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Table</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("[", "](url)")}>
                  <Link className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Link</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => insertText("![", "](url)")}>
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Image</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSave} className="gap-1">
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Markdown</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Preview</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Theme</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="split" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="split">Split</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="split" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <Textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="min-h-[calc(100vh-250px)] font-mono resize-none border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Type your markdown here..."
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 h-full">
                <div ref={previewRef} className="prose prose-gray max-w-none min-h-[calc(100vh-250px)] overflow-auto h-full">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="min-h-[calc(100vh-250px)] font-mono resize-none border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Type your markdown here..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardContent className="p-4 h-full">
              <div ref={previewRef} className="prose prose-gray max-w-none min-h-[calc(100vh-250px)] overflow-auto h-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

