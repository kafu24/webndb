import { $selectedSortBy } from "@/stores/search";
import { SUPPORTED_SORT_BY } from "@/data/sortBy";
import { useStore } from "@nanostores/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconChevronDown } from "@tabler/icons-react";

export default function SearchSortBy() {
  const selectedSortBy = useStore($selectedSortBy);

  return (
    <div className="flex gap-1">
      <span className="font-semibold mt-1">Sort By</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="flex justify-between rounded text-left w-40 px-3"
          >
            {selectedSortBy}
            <IconChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          avoidCollisions={false}
          className="max-h-60 overflow-y-auto w-40 p-0"
        >
          {SUPPORTED_SORT_BY.map((option) => (
            <DropdownMenuItem
              key={`search-sort-${option}`}
              onClick={() => $selectedSortBy.set(option)}
              className={`flex rounded-none font-semibold ${
                selectedSortBy === option
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              <span>{option}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
