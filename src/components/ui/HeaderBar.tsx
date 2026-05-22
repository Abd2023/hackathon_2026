import React from "react";

export function HeaderBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-white/90 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[430px] items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v4" />
              <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
              <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
              <path d="M3 9V5a2 2 0 0 1 2-2h4" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <div>
            <h1 className="text-base font-black leading-tight text-foreground">Görsel Asistan</h1>
            <p className="text-[11px] font-semibold text-muted">Akıllı alışveriş kararı</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
          Güvenli
        </span>
      </div>
    </header>
  );
}
