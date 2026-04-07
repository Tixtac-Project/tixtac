<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import './layout.css';

  let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ToastContainer />
{@render children()}
