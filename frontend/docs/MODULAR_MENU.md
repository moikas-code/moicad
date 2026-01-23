# Modular Menu System for moicad

The TopMenu component has been refactored to use a modular, extensible structure that makes it easy to add new menu options and functionality.

## Architecture

### Core Interfaces

```typescript
interface MenuItem {
  label?: string;                    // Text to display (optional for separators)
  action?: () => void;               // Click handler function
  disabled?: boolean;                // Whether item is disabled
  shortcut?: string;                  // Keyboard shortcut text
  separator?: boolean;               // Whether this is a separator line
  submenu?: MenuItem[];              // Nested submenu items
  badge?: string;                    // Badge text (like ● for unsaved)
  badgeColor?: string;               // Badge color
}

interface MenuSection {
  label: string;                     // Menu name (e.g., "File", "Edit")
  items: MenuItem[];                 // Array of menu items
}
```

### TopMenu Props

```typescript
interface TopMenuProps {
  geometry: GeometryResponse | null;
  code: string;
  onNew?: () => void;
  onOpenFiles?: () => void;
  onSave?: () => void;
  onExportGeometry?: () => void;
  unsavedChanges?: boolean;
  customMenus?: Record<string, MenuSection>;  // Custom menus to add
}
```

## Usage Examples

### Adding a Custom Menu

```typescript
const customMenus = {
  Tools: {
    label: 'Tools',
    items: [
      {
        label: 'Validate Syntax',
        action: () => validateCode(),
        shortcut: 'Ctrl+L'
      },
      {
        label: 'Format Code',
        action: () => formatCode(),
        shortcut: 'Ctrl+Shift+F'
      },
      { separator: true },
      {
        label: 'Advanced Options',
        disabled: true,
        badge: 'Pro',
        badgeColor: '#4CAF50'
      }
    ]
  }
};

<TopMenu customMenus={customMenus} ... />
```

### Menu Item Types

1. **Standard Item**
```typescript
{
  label: 'Save',
  action: () => saveFile(),
  shortcut: 'Ctrl+S',
  badge: '●',
  badgeColor: '#E66E00'
}
```

2. **Disabled Item**
```typescript
{
  label: 'Undo',
  action: () => undo(),
  shortcut: 'Ctrl+Z',
  disabled: true
}
```

3. **Separator**
```typescript
{ separator: true }
```

4. **Item with Submenu**
```typescript
{
  label: 'Export',
  submenu: [
    { label: 'STL', action: () => exportSTL() },
    { label: 'OBJ', action: () => exportOBJ() },
    { label: '3MF', action: () => export3MF() }
  ]
}
```

## Built-in Menus

### File Menu
- New (Ctrl+N)
- Open (Ctrl+O)
- Save (Ctrl+S)
- Export Geometry… (Ctrl+E)
- Export .scad (Ctrl+Shift+S)

### Example Custom Menus

```typescript
const advancedMenus = {
  Edit: {
    label: 'Edit',
    items: [
      { label: 'Undo', action: undo, shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: redo, shortcut: 'Ctrl+Y' },
      { separator: true },
      { label: 'Cut', action: cut, shortcut: 'Ctrl+X' },
      { label: 'Copy', action: copy, shortcut: 'Ctrl+C' },
      { label: 'Paste', action: paste, shortcut: 'Ctrl+V' }
    ]
  },
  View: {
    label: 'View',
    items: [
      { label: 'Reset View', action: resetView, shortcut: 'R' },
      { label: 'Zoom to Fit', action: zoomToFit, shortcut: 'F' },
      { separator: true },
      { label: 'Front', action: frontView, shortcut: '1' },
      { label: 'Top', action: topView, shortcut: '7' },
      { label: 'Side', action: sideView, shortcut: '3' }
    ]
  },
  Tools: {
    label: 'Tools',
    items: [
      { label: 'Validate', action: validate, shortcut: 'Ctrl+L' },
      { label: 'Format', action: format, shortcut: 'Ctrl+Shift+F' },
      { separator: true },
      { label: 'Generate Docs', action: generateDocs },
      { label: 'Performance', action: analyzePerformance }
    ]
  }
};
```

## Styling

The menu system uses Tailwind CSS with a dark theme:

- Background: `bg-[#3D3D3D]`
- Hover: `hover:bg-[#4D4D4D]`
- Disabled: `disabled:bg-[#3D3D3D] disabled:text-[#606060]`
- Border: `border-[#4D4D4D]`
- Shadow: `shadow-lg`

## Keyboard Shortcuts

The system supports keyboard shortcuts that are displayed in the menu items. You'll need to implement the actual keyboard event handlers in your parent component.

Example keyboard handler:
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const { ctrlKey, metaKey, shiftKey, key } = event;
    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && key === 's') {
      event.preventDefault();
      save();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [save]);
```

## Accessibility

- Menus are keyboard accessible
- Click-outside-to-close functionality
- Proper ARIA attributes can be added as needed
- Focus management for keyboard navigation

## Future Enhancements

- Icon support for menu items
- Nested submenus (currently limited to one level)
- Context menus for right-click
- Menu item tooltips
- Keyboard navigation within menus (arrow keys)