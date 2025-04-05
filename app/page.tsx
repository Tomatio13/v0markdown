import MarkdownEditor from "@/components/markdown-editor"

export default function Home() {
  return (
    <main className="container mx-auto p-4 min-h-screen">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">Markdown Editor</h1>
      <MarkdownEditor />
    </main>
  )
}

