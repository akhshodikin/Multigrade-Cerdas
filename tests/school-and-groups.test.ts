import { describe, it, expect } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getGroupIdForClass } from "@/lib/multigrade";

describe("Pengujian Profil Sekolah, Semester, & Kelompok Multigrade", () => {
  it("harus memuat profil resmi SDN SEDAENG II Tosari", async () => {
    const profile = await db.select().from(schema.schoolProfile).where(eq(schema.schoolProfile.id, 1));
    expect(profile.length).toBe(1);
    expect(profile[0].npsn).toBe("20519000");
    expect(profile[0].name).toBe("SDN SEDAENG II Tosari");
    expect(profile[0].address).toContain("Tosari");
  });

  it("harus memverifikasi 3 kelompok multigrade dan fase Kurikulum Merdeka", async () => {
    const groups = await db.select().from(schema.multigradeGroups).orderBy(asc(schema.multigradeGroups.id));
    expect(groups.length).toBe(3);

    const groupA = groups.find((g) => g.id === "group-a");
    const groupB = groups.find((g) => g.id === "group-b");
    const groupC = groups.find((g) => g.id === "group-c");

    expect(groupA).toBeDefined();
    expect(groupA?.phase).toBe("Fase A");
    expect(groupA?.grades).toBe("1,2");

    expect(groupB).toBeDefined();
    expect(groupB?.phase).toBe("Fase B");
    expect(groupB?.grades).toBe("3,4");

    expect(groupC).toBeDefined();
    expect(groupC?.phase).toBe("Fase C");
    expect(groupC?.grades).toBe("5,6");
  });

  it("harus memverifikasi 6 kelas terpetakan secara konsisten ke 3 kelompok", async () => {
    const classes = await db.select().from(schema.classes).orderBy(asc(schema.classes.id));
    expect(classes.length).toBe(6);

    for (const cls of classes) {
      const computedGroup = getGroupIdForClass(cls.id);
      expect(cls.groupId).toBe(computedGroup);
    }

    expect(getGroupIdForClass(1)).toBe("group-a");
    expect(getGroupIdForClass(2)).toBe("group-a");
    expect(getGroupIdForClass(3)).toBe("group-b");
    expect(getGroupIdForClass(4)).toBe("group-b");
    expect(getGroupIdForClass(5)).toBe("group-c");
    expect(getGroupIdForClass(6)).toBe("group-c");
  });

  it("harus menolak nomor kelas di luar rentang 1 sampai 6", () => {
    expect(() => getGroupIdForClass(0)).toThrow();
    expect(() => getGroupIdForClass(7)).toThrow();
  });

  it("harus memiliki tahun ajaran aktif", async () => {
    const activeTerms = await db.select().from(schema.academicTerms).where(eq(schema.academicTerms.isActive, true));
    expect(activeTerms.length).toBe(1);
    expect(activeTerms[0].year).toBe("2024/2025");
  });
});
