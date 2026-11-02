import { DataWorkbenchView } from "./views/DataWorkbenchView";
import { CalculationView } from "./views/CalculationView";
import { ComparisonView } from "./views/ComparisonView";
import { SettingsView } from "./views/SettingsView";
import { AppShell } from "./components/ui/AppShell";
import { ViewState, ViewKey } from "./components/ui/AppShell";
import { motion, AnimatePresence } from "framer-motion";
import { UIProviders } from "./providers/UIProviders";

const VIEWS: ViewState[] = [
  { key: "data", label: "数据工作台", component: <DataWorkbenchView /> },
  { key: "calculation", label: "绩效测算/核算", component: <CalculationView /> },
  { key: "comparison", label: "绩效对比/报告", component: <ComparisonView /> },
  { key: "settings", label: "设置", component: <SettingsView /> },
];

export function App() {
  return (
    <UIProviders>
      <AnimatePresence mode="wait">
        <AppShell views={VIEWS} defaultView="data" />
      </AnimatePresence>
    </UIProviders>
  );
}