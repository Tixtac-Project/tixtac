<script lang="ts">
  import { Separator } from '$lib/components/ui/separator';
  import { ChevronLeft, Eye, Lock, Scale, Server, Shield, UserCheck } from 'lucide-svelte';

  const lastUpdated = 'Tháng 5, 2026';
</script>

<svelte:head>
  <title>Chính sách bảo mật dữ liệu cá nhân - TixTac</title>
  <meta
    name="description"
    content="Chính sách bảo vệ dữ liệu cá nhân của TixTac. Tuân thủ Nghị định 13/2023/NĐ-CP và các tiêu chuẩn bảo mật quốc tế."
  />
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-10 md:py-16">
  <!-- Header -->
  <div class="arch-enter mb-12 text-center">
    <div
      class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
    >
      <Shield class="h-8 w-8" />
    </div>
    <h1 class="font-heading text-4xl font-black tracking-tight md:text-5xl">
      Chính sách bảo vệ dữ liệu cá nhân
    </h1>
    <p class="mt-4 text-muted-foreground">Cập nhật lần cuối: {lastUpdated}</p>
  </div>

  <!-- TL;DR -->
  <div class="arch-enter mb-8 rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8">
    <h2 class="flex items-center gap-2 text-lg font-bold text-primary">
      <Eye class="h-5 w-5" /> Tóm tắt dành cho bạn (TL;DR)
    </h2>
    <p class="mt-3 text-sm leading-relaxed text-foreground/80">
      Tại TixTac, chúng tôi coi trọng dữ liệu của bạn như chính vé sự kiện của bạn.
    </p>
    <ul class="mt-4 grid gap-3 text-sm sm:grid-cols-2 md:gap-4">
      <li class="flex items-start gap-2">
        <span
          class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary"
        >
          ✓
        </span>
        <span class="text-foreground/80">
          Chúng tôi <strong>không bao giờ bán</strong>
          dữ liệu của bạn cho bên thứ ba.
        </span>
      </li>
      <li class="flex items-start gap-2">
        <span
          class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary"
        >
          ✓
        </span>
        <span class="text-foreground/80">
          Chỉ chia sẻ thông tin cần thiết với <strong>Ban tổ chức</strong>
          để kiểm soát vé.
        </span>
      </li>
      <li class="flex items-start gap-2">
        <span
          class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary"
        >
          ✓
        </span>
        <span class="text-foreground/80">
          Thanh toán được xử lý bởi đối tác đạt chuẩn <strong>PCI-DSS</strong>
          , TixTac không lưu số thẻ của bạn.
        </span>
      </li>
      <li class="flex items-start gap-2">
        <span
          class="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary"
        >
          ✓
        </span>
        <span class="text-foreground/80">
          Bạn có toàn quyền <strong>tải xuống hoặc xóa</strong>
          tài khoản bất kỳ lúc nào.
        </span>
      </li>
    </ul>
  </div>

  <!-- Main Legal Content -->
  <div class="arch-card arch-enter space-y-12 p-8 md:p-12">
    <!-- 1. Cơ sở pháp lý -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <Scale class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">
          1. Cơ sở pháp lý & Phạm vi áp dụng
        </h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Chính sách này được lập ra nhằm tuân thủ <strong>Nghị định 13/2023/NĐ-CP</strong>
          của Chính phủ Việt Nam về Bảo vệ Dữ liệu Cá nhân và tham chiếu tiêu chuẩn quốc tế (GDPR).
        </p>
        <p>
          Trong văn bản này, TixTac đóng vai trò là <strong>
            Bên Kiểm soát và Xử lý dữ liệu cá nhân
          </strong>
          . Khi bạn (Chủ thể dữ liệu) đăng ký tài khoản và mua vé, bạn xác nhận đã đọc, hiểu và đồng ý
          với các điều khoản dưới đây.
        </p>
      </div>
    </section>

    <Separator />

    <!-- 2. Dữ liệu thu thập -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <Server class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">
          2. Phân loại dữ liệu chúng tôi thu thập
        </h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <div>
          <h3 class="font-bold text-foreground">2.1. Dữ liệu cá nhân cơ bản:</h3>
          <ul class="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Thông tin định danh:</strong>
              Họ tên, ngày sinh, giới tính (phục vụ xác thực độ tuổi cho các sự kiện có giới hạn).
            </li>
            <li>
              <strong>Thông tin liên lạc:</strong>
              Email, số điện thoại (để gửi vé QR, mã OTP, và thông báo khẩn cấp về sự kiện).
            </li>
          </ul>
        </div>
        <div>
          <h3 class="font-bold text-foreground">2.2. Dữ liệu cá nhân nhạy cảm:</h3>
          <ul class="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Dữ liệu thanh toán:</strong>
              Lịch sử giao dịch, một phần số thẻ/tài khoản (được mã hóa). TixTac
              <em>không</em>
              trực tiếp lưu trữ số thẻ tín dụng/CVV đầy đủ của bạn.
            </li>
            <li>
              <strong>Dữ liệu vị trí (Tùy chọn):</strong>
              Vị trí tương đối để gợi ý các sự kiện đang diễn ra gần bạn (chỉ khi bạn cấp quyền).
            </li>
          </ul>
        </div>
      </div>
    </section>

    <Separator />

    <!-- 3. Mục đích xử lý -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <Lock class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">
          3. Mục đích xử lý & Chia sẻ dữ liệu
        </h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <p>Chúng tôi chỉ xử lý dữ liệu của bạn trong giới hạn cần thiết để:</p>
        <ul class="list-disc space-y-2 pl-5">
          <li>Thiết lập hợp đồng cung cấp dịch vụ (phát hành vé, giữ chỗ).</li>
          <li>Giải quyết khiếu nại, hỗ trợ hoàn vé/đổi vé.</li>
          <li>
            Tuân thủ nghĩa vụ lưu trữ chứng từ kế toán, thuế theo quy định của pháp luật Việt Nam.
          </li>
        </ul>

        <div class="rounded-2xl border border-border bg-surface-container-low p-4">
          <h4 class="mb-2 font-bold text-foreground">Bên thứ ba có thể tiếp cận dữ liệu:</h4>
          <ol class="list-decimal space-y-1 pl-5">
            <li>
              <strong>Ban tổ chức sự kiện (Organizer):</strong>
              Nhận danh sách khách hàng (Tên, Email/SĐT đã mã hóa một phần) để phục vụ việc check-in và
              gửi quà tặng (nếu có).
            </li>
            <li>
              <strong>Cổng thanh toán:</strong>
              VNPay, MoMo, ZaloPay để đối soát giao dịch.
            </li>
            <li>
              <strong>Cơ quan nhà nước:</strong>
              Khi có yêu cầu hợp pháp bằng văn bản.
            </li>
          </ol>
        </div>
      </div>
    </section>

    <Separator />

    <!-- 4. Quyền của người dùng -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <UserCheck class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">
          4. Quyền của Chủ thể dữ liệu
        </h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Theo Điều 9, Nghị định 13/2023/NĐ-CP, bạn có 11 quyền đối với dữ liệu của mình. Tại
          TixTac, chúng tôi cung cấp công cụ để bạn thực thi các quyền cơ bản nhất:
        </p>
        <ul class="space-y-3">
          <li class="flex items-start gap-3">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-xs font-bold text-foreground"
            >
              1
            </span>
            <div>
              <strong class="text-foreground">Quyền Truy cập & Chỉnh sửa:</strong>
              Bạn có thể xem và sửa đổi thông tin cá nhân trong mục "Tài khoản của tôi".
            </div>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-xs font-bold text-foreground"
            >
              2
            </span>
            <div>
              <strong class="text-foreground">Quyền Xóa dữ liệu (Right to be forgotten):</strong>
              Yêu cầu xóa vĩnh viễn tài khoản và lịch sử giao dịch.
              <em>
                Lưu ý: Chúng tôi có thể phải giữ lại một số hóa đơn tài chính trong thời gian luật
                định.
              </em>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-xs font-bold text-foreground"
            >
              3
            </span>
            <div>
              <strong class="text-foreground">Quyền Rút lại sự đồng ý:</strong>
              Hủy đăng ký nhận email marketing (Unsubscribe) chỉ với một click ở cuối email.
            </div>
          </li>
        </ul>
      </div>
    </section>

    <Separator />

    <!-- 5. Liên hệ -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-primary">
        <Shield class="h-6 w-6" />
        <h2 class="font-heading text-2xl font-bold text-foreground">
          5. Thông tin liên hệ & Khiếu nại
        </h2>
      </div>
      <div class="space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Mọi thắc mắc, yêu cầu thực thi quyền hoặc báo cáo vi phạm liên quan đến dữ liệu cá nhân,
          vui lòng liên hệ Bộ phận Bảo vệ Dữ liệu (DPO) của TixTac:
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-xl border border-border bg-surface-container-low p-4">
            <span class="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Qua Email
            </span>
            <a
              href="mailto:privacy@tixtac.io.vn"
              class="mt-1 block text-lg font-bold text-primary hover:underline"
            >
              privacy@tixtac.io.vn
            </a>
            <span class="mt-2 block text-xs text-muted-foreground">
              Cam kết phản hồi trong 48 giờ làm việc.
            </span>
          </div>
          <div class="rounded-xl border border-border bg-surface-container-low p-4">
            <span class="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Trụ sở chính
            </span>
            <address class="mt-1 block text-sm font-medium text-foreground not-italic">
              Khu công nghệ cao Hòa Lạc
              <br />
              Thạch Thất, TP. Hà Nội, Việt Nam
            </address>
          </div>
        </div>
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
