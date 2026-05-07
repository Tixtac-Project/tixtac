<!-- src/lib/emails/ResetPassword.svelte -->
<script lang="ts">
  import {
    Body,
    Button,
    Container,
    Head,
    Hr,
    Html,
    Section,
    Text,
  } from '@better-svelte-email/components';

  let { resetLink = '' } = $props();
</script>

<Html lang="vi">
  <Head>
    <title>Đặt lại mật khẩu</title>
  </Head>
  <!-- Nền xám nhạt bao phủ toàn bộ email -->
  <Body style="margin:0; padding:0; background-color:#f4f4f5;">
    <!-- Section giúp căn giữa và tạo padding ngoài -->
    <Section style="padding:40px 20px;">
      <!-- Card chứa nội dung chính, max-width cố định -->
      <Container
        style="max-width:480px; background-color:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:32px;"
      >
        <!-- Tiêu đề -->
        <Text class="mb-4 text-2xl font-bold text-gray-900">Đặt lại mật khẩu</Text>

        <!-- Mô tả -->
        <Text class="mb-6 text-base text-gray-700">
          Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình. Nhấn nút bên dưới để tiếp tục.
        </Text>

        <!-- Nút hành động chính -->
        <Button
          href={resetLink}
          class="inline-block rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white no-underline"
        >
          Đặt lại mật khẩu
        </Button>

        <!-- Thông tin bổ sung -->
        <Text class="mt-6 mb-2 text-sm text-gray-500">
          Liên kết có hiệu lực trong <strong>1 giờ</strong>
          .
        </Text>
        <Text class="mb-6 text-sm text-gray-500">
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </Text>

        <!-- Đường kẻ phân cách -->
        <Hr class="my-6" />

        <!-- Lưu ý cuối cùng -->
        <Text class="text-xs text-gray-400">
          Vui lòng kiểm tra thư mục Spam nếu bạn không thấy email.
        </Text>
      </Container>
    </Section>
  </Body>
</Html>
