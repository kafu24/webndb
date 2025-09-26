import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";

export const CollapsedSidebarTrigger = () => {
  const { state } = useSidebar();
  return (
    <SidebarTrigger
      className={`absolute top-4 left-2 z-50
        ${state === "expanded" ? "invisible delay-0" : "visible delay-200"}
        transition-visibility duration-0`}
    />
  );
};
