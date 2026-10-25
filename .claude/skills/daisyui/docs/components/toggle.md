> Toggle is a checkbox that is styled to look like a switch button.

### ~Toggle (switch)

```html
<input type="checkbox" checked="checked" class="toggle" />
```

### ~With fieldset and label

```html
<fieldset
  class="fieldset bg-base-100 border-base-300 rounded-box w-64 border p-4"
>
  <legend class="fieldset-legend">Login options</legend>
  <label class="label">
    <input type="checkbox" checked="checked" class="toggle" />
    Remember me
  </label>
</fieldset>
```

### ~Sizes

```html
<input type="checkbox" checked="checked" class="toggle toggle-xs" />
<input type="checkbox" checked="checked" class="toggle toggle-sm" />
<input type="checkbox" checked="checked" class="toggle toggle-md" />
<input type="checkbox" checked="checked" class="toggle toggle-lg" />
<input type="checkbox" checked="checked" class="toggle toggle-xl" />
```

### ~Colors

```html
<input type="checkbox" checked="checked" class="toggle toggle-primary" />
<input type="checkbox" checked="checked" class="toggle toggle-secondary" />
<input type="checkbox" checked="checked" class="toggle toggle-accent" />
<input type="checkbox" checked="checked" class="toggle toggle-neutral" />

<input type="checkbox" checked="checked" class="toggle toggle-info" />
<input type="checkbox" checked="checked" class="toggle toggle-success" />
<input type="checkbox" checked="checked" class="toggle toggle-warning" />
<input type="checkbox" checked="checked" class="toggle toggle-error" />
```

### ~Disabled

```html
<input type="checkbox" class="toggle" disabled />
<input type="checkbox" class="toggle" disabled checked="checked" />
```

### ~Indeterminate

```html
<!-- You can make a checkbox indeterminate using JS -->

<input type="checkbox" class="toggle" id="my-toggle" />
```

### ~Toggle with icons inside

```html
<label class="toggle text-base-content">
  <input type="checkbox" />
  <svg
    aria-label="enabled"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <g
      stroke-linejoin="round"
      stroke-linecap="round"
      stroke-width="4"
      fill="none"
      stroke="currentColor"
    >
      <path d="M20 6 9 17l-5-5"></path>
    </g>
  </svg>
  <svg
    aria-label="disabled"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="4"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
</label>
```

### ~Toggle with custom colors

```html
<input
  type="checkbox"
  checked="checked"
  class="toggle border-indigo-600 bg-indigo-500 checked:border-orange-500 checked:bg-orange-400 checked:text-orange-800"
/>
```
