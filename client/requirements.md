## Packages
framer-motion | Page transitions and smooth UI animations for premium feel
date-fns | Formatting message timestamps cleanly
recharts | Visualizing conversation statistics in the Settings view
clsx | Class name merging (standard)
tailwind-merge | Class name merging (standard)

## Notes
- Assuming `api` object and types from `@shared/routes` and `@shared/schema` exactly match the provided manifest.
- The theme is strictly forced into a "dark mode professional" aesthetic via CSS variables.
- Chat UI simulates typing state during POST mutation for immediate feedback.
- Wouter is used for routing; ensuring no nested `<a>` tags in `<Link>`.
