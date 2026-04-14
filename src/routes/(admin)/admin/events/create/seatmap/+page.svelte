<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { SeatmapBuilder } from '$lib/components/admin/seatmap';
  import TicketInventory from '$lib/components/admin/seatmap/TicketInventory.svelte';
  import type { StageElement, TicketTier } from '$lib/components/admin/seatmap/types';
  import {
    autoGridDimensions,
    generateExcessDisabledSeats,
    SECTION_COLORS,
  } from '$lib/components/admin/seatmap/types';
  import type { MapConfigInput, SectionFormData } from '$lib/shared/schemas/event.schema';
  import {
    clearAllDrafts,
    clearDraft,
    getStoredEventId,
    getStoredEventTitle,
    readDraft,
    storeEventIdentity,
    writeDraft,
  } from '$lib/stores/event-create-store';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/utils/api';
  import { createDefaultSection, generatePrefix } from '$lib/utils/section-defaults';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

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

  // Read initial server data once (non-reactive — only needed at mount)
  const serverEvent = (page.data as { event: LayoutEvent | null }).event;

  // ── Get data: layout (DB) > sessionStorage ──
  type ShowInfo = {
    id: number;
    title: string | null;
    show_date: string;
    status: string;
  };

  // ── Compute initial values from server or sessionStorage ──
  function computeInitialState() {
    let initEventId: number | null = null;
    let initEventTitle = '';
    let initShowsList: ShowInfo[] = [];
    let initMapConfig: MapConfigInput = {
      width: 1200,
      height: 800,
      gridSize: 20,
      snapToGrid: true,
    };
    let initStageElements: StageElement[] = [];
    let initSectionsByShow = new SvelteMap<number, SectionFormData[]>();
    let initSectionsLoadedFromDB = false;

    if (serverEvent && serverEvent.shows.length > 0) {
      // Hydrate event identity + shows list from server data (DB-first)
      initEventId = serverEvent.id;
      initEventTitle = serverEvent.title;
      if (browser) storeEventIdentity(serverEvent.id, serverEvent.title);

      initShowsList = serverEvent.shows.map((s) => ({
        id: s.id,
        title: s.title,
        show_date: s.show_date,
        status: s.status,
      }));

      if (serverEvent.map_config) initMapConfig = serverEvent.map_config;
      if (serverEvent.stage_layout) initStageElements = serverEvent.stage_layout;

      // Check if any show already has sections in DB
      const hasDBSections = serverEvent.shows.some((s) => s.sections.length > 0);

      if (hasDBSections) {
        // Convert DB sections to SectionFormData
        for (const show of serverEvent.shows) {
          if (show.sections.length > 0) {
            const formSections: SectionFormData[] = show.sections.map((sec, i) => ({
              name: sec.name,
              type: sec.type as 'assigned' | 'general',
              is_seat_pickable: sec.is_seat_pickable,
              price: sec.price,
              capacity: sec.capacity,
              layout_config: sec.layout_config,
              seat_config: sec.seat_config,
              disabled_seats: '', // Not re-loaded here; seats are already in DB
              sort_order: i,
              sales_start_at: sec.sales_start_at ?? '',
              sales_end_at: sec.sales_end_at ?? '',
            }));
            initSectionsByShow.set(show.id, formSections);
          }
        }
        initSectionsLoadedFromDB = true;
        // Clear stale section/tier drafts since we loaded from DB
        if (browser) {
          clearDraft('step3Draft');
          clearDraft('tiers');
          clearDraft('mapConfig');
          clearDraft('stageElements');
        }
      } else if (browser) {
        // Shows exist in DB but no sections yet (fresh step 3).
        // Fall back to sessionStorage drafts for sections/tiers.
        const storedMapConfig = readDraft<MapConfigInput>('mapConfig');
        if (storedMapConfig) initMapConfig = storedMapConfig;

        const storedStageElements = readDraft<StageElement[]>('stageElements');
        if (storedStageElements) initStageElements = storedStageElements;

        const seatmapDraft = readSeatmapDraft();
        if (seatmapDraft) initSectionsByShow = seatmapDraft;
      }
    } else if (browser) {
      // No server data at all — full sessionStorage fallback
      initEventId = getStoredEventId();
      initEventTitle = getStoredEventTitle();

      const storedShows = readDraft<ShowInfo[]>('shows');
      if (storedShows) initShowsList = storedShows;

      const storedMapConfig = readDraft<MapConfigInput>('mapConfig');
      if (storedMapConfig) initMapConfig = storedMapConfig;

      const storedStageElements = readDraft<StageElement[]>('stageElements');
      if (storedStageElements) initStageElements = storedStageElements;

      const seatmapDraft = readSeatmapDraft();
      if (seatmapDraft) initSectionsByShow = seatmapDraft;
    }

    return {
      initEventId,
      initEventTitle,
      initShowsList,
      initMapConfig,
      initStageElements,
      initSectionsByShow,
      initSectionsLoadedFromDB,
    };
  }

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

  const {
    initEventId,
    initEventTitle,
    initShowsList,
    initMapConfig,
    initStageElements,
    initSectionsByShow,
    initSectionsLoadedFromDB,
  } = computeInitialState();

  let eventId = $state<number | null>(initEventId);
  let eventTitle = $state(initEventTitle);
  let showsList = $state<ShowInfo[]>(initShowsList);
  let selectedShowIndex = $state(0);
  let mapConfig = $state<MapConfigInput>(initMapConfig);
  let stageElements = $state<StageElement[]>(initStageElements);
  let sectionsByShow = $state(initSectionsByShow);
  let sectionsLoadedFromDB = initSectionsLoadedFromDB;

  // Redirect if no data from previous steps
  $effect(() => {
    if (browser && (!eventId || showsList.length === 0)) {
      toast.error('Vui lòng hoàn thành Bước 1 và 2 trước.');
      goto(resolve('/admin/events/create'));
    }
  });

  const selectedShow = $derived(showsList[selectedShowIndex] ?? null);

  // ══════════════════════════════════════════════
  // VIEW STATE: 'inventory' (Phase 1) or 'canvas' (Phase 2)
  // ══════════════════════════════════════════════
  let currentView = $state<'inventory' | 'canvas'>('inventory');

  // ── Ticket Tiers (shared across views) ──
  let tiers = $state<TicketTier[]>(readDraft<TicketTier[]>('tiers') ?? []);

  // Auto-save tiers
  $effect(() => {
    if (!browser) return;
    const timer = setTimeout(() => writeDraft('tiers', $state.snapshot(tiers)), 300);
    return () => clearTimeout(timer);
  });

  // Show restore toast for step 3
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

  // Initialize sections for each show (only if not already loaded)
  $effect(() => {
    for (const show of showsList) {
      if (!sectionsByShow.has(show.id)) {
        sectionsByShow.set(show.id, []);
      }
    }
  });

  // Auto-save seatmap draft
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

  // Reactive proxy for current show's sections
  let currentShowId = $derived(selectedShow?.id ?? null);
  let editingSections = $state<SectionFormData[]>([]);

  // When selected show changes, load sections from map
  $effect(() => {
    if (currentShowId !== null) {
      const stored = sectionsByShow.get(currentShowId);
      if (stored) {
        editingSections = stored;
      } else {
        const def: SectionFormData[] = [];
        sectionsByShow.set(currentShowId, def);
        editingSections = def;
      }
    }
  });

  // When editingSections changes, write back to map
  $effect(() => {
    if (currentShowId !== null) {
      sectionsByShow.set(currentShowId, editingSections);
    }
  });

  // Track which shows have been saved
  let savedShows = $state(new SvelteMap<number, boolean>());
  let savingShowId = $state<number | null>(null);

  // If loaded from DB with sections, mark those shows as already saved
  if (initSectionsLoadedFromDB && serverEvent) {
    for (const show of serverEvent.shows) {
      if (show.sections.length > 0) {
        savedShows.set(show.id, true);
      }
    }
  }

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

  async function handleSave() {
    if (!selectedShow) return;
    const showId = selectedShow.id;

    // Validate
    const sections = sectionsByShow.get(showId) ?? [];
    if (sections.length === 0) {
      toast.error('Phải có ít nhất 1 khu vực ghế.');
      return;
    }
    for (const [i, sec] of sections.entries()) {
      if (!sec.name.trim()) {
        toast.error(`Khu vực "${sec.name || '(trống)'}" thiếu tên.`);
        return;
      }
      if (sec.price <= 0) {
        toast.error(`Khu vực "${sec.name}" phải có giá > 0.`);
        return;
      }
      if (sec.type === 'assigned' && (sec.seat_config.rows < 1 || sec.seat_config.cols < 1)) {
        toast.error(`Khu vực "${sec.name}" phải có ít nhất 1 hàng và 1 cột.`);
        return;
      }
      if (sec.type === 'general' && (sec.capacity ?? 0) < 1) {
        toast.error(`Khu vực "${sec.name}" phải có sức chứa > 0.`);
        return;
      }
      // Auto-generate prefix if missing for assigned sections
      if (sec.type === 'assigned' && !sec.seat_config.prefix?.trim()) {
        sec.seat_config.prefix = generatePrefix(sec.name, i);
      }
    }

    savingShowId = showId;
    const payload = buildSeatmapPayload(showId);
    const { error } = await api.post('/events/create/seatmap', payload, { silent: true });
    savingShowId = null;

    if (error) {
      toast.error(error);
      return;
    }

    savedShows.set(showId, true);
    toast.success('Đã lưu sơ đồ ghế cho suất diễn!');
  }

  /** Save tiers as simple sections (no map layout) — "Finish without map" */
  async function handleFinishWithoutMap() {
    if (!selectedShow) return;
    if (tiers.length === 0) {
      toast.error('Phải có ít nhất 1 hạng vé.');
      return;
    }

    // Convert tiers → sections (simple, no canvas layout)
    for (const show of showsList) {
      const sections: SectionFormData[] = tiers.map((tier, i) => {
        const sec = createDefaultSection(i);
        sec.name = tier.name;
        sec.price = tier.price;
        sec.type = tier.type;
        sec.layout_config.color = tier.color;
        sec.seat_config.prefix = tier.prefix || generatePrefix(tier.name, i);
        if (tier.type === 'assigned') {
          const { rows, cols } = autoGridDimensions(tier.capacity);
          sec.seat_config.rows = rows;
          sec.seat_config.cols = cols;
          sec.disabled_seats = generateExcessDisabledSeats(
            tier.capacity,
            rows,
            cols,
            sec.seat_config.prefix,
            sec.seat_config.startRowIndex,
            sec.seat_config.startColIndex,
          );
        } else {
          sec.capacity = tier.capacity;
          sec.is_seat_pickable = false;
        }
        return sec;
      });
      sectionsByShow.set(show.id, sections);
    }

    // Save all shows
    for (const show of showsList) {
      savingShowId = show.id;
      const payload = buildSeatmapPayload(show.id);
      const { error } = await api.post('/events/create/seatmap', payload, { silent: true });
      if (error) {
        savingShowId = null;
        toast.error(`Lỗi khi lưu suất "${show.title || show.show_date}": ${error}`);
        return;
      }
      savedShows.set(show.id, true);
    }
    savingShowId = null;

    cleanupAndFinish();
  }

  let allShowsSaved = $derived(showsList.every((s) => savedShows.get(s.id)));

  async function handleFinish() {
    // Save ALL unsaved shows that have sections (not just the current one)
    for (const show of showsList) {
      if (savedShows.get(show.id)) continue;
      const showSections = sectionsByShow.get(show.id) ?? [];
      if (showSections.length === 0) {
        toast.error(
          `Suất "${show.title || show.show_date}" chưa có khu vực ghế. Hãy thiết kế hoặc clone sơ đồ.`,
        );
        return;
      }
      // Validate & auto-fix prefix
      for (const [i, sec] of showSections.entries()) {
        if (sec.type === 'assigned' && !sec.seat_config.prefix?.trim()) {
          sec.seat_config.prefix = generatePrefix(sec.name, i);
        }
      }
      savingShowId = show.id;
      const payload = buildSeatmapPayload(show.id);
      const { error } = await api.post('/events/create/seatmap', payload, { silent: true });
      if (error) {
        savingShowId = null;
        toast.error(`Lỗi khi lưu suất "${show.title || show.show_date}": ${error}`);
        return;
      }
      savedShows.set(show.id, true);
    }
    savingShowId = null;

    if (!allShowsSaved) {
      toast.error('Vui lòng lưu sơ đồ ghế cho tất cả các suất diễn.');
      return;
    }

    cleanupAndFinish();
  }

  function cleanupAndFinish() {
    clearAllDrafts();
    toast.success('Tạo sự kiện hoàn tất! Sự kiện đang ở trạng thái Draft.');
    goto(resolve(`/admin/events/${eventId}`));
  }

  async function handleCloneMap() {
    if (!selectedShow) return;
    const currentSections = sectionsByShow.get(selectedShow.id) ?? [];
    if (currentSections.length === 0) {
      toast.error('Suất hiện tại chưa có khu vực ghế để sao chép.');
      return;
    }
    const snapshot = JSON.parse(
      JSON.stringify($state.snapshot(currentSections)),
    ) as SectionFormData[];

    let clonedCount = 0;
    for (const show of showsList) {
      if (show.id === selectedShow.id) continue;
      // Clone to shows that don't have sections yet
      if (!sectionsByShow.has(show.id) || (sectionsByShow.get(show.id)?.length ?? 0) === 0) {
        sectionsByShow.set(
          show.id,
          snapshot.map((s) => ({ ...s })),
        );
        clonedCount++;
      }
    }

    if (clonedCount === 0) {
      toast.info('Tất cả các suất đã có sơ đồ ghế.');
      return;
    }

    // Auto-save all cloned shows
    let saveErrors = 0;
    for (const show of showsList) {
      if (show.id === selectedShow.id || savedShows.get(show.id)) continue;
      const showSections = sectionsByShow.get(show.id) ?? [];
      if (showSections.length === 0) continue;

      savingShowId = show.id;
      const payload = buildSeatmapPayload(show.id);
      const { error } = await api.post('/events/create/seatmap', payload, { silent: true });
      if (error) {
        saveErrors++;
        toast.error(`Lỗi khi lưu suất "${show.title || show.show_date}": ${error}`);
      } else {
        savedShows.set(show.id, true);
      }
    }
    savingShowId = null;

    if (saveErrors === 0) {
      toast.success(`Đã sao chép và lưu sơ đồ cho ${clonedCount} suất diễn.`);
    } else {
      toast.warning(`Đã sao chép sơ đồ nhưng ${saveErrors} suất gặp lỗi khi lưu.`);
    }
  }

  // ── Switch to canvas view ──
  function handleDesignMap() {
    currentView = 'canvas';
  }

  function handleBackToInventory() {
    currentView = 'inventory';
  }

  let showTitleDisplay = $derived(selectedShow?.title || `Suất #${selectedShowIndex + 1}`);

  // Reconstruct tiers from existing sections (DB or draft) if tiers are empty.
  // Always start in inventory view so user can review/edit tiers first.
  let hasReconstructedTiers = false;
  $effect(() => {
    if (hasReconstructedTiers) return;
    if (tiers.length > 0) {
      hasReconstructedTiers = true;
      return;
    }
    // Check if any show already has sections placed
    for (const [, secs] of sectionsByShow.entries()) {
      if (secs.length > 0) {
        const reconstructed: TicketTier[] = [];
        const seen = new SvelteSet<string>();
        for (const sec of secs) {
          const key = `${sec.name}||${sec.layout_config.color}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const capacity =
            sec.type === 'general'
              ? (sec.capacity ?? 0)
              : (sec.seat_config.rows ?? 0) * (sec.seat_config.cols ?? 0);
          reconstructed.push({
            id: `tier-restored-${reconstructed.length}`,
            name: sec.name,
            prefix: sec.seat_config.prefix || generatePrefix(sec.name, reconstructed.length),
            price: sec.price,
            capacity,
            color:
              sec.layout_config.color ||
              SECTION_COLORS[reconstructed.length % SECTION_COLORS.length],
            type: sec.type as 'assigned' | 'general',
            placedCount: capacity,
          });
        }
        tiers = reconstructed;
        hasReconstructedTiers = true;
        break;
      }
    }
  });
</script>

{#if currentView === 'inventory'}
  <TicketInventory
    bind:tiers
    onDesignMap={handleDesignMap}
    onFinishWithoutMap={handleFinishWithoutMap}
    isSaving={savingShowId !== null}
    {eventTitle}
    showTitle={showTitleDisplay}
    showCount={showsList.length}
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
    bind:tiers
    isSaving={savingShowId !== null}
    isSaved={selectedShow ? (savedShows.get(selectedShow.id) ?? false) : false}
    onSave={handleSave}
    onFinish={handleFinish}
    onCloneMap={showsList.length > 1 ? handleCloneMap : undefined}
    onBackToInventory={handleBackToInventory}
  />
{/if}
