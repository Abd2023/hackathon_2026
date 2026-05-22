"use client";

import React, { useState, useRef } from "react";
import { HeaderBar } from "@/components/ui/HeaderBar";
import { AgentProgress } from "@/components/loading/AgentProgress";
import { ResultView } from "@/components/results/ResultView";
import { RecommendationResult } from "@/lib/schemas/analysis";

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const MAX_ANALYSIS_IMAGE_DIMENSION = 1024;
const ANALYSIS_IMAGE_QUALITY = 0.82;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Görsel okunamadı."));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Görsel hazırlanamadı."));
    image.src = url;
  });
}

async function prepareImageForAnalysis(file: File) {
  if (file.type === "image/gif") return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const largestSide = Math.max(image.width, image.height);
    const scale = Math.min(1, MAX_ANALYSIS_IMAGE_DIMENSION / largestSide);

    if (scale >= 1 && file.size <= 1_200_000) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", ANALYSIS_IMAGE_QUALITY);
    });

    if (!blob) return file;

    const fileName = file.name.replace(/\.[^.]+$/, "") || "product";
    return new File([blob], `${fileName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dealBreaker, setDealBreaker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<RecommendationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Lütfen geçerli bir resim dosyası yükleyin.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setError("Dosya boyutu 8MB'dan küçük olmalıdır.");
      return;
    }

    setIsPreparingImage(true);
    try {
      const preparedFile = await prepareImageForAnalysis(file);
      setImageFile(preparedFile);
      setImagePreview(await readFileAsDataUrl(preparedFile));
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      if (dealBreaker) formData.append("dealBreaker", dealBreaker);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "Analiz sırasında bir hata oluştu.");
      }

      const data = await response.json() as RecommendationResult;
      setResultData(data);
      setIsLoading(false);
      setShowResult(true);
    } catch (err: unknown) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setImageFile(null);
    setImagePreview(null);
    setDealBreaker("");
    setResultData(null);
    setShowResult(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isSubmitDisabled = !imageFile || isLoading || isPreparingImage;

  return (
    <>
      <HeaderBar />

      {isLoading ? (
        <AgentProgress />
      ) : showResult && resultData ? (
        <ResultView result={resultData} imagePreview={imagePreview} onReset={resetFlow} />
      ) : (
        <div className="flex-1 overflow-y-auto bg-page p-4">
          <form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-5">
            <section className="rounded-lg border border-amber-100 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">Görsel Asistan</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">Ürünü Tarat</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />

              {imagePreview ? (
                <div className="relative aspect-square w-full max-h-[330px] overflow-hidden rounded-lg border border-border bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Seçilen ürün"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Görseli kaldır"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-teal-200 bg-teal-50/60 text-primary transition hover:border-primary hover:bg-teal-50"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </span>
                  <span className="text-sm font-black">Kamera veya Galeri</span>
                </button>
              )}

              {isPreparingImage && <p className="mt-3 text-sm font-semibold text-primary">Görsel hazırlanıyor...</p>}
              {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-danger">{error}</p>}
            </section>

            <section className="card">
              <label htmlFor="dealBreaker" className="mb-2 block text-sm font-black text-foreground">
                Özel Şartınız
              </label>
              <textarea
                id="dealBreaker"
                value={dealBreaker}
                onChange={(e) => setDealBreaker(e.target.value)}
                placeholder="Örn: Tekerleği çabuk bozulmasın"
                className="min-h-[96px] w-full resize-none rounded-lg border border-border bg-white p-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </section>

            <div className="mt-auto pb-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  Hemen Bul
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
