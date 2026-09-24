<template>
  <div
    class="three-canvas-container"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- WebGL Canvas Host -->
    <div ref="canvasHost" class="canvas-host"></div>

    <!-- Drag & Drop Overlay -->
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-overlay__content">
        <span class="drag-overlay__icon">📂</span>
        <p class="drag-overlay__text">VRM ファイルをここにドロップしてください</p>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-card">
        <div class="loading-spinner"></div>
        <p class="loading-card__message">{{ loadingMessage || '読み込み中...' }}</p>
        <div class="loading-bar">
          <div class="loading-bar__fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <span class="loading-card__percent">{{ loadingProgress }}%</span>
      </div>
    </div>

    <!-- Viewport Controls Overlay (Floating) -->
    <div class="viewport-toolbar">
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentPreset === 'hands' }"
          title="手元・ネイルフォーカス"
          @click="changeCamera('hands')"
        >
          <span>💅 手元</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentPreset === 'leftHand' }"
          title="左手フォーカス"
          @click="changeCamera('leftHand')"
        >
          <span>左手</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentPreset === 'rightHand' }"
          title="右手フォーカス"
          @click="changeCamera('rightHand')"
        >
          <span>右手</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentPreset === 'upper' }"
          title="上半身"
          @click="changeCamera('upper')"
        >
          <span>上半身</span>
        </button>
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': currentPreset === 'full' }"
          title="全身"
          @click="changeCamera('full')"
        >
          <span>全身</span>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': gridVisible }"
          title="グリッド表示切り替え"
          @click="toggleGrid"
        >
          <span>🌐 グリッド</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Ref } from 'vue-property-decorator';
import { SceneManager, CameraPreset } from '@/modules/three/SceneManager';
import { VRMLoader } from '@/modules/vrm/VRMLoader';
import { VRM } from '@pixiv/three-vrm';

@Component
export default class ThreeCanvas extends Vue {
  @Ref('canvasHost') readonly canvasHost!: HTMLElement;

  private sceneManager: SceneManager | null = null;
  private vrmLoader: VRMLoader = new VRMLoader();
  private isDragging = false;
  private currentPreset: CameraPreset = 'hands';
  private gridVisible = true;

  get isLoading(): boolean {
    return this.$store.state.isLoading;
  }

  get loadingProgress(): number {
    return this.$store.state.loadingProgress;
  }

  get loadingMessage(): string {
    return this.$store.state.loadingMessage;
  }

  mounted() {
    this.initThree();
  }

  beforeDestroy() {
    this.cleanup();
  }

  private initThree() {
    if (!this.canvasHost) return;
    this.sceneManager = new SceneManager(this.canvasHost);

    // アニメーションループ内での VRM 更新コールバック
    this.sceneManager.onUpdate((delta) => {
      if (this.vrmLoader.currentVRM) {
        this.vrmLoader.currentVRM.update(delta);
      }
    });

    // 初期カメラを「手元フォーカス」に設定
    this.sceneManager.setCameraPreset('hands');
  }

  public async loadModelFromUrl(url: string, name: string): Promise<VRM | null> {
    if (!this.sceneManager) return null;

    try {
      this.$store.commit('setLoading', {
        isLoading: true,
        progress: 0,
        message: `${name} を読み込み中...`
      });

      // 既存のモデルをアンロード
      if (this.vrmLoader.currentVRM) {
        this.sceneManager.scene.remove(this.vrmLoader.currentVRM.scene);
        this.vrmLoader.unload();
      }

      const vrm = await this.vrmLoader.loadFromUrl(url, (progress) => {
        this.$store.commit('setLoading', {
          isLoading: true,
          progress,
          message: `${name} を読み込み中...`
        });
      });

      // ネイル確認用ポーズを適用してシーンに追加
      this.vrmLoader.applyNailInspectionPose(vrm);
      this.sceneManager.scene.add(vrm.scene);

      // メタ情報をストアに登録
      const meta = this.vrmLoader.extractMeta(vrm);
      this.$store.commit('setModel', { name, meta });

      this.$emit('vrm-loaded', { vrm, meta });
      return vrm;
    } catch (err: any) {
      console.error('VRM load error:', err);
      alert('VRMモデルの読み込みに失敗しました: ' + (err.message || '不明なエラー'));
      return null;
    } finally {
      this.$store.commit('setLoading', { isLoading: false });
    }
  }

  public async loadModelFromFile(file: File): Promise<VRM | null> {
    if (!this.sceneManager) return null;

    try {
      this.$store.commit('setLoading', {
        isLoading: true,
        progress: 0,
        message: `${file.name} を読み込み中...`
      });

      if (this.vrmLoader.currentVRM) {
        this.sceneManager.scene.remove(this.vrmLoader.currentVRM.scene);
        this.vrmLoader.unload();
      }

      const vrm = await this.vrmLoader.loadFromFile(file, (progress) => {
        this.$store.commit('setLoading', {
          isLoading: true,
          progress,
          message: `${file.name} を読み込み中...`
        });
      });

      this.vrmLoader.applyNailInspectionPose(vrm);
      this.sceneManager.scene.add(vrm.scene);

      const meta = this.vrmLoader.extractMeta(vrm);
      this.$store.commit('setModel', { name: file.name, meta });

      this.$emit('vrm-loaded', { vrm, meta });
      return vrm;
    } catch (err: any) {
      console.error('VRM file load error:', err);
      alert('VRMモデルの読み込みに失敗しました: ' + (err.message || '不明なエラー'));
      return null;
    } finally {
      this.$store.commit('setLoading', { isLoading: false });
    }
  }

  public changeCamera(preset: CameraPreset) {
    this.currentPreset = preset;
    if (this.sceneManager) {
      this.sceneManager.setCameraPreset(preset);
    }
  }

  public toggleGrid() {
    if (this.sceneManager) {
      this.gridVisible = this.sceneManager.toggleGrid();
    }
  }

  // ドラッグ＆ドロップ処理
  private onDragOver() {
    this.isDragging = true;
  }

  private onDragLeave() {
    this.isDragging = false;
  }

  private onDrop(e: DragEvent) {
    this.isDragging = false;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.name.toLowerCase().endsWith('.vrm')) {
      this.loadModelFromFile(file);
    } else {
      alert('VRM形式（.vrm）のファイルをドロップしてください。');
    }
  }

  public getCurrentVRM(): VRM | null {
    return this.vrmLoader.currentVRM;
  }

  private cleanup() {
    if (this.vrmLoader.currentVRM && this.sceneManager) {
      this.sceneManager.scene.remove(this.vrmLoader.currentVRM.scene);
      this.vrmLoader.unload();
    }
    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }
  }
}
</script>

<style lang="scss" scoped>
.three-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #131418;
}

.canvas-host {
  width: 100%;
  height: 100%;
}

/* Drag & Drop Overlay */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 101, 132, 0.2);
  border: 3px dashed $accent-pink;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  pointer-events: none;

  &__content {
    background: $bg-secondary;
    padding: $space-lg $space-xl;
    border-radius: $radius-lg;
    text-align: center;
    box-shadow: $shadow-lg;
  }

  &__icon {
    font-size: 3rem;
    display: block;
    margin-bottom: $space-sm;
  }

  &__text {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(18, 19, 22, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

.loading-card {
  background: $bg-secondary;
  border: 1px solid $border-medium;
  border-radius: $radius-lg;
  padding: $space-xl;
  width: 320px;
  text-align: center;
  box-shadow: $shadow-lg;

  &__message {
    font-size: $font-size-sm;
    font-weight: 500;
    margin: $space-md 0 $space-sm;
    color: $text-primary;
  }

  &__percent {
    font-size: $font-size-xs;
    color: $text-muted;
    font-weight: 600;
  }
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 101, 132, 0.2);
  border-top-color: $accent-pink;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-bar {
  width: 100%;
  height: 6px;
  background: $bg-tertiary;
  border-radius: $radius-full;
  overflow: hidden;
  margin-bottom: $space-xs;

  &__fill {
    height: 100%;
    background: $accent-gradient;
    transition: width 0.2s ease;
  }
}

/* Floating Viewport Toolbar */
.viewport-toolbar {
  position: absolute;
  bottom: $space-lg;
  left: 50%;
  transform: translateX(-50%);
  background: $bg-glass;
  backdrop-filter: blur(12px);
  border: 1px solid $border-subtle;
  border-radius: $radius-full;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: $space-sm;
  box-shadow: $shadow-md;
  z-index: 20;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: $border-subtle;
  margin: 0 4px;
}

.toolbar-btn {
  padding: 6px 12px;
  border-radius: $radius-full;
  font-size: $font-size-xs;
  font-weight: 500;
  color: $text-secondary;
  background: transparent;
  transition: all $transition-fast;

  &:hover {
    color: $text-primary;
    background: rgba(255, 255, 255, 0.08);
  }

  &--active {
    color: #ffffff;
    background: rgba(255, 101, 132, 0.25);
    border: 1px solid rgba(255, 101, 132, 0.4);

    &:hover {
      background: rgba(255, 101, 132, 0.35);
    }
  }
}
</style>
