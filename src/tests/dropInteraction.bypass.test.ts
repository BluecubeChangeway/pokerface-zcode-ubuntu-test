import { describe, expect, it, vi } from "vitest";
import type { CardSlot } from "../domain/card/types";
import type { DataService } from "../services/DataService";
import { mockSlots } from "../mock/mockCards";

/**
 * 防绕过验证（独立文件：vi.mock 需要全新模块注册表）：
 * 证明 UI slot drop handler 唯一经过 dropTrigger.handleWorkloadCardDropOnUnitSlot，
 * 不绕过它直接调用 resolutionTrigger。
 * 若 handler 绕过 dropTrigger，此处的 mock spy 不会被命中（0 次 → 测试失败）。
 */
const spies = vi.hoisted(() => ({
  handleWorkloadCardDropOnUnitSlot: vi.fn(() => Promise.resolve({ outcome: "ignored" })),
}));

vi.mock("../services/dropTrigger", () => ({
  handleWorkloadCardDropOnUnitSlot: spies.handleWorkloadCardDropOnUnitSlot,
}));

describe("UI drop handler 防绕过：唯一经过 dropTrigger", () => {
  it("onWorkloadCardSlotDrop 调用 handleWorkloadCardDropOnUnitSlot，参数逐项一致", async () => {
    const { onWorkloadCardDragStart, onWorkloadCardSlotDrop } = await import("../../app/dropInteraction");
    const { dataService } = await import("../services/MockDataService");

    const slot = mockSlots.find((s) => s.type === "workload")! as CardSlot;
    const dataTransfer = {
      store: new Map<string, string>(),
      setData(type: string, value: string) {
        this.store.set(type, value);
      },
      getData(type: string) {
        return this.store.get(type) ?? "";
      },
    };
    onWorkloadCardDragStart(dataTransfer, "workload-neurosurgery-outpatient");

    const result = await onWorkloadCardSlotDrop(
      dataService as DataService,
      dataTransfer,
      slot
    );

    expect(spies.handleWorkloadCardDropOnUnitSlot).toHaveBeenCalledTimes(1);
    expect(spies.handleWorkloadCardDropOnUnitSlot).toHaveBeenCalledWith(
      dataService,
      "workload-neurosurgery-outpatient",
      slot
    );
    // handler 原样透传 dropTrigger 的返回值，不做二次处理
    expect(result).toEqual({ outcome: "ignored" });
  });
});
