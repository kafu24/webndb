import * as React from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@nanostores/react";
import { IconChevronDown } from "@tabler/icons-react";
import { filterMap } from "@/stores/search";

interface Props {
  type: keyof typeof filterMap;
}

const SearchTypeToggle = React.forwardRef<HTMLButtonElement, Props>(
  ({ type, ...rest }, ref) => {
    const selected = useStore(filterMap[type]);
    const displayText = selected.length === 0 ? "Any" : selected.join(", ");

    return (
      <Button
        variant="secondary"
        className="flex w-70 justify-between bg-accent hover:bg-accent/80 rounded"
        ref={ref}
        {...rest}
      >
        <span className="truncate flex-1 text-left">{displayText}</span>
        <IconChevronDown />
      </Button>
    );
  },
);

export default SearchTypeToggle;
