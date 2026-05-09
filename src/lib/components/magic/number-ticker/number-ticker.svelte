<script lang="ts">
  import { cn } from '$lib/utils';
  import { useInView } from 'motion-sv';
  import { onDestroy } from 'svelte';

  interface NumberTickerProps {
    value: number;
    startValue?: number;
    direction?: 'up' | 'down';
    delay?: number;
    decimalPlaces?: number;
    class?: string;
    prefix?: string;
    suffix?: string;
    once?: boolean;
  }

  let {
    value,
    startValue = 0,
    direction = 'up',
    delay = 0,
    decimalPlaces = 0,
    class: className,
    prefix = '',
    suffix = '',
    once = true,
  }: NumberTickerProps = $props();

  let spanRef: HTMLSpanElement | null = $state(null);
  let animatedValue = $state(0);
  let activeRafId: number | null = null;

  // Spring configuration
  const damping = 60;
  const stiffness = 100;

  function formatValue(val: number): string {
    return `${prefix}${Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(val.toFixed(decimalPlaces)))}${suffix}`;
  }

  // Spring physics simulation
  function animateValue(from: number, to: number) {
    if (activeRafId !== null) {
      cancelAnimationFrame(activeRafId);
    }

    const startTime = performance.now();
    const duration = 2000; // Duration in ms

    let velocity = 0;
    let position = from;
    const target = to;

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const dt = 16.67 / 1000; // ~60fps in seconds

      // Spring physics
      const springForce = -stiffness * (position - target);
      const dampingForce = -damping * velocity;
      const acceleration = springForce + dampingForce;

      velocity += acceleration * dt;
      position += velocity * dt;

      // Update animated value
      animatedValue = position;

      // Continue animation if not settled
      const isSettled = Math.abs(velocity) < 0.01 && Math.abs(position - target) < 0.01;
      if (!isSettled && elapsed < duration * 2) {
        activeRafId = requestAnimationFrame(step);
      } else {
        // Ensure final value is exact
        animatedValue = target;
        activeRafId = null;
      }
    }

    activeRafId = requestAnimationFrame(step);
  }

  const view = useInView(
    () => spanRef!,
    () =>
      ({
        once: once,
        margin: '0px',
      }) as any,
  );
  $effect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (view.current) {
      timer = setTimeout(() => {
        animateValue(
          direction === 'down' ? value : startValue,
          direction === 'down' ? startValue : value,
        );
      }, delay);
    }
    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      if (activeRafId !== null) {
        cancelAnimationFrame(activeRafId);
        activeRafId = null;
      }
    };
  });

  onDestroy(() => {
    if (activeRafId !== null) {
      cancelAnimationFrame(activeRafId);
    }
  });
</script>

<span
  bind:this={spanRef}
  class={cn('inline-block tracking-wider text-black tabular-nums dark:text-white', className)}
>
  {formatValue(animatedValue)}
</span>
