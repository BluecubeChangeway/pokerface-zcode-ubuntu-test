/**
 * Workload Split Domain Module
 * 
 * 核心拆分执行逻辑：
 * - createWorkloadSplit: 正式拆分执行（创建子结果、WorkloadSplit 记录）
 * - validateSplitExecution: 执行前校验
 * - getExistingSplitRelations: 查询现有拆分关系
 * - getExistingSplitChildren: 查询现有子结果
 * - createSplitIdGenerator / batchSplitId: ID 生成
 * - workloadResultContentEquals: 结果内容比较
 * - determineChildIdOwnership: 执行归属判定
 * - calculateSplitRemainder: 余数/完整性计算
 * - SplitValidationError: 校验错误类
 * - SplitFeasibilityContext / SplitExecutionInput / SplitExecutionResult: 类型定义
 */

export {
  // 核心执行
  createWorkloadSplit,
  validateSplitExecution,
  getExistingSplitRelations,
  getExistingSplitChildren,
  
  // ID 生成与归属
  createSplitIdGenerator,
  batchSplitId,
  determineChildIdOwnership,
  
  // 内容比较
  workloadResultContentEquals,
  
  // 余数/完整性
  calculateSplitRemainder,
  
  // 错误类
  SplitValidationError,
  
  // 类型导出
  type SplitFeasibilityContext,
  type SplitExecutionInput,
  type SplitExecutionResult,
} from './splitService';

export {
  // 类型导出
  type SplitProvenanceCondition,
  type SplitProvenanceRecord,
  buildSplitProvenance,
  provenanceOriginMatches,
  reusableContentEquals,
  matchReusableChildren,
} from '../provenance/splitProvenance';
