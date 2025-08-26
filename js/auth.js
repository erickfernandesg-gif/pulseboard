export default {
    template: `
        <div class="login-layout">
            <div class="login-container">
                <h1>Bem-vindo ao PulseBoard</h1>
                <button @click="loginWithGoogle">Entrar com Google</button>
            </div>
        </div>
    `,
    methods: {
        loginWithGoogle() {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
                .then(result => {
                    // Após o login, redireciona para o dashboard
                    this.$router.push('/dashboard');
                })
                .catch(error => {
                    console.error("Erro no login com Google:", error);
                });
        }
    }
}