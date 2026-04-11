<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';

  onMount(() => {
    goto(resolve('/admin/events'), { replaceState: true });
  });
</script>

<div class="flex items-center justify-center py-12">
  <p class="text-sm text-muted-foreground">Đang chuyển hướng...</p>
</div>
