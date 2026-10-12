<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card capture-modal" role="dialog" aria-modal="true">
      <!-- Modal Header -->
      <div class="modal-card__header">
        <div class="modal-card__title-group">
          <span class="modal-card__icon">📸</span>
          <h2 class="modal-card__title">{{ $t('captureModal.title') }}</h2>
        </div>
        <button
          type="button"
          class="modal-card__close-btn"
          :title="$t('common.close')"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-card__body">
        <!-- Preview Container -->
        <div class="capture-preview-container" :class="{ 'capture-preview-container--transparent': isTransparent }">
          <img
            v-if="imageDataUrl"
            :src="imageDataUrl"
            :alt="$t('captureModal.previewAlt')"
            class="capture-preview-image"
          />
          <div v-else class="capture-preview-loading">
            <span>{{ $t('common.loading') }}</span>
          </div>
        </div>

        <!-- Options: Background Toggle -->
        <div class="capture-options">
          <span class="capture-options__label">{{ $t('captureModal.bgOption') }}:</span>
          <div class="capture-options__buttons">
            <button
              type="button"
              class="option-pill-btn"
              :class="{ 'option-pill-btn--active': !isTransparent }"
              @click="toggleTransparent(false)"
            >
              <span>🌸 {{ $t('captureModal.bgSalon') }}</span>
            </button>
            <button
              type="button"
              class="option-pill-btn"
              :class="{ 'option-pill-btn--active': isTransparent }"
              @click="toggleTransparent(true)"
            >
              <span>🏁 {{ $t('captureModal.bgTransparent') }}</span>
            </button>
          </div>
        </div>

        <!-- Notification Toast -->
        <div v-if="toastMessage" class="capture-toast">
          {{ toastMessage }}
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-card__footer capture-footer">
        <button type="button" class="btn btn--secondary" @click="$emit('retake')">
          <span>🔄 {{ $t('captureModal.retake') }}</span>
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="!imageBlob"
          @click="copyToClipboard"
        >
          <span>📋 {{ $t('captureModal.copy') }}</span>
        </button>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="!imageDataUrl"
          @click="downloadImage"
        >
          <span>💾 {{ $t('captureModal.download') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class CaptureModal extends Vue {
  @Prop({ default: false }) public visible!: boolean;
  @Prop({ default: '' }) public imageDataUrl!: string;
  @Prop({ default: null }) public imageBlob!: Blob | null;
  @Prop({ default: 'avatar' }) public avatarName!: string;

  private isTransparent = false;
  private toastMessage = '';
  private toastTimer: any = null;

  private toggleTransparent(transparent: boolean): void {
    if (this.isTransparent === transparent) return;
    this.isTransparent = transparent;
    this.$emit('toggle-transparent', transparent);
  }

  private downloadImage(): void {
    if (!this.imageDataUrl) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const cleanName = (this.avatarName || 'vrm').replace(/[\s/\\?%*:|"<>]/g, '_');
    const filename = `nail_photo_${cleanName}_${timestamp}.png`;

    const a = document.createElement('a');
    a.href = this.imageDataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(this.$t('captureModal.saved') as string);
  }

  private async copyToClipboard(): Promise<void> {
    if (!this.imageBlob) return;

    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({ 'image/png': this.imageBlob });
        await navigator.clipboard.write([item]);
        this.showToast(this.$t('captureModal.copied') as string);
      } else {
        throw new Error('Clipboard API not supported');
      }
    } catch (err) {
      console.warn('[CaptureModal] Clipboard write failed:', err);
      this.showToast(this.$t('captureModal.copyFailed') as string);
    }
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
    }, 2500);
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/_variables.scss';

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(40, 20, 30, 0.45);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-md;
}

.modal-card {
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  background: #ffffff;
  border-radius: $radius-lg;
  box-shadow: 0 16px 40px rgba(220, 110, 140, 0.22);
  border: 1px solid $border-subtle;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: $breakpoint-mobile) {
    max-width: 95vw;
    border-radius: $radius-md;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-md $space-lg;
    border-bottom: 1px solid $border-subtle;
    background: linear-gradient(135deg, rgba(255, 245, 247, 0.9) 0%, rgba(255, 240, 243, 0.7) 100%);
  }

  &__title-group {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__icon {
    font-size: 1.3rem;
  }

  &__title {
    font-size: 1.1rem;
    font-weight: 700;
    color: $text-primary;
    margin: 0;
  }

  &__close-btn {
    width: 32px;
    height: 32px;
    border-radius: $radius-full;
    background: transparent;
    color: $text-secondary;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-fast;

    &:hover {
      background: rgba(255, 117, 151, 0.12);
      color: $accent-pink;
    }
  }

  &__body {
    padding: $space-lg;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $space-md;

    @media (max-width: $breakpoint-mobile) {
      padding: $space-md;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: $space-sm;
    padding: $space-md $space-lg;
    border-top: 1px solid $border-subtle;
    background: #ffffff;

    @media (max-width: $breakpoint-mobile) {
      padding: $space-sm $space-md;
      flex-wrap: wrap;

      .btn {
        flex: 1;
        min-width: 120px;
        padding: 6px 12px;
        font-size: 12px;
      }
    }
  }
}

.capture-preview-container {
  width: 100%;
  height: 360px;
  background: #faf0f4;
  border-radius: $radius-md;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid $border-medium;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;

  @media (max-width: $breakpoint-mobile) {
    height: 240px;
  }

  &--transparent {
    background-color: #f0f0f0;
    background-image: linear-gradient(45deg, #e4e4e4 25%, transparent 25%),
      linear-gradient(-45deg, #e4e4e4 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #e4e4e4 75%),
      linear-gradient(-45deg, transparent 75%, #e4e4e4 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  }
}

.capture-preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.capture-preview-loading {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
}

.capture-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
  padding: $space-sm $space-md;
  background: $bg-tertiary;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;

  &__label {
    font-size: 13px;
    font-weight: 700;
    color: $text-primary;
  }

  &__buttons {
    display: flex;
    gap: $space-xs;
  }
}

.option-pill-btn {
  padding: 5px 12px;
  border-radius: $radius-full;
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  background: #ffffff;
  border: 1px solid $border-subtle;
  cursor: pointer;
  transition: all $transition-fast;

  &--active {
    background: $accent-gradient;
    color: #ffffff;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba(255, 117, 151, 0.3);
  }

  &:hover:not(&--active) {
    border-color: $accent-pink;
    color: $accent-pink;
  }
}

.capture-toast {
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: $accent-pink;
  background: rgba(255, 117, 151, 0.12);
  padding: 6px 12px;
  border-radius: $radius-full;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
