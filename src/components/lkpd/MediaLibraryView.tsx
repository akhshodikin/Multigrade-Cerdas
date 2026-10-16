"use client";

import React, { useState } from "react";
import { getIllustrationSvg } from "@/lib/lkpd-media/svg-illustrations";
import Link from "next/link";

interface MediaLibraryViewProps {
  initialItems: any[];
  subjects: any[];
  groups: any[];
}

export function MediaLibraryView({ initialItems, subjects, groups }: MediaLibraryViewProps) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [selectedType, setSelectedType] = useState<string>("semua");
  const [selectedPhase, setSelectedPhase] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [colorMode, setColorMode] = useState<"color" | "bw_eco">("color");

  // State modal preview
  const [activeMediaItem, setActiveMediaItem] = useState<any | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  const filteredItems = items.filter((item) => {
    if (selectedType !== "semua" && item.mediaType !== selectedType) return false;
    if (selectedPhase !== "semua" && item.phase !== selectedPhase) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      return matchTitle || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-stone-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider">
              Perpustakaan Media
            </span>
            <span className="text-xs text-teal-200">SDN SEDAENG II Tosari</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Media Pembelajaran Multigrade</h1>
          <p className="text-sm text-teal-100 mt-1 max-w-xl">
            Kumpulan aset belajar ramah anak dan kearifan lokal Tosari yang dapat digunakan kembali:
            kartu gambar, bahan bacaan bertingkat, media numerasi, presentasi, dan ilustrasi SVG.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/kurikulum/lkpd/baru"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-900 rounded-xl text-xs font-black transition shadow-sm flex items-center gap-1.5"
          >
            <span>✨</span> Buat LKPD & Media Baru
          </Link>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
        {/* Tipe Media Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: "semua", label: "Semua Media" },
            { id: "kartu_gambar", label: "🃏 Kartu Gambar & Aktivitas" },
            { id: "bacaan_bertingkat", label: "📚 Bacaan Bertingkat" },
            { id: "media_literasi_numerasi", label: "🔢 Literasi & Numerasi" },
            { id: "presentasi", label: "📽️ Presentasi Pembelajaran" },
            { id: "ilustrasi_pendukung", label: "🎨 Ilustrasi Vektor SVG" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                selectedType === tab.id
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Phase Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari media, topik, atau kata kunci..."
              className="w-full text-xs border rounded-xl pl-8 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 bg-stone-50"
            />
            <span className="absolute left-2.5 top-2 text-stone-400 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-stone-500">Fase:</span>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 bg-stone-50"
              >
                <option value="semua">Semua Fase</option>
                <option value="Fase A">Fase A (Kls 1-2)</option>
                <option value="Fase B">Fase B (Kls 3-4)</option>
                <option value="Fase C">Fase C (Kls 5-6)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs bg-stone-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setColorMode("color")}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  colorMode === "color" ? "bg-white text-emerald-800 shadow-xs" : "text-stone-600"
                }`}
              >
                Warna
              </button>
              <button
                type="button"
                onClick={() => setColorMode("bw_eco")}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  colorMode === "bw_eco" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                }`}
              >
                B&W Eco
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Koleksi Media */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <span className="text-4xl">📁</span>
          <h3 className="text-base font-bold text-stone-800">Tidak ada media yang cocok</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Gunakan tombol &quot;Buat LKPD & Media Baru&quot; untuk menghasilkan media pembelajaran
            otomatis berbasis modul ajar dan kurikulum Merdeka.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isCards = item.mediaType === "kartu_gambar" || item.mediaType === "kartu_aktivitas";
            const isReading = item.mediaType === "bacaan_bertingkat";
            const isSlides = item.mediaType === "presentasi";
            const isNumeracy = item.mediaType === "media_literasi_numerasi";
            const isSvg = item.mediaType === "ilustrasi_pendukung";

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 ${
                  colorMode === "bw_eco" ? "filter grayscale" : ""
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      {item.mediaType.replace("_", " ")}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500">{item.phase}</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900 tracking-tight leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Cuplikan Visual */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 min-h-[90px] flex items-center justify-center">
                  {isCards && (
                    <div className="flex gap-2 justify-center items-center">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: getIllustrationSvg("kentang_tosari", colorMode, 48),
                        }}
                      />
                      <div
                        dangerouslySetInnerHTML={{
                          __html: getIllustrationSvg("kubis_tosari", colorMode, 48),
                        }}
                      />
                      <div
                        dangerouslySetInnerHTML={{
                          __html: getIllustrationSvg("wortel_segar", colorMode, 48),
                        }}
                      />
                    </div>
                  )}

                  {isReading && (
                    <div className="text-center text-xs space-y-1">
                      <span className="text-lg">📖</span>
                      <p className="font-bold text-stone-800">
                        {(item.contentData as any)?.passages?.length || 2} Jenjang Tingkat Membaca
                      </p>
                      <p className="text-[10px] text-stone-500">Tingkat Dasar &bull; Tingkat Mandiri</p>
                    </div>
                  )}

                  {isSlides && (
                    <div className="text-center text-xs space-y-1">
                      <span className="text-lg">📽️</span>
                      <p className="font-bold text-stone-800">
                        {(item.contentData as any)?.slides?.length || 5} Slide Tayangan Kelas
                      </p>
                      <p className="text-[10px] text-stone-500">Apersepsi &bull; Inti &bull; Refleksi</p>
                    </div>
                  )}

                  {isNumeracy && (
                    <div className="text-center text-xs space-y-1">
                      <span className="text-lg">🔢</span>
                      <p className="font-bold text-stone-800">Konteks Pasar Sayur Sedaeng</p>
                      <p className="text-[10px] text-stone-500">
                        {(item.contentData as any)?.mathProblems?.length || 3} Tantangan Hitung Kontekstual
                      </p>
                    </div>
                  )}

                  {isSvg && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: getIllustrationSvg("kebun_sayur_tosari", colorMode, 120),
                      }}
                    />
                  )}
                </div>

                {/* Footer Kartu & Tombol Aksi */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <span className="text-stone-400 font-medium">
                    {item.subjectName || "Umum SD"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaItem(item);
                      setActiveSlideIndex(0);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition shadow-xs"
                  >
                    Buka Media
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Penampil Media Interaktif */}
      {activeMediaItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            className={`bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto ${
              colorMode === "bw_eco" ? "filter grayscale" : ""
            }`}
          >
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {activeMediaItem.mediaType.replace("_", " ")}
                </span>
                <h3 className="text-lg font-bold text-stone-900 mt-1">{activeMediaItem.title}</h3>
                <p className="text-xs text-stone-500">{activeMediaItem.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaItem(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Content: Kartu Gambar */}
            {(activeMediaItem.mediaType === "kartu_gambar" ||
              activeMediaItem.mediaType === "kartu_aktivitas") && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {((activeMediaItem.contentData as any)?.cards || []).map((card: any) => (
                    <div
                      key={card.id}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-2 shadow-xs"
                    >
                      <div
                        className="flex justify-center"
                        dangerouslySetInnerHTML={{
                          __html: getIllustrationSvg(card.illustrationKey, colorMode, 80),
                        }}
                      />
                      <div>
                        <strong className="text-xs text-stone-900 block">{card.title}</strong>
                        <span className="text-[10px] text-stone-500 block">{card.subtitle}</span>
                      </div>
                      <div className="p-1.5 bg-white rounded border border-stone-200 text-[11px] font-semibold text-emerald-800">
                        {card.wordGrade1 || card.prompt}
                      </div>
                      {card.sentenceGrade2 && (
                        <p className="text-[10px] text-stone-600 italic leading-snug">
                          &quot;{card.sentenceGrade2}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Content: Bahan Bacaan Bertingkat */}
            {activeMediaItem.mediaType === "bacaan_bertingkat" && (
              <div className="space-y-4">
                {((activeMediaItem.contentData as any)?.passages || []).map((pass: any, i: number) => (
                  <div key={i} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {pass.levelLabel} &bull; {pass.wordCount} Kata
                      </span>
                      <strong className="text-sm text-stone-900">{pass.title}</strong>
                    </div>
                    <p className="text-xs text-stone-800 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-stone-200">
                      {pass.textContent}
                    </p>
                    {pass.vocabulary && (
                      <div className="text-[11px] text-stone-600 pt-1">
                        <strong>Kosakata:</strong>{" "}
                        {pass.vocabulary.map((v: any) => `${v.word} (${v.meaning})`).join(" &bull; ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modal Content: Presentasi Pembelajaran */}
            {activeMediaItem.mediaType === "presentasi" && (
              <div className="space-y-4">
                {(() => {
                  const slides = (activeMediaItem.contentData as any)?.slides || [];
                  const curSlide = slides[activeSlideIndex] || slides[0];

                  return (
                    <div className="space-y-4">
                      {/* Layar Slide Utama */}
                      <div className="bg-stone-900 text-white rounded-2xl p-6 min-h-[220px] flex flex-col justify-between shadow-lg">
                        <div className="flex justify-between items-center text-xs text-stone-400">
                          <span>
                            Slide {activeSlideIndex + 1} dari {slides.length}
                          </span>
                          <span>SDN SEDAENG II TOSARI</span>
                        </div>
                        <div className="space-y-2 py-4">
                          <h4 className="text-xl font-black text-amber-300">{curSlide?.title}</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-stone-200">
                            {(curSlide?.bulletPoints || []).map((bp: string, i: number) => (
                              <li key={i}>{bp}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-stone-800">
                          <button
                            type="button"
                            onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                            disabled={activeSlideIndex === 0}
                            className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-xs rounded-lg disabled:opacity-40"
                          >
                            &larr; Slide Sebelumnya
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
                            }
                            disabled={activeSlideIndex === slides.length - 1}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg disabled:opacity-40"
                          >
                            Slide Berikutnya &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Naskah / Arahan Guru */}
                      {curSlide?.teacherScript && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950">
                          <strong>🎙️ Catatan & Arahan Lisan Guru:</strong> &quot;{curSlide.teacherScript}&quot;
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Content: Media Literasi & Numerasi */}
            {activeMediaItem.mediaType === "media_literasi_numerasi" && (
              <div className="space-y-4">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                  <h4 className="text-sm font-bold text-stone-900">
                    {(activeMediaItem.contentData as any)?.scenarioTitle}
                  </h4>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {(activeMediaItem.contentData as any)?.contextStory}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {((activeMediaItem.contentData as any)?.visualElements || []).map(
                      (v: any, i: number) => (
                        <div key={i} className="p-2 bg-white rounded-lg border text-center text-xs">
                          <strong className="block text-emerald-800">{v.label}</strong>
                          <span className="text-stone-600">
                            {v.count} {v.unit}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-stone-900 uppercase">Tantangan Soal Numerasi:</h5>
                  {((activeMediaItem.contentData as any)?.mathProblems || []).map((p: any, i: number) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-stone-200 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-stone-900">
                        <span>Tantangan {i + 1} (Tingkat: {p.difficulty})</span>
                        <span className="text-emerald-700">Target Kelas {p.targetGrade}</span>
                      </div>
                      <p className="text-stone-800">{p.problemText}</p>
                      <p className="text-[11px] text-stone-500 italic">💡 Petunjuk: {p.guidanceHint}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-stone-400">
                Media siap cetak dan dipakai di kelas rangkap
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold"
              >
                🖨️ Cetak Lembar Media
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
