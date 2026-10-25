> Range slider is used to select a value by sliding a handle.

### ~Range

```html
<input type="range" min="0" max="100" value="40" class="range" />
```

### ~With steps and measure

```html
<div class="w-full max-w-xs">
  <input type="range" min="0" max="100" value="25" class="range" step="25" />
  <div class="mt-2 flex justify-between px-2.5 text-xs">
    <span>|</span>
    <span>|</span>
    <span>|</span>
    <span>|</span>
    <span>|</span>
  </div>
  <div class="mt-2 flex justify-between px-2.5 text-xs">
    <span>1</span>
    <span>2</span>
    <span>3</span>
    <span>4</span>
    <span>5</span>
  </div>
</div>
```

### ~Neutral color

```html
<input type="range" min="0" max="100" value="40" class="range range-neutral" />
```

### ~Primary color

```html
<input type="range" min="0" max="100" value="40" class="range range-primary" />
```

### ~Secondary color

```html
<input
  type="range"
  min="0"
  max="100"
  value="40"
  class="range range-secondary"
/>
```

### ~Accent color

```html
<input type="range" min="0" max="100" value="40" class="range range-accent" />
```

### ~Success color

```html
<input type="range" min="0" max="100" value="40" class="range range-success" />
```

### ~Warning color

```html
<input type="range" min="0" max="100" value="40" class="range range-warning" />
```

### ~Info color

```html
<input type="range" min="0" max="100" value="40" class="range range-info" />
```

### ~Error color

```html
<input type="range" min="0" max="100" value="40" class="range range-error" />
```

### ~Sizes

```html
<input type="range" min="0" max="100" value="30" class="range range-xs" />
<input type="range" min="0" max="100" value="40" class="range range-sm" />
<input type="range" min="0" max="100" value="50" class="range range-md" />
<input type="range" min="0" max="100" value="60" class="range range-lg" />
<input type="range" min="0" max="100" value="70" class="range range-xl" />
```

### ~Range with custom color and no fill

```html
<input
  type="range"
  min="0"
  max="100"
  value="40"
  class="range text-blue-300 [--range-bg:orange] [--range-fill:0] [--range-thumb:blue]"
/>
```

### ~Vertical

```html
<input type="range" min="0" max="100" value="40" class="range range-vertical" />
```
