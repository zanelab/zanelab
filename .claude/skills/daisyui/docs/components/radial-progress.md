> Radial progress can be used to show the progress of a task or to show the passing of time.

### ~Radial progress

```html
<div
  class="radial-progress"
  style="--value:70;"
  aria-valuenow="70"
  role="progressbar"
>
  70%
</div>
```

### ~Different values

```html
<div
  class="radial-progress"
  style="--value:0;"
  aria-valuenow="0"
  role="progressbar"
>
  0%
</div>
<div
  class="radial-progress"
  style="--value:20;"
  aria-valuenow="20"
  role="progressbar"
>
  20%
</div>
<div
  class="radial-progress"
  style="--value:60;"
  aria-valuenow="60"
  role="progressbar"
>
  60%
</div>
<div
  class="radial-progress"
  style="--value:80;"
  aria-valuenow="80"
  role="progressbar"
>
  80%
</div>
<div
  class="radial-progress"
  style="--value:100;"
  aria-valuenow="100"
  role="progressbar"
>
  100%
</div>
```

### ~Custom color

```html
<div
  class="radial-progress text-primary"
  style="--value:70;"
  aria-valuenow="70"
  role="progressbar"
>
  70%
</div>
```

### ~With background color and border

```html
<div
  class="radial-progress bg-primary text-primary-content border-primary border-4"
  style="--value:70;"
  aria-valuenow="70"
  role="progressbar"
>
  70%
</div>
```

### ~Custom size and custom thickness

```html
<div
  class="radial-progress"
  style="--value:70; --size:12rem; --thickness: 2px;"
  aria-valuenow="70"
  role="progressbar"
>
  70%
</div>
<div
  class="radial-progress"
  style="--value:70; --size:12rem; --thickness: 2rem;"
  aria-valuenow="70"
  role="progressbar"
>
  70%
</div>
```
