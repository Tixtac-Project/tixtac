<script lang="ts">
  import { Separator } from '$lib/components/ui/separator';
  import { AlertCircle, ChevronLeft, CreditCard, Scale, ShieldCheck, Ticket } from 'lucide-svelte';

  const lastUpdated = '23 tháng 04, 2026';
</script>

<div class="container mx-auto max-w-4xl px-4 py-10 md:py-16">
  <!-- Header -->
  <div class="arch-enter mb-12 text-center">
    <div
      class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
    >
      <Scale class="h-8 w-8" />
    </div>
    <h1 class="font-heading text-4xl font-black tracking-tight md:text-5xl">Điều khoản sử dụng</h1>
    <p class="mt-4 text-muted-foreground">Cập nhật lần cuối: {lastUpdated}</p>
  </div>

  <div class="arch-card arch-enter space-y-12 p-8 md:p-12">
    <!-- Section 1 -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <ShieldCheck class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">1. Quy định chung</h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Chào mừng bạn đến với <strong>Tixtac</strong>
          . Bằng cách truy cập và sử dụng nền tảng của chúng tôi, bạn đồng ý tuân thủ các điều khoản và
          điều kiện được nêu dưới đây.
        </p>
        <p>
          Tixtac là nền tảng trung gian kết nối giữa Ban tổ chức sự kiện (BTC) và Người mua vé.
          Chúng tôi cung cấp công cụ để BTC đăng tải, quản lý và bán vé, đồng thời hỗ trợ Người mua
          tìm kiếm và thanh toán vé một cách thuận tiện.
        </p>
      </div>
    </section>

    <Separator />

    <!-- Section 2 -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <Ticket class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">
          2. Quy trình đặt vé và Giữ chỗ
        </h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <ul class="list-disc space-y-3 pl-5">
          <li>
            <strong>Thời gian giữ chỗ:</strong>
            Khi bạn chọn ghế và tiến hành thanh toán, hệ thống sẽ giữ chỗ (lock) cho bạn trong vòng
            <strong>10 phút</strong>
            . Nếu quá thời gian này mà thanh toán chưa hoàn tất, vé sẽ tự động được giải phóng.
          </li>
          <li>
            <strong>Giới hạn số lượng:</strong>
            Mỗi sự kiện có thể có quy định về số lượng vé tối đa mà một tài khoản được phép mua. Tixtac
            có quyền hủy các đơn hàng cố tình lách luật để đầu cơ vé.
          </li>
          <li>
            <strong>Thông tin vé:</strong>
            Sau khi thanh toán thành công, vé điện tử (E-ticket) kèm QR Code sẽ được gửi vào mục "Vé của
            tôi". Bạn có trách nhiệm bảo mật mã QR này.
          </li>
        </ul>
      </div>
    </section>

    <Separator />

    <!-- Section 3 -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <CreditCard class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">3. Thanh toán và Hoàn tiền</h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Hiện tại, Tixtac hỗ trợ thanh toán qua <strong>Số dư tài khoản (Ví Tixtac)</strong>
          . Người dùng cần nạp tiền vào ví trước khi tiến hành mua vé.
        </p>
        <div class="rounded-2xl border border-destructive/10 bg-destructive/5 p-4">
          <p class="flex items-center gap-2 font-medium text-destructive">
            <AlertCircle class="h-4 w-4" />
            Chính sách "Không hoàn tiền"
          </p>
          <p class="mt-2 text-sm">
            Tất cả các giao dịch mua vé trên Tixtac là <strong>
              không thể hoàn trả hoặc thay đổi
            </strong>
            trừ trường hợp sự kiện bị hủy bỏ bởi Ban tổ chức. Trong trường hợp sự kiện bị hủy, Tixtac
            sẽ phối hợp với BTC để thực hiện quy trình hoàn tiền theo quy định của từng sự kiện.
          </p>
        </div>
      </div>
    </section>

    <Separator />

    <!-- Section 4 -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <Scale class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">4. Trách nhiệm và Miễn trừ</h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Tixtac không chịu trách nhiệm về nội dung, chất lượng, sự thay đổi thời gian hoặc quy mô
          của sự kiện. Mọi khiếu nại liên quan đến trải nghiệm tại sự kiện cần được gửi trực tiếp
          đến Ban tổ chức được ghi trên thông tin sự kiện.
        </p>
        <p>
          Chúng tôi có quyền tạm dừng hoặc chấm dứt tài khoản nếu phát hiện các hành vi gian lận,
          tấn công hệ thống hoặc vi phạm pháp luật Việt Nam.
        </p>
      </div>
    </section>
  </div>

  <!-- Footer Action -->
  <div class="mt-12 text-center">
    <button
      class="mx-auto flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
      onclick={() => history.back()}
    >
      <ChevronLeft class="h-4 w-4" />
      Quay lại trang trước
    </button>
  </div>
</div>
