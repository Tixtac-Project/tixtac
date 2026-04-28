import { signAuthToken } from '$lib/server/auth/jwt';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { AppError, Errors, throwError } from '$lib/server/errors';
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  type UpdateProfileInput,
} from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import { eq } from 'drizzle-orm';

interface UserProfileResponse {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  avatar_url: string | null;
  role: 'admin' | 'customer';
  created_at: Date;
  updated_at: Date;
}

export const authService = {
  async register(data: unknown) {
    // 1. VALIDATE BẰNG ZOD
    const { email, password, full_name, phone, date_of_birth, gender, avatar_url } = validateInput(
      registerSchema,
      data,
    );

    // 2. CHECK EMAIL TỒN TẠI
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      throwError(Errors.EMAIL_EXISTS);
    }

    // 3. BĂM MẬT KHẨU
    const passwordHash = await hashPassword(password);

    // 4. LƯU DATABASE
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          email: email,
          passwordHash,
          fullName: full_name,
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
      // Fallback: catch unique constraint violation from DB (race condition)
      const error = e as { code?: string; constraint_name?: string };
      if (error.code === '23505') {
        throwError(Errors.EMAIL_EXISTS);
      }
      throw e;
    }
  },

  async login(data: unknown) {
    // Login validation: remap VALIDATION_ERROR → INVALID_CREDENTIALS for security
    // (don't reveal which field is wrong), but rethrow unexpected errors
    let email: string;
    let password: string;
    try {
      ({ email, password } = validateInput(loginSchema, data));
    } catch (e) {
      if (e instanceof AppError && e.code === 'VALIDATION_ERROR') {
        throwError(Errors.INVALID_CREDENTIALS);
      }
      throw e;
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
      full_name: user.fullName,
      phone: user.phone,
      date_of_birth: user.dateOfBirth,
      gender: user.gender,
      avatar_url: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
    };

    return { user: userInfo, token };
  },

  async updateProfile(userId: number, rawBody: unknown): Promise<UserProfileResponse> {
    const parsed = updateProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      const details: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        if (!details[field]) details[field] = issue.message;
      }
      throw Errors.VALIDATION(details);
    }
    const data: UpdateProfileInput = parsed.data;

    const [current] = await db
      .select({
        full_name: users.fullName,
        date_of_birth: users.dateOfBirth,
        gender: users.gender,
        phone: users.phone,
        avatar_url: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!current) {
      throwError(Errors.USER_INACTIVE);
    }

    const updateData: Record<string, unknown> = {
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      phone: data.phone ?? null,
      avatarUrl: data.avatar_url === '' ? null : data.avatar_url,
      updatedAt: new Date(),
    };

    await db.update(users).set(updateData).where(eq(users.id, userId));

    const [profile] = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.fullName,
        phone: users.phone,
        date_of_birth: users.dateOfBirth,
        gender: users.gender,
        avatar_url: users.avatarUrl || null,
        role: users.role,
        created_at: users.createdAt,
        updated_at: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    return profile;
  },

  async getProfile(userId: number): Promise<UserProfileResponse> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.fullName,
        phone: users.phone,
        date_of_birth: users.dateOfBirth,
        gender: users.gender,
        avatar_url: users.avatarUrl || null,
        role: users.role,
        created_at: users.createdAt,
        updated_at: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throwError(Errors.USER_INACTIVE);
    }
    return user;
  },
};
