> Filter is a group of radio buttons. Choosing one of the options will hide the others and shows a reset button next to the chosen option.

### ~Filter using HTML form, radio buttons and reset button

```html
<form class="filter">
  <input class="btn btn-square" type="reset" value="×" />
  <input class="btn" type="radio" name="frameworks" aria-label="Svelte" />
  <input class="btn" type="radio" name="frameworks" aria-label="Vue" />
  <input class="btn" type="radio" name="frameworks" aria-label="React" />
</form>
```

### ~Filter without HTML form

```html
<div class="filter">
  <input
    class="btn filter-reset"
    type="radio"
    name="metaframeworks"
    aria-label="All"
  />
  <input
    class="btn"
    type="radio"
    name="metaframeworks"
    aria-label="Sveltekit"
  />
  <input class="btn" type="radio" name="metaframeworks" aria-label="Nuxt" />
  <input class="btn" type="radio" name="metaframeworks" aria-label="Next.js" />
</div>
```

### ~Filter using HTML form, checkboxes, and a reset button

```html
<form class="filter">
  <input class="btn" type="checkbox" name="frameworks" aria-label="Svelte" />
  <input class="btn" type="checkbox" name="frameworks" aria-label="Vue" />
  <input class="btn" type="checkbox" name="frameworks" aria-label="React" />
  <input class="btn btn-square" type="reset" value="×" />
</form>
```
