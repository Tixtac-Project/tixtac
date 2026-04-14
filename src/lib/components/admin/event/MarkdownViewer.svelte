<script lang="ts">
  import DOMPurify from 'isomorphic-dompurify';
  import { MarkdownParser } from 'overtype/parser';

  let {
    content = '',
    class: className = '',
  }: {
    content: string;
    class?: string;
  } = $props();

  /**
   * MarkdownParser.parse() produces HTML with <span class="syntax-marker">...</span>
   * elements that display raw markdown chars (##, -, **, etc.).
   * We strip those to get clean rendered HTML for the viewer.
   */
  function cleanMarkdown(raw: string): string {
    const parsed = MarkdownParser.parse(raw);
    // Remove syntax-marker spans (e.g. <span class="syntax-marker">## </span>)
    const cleaned = parsed.replace(
      /<span[^>]*class="[^"]*syntax-marker[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
      '',
    );
    return DOMPurify.sanitize(cleaned);
  }

  const html = $derived(content ? cleanMarkdown(content) : '');
</script>

{#if html}
  <div class="md-viewer prose prose-sm max-w-none dark:prose-invert {className}">
    {@html html}
  </div>
{/if}

<style>
  .md-viewer :global(h1) {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0.5rem 0 0.25rem;
  }
  .md-viewer :global(h2) {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0.4rem 0 0.2rem;
  }
  .md-viewer :global(h3) {
    font-size: 1rem;
    font-weight: 600;
    margin: 0.3rem 0 0.15rem;
  }
  .md-viewer :global(p) {
    margin-bottom: 0.4rem;
  }
  .md-viewer :global(ul),
  .md-viewer :global(ol) {
    padding-left: 1.25rem;
    margin-bottom: 0.4rem;
  }
  .md-viewer :global(ul) {
    list-style-type: disc;
  }
  .md-viewer :global(ol) {
    list-style-type: decimal;
  }
  .md-viewer :global(blockquote) {
    border-left: 3px solid var(--primary);
    padding-left: 0.75rem;
    margin: 0.4rem 0;
    color: var(--muted-foreground);
  }
  .md-viewer :global(code) {
    background: var(--muted);
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
  }
  .md-viewer :global(pre) {
    background: var(--muted);
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
  }
  .md-viewer :global(pre code) {
    background: none;
    padding: 0;
  }
  .md-viewer :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }
  .md-viewer :global(strong) {
    font-weight: 600;
  }
</style>
