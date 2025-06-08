# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Install dependencies**: `npm install` / `yarn install` / `pnpm install`
- **Development server**: `npm run dev` / `yarn dev` / `pnpm dev`
- **Build**: `npm run build` / `yarn build` / `pnpm build`
- **Production start**: `npm run start` / `yarn start` / `pnpm start`
- **Lint**: `npm run lint` / `yarn lint` / `pnpm lint`

## Architecture Overview

This is a Next.js-based markdown editor with real-time preview, Google Drive integration, AI chat, and presentation export capabilities.

### Core Architecture Patterns

**Framework & Stack:**
- Next.js 15 with App Router (`/app` directory structure)
- TypeScript for type safety
- TailwindCSS + shadcn/ui components for styling
- React state management with hooks

**Layout Structure:**
- `TripleLayout` component manages resizable panels for editor/AI chat
- `ResizablePanelGroup` from shadcn/ui handles dynamic layout adjustments
- Conditional panel rendering based on feature flags (Google Drive, TOC)

**Editor Integration:**
- `MarkdownEditor` is the main component using CodeMirror 6
- Real-time preview with ReactMarkdown + remark/rehype plugins
- Vim keybindings support via `@replit/codemirror-vim`
- Speech recognition for voice input

**AI Chat System:**
- Built on Vercel AI SDK with multi-provider support (OpenAI, Anthropic, Gemini, XAI, Ollama)
- MCP (Model Context Protocol) integration for external tools via STDIO
- Local memory tools for persistent context across sessions
- File attachment processing with Markitdown conversion

**File Management:**
- Dual file system: Local file explorer + Google Drive integration
- Local files accessed via Next.js API routes with filesystem operations
- Google Drive integration using Google APIs with OAuth2
- Auto-save functionality with debounced writes

**Export Capabilities:**
- Marp integration for slide presentations (PPTX export via CLI)
- Quarto support for scientific document publishing
- PowerPoint export through external tool orchestration

### Key Component Relationships

```
app/page.tsx
└── TripleLayout
    ├── MarkdownEditor (main editor with CodeMirror)
    ├── AIChat (right panel)
    └── Conditional panels:
        ├── GoogleDriveFileList (when GOOGLE_FLAG=ON)
        └── TableOfContents (when Drive disabled)
```

**API Route Structure:**
- `/api/chat` - AI conversation handling with multi-provider support
- `/api/files/*` - Local filesystem operations (read, save, list)
- `/api/drive/*` - Google Drive integration endpoints
- `/api/export-*` - Document export functionality (PPTX, Quarto)

**Environment Configuration:**
The application heavily relies on environment variables for feature toggling:
- `NEXT_PUBLIC_GOOGLE_FLAG` - Enable/disable Google Drive features
- `NEXT_PUBLIC_FILE_UPLOAD` - Enable/disable local file explorer
- Various API keys for AI providers
- External tool paths for export functionality

### Data Flow Patterns

**Editor Content Management:**
- Editor state managed in `MarkdownEditor` component
- Auto-save hooks handle persistence to local/Drive storage
- Debounced updates prevent excessive API calls

**AI Integration:**
- Chat messages flow through Vercel AI SDK
- MCP tools dynamically loaded from environment configuration
- File attachments processed server-side with format conversion

**File System Abstraction:**
- Unified interface for local vs Drive operations
- Error handling for permission and connectivity issues
- Lazy loading of file lists for performance

### External Tool Integration

The application integrates with several external tools via PATH configuration:
- **Jupyter**: Required for some Marp PPTX conversion workflows
- **Quarto**: Scientific publishing and presentation export
- **Markitdown**: Document format conversion for AI file processing

Tools are invoked via child processes with proper error handling and timeout management.

### Component Styling Patterns

- Consistent dark/light mode theming via `ThemeProvider`
- Responsive design with ResizablePanel components
- Icon usage standardized with Lucide React
- shadcn/ui components for consistent UI patterns

### Performance Considerations

- CodeMirror configured with vim extensions loaded conditionally
- Debounced auto-save to prevent excessive writes
- Lazy loading of heavy dependencies (Mermaid, Markmap)
- Build optimizations in next.config.mjs disable some checks for faster builds