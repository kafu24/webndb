import SearchTypeToggle from "@/components/search/subcomponents/SearchTypeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DropdownSearch from "@/components/search/subcomponents/DropdownSearch";
import { useStore } from "@nanostores/react";
import { Separator } from "@/components/ui/separator";
import { IconX } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { filterMap, addToAtom, removeFromAtom } from "@/stores/search";

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

// TODO: set up levenshtein distance searching for names
export default function SearchGroup({ group }: Props) {
  const SearchGroupItems = () => {
    const selectedAtom = filterMap[group];
    const selectedItems = useStore(selectedAtom) ?? [];

    if (selectedItems.length === 0) return null;

    return (
      <>
        <div className="flex flex-wrap max-w-full gap-2 p-2">
          {selectedItems.map((item) => (
            <button
              key={item}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              onClick={(e) => {
                e.stopPropagation();
                removeFromAtom(selectedAtom, item);
              }}
            >
              <span>{item}</span>
              <IconX className="w-3 h-3" />
            </button>
          ))}
        </div>
        <Separator />
      </>
    );
  };

  const SearchGroupList = () => {
    const selectedAtom = filterMap[group];
    const selectedItems = useStore(selectedAtom) ?? [];

    return (
      <div className="flex flex-col gap-2 p-2">
        {items.map((item, index) => (
          <div key={item} className="flex items-center gap-1.5">
            <Checkbox
              id={`${group}-${index}`}
              checked={selectedItems.includes(item)}
              onCheckedChange={(checked: boolean) => {
                if (checked) addToAtom(selectedAtom, item);
                else removeFromAtom(selectedAtom, item);
              }}
            />
            <Label
              htmlFor={`${group}-${index}`}
              className="flex-1 cursor-pointer text-md"
            >
              {item}
            </Label>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 gap-2 relative">
      <span>{group}</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SearchTypeToggle type={group} />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 p-1 max-h-60 overflow-y-auto">
          <DropdownSearch
            placeholder={`Search ${group.toLowerCase()}`}
            // TODO
            // value={searchQuery}
            // onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SearchGroupItems />
          <SearchGroupList />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
