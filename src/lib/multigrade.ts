// Helper konsistensi pemetaan kelas asal ke kelompok multigrade
export function getGroupIdForClass(classId: number): "group-a" | "group-b" | "group-c" {
  if (classId === 1 || classId === 2) return "group-a";
  if (classId === 3 || classId === 4) return "group-b";
  if (classId === 5 || classId === 6) return "group-c";
  throw new Error(`Kelas ${classId} tidak valid. Harus antara kelas 1 sampai 6.`);
}

export function getPhaseForClass(classId: number): "Fase A" | "Fase B" | "Fase C" {
  if (classId === 1 || classId === 2) return "Fase A";
  if (classId === 3 || classId === 4) return "Fase B";
  if (classId === 5 || classId === 6) return "Fase C";
  throw new Error(`Kelas ${classId} tidak valid.`);
}
