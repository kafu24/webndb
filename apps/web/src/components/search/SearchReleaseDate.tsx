import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  $selectedReleaseDates,
  updateOldestDate,
  updateLatestDate,
} from "@/stores/search";

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

interface SearchDateInputProps {
  label: string;
  date: Date | undefined;
  handleDateChange: (date: Date | undefined) => boolean;
  disabledMatcher: (date: Date) => boolean;
}

export default function SearchReleaseDate() {
  const releaseDates = useStore($selectedReleaseDates);

  const disableBeforeOldest = (date: Date) => {
    if (!releaseDates.oldest) return false;
    return date < releaseDates.oldest;
  };

  const disableAfterLatest = (date: Date) => {
    if (!releaseDates.latest) return false;
    return date > releaseDates.latest;
  };

  const SearchDateInput = ({
    label,
    date,
    handleDateChange,
    disabledMatcher,
  }: SearchDateInputProps) => {
    const [open, setOpen] = React.useState(false);
    const [month, setMonth] = React.useState<Date | undefined>(date);
    const [value, setValue] = React.useState(formatDate(date));
    const [isInvalid, setIsInvalid] = React.useState(false);

    return (
      <div className="flex flex-col gap-2">
        <span>{label}</span>
        <div className="relative flex gap-2">
          <Input
            value={value}
            placeholder="Any"
            className={`bg-background pr-10 ${isInvalid ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              setValue(e.target.value);
              if (isValidDate(newDate) || e.target.value === "")
                setIsInvalid(false);
              else setIsInvalid(true);
            }}
            onBlur={(e) => {
              const newDate = new Date(e.target.value);
              setValue(e.target.value);
              if (isValidDate(newDate)) {
                if (handleDateChange(newDate)) setIsInvalid(false)
                else setIsInvalid(true)
                setMonth(newDate);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
              } else if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              >
                <CalendarIcon className="size-3.5" />
                <span className="sr-only">Select date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="end"
              alignOffset={-8}
              sideOffset={10}
            >
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                month={month}
                onMonthChange={setMonth}
                disabled={disabledMatcher}
                onSelect={(selectedDate) => {
                  handleDateChange(selectedDate);
                  setValue(formatDate(selectedDate));
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-8">
      <SearchDateInput
        label="Oldest Release Date"
        date={releaseDates.oldest}
        handleDateChange={updateOldestDate}
        disabledMatcher={disableAfterLatest}
      />
      <SearchDateInput
        label="Latest Release Date"
        date={releaseDates.latest}
        handleDateChange={updateLatestDate}
        disabledMatcher={disableBeforeOldest}
      />
    </div>
  );
}
