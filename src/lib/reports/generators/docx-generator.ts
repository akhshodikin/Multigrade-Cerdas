import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageNumber,
  Footer,
} from "docx";
import type { AnyReportData } from "../types";

const borderNone = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const borderThin = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
};

/**
 * Menghasilkan Berkas Word Dokumen (.docx) Resmi untuk 10 Tipe Laporan Multigrade
 */
export async function generateReportDocx(data: AnyReportData): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // 1. KOP Resmi Sekolah SDN Kandangan I Tosari
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "PEMERINTAH KABUPATEN PASURUAN",
          bold: true,
          size: 22, // 11pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
          bold: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: data.school.name.toUpperCase(),
          bold: true,
          size: 26, // 13pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${data.school.address} | NPSN: ${data.school.npsn} | Kontak: ${data.school.phone}`,
          size: 18,
          italics: true,
        }),
      ],
    }),
    // Garis Pemisah KOP
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000" },
      },
      spacing: { after: 200 },
    })
  );

  // 2. Judul & Metadata Laporan
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: data.title.toUpperCase(),
          bold: true,
          size: 24, // 12pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: data.subtitle,
          italics: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `Tahun Ajaran: ${data.metadata.academicYear} | Semester: ${data.metadata.semester} | Sumber: ${data.metadata.curriculumSource || "Kurikulum Merdeka"}`,
          size: 18,
          bold: true,
        }),
      ],
    })
  );

  // 3. Tabel Konten Berdasarkan Tipe Laporan
  let headers: string[] = [];
  let rowsData: string[][] = [];

  switch (data.reportType) {
    case "atp_multigrade": {
      headers = ["No", "Kode TP", "Tujuan Pembelajaran", "Kls", "JP", "Catatan Rotasi Multigrade"];
      rowsData = data.items.map((it) => [
        String(it.sequenceOrder),
        it.tpCode,
        it.tpDescription,
        `Kls ${it.targetGrade}`,
        `${it.allocatedHours} JP`,
        it.multigradeNotes,
      ]);
      break;
    }
    case "irisan_materi": {
      headers = ["No", "Langkah", "Mnt", `Aktivitas Kelas ${data.lowerGrade}`, `Aktivitas Kelas ${data.higherGrade}`];
      rowsData = data.rotationSteps.map((st) => [
        String(st.stepNumber),
        st.stepName,
        `${st.durationMinutes}'`,
        st.lowerGradeActivity,
        st.higherGradeActivity,
      ]);
      break;
    }
    case "modul_ajar": {
      headers = ["No", "Langkah Rotasi", "Mnt", "Peran Guru", "Aktivitas Siswa Kls Rendah", "Aktivitas Siswa Kls Tinggi"];
      rowsData = data.rotationSteps.map((st) => [
        String(st.stepNumber),
        st.stepName,
        `${st.durationMinutes}'`,
        st.teacherRole,
        st.lowerGradeActivity,
        st.higherGradeActivity,
      ]);
      break;
    }
    case "lkpd": {
      headers = ["No", "Tipe", "Pertanyaan / Instruksi Kerja", "Poin"];
      rowsData = data.questions.map((q) => [
        String(q.number),
        q.type,
        q.questionText,
        `${q.points} pt`,
      ]);
      break;
    }
    case "jurnal_mengajar": {
      headers = ["Tgl", "Kelompok", "Mapel", "TP Diajarkan", "Hadir", "Refleksi & Tindak Lanjut Guru"];
      rowsData = data.journals.map((j) => [
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
      headers = ["Asesmen", "Tipe", "Mapel", "Kode TP", "Jml", "Rata2", "Ketercapaian (PB/C/B/SB)"];
      rowsData = data.sessions.map((s) => [
        s.title,
        s.assessmentType,
        s.subjectName,
        s.tpCode,
        String(s.totalAssessed),
        String(s.averageScore),
        `${s.masteryDistribution.perluBimbingan} / ${s.masteryDistribution.cukup} / ${s.masteryDistribution.baik} / ${s.masteryDistribution.sangatBaik}`,
      ]);
      break;
    }
    case "kemajuan_siswa": {
      headers = ["Mata Pelajaran", "Kode TP", "Tingkat Penguasaan", "Nilai", "Bukti Belajar Nyata", "Tindak Lanjut"];
      rowsData = data.tpRecords.map((r) => [
        r.subjectName,
        r.tpCode,
        r.masteryLevel.replace("_", " ").toUpperCase(),
        r.score !== null ? String(r.score) : "-",
        r.evidence,
        r.followUpType,
      ]);
      break;
    }
    case "ketercapaian_tp": {
      headers = ["Mapel", "Fase", "Kls", "Kode TP", "Kompetensi", "Tuntas", "%", "Rekomendasi"];
      rowsData = data.tpStats.map((t) => [
        t.subjectName,
        t.phase,
        String(t.grade),
        t.tpCode,
        t.competency,
        `${t.masteredCount}/${t.totalAssessed}`,
        `${t.masteryPercentage}%`,
        t.statusRecommendation,
      ]);
      break;
    }
    case "daftar_tindak_lanjut": {
      headers = ["Tipe", "Siswa", "Kls", "Mapel", "Kode TP", "Bukti Belajar", "Rencana Tindak Lanjut"];
      rowsData = [
        ...data.remedialQueue.map((r) => [
          "REMEDIAL",
          `${r.studentName} (${r.studentCode})`,
          String(r.classId),
          r.subjectName,
          r.tpCode,
          r.evidence,
          r.actionPlan,
        ]),
        ...data.enrichmentQueue.map((e) => [
          "PENGAYAAN",
          `${e.studentName} (${e.studentCode})`,
          String(e.classId),
          e.subjectName,
          e.tpCode,
          e.evidence,
          e.challengePlan,
        ]),
      ];
      break;
    }
    case "ringkasan_kepala_sekolah": {
      headers = ["Kelompok", "Tingkat", "Guru Pengampu", "Total Jurnal", "Ketuntasan", "Remedial", "Pengayaan"];
      rowsData = data.groupPerformance.map((gp) => [
        gp.groupName,
        `Kelas ${gp.grades}`,
        gp.leadTeacher,
        String(gp.totalJournalsLogged),
        `${gp.masteryPercentage}%`,
        `${gp.remedialPendingCount} anak`,
        `${gp.enrichmentCount} anak`,
      ]);
      break;
    }
  }

  // Buat tabel DOCX
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          borders: borderThin,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, bold: true, size: 18 })],
            }),
          ],
        })
    ),
  });

  const contentRows = rowsData.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              borders: borderThin,
              children: cell
                .split("\n")
                .map((line) => new Paragraph({ children: [new TextRun({ text: line, size: 18 })] })),
            })
        ),
      })
  );

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...contentRows],
  });

  children.push(mainTable);

  // Jika laporan kemajuan siswa, sertakan catatan invarian pedagogis
  if (data.reportType === "kemajuan_siswa") {
    children.push(
      new Paragraph({
        spacing: { before: 180, after: 120 },
        children: [
          new TextRun({
            text: "Catatan Pedagogis Resmi:",
            bold: true,
            size: 18,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: data.nonNumericalMasteryDisclaimer,
            italics: true,
            size: 18,
          }),
        ],
      })
    );
  }

  // 4. Blok Tanda Tangan Pengesahan (Tabel 2 Kolom tanpa border)
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: borderNone,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: "Mengetahui,", size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: data.signature.headmasterTitle, bold: true, size: 18 })] }),
              new Paragraph({ spacing: { before: 800 }, children: [] }), // Jarak tanda tangan
              new Paragraph({ children: [new TextRun({ text: data.signature.headmasterName, bold: true, underline: {}, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: `NIP. ${data.signature.headmasterNip}`, size: 18 })] }),
            ],
          }),
          new TableCell({
            borders: borderNone,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: `${data.signature.location}, ${data.signature.dateFormatted}`, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: data.signature.teacherTitle, bold: true, size: 18 })] }),
              new Paragraph({ spacing: { before: 800 }, children: [] }), // Jarak tanda tangan
              new Paragraph({ children: [new TextRun({ text: data.signature.teacherName, bold: true, underline: {}, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: `NIP. ${data.signature.teacherNip}`, size: 18 })] }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(
    new Paragraph({ spacing: { before: 240 } }),
    signatureTable
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 Portrait width in twips (210mm)
              height: 16838, // A4 Portrait height in twips (297mm)
            },
            margin: {
              top: 1134, // 20mm
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${data.school.name} - Hal. `, size: 16, italics: true }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
