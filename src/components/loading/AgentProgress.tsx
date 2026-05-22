import React, { useEffect, useState } from "react";

const PROGRESS_STATES = [
  "Ürün tanımlanıyor...",
  "Pazaryerleri aranıyor...",
  "Yorumlar analiz ediliyor...",
  "Özel şart kontrol ediliyor...",
  "Karar hazırlanıyor...",
];

export function AgentProgress() {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentState((prev) => Math.min(prev + 1, PROGRESS_STATES.length - 1));
    }, 1400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-page p-8 text-center animate-in fade-in duration-500">
      <div className="relative mb-8 h-24 w-24">
        <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-3 rounded-full bg-white shadow-soft" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="m13 2-9 13h8l-1 7 9-13h-8l1-7Z" />
          </svg>
        </div>
      </div>

      <h3 className="mb-2 text-xl font-black">Ajanlar Çalışıyor</h3>
      <p className="mb-6 max-w-[280px] text-sm leading-6 text-muted">
        Fiyat, satıcı güveni ve yorum sinyalleri birlikte değerlendiriliyor.
      </p>

      <div className="flex w-full max-w-[300px] flex-col gap-3">
        {PROGRESS_STATES.map((state, index) => {
          const isActive = index === currentState;
          const isDone = index < currentState;

          return (
            <div
              key={state}
              className={`flex items-center gap-3 rounded-lg border bg-white px-3 py-2 text-left transition duration-300 ${
                isActive || isDone ? "border-teal-100 opacity-100 shadow-sm" : "border-border opacity-55"
              }`}
            >
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  isDone
                    ? "border-success bg-success text-white"
                    : isActive
                      ? "border-primary text-primary"
                      : "border-muted text-muted"
                }`}
              >
                {isDone ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                ) : null}
              </div>
              <span className={`text-sm font-bold ${isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted"}`}>
                {state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
