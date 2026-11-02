// Test setup file - disable framer-motion animations
import { vi } from "vitest";
import React from "react";

// Mock framer-motion to disable animations in tests
vi.mock("framer-motion", () => {
  const createElement = React.createElement;
  return {
    motion: new Proxy({}, {
      get: () => (props: any) => createElement(props.as || "div", { ...props, "data-test-motion": "mocked" }, props.children),
    }),
    MotionConfig: ({ children }: any) => children,
    AnimatePresence: ({ children }: any) => children,
    LazyMotion: ({ children }: any) => children,
    m: {},
    useMotionValue: vi.fn(() => ({ get: () => 0, set: vi.fn() })),
    useTransform: vi.fn(() => 0),
    useSpring: vi.fn(() => ({ get: () => 0, set: vi.fn() })),
    useMotionValueEvent: vi.fn(),
    useScroll: vi.fn(() => ({ scrollY: { get: () => 0 } })),
    useAnimation: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  };
});

// Reduce motion globally for tests
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;