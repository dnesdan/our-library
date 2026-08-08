# Our Library

A polished, interactive concept for Dan and Lucia's shared ebook collection. The first screen is the library itself: a tactile cover catalog that opens into book details, a browser reader, and a fully explorable WebGL reading room.

## Highlights

- 44-book responsive catalog with search, filters, favorites, profile-specific progress, and tactile covers
- Shared profiles for Dan and Lucia, with device-local persistence
- Interactive Three.js room with wooden shelves, clickable books, rolling ladder, fireplace, lamp, chair, decor, and day/night lighting
- Browser reader with chapters, keyboard/swipe navigation, bookmarks, table of contents, themes, typography, spacing, width, and reading modes
- Desktop keyboard shortcuts, touch-focused mobile layouts, and reduced-motion support

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The project uses vinext and is configured for Sites hosting through `.openai/hosting.json`.

## Materials

The 3D room uses CC0 PBR materials from Poly Haven: `dark_wood`, `stone_wall_05`, `wood_floor_worn`, `leather_red_02`, and `quatrefoil_jacquard_fabric`. Detailed CC0 glTF props are also from Poly Haven: `ArmChair_01`, `gothic_coffee_table`, `vintage_oil_lamp`, `potted_plant_04`, and `vintage_grandfather_clock_01`.
