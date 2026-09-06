<script setup lang="ts">
import type { CropHandle, CropRect } from '#shared/utils/image/crop'
import { initialCrop, moveCrop, resizeCrop } from '#shared/utils/image/crop'

/**
 * A crop box over an image. The model holds the box in the pixels of the
 * source image, so the studio can send it to the crop step as it is.
 */
const props = defineProps<{
  src: string
  alt?: string
  /** Width divided by height. Null or undefined lets the user pick any shape. */
  aspect?: number | null
}>()

const crop = defineModel<CropRect | null>({ default: null })

const imageRef = ref<HTMLImageElement | null>(null)
const natural = ref({ width: 0, height: 0 })
const { width: shownWidth } = useElementSize(imageRef)
const scale = computed(() => (natural.value.width ? shownWidth.value / natural.value.width : 1))

function resetCrop() {
  if (natural.value.width && natural.value.height) {
    crop.value = initialCrop(natural.value.width, natural.value.height, props.aspect)
  }
}

function onLoad() {
  const image = imageRef.value
  if (!image) {
    return
  }
  natural.value = { width: image.naturalWidth, height: image.naturalHeight }
  resetCrop()
}

watch(() => props.aspect, resetCrop)

type DragKind = 'move' | CropHandle

const drag = ref<{ kind: DragKind, startX: number, startY: number, start: CropRect } | null>(null)

function startDrag(kind: DragKind, event: PointerEvent) {
  if (!crop.value) {
    return
  }
  // No preventDefault here: it would stop the box from taking focus, and the
  // arrow keys need that focus. The image is not draggable, so nothing else moves.
  drag.value = { kind, startX: event.clientX, startY: event.clientY, start: crop.value }
}

useEventListener(window, 'pointermove', (event: PointerEvent) => {
  const active = drag.value
  if (!active) {
    return
  }
  const dx = (event.clientX - active.startX) / scale.value
  const dy = (event.clientY - active.startY) / scale.value
  const { width, height } = natural.value
  crop.value = active.kind === 'move'
    ? moveCrop(active.start, dx, dy, width, height)
    : resizeCrop(active.start, active.kind, dx, dy, width, height, props.aspect)
})

useEventListener(window, 'pointerup', () => {
  drag.value = null
})

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1]
}

function onKeydown(event: KeyboardEvent) {
  const arrow = ARROWS[event.key]
  if (!arrow || !crop.value) {
    return
  }
  event.preventDefault()
  const step = event.shiftKey ? 10 : 1
  crop.value = moveCrop(crop.value, arrow[0] * step, arrow[1] * step, natural.value.width, natural.value.height)
}

const boxStyle = computed(() => {
  const rect = crop.value
  if (!rect) {
    return undefined
  }
  return {
    left: `${rect.x * scale.value}px`,
    top: `${rect.y * scale.value}px`,
    width: `${rect.width * scale.value}px`,
    height: `${rect.height * scale.value}px`
  }
})

const HANDLES: { id: CropHandle, class: string }[] = [
  { id: 'nw', class: '-left-1.5 -top-1.5 cursor-nwse-resize' },
  { id: 'ne', class: '-right-1.5 -top-1.5 cursor-nesw-resize' },
  { id: 'sw', class: '-left-1.5 -bottom-1.5 cursor-nesw-resize' },
  { id: 'se', class: '-right-1.5 -bottom-1.5 cursor-nwse-resize' }
]
</script>

<template>
  <div class="relative inline-block max-w-full select-none overflow-hidden rounded bg-default leading-none touch-none">
    <img
      ref="imageRef"
      :src="src"
      :alt="alt ?? 'Image to crop'"
      class="block max-h-96 max-w-full"
      draggable="false"
      @load="onLoad"
    >
    <div
      v-if="boxStyle"
      class="absolute cursor-move border border-inverted shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :style="boxStyle"
      role="group"
      tabindex="0"
      aria-label="Crop area. Use the arrow keys to move it. Hold Shift for a larger step."
      @pointerdown="startDrag('move', $event)"
      @keydown="onKeydown"
    >
      <span
        v-for="handle in HANDLES"
        :key="handle.id"
        class="absolute size-3 rounded-sm border border-default bg-inverted"
        :class="handle.class"
        @pointerdown.stop="startDrag(handle.id, $event)"
      />
    </div>
  </div>
</template>
