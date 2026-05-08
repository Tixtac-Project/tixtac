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

  let { resetLink = '', supportEmail = 'support@example.com', ip = '', device = '' } = $props();
</script>

<Html lang="vi">
  <Head>
    <title>Đặt lại mật khẩu</title>
  </Head>

  <Body style="margin:0; padding:0; background-color:#f1f5f9;">
    <Section style="padding:40px 20px;">
      <Container
        style="max-width:480px; background-color:#ffffff; border-radius:20px; box-shadow:0 4px 16px rgba(0,0,0,0.04); padding:40px 36px;"
      >
        <!-- Tiêu đề -->
        <Heading as="h1" class="mb-3 text-2xl font-bold tracking-tight text-gray-900">
          Đặt lại mật khẩu
        </Heading>

        <!-- Đường kẻ phân cách nhẹ -->
        <Hr class="my-6" style="border-color:#e5e7eb;" />

        <!-- Mô tả ngắn -->
        <Text class="mb-6 text-sm leading-relaxed text-gray-600">
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
        </Text>

        <!-- Thông tin bảo mật (IP & thiết bị) – chuyển lên trên, ngay sau mô tả -->
        <Text class="mb-6 text-sm leading-relaxed text-gray-500">
          Yêu cầu được gửi từ địa chỉ IP: <strong class="text-gray-700">{ip || '—'}</strong>
          <br />
          Thiết bị:
          <span class="text-gray-700">{device || 'Không xác định'}</span>
        </Text>

        <!-- Nút hành động chính -->
        <Button
          href={resetLink}
          class="block w-full rounded-xl bg-indigo-600 py-4 text-center text-sm font-semibold text-white no-underline"
          aria-label="Nhấn để đặt lại mật khẩu"
        >
          Đặt lại mật khẩu
        </Button>

        <!-- Đường kẻ phân cách nhẹ -->
        <Hr class="my-6" style="border-color:#e5e7eb;" />

        <!-- Thời hạn -->
        <Text class="mt-5 text-sm text-gray-500">
          Liên kết sẽ hết hạn sau <strong class="text-gray-700">1 giờ</strong>
          .
        </Text>

        <!-- Lời nhắn hỗ trợ (vẫn ở dưới cùng) -->
        {#if ip}
          <Text class="text-sm text-gray-400">
            Nếu không phải bạn, hãy
            <a
              href="mailto:{supportEmail}"
              class="text-indigo-600 underline"
              aria-label="Gửi email đến bộ phận hỗ trợ"
            >
              liên hệ hỗ trợ
            </a>
            ngay.
          </Text>
        {/if}
      </Container>
    </Section>
  </Body>
</Html>
