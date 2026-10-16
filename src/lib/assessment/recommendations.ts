import type { MasteryLevel, FollowUpType } from "./types";

/**
 * Logika Rekomendasi Tindak Lanjut Cerdas Berbasis Bukti Belajar
 * Guru tetap memegang keputusan akhir, AI/heuristik memberikan saran diferensiasi.
 */
export function generateAiSuggestedFollowUp(
  masteryLevel: MasteryLevel,
  learningEvidence: string,
  grade: number,
  subjectName: string
): { followUpType: FollowUpType; suggestionText: string } {
  const evidenceLower = learningEvidence.toLowerCase();

  if (masteryLevel === "perlu_bimbingan") {
    let strategy = "Pendampingan langsung intensif oleh guru pada putaran rotasi berikutnya";
    if (grade <= 2) {
      strategy += " menggunakan benda konkret (kartu gambar/alat hitung kentang/wortel Tosari) untuk memperkuat fondasi visual.";
    } else {
      strategy += " disertai pembedahan kalimat bacaan langkah demi langkah.";
    }

    if (evidenceLower.includes("ragu") || evidenceLower.includes("belum paham") || evidenceLower.includes("sulit")) {
      strategy += " Pasangkan dengan rekan tutor sebaya yang telah tuntas pada aktivitas mandiri.";
    }

    return {
      followUpType: "remedial_terbimbing",
      suggestionText: strategy,
    };
  }

  if (masteryLevel === "cukup") {
    return {
      followUpType: "remedial_tutor_sebaya",
      suggestionText: `Berikan 2-3 latihan konfirmasi pemahaman mandiri pada LKPD sebelum melangkah ke TP berikutnya pada alur ATP ${subjectName}.`,
    };
  }

  if (masteryLevel === "baik") {
    return {
      followUpType: "tidak_perlu",
      suggestionText: `Kompetensi TP telah tercapai dengan baik secara mandiri. Siap melanjutkan ke Tujuan Pembelajaran berikutnya pada semester berjalan.`,
    };
  }

  // Sangat Baik
  let enrichment = "Diberikan tantangan soal penalaran tingkat tinggi (HOTS) berbasis studi kasus perkebunan lereng Bromo";
  if (grade >= 2) {
    enrichment += ", atau ditugaskan menjadi tutor sebaya yang mendampingi teman kelompok belajarnya.";
  }

  return {
    followUpType: "pengayaan_eksploratif",
    suggestionText: enrichment,
  };
}
