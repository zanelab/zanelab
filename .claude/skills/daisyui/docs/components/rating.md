> Rating is a set of radio buttons that allow the user to rate something.

### ~Rating

```html
<div class="rating">
  <input
    type="radio"
    name="rating-1"
    class="mask mask-star"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-1"
    class="mask mask-star"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-1"
    class="mask mask-star"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-1"
    class="mask mask-star"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-1"
    class="mask mask-star"
    aria-label="5 star"
  />
</div>
```

### ~Read-only Rating

```html
<div class="rating">
  <div class="mask mask-star" aria-label="1 star"></div>
  <div class="mask mask-star" aria-label="2 star"></div>
  <div class="mask mask-star" aria-label="3 star" aria-current="true"></div>
  <div class="mask mask-star" aria-label="4 star"></div>
  <div class="mask mask-star" aria-label="5 star"></div>
</div>
```

### ~mask-star-2 with warning color

```html
<div class="rating">
  <input
    type="radio"
    name="rating-2"
    class="mask mask-star-2 bg-orange-400"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-2"
    class="mask mask-star-2 bg-orange-400"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-2"
    class="mask mask-star-2 bg-orange-400"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-2"
    class="mask mask-star-2 bg-orange-400"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-2"
    class="mask mask-star-2 bg-orange-400"
    aria-label="5 star"
  />
</div>
```

### ~mask-heart with multiple colors

```html
<div class="rating gap-1">
  <input
    type="radio"
    name="rating-3"
    class="mask mask-heart bg-red-400"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-3"
    class="mask mask-heart bg-orange-400"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-3"
    class="mask mask-heart bg-yellow-400"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-3"
    class="mask mask-heart bg-lime-400"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-3"
    class="mask mask-heart bg-green-400"
    aria-label="5 star"
  />
</div>
```

### ~mask-star-2 with green-500 color

```html
<div class="rating">
  <input
    type="radio"
    name="rating-4"
    class="mask mask-star-2 bg-green-500"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-4"
    class="mask mask-star-2 bg-green-500"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-4"
    class="mask mask-star-2 bg-green-500"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-4"
    class="mask mask-star-2 bg-green-500"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-4"
    class="mask mask-star-2 bg-green-500"
    aria-label="5 star"
  />
</div>
```

### ~Sizes

```html
<!-- xs -->
<div class="rating rating-xs">
  <input
    type="radio"
    name="rating-5"
    class="mask mask-star-2 bg-orange-400"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-5"
    class="mask mask-star-2 bg-orange-400"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-5"
    class="mask mask-star-2 bg-orange-400"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-5"
    class="mask mask-star-2 bg-orange-400"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-5"
    class="mask mask-star-2 bg-orange-400"
    aria-label="5 star"
  />
</div>
<!-- sm -->
<div class="rating rating-sm">
  <input
    type="radio"
    name="rating-6"
    class="mask mask-star-2 bg-orange-400"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-6"
    class="mask mask-star-2 bg-orange-400"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-6"
    class="mask mask-star-2 bg-orange-400"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-6"
    class="mask mask-star-2 bg-orange-400"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-6"
    class="mask mask-star-2 bg-orange-400"
    aria-label="5 star"
  />
</div>
<!-- md -->
<div class="rating rating-md">
  <input
    type="radio"
    name="rating-7"
    class="mask mask-star-2 bg-orange-400"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-7"
    class="mask mask-star-2 bg-orange-400"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-7"
    class="mask mask-star-2 bg-orange-400"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-7"
    class="mask mask-star-2 bg-orange-400"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-7"
    class="mask mask-star-2 bg-orange-400"
    aria-label="5 star"
  />
</div>
<!-- lg -->
<div class="rating rating-lg">
  <input
    type="radio"
    name="rating-8"
    class="mask mask-star-2 bg-orange-400"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-8"
    class="mask mask-star-2 bg-orange-400"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-8"
    class="mask mask-star-2 bg-orange-400"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-8"
    class="mask mask-star-2 bg-orange-400"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-8"
    class="mask mask-star-2 bg-orange-400"
    aria-label="5 star"
  />
</div>
<!-- xl -->
<div class="rating rating-xl">
  <input
    type="radio"
    name="rating-9"
    class="mask mask-star-2 bg-orange-400"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-9"
    class="mask mask-star-2 bg-orange-400"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-9"
    class="mask mask-star-2 bg-orange-400"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-9"
    class="mask mask-star-2 bg-orange-400"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-9"
    class="mask mask-star-2 bg-orange-400"
    aria-label="5 star"
  />
</div>
```

### ~with `rating-hidden`

```html
<div class="rating rating-lg">
  <input
    type="radio"
    name="rating-10"
    class="rating-hidden"
    aria-label="clear"
  />
  <input
    type="radio"
    name="rating-10"
    class="mask mask-star-2"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-10"
    class="mask mask-star-2"
    aria-label="2 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-10"
    class="mask mask-star-2"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-10"
    class="mask mask-star-2"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-10"
    class="mask mask-star-2"
    aria-label="5 star"
  />
</div>
```

### ~half stars

```html
<div class="rating rating-lg rating-half">
  <input type="radio" name="rating-11" class="rating-hidden" />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-1 bg-green-500"
    aria-label="0.5 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-2 bg-green-500"
    aria-label="1 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-1 bg-green-500"
    aria-label="1.5 star"
    checked="checked"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-2 bg-green-500"
    aria-label="2 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-1 bg-green-500"
    aria-label="2.5 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-2 bg-green-500"
    aria-label="3 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-1 bg-green-500"
    aria-label="3.5 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-2 bg-green-500"
    aria-label="4 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-1 bg-green-500"
    aria-label="4.5 star"
  />
  <input
    type="radio"
    name="rating-11"
    class="mask mask-star-2 mask-half-2 bg-green-500"
    aria-label="5 star"
  />
</div>
```
