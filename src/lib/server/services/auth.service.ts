import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Errors, AppError } from '$lib/server/errors';
import { hashPassword } from '$lib/server/auth/password';

export const authService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async register(data: any) {
    const { email, password, full_name, phone, date_of_birth, gender, avatar_url } = data;

    if (!email || !password || !full_name || !date_of_birth || !phone) {
      throw Errors.VALIDATION; // Dùng error định nghĩa sẵn
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
