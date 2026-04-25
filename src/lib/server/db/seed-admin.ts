// src/lib/server/db/seed-admin.ts
import { hashPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

// ── Seed ───────────────────────────────────────

async function seedNewAdmin() {
  console.log('🌱 Bắt đầu thêm admin mới...');

  // Thông tin admin mới (bạn có thể thay đổi các giá trị này)
  const newAdminData = {
    email: 'admin1@gmail.com',
    password: '12345678', // Mật khẩu chưa mã hóa
    fullName: 'Admin Tixtac 1',
    dateOfBirth: '1995-05-20',
    gender: 'male' as const,
  };

  try {
    const [admin] = await db
      .insert(users)
      .values({
        email: newAdminData.email,
        passwordHash: await hashPassword(newAdminData.password),
        fullName: newAdminData.fullName,
        dateOfBirth: newAdminData.dateOfBirth,
        gender: newAdminData.gender,
        role: 'admin',
      })
      .returning();

    console.log(`✅ Thêm admin thành công!`);
    console.log(`👤 Email: ${admin.email}`);
    console.log(`🔑 ID: ${admin.id}`);
  } catch (error) {
    console.error('❌ Lỗi khi thêm admin (có thể do email đã tồn tại):');
    console.error(error);
    process.exit(1);
  }
}

// ── Entry point ────────────────────────────────
if (import.meta.main) {
  seedNewAdmin()
    .then(() => {
      console.log('🏁 Xong!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
