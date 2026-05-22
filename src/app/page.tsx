"use client";

import React, { useState, useRef } from "react";
import { HeaderBar } from "@/components/ui/HeaderBar";
import { AgentProgress } from "@/components/loading/AgentProgress";

import { ResultView } from "@/components/results/ResultView";

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dealBreaker, setDealBreaker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultData, setResultData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProgressComplete = () => {
    setIsLoading(false);
    setShowResult(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Lütfen geçerli bir resim dosyası yükleyin.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Dosya boyutu 8MB'dan küçük olmalıdır.");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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

      const data = await response.json();
      setResultData(data);
      handleProgressComplete();
    } catch (err: unknown) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setImageFile(null);
    setImagePreview(null);
    setDealBreaker("");
    setShowResult(false);
  };

  return (
    <>
      <HeaderBar />
      
      {isLoading ? (
        <AgentProgress onComplete={handleProgressComplete} />
      ) : showResult && resultData ? (
        <ResultView result={resultData} onReset={resetFlow} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Ürünü Tarat</h2>
            <p className="text-muted text-sm">
              Hakkında bilgi almak istediğiniz ürünün fotoğrafını çekin veya yükleyin.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
            <div className="flex flex-col gap-3">
              <label className="font-semibold text-sm">Ürün Görseli</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              
              {imagePreview ? (
                <div className="relative w-full aspect-square max-h-[300px] rounded-xl overflow-hidden border border-border shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 backdrop-blur-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-surface flex flex-col items-center justify-center gap-2 hover:bg-surface-dark transition-colors text-muted"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  <span className="font-medium text-sm">Kamera veya Galeri</span>
                </button>
              )}

              {error && <p className="text-danger text-sm">{error}</p>}
            </div>

            <div className="flex flex-col gap-3">
              <label htmlFor="dealBreaker" className="font-semibold text-sm">
                Özel Şartınız (Opsiyonel)
              </label>
              <textarea
                id="dealBreaker"
                value={dealBreaker}
                onChange={(e) => setDealBreaker(e.target.value)}
                placeholder="Örn: Sadece tekerleği çabuk bozulmuyorsa göster"
                className="w-full rounded-xl border border-border p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="mt-auto pt-6 pb-4">
              <button
                type="submit"
                disabled={!imageFile || isLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  Hemen Bul
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
