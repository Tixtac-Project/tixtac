<script lang="ts">
  import { resolve } from '$app/paths';
  let { data } = $props();
</script>

<div class="flex flex-col items-center justify-center gap-4">
  <h1 class="text-2xl font-bold">Welcome to Tixtac!</h1>
  <p class="text-gray-600">Your one-stop solution for ticket management.</p>
  <div class="flex gap-4">
    <a
      href={resolve('/login')}
      class="rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
    >
      Login
    </a>
    <a
      href={resolve('/register')}
      class="rounded bg-green-500 px-4 py-2 text-white transition hover:bg-green-600"
    >
      Register
    </a>
  </div>
</div>
