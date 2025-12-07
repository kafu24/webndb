import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supportedTags } from "@/components/search/data/tags";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { $selectedTags, updateTagState } from "@/stores/search";
import * as React from "react";
import { IconHome } from "@tabler/icons-react";
import DropdownSearch from "@/components/search/subcomponents/DropdownSearch";

export default function SearchTag() {
  const selectedTags = useStore($selectedTags) ?? [];
  const [searchQuery, setSearchQuery] = React.useState("");
  const filteredTags = supportedTags
    .map((tagGroup) => {
      const filteredGroupTags = tagGroup.tags.filter((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      return { ...tagGroup, tags: filteredGroupTags };
    })
    .filter((tagGroup) => tagGroup.tags.length > 0);

  const SearchTagsToggle = React.forwardRef<HTMLButtonElement>(
    ({ ...rest }, ref) => {
      const included = Array.from(selectedTags.included);
      const excluded = Array.from(selectedTags.excluded);
      let displayText = "Any";

      if (included.length > 0 && excluded.length > 0) {
        displayText = `Included: ${included.join(", ")} & Excluded: ${excluded.join(", ")}`;
      } else if (included.length > 0) {
        displayText = `Included: ${included.join(", ")}`;
      } else if (excluded.length > 0) {
        displayText = `Excluded: ${excluded.join(", ")}`;
      }

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
      <span>Tags</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SearchTagsToggle />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-144 p-1 max-h-60 overflow-y-auto"
        >
          <DropdownSearch
            placeholder="Search tags"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {filteredTags.length > 0 ? (
            filteredTags.map((tagGroup) => (
              <div key={`search-${tagGroup.name}`} className="flex flex-col">
                <h2>{tagGroup.name}</h2>
                <div className="flex flex-wrap gap-2 p-2">
                  {tagGroup.tags.map((tag) => (
                    <div key={tag} className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTagState(tag)}
                        className={
                          selectedTags.included.has(tag)
                            ? "!border-green-400 !text-green-600"
                            : selectedTags.excluded.has(tag)
                              ? "!border-red-400 !text-red-600 border-dotted border-2"
                              : ""
                        }
                      >
                        {tag}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No tags found
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
