import React from 'react';
import { ALL_AREAS, cityFilter, districtFilter, type CityAreas } from '../utils/areas';
import { cn } from '../utils/cn';
import { CHIP_SELECT } from '../utils/ui';

interface Props {
  areas: CityAreas[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Filtre per zona: cada població amb zones és un grup («Tot Barcelona», «Eixample», «Gràcia»…); les que no en tenen,
// una opció sola. Sense cap població coneguda no es mostra.
export const AreaSelect: React.FC<Props> = ({ areas, value, onChange, className }) => {
  if (areas.length === 0) return null;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Zona" className={cn(CHIP_SELECT, 'max-w-48', className)}>
      <option value={ALL_AREAS}>Totes les zones</option>
      {areas.map(({ city, districts }) =>
        districts.length === 0 ? (
          <option key={city} value={cityFilter(city)}>
            {city}
          </option>
        ) : (
          <optgroup key={city} label={city}>
            <option value={cityFilter(city)}>Tot {city}</option>
            {districts.map((district) => (
              <option key={district} value={districtFilter(city, district)}>
                {district}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </select>
  );
};
