<!-- src/lib/emails/ResetPassword.svelte -->
<script lang="ts">
  import {
    Body,
    Button,
    Container,
    Head,
    Heading,
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

  <!-- Nền xám trung tính, không chói -->
  <Body style="margin:0; padding:0; background-color:#f3f4f6;">
    <Section style="padding:40px 20px;">
      <!-- Card chính: trắng, bo cong mềm, đổ bóng nhẹ -->
      <Container
        style="max-width:480px; background-color:#ffffff; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,0.05); padding:40px;"
      >
        <!-- Tiêu đề với thẻ heading thực sự (h1) cho screen reader -->
        <Heading as="h1" class="mb-2 text-2xl font-bold tracking-tight text-gray-900">
          Đặt lại mật khẩu
        </Heading>

        <!-- Mô tả ngắn, tone thân thiện -->
        <Text class="mb-8 text-sm text-gray-600">
          Chào bạn, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
        </Text>

        <!-- Nút hành động chính: full-width, tương phản cao, aria-label cho accessibility -->
        <Button
          href={resetLink}
          class="block w-full rounded-xl bg-indigo-600 py-3.5 text-center text-sm font-semibold text-white no-underline"
          aria-label="Nhấn để đặt lại mật khẩu"
        >
          Đặt lại mật khẩu
        </Button>

        <!-- Thông tin phụ: thời hạn & hướng dẫn an toàn -->
        <Text class="mt-6 text-xs text-gray-500">
          Liên kết sẽ hết hạn sau <strong class="text-gray-700">1 giờ</strong>
          . Nếu bạn không yêu cầu đặt lại, vui lòng bỏ qua email này.
        </Text>

        <Hr class="my-6" />

        <!-- Footer: lưu ý spam + liên hệ hỗ trợ -->
        <Text class="text-xs text-gray-400">
          Vui lòng kiểm tra thư mục <strong>Spam</strong>
           nếu bạn không thấy email.
        </Text>
        <Text class="mt-2 text-xs text-gray-400">
          Cần hỗ trợ?
          <a
            href="mailto:support@yourdomain.com"
            class="text-indigo-600 underline"
            aria-label="Gửi email đến bộ phận hỗ trợ"
          >
            Liên hệ hỗ trợ
          </a>
        </Text>
      </Container>
    </Section>
  </Body>
</Html>
