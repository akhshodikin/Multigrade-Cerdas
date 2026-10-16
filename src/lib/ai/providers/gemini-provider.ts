import { GoogleGenAI } from "@google/genai";
import { AiProvider } from "../provider-interface";
import {
  IntersectionMappingRequest,
  AiGenerationResult,
  IntersectionMappingResult,
  IntersectionMappingResultSchema,
} from "../types";

export class GeminiProvider implements AiProvider {
  readonly id = "gemini";
  readonly name = "Google Gemini AI (Google AI Studio)";
  readonly defaultModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  async generateIntersectionMapping(
    request: IntersectionMappingRequest
  ): Promise<AiGenerationResult> {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "GEMINI_API_KEY belum dikonfigurasikan di environment server.",
        provider: this.id,
        model: this.defaultModel,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: "0.0000",
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Persiapkan payload aman (bebas PII, hanya ID dan deskripsi kurikulum)
      const sanitizedPayload = {
        kelompok: {
          id: request.groupId,
          nama: request.groupName,
          fase: request.phase,
          kelas: request.classes,
        },
        mataPelajaran: request.subjectName,
        durasiMenit: request.durationMinutes,
        konteksKebutuhanSiswaNonPII: request.studentContext || "Konteks lingkungan agraris SDN Sedaeng II Tosari.",
        tujuanPembelajaranKelasBawah: request.sourceTpsLowerGrade.map((tp) => ({
          id: tp.id,
          kode: tp.code,
          kelas: tp.targetGrade,
          kompetensi: tp.competency,
          lingkupMateri: tp.contentScope,
          deskripsi: tp.description,
        })),
        tujuanPembelajaranKelasAtas: request.sourceTpsHigherGrade.map((tp) => ({
          id: tp.id,
          kode: tp.code,
          kelas: tp.targetGrade,
          kompetensi: tp.competency,
          lingkupMateri: tp.contentScope,
          deskripsi: tp.description,
        })),
        prasyaratTerdaftar: request.prerequisites,
      };

      const systemPrompt = `Anda adalah Pakar Kurikulum Merdeka dan Pedagogi Pembelajaran Kelas Rangkap (Multigrade Teaching) untuk Sekolah Dasar di daerah terpencil (SDN SEDAENG II Tosari, lereng Gunung Bromo).

TUGAS ANDA:
Menganalisis potensi irisan materi antara dua tingkatan kelas dalam satu kelompok multigrade (${request.groupName}) dan memberikan rekomendasi pembelajaran kelas rangkap yang realistis.

ATURAN KRUSIAL PEMBELAJARAN KELAS RANGKAP:
1. JANGAN PERNAH berasumsi bahwa semua TP harus digabung! Penggabungan paksa pada konsep yang tidak sejalan merusak kedalaman pemahaman kognitif siswa.
2. Jika irisan kompetensi dan materi tidak memadai, PILIH STRATEGI "terpisah_paralel" di mana kedua tingkatan kelas belajar topik masing-masing secara bergantian (staggered activities).
3. Hanya gabungkan TP jika memiliki benang merah konsep dasar yang sama (misal: sama-sama konsep bilangan, operasi hitung, atau observasi alam).
4. Gunakan HANYA ID TP yang diberikan dalam input. JANGAN PERNAH mengarang atau membuat ID TP baru!
5. Jangan pernah mengubah teks rumusan CP resmi.
6. Berikan diferensiasi konten, proses, dan produk yang jelas untuk kelas bawah vs kelas atas.
7. Rekomendasikan kegiatan bersama (pembuka/refleksi) dan kegiatan terpisah (bimbingan guru vs tugas mandiri).
8. Sertakan tingkat keyakinan (tinggi/sedang/rendah) beserta disclaimer bahwa guru tetap pemegang keputusan pedagogis tertinggi.

Keluarkan respon HANYA dalam format JSON murni yang sesuai dengan skema JSON berikut tanpa markdown pembungkus tambahan.`;

      const userPrompt = `Analisis irisan materi multigrade berikut:
${JSON.stringify(sanitizedPayload, null, 2)}

Format JSON yang wajib diikuti persis:
{
  "sharedTheme": "Tema kontekstual bersama...",
  "mappingStrategy": "terpadu_sebagian" | "terpisah_paralel" | "terpadu_penuh",
  "strategyRationale": "Alasan pedagogis pemilihan strategi...",
  "sourceTpsSideBySide": [
    {
      "lowerGradeTp": { "id": "...", "code": "...", "grade": 1, "competency": "...", "description": "..." },
      "higherGradeTp": { "id": "...", "code": "...", "grade": 2, "competency": "...", "description": "..." },
      "relationship": "irisan_kuat" | "irisan_lemah" | "tidak_beririsan",
      "relationshipNote": "Analisis keterkaitan konsep..."
    }
  ],
  "mergedTps": [
    {
      "title": "...",
      "lowerGradeTpId": "...",
      "higherGradeTpId": "...",
      "sharedCoreConcept": "...",
      "rationale": "..."
    }
  ],
  "separateTps": [
    {
      "tpId": "...",
      "grade": 1,
      "reasonForSeparation": "...",
      "suggestedSoloActivity": "..."
    }
  ],
  "prerequisitesAnalysis": [
    {
      "tpId": "...",
      "prerequisiteTpId": "...",
      "status": "terpenuhi" | "perlu_penguatan_awal",
      "notes": "..."
    }
  ],
  "recommendedActivities": {
    "sharedOpeningActivity": "Kegiatan pembuka bersama 10-15 menit...",
    "lowerGradeActivity": "Aktivitas terpisah kelas bawah (konkret/bimbingan guru)...",
    "higherGradeActivity": "Aktivitas terpisah kelas atas (mandiri/eksplorasi)...",
    "sharedClosingActivity": "Kegiatan penutup bersama 15-20 menit..."
  },
  "differentiatedOutcomes": {
    "lowerGrade": { "content": "...", "process": "...", "product": "..." },
    "higherGrade": { "content": "...", "process": "...", "product": "..." }
  },
  "assessmentRecommendations": {
    "lowerGradeAssessment": "Rubrik formatif kelas bawah...",
    "higherGradeAssessment": "Rubrik formatif kelas atas...",
    "sharedObservationCriteria": ["Kriteria 1", "Kriteria 2"]
  },
  "mappingBasis": {
    "pedagogicalNotes": "Dasar pertimbangan kurikulum multigrade...",
    "referencedTpIds": ["id1", "id2"],
    "referencedCpElements": ["Elemen 1"]
  },
  "confidence": {
    "level": "tinggi" | "sedang" | "rendah",
    "score": 85,
    "disclaimer": "Tingkat keyakinan AI ini merupakan estimasi pendukung dan tidak menggantikan evaluasi profesional guru SDN Sedaeng II."
  }
}`;

      // Panggil Interactions API dari @google/genai SDK
      const response = await ai.interactions.create({
        model: this.defaultModel,
        input: `${systemPrompt}\n\n${userPrompt}`,
        response_format: { type: "json" },
      });

      const responseText = response.output_text || "";
      let parsedJson: unknown;

      try {
        // Bersihkan formatting markdown jika ada
        const cleanedText = responseText
          .replace(/^```json\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        parsedJson = JSON.parse(cleanedText);
      } catch (jsonErr) {
        return {
          success: false,
          error: `Gagal mem-parsing keluaran AI sebagai JSON: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`,
          provider: this.id,
          model: this.defaultModel,
          promptTokens: response.usage?.total_input_tokens || 0,
          completionTokens: response.usage?.total_output_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          estimatedCostUsd: "0.0001",
          latencyMs: Date.now() - startTime,
        };
      }

      // Validasi ketat menggunakan Zod Schema
      const validated = IntersectionMappingResultSchema.safeParse(parsedJson);
      if (!validated.success) {
        return {
          success: false,
          error: `Struktur JSON AI tidak sesuai skema kurikulum multigrade: ${validated.error.message}`,
          provider: this.id,
          model: this.defaultModel,
          promptTokens: response.usage?.total_input_tokens || 0,
          completionTokens: response.usage?.total_output_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          estimatedCostUsd: "0.0001",
          latencyMs: Date.now() - startTime,
        };
      }

      // Anti-Halusinasi: Verifikasi bahwa semua ID yang dirujuk ada di input
      const validTpIdSet = new Set([
        ...request.sourceTpsLowerGrade.map((t) => t.id),
        ...request.sourceTpsHigherGrade.map((t) => t.id),
      ]);

      const referencedIds = [
        ...validated.data.mergedTps.map((m) => m.lowerGradeTpId),
        ...validated.data.mergedTps.map((m) => m.higherGradeTpId),
        ...validated.data.separateTps.map((s) => s.tpId),
      ];

      const hallucinatedIds = referencedIds.filter((id) => !validTpIdSet.has(id));
      if (hallucinatedIds.length > 0) {
        return {
          success: false,
          error: `Terdeteksi ID Tujuan Pembelajaran tidak dikenal (${hallucinatedIds.join(", ")}). AI tidak diizinkan membuat ID di luar database.`,
          provider: this.id,
          model: this.defaultModel,
          promptTokens: response.usage?.total_input_tokens || 0,
          completionTokens: response.usage?.total_output_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          estimatedCostUsd: "0.0001",
          latencyMs: Date.now() - startTime,
        };
      }

      const promptTokens = response.usage?.total_input_tokens || 800;
      const completionTokens = response.usage?.total_output_tokens || 1200;
      const totalTokens = response.usage?.total_tokens || promptTokens + completionTokens;

      // Estimasi biaya: Flash ($0.10 / 1M prompt, $0.40 / 1M completion)
      const cost = (promptTokens / 1_000_000) * 0.10 + (completionTokens / 1_000_000) * 0.40;

      return {
        success: true,
        data: validated.data,
        provider: this.id,
        model: this.defaultModel,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: cost.toFixed(6),
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Gagal memanggil Google Gemini API: ${err instanceof Error ? err.message : String(err)}`,
        provider: this.id,
        model: this.defaultModel,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: "0.0000",
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
