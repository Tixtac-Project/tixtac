<script lang="ts">
  import { cn } from '$lib/utils';
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';
  import { toggleMode } from 'mode-watcher';

  interface Props {
    class?: string;
    duration?: number;
  }

  let { class: className = '', duration = 400 }: Props = $props();

  let buttonRef: HTMLButtonElement | null = $state(null);
  let isDark = $state(false);

  // Sync with mode-watcher — it owns the `dark` class and localStorage key
  $effect(() => {
    const check = () => {
      isDark = document.documentElement.classList.contains('dark');
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  });

  async function toggle(e: MouseEvent) {
    if (!buttonRef) return;

    if (!document.startViewTransition) {
      toggleMode();
      return;
    }

    await document.startViewTransition(() => {
      toggleMode();
    }).ready;

    const { top, left, width, height } = buttonRef.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top),
    );

    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
      },
      {
        duration,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  }

  function handleClick(e: MouseEvent) {
    toggle(e);
  }
</script>

<button bind:this={buttonRef} onclick={handleClick} class={cn(className)}>
  {#if isDark}
    <Sun />
  {:else}
    <Moon />
  {/if}
  <span class="sr-only">Toggle theme</span>
</button>
