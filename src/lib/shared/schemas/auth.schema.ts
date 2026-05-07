import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .email('Email không đúng định dạng')
    .max(255, 'Email tối đa 255 ký tự')
    .transform((v) => v.trim().toLowerCase()),

  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .max(50, 'Mật khẩu tối đa 50 ký tự')
    .refine((val) => /[A-Z]/.test(val), {
      message: 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa',
    })
    .refine((val) => /[a-z]/.test(val), {
      message: 'Mật khẩu phải chứa ít nhất một chữ cái viết thường',
    })
    .refine((val) => /[0-9]/.test(val), { message: 'Mật khẩu phải chứa ít nhất một chữ số' })
    .refine((val) => !/\s/.test(val), { message: 'Mật khẩu không được chứa khoảng trắng' }),

  full_name: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(2, 'Họ tên tối thiểu 2 ký tự')
        .max(100, 'Họ tên tối đa 100 ký tự')
        .refine((val) => /^[\p{L}\s]+$/u.test(val), {
          message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng',
        }),
    ),

  date_of_birth: z.iso.date('Ngày sinh không hợp lệ').refine(
    (val) => {
      const birth = new Date(val);
      const today = new Date();

      const age =
        today.getUTCFullYear() -
        birth.getUTCFullYear() -
        (today.getUTCMonth() < birth.getUTCMonth() ||
        (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())
          ? 1
          : 0);

      return age >= 16;
    },
    { message: 'Bạn phải từ đủ 16 tuổi trở lên' },
  ),

  gender: z.enum(['male', 'female', 'other'], { error: 'Vui lòng chọn giới tính hợp lệ' }),

  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
    .optional(),

  avatar_url: z.url('Avatar phải là một đường dẫn URL hợp lệ').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z
    .email('Email không đúng định dạng')
    .max(255, 'Email tối đa 255 ký tự')
    .transform((v) => v.trim().toLowerCase()),

  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(50, 'Mật khẩu tối đa 50 ký tự'),
});

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(2, 'Họ tên tối thiểu 2 ký tự')
        .max(100, 'Họ tên tối đa 100 ký tự')
        .refine((val) => /^[\p{L}\s]+$/u.test(val), {
          message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng',
        }),
    ),

  date_of_birth: z.iso.date('Ngày sinh không hợp lệ').refine(
    (val) => {
      const birth = new Date(val);
      const today = new Date();

      const age =
        today.getUTCFullYear() -
        birth.getUTCFullYear() -
        (today.getUTCMonth() < birth.getUTCMonth() ||
        (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())
          ? 1
          : 0);

      return age >= 16;
    },
    { message: 'Bạn phải từ đủ 16 tuổi trở lên' },
  ),

  gender: z.enum(['male', 'female', 'other'], { error: 'Vui lòng chọn giới tính hợp lệ' }),

  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .nullable(),

  avatar_url: z.url('Avatar phải là một đường dẫn URL hợp lệ').optional().or(z.literal('')),
});

export const updateSecuritySchema = z
  .object({
    current_password: z.string().min(8, 'Mật khẩu hiện tại phải có ít nhất 8 ký tự'),
    new_password: registerSchema.shape.password.optional(),
    new_email: registerSchema.shape.email.optional(),
  })
  .refine((data) => data.new_password || data.new_email, {
    message: 'Phải cung cấp ít nhất một trong hai trường new_password hoặc new_email',
    path: ['new_password'],
  });

export const passwordSchema = z
  .object({
    password: registerSchema.shape.password,
    confirmPassword: registerSchema.shape.password,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSecurityInput = z.infer<typeof updateSecuritySchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
