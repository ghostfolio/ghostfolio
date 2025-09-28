# Portfolio Filter Form Component

## Overview

The `GfPortfolioFilterFormComponent` is a reusable Angular component that provides a form interface for filtering portfolio data. It implements `ControlValueAccessor` to work seamlessly with Angular reactive forms.

## Features

- **Account filtering**: Select specific accounts to filter by
- **Asset class filtering**: Filter by asset classes (Equity, Fixed Income, etc.)
- **Holding filtering**: Filter by specific holdings/securities
- **Tag filtering**: Filter by user-defined tags
- **Form validation**: Built-in validation and state management
- **Accessibility**: Full support for Angular forms and accessibility features

## Usage

### Basic Implementation

```typescript
import { GfPortfolioFilterFormComponent } from '@ghostfolio/ui/portfolio-filter-form';

@Component({
  selector: 'my-component',
  template: `
    <gf-portfolio-filter-form
      [accounts]="accounts"
      [assetClasses]="assetClasses"
      [holdings]="holdings"
      [tags]="tags"
      [disabled]="isDisabled"
      (applyFilters)="onApplyFilters()"
      (resetFilters)="onResetFilters()"
      [formControl]="portfolioFiltersControl">
    </gf-portfolio-filter-form>
  `
})
export class MyComponent {
  portfolioFiltersControl = new FormControl<PortfolioFilterFormValue>({
    account: null,
    assetClass: null,
    holding: null,
    tag: null
  });

  // ... other properties
}
```

### With Reactive Forms

```typescript
import { PortfolioFilterFormValue } from '@ghostfolio/ui/portfolio-filter-form';

import { FormControl } from '@angular/forms';

const filterControl = new FormControl<PortfolioFilterFormValue>({
  account: null,
  assetClass: null,
  holding: null,
  tag: null
});

// Subscribe to changes
filterControl.valueChanges.subscribe((filters) => {
  console.log('Filter changes:', filters);
});
```

## Inputs

| Input          | Type                  | Description                         |
| -------------- | --------------------- | ----------------------------------- |
| `accounts`     | `Account[]`           | Array of available accounts         |
| `assetClasses` | `Filter[]`            | Array of available asset classes    |
| `holdings`     | `PortfolioPosition[]` | Array of available holdings         |
| `tags`         | `Filter[]`            | Array of available tags             |
| `disabled`     | `boolean`             | Whether the form should be disabled |

## Outputs

| Output         | Type                 | Description                                  |
| -------------- | -------------------- | -------------------------------------------- |
| `applyFilters` | `EventEmitter<void>` | Emitted when Apply Filters button is clicked |
| `resetFilters` | `EventEmitter<void>` | Emitted when Reset Filters button is clicked |

## Interface

### PortfolioFilterFormValue

```typescript
interface PortfolioFilterFormValue {
  account: string | null;
  assetClass: string | null;
  holding: PortfolioPosition | null;
  tag: string | null;
}
```

## Implementation Details

- Implements `ControlValueAccessor` for seamless integration with Angular forms
- Uses Angular Material components for consistent UI
- Handles form state management internally
- Provides validation and dirty state tracking
- Supports disabled state management

## Testing

The component includes comprehensive unit tests covering:

- Component creation and initialization
- Form value management
- Event emission
- Filter detection logic
- ControlValueAccessor implementation

Run tests with:

```bash
nx test ui
```

## Storybook

Interactive component documentation and examples are available in Storybook:

```bash
nx run ui:storybook
```
