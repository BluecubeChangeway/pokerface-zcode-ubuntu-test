/// <reference types="vite/client" />

/** 本项目使用的构建期环境变量（R4a-2 运行时后端选择，见 src/services/runtimeDataService.ts） */
interface ImportMetaEnv {
  readonly VITE_DATA_BACKEND?: string;
  readonly VITE_LOCAL_SERVER_URL?: string;
}
