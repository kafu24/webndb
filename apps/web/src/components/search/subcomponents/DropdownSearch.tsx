import { Input } from "@/components/ui/input";
import * as React from "react";
import { IconHome } from "@tabler/icons-react";

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
    <div className="relative p-1">
      <IconHome className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 pointer-events-none" />
      <Input
        placeholder={placeholder}
        className="pl-9 bg-accent"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
