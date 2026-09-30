<template>
  <div class="texture-control">
    <div class="control-group">
      <div class="control-group__header">
        <span class="control-group__title">ネイルデザイン (テクスチャ)</span>
      </div>

      <div class="texture-grid">
        <button
          v-for="tex in formattedTextures"
          :key="tex.id"
          class="texture-card"
          :class="{ 'texture-card--active': currentTextureId === tex.id }"
          :title="tex.fullName"
          @click="selectTexture(tex.id)"
        >
          <span class="texture-card__icon">💅</span>
          <div class="texture-card__text">
            <span class="texture-card__name">{{ tex.jpName }}</span>
            <span v-if="tex.enName" class="texture-card__sub">{{ tex.enName }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { RYUKI_PRESET, NailTextureOption } from '@/modules/nail/types';

interface FormattedTexture {
  id: string;
  fullName: string;
  jpName: string;
  enName: string;
}

@Component
export default class TextureControl extends Vue {
  get textures(): NailTextureOption[] {
    return RYUKI_PRESET.textures;
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
        enName
      };
    });
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

.texture-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.texture-card {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
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

  &__icon {
    font-size: 13px;
    flex-shrink: 0;
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
</style>
