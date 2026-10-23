These three image references were visible in the chat, but their binary files were not mounted.

Expected supplied originals:
- brand/logo-original.png (preserve purple-background original)
- references/lower-limb-reference.png (visual reference only, not HAND geometry)
- references/hand-typography-reference.png

Expected processed asset:
- brand/logo-white-transparent.png (remove background; preserve exact symbol and proportions)

After checking the processed logo against the original, set src/data/brand.ts logoPath to
'/assets/brand/logo-white-transparent.png'. Never substitute a generated brand symbol.
