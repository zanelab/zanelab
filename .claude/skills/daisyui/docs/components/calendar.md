> Calendar includes styles for different calendar libraries.

### ~Cally calendar example

```html
<!--
* Import Cally web component from CDN
<script type="module" src="https://unpkg.com/cally"></script>

* Or install as a dependency:
npm i cally
* and import it in JS
import "cally";
-->

<calendar-date
  class="cally bg-base-100 border-base-300 rounded-box border shadow-lg"
>
  <svg
    aria-label="Previous"
    class="size-4 fill-current"
    slot="previous"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
  </svg>
  <svg
    aria-label="Next"
    class="size-4 fill-current"
    slot="next"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
  </svg>
  <calendar-month></calendar-month>
</calendar-date>
```

### ~Cally date picker example

```html
<!--
* Import Cally web component from CDN
<script type="module" src="https://unpkg.com/cally"></script>

* Or install as a dependency:
npm i cally
* and import it in JS
import "cally";
-->

<button popovertarget="cally-popover1" class="input" id="cally1" style="anchor-name:--cally1">
  Pick a date
</button>
<div popover id="cally-popover1" class="dropdown bg-base-100 rounded-box shadow-lg" style="position-anchor:--cally1">
  <calendar-date class="cally" onchange={document.getElementById('cally1').innerText = this.value}>
    <svg aria-label="Previous" class="fill-current size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
    <svg aria-label="Next" class="fill-current size-4" slot="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
    <calendar-month></calendar-month>
  </calendar-date>
</div>
```

```html
<div id="calendar" class="vc"></div>
```

```html
<script
  src="https://cdn.jsdelivr.net/npm/vanilla-calendar-pro/index.js"
  defer
></script>

<div id="calendar" class="vc"></div>
```
