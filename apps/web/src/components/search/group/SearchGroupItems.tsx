import { useStore } from "@nanostores/react";
import { Separator } from "@/components/ui/separator";
import { IconX } from "@tabler/icons-react";

import {
  filterMap,
  removeFromAtom,
} from "@/stores/search";

interface Props {
  group: "Publishers" | "Staff";
}

export default function SearchGroupPills({ group }: Props) {
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
            data-remove-item={item}
            data-group={group}
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
}
