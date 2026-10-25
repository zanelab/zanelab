> List is a vertical layout to display information in rows.

### ~List (second column grows - default)

```html
<ul class="list bg-base-100 rounded-box shadow-md">
  <li class="p-4 pb-2 text-xs tracking-wide opacity-60">
    Most played songs this week
  </li>

  <li class="list-row">
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/1@94.webp"
      />
    </div>
    <div>
      <div>Dio Lupa</div>
      <div class="text-xs font-semibold uppercase opacity-60">
        Remaining Reason
      </div>
    </div>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          ></path>
        </g>
      </svg>
    </button>
  </li>

  <li class="list-row">
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/4@94.webp"
      />
    </div>
    <div>
      <div>Ellie Beilish</div>
      <div class="text-xs font-semibold uppercase opacity-60">
        Bears of a fever
      </div>
    </div>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          ></path>
        </g>
      </svg>
    </button>
  </li>

  <li class="list-row">
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/3@94.webp"
      />
    </div>
    <div>
      <div>Sabrino Gardener</div>
      <div class="text-xs font-semibold uppercase opacity-60">Cappuccino</div>
    </div>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          ></path>
        </g>
      </svg>
    </button>
  </li>
</ul>
```

### ~List (third column grows)

```html
<ul class="list bg-base-100 rounded-box shadow-md">
  <li class="p-4 pb-2 text-xs tracking-wide opacity-60">
    Most played songs this week
  </li>

  <li class="list-row">
    <div class="text-4xl font-thin tabular-nums opacity-30">01</div>
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/1@94.webp"
      />
    </div>
    <div class="list-col-grow">
      <div>Dio Lupa</div>
      <div class="text-xs font-semibold uppercase opacity-60">
        Remaining Reason
      </div>
    </div>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
  </li>

  <li class="list-row">
    <div class="text-4xl font-thin tabular-nums opacity-30">02</div>
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/4@94.webp"
      />
    </div>
    <div class="list-col-grow">
      <div>Ellie Beilish</div>
      <div class="text-xs font-semibold uppercase opacity-60">
        Bears of a fever
      </div>
    </div>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
  </li>

  <li class="list-row">
    <div class="text-4xl font-thin tabular-nums opacity-30">03</div>
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/3@94.webp"
      />
    </div>
    <div class="list-col-grow">
      <div>Sabrino Gardener</div>
      <div class="text-xs font-semibold uppercase opacity-60">Cappuccino</div>
    </div>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
  </li>
</ul>
```

### ~List (third column wraps to next row)

```html
<ul class="list bg-base-100 rounded-box shadow-md">
  <li class="p-4 pb-2 text-xs tracking-wide opacity-60">
    Most played songs this week
  </li>

  <li class="list-row">
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/1@94.webp"
      />
    </div>
    <div>
      <div>Dio Lupa</div>
      <div class="text-xs font-semibold uppercase opacity-60">
        Remaining Reason
      </div>
    </div>
    <p class="list-col-wrap text-xs">
      "Remaining Reason" became an instant hit, praised for its haunting sound
      and emotional depth. A viral performance brought it widespread
      recognition, making it one of Dio Lupa’s most iconic tracks.
    </p>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          ></path>
        </g>
      </svg>
    </button>
  </li>

  <li class="list-row">
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/4@94.webp"
      />
    </div>
    <div>
      <div>Ellie Beilish</div>
      <div class="text-xs font-semibold uppercase opacity-60">
        Bears of a fever
      </div>
    </div>
    <p class="list-col-wrap text-xs">
      "Bears of a Fever" captivated audiences with its intense energy and
      mysterious lyrics. Its popularity skyrocketed after fans shared it widely
      online, earning Ellie critical acclaim.
    </p>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          ></path>
        </g>
      </svg>
    </button>
  </li>

  <li class="list-row">
    <div>
      <img
        class="rounded-box size-10"
        alt="Tailwind CSS list item"
        src="https://img.daisyui.com/images/profile/demo/3@94.webp"
      />
    </div>
    <div>
      <div>Sabrino Gardener</div>
      <div class="text-xs font-semibold uppercase opacity-60">Cappuccino</div>
    </div>
    <p class="list-col-wrap text-xs">
      "Cappuccino" quickly gained attention for its smooth melody and relatable
      themes. The song’s success propelled Sabrino into the spotlight,
      solidifying their status as a rising star.
    </p>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 3L20 12 6 21 6 3z"></path>
        </g>
      </svg>
    </button>
    <button class="btn btn-square btn-ghost">
      <svg
        class="size-[1.2em]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-width="2"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          ></path>
        </g>
      </svg>
    </button>
  </li>
</ul>
```
