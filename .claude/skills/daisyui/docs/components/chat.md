> Chat bubbles are used to show one line of conversation and all its data, including the author image, author name, time, etc.

### ~chat-start and chat-end

```html
<div class="chat chat-start">
  <div class="chat-bubble">
    It's over Anakin,
    <br />
    I have the high ground.
  </div>
</div>
<div class="chat chat-end">
  <div class="chat-bubble">You underestimate my power!</div>
</div>
```

### ~Chat with image

```html
<div class="chat chat-start">
  <div class="chat-image avatar">
    <div class="w-10 rounded-full">
      <img
        alt="Tailwind CSS chat bubble component"
        src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
      />
    </div>
  </div>
  <div class="chat-bubble">
    It was said that you would, destroy the Sith, not join them.
  </div>
</div>
<div class="chat chat-start">
  <div class="chat-image avatar">
    <div class="w-10 rounded-full">
      <img
        alt="Tailwind CSS chat bubble component"
        src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
      />
    </div>
  </div>
  <div class="chat-bubble">It was you who would bring balance to the Force</div>
</div>
<div class="chat chat-start">
  <div class="chat-image avatar">
    <div class="w-10 rounded-full">
      <img
        alt="Tailwind CSS chat bubble component"
        src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
      />
    </div>
  </div>
  <div class="chat-bubble">Not leave it in Darkness</div>
</div>
```

### ~Chat with image, header and footer

```html
<div class="chat chat-start">
  <div class="chat-image avatar">
    <div class="w-10 rounded-full">
      <img
        alt="Tailwind CSS chat bubble component"
        src="https://img.daisyui.com/images/profile/demo/kenobee@192.webp"
      />
    </div>
  </div>
  <div class="chat-header">
    Obi-Wan Kenobi
    <time class="text-xs opacity-50">12:45</time>
  </div>
  <div class="chat-bubble">You were the Chosen One!</div>
  <div class="chat-footer opacity-50">Delivered</div>
</div>
<div class="chat chat-end">
  <div class="chat-image avatar">
    <div class="w-10 rounded-full">
      <img
        alt="Tailwind CSS chat bubble component"
        src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp"
      />
    </div>
  </div>
  <div class="chat-header">
    Anakin
    <time class="text-xs opacity-50">12:46</time>
  </div>
  <div class="chat-bubble">I hate you!</div>
  <div class="chat-footer opacity-50">Seen at 12:46</div>
</div>
```

### ~Chat with header and footer

```html
<div class="chat chat-start">
  <div class="chat-header">
    Obi-Wan Kenobi
    <time class="text-xs opacity-50">2 hours ago</time>
  </div>
  <div class="chat-bubble">You were the Chosen One!</div>
  <div class="chat-footer opacity-50">Seen</div>
</div>
<div class="chat chat-start">
  <div class="chat-header">
    Obi-Wan Kenobi
    <time class="text-xs opacity-50">2 hour ago</time>
  </div>
  <div class="chat-bubble">I loved you.</div>
  <div class="chat-footer opacity-50">Delivered</div>
</div>
```

### ~Chat Bubble with colors

```html
<div class="chat chat-start">
  <div class="chat-bubble chat-bubble-primary">
    What kind of nonsense is this
  </div>
</div>
<div class="chat chat-start">
  <div class="chat-bubble chat-bubble-secondary">
    Put me on the Council and not make me a Master!??
  </div>
</div>
<div class="chat chat-start">
  <div class="chat-bubble chat-bubble-accent">
    That's never been done in the history of the Jedi.
  </div>
</div>
<div class="chat chat-start">
  <div class="chat-bubble chat-bubble-neutral">It's insulting!</div>
</div>
<div class="chat chat-end">
  <div class="chat-bubble chat-bubble-info">Calm down, Anakin.</div>
</div>
<div class="chat chat-end">
  <div class="chat-bubble chat-bubble-success">
    You have been given a great honor.
  </div>
</div>
<div class="chat chat-end">
  <div class="chat-bubble chat-bubble-warning">
    To be on the Council at your age.
  </div>
</div>
<div class="chat chat-end">
  <div class="chat-bubble chat-bubble-error">It's never happened before.</div>
</div>
```
