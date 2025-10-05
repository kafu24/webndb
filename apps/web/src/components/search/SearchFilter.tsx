import SearchGroup from "@/components/search/SearchGroup";
import SearchLanguage from "@/components/search/SearchLanguage";
import SearchMinMax from "@/components/search/SearchMinMax";
import SearchSortBy from "@/components/search/SearchSortBy";
import SearchStatus from "@/components/search/SearchStatus";
import SearchTag from "@/components/search/SearchTag";
import * as React from "react";

export default function SearchFilter() {
  // TODO: support other viewports
  React.useEffect(() => {
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
      filter?.classList.toggle("h-96");
      filterToggleIcon?.classList.toggle("rotate-180");
      if (filterToggleText) {
        filterToggleText.textContent = filter?.classList.contains("h-96")
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
      <div className="flex flex-col p-2 mt-2">
        <div className="flex gap-8">
          <SearchLanguage type="Original" />
          <SearchLanguage type="Available" />
          <SearchGroup group="Publishers" />
          <SearchGroup group="Staff" />
        </div>
        <div className="flex gap-8">
          <SearchTag />
          <SearchStatus />
          {/* TODO: dates */}
        </div>
        <div className="flex gap-8">
          <SearchMinMax type="Chapters" />
          <SearchMinMax type="Readers" />
          <SearchMinMax type="Rating" />
          <SearchMinMax type="# Ratings" />
          <SearchMinMax type="Reviews" />
        </div>
        <div className="flex gap-8">
          <SearchSortBy />
          {/* <SearchReadingList /> */}
        </div>
      </div>
    </div>
  );
}
