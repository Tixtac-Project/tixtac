<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { SeatmapBuilder } from '$lib/components/admin/seatmap';
  import TicketInventory from '$lib/components/admin/seatmap/TicketInventory.svelte';
  import type { StageElement, TicketTier } from '$lib/components/admin/seatmap/types';
  import { SECTION_COLORS } from '$lib/components/admin/seatmap/types';
  import type { MapConfigInput, SectionFormData } from '$lib/shared/schemas/event.schema';
  import {
    clearAllDrafts,
    clearDraft,
    eventParam,
    getStoredEventId,
    getStoredEventTitle,
    readDraft,
    storeEventIdentity,
    writeDraft,
  } from '$lib/stores/event-create-store';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { generatePrefix } from '$lib/utils/section-defaults';
  import { SvelteMap } from 'svelte/reactivity';

  // ── Layout data (event + shows loaded from DB when ?event=ID) ──
  type LayoutShow = {
    id: number;
    title: string | null;
    show_date: string;
    status: string;
    sections: {
      id: number;
      name: string;
      type: string;
      is_seat_pickable: boolean;
      price: number;
      capacity: number;
      layout_config: SectionFormData['layout_config'];
      seat_config: SectionFormData['seat_config'];
      sales_start_at: string | null;
      sales_end_at: string | null;
      seat_count: number;
      available_count: number;
      disabled_count: number;
    }[];
  };

  type LayoutEvent = {
    id: number;
    title: string;
    map_config: MapConfigInput | null;
    stage_layout: StageElement[] | null;
    shows: LayoutShow[];
  };

  type ShowInfo = {
    id: number;
    title: string | null;
    show_date: string;
    status: string;
  };

  // Read initial server data once (non-reactive — only needed at mount)
  const serverEvent = (page.data as { event: LayoutEvent | null }).event;

  // ══════════════════════════════════════════════════
  // INITIALIZATION — single source of truth setup
  // ══════════════════════════════════════════════════

  function readSeatmapDraft(): SvelteMap<number, SectionFormData[]> | null {
    const raw = readDraft<Record<string, SectionFormData[]>>('step3Draft');
    if (!raw) return null;
    const map = new SvelteMap<number, SectionFormData[]>();
    for (const [key, val] of Object.entries(raw)) {
      if (Array.isArray(val) && val.length > 0) {
        map.set(Number(key), val);
      }
    }
    return map.size > 0 ? map : null;
  }

  /** Validate that draft show IDs match a set of known-good IDs */
  function isDraftValid(
    draft: SvelteMap<number, SectionFormData[]>,
    validIds: Set<number>,
  ): boolean {
    for (const id of draft.keys()) {
      if (!validIds.has(id)) return false;
    }
    return true;
  }

  function computeInitialState() {
    let eventId: number | null = null;
    let eventTitle = '';
    let showsList: ShowInfo[] = [];
    let mapConfig: MapConfigInput = {
      width: 1200,
      height: 800,
      gridSize: 20,
      snapToGrid: true,
    };
    let stageElements: StageElement[] = [];
    let sectionsByShow = new SvelteMap<number, SectionFormData[]>();
    let sectionsLoadedFromDB = false;

    if (serverEvent && serverEvent.shows.length > 0) {
      // ── Source: Server (DB) ──
      eventId = serverEvent.id;
      eventTitle = serverEvent.title;
      if (browser) storeEventIdentity(serverEvent.id, serverEvent.title);

      showsList = serverEvent.shows.map((s) => ({
        id: s.id,
        title: s.title,
        show_date: s.show_date,
        status: s.status,
      }));

      // Always sync sessionStorage with authoritative server show IDs
      if (browser) writeDraft('shows', showsList);

      if (serverEvent.map_config) mapConfig = serverEvent.map_config;
      if (serverEvent.stage_layout) stageElements = serverEvent.stage_layout;

      const hasDBSections = serverEvent.shows.some((s) => s.sections.length > 0);
      const serverShowIds = new Set(serverEvent.shows.map((s) => s.id));

      if (hasDBSections) {
        // Load sections from DB — authoritative
        for (const show of serverEvent.shows) {
          const formSections: SectionFormData[] = show.sections.map((sec, i) => ({
            name: sec.name,
            type: sec.type as 'assigned' | 'general',
            is_seat_pickable: sec.is_seat_pickable,
            price: sec.price,
            capacity: sec.capacity,
            layout_config: sec.layout_config,
            seat_config: sec.seat_config,
            disabled_seats: '',
            sort_order: i,
            sales_start_at: sec.sales_start_at ?? '',
            sales_end_at: sec.sales_end_at ?? '',
          }));
          // Even shows with 0 sections get an empty array
          sectionsByShow.set(show.id, formSections);
        }
        sectionsLoadedFromDB = true;
        if (browser) {
          clearDraft('step3Draft');
          clearDraft('mapConfig');
          clearDraft('stageElements');
        }
      } else if (browser) {
        // No DB sections — try restoring from draft (validating IDs)
        const storedMapConfig = readDraft<MapConfigInput>('mapConfig');
        if (storedMapConfig) mapConfig = storedMapConfig;

        const storedStageElements = readDraft<StageElement[]>('stageElements');
        if (storedStageElements) stageElements = storedStageElements;

        const seatmapDraft = readSeatmapDraft();
        if (seatmapDraft && isDraftValid(seatmapDraft, serverShowIds)) {
          sectionsByShow = seatmapDraft;
        } else if (seatmapDraft) {
          clearDraft('step3Draft'); // Stale draft
        }
      }
    } else if (browser) {
      // ── Source: SessionStorage only (no server data) ──
      eventId = getStoredEventId();
      eventTitle = getStoredEventTitle();

      const storedShows = readDraft<ShowInfo[]>('shows');
      if (storedShows) showsList = storedShows;

      const storedMapConfig = readDraft<MapConfigInput>('mapConfig');
      if (storedMapConfig) mapConfig = storedMapConfig;

      const storedStageElements = readDraft<StageElement[]>('stageElements');
      if (storedStageElements) stageElements = storedStageElements;

      const seatmapDraft = readSeatmapDraft();
      if (seatmapDraft && storedShows) {
        const storedShowIds = new Set(storedShows.map((s) => s.id));
        if (isDraftValid(seatmapDraft, storedShowIds)) {
          sectionsByShow = seatmapDraft;
        } else {
          clearDraft('step3Draft');
        }
      }
    }

    // Ensure every show has an entry in the map (even if empty)
    for (const show of showsList) {
      if (!sectionsByShow.has(show.id)) {
        sectionsByShow.set(show.id, []);
      }
    }

    return {
      eventId,
      eventTitle,
      showsList,
      mapConfig,
      stageElements,
      sectionsByShow,
      sectionsLoadedFromDB,
    };
  }

  const init = computeInitialState();

  let eventId = $state<number | null>(init.eventId);
  let eventTitle = $state(init.eventTitle);
  let showsList = $state<ShowInfo[]>(init.showsList);
  let selectedShowIndex = $state(0);
  let mapConfig = $state<MapConfigInput>(init.mapConfig);
  let stageElements = $state<StageElement[]>(init.stageElements);
  let sectionsByShow = $state(init.sectionsByShow);
  let sectionsLoadedFromDB = init.sectionsLoadedFromDB;

  // Redirect if no data from previous steps
  $effect(() => {
    if (browser && (!eventId || showsList.length === 0)) {
      toast.error('Vui lòng hoàn thành Bước 1 và 2 trước.');
      goto(resolve('/admin/events/create'));
    }
  });

  const selectedShow = $derived(showsList[selectedShowIndex] ?? null);
  const currentShowId = $derived(selectedShow?.id ?? null);

  // ══════════════════════════════════════════════════
  // VIEW STATE
  // ══════════════════════════════════════════════════
  let currentView = $state<'inventory' | 'canvas'>('inventory');

  // Show restore toast (once)
  let step3ToastShown = false;
  $effect(() => {
    if (step3ToastShown) return;
    step3ToastShown = true;
    if (sectionsLoadedFromDB) {
      toast.info('Đã tải sơ đồ ghế hiện có từ hệ thống.');
    } else {
      const raw = readDraft<Record<string, SectionFormData[]>>('step3Draft');
      if (raw && Object.keys(raw).length > 0) {
        toast.info('Đã khôi phục bản nháp sơ đồ ghế từ phiên trước.');
      }
    }
  });

  // ══════════════════════════════════════════════════
  // SECTIONS ↔ SHOW BINDING
  // Use a getter/setter pattern instead of dual $effects
  // to avoid the circular dependency issue.
  // ══════════════════════════════════════════════════

  /**
   * `editingSections` is the reactive proxy for the currently selected show's sections.
   * Reading returns the current show's sections from the map.
   * Writing updates both the local binding and the map.
   */
  let editingSections = $state<SectionFormData[]>([]);

  // Load from map when show changes
  $effect(() => {
    const showId = currentShowId;
    if (showId === null) return;
    const stored = sectionsByShow.get(showId);
    // Only update if the show actually changed to avoid overwriting edits
    editingSections = stored ?? [];
  });

  // Write back to map when editingSections changes (but NOT when show changes)
  let lastSyncedShowId: number | null = null;
  $effect(() => {
    const showId = currentShowId;
    const sections = editingSections;
    if (showId === null) return;

    // Skip the write-back if we're in the middle of a show switch
    // (the read-effect above just set editingSections for the new show)
    if (lastSyncedShowId !== showId) {
      lastSyncedShowId = showId;
      return;
    }

    sectionsByShow.set(showId, sections);
  });

  // Auto-save seatmap draft (debounced)
  $effect(() => {
    if (!browser) return;
    const snapshot: Record<string, SectionFormData[]> = {};
    for (const [key, val] of sectionsByShow.entries()) {
      snapshot[String(key)] = $state.snapshot(val);
    }
    const timer = setTimeout(() => {
      writeDraft('step3Draft', snapshot);
      writeDraft('mapConfig', $state.snapshot(mapConfig));
      writeDraft('stageElements', $state.snapshot(stageElements));
    }, 300);
    return () => clearTimeout(timer);
  });

  // ══════════════════════════════════════════════════
  // SAVE TRACKING
  // ══════════════════════════════════════════════════
  let savedShows = $state(new SvelteMap<number, boolean>());
  let savingShowId = $state<number | null>(null);

  // Mark shows loaded from DB with sections as already saved
  if (init.sectionsLoadedFromDB && serverEvent) {
    for (const show of serverEvent.shows) {
      if (show.sections.length > 0) {
        savedShows.set(show.id, true);
      }
    }
  }

  // ══════════════════════════════════════════════════
  // DERIVED: Tiers for SeatmapBuilder toolbox
  // ══════════════════════════════════════════════════
  let tiers = $derived.by(() => {
    const result: TicketTier[] = [];
    for (let i = 0; i < editingSections.length; i++) {
      const sec = editingSections[i];
      const capacity =
        sec.type === 'general'
          ? (sec.capacity ?? 0)
          : (sec.seat_config.rows ?? 0) * (sec.seat_config.cols ?? 0);
      result.push({
        id: `tier-${i}`,
        name: sec.name,
        prefix: sec.seat_config.prefix || generatePrefix(sec.name, i),
        price: sec.price,
        capacity,
        color: sec.layout_config.color || SECTION_COLORS[i % SECTION_COLORS.length],
        type: sec.type as 'assigned' | 'general',
        placedCount: capacity,
      });
    }
    return result;
  });

  // ══════════════════════════════════════════════════
  // PAYLOAD & VALIDATION (shared helpers)
  // ══════════════════════════════════════════════════

  function buildSeatmapPayload(showId: number) {
    const sections = sectionsByShow.get(showId) ?? [];
    return {
      show_id: showId,
      map_config: $state.snapshot(mapConfig),
      stage_layout: $state.snapshot(stageElements),
      sections: sections.map((sec, i) => ({
        name: sec.name.trim(),
        type: sec.type ?? 'assigned',
        is_seat_pickable: sec.is_seat_pickable ?? true,
        price: Number(sec.price),
        capacity: Number(sec.capacity ?? 0),
        sort_order: Number(sec.sort_order ?? i),
        layout_config: sec.layout_config,
        seat_config: {
          ...sec.seat_config,
          prefix: sec.seat_config.prefix?.trim().toUpperCase() || null,
        },
        disabled_seats: sec.disabled_seats
          ? sec.disabled_seats
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          : [],
        sales_start_at: sec.sales_start_at || undefined,
        sales_end_at: sec.sales_end_at || undefined,
      })),
    };
  }

  /** Validate sections for a show. Returns error message or null. */
  function validateShowSections(showId: number): string | null {
    const sections = sectionsByShow.get(showId) ?? [];
    if (sections.length === 0) return 'Phải có ít nhất 1 khu vực ghế.';

    for (const [i, sec] of sections.entries()) {
      const label = sec.name?.trim() || `Khu vực #${i + 1}`;
      if (!sec.name.trim()) return `Khu vực #${i + 1} thiếu tên.`;
      if (sec.price <= 0) return `"${label}" phải có giá > 0.`;
      if (sec.type === 'assigned') {
        if (sec.seat_config.rows < 1 || sec.seat_config.cols < 1)
          return `"${label}" phải có ít nhất 1 hàng và 1 cột.`;
      }
      if (sec.type === 'general' && (sec.capacity ?? 0) < 1)
        return `"${label}" phải có sức chứa > 0.`;

      // Auto-fill missing prefix
      if (sec.type === 'assigned' && !sec.seat_config.prefix?.trim()) {
        sec.seat_config.prefix = generatePrefix(sec.name, i);
      }
    }
    return null;
  }

  /** Save a single show's seatmap to the server. Returns true on success. */
  async function saveShowSeatmap(show: ShowInfo): Promise<boolean> {
    const validationError = validateShowSections(show.id);
    if (validationError) {
      toast.error(`Suất "${show.title || show.show_date}": ${validationError}`);
      return false;
    }

    savingShowId = show.id;
    const payload = buildSeatmapPayload(show.id);
    const { error } = await api.post('/events/create/seatmap', payload, { silent: true });
    savingShowId = null;

    if (error) {
      toast.error(`Lỗi khi lưu suất "${show.title || show.show_date}": ${error}`);
      return false;
    }

    savedShows.set(show.id, true);
    return true;
  }

  // ══════════════════════════════════════════════════
  // USER ACTIONS
  // ══════════════════════════════════════════════════

  async function handleSave() {
    if (!selectedShow) return;
    const ok = await saveShowSeatmap(selectedShow);
    if (ok) toast.success('Đã lưu sơ đồ ghế cho suất diễn!');
  }

  async function handleFinishWithoutMap() {
    if (!selectedShow) return;

    // Validate current show has sections
    const currentSections = sectionsByShow.get(selectedShow.id) ?? [];
    if (currentSections.length === 0) {
      toast.error('Phải có ít nhất 1 hạng vé.');
      return;
    }

    // If there are other shows without sections, clone from current
    for (const show of showsList) {
      if (show.id === selectedShow.id) continue;
      const showSections = sectionsByShow.get(show.id) ?? [];
      if (showSections.length === 0) {
        const deepCopy = JSON.parse(
          JSON.stringify($state.snapshot(currentSections)),
        ) as SectionFormData[];
        sectionsByShow.set(show.id, deepCopy);
      }
    }

    // Save all shows sequentially
    for (const show of showsList) {
      if (savedShows.get(show.id)) continue;
      const ok = await saveShowSeatmap(show);
      if (!ok) return;
    }

    cleanupAndFinish();
  }

  async function handleFinish() {
    // Validate & save all unsaved shows
    for (const show of showsList) {
      if (savedShows.get(show.id)) continue;

      const showSections = sectionsByShow.get(show.id) ?? [];
      if (showSections.length === 0) {
        toast.error(
          `Suất "${show.title || show.show_date}" chưa có khu vực ghế. Hãy thiết kế hoặc clone sơ đồ.`,
        );
        return;
      }

      const ok = await saveShowSeatmap(show);
      if (!ok) return;
    }

    cleanupAndFinish();
  }

  function cleanupAndFinish() {
    clearAllDrafts();
    toast.success('Tạo sự kiện hoàn tất! Sự kiện đang ở trạng thái Draft.');
    goto(resolve(`/admin/events/${eventId}`));
  }

  /** Clone current show's sections to all other shows */
  async function handleCloneSections() {
    if (!selectedShow) return;
    const currentSections = sectionsByShow.get(selectedShow.id) ?? [];
    if (currentSections.length === 0) {
      toast.error('Suất hiện tại chưa có khu vực ghế để sao chép.');
      return;
    }

    // Deep clone the source sections (serialized snapshot to break all references)
    const serialized = JSON.stringify($state.snapshot(currentSections));

    let clonedCount = 0;
    for (const show of showsList) {
      if (show.id === selectedShow.id) continue;
      const existing = sectionsByShow.get(show.id);
      if (existing && existing.length > 0) continue; // Don't overwrite existing sections

      sectionsByShow.set(show.id, JSON.parse(serialized) as SectionFormData[]);
      clonedCount++;
    }

    if (clonedCount === 0) {
      toast.info('Tất cả các suất đã có sơ đồ ghế.');
      return;
    }

    // Save source show first (if not saved)
    if (!savedShows.get(selectedShow.id)) {
      const ok = await saveShowSeatmap(selectedShow);
      if (!ok) return;
    }

    // Save all cloned shows
    let saveErrors = 0;
    for (const show of showsList) {
      if (show.id === selectedShow.id || savedShows.get(show.id)) continue;
      const showSections = sectionsByShow.get(show.id) ?? [];
      if (showSections.length === 0) continue;

      const ok = await saveShowSeatmap(show);
      if (!ok) saveErrors++;
    }

    if (saveErrors === 0) {
      toast.success(`Đã sao chép và lưu sơ đồ cho ${clonedCount} suất diễn.`);
    } else {
      toast.warning(`Đã sao chép sơ đồ nhưng ${saveErrors} suất gặp lỗi khi lưu.`);
    }
  }

  // ── View switching ──
  function handleDesignMap() {
    currentView = 'canvas';
  }

  function handleBackToInventory() {
    currentView = 'inventory';
  }

  let showTitleDisplay = $derived(selectedShow?.title || `Suất #${selectedShowIndex + 1}`);
</script>

{#if currentView === 'inventory'}
  <TicketInventory
    bind:sections={editingSections}
    {showsList}
    bind:selectedShowIndex
    onDesignMap={handleDesignMap}
    onFinishWithoutMap={handleFinishWithoutMap}
    onCloneSections={showsList.length > 1 ? handleCloneSections : undefined}
    isSaving={savingShowId !== null}
    {eventTitle}
    backHref={resolve(`/admin/events/create/shows${eventId ? eventParam(eventId) : ''}`)}
  />
{:else}
  <SeatmapBuilder
    {eventTitle}
    showTitle={showTitleDisplay}
    {showsList}
    bind:selectedShowIndex
    bind:sections={editingSections}
    bind:mapConfig
    bind:stageElements
    {tiers}
    isSaving={savingShowId !== null}
    isSaved={selectedShow ? (savedShows.get(selectedShow.id) ?? false) : false}
    onSave={handleSave}
    onFinish={handleFinish}
    onCloneMap={showsList.length > 1 ? handleCloneSections : undefined}
    onBackToInventory={handleBackToInventory}
  />
{/if}
