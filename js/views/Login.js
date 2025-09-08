const Login = {
    template: `
        <div class="login-layout">
            <el-card class="login-card">
                <template #header>
                    <div class="sidebar-header" style="margin-bottom: 0;">
                        <i class="fa-solid fa-square-poll-vertical"></i>
                        <h1>PulseBoard</h1>
                    </div>
                </template>
                
                <p class="subtitle">O pulso da sua equipe, em tempo real.</p>
                
                <el-form @submit.prevent="loginWithEmail" :model="form" ref="loginForm">
                    <el-form-item prop="email"><el-input v-model="form.email" placeholder="Seu e-mail" size="large" prefix-icon="Message"/></el-form-item>
                    <el-form-item prop="password"><el-input v-model="form.password" type="password" placeholder="Sua senha" size="large" prefix-icon="Lock" show-password @keyup.enter="loginWithEmail"/></el-form-item>
                    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 20px;" />
                    <el-form-item><el-button type="primary" native-type="submit" class="btn-login" size="large" :loading="loading" @click="loginWithEmail">Entrar</el-button></el-form-item>
                </el-form>

                <el-divider>ou</el-divider>
                
                <el-button @click="loginWithGoogle" class="btn-login" size="large" :loading="loading">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" style="margin-right: 8px; width: 18px;">
                    Entrar com Google
                </el-button>

                <p class="footer-text">Não tem uma conta? <router-link to="/register">Cadastre sua empresa</router-link></p>
            </el-card>
        </div>
    `,
    data() { return { form: { email: '', password: '' }, errorMessage: '', loading: false, db: firebase.firestore() } },
    methods: {
        async loginWithEmail() {
            this.errorMessage = ''; this.loading = true;
            try { await firebase.auth().signInWithEmailAndPassword(this.form.email, this.form.password); this.$router.push('/dashboard'); }
            catch (error) { this.errorMessage = 'E-mail ou senha inválidos.'; }
            finally { this.loading = false; }
        },
        async loginWithGoogle() {
            this.errorMessage = ''; this.loading = true;
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await firebase.auth().signInWithPopup(provider);
                const user = result.user;
                const userRef = this.db.collection('users').doc(user.uid);
                const doc = await userRef.get();
                if (!doc.exists) { await userRef.set({ name: user.displayName, email: user.email, teamId: '', isAdmin: false }); }
                this.$router.push('/dashboard');
            } catch (error) { this.errorMessage = 'Não foi possível fazer o login com o Google.'; }
            finally { this.loading = false; }
        }
    }
};