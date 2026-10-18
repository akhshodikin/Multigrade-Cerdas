import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnyReportData } from "../types";

/**
 * Menghasilkan Berkas PDF Resmi A4 untuk 10 Tipe Laporan Multigrade
 */
export async function generateReportPdf(data: AnyReportData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. KOP Resmi Sekolah SDN SEDAENG II TOSARI
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PEMERINTAH KABUPATEN PASURUAN", pageWidth / 2, 14, { align: "center" });
  doc.text("DINAS PENDIDIKAN DAN KEBUDAYAAN", pageWidth / 2, 19, { align: "center" });

  doc.setFontSize(13);
  doc.text(data.school.name.toUpperCase(), pageWidth / 2, 25, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `${data.school.address} | NPSN: ${data.school.npsn} | Kontak: ${data.school.phone}`,
    pageWidth / 2,
    30,
    { align: "center" }
  );

  // Garis Ganda Pemisah KOP
  doc.setLineWidth(0.8);
  doc.line(15, 33, pageWidth - 15, 33);
  doc.setLineWidth(0.2);
  doc.line(15, 34, pageWidth - 15, 34);

  // 2. Judul & Metadata Laporan
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.title.toUpperCase(), pageWidth / 2, 42, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(data.subtitle, pageWidth / 2, 47, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Tahun Ajaran: ${data.metadata.academicYear} | Semester: ${data.metadata.semester} | Sumber: ${data.metadata.curriculumSource || "Kurikulum Merdeka"}`,
    15,
    54
  );

  // 3. Persiapan Tabel Konten
  let head: string[][] = [];
  let body: (string | number)[][] = [];

  switch (data.reportType) {
    case "atp_multigrade": {
      head = [["No", "Kode TP", "Tujuan Pembelajaran", "Kls", "JP", "Catatan Rotasi Multigrade"]];
      body = data.items.map((it) => [
        it.sequenceOrder,
        it.tpCode,
        it.tpDescription,
        `Kls ${it.targetGrade}`,
        `${it.allocatedHours} JP`,
        it.multigradeNotes,
      ]);
      break;
    }
    case "irisan_materi": {
      head = [["No", "Langkah", "Mnt", `Aktivitas Kelas ${data.lowerGrade}`, `Aktivitas Kelas ${data.higherGrade}`]];
      body = data.rotationSteps.map((st) => [
        st.stepNumber,
        st.stepName,
        `${st.durationMinutes}'`,
        st.lowerGradeActivity,
        st.higherGradeActivity,
      ]);
      break;
    }
    case "modul_ajar": {
      head = [["No", "Langkah Rotasi", "Mnt", "Peran Guru", "Aktivitas Kls Rendah", "Aktivitas Kls Tinggi"]];
      body = data.rotationSteps.map((st) => [
        st.stepNumber,
        st.stepName,
        `${st.durationMinutes}'`,
        st.teacherRole,
        st.lowerGradeActivity,
        st.higherGradeActivity,
      ]);
      break;
    }
    case "lkpd": {
      head = [["No", "Tipe", "Pertanyaan / Tugas", "Poin"]];
      body = data.questions.map((q) => [
        q.number,
        q.type,
        q.questionText,
        `${q.points} pt`,
      ]);
      break;
    }
    case "jurnal_mengajar": {
      head = [["Tgl", "Kelompok", "Mapel", "TP Diajarkan", "Hadir", "Refleksi & Rencana Guru"]];
      body = data.journals.map((j) => [
        j.date,
        j.groupName,
        j.subjectName,
        `${j.lowerGradeTp}\n${j.higherGradeTp}`,
        `${j.attendance.present} anak`,
        `${j.teacherReflection}\n-> ${j.nextActionPlan}`,
      ]);
      break;
    }
    case "rekap_asesmen": {
      head = [["Asesmen", "Tipe", "Mapel", "Kode TP", "Jml", "Rata2", "Ketercapaian (PB/C/B/SB)"]];
      body = data.sessions.map((s) => [
        s.title,
        s.assessmentType,
        s.subjectName,
        s.tpCode,
        s.totalAssessed,
        s.averageScore,
        `${s.masteryDistribution.perluBimbingan} / ${s.masteryDistribution.cukup} / ${s.masteryDistribution.baik} / ${s.masteryDistribution.sangatBaik}`,
      ]);
      break;
    }
    case "kemajuan_siswa": {
      head = [["Mata Pelajaran", "Kode TP", "Penguasaan", "Nilai", "Bukti Belajar Nyata", "Tindak Lanjut"]];
      body = data.tpRecords.map((r) => [
        r.subjectName,
        r.tpCode,
        r.masteryLevel.replace("_", " ").toUpperCase(),
        r.score !== null ? r.score : "-",
        r.evidence,
        r.followUpType,
      ]);
      break;
    }
    case "ketercapaian_tp": {
      head = [["Mapel", "Fase", "Kls", "Kode TP", "Kompetensi", "Tuntas", "%", "Rekomendasi"]];
      body = data.tpStats.map((t) => [
        t.subjectName,
        t.phase,
        t.grade,
        t.tpCode,
        t.competency,
        `${t.masteredCount}/${t.totalAssessed}`,
        `${t.masteryPercentage}%`,
        t.statusRecommendation,
      ]);
      break;
    }
    case "daftar_tindak_lanjut": {
      head = [["Kategori", "Siswa", "Kls", "Mapel", "Kode TP", "Bukti", "Rencana Tindak Lanjut"]];
      body = [
        ...data.remedialQueue.map((r) => [
          "REMEDIAL",
          `${r.studentName} (${r.studentCode})`,
          r.classId,
          r.subjectName,
          r.tpCode,
          r.evidence,
          r.actionPlan,
        ]),
        ...data.enrichmentQueue.map((e) => [
          "PENGAYAAN",
          `${e.studentName} (${e.studentCode})`,
          e.classId,
          e.subjectName,
          e.tpCode,
          e.evidence,
          e.challengePlan,
        ]),
      ];
      break;
    }
    case "ringkasan_kepala_sekolah": {
      head = [["Kelompok", "Tingkat", "Guru Pengampu", "Jurnal", "Ketuntasan", "Remedial", "Pengayaan"]];
      body = data.groupPerformance.map((gp) => [
        gp.groupName,
        `Kelas ${gp.grades}`,
        gp.leadTeacher,
        gp.totalJournalsLogged,
        `${gp.masteryPercentage}%`,
        `${gp.remedialPendingCount} anak`,
        `${gp.enrichmentCount} anak`,
      ]);
      break;
    }
  }

  // Cetak Tabel menggunakan AutoTable
  autoTable(doc, {
    startY: 57,
    head,
    body,
    theme: "grid",
    headStyles: {
      fillColor: [240, 243, 246],
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: "linebreak",
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    margin: { left: 15, right: 15, bottom: 45 },
    didDrawPage: (hookData) => {
      // Footer Nomor Halaman
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      const str = `${data.school.name} - Hal. ${hookData.pageNumber} / ${doc.getNumberOfPages()}`;
      doc.text(str, pageWidth - 15, pageHeight - 8, { align: "right" });
    },
  });

  // Ambil posisi Y terakhir setelah tabel
  const lastAutoTable = (doc as any).lastAutoTable;
  let finalY = lastAutoTable ? lastAutoTable.finalY + 8 : 180;

  // Jika posisi finalY terlalu dekat dengan bawah halaman, tambahkan halaman baru untuk tanda tangan
  if (finalY > pageHeight - 45) {
    doc.addPage();
    finalY = 25;
  }

  // Jika laporan kemajuan siswa, cetak klausul penafian pedagogis
  if (data.reportType === "kemajuan_siswa") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    doc.text("Catatan Pedagogis Resmi:", 15, finalY);
    finalY += 4;
    doc.setFont("helvetica", "italic");
    const splitText = doc.splitTextToSize(data.nonNumericalMasteryDisclaimer, pageWidth - 30);
    doc.text(splitText, 15, finalY);
    finalY += splitText.length * 4 + 4;
  }

  // 4. Blok Tanda Tangan Pengesahan (Kepala Sekolah & Guru Pengampu)
  if (finalY > pageHeight - 40) {
    doc.addPage();
    finalY = 25;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  // Sisi Kiri: Kepala Sekolah
  doc.text("Mengetahui,", 20, finalY);
  doc.setFont("helvetica", "bold");
  doc.text(data.signature.headmasterTitle, 20, finalY + 4);

  doc.text(data.signature.headmasterName, 20, finalY + 24);
  doc.line(20, finalY + 25, 20 + doc.getTextWidth(data.signature.headmasterName), finalY + 25);
  doc.setFont("helvetica", "normal");
  doc.text(`NIP. ${data.signature.headmasterNip}`, 20, finalY + 29);

  // Sisi Kanan: Guru Pengampu
  const rightX = pageWidth - 75;
  doc.text(`${data.signature.location}, ${data.signature.dateFormatted}`, rightX, finalY);
  doc.setFont("helvetica", "bold");
  doc.text(data.signature.teacherTitle, rightX, finalY + 4);

  doc.text(data.signature.teacherName, rightX, finalY + 24);
  doc.line(rightX, finalY + 25, rightX + doc.getTextWidth(data.signature.teacherName), finalY + 25);
  doc.setFont("helvetica", "normal");
  doc.text(`NIP. ${data.signature.teacherNip}`, rightX, finalY + 29);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
