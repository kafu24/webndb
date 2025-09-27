import { useStore } from "@nanostores/react";
import { Separator } from "@/components/ui/separator";
import { IconX } from "@tabler/icons-react";

import {
  removeAuthor,
  removePublisher,
  removeTranslator,
  $selectedAuthors,
  $selectedPublishers,
  $selectedTranslators,
} from "@/stores/search";

interface Props {
  group: "Authors" | "Publishers" | "Translators";
}

const filterMap = {
  Authors: {
    selected: $selectedAuthors,
    remove: removeAuthor,
  },
  Publishers: {
    selected: $selectedPublishers,
    remove: removePublisher,
  },
  Translators: {
    selected: $selectedTranslators,
    remove: removeTranslator,
  },
};

export default function SearchGroupPills(props: Props) {
  const { selected, remove } = filterMap[props.group];
  const $selected = useStore(selected);
  const selectedItems = $selected ?? [];

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap max-w-full gap-2 p-2">
        {selectedItems.map((item: string) => (
          <button
            key={item}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            data-remove-item={item}
            data-group={props.group}
            onClick={(e) => {
              e.stopPropagation();
              remove(item);
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
