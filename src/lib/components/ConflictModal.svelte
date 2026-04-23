<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import { AlertCircle } from 'lucide-svelte';

  interface Props {
    open: boolean;
    conflicts: {
      label: string;
      showName: string;
      type: 'seat' | 'section';
    }[];
    onConfirm: () => void;
    onClose: () => void;
  }

  let { open, conflicts, onConfirm, onClose }: Props = $props();
</script>

<AlertDialog.Root {open} onOpenChange={(v) => !v && onClose()}>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <div class="mb-2 flex items-center gap-2 text-destructive">
        <AlertCircle class="h-5 w-5" />
        <AlertDialog.Title>Vé đã bị đặt mất</AlertDialog.Title>
      </div>
      <AlertDialog.Description>
        Một số vé trong giỏ hàng đã bị người khác đặt trước hoặc không còn khả dụng. Danh sách các
        vé đó như sau:
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="my-4 max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/50 p-3">
      <ul class="space-y-2">
        {#each conflicts as conflict, i (`${conflict.type}-${conflict.showName}-${conflict.label}-${i}`)}
          <li class="text-sm font-medium text-foreground">
            • <span class="text-primary">{conflict.label}</span>
            <span class="text-muted-foreground">tại</span>
            <span class="font-semibold">{conflict.showName}</span>
          </li>
        {/each}
      </ul>
    </div>

    <p class="mb-4 text-sm text-muted-foreground">
      Tiếp tục đặt hàng với các vé còn lại trong giỏ?
    </p>

    <AlertDialog.Footer>
      <Button variant="ghost" onclick={onClose}>Hủy</Button>
      <Button variant="default" onclick={onConfirm}>Tiếp tục</Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
