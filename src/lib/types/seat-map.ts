// src/lib/types/seat-map.ts

export interface SeatLayoutConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
}

export interface SeatSectionConfig {
  rows: number;
  cols: number;
  prefix: string | null;
  rowFormat: 'alphabetic' | 'numeric';
  colDirection: 'ltr' | 'rtl';
  startRowIndex: number;
  startColIndex: number;
}

export interface SeatMapSeat {
  id: number;
  prefix: string;
  row_label: string;
  col_number: number;
  status: 'available' | 'locked' | 'sold' | 'disabled';
}

export interface SeatMapSection {
  id: number;
  name: string;
  type: 'assigned' | 'general';
  capacity: number;
  price: string;
  sort_order: number;
  layout_config: SeatLayoutConfig;
  seat_config: SeatSectionConfig;
  sales_start_at: string | null;
  sales_end_at: string | null;
  seats: SeatMapSeat[];
}

export interface SeatMapData {
  show_id: number;
  sections: SeatMapSection[];
}

export interface SelectedSeat {
  id: number;
  label: string;
  sectionId: number;
  sectionName: string;
  price: number;
}

export interface StageElement {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface MapConfig {
  width: number;
  height: number;
  gridSize?: number;
  snapToGrid?: boolean;
}
