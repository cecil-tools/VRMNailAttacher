# AGENTS.md

本リポジトリで作業を行う AI コーディングアシスタント（エージェント）向けの開発ガイドラインおよびプロジェクト規約です。

## 作業ディレクトリに関する最重要規則

> [!IMPORTANT]
> アプリケーションのコードおよび設定ファイルはすべて `app/` 配下に存在します。
> `npm` コマンド（`npm run serve`, `npm run build`, `npm run lint`, `npm install` など）を実行する際は、**必ずカレントディレクトリを `app/` に指定して実行してください。**

## 技術スタック

- **Node.js**: `v24.12.0` 推奨
  - ※Vue CLI の実行には `NODE_OPTIONS='--openssl-legacy-provider'` が必要（`package.json` の各スクリプトに組み込み済み）。
- **フレームワーク**: Vue.js 2.6.x
  - クラスコンポーネント記法 (`vue-class-component`, `vue-property-decorator`)
  - 状態管理: Vuex 3.4.x
  - ルーティング: Vue Router 3.2.x
- **言語**: TypeScript / JavaScript
- **3D ライブラリ**:
  - Three.js (`three` ^0.160.0, `@pixiv/three-vrm` ^2.0.8, `@pixiv/types-vrm-0.0` ^2.0.0)
- **スタイリング**: SCSS / SASS
- **ホスティング・バックエンド**: Firebase (Hosting)

---

## 開発コマンド

すべてのコマンドは `app/` ディレクトリで実行します。

| コマンド | 説明 | 備考 |
| :--- | :--- | :--- |
| `npm run serve` | 開発サーバー起動 | `http://localhost:8080` で起動 |
| `npm run build` | 本番用ビルド | `dist/` に成果物が出力される |
| `npm run lint` | ESLint によるコード検証 | |
| `npm run deploy`| Firebase へのデプロイ | `npm run build && firebase deploy` |
