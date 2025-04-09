<script setup>
import DetachButton from '../components/DetachButton.vue';
import { ref, watch } from 'vue';

let childWindow = null;
let message = ref('');

function newWin() {
  let screen = window.screen; // permission free current screen info

  childWindow = window.open(
    '/child',
    'childwindow',
    'width=400,height=200' +
      // center the new window on current screen
      `, left=${screen.availLeft + (screen.availWidth - 400) / 2}` +
      `, top=${screen.availTop + (screen.availHeight - 200) / 2}` +
      // only for PWA
      ', location=no'
  );
  console.log(childWindow);
}

function send() {
  if (!windowConnected.value) message.value = 'Child window is not connected!';

  childWindow?.postMessage(
    { action: 'hello', message: 'hello from parent' }, // any serializable type: basic type or POJO
    '*'
  );
}

window.addEventListener('message', function (event) {
  if (event.data.action == 'hello') {
    message.value = 'It works: ' + event.data.message;
  }
});

// ------------------------------------------------------------------

// -- check if this window is detached
const isMainWindow = window.top === window.self;

// -- "reactive" connected check
let windowConnected = ref(false);
setInterval(() => {
  let current = !(childWindow === null || childWindow.closed); // null => was never initialized, closed true => initialized, but window got closed (reload would usually reconnect automatically)
  if (windowConnected.value !== current) windowConnected.value = current; // only on change, if there was a change (to make the change "reactive")
}, 100);

// -- clean up the info toast
watch(
  message,
  (newVal) => newVal.length && setTimeout(() => (message.value = ''), 2000)
);
</script>

<template lang="pug">
aside
  div {{message}}

div
  p
    a(@click="newWin") open child window #[small (or reconnect)]
    br
    small(v-if="windowConnected" style="color: lime") (connected)
    small(v-else style="color:orange") (not connected)

  p: a(@click="send") send test

  div(v-if="!isMainWindow" style="color: red")
    hr
    div
      | The preview window must be detached 
      DetachButton
      br
      | to be able 
      u to connect!
  
  hr
  p: a(href="./2") open extended version with #[u screen selection]

</template>

<style scoped lang="less"></style>
