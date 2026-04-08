import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Errors, AppError } from '$lib/server/errors';
import { hashPassword } from '$lib/server/auth/password';

export const authService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async register(data: any) {
    let { email, password, full_name, phone, date_of_birth, gender, avatar_url } = data;

    if (!email || !password || !full_name || !date_of_birth || !phone) {
      throw Errors.VALIDATION; // Dùng error định nghĩa sẵn
    }

    // Tiền xử lý (Sanitize)
    email = email.trim().toLowerCase();
    full_name = full_name.trim();

    // 1. Kiểm tra định dạng Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('INVALID_EMAIL', 400, 'Định dạng email không hợp lệ');
    }

    // 2. Kiểm tra tuổi >= 16
    const birthDate = new Date(date_of_birth);
    if (isNaN(birthDate.getTime())) {
      throw new AppError('INVALID_DATE', 400, 'Định dạng ngày sinh không hợp lệ');
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 16) {
      throw new AppError('UNDERAGE', 400, 'Bạn phải từ 16 tuổi trở lên để đăng ký');
    }

    if (password.length < 8) {
      throw new AppError('WEAK_PASSWORD', 400, 'Mật khẩu phải từ 8 ký tự trở lên');
    }

    const finalGender = gender || 'other';
    if (!['male', 'female', 'other'].includes(finalGender)) {
      throw new AppError('INVALID_GENDER', 400, 'Giới tính không hợp lệ');
    }

    // Check email tồn tại
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      throw Errors.EMAIL_EXISTS; // Dùng error định nghĩa sẵn từ file errors.ts
    }

    // Băm mật khẩu (Gọi từ Infrastructure Layer)
    const passwordHash = await hashPassword(password);

    // Insert vào DB
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        fullName: full_name,
        phone: phone || null, // Hỗ trợ nullable
        dateOfBirth: date_of_birth,
        gender: finalGender,
        avatarUrl: avatar_url || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        avatarUrl: users.avatarUrl,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return newUser;
  },
};
