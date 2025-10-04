import { useStore } from "@nanostores/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  filterMap,
  addToAtom,
  removeFromAtom,
} from "@/stores/search";

interface Props {
  group: "Publishers" | "Staff";
  items: string[];
}

export default function SearchGroupItems({ group, items }: Props) {
  const selectedAtom = filterMap[group];
  const selectedItems = useStore(selectedAtom) ?? [];

  return (
    <div id={`${group}-items`} className="flex flex-col gap-2 p-2">
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
          <Label htmlFor={`${group}-${index}`} className="flex-1 cursor-pointer text-md">
            {item}
          </Label>
        </div>
      ))}
    </div>
  );
}
