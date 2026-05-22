import React, { useEffect, useState } from "react";

const PROGRESS_STATES = [
  "Ürün tanımlanıyor...",
  "Pazaryerleri aranıyor...",
  "Yorumlar analiz ediliyor...",
  "Özel şart kontrol ediliyor...",
  "Karar hazırlanıyor...",
];

export function AgentProgress({ onComplete }: { onComplete: () => void }) {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    // Simulate progression through states
    const interval = setInterval(() => {
      setCurrentState((prev) => {
        if (prev < PROGRESS_STATES.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(onComplete, 1000);
          return prev;
        }
      });
    }, 1500); // 1.5 seconds per state

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-surface-dark"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>
      
      <h3 className="text-xl font-bold mb-6">Ajanlar Çalışıyor</h3>
      
      <div className="flex flex-col gap-4 w-full max-w-[280px]">
        {PROGRESS_STATES.map((state, index) => {
          const isActive = index === currentState;
          const isDone = index < currentState;
          
          return (
            <div 
              key={index} 
              className={`flex items-center gap-3 transition-opacity duration-300 ${isActive || isDone ? 'opacity-100' : 'opacity-40'}`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 
                ${isDone ? 'bg-success border-success text-white' : 
                  isActive ? 'border-primary text-primary' : 
                  'border-muted text-muted'}`}
              >
                {isDone ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                ) : null}
              </div>
              <span className={`text-sm font-medium ${isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted'}`}>
                {state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
