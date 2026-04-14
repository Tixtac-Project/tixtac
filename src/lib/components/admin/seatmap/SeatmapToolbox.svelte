<script lang="ts">
  import type { SectionFormData } from '$lib/shared/schemas/event.schema';
  import { Armchair, Columns3, DoorOpen, GripVertical, Info, Theater, Users } from 'lucide-svelte';
  import {
    SECTION_COLORS,
    type CanvasSelection,
    type StageElement,
    type TicketTier,
  } from './types';

  let {
    tiers = [],
    selection,
    sections = [],
    stageElements = [],
    onAddSection,
    onAddTierToCanvas,
    onAddStageElement,
  }: {
    tiers?: TicketTier[];
    selection: CanvasSelection;
    sections?: SectionFormData[];
    stageElements?: StageElement[];
    onAddSection: (type: 'assigned' | 'general') => void;
    onAddTierToCanvas?: (tierIndex: number) => void;
    onAddStageElement: (type: 'stage' | 'obstacle' | 'entrance') => void;
  } = $props();

  let hasTiers = $derived(tiers.length > 0);
  let totalUnplaced = $derived(
    tiers.reduce((s, t) => s + Math.max(0, t.capacity - t.placedCount), 0),
  );

  // Selected section/stage info for the left panel
  let selectedSection = $derived(
    selection.kind === 'section' && sections[selection.index] ? sections[selection.index] : null,
  );
  let selectedSectionIndex = $derived(selection.kind === 'section' ? selection.index : -1);
  let selectedStage = $derived(
    selection.kind === 'stage'
      ? (stageElements.find((el) => el.id === selection.id) ?? null)
      : null,
  );

  function formatCurrency(n: number): string {
    return n.toLocaleString('vi-VN') + ' ₫';
  }

  function getSeatCount(sec: SectionFormData): number {
    return sec.type === 'general'
      ? (sec.capacity ?? 0)
      : (sec.seat_config.rows ?? 0) * (sec.seat_config.cols ?? 0);
  }
</script>

<aside class="flex w-52 flex-col overflow-y-auto border-r border-border bg-background">
  {#if selection.kind === 'section' && selectedSection}
    <!-- ═══ Selected Section Info ═══ -->
    <div class="p-3">
      <h3 class="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Đã chọn khu vực
      </h3>
      <div class="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div class="mb-2 flex items-center gap-2">
          <div
            class="h-4 w-4 shrink-0 rounded"
            style="background-color: {selectedSection.layout_config.color ||
              SECTION_COLORS[selectedSectionIndex % SECTION_COLORS.length]}"
          ></div>
          <span class="truncate text-sm font-semibold text-foreground">
            {selectedSection.name || `Khu ${selectedSectionIndex + 1}`}
          </span>
        </div>
        <div class="space-y-1 text-[11px] text-muted-foreground">
          <div class="flex items-center gap-1.5">
            {#if selectedSection.type === 'general'}
              <Users class="h-3 w-3 text-amber-500" />
              <span>Vé đứng (GA)</span>
            {:else}
              <Armchair class="h-3 w-3 text-blue-500" />
              <span>Ghế ngồi</span>
            {/if}
          </div>
          <div class="flex justify-between">
            <span>Số lượng:</span>
            <span class="font-medium text-foreground">
              {getSeatCount(selectedSection)}
              {selectedSection.type === 'general' ? 'vé' : 'ghế'}
            </span>
          </div>
          {#if selectedSection.price > 0}
            <div class="flex justify-between">
              <span>Giá:</span>
              <span class="font-medium text-foreground">
                {formatCurrency(selectedSection.price)}
              </span>
            </div>
          {/if}
          {#if selectedSection.type === 'assigned'}
            <div class="flex justify-between">
              <span>Lưới:</span>
              <span class="font-medium text-foreground">
                {selectedSection.seat_config.rows} × {selectedSection.seat_config.cols}
              </span>
            </div>
          {/if}
          <div class="flex justify-between">
            <span>Vị trí:</span>
            <span class="font-medium text-foreground">
              ({Math.round(selectedSection.layout_config.x)}, {Math.round(
                selectedSection.layout_config.y,
              )})
            </span>
          </div>
          <div class="flex justify-between">
            <span>Kích thước:</span>
            <span class="font-medium text-foreground">
              {Math.round(selectedSection.layout_config.width)} × {Math.round(
                selectedSection.layout_config.height,
              )}
            </span>
          </div>
          {#if selectedSection.layout_config.rotation}
            <div class="flex justify-between">
              <span>Xoay:</span>
              <span class="font-medium text-foreground">
                {selectedSection.layout_config.rotation}°
              </span>
            </div>
          {/if}
        </div>
      </div>
      <p class="mt-2 text-[10px] text-muted-foreground italic">
        <Info class="mr-0.5 inline h-3 w-3" />
        Chỉnh sửa thuộc tính ở bảng bên phải →
      </p>
    </div>

    <div class="mx-3 h-px bg-border"></div>
  {:else if selection.kind === 'stage' && selectedStage}
    <!-- ═══ Selected Stage Element Info ═══ -->
    <div class="p-3">
      <h3 class="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Đã chọn kiến trúc
      </h3>
      <div class="rounded-lg border border-purple-300/30 bg-purple-50/50 p-3 dark:bg-purple-900/10">
        <div class="mb-2 flex items-center gap-2">
          <Theater class="h-4 w-4 text-purple-500" />
          <span class="truncate text-sm font-semibold text-foreground">
            {selectedStage.label}
          </span>
        </div>
        <div class="space-y-1 text-[11px] text-muted-foreground">
          <div class="flex justify-between">
            <span>Loại:</span>
            <span class="font-medium text-foreground">
              {selectedStage.type === 'stage'
                ? 'Sân khấu'
                : selectedStage.type === 'obstacle'
                  ? 'Vật cản'
                  : 'Lối vào'}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Vị trí:</span>
            <span class="font-medium text-foreground">
              ({Math.round(selectedStage.x)}, {Math.round(selectedStage.y)})
            </span>
          </div>
          <div class="flex justify-between">
            <span>Kích thước:</span>
            <span class="font-medium text-foreground">
              {Math.round(selectedStage.width)} × {Math.round(selectedStage.height)}
            </span>
          </div>
        </div>
      </div>
      <p class="mt-2 text-[10px] text-muted-foreground italic">
        <Info class="mr-0.5 inline h-3 w-3" />
        Chỉnh sửa thuộc tính ở bảng bên phải →
      </p>
    </div>

    <div class="mx-3 h-px bg-border"></div>
  {/if}

  {#if hasTiers}
    <!-- ═══ Ticket Tiers from Inventory ═══ -->
    <div class="p-3">
      <h3 class="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Hạng vé đã tạo
      </h3>
      <div class="space-y-1.5">
        {#each tiers as tier, i (tier.id)}
          {@const remaining = tier.capacity - tier.placedCount}
          {@const isFullyPlaced = remaining <= 0}
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors
              {isFullyPlaced
              ? 'cursor-not-allowed border-border/30 bg-muted/10 opacity-50'
              : 'cursor-grab border-border/50 bg-muted/20 hover:border-primary/40 hover:bg-primary/5 active:cursor-grabbing'}"
            onclick={() => {
              if (!isFullyPlaced && onAddTierToCanvas) onAddTierToCanvas(i);
            }}
            disabled={isFullyPlaced}
          >
            <div class="flex items-center gap-1.5">
              <div
                class="h-3 w-3 shrink-0 rounded-full"
                style="background-color: {tier.color}"
              ></div>
              <GripVertical class="h-3 w-3 shrink-0 text-muted-foreground/40" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-xs font-medium text-foreground">
                {tier.name || `Hạng #${i + 1}`}
              </div>
              <div class="flex items-center gap-1 text-[10px] text-muted-foreground">
                {#if tier.type === 'general'}
                  <Users class="h-2.5 w-2.5" />
                {:else}
                  <Armchair class="h-2.5 w-2.5" />
                {/if}
                {#if isFullyPlaced}
                  <span class="text-success">✓ Đã đặt hết</span>
                {:else}
                  <span>
                    {remaining.toLocaleString('vi-VN')}
                    {tier.type === 'general' ? 'vé' : 'ghế'} chưa đặt
                  </span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>

      {#if totalUnplaced > 0}
        <div class="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 dark:bg-amber-900/20">
          <p class="text-[10px] font-medium text-amber-700 dark:text-amber-300">
            ⚠️ {totalUnplaced.toLocaleString('vi-VN')} vé/ghế chưa được đặt lên sơ đồ
          </p>
        </div>
      {:else}
        <div class="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 dark:bg-emerald-900/20">
          <p class="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            ✓ Tất cả vé đã được đặt lên sơ đồ
          </p>
        </div>
      {/if}
    </div>

    <div class="mx-3 h-px bg-border"></div>

    <!-- Quick add (for splitting a tier into multiple blocks) -->
    <div class="p-3">
      <h3 class="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Thêm khu vực trống
      </h3>
      <div class="space-y-1">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
          onclick={() => onAddSection('assigned')}
        >
          <Armchair class="h-3.5 w-3.5 text-blue-500" />
          <span class="text-foreground">+ Ghế ngồi</span>
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
          onclick={() => onAddSection('general')}
        >
          <Users class="h-3.5 w-3.5 text-amber-500" />
          <span class="text-foreground">+ Vé đứng</span>
        </button>
      </div>
    </div>
  {:else}
    <!-- ═══ Fallback: Original toolbox (no tiers) ═══ -->
    <div class="p-3">
      <h3 class="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Khu vực bán vé
      </h3>
      <div class="space-y-1.5">
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          onclick={() => onAddSection('assigned')}
        >
          <div
            class="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/40"
          >
            <Armchair class="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div class="text-xs font-medium text-foreground">Ghế ngồi</div>
            <div class="text-[10px] text-muted-foreground">Seated Block</div>
          </div>
        </button>

        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          onclick={() => onAddSection('general')}
        >
          <div
            class="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/40"
          >
            <Users class="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div class="text-xs font-medium text-foreground">Vé đứng</div>
            <div class="text-[10px] text-muted-foreground">Standing / GA</div>
          </div>
        </button>
      </div>
    </div>
  {/if}

  <div class="mx-3 h-px bg-border"></div>

  <!-- Structure elements (always shown) -->
  <div class="p-3">
    <h3 class="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
      Kiến trúc
    </h3>
    <div class="space-y-1.5">
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        onclick={() => onAddStageElement('stage')}
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/40"
        >
          <Theater class="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <div class="text-xs font-medium text-foreground">Sân khấu</div>
          <div class="text-[10px] text-muted-foreground">Stage</div>
        </div>
      </button>

      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        onclick={() => onAddStageElement('obstacle')}
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800"
        >
          <Columns3 class="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <div class="text-xs font-medium text-foreground">Vật cản</div>
          <div class="text-[10px] text-muted-foreground">Obstacle / Pillar</div>
        </div>
      </button>

      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        onclick={() => onAddStageElement('entrance')}
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/40"
        >
          <DoorOpen class="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <div class="text-xs font-medium text-foreground">Lối ra vào</div>
          <div class="text-[10px] text-muted-foreground">Entrance / Exit</div>
        </div>
      </button>
    </div>
  </div>

  <div class="mx-3 h-px bg-border"></div>

  <!-- Help -->
  <div class="p-3">
    <h3 class="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
      Phím tắt
    </h3>
    <div class="space-y-1 text-[10px] text-muted-foreground">
      <div class="flex justify-between">
        <span>Undo</span>
        <kbd class="rounded bg-muted px-1">Ctrl+Z</kbd>
      </div>
      <div class="flex justify-between">
        <span>Redo</span>
        <kbd class="rounded bg-muted px-1">Ctrl+Y</kbd>
      </div>
      <div class="flex justify-between">
        <span>Xóa</span>
        <kbd class="rounded bg-muted px-1">Delete</kbd>
      </div>
      <div class="flex justify-between">
        <span>Bỏ chọn</span>
        <kbd class="rounded bg-muted px-1">Esc</kbd>
      </div>
      <div class="flex justify-between">
        <span>Sửa ghế</span>
        <span>Double-click</span>
      </div>
    </div>
  </div>
</aside>
