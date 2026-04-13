import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .email('Email không đúng định dạng')
    .transform((v) => v.trim().toLowerCase())
    .pipe(
      z
        .string()
        .max(255, 'Email tối đa 255 ký tự')
        .refine(
          (val) => {
            const domain = val.split('@')[1];
            return ['gmail.com', 'vnu.edu.vn'].includes(domain);
          },
          { message: 'Email phải thuộc miền gmail.com hoặc vnu.edu.vn' },
        ),
    ),

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
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
