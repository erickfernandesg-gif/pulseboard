let app;

function mountApp(userProfile = null) {
  if (!app) {
    app = Vue.createApp(App, { userProfile }); // Passa o perfil como prop inicial
    app.use(router);
    app.use(ElementPlus);
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      app.component(key, component);
    }
    app.mount('#app');
  }
}

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // Usuário está logado. Busca o perfil ANTES de montar o app.
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userProfile = { uid: user.uid, ...userDoc.data() };
            // Monta o app com o perfil já carregado.
            mountApp(userProfile);
        } else {
            // Perfil não encontrado, trata como deslogado.
            mountApp();
        }
    } else {
        // Usuário não está logado, monta o app imediatamente.
        mountApp();
    }
});