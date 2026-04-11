<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<a href={resolve('/')} class="navbar-logo">
  <span class="logo-icon">🎫</span>
  <span class="logo-text">TixTac</span>
</a>

<style>
  .navbar-logo {
    font-weight: 800;
    font-size: 1.2rem;
    display: flex;
    gap: 6px;
    align-items: center;
  }
</style>
