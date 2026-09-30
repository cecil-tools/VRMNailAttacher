<template>
  <div class="texture-control">
    <div class="control-group">
      <div class="control-group__header">
        <span class="control-group__title">ネイルデザイン (テクスチャ)</span>
      </div>

      <div class="texture-grid">
        <button
          v-for="tex in textures"
          :key="tex.id"
          class="texture-card"
          :class="{ 'texture-card--active': currentTextureId === tex.id }"
          @click="selectTexture(tex.id)"
        >
          <span class="texture-card__icon">💅</span>
          <span class="texture-card__label">{{ tex.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { RYUKI_PRESET, NailTextureOption } from '@/modules/nail/types';

@Component
export default class TextureControl extends Vue {
  get textures(): NailTextureOption[] {
    return RYUKI_PRESET.textures;
  }

  get currentTextureId(): string | null {
    return this.$store.state.nail?.selectedTextureId || 'cheek';
  }

  private selectTexture(textureId: string) {
    this.$emit('texture-change', textureId);
  }
}
</script>

<style lang="scss" scoped>
.texture-control {
  margin-top: 12px;
}

.control-group {
  background: var(--color-surface, #23272e);
  border: 1px solid var(--color-border, #333842);
  border-radius: 8px;
  padding: 12px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary, #9da5b4);
  }
}

.texture-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.texture-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--color-bg, #1e1e24);
  border: 1px solid var(--color-border, #3e4451);
  border-radius: 6px;
  color: var(--color-text, #abb2bf);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    border-color: var(--color-primary, #61afef);
    background: rgba(97, 175, 239, 0.08);
  }

  &--active {
    border-color: var(--color-primary, #61afef);
    background: rgba(97, 175, 239, 0.16);
    color: #fff;
    font-weight: 600;
  }

  &__icon {
    font-size: 14px;
  }

  &__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
