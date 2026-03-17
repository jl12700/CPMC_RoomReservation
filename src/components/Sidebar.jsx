import { useState } from "react";
import {
  CalendarClock,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
} from "lucide-react";

export function Sidebar({
  activeView,
  onChangeView,
  mobileOpen,
  onMobileClose,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const handleNavClick = (view) => {
    onChangeView?.(view);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          border-r border-slate-200 bg-white flex flex-col transition-all duration-200
          fixed inset-y-0 left-0 z-30 md:relative md:z-auto
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-slate-800 tracking-tight">
                CPMC <span className="text-blue-600">Rooms</span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="cursor-pointer inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4">
          <nav className="space-y-1 text-sm">
            <button
              type="button"
              onClick={() => handleNavClick("reserve")}
              className={`cursor-pointer group w-full flex items-center gap-2 rounded-md px-3 py-2 text-left transition-all duration-200 ${
                activeView === "reserve"
                  ? "bg-blue-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
            >
              <CalendarClock className="h-5 w-5 opacity-90 group-hover:opacity-100" />
              {!collapsed && <span>Reserve room</span>}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("my-reservations")}
              className={`cursor-pointer group w-full flex items-center gap-2 rounded-md px-3 py-2 text-left transition-all duration-200 ${
                activeView === "my-reservations"
                  ? "bg-blue-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
            >
              <UserCircle2 className="h-5 w-5 opacity-90 group-hover:opacity-100" />
              {!collapsed && <span>My reservations</span>}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("reservations")}
              className={`cursor-pointer group w-full flex items-center gap-2 rounded-md px-3 py-2 text-left transition-all duration-200 ${
                activeView === "reservations"
                  ? "bg-blue-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              }`}
            >
              <ListChecks className="h-5 w-5 opacity-90 group-hover:opacity-100" />
              {!collapsed && <span>View all reservations</span>}
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
