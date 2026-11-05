/**
 * Split Provenance Domain Module
 * 
 * 拆分溯源与跨批次复用：
 * - SplitProvenanceCondition / SplitProvenanceRecord: 类型定义
 * - buildSplitProvenance: 记录构建
 * - provenanceOriginMatches: 本源一致性判定
 * - reusableContentEquals: 复用内容等价判定
 * - matchReusableChildren: 逐子项复用匹配
 */

export {
  type SplitProvenanceCondition,
  type SplitProvenanceRecord,
  buildSplitProvenance,
  provenanceOriginMatches,
  reusableContentEquals,
  matchReusableChildren,
} from './splitProvenance';
