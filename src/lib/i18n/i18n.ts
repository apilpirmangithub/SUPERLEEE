type Lang = "en" | "id";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  en: {
    // Buttons
    "buttons.register": "Register IP",
    "buttons.browse": "Browse IP",
    "buttons.help": "Help",
    "buttons.uploadFile": "Upload File",
    "buttons.continue": "Continue Registration",
    "buttons.customLicense": "Custom License",
    "buttons.copyDHash": "Copy dHash",
    "buttons.takePhoto": "Take Photo",
    "buttons.submitReview": "Submit for Review",

    // Engine messages
    "greeting.default": "Hello! I am your IP assistant. Upload an image to register, or pick an option below.",
    "greeting.pickAction": "Please choose Register IP to begin, or type: 'browse' / 'search <keyword>'.",
    "upload.prompt": "Okay, upload your IP file.",
    "await.uploadFirst": "Please attach your image first.",
    "search.resultsFor": "Search results for:",
    "open.dashboard": "Open Dashboard",
    "swap.disabled": "We focus on IP registration now. Token swap is disabled.",

    // Prompts
    "prompt.name": "Perfect! What should we call this IP? (Enter a title/name)",
    "prompt.description": "Give me a description of your IP.",
    "ai.suggestsTitle": "AI suggests:",
    "ai.suggestsDesc": "AI suggests:",

    // Plan labels
    "plan.name": "Name:",
    "plan.description": "Description:",
    "plan.license": "License:",

    // PlanBox labels
    "planBox.licenseType": "License Type",
    "planBox.revShare": "Revenue Share (%)",
    "planBox.licenseFee": "License Fee (IP)",
    "planBox.confirm": "Confirm",
    "planBox.cancel": "Cancel",
    "planBox.error": "Error:",
    "planBox.unknownError": "Unknown error",

    // Status
    "status.compressing": "Compressing image...",
    "status.uploadingImage": "Uploading to IPFS...",
    "status.creatingMetadata": "Creating metadata...",
    "status.uploadingMetadata": "Uploading metadata...",
    "status.minting": "Minting NFT & registering IP...",
    "status.success": "IP registered successfully!",
    "status.error": "Registration failed",
  },
  id: {
    // Buttons
    "buttons.register": "Registrasi IP",
    "buttons.browse": "Lihat IP",
    "buttons.help": "Bantuan",
    "buttons.uploadFile": "Unggah Berkas",
    "buttons.continue": "Lanjutkan Registrasi",
    "buttons.customLicense": "Custom License",
    "buttons.copyDHash": "Salin dHash",
    "buttons.takePhoto": "Ambil Foto",
    "buttons.submitReview": "Kirim untuk Review",

    // Engine messages
    "greeting.default": "Halo! Saya asisten IP. Unggah gambar untuk registrasi, atau pilih opsi di bawah.",
    "greeting.pickAction": "Silakan pilih Registrasi IP untuk memulai, atau ketik: 'browse' / 'search <kata>'.",
    "upload.prompt": "Baik, unggah file IP Anda.",
    "await.uploadFirst": "Lampirkan gambar terlebih dulu.",
    "search.resultsFor": "Hasil pencarian untuk:",
    "open.dashboard": "Buka Dashboard",
    "swap.disabled": "Fokus kami kini khusus registrasi IP. Fitur swap token dinonaktifkan.",

    // Prompts
    "prompt.name": "Bagus! Judul IP ini apa? (Masukkan nama)",
    "prompt.description": "Jelaskan IP Anda.",
    "ai.suggestsTitle": "Saran AI:",
    "ai.suggestsDesc": "Saran AI:",

    // Plan labels
    "plan.name": "Nama:",
    "plan.description": "Deskripsi:",
    "plan.license": "Lisensi:",

    // PlanBox labels
    "planBox.licenseType": "Tipe Lisensi",
    "planBox.revShare": "Bagi Hasil (%)",
    "planBox.licenseFee": "Biaya Lisensi (IP)",
    "planBox.confirm": "Konfirmasi",
    "planBox.cancel": "Batal",
    "planBox.error": "Error:",
    "planBox.unknownError": "Error tidak diketahui",

    // Status
    "status.compressing": "Mengompres gambar...",
    "status.uploadingImage": "Unggah ke IPFS...",
    "status.creatingMetadata": "Membuat metadata...",
    "status.uploadingMetadata": "Unggah metadata...",
    "status.minting": "Minting NFT & registrasi IP...",
    "status.success": "IP berhasil diregistrasi!",
    "status.error": "Registrasi gagal",
  }
};

let currentLang: Lang = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_DEFAULT_LANG === 'en') ? 'en' : 'id';

export function getLang(): Lang { return currentLang; }
export function setLang(l: Lang) {
  currentLang = l;
  if (typeof window !== 'undefined') try { localStorage.setItem('appLang', l); } catch {}
}

// Initialize from localStorage if present
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('appLang') as Lang | null;
    if (saved === 'en' || saved === 'id') currentLang = saved;
  } catch {}
}

export function t(key: string): string {
  const dict = translations[currentLang] || translations.id;
  return dict[key] || translations.en[key] || key;
}

export { translations, type Lang, type Dict };
