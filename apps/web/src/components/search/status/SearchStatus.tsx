import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supportedStatuses } from "@/components/search/status/statuses.ts";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { $selectedStatuses, addToAtom, removeFromAtom } from "@/stores/search";
import * as React from "react";
import { IconHome } from "@tabler/icons-react";
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

  return (
    <div className="flex flex-col flex-1 gap-2 relative">
      <span>Publication Status</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SearchStatusesToggle />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-144 p-1 max-h-60 overflow-y-auto"
        >
          <div className="flex flex-col gap-2 p-2">
            {supportedStatuses.map((status) => (
              <div key={status} className="flex items-center gap-1.5">
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
                  className="flex-1 cursor-pointer text-md"
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
