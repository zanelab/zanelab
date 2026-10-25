> Collapse is used for showing and hiding content.

### ~Collapse with focus

```html
<div tabindex="0" class="bg-base-100 border-base-300 collapse border">
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~Collapse with checkbox

```html
<div class="bg-base-100 border-base-300 collapse border">
  <input type="checkbox" />
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~Collapse with checkbox and close on click outside

```html
<div class="bg-base-100 border-base-300 collapse border">
  <input id="collapse-1-toggle" type="checkbox" class="peer" />
  <label
    for="collapse-1-toggle"
    class="fixed inset-0 hidden peer-checked:block"
  ></label>
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content z-1 text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~ Collapse using details and summary tag

```html
<details class="bg-base-100 border-base-300 collapse border">
  <summary class="collapse-title font-semibold">
    How do I create an account?
  </summary>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</details>
```

### ~Without border and background color

```html
<div tabindex="0" class="collapse">
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~With arrow icon

```html
<div
  tabindex="0"
  class="collapse-arrow bg-base-100 border-base-300 collapse border"
>
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~With arrow plus/minus icon

```html
<div
  tabindex="0"
  class="collapse-plus bg-base-100 border-base-300 collapse border"
>
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~Moving collapse icon to the start

```html
<div
  tabindex="0"
  class="collapse-arrow bg-base-100 border-base-300 collapse border"
>
  <div
    class="collapse-title ps-12 pe-4 font-semibold after:start-5 after:end-auto"
  >
    How do I create an account?
  </div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~Force open

```html
<div
  tabindex="0"
  class="collapse-open bg-base-100 border-base-300 collapse border"
>
  <div class="collapse-title font-semibold">I have collapse-open class</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~Force close

```html
<div
  tabindex="0"
  class="collapse-close bg-base-100 border-base-300 collapse border"
>
  <div class="collapse-title font-semibold">I have collapse-close class</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~Custom colors for collapse that works with focus

```html
<div
  tabindex="0"
  class="bg-primary text-primary-content focus:bg-secondary focus:text-secondary-content collapse"
>
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```

### ~Custom colors for collapse that works with checkbox

```html
<div class="bg-base-100 border-base-300 collapse border">
  <input type="checkbox" class="peer" />
  <div
    class="collapse-title bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content"
  >
    How do I create an account?
  </div>
  <div
    class="collapse-content bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content"
  >
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
```
