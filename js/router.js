const routes = [
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/resumo', component: Resumo, meta: { requiresAuth: true } },
    { path: '/admin', component: Admin, meta: { requiresAuth: true } },
    { path: '/analytics', component: Analytics, meta: { requiresAuth: true } },
    { path: '/', redirect: '/dashboard' }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
    linkActiveClass: 'router-link-active'
});

router.beforeEach((to, from, next) => {
    const isAuthenticated = firebase.auth().currentUser;
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    if (requiresAuth && !isAuthenticated) {
        next('/login');
    } else if (to.path === '/login' && isAuthenticated) {
        next('/dashboard');
    } else {
        next();
    }
});