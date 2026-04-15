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

<div class="flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
  {#if IconComponent}
    <IconComponent class="h-4 w-4" />
  {/if}
  <span class="text-xs font-semibold">{label}</span>
</div>
