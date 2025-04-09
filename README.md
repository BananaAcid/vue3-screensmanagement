# inter window communication, screen handling

This is a basic example of opening windows and communicating with them. It works without any server communication, once it is loaded (inter window communication).

## Example 1: src/views/Home.vue

Shows the communication part only.

## Example 2: src/views/HomeEx.vue

Primarely shows the screen handling on top of the communication part.

The screen data and permission logic exists inside of a composable, [`src/composables/screensManagement.js`](?file=src/composables/screensManagement.js)

A simple example how to use the screen part:

```html
<script setup>
  import { useScreensRequest, useScreens, useScreensPossible, useScreensGranted, useScreenUtils } from 'screensManagement.js';

  let { request, message } = useScreensRequest(); // minimum requirement
  let { screens, current } = useScreens();        // minimum requirement
  let screensPossible = useScreensPossible();
  let screensGranted = useScreensGranted();
  let { screenToJSON } = useScreenUtils();
</script>

<template>
  <section v-if="screensPossible">
    <div v-html="message" />
    <button v-if="screensGranted === null" @click="request">request permissions ...</button>
    <!-- list screens -->
    <div v-if="screensGranted" v-for="screen in screens"> {{ screenToJSON(screen) }} </div>
  </section>
  <section v-else>
    <p>You have no screens or permissions can not be requested by your browser</p>
  </section>
</template>
```

---

## This is how it is done

Posted by me on https://stackoverflow.com/a/77034041/1644202

### Comaptibility

Enumerating screens works only on:

Chromium, Chromium-based PWAs, Electron

All other stuff is cross-browser compatible.

---

### for getting screens, Chrome

https://www.w3.org/TR/window-management/#usage-overview-screen-details

https://developer.mozilla.org/en-US/docs/Web/API/ScreenDetails

Only Chromium-based as of writing: https://caniuse.com/?search=getScreenDetails

    window.screen.isExtended == true; // yes, has multiple screens

    const screenDetails = (await window.getScreenDetails() ).screens; // array of screens

You need to request permission to do so:

https://developer.chrome.com/docs/capabilities/web-apis/window-management

---

### window.moveTo() - WILL NOT WORK CROSS SCREEN BOUNDRY

... but **will when using `.open()`**, passing the screen details needed in options like

`_blank` could also be a custom name to be able to identify the window later.

https://www.w3.org/TR/window-management/#usage-overview-place-windows-on-a-specific-screen

    const childWin = window.open(location, '_blank', `left=${left},top=${top},width=${width},height=${height}`)

example: https://stackoverflow.com/a/76293940/1644202

---

### elem.requestFullscreen(options)

Only styles within the target element will be applies. You might want to add a `<style>` or `<link ...>` element within the target element (yes that is allowed and works). It will be "cut out" and opened in the new fullscreen window. No head elements will be applied. In my case, `"body"` as selector did most of the lifting.

- Only within active window: you can not trigger it, if the window is not active and you have not clicked or touched.

https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen

https://www.w3.org/TR/window-management/#usage-overview-place-fullscreen-content-on-a-specific-screen

    const screenDetailed = screenDetails[1];
    await document.querySelector("#elem").requestFullscreen(options={
        navigationUI: "hide",
        screen: screenDetailed
    });

---

### communication between windows

I use **`childWin.postMessage()`** for communicating the data (basic types, thus POJO), and **`IndexDB`** for permanent (shared between the windows on same domain) data.

- `alert()` will only work on Chrome, if the window is not active. Opening it from the message-listener of postMessage might not work until you click the window at some point (the alert was not discarded, but will show up now)

- no localStorage, it has a size limit of [10MB in Chrome][1] and requesting `"unlimitedStorage"` did not work well across browsers, IndexDB is usually [drive space based in Chromium-based browsers and 1 or 2 GB on others][2].

- IndexDB: I used https://github.com/DVLP/localStorageDB to have an easy time with the IndexDB: it allows localStorage like access and handles all required stuff. **Promise wrapper solution:** https://github.com/DVLP/localStorageDB/issues/14

- Binary in Base64: IndexDB does not store binary data: only strings, numbers, booleans, objects, and arrays. So you could store it in Base64

**Connection check** on parent with `childWin.closed !== true` and on child with `window.opener===null` for parent

- Reconnect: "Ping" the parent from the child in intervals: check if it has no connection and just `.open()` the window with the same name (if you do not use `null` or `_blank`) to reconnect (be aware: the child window will reload). Or close the child window (`window.close()`).

**iFrame problem:** Communication does not seem to work (ref to window is not stored), if the parent is an iFrame or alike.

- check for `window.top === window.self`

**Data sync:** Using VUE, data can be synced by `watch()-ing` the data object and `sendMessage()` it on both sides (but do not send back (from the other sides watcher) if it is the last received data).

- It worked for me, using `{ immediate: true }` and watching specific subkeys of my data object as well (`[data.value, data.value.key.key.key.arr]`)

```js
// on parent
childWin.postMessage(obj, '*');
// on child
window.opener.postMessage(obj, '*');

// for both
window.addEventListener('message', function (event) {
  console.log('received:', event.data);
});
```

Note: **Broadcast Channel API** allows communication like `win.postMassage()` _but without a window reference_ ( https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API ) - good if you do not have a parent-child setup.

**Security Policy** ... should be set by you to what is needed. To get going, this is what I used (you should make sure you modify it to your needs)

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' *; font-src 'self' 'unsafe-inline' *; img-src 'self' 'unsafe-inline' data: *;"
/>
```

[stackoverflow /28230845/communication-between-tabs-or-windows][3]

[1]: https://developer.chrome.com/docs/extensions/reference/api/storage
[2]: https://rxdb.info/articles/indexeddb-max-storage-limit.html
[3]: https://stackoverflow.com/questions/28230845/communication-between-tabs-or-windows
