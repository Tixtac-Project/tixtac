import { hashPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  date_of_birth: string;
  gender: string;
  avatar_url?: string;
}

export const authService = {
  async register(data: unknown) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throwError(Errors.VALIDATION, 'Dữ liệu không hợp lệ');
    }

    let { email, password, full_name, phone, date_of_birth, gender, avatar_url } =
      data as RegisterData;

    const details: Record<string, string> = {};
    if (typeof email !== 'string' || !email.trim()) details.email = 'Email là bắt buộc';
    if (typeof password !== 'string' || !password.trim()) details.password = 'Passowrd là bắt buộc';
    if (typeof full_name !== 'string' || !full_name.trim())
      details.full_name = 'Tên đầy đủ là bắt buộc';
    if (typeof date_of_birth !== 'string' || !date_of_birth.trim())
      details.date_of_birth = 'Ngày sinh là bắt buộc';
    if (typeof gender !== 'string' || !gender.trim()) details.gender = 'Giới tính là bắt buộc';
    if (Object.keys(details).length > 0) {
      throwError(Errors.VALIDATION, 'Dữ liệu không hợp lệ', details);
    }

    if (!email || !password || !full_name || !date_of_birth || !gender) {
      throwError(Errors.VALIDATION, 'Dữ liệu không hợp lệ');
    }

    // Tiền xử lý (Sanitize)
    email = email.trim().toLowerCase();
    full_name = full_name.trim();

    if (full_name.length < 2 || full_name.length > 100) {
      throwError(Errors.VALIDATION, 'Tên phải từ 2 đến 100 ký tự');
    }

    // 1. Kiểm tra định dạng Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throwError(Errors.VALIDATION, 'Định dạng email không hợp lệ');
    }

    // 2. Kiểm tra tuổi >= 16
    const birthDate = new Date(date_of_birth);
    if (isNaN(birthDate.getTime())) {
      throwError(Errors.VALIDATION, 'Định dạng ngày sinh không hợp lệ');
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 16) {
      throwError(Errors.VALIDATION, 'Bạn phải từ 16 tuổi trở lên để đăng ký');
    }

    if (password.length < 8) {
      throwError(Errors.VALIDATION, 'Mật khẩu phải từ 8 ký tự trở lên');
    }

    if (!['male', 'female', 'other'].includes(gender)) {
      throwError(Errors.VALIDATION, 'Giới tính không hợp lệ');
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
    } catch (e: unknown) {
      const error = e as { code?: string };

      if (error.code === '23505') {
        throwError(Errors.EMAIL_EXISTS, 'Email đã được sử dụng');
      }
      throw e;
    }
  },
};
