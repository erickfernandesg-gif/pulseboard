const routes = [
    { path: '/login', component: Login },
    { path: '/register', component: Register }, // ROTA ADICIONADA
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/resumo', component: Resumo, meta: { requiresAuth: true } },
    { path: '/admin', component: Admin, meta: { requiresAuth: true, isSuperAdmin: true } },
    { path: '/company-admin', component: CompanyAdmin, meta: { requiresAuth: true, roles: ['admin'] } },
    { path: '/analytics', component: Analytics, meta: { requiresAuth: true } },
    { path: '/', redirect: '/dashboard' }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
    linkActiveClass: 'router-link-active'
});

router.beforeEach((to, from, next) => {
    const currentUser = firebase.auth().currentUser;
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

    // 1. Se a rota exige autenticação e o usuário não está logado, redireciona para o login.
    if (requiresAuth && !currentUser) {
        next('/login');
        return;
    }

    // 2. Se o usuário está logado e tenta acessar as páginas de login/registro, redireciona para o dashboard.
    if (currentUser && (to.path === '/login' || to.path === '/register')) {
        next('/dashboard');
        return;
    }

    // 3. Se a rota exige permissões especiais (role ou isSuperAdmin)
    if (requiresAuth && currentUser && (to.meta.roles || to.meta.isSuperAdmin)) {
        const db = firebase.firestore();
        db.collection('users').doc(currentUser.uid).get().then(userDoc => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                const isSuperAdmin = userData.isSuperAdmin === true;
                const userRole = userData.role;

                // Verifica se é Super Admin
                if (to.meta.isSuperAdmin && isSuperAdmin) {
                    return next();
                }
                // Verifica se tem o role necessário
                if (to.meta.roles && to.meta.roles.includes(userRole)) {
                    return next();
                }
            }
            // Se não tiver permissão, redireciona para o dashboard com um aviso.
            ElementPlus.ElMessage.warning('Você não tem permissão para acessar esta página.');
            return next('/dashboard');
        });
    } else {
        next(); // Para todas as outras rotas (autenticadas sem roles ou públicas)
    }
});