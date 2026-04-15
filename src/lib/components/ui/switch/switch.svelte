<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
  import { Switch as SwitchPrimitive } from 'bits-ui';

  let {
    ref = $bindable(null),
    class: className,
    checked = $bindable(false),
    size = 'default',
    ...restProps
  }: WithoutChildrenOrChild<SwitchPrimitive.RootProps> & {
    size?: 'sm' | 'default' | 'lg';
  } = $props();
</script>

<SwitchPrimitive.Root
  bind:ref
  bind:checked
  data-slot="switch"
  data-size={size}
  class={cn(
    'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent p-0.5 transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50',
    'data-[size=default]:h-6 data-[size=default]:w-11 data-[size=lg]:h-7 data-[size=lg]:w-14 data-[size=sm]:h-5 data-[size=sm]:w-9',
    className,
  )}
  {...restProps}
>
  <SwitchPrimitive.Thumb
    data-slot="switch-thumb"
    class="pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=lg]/switch:size-6 group-data-[size=sm]/switch:size-4 rtl:data-[state=checked]:-translate-x-4 group-data-[size=default]/switch:data-checked:translate-x-5 group-data-[size=lg]/switch:data-checked:translate-x-7 group-data-[size=sm]/switch:data-checked:translate-x-4 dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=lg]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
  />
</SwitchPrimitive.Root>
