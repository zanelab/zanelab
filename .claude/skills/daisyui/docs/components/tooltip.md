> Tooltip can be used to show a message when hovering over an element.

### ~Tooltip

```html
<div class="tooltip" data-tip="hello">
  <button class="btn">Hover me</button>
</div>
```

### ~Tooltip with tooltip-content

```html
<div class="tooltip">
  <div class="tooltip-content">
    <div class="-rotate-10 animate-bounce text-2xl font-black text-orange-400">
      Wow!
    </div>
  </div>
  <button class="btn">Hover me</button>
</div>
```

### ~Force open

```html
<div class="tooltip tooltip-open" data-tip="hello">
  <button class="btn">Force open</button>
</div>
```

### ~Top

```html
<div class="tooltip tooltip-open tooltip-top tooltip-start" data-tip="hello">
  <button class="btn">Top start</button>
</div>
<div class="tooltip tooltip-open tooltip-top" data-tip="hello">
  <button class="btn">Top</button>
</div>
<div class="tooltip tooltip-open tooltip-top tooltip-end" data-tip="hello">
  <button class="btn">Top end</button>
</div>
```

### ~Bottom

```html
<div class="tooltip tooltip-open tooltip-bottom tooltip-start" data-tip="hello">
  <button class="btn">Bottom start</button>
</div>
<div class="tooltip tooltip-open tooltip-bottom" data-tip="hello">
  <button class="btn">Bottom</button>
</div>
<div class="tooltip tooltip-open tooltip-bottom tooltip-end" data-tip="hello">
  <button class="btn">Bottom end</button>
</div>
```

### ~Left

```html
<div class="tooltip tooltip-open tooltip-left tooltip-start" data-tip="hello">
  <button class="btn">Left start</button>
</div>
<div class="tooltip tooltip-open tooltip-left" data-tip="hello">
  <button class="btn">Left</button>
</div>
<div class="tooltip tooltip-open tooltip-left tooltip-end" data-tip="hello">
  <button class="btn">Left end</button>
</div>
```

### ~Right

```html
<div class="tooltip tooltip-open tooltip-right tooltip-start" data-tip="hello">
  <button class="btn">Right start</button>
</div>
<div class="tooltip tooltip-open tooltip-right" data-tip="hello">
  <button class="btn">Right</button>
</div>
<div class="tooltip tooltip-open tooltip-right tooltip-end" data-tip="hello">
  <button class="btn">Right end</button>
</div>
```

### ~Primary color

```html
<div class="tooltip tooltip-open tooltip-primary" data-tip="primary">
  <button class="btn btn-primary">primary</button>
</div>
```

### ~Secondary color

```html
<div class="tooltip tooltip-open tooltip-secondary" data-tip="secondary">
  <button class="btn btn-secondary">secondary</button>
</div>
```

### ~Accent color

```html
<div class="tooltip tooltip-open tooltip-accent" data-tip="accent">
  <button class="btn btn-accent">accent</button>
</div>
```

### ~Info color

```html
<div class="tooltip tooltip-open tooltip-info" data-tip="info">
  <button class="btn btn-info">info</button>
</div>
```

### ~Success color

```html
<div class="tooltip tooltip-open tooltip-success" data-tip="success">
  <button class="btn btn-success">success</button>
</div>
```

### ~Warning color

```html
<div class="tooltip tooltip-open tooltip-warning" data-tip="warning">
  <button class="btn btn-warning">warning</button>
</div>
```

### ~Error color

```html
<div class="tooltip tooltip-open tooltip-error" data-tip="error">
  <button class="btn btn-error">error</button>
</div>
```

### ~Responsive tooltip. only show for large screen

```html
<div class="lg:tooltip" data-tip="hello">
  <button class="btn">Hover me</button>
</div>
```

### ~Responsive tooltip position

```html
<div
  class="tooltip tooltip-start md:tooltip-right md:tooltip-center"
  data-tip="hello"
>
  <button class="btn">Hover me</button>
</div>
```
