/**
 * Window Management API helper
 *
 * ... it is screen management only.
 *
 * @author Nabil Redmann 2025
 * @license MIT
 *
 * @description
 *   EXPORTS:
 *     useScreenUtils      // {screenToJSON():string, getChromeConfigUrl():string}: screenToJSON = object to JSON string helper (ScreenDetailed objects can not be parsed by JSON.stringify), getChromeConfigUrl = generates the chrome config URL for changing permissions
 *     useScreensPossible  // bool: is screen api available AND multiple screens available
 *     useScreensGranted   // bool|null: null = not yet allowed or forbidden, true = access allowed, false = denied (by user or by system if the popup was closed too often = 3 times)
 *     useScreensRequest   // {request():bool|null, message:string}: request() = makes the permission popup show up if required and gets infos and needs to called from a CLICK/TOUCH if no permissions have been granted yet (granted == null). message = will hold an error message.
 *     useScreens          // {screens:ScreenDetailed[], current:ScreenDetailed}: screens holds the array of all screens, and current the current one, from window.getScreenDetails(), IF permissions were 'allowed'
 *     useScreenPreferred  // {preferred:ScreenDetailed[], nonPreferred:ScreenDetailed[]}: preferred for presentation contains a list of screens that are not the current and not the primary, nonPreferred is the rest
 *
 * @usage
 *   SCRIPT
 *     let { request, message } = useScreensRequest(); // minimum requirement
 *     let { screens, current } = useScreens();        // minimum requirement
 *
 *     let screensPossible = useScreensPossible();
 *     let screensGranted = useScreensGranted();
 *     let { screenToJSON } = useScreenUtils();
 *
 *   TEMPLATE
 *     <section v-if="screensPossible">
 *       <div v-html="message" />
 *       <button v-if="screensGranted === null" @click="request">request permissions ...</button>
 *
 *       <!-- list screens -->
 *       <div v-if="screensGranted" v-for="screen in screens"> {{ screenToJSON(screen) }} </div>
 *     </section>
 *
 *     <section v-else>
 *       <p>You have no screens or permissions can not be requested by your browser</p>
 *     </section>
 */

import { ref, watch, computed } from 'vue';

let message = ref('');

let screensPossible = ref(false);
setInterval(() => {
  //console.log('window.screen.isExtended', window.screen.isExtended);
  //console.log(`'getScreenDetails' in window`, 'getScreenDetails' in window);
  let possible = window.screen.isExtended && 'getScreenDetails' in window;
  if (screensPossible.value !== possible) screensPossible.value = possible;
  //console.log('possible', screensPossible.value, possible);
}, 500);

let screensGranted = ref(null);
let screens = ref([]);
let screenCurrent = ref();

async function screensRequest() {
  if (!screensPossible.value) return null;

  let screenDetails = { screens: [], currentScreen: undefined };

  let granted = await navigator.permissions
    .query({ name: 'window-management' })
    .then(async (result) => {
      if (result.state === 'granted') {
        // Access granted.
        screenDetails = await window.getScreenDetails();
        return true;
      } else if (result.state === 'prompt') {
        // Using getScreenDetails() will prompt for permission, if NOT state = denied
        // we trigger the permission popup
        screenDetails = await window.getScreenDetails(); // throws an error if permission popup was closed or blocked-button was used, will be cought by the catch below
        return true;
      }
      // Permission was denied by user prompt or permission policy
      message.value =
        'window api denied, click the icon left in the adress bar, then enable window management';
      return false;
    })
    .catch((err) => {
      // we catch query() and getScreenDetails()

      // NotAllowedError: Transient activation is required to request permission.
      // '-> click needed to be able to be called
      // NotAllowedError: Permission denied.
      // '-> user clicked 'block' or closed the popup
      //debug: console.info('err', resultState, screenToJSON(err));

      if (
        err.message == 'Transient activation is required to request permission.'
      )
        return null;
      else if (err.message == 'Permission denied.') return false;

      message.value = `${err.name}: ${err.message}`;
      return null;
    });

  // store details (or clear them, if the user revokes the permission)
  screens.value = screenDetails.screens;
  screenCurrent.value = screenDetails.currentScreen;

  screensGranted.value = granted;
  return granted;
}

// if there is a change, like a sceen was found, trigger getting screens (or trigger the permission request)
watch(screensPossible, screensRequest);

// enable or disable continuous checking for screens
let screensGrantedRef = null;
watch(screensGranted, (val, old) => {
  if (val !== old) {
    if (screensGrantedRef !== null) {
      clearInterval(screensGrantedRef);
      screensGrantedRef = null;
    }

    if (val || val === null) {
      screensGrantedRef = setInterval(screensRequest, 500);
    }
  }
});

function screenToJSON(screen) {
  let x = {};
  for (let i in screen) x[i] = screen[i];
  return JSON.stringify(x, null, 2);
}

function preferredScreens() {
  let arr = [];

  for (let screen of screens.value) {
    if (
      !screen.isPrimary &&
      !screen.isInternal &&
      !(screen == screenCurrent.value)
    )
      arr.push(screen);
  }

  return arr;
}

function nonPreferredScreens() {
  let arr = preferredScreens();

  return screens.value.filter((screen) => !arr.includes(screen));
}

function getChromeConfigUrl() {
  return (
    `chrome://settings/content/siteDetails?site=` +
    encodeURIComponent(window.location)
  );
}

// --- EXPORTS

export function useScreenUtils() {
  return {
    screenToJSON,
    getChromeConfigUrl,
  };
}

export function useScreensRequest() {
  return {
    request: screensRequest,
    message,
  };
}

export function useScreensPossible() {
  return screensPossible;
}

export function useScreensGranted() {
  return screensGranted;
}

export function useScreens() {
  return {
    screens,
    current: screenCurrent,
  };
}

export function useScreenPreferred() {
  return {
    preferred: computed(preferredScreens),
    nonPreferred: computed(nonPreferredScreens),
  };
}
