import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { motion, MotionConfig } from "framer-motion";

interface MotionContextValue {
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  toggleReducedMotion: () => void;
}

const MotionContext = createContext<MotionContextValue | null>(null);

export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion must be used within MotionProvider");
  return ctx;
}

interface MotionProviderProps {
  children: ReactNode;
  defaultReducedMotion?: boolean;
}

export function MotionProvider({ children, defaultReducedMotion = false }: MotionProviderProps) {
  const [reducedMotion, setReducedMotionState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reduced-motion") === "true" || defaultReducedMotion;
    }
    return defaultReducedMotion;
  });

  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem("reduced-motion", enabled.toString());
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotionState((prev) => !prev);
  }, []);

  return (
    <MotionContext.Provider value={{ reducedMotion, setReducedMotion, toggleReducedMotion }}>
      <MotionConfig
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        reducedMotion={reducedMotion ? "user" : undefined}
      >
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}

export function ReducedMotionWrapper({ children }: { children: ReactNode }) {
  const { reducedMotion } = useMotion();
  if (reducedMotion) {
    return <>{children}</>;
  }
  return <motion.div initial="hidden" animate="visible" transition={{ duration: 0.2 }}>{children}</motion.div>;
}