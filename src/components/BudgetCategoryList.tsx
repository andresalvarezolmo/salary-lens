import { Plus, X } from "lucide-react";
import type { BudgetCategory } from "../lib/pension";
import { useTheme } from "../lib/theme";

interface Props {
  categories: BudgetCategory[];
  onUpdate: (id: string, field: "label" | "monthlyAmount", value: string | number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel?: string;
}

export function BudgetCategoryList({
  categories,
  onUpdate,
  onAdd,
  onRemove,
  addLabel = "Add category",
}: Props) {
  const theme = useTheme();
  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <div key={cat.id} className="group relative">
          {!cat.builtIn && (
            <button
              onClick={() => onRemove(cat.id)}
              className="absolute -right-1.5 -top-1.5 z-10 p-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-500 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-all"
              title="Remove category"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <div className="space-y-1.5">
            <input
              type="text"
              value={cat.label}
              onChange={(e) => onUpdate(cat.id, "label", e.target.value)}
              className={`block text-sm font-medium bg-transparent border-none outline-none p-0 w-full ${
                cat.builtIn
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                £
              </span>
              <input
                type="text"
                value={cat.monthlyAmount.toLocaleString("en-GB")}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  onUpdate(cat.id, "monthlyAmount", parseFloat(raw) || 0);
                }}
                className={`w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm py-2 pl-8 pr-3 focus:ring-2 ${theme.focusRing} ${theme.focusBorder} outline-none transition-colors`}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={onAdd}
        className="w-full py-2 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-slate-300 hover:text-slate-600 dark:hover:border-slate-500 dark:hover:text-slate-400 transition-colors flex items-center justify-center gap-1.5 text-sm"
      >
        <Plus className="w-4 h-4" />
        {addLabel}
      </button>
    </div>
  );
}
