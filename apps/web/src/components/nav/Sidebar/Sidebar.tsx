import {
  Sidebar,
  SidebarInset,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarProvider,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroupLabel,
  SidebarRail,
} from "@/components/ui/sidebar";
import { IconHome } from "@tabler/icons-react";
import { CollapsedSidebarTrigger } from "@/components/nav/Sidebar/CollapsedSidebarTrigger";
import { ExpandedSidebarTrigger } from "@/components/nav/Sidebar/ExpandedSidebarTrigger";
import { useIsMobile } from "@/hooks/use-mobile";
import * as React from "react";

interface Props {
  currentPath?: string;
}

// TODO: replace with actual icons and links
const menuItems = [
  { label: "Home", icon: IconHome, href: "/" },
  { label: "Novels", icon: IconHome, href: "/novels" },
  { label: "Tags", icon: IconHome, href: "/tags" },
  { label: "Publishers", icon: IconHome, href: "/publishers" },
  { label: "Staff", icon: IconHome, href: "/staff" },
  // { label: "Users", icon: IconHome, href: "/users" },
  { label: "Forums", icon: IconHome, href: "/forums" },
  { label: "Recent Changes", icon: IconHome, href: "/history" },
];
// TODO: show with auth
// const hiddenMenuItems = [
//   { label: "Reading History", icon: IconHome, href: "/reading-history" },
//   { label: "Add to Database", icon: IconHome, href: "/add" },
// ];

export default function AppSidebar({ currentPath }: Props) {
  const isMobile = useIsMobile();
  const [key, setKey] = React.useState(0);

  if (isMobile) {
    document.addEventListener("astro:after-swap", () => {
      setKey((prev) => prev + 1);
    });
  }

  return (
    <SidebarProvider key={key} defaultOpen={false}>
      <SidebarInset>
        <CollapsedSidebarTrigger />
      </SidebarInset>
      <Sidebar>
        <SidebarHeader
          id="sidebar-header"
          className="flex-row justify-between items-center h-16 pl-2"
        >
          <a href="/" className="flex items-center gap-2 text-3xl font-bold">
            <IconHome />
            WebNDB
          </a>
          <ExpandedSidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={currentPath === item.href}
                          className="text-lg"
                          asChild
                        >
                          <a href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="items-center text-md gap-0.5">
          <div className="flex gap-8 justify-center">
            <a href="/about">About</a>
            <a href="/api">API</a>
          </div>
          <a href="/compliance">Terms & Policies</a>
          <span>© 2025 WebNDB</span>
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
    </SidebarProvider>
  );
}
