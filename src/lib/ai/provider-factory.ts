import { AiProvider } from "./provider-interface";
import { GeminiProvider } from "./providers/gemini-provider";
import { MockLocalProvider } from "./providers/mock-local-provider";

export interface ProviderInfo {
  id: string;
  name: string;
  isAvailable: boolean;
  isCloud: boolean;
  description: string;
}

export function getAvailableProviders(): ProviderInfo[] {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

  return [
    {
      id: "gemini",
      name: "Google Gemini (Google AI Studio)",
      isAvailable: hasGeminiKey,
      isCloud: true,
      description: hasGeminiKey
        ? "Model gemini-3.8-flash mutakhir dengan penalaran kurikuler mendalam."
        : "Kunci API GEMINI_API_KEY belum dikonfigurasi di server.",
    },
    {
      id: "mock_local",
      name: "Mesin Heuristik Multigrade Tosari (Offline)",
      isAvailable: true,
      isCloud: false,
      description: "Mesin penalaran berbasis aturan lokal tanpa memerlukan koneksi internet.",
    },
  ];
}

export function getAiProvider(preferredProvider?: string): AiProvider {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

  if (preferredProvider === "gemini") {
    if (!hasGeminiKey) {
      // Fallback to mock local if gemini requested but no API key configured
      return new MockLocalProvider();
    }
    return new GeminiProvider();
  }

  if (preferredProvider === "mock_local") {
    return new MockLocalProvider();
  }

  // Auto mode
  if (hasGeminiKey) {
    return new GeminiProvider();
  }

  return new MockLocalProvider();
}
