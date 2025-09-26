import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";

export const CollapsedSidebarTrigger = () => {
  const { state, toggleSidebar } = useSidebar();

  if (state === "expanded") return null;

  return <SidebarTrigger className="absolute top-4 left-2 z-50" />;
};
