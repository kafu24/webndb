import { atom } from "nanostores";

export type SidebarState = "expanded" | "collapsed";

export const $sidebarState = atom<SidebarState>("expanded");
