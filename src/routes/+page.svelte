<script lang="ts">
	let { data } = $props();
</script>

<main class="p-8 font-sans">
	<h1 class="mb-4 text-2xl font-bold">TixTac Infra Test</h1>

	{#if data.status === 'Connected'}
		<div class="rounded-lg border border-green-200 bg-green-100 p-4 text-green-800">
			<p class="text-lg font-bold">✅ Kết nối Neon thành công!</p>
			<p class="mt-2 text-sm"><b>DB Time:</b> {data.dbTime}</p>
			<p class="mt-1 text-xs opacity-75"><b>Version:</b> {data.version}</p>
		</div>
	{:else}
		<div class="rounded-lg border border-red-200 bg-red-100 p-4 text-red-800">
			<p class="font-bold">❌ Lỗi kết nối Database:</p>
			<p class="text-sm">{data.message}</p>
		</div>
	{/if}
</main>
