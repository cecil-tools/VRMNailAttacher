import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import EditorView from '../views/EditorView.vue';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Editor',
    component: EditorView
  }
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

export default router;
