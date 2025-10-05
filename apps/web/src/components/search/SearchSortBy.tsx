import { $selectedSortBy } from "@/stores/search";
import { supportedSortBy } from "@/components/search/data/sortBy";
import { useStore } from "@nanostores/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconHome } from "@tabler/icons-react";

export default function SearchSortBy() {
  const selectedSortBy = useStore($selectedSortBy);

  return (
    <div className="flex flex-col gap-2">
      <span>Sort By</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="flex w-full justify-between font-bold"
          >
            <span>{selectedSortBy}</span>
            <IconHome />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {supportedSortBy.map((option) => (
            <DropdownMenuItem
              key={`search-sort-${option}`}
              onClick={() => $selectedSortBy.set(option)}
              className={`flex justify-between ${
                selectedSortBy === option
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              <span>{option}</span>
              {selectedSortBy === option && <IconHome />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
