> Stack visually puts elements on top of each other.

### ~3 divs in a stack

```html
<div class="stack h-20 w-32">
  <div
    class="bg-primary text-primary-content rounded-box grid place-content-center"
  >
    1
  </div>
  <div
    class="bg-accent text-accent-content rounded-box grid place-content-center"
  >
    2
  </div>
  <div
    class="bg-secondary text-secondary-content rounded-box grid place-content-center"
  >
    3
  </div>
</div>
```

### ~stacked images

```html
<div class="stack w-48">
  <img
    alt="Tailwind CSS example 1"
    src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
    class="rounded-box"
  />
  <img
    alt="Tailwind CSS example 2"
    src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
    class="rounded-box"
  />
  <img
    alt="Tailwind CSS example 3"
    src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
    class="rounded-box"
  />
</div>
```

### ~stacked cards

```html
<div class="stack size-28">
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">A</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">B</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">C</div>
  </div>
</div>
```

### ~stacked cards (top direction)

```html
<div class="stack stack-top size-28">
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">A</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">B</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">C</div>
  </div>
</div>
```

### ~stacked cards (start direction)

```html
<div class="stack stack-start size-28">
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">A</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">B</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">C</div>
  </div>
</div>
```

### ~stacked cards (end direction)

```html
<div class="stack stack-end size-28">
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">A</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">B</div>
  </div>
  <div class="border-base-content card bg-base-100 border text-center">
    <div class="card-body">C</div>
  </div>
</div>
```

### ~stacked cards with shadow

```html
<div class="stack">
  <div class="card bg-base-200 text-center shadow-md">
    <div class="card-body">A</div>
  </div>
  <div class="card bg-base-200 text-center shadow">
    <div class="card-body">B</div>
  </div>
  <div class="card bg-base-200 text-center shadow-sm">
    <div class="card-body">C</div>
  </div>
</div>
```

### ~stacked cards

```html
<div class="stack">
  <div class="card bg-base-100 shadow-md">
    <div class="card-body">
      <h2 class="card-title">Notification 1</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
  <div class="card bg-base-100 shadow-md">
    <div class="card-body">
      <h2 class="card-title">Notification 2</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
  <div class="card bg-base-100 shadow-md">
    <div class="card-body">
      <h2 class="card-title">Notification 3</h2>
      <p>You have 3 unread messages. Tap here to see.</p>
    </div>
  </div>
</div>
```
