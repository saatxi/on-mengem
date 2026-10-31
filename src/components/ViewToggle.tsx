import React from 'react';
import { List, Map as MapIcon } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';

export const PLACE_VIEWS = {
  list: (
    <>
      <List className="w-3.5 h-3.5" /> Llista
    </>
  ),
  map: (
    <>
      <MapIcon className="w-3.5 h-3.5" /> Mapa
    </>
  ),
};
export type PlaceView = keyof typeof PLACE_VIEWS;

interface Props {
  value: PlaceView;
  onChange: (view: PlaceView) => void;
  tone?: React.ComponentProps<typeof SegmentedControl>['tone'];
}

// Vista de llista o de mapa (restaurants i desitjats)
export const ViewToggle: React.FC<Props> = ({ value, onChange, tone }) => (
  <SegmentedControl label="Vista" options={PLACE_VIEWS} value={value} onChange={onChange} tone={tone} />
);
