import { useStore } from "@nanostores/react";
import {
  $selectedAuthors,
  $selectedPublishers,
  $selectedTranslators,
  addAuthor,
  addPublisher,
  addTranslator,
  removeAuthor,
  removePublisher,
  removeTranslator,
} from "@/stores/search";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  group: "Authors" | "Publishers" | "Translators";
  items: string[];
}

const filterMap = {
  Authors: {
    selected: $selectedAuthors,
    add: addAuthor,
    remove: removeAuthor,
  },
  Publishers: {
    selected: $selectedPublishers,
    add: addPublisher,
    remove: removePublisher,
  },
  Translators: {
    selected: $selectedTranslators,
    add: addTranslator,
    remove: removeTranslator,
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
