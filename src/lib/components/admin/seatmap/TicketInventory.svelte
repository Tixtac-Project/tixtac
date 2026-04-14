<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { generatePrefix } from '$lib/utils/section-defaults';
  import {
    Armchair,
    Check,
    GripVertical,
    Loader,
    Map,
    Palette,
    Pencil,
    Plus,
    Trash2,
  } from 'lucide-svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { SECTION_COLORS, type TicketTier } from './types';

  let {
    tiers = $bindable<TicketTier[]>([]),
    onDesignMap,
    onFinishWithoutMap,
    isSaving = false,
    eventTitle = '',
    showTitle = '',
    showCount = 1,
  }: {
    tiers: TicketTier[];
    onDesignMap: () => void;
    onFinishWithoutMap: () => void;
    isSaving?: boolean;
    eventTitle?: string;
    showTitle?: string;
    showCount?: number;
  } = $props();

  let editingIndex = $state<number | null>(null);

  function addTier() {
    const idx = tiers.length;
    const color = SECTION_COLORS[idx % SECTION_COLORS.length];
    tiers = [
      ...tiers,
      {
        id: `tier-${Date.now()}-${idx}`,
        name: '',
        prefix: '',
        price: 0,
        capacity: 0,
        color,
        type: 'assigned',
        placedCount: 0,
      },
    ];
    editingIndex = tiers.length - 1;
  }

  function removeTier(index: number) {
    tiers = tiers.filter((_, i) => i !== index);
    if (editingIndex === index) editingIndex = null;
    else if (editingIndex !== null && editingIndex > index) editingIndex--;
  }

  function updateTier(index: number, field: keyof TicketTier, value: unknown) {
    const tier = { ...tiers[index], [field]: value };
    // Auto-generate prefix when name changes (only if prefix hasn't been manually edited)
    if (field === 'name' && typeof value === 'string') {
      const oldPrefix = generatePrefix(tiers[index].name, index);
      if (!tier.prefix || tier.prefix === oldPrefix) {
        tier.prefix = generatePrefix(value, index);
      }
    }
    tiers = tiers.map((t, i) => (i === index ? tier : t));
  }

  const prefixRegex = /^[A-Z0-9]+$/;

  let totalCapacity = $derived(tiers.reduce((sum, t) => sum + (t.capacity || 0), 0));
  let totalRevenue = $derived(
    tiers.reduce((sum, t) => sum + (t.price || 0) * (t.capacity || 0), 0),
  );

  let validationIssues = $derived.by(() => {
    const issues: string[] = [];
    if (tiers.length === 0) issues.push('Phải có ít nhất 1 hạng vé');
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const label = t.name || `#${i + 1}`;
      if (!t.name.trim()) issues.push(`Hạng vé #${i + 1}: Chưa có tên`);
      if (t.type === 'assigned') {
        if (!t.prefix.trim()) {
          issues.push(`"${label}": Mã tiền tố (prefix) là bắt buộc cho vé ngồi`);
        } else if (!prefixRegex.test(t.prefix.trim())) {
          issues.push(`"${label}": Mã tiền tố chỉ được chứa chữ in hoa và số (A-Z, 0-9)`);
        }
      }
      if (t.price <= 0) issues.push(`"${label}": Giá phải > 0`);
      if (t.capacity <= 0) issues.push(`"${label}": Số lượng phải > 0`);
    }
    // Check for duplicate prefixes among assigned tiers
    const prefixes = tiers
      .filter((t) => t.type === 'assigned' && t.prefix.trim())
      .map((t) => t.prefix.trim().toUpperCase());
    const seen = new SvelteSet<string>();
    for (const p of prefixes) {
      if (seen.has(p)) {
        issues.push(`Mã tiền tố "${p}" bị trùng lặp giữa các hạng vé`);
        break;
      }
      seen.add(p);
    }
    return issues;
  });

  let isValid = $derived(validationIssues.length === 0);

  function formatCurrency(n: number): string {
    return n.toLocaleString('vi-VN') + ' ₫';
  }
</script>

<div class="mx-auto max-w-4xl space-y-6">
  <!-- Header -->
  <div>
    <h1 class="font-heading text-2xl font-bold tracking-tight md:text-3xl">
      Bước 3: Quản lý Vé & Sơ đồ
    </h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Tạo các hạng vé cho
      {#if eventTitle}
        <strong class="text-foreground">"{eventTitle}"</strong>
      {/if}
    </p>
    {#if showCount > 1}
      <p class="mt-1 text-xs text-amber-600 dark:text-amber-400">
        📋 Cấu hình vé này sẽ áp dụng cho tất cả <strong>{showCount}</strong> suất diễn.
      </p>
    {/if}
  </div>

  <!-- Info banner -->
  <div class="rounded-2xl border border-info-border/50 bg-info-muted/50 px-5 py-4">
    <p class="text-sm text-info-muted-foreground">
      💡 <strong>Mẹo:</strong>
      Tạo các hạng vé trước (VIP, Standard, ...), sau đó bạn có thể
      <strong>xuất bản ngay</strong>
      hoặc
      <strong>thiết kế sơ đồ ghế tương tác</strong>
      nếu muốn chuyên nghiệp hơn.
    </p>
  </div>

  <!-- Tiers list -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Armchair class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Hạng vé ({tiers.length})</h2>
          <p class="text-xs text-muted-foreground">
            Tổng:
            <strong class="text-foreground">{totalCapacity.toLocaleString('vi-VN')}</strong>
            vé/ghế
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={addTier}>
        <Plus class="h-3.5 w-3.5" />
        Thêm hạng vé
      </Button>
    </div>

    {#each tiers as tier, i (tier.id)}
      <div
        class="bento-card transition-all {editingIndex === i
          ? 'ring-2 ring-primary/30'
          : 'hover:shadow-md'}"
      >
        {#if editingIndex === i}
          <!-- ═══ EDIT MODE ═══ -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-foreground">
                Chỉnh sửa: {tier.name || `Hạng vé #${i + 1}`}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                class="h-8 gap-1.5 text-xs"
                onclick={() => (editingIndex = null)}
              >
                <Check class="h-3.5 w-3.5" />
                Xong
              </Button>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <!-- Name -->
              <div class="grid gap-1.5">
                <Label>
                  Tên hạng vé <span class="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="VD: VIP, Standard, Early Bird"
                  value={tier.name}
                  oninput={(e) => updateTier(i, 'name', (e.target as HTMLInputElement).value)}
                />
              </div>

              <!-- Prefix (mandatory for assigned) -->
              {#if tier.type === 'assigned'}
                <div class="grid gap-1.5">
                  <div class="flex items-center gap-1.5">
                    <Label>
                      Mã tiền tố (Prefix) <span class="text-destructive">*</span>
                    </Label>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <span
                          class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
                        >
                          ?
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Content class="max-w-60">
                        <p class="text-xs">
                          Mã dùng cho nhãn ghế, VD: prefix <strong>VIP</strong>
                          → ghế
                          <strong>VIP-A1</strong>
                          ,
                          <strong>VIP-B3</strong>
                          ...
                          <br />
                          Chỉ chứa chữ in hoa và số (A-Z, 0-9), tối đa 10 ký tự.
                        </p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </div>
                  <Input
                    placeholder="VD: VIP, STD, K1"
                    value={tier.prefix}
                    maxlength={10}
                    oninput={(e) => {
                      const val = (e.target as HTMLInputElement).value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '');
                      (e.target as HTMLInputElement).value = val;
                      updateTier(i, 'prefix', val);
                    }}
                  />
                  {#if tier.prefix && !prefixRegex.test(tier.prefix)}
                    <p class="text-xs text-destructive">Chỉ chứa chữ in hoa và số (A-Z, 0-9)</p>
                  {/if}
                </div>
              {/if}

              <!-- Type -->
              <div class="grid gap-1.5">
                <div class="flex items-center gap-1.5">
                  <Label>Loại vé</Label>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <span
                        class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
                      >
                        ?
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="max-w-60">
                      <p class="text-xs">
                        <strong>Vé ngồi:</strong>
                        Có ghế cụ thể, hiển thị trên sơ đồ.
                        <br />
                        <strong>Vé đứng:</strong>
                        Không có số ghế, chỉ giới hạn số lượng.
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
                <Select.Root
                  type="single"
                  value={tier.type}
                  onValueChange={(v) => updateTier(i, 'type', v)}
                >
                  <Select.Trigger>
                    {tier.type === 'general' ? '🎫 Vé đứng (Standing)' : '💺 Vé ngồi (Seated)'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      <Select.Item value="assigned">💺 Vé ngồi (Seated)</Select.Item>
                      <Select.Item value="general">🎫 Vé đứng (Standing)</Select.Item>
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>

              <!-- Price -->
              <div class="grid gap-1.5">
                <Label>
                  Giá vé (VNĐ) <span class="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="500000"
                  value={tier.price}
                  oninput={(e) =>
                    updateTier(i, 'price', Number((e.target as HTMLInputElement).value))}
                />
              </div>

              <!-- Capacity -->
              <div class="grid gap-1.5">
                <Label>
                  Số lượng <span class="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="100"
                  value={tier.capacity}
                  oninput={(e) =>
                    updateTier(i, 'capacity', Number((e.target as HTMLInputElement).value))}
                />
              </div>
            </div>

            <!-- Color picker -->
            <div class="grid gap-1.5">
              <Label class="flex items-center gap-1.5">
                <Palette class="h-3.5 w-3.5 text-muted-foreground" />
                Màu đại diện
              </Label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  value={tier.color}
                  class="h-8 w-8 cursor-pointer rounded border border-border"
                  oninput={(e) => updateTier(i, 'color', (e.target as HTMLInputElement).value)}
                />
                <div class="flex gap-1.5">
                  {#each SECTION_COLORS as color (color)}
                    <button
                      type="button"
                      aria-label="Chọn màu {color} cho hạng vé"
                      title="Chọn màu {color}"
                      class="h-7 w-7 rounded-full border-2 transition-all {tier.color === color
                        ? 'scale-110 border-foreground'
                        : 'border-transparent hover:border-muted-foreground/50'}"
                      style="background-color: {color}"
                      onclick={() => updateTier(i, 'color', color)}
                    ></button>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <!-- ═══ DISPLAY MODE (Card) ═══ -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
              <div class="h-3 w-3 rounded-full" style="background-color: {tier.color}"></div>
              <GripVertical class="h-4 w-4 text-muted-foreground/40" />
            </div>

            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">
                  {tier.name || `Hạng vé #${i + 1}`}
                </span>
                {#if tier.type === 'assigned' && tier.prefix}
                  <span
                    class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
                  >
                    {tier.prefix}
                  </span>
                {/if}
                <span
                  class="rounded-md px-1.5 py-0.5 text-[10px] font-medium
                    {tier.type === 'general'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}"
                >
                  {tier.type === 'general' ? 'Đứng' : 'Ngồi'}
                </span>
              </div>
              <div class="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatCurrency(tier.price)}</span>
                <span>•</span>
                <span>{tier.capacity} {tier.type === 'general' ? 'vé' : 'ghế'}</span>
                {#if tier.price > 0 && tier.capacity > 0}
                  <span>•</span>
                  <span class="text-success">
                    Doanh thu: {formatCurrency(tier.price * tier.capacity)}
                  </span>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon" class="" onclick={() => (editingIndex = i)}>
                <Pencil class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="text-destructive hover:bg-destructive/10"
                onclick={() => removeTier(i)}
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        {/if}
      </div>
    {/each}

    <!-- Empty state -->
    {#if tiers.length === 0}
      <div class="bento-card flex flex-col items-center justify-center py-12 text-center">
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-3xl"
        >
          🎫
        </div>
        <h3 class="text-base font-semibold text-foreground">Chưa có hạng vé nào</h3>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">
          Bắt đầu bằng cách tạo hạng vé đầu tiên. Bạn có thể thêm nhiều hạng vé với giá và số lượng
          khác nhau.
        </p>
        <Button type="button" class="mt-4 gap-2" onclick={addTier}>
          <Plus class="h-4 w-4" />
          Tạo hạng vé đầu tiên
        </Button>
      </div>
    {:else}
      <!-- Add more button -->
      <Button type="button" variant="outline" class="w-full border-dashed py-5" onclick={addTier}>
        <Plus class="mr-2 h-4 w-4" />
        Thêm hạng vé
      </Button>
    {/if}
  </div>

  <!-- Summary card -->
  {#if tiers.length > 0}
    <div class="bento-card">
      <h3 class="mb-3 text-sm font-semibold text-foreground">📊 Tóm tắt</h3>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-foreground">{tiers.length}</p>
          <p class="text-[11px] text-muted-foreground">Hạng vé</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-foreground">{totalCapacity.toLocaleString('vi-VN')}</p>
          <p class="text-[11px] text-muted-foreground">Tổng vé/ghế</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          <p class="text-[11px] text-muted-foreground">Doanh thu tiềm năng</p>
        </div>
        <div class="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
          <p class="text-lg font-bold text-foreground">
            {tiers.filter((t) => t.type === 'assigned').length} ngồi / {tiers.filter(
              (t) => t.type === 'general',
            ).length} đứng
          </p>
          <p class="text-[11px] text-muted-foreground">Phân loại</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div
    class="bento-card flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between"
  >
    <div class="hidden md:block">
      {#if !isValid && validationIssues.length > 0}
        <p class="text-xs text-muted-foreground">
          ⚠️ {validationIssues.length} vấn đề cần khắc phục
        </p>
      {:else if isValid}
        <p class="text-xs text-success">✓ Sẵn sàng</p>
      {/if}
    </div>

    <div class="flex flex-col-reverse gap-2 md:flex-row md:items-center">
      <!-- Finish without map -->
      {#if isValid}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <span {...props}>
                <Button
                  type="button"
                  variant="outline"
                  class="w-full gap-2 md:w-auto"
                  onclick={onFinishWithoutMap}
                  disabled={isSaving}
                >
                  {#if isSaving}
                    <Loader class="h-4 w-4 animate-spin" />
                  {:else}
                    <Check class="h-4 w-4" />
                  {/if}
                  Lưu bản nháp
                </Button>
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p class="text-xs">Lưu danh sách vé mà không cần vẽ sơ đồ ghế</p>
          </Tooltip.Content>
        </Tooltip.Root>
      {/if}

      <!-- Design map button -->
      {#if isValid}
        <Button type="button" class="w-full gap-2 md:w-auto" onclick={onDesignMap}>
          <Map class="h-4 w-4" />
          Thiết kế sơ đồ tương tác
        </Button>
      {:else}
        <Tooltip.Root>
          <Tooltip.Trigger>
            {#snippet child({ props })}
              <span {...props} class="inline-flex w-full md:w-auto">
                <Button type="button" class="w-full gap-2 md:w-auto" disabled>Tiếp tục</Button>
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" class="max-w-xs">
            <p class="mb-1 text-xs font-semibold">Chưa thể tiếp tục:</p>
            <ul class="list-inside list-disc space-y-0.5 text-xs">
              {#each validationIssues.slice(0, 5) as issue, idx (`${issue}-${idx}`)}
                <li>{issue}</li>
              {/each}
            </ul>
          </Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </div>
  </div>
</div>
