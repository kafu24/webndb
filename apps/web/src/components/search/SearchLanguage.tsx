import SearchTypeToggle from "@/components/search/subcomponents/SearchTypeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DropdownSearch from "@/components/search/subcomponents/DropdownSearch";
import { IconHome } from "@tabler/icons-react";
import { supportedLanguages } from "@/components/search/data/languages";
import { useStore } from "@nanostores/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { filterMap, addToAtom, removeFromAtom } from "@/stores/search";
import * as React from "react";

interface Props {
  type: "Original" | "Available";
}

export default function SearchLanguage({ type }: Props) {
  const selectedAtom = filterMap[type];
  const selectedItems = useStore(selectedAtom) ?? [];
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchedLanguages = supportedLanguages.filter((lang) =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <div className="flex flex-col flex-1 gap-2 relative">
      <span>{type} Languages</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SearchTypeToggle type={type} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-144 p-1 max-h-60 overflow-y-auto"
        >
          <DropdownSearch
            placeholder="Search languages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 p-2">
            {searchedLanguages.map((lang) => (
              <div
                key={lang.name}
                className="flex items-center gap-1.5 w-[calc(25%-0.375rem)]"
              >
                <Checkbox
                  id={`search-${lang.name}`}
                  checked={selectedItems.includes(lang.name)}
                  onCheckedChange={(checked: boolean) => {
                    if (checked) addToAtom(selectedAtom, lang.name);
                    else removeFromAtom(selectedAtom, lang.name);
                  }}
                />

                <Label
                  htmlFor={`search-${lang.name}`}
                  className="flex-1 cursor-pointer text-md"
                >
                  <lang.flag />
                  {lang.name}
                </Label>
              </div>
            ))}
            {searchedLanguages.length === 0 && (
              <div className="w-full text-center text-muted-foreground">
                No languages found
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
