<script lang="ts">
  import type { SeatMapSeat } from '$lib/types/seat-map';

  interface Props {
    seat: SeatMapSeat;
    selected: boolean;
    sectionColor: string;
    size?: number;
    onclick: () => void;
  }

  let { seat, selected, sectionColor, size = 28, onclick }: Props = $props();

  let isInteractive = $derived(seat.status === 'available');
  let isHidden = $derived(seat.status === 'disabled');

  let colorClass = $derived.by(() => {
    if (selected) return 'seat-selected';
    switch (seat.status) {
      case 'available':
        return 'seat-available';
      case 'locked':
        return 'seat-locked';
      case 'sold':
        return 'seat-sold';
      default:
        return '';
    }
  });

  let title = $derived.by(() => {
    const label = seat.prefix
      ? `${seat.prefix}-${seat.row_label}${seat.col_number}`
      : `${seat.row_label}${seat.col_number}`;
    switch (seat.status) {
      case 'available':
        return selected ? `${label} (Đang chọn)` : `${label} (Trống)`;
      case 'locked':
        return `${label} (Đang giữ)`;
      case 'sold':
        return `${label} (Đã bán)`;
      default:
        return label;
    }
  });

  let sizeStyle = $derived(
    `width:${size}px;height:${size}px;border-radius:${Math.max(3, size * 0.2)}px;`,
  );
</script>

{#if !isHidden}
  <button
    type="button"
    class="seat-item {colorClass}"
    class:cursor-pointer={isInteractive}
    class:cursor-not-allowed={!isInteractive}
    disabled={!isInteractive}
    {title}
    onclick={isInteractive ? onclick : undefined}
    style="{sizeStyle}{selected ? `--seat-color:${sectionColor};` : ''}"
  ></button>
{:else}
  <div class="seat-item seat-hidden" style={sizeStyle}></div>
{/if}

<style>
  .seat-item {
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    flex-shrink: 0;
  }

  .seat-available {
    background-color: var(--success);
    opacity: 0.85;
  }
  .seat-available:hover {
    opacity: 1;
    transform: scale(1.15);
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
  }

  .seat-selected {
    background-color: var(--seat-color, var(--warning));
    opacity: 1;
    transform: scale(1.1);
    box-shadow: 0 2px 10px rgba(202, 138, 4, 0.4);
  }

  .seat-locked {
    background-color: var(--danger);
    opacity: 0.7;
  }

  .seat-sold {
    background-color: var(--neutral);
    opacity: 0.5;
  }

  .seat-hidden {
    visibility: hidden;
  }
</style>
