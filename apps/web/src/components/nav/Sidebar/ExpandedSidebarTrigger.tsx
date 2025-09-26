import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export const ExpandedSidebarTrigger = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button variant="ghost" size="sm" onClick={() => toggleSidebar()}>
      {/* TODO: change icon */}x
    </Button>
  );
};
