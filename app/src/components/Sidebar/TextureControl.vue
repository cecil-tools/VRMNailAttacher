<template>
  <div class="texture-control">
    <div class="control-group">
      <!-- セクションヘッダー & 適用スコープ切り替え -->
      <div class="control-group__header">
        <span class="control-group__title">ネイルデザイン (テクスチャ)</span>
      </div>

      <!-- 全指共通デザイン（マテリアル統合）案内バッジ -->
      <div class="scope-info-badge">
        <span class="scope-info-badge__icon">💅</span>
        <span class="scope-info-badge__text">全指共通デザイン（マテリアル1つに統合）</span>
      </div>

      <!-- プリセットテクスチャ一覧 -->
      <div class="section-sub-header">
        <span class="section-sub-title">プリセットデザイン</span>
      </div>

      <div class="texture-grid">
        <button
          v-for="tex in formattedTextures"
          :key="tex.id"
          class="texture-card"
          :class="{ 'texture-card--active': activeTextureId === tex.id }"
          :title="tex.fullName"
          @click="selectTexture(tex.id)"
        >
          <div class="texture-card__thumb">
            <img :src="getPresetTextureUrl(tex.fileName)" :alt="tex.jpName" loading="lazy" />
          </div>
          <div class="texture-card__text">
            <span class="texture-card__name">{{ tex.jpName }}</span>
            <span v-if="tex.enName" class="texture-card__sub">{{ tex.enName }}</span>
          </div>
        </button>
      </div>

      <!-- アップロード済みマイテクスチャ -->
      <div v-if="customTextures.length > 0" class="custom-section">
        <div class="section-sub-header">
          <span class="section-sub-title">マイテクスチャ ({{ customTextures.length }})</span>
        </div>
        <div class="texture-grid">
          <div
            v-for="custom in customTextures"
            :key="custom.id"
            class="texture-card custom-card"
            :class="{ 'texture-card--active': activeTextureId === custom.id }"
            :title="custom.name"
            @click="selectTexture(custom.id)"
          >
            <div class="texture-card__thumb">
              <img :src="custom.dataUrl" :alt="custom.name" />
            </div>
            <div class="texture-card__text">
              <span class="texture-card__name">{{ custom.name }}</span>
              <span class="texture-card__sub">カスタム</span>
            </div>
            <button
              type="button"
              class="custom-card__delete"
              title="削除"
              @click.stop="removeCustom(custom.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- カスタム画像アップロード -->
      <div class="section-sub-header">
        <span class="section-sub-title">テクスチャのアップロード</span>
      </div>

      <div
        class="upload-dropzone"
        :class="{ 'upload-dropzone--dragover': isDragOver }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          class="file-input-hidden"
          accept="image/png,image/jpeg,image/webp"
          @change="onFileSelected"
        />
        <div class="upload-dropzone__content">
          <span class="upload-dropzone__icon">📤</span>
          <div class="upload-dropzone__label">
            <span class="upload-dropzone__main-text">画像ファイルをドロップ</span>
            <span class="upload-dropzone__sub-text">または クリックして選択 (PNG / JPG / WebP)</span>
          </div>
        </div>
      </div>

      <!-- 制作・編集用テンプレートダウンロード -->
      <div class="templates-section">
        <div class="section-sub-header">
          <span class="section-sub-title">制作・編集用テンプレート</span>
        </div>
        <div class="template-list">
          <div
            v-for="tpl in templates"
            :key="tpl.id"
            class="template-item"
          >
            <div class="template-item__info">
              <span class="template-item__label">{{ tpl.label }}</span>
              <span class="template-item__desc">{{ tpl.description }}</span>
            </div>
            <button
              type="button"
              class="btn-download"
              :disabled="downloadingId === tpl.id"
              @click="downloadTemplate(tpl)"
            >
              <span v-if="downloadingId === tpl.id" class="btn-download__spinner">⏳</span>
              <span v-else class="btn-download__icon">💾</span>
              <span class="btn-download__text">{{ downloadingId === tpl.id ? 'DL中...' : 'DL' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 質感・シェーダー切り替え -->
      <div class="shader-section">
        <div class="section-sub-header">
          <span class="section-sub-title">質感・シェーダー</span>
        </div>
        <div class="shader-tabs">
          <button
            type="button"
            class="shader-tab"
            :class="{ 'shader-tab--active': materialType === 'mtoon' }"
            @click="setMaterialType('mtoon')"
          >
            <span class="shader-tab__title">🎨 MToon (アニメ調)</span>
            <span class="shader-tab__desc">アバターと調和 (推奨)</span>
          </button>
          <button
            type="button"
            class="shader-tab"
            :class="{ 'shader-tab--active': materialType === 'standard' }"
            @click="setMaterialType('standard')"
          >
            <span class="shader-tab__title">✨ Standard (リアル調)</span>
            <span class="shader-tab__desc">物理ベース・滑らか陰影</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Ref } from 'vue-property-decorator';
import {
  RYUKI_PRESET,
  NailTextureOption,
  NailTemplateOption,
  CustomTextureItem,
  TextureApplyScope,
  FingerId,
  FINGER_DEFINITIONS,
  NailMaterialType
} from '@/modules/nail/types';

interface FormattedTexture {
  id: string;
  fullName: string;
  jpName: string;
  enName: string;
  fileName: string;
}

@Component
export default class TextureControl extends Vue {
  @Ref('fileInput') readonly fileInput!: HTMLInputElement;

  private isDragOver = false;
  private downloadingId: string | null = null;

  get textures(): NailTextureOption[] {
    return RYUKI_PRESET.textures;
  }

  get templates(): NailTemplateOption[] {
    return RYUKI_PRESET.templates;
  }

  get formattedTextures(): FormattedTexture[] {
    return this.textures.map((tex) => {
      const match = tex.label.match(/^([^(]+)(?:\((.+)\))?$/);
      const jpName = match ? match[1].trim() : tex.label;
      const enName = match && match[2] ? match[2].trim() : '';
      return {
        id: tex.id,
        fullName: tex.label,
        jpName,
        enName,
        fileName: tex.fileName
      };
    });
  }

  get currentScope(): TextureApplyScope {
    return this.$store.state.nail?.textureApplyScope || 'all';
  }

  get customTextures(): CustomTextureItem[] {
    return this.$store.state.nail?.customTextures || [];
  }

  get targetFingerId(): FingerId {
    const sel = this.$store.state.nail?.selectedFinger as string;
    if (sel && (sel.startsWith('left') || sel.startsWith('right'))) {
      return sel as FingerId;
    }
    return 'leftIndex';
  }

  get targetFingerLabel(): string {
    const def = FINGER_DEFINITIONS[this.targetFingerId];
    return def ? def.label : this.targetFingerId;
  }

  get isSymmetrySync(): boolean {
    return !!this.$store.state.nail?.symmetrySync;
  }

  get activeTextureId(): string | null {
    return this.$store.state.nail?.selectedTextureId || 'cheek';
  }

  public getPresetTextureUrl(relativeFileName: string): string {
    const baseUrl = process.env.BASE_URL || '/';
    return baseUrl + RYUKI_PRESET.basePath + relativeFileName;
  }

  public setScope(scope: TextureApplyScope) {
    this.$store.commit('nail/setTextureApplyScope', scope);
  }

  public selectTexture(textureId: string) {
    this.$emit('texture-change', textureId);
  }

  public triggerFileInput() {
    if (this.fileInput) {
      this.fileInput.click();
    }
  }

  public onDragOver() {
    this.isDragOver = true;
  }

  public onDragLeave() {
    this.isDragOver = false;
  }

  public onDrop(e: DragEvent) {
    this.isDragOver = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleImageFile(files[0]);
    }
  }

  public onFileSelected(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleImageFile(target.files[0]);
      target.value = ''; // 次回同じファイルを再選択できるようにリセット
    }
  }

  private handleImageFile(file: File) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('対応している画像形式は PNG, JPEG, WebP です。');
      return;
    }

    // 15MB 制限
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('画像ファイルサイズが上限（15MB）を超えています。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const newItem: CustomTextureItem = {
        id: `custom_${Date.now()}`,
        name: file.name,
        dataUrl,
        createdAt: Date.now()
      };

      this.$store.commit('nail/addCustomTexture', newItem);
      this.selectTexture(newItem.id);
    };
    reader.onerror = () => {
      alert('画像の読み込み中にエラーが発生しました。');
    };
    reader.readAsDataURL(file);
  }

  public removeCustom(id: string) {
    this.$store.commit('nail/removeCustomTexture', id);
    if (this.activeTextureId === id) {
      this.selectTexture('cheek');
    }
  }

  public async downloadTemplate(tpl: NailTemplateOption) {
    try {
      this.downloadingId = tpl.id;
      const baseUrl = process.env.BASE_URL || '/';
      const fileUrl = baseUrl + RYUKI_PRESET.basePath + tpl.fileName;

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`ダウンロードに失敗しました (ステータス: ${response.status})`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = tpl.downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Failed to download template:', err);
      alert('テンプレートのダウンロードに失敗しました: ' + (err.message || '不明なエラー'));
    } finally {
      this.downloadingId = null;
    }
  }

  get materialType(): NailMaterialType {
    return this.$store.state.nail.materialType || 'mtoon';
  }

  private setMaterialType(type: NailMaterialType): void {
    this.$store.commit('nail/setMaterialType', type);
    this.$emit('material-type-change', type);
  }
}
</script>

<style lang="scss" scoped>
.texture-control {
  width: 100%;
  box-sizing: border-box;
}

.control-group {
  width: 100%;
  box-sizing: border-box;
  background: $bg-secondary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  padding: $space-sm $space-md;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-xs;
  }

  &__title {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $text-secondary;
  }
}

/* 全指共通適用案内バッジ */
.scope-info-badge {
  display: flex;
  align-items: center;
  gap: $space-xs;
  padding: 6px $space-sm;
  background: rgba($accent-pink, 0.08);
  border: 1px solid rgba($accent-pink, 0.2);
  border-radius: $radius-sm;
  margin-bottom: $space-sm;

  &__icon {
    font-size: 13px;
  }

  &__text {
    font-size: 11px;
    font-weight: 500;
    color: $accent-pink;
  }
}

/* セクション小見出し */
.section-sub-header {
  margin-top: $space-sm;
  margin-bottom: 6px;
}

.section-sub-title {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* テクスチャグリッド */
.texture-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.texture-card {
  position: relative;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  text-align: left;
  overflow: hidden;

  &:hover {
    background: $bg-elevated;
    border-color: $border-medium;
    color: $text-primary;
  }

  &--active {
    background: rgba(255, 101, 132, 0.15);
    border-color: $accent-pink;
    color: $accent-pink;
    font-weight: 600;
    box-shadow: $glow-pink;

    .texture-card__sub {
      color: rgba(255, 101, 132, 0.8);
    }
  }

  &__thumb {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    background: #000;
    border: 1px solid $border-subtle;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    overflow: hidden;
    line-height: 1.25;
  }

  &__name {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__sub {
    font-size: 9px;
    color: $text-muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* カスタムカード固有 */
.custom-card {
  padding-right: 24px;

  &__delete {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: $text-muted;
    font-size: 11px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-fast;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
      color: $color-error;
    }
  }
}

/* アップロードドロップゾーン */
.upload-dropzone {
  margin-top: 4px;
  padding: 10px 12px;
  background: $bg-tertiary;
  border: 1px dashed $border-medium;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-fast;
  text-align: center;

  &:hover, &--dragover {
    border-color: $accent-pink;
    background: rgba(255, 101, 132, 0.08);
  }

  &__content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  &__icon {
    font-size: 18px;
  }

  &__label {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  &__main-text {
    font-size: 11px;
    font-weight: 500;
    color: $text-primary;
  }

  &__sub-text {
    font-size: 9px;
    color: $text-muted;
  }
}

.file-input-hidden {
  display: none;
}

/* テンプレート一覧 */
.templates-section {
  margin-top: $space-sm;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-sm;
  gap: 8px;

  &__info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  &__label {
    font-size: 11px;
    font-weight: 500;
    color: $text-primary;
  }

  &__desc {
    font-size: 9px;
    color: $text-muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.btn-download {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: $bg-elevated;
  border: 1px solid $border-medium;
  border-radius: 4px;
  color: $text-primary;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: $accent-pink;
    border-color: $accent-pink;
    color: #fff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &__icon, &__spinner {
    font-size: 10px;
  }
}

.shader-section {
  margin-top: $space-md;
}

.shader-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: $bg-tertiary;
  padding: 4px;
  border-radius: $radius-sm;
  border: 1px solid $border-subtle;
}

.shader-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all $transition-fast;

  &__title {
    font-size: 11px;
    font-weight: 600;
    color: $text-secondary;
  }

  &__desc {
    font-size: 9px;
    color: $text-muted;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  &--active {
    background: $bg-elevated;
    border-color: $accent-pink;
    box-shadow: $shadow-sm;

    .shader-tab__title {
      color: $accent-pink;
    }

    .shader-tab__desc {
      color: $text-primary;
    }
  }
}
</style>
