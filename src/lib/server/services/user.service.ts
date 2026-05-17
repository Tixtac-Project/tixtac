import { signAuthToken } from '$lib/server/auth/jwt';
import { hashPassword, verifyPassword } from '$lib/server/auth/password';
import { generateResetToken, hashExistingToken } from '$lib/server/auth/token';
import { config } from '$lib/server/config';
import { db } from '$lib/server/db/index';
import { passwordResetTokens, users } from '$lib/server/db/schema';
import { sendResetPasswordEmail } from '$lib/server/email';
import { AppError, Errors, throwError } from '$lib/server/errors';
import { parseUserAgent } from '$lib/server/utils/parse-user-agent';
import {
  loginSchema,
  registerSchema,
  updateEmailSchema,
  updatePasswordSchema,
  updateProfileSchema,
  type UpdateProfileInput,
} from '$lib/shared/schemas';
import { validateInput } from '$lib/shared/validation';
import type { Cookies } from '@sveltejs/kit';
import { and, eq, gt, sql } from 'drizzle-orm';

// Prepared statements – compiled once, reused across requests
const userByEmail = db
  .select()
  .from(users)
  .where(eq(users.email, sql.placeholder('email')))
  .limit(1)
  .prepare('auth_user_by_email');

const userById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .limit(1)
  .prepare('auth_user_by_id');

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

function toCookieMaxAgeSeconds(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') return expiresIn;
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) {
    throw new Error(`Unsupported JWT_EXPIRES_IN format: ${expiresIn}`);
  }

  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  return {
    s: value,
    m: value * 60,
    h: value * 60 * 60,
    d: value * 60 * 60 * 24,
  }[unit];
}

export const userService = {
  async register(data: unknown) {
    // 1. VALIDATE BẰNG ZOD
    const { email, password, full_name, phone, date_of_birth, gender, avatar_url } = validateInput(
      registerSchema,
      data,
    );

    // 2. CHECK EMAIL TỒN TẠI
    const [existing] = await userByEmail.execute({ email });

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

    const [user] = await userByEmail.execute({ email: normalizedEmail });

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

    const [current] = await userById.execute({ id: userId });

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

    const [profile] = await userById.execute({ id: userId });

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.fullName,
      phone: profile.phone,
      date_of_birth: profile.dateOfBirth,
      gender: profile.gender,
      avatar_url: profile.avatarUrl || null,
      role: profile.role,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  },

  async getProfile(userId: number): Promise<UserProfileResponse> {
    const [user] = await userById.execute({ id: userId });

    if (!user) {
      throwError(Errors.USER_INACTIVE);
    }
    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      phone: user.phone,
      date_of_birth: user.dateOfBirth,
      gender: user.gender,
      avatar_url: user.avatarUrl || null,
      role: user.role,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  },

  async updateSecurity(userId: number, rawBody: unknown, cookies: Cookies) {
    // Validate with both schemas to collect all errors upfront.
    // We validate each schema conditionally based on which fields are present.
    const body = rawBody as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      throw Errors.VALIDATION({ _form: 'Dữ liệu không hợp lệ' });
    }

    const changingEmail =
      'new_email' in body && body.new_email !== '' && body.new_email !== undefined;
    const changingPassword =
      'new_password' in body && body.new_password !== '' && body.new_password !== undefined;

    if (!changingEmail && !changingPassword) {
      throw Errors.VALIDATION({
        _form: 'Vui lòng cung cấp email mới hoặc mật khẩu mới để thay đổi',
      });
    }

    // Collect validation errors from both schemas
    const details: Record<string, string> = {};

    if (changingEmail) {
      const emailParsed = updateEmailSchema.safeParse(rawBody);
      if (!emailParsed.success) {
        for (const issue of emailParsed.error.issues) {
          const field = issue.path.join('.');
          if (!details[field]) details[field] = issue.message;
        }
      }
    }

    if (changingPassword) {
      const passwordParsed = updatePasswordSchema.safeParse(rawBody);
      if (!passwordParsed.success) {
        for (const issue of passwordParsed.error.issues) {
          const field = issue.path.join('.');
          if (!details[field]) details[field] = issue.message;
        }
      }
    }

    // Also require current_password for either operation
    if (
      !body.current_password ||
      typeof body.current_password !== 'string' ||
      body.current_password.trim() === ''
    ) {
      if (!details['current_password']) {
        details['current_password'] = 'Vui lòng nhập mật khẩu hiện tại';
      }
    }

    if (Object.keys(details).length > 0) {
      throw Errors.VALIDATION(details);
    }

    const currentPassword = (body.current_password as string).trim();

    const [userRecord] = await userById.execute({ id: userId });

    if (!userRecord) {
      throwError(Errors.USER_INACTIVE);
    }

    const valid = await verifyPassword(userRecord.passwordHash, currentPassword);
    if (!valid) {
      throw Errors.VALIDATION({ current_password: 'Mật khẩu hiện tại không đúng' });
    }

    const updates: Record<string, unknown> = {};

    if (changingEmail) {
      const newEmail = (body.new_email as string).trim().toLowerCase();
      if (newEmail !== userRecord.email) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, newEmail));
        if (existing && existing.id !== userId) {
          throw Errors.VALIDATION({ new_email: 'Email đã tồn tại' });
        }
        updates.email = newEmail;
      }
    }

    if (changingPassword) {
      updates.passwordHash = await hashPassword(body.new_password as string);
    }

    if (Object.keys(updates).length === 0) {
      return { message: 'Không có thay đổi nào' };
    }

    updates.updatedAt = new Date();

    await db.update(users).set(updates).where(eq(users.id, userId));

    const newToken = await signAuthToken({
      sub: userId,
      role: userRecord.role,
    });

    cookies.set('auth_token', newToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: toCookieMaxAgeSeconds(config.jwtExpiresIn),
    });

    return { message: 'Cập nhật bảo mật thành công' };
  },

  async forgotPassword(email: string, origin: string, ip: string, userAgent: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user || !user.isActive) return;

    const { rawToken, hmacToken } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .insert(passwordResetTokens)
      .values({
        tokenHash: hmacToken,
        userId: user.id,
        expiresAt: expiresAt,
      })
      .onConflictDoUpdate({
        target: passwordResetTokens.userId,
        set: {
          tokenHash: hmacToken,
          expiresAt: expiresAt,
        },
      });
    const device = parseUserAgent(userAgent);
    await sendResetPasswordEmail(user.email, rawToken, ip, device);
  },

  async resetPassword(token: string, password: string) {
    const hashed = hashExistingToken(token);

    await db.transaction(async (tx) => {
      const [record] = await tx
        .delete(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, hashed),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .returning();

      if (!record) {
        throwError(Errors.INVALID_TOKEN, 'Token không hợp lệ hoặc đã hết hạn');
      }

      const hashedPassword = await hashPassword(password);

      await db
        .update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.id, record.userId));
    });
  },
};
