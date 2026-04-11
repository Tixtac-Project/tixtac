<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import type { SectionFormData } from '$lib/shared/schemas/event.schema';
  import { getRowLabel } from '$lib/utils/seat-label';
  import { ChevronDown, ChevronUp, CircleQuestionMark, Trash2 } from 'lucide-svelte';

  let {
    section = $bindable(),
    index,
    onremove,
    errors = {},
  }: {
    section: SectionFormData;
    index: number;
    onremove?: () => void;
    errors?: Record<string, string>;
  } = $props();

  let rootEl = $state<HTMLDivElement>();

  /** Dispatch a bubbling 'remove' CustomEvent AND call the onremove callback if provided */
  function handleRemove() {
    // Dispatch DOM event for event-based listeners (e.g. parent using onremove on the element)
    rootEl?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { index } }));
    // Also invoke callback prop for direct prop-based usage
    onremove?.();
  }

  let showAdvanced = $state(false);

  let seatCount = $derived(section.rows > 0 && section.cols > 0 ? section.rows * section.cols : 0);

  function fieldError(field: string): string | undefined {
    return errors[`sections.${index}.${field}`];
  }

  // ── Derived label range for display ──
  let startRowLabel = $derived(getRowLabel(section.start_row_index));
  let endRowLabel = $derived(getRowLabel(section.start_row_index + Math.max(section.rows, 1) - 1));
  let endColNumber = $derived(section.start_col_index + Math.max(section.cols, 1) - 1);
</script>

<div bind:this={rootEl} class="rounded-lg border bg-card p-4 shadow-sm">
  <!-- Header row -->
  <div class="mb-4 flex items-center justify-between">
    <h4 class="text-sm font-semibold text-foreground">
      🧩 Khu vực #{index + 1}
      {#if section.name}
        — {section.name}
      {/if}
    </h4>
    <div class="flex items-center gap-2">
      <span class="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {seatCount} ghế
      </span>
      <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive" onclick={handleRemove}>
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Basic fields -->
  <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-5">
    <div class="grid gap-1.5">
      <Label for="section-name-{index}">Tên khu vực</Label>
      <Input id="section-name-{index}" placeholder="VD: VIP Trái" bind:value={section.name} />
      {#if fieldError('name')}
        <span class="text-xs text-destructive">{fieldError('name')}</span>
      {/if}
    </div>

    <div class="grid gap-1.5">
      <div class="flex items-center gap-1.5">
        <Label for="section-prefix-{index}">Mã tiền tố</Label>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-60">
            <p class="text-xs">
              Mã ngắn gọn (tối đa 10 ký tự, chữ in hoa và số) dùng làm tiền tố cho mã ghế. VD: VIP,
              STD, V1. Mã ghế sẽ có dạng VIP-A1, STD-B12.
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
      <Input
        id="section-prefix-{index}"
        placeholder="VD: VIP"
        maxlength={10}
        bind:value={section.prefix}
        oninput={() => (section.prefix = section.prefix.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
      />
      {#if fieldError('prefix')}
        <span class="text-xs text-destructive">{fieldError('prefix')}</span>
      {/if}
    </div>

    <div class="grid gap-1.5">
      <Label for="section-price-{index}">Giá vé (VNĐ)</Label>
      <Input
        id="section-price-{index}"
        type="number"
        placeholder="500000"
        bind:value={section.price}
      />
      {#if fieldError('price')}
        <span class="text-xs text-destructive">{fieldError('price')}</span>
      {/if}
    </div>

    <div class="grid gap-1.5">
      <Label for="section-rows-{index}">Số hàng</Label>
      <Input id="section-rows-{index}" type="number" min="1" max="50" bind:value={section.rows} />
      {#if fieldError('rows')}
        <span class="text-xs text-destructive">{fieldError('rows')}</span>
      {/if}
    </div>

    <div class="grid gap-1.5">
      <Label for="section-cols-{index}">Số ghế / hàng</Label>
      <Input id="section-cols-{index}" type="number" min="1" max="100" bind:value={section.cols} />
      {#if fieldError('cols')}
        <span class="text-xs text-destructive">{fieldError('cols')}</span>
      {/if}
    </div>
  </div>

  <!-- Advanced toggle -->
  <button
    type="button"
    class="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    onclick={() => (showAdvanced = !showAdvanced)}
  >
    {#if showAdvanced}
      <ChevronUp class="h-3.5 w-3.5" />
      Ẩn cấu hình nâng cao
    {:else}
      <ChevronDown class="h-3.5 w-3.5" />
      Cấu hình nâng cao
    {/if}
  </button>

  <!-- Advanced fields -->
  {#if showAdvanced}
    <div class="mt-3 space-y-4 rounded-md border bg-muted/30 p-3">
      <!-- Position on venue layout -->
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <span class="text-xs font-semibold text-foreground">📍 Vị trí trên sơ đồ tổng</span>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-60">
              <p class="text-xs">
                Tọa độ (X, Y) xác định vị trí khu vực ghế trên bản đồ tổng thể của sự kiện. X = cột,
                Y = hàng (tính từ góc trên-trái, đơn vị pixel/grid).
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div class="grid grid-cols-2 items-start gap-4 md:grid-cols-4">
          <div class="grid gap-1.5">
            <Label for="section-lx-{index}">Tọa độ X</Label>
            <Input id="section-lx-{index}" type="number" min="0" bind:value={section.layout_x} />
            {#if fieldError('layout_x')}
              <span class="text-xs text-destructive">{fieldError('layout_x')}</span>
            {/if}
          </div>
          <div class="grid gap-1.5">
            <Label for="section-ly-{index}">Tọa độ Y</Label>
            <Input id="section-ly-{index}" type="number" min="0" bind:value={section.layout_y} />
            {#if fieldError('layout_y')}
              <span class="text-xs text-destructive">{fieldError('layout_y')}</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Seat labeling offset -->
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <span class="text-xs font-semibold text-foreground">🏷️ Đánh số ghế bắt đầu từ</span>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-72">
              <p class="text-xs">
                <strong>Hàng bắt đầu (0-based):</strong>
                0 = A, 1 = B, 2 = C, ... 26 = AA.
                <br />
                <strong>Cột bắt đầu (1-based):</strong>
                Số ghế đầu tiên trong mỗi hàng.
                <br />
                VD: Hàng=2, Cột=5 → ghế đầu tiên là C5.
              </p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div class="grid grid-cols-2 items-start gap-4 md:grid-cols-4">
          <div class="grid gap-1.5">
            <Label for="section-sri-{index}">
              Hàng bắt đầu
              <span class="text-muted-foreground">(= {startRowLabel})</span>
            </Label>
            <Input
              id="section-sri-{index}"
              type="number"
              min="0"
              bind:value={section.start_row_index}
            />
            {#if fieldError('start_row_index')}
              <span class="text-xs text-destructive">{fieldError('start_row_index')}</span>
            {/if}
          </div>
          <div class="grid gap-1.5">
            <Label for="section-sci-{index}">
              Cột bắt đầu
              <span class="text-muted-foreground">(= {section.start_col_index})</span>
            </Label>
            <Input
              id="section-sci-{index}"
              type="number"
              min="1"
              bind:value={section.start_col_index}
            />
            {#if fieldError('start_col_index')}
              <span class="text-xs text-destructive">{fieldError('start_col_index')}</span>
            {/if}
          </div>
        </div>
        <!-- Quick preview of label range -->
        {#if section.rows > 0 && section.cols > 0}
          <p class="mt-2 text-xs text-muted-foreground">
            → Ghế: <strong class="text-foreground">
              {section.prefix ? `${section.prefix}-` : ''}{startRowLabel}{section.start_col_index}
            </strong>
            đến
            <strong class="text-foreground">
              {section.prefix ? `${section.prefix}-` : ''}{endRowLabel}{endColNumber}
            </strong>
          </p>
        {/if}
      </div>

      <!-- Sort order & disabled seats -->
      <div>
        <div class="mb-2 flex items-center gap-1.5">
          <span class="text-xs font-semibold text-foreground">⚙️ Khác</span>
        </div>
        <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <div class="grid gap-1.5">
            <div class="flex items-center gap-1.5">
              <Label for="section-so-{index}">Thứ tự hiển thị</Label>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
                </Tooltip.Trigger>
                <Tooltip.Content class="max-w-52">
                  <p class="text-xs">
                    Số nhỏ hơn hiển thị trước. Các khu vực cùng thứ tự sẽ sắp theo tên.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <Input id="section-so-{index}" type="number" min="0" bind:value={section.sort_order} />
          </div>

          <div class="grid gap-1.5">
            <div class="flex items-center gap-1.5">
              <Label for="section-ds-{index}">Ghế hỏng / không bán</Label>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground" />
                </Tooltip.Trigger>
                <Tooltip.Content class="max-w-60">
                  <p class="text-xs">
                    Nhập nhãn ghế cách nhau bằng dấu phẩy. VD: {section.prefix || 'VIP'}-A1, {section.prefix ||
                      'VIP'}-B3. Ghế này sẽ bị vô hiệu hóa không cho đặt.
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <Input
              id="section-ds-{index}"
              placeholder="{section.prefix || 'VIP'}-A1, {section.prefix || 'VIP'}-B2"
              bind:value={section.disabled_seats}
            />
            {#if fieldError('disabled_seats')}
              <span class="text-xs text-destructive">{fieldError('disabled_seats')}</span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
