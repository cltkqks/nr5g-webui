import { NavigationItem, TabId } from "../navigation";

interface SideNavigationProps {
  items: NavigationItem[];
  activeId: TabId;
  onSelect: (id: TabId) => void;
}

export function SideNavigation({
  items,
  activeId,
  onSelect,
}: SideNavigationProps) {
  return (
    <nav className="flex w-full flex-row gap-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-sm shadow-lg shadow-slate-950/30 lg:h-fit lg:w-60 lg:flex-col">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex-1 rounded-md px-3 py-2 text-left font-medium transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 lg:flex-none ${
              isActive
                ? "bg-cyan-500/15 text-cyan-300"
                : "text-slate-300 hover:bg-slate-800/80"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
