# ZoomableSunburst Component - Refactored Structure

This component has been refactored into reusable, modular pieces for better maintainability and extensibility.

## File Structure

```
Surnburst/
├── index.ts                    # Public API exports
├── ZoomableSunburst.tsx        # Main component (uses hooks & sub-components)
├── types.ts                    # Shared TypeScript types
├── utils.ts                    # Utility functions
├── hooks.ts                    # Custom React hooks
├── SunburstArcs.tsx            # Arc rendering component
├── SunburstLabels.tsx          # Label rendering component
├── SunburstCenter.tsx          # Center circle & label component
└── SunburstBreadcrumb.tsx      # Breadcrumb trail component
```

## Components

### `ZoomableSunburst` (Main)
The main component that orchestrates everything. Manages state and animation.

```tsx
<ZoomableSunburst 
  data={hierarchicalData}
  width={760}
  height={760}
  colors={['#color1', '#color2']}
  centerLabel={true}
  fontFamily="system-ui"
/>
```

### `SunburstArcs`
Renders the arc paths. Handles:
- Arc path generation
- Color mapping
- Click handling
- Hover states

### `SunburstLabels`
Renders the text labels. Handles:
- Label positioning & rotation
- Visibility based on zoom level
- Text styling

### `SunburstCenter`
Renders the center circle and center label. Handles:
- Zoom out button
- Center label display
- Opacity based on zoom state

### `SunburstBreadcrumb`
Displays the navigation breadcrumb trail showing the current path.

## Custom Hooks

### `useSunburstPartition(data)`
Builds and initializes the D3 partition hierarchy.

```tsx
const { root, nodes } = useSunburstPartition(data);
```

### `useSunburstArc(radius)`
Creates the D3 arc generator with proper configuration.

```tsx
const arc = useSunburstArc(radius);
```

### `useSunburstFocus(root)`
Manages zoom/focus state and zoom interactions.

```tsx
const { focus, setFocus, handleClick } = useSunburstFocus(root);
```

### `useSunburstColorMap(root, colors)`
Creates a color mapping for nodes based on their top-level parent.

```tsx
const colorMap = useSunburstColorMap(root, colors);
```

## Utility Functions

### `arcVisible(arcData)`
Determines if an arc should be visible at the current zoom level.

### `labelVisible(arcData)`
Determines if a label should be visible at the current zoom level.

### `labelTransform(arcData, radius)`
Calculates the SVG transform for positioning and rotating a label.

### `getColorForNode(node, colorMap, fallback)`
Gets the color for a node based on its top-level parent.

### `getBreadcrumbTrail(node)`
Builds the breadcrumb navigation trail for a node.

## Types

All types are in `types.ts`:

- **`DataNode`** - Input data structure
- **`ArcData`** - Arc coordinate data
- **`PartitionNode`** - D3 hierarchy node with arc data
- **`ZoomableSunburstProps`** - Main component props

## Usage Examples

### Basic Usage
```tsx
import { ZoomableSunburst } from './components/Surnburst';

<ZoomableSunburst data={data} />
```

### Using Individual Components
```tsx
import { 
  useSunburstPartition,
  useSunburstArc,
  SunburstArcs,
  SunburstLabels 
} from './components/Surnburst';

const { root, nodes } = useSunburstPartition(data);
const arc = useSunburstArc(radius);

// Use in custom component
```

### Using Utilities
```tsx
import { 
  arcVisible, 
  labelVisible,
  getBreadcrumbTrail 
} from './components/Surnburst';

if (arcVisible(arcData)) {
  // Render arc
}

const breadcrumb = getBreadcrumbTrail(node);
```

## Benefits of Refactoring

1. **Reusability** - Hooks can be used in other components
2. **Testability** - Smaller, focused modules are easier to test
3. **Maintainability** - Clear separation of concerns
4. **Extensibility** - Easy to add new features or sub-components
5. **Readability** - Main component is now much cleaner and easier to understand

## Data Format

Expected hierarchical data structure:

```tsx
{
  name: "root",
  children: [
    {
      name: "category1",
      children: [
        { name: "item1" },
        { name: "item2" }
      ]
    },
    {
      name: "category2",
      children: [...]
    }
  ]
}
```

Optional `value` property on leaves for area-weighted arcs.
