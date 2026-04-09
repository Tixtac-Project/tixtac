import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email('Email không đúng định dạng').max(255, 'Email tối đa 255 ký tự'),

  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),

  full_name: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100, 'Họ tên tối đa 100 ký tự'),

  date_of_birth: z.iso.date('Ngày sinh không hợp lệ').refine((val) => {
    const birthYear = new Date(val).getFullYear();
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear >= 16;
  }, 'Bạn phải từ 16 tuổi trở lên'),

  gender: z.enum(['male', 'female', 'other'], {
    error: 'Vui lòng chọn giới tính hợp lệ',
  }),

  // Optional fields
  phone: z.string().optional(),
  avatar_url: z.url('Avatar phải là một đường dẫn URL hợp lệ').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.email('Email không đúng định dạng').max(255, 'Email tối đa 255 ký tự'),

  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
