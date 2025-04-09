<script setup>
import DetachButton from '../components/DetachButton.vue';
import { ref, watch } from 'vue';

let message = ref('');

// ------------------------------------------------------------------
// Window + window connection

let childWindow = null;

function newWin() {
  let screen = screenSelected.value || window.screen; // fallback to permission-free current screen infos

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

// -- "reactive" connected check
let windowConnected = ref(false);
setInterval(() => {
  let current = !(childWindow === null || childWindow.closed); // null => was never initialized, closed true => initialized, but window got closed (reload would usually reconnect automatically)
  if (windowConnected.value !== current) windowConnected.value = current; // only on change, if there was a change (to make the change "reactive")
}, 100);

// ------------------------------------------------------------------
// inter window communication

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
// screen handling

let screenSelected = ref();

import {
  useScreenUtils, // {screenToJSON():string, getChromeConfigUrl():string}: screenToJSON = object to JSON string helper (ScreenDetailed objects can not be parsed by JSON.stringify), getChromeConfigUrl = generates the chrome config URL for changing permissions
  useScreensPossible, // bool: is screen api available AND multiple screens available
  useScreensGranted, // bool|null: null = not yet allowed or forbidden, true = access allowed, false = denied (by user or by system if the popup was closed too often = 3 times)
  useScreensRequest, // {request():bool|null, message:string}: request() makes the permission popup show up if required and gets infos and needs to called from a CLICK/TOUCH if no permissions have been granted yet (granted == null). message will hold an error message.
  useScreens, // {screens:ScreenDetailed[], current:ScreenDetailed}: screens holds the array of all screens, and current the current one, from window.getScreenDetails(), IF permissions were 'allowed'
  useScreenPreferred, // {preferred:ScreenDetailed[], nonPreferred:ScreenDetailed[]}: preferred for presentation contains a list of screens that are not the current and not the primary, nonPreferred is the rest
} from '../composables/screensManagement.mjs';

let { screenToJSON, getChromeConfigUrl } = useScreenUtils();

let screensPossible = useScreensPossible();
let screensGranted = useScreensGranted();

let { request: screensRequest, message: screenMessage } = useScreensRequest();
watch(screenMessage, (val) => (message.value = screenMessage.value));

let { screens, current: screenCurrent } = useScreens();
let { preferred: preferredScreens, nonPreferred: nonPreferredScreens } =
  useScreenPreferred();

// ------------------------------------------------------------------
// localStorage: count button presses until chrome blocks the permission popup from appearing --- this solution is not perfect

let screenRequestClickCounter = ref(
  +(localStorage.screenRequestClickCounter ?? 3)
);
watch(
  screenRequestClickCounter,
  (val) => (localStorage.screenRequestClickCounter = val)
);
// reset
watch(screensGranted, (val) => {
  if (val) delete localStorage.screenRequestClickCounter;
});

// --- click handler, just to be able to include the counter
async function doScreensRequest() {
  await screensRequest();
  screenRequestClickCounter.value--;
}

// ------------------------------------------------------------------
// iframe to selected screen in fullscreen

let ifrmfs = ref();

function iframeToFullscreen() {
  ifrmfs.value.contentWindow.document.body.requestFullscreen({
    screen: screenSelected.value, // if screenSelected is undefined, the current screen is used by the browser
  });
}
function iframeready() {
  // on iframe load
  //childWindow = ifrmfs.value.contentWindow;
}
function iframeConnect() {
  childWindow = ifrmfs.value.contentWindow;
}

// ------------------------------------------------------------------
// misc

// -- check if this window is detached
const isMainWindow = window.top === window.self;

// -- clean up the info toast
watch(
  message,
  (newVal) => newVal.length && setTimeout(() => (message.value = ''), 2000)
);

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// TEST: open window and go fullscreen

// -- this does NOT work out of the box ... due to requestFullscreen() having to be initiated by an interaction within the child window
// ... this could be fixed it seems, by setting a header while delivering the GET request. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/fullscreen
function openAndFullscreen() {
  newWin();
  childWindow.onload = () =>
    childWindow.document.body.requestFullscreen(
      { allowWithoutGesture: true } /*{screen: screenSelected.value}*/
    );
}
async function openAndFullscreen2() {
  console.log(
    'childWindow.document.body.requestFullscreen()',
    await childWindow.document.body.requestFullscreen()
  );

  // --- test opening a popup and let it become fullscreen

  // this defaults always to denied, without asking (is never "prompt").
  let permissionStatus = await navigator.permissions.query({
    name: 'fullscreen',
    allowWithoutGesture: true,
  });

  console.log('permission:fullscreen', permissionStatus);

  /*
  Firefox
    1. Go to about:config
    2. Set this value to false: full-screen-api.allow-trusted-requests-only

  Chrome ...?
  */

  if (permissionStatus.state == 'granted') {
    // try
    console.log(
      'childWindow.document.body.requestFullscreen()',
      await childWindow.document.body.requestFullscreen(
        { allowWithoutGesture: true } /*{screen: screenSelected.value}*/
      )
    );
  } else {
    // Direct IWA users to chrome://settings permission controls
    console.log('permission required', getChromeConfigUrl());
  }
}
</script>

<template lang="pug">
aside
  div {{message}}

div
  //- pre screensGranted: {{ JSON.stringify(screensGranted) }}
  div#screensMessage-problem(v-if="!screensGranted")

    div(v-if="screensGranted === false && screenRequestClickCounter <= 0")
      b fix your "site settings":
      br
      | A) 1. click the icon left in the adress bar
      br
      b OR
      br
      | B) 1. copy paste into adress bar:
      br
      code {{ getChromeConfigUrl() }}
      br
      b THEN
      br
      | 2. allow "window management"
      hr
      | finally retry:

    //- the first 3 times, the button can be pressed again
    p(v-if="!screensGranted"): button(@click="doScreensRequest") Allow access to screens

  div#selection(v-if="!!screens.length")
    ul
      li(v-for="screen in preferredScreens")
        label
          input(type="radio" name="screenSelect" :value="screen" v-model="screenSelected")
          code {{screen.label}}: {{screen.width}} x {{screen.height}}
        details.more
          summary
          pre {{screenToJSON(screen)}}
        
    ul(style="color: gray")
      li(v-for="screen in nonPreferredScreens")
        label
          input(type="radio" name="screenSelect" :value="screen" v-model="screenSelected")
          code {{screen.label}}: {{screen.width}} x {{screen.height}}
        details.more
          summary
          pre {{screenToJSON(screen)}}

    //- div
      hr
      pre {{screenToJSON(screenSelected)}}
  div(v-else)
    p Only a single screen available

  p
    a.openChildWin(@click="newWin") open child window #[small (or reconnect)]
    br
    //- div
      | TEST
      a.openChildWin(@click="openAndFullscreen") open and fullscreen
      |  - 
      a.openChildWin(@click="openAndFullscreen2") send to fullscreen
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
  details
    summary iframe to fullscreen test
    p
      | Note: opening the iframe in fullscreen will hide this window.
    a(@click="iframeConnect") 1. connect parent to iframe
    br
    a(@click="iframeToFullscreen") 2. iframe to selected screen fullscreen
    br
    iframe(ref="ifrmfs" src="./child" @load="iframeready")
</template>

<style scoped lang="less">
#screensMessage-problem {
  border: 1px solid yellow;
  background: rgba(yellow, 40%);

  padding: 0.5em;

  a {
    color: black;
  }
}

#selection ul {
  list-style: none;
  padding: 0;

  li {
    label > * {
      vertical-align: text-top;
    }

    input {
      margin-right: 1em;
    }
  }
}

body:has(details[open]) .openChildWin {
  display: none;
}

details.more {
  display: inline-block;
  margin-left: 1em;

  summary {
    font-size: 1.2em;
    list-style-type: '🛈';
  }

  &[open] {
    display: block;

    pre {
      text-align: left;
    }
  }
}
</style>
