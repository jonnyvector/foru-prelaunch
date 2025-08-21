# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify theme called "Savor" (version 2.1.1) for the foru-prelaunch project. It's a modern Shopify theme built with Liquid templates, vanilla JavaScript/TypeScript, and CSS.

## Key Architecture

### File Structure
- `layout/theme.liquid` - Main theme layout with section groups for header and footer
- `sections/` - Reusable section templates with JSON schema definitions
- `blocks/` - Individual block components used within sections  
- `snippets/` - Reusable template partials and utilities
- `assets/` - JavaScript, CSS, and SVG assets
- `templates/` - Page templates in JSON format
- `config/` - Theme settings and configuration
- `locales/` - Translation files for internationalization

### JavaScript Architecture
- Modular ES2020 JavaScript with TypeScript definitions in `assets/global.d.ts`
- Global `Shopify` and `Theme` objects provide core functionality
- Component-based architecture with files like `product-form.js`, `cart-drawer.js`, etc.
- Uses native web components and modern JavaScript features

### Section System
- Sections use `_blocks.liquid` as a wrapper that renders child blocks
- All sections support `@theme` and `@app` block types for extensibility
- Layout system with configurable content direction (column/row) and responsive behavior

### Styling
- CSS custom properties for theming via `theme-styles-variables.liquid`
- Color scheme system defined in `settings_schema.json`
- Responsive design with mobile-first approach

## Development Workflow

### Theme Development
This is a Shopify theme, so there's no traditional build process. Use Shopify CLI for development:

```bash
# Serve theme locally (requires Shopify CLI)
shopify theme serve

# Deploy to development theme
shopify theme push --development

# Pull theme from Shopify
shopify theme pull
```

### Code Quality
- TypeScript checking configured in `assets/jsconfig.json` with strict settings
- Uses ES2020 target with strict null checks and type checking enabled

### Key Components
- **Product system**: `product-form.js`, `product-card.js`, `variant-picker.js`
- **Cart functionality**: `cart-drawer.js`, `cart-icon.js`, `component-cart-items.js`
- **Search**: `predictive-search.js`, `search-page-input.js`
- **Media handling**: `media-gallery.js`, `slideshow.js`, `video-background.js`
  - **Battery saver support**: Video blocks automatically detect autoplay failures on mobile and show fallback images
- **UI components**: `dialog.js`, `anchored-popover.js`, `accordion-custom.js`

### Liquid Template Patterns
- Use `{% render 'snippet-name' %}` for including snippets
- Section rendering via `{% sections 'group-name' %}`
- Block content captured with `{% content_for 'blocks' %}`
- Schema definitions in `{% schema %}` blocks for Shopify theme editor integration

### Localization
Extensive i18n support with translation files in `locales/` directory. Use `t:` prefix for translated strings in Liquid templates.