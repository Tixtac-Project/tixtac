<script lang="ts">
  import {
    Accessibility,
    BatteryCharging,
    Bus,
    Cigarette,
    Coffee,
    Cross,
    Handshake,
    Landmark,
    ShieldCheck,
    SquareParking,
    Tent,
    UtensilsCrossed,
    Wifi,
    Wine,
    type Icon,
  } from 'lucide-svelte';

  interface Props {
    amenity: string;
  }

  let { amenity }: Props = $props();

  const AMENITY_MAP: Record<string, { label: string; icon: typeof Icon }> = {
    parking: { label: 'Bãi đỗ xe', icon: SquareParking },
    wifi: { label: 'Wi-Fi', icon: Wifi },
    food_court: { label: 'Khu ẩm thực', icon: UtensilsCrossed },
    atm: { label: 'ATM', icon: Landmark },
    first_aid: { label: 'Sơ cứu', icon: Cross },
    bar: { label: 'Quầy bar', icon: Wine },
    cloakroom: { label: 'Gửi đồ', icon: ShieldCheck },
    smoking_area: { label: 'Khu hút thuốc', icon: Cigarette },
    wheelchair: { label: 'Xe lăn', icon: Accessibility },
    camping: { label: 'Cắm trại', icon: Tent },
    shuttle: { label: 'Xe đưa đón', icon: Bus },
    coffee: { label: 'Cà phê', icon: Coffee },
    cafe: { label: 'Cà phê', icon: Coffee },
    networking_lounge: { label: 'Khu giao lưu', icon: Handshake },
    charging_station: { label: 'Sạc điện', icon: BatteryCharging },
  };

  let mapped = $derived(AMENITY_MAP[amenity]);
  let label = $derived(mapped?.label ?? amenity);
  let IconComponent = $derived(mapped?.icon);
</script>

<div
  class="flex items-center gap-1.5 rounded-full bg-surface-container-highest px-2.5 py-1 md:px-3 md:py-1.5"
>
  {#if IconComponent}
    <IconComponent class="h-3 w-3 md:h-3.5 md:w-3.5" />
  {/if}
  <span class="text-[10px] font-semibold md:text-[11px]">{label}</span>
</div>
