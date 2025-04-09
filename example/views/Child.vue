<script setup>
import { ref, watch, computed } from 'vue';

let message = ref('');

// ------------------------------------------------------------------
// Window + window connection

window.addEventListener('message', function (event) {
  if (event.data.action == 'hello') {
    message.value = 'It works: ' + event.data.message;
  }
});

function send() {
  if (!windowConnected.value) message.value = 'Parent window is closed!';

  let parent = window.opener || window.parent;
  parent?.postMessage(
    { action: 'hello', message: 'hello from window' }, // any serializable type: basic type or POJO
    '*'
  );
}

// "reactive" connected check
let windowConnected = ref(false);
setInterval(() => {
  let current = !(window.opener === null) || !(window.parent === null); // parent is the window opener, or iframe's parent
  if (windowConnected.value !== current) windowConnected.value = current;
}, 100);

// ------------------------------------------------------------------
// Fullscreen
function handleFullScreen(onOff) {
  if (onOff) document.body.requestFullscreen();
  else document.exitFullscreen();
}

// "reactive" fullscreen check
let isFullscreen = ref(false);
setInterval(() => {
  let current = !!document.fullscreenElement;
  if (isFullscreen.value !== current) isFullscreen.value = current;
}, 250);

// ------------------------------------------------------------------

// -- clean up the info toast
watch(
  message,
  (newVal) => newVal.length && setTimeout(() => (message.value = ''), 2000)
);
</script>

<template lang="pug">
aside
  div {{message}}

a(@click="send") send
br
small(v-if="windowConnected" style="color: lime") (connected)
small(v-else style="color:orange") (not connected)

footer
  a(v-if="!isFullscreen" @click="handleFullScreen(true)") fullscreen
  a(v-else @click="handleFullScreen(false)") exit fullscreen
</template>
