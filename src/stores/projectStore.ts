import { createStore } from "zustand/vanilla";

export interface ProjectState {
  projectId: string;
  projectName: string;
  activeWorkspace: "data-preparation" | "scheme-building";
  setActiveWorkspace: (workspace: ProjectState["activeWorkspace"]) => void;
}

export const projectStore = createStore<ProjectState>((set) => ({
  projectId: "project-lintao-tcm-demo",
  projectName: "临洮县中医院绩效方案 Demo",
  activeWorkspace: "data-preparation",
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace })
}));
