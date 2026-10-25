> Indicators are used to place an element on the corner of another element.

### ~Status Indicator

```html
<div class="indicator">
  <span class="indicator-item status status-success"></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~Badge as indicator

```html
<div class="indicator">
  <span class="indicator-item badge badge-primary">New</span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~for button

```html
<div class="indicator">
  <span class="indicator-item badge badge-secondary">12</span>
  <button class="btn">inbox</button>
</div>
```

### ~for tab

```html
<div class="tabs tabs-lift">
  <a class="tab">Messages</a>
  <a class="indicator tab tab-active">
    Notifications
    <span class="indicator-item badge">8</span>
  </a>
  <a class="tab">Requests</a>
</div>
```

### ~for avatar

```html
<div class="avatar indicator">
  <span class="indicator-item badge badge-secondary">Justice</span>
  <div class="h-20 w-20 rounded-lg">
    <img
      alt="Tailwind CSS examples"
      src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
    />
  </div>
</div>
```

### ~for an input

```html
<div class="indicator">
  <span class="indicator-item badge">Required</span>
  <input type="text" placeholder="Your email address" class="input" />
</div>
```

### ~A button as an indicator for a card

```html
<div class="indicator">
  <div class="indicator-item indicator-bottom">
    <button class="btn btn-primary">Apply</button>
  </div>
  <div class="card border-base-300 border shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Job Title</h2>
      <p>Rerum reiciendis beatae tenetur excepturi</p>
    </div>
  </div>
</div>
```

### ~in center of an image

```html
<div class="indicator">
  <span class="indicator-item indicator-center indicator-middle">
    Only available for Pro users
  </span>
  <img
    alt="Tailwind CSS examples"
    src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp"
  />
</div>
```

### ~indicator-top (default) indicator-start

```html
<div class="indicator">
  <span class="indicator-item indicator-start badge badge-secondary"></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-top (default) indicator-center

```html
<div class="indicator">
  <span class="indicator-item indicator-center badge badge-secondary"></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-top (default) indicator-end (default)

```html
<div class="indicator">
  <span class="indicator-item badge badge-secondary"></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-middle indicator-start

```html
<div class="indicator">
  <span
    class="indicator-item indicator-middle indicator-start badge badge-secondary"
  ></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-middle indicator-center

```html
<div class="indicator">
  <span
    class="indicator-item indicator-middle indicator-center badge badge-secondary"
  ></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-middle indicator-end (default)

```html
<div class="indicator">
  <span class="indicator-item indicator-middle badge badge-secondary"></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-bottom indicator-start

```html
<div class="indicator">
  <span
    class="indicator-item indicator-bottom indicator-start badge badge-secondary"
  ></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-bottom indicator-center

```html
<div class="indicator">
  <span
    class="indicator-item indicator-bottom indicator-center badge badge-secondary"
  ></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~indicator-bottom indicator-end (default)

```html
<div class="indicator">
  <span class="indicator-item indicator-bottom badge badge-secondary"></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```

### ~multiple indicators

```html
<div class="indicator">
  <span class="indicator-item indicator-top indicator-start badge">↖︎</span>
  <span class="indicator-item indicator-top indicator-center badge">↑</span>
  <span class="indicator-item indicator-top indicator-end badge">↗︎</span>
  <span class="indicator-item indicator-middle indicator-start badge">←</span>
  <span class="indicator-item indicator-middle indicator-center badge">●</span>
  <span class="indicator-item indicator-middle indicator-end badge">→</span>
  <span class="indicator-item indicator-bottom indicator-start badge">↙︎</span>
  <span class="indicator-item indicator-bottom indicator-center badge">↓</span>
  <span class="indicator-item indicator-bottom indicator-end badge">↘︎</span>
  <div class="bg-base-300 grid h-32 w-60 place-items-center">Box</div>
</div>
```

### ~Responsive

```html
<div class="indicator">
  <span
    class="indicator-item indicator-start sm:indicator-middle md:indicator-bottom lg:indicator-center xl:indicator-end badge badge-secondary"
  ></span>
  <div class="bg-base-300 grid h-32 w-32 place-items-center">content</div>
</div>
```
