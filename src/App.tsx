import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BadgeInfo,
  Calendar,
  Camera,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  Layers,
  PlayCircle,
  RefreshCw,
  Text,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type TextAlign = "left" | "center" | "right";

type FormItem = {
  title: string;
  info: string;
  url: string;
  icon: LucideIcon;
};

type ToastMessage = {
  id: number;
  text: string;
};

const DISPLAY_URL = "https://display-beryl.vercel.app/";
const BG_IMAGE =
  "https://images.unsplash.com/photo-1564485377539-4af72d1f1b16?auto=format&fit=crop&w=2000&q=80";

const FORM_ITEMS: FormItem[] = [
  {
    title: "Laporan Keuangan Mingguan",
    info: "Update data informasi laporan keuangan setiap Minggu nya dan juga total keseluruhan saldo yang ada.",
    url: "https://forms.gle/ba8vr5TmjZY9ch539",
    icon: Wallet,
  },
  {
    title: "Perincian Pengeluaran",
    info: "Update data informasi perincian pengeluaran dari setiap Kas yang ada.",
    url: "https://forms.gle/RX8cqRdB9tQVKLLD7",
    icon: FileText,
  },
  {
    title: "Jadwal Khatib Jum'at",
    info: "Data yang ditampilkan hanya data yang terbaru.",
    url: "https://forms.gle/GQDxLaEnRDjo2pvB7",
    icon: Calendar,
  },
  {
    title: "Agenda Masjid",
    info: "Hanya 3 Agenda terdekat yang dapat ditampilkan.",
    url: "https://forms.gle/sVKVuiWKm9iBMBY38",
    icon: Calendar,
  },
  {
    title: "Durasi Setiap Slide",
    info: "Sesuaikan durasi antar slide berdasarkan detik (default 20 detik).",
    url: "https://forms.gle/xaYpEQjKCf1CaxJVA",
    icon: Clock3,
  },
  {
    title: "Waktu Tenang & Waktu Tampil WebCam",
    info: "Setting waktu tenang & waktu tampil webcam saat Maghrib & Isya setelah adzan dalam satuan menit, otomatis menambahkan 10 menit ketika shalat Jumat.",
    url: "https://forms.gle/9wiKy7XDKzA12qyM8",
    icon: Clock3,
  },
  {
    title: "Running Text",
    info: "Semakin panjang text semakin cepat.",
    url: "https://forms.gle/9Gg4PiMRyfjuhAfY9",
    icon: Text,
  },
  {
    title: "Tautan Background",
    info: "Ganti atau sesuaikan opasitas background, format link harus direct ke gambar.",
    url: "https://forms.gle/j4dJ29hvDwWsaFFU8",
    icon: ImagePlus,
  },
  {
    title: "Kontrol Tampil Monitor Camera",
    info: "Setting mulai atau hentikan camera WebCam (Hanya dapat di tampilkan jika TV Box di hubungkan perangkat Camera).",
    url: "https://forms.gle/GDt1uMZz6nn7kqnz9",
    icon: Camera,
  },
  {
    title: "Tautan Video YouTube",
    info: "Putar video YouTube langsung menggunakan Tautan (Hanya video yang di setting penyematan yang dapat di putar).",
    url: "https://forms.gle/cpsPEmWVp68KqkMo9",
    icon: PlayCircle,
  },
  {
    title: "Extra Slide",
    info: "Edit Pengumuman dengan menempel Link gambar direct atau mengetik manual, serta mengaktifkan atau menyembunyikan extra Slide.",
    url: "https://forms.gle/awZUPDBMXCtK9aSs5",
    icon: Layers,
  },
];

const FEATURE_ITEMS = [
  "Hari, tanggal, tahun, waktu otomatis secara real-time.",
  "Jadwal 5 waktu shalat otomatis area Pengasih, Kulon Progo.",
  "Hitung mundur menuju waktu shalat berikutnya.",
  "Mode waktu tenang dari awal adzan hingga selesai shalat yang dapat di setting.",
  "Setting timer otomatis perangkat menjelang dan setelah shalat.",
  "Refresh dan update data otomatis.",
  "Background tampilan yang dapat diganti dan disesuaikan opasitas.",
  "Text Running.",
  "Slide jadwal khatib Jum'at & muadzin.",
  "Slide laporan keuangan serta hitung total saldo kas.",
  "Slide 3 agenda terdekat masjid.",
  "Info tambahan yang dapat diaktifkan atau disembunyikan.",
  "Menampilkan video YouTube hanya melalui tautan.",
  "Kontrol dan tampilkan monitor camera WebCam.",
  "Tampilan mendukung zoom out, zoom in, dan full screen.",
  "Indikator informasi kapan update data terakhir berhasil.",
  "Data tetap tampil saat jaringan putus setelah data pertama dimuat.",
  "Koreksi otomatis tanggal dan waktu setelah perangkat tersambung kembali.",
  "Pengisian data online kapan pun dari Google Form terintegrasi dalam satu App.",
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const blocks = text.split("\n");
  const lines: string[] = [];

  blocks.forEach((block, blockIndex) => {
    if (!block.trim()) {
      lines.push("");
      return;
    }

    const words = block.split(/\s+/);
    let current = "";

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    });

    if (current) {
      lines.push(current);
    }

    if (blockIndex < blocks.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membuat data URL."));
    reader.readAsDataURL(file);
  });
}

async function uploadToTmpfiles(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload gagal. Coba lagi.");
  }

  const result = (await response.json()) as { data?: { url?: string } };
  const url = result?.data?.url;
  if (!url) {
    throw new Error("Link tidak ditemukan dari server upload.");
  }

  return url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
}

export default function App() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState("Install App");
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [headerAdvancedOpen, setHeaderAdvancedOpen] = useState(false);
  const [bodyAdvancedOpen, setBodyAdvancedOpen] = useState(false);
  const [displayKey, setDisplayKey] = useState(0);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadedImageLink, setUploadedImageLink] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  const [posterBg, setPosterBg] = useState("#ffffff");
  const [headerText, setHeaderText] = useState("PENGUMUMAN");
  const [headerBg, setHeaderBg] = useState("#39ff14");
  const [headerTextColor, setHeaderTextColor] = useState("#000000");
  const [headerFont, setHeaderFont] = useState("Arial");
  const [headerFontSize, setHeaderFontSize] = useState(160);

  const [bodyText, setBodyText] = useState("");
  const [bodyAlign, setBodyAlign] = useState<TextAlign>("center");
  const [bodyColor, setBodyColor] = useState("#000000");
  const [bodyFont, setBodyFont] = useState("Arial");
  const [baseBodySize, setBaseBodySize] = useState(85);

  const [posterStatus, setPosterStatus] = useState("");
  const [posterLink, setPosterLink] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const displayFrameRef = useRef<HTMLDivElement | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const selectedImagePreview = useMemo(() => (selectedImage ? URL.createObjectURL(selectedImage) : ""), [selectedImage]);

  const fontOptions = useMemo(
    () => ["Arial", "Helvetica", "Tahoma", "Verdana", "Trebuchet MS", "Georgia", "Times New Roman", "Poppins", "Montserrat"],
    []
  );

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (isStandalone) {
      setInstallHint("Aplikasi terpasang");
    }

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
      setInstallHint("Install App");
    };

    const onInstalled = () => {
      setInstallHint("Aplikasi terpasang");
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (installPrompt) {
      return;
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;
    if (isStandalone) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setInstallHint("Gunakan Add to Home Screen");
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [installPrompt]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }

    const width = 1200;
    const height = 540;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    drawPoster(ctx, {
      width,
      height,
      posterBg,
      headerText,
      headerBg,
      headerTextColor,
      headerFont,
      headerFontSize,
      bodyText,
      bodyAlign,
      bodyColor,
      bodyFont,
      baseBodySize,
    });
  }, [posterBg, headerText, headerBg, headerTextColor, headerFont, headerFontSize, bodyText, bodyAlign, bodyColor, bodyFont, baseBodySize]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  useEffect(() => {
    const target = displayFrameRef.current;
    if (!target) {
      return;
    }

    const updateScale = () => {
      const width = target.clientWidth;
      if (width > 0) {
        // Basis 768x432 membuat elemen pada display lebih besar di Chrome mobile.
        setDisplayScale(Math.min(width / 768, 1));
      }
    };

    updateScale();
    let observer: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      observer = new ResizeObserver(updateScale);
      observer.observe(target);
    }
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, []);

  const pushToast = (text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  };

  const scaledFrameHeight = 432 * displayScale;

  const handleInstall = async () => {
    if (!installPrompt) {
      setInstallGuideOpen(true);
      setInstallHint("Gunakan Add to Home Screen");
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      const accepted = choice.outcome === "accepted";
      setInstallHint(accepted ? "Aplikasi terpasang" : "Install dibatalkan");
      pushToast(accepted ? "Aplikasi berhasil diinstall." : "Install dibatalkan.");
      setInstallPrompt(null);
    } catch {
      setInstallGuideOpen(true);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImage) {
      setUploadStatus("Pilih gambar terlebih dahulu.");
      return;
    }

    setUploadStatus("Mengunggah gambar...");
    setUploadedImageLink("");

    try {
      const link = await uploadToTmpfiles(selectedImage);
      setUploadedImageLink(link);
      setUploadStatus("Berhasil. Link direct siap disalin.");
      pushToast("Upload gambar berhasil.");
    } catch {
      const fallbackLink = await fileToDataUrl(selectedImage);
      setUploadedImageLink(fallbackLink);
      setUploadStatus("Upload publik gagal dari browser ini. Dipakai data URL lokal sebagai link direct.");
      pushToast("Upload publik gagal. Menggunakan data URL lokal.");
    }
  };

  const handleGeneratePoster = async () => {
    setPosterStatus("Membuat poster 3200 x 1440...");

    const canvas = document.createElement("canvas");
    canvas.width = 3200;
    canvas.height = 1440;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setPosterStatus("Canvas tidak tersedia di browser ini.");
      return;
    }

    drawPoster(ctx, {
      width: 3200,
      height: 1440,
      posterBg,
      headerText,
      headerBg,
      headerTextColor,
      headerFont,
      headerFontSize,
      bodyText,
      bodyAlign,
      bodyColor,
      bodyFont,
      baseBodySize,
    });

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) {
      setPosterStatus("Gagal menghasilkan file poster.");
      return;
    }

    try {
      const file = new File([blob], "poster-pengumuman.png", { type: "image/png" });
      const link = await uploadToTmpfiles(file);
      setPosterLink(link);
      setPosterStatus("Poster selesai. Link direct sudah tersedia.");
      pushToast("Generate poster berhasil.");
    } catch {
      const dataUrl = await fileToDataUrl(blob);
      setPosterLink(dataUrl);
      setPosterStatus("Poster selesai. Upload publik gagal, link diganti data URL lokal.");
      pushToast("Poster selesai, memakai link data URL lokal.");
    }
  };

  const copyText = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Tidak semua browser mobile memberi izin clipboard tanpa gesture tambahan.
      return false;
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-900 bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `linear-gradient(rgba(3, 7, 18, 0.78), rgba(3, 7, 18, 0.88)), url(${BG_IMAGE})` }}
    >
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleInstall}
        className="fixed left-3 top-3 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50"
      >
        <Download size={16} />
        {installHint}
      </motion.button>

      {installGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/35 bg-white/95 p-5 text-slate-800">
            <p className="text-3xl font-black text-slate-900">Cara Install di Chrome</p>
            <div className="mt-3 space-y-1 text-2xl font-medium leading-snug text-slate-700">
              <p>1. Klik ikon titik tiga di pojok kanan atas Chrome.</p>
              <p>2. Pilih "Tambahkan ke layar utama" atau "Install Aplikasi".</p>
              <p>3. Konfirmasi dengan klik Install / Tambahkan.</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setInstallGuideOpen(false)}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xl font-black text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed left-3 right-3 top-20 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="w-full rounded-2xl border-2 border-lime-200 bg-lime-400 px-6 py-5 text-center text-2xl font-black text-slate-900 shadow-xl"
          >
            {toast.text}
          </div>
        ))}
      </div>

      <main className="mx-auto w-full max-w-[1920px] px-3 pb-10 pt-20 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">AL-Muttaqin Connect</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-100 sm:text-lg">
            Panel kontrol pengaturan display masjid untuk mempermudah pengisian Google Form terintegrasi.
          </p>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-slate-200">
            Klegen RT 15/ RW 08, Sendangsari, Pengasih, Kulon Progo, Yogyakarta 55652.
          </p>

          <div className="mt-5 flex items-center justify-center gap-3">
            <a
              href="https://youtube.com/@masjidalmuttaqinklegen?si=3KETDOZYjcIypHO6"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold"
            >
              <PlayCircle size={16} />
              YouTube
            </a>
            <a
              href="https://www.facebook.com/masjidalmuttaqin.klegen"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold"
            >
              <Users size={16} />
              Facebook
            </a>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55 }}
          className="relative left-1/2 mt-8 w-screen -translate-x-1/2 rounded-none border-y border-emerald-300/25 bg-emerald-950/40 p-3 backdrop-blur sm:rounded-2xl sm:border sm:px-4 lg:w-[96vw]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <BadgeInfo size={16} />
              Display Informasi Masjid (Real Time)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDisplayKey((prev) => prev + 1)}
                className="rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"
                aria-label="Refresh display"
              >
                <RefreshCw size={16} />
              </button>
              <a
                href={DISPLAY_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"
                aria-label="Buka display"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div
            ref={displayFrameRef}
            className="relative overflow-hidden rounded-xl border border-emerald-200/25 bg-black"
            style={{ height: `${scaledFrameHeight}px` }}
          >
            <iframe
              key={displayKey}
              src={DISPLAY_URL}
              className="absolute left-0 top-0 border-0"
              style={{
                width: "768px",
                height: "432px",
                transform: `scale(${displayScale})`,
                transformOrigin: "top left",
              }}
              title="Display Informasi Masjid"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </motion.section>

        <section className="mt-7 space-y-3">
          {FORM_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isExtraSlide = item.title === "Extra Slide";
            return (
              <motion.a
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * index }}
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className={`block rounded-2xl bg-white p-4 text-slate-800 ${
                  isExtraSlide ? "border-2 border-orange-400" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-xl p-2 ${
                      isExtraSlide ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`flex items-center gap-2 leading-tight ${
                        isExtraSlide ? "text-2xl font-black text-slate-950" : "text-xl font-black text-slate-900"
                      }`}
                    >
                      {item.title}
                      <ExternalLink size={15} className={`shrink-0 ${isExtraSlide ? "text-orange-500" : "text-slate-400"}`} />
                    </p>
                    <p className={`mt-1 text-base ${isExtraSlide ? "font-medium text-slate-700" : "text-slate-600"}`}>{item.info}</p>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl bg-white p-5 text-slate-800 sm:p-6">
          <p className="flex items-center gap-3 text-2xl font-black text-slate-900">
            <span className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-2 text-amber-500">
              <Upload size={22} />
            </span>
            Upload Gambar
          </p>
          <p className="mt-1 text-slate-600">Dapatkan direct link gambar untuk keperluan Anda.</p>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedImage(file);
              setUploadStatus(file ? `${file.name} dipilih.` : "");
            }}
            className="hidden"
          />

          <button
            onClick={() => uploadInputRef.current?.click()}
            className="mt-4 block w-full rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-emerald-500"
          >
            {selectedImagePreview ? (
              <img src={selectedImagePreview} alt="Preview upload" className="mx-auto mb-4 max-h-52 rounded-lg object-contain" />
            ) : (
              <>
                <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Upload size={30} />
                </span>
                <span className="block text-3xl font-black text-slate-700 sm:text-4xl">Klik untuk pilih gambar</span>
                <span className="mt-1 block text-lg text-slate-400">PNG, JPG, JPEG, WEBP</span>
              </>
            )}
          </button>

          <div className="mt-3">
            <button onClick={handleUploadImage} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-bold text-white">
              Upload & Buat Link
            </button>
          </div>

          {uploadStatus && <p className="mt-3 text-sm text-slate-600">{uploadStatus}</p>}
          {uploadedImageLink && (
            <div className="mt-3 rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
              <p className="font-semibold">Link Direct:</p>
              <p className="mt-1 break-all">{uploadedImageLink}</p>
              <button
                onClick={async () => {
                  const ok = await copyText(uploadedImageLink);
                  pushToast(ok ? "Link gambar berhasil disalin." : "Gagal menyalin link gambar.");
                }}
                className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-bold text-white"
              >
                Salin Link
              </button>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl bg-white p-5 text-slate-800 sm:p-6">
          <p className="flex items-center gap-3 text-2xl font-black text-slate-900">
            <span className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-2 text-emerald-600">
              <ImagePlus size={22} />
            </span>
            Editor Poster Pengumuman
          </p>
          <p className="mt-1 text-slate-600">Buat poster pengumuman resolusi 3200 x 1440 px</p>

          <div className="mt-5">
            <p className="text-base font-black uppercase text-slate-600">Background Poster</p>
            <div className="mt-2 flex items-center gap-3">
              <input type="color" value={posterBg} onChange={(e) => setPosterBg(e.target.value)} className="h-12 w-12 rounded-md border border-slate-300" />
              <p className="font-semibold text-slate-500">{posterBg}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border-2 border-slate-300 p-4">
            <p className="text-xl font-black uppercase text-slate-600">Header Text</p>
            <input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value.toUpperCase())}
              className="mt-3 w-full rounded-xl border-2 border-orange-400 px-3 py-2 text-xl font-black text-slate-900"
            />

            <button
              onClick={() => setHeaderAdvancedOpen((prev) => !prev)}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Klik untuk setting lanjutan &gt;
            </button>

            {headerAdvancedOpen && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-base font-semibold text-slate-600">
                  Warna Background
                  <input type="color" value={headerBg} onChange={(e) => setHeaderBg(e.target.value)} className="mt-1 block h-10 w-full" />
                </label>
                <label className="text-base font-semibold text-slate-600">
                  Warna Teks
                  <input
                    type="color"
                    value={headerTextColor}
                    onChange={(e) => setHeaderTextColor(e.target.value)}
                    className="mt-1 block h-10 w-full"
                  />
                </label>
                <label className="text-base font-semibold text-slate-600">
                  Font
                  <select
                    value={headerFont}
                    onChange={(e) => setHeaderFont(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                  >
                    {fontOptions.map((font) => (
                      <option key={`header-${font}`} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-base font-semibold text-slate-600">
                  Ukuran ({headerFontSize}px)
                  <input
                    type="range"
                    min={110}
                    max={320}
                    step={2}
                    value={headerFontSize}
                    onChange={(e) => setHeaderFontSize(Number(e.target.value))}
                    className="mt-3 w-full"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border-2 border-slate-300 p-4">
            <p className="text-xl font-black uppercase text-slate-600">Isi Pengumuman</p>
            <textarea
              rows={6}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Ketik isi pengumuman di sini..."
              className="mt-3 w-full rounded-xl border-2 border-orange-400 px-3 py-2 text-lg"
            />

            <label className="mt-3 block text-base font-semibold text-slate-600">
              Ukuran Font Dasar ({baseBodySize}px) - otomatis menyesuaikan ruang
              <input
                type="range"
                min={36}
                max={200}
                step={2}
                value={baseBodySize}
                onChange={(e) => setBaseBodySize(Number(e.target.value))}
                className="mt-3 w-full"
              />
            </label>

            <button
              onClick={() => setBodyAdvancedOpen((prev) => !prev)}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Klik untuk setting lanjutan &gt;
            </button>

            {bodyAdvancedOpen && (
              <>
                <p className="mt-3 text-base font-semibold text-slate-600">Perataan Teks</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([
                    ["left", "Kiri"],
                    ["center", "Tengah"],
                    ["right", "Kanan"],
                  ] as const).map(([align, label]) => (
                    <button
                      key={align}
                      onClick={() => setBodyAlign(align)}
                      className={`rounded-xl border px-4 py-1.5 text-base font-semibold ${
                        bodyAlign === align ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-base font-semibold text-slate-600">
                    Warna Teks
                    <input
                      type="color"
                      value={bodyColor}
                      onChange={(e) => setBodyColor(e.target.value)}
                      className="mt-1 block h-10 w-full"
                    />
                  </label>
                  <label className="text-base font-semibold text-slate-600">
                    Font
                    <select
                      value={bodyFont}
                      onChange={(e) => setBodyFont(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                    >
                      {fontOptions.map((font) => (
                        <option key={`body-${font}`} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="mt-2">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Preview</p>
            <div className="overflow-hidden rounded-xl border-2 border-slate-400 bg-slate-100">
              <canvas ref={previewCanvasRef} className="w-full" />
            </div>
          </div>

          <div className="mt-4">
            <button onClick={handleGeneratePoster} className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-xl font-black text-white">
              Generate Poster
            </button>
          </div>
          {posterStatus && <p className="mt-3 text-sm text-slate-600">{posterStatus}</p>}
          {posterLink && (
            <div className="mt-1 rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
              <p className="break-all">{posterLink}</p>
              <button
                onClick={async () => {
                  const ok = await copyText(posterLink);
                  pushToast(ok ? "Link poster berhasil disalin." : "Gagal menyalin link poster.");
                }}
                className="mt-3 w-full rounded-xl bg-slate-900 px-5 py-3 text-base font-bold text-white"
              >
                Salin Link Gambar
              </button>
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-base font-bold leading-snug text-amber-900">
                Setelah link gambar berhasil di salin, selanjutnya masuk ke dalam Form EXTRA SLIDE, tempelkan link pada bagian
                tempat pengisian LINK dengan cara menahan lalu klik Tempel/Paste.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-emerald-400/35 bg-emerald-950/40 p-5 backdrop-blur">
          <h2 className="text-2xl font-black text-white">Fitur Unggulan</h2>
          <div className="mt-4 space-y-2">
            {FEATURE_ITEMS.map((item, index) => (
              <p key={item} className="text-base text-emerald-50">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">
                  {index + 1}
                </span>
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-full bg-emerald-700/80 py-2">
          <div className="marquee-track text-sm font-semibold text-white">
            AL-Muttaqin Connect | Panel kontrol display masjid terintegrasi Google Form | Mudah update kapan pun dan dari mana pun
          </div>
        </section>

        <footer className="pb-2 pt-6 text-center text-white/95">
          <p className="text-xl">(جَزَاكُمُ اللهُ خَيْرًاكَثِيْرًا)</p>
          <p className="mt-2 text-xs text-slate-200">© 2026 Masjid Al Muttaqin - Panel Kontrol Display</p>
        </footer>
      </main>
    </div>
  );
}

type PosterDrawOptions = {
  width: number;
  height: number;
  posterBg: string;
  headerText: string;
  headerBg: string;
  headerTextColor: string;
  headerFont: string;
  headerFontSize: number;
  bodyText: string;
  bodyAlign: TextAlign;
  bodyColor: string;
  bodyFont: string;
  baseBodySize: number;
};

function drawPoster(ctx: CanvasRenderingContext2D, options: PosterDrawOptions) {
  const {
    width,
    height,
    posterBg,
    headerText,
    headerBg,
    headerTextColor,
    headerFont,
    headerFontSize,
    bodyText,
    bodyAlign,
    bodyColor,
    bodyFont,
    baseBodySize,
  } = options;

  const ratio = width / 3200;
  const headerHeight = Math.round(210 * ratio);
  const sidePadding = Math.round(36 * ratio);
  const contentPadding = Math.round(84 * ratio);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = posterBg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = headerBg;
  ctx.fillRect(sidePadding, sidePadding, width - sidePadding * 2, headerHeight);

  ctx.fillStyle = headerTextColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(headerFontSize * ratio)}px ${headerFont || "Arial"}`;
  ctx.fillText(headerText || "PENGUMUMAN", width / 2, sidePadding + headerHeight / 2);

  const bodyTop = sidePadding + headerHeight + Math.round(56 * ratio);
  const bodyHeight = height - bodyTop - Math.round(56 * ratio);
  const bodyWidth = width - contentPadding * 2;

  const minSize = Math.max(18 * ratio, 10);
  let low = minSize;
  let high = Math.max(baseBodySize * ratio * 1.8, minSize + 1);
  let bestSize = minSize;
  let bestLines = [""];

  while (low <= high) {
    const mid = (low + high) / 2;
    ctx.font = `600 ${mid}px ${bodyFont || "Arial"}`;
    const lines = wrapText(ctx, bodyText || "", bodyWidth);
    const lineHeight = mid * 1.22;
    const neededHeight = Math.max(lines.length, 1) * lineHeight;

    if (neededHeight <= bodyHeight) {
      bestSize = mid;
      bestLines = lines;
      low = mid + 0.7;
    } else {
      high = mid - 0.7;
    }
  }

  ctx.font = `600 ${Math.round(bestSize)}px ${bodyFont || "Arial"}`;
  ctx.fillStyle = bodyColor;
  ctx.textAlign = bodyAlign;
  ctx.textBaseline = "top";

  const lineHeight = bestSize * 1.22;
  const contentHeight = Math.max(bestLines.length, 1) * lineHeight;
  let y = bodyTop + Math.max((bodyHeight - contentHeight) / 2, 0);
  const x =
    bodyAlign === "left"
      ? contentPadding
      : bodyAlign === "center"
        ? width / 2
        : width - contentPadding;

  (bestLines.length ? bestLines : [""]).forEach((line) => {
    ctx.fillText(line, x, y);
    y += lineHeight;
  });
}
