import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_STATUSES } from "@/data/novels";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { $selectedStatuses, addToAtom, removeFromAtom } from "@/stores/search";
import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function SearchStatus() {
  const selectedStatuses = useStore($selectedStatuses) ?? [];

  const SearchStatusesToggle = React.forwardRef<HTMLButtonElement>(
    ({ ...rest }, ref) => {
      let displayText = "Any";
      if (selectedStatuses.length > 0)
        displayText = `${selectedStatuses.join(", ")}`;
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

  return (
    <div className="flex flex-col flex-1 gap-1 relative">
      <span className="font-semibold">Publication Status</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SearchStatusesToggle />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="flex flex-col gap-2 p-2 w-68">
            {SUPPORTED_STATUSES.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <Checkbox
                  id={`$search-${status}`}
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={(checked: boolean) => {
                    if (checked) addToAtom($selectedStatuses, status);
                    else removeFromAtom($selectedStatuses, status);
                  }}
                />
                <Label
                  htmlFor={`$search-${status}`}
                  className="flex-1 cursor-pointer font-medium"
                >
                  {status}
                </Label>
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
