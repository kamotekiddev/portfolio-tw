# Data model: Seasonal theme

## Season

`spring | summer | autumn | winter | wet | dry`

| Field | Notes |
|-------|-------|
| id | One of the six values; also the `data-season` attribute value. |
| label | `Spring`, `Summer`, `Autumn`, `Winter`, `Wet season`, `Dry season`. |
| palette | Accent, accent-hover, on-accent, contact for dark and light. Lives in `app/globals.css`. |
| ambient | Petals, light motes, leaves, snow, rain, dust. Lives in `app/globals.css`. |

## Region band

`north-temperate | south-temperate | north-tropical | south-tropical | unknown`, derived from the IANA time zone.

## Season table (band × month → season)

| Band | Dec–Feb | Mar–May | Jun–Aug | Sep–Nov |
|------|---------|---------|---------|---------|
| north-temperate | winter | spring | summer | autumn |
| south-temperate | summer | autumn | winter | spring |

| Band | Jun–Nov | Dec–May |
|------|---------|---------|
| north-tropical | wet | dry |
| south-tropical | dry | wet |

`unknown` → no season (existing emerald design).

## Season preference

`auto | <Season>`, stored as a plain string under `localStorage["season"]`. Missing, unreadable, or
invalid values are treated as `auto`. Independent of the `next-themes` `theme` key.

## State

```text
preference = auto      → season = table[band(zone)][month]  → data-season set, or removed when null
preference = <Season>  → season = <Season>                  → data-season = <Season>
```

Evaluated on each page load by the init script and on each picker change.
