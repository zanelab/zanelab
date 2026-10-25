> Label is used to provide a name or title for an input field. Label can be placed before or after the field.

### ~Label for input

```html
<label class="input">
  <span class="label">https://</span>
  <input type="text" placeholder="URL" />
</label>
```

### ~Label for input at the end

```html
<label class="input">
  <input type="text" placeholder="domain name" />
  <span class="label">.com</span>
</label>
```

### ~Label for select

```html
<label class="select">
  <span class="label">Type</span>
  <select>
    <option>Personal</option>
    <option>Business</option>
  </select>
</label>
```

### ~Label for date input

```html
<label class="input">
  <span class="label">Publish date</span>
  <input type="date" />
</label>
```

### ~Floating Label

```html
<label class="floating-label">
  <span>Your Email</span>
  <input type="text" placeholder="mail@site.com" class="input input-md" />
</label>
```

### ~Floating Label with Different Sizes

```html
<label class="floating-label">
  <input type="text" placeholder="Extra Small" class="input input-xs" />
  <span>Extra Small</span>
</label>
<label class="floating-label">
  <input type="text" placeholder="Small" class="input input-sm" />
  <span>Small</span>
</label>
<label class="floating-label">
  <input type="text" placeholder="Medium" class="input input-md" />
  <span>Medium</span>
</label>
<label class="floating-label">
  <input type="text" placeholder="Large" class="input input-lg" />
  <span>Large</span>
</label>
<label class="floating-label">
  <input type="text" placeholder="Extra Large" class="input input-xl" />
  <span>Extra Large</span>
</label>
```

### ~Responsive Size Floating Label

```html
<label class="floating-label">
  <input
    type="text"
    placeholder="Input"
    class="input input-xs sm:input-sm md:input-md lg:input-lg xl:input-xl"
    value="Placeholder"
  />
  <span>Input</span>
</label>

<label class="floating-label">
  <textarea
    placeholder="Textarea"
    class="textarea textarea-xs sm:textarea-sm md:textarea-md lg:textarea-lg xl:textarea-xl"
  >
Placeholder</textarea>
  <span>Textarea</span>
</label>

<label class="floating-label">
  <select
    class="select select-xs sm:select-sm md:select-md lg:select-lg xl:select-xl"
  >
    <option disabled selected>Placeholder</option>
    <option>Option</option>
  </select>
  <span>Select</span>
</label>
```
