> Code mockup is used to show a block of code in a box that looks like a code editor.

### ~mockup code with line prefix

```html
<div class="mockup-code w-full">
  <pre data-prefix="$"><code>npm i daisyui</code></pre>
</div>
```

### ~Multi line

```html
<div class="mockup-code w-full">
  <pre data-prefix="$"><code>npm i daisyui</code></pre>
  <pre data-prefix=">" class="text-warning"><code>installing...</code></pre>
  <pre data-prefix=">" class="text-success"><code>Done!</code></pre>
</div>
```

### ~Highlighted line

```html
<div class="mockup-code w-full">
  <pre data-prefix="1"><code>npm i daisyui</code></pre>
  <pre data-prefix="2"><code>installing...</code></pre>
  <pre
    data-prefix="3"
    class="bg-warning text-warning-content"
  ><code>Error!</code></pre>
</div>
```

### ~Long line will scroll

```html
<div class="mockup-code w-full">
  <pre
    data-prefix="~"
  ><code>Magnam dolore beatae necessitatibus nemopsum itaque sit. Et porro quae qui et et dolore ratione.</code></pre>
</div>
```

### ~Without prefix

```html
<div class="mockup-code w-full">
  <pre><code>without prefix</code></pre>
</div>
```

### ~With color

```html
<div class="mockup-code bg-primary text-primary-content w-full">
  <pre><code>can be any color!</code></pre>
</div>
```
