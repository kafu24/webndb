import { $selectedMinMax, toggleMinMax } from "@/stores/search";
import { SUPPORTED_MIN_MAX } from "@/data/minMax";
import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  type: (typeof SUPPORTED_MIN_MAX)[number];
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
    <div className="flex flex-col flex-1 gap-1">
      <div className="flex w-full items-center gap-1">
        <span className="font-semibold">{type} [</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => toggleMinMax(type)}
          className="mt-1 h-auto w-10"
        >
          {current.type}
        </Button>
        <span className="font-semibold">]</span>
      </div>
      <Input
        disabled={type !== "Chapters"}
        type="number"
        className="w-full rounded-none"
        value={current.value === 0 ? "" : current.value}
        onChange={(e) => updateValue(e.target.value)}
      />
    </div>
  );
}
