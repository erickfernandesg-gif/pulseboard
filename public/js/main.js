let app;
firebase.auth().onAuthStateChanged(() => {
    if (!app) {
        app = Vue.createApp(App);
        app.use(router);
        app.use(ElementPlus);
        for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
            app.component(key, component);
        }
        app.mount('#app');
    }
});