<script lang="ts">
  import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
  } from '@better-svelte-email/components';

  let { resetLink = '', supportEmail = '', ip = '', device = '', location = '' } = $props();

  const C = {
    bg: '#f4f5f7',
    white: '#ffffff',
    surfaceLow: '#f9fafb',
    primary: '#0f3778',
    primaryMid: '#255ebc',
    cta: '#cb5a1a',
    ctaMuted: '#fff3ed',
    text: '#111827',
    textMuted: '#4b5563',
    textFaint: '#9ca3af',
    border: '#e5e7eb',
    danger: '#b91c1c',
  };
</script>

<Html lang="vi">
  <Head>
    <title>Đặt lại mật khẩu — TixTac</title>
  </Head>

  <Body
    style="margin: 0; padding: 0; background-color: {C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; -webkit-font-smoothing: antialiased;"
  >
    <Preview preview="Yêu cầu đặt lại mật khẩu cho tài khoản TixTac của bạn." />

    <!-- Outer wrapper với padding bảo vệ viền trên mobile -->
    <Section style="padding: 40px 20px;">
      <Container
        style="max-width: 560px; margin: 0 auto; background-color: {C.white}; border-radius: 12px; border: 1px solid {C.border}; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);"
      >
        <!-- ══════════════════════════════
             HEADER
        ══════════════════════════════ -->
        <Section style="background-color: {C.primary}; padding: 36px 32px; text-align: center;">
          <Heading
            as="h1"
            style="margin: 0; font-size: 26px; font-weight: 700; color: {C.white}; letter-spacing: -0.02em;"
          >
            TixTac
          </Heading>
          <Text
            style="margin: 6px 0 0; font-size: 11px; font-weight: 500; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 0.1em;"
          >
            Nền tảng sự kiện & bán vé
          </Text>
        </Section>

        <!-- ══════════════════════════════
             BODY CONTENT
        ══════════════════════════════ -->
        <Section style="padding: 40px 32px 32px;">
          <Heading
            as="h2"
            style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: {C.text}; line-height: 1.3; letter-spacing: -0.01em;"
          >
            Đặt lại mật khẩu của bạn
          </Heading>

          <Text style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: {C.textMuted};">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong
              style="color: {C.text}; font-weight: 600;"
            >
              TixTac
            </strong>
            của bạn. Vui lòng nhấp vào nút bên dưới để thiết lập mật khẩu mới.
          </Text>

          <!-- CTA Button -->
          <Section style="text-align: center; margin-bottom: 24px;">
            <Button
              href={resetLink}
              style="display: inline-block; padding: 14px 32px; border-radius: 6px; background-color: {C.cta}; font-size: 15px; font-weight: 600; color: {C.white}; text-decoration: none;"
            >
              Đặt lại mật khẩu
            </Button>
          </Section>

          <Text style="margin: 0 0 32px; font-size: 14px; line-height: 1.6; color: {C.textMuted};">
            Liên kết này sẽ hết hạn sau
            <strong style="color: {C.text}; font-weight: 600;">1 giờ</strong>
            . Nếu bạn không yêu cầu thay đổi, hãy bỏ qua email này và tài khoản của bạn vẫn sẽ an toàn.
          </Text>

          <!-- Divider -->
          <Hr style="border: none; border-top: 1px solid {C.border}; margin: 0 0 24px;" />

          <!-- ══════════════════════════════
               SECURITY DETAILS
          ══════════════════════════════ -->
          <Text
            style="margin: 0 0 12px; font-size: 11px; font-weight: 600; color: {C.textFaint}; text-transform: uppercase; letter-spacing: 0.08em;"
          >
            Chi tiết yêu cầu
          </Text>

          <Section
            style="background-color: {C.surfaceLow}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;"
          >
            <table width="100%" style="border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid {C.border};">
                    <Text style="margin: 0; font-size: 12px; color: {C.textFaint};">
                      Địa chỉ IP
                    </Text>
                    <Text
                      style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: {C.text};"
                    >
                      {ip || '—'}{#if location}
                        ({location}){/if}
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <Text style="margin: 0; font-size: 12px; color: {C.textFaint};">Thiết bị</Text>
                    <Text
                      style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: {C.text};"
                    >
                      {device || 'Không xác định'}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <!-- Fallback link -->
          <Text style="margin: 0 0 6px; font-size: 13px; color: {C.textMuted};">
            Nếu nút trên không hoạt động, hãy sao chép và dán liên kết này vào trình duyệt:
          </Text>
          <Text
            style="margin: 0; font-size: 13px; line-height: 1.5; color: {C.primaryMid}; word-break: break-all;"
          >
            <Link href={resetLink} style="color: {C.primaryMid}; text-decoration: underline;">
              {resetLink}
            </Link>
          </Text>

          <!-- ══════════════════════════════
               WARNING (conditional)
          ══════════════════════════════ -->
          {#if ip}
            <Section
              style="margin-top: 32px; padding: 16px; background-color: {C.ctaMuted}; border-radius: 8px; border-left: 4px solid {C.cta};"
            >
              <Text style="margin: 0; font-size: 13px; line-height: 1.6; color: {C.danger};">
                <strong>Không phải bạn?</strong>
                Vui lòng
                <Link
                  href="mailto:{supportEmail}"
                  style="color: {C.danger}; font-weight: 600; text-decoration: underline;"
                >
                  liên hệ hỗ trợ
                </Link>
                ngay lập tức để bảo vệ tài khoản của bạn.
              </Text>
            </Section>
          {/if}
        </Section>
      </Container>

      <!-- ══════════════════════════════
           FOOTER (Bên ngoài Card)
      ══════════════════════════════ -->
      <Container style="max-width: 560px; margin: 0 auto;">
        <Section style="padding: 24px 0; text-align: center;">
          <Text style="margin: 0 0 8px; font-size: 12px; color: {C.textFaint};">
            © {new Date().getFullYear()} TixTac. Nền tảng sự kiện & bán vé.
          </Text>
          <Text style="margin: 0; font-size: 12px;">
            <Link
              href="mailto:{supportEmail}"
              style="color: {C.textFaint}; text-decoration: underline;"
            >
              {supportEmail || 'support@tixtac.io.vn'}
            </Link>
          </Text>
        </Section>
      </Container>
    </Section>
  </Body>
</Html>
