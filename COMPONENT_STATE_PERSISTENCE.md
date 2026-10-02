# Component State Persistence in Reports

This guide explains how to maintain component state (filters, selected rows, sorting, etc.) when sections are added to reports.

## Overview

When a section is added to a report, the system now captures both the rendered content AND the component's internal state. This allows sections to be displayed in reports with the exact same configuration they had when added.

## Architecture

### Three Context Layers

1. **ReportSectionContext** - Provides entity information (ID, label, type)
2. **ReportComponentStateContext** - Provides state management for component state
3. **ReportComponentStateProvider** - Wraps section content to enable state persistence

## Implementation Steps

### Step 1: Update Your Body Component

Import the state hook:

```tsx
import { useReportComponentState } from "ui";
import { useEffect } from "react";

function Body({ id: efoId, label: name, entity }) {
  const { saveState, getState } = useReportComponentState();
  const [selectedRow, setSelectedRow] = useState(null);
  const [filters, setFilters] = useState({});

  // Restore state when component mounts (if in a report)
  useEffect(() => {
    const saved = getState('selectedRow');
    if (saved) setSelectedRow(saved);
    
    const savedFilters = getState('filters');
    if (savedFilters) setFilters(savedFilters);
  }, [getState]);

  // Save state when it changes
  const handleSelectRow = (row) => {
    setSelectedRow(row);
    saveState('selectedRow', row);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    saveState('filters', newFilters);
  };

  return (
    <MyTable
      selectedRow={selectedRow}
      onSelectRow={handleSelectRow}
      filters={filters}
      onFilterChange={handleFilterChange}
    />
  );
}
```

### Step 2: Update SectionItem Integration

When integrating `AddToReportButton` with your section, provide the state capture callback:

```tsx
function Body({ id, label, entity }) {
  const { getState } = useReportComponentState();
  
  // ... your component code ...

  const captureComponentState = () => {
    return {
      selectedRow,
      filters,
      // Add any other state you want to preserve
    };
  };

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => <Description name={label} />}
      renderBody={() => <YourComponent ... />}
    >
      <AddToReportButton
        definition={definition}
        request={request}
        entity={entity}
        selectedView={selectedView}
        renderedBody={() => <YourComponent ... />}
        description={() => <Description name={label} />}
        onCaptureState={captureComponentState}
      />
    </SectionItem>
  );
}
```

### Step 3: Handle State in Report Context

When a section is displayed in a report, the saved state is automatically restored:

```tsx
// In ReportBuilder.tsx or any report rendering component
<ReportComponentStateProvider initialState={section.componentState}>
  <ReportSectionContext.Provider value={{ ... }}>
    {/* Your section content will have access to restored state */}
    {content.body}
  </ReportSectionContext.Provider>
</ReportComponentStateProvider>
```

## API Reference

### useReportComponentState()

Returns an object with the following methods:

```tsx
interface ReportComponentStateContextValue {
  // Save a state value
  saveState: (key: string, value: any) => void;
  
  // Get all accumulated state
  getAllState: () => Record<string, any>;
  
  // Get a specific state value
  getState: (key: string) => any;
  
  // Clear state
  clearState: () => void;
}
```

## Best Practices

1. **Save Only Serializable Data** - Avoid saving functions, DOM elements, or other non-serializable objects
2. **Use Meaningful Keys** - Use descriptive keys like `'selectedRow'` instead of `'s'`
3. **Handle Null/Undefined** - Always check if state exists before using it
4. **Keep State Minimal** - Only save state that affects how the component is displayed

## Example: Complete Implementation

```tsx
import { useState, useEffect } from "react";
import { SectionItem, AddToReportButton, useReportComponentState } from "ui";
import { definition } from ".";
import Description from "./Description";

function Body({ id: efoId, label: name, entity }) {
  const reportState = useReportComponentState();
  const [selectedRow, setSelectedRow] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [filterText, setFilterText] = useState('');

  // Restore state from report context
  useEffect(() => {
    if (!reportState) return;
    
    const saved = reportState.getState('selectedRow');
    if (saved) setSelectedRow(saved);
    
    const savedSort = reportState.getState('sortBy');
    if (savedSort) setSortBy(savedSort);
    
    const savedFilter = reportState.getState('filterText');
    if (savedFilter) setFilterText(savedFilter);
  }, [reportState]);

  // Save state to report context
  const handleSelectRow = (row) => {
    setSelectedRow(row);
    reportState?.saveState('selectedRow', row);
  };

  const handleSort = (field) => {
    setSortBy(field);
    reportState?.saveState('sortBy', field);
  };

  const handleFilter = (text) => {
    setFilterText(text);
    reportState?.saveState('filterText', text);
  };

  // Capture state when adding to report
  const captureState = () => ({
    selectedRow,
    sortBy,
    filterText,
  });

  return (
    <SectionItem
      definition={definition}
      request={useQuery(QUERY, { variables: { efoId } })}
      entity={entity}
      renderDescription={() => <Description name={name} />}
      renderBody={() => (
        <div>
          <FilterInput value={filterText} onChange={handleFilter} />
          <DataTable
            data={data}
            selectedRow={selectedRow}
            onSelectRow={handleSelectRow}
            sortBy={sortBy}
            onSort={handleSort}
          />
        </div>
      )}
    >
      <AddToReportButton
        definition={definition}
        request={request}
        entity={entity}
        selectedView="table"
        renderedBody={() => {/* ... */}}
        description={() => <Description name={name} />}
        onCaptureState={captureState}
      />
    </SectionItem>
  );
}

export default Body;
```

## Troubleshooting

### State Not Being Saved
- Make sure `useReportComponentState()` returns a non-null value
- Check that you're calling `saveState()` with valid key-value pairs
- Ensure the component is wrapped in `ReportComponentStateProvider`

### State Not Being Restored
- Verify `componentState` is defined in the `ReportSection`
- Check that `ReportComponentStateProvider` is initialized with `initialState={section.componentState}`
- Ensure your restoration code runs in `useEffect` with proper dependencies

### State Getting Lost When Switching Views
- Save state before the view switches
- Use the context's `getAllState()` to verify state is persisted
- Check the browser's React DevTools to inspect the context value
