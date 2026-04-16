// src/lib/stores/seat-selection-store.ts
import type { SeatMapSection, SelectedSeat } from '$lib/types/seat-map';

export function createSeatSelectionStore(maxTickets: number) {
  let selectedSeats = $state<SelectedSeat[]>([]);
  let generalQuantities = $state<Record<number, number>>({});

  const totalPrice = $derived(
    selectedSeats.reduce((sum, s) => sum + s.price, 0) +
      Object.entries(generalQuantities).reduce((sum, [sectionId, qty]) => {
        const section = sectionsRef.find((s) => s.id === Number(sectionId));
        return sum + (section ? Number(section.price) * qty : 0);
      }, 0),
  );

  const totalCount = $derived(
    selectedSeats.length + Object.values(generalQuantities).reduce((sum, qty) => sum + qty, 0),
  );

  let sectionsRef: SeatMapSection[] = [];

  function setSections(sections: SeatMapSection[]) {
    sectionsRef = sections;
  }

  function toggleSeat(
    seatId: number,
    label: string,
    sectionId: number,
    sectionName: string,
    price: number,
  ) {
    const idx = selectedSeats.findIndex((s) => s.id === seatId);
    if (idx >= 0) {
      selectedSeats = selectedSeats.filter((s) => s.id !== seatId);
    } else {
      if (maxTickets > 0 && totalCount >= maxTickets) return false;
      selectedSeats = [...selectedSeats, { id: seatId, label, sectionId, sectionName, price }];
    }
    return true;
  }

  function isSeatSelected(seatId: number): boolean {
    return selectedSeats.some((s) => s.id === seatId);
  }

  function setGeneralQuantity(sectionId: number, qty: number) {
    const currentAssigned = selectedSeats.length;
    const otherGeneral = Object.entries(generalQuantities)
      .filter(([id]) => Number(id) !== sectionId)
      .reduce((sum, [, q]) => sum + q, 0);

    if (maxTickets > 0 && currentAssigned + otherGeneral + qty > maxTickets) {
      qty = maxTickets - currentAssigned - otherGeneral;
    }

    if (qty <= 0) {
      const { [sectionId]: _removed, ...rest } = generalQuantities;
      void _removed;
      generalQuantities = rest;
    } else {
      generalQuantities = { ...generalQuantities, [sectionId]: qty };
    }
  }

  function getGeneralQuantity(sectionId: number): number {
    return generalQuantities[sectionId] ?? 0;
  }

  function clearAll() {
    selectedSeats = [];
    generalQuantities = {};
  }

  function getSelectedSeatIds(): number[] {
    return selectedSeats.map((s) => s.id);
  }

  function getSummaryLabels(): string {
    const seatLabels = selectedSeats.map((s) => s.label);
    const gaLabels = Object.entries(generalQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([sectionId, qty]) => {
        const section = sectionsRef.find((s) => s.id === Number(sectionId));
        return section ? `${section.name} x${qty}` : `GA x${qty}`;
      });
    return [...seatLabels, ...gaLabels].join(', ');
  }

  return {
    get selectedSeats() {
      return selectedSeats;
    },
    get generalQuantities() {
      return generalQuantities;
    },
    get totalPrice() {
      return totalPrice;
    },
    get totalCount() {
      return totalCount;
    },
    setSections,
    toggleSeat,
    isSeatSelected,
    setGeneralQuantity,
    getGeneralQuantity,
    clearAll,
    getSelectedSeatIds,
    getSummaryLabels,
  };
}

export type SeatSelectionStore = ReturnType<typeof createSeatSelectionStore>;
