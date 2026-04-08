import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { Errors, AppError } from '$lib/server/errors';
import { hashPassword } from '$lib/server/auth/password';

export const authService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async register(data: any) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw Errors.VALIDATION;
    }

    let { email, password, full_name, phone, date_of_birth, gender, avatar_url } = data;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof full_name !== 'string' ||
      typeof date_of_birth !== 'string' ||
      typeof gender !== 'string'
    ) {
      throw Errors.VALIDATION;
    }

    if (!email || !password || !full_name || !date_of_birth || !gender) {
      throw Errors.VALIDATION; // Dùng error định nghĩa sẵn
    }

    // Tiền xử lý (Sanitize)
    email = email.trim().toLowerCase();
    full_name = full_name.trim();

    if (full_name.length < 2 || full_name.length > 100) {
      throw new AppError('INVALID_NAME', 400, 'Tên phải từ 2 đến 100 ký tự');
    }

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

    if (!['male', 'female', 'other'].includes(gender)) {
      throw new AppError('INVALID_GENDER', 400, 'Giới tính không hợp lệ');
    }

    // Băm mật khẩu (Gọi từ Infrastructure Layer)
    const passwordHash = await hashPassword(password);

    try {
      // Insert vào DB
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          fullName: full_name,
          phone,
          dateOfBirth: date_of_birth,
          gender: gender as 'male' | 'female' | 'other',
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
    } catch (e: any) {
      if (e.code === '23505') {
        throw Errors.EMAIL_EXISTS;
      }
      throw e;
    }
  },
};
