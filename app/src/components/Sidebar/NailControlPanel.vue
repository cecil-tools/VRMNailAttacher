<template>
  <div class="nail-control-panel">
    <!-- Header with Toggle -->
    <div class="panel-header">
      <div class="panel-header__info">
        <h3 class="panel-title">{{ $t('nailPanel.title') }}</h3>
        <span class="badge" :class="isAttached ? 'badge--success' : 'badge--muted'">
          {{ isAttached ? $t('nailPanel.statusAttached') : $t('nailPanel.statusUnattached') }}
        </span>
      </div>

      <label class="switch" :title="$t('nailPanel.switchTitle')">
        <input
          type="checkbox"
          :checked="isAttached"
          :disabled="!hasModel || isLoading"
          @change="onToggleAttach"
        />
        <span class="slider round"></span>
      </label>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="panel-loading">
      <span class="spinner-small"></span>
      <span>{{ $t('nailPanel.preparing') }}</span>
    </div>

    <!-- Active Nail Controls -->
    <div v-else-if="isAttached" class="panel-content">
      <!-- ============================================== -->
      <!-- GROUP 1: 全体設定 (Global Settings) -->
      <!-- ============================================== -->
      <section class="panel-group" aria-labelledby="group-global-title">
        <div class="panel-group__header">
          <span class="panel-group__badge">{{ $t('nailPanel.groupGlobalBadge') }}</span>
          <span id="group-global-title" class="panel-group__title">{{ $t('nailPanel.groupGlobal') }}</span>
        </div>

        <!-- 1. ネイルデザイン (テクスチャ) [アコーディオン] -->
        <div class="step-card" :class="{ 'step-card--collapsed': !isDesignOpen }">
          <button
            type="button"
            class="step-card__header"
            :aria-expanded="isDesignOpen"
            @click="isDesignOpen = !isDesignOpen"
          >
            <div class="step-card__title-wrap">
              <span class="step-title">{{ $t('nailPanel.stepDesign') }}</span>
            </div>
            <div class="step-card__header-right">
              <span v-if="activeTextureName" class="step-card__summary-badge" :title="activeTextureName">
                {{ activeTextureName }}
              </span>
              <span class="step-card__chevron" :class="{ 'step-card__chevron--open': isDesignOpen }">
                ▾
              </span>
            </div>
          </button>

          <div v-show="isDesignOpen" class="step-card__body">
            <TextureControl
              :hide-header="true"
              @texture-change="onTextureChange"
              @material-type-change="onMaterialTypeChange"
            />
          </div>
        </div>

        <!-- 2. 指メッシュに自動フィット -->
        <div class="mesh-fit-bar">
          <div class="mesh-fit-left">
            <label class="mesh-fit-label" :title="$t('nailPanel.autoMeshFitTitle')">
              <input
                type="checkbox"
                :checked="autoMeshFit"
                @change="onToggleAutoMeshFit"
              />
              <span class="mesh-fit-text">{{ $t('nailPanel.autoMeshFit') }}</span>
            </label>
          </div>
          <span class="mesh-fit-badge">{{ $t('nailPanel.autoMeshFitBadge') }}</span>
        </div>

        <!-- 3. 全指一括サイズ調整 [アコーディオン] -->
        <div class="step-card" :class="{ 'step-card--collapsed': !isGlobalScaleOpen }">
          <button
            type="button"
            class="step-card__header"
            :aria-expanded="isGlobalScaleOpen"
            @click="isGlobalScaleOpen = !isGlobalScaleOpen"
          >
            <div class="step-card__title-wrap">
              <span class="step-title">{{ $t('nailPanel.stepGlobalScale') }}</span>
            </div>
            <div class="step-card__header-right">
              <button
                type="button"
                class="btn-reset-mini"
                :title="$t('globalScale.resetTooltip')"
                @click.stop="handleResetGlobalScale"
              >
                ↺ 1.0x
              </button>
              <span class="step-card__summary-badge step-card__summary-badge--val">
                {{ globalScaleSummary }}
              </span>
              <span class="step-card__chevron" :class="{ 'step-card__chevron--open': isGlobalScaleOpen }">
                ▾
              </span>
            </div>
          </button>

          <div v-show="isGlobalScaleOpen" class="step-card__body">
            <GlobalScaleControl
              :hide-header="true"
              @global-scale-change="onGlobalScaleChange"
              @reset-global-scale="onResetGlobalScale"
            />
          </div>
        </div>
      </section>

      <!-- ============================================== -->
      <!-- GROUP 2: 個別調整 (Per-Finger Tuning) -->
      <!-- ============================================== -->
      <section class="panel-group panel-group--individual" aria-labelledby="group-individual-title">
        <div class="panel-group__header">
          <span class="panel-group__badge panel-group__badge--accent">{{ $t('nailPanel.groupIndividualBadge') }}</span>
          <span id="group-individual-title" class="panel-group__title">{{ $t('nailPanel.groupIndividual') }}</span>
        </div>

        <!-- 4. 左手,右手 (指選択) -->
        <div class="step-card step-card--static">
          <div class="step-card__header step-card__header--no-toggle">
            <div class="step-card__title-wrap">
              <span class="step-title">{{ $t('nailPanel.stepFingerSelect') }}</span>
            </div>
            <span class="step-card__summary-badge step-card__summary-badge--active">
              {{ currentFingerLabel }}
            </span>
          </div>
          <div class="step-card__body">
            <FingerSelector
              @select-finger="onSelectFinger"
              @focus-finger="onFocusFinger"
            />
          </div>
        </div>

        <!-- 5. 各オフセット (位置・角度・形状) [アコーディオン] -->
        <div class="step-card" :class="{ 'step-card--collapsed': !isOffsetOpen }">
          <button
            type="button"
            class="step-card__header"
            :aria-expanded="isOffsetOpen"
            @click="isOffsetOpen = !isOffsetOpen"
          >
            <div class="step-card__title-wrap">
              <span class="step-title">{{ $t('nailPanel.stepOffset') }}</span>
            </div>
            <div class="step-card__header-right">
              <span class="step-card__chevron" :class="{ 'step-card__chevron--open': isOffsetOpen }">
                ▾
              </span>
            </div>
          </button>

          <div v-show="isOffsetOpen" class="step-card__body step-card__body--nested">
            <TransformControl
              @transform-change="onTransformChange"
              @reset="onResetTransform"
              @apply-all="onApplyAllTransform"
            />
            <MorphControl
              @morph-change="onMorphChange"
              @morph-reset="onMorphReset"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- Inactive State Hint -->
    <div v-else class="panel-empty">
      <p class="panel-empty__desc">
        {{ $t('nailPanel.emptyDesc') }}
      </p>
      <button
        class="btn btn--primary btn--full"
        :disabled="!hasModel"
        @click="attachNails"
      >
        <span>{{ $t('nailPanel.attachButton') }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import GlobalScaleControl from './GlobalScaleControl.vue';
import FingerSelector from './FingerSelector.vue';
import TextureControl from './TextureControl.vue';
import TransformControl from './TransformControl.vue';
import MorphControl from './MorphControl.vue';
import { FingerId, NailTransform, NailMaterialType, RYUKI_PRESET } from '@/modules/nail/types';

@Component({
  components: {
    GlobalScaleControl,
    FingerSelector,
    TextureControl,
    TransformControl,
    MorphControl
  }
})
export default class NailControlPanel extends Vue {
  // アコーディオン開閉状態（デフォルトすべて開いた状態、手動で折りたたみ可能）
  private isDesignOpen = true;
  private isGlobalScaleOpen = true;
  private isOffsetOpen = true;

  get hasModel(): boolean {
    return this.$store.getters.hasModel;
  }

  get isAttached(): boolean {
    return this.$store.state.nail?.isAttached || false;
  }

  get isLoading(): boolean {
    return this.$store.state.nail?.isLoading || false;
  }

  get autoMeshFit(): boolean {
    return this.$store.state.nail?.autoMeshFit ?? true;
  }

  get activeTextureName(): string {
    const texList = RYUKI_PRESET.textures;
    const currentId = this.$store.state.nail?.selectedTextureId || 'cheek';
    const found = texList.find(t => t.id === currentId);
    if (found) {
      const match = found.label.match(/^([^(]+)/);
      return match ? match[1].trim() : found.label;
    }
    const customs = this.$store.state.nail?.customTextures || [];
    const foundCustom = customs.find((c: any) => c.id === currentId);
    if (foundCustom) {
      return foundCustom.name;
    }
    return '';
  }

  get globalScaleSummary(): string {
    const scale = this.$store.state.nail?.globalScale?.scaleAll ?? 1.0;
    return `${scale.toFixed(2)}x`;
  }

  get currentFingerLabel(): string {
    const sel = (this.$store.state.nail?.selectedFinger as string) || 'leftIndex';
    const isLeft = sel.startsWith('left');
    const handKey = isLeft ? 'fingerSelector.leftHand' : 'fingerSelector.rightHand';
    const hand = this.$te(handKey) ? this.$t(handKey) : (isLeft ? '左手' : '右手');
    const typeKey = sel.replace(/^(left|right)/, '').toLowerCase();
    const fingerName = this.$te(`fingerSelector.fingers.${typeKey}`)
      ? this.$t(`fingerSelector.fingers.${typeKey}`)
      : typeKey;
    return `${hand}・${fingerName}`;
  }

  private handleResetGlobalScale() {
    this.$store.commit('nail/resetGlobalScale');
    this.$emit('reset-global-scale');
  }

  private onToggleAutoMeshFit(e: Event) {
    const target = e.target as HTMLInputElement;
    this.$store.commit('nail/setAutoMeshFit', target.checked);
  }

  private onToggleAttach(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.checked) {
      this.attachNails();
    } else {
      this.detachNails();
    }
  }

  private attachNails() {
    this.$emit('request-attach');
  }

  private detachNails() {
    this.$emit('request-detach');
  }

  private onSelectFinger(fingerId: FingerId) {
    this.$emit('select-finger', fingerId);
  }

  private onFocusFinger(fingerId: FingerId) {
    this.$emit('focus-finger', fingerId);
  }

  private onTextureChange(textureId: string) {
    this.$emit('texture-change', textureId);
  }

  private onMaterialTypeChange(type: NailMaterialType) {
    this.$emit('material-type-change', type);
  }

  private onTransformChange(payload: { fingerId: FingerId; key: keyof NailTransform; value: number }) {
    this.$emit('transform-change', payload);
  }

  private onResetTransform(fingerId: FingerId) {
    this.$emit('reset-transform', fingerId);
  }

  private onApplyAllTransform(transform: NailTransform) {
    this.$emit('apply-all-transform', transform);
  }

  private onGlobalScaleChange(payload?: { key: string; value: number }) {
    this.$emit('global-scale-change', payload);
  }

  private onResetGlobalScale() {
    this.$emit('reset-global-scale');
  }

  private onMorphChange(payload: { fingerId: FingerId; name: string; value: number }) {
    this.$emit('morph-change', payload);
  }

  private onMorphReset(fingerId: FingerId) {
    this.$emit('morph-reset', fingerId);
  }
}
</script>

<style lang="scss" scoped>
.nail-control-panel {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  &__info {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }
}

.panel-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: $space-lg;
}

/* Group Headers & Badges */
.panel-group {
  display: flex;
  flex-direction: column;
  gap: $space-sm;

  &__header {
    display: flex;
    align-items: center;
    gap: $space-xs;
    padding: 0 $space-xs;
    margin-bottom: 2px;
  }

  &__badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: $radius-full;
    background: rgba(185, 155, 248, 0.15);
    color: $accent-purple;
    letter-spacing: 0.04em;

    &--accent {
      background: rgba(255, 117, 151, 0.15);
      color: $accent-pink;
    }
  }

  &__title {
    font-size: 11px;
    font-weight: 700;
    color: $text-secondary;
    letter-spacing: 0.02em;
  }
}

/* Step Cards & Accordion */
.step-card {
  background: #ffffff;
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(230, 140, 165, 0.06);
  transition: all $transition-normal;

  &:hover {
    border-color: rgba(255, 117, 151, 0.35);
  }

  &--collapsed {
    box-shadow: 0 1px 4px rgba(230, 140, 165, 0.04);
  }

  &__header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    user-select: none;
    transition: background $transition-fast;

    &:hover {
      background: rgba(255, 240, 243, 0.45);
    }

    &--no-toggle {
      cursor: default;

      &:hover {
        background: transparent;
      }
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: $space-xs;
  }

  &__header-right {
    display: flex;
    align-items: center;
    gap: $space-xs;
  }

  &__summary-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: $radius-full;
    background: $bg-tertiary;
    color: $text-secondary;
    border: 1px solid $border-subtle;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--val {
      color: $accent-pink;
      font-weight: 700;
      background: rgba(255, 117, 151, 0.08);
      border-color: rgba(255, 117, 151, 0.2);
    }

    &--active {
      color: $accent-pink;
      font-weight: 700;
      background: rgba(255, 117, 151, 0.08);
      border-color: rgba(255, 117, 151, 0.25);
    }
  }

  &__chevron {
    font-size: 11px;
    color: $text-muted;
    transition: transform $transition-normal;
    display: inline-block;
    padding-left: 2px;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__body {
    padding: 2px 14px 14px 14px;
    border-top: 1px solid rgba(255, 224, 233, 0.35);
    animation: accordion-fade 0.2s ease;

    &--nested {
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: $space-md;
    }
  }
}


.step-icon {
  font-size: 13px;
  line-height: 1;
}

.step-title {
  font-size: $font-size-xs;
  font-weight: 700;
  color: $text-primary;
}

.btn-reset-mini {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: $radius-sm;
  background: $bg-tertiary;
  border: 1px solid $border-medium;
  color: $accent-pink;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $accent-pink;
    color: #ffffff;
  }
}

/* Mesh Fit Bar */
.mesh-fit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 117, 151, 0.08);
  border: 1px solid rgba(255, 117, 151, 0.25);
  border-radius: $radius-lg;
  transition: all $transition-fast;

  &:hover {
    background: rgba(255, 117, 151, 0.12);
    border-color: rgba(255, 117, 151, 0.4);
  }

  .mesh-fit-left {
    display: flex;
    align-items: center;
    gap: $space-xs;
  }

  .mesh-fit-label {
    display: flex;
    align-items: center;
    gap: $space-xs;
    cursor: pointer;
    user-select: none;

    input[type="checkbox"] {
      accent-color: $accent-pink;
      cursor: pointer;
      width: 15px;
      height: 15px;
    }
  }

  .mesh-fit-text {
    font-size: $font-size-xs;
    font-weight: 700;
    color: $text-primary;
  }

  .mesh-fit-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: $radius-full;
    background: rgba(255, 117, 151, 0.18);
    color: $accent-pink;
  }
}

@keyframes accordion-fade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading & Empty */
.panel-loading {
  display: flex;
  align-items: center;
  gap: $space-sm;
  padding: $space-md;
  background: $bg-secondary;
  border-radius: $radius-md;
  font-size: $font-size-xs;
  color: $text-muted;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 101, 132, 0.2);
  border-top-color: $accent-pink;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.panel-empty {
  display: flex;
  flex-direction: column;
  gap: $space-md;

  &__desc {
    font-size: $font-size-xs;
    color: $text-muted;
    line-height: 1.6;
  }
}

/* Switch styling */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f0d5de;
  transition: 0.25s ease;

  &:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &.round {
    border-radius: 22px;

    &:before {
      border-radius: 50%;
    }
  }
}

input:checked + .slider {
  background: $accent-gradient;
  box-shadow: 0 2px 8px rgba(255, 117, 151, 0.35);
}

input:checked + .slider:before {
  transform: translateX(18px);
}

input:disabled + .slider {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
