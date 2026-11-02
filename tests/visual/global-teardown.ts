/**
 * Playwright 视觉回归全局 Teardown
 * 清理资源、生成报告
 */

export default async function globalTeardown() {
  console.log('[Visual Tests] Global teardown completed.');
  // 清理工作在 globalSetup 返回的清理函数中已处理
}