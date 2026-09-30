<template>
  <div v-if="visible" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-card modal-card--export">
      <!-- Modal Header -->
      <div class="modal-card__header">
        <div class="modal-card__header-title">
          <span class="modal-card__icon">📦</span>
          <h2 class="modal-card__title">VRM エクスポート</h2>
        </div>
        <button
          class="modal-card__close"
          title="閉じる"
          :disabled="isExporting"
          @click="handleClose"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-card__body">
        <!-- Status summary banner -->
        <div class="export-summary">
          <div class="export-summary__item">
            <span class="export-summary__label">対象モデル</span>
            <span class="export-summary__value">{{ defaultModelName || '未選択' }}</span>
          </div>
          <div class="export-summary__item">
            <span class="export-summary__label">規格</span>
            <span class="export-summary__value badge-format">VRM {{ vrmVersion || '0.x' }}</span>
          </div>
          <div class="export-summary__item">
            <span class="export-summary__label">装着ネイル</span>
            <span
              class="export-summary__value"
              :class="{ 'text-warning': attachedCount === 0, 'text-success': attachedCount > 0 }"
            >
              💅 {{ attachedCount }} / 10 本
            </span>
          </div>
          <div class="export-summary__item">
            <span class="export-summary__label">質感シェーダー</span>
            <span class="export-summary__value badge-format">
              {{ materialType === 'mtoon' ? '🎨 MToon' : '✨ Standard' }}
            </span>
          </div>
        </div>

        <div v-if="attachedCount === 0" class="alert-box alert-box--warning">
          ⚠️ ネイルが1本も装着されていません。元のアバターデータのみで出力されます。
        </div>

        <!-- Form fields -->
        <div class="form-group">
          <label class="form-label" for="export-filename">
            出力ファイル名 (.vrm) <span class="required">*</span>
          </label>
          <input
            id="export-filename"
            v-model="fileName"
            type="text"
            class="form-input"
            placeholder="avatar_with_nails.vrm"
            :disabled="isExporting"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="export-title">アバター名 (Title)</label>
            <input
              id="export-title"
              v-model="avatarTitle"
              type="text"
              class="form-input"
              placeholder="アバター名"
              :disabled="isExporting"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="export-author">作者名 (Author)</label>
            <input
              id="export-author"
              v-model="avatarAuthors"
              type="text"
              class="form-input"
              placeholder="作者名"
              :disabled="isExporting"
            />
          </div>
        </div>

        <!-- Non-destructive export explanation -->
        <div class="info-note">
          <span class="info-note__icon">🛡️</span>
          <div class="info-note__text">
            <strong>完全非破壊バイナリパッチ + MToon シェーダー拡張</strong>
            <p>
              元 VRM の MToon 設定、揺れもの物理（SpringBone）、表情モーフ、ボーン階層を 100% 保持したまま、各指先ボーンへ MToon（セル調）対応のネイルメッシュ・テクスチャを追記して出力します。
            </p>
          </div>
        </div>

        <!-- Error display -->
        <div v-if="errorMessage" class="alert-box alert-box--error">
          {{ errorMessage }}
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-card__footer">
        <button
          class="btn btn--secondary"
          :disabled="isExporting"
          @click="handleClose"
        >
          キャンセル
        </button>
        <button
          class="btn btn--primary btn--export"
          :disabled="isExporting || !fileName.trim()"
          @click="handleExport"
        >
          <span v-if="isExporting" class="spinner"></span>
          <span>{{ isExporting ? 'VRM 生成中...' : '💾 エクスポートして保存' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';

export interface ExportFormPayload {
  fileName: string;
  avatarTitle: string;
  avatarAuthors: string;
  materialType?: string;
}

@Component
export default class ExportModal extends Vue {
  @Prop({ type: Boolean, default: false }) readonly visible!: boolean;
  @Prop({ type: String, default: '' }) readonly defaultModelName!: string;
  @Prop({ type: String, default: '' }) readonly defaultTitle!: string;
  @Prop({ type: String, default: '' }) readonly defaultAuthors!: string;
  @Prop({ type: String, default: '0.x' }) readonly vrmVersion!: string;
  @Prop({ type: Number, default: 0 }) readonly attachedCount!: number;
  @Prop({ type: String, default: 'mtoon' }) readonly materialType!: string;
  @Prop({ type: Boolean, default: false }) readonly isExporting!: boolean;
  @Prop({ type: String, default: '' }) readonly errorMessage!: string;

  private fileName = '';
  private avatarTitle = '';
  private avatarAuthors = '';

  @Watch('visible')
  onVisibleChange(val: boolean) {
    if (val) {
      this.resetFields();
    }
  }

  @Watch('defaultModelName')
  onModelNameChange() {
    this.resetFields();
  }

  private resetFields() {
    const baseName = this.defaultModelName
      ? this.defaultModelName.replace(/\.vrm$/i, '')
      : (this.defaultTitle || 'avatar');
    this.fileName = `${baseName}_with_nails.vrm`;
    this.avatarTitle = this.defaultTitle || baseName;
    this.avatarAuthors = this.defaultAuthors || '';
  }

  private handleClose() {
    if (this.isExporting) return;
    this.$emit('close');
  }

  private handleExport() {
    let finalFileName = this.fileName.trim();
    if (!finalFileName) {
      finalFileName = 'avatar_with_nails.vrm';
    }
    if (!finalFileName.toLowerCase().endsWith('.vrm')) {
      finalFileName += '.vrm';
    }

    const payload: ExportFormPayload = {
      fileName: finalFileName,
      avatarTitle: this.avatarTitle.trim(),
      avatarAuthors: this.avatarAuthors.trim(),
      materialType: this.materialType,
    };

    this.$emit('export', payload);
  }
}
</script>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(74, 56, 61, 0.35);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $space-md;
}

.modal-card {
  background: #ffffff;
  border: 1px solid $border-medium;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 16px 40px rgba(230, 140, 165, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $space-md $space-lg;
    border-bottom: 1px solid $border-subtle;
    background: $bg-tertiary;
  }

  &__header-title {
    display: flex;
    align-items: center;
    gap: 10px;
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

    &:hover:not(:disabled) {
      background: rgba(255, 117, 151, 0.12);
      color: $accent-pink;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &__body {
    padding: $space-lg;
    display: flex;
    flex-direction: column;
    gap: $space-md;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: $space-sm;
    padding: $space-md $space-lg;
    border-top: 1px solid $border-subtle;
    background: $bg-tertiary;
  }
}

@keyframes modal-pop {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.export-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: $bg-tertiary;
  padding: 10px 12px;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    overflow: hidden;
  }

  &__label {
    font-size: 10px;
    color: $text-muted;
    text-transform: uppercase;
    font-weight: 700;
  }

  &__value {
    font-size: 12px;
    font-weight: 700;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.badge-format {
  color: $accent-pink;
}

.text-success {
  color: #10b981 !important;
}

.text-warning {
  color: #f59e0b !important;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.form-row {
  display: flex;
  gap: $space-md;
}

.form-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-secondary;

  .required {
    color: $accent-pink;
  }
}

.form-input {
  background: $bg-tertiary;
  border: 1px solid $border-medium;
  border-radius: $radius-md;
  color: $text-primary;
  padding: 8px 12px;
  font-size: 12px;
  transition: all $transition-fast;

  &:focus {
    outline: none;
    background: #ffffff;
    border-color: $accent-pink;
    box-shadow: 0 0 0 3px rgba(255, 117, 151, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.info-note {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 117, 151, 0.08);
  border: 1px solid rgba(255, 117, 151, 0.25);
  border-radius: $radius-md;

  &__icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 3px;

    strong {
      font-size: 11px;
      color: $accent-pink;
    }

    p {
      font-size: 11px;
      color: $text-secondary;
      line-height: 1.5;
      margin: 0;
    }
  }
}

.alert-box {
  padding: 8px 12px;
  border-radius: $radius-md;
  font-size: 11px;
  line-height: 1.5;

  &--warning {
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #b45309;
  }

  &--error {
    background: rgba(244, 63, 94, 0.12);
    border: 1px solid rgba(244, 63, 94, 0.35);
    color: #be123c;
  }
}

.btn {
  padding: 8px 18px;
  border-radius: $radius-full;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  transition: all $transition-fast;

  &--secondary {
    background: #ffffff;
    color: $text-primary;
    border: 1px solid $border-medium;
    box-shadow: $shadow-sm;

    &:hover:not(:disabled) {
      background: $bg-tertiary;
      border-color: $accent-pink;
      color: $accent-pink;
      transform: translateY(-1px);
    }
  }

  &--primary {
    background: $accent-gradient;
    color: #fff;
    box-shadow: 0 4px 14px rgba(255, 117, 151, 0.35);

    &:hover:not(:disabled) {
      background: $accent-gradient-hover;
      box-shadow: 0 6px 18px rgba(255, 117, 151, 0.45);
      transform: translateY(-1px);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
