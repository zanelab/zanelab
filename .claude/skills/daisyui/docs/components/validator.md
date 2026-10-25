> Validator class changes the color of form elements to error or success based on input's validation rules.

### ~Validator

```html
<input
  class="input validator"
  type="email"
  required
  placeholder="mail@site.com"
/>
```

### ~Validator and validator-hint

```html
<input
  class="input validator"
  type="email"
  required
  placeholder="mail@site.com"
/>
<div class="validator-hint">Enter valid email address</div>
```

### ~Password requirement validator

```html
<input
  type="password"
  class="input validator"
  required
  placeholder="Password"
  minlength="8"
  pattern="(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
  title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
/>
<p class="validator-hint">
  Must be more than 8 characters, including
  <br />At least one number <br />At least one lowercase letter <br />At least
  one uppercase letter
</p>
```

### ~Username requirement validator

```html
<input
  type="text"
  class="input validator"
  required
  placeholder="Username"
  pattern="[A-Za-z][A-Za-z0-9\\-]*"
  minlength="3"
  maxlength="30"
  title="Only letters, numbers or dash"
/>
<p class="validator-hint">
  Must be 3 to 30 characters
  <br />containing only letters, numbers or dash
</p>
```

### ~Phone Number requirement validator

```html
<input
  type="tel"
  class="input validator tabular-nums"
  required
  placeholder="Phone"
  pattern="[0-9]*"
  minlength="10"
  maxlength="10"
  title="Must be 10 digits"
/>
<p class="validator-hint">Must be 10 digits</p>
```

### ~URL input requirement validator

```html
<input
  type="url"
  class="input validator"
  required
  placeholder="https://"
  value="https://"
  pattern="^(https?://)?([a-zA-Z0-9]([a-zA-Z0-9\-].*[a-zA-Z0-9])?\.)+[a-zA-Z].*$"
  title="Must be valid URL"
/>
<p class="validator-hint">Must be valid URL</p>
```

### ~Date input requirement validator

```html
<input
  type="date"
  class="input validator"
  required
  placeholder="Pick a date in 2025"
  min="2025-01-01"
  max="2025-12-31"
  title="Must be valid URL"
/>
<p class="validator-hint">Must be 2025</p>
```

### ~Number input requirement validator

```html
<input
  type="number"
  class="input validator"
  required
  placeholder="Type a number between 1 to 10"
  min="1"
  max="10"
  title="Must be between be 1 to 10"
/>
<p class="validator-hint">Must be between be 1 to 10</p>
```

### ~Checkbox requirement validator

```html
<input type="checkbox" class="checkbox validator" required title="Required" />
<p class="validator-hint">Required</p>
```

### ~Toggle requirement validator

```html
<input type="checkbox" class="toggle validator" required title="Required" />
<p class="validator-hint">Required</p>
```

### ~Select requirement validator

```html
<form>
  <select class="select validator" required>
    <option disabled selected value="">Choose:</option>
    <option>Tabs</option>
    <option>Spaces</option>
  </select>
  <p class="validator-hint">Required</p>
  <button class="btn" type="submit">Submit form</button>
</form>
```

### ~Form requirement validator

```html
<form class="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
  <fieldset class="fieldset">
    <label class="label">Email</label>
    <input type="email" class="input validator" placeholder="Email" required />
    <p class="validator-hint hidden">Required</p>
  </fieldset>

  <label class="fieldset">
    <span class="label">Password</span>
    <input
      type="password"
      class="input validator"
      placeholder="Password"
      required
    />
    <span class="validator-hint hidden">Required</span>
  </label>

  <button class="btn btn-neutral mt-4" type="submit">Login</button>
  <button class="btn btn-ghost mt-1" type="reset">Reset</button>
</form>
```
