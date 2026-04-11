<script lang="ts">
  import AdminHeader from '$lib/components/admin/layout/AdminHeader.svelte';
  import AdminSidebar from '$lib/components/admin/layout/AdminSidebar.svelte';

  let { children } = $props();

  let sidebarOpen = $state(false);
</script>

<div class="min-h-screen bg-background">
  <AdminSidebar bind:open={sidebarOpen} />

  <div class="md:pl-60">
    <AdminHeader ontogglesidebar={() => (sidebarOpen = !sidebarOpen)} />

    <main class="p-4 md:p-6">
      {@render children()}
    </main>
  </div>
</div>
