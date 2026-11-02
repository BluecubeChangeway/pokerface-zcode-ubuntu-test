/**
 * Theme Tokens Entry Point
 * 
 * 导出主题 Token 系统：
 * - lightThemeTokens: 浅色模式基础 Token
 * - darkThemeTokens: 深色模式基础 Token
 * - semanticColor 语义色映射
 * - 组件级 Token 预设
 * - ThemePackageTokens 接口供主题包扩展
 */

export { lightThemeTokens } from './light/base';
export { darkThemeTokens } from './dark/base';

// 语义色系统
export * from '../semantic';

// 类型导出
export type { SemanticColorKey } from '../semantic';
export type { ThemePackageTokens } from '../semantic';
export type { ComponentSemanticTokens } from '../semantic';