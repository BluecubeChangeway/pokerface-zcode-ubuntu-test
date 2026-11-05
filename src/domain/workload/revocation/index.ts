/**
 * Workload Revocation Domain Module
 * 
 * 撤回领域服务（D-153～D-156, D-158）：
 * - computeSplitLayerRevocationImpact: 层撤销影响集计算
 * - computeFullPathRevocationImpact: 全路径撤回影响集计算
 * - splitLayerRevocationImpact / fullPathRevocationImpact: 类型
 * - RevocationSnapshot / WorkloadRevocationImpact: 数据结构
 * - isBusinessRevoked / isWorkloadSplitRecordRevoked: 状态谓词
 * - findContinuedUseEvidence: 继续使用证据查找
 * - collectDerivedResultsByRecords: 记录级闭包遍历
 * 
 * 提交执行：
 * - executeSplitLayerRevocation: 层撤销执行
 * - executeFullPathRevocation: 全路径撤回执行
 * - submitRevocation: 影响集提交
 * - loadRevocationSnapshot: 快照加载
 */

export {
  // 影响集计算
  computeSplitLayerRevocationImpact,
  computeFullPathRevocationImpact,
  
  // 类型导出
  type SplitLayerRevocationInput,
  type FullPathRevocationInput,
  type WorkloadRevocationImpact,
  type RevocationSnapshot,
  type ContinuedUseEvidence,
  
  // 状态谓词
  isBusinessRevoked,
  isWorkloadSplitRecordRevoked,
  findContinuedUseEvidence,
  
  // 记录级闭包
  collectDerivedResultsByRecords,
} from './revocationService';

export {
  // 提交执行
  executeSplitLayerRevocation,
  executeFullPathRevocation,
  submitRevocation,
  loadRevocationSnapshot,
} from './revocationSubmissionService';
