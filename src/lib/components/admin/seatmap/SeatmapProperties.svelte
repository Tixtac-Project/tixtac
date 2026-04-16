<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import type { MapConfigInput, SectionFormData } from '$lib/shared/schemas/event.schema';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { Armchair, Pencil, Settings, Theater, Trash2, TriangleAlert, Users } from 'lucide-svelte';
  import { SECTION_COLORS, type CanvasSelection, type StageElement } from './types';

  let {
    selection,
    sections = $bindable(),
    mapConfig = $bindable(),
    stageElements = $bindable(),
    onDelete,
    onEnterSeatEdit,
    onPushUndo,
  }: {
    selection: CanvasSelection;
    sections: SectionFormData[];
    mapConfig: MapConfigInput;
    stageElements: StageElement[];
    onDelete: () => void;
    onEnterSeatEdit: (index: number) => void;
    onPushUndo: () => void;
  } = $props();

  // Derived: currently selected section or stage element
  let selectedSection = $derived(
    selection.kind === 'section' && sections[selection.index] ? sections[selection.index] : null,
  );
  let selectedSectionIndex = $derived(selection.kind === 'section' ? selection.index : -1);
  let selectedStage = $derived(
    selection.kind === 'stage'
      ? (stageElements.find((el) => el.id === selection.id) ?? null)
      : null,
  );

  /** Minimum cell size (px) used when auto-resizing a block after rows/cols change */
  const MIN_CELL_PX = 22;

  // Debounce undo pushes so rapid typing doesn't flood the stack
  let undoTimer: ReturnType<typeof setTimeout> | null = null;
  let undoPushedForCurrentEdit = false;

  function pushUndoDebounced() {
    if (!undoPushedForCurrentEdit) {
      onPushUndo();
      undoPushedForCurrentEdit = true;
    }
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      undoPushedForCurrentEdit = false;
    }, 800);
  }

  // Helper to update section field — immutable update pattern (no direct mutation)
  function updateSection(field: string, value: unknown) {
    if (selectedSectionIndex < 0) return;
    pushUndoDebounced();

    sections = sections.map((sec, i) => {
      if (i !== selectedSectionIndex) return sec;

      // Clone the section to avoid mutation
      let updated = { ...sec };

      // Capture old rows/cols BEFORE applying the change (for auto-resize logic)
      const oldRows = sec.seat_config.rows;
      const oldCols = sec.seat_config.cols;

      if (field.startsWith('layout_config.')) {
        const key = field.replace('layout_config.', '');
        updated.layout_config = { ...sec.layout_config, [key]: value };
      } else if (field.startsWith('seat_config.')) {
        const key = field.replace('seat_config.', '');
        updated.seat_config = { ...sec.seat_config, [key]: value };

        // Auto-resize block when rows or cols change so seats aren't squished
        if (updated.type === 'assigned' && (key === 'rows' || key === 'cols')) {
          const newRows = updated.seat_config.rows;
          const newCols = updated.seat_config.cols;
          if (newRows > 0 && newCols > 0) {
            const cellW = oldCols > 0 ? sec.layout_config.width / oldCols : MIN_CELL_PX;
            const cellH = oldRows > 0 ? sec.layout_config.height / oldRows : MIN_CELL_PX;
            const cellSize = Math.max(MIN_CELL_PX, key === 'cols' ? cellW : cellH);
            updated.layout_config = {
              ...updated.layout_config,
              width: Math.max(60, Math.round(newCols * cellSize)),
              height: Math.max(40, Math.round(newRows * cellSize)),
            };
          }
        }
      } else {
        updated = { ...updated, [field]: value };
      }

      return updated;
    });
  }

  function updateStage(field: string, value: unknown) {
    if (!selectedStage) return;
    pushUndoDebounced();
    stageElements = stageElements.map((el) =>
      el.id === selectedStage!.id ? { ...el, [field]: value } : el,
    );
  }

  // Seat count display
  let seatCount = $derived(
    selectedSection
      ? selectedSection.type === 'general'
        ? selectedSection.capacity
        : (selectedSection.seat_config.rows ?? 0) * (selectedSection.seat_config.cols ?? 0)
      : 0,
  );

  let startRowLabel = $derived(
    selectedSection ? getRowLabel(selectedSection.seat_config.startRowIndex - 1) : 'A',
  );
  let endRowLabel = $derived(
    selectedSection
      ? getRowLabel(
          selectedSection.seat_config.startRowIndex +
            Math.max(selectedSection.seat_config.rows, 1) -
            2,
        )
      : 'A',
  );

  // Validation flags
  let missingPrefix = $derived(
    selectedSection?.type === 'assigned' &&
      (!selectedSection.seat_config.prefix ||
        selectedSection.seat_config.prefix.trim().length === 0),
  );
  let missingName = $derived(selectedSection ? !selectedSection.name.trim() : false);
  let missingPrice = $derived(selectedSection ? selectedSection.price <= 0 : false);
</script>

<aside class="flex w-72 flex-col overflow-y-auto border-l border-border bg-background">
  {#if selection.kind === 'none'}
    <!-- ═══ State 1: Map Settings ═══ -->
    <div class="p-4">
      <div class="mb-4 flex items-center gap-2">
        <Settings class="h-4 w-4 text-muted-foreground" />
        <h3 class="text-sm font-semibold text-foreground">Cài đặt bản đồ</h3>
      </div>

      <div class="space-y-3">
        <div class="grid gap-1.5">
          <Label class="text-xs">Chiều rộng Canvas (px)</Label>
          <Input
            type="number"
            min={200}
            max={5000}
            value={mapConfig.width}
            oninput={(e) => {
              onPushUndo();
              mapConfig = { ...mapConfig, width: Number((e.target as HTMLInputElement).value) };
            }}
          />
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Chiều cao Canvas (px)</Label>
          <Input
            type="number"
            min={200}
            max={5000}
            value={mapConfig.height}
            oninput={(e) => {
              onPushUndo();
              mapConfig = { ...mapConfig, height: Number((e.target as HTMLInputElement).value) };
            }}
          />
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Kích thước ô lưới (px)</Label>
          <Input
            type="number"
            min={5}
            max={100}
            value={mapConfig.gridSize}
            oninput={(e) => {
              onPushUndo();
              mapConfig = { ...mapConfig, gridSize: Number((e.target as HTMLInputElement).value) };
            }}
          />
        </div>
      </div>

      <!-- Summary -->
      <div class="mt-6 rounded-lg border border-border/50 bg-muted/20 p-3">
        <p class="mb-2 text-xs font-medium text-foreground">Tóm tắt</p>
        <div class="space-y-1 text-[11px] text-muted-foreground">
          <div class="flex justify-between">
            <span>Khu vực ghế:</span>
            <span class="font-medium text-foreground">{sections.length}</span>
          </div>
          <div class="flex justify-between">
            <span>Tổng ghế/vé:</span>
            <span class="font-medium text-foreground">
              {sections
                .reduce((sum, s) => {
                  if (s.type === 'general') return sum + (s.capacity ?? 0);
                  return sum + (s.seat_config.rows ?? 0) * (s.seat_config.cols ?? 0);
                }, 0)
                .toLocaleString('vi-VN')}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Kiến trúc:</span>
            <span class="font-medium text-foreground">{stageElements.length}</span>
          </div>
        </div>
      </div>
    </div>
  {:else if selection.kind === 'section' && selectedSection}
    <!-- ═══ State 2/3: Section Properties ═══ -->
    <div class="p-4">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          {#if selectedSection.type === 'general'}
            <Users class="h-4 w-4 text-amber-500" />
          {:else}
            <Armchair class="h-4 w-4 text-blue-500" />
          {/if}
          <h3 class="text-sm font-semibold text-foreground">
            {selectedSection.type === 'general' ? 'Vé đứng' : 'Ghế ngồi'}
          </h3>
        </div>
        <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive" onclick={onDelete}>
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>

      <div class="space-y-3">
        <!-- Validation warnings -->
        {#if missingName || missingPrice || missingPrefix}
          <div
            class="rounded-lg border border-amber-300/50 bg-amber-50/50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-900/10"
          >
            <div class="flex items-start gap-1.5">
              <TriangleAlert class="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
              <div class="space-y-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                {#if missingName}<p>• Tên khu vực là bắt buộc</p>{/if}
                {#if missingPrice}<p>• Giá vé phải lớn hơn 0</p>{/if}
                {#if missingPrefix}<p>• Mã tiền tố (Prefix) là bắt buộc cho ghế ngồi</p>{/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- Name -->
        <div class="grid gap-1.5">
          <Label class="text-xs">
            Tên khu vực <span class="text-destructive">*</span>
          </Label>
          <Input
            value={selectedSection.name}
            placeholder="VD: VIP Trái"
            class={missingName ? 'border-destructive' : ''}
            oninput={(e) => updateSection('name', (e.target as HTMLInputElement).value)}
          />
        </div>

        <!-- Color -->
        <div class="grid gap-1.5">
          <Label class="text-xs">Màu sắc</Label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              value={selectedSection.layout_config.color}
              class="h-8 w-8 cursor-pointer rounded border border-border"
              oninput={(e) =>
                updateSection('layout_config.color', (e.target as HTMLInputElement).value)}
            />
            <div class="flex gap-1">
              {#each SECTION_COLORS as color (color)}
                <button
                  type="button"
                  class="h-6 w-6 rounded-full border-2 transition-all {selectedSection.layout_config
                    .color === color
                    ? 'scale-110 border-foreground'
                    : 'border-transparent hover:border-muted-foreground/50'}"
                  style="background-color: {color}"
                  title="Chọn màu {color}"
                  onclick={() => updateSection('layout_config.color', color)}
                ></button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Price -->
        <div class="grid gap-1.5">
          <Label class="text-xs">
            Giá vé (VNĐ) <span class="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={selectedSection.price}
            placeholder="500000"
            class={missingPrice ? 'border-destructive' : ''}
            oninput={(e) => updateSection('price', Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <!-- Type selector -->
        <div class="grid gap-1.5">
          <Label class="text-xs">Loại khu vực</Label>
          <Select.Root
            type="single"
            value={selectedSection.type}
            onValueChange={(v) => {
              updateSection('type', v);
            }}
          >
            <Select.Trigger class="rounded-lg text-xs">
              {selectedSection.type === 'general' ? 'Vé đứng (GA)' : 'Ghế ngồi (Assigned)'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="assigned">Ghế ngồi (Assigned)</Select.Item>
              <Select.Item value="general">Vé đứng (GA)</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        {#if selectedSection.type === 'general'}
          <!-- GA: Capacity -->
          <div class="grid gap-1.5">
            <Label class="text-xs">
              Sức chứa tối đa <span class="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              value={selectedSection.capacity}
              oninput={(e) =>
                updateSection('capacity', Number((e.target as HTMLInputElement).value))}
            />
          </div>
        {:else}
          <!-- Seated: Rows x Cols -->
          <div class="grid grid-cols-2 gap-2">
            <div class="grid gap-1.5">
              <Label class="text-xs">
                Số hàng <span class="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={selectedSection.seat_config.rows}
                oninput={(e) =>
                  updateSection('seat_config.rows', Number((e.target as HTMLInputElement).value))}
              />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">
                Số cột <span class="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={selectedSection.seat_config.cols}
                oninput={(e) =>
                  updateSection('seat_config.cols', Number((e.target as HTMLInputElement).value))}
              />
            </div>
          </div>

          <!-- Seat count display -->
          <div class="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Tổng: <strong class="text-foreground">{seatCount}</strong>
            ghế
          </div>

          <!-- Numbering rules -->
          <div class="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
            <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Đánh số ghế
            </p>

            <div class="grid gap-1.5">
              <Label class="text-xs">
                Tiền tố (Prefix) <span class="text-destructive">*</span>
              </Label>
              <Input
                value={selectedSection.seat_config.prefix ?? ''}
                placeholder="VD: VIP, STD, K1"
                maxlength={10}
                class={missingPrefix ? 'border-destructive' : ''}
                oninput={(e) => {
                  const val = (e.target as HTMLInputElement).value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '');
                  updateSection('seat_config.prefix', val || null);
                }}
              />
              {#if missingPrefix}
                <p class="text-[10px] text-destructive">
                  Bắt buộc để khách hàng nhận biết khu vực ghế (VD: VIP-A1)
                </p>
              {/if}
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="grid gap-1.5">
                <Label class="text-xs">Hàng format</Label>
                <Select.Root
                  type="single"
                  value={selectedSection.seat_config.rowFormat}
                  onValueChange={(v) => updateSection('seat_config.rowFormat', v)}
                >
                  <Select.Trigger class="rounded-lg text-xs">
                    {selectedSection.seat_config.rowFormat === 'alphabetic' ? 'A, B, C' : '1, 2, 3'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="alphabetic">A, B, C</Select.Item>
                    <Select.Item value="numeric">1, 2, 3</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
              <div class="grid gap-1.5">
                <Label class="text-xs">Hướng cột</Label>
                <Select.Root
                  type="single"
                  value={selectedSection.seat_config.colDirection}
                  onValueChange={(v) => updateSection('seat_config.colDirection', v)}
                >
                  <Select.Trigger class="rounded-lg text-xs">
                    {selectedSection.seat_config.colDirection === 'ltr'
                      ? 'Trái → Phải'
                      : 'Phải → Trái'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="ltr">Trái → Phải</Select.Item>
                    <Select.Item value="rtl">Phải → Trái</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="grid gap-1.5">
                <Label class="text-xs">Hàng bắt đầu</Label>
                <Input
                  type="number"
                  min={1}
                  value={selectedSection.seat_config.startRowIndex}
                  oninput={(e) =>
                    updateSection(
                      'seat_config.startRowIndex',
                      Number((e.target as HTMLInputElement).value),
                    )}
                />
              </div>
              <div class="grid gap-1.5">
                <Label class="text-xs">Cột bắt đầu</Label>
                <Input
                  type="number"
                  min={1}
                  value={selectedSection.seat_config.startColIndex}
                  oninput={(e) =>
                    updateSection(
                      'seat_config.startColIndex',
                      Number((e.target as HTMLInputElement).value),
                    )}
                />
              </div>
            </div>

            <!-- Label preview -->
            {#if selectedSection.seat_config.rows > 0 && selectedSection.seat_config.cols > 0}
              <p class="text-[10px] text-muted-foreground">
                Ghế: <strong class="text-foreground">
                  {selectedSection.seat_config.prefix
                    ? `${selectedSection.seat_config.prefix}-`
                    : ''}{startRowLabel}{selectedSection.seat_config.startColIndex}
                </strong>
                →
                <strong class="text-foreground">
                  {selectedSection.seat_config.prefix
                    ? `${selectedSection.seat_config.prefix}-`
                    : ''}{endRowLabel}{selectedSection.seat_config.startColIndex +
                    selectedSection.seat_config.cols -
                    1}
                </strong>
              </p>
            {/if}
          </div>

          <!-- Edit shape button -->
          <Button
            variant="outline"
            class="w-full gap-2 text-xs"
            onclick={() => onEnterSeatEdit(selectedSectionIndex)}
          >
            <Pencil class="h-3.5 w-3.5" />
            Chỉnh sửa hình dáng (Disable Seats)
          </Button>
        {/if}

        <!-- Rotation -->
        <div class="grid gap-1.5">
          <Label class="text-xs">Góc xoay (°)</Label>
          <Input
            type="number"
            min={0}
            max={360}
            value={selectedSection.layout_config.rotation}
            oninput={(e) =>
              updateSection('layout_config.rotation', Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <!-- Position (read-only, drag to move) -->
        <div class="grid grid-cols-2 gap-2">
          <div class="grid gap-1.5">
            <Label class="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              value={Math.round(selectedSection.layout_config.x)}
              oninput={(e) =>
                updateSection('layout_config.x', Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="grid gap-1.5">
            <Label class="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={Math.round(selectedSection.layout_config.y)}
              oninput={(e) =>
                updateSection('layout_config.y', Number((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="grid gap-1.5">
            <Label class="text-xs text-muted-foreground">Width</Label>
            <Input
              type="number"
              min={20}
              value={Math.round(selectedSection.layout_config.width)}
              oninput={(e) =>
                updateSection('layout_config.width', Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="grid gap-1.5">
            <Label class="text-xs text-muted-foreground">Height</Label>
            <Input
              type="number"
              min={20}
              value={Math.round(selectedSection.layout_config.height)}
              oninput={(e) =>
                updateSection('layout_config.height', Number((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>
      </div>
    </div>
  {:else if selection.kind === 'stage' && selectedStage}
    <!-- ═══ Stage Element Properties ═══ -->
    <div class="p-4">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Theater class="h-4 w-4 text-purple-500" />
          <h3 class="text-sm font-semibold text-foreground">Kiến trúc</h3>
        </div>
        <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive" onclick={onDelete}>
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>

      <div class="space-y-3">
        <div class="grid gap-1.5">
          <Label class="text-xs">Nhãn</Label>
          <Input
            value={selectedStage.label}
            oninput={(e) => updateStage('label', (e.target as HTMLInputElement).value)}
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="grid gap-1.5">
            <Label class="text-xs">X</Label>
            <Input
              type="number"
              value={Math.round(selectedStage.x)}
              oninput={(e) => updateStage('x', Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="grid gap-1.5">
            <Label class="text-xs">Y</Label>
            <Input
              type="number"
              value={Math.round(selectedStage.y)}
              oninput={(e) => updateStage('y', Number((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="grid gap-1.5">
            <Label class="text-xs">Width</Label>
            <Input
              type="number"
              min={10}
              value={Math.round(selectedStage.width)}
              oninput={(e) => updateStage('width', Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="grid gap-1.5">
            <Label class="text-xs">Height</Label>
            <Input
              type="number"
              min={10}
              value={Math.round(selectedStage.height)}
              oninput={(e) => updateStage('height', Number((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label class="text-xs">Góc xoay (°)</Label>
          <Input
            type="number"
            min={0}
            max={360}
            value={selectedStage.rotation}
            oninput={(e) => updateStage('rotation', Number((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>
    </div>
  {/if}
</aside>
