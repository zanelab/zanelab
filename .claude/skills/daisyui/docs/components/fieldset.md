> Fieldset is a container for grouping related form elements. It includes fieldset-legend as a title and label as a description.

### ~Fieldset fieldset-legend and label

```html
<fieldset class="fieldset">
  <legend class="fieldset-legend">Page title</legend>
  <input type="text" class="input" placeholder="My awesome page" />
  <p class="label">You can edit page title later on from settings</p>
</fieldset>
```

### ~Fieldset with background and border

```html
<fieldset
  class="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4"
>
  <legend class="fieldset-legend">Page title</legend>
  <input type="text" class="input" placeholder="My awesome page" />
  <p class="label">You can edit page title later on from settings</p>
</fieldset>
```

### ~Fieldset with multiple inputs

```html
<fieldset
  class="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4"
>
  <legend class="fieldset-legend">Page details</legend>

  <label class="label">Title</label>
  <input type="text" class="input" placeholder="My awesome page" />

  <label class="label">Slug</label>
  <input type="text" class="input" placeholder="my-awesome-page" />

  <label class="label">Author</label>
  <input type="text" class="input" placeholder="Name" />
</fieldset>
```

### ~Fieldset with multiple join items

```html
<fieldset
  class="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4"
>
  <legend class="fieldset-legend">Settings</legend>
  <div class="join">
    <input type="text" class="input join-item" placeholder="Product name" />
    <button class="btn join-item">save</button>
  </div>
</fieldset>
```

### ~Login form with fieldset

```html
<fieldset
  class="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4"
>
  <legend class="fieldset-legend">Login</legend>

  <label class="label">Email</label>
  <input type="email" class="input" placeholder="Email" />

  <label class="label">Password</label>
  <input type="password" class="input" placeholder="Password" />

  <button class="btn btn-neutral mt-4">Login</button>
</fieldset>
```
