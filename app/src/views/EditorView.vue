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
        <button class="btn btn--secondary" @click="showAboutModal = true">
          <span>ヘルプ</span>
        </button>
        <button class="btn btn--primary" :disabled="!hasModel">
          <span>VRM エクスポート</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="editor-workspace">
      <!-- 3D Viewport Area -->
      <main class="editor-viewport">
        <ThreeCanvas ref="threeCanvas" @vrm-loaded="onVrmLoaded" />
      </main>

      <!-- Sidebar Controls -->
      <aside class="editor-sidebar">
        <!-- Section 1: Avatar Load -->
        <div class="editor-sidebar__section">
          <div class="section-header">
            <h3 class="section-title">アバター読み込み</h3>
            <span v-if="hasModel" class="badge badge--success">読込済</span>
          </div>

          <!-- File Upload Button -->
          <div class="upload-box">
            <input
              ref="fileInput"
              type="file"
              accept=".vrm"
              style="display: none;"
              @change="onFileSelected"
            />
            <button class="btn btn--secondary btn--full" @click="triggerFileInput">
              <span>📁 ローカル VRM を開く</span>
            </button>
            <p class="upload-box__hint">または 3D エリアに直接ドラッグ＆ドロップ</p>
          </div>

          <!-- Preset Test Models Selector -->
          <div class="preset-selector">
            <label class="preset-selector__label">テスト用プリセットモデル:</label>
            <div class="preset-grid">
              <button
                v-for="preset in presetModels"
                :key="preset.id"
                class="preset-card"
                :class="{ 'preset-card--active': currentModelName === preset.name }"
                @click="loadPreset(preset)"
              >
                <span class="preset-card__icon">👤</span>
                <div class="preset-card__info">
                  <span class="preset-card__name">{{ preset.name }}</span>
                  <span class="preset-card__ver">{{ preset.version }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Section 2: Avatar Information -->
        <div v-if="hasModel && currentMeta" class="editor-sidebar__section">
          <h3 class="section-title">モデル情報</h3>
          <div class="meta-list">
            <div class="meta-item">
              <span class="meta-item__key">タイトル:</span>
              <span class="meta-item__value">{{ currentMeta.title }}</span>
            </div>
            <div v-if="currentMeta.authors" class="meta-item">
              <span class="meta-item__key">作者:</span>
              <span class="meta-item__value">{{ currentMeta.authors }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__key">規格:</span>
              <span class="meta-item__value">VRM {{ currentMeta.vrmFormatVersion }}</span>
            </div>
          </div>
        </div>

        <!-- Section 3: Nail Controls -->
        <div class="editor-sidebar__section">
          <NailControlPanel
            @request-attach="onRequestAttach"
            @request-detach="onRequestDetach"
            @select-finger="onSelectFinger"
            @focus-finger="onFocusFinger"
            @transform-change="onTransformChange"
            @reset-transform="onResetTransform"
            @apply-all-transform="onApplyAllTransform"
            @morph-change="onMorphChange"
            @morph-reset="onMorphReset"
          />
        </div>
      </aside>
    </div>

    <!-- About Modal -->
    <div v-if="showAboutModal" class="modal-backdrop" @click.self="showAboutModal = false">
      <div class="modal-card">
        <h2 class="modal-card__title">VRMNailAttacher について</h2>
        <p class="modal-card__body">
          VRM アバターにネイルチップ（爪の 3D モデル）を自動装着し、テクスチャ差し替えや質感調整ができる Web ツールです。
        </p>
        <div class="modal-card__shortcuts">
          <h4>操作方法</h4>
          <ul>
            <li><strong>左ドラッグ</strong>: カメラ回転</li>
            <li><strong>右ドラッグ</strong>: カメラ移動（パン）</li>
            <li><strong>ホイールスクロール</strong>: ズームイン / アウト</li>
          </ul>
        </div>
        <button class="btn btn--primary btn--full" @click="showAboutModal = false">
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Ref } from 'vue-property-decorator';
import ThreeCanvas from '@/components/Viewer/ThreeCanvas.vue';
import NailControlPanel from '@/components/Sidebar/NailControlPanel.vue';
import { PresetModel } from '@/store';
import { VRMModelMeta } from '@/modules/vrm/VRMLoader';
import { FingerId, NailTransform } from '@/modules/nail/types';

@Component({
  components: {
    ThreeCanvas,
    NailControlPanel
  }
})
export default class EditorView extends Vue {
  @Ref('threeCanvas') readonly threeCanvas!: ThreeCanvas;
  @Ref('fileInput') readonly fileInput!: HTMLInputElement;

  private showAboutModal = false;

  get hasModel(): boolean {
    return this.$store.getters.hasModel;
  }

  get currentModelName(): string | null {
    return this.$store.state.currentModelName;
  }

  get currentMeta(): VRMModelMeta | null {
    return this.$store.state.currentMeta;
  }

  get presetModels(): PresetModel[] {
    return this.$store.state.presetModels;
  }

  mounted() {
    // 初期表示時に最初のプリセットモデル（Aki）を自動読み込み
    this.$nextTick(() => {
      if (this.presetModels.length > 0 && !this.hasModel) {
        this.loadPreset(this.presetModels[0]);
      }
    });
  }

  private triggerFileInput() {
    if (this.fileInput) {
      this.fileInput.click();
    }
  }

  private onFileSelected(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.threeCanvas.loadModelFromFile(file);
      target.value = ''; // リセット
    }
  }

  private loadPreset(preset: PresetModel) {
    if (this.threeCanvas) {
      this.threeCanvas.loadModelFromUrl(preset.path, preset.name);
    }
  }

  private onVrmLoaded(payload: { vrm: any; meta: VRMModelMeta }) {
    console.log('VRM successfully loaded:', payload.meta);
  }

  private async onRequestAttach() {
    if (this.threeCanvas) {
      await this.threeCanvas.attachNails();
    }
  }

  private onRequestDetach() {
    if (this.threeCanvas) {
      this.threeCanvas.detachNails();
    }
  }

  private onSelectFinger(fingerId: FingerId) {
    // 選択された指先へ自動でカメラを寄せる
    if (this.threeCanvas) {
      this.threeCanvas.focusFinger(fingerId);
    }
  }

  private onFocusFinger(fingerId: FingerId) {
    if (this.threeCanvas) {
      this.threeCanvas.focusFinger(fingerId);
    }
  }

  private onTransformChange(payload: { fingerId: FingerId; key: keyof NailTransform; value: number }) {
    if (this.threeCanvas) {
      this.threeCanvas.updateNailTransform(payload);
    }
  }

  private onResetTransform(fingerId: FingerId) {
    if (this.threeCanvas) {
      this.threeCanvas.updateNailTransform({ fingerId });
    }
  }

  private onApplyAllTransform() {
    if (this.threeCanvas) {
      this.threeCanvas.updateAllNailTransforms();
    }
  }

  private onMorphChange(payload: { fingerId: FingerId; name: string; value: number }) {
    if (this.threeCanvas) {
      this.threeCanvas.updateNailMorph(payload);
    }
  }

  private onMorphReset(fingerId: FingerId) {
    if (this.threeCanvas) {
      this.threeCanvas.updateNailMorph({ fingerId });
    }
  }
}
</script>

<style lang="scss" scoped>
.editor-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: $bg-primary;
}

/* Header */
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

/* Main Workspace */
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
  background-color: #131418;
}

/* Sidebar */
.editor-sidebar {
  width: 360px;
  height: 100%;
  background-color: $bg-secondary;
  border-left: 1px solid $border-subtle;
  overflow-y: auto;
  padding: $space-md;
  display: flex;
  flex-direction: column;
  gap: $space-md;

  &__section {
    background-color: $bg-tertiary;
    border: 1px solid $border-subtle;
    border-radius: $radius-lg;
    padding: $space-md;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $text-muted;
    line-height: 1.6;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-sm;
}

.section-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
}

/* Badges */
.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: $radius-full;
  font-weight: 600;

  &--success {
    background: rgba(16, 185, 129, 0.2);
    color: $color-success;
  }

  &--info {
    background: rgba(56, 189, 248, 0.2);
    color: $accent-blue;
  }

  &--muted {
    background: rgba(100, 116, 139, 0.2);
    color: $text-muted;
  }
}

/* Upload Box */
.upload-box {
  margin-bottom: $space-md;

  &__hint {
    font-size: 11px;
    color: $text-muted;
    text-align: center;
    margin-top: $space-xs;
  }
}

.btn--full {
  width: 100%;
}

/* Preset Models Grid */
.preset-selector {
  &__label {
    display: block;
    font-size: $font-size-xs;
    color: $text-secondary;
    margin-bottom: $space-xs;
    font-weight: 500;
  }
}

.preset-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: 8px 12px;
  background: $bg-secondary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  text-align: left;
  transition: all $transition-fast;

  &:hover {
    background: $bg-elevated;
    border-color: $border-medium;
  }

  &--active {
    background: rgba(255, 101, 132, 0.15);
    border-color: $accent-pink;

    .preset-card__name {
      color: $accent-pink;
      font-weight: 600;
    }
  }

  &__icon {
    font-size: 1.1rem;
  }

  &__info {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__name {
    font-size: $font-size-xs;
    color: $text-primary;
  }

  &__ver {
    font-size: 10px;
    padding: 1px 6px;
    background: $bg-tertiary;
    border-radius: $radius-sm;
    color: $text-muted;
  }
}

/* Meta list */
.meta-list {
  display: flex;
  flex-direction: column;
  gap: $space-xs;
  font-size: $font-size-xs;
}

.meta-item {
  display: flex;
  justify-content: space-between;

  &__key {
    color: $text-muted;
  }

  &__value {
    color: $text-primary;
    font-weight: 500;
    max-width: 180px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
}

/* Nail Placeholder */
.nail-placeholder {
  padding: $space-sm;
  background: rgba(255, 101, 132, 0.08);
  border: 1px dashed rgba(255, 101, 132, 0.3);
  border-radius: $radius-md;

  &__text {
    font-size: $font-size-xs;
    color: $accent-pink;
    line-height: 1.5;
  }
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: $bg-secondary;
  border: 1px solid $border-medium;
  border-radius: $radius-lg;
  padding: $space-xl;
  max-width: 440px;
  width: 90%;
  box-shadow: $shadow-lg;

  &__title {
    font-size: $font-size-lg;
    color: $text-primary;
    margin-bottom: $space-sm;
  }

  &__body {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
    margin-bottom: $space-md;
  }

  &__shortcuts {
    background: $bg-tertiary;
    padding: $space-md;
    border-radius: $radius-md;
    margin-bottom: $space-lg;

    h4 {
      font-size: $font-size-xs;
      color: $text-primary;
      margin-bottom: $space-xs;
    }

    ul {
      list-style: none;
      font-size: $font-size-xs;
      color: $text-secondary;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }
}
</style>
