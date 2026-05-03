<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { ModeWatcher } from 'mode-watcher';
  import '../layout.css';

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<ToastContainer />
{@render children()}
