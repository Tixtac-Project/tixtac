// src/lib/stores/seat-selection-store.ts
import type { SeatMapSection, SelectedSeat } from '$lib/types/seat-map';

export interface ShowCart {
  showId: number;
  showLabel: string;
  selectedSeats: SelectedSeat[];
  generalQuantities: Record<number, number>;
}

export function createSeatSelectionStore(maxTickets: number) {
  /** All carts keyed by showId */
  let carts = $state<Record<number, ShowCart>>({});

  /** Sections keyed by showId — needed for price lookups across shows */
  let sectionsMap = $state<Record<number, SeatMapSection[]>>({});

  /** Currently active showId */
  let activeShowId = $state<number>(0);

  // ── Derived: current show's cart ──
  const currentCart = $derived<ShowCart>(
    carts[activeShowId] ?? {
      showId: activeShowId,
      showLabel: '',
      selectedSeats: [],
      generalQuantities: {},
    },
  );

  // ── Derived: flatten all carts for total calculation ──
  const allCarts = $derived<ShowCart[]>(Object.values(carts));

  /** Find a section by id, searching the correct show's sections */
  function findSection(showId: number, sectionId: number): SeatMapSection | undefined {
    const sections = sectionsMap[showId];
    return sections?.find((s) => s.id === sectionId);
  }

  const totalPrice = $derived(
    allCarts.reduce((sum, cart) => {
      const seatPrice = cart.selectedSeats.reduce((s, seat) => s + seat.price, 0);
      const gaPrice = Object.entries(cart.generalQuantities).reduce((s, [sectionId, qty]) => {
        const section = findSection(cart.showId, Number(sectionId));
        return s + (section ? Number(section.price) * qty : 0);
      }, 0);
      return sum + seatPrice + gaPrice;
    }, 0),
  );

  const totalCount = $derived(
    allCarts.reduce((sum, cart) => {
      const seatCount = cart.selectedSeats.length;
      const gaCount = Object.values(cart.generalQuantities).reduce((s, qty) => s + qty, 0);
      return sum + seatCount + gaCount;
    }, 0),
  );

  // ── Current show totals (for max ticket enforcement per-show) ──
  const currentShowCount = $derived(
    currentCart.selectedSeats.length +
      Object.values(currentCart.generalQuantities).reduce((s, qty) => s + qty, 0),
  );

  /** Get sections for the active show */
  function getActiveSections(): SeatMapSection[] {
    return sectionsMap[activeShowId] ?? [];
  }

  function setSections(sections: SeatMapSection[]) {
    sectionsMap = { ...sectionsMap, [activeShowId]: sections };
  }

  function setActiveShow(showId: number, showLabel: string) {
    activeShowId = showId;
    // Ensure cart exists for this show
    if (!carts[showId]) {
      carts = {
        ...carts,
        [showId]: {
          showId,
          showLabel,
          selectedSeats: [],
          generalQuantities: {},
        },
      };
    } else if (showLabel && carts[showId].showLabel !== showLabel) {
      // Refresh the label if it changed (e.g. fallback → real formatted label)
      carts = {
        ...carts,
        [showId]: { ...carts[showId], showLabel },
      };
    }
  }

  function toggleSeat(
    seatId: number,
    label: string,
    sectionId: number,
    sectionName: string,
    price: number,
  ) {
    const cart = carts[activeShowId];
    if (!cart) return false;

    const idx = cart.selectedSeats.findIndex((s) => s.id === seatId);
    if (idx >= 0) {
      // Remove seat
      carts = {
        ...carts,
        [activeShowId]: {
          ...cart,
          selectedSeats: cart.selectedSeats.filter((s) => s.id !== seatId),
        },
      };
    } else {
      if (maxTickets > 0 && totalCount >= maxTickets) return false;
      carts = {
        ...carts,
        [activeShowId]: {
          ...cart,
          selectedSeats: [
            ...cart.selectedSeats,
            { id: seatId, label, sectionId, sectionName, price },
          ],
        },
      };
    }
    return true;
  }

  function isSeatSelected(seatId: number): boolean {
    const cart = carts[activeShowId];
    return cart ? cart.selectedSeats.some((s) => s.id === seatId) : false;
  }

  function setGeneralQuantity(sectionId: number, qty: number) {
    const cart = carts[activeShowId];
    if (!cart) return;

    const currentAssigned = cart.selectedSeats.length;
    const otherGeneral = Object.entries(cart.generalQuantities)
      .filter(([id]) => Number(id) !== sectionId)
      .reduce((sum, [, q]) => sum + q, 0);

    // Also account for other shows' selections against global max
    const otherShowsCount = allCarts
      .filter((c) => c.showId !== activeShowId)
      .reduce(
        (sum, c) =>
          sum +
          c.selectedSeats.length +
          Object.values(c.generalQuantities).reduce((s, q) => s + q, 0),
        0,
      );

    if (maxTickets > 0 && otherShowsCount + currentAssigned + otherGeneral + qty > maxTickets) {
      qty = maxTickets - otherShowsCount - currentAssigned - otherGeneral;
    }

    if (qty <= 0) {
      const { [sectionId]: _removed, ...rest } = cart.generalQuantities;
      void _removed;
      carts = {
        ...carts,
        [activeShowId]: { ...cart, generalQuantities: rest },
      };
    } else {
      carts = {
        ...carts,
        [activeShowId]: {
          ...cart,
          generalQuantities: { ...cart.generalQuantities, [sectionId]: qty },
        },
      };
    }
  }

  function getGeneralQuantity(sectionId: number): number {
    const cart = carts[activeShowId];
    return cart ? (cart.generalQuantities[sectionId] ?? 0) : 0;
  }

  function clearAll() {
    // Preserve the active show's cart (empty) and sections so seat selection continues to work
    const activeCart = carts[activeShowId];
    const activeSections = sectionsMap[activeShowId];
    carts = activeCart
      ? {
          [activeShowId]: {
            ...activeCart,
            selectedSeats: [],
            generalQuantities: {},
          },
        }
      : {};
    sectionsMap = activeSections ? { [activeShowId]: activeSections } : {};
  }

  function clearShow(showId: number) {
    if (showId === activeShowId) {
      // Keep the cart entry but empty it, preserve sections for continued interaction
      const cart = carts[showId];
      if (cart) {
        carts = {
          ...carts,
          [showId]: { ...cart, selectedSeats: [], generalQuantities: {} },
        };
      }
    } else {
      const { [showId]: _removedCart, ...restCarts } = carts;
      void _removedCart;
      carts = restCarts;

      const { [showId]: _removedSections, ...restSections } = sectionsMap;
      void _removedSections;
      sectionsMap = restSections;
    }
  }

  function getSelectedSeatIds(): number[] {
    const cart = carts[activeShowId];
    return cart ? cart.selectedSeats.map((s) => s.id) : [];
  }

  /** Look up a section name by showId + sectionId */
  function getSectionName(showId: number, sectionId: number): string | undefined {
    const section = findSection(showId, sectionId);
    return section?.name;
  }

  /** Remove a specific seat from a specific show's cart (for cross-show removal in summary) */
  function removeSeatFromShow(showId: number, seatId: number) {
    const cart = carts[showId];
    if (!cart) return;
    carts = {
      ...carts,
      [showId]: {
        ...cart,
        selectedSeats: cart.selectedSeats.filter((s) => s.id !== seatId),
      },
    };
  }

  /** Set general admission quantity for a specific show's cart */
  function setGeneralQuantityForShow(showId: number, sectionId: number, qty: number) {
    const cart = carts[showId];
    if (!cart) return;

    if (qty <= 0) {
      const { [sectionId]: _removed, ...rest } = cart.generalQuantities;
      void _removed;
      carts = {
        ...carts,
        [showId]: { ...cart, generalQuantities: rest },
      };
    } else {
      carts = {
        ...carts,
        [showId]: {
          ...cart,
          generalQuantities: { ...cart.generalQuantities, [sectionId]: qty },
        },
      };
    }
  }

  /** Get all carts that have selections */
  function getActiveCarts(): ShowCart[] {
    return allCarts.filter(
      (cart) =>
        cart.selectedSeats.length > 0 || Object.values(cart.generalQuantities).some((q) => q > 0),
    );
  }

  function getSummaryLabels(): string {
    const activeCarts = getActiveCarts();
    const labels: string[] = [];
    for (const cart of activeCarts) {
      const seatLabels = cart.selectedSeats.map((s) => s.label);
      const gaLabels = Object.entries(cart.generalQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([sectionId, qty]) => {
          const section = findSection(cart.showId, Number(sectionId));
          return section ? `${section.name} x${qty}` : `GA x${qty}`;
        });
      const showItems = [...seatLabels, ...gaLabels].join(', ');
      if (showItems) {
        labels.push(activeCarts.length > 1 ? `[${cart.showLabel}] ${showItems}` : showItems);
      }
    }
    return labels.join(' | ');
  }

  return {
    get selectedSeats() {
      return currentCart.selectedSeats;
    },
    get generalQuantities() {
      return currentCart.generalQuantities;
    },
    get totalPrice() {
      return totalPrice;
    },
    get totalCount() {
      return totalCount;
    },
    get currentShowCount() {
      return currentShowCount;
    },
    get activeShowId() {
      return activeShowId;
    },
    get carts() {
      return carts;
    },
    getActiveCarts,
    getActiveSections,
    setSections,
    setActiveShow,
    toggleSeat,
    isSeatSelected,
    setGeneralQuantity,
    getGeneralQuantity,
    clearAll,
    clearShow,
    getSelectedSeatIds,
    getSectionName,
    removeSeatFromShow,
    setGeneralQuantityForShow,
    getSummaryLabels,
  };
}

export type SeatSelectionStore = ReturnType<typeof createSeatSelectionStore>;
