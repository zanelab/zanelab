> Pagination is a group of buttons that allow the user to navigate between a set of related content.

### ~Pagination with an active button

```html
<div class="join">
  <button class="join-item btn">1</button>
  <button class="join-item btn btn-active">2</button>
  <button class="join-item btn">3</button>
  <button class="join-item btn">4</button>
</div>
```

### ~Sizes

```html
<div class="join">
  <button class="join-item btn btn-xs">1</button>
  <button class="join-item btn btn-xs btn-active">2</button>
  <button class="join-item btn btn-xs">3</button>
  <button class="join-item btn btn-xs">4</button>
</div>
<div class="join">
  <button class="join-item btn btn-sm">1</button>
  <button class="join-item btn btn-sm btn-active">2</button>
  <button class="join-item btn btn-sm">3</button>
  <button class="join-item btn btn-sm">4</button>
</div>
<div class="join">
  <button class="join-item btn btn-md">1</button>
  <button class="join-item btn btn-md btn-active">2</button>
  <button class="join-item btn btn-md">3</button>
  <button class="join-item btn btn-md">4</button>
</div>
<div class="join">
  <button class="join-item btn btn-lg">1</button>
  <button class="join-item btn btn-lg btn-active">2</button>
  <button class="join-item btn btn-lg">3</button>
  <button class="join-item btn btn-lg">4</button>
</div>
<div class="join">
  <button class="join-item btn btn-xl">1</button>
  <button class="join-item btn btn-xl btn-active">2</button>
  <button class="join-item btn btn-xl">3</button>
  <button class="join-item btn btn-xl">4</button>
</div>
```

### ~With a disabled button

```html
<div class="join">
  <button class="join-item btn">1</button>
  <button class="join-item btn">2</button>
  <button class="join-item btn btn-disabled">...</button>
  <button class="join-item btn">99</button>
  <button class="join-item btn">100</button>
</div>
```

### ~Extra small buttons

```html
<div class="join">
  <button class="join-item btn">«</button>
  <button class="join-item btn">Page 22</button>
  <button class="join-item btn">»</button>
</div>
```

### ~Nex/Prev outline buttons with equal width

```html
<div class="join grid grid-cols-2">
  <button class="join-item btn btn-outline">Previous page</button>
  <button class="join-item btn btn-outline">Next</button>
</div>
```

### ~Using radio inputs

```html
<div class="join">
  <input
    class="join-item btn btn-square"
    type="radio"
    name="options"
    aria-label="1"
    checked="checked"
  />
  <input
    class="join-item btn btn-square"
    type="radio"
    name="options"
    aria-label="2"
  />
  <input
    class="join-item btn btn-square"
    type="radio"
    name="options"
    aria-label="3"
  />
  <input
    class="join-item btn btn-square"
    type="radio"
    name="options"
    aria-label="4"
  />
</div>
```
