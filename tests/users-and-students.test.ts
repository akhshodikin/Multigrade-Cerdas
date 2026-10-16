import { describe, it, expect } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { studentSchema, userSchema } from "@/lib/validations";
import { getGroupIdForClass } from "@/lib/multigrade";

describe("Pengujian Data Guru, Siswa, Relasi Kelompok, & Validasi Zod", () => {
  it("harus memverifikasi peran administrator, kepala sekolah, dan guru", async () => {
    const allUsers = await db.select().from(schema.users);
    
    const admin = allUsers.find((u) => u.role === "admin");
    const headmaster = allUsers.find((u) => u.role === "headmaster");
    const teachers = allUsers.filter((u) => u.role === "teacher");

    expect(admin).toBeDefined();
    expect(headmaster).toBeDefined();
    expect(teachers.length).toBeGreaterThanOrEqual(3);

    // Verifikasi relasi guru pengampu ke 3 kelompok
    const teacherA = teachers.find((t) => t.assignedGroupId === "group-a");
    const teacherB = teachers.find((t) => t.assignedGroupId === "group-b");
    const teacherC = teachers.find((t) => t.assignedGroupId === "group-c");

    expect(teacherA).toBeDefined();
    expect(teacherB).toBeDefined();
    expect(teacherC).toBeDefined();
  });

  it("harus memuat tepat 27 siswa sintetis dengan pembagian kelas asal yang valid", async () => {
    const students = await db.select().from(schema.students).orderBy(asc(schema.students.classId));
    expect(students.length).toBe(27);

    // Hitung per kelas
    const k1 = students.filter((s) => s.classId === 1);
    const k2 = students.filter((s) => s.classId === 2);
    const k3 = students.filter((s) => s.classId === 3);
    const k4 = students.filter((s) => s.classId === 4);
    const k5 = students.filter((s) => s.classId === 5);
    const k6 = students.filter((s) => s.classId === 6);

    expect(k1.length).toBe(4);
    expect(k2.length).toBe(5);
    expect(k3.length).toBe(5);
    expect(k4.length).toBe(4);
    expect(k5.length).toBe(5);
    expect(k6.length).toBe(4);

    // Verifikasi relasi kelas ke kelompok
    k1.forEach((s) => expect(s.groupId).toBe("group-a"));
    k2.forEach((s) => expect(s.groupId).toBe("group-a"));
    k3.forEach((s) => expect(s.groupId).toBe("group-b"));
    k4.forEach((s) => expect(s.groupId).toBe("group-b"));
    k5.forEach((s) => expect(s.groupId).toBe("group-c"));
    k6.forEach((s) => expect(s.groupId).toBe("group-c"));
  });

  it("harus memvalidasi skema data siswa menggunakan Zod dan menolak data cacat", () => {
    // Data valid
    const validData = {
      studentCode: "SDN2-TEST-99",
      displayName: "Siswa Tes",
      fullName: "Siswa Pengujian Sintetis",
      classId: 3,
      groupId: "group-b",
      gender: "L",
      isActive: true,
    };
    const validResult = studentSchema.safeParse(validData);
    expect(validResult.success).toBe(true);

    // Data cacat: kode terlalu pendek
    const invalidCode = { ...validData, studentCode: "X" };
    expect(studentSchema.safeParse(invalidCode).success).toBe(false);

    // Data cacat: kelas di luar 1..6
    const invalidClass = { ...validData, classId: 9 };
    expect(studentSchema.safeParse(invalidClass).success).toBe(false);

    // Data cacat: gender selain L/P
    const invalidGender = { ...validData, gender: "X" };
    expect(studentSchema.safeParse(invalidGender).success).toBe(false);
  });

  it("harus mampu menambah, mengubah, dan memverifikasi persistensi data siswa baru", async () => {
    const testCode = "SDN2-T-999";

    // 1. Tambah siswa uji coba
    const computedGroup = getGroupIdForClass(2);
    const [inserted] = await db
      .insert(schema.students)
      .values({
        studentCode: testCode,
        fullName: "Siswa Uji Persistensi",
        displayName: "Uji",
        classId: 2,
        groupId: computedGroup,
        gender: "P",
        isActive: true,
      })
      .returning();

    expect(inserted.id).toBeDefined();
    expect(inserted.groupId).toBe("group-a");

    // 2. Ambil dari database untuk memastikan persistensi
    const found = await db.select().from(schema.students).where(eq(schema.students.studentCode, testCode));
    expect(found.length).toBe(1);
    expect(found[0].fullName).toBe("Siswa Uji Persistensi");

    // 3. Ubah data siswa (update)
    await db
      .update(schema.students)
      .set({
        fullName: "Siswa Uji Persistensi Diperbarui",
        isActive: false,
      })
      .where(eq(schema.students.id, inserted.id));

    const updated = await db.select().from(schema.students).where(eq(schema.students.id, inserted.id));
    expect(updated[0].fullName).toBe("Siswa Uji Persistensi Diperbarui");
    expect(updated[0].isActive).toBe(false);

    // 4. Bersihkan data uji coba agar tetap tepat 27 siswa
    await db.delete(schema.students).where(eq(schema.students.id, inserted.id));
    const finalCheck = await db.select().from(schema.students).where(eq(schema.students.id, inserted.id));
    expect(finalCheck.length).toBe(0);
  });
});
