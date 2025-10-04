import { useStore } from "@nanostores/react";
import {
  $selectedPublishers,
  $selectedStaff,
  addPublisher,
  addStaff,
  removePublisher,
  removeStaff,
} from "@/stores/search";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  group: "Publishers" | "Staff";
  items: string[];
}

const filterMap = {
  Publishers: {
    selected: $selectedPublishers,
    add: addPublisher,
    remove: removePublisher,
  },
  Staff: {
    selected: $selectedStaff,
    add: addStaff,
    remove: removeStaff,
  },
};

export default function SearchGroupItems(props: Props) {
  const { selected, add, remove } = filterMap[props.group];
  const $selected = useStore(selected);
  const selectedItems = $selected ?? [];

  return (
    <div id={`${props.group}-items`} className="flex flex-col gap-2 p-2">
      {props.items.map((item, index) => (
        <div key={item} className="flex items-center gap-1.5">
          <Checkbox
            id={`${props.group}-${index}`}
            checked={selectedItems.includes(item)}
            onCheckedChange={(checked: boolean) => {
              checked ? add(item) : remove(item);
            }}
          />
          <Label
            htmlFor={`${props.group}-${index}`}
            className="flex-1 cursor-pointer text-md"
          >
            {item}
          </Label>
        </div>
      ))}
    </div>
  );
}
