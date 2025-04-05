import MarkdownEditor from "@/components/markdown-editor"

export default function Home() {
  return (
    <main className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2 sm:mb-6 text-gray-800">Markdown Editor</h1>
      <MarkdownEditor />
    </main>
  )
}

