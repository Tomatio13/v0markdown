import MarkdownEditor from "@/components/markdown-editor"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="w-full max-w-[90%] mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 sm:mb-6 text-foreground">Markdown Editor</h1>
        <MarkdownEditor />
      </div>
    </main>
  )
}

