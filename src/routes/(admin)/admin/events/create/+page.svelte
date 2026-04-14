<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import MarkdownEditor from '$lib/components/admin/event/MarkdownEditor.svelte';
  import StepActions from '$lib/components/admin/event/StepActions.svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { formatZodErrors } from '$lib/shared/format-errors';
  import { createBasicInfoSchema } from '$lib/shared/schemas/event.schema';
  import {
    clearDraft,
    eventParam,
    getStoredEventId,
    readDraft,
    storeEventIdentity,
    writeDraft,
  } from '$lib/stores/event-create-store';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import {
    ArrowLeft,
    Building2,
    FileText,
    ImageIcon,
    MapPin,
    RotateCcw,
    ShieldAlert,
    Sparkles,
    Ticket,
  } from 'lucide-svelte';

  // ── Data from layout (categories + event when ?event=ID) ──
  let layoutData = $derived(
    page.data as {
      categories: { id: number; name: string }[];
      event: {
        id: number;
        category_id: number | null;
        title: string;
        description: string | null;
        terms_and_conditions: string | null;
        venue: string;
        banner_image_url: string | null;
        static_map_image_url: string | null;
        min_age: number;
        max_tickets_per_user: number;
        amenities: string[] | null;
        organizer_info: Record<string, string> | null;
      } | null;
    },
  );

  // ── Amenity options ──
  const AMENITY_OPTIONS: { value: string; label: string; icon: string }[] = [
    { value: 'parking', label: 'Bãi đỗ xe', icon: '🅿️' },
    { value: 'wifi', label: 'Wi-Fi', icon: '📶' },
    { value: 'f-and-b', label: 'Đồ ăn & thức uống', icon: '🍔' },
    { value: 'wheelchair', label: 'Xe lăn', icon: '♿' },
    { value: 'restroom', label: 'Nhà vệ sinh', icon: '🚻' },
    { value: 'smoking-area', label: 'Khu hút thuốc', icon: '🚬' },
    { value: 'first-aid', label: 'Y tế', icon: '🏥' },
    { value: 'atm', label: 'ATM', icon: '🏧' },
    { value: 'cloakroom', label: 'Phòng giữ đồ', icon: '🧳' },
    { value: 'merchandise', label: 'Quầy bán merch', icon: '🛍️' },
  ];

  // ── Draft persistence (centralized) ──
  type Step1Draft = {
    category_id?: number;
    title: string;
    description: string;
    terms_and_conditions: string;
    venue: string;
    banner_image_url: string;
    static_map_image_url: string;
    min_age: number;
    max_tickets_per_user: number;
    amenities: string[];
    organizer_name: string;
    organizer_email: string;
    organizer_phone: string;
    organizer_website: string;
  };

  const draft = readDraft<Step1Draft>('step1Draft');

  // Server-loaded edit data (when ?event=ID is passed via layout)
  const initEdit = (() => {
    const e = layoutData.event;
    if (!e) return null;
    // Sync to store so subsequent steps work
    if (browser) storeEventIdentity(e.id, e.title);
    return e;
  })();

  // Check if we already have an event from a previous Step 1 submission or editing
  let initialExistingEventId: number | null = initEdit?.id ?? null;
  if (!initialExistingEventId && browser) {
    initialExistingEventId = getStoredEventId();
  }
  let existingEventId = $state<number | null>(initialExistingEventId);

  // ── Form state (edit takes priority > draft > defaults) ──
  let categoryId = $state<number | undefined>(
    initEdit?.category_id ?? draft?.category_id ?? undefined,
  );
  let title = $state(initEdit?.title ?? draft?.title ?? '');
  let description = $state(initEdit?.description ?? draft?.description ?? '');
  let termsAndConditions = $state(
    initEdit?.terms_and_conditions ?? draft?.terms_and_conditions ?? '',
  );
  let venue = $state(initEdit?.venue ?? draft?.venue ?? '');
  let bannerImageUrl = $state(initEdit?.banner_image_url ?? draft?.banner_image_url ?? '');
  let staticMapImageUrl = $state(
    initEdit?.static_map_image_url ?? draft?.static_map_image_url ?? '',
  );
  let minAge = $state(initEdit?.min_age ?? draft?.min_age ?? 0);
  let maxTicketsPerUser = $state(
    initEdit?.max_tickets_per_user ?? draft?.max_tickets_per_user ?? 0,
  );
  let amenities = $state<string[]>(initEdit?.amenities ?? draft?.amenities ?? []);
  let organizerName = $state(initEdit?.organizer_info?.name ?? draft?.organizer_name ?? '');
  let organizerEmail = $state(initEdit?.organizer_info?.email ?? draft?.organizer_email ?? '');
  let organizerPhone = $state(initEdit?.organizer_info?.phone ?? draft?.organizer_phone ?? '');
  let organizerWebsite = $state(
    initEdit?.organizer_info?.website ?? draft?.organizer_website ?? '',
  );

  let loading = $state(false);
  let errors = $state<Record<string, string>>({});

  const isEditing = $derived(!!existingEventId);

  // Show restore toast (skip when editing from server data)
  let draftToastShown = false;
  $effect(() => {
    if (draft && !initEdit && !draftToastShown) {
      draftToastShown = true;
      toast.info('Đã khôi phục bản nháp từ phiên trước.');
    }
  });

  // Auto-save draft (debounced)
  $effect(() => {
    if (!browser) return;
    const snapshot: Step1Draft = {
      category_id: categoryId,
      title,
      description,
      terms_and_conditions: termsAndConditions,
      venue,
      banner_image_url: bannerImageUrl,
      static_map_image_url: staticMapImageUrl,
      min_age: minAge,
      max_tickets_per_user: maxTicketsPerUser,
      amenities,
      organizer_name: organizerName,
      organizer_email: organizerEmail,
      organizer_phone: organizerPhone,
      organizer_website: organizerWebsite,
    };
    const timer = setTimeout(() => writeDraft('step1Draft', snapshot), 300);
    return () => clearTimeout(timer);
  });

  function resetForm() {
    categoryId = undefined;
    title = '';
    description = '';
    termsAndConditions = '';
    venue = '';
    bannerImageUrl = '';
    staticMapImageUrl = '';
    minAge = 0;
    maxTicketsPerUser = 0;
    amenities = [];
    organizerName = '';
    organizerEmail = '';
    organizerPhone = '';
    organizerWebsite = '';
    errors = {};
    clearDraft('step1Draft');
    toast.info('Đã đặt lại biểu mẫu.');
  }

  function clearError(field: string) {
    if (!errors[field]) return;
    const next = { ...errors };
    delete next[field];
    errors = next;
  }

  function toggleAmenity(value: string) {
    if (amenities.includes(value)) {
      amenities = amenities.filter((a) => a !== value);
    } else {
      amenities = [...amenities, value];
    }
  }

  function buildPayload() {
    const organizerInfo: Record<string, string> = {};
    if (organizerName.trim()) organizerInfo.name = organizerName.trim();
    if (organizerEmail.trim()) organizerInfo.email = organizerEmail.trim();
    if (organizerPhone.trim()) organizerInfo.phone = organizerPhone.trim();
    if (organizerWebsite.trim()) organizerInfo.website = organizerWebsite.trim();

    return {
      category_id: categoryId,
      title: title.trim(),
      description: description.trim(),
      terms_and_conditions: termsAndConditions.trim() || undefined,
      venue: venue.trim(),
      banner_image_url: bannerImageUrl.trim() || undefined,
      static_map_image_url: staticMapImageUrl.trim() || undefined,
      min_age: Number(minAge),
      max_tickets_per_user: Number(maxTicketsPerUser),
      amenities,
      organizer_info: Object.keys(organizerInfo).length > 0 ? organizerInfo : undefined,
    };
  }

  // ── Live validation ──
  let validationIssues = $derived.by(() => {
    const issues: string[] = [];
    if (!categoryId) issues.push('Chưa chọn danh mục');
    if (!title.trim()) issues.push('Tên sự kiện không được trống');
    if (!description.trim()) issues.push('Mô tả không được trống');
    if (!venue.trim()) issues.push('Địa điểm không được trống');
    if (issues.length === 0) {
      const result = createBasicInfoSchema.safeParse(buildPayload());
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push(issue.message);
        }
      }
    }
    return issues;
  });

  let isFormValid = $derived(validationIssues.length === 0);

  async function handleSubmit() {
    const payload = buildPayload();
    const result = createBasicInfoSchema.safeParse(payload);
    if (!result.success) {
      errors = formatZodErrors(result.error);
      toast.error('Vui lòng kiểm tra lại thông tin nhập.');
      return;
    }
    errors = {};

    loading = true;
    let respData: { id: number; title: string; status: string } | undefined;
    let error: string | undefined;
    let details: Record<string, string> | undefined;

    if (existingEventId) {
      const resp = await api.patch<{ id: number; title: string; status: string }>(
        '/events/create/basic-info',
        { ...payload, event_id: existingEventId },
        { silent: true },
      );
      respData = resp.data;
      error = resp.error;
      details = resp.details;
    } else {
      const resp = await api.post<{ id: number; title: string; status: string }>(
        '/events/create/basic-info',
        payload,
        { silent: true },
      );
      respData = resp.data;
      error = resp.error;
      details = resp.details;
    }
    loading = false;

    if (details) {
      errors = details;
      toast.error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }
    if (respData) {
      storeEventIdentity(respData.id, respData.title);
      existingEventId = respData.id;
      toast.success('Đã lưu thông tin cơ bản! Tiếp tục thêm suất diễn.');
      goto(resolve(`/admin/events/create/shows${eventParam(respData.id)}`));
    }
  }
</script>

<div class="space-y-6">
  <!-- Back button -->
  <Button variant="ghost" size="sm" href={resolve('/admin/events')} class="gap-2">
    <ArrowLeft class="h-4 w-4" />
    Quay lại danh sách
  </Button>

  <!-- Page header -->
  <div>
    <h1 class="font-heading text-2xl font-bold tracking-tight md:text-3xl">
      {isEditing ? 'Chỉnh sửa thông tin cơ bản' : 'Bước 1: Thông tin cơ bản'}
    </h1>
    <p class="mt-1 text-sm text-muted-foreground">
      {#if isEditing}
        Chỉnh sửa thông tin cơ bản. Nhấn "Tiếp tục" để cập nhật và sang bước tiếp.
      {:else}
        Nhập thông tin chung, hình ảnh, tiện ích và quy định. Sự kiện sẽ được lưu dưới dạng
        <span class="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          bản nháp
        </span>
        .
      {/if}
    </p>
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
    class="space-y-6"
  >
    <!-- ══════ Category ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <FileText class="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Danh mục & Thông tin chung</h2>
          <p class="text-xs text-muted-foreground">Phân loại, tên, mô tả và địa điểm</p>
        </div>
      </div>

      <div class="grid gap-5">
        <!-- Category Select -->
        <div class="grid gap-1.5">
          <Label for="category">
            Danh mục sự kiện <span class="text-destructive">*</span>
          </Label>
          <Select.Root
            type="single"
            value={categoryId ? String(categoryId) : undefined}
            onValueChange={(v) => {
              categoryId = v ? Number(v) : undefined;
              clearError('category_id');
            }}
          >
            <Select.Trigger id="category">
              {#if categoryId}
                {layoutData.categories.find((c) => c.id === categoryId)?.name ?? 'Chọn danh mục'}
              {:else}
                Chọn danh mục
              {/if}
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Danh mục</Select.Label>
                {#each layoutData.categories as cat (cat.id)}
                  <Select.Item value={String(cat.id)}>{cat.name}</Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
          {#if errors.category_id}
            <span class="text-xs text-destructive">{errors.category_id}</span>
          {/if}
        </div>

        <!-- Title -->
        <div class="grid gap-1.5">
          <Label for="title">
            Tên sự kiện <span class="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="VD: Đêm nhạc Trịnh Công Sơn"
            bind:value={title}
            onfocus={() => clearError('title')}
          />
          {#if errors.title}
            <span class="text-xs text-destructive">{errors.title}</span>
          {/if}
        </div>

        <!-- Description (Markdown) -->
        <div class="grid gap-1.5">
          <Label for="description">
            Mô tả <span class="text-destructive">*</span>
            <span class="ml-1.5 text-xs font-normal text-muted-foreground">(Markdown)</span>
          </Label>
          <div onfocusin={() => clearError('description')}>
            <MarkdownEditor
              bind:value={description}
              placeholder="Mô tả chi tiết sự kiện... (hỗ trợ Markdown)"
              id="description"
              rows={8}
            />
          </div>
          {#if errors.description}
            <span class="text-xs text-destructive">{errors.description}</span>
          {/if}
        </div>

        <!-- Terms and Conditions (Markdown) -->
        <div class="grid gap-1.5">
          <Label for="terms">
            Điều khoản & Điều kiện
            <span class="ml-1.5 text-xs font-normal text-muted-foreground">
              (Markdown, tùy chọn)
            </span>
          </Label>
          <div onfocusin={() => clearError('terms_and_conditions')}>
            <MarkdownEditor
              bind:value={termsAndConditions}
              placeholder="Điều khoản tham gia sự kiện..."
              id="terms"
              rows={5}
            />
          </div>
          {#if errors.terms_and_conditions}
            <span class="text-xs text-destructive">{errors.terms_and_conditions}</span>
          {/if}
        </div>

        <!-- Venue -->
        <div class="grid gap-1.5">
          <Label for="venue" class="flex items-center gap-1.5">
            <MapPin class="h-3.5 w-3.5 text-muted-foreground" />
            Địa điểm
            <span class="text-destructive">*</span>
          </Label>
          <Input
            id="venue"
            placeholder="VD: Nhà hát lớn Hà Nội"
            bind:value={venue}
            onfocus={() => clearError('venue')}
          />
          {#if errors.venue}
            <span class="text-xs text-destructive">{errors.venue}</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- ══════ Organizer Info Card ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
          <Building2 class="h-5 w-5 text-cyan-500" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Ban tổ chức</h2>
          <p class="text-xs text-muted-foreground">Tùy chọn — Thông tin liên hệ nhà tổ chức</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="grid gap-1.5">
          <Label for="org-name">Tên tổ chức</Label>
          <Input id="org-name" placeholder="VD: TixTac Entertainment" bind:value={organizerName} />
        </div>
        <div class="grid gap-1.5">
          <Label for="org-email">Email</Label>
          <Input
            id="org-email"
            type="email"
            placeholder="contact@example.com"
            bind:value={organizerEmail}
          />
        </div>
        <div class="grid gap-1.5">
          <Label for="org-phone">Số điện thoại</Label>
          <Input id="org-phone" placeholder="+84 28 1234 5678" bind:value={organizerPhone} />
        </div>
        <div class="grid gap-1.5">
          <Label for="org-website">Website</Label>
          <Input
            id="org-website"
            type="url"
            placeholder="https://example.com"
            bind:value={organizerWebsite}
          />
        </div>
      </div>
    </div>

    <!-- ══════ Images Card ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/10">
          <ImageIcon class="h-5 w-5 text-purple" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Hình ảnh</h2>
          <p class="text-xs text-muted-foreground">Tùy chọn — Ảnh banner và sơ đồ tĩnh</p>
        </div>
      </div>

      <div class="grid gap-5">
        <div class="grid gap-1.5">
          <Label for="banner_image_url">Ảnh banner</Label>
          <Input
            id="banner_image_url"
            type="url"
            placeholder="https://example.com/banner.jpg"
            bind:value={bannerImageUrl}
            onfocus={() => clearError('banner_image_url')}
          />
          {#if errors.banner_image_url}
            <span class="text-xs text-destructive">{errors.banner_image_url}</span>
          {/if}
          {#if bannerImageUrl.trim()}
            <div class="mt-2 overflow-hidden rounded-2xl border border-border/50">
              <img
                src={bannerImageUrl}
                alt="Banner preview"
                class="h-40 w-full object-cover"
                onerror={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          {/if}
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center gap-1.5">
            <Label for="static_map_url">Ảnh sơ đồ tĩnh</Label>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <span
                  class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground"
                >
                  ?
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content class="max-w-60">
                <p class="text-xs">Upload ảnh sơ đồ nếu không muốn vẽ sơ đồ ghế tương tác.</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <Input
            id="static_map_url"
            type="url"
            placeholder="https://example.com/seating-map.jpg"
            bind:value={staticMapImageUrl}
            onfocus={() => clearError('static_map_image_url')}
          />
          {#if errors.static_map_image_url}
            <span class="text-xs text-destructive">{errors.static_map_image_url}</span>
          {/if}
          {#if staticMapImageUrl.trim()}
            <div class="mt-2 overflow-hidden rounded-2xl border border-border/50">
              <img
                src={staticMapImageUrl}
                alt="Map preview"
                class="h-40 w-full object-cover"
                onerror={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- ══════ Amenities Card ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
          <Sparkles class="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Tiện ích</h2>
          <p class="text-xs text-muted-foreground">Tùy chọn — Chọn tiện ích có sẵn tại sự kiện</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        {#each AMENITY_OPTIONS as opt (opt.value)}
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors
              {amenities.includes(opt.value)
              ? 'border-primary bg-primary/10 font-medium text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-muted/50'}"
            onclick={() => toggleAmenity(opt.value)}
          >
            <span>{opt.icon}</span>
            {opt.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- ══════ Business Rules Card ══════ -->
    <div class="bento-card">
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10">
          <ShieldAlert class="h-5 w-5 text-warning" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Quy định sự kiện</h2>
          <p class="text-xs text-muted-foreground">Tùy chọn — để 0 nếu không giới hạn</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div class="rounded-2xl border border-border/50 bg-muted/20 p-4">
          <div class="mb-3 flex items-center gap-1.5">
            <Label for="min_age" class="flex items-center gap-1.5">
              <ShieldAlert class="h-3.5 w-3.5 text-muted-foreground" />
              Tuổi tối thiểu
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
                <p class="text-xs">Chỉ hiển thị cảnh báo trên giao diện. Nhập 0 = mọi lứa tuổi.</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <Input
            id="min_age"
            type="number"
            min="0"
            max="99"
            placeholder="0"
            bind:value={minAge}
            onfocus={() => clearError('min_age')}
          />
          {#if errors.min_age}
            <span class="mt-1 text-xs text-destructive">{errors.min_age}</span>
          {/if}
          <p class="mt-2 text-xs text-muted-foreground">
            {#if minAge > 0}
              <span
                class="inline-flex items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-warning"
              >
                ⚠️ Từ {minAge} tuổi trở lên
              </span>
            {:else}
              Mọi lứa tuổi
            {/if}
          </p>
        </div>

        <div class="rounded-2xl border border-border/50 bg-muted/20 p-4">
          <div class="mb-3 flex items-center gap-1.5">
            <Label for="max_tickets" class="flex items-center gap-1.5">
              <Ticket class="h-3.5 w-3.5 text-muted-foreground" />
              Giới hạn vé / tài khoản
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
                <p class="text-xs">Giới hạn số vé tối đa mỗi tài khoản. Nhập 0 = không giới hạn.</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <Input
            id="max_tickets"
            type="number"
            min="0"
            max="100"
            placeholder="0"
            bind:value={maxTicketsPerUser}
            onfocus={() => clearError('max_tickets_per_user')}
          />
          {#if errors.max_tickets_per_user}
            <span class="mt-1 text-xs text-destructive">{errors.max_tickets_per_user}</span>
          {/if}
          <p class="mt-2 text-xs text-muted-foreground">
            {#if maxTicketsPerUser > 0}
              <span
                class="inline-flex items-center gap-1 rounded-md bg-info/10 px-1.5 py-0.5 text-info"
              >
                🎫 Tối đa {maxTicketsPerUser} vé/tài khoản
              </span>
            {:else}
              Không giới hạn số vé
            {/if}
          </p>
        </div>
      </div>
    </div>

    <!-- ══════ Actions (using StepActions) ══════ -->
    <StepActions
      isValid={isFormValid}
      {loading}
      issues={validationIssues}
      backHref="/admin/events"
      backLabel="Hủy"
    >
      {#snippet extraRight()}
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                type="button"
                variant="outline"
                class="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 md:w-auto"
              >
                <RotateCcw class="h-4 w-4" />
                Đặt lại
              </Button>
            {/snippet}
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Đặt lại biểu mẫu?</AlertDialog.Title>
              <AlertDialog.Description>
                Tất cả các ô bạn đã nhập sẽ bị xoá. Bạn có chắc chắn muốn đặt lại?
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Huỷ bỏ</AlertDialog.Cancel>
              <AlertDialog.Action onclick={resetForm}>Đặt lại</AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      {/snippet}
    </StepActions>
  </form>
</div>
