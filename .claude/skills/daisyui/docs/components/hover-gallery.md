> Hover Gallery is container of images. The first image is visible by default and when we hover it horizontally, other images show up. Hover Gallery is useful for product cards in ecommerce sites, portfolios or in image galleries. Hover Gallery can include up to 10 images.

### ~Hover Gallery

```html
<figure class="hover-gallery max-w-60">
  <img
    alt="Tailwind CSS image hover gallery"
    src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp"
  />
  <img
    alt="Tailwind CSS image hover gallery"
    src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp"
  />
  <img
    alt="Tailwind CSS image hover gallery"
    src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp"
  />
  <img
    alt="Tailwind CSS image hover gallery"
    src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp"
  />
</figure>
```

### ~Hover Gallery in a card

```html
<div class="card card-sm bg-base-200 max-w-60 shadow">
  <figure class="hover-gallery">
    <img
      alt="Tailwind CSS image hover gallery"
      src="https://img.daisyui.com/images/stock/daisyui-hat-1.webp"
    />
    <img
      alt="Tailwind CSS image hover gallery"
      src="https://img.daisyui.com/images/stock/daisyui-hat-2.webp"
    />
    <img
      alt="Tailwind CSS image hover gallery"
      src="https://img.daisyui.com/images/stock/daisyui-hat-3.webp"
    />
    <img
      alt="Tailwind CSS image hover gallery"
      src="https://img.daisyui.com/images/stock/daisyui-hat-4.webp"
    />
  </figure>
  <div class="card-body">
    <h2 class="card-title flex justify-between">
      daisyUI Hat
      <span class="font-normal">$25</span>
    </h2>
    <p>High Quality classic cap hat with stitch logo</p>
  </div>
</div>
```
