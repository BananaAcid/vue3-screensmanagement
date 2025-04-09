import { createApp } from 'vue';
import { createWebHistory, createRouter } from 'vue-router';

import './styles/style.css';
import './styles/default.less';

import App from './App.vue';
import HomeView from './views/Home.vue';
import ChildView from './views/Child.vue';
import HomeViewEx from './views/HomeEx.vue';

const routes = [
  { path: '', component: HomeView },
  { path: '/', component: HomeView },
  { path: '/child', component: ChildView },
  { path: '/2', component: HomeViewEx },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

createApp(App).use(router).mount('#app');
