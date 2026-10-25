> Accordion is used for showing and hiding content but only one item can stay open at a time.

### ~Accordion using radio inputs

```html
<div class="bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-1" checked="checked" />
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
<div class="bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-1" />
  <div class="collapse-title font-semibold">
    I forgot my password. What should I do?
  </div>
  <div class="collapse-content text-sm">
    Click on "Forgot Password" on the login page and follow the instructions
    sent to your email.
  </div>
</div>
<div class="bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-1" />
  <div class="collapse-title font-semibold">
    How do I update my profile information?
  </div>
  <div class="collapse-content text-sm">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </div>
</div>
```

### ~Accordion using details

```html
<details
  class="bg-base-100 border-base-300 collapse border"
  name="my-accordion-det-1"
  open
>
  <summary class="collapse-title font-semibold">
    How do I create an account?
  </summary>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</details>
<details
  class="bg-base-100 border-base-300 collapse border"
  name="my-accordion-det-1"
>
  <summary class="collapse-title font-semibold">
    I forgot my password. What should I do?
  </summary>
  <div class="collapse-content text-sm">
    Click on "Forgot Password" on the login page and follow the instructions
    sent to your email.
  </div>
</details>
<details
  class="bg-base-100 border-base-300 collapse border"
  name="my-accordion-det-1"
>
  <summary class="collapse-title font-semibold">
    How do I update my profile information?
  </summary>
  <div class="collapse-content text-sm">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </div>
</details>
```

### ~Accordion with arrow icon

```html
<div class="collapse-arrow bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-2" checked="checked" />
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
<div class="collapse-arrow bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-2" />
  <div class="collapse-title font-semibold">
    I forgot my password. What should I do?
  </div>
  <div class="collapse-content text-sm">
    Click on "Forgot Password" on the login page and follow the instructions
    sent to your email.
  </div>
</div>
<div class="collapse-arrow bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-2" />
  <div class="collapse-title font-semibold">
    How do I update my profile information?
  </div>
  <div class="collapse-content text-sm">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </div>
</div>
```

### ~Accordion with plus/minus icon

```html
<div class="collapse-plus bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-3" checked="checked" />
  <div class="collapse-title font-semibold">How do I create an account?</div>
  <div class="collapse-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the
    registration process.
  </div>
</div>
<div class="collapse-plus bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-3" />
  <div class="collapse-title font-semibold">
    I forgot my password. What should I do?
  </div>
  <div class="collapse-content text-sm">
    Click on "Forgot Password" on the login page and follow the instructions
    sent to your email.
  </div>
</div>
<div class="collapse-plus bg-base-100 border-base-300 collapse border">
  <input type="radio" name="my-accordion-3" />
  <div class="collapse-title font-semibold">
    How do I update my profile information?
  </div>
  <div class="collapse-content text-sm">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </div>
</div>
```

### ~Using Accordion and Join together

```html
<div class="join join-vertical bg-base-100">
  <div class="collapse-arrow join-item border-base-300 collapse border">
    <input type="radio" name="my-accordion-4" checked="checked" />
    <div class="collapse-title font-semibold">How do I create an account?</div>
    <div class="collapse-content text-sm">
      Click the "Sign Up" button in the top right corner and follow the
      registration process.
    </div>
  </div>
  <div class="collapse-arrow join-item border-base-300 collapse border">
    <input type="radio" name="my-accordion-4" />
    <div class="collapse-title font-semibold">
      I forgot my password. What should I do?
    </div>
    <div class="collapse-content text-sm">
      Click on "Forgot Password" on the login page and follow the instructions
      sent to your email.
    </div>
  </div>
  <div class="collapse-arrow join-item border-base-300 collapse border">
    <input type="radio" name="my-accordion-4" />
    <div class="collapse-title font-semibold">
      How do I update my profile information?
    </div>
    <div class="collapse-content text-sm">
      Go to "My Account" settings and select "Edit Profile" to make changes.
    </div>
  </div>
</div>
```
