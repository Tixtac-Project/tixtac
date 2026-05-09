<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { ModeWatcher } from 'mode-watcher';
  import { onMount } from 'svelte';
  import '../layout.css';

  let { children } = $props();

  let faviconHref = $state('/favicon.svg');

  onMount(() => {
    faviconHref = document.hidden ? '/favicon.svg' : '/favicon-active.svg';

    const handler = () => {
      faviconHref = document.hidden ? '/favicon.svg' : '/favicon-active.svg';
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <link rel="icon" type="image/svg+xml" href={faviconHref} />
</svelte:head>
<ModeWatcher />
<ToastContainer />
{@render children()}
