import type { IOCType } from '../../types';
import { IOC_TYPE_LABELS } from '../../types';
import { IOCBadge } from '../Analysis/IOCBadge';

interface IOCFilterBarProps {
  selectedTypes: IOCType[];
  onChange: (types: IOCType[]) => void;
}

const ALL_IOC_TYPES = Object.keys(IOC_TYPE_LABELS) as IOCType[];

export function IOCFilterBar({ selectedTypes, onChange }: IOCFilterBarProps) {
  const toggleType = (type: IOCType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((t) => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="flex gap-1 overflow-x-auto px-3 py-1.5 border-b border-gray-800 scrollbar-thin">
      {ALL_IOC_TYPES.map((type) => (
        <IOCBadge
          key={type}
          type={type}
          active={selectedTypes.includes(type)}
          onClick={() => toggleType(type)}
        />
      ))}
      {selectedTypes.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-[11px] text-gray-500 hover:text-gray-300 px-2 whitespace-nowrap"
        >
          Clear
        </button>
      )}
    </div>
  );
}
