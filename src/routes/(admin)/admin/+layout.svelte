<script lang="ts">
  import AdminHeader from '$lib/components/admin/layout/AdminHeader.svelte';
  import AdminSidebar from '$lib/components/admin/layout/AdminSidebar.svelte';

  let { children } = $props();

  let sidebarOpen = $state(false);
</script>

<div class="min-h-screen bg-background">
  <AdminSidebar bind:open={sidebarOpen} />

  <div class="md:pl-64">
    <AdminHeader ontogglesidebar={() => (sidebarOpen = !sidebarOpen)} />

    <main class="mx-auto p-5 md:p-8">
      {@render children()}
    </main>
  </div>
</div>
