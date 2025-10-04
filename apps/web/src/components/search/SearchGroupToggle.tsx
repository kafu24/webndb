import * as React from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@nanostores/react";
import { IconHome } from "@tabler/icons-react";
import { $selectedPublishers, $selectedStaff } from "@/stores/search";

interface Props {
  group: "Publishers" | "Staff";
}

const filterMap = {
  Publishers: $selectedPublishers,
  Staff: $selectedStaff,
};

const SearchGroupToggle = React.forwardRef<HTMLButtonElement, Props>(
  ({ group, ...rest }, ref) => {
    const selected = useStore(filterMap[group]);
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

export default SearchGroupToggle;
