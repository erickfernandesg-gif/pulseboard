const CompanyAdmin = {
    template: `
        <div class="main-content">
            <header class="page-header">
                <h1><i class="fa-solid fa-building-user"></i> Gerenciar Empresa</h1>
            </header>

            <div v-loading="loading">
                <el-card class="admin-section">
                    <template #header>
                        <div class="card-header-title">
                            <h2>Gerenciar Times</h2>
                            <el-button type="primary" :icon="'Plus'" @click="openAddTeamDialog">Adicionar Time</el-button>
                        </div>
                    </template>
                    <el-table :data="teams" stripe style="width: 100%">
                        <el-table-column label="Cor" width="80"><template #default="scope"><span class="team-color-dot" :style="{ backgroundColor: scope.row.color }"></span></template></el-table-column>
                        <el-table-column prop="name" label="Nome do Time"></el-table-column>
                        <el-table-column prop="userCount" label="Nº de Usuários" width="150"></el-table-column>
                        <el-table-column label="Ações" width="120" align="right">
                            <template #default="scope">
                                <el-button @click="openEditTeamModal(scope.row.id, scope.row)" :icon="'Edit'" circle plain title="Editar" />
                                <el-button @click="confirmDeleteTeam(scope.row.id, scope.row.name)" type="danger" :icon="'Delete'" circle plain title="Excluir" />
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-empty v-if="!loading && teams.length === 0" description="Nenhum time criado."></el-empty>
                </el-card>

                <el-card class="admin-section">
                    <template #header>
                        <div class="card-header-title">
                            <h2>Gerenciar Usuários</h2>
                            <el-button type="primary" :icon="'User'" @click="openInviteDialog">Convidar Colaborador</el-button>
                        </div>
                    </template>
                    <el-table :data="users" stripe style="width: 100%">
                        <el-table-column prop="name" label="Nome"></el-table-column>
                        <el-table-column prop="email" label="E-mail"></el-table-column>
                        <el-table-column label="Papel" width="200"><template #default="scope"><el-select v-model="scope.row.role" @change="updateUserRole(scope.row)"><el-option v-for="role in roles" :key="role.value" :label="role.label" :value="role.value"></el-option></el-select></template></el-table-column>
                        <el-table-column label="Time" width="250">
                            <template #default="scope">
                                <el-select v-if="scope.row.role === 'member'" v-model="scope.row.teamId" placeholder="Sem time" style="width: 100%;" @change="updateUserTeam(scope.row.id, scope.row.teamId)" clearable><el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id"></el-option></el-select>
                                <el-tag v-else type="info">N/A</el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </div>

            <!-- Dialog para Adicionar/Editar Time -->
            <el-dialog v-model="showTeamDialog" :title="isEditing ? 'Editar Time' : 'Adicionar Novo Time'" width="500px">
                <el-form :model="teamForm" label-position="top" ref="teamFormRef">
                    <el-form-item label="Nome do Time" prop="name"><el-input v-model="teamForm.name" required></el-input></el-form-item>
                    <el-form-item label="Cor de Destaque" prop="color"><div class="color-picker-group"><el-color-picker v-model="teamForm.color" /><el-input v-model="teamForm.color" required /></div></el-form-item>
                </el-form>
                <template #footer><el-button @click="closeTeamDialog">Cancelar</el-button><el-button type="primary" @click="saveTeam">Salvar</el-button></template>
            </el-dialog>

            <!-- Dialog para Convidar Usuário -->
            <el-dialog v-model="showInviteDialog" title="Convidar Novo Colaborador" width="500px">
                <el-form :model="inviteForm" label-position="top" ref="inviteFormRef">
                    <el-form-item label="Nome Completo do Colaborador" prop="name"><el-input v-model="inviteForm.name" required></el-input></el-form-item>
                    <el-form-item label="E-mail do Colaborador" prop="email"><el-input v-model="inviteForm.email" type="email" required></el-input></el-form-item>
                    <el-form-item label="Senha Provisória" prop="password"><el-input v-model="inviteForm.password" placeholder="O usuário deverá trocar ao logar" required show-password></el-input></el-form-item>
                </el-form>
                <template #footer><el-button @click="showInviteDialog = false">Cancelar</el-button><el-button type="primary" @click="sendInvite" :loading="inviteLoading">Enviar Convite</el-button></template>
            </el-dialog>
        </div>
    `,
    data() {
        return {
            loading: true,
            inviteLoading: false,
            currentUser: null,
            teams: [],
            users: [],
            showTeamDialog: false,
            isEditing: false,
            teamForm: { id: null, name: '', color: '#4A90E2' },
            showInviteDialog: false,
            inviteForm: { name: '', email: '', password: '' },
            db: firebase.firestore(),
            auth: firebase.auth(),
            roles: [
                { value: 'member', label: 'Membro' },
                { value: 'team_lead', label: 'Líder de Equipe' },
                { value: 'admin', label: 'Admin' }
            ],
        }
    },
    methods: {
        // --- Métodos de Gerenciamento de Times (Reutilizados do Admin.js) ---
        async fetchTeams() {
            const snapshot = await this.db.collection('teams')
                .where('organizationId', '==', this.currentUser.organizationId)
                .orderBy('name')
                .get();
            this.teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        openAddTeamDialog() {
            this.isEditing = false;
            this.teamForm = { id: null, name: '', color: '#4A90E2' };
            this.showTeamDialog = true;
        },
        openEditTeamModal(id, team) {
            this.isEditing = true;
            this.teamForm = { ...team };
            this.showTeamDialog = true;
        },
        closeTeamDialog() { this.showTeamDialog = false; },
        async saveTeam() {
            if (!this.teamForm.name || !this.teamForm.color) { ElementPlus.ElMessage.error('Nome e cor do time são obrigatórios.'); return; }
            this.loading = true;
            try {
                if (this.isEditing) {
                    const { id, ...teamData } = this.teamForm;
                    await this.db.collection('teams').doc(id).update(teamData);
                    ElementPlus.ElMessage.success('Time atualizado com sucesso!');
                } else {
                    const newTeam = {
                        name: this.teamForm.name,
                        color: this.teamForm.color,
                        organizationId: this.currentUser.organizationId
                    };
                    await this.db.collection('teams').add(newTeam);
                    ElementPlus.ElMessage.success('Novo time adicionado!');
                }
                this.closeTeamDialog();
                await this.fetchData();
            } catch (error) {
                console.error("Erro ao salvar time:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao salvar o time.');
            } finally {
                this.loading = false;
            }
        },
        confirmDeleteTeam(teamId, teamName) {
            ElementPlus.ElMessageBox.confirm(`Tem certeza que deseja excluir o time "${teamName}"?`, 'Atenção', {
                confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar', type: 'warning'
            }).then(() => this.deleteTeam(teamId)).catch(() => {});
        },
        async deleteTeam(teamId) {
            this.loading = true;
            try {
                const batch = this.db.batch();
                const teamRef = this.db.collection('teams').doc(teamId);
                batch.delete(teamRef);
                const usersToUpdate = this.users.filter(u => u.teamId === teamId);
                usersToUpdate.forEach(user => {
                    const userRef = this.db.collection('users').doc(user.id);
                    batch.update(userRef, { teamId: '' });
                });
                await batch.commit();
                ElementPlus.ElMessage.success('Time removido com sucesso.');
                await this.fetchData();
            } catch (error) {
                console.error("Erro ao deletar time:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao remover o time.');
            } finally {
                this.loading = false;
            }
        },

        // --- Métodos de Gerenciamento de Usuários ---
        async fetchUsers() {
            const snapshot = await this.db.collection('users')
                .where('organizationId', '==', this.currentUser.organizationId)
                .get();
            this.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        async updateUserRole(user) {
            try {
                await this.db.collection('users').doc(user.id).update({ role: user.role });
                ElementPlus.ElMessage.success('Papel do usuário atualizado!');
            } catch (error) {
                console.error("Erro ao atualizar papel:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao atualizar o papel.');
            }
        },
        async updateUserTeam(userId, teamId) {
            try {
                await this.db.collection('users').doc(userId).update({ teamId: teamId || '' });
                ElementPlus.ElMessage.success('Time do usuário atualizado!');
                this.calculateUserCounts();
            } catch (error) {
                console.error("Erro ao atualizar time do usuário:", error);
                ElementPlus.ElMessage.error('Ocorreu um erro ao atualizar o time.');
            }
        },
        calculateUserCounts() {
            const counts = this.users.reduce((acc, user) => {
                if (user.teamId) { acc[user.teamId] = (acc[user.teamId] || 0) + 1; }
                return acc;
            }, {});
            this.teams.forEach(team => {
                team.userCount = counts[team.id] || 0;
            });
        },

        // --- Lógica de Convite de Colaborador ---
        openInviteDialog() {
            this.inviteForm = { name: '', email: '', password: '' };
            this.showInviteDialog = true;
        },
        async sendInvite() {
            if (!this.inviteForm.name || !this.inviteForm.email || !this.inviteForm.password) {
                ElementPlus.ElMessage.error('Por favor, preencha todos os campos do convite.');
                return;
            }
            this.inviteLoading = true;
            try {
                // ATENÇÃO: Esta abordagem cria o usuário diretamente.
                // Uma alternativa seria usar uma Cloud Function para mais segurança.
                const userCredential = await this.auth.createUserWithEmailAndPassword(this.inviteForm.email, this.inviteForm.password);
                const newUser = userCredential.user;

                await this.db.collection('users').doc(newUser.uid).set({
                    name: this.inviteForm.name,
                    email: this.inviteForm.email,
                    organizationId: this.currentUser.organizationId,
                    role: 'member', // Papel padrão para novos usuários
                    teamId: '',
                });

                ElementPlus.ElNotification({ title: 'Sucesso!', message: 'Colaborador convidado e cadastrado.', type: 'success' });
                this.showInviteDialog = false;
                await this.fetchUsers(); // Atualiza a lista de usuários

            } catch (error) {
                console.error("Erro ao convidar colaborador:", error);
                if (error.code === 'auth/email-already-in-use') {
                    ElementPlus.ElMessage.error('Este e-mail já está em uso no sistema.');
                } else if (error.code === 'auth/weak-password') {
                    ElementPlus.ElMessage.error('A senha provisória precisa ter pelo menos 6 caracteres.');
                } else {
                    ElementPlus.ElMessage.error('Ocorreu um erro ao convidar o colaborador.');
                }
            } finally {
                this.inviteLoading = false;
            }
        },

        // --- Método Principal de Carregamento ---
        async fetchData() {
            this.loading = true;
            await Promise.all([
                this.fetchTeams(),
                this.fetchUsers()
            ]);
            this.calculateUserCounts();
            this.loading = false;
        }
    },
    async mounted() {
        try {
            const loggedInUser = this.auth.currentUser;
            if (loggedInUser) {
                const userDoc = await this.db.collection('users').doc(loggedInUser.uid).get();
                if (userDoc.exists) {
                    this.currentUser = { uid: loggedInUser.uid, ...userDoc.data() };
                    // Apenas carrega os dados se o usuário for admin
                    if (this.currentUser.role === 'admin') {
                        await this.fetchData();
                    } else {
                        // Se não for admin, redireciona ou mostra mensagem de erro
                        this.$router.push('/dashboard');
                        ElementPlus.ElMessage.warning('Você não tem permissão para acessar esta página.');
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados da página:", error);
            ElementPlus.ElMessage.error("Não foi possível carregar os dados de gerenciamento.");
            this.loading = false;
        }
    },
    watch: {
        users: {
            handler() { this.calculateUserCounts(); },
            deep: true
        }
    },
};