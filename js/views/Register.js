const Register = {
    template: `
        <div class="login-layout">
            <el-card class="login-card">
                <template #header>
                    <div class="sidebar-header" style="margin-bottom: 0;">
                        <i class="fa-solid fa-square-poll-vertical"></i>
                        <h1>PulseBoard</h1>
                    </div>
                </template>
                
                <div v-if="formSubmitted">
                    <el-result
                        icon="success"
                        title="Solicitação Enviada!"
                        sub-title="Sua conta foi criada e está aguardando a aprovação de um administrador. Entraremos em contato em breve quando seu acesso for liberado."
                    >
                        <template #extra>
                            <el-button type="primary" @click="$router.push('/login')">Voltar para o Login</el-button>
                        </template>
                    </el-result>
                </div>

                <div v-else>
                    <p class="subtitle">Cadastre sua empresa para começar.</p>
                    <el-form @submit.prevent="submitRegistration" :model="form" label-position="top">
                        <el-form-item label="Nome da Empresa">
                            <el-input v-model="form.companyName" placeholder="Digite o nome da sua empresa" size="large" />
                        </el-form-item>
                        <el-form-item label="Seu Nome Completo">
                            <el-input v-model="form.userName" placeholder="Digite seu nome" size="large" />
                        </el-form-item>
                        <el-form-item label="Seu E-mail de Acesso">
                            <el-input v-model="form.email" type="email" placeholder="seu.email@empresa.com" size="large" />
                        </el-form-item>
                        
                        <el-form-item label="Crie uma Senha">
                            <el-input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" size="large" show-password />
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" native-type="submit" class="btn-login" size="large" :loading="loading">
                                Criar Conta
                            </el-button>
                        </el-form-item>
                    </el-form>
                    <el-divider />
                    <p class="footer-text">Já tem uma conta? <router-link to="/login">Faça o login</router-link></p>
                </div>
            </el-card>
        </div>
    `,
    data() {
        return {
            form: {
                companyName: '',
                userName: '',
                email: '',
                password: '' // <- Adicionado
            },
            loading: false,
            formSubmitted: false,
            db: firebase.firestore(),
            auth: firebase.auth()
        }
    },
    methods: {
        // MÉTODO COMPLETAMENTE REESCRITO
        async submitRegistration() {
            // 1. Validação simples para garantir que todos os campos foram preenchidos
            if (!this.form.companyName || !this.form.userName || !this.form.email || !this.form.password) {
                ElementPlus.ElMessage.error('Por favor, preencha todos os campos.');
                return;
            }
            this.loading = true;

            try {
                // 2. Cria o usuário no Firebase Authentication (com e-mail e senha)
                const userCredential = await this.auth.createUserWithEmailAndPassword(this.form.email, this.form.password);
                const newUser = userCredential.user;

                // 3. Cria a Organização no Firestore com status "pending"
                const orgRef = await this.db.collection('organizations').add({
                    name: this.form.companyName,
                    ownerId: newUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'pending' // <- O status que você sugeriu!
                });

                // 4. Cria o perfil do usuário no Firestore, ligando ele à organização
                await this.db.collection('users').doc(newUser.uid).set({
                    name: this.form.userName,
                    email: this.form.email,
                    organizationId: orgRef.id, // Liga o usuário à organização criada
                    role: 'admin', // O primeiro usuário da empresa é um admin
                    teamId: '',
                });

                // 5. Mostra a tela de sucesso
                this.formSubmitted = true;

            } catch (error) {
                console.error("Erro ao registrar:", error);
                // Trata erros comuns do Firebase para dar uma resposta melhor
                if (error.code === 'auth/email-already-in-use') {
                    ElementPlus.ElMessage.error('Este e-mail já está cadastrado.');
                } else if (error.code === 'auth/weak-password') {
                    ElementPlus.ElMessage.error('A senha precisa ter pelo menos 6 caracteres.');
                } else {
                    ElementPlus.ElMessage.error('Ocorreu um erro. Tente novamente.');
                }
            } finally {
                this.loading = false;
            }
        }
    }
};