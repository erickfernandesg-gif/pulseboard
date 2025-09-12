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
                        sub-title="Obrigado pelo seu interesse! Recebemos seus dados e nossa equipe irá analisar seu cadastro. Entraremos em contato em breve."
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
                        <el-form-item label="Seu E-mail de Contato">
                            <el-input v-model="form.email" type="email" placeholder="seu.email@empresa.com" size="large" />
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary" native-type="submit" class="btn-login" size="large" :loading="loading">
                                Enviar Solicitação
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
                email: ''
            },
            loading: false,
            formSubmitted: false,
            db: firebase.firestore()
        }
    },
    methods: {
        async submitRegistration() {
            if (!this.form.companyName || !this.form.userName || !this.form.email) {
                ElementPlus.ElMessage.error('Por favor, preencha todos os campos.');
                return;
            }
            this.loading = true;
            try {
                // Salva a solicitação em uma nova coleção no Firestore
                await this.db.collection('registrationRequests').add({
                    companyName: this.form.companyName,
                    userName: this.form.userName,
                    email: this.form.email,
                    status: 'pending', // Status inicial
                    requestedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.formSubmitted = true;
            } catch (error) {
                console.error("Erro ao enviar solicitação:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro. Tente novamente.');
            } finally {
                this.loading = false;
            }
        }
    }
};