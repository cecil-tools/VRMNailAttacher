<template>
  <div class="editor-view">
    <!-- Header -->
    <header class="editor-header">
      <div class="editor-header__brand">
        <span class="editor-header__logo">💅</span>
        <h1 class="editor-header__title">VRMNailAttacher</h1>
        <span class="editor-header__tag">Alpha</span>
      </div>
      <div class="editor-header__actions">
        <button class="btn btn--secondary" disabled>
          <span>ヘルプ</span>
        </button>
        <button class="btn btn--primary" disabled>
          <span>VRM エクスポート</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="editor-workspace">
      <!-- 3D Viewport Placeholder -->
      <main class="editor-viewport">
        <div class="editor-viewport__placeholder">
          <div class="editor-viewport__icon">🎨</div>
          <h2 class="editor-viewport__heading">3D ビューアー準備中</h2>
          <p class="editor-viewport__description">
            VRM モデルをドラッグ＆ドロップするか、サイドバーから選択してください
          </p>
        </div>
      </main>

      <!-- Sidebar Controls Placeholder -->
      <aside class="editor-sidebar">
        <div class="editor-sidebar__section">
          <h3 class="editor-sidebar__title">アバター読み込み</h3>
          <p class="editor-sidebar__hint">VRM (0.x / 1.0) を選択してください</p>
          <button class="btn btn--secondary" style="width: 100%;">
            ファイルを選択
          </button>
        </div>

        <div class="editor-sidebar__section">
          <h3 class="editor-sidebar__title">ネイル設定</h3>
          <p class="editor-sidebar__hint">アバター読み込み後に有効化されます</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class EditorView extends Vue {}
</script>

<style lang="scss" scoped>
.editor-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: $bg-primary;
}

.editor-header {
  height: 56px;
  background-color: $bg-secondary;
  border-bottom: 1px solid $border-subtle;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-lg;
  z-index: 10;

  &__brand {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__logo {
    font-size: 1.5rem;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  &__tag {
    font-size: $font-size-xs;
    padding: 2px 8px;
    background: rgba(255, 101, 132, 0.15);
    color: $accent-pink;
    border-radius: $radius-full;
    font-weight: 600;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $space-md;
  }
}

.editor-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.editor-viewport {
  flex: 1;
  height: 100%;
  position: relative;
  background: radial-gradient(circle at center, #1e222d 0%, #121316 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  &__placeholder {
    text-align: center;
    max-width: 400px;
    padding: $space-xl;
  }

  &__icon {
    font-size: 3rem;
    margin-bottom: $space-md;
  }

  &__heading {
    font-size: $font-size-xl;
    font-weight: 600;
    margin-bottom: $space-sm;
    color: $text-primary;
  }

  &__description {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
  }
}

.editor-sidebar {
  width: 360px;
  height: 100%;
  background-color: $bg-secondary;
  border-left: 1px solid $border-subtle;
  overflow-y: auto;
  padding: $space-lg;
  display: flex;
  flex-direction: column;
  gap: $space-lg;

  &__section {
    background-color: $bg-tertiary;
    border: 1px solid $border-subtle;
    border-radius: $radius-lg;
    padding: $space-md;
  }

  &__title {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: $space-xs;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $text-muted;
    margin-bottom: $space-md;
  }
}
</style>
