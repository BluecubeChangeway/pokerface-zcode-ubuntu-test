/**
 * 单射安全 ID 编码工具（Q-09-C 共享工具，2026-10-04）
 *
 * 将任意字符串确定性、单射地编码为 ID 安全字符集（字母/数字/'-'/'_'）。
 * 每个非安全字符（含转义字符 '_' 自身，0x5F → _005f）转义为 '_' + 定长 4 位十六进制，
 * 编码确定且可逆。
 *
 * 单射性保证：不同输入 → 必然不同编码 → 不同 ID；
 * 不依赖任何哈希，因而不存在短哈希碰撞导致的身份覆盖风险。
 * 同一输入重复调用 → 相同编码（幂等）。
 *
 * 使用方（不得复制第二份实现）：
 * - splitService：批次域 child WorkloadResult ID / WorkloadSplit ID（executionBatchId 编码）
 * - ActionSubmissionService：child WorkloadCard ID（recommendationId::childWorkloadResultId 编码）
 *
 * 领域原则：当两个不同输入碰撞会导致同一领域实体身份被覆盖时，
 * ID 生成必须使用本类单射方案，不得使用概率性短哈希摘要。
 */
export function encodeIdComponent(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (
      (code >= 48 && code <= 57) ||  // 0-9
      (code >= 65 && code <= 90) ||  // A-Z
      (code >= 97 && code <= 122) || // a-z
      code === 45                    // '-'
    ) {
      out += input[i];
    } else {
      out += "_" + code.toString(16).padStart(4, "0");
    }
  }
  return out;
}
