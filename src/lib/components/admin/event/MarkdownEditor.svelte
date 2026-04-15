<script lang="ts">
  import OverType from 'overtype';
  import { onMount } from 'svelte';
  import MarkdownViewer from './MarkdownViewer.svelte';

  let {
    value = $bindable(''),
    placeholder = '',
    id = '',
    rows = 5,
  }: {
    value: string;
    placeholder?: string;
    id?: string;
    rows?: number;
  } = $props();

  let containerEl: HTMLDivElement;
  let editor: ReturnType<typeof OverType.prototype> | null = null;
  let mode = $state<'write' | 'preview'>('write');

  let minHeight = $derived(`${rows * 1.5}em`);

  onMount(() => {
    const [instance] = new OverType(containerEl, {
      value,
      placeholder,
      toolbar: true,
      fontSize: '13px',
      lineHeight: 1.5,
      padding: '8px 12px',
      spellcheck: false,
      autoResize: true,
      minHeight,
      textareaProps: id ? { id } : {},
      onChange: (newVal: string) => {
        value = newVal;
      },
    });
    editor = instance;

    return () => {
      editor?.destroy();
      editor = null;
    };
  });

  // Sync external value changes (e.g. form reset) into the editor
  $effect(() => {
    if (editor && value !== editor.getValue()) {
      editor.setValue(value);
    }
  });
</script>

<div class="overtype-wrap">
  <!-- Tab bar -->
  <div class="tab-bar">
    <button
      type="button"
      class="tab-btn"
      class:active={mode === 'write'}
      onclick={() => (mode = 'write')}
    >
      Viết
    </button>
    <button
      type="button"
      class="tab-btn"
      class:active={mode === 'preview'}
      onclick={() => (mode = 'preview')}
    >
      Xem trước
    </button>
  </div>

  <!-- Editor -->
  <div class="editor-area" class:hidden={mode === 'preview'}>
    <div bind:this={containerEl}></div>
  </div>

  <!-- Preview -->
  {#if mode === 'preview'}
    <div class="preview-area" style:min-height={minHeight}>
      {#if value.trim()}
        <MarkdownViewer content={value} />
      {:else}
        <p class="preview-empty">{placeholder || 'Chưa có nội dung...'}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .overtype-wrap {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    border: 1px solid var(--input);
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--background);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }

  .overtype-wrap:focus-within {
    border-color: var(--ring);
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--ring), transparent 75%);
  }

  /* Tab bar */
  .tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--input);
    background: var(--muted);
  }

  .tab-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--muted-foreground);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-btn:hover {
    color: var(--foreground);
    background: var(--accent);
  }

  .tab-btn.active {
    color: var(--foreground);
    border-bottom-color: var(--primary);
  }

  /* Editor area */
  .editor-area {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .hidden {
    display: none;
  }

  /* Preview area */
  .preview-area {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--foreground);
    overflow-y: auto;
  }

  .preview-empty {
    color: var(--muted-foreground);
    opacity: 0.5;
    font-style: italic;
  }

  /* Force OverType internals to respect container width */
  .overtype-wrap :global(.overtype-container),
  .overtype-wrap :global(.overtype-editor),
  .overtype-wrap :global([class*='overtype']) {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .overtype-wrap :global(textarea) {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .overtype-wrap :global(.overtype-toolbar) {
    z-index: 1 !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    flex-wrap: wrap !important;
  }

  /* Scale down toolbar buttons on mobile */
  @media (max-width: 640px) {
    .overtype-wrap :global(.overtype-toolbar) {
      gap: 2px !important;
      padding: 4px !important;
    }

    .overtype-wrap :global(.overtype-toolbar button),
    .overtype-wrap :global(.overtype-toolbar .ot-btn) {
      transform: scale(0.8);
      transform-origin: center;
      padding: 2px 4px !important;
      min-width: unset !important;
    }
  }
</style>
