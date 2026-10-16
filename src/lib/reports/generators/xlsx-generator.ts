import * as XLSX from "xlsx";
import type { AnyReportData } from "../types";

/**
 * Menghasilkan Berkas Excel Spreadsheet (.xlsx) untuk 10 Tipe Laporan Multigrade
 */
export async function generateReportXlsx(data: AnyReportData): Promise<Buffer> {
  const wb = XLSX.utils.book_new();

  const kopRows: (string | number)[][] = [
    [data.school.name.toUpperCase()],
    [`NPSN: ${data.school.npsn} | Alamat: ${data.school.address}`],
    [`Kontak: ${data.school.phone} | Email: ${data.school.email}`],
    ["----------------------------------------------------------------------------------------------------------------"],
    [data.title],
    [data.subtitle],
    [`Tahun Ajaran: ${data.metadata.academicYear} | Semester: ${data.metadata.semester} | Diterbitkan: ${data.metadata.generatedAt}`],
    [],
  ];

  let tableHeader: string[] = [];
  let tableRows: (string | number)[][] = [];

  switch (data.reportType) {
    case "atp_multigrade": {
      tableHeader = ["No", "Kode TP", "Deskripsi Tujuan Pembelajaran", "Target Kls", "Alokasi JP", "Semester", "Catatan Rotasi Multigrade"];
      tableRows = data.items.map((it) => [
        it.sequenceOrder,
        it.tpCode,
        it.tpDescription,
        `Kelas ${it.targetGrade}`,
        it.allocatedHours,
        it.semester,
        it.multigradeNotes,
      ]);
      break;
    }
    case "irisan_materi": {
      tableHeader = ["No", "Langkah Pembelajaran", "Durasi (Mnt)", `Aktivitas Kelas ${data.lowerGrade}`, `Aktivitas Kelas ${data.higherGrade}`];
      tableRows = data.rotationSteps.map((st) => [
        st.stepNumber,
        st.stepName,
        st.durationMinutes,
        st.lowerGradeActivity,
        st.higherGradeActivity,
      ]);
      break;
    }
    case "modul_ajar": {
      tableHeader = ["No", "Langkah Pembelajaran", "Durasi (Mnt)", "Peran Guru", "Aktivitas Siswa Kls Rendah", "Aktivitas Siswa Kls Tinggi"];
      tableRows = data.rotationSteps.map((st) => [
        st.stepNumber,
        st.stepName,
        st.durationMinutes,
        st.teacherRole,
        st.lowerGradeActivity,
        st.higherGradeActivity,
      ]);
      break;
    }
    case "lkpd": {
      tableHeader = ["No Soal", "Tipe Pertanyaan", "Teks Soal / Instruksi", "Bobot Poin"];
      tableRows = data.questions.map((q) => [
        q.number,
        q.type,
        q.questionText,
        q.points,
      ]);
      break;
    }
    case "jurnal_mengajar": {
      tableHeader = ["Tanggal", "Kelompok", "Mapel", "Tingkatan", "TP Kls Rendah", "TP Kls Tinggi", "Hadir", "Sakit/Izin/Alpa", "Refleksi Guru", "Tindak Lanjut"];
      tableRows = data.journals.map((j) => [
        j.date,
        j.groupName,
        j.subjectName,
        j.grades,
        j.lowerGradeTp,
        j.higherGradeTp,
        j.attendance.present,
        `${j.attendance.sick}/${j.attendance.permit}/${j.attendance.absent}`,
        j.teacherReflection,
        j.nextActionPlan,
      ]);
      break;
    }
    case "rekap_asesmen": {
      tableHeader = ["Judul Asesmen", "Tipe", "Instrumen", "Mapel", "Sasaran", "Kode TP", "Tgl", "Total Siswa", "Rata-rata", "Perlu Bimbingan", "Cukup", "Baik", "Sangat Baik"];
      tableRows = data.sessions.map((s) => [
        s.title,
        s.assessmentType,
        s.instrumentType,
        s.subjectName,
        s.grades,
        s.tpCode,
        s.date,
        s.totalAssessed,
        s.averageScore,
        s.masteryDistribution.perluBimbingan,
        s.masteryDistribution.cukup,
        s.masteryDistribution.baik,
        s.masteryDistribution.sangatBaik,
      ]);
      break;
    }
    case "kemajuan_siswa": {
      tableHeader = ["Mata Pelajaran", "Kode TP", "Tingkat Penguasaan", "Nilai", "Bukti Belajar Nyata", "Tindak Lanjut", "Status Selesai"];
      tableRows = data.tpRecords.map((r) => [
        r.subjectName,
        r.tpCode,
        r.masteryLevel.replace("_", " ").toUpperCase(),
        r.score !== null ? r.score : "-",
        r.evidence,
        r.followUpType,
        r.followUpCompleted ? "Selesai" : "Aktif",
      ]);
      break;
    }
    case "ketercapaian_tp": {
      tableHeader = ["Mapel", "Fase", "Kelas", "Kode TP", "Rumusan Kompetensi", "Total Dinilai", "Tuntas", "Persentase (%)", "Rekomendasi Pedagogis"];
      tableRows = data.tpStats.map((t) => [
        t.subjectName,
        t.phase,
        `Kelas ${t.grade}`,
        t.tpCode,
        t.competency,
        t.totalAssessed,
        t.masteredCount,
        `${t.masteryPercentage}%`,
        t.statusRecommendation,
      ]);
      break;
    }
    case "daftar_tindak_lanjut": {
      tableHeader = ["Kategori", "Kode Siswa", "Nama Siswa", "Kelas", "Mapel", "Kode TP", "Bukti Kebutuhan", "Rencana Tindak Lanjut", "Status"];
      tableRows = [
        ...data.remedialQueue.map((r) => [
          "REMEDIAL",
          r.studentCode,
          r.studentName,
          `Kelas ${r.classId}`,
          r.subjectName,
          r.tpCode,
          r.evidence,
          r.actionPlan,
          r.isCompleted ? "Selesai" : "Belum Selesai",
        ]),
        ...data.enrichmentQueue.map((e) => [
          "PENGAYAAN",
          e.studentCode,
          e.studentName,
          `Kelas ${e.classId}`,
          e.subjectName,
          e.tpCode,
          e.evidence,
          e.challengePlan,
          e.isCompleted ? "Selesai" : "Belum Selesai",
        ]),
      ];
      break;
    }
    case "ringkasan_kepala_sekolah": {
      tableHeader = ["Kelompok Belajar", "Tingkatan", "Guru Pengampu", "Total Jurnal", "Jumlah TP Dinilai", "Ketuntasan (%)", "Antrean Remedial", "Antrean Pengayaan"];
      tableRows = data.groupPerformance.map((gp) => [
        gp.groupName,
        `Kelas ${gp.grades}`,
        gp.leadTeacher,
        gp.totalJournalsLogged,
        gp.assessedTpCount,
        `${gp.masteryPercentage}%`,
        gp.remedialPendingCount,
        gp.enrichmentCount,
      ]);
      break;
    }
  }

  const signatureRows: (string | number)[][] = [
    [],
    [],
    ["Mengetahui,", "", "", "", "", `${data.signature.location}, ${data.signature.dateFormatted}`],
    [data.signature.headmasterTitle, "", "", "", "", data.signature.teacherTitle],
    [],
    [],
    [],
    [data.signature.headmasterName, "", "", "", "", data.signature.teacherName],
    [`NIP. ${data.signature.headmasterNip}`, "", "", "", "", `NIP. ${data.signature.teacherNip}`],
  ];

  const fullSheetData = [...kopRows, tableHeader, ...tableRows, ...signatureRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Atur lebar kolom default
  ws["!cols"] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Laporan Multigrade");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
