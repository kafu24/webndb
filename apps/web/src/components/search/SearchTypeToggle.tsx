import * as React from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@nanostores/react";
import { IconHome } from "@tabler/icons-react";
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
        className="flex w-full justify-between font-bold"
        ref={ref}
        {...rest}
      >
        <span className="truncate flex-1 text-left">{displayText}</span>
        <IconHome />
      </Button>
    );
  },
);

export default SearchTypeToggle;
