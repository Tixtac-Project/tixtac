import { hashPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db';
import {
  eventGates,
  events,
  eventStaff,
  eventStaffGates,
  staffInvitationGates,
  staffInvitations,
  users,
} from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import crypto from 'node:crypto';

/** Sinh token hash giả cho invitation (SHA-256 của chuỗi ngẫu nhiên) */
function generateTokenHash(): string {
  return crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
}

async function seedStaff() {
  console.log('🌱 Seeding staff, gates & invitations (extended)...');

  // ── 1. Chọn một event ──
  const [targetEvent] = await db.select().from(events).limit(1);
  if (!targetEvent) {
    console.warn('⚠️  No event found. Run main seed first!');
    return;
  }
  console.log(`🎪 Event: "${targetEvent.title}" (id=${targetEvent.id})`);

  // ── 2. Tạo các cổng (gates) ──
  const gateDefs = [
    { name: 'Cổng chính', desc: 'Cổng vào chính cho khách thường', active: true },
    { name: 'Cổng VIP', desc: 'Cổng ưu tiên khách VIP', active: true },
    { name: 'Cổng Staff', desc: 'Cổng dành riêng nhân viên', active: true },
  ];

  const gates: Record<string, typeof eventGates.$inferSelect> = {};
  for (const g of gateDefs) {
    const [inserted] = await db
      .insert(eventGates)
      .values({
        eventId: targetEvent.id,
        name: g.name,
        description: g.desc,
        isActive: g.active,
      })
      .onConflictDoNothing({ target: [eventGates.eventId, eventGates.name] })
      .returning();

    gates[g.name] =
      inserted ||
      (await db.query.eventGates.findFirst({
        where: and(eq(eventGates.eventId, targetEvent.id), eq(eventGates.name, g.name)),
      }))!;
    console.log(`🚪 Gate: ${gates[g.name].name} (id=${gates[g.name].id})`);
  }

  // ── 3. Tạo user admin (nếu chưa có) ──
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  if (!admin) {
    console.warn('⚠️  No admin user found – staff will be created without createdBy.');
  }
  const createdBy = admin?.id ?? 1; // fallback

  // ── 4. Tạo các user nhân viên (role = customer) ──
  const staffUsers = [
    { email: 'test-staff@tixtac.io.vn', fullName: 'Test Staff', phone: '0901000001' },
    { email: 'staff-vip@tixtac.io.vn', fullName: 'Staff VIP', phone: '0901000002' },
    { email: 'staff-all@tixtac.io.vn', fullName: 'Staff All Gates', phone: '0901000003' },
    { email: 'staff-revoked@tixtac.io.vn', fullName: 'Staff Revoked', phone: '0901000004' },
    {
      email: 'staff-accepted@tixtac.io.vn',
      fullName: 'Staff From Invitation',
      phone: '0901000005',
    },
  ];

  const pwHash = await hashPassword('12345678');
  for (const u of staffUsers) {
    await db
      .insert(users)
      .values({
        email: u.email,
        passwordHash: pwHash,
        fullName: u.fullName,
        dateOfBirth: '1995-05-20',
        gender: 'male',
        role: 'customer', // Giữ nguyên role
        phone: u.phone,
      })
      .onConflictDoNothing({ target: users.email });
  }

  // Lấy lại tất cả user vừa tạo
  const userMap: Record<string, typeof users.$inferSelect> = {};
  for (const u of staffUsers) {
    const [row] = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
    userMap[u.email] = row;
    console.log(`👤 ${row.email} (id=${row.id})`);
  }

  // ── 5. Gán staff vào event (event_staff) ──
  const staffAssignments: Record<string, typeof eventStaff.$inferSelect> = {};

  // Helper tạo event_staff
  const upsertEventStaff = async (
    email: string,
    status: 'active' | 'revoked',
    invitationId?: number | null,
    extra?: Partial<typeof eventStaff.$inferInsert>,
  ) => {
    const user = userMap[email];
    const [row] = await db
      .insert(eventStaff)
      .values({
        eventId: targetEvent.id,
        userId: user.id,
        status,
        createdBy,
        invitationId: invitationId ?? null,
        ...extra,
      })
      .onConflictDoNothing({ target: [eventStaff.eventId, eventStaff.userId] })
      .returning();

    const final =
      row ||
      (await db.query.eventStaff.findFirst({
        where: and(eq(eventStaff.eventId, targetEvent.id), eq(eventStaff.userId, user.id)),
      }))!;
    return final;
  };

  // 5.1 test-staff: active
  staffAssignments['test-staff@tixtac.io.vn'] = await upsertEventStaff(
    'test-staff@tixtac.io.vn',
    'active',
  );
  // 5.2 staff-vip: active
  staffAssignments['staff-vip@tixtac.io.vn'] = await upsertEventStaff(
    'staff-vip@tixtac.io.vn',
    'active',
  );
  // 5.3 staff-all: active
  staffAssignments['staff-all@tixtac.io.vn'] = await upsertEventStaff(
    'staff-all@tixtac.io.vn',
    'active',
  );
  // 5.4 staff-revoked: revoked
  staffAssignments['staff-revoked@tixtac.io.vn'] = await upsertEventStaff(
    'staff-revoked@tixtac.io.vn',
    'revoked',
    null,
    {
      revokedAt: new Date(),
      revokedBy: createdBy,
      revokeReason: 'Vi phạm quy định',
    },
  );

  // ── 6. Mapping staff với gate (event_staff_gates) ──
  const mapStaffToGate = async (staffId: number, gateName: string) => {
    const gate = gates[gateName];
    await db
      .insert(eventStaffGates)
      .values({ eventStaffId: staffId, gateId: gate.id, createdBy })
      .onConflictDoNothing({ target: [eventStaffGates.eventStaffId, eventStaffGates.gateId] });
  };

  // test-staff -> Cổng chính
  await mapStaffToGate(staffAssignments['test-staff@tixtac.io.vn'].id, 'Cổng chính');
  // staff-vip -> Cổng VIP
  await mapStaffToGate(staffAssignments['staff-vip@tixtac.io.vn'].id, 'Cổng VIP');
  // staff-all -> tất cả cổng
  for (const gateName of Object.keys(gates)) {
    await mapStaffToGate(staffAssignments['staff-all@tixtac.io.vn'].id, gateName);
  }
  // staff-revoked cũng có mapping cũ (dù đã revoked)
  await mapStaffToGate(staffAssignments['staff-revoked@tixtac.io.vn'].id, 'Cổng chính');

  console.log('🔗 Staff-gate mappings created');

  // ── 7. Tạo lời mời (staff_invitations) ──
  const now = new Date();
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h tới
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h trước

  const invitationDefs = [
    {
      email: 'invited-pending@tixtac.io.vn',
      status: 'pending' as const,
      expiresAt: future,
      gates: ['Cổng Staff'],
    },
    {
      email: 'invited-accepted@tixtac.io.vn',
      status: 'accepted' as const,
      acceptedByEmail: 'staff-accepted@tixtac.io.vn', // sẽ tạo event_staff sau
      acceptedAt: now,
      expiresAt: future,
      gates: ['Cổng chính', 'Cổng VIP'],
    },
    {
      email: 'invited-revoked@tixtac.io.vn',
      status: 'revoked' as const,
      revokedAt: now,
      revokedBy: createdBy,
      expiresAt: future,
      gates: ['Cổng VIP'],
    },
    {
      email: 'invited-expired@tixtac.io.vn',
      status: 'expired' as const,
      expiresAt: past,
      gates: ['Cổng chính'],
    },
  ];

  for (const inv of invitationDefs) {
    // Kiểm tra xem đã có lời mời nào cùng event, email, status chưa
    let finalInvitation = await db.query.staffInvitations.findFirst({
      where: and(
        eq(staffInvitations.eventId, targetEvent.id),
        eq(staffInvitations.email, inv.email),
        eq(staffInvitations.status, inv.status),
      ),
    });

    if (!finalInvitation) {
      // Chỉ insert nếu chưa tồn tại
      const tokenHash = generateTokenHash();
      const [inserted] = await db
        .insert(staffInvitations)
        .values({
          tokenHash,
          eventId: targetEvent.id,
          email: inv.email,
          status: inv.status,
          invitedBy: createdBy,
          expiresAt: inv.expiresAt,
          acceptedBy: inv.acceptedByEmail ? (userMap[inv.acceptedByEmail]?.id ?? null) : null,
          acceptedAt: inv.acceptedAt ?? null,
          revokedBy: inv.revokedBy ?? null,
          revokedAt: inv.revokedAt ?? null,
        })
        .onConflictDoNothing({ target: staffInvitations.tokenHash })
        .returning();

      finalInvitation =
        inserted ||
        (await db.query.staffInvitations.findFirst({
          where: eq(staffInvitations.tokenHash, tokenHash),
        }))!;
    }

    // Gán gate cho invitation
    for (const gateName of inv.gates) {
      const gate = gates[gateName];
      await db
        .insert(staffInvitationGates)
        .values({ invitationId: finalInvitation.id, gateId: gate.id })
        .onConflictDoNothing({
          target: [staffInvitationGates.invitationId, staffInvitationGates.gateId],
        });
    }

    console.log(`📨 Invitation ${inv.email} (status: ${inv.status})`);
  }

  // ── 8. Tạo event_staff cho invitation đã accepted ──
  const acceptedInvitation = await db.query.staffInvitations.findFirst({
    where: eq(staffInvitations.email, 'invited-accepted@tixtac.io.vn'),
  });
  if (acceptedInvitation && acceptedInvitation.acceptedBy) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, acceptedInvitation.acceptedBy),
    });
    if (user) {
      const staffForAccepted = await upsertEventStaff(user.email, 'active', acceptedInvitation.id);
      // Copy invitation gates -> event_staff_gates
      const invGates = await db
        .select()
        .from(staffInvitationGates)
        .where(eq(staffInvitationGates.invitationId, acceptedInvitation.id));
      for (const ig of invGates) {
        await db
          .insert(eventStaffGates)
          .values({ eventStaffId: staffForAccepted.id, gateId: ig.gateId, createdBy })
          .onConflictDoNothing({
            target: [eventStaffGates.eventStaffId, eventStaffGates.gateId],
          });
      }
      console.log(`✅ Accepted invitation processed -> event_staff (id=${staffForAccepted.id})`);
    }
  }

  console.log('🎉 Extended staff seed completed!');
}

seedStaff()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
