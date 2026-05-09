<script lang="ts">
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
  <meta name="theme-color" content="#0f3778" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1a174d" media="(prefers-color-scheme: dark)" />
  <meta name="color-scheme" content="light dark" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="robots" content="index, follow" />

  <title>TixTac — Nền tảng sự kiện & bán vé</title>
  <meta
    name="description"
    content="Mua vé sự kiện nhanh chóng. Tổ chức sự kiện dễ dàng. Tất cả trong một nền tảng — TixTac."
  />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TixTac" />
  <meta property="og:url" content="https://tixtac.io.vn/" />
  <meta property="og:title" content="TixTac - Nền tảng sự kiện & bán vé" />
  <meta property="og:description" content="Mua vé sự kiện nhanh chóng. Tổ chức sự kiện dễ dàng." />

  <meta property="og:image" content="https://tixtac.io.vn/og-image.png" />
  <meta property="og:image:alt" content="TixTac - Nền tảng sự kiện & bán vé" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="TixTac - Nền tảng sự kiện & bán vé" />
  <meta name="twitter:description" content="Mua vé sự kiện nhanh chóng. Tổ chức sự kiện dễ dàng." />
  <meta name="twitter:image" content="https://tixtac.io.vn/og-image.png" />

  <link rel="canonical" href="https://tixtac.io.vn/" />

  <!-- Favicon (dynamic: primary color when tab active, muted when inactive) -->
  <link rel="icon" type="image/svg+xml" href={faviconHref} />
</svelte:head>
<ModeWatcher />
<ToastContainer />
{@render children()}
