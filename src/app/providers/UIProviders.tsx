import { ReactNode } from "react";
import { I18nProvider } from "./I18nProvider";
import { ThemeProvider } from "./ThemeProvider";
import { MotionProvider } from "./MotionProvider";

export function UIProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultMode="system">
      <MotionProvider defaultReducedMotion={false}>
        <I18nProvider initialLocale="zh-CN">
          {children}
        </I18nProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}