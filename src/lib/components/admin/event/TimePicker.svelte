<script lang="ts">
  import * as Select from '$lib/components/ui/select';
  import { HOUR_OPTIONS, MINUTE_OPTIONS } from '$lib/utils/datetime';

  let {
    hour = $bindable(),
    minute = $bindable(),
    period = $bindable(),
    label = '',
  }: {
    hour: string;
    minute: string;
    period: 'AM' | 'PM';
    label?: string;
  } = $props();
</script>

<div class="flex w-full items-center gap-2 md:w-auto">
  {#if label}
    <span class="text-xs text-muted-foreground">{label}</span>
  {/if}
  <div class="flex flex-1 items-center gap-2 md:flex-initial">
    <Select.Root type="single" bind:value={hour}>
      <Select.Trigger class="w-full md:w-18">
        {String(hour).padStart(2, '0')}
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Giờ</Select.Label>
          {#each HOUR_OPTIONS as opt (opt.value)}
            <Select.Item value={opt.value}>{opt.label}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>
    <span class="text-sm font-bold text-muted-foreground">:</span>
    <Select.Root type="single" bind:value={minute}>
      <Select.Trigger class="w-full md:w-18">
        {String(minute).padStart(2, '0')}
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>Phút</Select.Label>
          {#each MINUTE_OPTIONS as opt (opt.value)}
            <Select.Item value={opt.value}>{opt.label}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  </div>
  <Select.Root type="single" bind:value={period}>
    <Select.Trigger class="flex-1 md:w-18 md:flex-initial">
      {period}
    </Select.Trigger>
    <Select.Content>
      <Select.Group>
        <Select.Label>Buổi</Select.Label>
        <Select.Item value="AM">AM</Select.Item>
        <Select.Item value="PM">PM</Select.Item>
      </Select.Group>
    </Select.Content>
  </Select.Root>
</div>
