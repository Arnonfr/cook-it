---
name: frontend-ui
description: Professional and modern UI design system for the Cookit/Coocka recipe platform, focusing on RTL (Hebrew) support, clean typography with Noto Sans, and premium aesthetics.
---

# Cookit / Coocka Frontend UI Design System

This skill provides the core design tokens, components, and implementation guidelines for the Cookit platform. It ensures a consistent, high-end mobile-first experience.

## Language and Direction
- **Primary Language:** Hebrew.
- **Direction:** RTL (Right-to-Left) must be enforced across all components.
- **Font:** Google **Noto Sans Hebrew** (Primary) with Heebo as fallback.

## Color Palette

### Brand Colors
- **Primary Blue:** `#236EFF` - Primary actions, buttons, and active states.
- **Deep Blue:** `#0B52DB` - Secondary headers, hover states.
- **Accent Orange:** `#FF5A37` - Highlights, delete actions, errors.
- **Accent Yellow:** `#FFE600` - "Cooking" status, specific tags.

### UI Colors
- **Page Background:** `#F0F4F8` (Light grayish blue).
- **Surface (Cards/Modals):** `#FFFFFF`.
- **Text Primary:** `#262626` (Almost black).
- **Text Secondary:** `#7B8794` (Cool gray).
- **Border/Divider:** `#E5E5E5`.

## Typography (Noto Sans)
- **Headings:** Bold (700) or Medium (500). Use larger sizes (24px - 32px) for main titles.
- **Body:** Regular (400), 16px size.
- **Captions:** Regular (400), 12px - 14px.
- **Buttons:** Medium (500), 16px, uppercase or prominent weight.

## Components

### 1. Buttons
- **Style:** Rounded corners (`border-radius: 12px`).
- **Sizes:** Height 48px - 56px for main buttons.
- **Primary:** Background `#236EFF`, Text `#FFFFFF`.
- **Secondary:** Bordered or light background.

### 2. Recipe Cards
- **Structure:**
  - Image at top (Aspect ratio 4:3 or 16:9).
  - Rounded corners (`12px`).
  - Subtle shadow (`box-shadow: 0 4px 12px rgba(0,0,0,0.05)`).
  - Content includes Recipe Title, Category Tag, and meta-data (Time, Servings).
  - Meta-data icons should be minimal line-art.

### 3. Inputs & Search
- **Style:** Soft backgrounds or light borders.
- **Corners:** Rounded (`12px`).
- **RTL:** Ensure search icon is on the left and text starts from the right.

## Premium Aesthetics
- **Glassmorphism:** Use for overlays and navigation bars (`backdrop-filter: blur(8px)`, `background: rgba(255, 255, 255, 0.7)`).
- **Micro-animations:** Subtle scale-up on card hover, smooth transitions for button state changes.
- **Gradients:** Use subtle linear gradients for branding elements if needed (e.g., `#236EFF` to `#0B52DB`).

## Implementation Tasks (Examples)
- Implement `NavigationRail` or `BottomNav` with glass effect.
- Build `RecipeCard` with RTL-aware layout.
- Create `SearchField` with modern focus states.
