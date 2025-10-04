import SearchGroupItems from "@/components/search/group/SearchGroupItems";
import SearchGroupList from "@/components/search/group/SearchGroupList";
import SearchTypeToggle from "@/components/search/SearchTypeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { IconHome } from "@tabler/icons-react";

interface Props {
  group: "Publishers" | "Staff";
}

const items = [
  "item1",
  "item2",
  "itemitem3",
  "itemitemitem4",
  "item5",
  "item6",
  "item7",
  "item8",
  "item9",
  "item10",
];

export default function SearchGroup({ group }: Props) {
  return (
    <div className="flex flex-col flex-1 gap-2 relative">
      <span>{group}</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SearchTypeToggle type={group} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-1 max-h-60 overflow-y-auto">
          <div className="relative p-1">
            <IconHome className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 pointer-events-none" />
            <Input placeholder="Search" className="pl-9 bg-accent" />
          </div>
          <SearchGroupItems group={group} />
          <SearchGroupList group={group} items={items} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
