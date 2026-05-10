<script lang="ts">
  import { Eye, EyeOff } from 'lucide-svelte';

  interface Props {
    name: string;
    value: string;
    autocomplete?: 'current-password' | 'new-password' | 'one-time-code' | 'off';
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    id?: string;
    class?: string;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    onfocus?: () => void;
    onblur?: () => void;
  }

  let {
    name,
    value = $bindable(''),
    autocomplete = 'current-password',
    placeholder = '••••••••',
    disabled = false,
    error = false,
    id = name,
    class: className = '',
    oninput,
    onfocus,
    onblur,
  }: Props = $props();

  let show = $state(false);

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    // Strip whitespace while preserving cursor position
    const input = e.currentTarget;
    const pos = input.selectionStart ?? input.value.length;
    const sanitized = input.value.replace(/\s+/g, '');
    const removed = input.value.length - sanitized.length;
    if (removed > 0) {
      input.value = sanitized;
      input.setSelectionRange(pos - removed, pos - removed);
    }
    value = sanitized;
    oninput?.(e);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === ' ') {
      e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData('text') ?? '';
    if (/\s/.test(pasted)) {
      e.preventDefault();
      const sanitized = pasted.replace(/\s+/g, '');
      const input = e.currentTarget as HTMLInputElement;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const newVal = value.slice(0, start) + sanitized + value.slice(end);
      value = newVal;
      // Restore cursor after the sanitized paste
      setTimeout(
        () => input.setSelectionRange(start + sanitized.length, start + sanitized.length),
        0,
      );
    }
  }
</script>

<div
  class="flex h-10 w-full rounded-md border bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-offset-2 {error
    ? 'border-destructive focus-within:ring-destructive/20'
    : 'border-input focus-within:ring-ring'} {className}"
>
  <input
    {id}
    {name}
    type={show ? 'text' : 'password'}
    bind:value
    {placeholder}
    {disabled}
    {autocomplete}
    inputmode="text"
    class="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
    oninput={handleInput}
    onkeydown={handleKeydown}
    onpaste={handlePaste}
    {onfocus}
    {onblur}
  />
  <button
    type="button"
    class="flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    onclick={() => (show = !show)}
    tabindex={-1}
    aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
    aria-controls={id}
    aria-pressed={show}
    {disabled}
  >
    {#if show}
      <EyeOff class="size-4 shrink-0" />
    {:else}
      <Eye class="size-4 shrink-0" />
    {/if}
  </button>
</div>
