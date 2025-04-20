import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータからファイルパスを取得
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    // publicディレクトリ内のパスを構築
    const publicDir = path.join(process.cwd(), 'public');
    const fullPath = path.join(publicDir, filePath);

    // パスが公開ディレクトリ外を指していないか確認（セキュリティ対策）
    if (!fullPath.startsWith(publicDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    // ファイルが存在するか確認
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // ファイルの内容を読み込む
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Markdownを処理してHTMLに変換
    const htmlContent = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeHighlight)
      .use(rehypeStringify)
      .process(content);

    // HTMLテンプレートを構築
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${path.basename(filePath)} - Markdown Preview</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          pre {
            background-color: #f6f8fa;
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
          }
          pre code {
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
            background: none;
            padding: 0;
          }
          code:not(pre > code) {
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
            background-color: rgba(27,31,35,.05);
            padding: .2em .4em;
            margin: 0;
            font-size: 85%;
            border-radius: 3px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
            border-spacing: 0;
          }
          table th, table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          table tr:nth-child(even) {
            background-color: #f6f8fa;
          }
          blockquote {
            border-left: 4px solid #dfe2e5;
            padding: 0 1em;
            margin-left: 0;
            color: #6a737d;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
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
          h3 { font-size: 1.25em; }
          h4 { font-size: 1em; }
          h5 { font-size: .875em; }
          h6 { font-size: .85em; color: #6a737d; }
          ul, ol {
            padding-left: 2em;
            margin-top: 0;
            margin-bottom: 16px;
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
          .task-list-item label {
            font-weight: normal;
          }
          .task-list-item.enabled label {
            cursor: pointer;
          }
          .task-list-item + .task-list-item {
            margin-top: 3px;
          }
          .task-list-item input[type=checkbox] {
            margin: 0 0.2em 0.25em -1.6em;
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        <div id="content">${htmlContent}</div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Error previewing markdown:', error);
    return NextResponse.json({ error: 'Failed to process markdown' }, { status: 500 });
  }
} 