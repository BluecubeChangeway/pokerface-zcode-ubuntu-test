import { motion } from "framer-motion";
import { BarChart2, FileText } from "lucide-react";
import { useI18n } from "../providers/I18nProvider";
import { clsx } from "clsx";

export function ComparisonView() {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center p-8"
    >
      <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6", "bg-brand-100 dark:bg-brand-900/30")}>
        <BarChart2 className="w-8 h-8 text-brand-600 dark:text-brand-400" />
      </div>
      <h1 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
        {t("navigation.comparison")}
      </h1>
      <p className="text-[rgb(var(--color-text-secondary))] mb-6 max-w-md mx-auto">
        绩效对比与报告输出功能正在开发中，预计在核算功能稳定后发布。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <FileText className="w-10 h-10 text-brand-600 dark:text-brand-400 mx-auto mb-3" />
          <h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-1">多方案对比</h3>
          <p className="text-sm text-[rgb(var(--color-text-muted))]">并排对比不同绩效方案的测算结果、核算指标、预算占用</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
          <FileText className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-3" />
          <h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-1">报告生成</h3>
          <p className="text-sm text-[rgb(var(--color-text-muted))]">一键生成 Word/PDF/Excel 格式的绩效分析报告，支持自定义模板</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
          <FileText className="w-10 h-10 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
          <h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-1">趋势分析</h3>
          <p className="text-sm text-[rgb(var(--color-text-muted))]">跨周期、跨科室、跨人员的趋势追踪与异常预警</p>
        </motion.div>
      </div>
    </motion.div>
  );
}