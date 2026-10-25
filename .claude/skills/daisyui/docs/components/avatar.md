> Avatars are used to show a thumbnail representation of an individual or business in the interface.

### ~Avatar

```html
<div class="avatar">
  <div class="w-24 rounded">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
    />
  </div>
</div>
```

### ~Avatar in custom sizes

```html
<div class="avatar">
  <div class="w-32 rounded">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
    />
  </div>
</div>
<div class="avatar">
  <div class="w-20 rounded">
    <img
      src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
      alt="Tailwind-CSS-Avatar-component"
    />
  </div>
</div>
<div class="avatar">
  <div class="w-16 rounded">
    <img
      src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
      alt="Tailwind-CSS-Avatar-component"
    />
  </div>
</div>
<div class="avatar">
  <div class="w-8 rounded">
    <img
      src="https://img.daisyui.com/images/profile/demo/superperson@192.webp"
      alt="Tailwind-CSS-Avatar-component"
    />
  </div>
</div>
```

### ~Avatar rounded

```html
<div class="avatar">
  <div class="w-24 rounded-xl">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/yellingwoman@192.webp"
    />
  </div>
</div>
<div class="avatar">
  <div class="w-24 rounded-full">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/yellingcat@192.webp"
    />
  </div>
</div>
```

### ~Avatar with mask

```html
<div class="avatar">
  <div class="mask mask-heart w-24">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/distracted3@192.webp"
    />
  </div>
</div>
<div class="avatar">
  <div class="mask mask-squircle w-24">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/distracted1@192.webp"
    />
  </div>
</div>
<div class="avatar">
  <div class="mask mask-hexagon-2 w-24">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/distracted2@192.webp"
    />
  </div>
</div>
```

### ~Avatar group

```html
<div class="avatar-group -space-x-6">
  <div class="avatar">
    <div class="w-12">
      <img
        alt="Tailwind-CSS-Avatar-component"
        src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
      />
    </div>
  </div>
  <div class="avatar">
    <div class="w-12">
      <img
        alt="Tailwind-CSS-Avatar-component"
        src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp"
      />
    </div>
  </div>
  <div class="avatar">
    <div class="w-12">
      <img
        alt="Tailwind-CSS-Avatar-component"
        src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp"
      />
    </div>
  </div>
  <div class="avatar">
    <div class="w-12">
      <img
        alt="Tailwind-CSS-Avatar-component"
        src="https://img.daisyui.com/images/profile/demo/wonderperson@192.webp"
      />
    </div>
  </div>
</div>
```

### ~Avatar group with counter

```html
<div class="avatar-group -space-x-6">
  <div class="avatar">
    <div class="w-12">
      <img
        alt="Tailwind-CSS-Avatar-component"
        src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
      />
    </div>
  </div>
  <div class="avatar">
    <div class="w-12">
      <img
        alt="Tailwind-CSS-Avatar-component"
        src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp"
      />
    </div>
  </div>
  <div class="avatar">
    <div class="w-12">
      <img
        alt="Tailwind-CSS-Avatar-component"
        src="https://img.daisyui.com/images/profile/demo/averagebulk@192.webp"
      />
    </div>
  </div>
  <div class="avatar avatar-placeholder">
    <div class="bg-neutral text-neutral-content w-12">
      <span>+99</span>
    </div>
  </div>
</div>
```

### ~Avatar with ring

```html
<div class="avatar">
  <div
    class="ring-primary ring-offset-base-100 w-24 rounded-full ring-2 ring-offset-2"
  >
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/spiderperson@192.webp"
    />
  </div>
</div>
```

### ~Avatar with presence indicator

```html
<div class="avatar avatar-online">
  <div class="w-24 rounded-full">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/gordon@192.webp"
    />
  </div>
</div>
<div class="avatar avatar-offline">
  <div class="w-24 rounded-full">
    <img
      alt="Tailwind-CSS-Avatar-component"
      src="https://img.daisyui.com/images/profile/demo/idiotsandwich@192.webp"
    />
  </div>
</div>
```

### ~Avatar placeholder

```html
<div class="avatar avatar-placeholder">
  <div class="bg-neutral text-neutral-content w-24 rounded-full">
    <span class="text-3xl">D</span>
  </div>
</div>
<div class="avatar avatar-online avatar-placeholder">
  <div class="bg-neutral text-neutral-content w-16 rounded-full">
    <span class="text-xl">AI</span>
  </div>
</div>
<div class="avatar avatar-placeholder">
  <div class="bg-neutral text-neutral-content w-12 rounded-full">
    <span>SY</span>
  </div>
</div>
<div class="avatar avatar-placeholder">
  <div class="bg-neutral text-neutral-content w-8 rounded-full">
    <span class="text-xs">UI</span>
  </div>
</div>
```
