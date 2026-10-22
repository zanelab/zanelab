import NProgress from 'nprogress';

NProgress.configure({
  showSpinner: true,
  speed: 300,
});

export function startProgress() {
  NProgress.start();
}

export function stopProgress() {
  NProgress.done();
}
