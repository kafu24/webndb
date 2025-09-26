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
const followsMenuItems = [
  { label: "Updates", icon: IconHome, href: "/updates" },
  { label: "Reading History", icon: IconHome, href: "/reading-history" },
];
const titlesMenuItems = [
  { label: "Novels", icon: IconHome, href: "/novels" },
  { label: "Series", icon: IconHome, href: "/series" },
  { label: "Releases", icon: IconHome, href: "/releases" },
  { label: "Releases Calendar", icon: IconHome, href: "/releases/calendar" },
];
const communityMenuItems = [
  { label: "Forums", icon: IconHome, href: "/forums" },
  { label: "Staff", icon: IconHome, href: "/staff" },
  { label: "Publishers", icon: IconHome, href: "/publishers" },
  { label: "Tags", icon: IconHome, href: "/tags" },
  { label: "Users", icon: IconHome, href: "/users" },
];
const databaseMenuItems = [
  { label: "Recent Changes", icon: IconHome, href: "/history" },
  { label: "Add to Database", icon: IconHome, href: "/add" },
  { label: "Editing Guidelines", icon: IconHome, href: "/editing-guidelines" },
];

const menuSections = [
  { title: "Follows", items: followsMenuItems },
  { title: "Titles", items: titlesMenuItems },
  { title: "Community", items: communityMenuItems },
  { title: "Database", items: databaseMenuItems },
];

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={currentPath === "/"}
                  className="text-md"
                  asChild
                >
                  <a href="/">
                    <IconHome />
                    <span>Home</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {menuSections.map((section) => (
                <SidebarMenuItem key={section.title}>
                  <SidebarGroupLabel className="text-md font-semibold">
                    {section.title}
                  </SidebarGroupLabel>
                  <SidebarMenuSub>
                    {section.items.map((item) => (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton
                          isActive={currentPath === item.href}
                          className="text-md"
                          asChild
                        >
                          <a href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="items-center text-xs gap-0.5">
          <div className="flex gap-8 justify-center">
            <a href="/about">About</a>
            <a href="/api">API</a>
          </div>
          <a href="/compliance">Terms & Policies</a>
          <span className="text-xs">© 2025 WebNDB</span>
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
    </SidebarProvider>
  );
}
