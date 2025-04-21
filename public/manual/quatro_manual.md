# Quarto マニュアル：科学向けドキュメント作成ガイド

## はじめに

Quartoは、科学技術文書を作成するためのオープンソースパブリッシングシステムです。Pandoc上に構築されたQuartoは、マークダウンを使用して再現性の高い文書を作成することができます。コード、数式、画像、引用、相互参照など、科学論文に必要な要素を簡単に組み込むことができるのが特徴です。

このマニュアルでは、Quartoの基本的な使い方から実践的なテクニックまでをカバーし、科学文書作成のための手引きを提供します。

## 1. Quartoの基礎

### 1.1 Quartoとは

Quartoは、R MarkdownやJupyter Notebookの次世代版として位置づけられるパブリッシングシステムです。Python、R、Julia、JavaScriptなど複数のプログラミング言語をサポートし、HTML、PDF、MS Word、ePubなど様々な形式での出力が可能です。

Quartoの主な特徴：

- **再現性**: コードと文書を一体化させることで、データ分析の再現性を確保
- **多言語対応**: R、Python、Julia、JavaScriptなど複数の言語をサポート
- **豊富な出力形式**: HTML、PDF、MS Word、ePubなど多様な形式に出力可能
- **拡張性**: Pandocのマークダウン構文に加え、相互参照や複数画像の配置など便利な拡張機能を提供
- **使いやすさ**: ビジュアルエディタを含む様々なエディタをサポート

### 1.2 基本的な使い方

#### 基本的なワークフロー

1. Quartoファイル（.qmd）を作成する
2. YAMLヘッダーでドキュメント設定を指定する
3. マークダウンでテキストを記述し、コードブロックでコードを実行する
4. `quarto render` コマンドでドキュメントをレンダリングする

#### 簡単な例

```markdown
---
title: "はじめてのQuartoドキュメント"
author: "あなたの名前"
format: html
---
```

#### ヘッダの例

PDF変換時に日本語含めて表示する際には以下を指定してください。
```markdown
---
title: "Quarto Basics"
format: pdf
pdf-engine: lualatex
documentclass: ltjsarticle 
editor: visual
jupter: python3
---
```
PowerPoint変換時に日本語含めて表示する際には以下を指定してください。

```markdown
---
title: "Quarto Basics"
format:
 html:
  code-fold: true
jupter: python3
---
```

上記は一例です。様々なカスタム方法があります。

## はじめに

これはQuartoを使った最初のドキュメントです。

## コード実行例

```{python}
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title("正弦波")
plt.show()
```EOF
```

## 2. ドキュメント作成テクニック

### 2.1 マークダウン記法の拡張

Quartoは標準的なマークダウンに加え、Pandocの拡張構文をサポートしています。

#### 基本的なマークダウン構文

- **見出し**: `#` (レベル1) から `######` (レベル6)
- **テキスト書式**: `*イタリック*`, `**太字**`, `~~取り消し線~~`
- **リスト**: `-` または `1.` で開始する行（重要：リストの前には空行が必要）
- **リンク**: `[リンクテキスト](URL)`
- **画像**: `![代替テキスト](画像パス)`

#### Quartoの拡張構文

- **Divs と Spans**: `:::` または `[]{.class}` を使用した書式設定
- **コールアウトブロック**: 重要情報を強調表示
  ```
  :::{.callout-note}
  これは注釈です。
  :::
  ```
- **タブセット**:
  ```
  ::: {.panel-tabset}
  ## タブ1
  タブ1の内容
  
  ## タブ2
  タブ2の内容
  :::
  ```

### 2.2 科学文書のための機能

#### 数式

LaTeX形式の数式をサポートしています：

- インライン数式: `$E = mc^2$`
- ディスプレイ数式: 
  ```
  $$
  \frac{\partial \mathrm C}{ \partial \mathrm t } + \frac{1}{2}\sigma^{2} \mathrm S^{2} \frac{\partial^{2} \mathrm C}{\partial \mathrm C^2} + \mathrm r \mathrm S \frac{\partial \mathrm C}{\partial \mathrm S}\ = \mathrm r \mathrm C
  $$
  ```

数式に参照用のラベルを付けることも可能です：

```
$$
P(X=k) = \binom{n}{k} p^k (1-p)^{n-k}
$$ {#eq-binomial}

この式 @eq-binomial は二項分布の確率質量関数です。
```

#### 引用と参考文献

BibTeXファイルを使用した引用の例：

```yaml
---
title: "引用の例"
bibliography: references.bib
---

@knuth1984 によれば、テクニカルライティングでは...
```

引用構文：
- `@citekey`: 著者名 (年)
- `[@citekey]`: (著者名, 年)
- `[-@citekey]`: 年のみ

#### 相互参照

ドキュメント内の図表、数式、セクションなどを参照する機能：

```markdown
## データ分析 {#sec-analysis}

@sec-analysis で述べたように...

![データの分布](histogram.png){#fig-histogram}

@fig-histogram に示すように...

| 項目 | 値 |  
|---|---|  
| A | 10 |  
| B | 20 |  
: サンプルデータ {#tbl-sample}

@tbl-sample のデータから...
```

相互参照のプレフィックス：
- セクション: `#sec-`
- 図: `#fig-`
- 表: `#tbl-`
- 数式: `#eq-`

### 2.3 コードと実行結果の管理

#### コードブロックオプション

コードブロックには多くのオプションがあります：

```markdown
```{python}
#| label: fig-scatter
#| fig-cap: "散布図の例"
#| warning: false
#| echo: true

import matplotlib.pyplot as plt
import numpy as np

x = np.random.randn(100)
y = x + np.random.randn(100) * 0.5
plt.scatter(x, y)
plt.show()
```EOF
```

主なコードブロックオプション：
- `label`: 図などの参照に使用するラベル
- `fig-cap`: 図のキャプション
- `echo`: コードを出力に含めるかどうか
- `eval`: コードを実行するかどうか
- `warning`: 警告メッセージを表示するかどうか
- `code-fold`: コードを折りたたむかどうか

#### コードの実行方法

Quartoでは、コードの実行にKnitrかJupyterが使用されます：

- Rコード: Knitrエンジンで実行
- Python/Julia: Jupyterエンジンで実行
- 複数言語の混在: 可能（例：RとPythonをreticulate経由で混在）

### 2.4 レイアウトとデザイン

#### ページレイアウト

特に論文形式では、ページレイアウトを細かく制御できます：

```yaml
format:
  html:
    css: custom.css
    page-layout: article
  pdf:
    geometry:
      - margin=1in
    documentclass: article
```

#### カラムレイアウト

コンテンツを複数カラムに分割する例：

```markdown
::: {layout-ncol=2}
## 左カラム

左カラムの内容

## 右カラム

右カラムの内容
:::
```

## 3. 実践的なテンプレート

以下では、科学文書作成のための実用的なテンプレートをいくつか紹介します。

### 3.1 科学論文テンプレート

```yaml
---
title: "科学論文タイトル"
author:
  - name: "著者名1"
    affiliation: "所属1"
    orcid: "0000-0000-0000-0000"
  - name: "著者名2"
    affiliation: "所属2"
abstract: |
  論文の要旨をここに記述します。複数段落にまたがる場合は
  このように | 記号を使用します。
keywords: [keyword1, keyword2, keyword3]
date: last-modified
format:
  html:
    toc: true
    toc-depth: 3
    number-sections: true
  pdf:
    toc: true
    number-sections: true
    fontfamily: "times"
bibliography: references.bib
csl: nature.csl
---

# 序論

研究の背景と目的について述べます。@someone2023 によれば...

# 方法

## 実験設計

## データ収集

# 結果

```{r}
#| label: fig-results
#| fig-cap: "実験結果"
#| warning: false

# Rコードで結果のグラフを生成
```　

@fig-results に示すように...

# 考察

# 結論

# 参考文献
```

### 3.2 技術レポートテンプレート

```yaml
---
title: "技術レポート"
subtitle: "サブタイトル"
author: "著者名"
date: today
format:
  html:
    code-fold: true
    toc: true
    toc-location: left
    theme: cosmo
  pdf:
    toc: true
    number-sections: true
jupyter: python3
---

# 概要

このレポートでは...

# データ分析

## データの概要

```{python}
#| label: tbl-data
#| tbl-cap: "データサマリー"

import pandas as pd
import numpy as np

# データ読み込みとサマリー表示
data = pd.DataFrame({
    'x': np.random.normal(0, 1, 100),
    'y': np.random.normal(0, 1, 100)
})
data.describe()
```EOF

## 可視化

```{python}
#| label: fig-viz
#| fig-cap: "データの可視化"
#| fig-width: 8
#| fig-height: 6

import matplotlib.pyplot as plt
import seaborn as sns

plt.figure(figsize=(10, 6))
sns.scatterplot(data=data, x='x', y='y')
plt.title('散布図')
plt.show()
```EOF

# 結論

分析の結果、以下のことが明らかになりました...
```

### 3.3 プレゼンテーションテンプレート

```yaml
---
title: "プレゼンテーションタイトル"
author: "発表者名"
institute: "所属機関"
date: last-modified
format:
  revealjs:
    theme: simple
    slide-number: true
    code-fold: true
    preview-links: auto
    footer: "フッターテキスト"
---

## はじめに

- 発表の概要
- 背景情報

## データと方法

```{python}
#| echo: true

import matplotlib.pyplot as plt
import numpy as np

# データと方法の説明コード
```EOF

## 結果

![結果のグラフ](graph.png){fig-align="center" width="80%"}

## 数式の例

$$
E = mc^2
$$ {#eq-einstein}

@eq-einstein は有名なアインシュタインの質量エネルギー等価式です。

## 引用と参考文献

このプレゼンテーションは @key2023 の研究に基づいています。

## まとめ

- 主な発見
- 今後の展望
- 質問
```



Quartoは科学技術ドキュメントを効率的に作成するための強力なツールです。このマニュアルで紹介した基本から応用までの技術を活用して、再現性の高い高品質な科学文書を作成してください。

## 参考リンク

- [Quarto公式ドキュメント](https://quarto.org/docs/guide/)
- [Quarto Gallery (サンプル集)](https://quarto.org/docs/gallery/)
- [Quarto for Scientists](https://qmd4sci.njtierney.com/)