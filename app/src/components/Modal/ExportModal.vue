<template>
  <div v-if="visible" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-card modal-card--export">
      <!-- Modal Header -->
      <div class="modal-card__header">
        <div class="modal-card__header-title">
          <span class="modal-card__icon">📦</span>
          <h2 class="modal-card__title">{{ $t('exportModal.title') }}</h2>
        </div>
        <button
          class="modal-card__close"
          :title="$t('common.close')"
          :disabled="isExporting"
          @click="handleClose"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-card__body">
        <!-- Compact Status Chips -->
        <div class="export-status-bar">
          <span
            class="status-chip status-chip--nails"
            :class="{ 'status-chip--warning': attachedCount === 0 }"
          >
            💅 {{ attachedCount }} / 10本
          </span>
          <span class="status-chip status-chip--format">VRM {{ vrmVersion || '0.x' }}</span>
          <span class="status-chip status-chip--shader">
            {{ materialType === 'mtoon' ? '🎨 MToon' : '✨ Standard' }}
          </span>
        </div>

        <div v-if="attachedCount === 0" class="alert-box alert-box--warning">
          {{ $t('exportModal.warningNoNails') }}
        </div>

        <!-- Primary Field: Filename -->
        <div class="form-group">
          <label class="form-label" for="export-filename">
            {{ $t('exportModal.filenameLabel') }} <span class="required">*</span>
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

        <!-- Advanced Options Toggle -->
        <div class="advanced-section">
          <button
            type="button"
            class="btn-advanced-toggle"
            :aria-expanded="showAdvanced"
            @click="showAdvanced = !showAdvanced"
          >
            <span class="advanced-chevron" :class="{ 'advanced-chevron--open': showAdvanced }">▸</span>
            <span>{{ $t('exportModal.advancedOptions') }}</span>
          </button>

          <div v-show="showAdvanced" class="advanced-content">
            <div class="form-group">
              <label class="form-label" for="export-title">{{ $t('exportModal.avatarTitleLabel') }}</label>
              <input
                id="export-title"
                v-model="avatarTitle"
                type="text"
                class="form-input"
                :placeholder="$t('exportModal.avatarTitleLabel')"
                :disabled="isExporting"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="export-author">{{ $t('exportModal.avatarAuthorLabel') }}</label>
              <input
                id="export-author"
                v-model="avatarAuthors"
                type="text"
                class="form-input"
                :placeholder="$t('exportModal.avatarAuthorLabel')"
                :disabled="isExporting"
              />
            </div>
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
          {{ $t('exportModal.cancel') }}
        </button>
        <button
          class="btn btn--primary btn--export"
          :disabled="isExporting || !fileName.trim()"
          @click="handleExport"
        >
          <span v-if="isExporting" class="spinner"></span>
          <span>{{ isExporting ? $t('exportModal.generating') : $t('exportModal.saveBtn') }}</span>
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
  private showAdvanced = false;

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
    this.showAdvanced = false;
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
  height: 100dvh;
  background: rgba(74, 56, 61, 0.35);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 12px;
  box-sizing: border-box;
}

.modal-card {
  background: #ffffff;
  border: 1px solid $border-medium;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 440px;
  max-height: calc(100dvh - 24px);
  max-height: calc(100vh - 24px);
  box-shadow: 0 16px 40px rgba(230, 140, 165, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;

  &__header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid $border-subtle;
    background: $bg-tertiary;
  }

  &__header-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__icon {
    font-size: 18px;
  }

  &__title {
    font-size: $font-size-sm;
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
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: $space-sm;
    padding: 12px 16px;
    border-top: 1px solid $border-subtle;
    background: $bg-tertiary;
    box-sizing: border-box;

    @media (max-width: 520px) {
      flex-direction: column-reverse;
      padding: 12px 14px;
      gap: 8px;

      .btn {
        width: 100%;
        justify-content: center;
        padding: 11px 16px;
        font-size: 14px;
        box-sizing: border-box;
      }
    }
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

/* Compact status chips */
.export-status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: $radius-full;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  color: $text-secondary;

  &--nails {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.25);
    color: #059669;
    font-weight: 700;
  }

  &--warning {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.3);
    color: #d97706;
  }

  &--format {
    color: $accent-purple;
    background: rgba(185, 155, 248, 0.1);
    border-color: rgba(185, 155, 248, 0.25);
  }

  &--shader {
    color: $accent-pink;
    background: rgba(255, 117, 151, 0.08);
    border-color: rgba(255, 117, 151, 0.25);
  }
}

/* Form Styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  width: 100%;
  box-sizing: border-box;
  background: $bg-tertiary;
  border: 1px solid $border-medium;
  border-radius: $radius-md;
  color: $text-primary;
  padding: 9px 12px;
  font-size: 13px;
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

/* Advanced section */
.advanced-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

.btn-advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  font-size: 11px;
  font-weight: 600;
  color: $text-secondary;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
  transition: color $transition-fast;

  &:hover {
    color: $accent-pink;
  }
}

.advanced-chevron {
  font-size: 10px;
  display: inline-block;
  transition: transform $transition-fast;

  &--open {
    transform: rotate(90deg);
  }
}

.advanced-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  background: $bg-tertiary;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  animation: modal-pop 0.15s ease;
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
  padding: 8px 16px;
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
  white-space: nowrap;

  &--secondary {
    background: #ffffff;
    color: $text-primary;
    border: 1px solid $border-medium;
    box-shadow: $shadow-sm;

    &:hover:not(:disabled) {
      background: $bg-tertiary;
      border-color: $accent-pink;
      color: $accent-pink;
    }
  }

  &--primary {
    background: $accent-gradient;
    color: #fff;
    box-shadow: 0 4px 14px rgba(255, 117, 151, 0.35);

    &:hover:not(:disabled) {
      background: $accent-gradient-hover;
      box-shadow: 0 6px 18px rgba(255, 117, 151, 0.45);
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
