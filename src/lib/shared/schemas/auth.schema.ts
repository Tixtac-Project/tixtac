import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .email('Email không đúng định dạng')
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().max(255, 'Email tối đa 255 ký tự')),

  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),

  full_name: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100, 'Họ tên tối đa 100 ký tự')),

  date_of_birth: z.iso.date('Ngày sinh không hợp lệ').refine((val) => {
    const birth = new Date(val);
    const today = new Date();
    // The 16th birthday date
    const min = new Date(birth.getFullYear() + 16, birth.getMonth(), birth.getDate());
    return today >= min;
  }, 'Bạn phải từ đủ 16 tuổi trở lên'),

  gender: z.enum(['male', 'female', 'other'], {
    error: 'Vui lòng chọn giới tính hợp lệ',
  }),

  // Optional fields
  phone: z
    .string()
    .transform((v) => v.trim())
    .optional(),
  avatar_url: z.url('Avatar phải là một đường dẫn URL hợp lệ').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z
    .email('Email không đúng định dạng')
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().max(255, 'Email tối đa 255 ký tự')),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
