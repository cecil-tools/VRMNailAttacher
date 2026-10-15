<template>
  <div class="nail-profile-control">
    <!-- Status / Info Bar -->
    <div class="profile-info-bar">
      <div class="profile-info-left">
        <span class="profile-avatar-label">{{ $t('nailProfile.targetAvatar') }}:</span>
        <span class="profile-avatar-name" :title="currentAvatarName">{{ currentAvatarName }}</span>
      </div>
      <span
        v-if="hasBrowserSavedData"
        class="profile-saved-badge"
        :title="$t('nailProfile.savedBadgeTitle')"
      >
        ● {{ $t('nailProfile.savedBadge') }}
      </span>
    </div>

    <!-- Notification / Message Banner -->
    <transition name="fade">
      <div
        v-if="statusMessage"
        class="profile-status-banner"
        :class="`profile-status-banner--${statusType}`"
      >
        <span class="profile-status-icon">{{ statusIcon }}</span>
        <span class="profile-status-text">{{ statusMessage }}</span>
      </div>
    </transition>

    <!-- Action Buttons Grid: JSON File Operations -->
    <div class="profile-btn-group">
      <button
        type="button"
        class="btn-profile btn-profile--export"
        :title="$t('nailProfile.exportJsonTooltip')"
        @click="exportJson"
      >
        <span class="btn-icon">💾</span>
        <span>{{ $t('nailProfile.exportJson') }}</span>
      </button>

      <button
        type="button"
        class="btn-profile btn-profile--import"
        :title="$t('nailProfile.importJsonTooltip')"
        @click="triggerImportInput"
      >
        <span class="btn-icon">📂</span>
        <span>{{ $t('nailProfile.importJson') }}</span>
      </button>

      <!-- Hidden file input for JSON import -->
      <input
        ref="importFileInput"
        type="file"
        accept=".json"
        style="display: none;"
        @change="onImportFileSelected"
      />
    </div>

    <!-- Action Buttons Grid: Browser LocalStorage Operations -->
    <div class="profile-btn-group">
      <button
        type="button"
        class="btn-profile btn-profile--save-browser"
        :title="$t('nailProfile.saveBrowserTooltip')"
        @click="saveToBrowser"
      >
        <span class="btn-icon">📌</span>
        <span>{{ $t('nailProfile.saveBrowser') }}</span>
      </button>

      <button
        type="button"
        class="btn-profile btn-profile--load-browser"
        :class="{ 'btn-profile--disabled': !hasBrowserSavedData }"
        :disabled="!hasBrowserSavedData"
        :title="$t('nailProfile.loadBrowserTooltip')"
        @click="loadFromBrowser"
      >
        <span class="btn-icon">↺</span>
        <span>{{ $t('nailProfile.loadBrowser') }}</span>
      </button>
    </div>

    <!-- Auto-save Toggle -->
    <div class="profile-autosave-row">
      <label class="profile-checkbox-label">
        <input
          type="checkbox"
          v-model="autoSaveEnabled"
          @change="onAutoSaveToggled"
        />
        <span>{{ $t('nailProfile.autoSaveLabel') }}</span>
      </label>
      <span class="profile-hint">{{ $t('nailProfile.autoSaveHint') }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Ref, Watch } from 'vue-property-decorator';
import { NailProfileManager } from '@/modules/nail/NailProfileManager';
import { NailProfileData, NailProfileAvatarMeta } from '@/modules/nail/types';

@Component
export default class NailProfileControl extends Vue {
  @Ref('importFileInput') readonly importFileInput!: HTMLInputElement;

  private statusMessage = '';
  private statusType: 'success' | 'warn' | 'error' = 'success';
  private statusTimer: number | null = null;
  private hasBrowserSavedData = false;
  private autoSaveEnabled = true;

  get currentAvatarName(): string {
    const meta = this.$store.state.currentMeta;
    return meta?.title || this.$store.state.currentModelName || 'avatar';
  }

  get currentAvatarMeta(): NailProfileAvatarMeta {
    const meta = this.$store.state.currentMeta;
    return {
      name: this.currentAvatarName,
      version: meta?.version,
      authors: meta?.authors,
      vrmFormatVersion: meta?.vrmFormatVersion
    };
  }

  get statusIcon(): string {
    if (this.statusType === 'success') return '✓';
    if (this.statusType === 'warn') return '⚠';
    return '✕';
  }

  mounted() {
    this.checkBrowserSavedData();
    // LocalStorageから自動保存フラグの読み込み
    const savedAuto = localStorage.getItem('vrm_nail_autosave_enabled');
    if (savedAuto !== null) {
      this.autoSaveEnabled = savedAuto === 'true';
    }
  }

  @Watch('currentAvatarName')
  onAvatarNameChanged() {
    this.checkBrowserSavedData();
    // アバター切り替え時、自動復元フラグが有効なら自動復元を試行
    if (this.autoSaveEnabled && this.hasBrowserSavedData) {
      this.loadFromBrowser(true);
    }
  }

  public checkBrowserSavedData(): void {
    this.hasBrowserSavedData = NailProfileManager.hasSavedProfile(this.currentAvatarName);
  }

  private showStatus(msg: string, type: 'success' | 'warn' | 'error' = 'success', duration = 3000): void {
    this.statusMessage = msg;
    this.statusType = type;
    if (this.statusTimer) {
      window.clearTimeout(this.statusTimer);
    }
    this.statusTimer = window.setTimeout(() => {
      this.statusMessage = '';
    }, duration);
  }

  /**
   * JSONファイルとしてエクスポート
   */
  public exportJson(): void {
    try {
      const nailState = this.$store.state.nail;
      const profile = NailProfileManager.createProfile(this.currentAvatarMeta, nailState);
      NailProfileManager.exportProfileAsJsonFile(profile);
      this.showStatus(this.$t('nailProfile.msgExportSuccess') as string, 'success');
    } catch (e: any) {
      console.error('Export error:', e);
      this.showStatus(this.$t('nailProfile.msgExportError') as string, 'error');
    }
  }

  /**
   * JSONファイルインポート用のダイアログを開く
   */
  public triggerImportInput(): void {
    if (this.importFileInput) {
      this.importFileInput.value = '';
      this.importFileInput.click();
    }
  }

  /**
   * インポートファイルが選択された時の処理
   */
  public async onImportFileSelected(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      const text = await file.text();
      const res = NailProfileManager.parseAndValidateProfileJson(text, this.currentAvatarName);

      if (!res.success || !res.profile) {
        this.showStatus(res.error || (this.$t('nailProfile.msgInvalidJson') as string), 'error', 4000);
        return;
      }

      // アバター名が異なる場合の確認
      if (res.isAvatarMismatch) {
        const confirmMsg = (this.$t('nailProfile.confirmAvatarMismatch') as string)
          .replace('{profileAvatar}', res.profile.avatar.name)
          .replace('{currentAvatar}', this.currentAvatarName);
        if (!window.confirm(confirmMsg)) {
          return;
        }
      }

      this.applyImportedProfile(res.profile);
      this.showStatus(this.$t('nailProfile.msgImportSuccess') as string, 'success');
    } catch (e: any) {
      console.error('Import error:', e);
      this.showStatus((this.$t('nailProfile.msgImportError') as string) + ': ' + (e.message || ''), 'error');
    }
  }

  /**
   * ブラウザ LocalStorage に保存
   */
  public saveToBrowser(): void {
    try {
      const nailState = this.$store.state.nail;
      const profile = NailProfileManager.createProfile(this.currentAvatarMeta, nailState);
      const ok = NailProfileManager.saveToLocalStorage(profile, false);
      if (ok) {
        this.hasBrowserSavedData = true;
        this.showStatus(this.$t('nailProfile.msgSaveBrowserSuccess') as string, 'success');
      } else {
        this.showStatus(this.$t('nailProfile.msgSaveBrowserError') as string, 'error');
      }
    } catch (e: any) {
      this.showStatus((this.$t('nailProfile.msgSaveBrowserError') as string) + ': ' + (e.message || ''), 'error');
    }
  }

  /**
   * ブラウザ LocalStorage から復元
   */
  public loadFromBrowser(isSilent = false): void {
    const profile = NailProfileManager.loadFromLocalStorage(this.currentAvatarName, false);
    if (!profile) {
      if (!isSilent) {
        this.showStatus(this.$t('nailProfile.msgNoSavedData') as string, 'warn');
      }
      return;
    }

    this.applyImportedProfile(profile);
    if (!isSilent) {
      this.showStatus(this.$t('nailProfile.msgLoadBrowserSuccess') as string, 'success');
    }
  }

  /**
   * プロファイルデータをVuexに適用し、親コンポーネントへ通知
   */
  private applyImportedProfile(profile: NailProfileData): void {
    this.$store.commit('nail/applyProfile', profile);
    this.$emit('profile-applied', profile);

    // 自動保存が有効ならブラウザにも保存を同期
    if (this.autoSaveEnabled) {
      NailProfileManager.saveToLocalStorage(profile, false);
      this.hasBrowserSavedData = true;
    }
  }

  private onAutoSaveToggled(): void {
    localStorage.setItem('vrm_nail_autosave_enabled', String(this.autoSaveEnabled));
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/variables';

.nail-profile-control {
  display: flex;
  flex-direction: column;
  gap: $space-sm;
  padding: $space-xs 0;
}

.profile-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-sm;
  padding: 6px 10px;
  background: $bg-tertiary;
  border-radius: $radius-sm;
  font-size: 11px;
}

.profile-info-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.profile-avatar-label {
  color: $text-secondary;
  font-weight: 500;
  white-space: nowrap;
}

.profile-avatar-name {
  color: $text-primary;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.profile-saved-badge {
  font-size: 10px;
  font-weight: 600;
  color: $color-success;
  background: rgba($color-success, 0.12);
  padding: 2px 7px;
  border-radius: $radius-full;
  white-space: nowrap;
}

.profile-status-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: $radius-sm;
  font-size: 11px;
  font-weight: 600;

  &--success {
    background: rgba($color-success, 0.15);
    color: darken($color-success, 10%);
    border: 1px solid rgba($color-success, 0.3);
  }

  &--warn {
    background: rgba($color-warning, 0.15);
    color: darken($color-warning, 15%);
    border: 1px solid rgba($color-warning, 0.3);
  }

  &--error {
    background: rgba($color-error, 0.15);
    color: $color-error;
    border: 1px solid rgba($color-error, 0.3);
  }
}

.profile-status-icon {
  font-weight: bold;
}

.profile-btn-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-xs;
}

.btn-profile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-fast;
  border: 1px solid $border-subtle;
  background: #ffffff;
  color: $text-primary;

  .btn-icon {
    font-size: 12px;
  }

  &:hover:not(:disabled) {
    background: $bg-secondary;
    border-color: $accent-pink;
    color: $accent-pink;
  }

  &--export {
    &:hover {
      border-color: $accent-pink;
    }
  }

  &--import {
    &:hover {
      border-color: $color-info;
      color: $color-info;
    }
  }

  &--save-browser {
    &:hover {
      border-color: $color-success;
      color: $color-success;
    }
  }

  &--load-browser {
    &:hover:not(:disabled) {
      border-color: $accent-pink;
    }
  }


  &--disabled,
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: $bg-tertiary;
    border-color: $border-subtle;
    color: $text-secondary;
  }
}

.profile-autosave-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
  font-size: 11px;
}

.profile-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: $text-secondary;
  font-weight: 500;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: $accent-pink;
  }
}

.profile-hint {
  font-size: 10px;
  color: $text-muted;
}


.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
