<template>
  <div class="editor-view">
    <!-- Header -->
    <header class="editor-header">
      <div class="editor-header__brand">
        <span class="editor-header__logo">💅</span>
        <div class="editor-header__title-group">
          <h1 class="editor-header__title">{{ $t('header.title') }}</h1>
          <span class="editor-header__subtitle">{{ $t('header.subtitle') }}</span>
        </div>
        <span class="editor-header__tag">{{ $t('common.alpha') }}</span>
      </div>
      <div class="editor-header__actions">
        <!-- Language Selector -->
        <div class="locale-selector">
          <select
            :value="currentLocale"
            class="locale-select"
            title="Language"
            @change="onLocaleChange($event.target.value)"
          >
            <option
              v-for="item in supportedLocales"
              :key="item.code"
              :value="item.code"
            >
              {{ item.flag }} {{ item.label }}
            </option>
          </select>
        </div>

        <button class="btn btn--secondary" @click="showAboutModal = true">
          <span>{{ $t('header.help') }}</span>
        </button>
        <button class="btn btn--primary" :disabled="!hasModel" @click="openExportModal">
          <span>{{ $t('header.export') }}</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="editor-workspace">
      <!-- 3D Viewport Area -->
      <main
        class="editor-viewport"
        :class="{ 'editor-viewport--fullscreen': isMobileFullscreen3D }"
      >
        <ThreeCanvas
          ref="threeCanvas"
          @vrm-loaded="onVrmLoaded"
          @capture="onCanvasCapture"
        />

        <!-- Viewport Top Actions (Capture & Mobile View Toggle) -->
        <div class="viewport-top-actions">
          <button
            type="button"
            class="btn-viewport-action btn-viewport-action--capture"
            :title="$t('viewport.titleCapture')"
            @click="triggerCapture"
          >
            <span class="btn-viewport-action__icon">📷</span>
            <span class="btn-viewport-action__label">{{ $t('viewport.capture') }}</span>
          </button>

          <!-- Mobile View Mode Toggle Button -->
          <button
            type="button"
            class="btn-viewport-action btn-viewport-action--toggle"
            :title="isMobileFullscreen3D ? $t('viewport.toggleSettings') : $t('viewport.fullscreen3D')"
            @click="isMobileFullscreen3D = !isMobileFullscreen3D"
          >
            <span>{{ isMobileFullscreen3D ? $t('viewport.toggleSettings') : $t('viewport.fullscreen3D') }}</span>
          </button>
        </div>
      </main>

      <!-- Sidebar Controls -->
      <aside v-show="!isMobileFullscreen3D" class="editor-sidebar">
        <!-- Section 1: Avatar Load -->
        <div class="editor-sidebar__section">
          <div class="section-header">
            <h3 class="section-title">{{ $t('avatarLoad.title') }}</h3>
            <span v-if="hasModel" class="badge badge--success">{{ $t('avatarLoad.loaded') }}</span>
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
              <span>{{ $t('avatarLoad.openLocal') }}</span>
            </button>
            <p class="upload-box__hint">{{ $t('avatarLoad.dragDropHint') }}</p>
          </div>

          <!-- Preset Test Models Selector -->
          <div class="preset-selector">
            <label class="preset-selector__label">{{ $t('avatarLoad.presetLabel') }}</label>
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
          <h3 class="section-title">{{ $t('modelInfo.title') }}</h3>
          <div class="meta-list">
            <div class="meta-item">
              <span class="meta-item__key">{{ $t('modelInfo.modelTitle') }}</span>
              <span class="meta-item__value">{{ currentMeta.title }}</span>
            </div>
            <div v-if="currentMeta.authors" class="meta-item">
              <span class="meta-item__key">{{ $t('modelInfo.author') }}</span>
              <span class="meta-item__value">{{ currentMeta.authors }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-item__key">{{ $t('modelInfo.format') }}</span>
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
            @global-scale-change="onGlobalScaleChange"
            @reset-global-scale="onResetGlobalScale"
            @texture-change="onTextureChange"
            @material-type-change="onMaterialTypeChange"
            @morph-change="onMorphChange"
            @morph-reset="onMorphReset"
          />
        </div>
      </aside>
    </div>

    <!-- Help / About Modal -->
    <div v-if="showAboutModal" class="modal-backdrop" @click.self="showAboutModal = false">
      <div class="modal-card modal-card--help">
        <div class="modal-card__header">
          <div class="modal-card__header-title">
            <span class="modal-card__icon">💅</span>
            <h2 class="modal-card__title">{{ $t('helpModal.title') }}</h2>
          </div>
          <button class="modal-card__close" :title="$t('common.close')" @click="showAboutModal = false">✕</button>
        </div>

        <!-- Help Tabs -->
        <div class="help-tabs">
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'guide' }"
            @click="activeHelpTab = 'guide'"
          >
            <span>{{ $t('helpModal.tabGuide') }}</span>
          </button>
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'camera' }"
            @click="activeHelpTab = 'camera'"
          >
            <span>{{ $t('helpModal.tabCamera') }}</span>
          </button>
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'fitting' }"
            @click="activeHelpTab = 'fitting'"
          >
            <span>{{ $t('helpModal.tabFitting') }}</span>
          </button>
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'texture' }"
            @click="activeHelpTab = 'texture'"
          >
            <span>{{ $t('helpModal.tabTexture') }}</span>
          </button>
        </div>

        <!-- Modal Body Content (Scrollable) -->
        <div class="modal-card__scroll">
          <!-- Tab 1: 基本の流れ -->
          <div v-if="activeHelpTab === 'guide'" class="help-content">
            <div class="help-lead">
              {{ $t('helpModal.lead') }}
            </div>
            <div class="help-steps">
              <div class="help-step-item">
                <span class="help-step-item__num">1</span>
                <div class="help-step-item__body">
                  <strong>{{ $t('helpModal.step1Title') }}</strong>
                  <p>{{ $t('helpModal.step1Desc') }}</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">2</span>
                <div class="help-step-item__body">
                  <strong>{{ $t('helpModal.step2Title') }}</strong>
                  <p>{{ $t('helpModal.step2Desc') }}</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">3</span>
                <div class="help-step-item__body">
                  <strong>{{ $t('helpModal.step3Title') }}</strong>
                  <p>{{ $t('helpModal.step3Desc') }}</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">4</span>
                <div class="help-step-item__body">
                  <strong>{{ $t('helpModal.step4Title') }}</strong>
                  <p>{{ $t('helpModal.step4Desc') }}</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">5</span>
                <div class="help-step-item__body">
                  <strong>{{ $t('helpModal.step5Title') }}</strong>
                  <p>{{ $t('helpModal.step5Desc') }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 2: カメラ・視点操作 -->
          <div v-if="activeHelpTab === 'camera'" class="help-content">
            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.mouseControlsTitle') }}</h4>
              <table class="help-table">
                <tbody>
                  <tr>
                    <th>{{ $t('helpModal.mouseOrbit') }}</th>
                    <td>{{ $t('helpModal.mouseOrbitDesc') }}</td>
                  </tr>
                  <tr>
                    <th>{{ $t('helpModal.mousePan') }}</th>
                    <td>{{ $t('helpModal.mousePanDesc') }}</td>
                  </tr>
                  <tr>
                    <th>{{ $t('helpModal.mouseZoom') }}</th>
                    <td>{{ $t('helpModal.mouseZoomDesc') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.cameraToolbarTitle') }}</h4>
              <div class="help-badge-list">
                <div class="help-badge-item">
                  <span class="help-badge-item__name">{{ $t('viewport.focusFingertip') }}</span>
                  <span class="help-badge-item__desc">{{ $t('helpModal.badgeFingertipDesc') }}</span>
                </div>
                <div class="help-badge-item">
                  <span class="help-badge-item__name">{{ $t('viewport.focusHands') }} / {{ $t('viewport.focusLeftHand') }} / {{ $t('viewport.focusRightHand') }}</span>
                  <span class="help-badge-item__desc">{{ $t('helpModal.badgeHandsDesc') }}</span>
                </div>
                <div class="help-badge-item">
                  <span class="help-badge-item__name">{{ $t('viewport.angleTop') }} / {{ $t('viewport.angleNormal') }}</span>
                  <span class="help-badge-item__desc">{{ $t('helpModal.badgeTopAngleDesc') }}</span>
                </div>
                <div class="help-badge-item">
                  <span class="help-badge-item__name">{{ $t('viewport.poseOpenHand') }} / {{ $t('viewport.poseTPose') }}</span>
                  <span class="help-badge-item__desc">{{ $t('helpModal.badgePoseDesc') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 3: ネイル調整のコツ -->
          <div v-if="activeHelpTab === 'fitting'" class="help-content">
            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.globalScaleTitle') }}</h4>
              <p class="help-text">
                {{ $t('helpModal.globalScaleDesc1') }}
              </p>
              <p class="help-text">
                {{ $t('helpModal.globalScaleDesc2') }}
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.fingerFittingTitle') }}</h4>
              <p class="help-text">
                {{ $t('helpModal.fingerFittingDesc') }}
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.symmetryTitle') }}</h4>
              <p class="help-text">
                {{ $t('helpModal.symmetryDesc') }}
              </p>
            </div>
          </div>

          <!-- Tab 4: テクスチャ・自作デザイン -->
          <div v-if="activeHelpTab === 'texture'" class="help-content">
            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.scopeTitle') }}</h4>
              <p class="help-text">
                {{ $t('helpModal.scopeDesc') }}
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.uploadHelpTitle') }}</h4>
              <p class="help-text">
                {{ $t('helpModal.uploadHelpDesc') }}
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">{{ $t('helpModal.templateDownloadTitle') }}</h4>
              <p class="help-text">
                {{ $t('helpModal.templateDownloadDesc') }}
              </p>
              <ul class="help-feature-list">
                <li><strong>{{ $t('helpModal.templateListBase') }}</strong></li>
                <li><strong>{{ $t('helpModal.templateListUV') }}</strong></li>
                <li><strong>{{ $t('helpModal.templateListPsd') }}</strong></li>
              </ul>
              <p class="help-subtext">
                {{ $t('helpModal.templateNote') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-card__footer">
          <button class="btn btn--primary btn--full" @click="showAboutModal = false">
            {{ $t('common.close') }}
          </button>
        </div>
      </div>
    </div>

    <!-- VRM Export Modal -->
    <ExportModal
      :visible="showExportModal"
      :default-model-name="currentModelName || ''"
      :default-title="currentMeta ? currentMeta.title : ''"
      :default-authors="currentMeta ? currentMeta.authors : ''"
      :vrm-version="currentMeta ? currentMeta.vrmFormatVersion : '0.x'"
      :attached-count="attachedNailCount"
      :material-type="currentMaterialType"
      :is-exporting="isExporting"
      :error-message="exportErrorMessage"
      @close="closeExportModal"
      @export="onExecuteExport"
    />

    <!-- Photo Capture Modal -->
    <CaptureModal
      :visible="showCaptureModal"
      :image-data-url="captureDataUrl"
      :image-blob="captureBlob"
      :avatar-name="currentModelName || 'avatar'"
      @close="closeCaptureModal"
      @retake="onRetakeCapture"
      @toggle-transparent="onToggleCaptureTransparent"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Ref, Watch } from 'vue-property-decorator';
import ThreeCanvas from '@/components/Viewer/ThreeCanvas.vue';
import NailControlPanel from '@/components/Sidebar/NailControlPanel.vue';
import ExportModal, { ExportFormPayload } from '@/components/Modal/ExportModal.vue';
import CaptureModal from '@/components/Modal/CaptureModal.vue';
import { PresetModel } from '@/store';
import { VRMModelMeta } from '@/modules/vrm/VRMLoader';
import { FingerId, NailTransform, NailMaterialType } from '@/modules/nail/types';
import { SUPPORTED_LOCALES, setAppLocale, SupportedLocale } from '@/plugins/i18n';

@Component({
  components: {
    ThreeCanvas,
    NailControlPanel,
    ExportModal,
    CaptureModal
  }
})
export default class EditorView extends Vue {
  @Ref('threeCanvas') readonly threeCanvas!: ThreeCanvas;
  @Ref('fileInput') readonly fileInput!: HTMLInputElement;

  private showAboutModal = false;
  private showCaptureModal = false;
  private captureDataUrl = '';
  private captureBlob: Blob | null = null;
  private captureTransparent = false;
  private activeHelpTab: 'guide' | 'camera' | 'fitting' | 'texture' = 'guide';
  private isMobileFullscreen3D = false;

  get currentLocale(): string {
    return this.$i18n.locale;
  }

  get supportedLocales() {
    return SUPPORTED_LOCALES;
  }

  private onLocaleChange(newLocale: string): void {
    setAppLocale(newLocale as SupportedLocale);
  }

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
    // 初期表示時に最初のプリセットモデルを自動読み込み
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
    if (this.threeCanvas) {
      const currentFocus = this.threeCanvas.getCurrentFocus();
      if (currentFocus === 'leftHand') {
        if (fingerId.startsWith('left')) {
          return; // 左手表示中は全指が見えているため全体ビューを維持
        } else {
          this.threeCanvas.focusHand('right');
          return;
        }
      } else if (currentFocus === 'rightHand') {
        if (fingerId.startsWith('right')) {
          return; // 右手表示中は全指が見えているため全体ビューを維持
        } else {
          this.threeCanvas.focusHand('left');
          return;
        }
      }
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

  private onGlobalScaleChange() {
    if (this.threeCanvas) {
      this.threeCanvas.updateAllNailTransforms();
    }
  }

  private onResetGlobalScale() {
    if (this.threeCanvas) {
      this.threeCanvas.updateAllNailTransforms();
    }
  }

  private onTextureChange(textureId: string) {
    if (this.threeCanvas) {
      this.threeCanvas.changeTexture(textureId);
    }
  }

  private onMaterialTypeChange(type: NailMaterialType) {
    if (this.threeCanvas) {
      this.threeCanvas.setNailMaterialType(type);
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

  // VRM Export
  private showExportModal = false;
  private isExporting = false;
  private exportErrorMessage = '';
  private attachedNailCount = 0;

  get currentMaterialType(): NailMaterialType {
    return this.$store.state.nail?.materialType || 'mtoon';
  }

  @Watch('$store.state.nail.isAttached')
  onIsAttachedChange(val: boolean) {
    if (!val) {
      this.attachedNailCount = 0;
    } else if (this.threeCanvas) {
      this.attachedNailCount = this.threeCanvas.getAttachedNailCount();
    }
  }

  private openExportModal(): void {
    this.exportErrorMessage = '';
    this.attachedNailCount = this.threeCanvas ? this.threeCanvas.getAttachedNailCount() : 0;
    this.showExportModal = true;
  }

  private closeExportModal(): void {
    if (this.isExporting) return;
    this.showExportModal = false;
    this.exportErrorMessage = '';
  }

  private async onExecuteExport(payload: ExportFormPayload): Promise<void> {
    if (!this.threeCanvas) return;
    this.isExporting = true;
    this.exportErrorMessage = '';

    try {
      const blob = await this.threeCanvas.exportVRM({
        avatarTitle: payload.avatarTitle,
        avatarAuthors: payload.avatarAuthors,
        materialType: (payload.materialType as NailMaterialType) || 'mtoon',
      });

      // ブラウザダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      this.isExporting = false;
      this.showExportModal = false;
    } catch (err: any) {
      console.error('VRM export error:', err);
      this.exportErrorMessage = err.message || 'エクスポートに失敗しました。';
      this.isExporting = false;
    }
  }

  // Photo Capture
  private triggerCapture(): void {
    if (this.threeCanvas) {
      this.threeCanvas.triggerCapture();
    }
  }

  private onCanvasCapture({ dataUrl, blob }: { dataUrl: string; blob: Blob }): void {
    this.captureDataUrl = dataUrl;
    this.captureBlob = blob;
    this.showCaptureModal = true;
  }

  private closeCaptureModal(): void {
    this.showCaptureModal = false;
  }

  private async onRetakeCapture(): Promise<void> {
    const canvas = this.threeCanvas as any;
    if (canvas && canvas.capture) {
      const res = await canvas.capture(this.captureTransparent);
      if (res) {
        this.captureDataUrl = res.dataUrl;
        this.captureBlob = res.blob;
      }
    }
  }

  private async onToggleCaptureTransparent(transparent: boolean): Promise<void> {
    this.captureTransparent = transparent;
    const canvas = this.threeCanvas as any;
    if (canvas && canvas.capture) {
      const res = await canvas.capture(transparent);
      if (res) {
        this.captureDataUrl = res.dataUrl;
        this.captureBlob = res.blob;
      }
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
  height: 58px;
  background-color: #ffffff;
  border-bottom: 1px solid $border-subtle;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-lg;
  box-shadow: 0 2px 12px rgba(230, 140, 165, 0.08);
  z-index: 10;
  gap: $space-sm;

  @media (max-width: $breakpoint-mobile) {
    height: 50px;
    padding: 0 8px;
    gap: 6px;

    &__brand {
      min-width: 0;
      flex-shrink: 1;
    }

    &__logo {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    &__title-group {
      min-width: 0;
      overflow: hidden;
    }

    &__subtitle,
    &__tag {
      display: none;
    }

    &__title {
      font-size: 0.88rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__actions {
      flex-shrink: 0;
      gap: 5px;

      .btn {
        padding: 5px 9px;
        font-size: 11px;
        height: 30px;
        white-space: nowrap;
        flex-shrink: 0;
        box-sizing: border-box;
      }
    }
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: $space-sm;
    min-width: 0;
    flex-shrink: 1;
  }

  &__logo {
    font-size: 1.6rem;
    filter: drop-shadow(0 2px 4px rgba(255, 117, 151, 0.25));
    transition: transform $transition-fast;
    flex-shrink: 0;

    &:hover {
      transform: rotate(15deg) scale(1.1);
    }
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }

  &__title {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    background: $accent-gradient;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.2;
    white-space: nowrap;
  }

  &__subtitle {
    font-size: 9px;
    font-weight: 700;
    color: $text-muted;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  &__tag {
    font-size: 11px;
    padding: 2px 9px;
    background: rgba(255, 117, 151, 0.12);
    color: $accent-pink;
    border-radius: $radius-full;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $space-md;
    flex-shrink: 0;

    .btn {
      white-space: nowrap;
      flex-shrink: 0;
    }
  }
}

.locale-selector {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.locale-select {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(255, 117, 151, 0.08);
  border: 1px solid rgba(255, 117, 151, 0.25);
  border-radius: $radius-full;
  padding: 6px 28px 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: $text-primary;
  cursor: pointer;
  outline: none;
  transition: all $transition-fast;
  white-space: nowrap;
  flex-shrink: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ff7597' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;

  @media (max-width: $breakpoint-mobile) {
    padding: 5px 20px 5px 8px;
    font-size: 11px;
    height: 30px;
    background-position: right 6px center;
  }

  &:hover {
    background-color: rgba(255, 117, 151, 0.15);
    border-color: $accent-pink;
  }

  &:focus {
    border-color: $accent-pink;
    box-shadow: 0 0 0 2px rgba(255, 117, 151, 0.2);
  }
}

/* Main Workspace */
.editor-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;

  @media (max-width: $breakpoint-mobile) {
    flex-direction: column;
  }
}

.editor-viewport {
  flex: 1;
  height: 100%;
  position: relative;
  background-color: #faf0f4;

  @media (max-width: $breakpoint-mobile) {
    flex: none;
    height: 42vh;
    min-height: 240px;
    transition: height 0.25s ease;

    &--fullscreen {
      height: 100%;
      flex: 1;
    }
  }
}

/* Viewport Top Actions (Floating in Top Right) */
.viewport-top-actions {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;

  @media (max-width: $breakpoint-mobile) {
    top: 10px;
    right: 10px;
    gap: 6px;
  }
}

.btn-viewport-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border: 1px solid $border-medium;
  border-radius: $radius-full;
  padding: 7px 16px;
  font-size: $font-size-xs;
  font-weight: 700;
  color: $text-primary;
  box-shadow: 0 4px 14px rgba(230, 140, 165, 0.22);
  cursor: pointer;
  transition: all $transition-fast;
  user-select: none;
  white-space: nowrap;

  @media (max-width: $breakpoint-mobile) {
    padding: 6px 12px;
    font-size: 11px;
    gap: 4px;
  }

  &:hover {
    background: #ffffff;
    border-color: $accent-pink;
    color: $accent-pink;
    box-shadow: 0 6px 18px rgba(255, 117, 151, 0.35);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0) scale(0.97);
  }

  &--capture {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 117, 151, 0.4);
    color: $accent-pink;

    &:hover {
      background: $accent-gradient;
      color: #ffffff;
      border-color: transparent;
      box-shadow: 0 6px 18px rgba(255, 117, 151, 0.45);
    }
  }

  &--toggle {
    display: none;

    @media (max-width: $breakpoint-mobile) {
      display: inline-flex;
      color: $text-secondary;
    }
  }
}

/* Sidebar */
.editor-sidebar {
  width: 360px;
  height: 100%;
  background-color: $bg-primary;
  border-left: 1px solid $border-subtle;
  overflow-y: auto;
  padding: $space-md;
  display: flex;
  flex-direction: column;
  gap: $space-md;

  @media (max-width: $breakpoint-mobile) {
    width: 100%;
    flex: 1;
    height: auto;
    border-left: none;
    border-top: 1px solid $border-subtle;
    padding: $space-sm;
    gap: $space-sm;
  }

  &__section {
    background-color: #ffffff;
    border: 1px solid $border-subtle;
    border-radius: $radius-lg;
    padding: $space-md;
    box-shadow: 0 4px 16px rgba(230, 140, 165, 0.08);
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
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  text-align: left;
  transition: all $transition-fast;

  &:hover {
    background: #ffffff;
    border-color: $border-medium;
    transform: translateY(-1px);
    box-shadow: $shadow-sm;
  }

  &--active {
    background: #ffffff;
    border-color: $accent-pink;
    box-shadow: 0 2px 10px rgba(255, 117, 151, 0.2);

    .preset-card__name {
      color: $accent-pink;
      font-weight: 700;
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
    font-weight: 600;
  }

  &__ver {
    font-size: 10px;
    padding: 1px 6px;
    background: $bg-elevated;
    border-radius: $radius-full;
    color: $text-secondary;
    font-weight: 600;
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
  background: rgba(74, 56, 61, 0.35);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: $space-md;
  box-sizing: border-box;
}

.modal-card {
  background: #ffffff;
  border: 1px solid $border-medium;
  border-radius: $radius-lg;
  padding: $space-lg;
  max-width: 640px;
  width: 100%;
  box-shadow: 0 16px 40px rgba(230, 140, 165, 0.25);
  box-sizing: border-box;

  @media (max-width: $breakpoint-mobile) {
    padding: $space-md;
    width: 95vw;
    max-width: 95vw;
    border-radius: $radius-md;
  }

  &--help {
    max-height: 88vh;
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-md;
    flex-shrink: 0;
  }

  &__header-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__icon {
    font-size: 20px;
  }

  &__title {
    font-size: $font-size-base;
    font-weight: 700;
    color: $text-primary;
    margin: 0;
  }

  &__close {
    background: transparent;
    border: none;
    color: $text-muted;
    font-size: 16px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-fast;

    &:hover {
      background: $bg-tertiary;
      color: $text-primary;
    }
  }

  &__scroll {
    flex: 1;
    overflow-y: auto;
    padding-right: 6px;
    margin-bottom: $space-md;

    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb {
      background: $border-medium;
      border-radius: 3px;
    }
  }

  &__footer {
    flex-shrink: 0;
    padding-top: $space-xs;
  }
}

/* ヘルプタブ */
.help-tabs {
  display: flex;
  background: $bg-tertiary;
  padding: 4px;
  border-radius: $radius-full;
  gap: 4px;
  margin-bottom: $space-md;
  flex-shrink: 0;
  border: 1px solid $border-subtle;

  @media (max-width: $breakpoint-mobile) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: $radius-lg;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }

    .help-tab {
      flex: none;
      padding: 6px 10px;
    }
  }
}

.help-tab {
  flex: 1;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: $radius-full;
  font-size: 11px;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;

  &:hover {
    color: $accent-pink;
  }

  &--active {
    background: #ffffff;
    color: $accent-pink;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(230, 140, 165, 0.18);
  }
}

/* ヘルプコンテンツスタイル */
.help-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.help-lead {
  font-size: $font-size-xs;
  color: $text-secondary;
  line-height: 1.6;
  padding: 8px 12px;
  background: rgba(255, 101, 132, 0.08);
  border-left: 3px solid $accent-pink;
  border-radius: 0 $radius-sm $radius-sm 0;
}

.help-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.help-step-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;

  &__num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: $accent-pink;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(255, 117, 151, 0.35);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 3px;

    strong {
      font-size: 12px;
      color: $text-primary;
    }

    p {
      font-size: 11px;
      color: $text-secondary;
      line-height: 1.5;
      margin: 0;
    }
  }
}

.help-section-card {
  padding: 10px 12px;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 8px 0;
  }
}

.help-text {
  font-size: 11px;
  color: $text-secondary;
  line-height: 1.6;
  margin: 0 0 6px 0;

  &:last-child {
    margin-bottom: 0;
  }

  code {
    padding: 1px 4px;
    background: $bg-elevated;
    border-radius: 3px;
    color: $accent-pink;
    font-size: 10px;
  }
}

.help-subtext {
  font-size: 10px;
  color: $text-muted;
  line-height: 1.5;
  margin: 6px 0 0 0;
}

.help-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;

  th, td {
    padding: 6px 8px;
    border-bottom: 1px solid $border-subtle;
    text-align: left;
  }

  th {
    width: 120px;
    color: $text-primary;
    font-weight: 600;
    white-space: nowrap;
  }

  td {
    color: $text-secondary;
  }

  tr:last-child th,
  tr:last-child td {
    border-bottom: none;
  }
}

.help-badge-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.help-badge-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;

  &__name {
    padding: 2px 6px;
    background: $bg-elevated;
    border: 1px solid $border-subtle;
    border-radius: 4px;
    color: $accent-pink;
    font-weight: 600;
    white-space: nowrap;
    font-size: 10px;
  }

  &__desc {
    color: $text-secondary;
    line-height: 1.4;
  }
}

.help-feature-list {
  margin: 6px 0;
  padding-left: 18px;
  font-size: 11px;
  color: $text-secondary;
  display: flex;
  flex-direction: column;
  gap: 4px;

  li strong {
    color: $text-primary;
  }
}
</style>
