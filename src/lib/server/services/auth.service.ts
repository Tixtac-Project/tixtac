import { signAuthToken } from '$lib/server/auth/jwt';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { Errors, throwError } from '$lib/server/errors';
import { eq } from 'drizzle-orm';
import { registerSchema, loginSchema } from '$lib/shared/schemas';

export const authService = {
  async register(data: unknown) {
    // 1. VALIDATE BẰNG ZOD
    const parsed = registerSchema.safeParse(data);

    if (!parsed.success) {
      const details: Record<string, string> = {};
      const fieldErrors = parsed.error.flatten().fieldErrors;

      for (const [key, messages] of Object.entries(fieldErrors)) {
        if (messages && messages.length > 0) {
          details[key] = messages[0];
        }
      }

      // SỬ DỤNG THEO CẤU TRÚC MỚI:
      // Vì Errors.VALIDATION là một hàm, ta gọi nó và truyền details vào
      throw Errors.VALIDATION(details);
    }

    const { email, password, full_name, phone, date_of_birth, gender, avatar_url } = parsed.data;

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
    const parsed = loginSchema.safeParse(data);

    if (!parsed.success) {
      // Login sai định dạng trả luôn 401 để bảo mật
      throwError(Errors.INVALID_CREDENTIALS);
    }

    const { email, password } = parsed.data;
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

    const { passwordHash: _hash, createdAt: _created, updatedAt: _updated, ...userInfo } = user;

    return { user: userInfo, token };
  },
};
