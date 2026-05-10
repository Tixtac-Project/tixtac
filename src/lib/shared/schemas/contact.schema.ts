import z from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.email('Email không hợp lệ').trim(),
  subject: z.string().trim().min(1, 'Vui lòng nhập tiêu đề'),
  message: z.string().trim().min(10, 'Nội dung quá ngắn (tối thiểu 10 ký tự)'),
});
