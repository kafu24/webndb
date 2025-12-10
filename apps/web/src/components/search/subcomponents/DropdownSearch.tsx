import { Input } from "@/components/ui/input";
import * as React from "react";
import { IconSearch } from "@tabler/icons-react";

interface Props {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DropdownSearch({
  placeholder = "Search",
  value,
  onChange,
}: Props) {
  return (
    <div className="relative p-1 pb-0">
      <IconSearch className="absolute left-3.5 top-6/11 -translate-y-1/2 w-4 pointer-events-none" />
      <Input
        placeholder={placeholder}
        className="pl-8.5 bg-accent"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
