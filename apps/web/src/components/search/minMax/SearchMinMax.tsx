import { $selectedMinMax, toggleMinMax } from "@/stores/search";
import { supportedMinMax } from "@/components/search/minMax/minMax";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  type: (typeof supportedMinMax)[number];
}

export default function SearchMinMax({ type }: Props) {
  const selectedMinMax = useStore($selectedMinMax);

  const current = selectedMinMax[type];

  const updateValue = (newValue: string) => {
    const numValue = newValue === "" ? 0 : Number(newValue);
    $selectedMinMax.set({
      ...selectedMinMax,
      [type]: { ...current, value: numValue },
    });
  };

  return (
    <div className="flex flex-col flex-1 gap-2">
      <div className="flex w-full items-center gap-1">
        <span>{type} [</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => toggleMinMax(type)}
          className="h-auto w-12 p-0.5"
        >
          {current.type}
        </Button>
        <span>]</span>
      </div>
      <Input
        type="number"
        className="w-full"
        value={current.value === 0 ? "" : current.value}
        onChange={(e) => updateValue(e.target.value)}
      />
    </div>
  );
}
