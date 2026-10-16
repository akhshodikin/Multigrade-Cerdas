/**
 * Pustaka Ilustrasi SVG Ramah Anak & Konteks Lokal SDN SEDAENG II Tosari.
 * Berfungsi sebagai fallback mandiri (offline-first) jika layanan gambar eksternal tidak aktif,
 * serta mendukung mode cetak Berwarna (Full Color) dan Hitam Putih Hemat Tinta (B&W Eco-Print).
 */

export interface SvgIllustration {
  key: string;
  title: string;
  category: "tanaman" | "alam_tosari" | "numerasi" | "sekolah" | "budaya";
  description: string;
  renderSvg: (mode: "color" | "grayscale" | "bw_eco", size?: number) => string;
}

export const SVG_ILLUSTRATIONS: Record<string, SvgIllustration> = {
  // 1. Kebun Kentang & Wortel Lereng Bromo
  kebun_sayur_tosari: {
    key: "kebun_sayur_tosari",
    title: "Kebun Sayuran Lereng Pegunungan Tosari",
    category: "alam_tosari",
    description: "Lanskap perkebunan terasering lereng Bromo dengan tanaman kentang dan kubis",
    renderSvg: (mode = "color", size = 240) => {
      const isBw = mode === "bw_eco";
      const isGray = mode === "grayscale";

      const skyColor = isBw ? "#ffffff" : isGray ? "#e5e7eb" : "#e0f2fe";
      const mountainFar = isBw ? "#d1d5db" : isGray ? "#9ca3af" : "#93c5fd";
      const mountainNear = isBw ? "#9ca3af" : isGray ? "#6b7280" : "#6ee7b7";
      const fieldColor = isBw ? "#ffffff" : isGray ? "#d1d5db" : "#a7f3d0";
      const plantColor = isBw ? "#111827" : isGray ? "#374151" : "#15803d";
      const strokeColor = isBw ? "#000000" : "#1f2937";

      return `<svg width="${size}" height="${size * 0.6}" viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg" class="rounded-xl border border-stone-200">
        <rect width="300" height="180" fill="${skyColor}" />
        <!-- Matahari / Awan -->
        <circle cx="250" cy="40" r="22" fill="${isBw ? "#ffffff" : isGray ? "#e5e7eb" : "#fef08a"}" stroke="${strokeColor}" stroke-width="${isBw ? 2 : 1.5}" />
        <!-- Gunung Bromo Jauh -->
        <polygon points="20,120 120,40 220,120" fill="${mountainFar}" stroke="${strokeColor}" stroke-width="1.5" />
        <polygon points="140,120 220,55 300,120" fill="${mountainFar}" stroke="${strokeColor}" stroke-width="1.5" />
        <!-- Terasering Lereng -->
        <path d="M0 110 Q 80 90, 160 115 T 300 105 L 300 180 L 0 180 Z" fill="${mountainNear}" stroke="${strokeColor}" stroke-width="1.5" />
        <path d="M0 135 Q 120 125, 200 145 T 300 130 L 300 180 L 0 180 Z" fill="${fieldColor}" stroke="${strokeColor}" stroke-width="1.5" />
        <!-- Sayuran Kentang / Kubis (Ikon Konkret) -->
        <g stroke="${strokeColor}" stroke-width="${isBw ? 2 : 1.5}" fill="${plantColor}">
          <circle cx="50" cy="155" r="9" />
          <circle cx="45" cy="151" r="7" />
          <circle cx="55" cy="151" r="7" />
          <circle cx="110" cy="160" r="10" />
          <circle cx="170" cy="155" r="9" />
          <circle cx="230" cy="162" r="10" />
        </g>
      </svg>`;
    },
  },

  // 2. Sayur Kentang Tosari
  kentang_tosari: {
    key: "kentang_tosari",
    title: "Kentang Segar Tosari",
    category: "tanaman",
    description: "Umbi kentang hasil panen lereng Bromo untuk media hitung",
    renderSvg: (mode = "color", size = 120) => {
      const isBw = mode === "bw_eco";
      const isGray = mode === "grayscale";
      const potatoColor = isBw ? "#ffffff" : isGray ? "#d1d5db" : "#fde047";
      const strokeColor = "#111827";

      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 45 C 20 25, 60 15, 80 35 C 95 50, 85 80, 65 85 C 40 90, 20 75, 25 45 Z" fill="${potatoColor}" stroke="${strokeColor}" stroke-width="2.5" />
        <circle cx="40" cy="38" r="2.5" fill="${strokeColor}" />
        <circle cx="65" cy="45" r="2" fill="${strokeColor}" />
        <circle cx="50" cy="65" r="3" fill="${strokeColor}" />
        <circle cx="70" cy="68" r="2" fill="${strokeColor}" />
      </svg>`;
    },
  },

  // 3. Kubis / Kol Segar Tosari
  kubis_tosari: {
    key: "kubis_tosari",
    title: "Kubis Bulat Tosari",
    category: "tanaman",
    description: "Sayuran kubis bulat khas kebun Sedaeng untuk media literasi dan hitung",
    renderSvg: (mode = "color", size = 120) => {
      const isBw = mode === "bw_eco";
      const isGray = mode === "grayscale";
      const leafColor = isBw ? "#ffffff" : isGray ? "#e5e7eb" : "#86efac";
      const innerLeaf = isBw ? "#ffffff" : isGray ? "#d1d5db" : "#4ade80";
      const strokeColor = "#111827";

      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="52" r="38" fill="${leafColor}" stroke="${strokeColor}" stroke-width="2.5" />
        <path d="M 25 50 Q 50 20, 75 50 Q 50 80, 25 50" fill="${innerLeaf}" stroke="${strokeColor}" stroke-width="2" />
        <path d="M 35 40 Q 50 50, 65 40" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
        <path d="M 38 60 Q 50 50, 62 60" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
      </svg>`;
    },
  },

  // 4. Wortel Manis
  wortel_segar: {
    key: "wortel_segar",
    title: "Wortel Manis Tosari",
    category: "tanaman",
    description: "Wortel oranye segar dengan daun hijau untuk latihan menghitung benda",
    renderSvg: (mode = "color", size = 120) => {
      const isBw = mode === "bw_eco";
      const isGray = mode === "grayscale";
      const carrotColor = isBw ? "#ffffff" : isGray ? "#d1d5db" : "#fb923c";
      const leafColor = isBw ? "#ffffff" : isGray ? "#9ca3af" : "#22c55e";
      const strokeColor = "#111827";

      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Daun -->
        <path d="M50 30 C 45 10, 30 15, 35 25 C 40 10, 50 15, 50 30" fill="${leafColor}" stroke="${strokeColor}" stroke-width="2" />
        <path d="M50 30 C 55 10, 70 15, 65 25 C 60 10, 50 15, 50 30" fill="${leafColor}" stroke="${strokeColor}" stroke-width="2" />
        <!-- Badan Wortel -->
        <path d="M38 32 C 38 32, 62 32, 62 32 C 60 55, 54 85, 50 92 C 46 85, 40 55, 38 32 Z" fill="${carrotColor}" stroke="${strokeColor}" stroke-width="2.5" />
        <!-- Tekstur Goresan -->
        <line x1="42" y1="45" x2="52" y2="45" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
        <line x1="48" y1="58" x2="58" y2="58" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
        <line x1="44" y1="72" x2="54" y2="72" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
      </svg>`;
    },
  },

  // 5. Keranjang Panen Siswa
  keranjang_panen: {
    key: "keranjang_panen",
    title: "Keranjang Panen Hasil Bumi",
    category: "numerasi",
    description: "Keranjang bambu untuk wadah pengelompokan dan operasi hitung",
    renderSvg: (mode = "color", size = 120) => {
      const isBw = mode === "bw_eco";
      const isGray = mode === "grayscale";
      const basketColor = isBw ? "#ffffff" : isGray ? "#e5e7eb" : "#fef08a";
      const strokeColor = "#111827";

      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Gagang -->
        <path d="M30 45 C 30 20, 70 20, 70 45" stroke="${strokeColor}" stroke-width="3" fill="none" />
        <!-- Badan Keranjang -->
        <path d="M20 45 L 80 45 L 72 85 L 28 85 Z" fill="${basketColor}" stroke="${strokeColor}" stroke-width="2.5" />
        <!-- Anyaman -->
        <line x1="25" y1="60" x2="75" y2="60" stroke="${strokeColor}" stroke-width="1.5" />
        <line x1="26" y1="72" x2="74" y2="72" stroke="${strokeColor}" stroke-width="1.5" />
        <line x1="40" y1="45" x2="40" y2="85" stroke="${strokeColor}" stroke-width="1.5" />
        <line x1="60" y1="45" x2="60" y2="85" stroke="${strokeColor}" stroke-width="1.5" />
      </svg>`;
    },
  },

  // 6. Gedung Sekolah SDN SEDAENG II
  sekolah_tosari: {
    key: "sekolah_tosari",
    title: "SDN SEDAENG II Tosari",
    category: "sekolah",
    description: "Gedung sekolah dasar cerdas di atas perbukitan Tosari",
    renderSvg: (mode = "color", size = 200) => {
      const isBw = mode === "bw_eco";
      const isGray = mode === "grayscale";
      const roofColor = isBw ? "#ffffff" : isGray ? "#9ca3af" : "#ef4444";
      const wallColor = isBw ? "#ffffff" : isGray ? "#e5e7eb" : "#f3f4f6";
      const doorColor = isBw ? "#ffffff" : isGray ? "#6b7280" : "#3b82f6";
      const strokeColor = "#111827";

      return `<svg width="${size}" height="${size * 0.7}" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Atap -->
        <polygon points="10,65 100,15 190,65" fill="${roofColor}" stroke="${strokeColor}" stroke-width="2.5" />
        <!-- Dinding Utama -->
        <rect x="30" y="65" width="140" height="65" fill="${wallColor}" stroke="${strokeColor}" stroke-width="2.5" />
        <!-- Pintu -->
        <rect x="85" y="85" width="30" height="45" fill="${doorColor}" stroke="${strokeColor}" stroke-width="2" />
        <!-- Jendela Kiri & Kanan -->
        <rect x="45" y="80" width="25" height="25" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.8" />
        <line x1="57.5" y1="80" x2="57.5" y2="105" stroke="${strokeColor}" stroke-width="1.5" />
        <line x1="45" y1="92.5" x2="70" y2="92.5" stroke="${strokeColor}" stroke-width="1.5" />
        <rect x="130" y="80" width="25" height="25" fill="#ffffff" stroke="${strokeColor}" stroke-width="1.8" />
        <line x1="142.5" y1="80" x2="142.5" y2="105" stroke="${strokeColor}" stroke-width="1.5" />
        <line x1="130" y1="92.5" x2="155" y2="92.5" stroke="${strokeColor}" stroke-width="1.5" />
        <!-- Tiang Bendera -->
        <line x1="20" y1="40" x2="20" y2="130" stroke="${strokeColor}" stroke-width="2.5" />
        <polygon points="20,40 45,50 20,60" fill="${isBw ? "#ffffff" : "#ef4444"}" stroke="${strokeColor}" stroke-width="1.5" />
      </svg>`;
    },
  },
};

/**
 * Mengambil ilustrasi SVG berdasarkan kunci dengan fallback aman
 */
export function getIllustrationSvg(
  key?: string,
  mode: "color" | "grayscale" | "bw_eco" = "color",
  size?: number
): string {
  if (key && SVG_ILLUSTRATIONS[key]) {
    return SVG_ILLUSTRATIONS[key].renderSvg(mode, size);
  }
  // Fallback standar ke kebun sayur tosari
  return SVG_ILLUSTRATIONS.kebun_sayur_tosari.renderSvg(mode, size);
}
