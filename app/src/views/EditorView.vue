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
        <button class="btn btn--primary" :disabled="!hasModel" @click="openExportModal">
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
            <h2 class="modal-card__title">VRMNailAttacher 使い方ガイド</h2>
          </div>
          <button class="modal-card__close" title="閉じる" @click="showAboutModal = false">✕</button>
        </div>

        <!-- Help Tabs -->
        <div class="help-tabs">
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'guide' }"
            @click="activeHelpTab = 'guide'"
          >
            <span>📖 基本の流れ</span>
          </button>
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'camera' }"
            @click="activeHelpTab = 'camera'"
          >
            <span>🎮 カメラ・視点</span>
          </button>
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'fitting' }"
            @click="activeHelpTab = 'fitting'"
          >
            <span>💅 ネイル調整</span>
          </button>
          <button
            type="button"
            class="help-tab"
            :class="{ 'help-tab--active': activeHelpTab === 'texture' }"
            @click="activeHelpTab = 'texture'"
          >
            <span>🎨 テクスチャ・自作</span>
          </button>
        </div>

        <!-- Modal Body Content (Scrollable) -->
        <div class="modal-card__scroll">
          <!-- Tab 1: 基本の流れ -->
          <div v-if="activeHelpTab === 'guide'" class="help-content">
            <div class="help-lead">
              VRMNailAttacher は、VRM アバターにネイルチップ（爪の 3D モデル）を自動装着し、位置合わせやテクスチャの着せ替えを行える Web ツールです。
            </div>
            <div class="help-steps">
              <div class="help-step-item">
                <span class="help-step-item__num">1</span>
                <div class="help-step-item__body">
                  <strong>アバターを読み込む</strong>
                  <p>右上の「ローカル VRM を開く」またはドラッグ＆ドロップでモデルを読み込みます。まずは試したい場合、プリセットモデルをクリックするだけで即座に開始できます。</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">2</span>
                <div class="help-step-item__body">
                  <strong>ネイルを自動装着する</strong>
                  <p>「💅 ネイルを自動装着する」ボタンをクリックすると、アバターの両手10本の指先ボーン（末節骨）を自動検出し、最適な向きでネイルチップが装着されます。</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">3</span>
                <div class="help-step-item__body">
                  <strong>カメラで指先を拡大確認</strong>
                  <p>下部バーの「☝️ 指先」ボタンを押すと、現在調整中の指先へカメラが最短距離でクローズアップします。ポーズを「手開き」にすると作業が格段にしやすくなります。</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">4</span>
                <div class="help-step-item__body">
                  <strong>サイズ・位置を微調整</strong>
                  <p>「全指一括サイズ調整」で全体の大きさを合わせ、必要に応じて指セレクターで個別の指の位置や角度をピッタリ合わせます。</p>
                </div>
              </div>
              <div class="help-step-item">
                <span class="help-step-item__num">5</span>
                <div class="help-step-item__body">
                  <strong>テクスチャの選択・アップロード</strong>
                  <p>チーク、フレンチ、ベイビーブーマー等のプリセットから選ぶか、自作画像をドロップしてオリジナルのネイルを適用できます。</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 2: カメラ・視点操作 -->
          <div v-if="activeHelpTab === 'camera'" class="help-content">
            <div class="help-section-card">
              <h4 class="help-section-card__title">🖱️ マウス / トラックパッド操作</h4>
              <table class="help-table">
                <tbody>
                  <tr>
                    <th>左ドラッグ</th>
                    <td>カメラの周回回転（360度あらゆる角度からチェック可能）</td>
                  </tr>
                  <tr>
                    <th>右ドラッグ / 2本指</th>
                    <td>カメラの平行移動（パン）</td>
                  </tr>
                  <tr>
                    <th>ホイール / ピンチ</th>
                    <td>ズームイン / ズームアウト</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">🎬 画面下部のカメラ・ツールバー</h4>
              <div class="help-badge-list">
                <div class="help-badge-item">
                  <span class="help-badge-item__name">☝️ 指先</span>
                  <span class="help-badge-item__desc">作業中の指先へ瞬時にクローズアップ。指を切り替えるたびに自動追従します。</span>
                </div>
                <div class="help-badge-item">
                  <span class="help-badge-item__name">手元 / 左手 / 右手</span>
                  <span class="help-badge-item__desc">手全体を自然な距離から俯瞰確認できます。</span>
                </div>
                <div class="help-badge-item">
                  <span class="help-badge-item__name">真上 / 斜め</span>
                  <span class="help-badge-item__desc">爪の厚みや生え際の角度を真上・斜めから正確にチェックできます。</span>
                </div>
                <div class="help-badge-item">
                  <span class="help-badge-item__name">👐 手開き / 🧍 Tポーズ</span>
                  <span class="help-badge-item__desc">「手開き」ポーズにすると指が綺麗に伸びてネイルの微調整が簡単になります。</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 3: ネイル調整のコツ -->
          <div v-if="activeHelpTab === 'fitting'" class="help-content">
            <div class="help-section-card">
              <h4 class="help-section-card__title">📏 全指一括サイズ調整</h4>
              <p class="help-text">
                アバターによって手の大きさや指の太さが異なります。「全体サイズ」スライダー（0.5x〜2.0x）を動かすか、<code>-0.01</code> <code>+0.01</code> 刻みボタンでまず大まかなサイズ感を合わせます。
              </p>
              <p class="help-text">
                <strong>詳細比率の調整</strong>: 「詳細比率を開く」をクリックすると、爪の「長さ（前後）」「幅（左右）」「厚み（上下）」を独立して調整可能です。細長い爪やショートネイルなど好みのフォルムを作れます。
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">🎯 指ごとの個別微調整</h4>
              <p class="help-text">
                指セレクター（親指・人差し指・中指・薬指・小指）で調整したい指を選択します。位置オフセット（X/Y/Z）や回転オフセット（ロール/ピッチ/ヨー）のスライダーで、指先の甘皮や爪の生え際にぴったりフィットさせます。
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">🪞 左右対称ミラーリング</h4>
              <p class="help-text">
                「左右対称ミラーリング」にチェックが入っている場合、左手を調整すると右手の同じ指にも自動で対称に反映されます。左右で異なる長さや角度にしたい場合はチェックを外してください。
              </p>
            </div>
          </div>

          <!-- Tab 4: テクスチャ・自作デザイン -->
          <div v-if="activeHelpTab === 'texture'" class="help-content">
            <div class="help-section-card">
              <h4 class="help-section-card__title">💅 適用範囲（全指一括 / 選択指のみ）</h4>
              <p class="help-text">
                <strong>全指一括 (10本)</strong>: 選択したデザインを10本すべての爪にまとめて適用します。<br/>
                <strong>選択中の指のみ</strong>: 現在選択されている指（および左右同期の指）だけにテクスチャをピンポイント適用できます。1本だけフレンチやラメにしたり、指ごとに色を変えるアシンメトリーネイルが可能です。
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">📤 画像のアップロード（即時反映）</h4>
              <p class="help-text">
                「テクスチャのアップロード」エリアに、PC 内の PNG / JPEG / WebP 画像をドラッグ＆ドロップ（またはクリックして選択）するだけで、瞬時にネイルへ反映されます。アップロードした画像は「マイテクスチャ」として保存・再選択・削除が可能です。
              </p>
            </div>

            <div class="help-section-card">
              <h4 class="help-section-card__title">🎨 制作・編集用テンプレートのダウンロード</h4>
              <p class="help-text">
                ご自身でオリジナルネイルを描きたい方向けに、制作テンプレートをワンクリックでダウンロードできます:
              </p>
              <ul class="help-feature-list">
                <li><strong>ベーステクスチャ (PNG)</strong>: 描画の基準となる無地テクスチャ</li>
                <li><strong>UV展開マップ (PNG)</strong>: 爪のポリゴン境界線・展開図ガイド</li>
                <li><strong>編集用テンプレート (PSD)</strong>: レイヤー分けされたPhotoshop元データ</li>
              </ul>
              <p class="help-subtext">
                ※ Photoshop, CLIP STUDIO PAINT, Procreate, ibisPaint 等のペイントアプリで開いて自由にイラストやパーツを描き込み、PNG保存してアップロードしてください。
              </p>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-card__footer">
          <button class="btn btn--primary btn--full" @click="showAboutModal = false">
            閉じる
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
  </div>
</template>

<script lang="ts">
import { Component, Vue, Ref } from 'vue-property-decorator';
import ThreeCanvas from '@/components/Viewer/ThreeCanvas.vue';
import NailControlPanel from '@/components/Sidebar/NailControlPanel.vue';
import ExportModal, { ExportFormPayload } from '@/components/Modal/ExportModal.vue';
import { PresetModel } from '@/store';
import { VRMModelMeta } from '@/modules/vrm/VRMLoader';
import { FingerId, NailTransform, NailMaterialType } from '@/modules/nail/types';

@Component({
  components: {
    ThreeCanvas,
    NailControlPanel,
    ExportModal
  }
})
export default class EditorView extends Vue {
  @Ref('threeCanvas') readonly threeCanvas!: ThreeCanvas;
  @Ref('fileInput') readonly fileInput!: HTMLInputElement;

  private showAboutModal = false;
  private activeHelpTab: 'guide' | 'camera' | 'fitting' | 'texture' = 'guide';

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

  get attachedNailCount(): number {
    return this.threeCanvas ? this.threeCanvas.getAttachedNailCount() : 0;
  }

  get currentMaterialType(): NailMaterialType {
    return this.$store.state.nail?.materialType || 'mtoon';
  }

  private openExportModal(): void {
    this.exportErrorMessage = '';
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: $space-md;
  box-sizing: border-box;
}

.modal-card {
  background: $bg-secondary;
  border: 1px solid $border-medium;
  border-radius: $radius-lg;
  padding: $space-lg;
  max-width: 640px;
  width: 100%;
  box-shadow: $shadow-lg;
  box-sizing: border-box;

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
  border-radius: $radius-sm;
  gap: 4px;
  margin-bottom: $space-md;
  flex-shrink: 0;
}

.help-tab {
  flex: 1;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  color: $text-muted;
  cursor: pointer;
  transition: all $transition-fast;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;

  &:hover {
    color: $text-primary;
  }

  &--active {
    background: $bg-elevated;
    color: $accent-pink;
    font-weight: 600;
    box-shadow: $shadow-sm;
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
  border-radius: $radius-sm;

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
  border-radius: $radius-sm;

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
