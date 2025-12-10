import SearchTypeToggle from "@/components/search/subcomponents/SearchTypeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/data/languages";
import { useStore } from "@nanostores/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { filterMap, addToAtom, removeFromAtom } from "@/stores/search";

interface Props {
  type: "Original" | "Available";
}

export default function SearchLanguage({ type }: Props) {
  const selectedAtom = filterMap[type];
  const selectedItems = useStore(selectedAtom) ?? [];

  return (
    <div className="flex flex-col flex-1 gap-1 relative">
      <span className="font-semibold">{type} Languages</span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SearchTypeToggle type={type} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="flex flex-col gap-2 p-2 w-68">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <div key={lang.name} className="flex items-center gap-2">
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
                  className="cursor-pointer font-medium w-full"
                >
                  <lang.flag className="w-5 h-4" />
                  {lang.name}
                </Label>
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
