// ToggleButton.tsx
import { IconHome } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@nanostores/react";
import {
  $selectedAuthors,
  $selectedPublishers,
  $selectedTranslators,
} from "@/stores/search";

interface Props {
  group: "Authors" | "Publishers" | "Translators";
}

const filterMap = {
  Authors: $selectedAuthors,
  Publishers: $selectedPublishers,
  Translators: $selectedTranslators,
};

export default function SearchGroupToggle(props: Props) {
  const selected = filterMap[props.group];
  const $selected = useStore(selected);
  const selectedItems = $selected ?? [];
  const displayText =
    selectedItems.length === 0 ? "Any" : selectedItems.join(", ");

  return (
    <Button
      id={`${props.group}-toggle`}
      variant="secondary"
      className="flex w-full justify-between font-bold"
    >
      <span className="truncate flex-1 text-left">{displayText}</span>
      <IconHome />
    </Button>
  );
}
