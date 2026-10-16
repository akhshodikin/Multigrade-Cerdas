import { AiProvider } from "../provider-interface";
import {
  IntersectionMappingRequest,
  AiGenerationResult,
  IntersectionMappingResult,
  IntersectionMappingResultSchema,
} from "../types";

export class MockLocalProvider implements AiProvider {
  readonly id = "mock_local";
  readonly name = "Mesin Heuristik Multigrade Lokal (Offline)";
  readonly defaultModel = "local-heuristic-multigrade-v1";

  async generateIntersectionMapping(
    request: IntersectionMappingRequest
  ): Promise<AiGenerationResult> {
    const startTime = Date.now();

    const lowerTps = request.sourceTpsLowerGrade;
    const higherTps = request.sourceTpsHigherGrade;

    if (lowerTps.length === 0 || higherTps.length === 0) {
      return {
        success: false,
        error: "Dibutuhkan minimal satu TP untuk masing-masing kelas dalam kelompok.",
        provider: this.id,
        model: this.defaultModel,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: "0.0000",
        latencyMs: Date.now() - startTime,
      };
    }

    // Analisis Kesamaan Konseptual & Irisan
    const sideBySideList: IntersectionMappingResult["sourceTpsSideBySide"] = [];
    const mergedList: IntersectionMappingResult["mergedTps"] = [];
    const separateList: IntersectionMappingResult["separateTps"] = [];

    // Helper tokenize sederhana
    const getKeywords = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3);

    for (const lTp of lowerTps) {
      for (const hTp of higherTps) {
        const lWords = new Set(getKeywords(`${lTp.competency} ${lTp.contentScope}`));
        const hWords = getKeywords(`${hTp.competency} ${hTp.contentScope}`);
        const commonWords = hWords.filter((w) => lWords.has(w));

        // Tentukan derajat keterkaitan
        if (commonWords.length >= 2) {
          sideBySideList.push({
            lowerGradeTp: {
              id: lTp.id,
              code: lTp.code,
              grade: lTp.targetGrade,
              competency: lTp.competency,
              description: lTp.description,
            },
            higherGradeTp: {
              id: hTp.id,
              code: hTp.code,
              grade: hTp.targetGrade,
              competency: hTp.competency,
              description: hTp.description,
            },
            relationship: "irisan_kuat",
            relationshipNote: `Terdapat kesamaan domain konsep dasar: [${commonWords.join(", ")}]. Sangat potensial untuk pembelajaran bertingkat terpadu.`,
          });

          mergedList.push({
            title: `Irisan Konsep: ${commonWords.slice(0, 2).join(" & ").toUpperCase()}`,
            lowerGradeTpId: lTp.id,
            higherGradeTpId: hTp.id,
            sharedCoreConcept: `Eksplorasi konsep ${commonWords.join(", ")} dengan tingkat abstraksi berbeda.`,
            rationale: `Siswa Kelas ${lTp.targetGrade} membangun intuisi dasar, sementara siswa Kelas ${hTp.targetGrade} mengembangkannya ke pemecahan masalah formal.`,
          });
        } else if (commonWords.length === 1) {
          sideBySideList.push({
            lowerGradeTp: {
              id: lTp.id,
              code: lTp.code,
              grade: lTp.targetGrade,
              competency: lTp.competency,
              description: lTp.description,
            },
            higherGradeTp: {
              id: hTp.id,
              code: hTp.code,
              grade: hTp.targetGrade,
              competency: hTp.competency,
              description: hTp.description,
            },
            relationship: "irisan_lemah",
            relationshipNote: `Irisan terbatas pada kata kunci [${commonWords[0]}]. Disarankan diajarkan secara terpisah paralel untuk mencegah kebingungan konsep.`,
          });

          separateList.push({
            tpId: lTp.id,
            grade: lTp.targetGrade,
            reasonForSeparation: "Irisan konsep terlalu tipis untuk digabungkan secara efektif.",
            suggestedSoloActivity: "Aktivitas terbimbing langsung dengan lembar kerja terarah.",
          });
          separateList.push({
            tpId: hTp.id,
            grade: hTp.targetGrade,
            reasonForSeparation: "Fokus kompetensi memerlukan pendalaman mandiri.",
            suggestedSoloActivity: "Eksplorasi mandiri atau studi kasus berkelompok.",
          });
        } else {
          sideBySideList.push({
            lowerGradeTp: {
              id: lTp.id,
              code: lTp.code,
              grade: lTp.targetGrade,
              competency: lTp.competency,
              description: lTp.description,
            },
            higherGradeTp: {
              id: hTp.id,
              code: hTp.code,
              grade: hTp.targetGrade,
              competency: hTp.competency,
              description: hTp.description,
            },
            relationship: "tidak_beririsan",
            relationshipNote: "Kompetensi kedua tingkatan kelas berbeda secara substansial. Wajib diajarkan terpisah paralel dalam satu jadwal.",
          });

          // Masukkan ke separate list jika belum ada
          if (!separateList.some((s) => s.tpId === lTp.id)) {
            separateList.push({
              tpId: lTp.id,
              grade: lTp.targetGrade,
              reasonForSeparation: "Tidak memiliki irisan kompetensi yang bermakna dengan materi kelas atas.",
              suggestedSoloActivity: "Praktik terbimbing dengan media manipulatif konkret.",
            });
          }
          if (!separateList.some((s) => s.tpId === hTp.id)) {
            separateList.push({
              tpId: hTp.id,
              grade: hTp.targetGrade,
              reasonForSeparation: "Materi memerlukan konsentrasi analitis tingkat lanjut.",
              suggestedSoloActivity: "Investigasi mandiri dengan panduan lembar kerja terstruktur.",
            });
          }
        }
      }
    }

    // Tentukan Strategi Keseluruhan
    let mappingStrategy: "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh";
    let strategyRationale: string;

    if (mergedList.length > 0 && separateList.length > 0) {
      mappingStrategy = "terpadu_sebagian";
      strategyRationale = `Ditemukan ${mergedList.length} irisan konsep yang kuat untuk kegiatan pembuka dan konsep bersama, namun ${separateList.length} topik wajib didiferensiasikan dalam penugasan terpisah.`;
    } else if (mergedList.length > 0 && separateList.length === 0) {
      mappingStrategy = "terpadu_penuh";
      strategyRationale = "Seluruh TP yang dipilih memiliki benang merah tema dan konsep yang selaras untuk pembelajaran bertingkat.";
    } else {
      mappingStrategy = "terpisah_paralel";
      strategyRationale = "Irisan kompetensi tidak memadai untuk dipadukan. Direkomendasikan model pembelajaran terpisah secara bergantian (*staggered rotation*) dalam satu sesi kelas rangkap.";
    }

    const lowerGrade = request.classes[0] || 1;
    const higherGrade = request.classes[1] || 2;

    const lowerGradeLabel = `Kelas ${lowerGrade}`;
    const higherGradeLabel = `Kelas ${higherGrade}`;

    // Konteks lokal SDN Sedaeng II Tosari
    const sharedTheme = request.studentContext?.includes("pasar")
      ? "Pasar Tradisional Tosari & Transaksi Pertanian"
      : `Eksplorasi Lingkungan Alam & Pertanian Lereng Bromo (${request.subjectName})`;

    // Konstruksi Hasil Terstruktur
    const rawResult: IntersectionMappingResult = {
      sharedTheme,
      mappingStrategy,
      strategyRationale,
      sourceTpsSideBySide: sideBySideList,
      mergedTps: mergedList,
      separateTps: separateList,
      prerequisitesAnalysis: request.prerequisites.map((p) => ({
        tpId: p.tpId,
        prerequisiteTpId: p.prerequisiteTpId,
        status: "terpenuhi" as const,
        notes: "Prasyarat telah diidentifikasi dan terjaga urutannya dalam alur pembelajaran.",
      })),
      recommendedActivities: {
        sharedOpeningActivity: `(15 Menit) Apersepsi bersama menggunakan konteks riil lingkungan Tosari (${sharedTheme}). Guru memantik diskusi pemantik yang dapat direspons oleh kedua kelas.`,
        lowerGradeActivity: `(35 Menit) ${lowerGradeLabel}: Bimbingan langsung dari guru menggunakan media konkret/visual. Siswa berlatih konsep dasar dengan penguatan bertahap.`,
        higherGradeActivity: `(35 Menit) ${higherGradeLabel}: Siswa bekerja secara mandiri atau berpasangan menyelesaikan tantangan pemecahan masalah lanjutan.`,
        sharedClosingActivity: `(20 Menit) Refleksi dan sintesis kelas utuh. Siswa ${lowerGradeLabel} membagikan temuan dasar, disempurnakan oleh siswa ${higherGradeLabel}. Guru memberikan apresiasi dan penguatan.`,
      },
      differentiatedOutcomes: {
        lowerGrade: {
          content: `Konsep dasar terapan konkret sesuai capaian ${lowerGradeLabel}.`,
          process: "Eksplorasi terbimbing dengan pendampingan intensif guru dan bantuan benda manipulatif.",
          product: `Hasil kerja berupa representasi visual, lembar kerja terpandu, atau presentasi lisan sederhana.`,
        },
        higherGrade: {
          content: `Konsep analitis pemecahan masalah sesuai capaian ${higherGradeLabel}.`,
          process: "Investigasi mandiri, perbandingan data, dan penarikan kesimpulan logis.",
          product: `Laporan mini, bagan solusi terstruktur, atau pemodelan matematis/konseptual.`,
        },
      },
      assessmentRecommendations: {
        lowerGradeAssessment: `Asesmen formatif observasi kinerja: Menilai pemahaman konsep dasar dan keaktifan interaksi konkret.`,
        higherGradeAssessment: `Asesmen formatif rubrik unjuk kerja: Menilai ketepatan analisis, kelengkapan solusi, dan kemandirian belajar.`,
        sharedObservationCriteria: [
          "Partisipasi aktif dalam kegiatan pembuka dan diskusi bersama.",
          "Kemampuan berkolaborasi dan menghargai teman sebaya lintas kelas.",
          "Fokus menyelesaikan aktivitas belajar sesuai tingkatannya.",
        ],
      },
      mappingBasis: {
        pedagogicalNotes: `Strategi dirancang khusus untuk pembelajaran multigrade ${request.groupName} (${lowerGradeLabel} & ${higherGradeLabel}) dengan rasio kelas kecil (SDN Sedaeng II Tosari). Menghindari penggabungan paksa pada materi yang berbeda karakter kognitifnya.`,
        referencedTpIds: [...lowerTps.map((t) => t.id), ...higherTps.map((t) => t.id)],
        referencedCpElements: [
          ...new Set([
            ...lowerTps.map((t) => t.cpElement).filter(Boolean),
            ...higherTps.map((t) => t.cpElement).filter(Boolean),
          ]),
        ] as string[],
      },
      confidence: {
        level: mappingStrategy === "terpisah_paralel" ? "tinggi" : "sedang",
        score: mappingStrategy === "terpisah_paralel" ? 92 : 84,
        disclaimer:
          "Tingkat keyakinan sistem ini merupakan estimasi pendukung berbasis kesamaan aturan heuristik kurikulum, bukan pengganti verifikasi profesional pendidik SDN Sedaeng II Tosari. Guru berhak menyunting, menyetujui, atau menolak pemetaan ini.",
      },
    };

    // Validasi ketat menggunakan Zod schema
    const parseResult = IntersectionMappingResultSchema.safeParse(rawResult);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Validasi skema keluaran heuristik gagal: ${parseResult.error.message}`,
        provider: this.id,
        model: this.defaultModel,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: "0.0000",
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      data: parseResult.data,
      provider: this.id,
      model: this.defaultModel,
      promptTokens: 450,
      completionTokens: 620,
      totalTokens: 1070,
      estimatedCostUsd: "0.0000",
      latencyMs: Date.now() - startTime,
    };
  }
}
