<script lang="ts">
	let { data } = $props();
</script>

<div class="space-y-4 p-8">
	<h1 class="text-2xl font-bold">TixTac Infrastructure Status</h1>

	<div
		class="rounded-md border p-4 {data.dbStatus.ok
			? 'border-green-200 bg-green-50'
			: 'border-red-200 bg-red-50'}"
	>
		<p class="font-semibold">
			PostgreSQL (Neon): {data.dbStatus.ok ? '✅ Connected' : '❌ Failed'}
		</p>
		{#if data.dbStatus.ok}
			<p class="text-sm text-green-700 opacity-70">DB Time: {data.dbStatus.time}</p>
		{/if}
	</div>

	<div
		class="rounded-md border p-4 {data.mqStatus.ok
			? 'border-blue-200 bg-blue-50'
			: 'border-red-200 bg-red-50'}"
	>
		<p class="font-semibold">
			Message Queue (CloudAMQP): {data.mqStatus.ok ? '✅ Message Published' : '❌ Failed'}
		</p>
		{#if !data.mqStatus.ok}
			<p class="text-sm text-red-700">{data.mqStatus.error}</p>
		{/if}
	</div>
</div>
