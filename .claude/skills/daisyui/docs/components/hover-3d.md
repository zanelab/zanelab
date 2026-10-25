> Hover 3D is a wrapper component that adds a 3D hover effect to its content. When we hover over the component, it tilts and rotates based on the mouse position, creating an interactive 3D effect.

### ~3D image hover effect

```html
<div class="hover-3d">
  <!-- content -->
  <figure class="max-w-100 rounded-2xl">
    <img
      src="https://img.daisyui.com/images/stock/creditcard.webp"
      alt="3D card"
    />
  </figure>
  <!-- 8 empty divs needed for the 3D effect -->
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>
```

### ~3D card hover effect

```html
<a href="#" class="hover-3d mx-2 my-12 cursor-pointer">
  <!-- content -->
  <div
    class="card w-96 bg-black bg-[radial-gradient(circle_at_bottom_left,#ffffff04_35%,transparent_36%),radial-gradient(circle_at_top_right,#ffffff04_35%,transparent_36%)] bg-size-[4.95em_4.95em] text-white"
  >
    <div class="card-body">
      <div class="mb-10 flex justify-between">
        <div class="font-bold">BANK OF LATVERIA</div>
        <div class="text-5xl opacity-10">❁</div>
      </div>
      <div class="mb-4 text-lg opacity-40">0210 8820 1150 0222</div>
      <div class="flex justify-between">
        <div>
          <div class="text-xs opacity-20">CARD HOLDER</div>
          <div>VICTOR VON D.</div>
        </div>
        <div>
          <div class="text-xs opacity-20">EXPIRES</div>
          <div>29/08</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 8 empty divs needed for the 3D effect -->
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</a>
```

### ~3D hover effect for image gallery

```html
<div class="hover-3d">
  <!-- content -->
  <figure class="w-60 rounded-2xl">
    <img
      src="https://img.daisyui.com/images/stock/card-1.webp?x"
      alt="Tailwind CSS 3D card"
    />
  </figure>
  <!-- 8 empty divs needed for the 3D effect -->
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>

<div class="hover-3d">
  <!-- content -->
  <figure class="w-60 rounded-2xl">
    <img
      src="https://img.daisyui.com/images/stock/card-2.webp?x"
      alt="Tailwind CSS 3D hover"
    />
  </figure>
  <!-- 8 empty divs needed for the 3D effect -->
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>

<div class="hover-3d">
  <!-- content -->
  <figure class="w-60 rounded-2xl">
    <img
      src="https://img.daisyui.com/images/stock/card-3.webp?x"
      alt="Tailwind CSS 3D hover"
    />
  </figure>
  <!-- 8 empty divs needed for the 3D effect -->
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>
```
