import { signAuthToken } from '$lib/server/auth/jwt';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { loginSchema, registerSchema } from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { eq } from 'drizzle-orm';

export const authService = {
  async register(data: unknown) {
    // 1. VALIDATE BẰNG ZOD
    const { email, password, full_name, phone, date_of_birth, gender, avatar_url } = validateInput(
      registerSchema,
      data,
    );

    // 2. TIỀN XỬ LÝ
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = full_name.trim();

    // 3. BĂM MẬT KHẨU
    const passwordHash = await hashPassword(password);

    // 4. LƯU DATABASE
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          fullName: normalizedName,
          phone: phone || null,
          dateOfBirth: date_of_birth,
          gender: gender,
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
        // Dùng helper throwError để clone lỗi EMAIL_EXISTS
        throwError(Errors.EMAIL_EXISTS);
      }
      throw e;
    }
  },

  async login(data: unknown) {
    // Login validation: catch VALIDATION_ERROR and re-throw as INVALID_CREDENTIALS for security
    let email: string;
    let password: string;
    try {
      ({ email, password } = validateInput(loginSchema, data));
    } catch {
      throwError(Errors.INVALID_CREDENTIALS);
    }
    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    // Kiểm tra user tồn tại và đang hoạt động
    if (!user || !user.isActive) {
      throwError(Errors.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      throwError(Errors.INVALID_CREDENTIALS);
    }

    const token = await signAuthToken({ sub: user.id, role: user.role });

    const userInfo = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
    };

    return { user: userInfo, token };
  },
};
