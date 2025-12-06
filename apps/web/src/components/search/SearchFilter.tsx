import SearchGroup from "@/components/search/SearchGroup";
import SearchLanguage from "@/components/search/SearchLanguage";
import SearchMinMax from "@/components/search/SearchMinMax";
import SearchSortBy from "@/components/search/SearchSortBy";
import SearchStatus from "@/components/search/SearchStatus";
import SearchTag from "@/components/search/SearchTag";
import SearchReleaseDate from "@/components/search/SearchReleaseDate";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { resetAllFilters } from "@/stores/search";

export default function SearchFilter() {
  // TODO: support other viewports with resizing
  useEffect(() => {
    const filterToggle = document.getElementById("search-filter-toggle");
    const filterToggleText = document.getElementById(
      "search-filter-toggle-text",
    );
    const filterToggleIcon = document.getElementById(
      "search-filter-toggle-icon",
    );
    const filter = document.getElementById("search-filter");

    const handleToggle = () => {
      filter?.classList.toggle("h-0");
      filter?.classList.toggle("h-68");
      filterToggleIcon?.classList.toggle("rotate-180");
      if (filterToggleText) {
        filterToggleText.textContent = filter?.classList.contains("h-68")
          ? "Hide Filters"
          : "Show Filters";
      }
    };
    filterToggle?.addEventListener("click", handleToggle);

    return () => {
      filterToggle?.removeEventListener("click", handleToggle);
    };
  }, []);

  return (
    <div
      id="search-filter"
      className="h-0 overflow-hidden transition-[height] duration-150 ease-linear"
    >
      <div className="flex flex-col p-2 gap-2">
        <div className="flex gap-8">
          <SearchGroup group="Staff" />
          <SearchLanguage type="Original" />
          <SearchLanguage type="Available" />
          <SearchTag />
        </div>
        <div className="flex gap-8">
          <SearchGroup group="Publishers" />
          <SearchStatus />
          {/* TODO: dates */}
          <SearchReleaseDate />
        </div>
        <div className="flex gap-8">
          <SearchMinMax type="Chapters" />
          <SearchMinMax type="Readers" />
          <SearchMinMax type="Rating" />
          <SearchMinMax type="# Ratings" />
          <SearchMinMax type="Reviews" />
        </div>
        <div className="flex gap-8 justify-between mt-2">
          <SearchSortBy />
          {/* <SearchReadingList /> */}
          <Button
            size="lg"
            className="mt-auto text-base bg-foreground"
            onClick={resetAllFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
