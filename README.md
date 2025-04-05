<div align="center">

# 📝 マークダウンエディタ

モダンなWeb技術を使用して構築された、使いやすいマークダウンエディタアプリケーション


[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

## 📋 目次
- [📝 マークダウンエディタ](#-マークダウンエディタ)
  - [📋 目次](#-目次)
  - [✨ 機能](#-機能)
  - [🛠️ 技術スタック](#️-技術スタック)
  - [🚀 インストール](#-インストール)
  - [📖 使い方](#-使い方)
  - [👨‍💻 開発](#-開発)
  - [📄 ライセンス](#-ライセンス)

## ✨ 機能

- リアルタイムマークダウンプレビュー
- シンタックスハイライト付きコードブロック
- ダークモード/ライトモードの切り替え
- 絵文字ピッカー
- マークダウンファイルの保存
- 印刷機能
- レスポンシブデザイン
- 分割ビュー（エディタとプレビューを同時表示）
- タブインターフェース（エディタとプレビューを切り替え）
- マークダウン書式ツールバー
- エディタ機能

## 🛠️ 技術スタック

- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [React](https://reactjs.org/) - UIライブラリ
- [TypeScript](https://www.typescriptlang.org/) - 型安全な言語
- [TailwindCSS](https://tailwindcss.com/) - ユーティリティファーストCSS
- [Radix UI](https://www.radix-ui.com/) - アクセシブルなUIコンポーネント
- [CodeMirror](https://codemirror.net/) - テキストエディタコンポーネント
- [React Markdown](https://github.com/remarkjs/react-markdown) - マークダウンレンダラー
- [Remark GFM](https://github.com/remarkjs/remark-gfm) - GitHubフレーバードマークダウンサポート
- [Lucide React](https://lucide.dev/) - アイコンライブラリ

## 🚀 インストール

```bash
# パッケージマネージャにnpmを使用する場合
npm install
npm run dev

# またはyarnを使用する場合
yarn
yarn dev

# またはpnpmを使用する場合
pnpm install
pnpm dev
```

## 📖 使い方

1. エディタ画面にマークダウンテキストを入力します
2. ツールバーボタンを使用して一般的なマークダウン書式を素早く挿入できます
3. 「プレビュー」タブまたは分割ビューでレンダリングされたマークダウンをリアルタイムで確認できます
4. ドキュメントが完成したら、保存ボタンをクリックしてmarkdownファイルとしてローカルに保存できます
5. 必要に応じて印刷ボタンを使用してドキュメントを印刷またはPDFとして保存できます


## 👨‍💻 開発

```bash
# 開発サーバーを起動
npm run dev

# 本番用ビルドを作成
npm run build

# 本番環境としてアプリを起動
npm start
```

詳細な開発ガイドについては、[開発ドキュメント](./docs/DEVELOPMENT.md)を参照してください。

## 📄 ライセンス

[MIT](https://choosealicense.com/licenses/mit/) 