<div align="center">

# 📝 マークダウンエディタ

モダンなWeb技術とGoogle Drive連携機能を備えた、使いやすいマークダウンエディタアプリケーション

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Drive](https://img.shields.io/badge/Google_Drive-4285F4?style=for-the-badge&logo=google-drive&logoColor=white)](https://www.google.com/drive/)
[![Marp](https://img.shields.io/badge/Marp-9cf?style=for-the-badge&logo=markdown&logoColor=black)](https://marp.app/)
[![Quatro](https://img.shields.io/badge/quatro-quatro-blue)](https://quarto.org/)
</div>

## 📋 目次
- [📝 マークダウンエディタ](#-マークダウンエディタ)
  - [📋 目次](#-目次)
  - [🎨 画面イメージ](#-画面イメージ)
  - [✨ 機能](#-機能)
  - [🛠️ 技術スタック](#️-技術スタック)
  - [🚀 インストール](#-インストール)
    - [node-ptyのビルド（WebSocketターミナル機能を使用する場合）](#node-ptyのビルドwebsocketターミナル機能を使用する場合)
  - [🛠️ 外部ツールのセットアップ](#️-外部ツールのセットアップ)
    - [Jupyterのインストール方法](#jupyterのインストール方法)
    - [Quartoのインストール方法](#quartoのインストール方法)
    - [Markitdownのインストール方法](#markitdownのインストール方法)
  - [⚙️ 初期設定](#️-初期設定)
    - [1. Google Drive連携設定 (任意)](#1-google-drive連携設定-任意)
      - [Google Cloud Consoleでの設定](#google-cloud-consoleでの設定)
    - [2. 環境変数設定](#2-環境変数設定)
    - [3. 外部ツール設定 (任意)](#3-外部ツール設定-任意)
  - [📖 使い方](#-使い方)
    - [共通的な使い方](#共通的な使い方)
    - [ファイルエクスプローラー](#ファイルエクスプローラー)
    - [Marpプレゼンテーション](#marpプレゼンテーション)
    - [Quartoプレゼンテーション](#quartoプレゼンテーション)
    - [Markmapマインドマップ](#markmapマインドマップ)
    - [カスタムプロンプト機能](#カスタムプロンプト機能)
      - [使用方法](#使用方法)
  - [📄 ライセンス](#-ライセンス)


## 🎨 画面イメージ
![Markdown Editor画面イメージ](assets/markdown-lightmode.png)

## ✨ 機能

**I. コア編集とフォーマット**
*   **Markdownサポート:**
    *   **基本的な書式:** 見出し、リスト、太字、斜体、リンク、引用、コードブロック、表などをサポートします。
    *   **シンタックスハイライト:** コードブロック内のコードを言語に応じて色付けし、読みやすく表示します。
    *   **Mermaidダイアグラム:** ` ```mermaid ` 記法を使って、フローチャートやシーケンス図などの図を簡単に作成・表示できます。
    *   **Markmapマインドマップ:** ` ```markmap ` 記法を使って、マークダウンからインタラクティブなマインドマップを生成・表示できます。見出し構造がそのままマインドマップのノード階層として視覚化されます。
*   **リアルタイムプレビュー:** Markdownを入力すると同時に、整形されたプレビューがリアルタイムで更新されます。
*   **書式設定支援:** ツールバーのボタンを使って、見出し、太字、リストなどの一般的なMarkdown書式を簡単に挿入できます。
*   **画像アップロード:** ドラッグ＆ドロップまたはファイル選択で画像をエディタに簡単に追加できます。アップロード状況が表示され、日本語のファイル名にも対応しています。
*   **音声入力:** ツールバーのマイクアイコンから音声でテキストを入力できます。認識中のテキストが画面上部に表示され、確定するとカーソル位置に挿入されます（Web Speech API対応ブラウザが必要）。
*   **プレゼンテーション作成 (Marp):**
    *   [Marp](https://marp.app/) 形式のMarkdownでプレゼンテーションスライドを作成できます (`---`でスライド区切り)。
    *   テーマ設定、ページ番号、背景画像、画像のサイズ調整など、Marpのディレクティブをサポートします。
    *   エディタ内でリアルタイムにスライドプレビューを確認できます。
    *   作成したスライドはPowerPoint (PPTX) 形式でエクスポートできます (別途Marp CLIとJupyterのセットアップが必要な場合があります)。
*   **プレゼンテーション作成 (Quarto):**
    *   [Quarto](https://quarto.org/) 形式のMarkdownドキュメントをPowerPoint (PPTX) 形式、PDF形式でエクスポートできます (別途Quartoのセットアップが必要です)。
    *   エディタ内でQuartoドキュメントのプレビューが可能です。

**II. 整理とナビゲーション**

*   **ファイルエクスプローラー:**
    *   **ローカルファイルアクセス:** エディタの左側にファイルエクスプローラーが表示され、指定したディレクトリのファイルにアクセスできます。
    *   **マークダウンフィルター:** デフォルトでは `.md` ファイルのみを表示します。フィルターのオン/オフを切り替えられます。
    *   **直感的なナビゲーション:** ディレクトリを展開/折りたたみしながら目的のファイルにすばやくアクセス。
    *   **ファイルプレビュー:** ホバーするとファイルサイズを表示し、クリックするとファイルをエディタに読み込みます。
    *   **パスナビゲーター:** 現在のディレクトリパスをパンくずリストで表示し、任意の階層に素早く移動できます。
    *   **色分け表示:** ファイルタイプに応じたアイコン表示と、マークダウンファイルの視覚的強調表示。
    *   **環境設定:** `.env.local` 内の `FILE_EXPLORER_ROOT_DIR` 変数でルートディレクトリを設定できます。
    *   **機能の有効/無効化:** `.env.local` 内の `NEXT_PUBLIC_FILE_UPLOAD` 変数を `OFF` に設定すると、ファイルエクスプローラー機能が完全に無効化され、UIからも非表示になります。
*   **目次表示:** ドキュメント内の見出し (H1, H2) から自動的に目次を生成し、サイドバーに表示します（Google Drive連携が無効な場合）。
*   **Google Drive連携 (オプション):**
    *   Googleアカウントでログインし、Google Drive内のMarkdownファイル (.md) を操作できます。
    *   ファイルの一覧表示、検索、内容の読み込みが可能です。
    *   編集内容をGoogle Driveに保存できます（新規保存時は最初の見出しからファイル名を自動生成、既存ファイルは上書き保存）。
    *   連携機能はオン/オフを切り替えられます。

**III. AI アシスタンス**

*   **AIチャット:**
    *   エディタの右側にチャットパネルを開き、AIと対話しながら文章作成の補助を受けられます（別途APIキー設定が必要）。
    *   複数のAIプロバイダー (OpenAI, Grok, Gemini, Anthropic, Ollama) に対応。
    *   `@editor` と入力すると、現在エディタに書かれている内容をAIにコンテキストとして渡せます。
    *   会話履歴のクリア機能があります。
    *   **ファイル添付機能:** チャットにPDF・画像・各種オフィスファイル（Word, Excel, PowerPoint等）を添付して、AIに解析させることができます。
        *   PDF: PDF内容をネイティブに処理
        *   画像: 画像認識機能でコンテンツを解析
        *   その他の文書: Markitdownを使ってマークダウンに変換し、AIに提供
*   **外部ツール連携 (MCP):** 設定した外部ツール (コマンドラインツールなど) をAIが利用できるようになります (STDIO経由、要設定)。

**IV. 開発・ターミナル機能**

*   **WebSocketターミナル:**
    *   エディタ内で本格的なターミナル機能を利用できます。
    *   **インタラクティブコマンド対応:** `vi`、`nano`、`htop`、`less`などのインタラクティブなコマンドが使用可能です。
    *   **リアルタイム出力:** `ping`、`tail -f`などのストリーミング出力をリアルタイムで表示します。
    *   **カラー出力:** 色付きの出力が正しく表示されます。
    *   **PTY（疑似端末）ベース:** `node-pty`を使用した真の疑似端末により、完全なターミナル体験を提供します。
    *   **動的サイズ調整:** ターミナルウィンドウのサイズ変更に自動対応します。
    *   **専用WebSocketサーバー:** 環境変数で設定可能なポート（デフォルト：3002）で動作する専用サーバーにより安定した接続を提供します。
    *   **セッション管理:** 複数のターミナルセッションを独立して管理できます。

**V. ユーザビリティとインターフェース**

*   **柔軟なレイアウト:**
    *   **表示モード切替:** エディタのみ、プレビューのみ、左右分割、AIチャット付き（3ペイン）など、好みに合わせて表示を切り替えられます。
    *   **ペイン幅調整:** 分割表示時に、各エリアの幅をドラッグで自由に調整できます。
*   **カスタマイズ:**
    *   **テーマ:** ダークモードとライトモードを切り替えられます。
    *   **Vimキーバインディング:** Vimライクなキーボード操作を有効/無効にできます。
*   **便利なUI要素:**
    *   **拡張ツールバー:** ファイル操作（ローカル保存、Drive保存、印刷、PPTX/Quartoエクスポート）、表示モード切替、テーマ切替、Vimモード切替などの機能に素早くアクセスできます。
    *   **ステータスバー:** カーソルの現在位置（行、列）、選択中の文字数、現在のプレビューモードなどを表示します。
    *   **絵文字ピッカー:** 絵文字アイコンや右クリックメニューから、簡単に絵文字を検索して挿入できます。
*   **ファイル操作:**
    *   **ローカル保存:** Google Drive連携が無効な場合、編集内容をMarkdownファイルとしてローカルにダウンロードできます。
    *   **印刷:** プレビュー内容をブラウザの印刷機能を使って印刷したり、PDFとして保存したりできます。


## 🛠️ 技術スタック

- [Next.js](https://nextjs.org/) - Reactフレームワーク (App Router)
- [React](https://reactjs.org/) - UIライブラリ
- [TypeScript](https://www.typescriptlang.org/) - 型安全な言語
- [TailwindCSS](https://tailwindcss.com/) - ユーティリティファーストCSS
- [shadcn/ui](https://ui.shadcn.com/) - 再利用可能なUIコンポーネント (Radix UI + Tailwind CSS)
- [CodeMirror](https://codemirror.net/) - 高機能テキストエディタコンポーネント
- [React Markdown](https://github.com/remarkjs/react-markdown) - マークダウンレンダラー
- [Remark GFM](https://github.com/remarkjs/remark-gfm) - GitHub Flavored Markdownサポート
- [Lucide React](https://lucide.dev/) - アイコンライブラリ
- [@react-oauth/google](https://github.com/MomenSherif/react-oauth) - Google OAuth認証ライブラリ
- [googleapis](https://github.com/googleapis/google-api-nodejs-client) - Google APIクライアントライブラリ (サーバーサイドで使用)
- [Mermaid](https://mermaid.js.org/) - ダイアグラム生成ライブラリ
- [Markmap](https://markmap.js.org/) - マークダウンからマインドマップを生成するライブラリ
- [Marp CLI](https://github.com/marp-team/marp-cli) - マークダウンからPPTXを生成するツール
- [@marp-team/marp-core](https://github.com/marp-team/marp-core) - Marpコアライブラリ
- [@marp-team/marpit](https://github.com/marp-team/marpit) - Marpの基盤となるフレームワーク
- [Quarto](https://quarto.org/) - 科学技術計算向けパブリッシングシステム (PPTX変換で使用)
- [Vercel AI SDK](https://sdk.vercel.ai/) - AIチャット機能 (オプション)
- [Ollama AI Provider](https://sdk.vercel.ai/providers/community-providers/ollama) - ローカルまたはリモートのLLMを実行するOllamaサーバーへの接続
- [node-pty](https://github.com/microsoft/node-pty) - PTY（疑似端末）ライブラリ（WebSocketターミナル機能）
- [xterm.js](https://xtermjs.org/) - ブラウザ内ターミナルエミュレータ
- [WebSocket (ws)](https://github.com/websockets/ws) - WebSocket通信ライブラリ
- [concurrently](https://github.com/open-cli-tools/concurrently) - 複数のコマンドを並行実行するツール

## 🚀 インストール

プロジェクトをローカル環境にセットアップする手順です。

```bash
# リポジトリをクローン
git clone https://github.com/Tomatio13/v0markdown.git
cd v0markdown # ディレクトリ名がリポジトリ名と異なる場合注意

# 依存関係をインストール (npm, yarn, pnpm いずれかを使用)
npm install
# or
yarn install
# or
pnpm install
```

### node-ptyのビルド（WebSocketターミナル機能を使用する場合）

WebSocketターミナル機能（`vi`などのインタラクティブなコマンドをサポート）を使用する場合、`node-pty`のネイティブモジュールを手動でビルドする必要があります。

```bash
# 必要な依存関係をインストール（Ubuntu/Debian系の場合）
sudo apt update && sudo apt install -y build-essential python3-dev make g++

# node-gypをグローバルにインストール
npm install -g node-gyp

# node-ptyのネイティブモジュールをビルド
cd node_modules/.pnpm/node-pty@1.0.0/node_modules/node-pty
node-gyp rebuild

# プロジェクトディレクトリに戻る
cd /path/to/your/project
```

**注意事項:**
- `node-pty`のビルドには、C++コンパイラとPython3が必要です
- ビルドが成功すると、`build/Release/pty.node`ファイルが作成されます
- このビルド作業は、WebSocketターミナル機能を使用しない場合は不要です

インストール完了後、[初期設定](#️-初期設定)に進んでください。

## 🛠️ 外部ツールのセットアップ

MarpやQuartoからのPPTXエクスポート機能を利用するために必要な外部ツールのインストール手順です。

### Jupyterのインストール方法

(MarpのPPTX変換で内部的に必要になる場合があります)

最低限以下のコマンドを実行してJupyter環境を構築してください。

```bash
# 作業ディレクトリを作成 (任意)
mkdir jupyter_env && cd jupyter_env
# Python仮想環境を作成
python3 -m venv venv # python3 を使用
# Python仮想環境を有効化 (OSによってコマンドが異なります)
# Linux/macOS:
source venv/bin/activate
# Windows (Command Prompt):
# venv\Scripts\activate.bat
# Windows (PowerShell):
# venv\Scripts\Activate.ps1

# pipをアップグレード
pip install --upgrade pip
# 必要なパッケージをインストール
pip install jupyter numpy pandas matplotlib seaborn plotly # 必要に応じて追加
# インストールされたjupyterのパスを確認 (このパスを .env.local の JUPYTER_PATH に設定)
which jupyter
# 仮想環境を無効化 (任意)
deactivate
```
**注意:** `JUPYTER_PATH` には `which jupyter` で表示された**絶対パス**を設定してください。

### Quartoのインストール方法

[Quarto公式ドキュメントのGet Started](https://quarto.org/docs/get-started/)を参照してください。

以下はUbuntu/Debian系の例です。

```bash
# 最新版の .deb ファイルをダウンロード (バージョンは適宜確認)
wget # debファイルの取得
wget https://github.com/quarto-dev/quarto-cli/releases/download/v1.7.23/quarto-1.7.23-linux-amd64.deb# 例: v1.7.23

# ダウンロードした .deb ファイルをインストール
sudo dpkg -i quarto-*.deb
# 依存関係の問題があれば修正
sudo apt --fix-broken install

# quartoのインストール先を確認 (通常は /opt/quarto/bin/quarto)
which quarto
# このパスのディレクトリ (例: /opt/quarto/bin) を .env.local の QUARTO_PATH に設定
```
**注意:** `QUARTO_PATH` には `quarto` 実行ファイルが存在する**ディレクトリのパス**を設定してください（例: `/opt/quarto/bin`）。

### Markitdownのインストール方法

Markitdownは多様なファイル形式をマークダウンに変換するツールです。AIチャットにファイルを添付した際の変換処理に使用されます。

```bash
# 仮想環境を作成
git clone https://github.com/microsoft/markitdown.git
cd markitdown
python3 -m venv venv

# 仮想環境を有効化
source venv/bin/activate

# Markitdownをインストール（全機能を含む）
pip install 'markitdown[all]'

# 仮想環境のパスを確認（このパスを.env.localのMARKITDOWN_PATHに設定）
pwd

# 仮想環境を無効化
deactivate
```

.env.localに以下の設定を追加します：

```
# Markitdownのパス設定
MARKITDOWN_PATH="/path/to/markitdown_env"  # 上記のpwdコマンドで表示されたパス
```

## ⚙️ 初期設定

アプリケーションを実行する前に必要な設定を行います。

### 1. Google Drive連携設定 (任意)

Google Drive連携機能を利用する場合のみ、以下の設定が必要です。不要な場合はこのセクションをスキップし、環境変数 `NEXT_PUBLIC_GOOGLE_FLAG` を `OFF` に設定してください (後述)。

#### Google Cloud Consoleでの設定

(Google Cloud Platformにアカウントがない場合は作成してください)

1.  **Google Cloud Consoleにアクセス:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **新規プロジェクトを作成** (または既存のプロジェクトを選択)。
3.  **APIとサービス > ライブラリ に移動。**
4.  **「Google Drive API」を検索し、有効にする。**
5.  **APIとサービス > OAuth 同意画面 に移動。**
    *   **User Type:** 組織外のユーザーも利用する場合は「**外部**」、組織内のみの場合は「**内部**」を選択します。(テスト中は「外部」でOK)
    *   **アプリ名:** アプリケーション名（例: `MarkdownEditor`）を入力。
    *   **ユーザーサポートメール:** 自分のメールアドレスを選択。
    *   **デベロッパーの連絡先情報:** 自分のメールアドレスを入力。
    *   **「保存して次へ」をクリック。**
    *   **スコープ:** 「**スコープを追加または削除**」をクリック。
        *   フィルタで「**Google Drive API**」を検索。
        *   `.../auth/drive.file` のスコープ（特定のファイルへのアクセス）にチェックを入れ、「**更新**」をクリック。
        *   **「保存して次へ」をクリック。**
    *   **テストユーザー:**
        *   「**+ ADD USERS**」をクリック。
        *   このアプリケーションでGoogleログインを使用したい**自分のGoogleアカウントのメールアドレス**を入力します。(複数追加可能)
        *   **「追加」をクリックし、「保存して次へ」をクリック。**
    *   内容を確認し、「**ダッシュボードに戻る**」をクリック。
6.  **APIとサービス > 認証情報 に移動。**
    *   「**+ 認証情報を作成**」をクリックし、「**OAuth クライアント ID**」を選択。
    *   **アプリケーションの種類:** 「**ウェブ アプリケーション**」を選択。
    *   **名前:** 任意の名前（例: `MarkdownEditor Web Client`）を入力。
    *   **承認済みの JavaScript 生成元:**
        *   「**+ URI を追加**」をクリック。
        *   ローカル開発環境で実行するURLを入力します。通常は `http://localhost:3000` です。（異なるポートを使用している場合は、そのポート番号に合わせてください。例: `http://localhost:3001`）
    *   **承認済みのリダイレクト URI:** (今回は使用しませんが、将来的に必要になる場合があります)
    *   「**作成**」をクリック。
7.  **クライアントIDとシークレットの確認:** 作成されたクライアントIDとクライアントシークレットが表示されます。これらを次の環境変数設定で使用します。

### 2. 環境変数設定

プロジェクトのルートディレクトリに `.env.local` ファイルを作成し、以下の内容を設定します。

```env:.env.local
# Google API Keys (Google Drive連携を利用する場合に設定)
# Google Cloud Consoleで取得した値を設定
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_google_client_id"
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET="your_google_client_secret" # 必要に応じて
NEXT_PUBLIC_GOOGLE_API_KEY="your_google_api_key"           # 必要に応じて
NEXT_PUBLIC_REDIRECT_URI="http://localhost:3000"          # 開発環境のURL

# Google Drive連携の有効/無効フラグ (ON / OFF)
# OFFにするとGoogle Drive関連の機能が無効になります
NEXT_PUBLIC_GOOGLE_FLAG=ON

# ファイルエクスプローラーのルートディレクトリ設定
# ローカルファイルシステム上のアクセス可能なディレクトリを指定
FILE_EXPLORER_ROOT_DIR="/path/to/your/documents"  # 例: "/home/user/Documents"

# ファイルエクスプローラー機能の有効/無効フラグ (ON / OFF)
# OFFにするとファイルエクスプローラー機能が無効になりUIからも非表示になります
NEXT_PUBLIC_FILE_UPLOAD=ON

# WebSocketターミナル機能の有効/無効フラグ (ON / OFF)
# OFFにするとターミナル機能が無効になりUIからターミナルアイコンも非表示になります
NEXT_PUBLIC_WEBSOCKET_TERMINAL_FLG=ON

# AI Provider API Keys (AIチャット機能を利用する場合にいずれか、または複数を設定)
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
GROK_API_KEY="YOUR_GROK_API_KEY"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"

# OpenAI互換サービス設定（オプション）
# LiteLLM等のOpenAI互換APIサービスを使用する場合に設定
# OPENAI_BASE_URL="http://localhost:8000/v1"

# Ollama設定（ローカルまたはリモートサーバー）
# AIチャットでOllamaを利用する場合に設定
OLLAMA_BASE_URL="http://localhost:11434/api" # OllamaサーバーのURL

# 使用可能なモデルの設定（JSON形式）
# 各プロバイダーで使用可能なモデルをここで指定
MODELS='{
  "openai":{
    "models":["gpt-4o","gpt-4o-mini","o1"]
  },
  "xai":{
    "models":["grok-3-mini-beta","grok-3-beta"]
  },
  "gemini":{
    "models":["gemini-1.5-pro","gemini-2.0-flash"]
  },
  "anthropic":{
    "models":["claude-3-7-sonnet-20250219"]
  },
  "ollama":{
    "models":["llama3","phi3","qwen3:4b","llava"] # Ollamaにインストール済みのモデル
  }
}'

# Model Context Protocol (MCP) Servers (オプション)
# AIチャットで外部ツールサーバーを STDIO で起動する場合に設定。
# StdioMCPTransport に渡される形式です。
# キー名は英数字アンダースコアのみを推奨 (OpenAIツール名制約のため)。
# 例:
# MCP_SERVERS_JSON='{
#   "my_python_tool": {
#     "command": "python",                 # 必須: 実行ファイルパス (string)
#     "args": ["path/to/your/script.py"],  # オプション: コマンド引数 (string[])
#     "cwd": "/path/to/your/project"      # オプション: 作業ディレクトリ (string)
#   },
#   "another_node_tool": {
#     "command": "node",
#     "args": ["dist/server.js"]
#   }
# }'
MCP_SERVERS_JSON=''

# Paths for External Tools (オプション、PPTX/Quarto変換に必要)
# 外部ツールの実行ファイルパスを設定します。
# 設定しない場合、関連するエクスポート機能は利用できません。
# パスは環境に合わせて調整してください。
JUPYTER_PATH="/path/to/jupyter" # 例: /home/user/venv/bin/jupyter
QUARTO_PATH="/path/to/quarto/bin" # 例: /opt/quarto/bin
```

**重要:**
- 必要なAPIキーやクライアントID/シークレットは、各サービスのコンソール等から取得してください。
- `.env.local` ファイルは機密情報を含むため、Gitリポジトリにはコミットしないでください (`.gitignore` に追加されていることを確認してください)。
- ファイルを変更した後は、Next.jsの開発サーバーを**再起動**する必要があります。

### 3. 外部ツール設定 (任意)

特定の機能（Marp/QuartoからのPPTXエクスポートなど）を利用するには、対応する外部ツールのインストールと環境変数 (`JUPYTER_PATH`, `QUARTO_PATH`) の設定が必要です。

- **Jupyter:** MarpからのPPTXエクスポートに内部で使用されることがあります。
- **Quarto:** QuartoドキュメントからのPPTXエクスポートに必要です。

インストール手順の詳細は、[外部ツールのセットアップ](#️-外部ツールのセットアップ)セクションを参照してください。

インストール後、`.env.local` ファイルに `JUPYTER_PATH` と `QUARTO_PATH` を設定し、開発サーバーを再起動してください。


## 📖 使い方

[初期設定](#️-初期設定)が完了したら、アプリケーションを起動して利用できます。

### 共通的な使い方

1.  **開発サーバーを起動:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

2.  **WebSocketターミナル機能について:**
    
    **標準起動方式（推奨）:**
    ```bash
    # 開発サーバーとWebSocketサーバーを同時に起動
    npm run dev
    # or
    pnpm dev
    ```
    
    **個別起動方式:**
    ```bash
    # Next.jsサーバーのみを起動（ポート3001）
    npm run dev:next
    # or
    pnpm dev:next
    
    # 別のターミナルでWebSocketサーバーを起動（デフォルト：ポート3002）
    npm run dev:websocket
    # or
    pnpm dev:websocket
    ```
    
    **本番環境での起動:**
    ```bash
    # アプリケーションをビルド
    npm run build
    # or
    pnpm build
    
    # 本番サーバーとWebSocketサーバーを同時に起動
    npm run start
    # or
    pnpm start
    ```
    
    **注意事項:**
    - **標準起動方式（推奨）:** Next.jsサーバー（ポート3001）とWebSocketサーバー（デフォルト：ポート3002）が同時に起動します
    - **個別起動方式:** 各サーバーを別々に起動できます（デバッグ時などに有用）
    - `node-pty`のビルドが完了していることを確認してください
    - ターミナル機能を無効にするには `.env.local` で `NEXT_PUBLIC_WEBSOCKET_TERMINAL_FLG=OFF` を設定してください
    - WebSocketサーバーのポート番号は `.env` ファイルで `WEBSOCK_LISTEN_PORT=3002` として設定できます（デフォルト：3002）

3.  ブラウザで `http://localhost:3000` (または `.env.local` で指定したポート) を開きます。
3.  **エディタ:** マークダウンテキストを入力・編集します。
4.  **プレビュー:** 分割ビューまたはプレビュータブでレンダリング結果を確認します。
5.  **ツールバー:** 書式設定、表示モード切り替え、ファイル操作などを行います。
6.  **ファイルエクスプローラー:**
    *   左側サイドバーのフォルダアイコンをクリックすると、ファイルエクスプローラーが表示されます。
    *   初期設定ではマークダウンファイル（.md）のみが表示されています。右上のファイルアイコンをクリックすると、すべてのファイルを表示・非表示に切り替えられます。
    *   フォルダをクリックするとフォルダが展開/折りたたまれます。
    *   ファイルをクリックすると、エディタにファイル内容が読み込まれます。
    *   ファイルにカーソルを合わせると、ファイルサイズが表示されます。
    *   パンくずリスト（パスナビゲーション）で上位ディレクトリに移動できます。
    *   `.env.local` ファイルに `FILE_EXPLORER_ROOT_DIR="/path/to/your/directory"` を設定することで、表示するルートディレクトリを変更できます。
7.  **Google Drive連携 (有効な場合):**
    *   ツールバーの「Google Drive連携」スイッチをオンにします。
    *   「Googleでログイン」ボタンをクリックし、[Google Drive連携設定](#1-google-drive連携設定-任意)でテストユーザーとして登録したアカウントでログインします。
    *   認証が成功すると、左側にGoogle DriveのMarkdownファイル一覧が表示されます。
    *   ファイルをクリックすると、内容がエディタに読み込まれます。
    *   エディタで内容を編集し、「Save (Drive)」ボタンをクリックするとGoogle Driveに保存されます。
8.  **ローカル保存:** Google Drive連携をオフにすると、「Save」ボタンでファイルをローカルにダウンロードできます。
9. **AIチャット (有効な場合):**
    *   AIチャットペインを開き、AIと対話します。
    *   `@editor` でエディタ内容を参照させられます。
    *   設定したMCPツールやローカルメモリツール (`memory_get`, `memory_set`) をAIが利用できます。

### ファイルエクスプローラー

ファイルエクスプローラーを使うと、ローカルのファイルシステムから直接マークダウンファイルを開いて編集できます。

1. **アクセス方法:** 
   * 左サイドバーのフォルダアイコンをクリックするとファイルエクスプローラーが表示されます。
   * または画面上部のツールバーから表示/非表示を切り替えられます。

2. **ディレクトリナビゲーション:**
   * フォルダをクリックして展開/折りたたみができます。
   * パスナビゲーション（パンくずリスト）で上位ディレクトリや特定のディレクトリに素早く移動できます。
   * 「上へ」ボタンで親ディレクトリに移動できます。
   * ホームアイコンでルートディレクトリに戻れます。

3. **ファイルフィルタリング:**
   * デフォルトでは`.md`（マークダウン）ファイルのみが表示されます。
   * 右上のファイルアイコンボタンをクリックすると、すべてのファイルタイプの表示/非表示を切り替えられます。
   * マークダウンファイルは左側にカラーバーで視覚的に強調表示されます。

4. **ファイル操作:**
   * ファイルをクリックすると、そのファイルの内容がエディタに読み込まれます。
   * ファイルにマウスオーバーすると、サイズ情報が表示されます。
   * ディレクトリごとに整理されたファイル一覧でコンテンツを管理できます。

5. **ファイルタイプ識別:**
   * 異なるファイルタイプは専用のアイコンで表示されます：
     * マークダウン (`.md`) - 文書アイコン
     * JavaScript/TypeScript (`.js`, `.ts`) - コードアイコン
     * JSON (`.json`) - データアイコン
     * 画像ファイル (`.jpg`, `.png` など) - 画像アイコン
     * その他のファイル - 一般的なファイルアイコン

6. **設定方法:**
   * `.env.local` ファイルに以下の設定を追加して、ファイルエクスプローラーのルートディレクトリを指定できます：
   ```
   FILE_EXPLORER_ROOT_DIR="/path/to/your/documents"
   ```
   * このディレクトリとその下位ディレクトリのファイルのみが表示されます。
   * 設定しない場合はデフォルトディレクトリ（通常はプロジェクトルート）が使用されます。
   * ファイルエクスプローラー機能を完全に無効化するには以下の設定を追加します：
   ```
   NEXT_PUBLIC_FILE_UPLOAD=OFF
   ```
   * この設定を`OFF`にすると、ファイルエクスプローラー機能が無効になり、UIからファイルエクスプローラーボタンも非表示になります。

7. **UI機能:**
   * ダークモード対応 - アプリケーションのテーマ設定に自動的に適応します。
   * ホバーエフェクト - マウスを合わせると項目が強調表示されます。
   * ファイル情報表示 - サイズや更新日時などの追加情報が表示されます。

### Marpプレゼンテーション

1.  **スライド作成:** マークダウンでスライドを作成します (`---` で区切り)。
2.  **ディレクティブ:** Marpディレクティブでテーマなどを設定できます。
    ```markdown
    ---
    marp: true
    theme: default # または gaia, uncover
    size: 16:9
    paginate: true
    header: 'My Header'
    footer: 'My Footer'
    ---

    # スライド1
    コンテンツ...

    ---

    <!-- _class: invert -->
    # スライド2 (反転テーマ)
    コンテンツ...
    ```
3.  **カスタムテーマの利用:**
    *   独自のCSSテーマファイル (例: `my-custom-theme.css`) をプロジェクト内の `public/marp_themes/` ディレクトリに配置します。
    *   配置したCSSファイルのファイル名 (拡張子を除く) を、Markdownフロントマターの `theme` ディレクティブに指定します。
      ```markdown
      ---
      marp: true
      theme: my-custom-theme # public/marp_themes/my-custom-theme.css を参照
      ---

      # カスタムテーマを使ったスライド
      ```
    *   プレビューとPPTXエクスポートの両方でカスタムテーマが適用されます。
4.  **PPTXエクスポート:** ツールバーの「Export to PPTX」ボタンでPowerPointファイルを出力します（[外部ツール設定](#3-外部ツール設定-任意)で `JUPYTER_PATH` の設定が必要な場合があります）。
   
> #### カスタムテーマについて
> `public/marp_themes/`には[Marp Community Themes](https://rnd195.github.io/marp-community-themes/) で公開されているテーマ`academic`、`Beam`、`Border`、`Gradient`、`Graph Paper`、`Rose Pine`、`Rose Pine Dawn`、`Rose Pine Monn`を配置してあります。
> このテーマは、デフォルトのテーマとして使用することも、カスタマイズして使用することも可能です。
> カスタマイズしたい場合は、`public/marp_themes/`に配置したテーマファイルを編集してください。
> また、[Marpのテーマ屋さん](https://marp-themes.nekast.com/)では、カスタマイズしたテーマを公開しています。
> そちらを参考に、自分でカスタマイズしたテーマを作成することも可能です。

### Quartoプレゼンテーション

1.  **ドキュメント作成:** Quarto記法でドキュメントやスライドを作成します。
2.  **PPTX/PDFエクスポート:** ツールバーの「Export Quarto to PPTX」または「Export Quarto to PDF」ボタンで対応する形式のファイルを出力します（[外部ツール設定](#3-外部ツール設定-任意)で `QUARTO_PATH` の設定が必要です）。

### Markmapマインドマップ
Markdownの見出し構造をそのままマインドマップのノード階層として視覚化する機能です。

1.  **マインドマップ作成:**
   ``` 
    ```mindmap
    # メインテーマ
    ## トピック1
    ### サブトピック1-1
    ### サブトピック1-2
    ## トピック2
    ### サブトピック2-1
    #### さらに詳細な項目
    ```
  ```

2.  **プレビュー表示:** プレビューモードで、作成したマインドマップが自動的に表示されます。マインドマップ内では以下の操作が可能です：
    * ズームイン/アウト：マウスホイールで拡大・縮小
    * パン：ドラッグして全体を移動
    * ノードの展開/折りたたみ：ノードをクリックして子ノードの表示/非表示を切り替え

### カスタムプロンプト機能

AIアシスタントのシステムプロンプトをカスタマイズするための機能が追加されました。

#### 使用方法

1. `public/prompt` ディレクトリにMarkdown形式のプロンプトファイルを配置します。
   例：
   ```
   public/prompt/gal.md
   public/prompt/formal.md
   ```

2. `.env` ファイルで `CUSTOM_PROMPT` 環境変数を設定します。
   ```
   CUSTOM_PROMPT=gal.md
   ```

3. アプリケーションを再起動すると、指定したプロンプトファイルの内容がシステムプロンプトに追加されます。

## 📄 ライセンス

[MIT](https://choosealicense.com/licenses/mit/) 