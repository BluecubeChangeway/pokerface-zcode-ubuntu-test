import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Eye,
  FileText,
  Settings,
  Database,
  Columns,
  HardDrive,
  BarChart2,
} from "lucide-react";
import { clsx } from "clsx";
import { useI18n } from "../providers/I18nProvider";
import { useTheme } from "../providers/ThemeProvider";

interface DataSource {
  id: string;
  name: string;
  type: "csv" | "excel" | "database" | "api";
  status: "ready" | "processing" | "error" | "pending";
  rows: number;
  columns: number;
  uploadedAt: string;
  size: string;
}

interface CleaningRule {
  id: string;
  name: string;
  type: "deduplicate" | "fill_missing" | "remove_outliers" | "type_cast" | "custom";
  status: "active" | "inactive";
  description: string;
}

const MOCK_DATA_SOURCES: DataSource[] = [
  { id: "ds-001", name: "门诊记录_2025", type: "csv", status: "ready", rows: 125840, columns: 28, uploadedAt: "2025-01-15", size: "45.2 MB" },
  { id: "ds-002", name: "住院记录_2025", type: "excel", status: "ready", rows: 89320, columns: 35, uploadedAt: "2025-01-10", size: "67.8 MB" },
  { id: "ds-003", name: "人员档案", type: "database", status: "ready", rows: 2840, columns: 18, uploadedAt: "2025-01-05", size: "12.4 MB" },
  { id: "ds-004", name: "药品目录", type: "csv", status: "processing", rows: 0, columns: 0, uploadedAt: "2025-01-20", size: "8.9 MB" },
];

const MOCK_CLEANING_RULES: CleaningRule[] = [
  { id: "cr-001", name: "去重：同一患者同一天同科室重复记录", type: "deduplicate", status: "active", description: "按 patient_id + visit_date + dept_id 去重，保留第一条" },
  { id: "cr-002", name: "缺失值填充：年龄为空按科室中位数填充", type: "fill_missing", status: "active", description: "科室维度中位数填充，标记 is_filled=true" },
  { id: "cr-003", name: "异常值剔除：费用超过 3 倍标准差", type: "remove_outliers", status: "active", description: "按诊疗项目分组，超过 μ+3σ 标记为异常" },
  { id: "cr-004", name: "类型转换：日期字段统一为 ISO 8601", type: "type_cast", status: "active", description: "自动识别多种日期格式，转换为 YYYY-MM-DD" },
];

export function DataWorkbenchView() {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"sources" | "preview" | "pipeline" | "stats">("sources");
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      console.log("Upload:", file.name);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  }, [handleUpload]);

  const filteredSources = MOCK_DATA_SOURCES.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="toolbar flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-text-muted))]" />
          <input
            type="text"
            placeholder={t("common.search") + " 数据源..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={() => {}}>
            <RefreshCw className="w-4 h-4" />
            <span>{t("common.refresh")}</span>
          </button>
          <label className="btn-primary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{t("common.upload")}</span>
            <input type="file" multiple accept=".csv,.xlsx,.xls,.json" onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))} className="hidden" />
          </label>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={clsx(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-brand",
          "border-[rgb(var(--color-border-primary))] bg-[rgb(var(--color-bg-tertiary))]",
          "hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10"
        )}
        role="button"
        tabIndex={0}
        aria-label="拖拽上传数据文件"
      >
        <Upload className="w-12 h-12 mx-auto text-[rgb(var(--color-text-muted))] mb-3" />
        <p className="text-[rgb(var(--color-text-secondary))] mb-1">拖拽文件到此处，或点击上方上传按钮</p>
        <p className="text-sm text-[rgb(var(--color-text-muted))]">支持 CSV、Excel、JSON 格式，单文件 ≤ 500MB</p>
      </div>

      <div className="flex gap-1 bg-[rgb(var(--color-bg-tertiary))] rounded-lg p-1" role="tablist">
        {[
          { key: "sources", label: "数据源管理", icon: <FileText className="w-4 h-4" /> },
          { key: "preview", label: "数据预览", icon: <Eye className="w-4 h-4" /> },
          { key: "pipeline", label: "清洗管道", icon: <Settings className="w-4 h-4" /> },
          { key: "stats", label: "基础统计", icon: <BarChart2 className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-brand",
              "text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]",
              activeTab === tab.key
                ? "bg-[rgb(var(--color-bg-primary))] text-brand-600 dark:text-brand-400 shadow-elevation-1"
                : "hover:bg-[rgb(var(--color-bg-primary))] hover:text-[rgb(var(--color-text-primary))]"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "sources" && (
            <motion.div key="sources" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col">
              <div className="card-elevated h-full flex flex-col">
                <div className="panel-header">
                  <h2 className="panel-title">{t("common.search")} 结果: {filteredSources.length} 个数据源</h2>
                </div>
                <div className="panel-content overflow-auto p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[rgb(var(--color-bg-tertiary))] sticky top-0">
                        <tr className="text-left text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wider">
                          <th className="px-4 py-3">名称</th>
                          <th className="px-4 py-3">类型</th>
                          <th className="px-4 py-3">状态</th>
                          <th className="px-4 py-3">行数</th>
                          <th className="px-4 py-3">列数</th>
                          <th className="px-4 py-3">大小</th>
                          <th className="px-4 py-3">上传时间</th>
                          <th className="px-4 py-3 w-24">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgb(var(--color-border-primary))]">
                        {filteredSources.map((source) => (
                          <tr key={source.id} className="hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors" onClick={() => setSelectedSource(source)}>
                            <td className="px-4 py-3 font-medium text-[rgb(var(--color-text-primary))]">{source.name}</td>
                            <td className="px-4 py-3"><span className="badge-info">{source.type.toUpperCase()}</span></td>
                            <td className="px-4 py-3">
                              <span className={clsx(
                                "badge",
                                source.status === "ready" && "badge-success",
                                source.status === "processing" && "badge-info",
                                source.status === "error" && "badge-danger",
                                source.status === "pending" && "badge-warning"
                              )}>
                                {source.status === "ready" && "就绪"}
                                {source.status === "processing" && "处理中"}
                                {source.status === "error" && "错误"}
                                {source.status === "pending" && "待处理"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[rgb(var(--color-text-secondary))]">{source.rows.toLocaleString()}</td>
                            <td className="px-4 py-3 text-[rgb(var(--color-text-secondary))]">{source.columns}</td>
                            <td className="px-4 py-3 text-[rgb(var(--color-text-secondary))]">{source.size}</td>
                            <td className="px-4 py-3 text-[rgb(var(--color-text-secondary))]">{source.uploadedAt}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button className="toolbar-btn" aria-label="预览" onClick={(e) => { e.stopPropagation(); setSelectedSource(source); setActiveTab("preview"); }}><Eye className="w-4 h-4" /></button>
                                <button className="toolbar-btn" aria-label="编辑" onClick={(e) => e.stopPropagation()}><Edit className="w-4 h-4" /></button>
                                <button className="toolbar-btn" aria-label="删除" onClick={(e) => e.stopPropagation()}><Trash2 className="w-4 h-4 text-red-500" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              <div className="card-elevated h-full flex flex-col">
                <div className="panel-header flex flex-wrap gap-4">
                  <h2 className="panel-title">{selectedSource ? `${selectedSource.name} - 数据预览` : "请先选择数据源"}</h2>
                  <div className="flex gap-2 ml-auto">
                    <button className="btn-secondary">{t("common.export")}</button>
                    <button className="btn-primary">{t("common.download")}</button>
                  </div>
                </div>
                <div className="panel-content overflow-auto">
                  {selectedSource ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[rgb(var(--color-bg-tertiary))] sticky top-0">
                          <tr>
                            {["患者ID", "就诊日期", "科室", "诊断", "费用", "医生", "年龄", "性别"].map((col) => (
                              <th key={col} className="px-3 py-2 text-left font-medium text-[rgb(var(--color-text-muted))]">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="border-t border-[rgb(var(--color-border-primary))] hover:bg-[rgb(var(--color-bg-tertiary))]">
                              {["P001234", "2025-01-15", "神经外科", "M78.1", "¥2,340", "张医生", "45", "男"].map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-[rgb(var(--color-text-secondary))]">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 text-sm text-[rgb(var(--color-text-muted))]">
                        显示前 10 行，共 {selectedSource.rows.toLocaleString()} 行 × {selectedSource.columns} 列
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-[rgb(var(--color-text-muted))]">
                      请在「数据源管理」标签页选择一个数据源进行预览
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "pipeline" && (
            <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              <div className="card-elevated h-full flex flex-col">
                <div className="panel-header">
                  <h2 className="panel-title">清洗管道可视化</h2>
                  <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> 新增规则</button>
                </div>
                <div className="panel-content overflow-auto">
                  <div className="space-y-3">
                    {MOCK_CLEANING_RULES.map((rule) => (
                      <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={clsx("card p-4 flex items-center gap-4", rule.status === "inactive" && "opacity-50")}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-100 dark:bg-brand-900/30">
                          {rule.type === "deduplicate" && <Trash2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />}
                          {rule.type === "fill_missing" && <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />}
                          {rule.type === "remove_outliers" && <Filter className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                          {rule.type === "type_cast" && <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[rgb(var(--color-text-primary))]">{rule.name}</span>
                            <span className={clsx("badge", rule.status === "active" ? "badge-success" : "badge-warning")}>
                              {rule.status === "active" ? "启用" : "禁用"}
                            </span>
                            <span className="badge-info text-xs">{rule.type}</span>
                          </div>
                          <p className="text-sm text-[rgb(var(--color-text-muted))] truncate">{rule.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="toolbar-btn" aria-label="编辑"><Edit className="w-4 h-4" /></button>
                          <button className="toolbar-btn" aria-label={rule.status === "active" ? "禁用" : "启用"}>{rule.status === "active" ? <Settings className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}</button>
                          <button className="toolbar-btn" aria-label="删除"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "stats" && (
            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
              <div className="card-elevated h-full flex flex-col">
                <div className="panel-header">
                  <h2 className="panel-title">基础统计分析</h2>
                </div>
                <div className="panel-content">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "总数据源", value: "4", icon: <FileText className="w-5 h-5" />, color: "brand" },
                      { label: "总行数", value: "218K", icon: <Database className="w-5 h-5" />, color: "green" },
                      { label: "总列数", value: "81", icon: <Columns className="w-5 h-5" />, color: "orange" },
                      { label: "存储占用", value: "134 MB", icon: <HardDrive className="w-5 h-5" />, color: "purple" },
                    ].map((stat, i) => (
                      <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center", `${stat.color}-100 dark:${stat.color}-900/30`)}>{stat.icon}</div>
                          <div>
                            <p className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">{stat.value}</p>
                            <p className="text-sm text-[rgb(var(--color-text-muted))]">{stat.label}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card p-4 h-64"><h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-4">数据完整度概览</h3><div className="h-full flex items-center justify-center text-[rgb(var(--color-text-muted))]">[图表占位：各字段缺失率柱状图]</div></div>
                    <div className="card p-4 h-64"><h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-4">数值分布</h3><div className="h-full flex items-center justify-center text-[rgb(var(--color-text-muted))]">[图表占位：费用/年龄等核心指标直方图]</div></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}