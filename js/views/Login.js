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
    data() { 
        return { 
            form: { email: '', password: '' }, 
            errorMessage: '', 
            loading: false, 
            db: firebase.firestore(),
            auth: firebase.auth() 
        } 
    },
    methods: {
        // MÉTODO DE LOGIN COM EMAIL MODIFICADO
        async loginWithEmail() {
            this.errorMessage = ''; 
            this.loading = true;
            try {
                // Etapa 1: Autenticar o usuário (verificar se e-mail/senha batem)
                const userCredential = await this.auth.signInWithEmailAndPassword(this.form.email, this.form.password);
                const user = userCredential.user;

                // Etapa 2: Verificar o status da organização antes de liberar o acesso
                await this.checkUserStatusAndRedirect(user);

            } catch (error) {
                // Se a Etapa 1 falhar, o erro é de autenticação
                this.errorMessage = 'E-mail ou senha inválidos.';
                console.error("Erro de autenticação:", error);
            } finally {
                this.loading = false;
            }
        },

        // MÉTODO DE LOGIN COM GOOGLE MODIFICADO
        async loginWithGoogle() {
            this.errorMessage = ''; 
            this.loading = true;
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await this.auth.signInWithPopup(provider);
                const user = result.user;

                // Garante que o usuário exista no Firestore (se for o primeiro login com Google)
                const userRef = this.db.collection('users').doc(user.uid);
                const doc = await userRef.get();
                if (!doc.exists) {
                    // Se não existe, não podemos saber o status da empresa, então o acesso é negado.
                    // Isso previne que qualquer um com uma conta Google entre no sistema.
                    await this.auth.signOut();
                    this.errorMessage = 'Usuário do Google não associado a nenhuma empresa.';
                    return;
                }

                // Etapa 2: Verificar o status da organização antes de liberar o acesso
                await this.checkUserStatusAndRedirect(user);

            } catch (error) {
                this.errorMessage = 'Não foi possível fazer o login com o Google.';
                console.error("Erro no login com Google:", error);
            } finally {
                this.loading = false;
            }
        },

        // NOVA FUNÇÃO REUTILIZÁVEL PARA CHECAR STATUS
        async checkUserStatusAndRedirect(user) {
            // Busca o perfil do usuário no Firestore
            const userDoc = await this.db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                this.errorMessage = 'Perfil de usuário não encontrado.';
                await this.auth.signOut(); // Desloga o usuário
                return;
            }

            const organizationId = userDoc.data().organizationId;
            if (!organizationId) {
                this.errorMessage = 'Usuário não está ligado a nenhuma organização.';
                await this.auth.signOut();
                return;
            }

            // Busca os dados da organização
            const orgDoc = await this.db.collection('organizations').doc(organizationId).get();

            if (!orgDoc.exists) {
                this.errorMessage = 'Organização não encontrada.';
                await this.auth.signOut();
                return;
            }

            // A VERIFICAÇÃO PRINCIPAL!
            const status = orgDoc.data().status;

            if (status === 'active') {
                // Se estiver ativo, vai para o dashboard
                this.$router.push('/dashboard');
            } else if (status === 'pending') {
                // Se estiver pendente, mostra mensagem e desloga
                this.errorMessage = 'Sua conta está aguardando aprovação de um administrador.';
                await this.auth.signOut();
            } else {
                // Qualquer outro status (ex: "negado", "inativo", etc.)
                this.errorMessage = 'O acesso desta empresa foi desativado.';
                await this.auth.signOut();
            }
        }
    }
};