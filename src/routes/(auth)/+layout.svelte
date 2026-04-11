<script lang="ts">
  import { onNavigate } from '$app/navigation';

  let { children } = $props();

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

{@render children()}

<style>
  :global(::view-transition-old(auth-card)),
  :global(::view-transition-new(auth-card)) {
    animation-duration: 0.35s;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(::view-transition-group(auth-card)) {
    animation-duration: 0.35s;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
